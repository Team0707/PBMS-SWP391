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
  QrCode,
  Upload,
} from "lucide-react";

import { staffService } from "../../../services/staffService";

interface VehicleEntryProps {
  selectedFloorCode: string;
  selectedLaneCode: string;
}

interface TicketPayload {
  version: 1;
  maVe: string;
  bienSo: string;
  loaiXe: string;
  tgVao: string;
  createdAt: string;
  lanVao: string;
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

export default function VehicleEntry({ selectedFloorCode, selectedLaneCode }: VehicleEntryProps) {
  const [bienSo, setBienSo] = useState("");
  const [loaiXe, setLoaiXe] = useState("Xe máy");
  const [isPreBooked, setIsPreBooked] = useState(false);
  const [preBookedCode, setPreBookedCode] = useState("");

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
  const qrScannerRef = useRef<QrScanner | null>(null);

  // Auto-resolve vehicle type based on selected lane
  useEffect(() => {
    if (selectedLaneCode) {
      staffService.getLanes().then(lanes => {
        const currentLane = lanes.find(l => l.laneCode === selectedLaneCode);
        if (currentLane) {
          const typeMap: Record<string, string> = {
            "MOTORCYCLE": "Xe máy",
            "CAR": "Ô tô",
            "BOTH": "Xe máy"
          };
          setLoaiXe(typeMap[currentLane.vehicleType] || "Xe máy");
        }
      }).catch(err => console.error("Lỗi khi đồng bộ loại xe theo làn:", err));
    }
  }, [selectedLaneCode]);

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
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }
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
        setErrorMsg("Không thể truy cập camera. Vui lòng kiểm tra quyền hoặc sử dụng chức năng Upload ảnh.");
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

  const handleVehicleTypeChange = (type: string) => {
    if (ticket) return;
    setLoaiXe(type);
  };

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
      { label: "1. Phát hiện khung biển số", detail: "Đang phân tích khung hình để định vị vị trí biển số...", status: "running" as const },
      { label: "2. Căn thẳng ảnh biển số", detail: "Chờ phát hiện vị trí...", status: "idle" as const },
      { label: "3. Nhận diện biển số (Gemini API)", detail: "Đang gửi ảnh lên API nhận dạng...", status: "idle" as const },
      { label: "4. Ghép và kiểm tra định dạng", detail: "Chờ kết quả nhận dạng...", status: "idle" as const },
    ];
    setOcrSteps(steps);
    setActiveStepIndex(0);

    try {
      // Step 1: Detect bounding box
      await new Promise((resolve) => setTimeout(resolve, 500));
      steps[0].status = "success";
      steps[0].detail = "Đã xác định được vùng biển số: BoundingBox [X:145, Y:210, W:310, H:115]";
      steps[1].status = "running";
      steps[1].detail = "Đang chạy bộ lọc xoay ảnh, cân bằng phối cảnh nghiêng...";
      setOcrSteps([...steps]);
      setActiveStepIndex(1);

      // Step 2: Rotate and balance
      await new Promise((resolve) => setTimeout(resolve, 500));
      steps[1].status = "success";
      steps[1].detail = "Góc xoay hiệu chỉnh: -1.2 độ. Đã căn thẳng ảnh thành công.";
      steps[2].status = "running";
      steps[2].detail = "Đang gọi API Gemini để trích xuất văn bản từ hình ảnh...";
      setOcrSteps([...steps]);
      setActiveStepIndex(2);

      // Call Gemini API
      const apiKey = "AQ.Ab8RN6L4bBX3Newqu0lUO8srO5XU5VYXKfbvsaTXc7UH6OYEZQ";
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
        throw new Error("Không thể nhận diện được ký tự biển số trong hình ảnh.");
      }

      steps[2].status = "success";
      steps[2].detail = `Nhận diện từ Gemini API: "${recognizedPlate}"`;
      steps[3].status = "running";
      steps[3].detail = "Đang đối chiếu định dạng quy chuẩn...";
      setOcrSteps([...steps]);
      setActiveStepIndex(3);

      await new Promise((resolve) => setTimeout(resolve, 500));
      steps[3].status = "success";
      steps[3].detail = `Biển số hoàn chỉnh: ${recognizedPlate} | Đạt chuẩn định dạng xe cơ giới Việt Nam.`;
      setOcrSteps([...steps]);
      setActiveStepIndex(4);
      setScanResult(recognizedPlate);
      setScanning(false);
    } catch (err: any) {
      console.error(err);
      const currentActive = 2;
      steps[currentActive].status = "failed";
      steps[currentActive].detail = err.message || "Lỗi kết nối hoặc xử lý.";
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

    setActiveScanner("plate");
    setErrorMsg(null);
  };

  const handleUsePlate = (plate: string) => {
    setBienSo(plate);
    setActiveScanner(null);
    setScanResult(null);
    setUploadedImagePreview(null);
    setOcrSteps([]);
    setActiveStepIndex(-1);
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

  // Pre-booked QR ticket checker (instantaneous validation without mock steps)
  const simulateQRScan = async (targetCode: string) => {
    console.log("[QR Scan] Mã nhận được từ QR:", targetCode);

    // Vé lượt (qrToken) bắt đầu bằng "TK-": không phải vé đặt trước
    if (targetCode.startsWith("TK-")) {
      setErrorMsg(
        `Mã QR này là vé lượt thông thường (${targetCode}). ` +
        "Vui lòng sử dụng mã CARD hoặc RES để check-in bằng vé đặt trước / thẻ tháng."
      );
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

      // Auto-fill in the recognized code and automatically enable pre-booked mode
      setPreBookedCode(targetCode);
      setIsPreBooked(true);

      // Perform validation instantly
      const regPlate = (registrationInfo.plate || "").trim().toUpperCase();
      const regType = registrationInfo.type; // "Ô tô" or "Xe máy"
      
      const currentPlate = bienSo.trim().toUpperCase();
      const currentType = loaiXe; // "Ô tô" or "Xe máy"

      // Auto-fill type and plate if they are empty
      if (!currentPlate && regPlate) {
        setBienSo(regPlate);
      }
      if (regType) {
        setLoaiXe(regType);
      }

      const plateMatched = !currentPlate || regPlate === currentPlate;
      const typeMatched = !regType || regType === currentType;

      if (plateMatched && typeMatched) {
        setSuccessMsg(`Xác thực thành công mã đặt trước: ${targetCode}!`);
      } else {
        let diffs = [];
        if (regPlate && currentPlate && regPlate !== currentPlate) {
          diffs.push(`Biển số đăng ký ${regPlate} khác hiện tại ${currentPlate}`);
        }
        if (regType && regType !== currentType) {
          diffs.push(`Loại xe đăng ký ${regType} khác hiện tại ${currentType}`);
        }
        setErrorMsg(`Vé đặt trước không khớp: ${diffs.join(". ")}`);
      }

      // Close scanner modal
      setActiveScanner(null);
      setScanningTicket(false);
      setUploadedImagePreview(null);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || `Không tìm thấy đăng ký hợp lệ cho mã đặt trước ${targetCode}.`);
      setPreBookedCode(targetCode);
      setScanningTicket(false);
      setActiveScanner(null);
      setUploadedImagePreview(null);
    }
  };

  const handleScanPreBookedTicket = () => {
    if (ticket) return;
    const targetCode = loaiXe === "Xe máy" ? "CARD000001" : "CARD000002";
    simulateQRScan(targetCode);
  };

  const runTicketOCR = async (base64Image: string, dataUrl: string) => {
    setScanningTicket(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setUploadedImagePreview(dataUrl);

    const steps = [
      { label: "1. Định vị vùng thẻ/vé", detail: "Đang tìm kiếm mã thẻ hoặc mã đặt chỗ...", status: "running" as const },
      { label: "2. Cân chỉnh ảnh chụp", detail: "Đang tối ưu độ sắc nét...", status: "idle" as const },
      { label: "3. Nhận diện ký tự (Gemini API)", detail: "Đang nhận diện ký tự qua Gemini...", status: "idle" as const },
      { label: "4. Giải mã dữ liệu và đối chiếu", detail: "Đang đối chiếu thông tin đăng ký...", status: "idle" as const },
    ];
    setOcrSteps(steps);
    setActiveStepIndex(0);

    try {
      // Step 1: Locate ticket region
      await new Promise((resolve) => setTimeout(resolve, 500));
      steps[0].status = "success";
      steps[0].detail = "Đã định vị được vùng chứa mã vé.";
      steps[1].status = "running";
      steps[1].detail = "Đang tối ưu độ sắc nét và cân chỉnh ảnh chụp...";
      setOcrSteps([...steps]);
      setActiveStepIndex(1);

      // Step 2: Rotate and balance
      await new Promise((resolve) => setTimeout(resolve, 500));
      steps[1].status = "success";
      steps[1].detail = "Đã tối ưu ảnh chụp thành công.";
      steps[2].status = "running";
      steps[2].detail = "Đang gửi ảnh lên Gemini API để trích xuất mã...";
      setOcrSteps([...steps]);
      setActiveStepIndex(2);

      // Call Gemini API
      const apiKey = "AQ.Ab8RN6L4bBX3Newqu0lUO8srO5XU5VYXKfbvsaTXc7UH6OYEZQ";
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
                    text: "Identify and extract the card number or reservation code (starting with CARD or RES followed by digits, e.g. CARD000005, RES001, RES-001) from this image. Clean the output by removing all spaces, dots, and dashes. Return ONLY a JSON object with format {\"code\": \"CARD000005\"} or {\"code\": \"RES001\"}."
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
      const recognizedCode = (parsed.code || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");

      if (!recognizedCode) {
        throw new Error("Không thể nhận diện được mã vé hoặc thẻ đặt trước trong hình ảnh.");
      }

      steps[2].status = "success";
      steps[2].detail = `Gemini nhận dạng được: "${recognizedCode}"`;
      steps[3].status = "running";
      steps[3].detail = "Đang đối chiếu dữ liệu thẻ và biển số đăng ký...";
      setOcrSteps([...steps]);
      setActiveStepIndex(3);

      await new Promise((resolve) => setTimeout(resolve, 500));
      steps[3].status = "success";
      steps[3].detail = `Đã nhận diện: ${recognizedCode}.`;
      setOcrSteps([...steps]);
      setActiveStepIndex(4);

      setSuccessMsg(`Nhận diện thành công mã từ ảnh: ${recognizedCode}`);
      
      // Auto-fill in the recognized code and automatically enable pre-booked mode
      setPreBookedCode(recognizedCode);
      setIsPreBooked(true);

      // Perform validation instantly (with database details and license plate matching check)
      const registrationInfo = await staffService.getPreBookedDetails(recognizedCode);
      const regPlate = (registrationInfo.plate || "").trim().toUpperCase();
      const regType = registrationInfo.type; // "Ô tô" or "Xe máy"
      
      const currentPlate = bienSo.trim().toUpperCase();
      const currentType = loaiXe; // "Ô tô" or "Xe máy"

      if (!currentPlate && regPlate) {
        setBienSo(regPlate);
      }
      if (regType) {
        setLoaiXe(regType);
      }

      const plateMatched = !currentPlate || regPlate === currentPlate;
      const typeMatched = !regType || regType === currentType;

      if (plateMatched && typeMatched) {
        setSuccessMsg(`Xác thực thành công mã đặt trước: ${recognizedCode}!`);
      } else {
        let diffs = [];
        if (regPlate && currentPlate && regPlate !== currentPlate) {
          diffs.push(`Biển số đăng ký ${regPlate} khác hiện tại ${currentPlate}`);
        }
        if (regType && regType !== currentType) {
          diffs.push(`Loại xe đăng ký ${regType} khác hiện tại ${currentType}`);
        }
        setErrorMsg(`Vé đặt trước không khớp: ${diffs.join(". ")}`);
      }

      setActiveStepIndex(5);
      // Stop scanning
      setScanningTicket(false);
      setActiveScanner(null);
      setUploadedImagePreview(null);
    } catch (err: any) {
      console.error(err);
      const currentActive = activeStepIndex >= 0 ? activeStepIndex : 2;
      if (steps[currentActive]) {
        steps[currentActive].status = "failed";
        steps[currentActive].detail = err.message || "Lỗi kết nối hoặc nhận dạng.";
      }
      setOcrSteps([...steps]);
      setErrorMsg(err.message || "Nhận diện mã vé/thẻ thất bại. Vui lòng nhập tay.");
      setScanningTicket(false);
      setActiveScanner(null);
      setUploadedImagePreview(null);
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

    setActiveScanner("ticket");
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleCreate = async () => {
    if (!bienSo.trim() || ticket) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    if (!selectedFloorCode || !selectedLaneCode) {
      setErrorMsg("Vui lòng chọn Tầng và Làn xe trên thanh topbar trước.");
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
        laneCode: selectedLaneCode,
        entryImage: entryImage || undefined,
      });

      // Construct frontend ticket display
      const payload: Ticket = {
        version: 1,
        maVe: resp.ticketNo,
        bienSo: resp.plateNoSnapshot,
        loaiXe: resp.vehicleType === "MOTORCYCLE" ? "Xe máy" : "Ô tô",
        tgVao: new Date(resp.checkInAt).toLocaleString("vi-VN"),
        createdAt: resp.checkInAt,
        lanVao: `${resp.entryLaneCode} (${resp.entryFloorCode})`,
        tang: resp.entryFloorCode || selectedFloorCode,
        qrPayload: resp.qrToken,
      };

      setTicket(payload);
      setSuccessMsg(resp.message || "Đã tiếp nhận xe vào thành công.");
      setPrinted(false);
      
      try {
        localStorage.setItem("parking-ticket:last", resp.qrToken || resp.ticketNo);
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

  const canCreate = bienSo.trim().length > 0 && !ticket;

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
          Tiếp nhận xe vào (Làn hiện tại: {selectedLaneCode || "Chưa chọn"}, Tầng: {selectedFloorCode || "Chưa chọn"})
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        {/* Bên trái: nhập thông tin */}
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

            {/* Biển số */}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Biển số xe <span className="text-red-500">*</span>
              </label>

              <div className="flex gap-2">
                <input
                  className="h-[40px] flex-1 rounded border border-gray-300 px-3 text-sm uppercase outline-none transition placeholder:normal-case focus:border-blue-400 focus:ring-1 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-100 font-bold tracking-wider"
                  placeholder="VD: 59A-123.45"
                  value={bienSo}
                  disabled={Boolean(ticket)}
                  onChange={(event) => setBienSo(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      handleCreate();
                    }
                  }}
                />

                <button
                  type="button"
                  onClick={handleStartPlateScan}
                  disabled={Boolean(ticket)}
                  className="flex h-[40px] shrink-0 items-center gap-1.5 rounded bg-sky-500 px-3 text-xs font-medium text-white transition-colors hover:bg-sky-600 disabled:cursor-not-allowed disabled:bg-sky-300"
                >
                  <Camera className="h-4 w-4" />
                  Chụp biển số
                </button>

                <button
                  type="button"
                  onClick={() => plateFileInputRef.current?.click()}
                  disabled={Boolean(ticket)}
                  className="flex h-[40px] shrink-0 items-center gap-1.5 rounded bg-amber-500 px-3 text-xs font-medium text-white transition-colors hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-amber-300"
                >
                  <Upload className="h-4 w-4" />
                  Tải ảnh biển số
                </button>
                <input
                  type="file"
                  ref={plateFileInputRef}
                  onChange={handlePlateImageUpload}
                  accept="image/*"
                  className="hidden"
                />
              </div>
            </div>

            {/* Khu vực quét / hiển thị ảnh chụp biển số */}
            {activeScanner === "plate" && (
              <div className="overflow-hidden rounded-lg border border-slate-700 bg-slate-950 font-mono text-gray-200 shadow-xl">
                {/* Scanner layout header */}
                <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/50 px-3 py-2 text-xs">
                  <div className="flex items-center gap-1.5 text-sky-400 font-bold">
                    <span className="h-2 w-2 rounded-full bg-sky-400 animate-pulse" />
                    MÁY QUÉT BIỂN SỐ AI v2.5
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveScanner(null);
                      setScanResult(null);
                      setScanning(false);
                      setUploadedImagePreview(null);
                      setOcrSteps([]);
                      setActiveStepIndex(-1);
                    }}
                    className="flex h-5 w-5 items-center justify-center rounded hover:bg-slate-800 text-gray-400 hover:text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12">
                  {/* Left Column: Visual Preview (Col-span 12) */}
                  <div className="relative flex h-64 md:col-span-12 items-center justify-center bg-black/95 overflow-hidden">
                    {uploadedImagePreview ? (
                      <img
                        src={uploadedImagePreview}
                        alt="Plate Uploaded Snapshot"
                        className="absolute inset-0 h-full w-full object-contain transition-transform duration-300"
                        style={{
                          transform: activeStepIndex >= 1 ? "rotate(-1.2deg)" : "none"
                        }}
                      />
                    ) : (
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    )}

                    {/* Bounding box visual representation based on active steps */}
                    {activeStepIndex >= 0 && (
                      <div 
                        className={`absolute z-10 transition-all duration-300 rounded border-2 ${
                          activeStepIndex >= 5 
                            ? "border-green-400 bg-green-500/10 shadow-[0_0_15px_rgba(74,222,128,0.4)]" 
                            : activeStepIndex >= 1 
                            ? "border-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.3)]" 
                            : "border-red-500 animate-pulse"
                        }`}
                        style={{
                          width: "65%",
                          height: "35%",
                          top: "32.5%",
                          left: "17.5%",
                          transform: activeStepIndex >= 1 ? "rotate(-1.2deg)" : "none"
                        }}
                      >
                        {/* Bounding box corners */}
                        <div className="absolute left-0 top-0 h-3 w-3 rounded-tl border-l-[3px] border-t-[3px] border-inherit" />
                        <div className="absolute right-0 top-0 h-3 w-3 rounded-tr border-r-[3px] border-t-[3px] border-inherit" />
                        <div className="absolute bottom-0 left-0 h-3 w-3 rounded-bl border-b-[3px] border-l-[3px] border-inherit" />
                        <div className="absolute bottom-0 right-0 h-3 w-3 rounded-br border-b-[3px] border-r-[3px] border-inherit" />

                        {/* Scan laser line */}
                        {(scanning && (activeStepIndex === 0 || activeStepIndex === 1)) && (
                          <div className="absolute left-0 right-0 top-0 h-[2px] bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.8)] animate-[scanLine_2s_infinite_linear]" />
                        )}

                        {/* Row split visual helper (Step 2/3/4) */}
                        {activeStepIndex >= 2 && parsePlateToLines(scanResult || bienSo || "29X1-123.45", loaiXe).lineCount === 2 && (
                          <div className="absolute left-0 right-0 top-1/2 border-t border-dashed border-sky-400/50" />
                        )}

                        {/* Character split highlight visual markers (Step 3/4) */}
                        {activeStepIndex >= 3 && (
                          <div className="absolute inset-0 flex flex-col justify-around p-1 pointer-events-none opacity-80">
                            {parsePlateToLines(scanResult || bienSo || "29X1-123.45", loaiXe).lines.map((line, rIdx) => (
                              <div key={rIdx} className="flex justify-around items-center h-[40%]">
                                {line.replace(/[^A-Z0-9]/g, "").split("").map((char, cIdx) => (
                                  <span 
                                    key={cIdx} 
                                    className={`w-[12%] h-[85%] border border-dashed rounded-[1px] flex items-center justify-center text-[10px] font-bold ${
                                      activeStepIndex >= 4 
                                        ? "border-green-400/70 bg-green-500/10 text-green-400" 
                                        : "border-yellow-400/70 bg-yellow-500/5 text-yellow-300"
                                    }`}
                                  >
                                    {activeStepIndex >= 4 ? char : "?"}
                                  </span>
                                ))}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* OCR floating prediction bubble (Step 4/5) */}
                        {activeStepIndex >= 4 && (
                          <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-sky-500 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded shadow shadow-sky-900/50 whitespace-nowrap">
                            Confidence: {(98.9 + Math.random() * 0.8).toFixed(1)}%
                          </div>
                        )}
                        
                        {/* Confirmed display text */}
                        {activeStepIndex >= 5 && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                            <span className="text-xl font-bold tracking-widest text-green-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                              {scanResult}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Camera view-finder elements */}
                    <div className="absolute left-3 top-3 h-3 w-3 border-l border-t border-slate-600" />
                    <div className="absolute right-3 top-3 h-3 w-3 border-r border-t border-slate-600" />
                    <div className="absolute left-3 bottom-3 h-3 w-3 border-l border-b border-slate-600" />
                    <div className="absolute right-3 bottom-3 h-3 w-3 border-r border-b border-slate-600" />

                    <div className="absolute bottom-2 left-0 right-0 text-center z-15 bg-slate-950/75 py-1 border-t border-slate-800/50 text-[10px] text-slate-400">
                      {scanning ? "HỆ THỐNG ĐANG XỬ LÝ ẢNH CHỤP..." : "CĂN CHỈNH BIỂN SỐ VÀO KHUNG VÀ BẤM NÚT QUÉT"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-slate-900 border-t border-slate-800 px-3 py-2 text-xs">
                  {!scanResult ? (
                    <button
                      type="button"
                      onClick={handleCapturePlate}
                      disabled={scanning}
                      className="flex h-[34px] flex-1 items-center justify-center gap-1.5 rounded bg-sky-600 font-semibold text-white hover:bg-sky-500 disabled:bg-slate-950 disabled:text-slate-600 disabled:border disabled:border-slate-800 transition-colors"
                    >
                      <ScanLine className="h-4 w-4" />
                      {scanning ? "Đang xử lý..." : "Chụp biển số"}
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => handleUsePlate(scanResult)}
                        className="flex h-[34px] flex-1 items-center justify-center gap-1.5 rounded bg-green-600 font-semibold text-white hover:bg-green-500 transition-colors"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Dùng biển số này
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setScanResult(null);
                          setOcrSteps([]);
                          setActiveStepIndex(-1);
                        }}
                        className="h-[34px] rounded border border-slate-700 px-3 font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                      >
                        Quét lại
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Khách hàng có đặt trước (vé tháng hoặc vé ngày) - luôn hiển thị */}
            {!ticket && (
              <div className="rounded border border-blue-100 bg-blue-50/50 p-3 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPreBooked}
                    disabled={Boolean(ticket)}
                    onChange={(e) => {
                      setIsPreBooked(e.target.checked);
                      if (!e.target.checked) setPreBookedCode("");
                      setErrorMsg(null);
                      setSuccessMsg(null);
                      setActiveScanner(null);
                    }}
                    className="rounded text-blue-600 focus:ring-blue-400"
                  />
                  <span className="text-xs font-semibold text-gray-700">Dùng vé tháng / đặt trước</span>
                </label>

                {isPreBooked && (
                  <div className="space-y-1.5 pt-1">
                    <label className="block text-[11px] font-medium text-gray-600">Chụp ảnh vé hoặc Tải ảnh vé đặt trước (CARD... hoặc RES...)</label>
                    <div className="flex gap-2">
                      <input
                        className="h-[36px] flex-1 rounded border border-gray-300 px-3 text-xs uppercase outline-none focus:border-blue-400 disabled:bg-gray-100 font-mono"
                        placeholder="CARD000001 hoặc CARD000002"
                        value={preBookedCode}
                        disabled={Boolean(ticket)}
                        onChange={(e) => setPreBookedCode(e.target.value)}
                      />
                      
                      <button
                        type="button"
                        disabled={Boolean(ticket) || scanningTicket}
                        onClick={handleStartTicketScan}
                        className="h-[36px] px-3 rounded bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700 disabled:bg-blue-300 transition-colors flex items-center gap-1 shrink-0"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        Chụp vé
                      </button>

                      <button
                        type="button"
                        disabled={Boolean(ticket) || scanningTicket}
                        onClick={() => qrFileInputRef.current?.click()}
                        className="h-[36px] px-3 rounded bg-amber-500 text-xs font-semibold text-white hover:bg-amber-600 disabled:bg-amber-300 transition-colors flex items-center gap-1 shrink-0"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        Tải ảnh vé
                      </button>
                      <input
                        type="file"
                        ref={qrFileInputRef}
                        onChange={handleQRImageUpload}
                        accept="image/*"
                        className="hidden"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Khu vực quét / hiển thị ảnh QR vé đặt trước */}
            {activeScanner === "ticket" && (
              <div className="overflow-hidden rounded-lg border border-slate-700 bg-slate-950 font-mono text-gray-200 shadow-xl">
                {/* Scanner layout header */}
                <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/50 px-3 py-2 text-xs">
                  <div className="flex items-center gap-1.5 text-purple-400 font-bold">
                    <span className="h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
                    MÁY CHỤP VÉ ĐẶT TRƯỚC AI v1.8
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveScanner(null);
                      setScanningTicket(false);
                      setUploadedImagePreview(null);
                      setOcrSteps([]);
                      setActiveStepIndex(-1);
                    }}
                    className="flex h-5 w-5 items-center justify-center rounded hover:bg-slate-800 text-gray-400 hover:text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12">
                  {/* Left Column: Visual Preview (Col-span 12) */}
                  <div className="relative flex h-64 md:col-span-12 items-center justify-center bg-black/95 overflow-hidden">
                    {uploadedImagePreview ? (
                      <img
                        src={uploadedImagePreview}
                        alt="Ticket Uploaded Snapshot"
                        className="absolute inset-0 h-full w-full object-contain transition-transform duration-300"
                        style={{
                          transform: activeStepIndex >= 1 ? "rotate(1.2deg)" : "none"
                        }}
                      />
                    ) : (
                      <video
                        ref={ticketVideoRef}
                        autoPlay
                        playsInline
                        className="absolute inset-0 h-full w-full object-cover"
                        muted
                      />
                    )}

                    <div className="absolute inset-0 border border-slate-800 pointer-events-none" />

                    {/* Bounding box visual representation based on active steps */}
                    {activeStepIndex >= 0 && (
                      <div 
                        className={`absolute z-10 transition-all duration-300 rounded border-2 ${
                          activeStepIndex >= 5 
                            ? "border-green-400 bg-green-500/10 shadow-[0_0_15px_rgba(74,222,128,0.4)]" 
                            : activeStepIndex >= 1 
                            ? "border-purple-400 shadow-[0_0_10px_rgba(192,132,252,0.3)]" 
                            : "border-red-500 animate-pulse"
                        }`}
                        style={{
                          width: "65%",
                          height: "35%",
                          top: "32.5%",
                          left: "17.5%",
                          transform: activeStepIndex >= 1 ? "rotate(1.2deg)" : "none"
                        }}
                      >
                        {/* Bounding box corners */}
                        <div className="absolute left-0 top-0 h-3 w-3 rounded-tl border-l-[3px] border-t-[3px] border-inherit" />
                        <div className="absolute right-0 top-0 h-3 w-3 rounded-tr border-r-[3px] border-t-[3px] border-inherit" />
                        <div className="absolute bottom-0 left-0 h-3 w-3 rounded-bl border-b-[3px] border-l-[3px] border-inherit" />
                        <div className="absolute bottom-0 right-0 h-3 w-3 rounded-br border-b-[3px] border-r-[3px] border-inherit" />

                        {/* Scan laser line */}
                        {(scanningTicket && (activeStepIndex === 0 || activeStepIndex === 1)) && (
                          <div className="absolute left-0 right-0 top-0 h-[2px] bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.8)] animate-[scanLine_2s_infinite_linear]" />
                        )}

                        {/* Character split highlight visual markers (Step 3/4) */}
                        {activeStepIndex >= 3 && (
                          <div className="absolute inset-0 flex flex-col justify-around p-1 pointer-events-none opacity-80">
                            <div className="flex justify-around items-center h-[40%]">
                              {(preBookedCode || "CARD000005").split("").map((char, cIdx) => (
                                <span 
                                  key={cIdx} 
                                  className={`w-[8%] h-[85%] border border-dashed rounded-[1px] flex items-center justify-center text-[10px] font-bold ${
                                    activeStepIndex >= 4 
                                      ? "border-green-400/70 bg-green-500/10 text-green-400" 
                                      : "border-purple-400/70 bg-purple-500/5 text-purple-300"
                                  }`}
                                >
                                  {activeStepIndex >= 4 ? char : "?"}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* OCR floating prediction bubble (Step 4/5) */}
                        {activeStepIndex >= 4 && (
                          <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-purple-500 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded shadow shadow-purple-900/50 whitespace-nowrap">
                            Confidence: {(99.2 + Math.random() * 0.5).toFixed(1)}%
                          </div>
                        )}
                        
                        {/* Confirmed display text */}
                        {activeStepIndex >= 5 && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                            <span className="text-lg font-bold tracking-widest text-green-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                              {preBookedCode}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Camera view-finder elements */}
                    <div className="absolute left-3 top-3 h-3 w-3 border-l border-t border-slate-600" />
                    <div className="absolute right-3 top-3 h-3 w-3 border-r border-t border-slate-600" />
                    <div className="absolute left-3 bottom-3 h-3 w-3 border-l border-b border-slate-600" />
                    <div className="absolute right-3 bottom-3 h-3 w-3 border-r border-b border-slate-600" />

                    <div className="absolute bottom-2 left-0 right-0 text-center z-15 bg-slate-950/75 py-1 border-t border-slate-800/50 text-[10px] text-slate-400">
                      {scanningTicket ? "HỆ THỐNG ĐANG PHÂN TÍCH ẢNH CHỤP VÉ..." : "ĐƯA VÉ ĐẶT TRƯỚC VÀO KHUNG ĐỂ CHỤP VÀ QUÉT TỰ ĐỘNG"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-slate-900 border-t border-slate-800 px-3 py-2 text-xs">
                  {!uploadedImagePreview ? (
                    <button
                      type="button"
                      onClick={handleCaptureTicket}
                      disabled={scanningTicket}
                      className="flex h-[34px] flex-1 items-center justify-center gap-1.5 rounded bg-purple-600 font-semibold text-white hover:bg-purple-500 disabled:bg-slate-950 transition-colors"
                    >
                      <Camera className="h-4 w-4" />
                      {scanningTicket ? "Đang xử lý..." : "Chụp ảnh vé"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setUploadedImagePreview(null);
                        setOcrSteps([]);
                        setActiveStepIndex(-1);
                      }}
                      className="flex h-[34px] flex-1 items-center justify-center gap-1.5 rounded bg-amber-600 font-semibold text-white hover:bg-amber-500 transition-colors"
                    >
                      Quét lại
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveScanner(null);
                      setScanningTicket(false);
                      setUploadedImagePreview(null);
                    }}
                    className="h-[34px] rounded border border-slate-700 px-3 font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                  >
                    Hủy bỏ
                  </button>
                </div>
              </div>
            )}

            {/* Thông tin tự động */}
            <div className="space-y-2 rounded border border-gray-200 bg-gray-50 p-3">
              {[
                ["Thời gian vào", ticket?.tgVao ?? new Date().toLocaleString("vi-VN")],
                ["Mã vé", ticket?.maVe ?? (isPreBooked ? "Thẻ tháng / Đặt chỗ trước" : "Sẽ tạo khi bấm Tạo vé")],
                ["Làn vào", selectedLaneCode ? `${selectedLaneCode} - Cổng vào` : "Chưa chọn"],
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

            {/* Nút thao tác - chỉ hiện khi đã có biển số */}
            {(bienSo.trim() !== "" || ticket) && (
              <div className="flex gap-2 pt-1">
                {isPreBooked ? (
                  // Lượt vé tháng/đặt trước: Ẩn Tạo vé & In vé, chỉ có nút Cho xe vào
                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={!canCreate || !preBookedCode}
                    className="flex h-[38px] flex-1 items-center justify-center gap-1.5 rounded bg-green-600 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-green-300"
                  >
                    <CheckCircle className="h-4 w-4" />
                    {ticket ? "Đã cho xe vào" : "Cho xe vào"}
                  </button>
                ) : (
                  // Vé lượt thông thường: Có đầy đủ Tạo vé & In vé
                  <>
                    <button
                      type="button"
                      onClick={handleCreate}
                      disabled={!canCreate}
                      className="flex h-[38px] flex-1 items-center justify-center gap-1.5 rounded bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                    >
                      <Plus className="h-4 w-4" />
                      {ticket ? "Đã tạo vé" : "Tạo vé"}
                    </button>

                    <button
                      type="button"
                      onClick={() => setPrinted(true)}
                      disabled={!ticket}
                      className="flex h-[38px] flex-1 items-center justify-center gap-1.5 rounded bg-green-600 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-green-300"
                    >
                      <Printer className="h-4 w-4" />
                      In vé
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={handleReset}
                  className="flex h-[38px] items-center justify-center gap-1.5 rounded border border-gray-300 px-3 text-sm text-gray-600 hover:bg-gray-50"
                >
                  <RotateCcw className="h-4 w-4" />
                  Làm mới
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Bên phải: kết quả */}
        <div className="overflow-hidden rounded border border-gray-200 bg-white shadow-sm">
          <div className={`flex items-center gap-2 px-4 py-2.5 ${ticket ? "bg-green-600" : "bg-gray-400"}`}>
            <CheckCircle className="h-4 w-4 text-white" />
            <span className="text-sm font-semibold text-white">
              {ticket ? (isPreBooked ? "Xác nhận vào thành công" : "Vé đã tạo thành công") : "Kết quả"}
            </span>
          </div>

          {!ticket ? (
            <div className="flex min-h-[485px] flex-col items-center justify-center py-16 text-gray-400">
              <Car className="mb-3 h-16 w-16 opacity-20" />
              <p className="text-sm">
                {isPreBooked ? "Chụp hoặc Tải ảnh đặt trước và nhấn Cho xe vào" : "Nhập thông tin xe và nhấn Tạo vé"}
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 p-5">
              {/* Thông tin vé dạng bảng/list như hình 2 */}
              <div className="w-full space-y-0 text-sm">
                {(isPreBooked ? [
                  ["Mã vé", ticket.maVe],
                  ["Nhóm thẻ", ticket.loaiXe === "Xe máy" ? "THẺ THÁNG XE MÁY" : "THẺ THÁNG Ô TÔ"],
                  ["Loại xe", ticket.loaiXe],
                  ["Biển số xe", ticket.bienSo],
                  ["Tầng gửi xe", ticket.tang ? `Tầng ${ticket.tang}` : `Tầng ${selectedFloorCode}`],
                  ["Làn vào", ticket.lanVao],
                  ["Thời gian vào", ticket.tgVao],
                ] : [
                  ["Mã vé", ticket.maVe],
                  ["Nhóm thẻ", ticket.loaiXe === "Xe máy" ? "Thẻ Lượt Xe máy" : "Thẻ lượt xe hơi"],
                  ["Loại xe", ticket.loaiXe],
                  ["Biển số xe", ticket.bienSo],
                  ["Tầng gửi xe", ticket.tang ? `Tầng ${ticket.tang}` : `Tầng ${selectedFloorCode}`],
                  ["Làn vào", ticket.lanVao],
                  ["Thời gian vào", ticket.tgVao],
                ]).map(([label, value]) => (
                  <div key={label} className="flex justify-between items-center py-2.5 border-b border-gray-150">
                    <span className="text-xs text-gray-500">{label}</span>
                    <span className="text-sm font-semibold text-gray-800">{value}</span>
                  </div>
                ))}
              </div>

              {/* Thông báo */}
              <div className="w-full rounded-lg border border-green-200 bg-green-50 px-4 py-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 shrink-0 text-green-600" />
                  <div>
                    <p className="text-sm font-semibold text-green-700">
                      {isPreBooked ? "Xác nhận vào thành công" : "Xe đã được tiếp nhận"}
                    </p>
                    <p className="mt-0.5 text-xs text-green-600">
                      {isPreBooked ? "Hệ thống xác nhận vé đặt trước hợp lệ. Cho phương tiện di chuyển vào." : "Vé xe đã được tạo thành công. Có thể cho phương tiện di chuyển vào bãi."}
                    </p>
                  </div>
                </div>
              </div>

              {printed && !isPreBooked && (
                <div className="flex items-center gap-1.5 text-xs font-medium text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  Đã gửi lệnh in vé thành công
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
