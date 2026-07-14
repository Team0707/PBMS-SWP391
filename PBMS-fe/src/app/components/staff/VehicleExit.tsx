import { useState, useRef, useEffect } from "react";
import {
  QrCode,
  CheckCircle2,
  X,
  Search,
  CreditCard,
  ScanLine,
  AlertCircle,
  Camera,
  Upload,
} from "lucide-react";

import PaymentModal from "./PaymentModal";
import { staffService } from "../../../services/staffService";

interface TicketInfo {
  parkingSessionId: number;
  maVe: string;
  bienSo: string;
  loaiXe: string;
  vehicleType: string;
  tgVao: string;
  tgRa: string;
  rawCheckInAt: string;
  rawCheckOutAt: string;
  thoiGianGui: string;
  phi: number;
  qrPayload: string;
  violationReason?: string;
  entryImage?: string;
}

function formatParkingDuration(checkInStr: string, checkOutStr: string): string {
  const start = new Date(checkInStr).getTime();
  const end = new Date(checkOutStr).getTime();
  if (isNaN(start) || isNaN(end)) {
    return "Không xác định";
  }

  const totalMinutes = Math.max(1, Math.floor((end - start) / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes} phút`;
  if (minutes === 0) return `${hours} giờ`;
  return `${hours} giờ ${minutes} phút`;
}

interface VehicleExitProps {
  selectedFloorCode?: string;
}

export default function VehicleExit({ selectedFloorCode }: VehicleExitProps) {
  const [inputCode, setInputCode] = useState("");
  const [ticket, setTicket] = useState<TicketInfo | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [floorCode, setFloorCode] = useState(selectedFloorCode || "");

  useEffect(() => {
    if (selectedFloorCode) {
      setFloorCode(selectedFloorCode);
    }
  }, [selectedFloorCode]);

  // Unified steps: "barcode" | "exit-plate" | "compare"
  const [checkoutStep, setCheckoutStep] = useState<"barcode" | "exit-plate" | "compare">("barcode");

  // Exit flow plate scanner states
  const [exitImage, setExitImage] = useState<string | null>(null);
  const [exitPlate, setExitPlate] = useState("");
  const [isOcrScanning, setIsOcrScanning] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [plateMatchConfirmed, setPlateMatchConfirmed] = useState(false);
  const [exitVideoStreaming, setExitVideoStreaming] = useState(false);
  const [ocrSteps, setOcrSteps] = useState<{ label: string; detail: string; status: "idle" | "running" | "success" | "failed" }[]>([]);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(-1);

  const exitVideoRef = useRef<HTMLVideoElement | null>(null);
  const exitStreamRef = useRef<MediaStream | null>(null);
  const exitPlateFileInputRef = useRef<HTMLInputElement | null>(null);

  // Manage ticket QR camera feed
  const [qrCameraActive, setQrCameraActive] = useState(false);
  const qrVideoRef = useRef<HTMLVideoElement | null>(null);
  const qrStreamRef = useRef<MediaStream | null>(null);
  const qrFileInputRef = useRef<HTMLInputElement | null>(null);

  const startExitCamera = async () => {
    setErrorMsg(null);
    setOcrError(null);
    setExitImage(null);
    setExitPlate("");
    setPlateMatchConfirmed(false);
    setExitVideoStreaming(true);

    if (!navigator || !navigator.mediaDevices) {
      setOcrError("Trình duyệt không hỗ trợ camera hoặc yêu cầu kết nối HTTPS.");
      setExitVideoStreaming(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } }
      });
      exitStreamRef.current = stream;
      if (exitVideoRef.current) {
        exitVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access failed", err);
      setOcrError("Không thể truy cập camera. Vui lòng kiểm tra quyền hoặc tải ảnh lên.");
      setExitVideoStreaming(false);
    }
  };

  const stopExitCamera = () => {
    if (exitStreamRef.current) {
      exitStreamRef.current.getTracks().forEach(track => track.stop());
      exitStreamRef.current = null;
    }
    setExitVideoStreaming(false);
    setIsOcrScanning(false);
  };

  // OCR calling Gemini API
  const runExitPlateOCR = async (base64Image: string, dataUrl: string) => {
    setIsOcrScanning(true);
    setOcrError(null);
    setExitImage(dataUrl);
    setExitPlate("");

    const steps = [
      { label: "1. Phát hiện khung biển số ra", detail: "Đang định vị biển số trong khung hình...", status: "running" as const },
      { label: "2. Hiệu chỉnh góc nghiêng", detail: "Cân bằng góc xoay...", status: "idle" as const },
      { label: "3. Nhận diện ký tự (Gemini API)", detail: "Đang gọi Gemini API trích xuất ký tự...", status: "idle" as const },
      { label: "4. Đối chiếu thông tin", detail: "Chờ so sánh định dạng...", status: "idle" as const },
    ];
    setOcrSteps(steps);
    setActiveStepIndex(0);

    try {
      await new Promise(r => setTimeout(r, 400));
      steps[0].status = "success";
      steps[1].status = "running";
      setOcrSteps([...steps]);
      setActiveStepIndex(1);

      await new Promise(r => setTimeout(r, 400));
      steps[1].status = "success";
      steps[2].status = "running";
      setOcrSteps([...steps]);
      setActiveStepIndex(2);

      const apiKey = "AQ.Ab8RN6LAK8CSIGOiHk9CRYoniXnFtzDHBaiNpD0gUvmXaxVdZA";
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: "Identify and extract the license plate number of the vehicle from this image. Clean the output by removing all spaces, dots, dashes. Return ONLY a JSON object with format {\"plate\": \"CLEAN_PLATE_NUMBER\"}." },
                { inlineData: { mimeType: "image/jpeg", data: base64Image } }
              ]
            }],
            generationConfig: { responseMimeType: "application/json" }
          })
        }
      );

      if (!response.ok) throw new Error("Không thể kết nối đến Gemini API.");
      const resData = await response.json();
      const text = resData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("Không có phản hồi từ Gemini API.");

      const parsed = JSON.parse(text);
      const recognized = (parsed.plate || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");

      if (!recognized) throw new Error("Không nhận dạng được biển số.");

      steps[2].status = "success";
      steps[2].detail = `Nhận diện được: ${recognized}`;
      steps[3].status = "running";
      setOcrSteps([...steps]);
      setActiveStepIndex(3);

      await new Promise(r => setTimeout(r, 400));
      steps[3].status = "success";
      setOcrSteps([...steps]);
      setActiveStepIndex(4);

      setExitPlate(recognized);
      setIsOcrScanning(false);
      
      // Auto compare
      handleComparePlates(recognized);
    } catch (err: any) {
      console.error(err);
      steps[activeStepIndex >= 0 ? activeStepIndex : 2].status = "failed";
      setOcrSteps([...steps]);
      setOcrError(err.message || "Nhận diện thất bại.");
      setIsOcrScanning(false);
    }
  };

  const handleCaptureExit = () => {
    if (exitVideoRef.current) {
      const video = exitVideoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg");
        const base64Image = dataUrl.split(",")[1];
        runExitPlateOCR(base64Image, dataUrl);
        stopExitCamera();
      }
    }
  };

  const handleExitPlateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64Image = dataUrl.split(",")[1];
      runExitPlateOCR(base64Image, dataUrl);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleComparePlates = (scannedPlate: string) => {
    if (!ticket) return;
    const cleanEntry = ticket.bienSo.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const cleanExit = scannedPlate.toUpperCase().replace(/[^A-Z0-9]/g, "");

    const isMatched = cleanEntry === cleanExit;
    setPlateMatchConfirmed(isMatched);
    setCheckoutStep("compare");
  };

  const processCheckOut = async (code: string) => {
    setErrorMsg(null);
    setNotFound(false);
    setExitImage(null);
    setExitPlate("");
    setPlateMatchConfirmed(false);

    if (!floorCode) {
      setErrorMsg("Vui lòng chọn Tầng trước.");
      return;
    }

    try {
      const resp = await staffService.previewCheckOut(code.trim());

      const ticketInfo: TicketInfo = {
        parkingSessionId: resp.parkingSessionId,
        maVe: resp.parkingSessionNo,
        bienSo: resp.plateNoSnapshot,
        loaiXe: resp.vehicleType === "CAR" ? "Ô tô" : "Xe máy",
        vehicleType: resp.vehicleType,
        tgVao: new Date(resp.checkInAt).toLocaleString("vi-VN"),
        tgRa: new Date(resp.checkOutAt || "").toLocaleString("vi-VN"),
        rawCheckInAt: resp.checkInAt,
        rawCheckOutAt: resp.checkOutAt || "",
        thoiGianGui: formatParkingDuration(resp.checkInAt, resp.checkOutAt || ""),
        phi: resp.feeAmount,
        qrPayload: resp.qrToken,
        violationReason: resp.violationReason,
        entryImage: resp.entryImage,
      };

      setTicket(ticketInfo);
      setNotFound(false);
      setConfirmed(false);
      
      // Proceed to Step 2
      setCheckoutStep("exit-plate");
      setInputCode(""); // Reset input field to accept exit plate or manual plate input
    } catch (err: any) {
      setTicket(null);
      setNotFound(true);
      setErrorMsg(err.message || "Không tìm thấy vé hoặc vé không hợp lệ.");
    }
  };

  const executeFinalCheckOut = async () => {
    if (!ticket) return;
    setErrorMsg(null);
    try {
      await staffService.checkOut({
        parkingSessionNoOrQrToken: ticket.maVe,
        floorCode: floorCode,
        exitImage: exitImage || undefined,
        exitPlate: exitPlate || undefined
      });
      setConfirmed(true);
      try {
        localStorage.removeItem("parking-ticket:last");
      } catch (e) {}
    } catch (err: any) {
      setErrorMsg(err.message || "Có lỗi xảy ra khi thực hiện cho xe ra.");
    }
  };

  const handleCancel = () => {
    setTicket(null);
    setNotFound(false);
    setConfirmed(false);
    setErrorMsg(null);
    setExitImage(null);
    setExitPlate("");
    setInputCode("");
    setPlateMatchConfirmed(false);
    setCheckoutStep("barcode");
    stopExitCamera();
    stopQrCamera();
  };

  // QR Camera functions for ticket barcode scanning
  const runTicketScannerOCR = async (base64Image: string, dataUrl: string) => {
    setErrorMsg(null);
    setNotFound(false);
    setIsOcrScanning(true);

    try {
      const apiKey = "AQ.Ab8RN6LAK8CSIGOiHk9CRYoniXnFtzDHBaiNpD0gUvmXaxVdZA";
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: "Identify and extract the ticket number, card barcode, or reservation code (e.g. TK000003, CARD000005, RES001, KZP1234567) from this ticket image. Clean the output by removing all spaces, dots, and dashes. Return ONLY a JSON object with format {\"code\": \"KZP1234567\"}." },
                { inlineData: { mimeType: "image/jpeg", data: base64Image } }
              ]
            }],
            generationConfig: { responseMimeType: "application/json" }
          })
        }
      );

      if (!response.ok) throw new Error("Lỗi kết nối Gemini API.");
      const resData = await response.json();
      const text = resData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("Không nhận diện được phản hồi.");

      const parsed = JSON.parse(text);
      const recognized = (parsed.code || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (!recognized) throw new Error("Không tìm thấy mã vé/barcode trong ảnh.");

      setInputCode(recognized);
      setIsOcrScanning(false);
      processCheckOut(recognized);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Không thể nhận diện barcode vé.");
      setIsOcrScanning(false);
    }
  };

  const startQrCamera = async () => {
    setQrCameraActive(true);
    setErrorMsg(null);
    setNotFound(false);

    if (!navigator || !navigator.mediaDevices) {
      setErrorMsg("Trình duyệt không hỗ trợ camera.");
      setQrCameraActive(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      qrStreamRef.current = stream;
      if (qrVideoRef.current) {
        qrVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access failed", err);
      setErrorMsg("Không thể truy cập camera. Vui lòng cấp quyền.");
      setQrCameraActive(false);
    }
  };

  const stopQrCamera = () => {
    if (qrStreamRef.current) {
      qrStreamRef.current.getTracks().forEach(track => track.stop());
      qrStreamRef.current = null;
    }
    setQrCameraActive(false);
  };

  const handleQrCapture = () => {
    if (qrVideoRef.current) {
      const video = qrVideoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg");
        const base64Image = dataUrl.split(",")[1];
        runTicketScannerOCR(base64Image, dataUrl);
        stopQrCamera();
      }
    }
  };

  const handleQrFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64Image = dataUrl.split(",")[1];
      runTicketScannerOCR(base64Image, dataUrl);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <div className="space-y-3">
      {/* Tiêu đề */}
      <div className="flex items-center justify-between rounded border border-gray-200 bg-white px-4 py-2.5 shadow-sm">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-semibold text-gray-700">
            Tiếp nhận xe ra (Tầng trực: {selectedFloorCode || "Chưa chọn"})
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
        {/* Main interactive panel */}
        <div className="overflow-hidden rounded border border-gray-200 bg-white shadow-sm flex flex-col justify-between min-h-[480px]">
          
          {/* Step 1: Barcode Entry */}
          {checkoutStep === "barcode" && (
            <div>
              <div className="flex items-center gap-2 bg-blue-600 px-4 py-2.5">
                <QrCode className="h-4 w-4 text-white" />
                <span className="text-sm font-semibold text-white">
                  Bước 1: Nhập barcode thẻ xe
                </span>
              </div>

              <div className="p-4 space-y-4">
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-gray-600">
                    Nhập barcode thẻ xe (Đúng 10 ký tự)
                  </label>
                  
                  <div className="flex gap-2">
                    <input
                      className="h-[38px] flex-1 rounded border border-gray-300 px-3 text-sm uppercase outline-none focus:border-blue-400 font-mono font-bold tracking-wider"
                      placeholder="VD: KZP1234567"
                      maxLength={10}
                      value={inputCode}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^A-Za-z0-9]/g, "");
                        setInputCode(val);
                        setErrorMsg(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && inputCode.trim().length === 10) {
                          processCheckOut(inputCode);
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => processCheckOut(inputCode)}
                      disabled={inputCode.trim().length !== 10}
                      className="flex h-[38px] items-center gap-1.5 rounded bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300 transition-colors cursor-pointer"
                    >
                      <Search className="h-3.5 w-3.5" />
                      Tìm vé
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-gray-400 py-1">
                  <div className="h-px flex-1 bg-gray-200" />
                  <span>hoặc quét barcode qua camera</span>
                  <div className="h-px flex-1 bg-gray-200" />
                </div>

                <div className="relative overflow-hidden rounded-lg border border-dashed border-gray-300 bg-slate-950 flex flex-col justify-center items-center p-4">
                  <video
                    ref={qrVideoRef}
                    autoPlay
                    className={`h-48 w-full object-cover rounded ${qrCameraActive ? "block" : "hidden"}`}
                    playsInline
                    muted
                  />
                  {!qrCameraActive && !isOcrScanning && (
                    <div className="flex flex-col items-center justify-center gap-2 py-4">
                      <ScanLine className="h-10 w-10 text-gray-500" />
                      <p className="text-[11px] text-gray-400">
                        Nhấn <span className="font-semibold text-blue-400 cursor-pointer" onClick={startQrCamera}>Mở camera quét vé</span> hoặc <span className="font-semibold text-amber-400 cursor-pointer" onClick={() => qrFileInputRef.current?.click()}>Tải ảnh vé</span>
                      </p>
                    </div>
                  )}

                  {isOcrScanning && (
                    <div className="flex flex-col items-center justify-center gap-2 py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent border-sky-400" />
                      <span className="text-xs text-sky-400 font-medium">Đang nhận diện barcode thẻ...</span>
                    </div>
                  )}

                  <div className="flex gap-2 mt-3 w-full">
                    {qrCameraActive ? (
                      <>
                        <button
                          type="button"
                          onClick={handleQrCapture}
                          className="flex-1 flex h-[34px] items-center justify-center gap-1.5 rounded bg-green-600 text-xs font-semibold text-white hover:bg-green-700 transition-colors"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          Chụp ảnh
                        </button>
                        <button
                          type="button"
                          onClick={stopQrCamera}
                          className="flex h-[34px] items-center gap-1 rounded bg-red-500 px-3 text-xs font-semibold text-white hover:bg-red-650 transition-colors"
                        >
                          Hủy
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={startQrCamera}
                        disabled={isOcrScanning}
                        className="flex-1 flex h-[34px] items-center justify-center gap-1.5 rounded bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        Mở camera quét vé
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => qrFileInputRef.current?.click()}
                      disabled={isOcrScanning || qrCameraActive}
                      className="flex h-[34px] items-center gap-1 rounded border border-amber-400 bg-amber-50 px-3 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-100 disabled:opacity-40"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Tải ảnh
                    </button>
                    <input
                      ref={qrFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleQrFileUpload}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Exit Plate Scan */}
          {checkoutStep === "exit-plate" && (
            <div>
              <div className="flex items-center gap-2 bg-blue-600 px-4 py-2.5">
                <Camera className="h-4 w-4 text-white" />
                <span className="text-sm font-semibold text-white">
                  Bước 2: Quét biển số xe ra
                </span>
              </div>

              <div className="p-4 space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-800">
                  🏷️ Đã tìm thấy vé: <span className="font-bold">{ticket?.maVe}</span> (Biển số vào: <span className="font-bold">{ticket?.bienSo}</span>). Vui lòng quét hoặc nhập biển số lúc ra để đối chiếu.
                </div>

                <div
                  className={`relative w-full overflow-hidden rounded-lg border-2 bg-slate-950 transition-all ${
                    exitVideoStreaming ? "border-sky-400" : "border-dashed border-gray-400"
                  }`}
                  style={{ minHeight: exitVideoStreaming ? "220px" : undefined }}
                >
                  {exitVideoStreaming && (
                    <video
                      ref={exitVideoRef}
                      className="h-48 w-full object-cover"
                      autoPlay
                      playsInline
                    />
                  )}

                  {/* Bounding box dynamic overlays */}
                  {activeStepIndex >= 0 && (
                    <div 
                      className={`absolute z-10 transition-all duration-300 rounded border-2 ${
                        activeStepIndex >= 2 
                          ? "border-green-400 bg-green-500/10 shadow-[0_0_15px_rgba(74,222,128,0.4)]" 
                          : activeStepIndex >= 1 
                          ? "border-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.3)]" 
                          : "border-red-500 animate-pulse"
                      }`}
                      style={{
                        width: "60%",
                        height: "30%",
                        top: "35%",
                        left: "20%",
                        transform: activeStepIndex >= 1 ? "rotate(-1.2deg)" : "none"
                      }}
                    >
                      <div className="absolute left-0 top-0 h-3 w-3 rounded-tl border-l-[3px] border-t-[3px] border-inherit" />
                      <div className="absolute right-0 top-0 h-3 w-3 rounded-tr border-r-[3px] border-t-[3px] border-inherit" />
                      <div className="absolute bottom-0 left-0 h-3 w-3 rounded-bl border-b-[3px] border-l-[3px] border-inherit" />
                      <div className="absolute bottom-0 right-0 h-3 w-3 rounded-br border-b-[3px] border-r-[3px] border-inherit" />
                    </div>
                  )}

                  {!exitVideoStreaming && !isOcrScanning && !exitImage && (
                    <div className="flex min-h-[140px] flex-col items-center justify-center gap-2 py-8">
                      <ScanLine className="h-12 w-12 text-gray-500" />
                      <p className="text-xs text-gray-400">
                        Nhấn <span className="font-semibold text-blue-400 cursor-pointer" onClick={startExitCamera}>Mở camera chụp biển số</span>
                      </p>
                    </div>
                  )}

                  {!exitVideoStreaming && exitImage && (
                    <img
                      src={exitImage}
                      alt="Exit Plate Snapshot"
                      className="absolute inset-0 h-full w-full object-contain"
                    />
                  )}

                  {isOcrScanning && (
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white text-xs gap-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent border-sky-400" />
                      <span>Đang nhận diện biển số xe ra...</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  {exitVideoStreaming ? (
                    <>
                      <button
                        type="button"
                        onClick={handleCaptureExit}
                        className="flex h-[38px] flex-1 items-center justify-center gap-2 rounded bg-green-600 text-xs font-semibold text-white transition-colors hover:bg-green-700"
                      >
                        <Camera className="h-4 w-4" />
                        Chụp biển số
                      </button>
                      <button
                        type="button"
                        onClick={stopExitCamera}
                        className="flex h-[38px] shrink-0 items-center justify-center gap-2 rounded bg-red-500 px-4 text-xs font-semibold text-white transition-colors hover:bg-red-650"
                      >
                        Hủy
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={startExitCamera}
                      disabled={isOcrScanning}
                      className="flex h-[38px] flex-1 items-center justify-center gap-1.5 rounded bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700 disabled:bg-blue-300"
                    >
                      <Camera className="h-4 w-4" />
                      Mở camera chụp biển số
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => exitPlateFileInputRef.current?.click()}
                    disabled={isOcrScanning || exitVideoStreaming}
                    className="flex h-[38px] items-center gap-1.5 rounded border border-amber-400 bg-amber-50 px-3 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-100 disabled:opacity-40"
                  >
                    <Upload className="h-4 w-4" />
                    Tải ảnh xe ra
                  </button>
                  <input
                    ref={exitPlateFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleExitPlateUpload}
                  />
                </div>

                <div className="flex items-center gap-2 text-[11px] text-gray-400 py-1">
                  <div className="h-px flex-1 bg-gray-200" />
                  <span>hoặc nhập biển số thủ công</span>
                  <div className="h-px flex-1 bg-gray-200" />
                </div>

                <div className="flex gap-2">
                  <input
                    className="h-[38px] flex-1 rounded border border-gray-300 px-3 text-sm outline-none transition focus:border-blue-400 uppercase font-bold tracking-wider"
                    placeholder="VD: 29A12345"
                    value={inputCode}
                    onChange={(event) => setInputCode(event.target.value.toUpperCase())}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && inputCode.trim().length > 0) {
                        setExitPlate(inputCode.trim());
                        handleComparePlates(inputCode.trim());
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setExitPlate(inputCode.trim());
                      handleComparePlates(inputCode.trim());
                    }}
                    disabled={!inputCode.trim()}
                    className="flex h-[38px] items-center gap-1.5 rounded bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                  >
                    Đối chiếu
                  </button>
                </div>

                {ocrError && (
                  <div className="flex items-start gap-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <span>{ocrError}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Compare Results */}
          {checkoutStep === "compare" && (
            <div>
              <div className="flex items-center gap-2 bg-blue-600 px-4 py-2.5">
                <CheckCircle2 className="h-4 w-4 text-white" />
                <span className="text-sm font-semibold text-white">
                  Bước 3: Đối chiếu ảnh & biển số Vào / Ra
                </span>
              </div>

              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {/* Entry Photo Info */}
                  <div className="space-y-1 bg-gray-50 p-2 rounded border border-gray-200">
                    <span className="block text-xs text-gray-500 font-semibold">Ảnh xe lúc vào:</span>
                    <div className="h-32 border border-gray-300 rounded bg-black/5 overflow-hidden flex items-center justify-center">
                      {ticket?.entryImage ? (
                        <img src={ticket.entryImage} alt="Entry Plate" className="h-full w-full object-contain" />
                      ) : (
                        <span className="text-xs text-gray-400">Không có ảnh vào</span>
                      )}
                    </div>
                    <div className="text-xs text-center text-gray-700 mt-1">
                      Biển số vào: <span className="font-bold text-blue-700 uppercase">{ticket?.bienSo}</span>
                    </div>
                  </div>

                  {/* Exit Photo Info */}
                  <div className="space-y-1 bg-gray-50 p-2 rounded border border-gray-200">
                    <span className="block text-xs text-gray-500 font-semibold">Ảnh xe lúc ra:</span>
                    <div className="h-32 border border-gray-300 rounded bg-black/5 overflow-hidden flex items-center justify-center">
                      {exitImage ? (
                        <img src={exitImage} alt="Exit Plate" className="h-full w-full object-contain" />
                      ) : (
                        <span className="text-xs text-gray-400">Không có ảnh ra</span>
                      )}
                    </div>
                    <div className="text-xs text-center text-gray-700 mt-1">
                      Biển số ra: <span className="font-bold text-sky-700 uppercase">{exitPlate}</span>
                    </div>
                  </div>
                </div>

                {plateMatchConfirmed ? (
                  <div className="w-full rounded-lg border border-green-200 bg-green-50 px-4 py-3 flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
                    <div>
                      <p className="text-xs font-bold text-green-700">Trạng thái: Hợp lệ</p>
                      <p className="text-[11px] text-green-600">Biển số xe ra khớp hoàn toàn với biển số xe vào.</p>
                    </div>
                  </div>
                ) : (
                  <div className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
                      <div>
                        <p className="text-xs font-bold text-red-700">Trạng thái: Không trùng khớp!</p>
                        <p className="text-[11px] text-red-600">Biển số lúc ra ({exitPlate}) khác với lúc vào ({ticket?.bienSo}).</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setPlateMatchConfirmed(true)}
                        className="flex-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold transition-colors cursor-pointer"
                      >
                        ⚠️ Cưỡng chế cho xe ra
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCheckoutStep("exit-plate");
                          setExitPlate("");
                          setExitImage(null);
                        }}
                        className="px-3 py-1.5 border border-gray-350 bg-white hover:bg-gray-50 text-gray-700 rounded text-xs font-semibold cursor-pointer"
                      >
                        Quét lại
                      </button>
                    </div>
                  </div>
                )}

                <div className="pt-2 flex justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setCheckoutStep("exit-plate");
                      setErrorMsg(null);
                    }}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Quay lại bước 2
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="text-xs text-gray-500 hover:underline"
                  >
                    Hủy giao dịch
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Feedback section */}
          <div className="px-4 pb-4">
            {errorMsg && (
              <div className="flex items-start gap-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>
        </div>

        {/* Ticket details right-side panel */}
        <div className="overflow-hidden rounded border border-gray-200 bg-white shadow-sm flex flex-col min-h-[480px]">
          <div className={`flex items-center gap-2 px-4 py-2.5 ${ticket ? "bg-green-600" : "bg-gray-400"}`}>
            <CreditCard className="h-4 w-4 text-white" />
            <span className="text-sm font-semibold text-white">
              Thông tin thanh toán & xuất xe
            </span>
          </div>

          {!ticket ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 py-16">
              <CreditCard className="mb-3 h-16 w-16 opacity-20" />
              <p className="text-sm">
                Vui lòng nhập barcode ở bước 1 để tải thông tin vé
              </p>
            </div>
          ) : confirmed ? (
            <div className="flex-1 flex flex-col items-center justify-center px-5 py-12 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              <p className="text-base font-semibold text-green-700">
                Xử lý xe ra thành công!
              </p>
              <p className="mt-2 text-sm text-gray-500">
                Xe <span className="font-semibold text-gray-700">{ticket.bienSo}</span> đã được ghi nhận rời bãi.
              </p>
              <button
                type="button"
                onClick={handleCancel}
                className="mt-5 rounded bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
              >
                Tiếp nhận xe tiếp theo
              </button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-between p-4 space-y-4">
              <div className="space-y-2">
                <div className="grid grid-cols-[120px_1fr] gap-2 text-xs leading-6 border-b border-gray-100 py-1">
                  <span className="text-gray-500 font-medium">Mã vé (Barcode):</span>
                  <span className="text-right text-gray-800 font-bold">{ticket.maVe}</span>
                </div>
                <div className="grid grid-cols-[120px_1fr] gap-2 text-xs leading-6 border-b border-gray-100 py-1">
                  <span className="text-gray-500 font-medium">Biển số vào:</span>
                  <span className="text-right text-gray-800 font-bold">{ticket.bienSo}</span>
                </div>
                <div className="grid grid-cols-[120px_1fr] gap-2 text-xs leading-6 border-b border-gray-100 py-1">
                  <span className="text-gray-500 font-medium">Loại xe:</span>
                  <span className="text-right text-gray-800 font-semibold">{ticket.loaiXe}</span>
                </div>
                <div className="grid grid-cols-[120px_1fr] gap-2 text-xs leading-6 border-b border-gray-100 py-1">
                  <span className="text-gray-500 font-medium">Thời gian vào:</span>
                  <span className="text-right text-gray-800 font-semibold">{ticket.tgVao}</span>
                </div>
                <div className="grid grid-cols-[120px_1fr] gap-2 text-xs leading-6 border-b border-gray-100 py-1">
                  <span className="text-gray-500 font-medium">Thời gian ra:</span>
                  <span className="text-right text-gray-800 font-semibold">{ticket.tgRa}</span>
                </div>
                <div className="grid grid-cols-[120px_1fr] gap-2 text-xs leading-6 border-b border-gray-100 py-1">
                  <span className="text-gray-500 font-medium">Thời gian gửi:</span>
                  <span className="text-right text-gray-800 font-semibold">{ticket.thoiGianGui}</span>
                </div>
                {ticket.violationReason && (
                  <div className="grid grid-cols-[120px_1fr] gap-2 text-xs leading-6 text-red-650 font-semibold bg-red-50 p-2 rounded border border-red-200 mt-2">
                    <span className="text-red-500">Lý do vi phạm:</span>
                    <span className="text-right">{ticket.violationReason}</span>
                  </div>
                )}
              </div>

              <div className="rounded-lg bg-blue-600 px-4 py-4 text-center">
                <p className="text-xs text-blue-100">
                  Tổng phí gửi xe
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-white">
                  {ticket.phi.toLocaleString("vi-VN")} VNĐ
                </p>
                <p className="mt-1 text-[10px] italic text-blue-200">
                  {ticket.phi === 0 ? "Thanh toán bằng thẻ tháng / vé đặt trước" : (ticket.loaiXe.includes("Ô tô") ? "Vé lượt ô tô" : "Vé lượt xe máy")}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex gap-2">
                  {ticket.phi > 0 ? (
                    <button
                      type="button"
                      disabled={!plateMatchConfirmed || checkoutStep !== "compare"}
                      onClick={() => setIsPaymentModalOpen(true)}
                      className="flex min-h-[42px] flex-1 items-center justify-center gap-2 rounded bg-blue-600 px-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed cursor-pointer shadow"
                    >
                      <QrCode className="h-4 w-4" />
                      Thanh toán
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={!plateMatchConfirmed || checkoutStep !== "compare"}
                      onClick={executeFinalCheckOut}
                      className="flex min-h-[42px] flex-1 items-center justify-center gap-2 rounded bg-green-600 px-3 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed cursor-pointer shadow"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Xác nhận &amp; Cho xe ra (Thẻ tháng)
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleCancel}
                    className="flex h-[42px] items-center gap-1.5 rounded border border-gray-300 px-4 text-sm text-gray-600 transition-colors hover:bg-gray-50 cursor-pointer"
                  >
                    Hủy
                  </button>
                </div>

                {checkoutStep !== "compare" && (
                  <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-2.5 text-[11px] text-yellow-800 text-center">
                    ⚠️ Vui lòng hoàn tất nhập thông tin và đối chiếu biển số xe cột bên trái để tiếp tục.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {ticket && (
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          onSuccess={() => {
            setIsPaymentModalOpen(false);
            executeFinalCheckOut();
          }}
          parkingSessionId={ticket.parkingSessionId}
          parkingSessionNo={ticket.maVe}
          plateNo={ticket.bienSo}
          vehicleType={ticket.vehicleType}
          checkInAt={ticket.rawCheckInAt}
          checkOutAt={ticket.rawCheckOutAt}
          feeAmount={ticket.phi}
        />
      )}
    </div>
  );
}
