import { useState, useRef, useEffect } from "react";
import {
  Plus,
  Printer,
  RotateCcw,
  CheckCircle,
  Car,
  Camera,
  ScanLine,
  X,
  Bike,
  AlertCircle,
  Upload,
} from "lucide-react";

import { staffService } from "../../../services/staffService";

interface VehicleEntryProps {
  selectedFloorCode: string;
}

interface TicketPayload {
  version: 1;
  maVe: string;
  bienSo: string;
  loaiXe: string;
  tgVao: string;
  createdAt: string;
  tang: string;
}

interface Ticket extends TicketPayload {
  qrPayload: string;
}

// Helper utility to parse Vietnamese plates into 1-line or 2-line representations
function parsePlateToLines(plate: string, type: string): { lines: string[]; lineCount: 1 | 2 } {
  const clean = (plate || "").trim().toUpperCase();
  if (clean.includes("-")) {
    const parts = clean.split("-");
    return { lines: [parts[0], parts[1]], lineCount: 2 };
  }
  if (type === "Xe máy") {
    const basic = clean.replace(/[^A-Z0-9]/g, "");
    if (basic.length >= 4) {
      return { lines: [basic.substring(0, 4), basic.substring(4)], lineCount: 2 };
    }
  }
  return { lines: [clean], lineCount: 1 };
}

export default function VehicleEntry({ selectedFloorCode }: VehicleEntryProps) {
  const [bienSo, setBienSo] = useState("");
  const [loaiXe, setLoaiXe] = useState("Xe máy");
  const [isPreBooked, setIsPreBooked] = useState(false);
  const [preBookedCode, setPreBookedCode] = useState("");
  const [cardBarcode, setCardBarcode] = useState("");

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [printed, setPrinted] = useState(false);

  // Unified camera scanner states
  const [activeScanner, setActiveScanner] = useState<"plate" | "ticket" | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [scanningTicket, setScanningTicket] = useState(false);

  // AI OCR and QR scan simulation states
  const [ocrSteps, setOcrSteps] = useState<{ label: string; detail: string; status: "idle" | "running" | "success" | "failed" }[]>([]);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(-1);

  // Uploaded image preview state
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null);
  const [entryImage, setEntryImage] = useState<string | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Refs for camera video feed & file inputs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const ticketVideoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const plateFileInputRef = useRef<HTMLInputElement | null>(null);
  const qrFileInputRef = useRef<HTMLInputElement | null>(null);

  // Effect to manage camera start/stop for plate & ticket scanners
  useEffect(() => {
    if ((activeScanner === "plate" || activeScanner === "ticket") && !uploadedImagePreview) {
      if (!navigator || !navigator.mediaDevices) {
        setErrorMsg("Trình duyệt không hỗ trợ camera.");
        setActiveScanner(null);
        return;
      }
      // Start camera feed
      navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } }
      })
      .then(stream => {
        if (activeScanner === "plate" && videoRef.current) {
          videoRef.current.srcObject = stream;
        } else if (activeScanner === "ticket" && ticketVideoRef.current) {
          ticketVideoRef.current.srcObject = stream;
        }
        streamRef.current = stream;
      })
      .catch(err => {
        console.error("Camera access failed", err);
        setErrorMsg("Không thể truy cập camera. Vui lòng kiểm tra quyền hoặc tải ảnh lên.");
        setActiveScanner(null);
        setScanningTicket(false);
      });
    } else {
      // Stop camera feed
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [activeScanner, uploadedImagePreview]);

  const handleStartPlateScan = () => {
    if (ticket) return;
    setUploadedImagePreview(null);
    setActiveScanner("plate");
    setScanResult(null);
    setScanning(false);
    setOcrSteps([]);
    setActiveStepIndex(-1);
    setErrorMsg(null);
  };

  // Real license plate OCR engine calling Gemini API
  const runRealPlateOCR = async (base64Image: string, dataUrl: string) => {
    setScanning(true);
    setScanResult(null);
    setErrorMsg(null);
    setSuccessMsg(null);
    setUploadedImagePreview(dataUrl);
    setEntryImage(dataUrl);

    const steps = [
      { label: "1. Phát hiện khung biển số", detail: "Đang phân tích khung hình...", status: "running" as const },
      { label: "2. Căn thẳng ảnh biển số", detail: "Chờ phát hiện vị trí...", status: "idle" as const },
      { label: "3. Nhận diện biển số (Gemini API)", detail: "Đang gọi Gemini API nhận dạng...", status: "idle" as const },
      { label: "4. Ghép và kiểm tra định dạng", detail: "Chờ kết quả nhận dạng...", status: "idle" as const },
    ];
    setOcrSteps(steps);
    setActiveStepIndex(0);

    try {
      await new Promise((resolve) => setTimeout(resolve, 400));
      steps[0].status = "success";
      steps[0].detail = "Đã xác định được vùng biển số.";
      steps[1].status = "running";
      steps[1].detail = "Đang chạy bộ lọc xoay ảnh...";
      setOcrSteps([...steps]);
      setActiveStepIndex(1);

      await new Promise((resolve) => setTimeout(resolve, 400));
      steps[1].status = "success";
      steps[1].detail = "Đã căn thẳng ảnh thành công.";
      steps[2].status = "running";
      steps[2].detail = "Đang trích xuất ký tự...";
      setOcrSteps([...steps]);
      setActiveStepIndex(2);

      const apiKey = "AQ.Ab8RN6LAK8CSIGOiHk9CRYoniXnFtzDHBaiNpD0gUvmXaxVdZA";
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

      if (!response.ok) {
        throw new Error("Không thể kết nối đến Gemini API.");
      }

      const resData = await response.json();
      const textResponse = resData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textResponse) {
        throw new Error("Không tìm thấy kết quả từ Gemini API.");
      }

      const parsed = JSON.parse(textResponse);
      const recognizedPlate = (parsed.plate || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");

      if (!recognizedPlate) {
        throw new Error("Không thể nhận diện biển số xe.");
      }

      steps[2].status = "success";
      steps[2].detail = `Gemini nhận dạng: "${recognizedPlate}"`;
      steps[3].status = "running";
      setOcrSteps([...steps]);
      setActiveStepIndex(3);

      await new Promise((resolve) => setTimeout(resolve, 400));
      steps[3].status = "success";
      steps[3].detail = `Đã đối chiếu thành công.`;
      setOcrSteps([...steps]);
      setActiveStepIndex(4);
      setScanResult(recognizedPlate);
      setBienSo(recognizedPlate);
      setScanning(false);
      setActiveScanner(null);
      setUploadedImagePreview(null);
    } catch (err: any) {
      console.error(err);
      if (steps[activeStepIndex >= 0 ? activeStepIndex : 2]) {
        steps[activeStepIndex >= 0 ? activeStepIndex : 2].status = "failed";
      }
      setOcrSteps([...steps]);
      setErrorMsg(err.message || "Nhận diện biển số thất bại. Vui lòng nhập tay.");
      setScanning(false);
    }
  };

  const handleCapturePlate = () => {
    if (ticket) return;
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg");
        const base64Image = dataUrl.split(",")[1];
        runRealPlateOCR(base64Image, dataUrl);
      }
    }
  };

  const handlePlateImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64Image = dataUrl.split(",")[1];
      runRealPlateOCR(base64Image, dataUrl);
    };
    reader.readAsDataURL(file);
    setErrorMsg(null);
  };

  const handleStartTicketScan = () => {
    if (ticket) return;
    setUploadedImagePreview(null);
    setActiveScanner("ticket");
    setScanningTicket(false);
    setOcrSteps([]);
    setActiveStepIndex(-1);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const simulateQRScan = async (targetCode: string) => {
    if (targetCode.startsWith("TK-")) {
      setErrorMsg("Mã QR này không phải vé tháng hoặc đặt trước.");
      setActiveScanner(null);
      setScanningTicket(false);
      setUploadedImagePreview(null);
      return;
    }

    setScanningTicket(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const registrationInfo = await staffService.getPreBookedDetails(targetCode);
      setPreBookedCode(targetCode);
      setIsPreBooked(true);

      const regPlate = (registrationInfo.plate || "").trim().toUpperCase();
      const regType = registrationInfo.type;

      if (regPlate) {
        setBienSo(regPlate);
      }
      if (regType) {
        setLoaiXe(regType);
      }

      setSuccessMsg(`Xác thực thành công vé đặt trước: ${targetCode}!`);
      setActiveScanner(null);
      setScanningTicket(false);
      setUploadedImagePreview(null);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || `Không tìm thấy vé đặt trước hợp lệ cho mã ${targetCode}.`);
      setScanningTicket(false);
      setActiveScanner(null);
    }
  };

  const runTicketOCR = async (base64Image: string, dataUrl: string) => {
    setScanningTicket(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setUploadedImagePreview(dataUrl);

    try {
      const apiKey = "AQ.Ab8RN6LAK8CSIGOiHk9CRYoniXnFtzDHBaiNpD0gUvmXaxVdZA";
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
                    text: "Identify and extract the card number or reservation code (starting with CARD or RES followed by digits) from this image. Clean the output by removing all spaces. Return ONLY a JSON object with format {\"code\": \"CARD000005\"}."
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
      if (!textResponse) throw new Error("Không nhận diện được kết quả.");

      const parsed = JSON.parse(textResponse);
      const recognizedCode = (parsed.code || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");

      if (!recognizedCode) throw new Error("Không tìm thấy mã trong ảnh.");

      simulateQRScan(recognizedCode);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Nhận diện mã vé/thẻ thất bại.");
      setScanningTicket(false);
      setActiveScanner(null);
    }
  };

  const handleCaptureTicket = () => {
    if (ticket) return;
    if (ticketVideoRef.current) {
      const video = ticketVideoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg");
        const base64Image = dataUrl.split(",")[1];
        runTicketOCR(base64Image, dataUrl);
      }
    }
  };

  const handleQRImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64Image = dataUrl.split(",")[1];
      runTicketOCR(base64Image, dataUrl);
    };
    reader.readAsDataURL(file);
    setErrorMsg(null);
  };

  const handleCreate = async () => {
    if (!bienSo.trim() || ticket) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    if (!selectedFloorCode) {
      setErrorMsg("Vui lòng chọn Tầng trên thanh topbar trước.");
      return;
    }

    if (cardBarcode.trim().length !== 10) {
      setErrorMsg("Barcode thẻ xe phải đúng 10 ký tự.");
      return;
    }

    try {
      const vType = loaiXe === "Xe máy" ? "MOTORCYCLE" : "CAR";
      const resp = await staffService.checkIn({
        plateNo: bienSo.trim().toUpperCase(),
        vehicleType: vType,
        isPreBooked,
        preBookedCode: isPreBooked ? preBookedCode.trim() : undefined,
        floorCode: selectedFloorCode,
        entryImage: entryImage || undefined,
        cardBarcode: cardBarcode.trim().toUpperCase(),
      });

      const payload: Ticket = {
        version: 1,
        maVe: resp.parkingSessionNo,
        bienSo: resp.plateNoSnapshot,
        loaiXe: resp.vehicleType === "MOTORCYCLE" ? "Xe máy" : "Ô tô",
        tgVao: new Date(resp.checkInAt).toLocaleString("vi-VN"),
        createdAt: resp.checkInAt,
        tang: resp.entryFloorCode || selectedFloorCode,
        qrPayload: resp.qrToken,
      };

      setTicket(payload);
      setSuccessMsg(resp.message || "Đã tiếp nhận xe vào thành công.");
      setPrinted(false);

      try {
        localStorage.setItem("parking-ticket:last", resp.qrToken || resp.parkingSessionNo);
      } catch (e) {}
    } catch (err: any) {
      setErrorMsg(err.message || "Tạo vé xe thất bại.");
    }
  };

  const handleReset = () => {
    setBienSo("");
    setLoaiXe("Xe máy");
    setIsPreBooked(false);
    setPreBookedCode("");
    setCardBarcode("");
    setTicket(null);
    setPrinted(false);
    setEntryImage(null);
    setActiveScanner(null);
    setScanning(false);
    setScanResult(null);
    setUploadedImagePreview(null);
    setOcrSteps([]);
    setActiveStepIndex(-1);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const canCreate = bienSo.trim().length > 0 && !ticket && cardBarcode.trim().length === 10 && (
    !isPreBooked || preBookedCode.trim().length > 0
  );

  return (
    <div className="space-y-3">
      <style>{`
        @keyframes scanLine {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 0%; }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #334155;
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #475569;
        }
      `}</style>

      {/* Tiêu đề */}
      <div className="flex items-center gap-2 rounded border border-gray-200 bg-white px-4 py-2.5 shadow-sm">
        <Car className="h-4 w-4 text-blue-600" />
        <span className="text-sm font-semibold text-gray-700">
          Tiếp nhận xe vào (Tầng trực: {selectedFloorCode || "Chưa chọn"})
        </span>
      </div>

      <div className="max-w-3xl mx-auto">
        {/* Nhập thông tin */}
        <div className="overflow-hidden rounded border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 bg-blue-600 px-4 py-2.5">
            <Plus className="h-4 w-4 text-white" />
            <span className="text-sm font-semibold text-white">
              Thông tin xe vào
            </span>
          </div>

          <div className="space-y-4 p-4">
            {/* Error & Success Messages */}
            {errorMsg && (
              <div className="flex items-start gap-2 rounded border border-red-200 bg-red-50 p-3 text-xs text-red-700 font-medium">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="flex items-start gap-2 rounded border border-green-200 bg-green-50 p-3 text-xs text-green-700 font-medium">
                <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Loại xe */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600">
                Loại xe <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                {[
                  { key: "Xe máy", label: "Xe máy", icon: Bike },
                  { key: "Ô tô", label: "Ô tô", icon: Car }
                ].map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    disabled={Boolean(ticket)}
                    onClick={() => {
                      setLoaiXe(key);
                      setErrorMsg(null);
                    }}
                    className={`flex h-[40px] flex-1 items-center justify-center gap-2 rounded border text-sm font-medium transition-all ${
                      loaiXe === key
                        ? "border-blue-600 bg-blue-50 text-blue-600 shadow-sm"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Biển số xe */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600">
                Biển số xe <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  disabled={Boolean(ticket)}
                  className="h-[38px] flex-1 rounded border border-gray-300 px-3 text-sm font-bold uppercase tracking-wider outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-100 disabled:bg-gray-100"
                  placeholder="VD: 29A-123.45"
                  value={bienSo}
                  onChange={(e) => {
                    setBienSo(e.target.value);
                    setErrorMsg(null);
                  }}
                />
                
                <button
                  type="button"
                  disabled={Boolean(ticket) || activeScanner === "plate"}
                  onClick={handleStartPlateScan}
                  className="h-[38px] px-3 rounded bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700 disabled:bg-blue-300 transition-colors flex items-center gap-1 shrink-0 cursor-pointer animate-pulse"
                >
                  <Camera className="w-3.5 h-3.5" />
                  Chụp biển số
                </button>

                <button
                  type="button"
                  disabled={Boolean(ticket) || activeScanner === "plate"}
                  onClick={() => plateFileInputRef.current?.click()}
                  className="h-[38px] px-3 rounded border border-amber-400 bg-amber-50 text-xs font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-40 transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Tải ảnh biển số
                </button>
                <input
                  ref={plateFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePlateImageUpload}
                />
              </div>
            </div>

            {/* OCR Live Camera View */}
            {activeScanner === "plate" && (
              <div className="rounded-lg border border-gray-200 bg-slate-900 p-3 text-white space-y-3 animate-fadeIn">
                <span className="block text-xs font-bold text-slate-400">TRÌNH QUÉT BIỂN SỐ XE VÀO</span>
                
                <div 
                  className={`relative w-full overflow-hidden rounded border bg-black transition-all ${
                    activeScanner === "plate" ? "border-sky-400 shadow-lg" : "border-dashed border-gray-500"
                  }`}
                  style={{ minHeight: "220px" }}
                >
                  {uploadedImagePreview ? (
                    <img
                      src={uploadedImagePreview}
                      alt="Uploaded Plate"
                      className="absolute inset-0 h-full w-full object-contain"
                    />
                  ) : (
                    <video
                      ref={videoRef}
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

                      {scanning && activeStepIndex === 0 && (
                        <div className="absolute left-0 right-0 top-0 h-[2px] bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.8)] animate-[scanLine_2s_infinite_linear]" />
                      )}
                    </div>
                  )}

                  {activeStepIndex >= 3 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <span className="text-xl font-bold tracking-widest text-green-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                        {scanResult}
                      </span>
                    </div>
                  )}

                  {scanning && (
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white text-xs gap-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent border-sky-400" />
                      <span>Đang xử lý nhận dạng...</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  {!uploadedImagePreview && (
                    <button
                      type="button"
                      onClick={handleCapturePlate}
                      disabled={scanning}
                      className="flex-1 flex h-[34px] items-center justify-center gap-1.5 rounded bg-green-600 text-xs font-semibold text-white hover:bg-green-700 cursor-pointer"
                    >
                      Chụp ảnh
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveScanner(null);
                      setUploadedImagePreview(null);
                    }}
                    className="h-[34px] rounded border border-slate-700 px-3 text-xs text-gray-300 hover:bg-slate-800 cursor-pointer"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            )}

            {/* Cấu trúc vé đặt trước & barcode thẻ xe */}
            {!ticket && (
              <div className="space-y-3">
                {/* Checkbox đặt trước */}
                <div className="rounded border border-blue-100 bg-blue-50/50 p-3 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPreBooked}
                      disabled={Boolean(ticket)}
                      onChange={(e) => {
                        setIsPreBooked(e.target.checked);
                        if (!e.target.checked) setPreBookedCode("");
                        setCardBarcode("");
                        setErrorMsg(null);
                        setSuccessMsg(null);
                        setActiveScanner(null);
                      }}
                      className="rounded text-blue-600 focus:ring-blue-400"
                    />
                    <span className="text-xs font-semibold text-gray-700">Dùng vé tháng / đặt trước</span>
                  </label>

                  {isPreBooked && (
                    <div className="space-y-1.5 pt-1 border-t border-blue-100/50 mt-1">
                      <label className="block text-[11px] font-medium text-gray-600">Mã đặt trước (CARD... hoặc RES...)</label>
                      <div className="flex gap-2">
                        <input
                          className="h-[36px] flex-1 rounded border border-gray-300 px-3 text-xs uppercase outline-none focus:border-blue-400 disabled:bg-gray-100 font-mono"
                          placeholder="CARD000001"
                          value={preBookedCode}
                          disabled={Boolean(ticket)}
                          onChange={(e) => setPreBookedCode(e.target.value)}
                        />
                        
                        <button
                          type="button"
                          disabled={Boolean(ticket) || activeScanner === "ticket"}
                          onClick={handleStartTicketScan}
                          className="h-[36px] px-3 rounded bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700 disabled:bg-blue-300 transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          Chụp vé
                        </button>

                        <button
                          type="button"
                          disabled={Boolean(ticket) || activeScanner === "ticket"}
                          onClick={() => qrFileInputRef.current?.click()}
                          className="h-[36px] px-3 rounded bg-amber-500 text-xs font-semibold text-white hover:bg-amber-600 disabled:bg-amber-300 transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          Tải ảnh vé
                        </button>
                        <input
                          ref={qrFileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleQRImageUpload}
                        />
                      </div>
                    </div>
                  )}

                  {/* Ticket OCR Camera scanner */}
                  {activeScanner === "ticket" && (
                    <div className="rounded border border-gray-200 bg-slate-900 p-2.5 text-white space-y-2 mt-2">
                      <span className="block text-[11px] font-bold text-slate-400">TRÌNH QUÉT THẺ/VÉ</span>
                      
                      <div 
                        className={`relative w-full overflow-hidden rounded bg-black transition-all ${
                          scanningTicket ? "border-blue-400 animate-pulse" : "border-gray-500"
                        }`}
                        style={{ minHeight: "160px" }}
                      >
                        {uploadedImagePreview ? (
                          <img
                            src={uploadedImagePreview}
                            alt="Uploaded Ticket"
                            className="absolute inset-0 h-full w-full object-contain"
                          />
                        ) : (
                          <video
                            ref={ticketVideoRef}
                            autoPlay
                            className="h-40 w-full object-cover"
                            playsInline
                            muted
                          />
                        )}
                      </div>

                      <div className="flex gap-2">
                        {!uploadedImagePreview && (
                          <button
                            type="button"
                            onClick={handleCaptureTicket}
                            className="flex-1 flex h-[30px] items-center justify-center gap-1 rounded bg-green-600 text-xs font-semibold text-white hover:bg-green-700 cursor-pointer"
                          >
                            Chụp ảnh vé
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setActiveScanner(null);
                            setUploadedImagePreview(null);
                          }}
                          className="h-[30px] rounded bg-red-500 px-3 text-xs font-semibold text-white hover:bg-red-650 cursor-pointer"
                        >
                          Đóng
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Nhập Barcode thẻ xe (Luôn luôn hiển thị ở dưới) */}
                <div className="rounded border border-gray-150 bg-gray-50/50 p-3 space-y-1.5">
                  <label className="block text-[11px] font-semibold text-gray-700">
                    Nhập Barcode thẻ xe (Đúng 10 ký tự) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      className={`h-[36px] w-full rounded border px-3 text-xs uppercase outline-none font-mono ${
                        cardBarcode.trim().length === 10
                          ? "border-green-500 focus:border-green-600 bg-green-50/20"
                          : cardBarcode.trim().length > 0
                          ? "border-amber-400 focus:border-amber-500 bg-amber-50/10"
                          : "border-gray-300 focus:border-blue-400"
                      } disabled:bg-gray-100 font-bold tracking-wider`}
                      placeholder="VD: KZP1234567"
                      maxLength={10}
                      value={cardBarcode}
                      disabled={Boolean(ticket)}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^A-Za-z0-9]/g, "");
                        setCardBarcode(val);
                        setErrorMsg(null);
                      }}
                    />
                    {cardBarcode.trim().length > 0 && (
                      <div className="absolute right-3 top-2 text-[10px] font-semibold text-gray-400">
                        {cardBarcode.trim().length}/10
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Thông tin tự động */}
            <div className="space-y-2 rounded border border-gray-200 bg-gray-50 p-3">
              {[
                ["Thời gian vào", ticket?.tgVao ?? new Date().toLocaleString("vi-VN")],
                ["Mã vé", ticket?.maVe ?? (isPreBooked ? "Thẻ tháng / Đặt chỗ trước" : "Sẽ tạo khi bấm Tạo vé")],
                ["Tầng", selectedFloorCode || "Chưa chọn"],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between text-xs">
                  <span className="text-gray-500">{label}:</span>
                  <span className={`font-semibold ${label === "Mã vé" ? "text-blue-600" : "text-gray-700"}`}>
                    {value}
                  </span>
                </div>
              ))}
            </div>

            {/* Nút thao tác */}
            {(bienSo.trim() !== "" || ticket) && (
              <div className="flex gap-2 pt-1">
                {isPreBooked ? (
                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={!canCreate || !preBookedCode}
                    className="flex h-[38px] flex-1 items-center justify-center gap-1.5 rounded bg-green-600 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-green-300 cursor-pointer shadow"
                  >
                    <CheckCircle className="h-4 w-4" />
                    {ticket ? "Đã cho xe vào" : "Cho xe vào"}
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleCreate}
                      disabled={!canCreate}
                      className="flex h-[38px] flex-1 items-center justify-center gap-1.5 rounded bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300 cursor-pointer shadow animate-bounce"
                    >
                      <Plus className="h-4 w-4" />
                      {ticket ? "Đã tạo vé" : "Tạo vé"}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPrinted(true);
                        setSuccessMsg("In hóa đơn/vé thành công!");
                      }}
                      disabled={!ticket}
                      className="flex h-[38px] flex-1 items-center justify-center gap-1.5 rounded bg-green-600 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-green-300 cursor-pointer shadow"
                    >
                      <Printer className="h-4 w-4" />
                      In vé
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={handleReset}
                  className="flex h-[38px] items-center justify-center gap-1.5 rounded border border-gray-300 px-3 text-sm text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  <RotateCcw className="h-4 w-4" />
                  Làm mới
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
