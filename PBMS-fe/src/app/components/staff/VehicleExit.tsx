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
  ticketId: number;
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
  selectedLaneCode: string;
  selectedFloorCode?: string;
}

export default function VehicleExit({ selectedLaneCode, selectedFloorCode }: VehicleExitProps) {
  const [scanning, setScanning] = useState(false);
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

  // Quy trình Check-out mới theo từng bước
  const [checkoutStep, setCheckoutStep] = useState<"plate" | "compare" | "ticket" | "matched">("plate");
  const [recognizedTicketCode, setRecognizedTicketCode] = useState("");

  // QR Camera states
  const [qrCameraActive, setQrCameraActive] = useState(false);
  const qrVideoRef = useRef<HTMLVideoElement | null>(null);
  const qrStreamRef = useRef<MediaStream | null>(null);
  const qrFileInputRef = useRef<HTMLInputElement | null>(null);

  // New Exit flow states
  const [exitImage, setExitImage] = useState<string | null>(null);
  const [exitPlate, setExitPlate] = useState("");
  const [isOcrScanning, setIsOcrScanning] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [plateMatchConfirmed, setPlateMatchConfirmed] = useState(false);
  const [activeExitScanner, setActiveExitScanner] = useState<"plate" | null>(null);
  const [exitVideoStreaming, setExitVideoStreaming] = useState(false);
  const [ocrSteps, setOcrSteps] = useState<{ label: string; detail: string; status: "idle" | "running" | "success" | "failed" }[]>([]);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(-1);

  const exitVideoRef = useRef<HTMLVideoElement | null>(null);
  const exitStreamRef = useRef<MediaStream | null>(null);
  const exitPlateFileInputRef = useRef<HTMLInputElement | null>(null);

  const startExitCamera = async () => {
    setErrorMsg(null);
    setOcrError(null);
    setExitImage(null);
    setExitPlate("");
    setPlateMatchConfirmed(false);
    setActiveExitScanner("plate");
    setExitVideoStreaming(true);

    if (!navigator || !navigator.mediaDevices) {
      setOcrError("Trình duyệt không hỗ trợ camera hoặc yêu cầu kết nối bảo mật HTTPS khi truy cập qua mạng LAN.");
      setExitVideoStreaming(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" }
      });
      exitStreamRef.current = stream;
      if (exitVideoRef.current) {
        exitVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Lỗi mở camera exit", err);
      setOcrError("Không thể mở camera. Vui lòng chọn Tải ảnh lên hoặc cấp quyền camera.");
      setExitVideoStreaming(false);
    }
  };

  const stopExitCamera = () => {
    if (exitStreamRef.current) {
      exitStreamRef.current.getTracks().forEach(track => track.stop());
      exitStreamRef.current = null;
    }
    setExitVideoStreaming(false);
    setActiveExitScanner(null);
  };

  useEffect(() => {
    return () => {
      if (exitStreamRef.current) {
        exitStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const runExitPlateOCR = async (base64Image: string, dataUrl: string) => {
    setIsOcrScanning(true);
    setOcrError(null);
    setExitImage(dataUrl);

    const steps = [
      { label: "1. Định vị biển số xe ra", detail: "Đang phân tích vị trí...", status: "running" as const },
      { label: "2. Gọi Gemini API", detail: "Đang nhận dạng...", status: "idle" as const },
    ];
    setOcrSteps(steps);
    setActiveStepIndex(0);

    try {
      await new Promise((resolve) => setTimeout(resolve, 400));
      steps[0].status = "success";
      steps[0].detail = "Đã tìm thấy vùng biển số.";
      steps[1].status = "running";
      steps[1].detail = "Đang gửi lên Gemini API...";
      setOcrSteps([...steps]);
      setActiveStepIndex(1);

      const apiKey = "AQ.Ab8RN6JSCpMXwWySUtrFPXJLhydSeyJA6ZIL0OZaUZ0yHkpbWA";
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: "Identify and extract the license plate number of the vehicle from this image. Clean the output by removing all spaces, dots, dashes, and extra words. Return ONLY a JSON object with format {\"plate\": \"CLEAN_PLATE_NUMBER\"}."
                  },
                  {
                    inlineData: {
                      mimeType: "image/jpeg",
                      data: base64Image,
                    }
                  }
                ]
              }
            ],
            generationConfig: {
              responseMimeType: "application/json",
            }
          })
        }
      );

      if (!response.ok) throw new Error("Lỗi kết nối Gemini API.");
      const resData = await response.json();
      const textResponse = resData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textResponse) throw new Error("Không nhận diện được phản hồi từ Gemini API.");

      const parsed = JSON.parse(textResponse);
      const recognized = (parsed.plate || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (!recognized) throw new Error("Không tìm thấy biển số trong ảnh.");

      steps[1].status = "success";
      steps[1].detail = `Nhận diện thành công: ${recognized}`;
      setOcrSteps([...steps]);
      setActiveStepIndex(2);

      setExitPlate(recognized);
      setIsOcrScanning(false);

      try {
        await fetchTicketByExitPlate(recognized, dataUrl);
      } catch (e: any) {
        setOcrError(e.message || "Không tìm thấy thông tin xe đang gửi với biển số này.");
      }
    } catch (err: any) {
      console.error(err);
      steps[1].status = "failed";
      steps[1].detail = err.message || "Lỗi xử lý.";
      setOcrSteps([...steps]);
      setOcrError(err.message || "Không nhận diện được biển số. Bạn có thể tự nhập.");
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

  const handleExitPlateUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64Image = dataUrl.split(",")[1];
      runExitPlateOCR(base64Image, dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const fetchTicketByExitPlate = async (plate: string, exitImgUrl: string | null) => {
    setErrorMsg(null);
    setNotFound(false);
    setOcrError(null);

    if (!selectedLaneCode) {
      setErrorMsg("Vui lòng chọn Làn xe ra trên thanh topbar trước.");
      throw new Error("Làn xe ra chưa được chọn");
    }

    if (!floorCode) {
      setErrorMsg("Vui lòng chọn Tầng trước.");
      throw new Error("Tầng chưa được chọn");
    }

    try {
      const resp = await staffService.previewCheckOut(plate.trim(), selectedLaneCode);

      const ticketInfo: TicketInfo = {
        ticketId: resp.ticketId,
        maVe: resp.ticketNo,
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
      setExitPlate(plate);
      if (exitImgUrl) setExitImage(exitImgUrl);
      setNotFound(false);
      setConfirmed(false);
      
      // Chuyển sang bước đối chiếu
      setCheckoutStep("compare");
      setErrorMsg(null);
    } catch (err: any) {
      setTicket(null);
      setNotFound(true);
      setErrorMsg(err.message || "Không tìm thấy thông tin xe đang gửi với biển số này.");
      throw err;
    }
  };

  const processCheckOut = async (code: string) => {
    setErrorMsg(null);
    setNotFound(false);
    setExitImage(null);
    setExitPlate("");
    setPlateMatchConfirmed(false);

    if (!selectedLaneCode) {
      setErrorMsg("Vui lòng chọn Làn xe ra trên thanh topbar trước.");
      return;
    }

    if (!floorCode) {
      setErrorMsg("Vui lòng chọn Tầng trước.");
      return;
    }

    try {
      const resp = await staffService.previewCheckOut(code.trim(), selectedLaneCode);

      const ticketInfo: TicketInfo = {
        ticketId: resp.ticketId,
        maVe: resp.ticketNo,
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
        ticketNoOrQrToken: ticket.maVe,
        laneCode: selectedLaneCode,
        floorCode: floorCode,
        exitImage: exitImage || undefined
      });
      setConfirmed(true);
      try {
        localStorage.removeItem("parking-ticket:last");
      } catch (e) {}
    } catch (err: any) {
      setErrorMsg(err.message || "Có lỗi xảy ra khi thực hiện cho xe ra.");
    }
  };

  const runExitTicketOCR = async (base64Image: string, dataUrl: string) => {
    setScanning(true);
    setErrorMsg(null);
    setNotFound(false);

    try {
      const apiKey = "AQ.Ab8RN6JSCpMXwWySUtrFPXJLhydSeyJA6ZIL0OZaUZ0yHkpbWA";
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: "Identify and extract the ticket number, card number, or reservation code (e.g. TK000003, CARD000005, RES001) from this ticket image. Clean the output by removing all spaces, dots, and dashes. Return ONLY a JSON object with format {\"code\": \"TK000003\"}."
                  },
                  {
                    inlineData: {
                      mimeType: "image/jpeg",
                      data: base64Image,
                    }
                  }
                ]
              }
            ],
            generationConfig: {
              responseMimeType: "application/json",
            }
          })
        }
      );

      if (!response.ok) throw new Error("Lỗi kết nối Gemini API.");
      const resData = await response.json();
      const textResponse = resData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textResponse) throw new Error("Không nhận diện được phản hồi từ Gemini API.");

      const parsed = JSON.parse(textResponse);
      const recognized = (parsed.code || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (!recognized) throw new Error("Không tìm thấy mã vé trong ảnh.");

      setInputCode(recognized);
      setInputCode(recognized);
      setRecognizedTicketCode(recognized);

      if (ticket) {
        const cleanTicketNo = ticket.maVe.toUpperCase().replace(/[^A-Z0-9]/g, "");
        const cleanQrPayload = ticket.qrPayload ? ticket.qrPayload.toUpperCase().replace(/[^A-Z0-9]/g, "") : "";
        
        if (recognized === cleanTicketNo || recognized === cleanQrPayload) {
          setPlateMatchConfirmed(true);
          setCheckoutStep("matched");
          stopQrCamera();
        } else {
          setPlateMatchConfirmed(false);
          throw new Error(`Mã vé không khớp! Quét được: "${recognized}", yêu cầu: "${ticket.maVe}"`);
        }
      } else {
        throw new Error("Vui lòng chụp biển số xe ra trước để lấy thông tin đối chiếu.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Không thể nhận diện mã vé từ ảnh.");
      setPlateMatchConfirmed(false);
    } finally {
      setScanning(false);
    }
  };

  // QR Camera - start/stop
  const startQrCamera = async () => {
    setQrCameraActive(true);
    setNotFound(false);
    setErrorMsg(null);

    if (!navigator || !navigator.mediaDevices) {
      setErrorMsg("Trình duyệt không hỗ trợ camera.");
      setQrCameraActive(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" }
      });
      qrStreamRef.current = stream;
      if (qrVideoRef.current) {
        qrVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Lỗi mở camera ticket exit", err);
      setErrorMsg("Không thể mở camera. Vui lòng cấp quyền camera.");
      setQrCameraActive(false);
    }
  };

  const stopQrCamera = () => {
    if (qrStreamRef.current) {
      qrStreamRef.current.getTracks().forEach(track => track.stop());
      qrStreamRef.current = null;
    }
    setQrCameraActive(false);
    setScanning(false);
  };

  // Capture image from ticket camera feed
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
        runExitTicketOCR(base64Image, dataUrl);
        stopQrCamera();
      }
    }
  };

  // Handle QR image file upload
  const handleQrFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNotFound(false);
    setErrorMsg(null);
    setScanning(true);

    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64Image = dataUrl.split(",")[1];
      runExitTicketOCR(base64Image, dataUrl);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleManualSearch = () => {
    if (!inputCode.trim()) return;
    
    if (checkoutStep === "plate") {
      fetchTicketByExitPlate(inputCode, null).catch(err => {
        console.error("Lỗi tìm vé qua biển số", err);
      });
    } else if (checkoutStep === "ticket") {
      const cleanCode = inputCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
      setRecognizedTicketCode(cleanCode);
      if (ticket) {
        const cleanTicketNo = ticket.maVe.toUpperCase().replace(/[^A-Z0-9]/g, "");
        const cleanQrPayload = ticket.qrPayload ? ticket.qrPayload.toUpperCase().replace(/[^A-Z0-9]/g, "") : "";
        if (cleanCode === cleanTicketNo || cleanCode === cleanQrPayload) {
          setPlateMatchConfirmed(true);
          setCheckoutStep("matched");
          setErrorMsg(null);
        } else {
          setPlateMatchConfirmed(false);
          setErrorMsg(`Mã vé nhập tay không khớp! Bạn nhập: ${cleanCode}, Yêu cầu: ${ticket.maVe}`);
        }
      }
    }
  };

  const handleCancel = () => {
    setTicket(null);
    setInputCode("");
    setNotFound(false);
    setConfirmed(false);
    setScanning(false);
    setErrorMsg(null);
    setExitImage(null);
    setExitPlate("");
    setPlateMatchConfirmed(false);
    stopExitCamera();
    stopQrCamera();
    setCheckoutStep("plate");
    setRecognizedTicketCode("");
  };

  return (
    <div className="space-y-3">
      {/* Tiêu đề */}
      <div className="flex items-center justify-between rounded border border-gray-200 bg-white px-4 py-2.5 shadow-sm">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-semibold text-gray-700">
            Tiếp nhận xe ra (Làn ra hiện tại: {selectedLaneCode || "Chưa chọn"})
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
        {/* Chụp ảnh vé */}
        <div className="overflow-hidden rounded border border-gray-200 bg-white shadow-sm">
          {checkoutStep === "plate" && (
            <>
              <div className="flex items-center gap-2 bg-blue-600 px-4 py-2.5">
                <Camera className="h-4 w-4 text-white" />
                <span className="text-sm font-semibold text-white">
                  Bước 1: Chụp ảnh biển số xe ra
                </span>
              </div>
              <div className="space-y-3 p-4">
                <div
                  className={`relative w-full overflow-hidden rounded-lg border-2 bg-slate-950 transition-all ${
                    exitVideoStreaming ? "border-sky-400" : "border-dashed border-gray-400"
                  }`}
                  style={{ minHeight: exitVideoStreaming ? "260px" : undefined }}
                >
                  {exitVideoStreaming && (
                    <video
                      ref={exitVideoRef}
                      className="h-full w-full object-cover"
                      style={{ minHeight: "260px" }}
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

                      {isOcrScanning && activeStepIndex === 0 && (
                        <div className="absolute left-0 right-0 top-0 h-[2px] bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.8)] animate-[scanLine_2s_infinite_linear]" />
                      )}
                    </div>
                  )}

                  {activeStepIndex >= 2 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <span className="text-xl font-bold tracking-widest text-green-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                        {exitPlate}
                      </span>
                    </div>
                  )}

                  {!exitVideoStreaming && !isOcrScanning && !exitImage && (
                    <div className="flex min-h-[140px] flex-col items-center justify-center gap-2 py-8">
                      <ScanLine className="h-14 w-14 text-gray-500" />
                      <p className="text-xs text-gray-400">
                        Nhấn <span className="font-semibold text-blue-400">Mở camera chụp biển số</span> để bắt đầu
                      </p>
                      <p className="text-[10px] text-gray-500">
                        hoặc <span className="font-semibold text-amber-400">Tải ảnh xe ra</span> để nhận dạng
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
                        className="flex h-[42px] flex-1 items-center justify-center gap-2 rounded bg-green-600 text-sm font-medium text-white transition-colors hover:bg-green-700"
                      >
                        <Camera className="h-4 w-4" />
                        Chụp biển số xe
                      </button>
                      <button
                        type="button"
                        onClick={stopExitCamera}
                        className="flex h-[42px] shrink-0 items-center justify-center gap-2 rounded bg-red-500 px-4 text-sm font-medium text-white transition-colors hover:bg-red-600"
                      >
                        <X className="h-4 w-4" />
                        Đóng
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={startExitCamera}
                      disabled={isOcrScanning}
                      className="flex h-[42px] flex-1 items-center justify-center gap-2 rounded bg-blue-600 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:bg-blue-300"
                    >
                      <Camera className="h-4 w-4" />
                      {isOcrScanning ? "Đang xử lý..." : "Mở camera chụp biển số"}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => exitPlateFileInputRef.current?.click()}
                    disabled={isOcrScanning || exitVideoStreaming}
                    className="flex h-[42px] items-center justify-center gap-1.5 rounded border border-amber-400 bg-amber-50 px-3 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-100 disabled:opacity-40"
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

                <div className="flex items-center gap-2 text-[11px] text-gray-400">
                  <div className="h-px flex-1 bg-gray-200" />
                  <span>hoặc nhập biển số thủ công</span>
                  <div className="h-px flex-1 bg-gray-200" />
                </div>

                <div className="flex gap-2">
                  <input
                    className="h-[38px] flex-1 rounded border border-gray-300 px-3 text-sm outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-100 uppercase font-bold"
                    placeholder="VD: 29X1-12345 hoặc 30A-99999"
                    value={inputCode}
                    onChange={(event) => setInputCode(event.target.value.toUpperCase())}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        handleManualSearch();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleManualSearch}
                    disabled={!inputCode.trim()}
                    className="flex h-[38px] items-center gap-1.5 rounded bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                  >
                    <Search className="h-3.5 w-3.5" />
                    Tìm vé
                  </button>
                </div>

                {ocrError && (
                  <div className="flex items-start gap-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <span>{ocrError}</span>
                  </div>
                )}
              </div>
            </>
          )}

          {checkoutStep === "compare" && (
            <>
              <div className="flex items-center gap-2 bg-blue-600 px-4 py-2.5">
                <CheckCircle2 className="h-4 w-4 text-white" />
                <span className="text-sm font-semibold text-white">
                  Bước 2: So sánh ảnh xe Vào / Ra
                </span>
              </div>
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {/* Left: Check-in image */}
                  <div className="space-y-1 bg-gray-50 p-2 rounded border border-gray-200">
                    <span className="block text-xs text-gray-500 font-semibold">Ảnh xe lúc vào:</span>
                    <div className="h-40 border border-gray-300 rounded bg-black/5 overflow-hidden flex items-center justify-center">
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
                  
                  {/* Right: Check-out image */}
                  <div className="space-y-1 bg-gray-50 p-2 rounded border border-gray-200">
                    <span className="block text-xs text-gray-500 font-semibold">Ảnh xe lúc ra:</span>
                    <div className="h-40 border border-gray-300 rounded bg-black/5 overflow-hidden flex items-center justify-center">
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

                <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-xs text-yellow-800">
                  💡 Nhân viên đối chiếu hình ảnh và biển số xe Vào / Ra. Nếu khớp nhau, hãy bấm nút tiếp tục bên dưới để chụp vé.
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setCheckoutStep("ticket");
                    setInputCode(""); // Reset input field for next step
                    setErrorMsg(null);
                  }}
                  className="w-full flex h-[46px] items-center justify-center gap-2 rounded bg-green-600 font-bold text-white hover:bg-green-700 transition-colors shadow-md text-sm"
                >
                  <Camera className="w-5 h-5" />
                  Tiếp tục: Chụp ảnh vé xe ra
                </button>
              </div>
            </>
          )}

          {checkoutStep === "ticket" && (
            <>
              <div className="flex items-center gap-2 bg-blue-600 px-4 py-2.5">
                <Camera className="h-4 w-4 text-white" />
                <span className="text-sm font-semibold text-white">
                  Bước 3: Chụp ảnh vé xe ra
                </span>
              </div>
              <div className="space-y-3 p-4">
                <div
                  className={`relative w-full overflow-hidden rounded-lg border-2 bg-slate-950 transition-all ${
                    qrCameraActive ? "border-blue-400" : "border-dashed border-gray-400"
                  }`}
                  style={{ minHeight: qrCameraActive ? "260px" : undefined }}
                >
                  <video
                    ref={qrVideoRef}
                    autoPlay
                    className={`h-full w-full object-cover ${qrCameraActive ? "block" : "hidden"}`}
                    style={{ minHeight: "260px" }}
                    playsInline
                    muted
                  />

                  {qrCameraActive && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <div className="relative h-40 w-40">
                        <div className="absolute left-0 top-0 h-7 w-7 border-l-4 border-t-4 border-blue-400" />
                        <div className="absolute right-0 top-0 h-7 w-7 border-r-4 border-t-4 border-blue-400" />
                        <div className="absolute bottom-0 left-0 h-7 w-7 border-b-4 border-l-4 border-blue-400" />
                        <div className="absolute bottom-0 right-0 h-7 w-7 border-b-4 border-r-4 border-blue-400" />
                        <div className="absolute left-1 right-1 top-1/2 h-0.5 animate-pulse bg-blue-400 opacity-80" />
                      </div>
                      <p className="absolute bottom-2 left-0 right-0 text-center text-[10px] text-blue-300">
                        Căn chỉnh vé vào khung hình và bấm nút chụp
                      </p>
                    </div>
                  )}

                  {!qrCameraActive && !scanning && (
                    <div className="flex min-h-[140px] flex-col items-center justify-center gap-2 py-8">
                      <ScanLine className="h-14 w-14 text-gray-500" />
                      <p className="text-xs text-gray-400">
                        Nhấn <span className="font-semibold text-blue-400">Mở camera chụp vé</span> để mở camera
                      </p>
                      <p className="text-[10px] text-gray-500">
                        hoặc <span className="font-semibold text-amber-400">Tải ảnh vé</span> để đọc từ file
                      </p>
                    </div>
                  )}

                  {scanning && !qrCameraActive && (
                    <div className="flex min-h-[140px] flex-col items-center justify-center gap-2 py-8">
                      <div className="relative h-12 w-12">
                        <div className="absolute inset-0 animate-spin rounded-full border-4 border-blue-400 border-t-transparent" />
                        <Camera className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 text-blue-400" />
                      </div>
                      <p className="animate-pulse text-xs text-blue-300">Đang nhận diện mã vé...</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  {qrCameraActive ? (
                    <>
                      <button
                        type="button"
                        onClick={handleQrCapture}
                        className="flex h-[42px] flex-1 items-center justify-center gap-2 rounded bg-green-600 text-sm font-medium text-white transition-colors hover:bg-green-700"
                      >
                        <Camera className="h-4 w-4" />
                        Chụp ảnh vé
                      </button>
                      <button
                        type="button"
                        onClick={stopQrCamera}
                        className="flex h-[42px] shrink-0 items-center justify-center gap-2 rounded bg-red-500 px-4 text-sm font-medium text-white transition-colors hover:bg-red-600"
                      >
                        <X className="h-4 w-4" />
                        Đóng
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={startQrCamera}
                      disabled={scanning}
                      className="flex h-[42px] flex-1 items-center justify-center gap-2 rounded bg-blue-600 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:bg-blue-300"
                    >
                      <Camera className="h-4 w-4" />
                      {scanning ? "Đang xử lý..." : "Mở camera chụp vé"}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => qrFileInputRef.current?.click()}
                    disabled={scanning || qrCameraActive}
                    className="flex h-[42px] items-center justify-center gap-1.5 rounded border border-amber-400 bg-amber-50 px-3 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-100 disabled:opacity-40"
                  >
                    <Upload className="h-4 w-4" />
                    Tải ảnh vé
                  </button>
                  <input
                    ref={qrFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleQrFileUpload}
                  />
                </div>

                <div className="flex items-center gap-2 text-[11px] text-gray-400">
                  <div className="h-px flex-1 bg-gray-200" />
                  <span>hoặc nhập mã vé thủ công</span>
                  <div className="h-px flex-1 bg-gray-200" />
                </div>

                <div className="flex gap-2">
                  <input
                    className="h-[38px] flex-1 rounded border border-gray-300 px-3 text-sm outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                    placeholder="VD: TK000001, CARD000001"
                    value={inputCode}
                    onChange={(event) => setInputCode(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        handleManualSearch();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleManualSearch}
                    disabled={!inputCode.trim()}
                    className="flex h-[38px] items-center gap-1.5 rounded bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                  >
                    <Search className="h-3.5 w-3.5" />
                    Đối chiếu vé
                  </button>
                </div>
              </div>
            </>
          )}

          {checkoutStep === "matched" && (
            <>
              <div className="flex items-center gap-2 bg-green-600 px-4 py-2.5">
                <CheckCircle2 className="h-4 w-4 text-white" />
                <span className="text-sm font-semibold text-white">
                  Vé xe khớp hoàn toàn
                </span>
              </div>
              <div className="p-8 text-center space-y-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-gray-800">Xác thực thành công!</h4>
                  <p className="text-xs text-gray-500">Mã vé xe ra khớp hoàn toàn với thông tin biển số xe lúc vào.</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 inline-block">
                  <span className="text-xs font-semibold text-green-800 font-mono uppercase bg-green-100 px-2 py-1 rounded">
                    Mã vé: {recognizedTicketCode || ticket?.maVe}
                  </span>
                </div>
                
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCheckoutStep("ticket");
                      setPlateMatchConfirmed(false);
                      setInputCode("");
                    }}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Chụp lại vé khác
                  </button>
                </div>
              </div>
            </>
          )}

          <div className="px-4 pb-4">
            {errorMsg && (
              <div className="flex items-start gap-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>
        </div>

        {/* Thông tin vé */}
        <div className="overflow-hidden rounded border border-gray-200 bg-white shadow-sm">
          <div className={`flex items-center gap-2 px-4 py-2.5 ${ticket ? "bg-green-600" : "bg-gray-400"}`}>
            <CreditCard className="h-4 w-4 text-white" />
            <span className="text-sm font-semibold text-white">
              Thông tin vé
            </span>
          </div>

          {!ticket ? (
            <div className="flex min-h-[390px] flex-col items-center justify-center text-gray-400">
              <CreditCard className="mb-3 h-16 w-16 opacity-20" />
              <p className="text-sm">
                Chụp ảnh vé hoặc nhập mã vé để tiếp tục
              </p>
            </div>
          ) : confirmed ? (
            <div className="flex min-h-[390px] flex-col items-center justify-center px-5 py-12 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>

              <p className="text-base font-semibold text-green-700">
                Xử lý xe ra thành công!
              </p>

              <p className="mt-2 text-sm text-gray-500">
                Xe <span className="font-semibold text-gray-700">{ticket.bienSo}</span> đã rời bãi đỗ xe.
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
            <div className="space-y-3 p-4">
              <div className="w-full">
                <div>
                  <div className="grid grid-cols-[120px_1fr] gap-2 text-xs leading-6 border-b border-gray-100 py-1">
                    <span className="text-gray-500 font-medium">Mã vé:</span>
                    <span className="text-right text-gray-800 font-bold">{ticket.maVe}</span>
                  </div>
                  <div className="grid grid-cols-[120px_1fr] gap-2 text-xs leading-6 border-b border-gray-100 py-1">
                    <span className="text-gray-500 font-medium">Biển số:</span>
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
                    <div className="grid grid-cols-[120px_1fr] gap-2 text-xs leading-6 text-red-600 font-semibold bg-red-50 p-2 rounded border border-red-200 mt-2">
                      <span className="text-red-500">Lý do vi phạm:</span>
                      <span className="text-right">{ticket.violationReason}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-lg bg-blue-600 px-4 py-4 text-center">
                <p className="text-xs text-blue-100">
                  Tổng phí gửi xe
                </p>

                <p className="mt-1 text-3xl font-bold tabular-nums text-white">
                  {ticket.phi.toLocaleString("vi-VN")} VNĐ
                </p>

                <p className="mt-1 text-[11px] italic text-blue-200">
                  {ticket.phi === 0 ? "Thanh toán bằng thẻ tháng / vé đặt trước" : (ticket.loaiXe.includes("Ô tô") ? "Vé lượt ô tô" : "Vé lượt xe máy")}
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                {ticket.phi > 0 ? (
                  <button
                    type="button"
                    disabled={!plateMatchConfirmed || checkoutStep !== "matched"}
                    onClick={() => setIsPaymentModalOpen(true)}
                    className="flex min-h-[42px] flex-1 items-center justify-center gap-2 rounded bg-blue-600 px-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed"
                  >
                    <QrCode className="h-4 w-4" />
                    Thanh toán QR (VietQR)
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={!plateMatchConfirmed || checkoutStep !== "matched"}
                    onClick={executeFinalCheckOut}
                    className="flex min-h-[42px] flex-1 items-center justify-center gap-2 rounded bg-green-600 px-3 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Xác nhận &amp; Cho xe ra (Thẻ tháng)
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex h-[42px] items-center gap-1.5 rounded border border-gray-300 px-4 text-sm text-gray-600 transition-colors hover:bg-gray-50"
                >
                  <X className="h-4 w-4" />
                  Hủy
                </button>
              </div>

              {checkoutStep !== "matched" && (
                <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-xs text-yellow-800 text-center">
                  ⚠️ Vui lòng hoàn thành đối chiếu biển số xe và quét/chụp vé ở cột bên trái để mở khóa nút cho xe ra / thanh toán.
                </div>
              )}
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
          ticketId={ticket.ticketId}
          ticketNo={ticket.maVe}
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
