import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  CreditCard,
  Loader2,
  QrCode,
  X,
} from "lucide-react";
import { authService } from "../../../services/authService";
import { QRCodeSVG } from "qrcode.react";

const API_URL = import.meta.env.VITE_API_URL || "http://192.168.1.17:8080/api/v1";

// ─── Types ────────────────────────────────────────────────────────────────────
type PaymentMethod = "VNPAY" | "CASH";
type PaymentStep = "select" | "processing" | "vnpay_qr" | "success" | "failed";

export interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  ticketId: number;
  ticketNo: string;
  plateNo: string;
  vehicleType: string;
  checkInAt: string;
  checkOutAt: string;
  feeAmount: number;
}

import { safeJson } from "../../../utils/apiHelper";

// ─── Helper ───────────────────────────────────────────────────────────────────
async function apiFetch(path: string, body?: object) {
  const token = authService.getToken();
  const res = await fetch(`${API_URL}${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json: any = await safeJson(res);
  if (!res.ok) throw new Error(json.message || "API error");
  return json.data;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PaymentModal({
  isOpen,
  onClose,
  onSuccess,
  ticketId,
  ticketNo,
  plateNo,
  vehicleType,
  checkInAt,
  checkOutAt,
  feeAmount,
}: PaymentModalProps) {
  const [method, setMethod] = useState<PaymentMethod>("VNPAY");
  const [step, setStep] = useState<PaymentStep>("select");
  const [vnpayUrl, setVnpayUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [closeCountdown, setCloseCountdown] = useState(3);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoCloseRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (autoCloseRef.current) clearInterval(autoCloseRef.current);
    pollRef.current = null;
    autoCloseRef.current = null;
  };

  // Reset khi dong / mo modal
  useEffect(() => {
    if (!isOpen) {
      clearTimers();
      return;
    }
    setStep("select");
    setMethod("VNPAY");
    setVnpayUrl(null);
    setErrorMsg(null);
    setCloseCountdown(3);
    return () => clearTimers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Auto-close sau khi thanh toan thanh cong
  useEffect(() => {
    if (step !== "success") return;
    setCloseCountdown(3);
    autoCloseRef.current = setInterval(() => {
      setCloseCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(autoCloseRef.current!);
          autoCloseRef.current = null;
          onSuccess();
          return 0;
        }
        return prev - 1;
      });
    }, 1_000);
    return () => {
      if (autoCloseRef.current) clearInterval(autoCloseRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Xu ly khi bam xac nhan
  const handleConfirm = async () => {
    setErrorMsg(null);
    setStep("processing");
    try {
      if (method === "CASH") {
        await apiFetch("/staff/checkout-payment", {
          ticketId,
          paymentMethod: "CASH",
        });
        setStep("success");
      } else {
        // VNPay: lay link thanh toan
        const data = await apiFetch("/staff/checkout-payment", {
          ticketId,
          paymentMethod: "VNPAY",
          ipAddr: "127.0.0.1",
        });
        setVnpayUrl(data.checkoutUrl);
        setStep("vnpay_qr");

        // Bat dau polling kiem tra trang thai sau khi hien QR
        let pollCount = 0;
        const MAX_POLLS = 30; // 30 x 4s = 2 phut
        pollRef.current = setInterval(async () => {
          pollCount++;
          try {
            const status = await apiFetch(`/staff/payment-status/${ticketId}`);
            if (status === "PAID") {
              clearTimers();
              setStep("success");
            } else if (status === "CANCELLED" || status === "FAILED") {
              clearTimers();
              setErrorMsg("Giao dịch đã bị hủy hoặc thất bại.");
              setStep("failed");
            } else if (pollCount >= MAX_POLLS) {
              clearTimers();
              setErrorMsg("Hết thời gian chờ thanh toán (2 phút). Vui lòng thử lại.");
              setStep("failed");
            }
          } catch {
            // bo qua loi mang tam thoi
          }
        }, 4_000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Lỗi không xác định");
      setStep("failed");
    }
  };

  if (!isOpen) return null;

  const checkInFormatted = new Date(checkInAt).toLocaleString("vi-VN");
  const checkOutFormatted = new Date(checkOutAt).toLocaleString("vi-VN");

  // ── Ticket Info Block ──────────────────────────────────────────────────────
  const TicketInfo = () => (
    <div className="grid grid-cols-2 gap-y-1.5 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-[12px]">
      <span className="text-gray-500">Mã vé:</span>
      <span className="text-right font-bold text-gray-800">{ticketNo}</span>
      <span className="text-gray-500">Biển số xe:</span>
      <span className="text-right font-bold text-gray-800">{plateNo}</span>
      <span className="text-gray-500">Loại xe:</span>
      <span className="text-right font-medium text-gray-700">
        {vehicleType === "CAR" ? "Ô tô" : "Xe máy"}
      </span>
      <span className="text-gray-500">Giờ vào:</span>
      <span className="text-right font-medium text-gray-700">{checkInFormatted}</span>
      <span className="text-gray-500">Giờ ra:</span>
      <span className="text-right font-medium text-gray-700">{checkOutFormatted}</span>
    </div>
  );

  // ── Fee Block ──────────────────────────────────────────────────────────────
  const FeeBlock = () => (
    <div className="rounded-xl bg-blue-600 py-3 text-center">
      <p className="text-xs text-blue-200">Tổng phí thanh toán</p>
      <p className="mt-0.5 text-2xl font-extrabold tabular-nums text-white">
        {feeAmount.toLocaleString("vi-VN")}{" "}
        <span className="text-base font-semibold">VNĐ</span>
      </p>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div
          className={`flex items-center justify-between px-5 py-3.5 ${
            step === "success" ? "bg-green-600" : step === "failed" ? "bg-red-500" : "bg-blue-600"
          }`}
        >
          <div className="flex items-center gap-2">
            {step === "success" ? (
              <CheckCircle2 className="h-5 w-5 text-white" />
            ) : step === "vnpay_qr" ? (
              <QrCode className="h-5 w-5 text-white" />
            ) : (
              <CreditCard className="h-5 w-5 text-white" />
            )}
            <span className="text-base font-semibold text-white">
              {step === "success"
                ? "Thanh toán thành công!"
                : step === "failed"
                ? "Giao dịch thất bại"
                : step === "vnpay_qr"
                ? "Quét mã VNPay"
                : "Xác nhận thanh toán"}
            </span>
          </div>
          {step !== "processing" && (
            <button
              type="button"
              onClick={() => { clearTimers(); onClose(); }}
              className="rounded-full p-1 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
              aria-label="Đóng"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* ── Body ───────────────────────────────────────────────────────── */}
        <div className="space-y-4 px-5 py-4">

          {/* STEP: SELECT METHOD */}
          {step === "select" && (
            <>
              <TicketInfo />
              <FeeBlock />

              {/* Chon phuong thuc thanh toan */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Phương thức thanh toán
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setMethod("VNPAY")}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border-2 py-3 text-sm font-semibold transition-all ${
                      method === "VNPAY"
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-200 text-gray-600 hover:border-blue-300"
                    }`}
                  >
                    <QrCode className="h-5 w-5" />
                    VNPay QR
                  </button>
                  <button
                    onClick={() => setMethod("CASH")}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border-2 py-3 text-sm font-semibold transition-all ${
                      method === "CASH"
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                        : "border-gray-200 text-gray-600 hover:border-emerald-300"
                    }`}
                  >
                    <Banknote className="h-5 w-5" />
                    Tiền mặt
                  </button>
                </div>
              </div>

              {/* Description */}
              <p className="text-center text-[11px] text-gray-400">
                {method === "CASH"
                  ? "✅ Xác nhận nhận tiền mặt từ khách → hệ thống cập nhật ngay"
                  : "📱 Tạo mã QR VNPay → khách quét bằng app ngân hàng"}
              </p>

              {/* Confirm button */}
              <button
                onClick={handleConfirm}
                className={`w-full rounded-lg py-2.5 text-sm font-bold text-white transition-colors ${
                  method === "CASH"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {method === "CASH" ? "✅ Xác nhận đã thu tiền mặt" : "📱 Tạo mã QR VNPay"}
              </button>
            </>
          )}

          {/* STEP: PROCESSING */}
          {step === "processing" && (
            <div className="flex flex-col items-center py-10 gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
              <p className="text-sm font-medium text-gray-600">Đang xử lý...</p>
            </div>
          )}

          {/* STEP: VNPAY QR */}
          {step === "vnpay_qr" && vnpayUrl && (
            <>
              <TicketInfo />
              <FeeBlock />
              <div className="flex flex-col items-center gap-3">
                <div className="rounded-xl border-2 border-blue-100 bg-white p-3 shadow-inner">
                  <QRCodeSVG value={vnpayUrl} size={200} />
                </div>
                <p className="text-center text-[11px] text-gray-400">
                  Quét mã QR bằng App ngân hàng / ví điện tử để thanh toán
                </p>
                <button
                  onClick={() => { window.open(vnpayUrl, "_blank"); }}
                  className="text-xs text-blue-600 underline hover:text-blue-800"
                >
                  Hoặc mở trang VNPay
                </button>
              </div>
              <div className="flex items-center justify-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
                <span className="text-xs font-medium text-blue-600">
                  Đang chờ xác nhận thanh toán...
                </span>
              </div>
            </>
          )}

          {/* STEP: SUCCESS */}
          {step === "success" && (
            <div className="flex flex-col items-center py-8 gap-3 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
              </div>
              <h2 className="text-xl font-bold text-green-700">
                {method === "CASH"
                  ? "Đã xác nhận thanh toán tiền mặt!"
                  : "Thanh toán VNPay thành công!"}
              </h2>
              <p className="text-sm text-gray-500">
                Xe{" "}
                <span className="font-semibold text-gray-800">{plateNo}</span>{" "}
                đã thanh toán{" "}
                <span className="font-semibold text-blue-600">
                  {feeAmount.toLocaleString("vi-VN")} VNĐ
                </span>{" "}
                thành công.
              </p>
              {method === "CASH" && (
                <p className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 rounded px-3 py-1.5">
                  Thẻ đã được kích hoạt trong hệ thống.
                </p>
              )}
              <p className="mt-2 text-xs text-gray-400">
                Tự động đóng sau{" "}
                <span className="font-semibold text-gray-600">{closeCountdown}</span> giây...
              </p>
            </div>
          )}

          {/* STEP: FAILED */}
          {step === "failed" && (
            <div className="flex flex-col items-center py-8 gap-3 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
                <AlertCircle className="h-12 w-12 text-red-500" />
              </div>
              <h2 className="text-xl font-bold text-red-700">Giao dịch thất bại</h2>
              <p className="text-sm text-gray-500">{errorMsg}</p>
              <button
                onClick={() => { setStep("select"); setErrorMsg(null); }}
                className="mt-2 rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Thử lại
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}