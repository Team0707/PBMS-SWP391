import { useState, useEffect } from "react";
import { CreditCard, Plus, RefreshCw, Eye, X, AlertTriangle, CheckCircle, Clock, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { cardService } from "../../../services/cardService";

/* ── VietQR config (tài khoản nhận tiền của bãi xe) ─────────────── */
const VQR_BANK_BIN    = "970432";
const VQR_ACCOUNT_NO  = "2323042004";
const VQR_TEMPLATE_ID = "btat8lf";

const SESSION_KEY = "vnpay_session";

function buildVietQrUrl(amount: number, description: string): string {
  return (
    `https://api.vietqr.io/image/${VQR_BANK_BIN}-${VQR_ACCOUNT_NO}-${VQR_TEMPLATE_ID}.jpg` +
    `?amount=${Math.round(amount)}&addInfo=${encodeURIComponent(description)}`
  );
}

function buildCardQrUrl(cardNo: string, size: number): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=0&data=${encodeURIComponent(cardNo)}`;
}

/* ── Types & data ────────────────────────────────────────────────── */
interface MonthlyCard {
  id: number;
  cardNo: string;
  nhomThe: string;
  loaiXe: string;
  bienSo: string;
  ngayDangKy: string;
  ngayHetHan: string;
  tangGuiXe?: string;
  trangThai: "Hoạt động" | "Hết hạn" | "Sắp hết hạn";
  soNgayConLai: number;
}

type NewMonthlyCard = Omit<
  MonthlyCard,
  "id" | "cardNo" | "trangThai" | "soNgayConLai"
>;


function parseDateOnly(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getTodayDate(): string {
  return formatDateOnly(new Date());
}

function addMonths(dateStr: string, months: number): string {
  const source = parseDateOnly(dateStr);
  const originalDay = source.getDate();

  // Chuyển về ngày 1 trước khi cộng tháng để tránh lỗi kiểu 31/01 + 1 tháng
  // bị nhảy sang tháng 3.
  source.setDate(1);
  source.setMonth(source.getMonth() + months);

  const lastDayOfTargetMonth = new Date(
    source.getFullYear(),
    source.getMonth() + 1,
    0
  ).getDate();

  source.setDate(Math.min(originalDay, lastDayOfTargetMonth));
  return formatDateOnly(source);
}

function addDays(dateStr: string, days: number): string {
  const date = parseDateOnly(dateStr);
  date.setDate(date.getDate() + days);
  return formatDateOnly(date);
}

function differenceInDays(laterDate: string, earlierDate = getTodayDate()): number {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return Math.ceil(
    (parseDateOnly(laterDate).getTime() - parseDateOnly(earlierDate).getTime()) /
      millisecondsPerDay
  );
}

function getCardStatus(expireAt: string): Pick<
  MonthlyCard,
  "trangThai" | "soNgayConLai"
> {
  const remainingDays = differenceInDays(expireAt);

  return {
    trangThai:
      remainingDays < 0
        ? "Hết hạn"
        : remainingDays <= 14
          ? "Sắp hết hạn"
          : "Hoạt động",
    soNgayConLai: remainingDays,
  };
}

function refreshCardStatus(card: MonthlyCard): MonthlyCard {
  return {
    ...card,
    ...getCardStatus(card.ngayHetHan),
  };
}

function generateNextCardIdentity(cards: MonthlyCard[]): {
  id: number;
  cardNo: string;
} {
  const maxId = cards.reduce((max, card) => Math.max(max, card.id), 0);
  const nextId = maxId + 1;

  return {
    id: nextId,
    cardNo: `CARD${String(nextId).padStart(6, "0")}`,
  };
}

function StatusBadge({ card }: { card: MonthlyCard }) {
  if (card.trangThai === "Hoạt động")
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-700 border border-green-200"><CheckCircle className="w-3 h-3" />Hoạt động</span>;
  if (card.trangThai === "Sắp hết hạn")
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200"><AlertTriangle className="w-3 h-3" />Sắp hết hạn</span>;
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700 border border-red-200"><X className="w-3 h-3" />Hết hạn</span>;
}

/* ── Add Card Modal ──────────────────────────────────────────────── */
function AddCardModal({ cardGroups, onSave, onClose }: {
  cardGroups: any[];
  onSave: (card: NewMonthlyCard) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState(() => {
    const defaultGroup = cardGroups.find(g => g.groupName === "THẺ THÁNG XE MÁY") || cardGroups[0];
    const todayStr = getTodayDate();
    return {
      nhomThe: defaultGroup?.groupName || "",
      bienSo: "",
      tangGuiXe: "",
      ngayDangKy: todayStr,
    };
  });
  const [duration, setDuration] = useState(1);
  const [err, setErr] = useState("");
  const F = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const selectedGroup = cardGroups.find(g => g.groupName === form.nhomThe);
  const isDayCard = selectedGroup ? selectedGroup.ticketType === "DAY" : false;
  const loaiXe = selectedGroup ? (selectedGroup.vehicleType === "CAR" ? "Ô tô" : "Xe máy") : "Xe máy";
  const today = getTodayDate();
  const ngayHetHan = isDayCard ? addDays(form.ngayDangKy, duration) : addMonths(form.ngayDangKy, duration);

  const handleNext = () => {
    if (!form.bienSo.trim()) {
      setErr("Vui lòng nhập biển số xe (*)");
      return;
    }
    if (!form.tangGuiXe) {
      setErr("Vui lòng chọn tầng gửi xe (*)");
      return;
    }
    if (!form.ngayDangKy) {
      setErr("Vui lòng chọn ngày bắt đầu (*)");
      return;
    }
    const data = {
      ...form,
      loaiXe,
      ngayDangKy: form.ngayDangKy,
      ngayHetHan,
      tangGuiXe: form.tangGuiXe,
    };
    onSave(data);
  };

  const unitPrice = selectedGroup ? selectedGroup.basePrice : 100000;
  const price = unitPrice * duration;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[500px] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 bg-blue-600">
          <span className="text-white text-sm font-semibold flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Đăng kí thẻ
          </span>
          <button onClick={onClose} className="text-white/80 hover:text-white"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-3">
              {err && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{err}</div>}
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Biển số xe <span className="text-red-500">*</span>
                </label>
                <input
                  className="w-full h-[36px] border border-gray-300 rounded px-3 text-sm uppercase focus:outline-none focus:border-blue-400"
                  placeholder="VD: 29X1-123.45"
                  value={form.bienSo}
                  onChange={(e) => F("bienSo", e.target.value.toUpperCase())}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Nhóm thẻ
                </label>

                <select
                  className="w-full h-[36px] border border-gray-300 rounded px-3 text-sm focus:outline-none focus:border-blue-400"
                  value={form.nhomThe}
                  onChange={(e) => {
                    const nhomTheMoi = e.target.value;
                    const selected = cardGroups.find(g => g.groupName === nhomTheMoi);
                    const isOtoMoi = selected ? selected.vehicleType === "CAR" : false;

                    setForm((previous) => ({
                      ...previous,
                      nhomThe: nhomTheMoi,
                      tangGuiXe: isOtoMoi ? previous.tangGuiXe : "",
                    }));

                    setErr("");
                  }}
                >
                  {cardGroups.map((cg) => (
                    <option key={cg.cardGroupId} value={cg.groupName}>
                      {cg.groupName}
                    </option>
                  ))}
                </select>

                <div className="mt-1.5 rounded border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                  Loại xe tự động:{" "}
                  <span className="font-semibold">{loaiXe}</span>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Ngày bắt đầu sử dụng <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  className="w-full h-[36px] border border-gray-300 rounded px-3 text-sm focus:outline-none focus:border-blue-400"
                  value={form.ngayDangKy}
                  min={today}
                  onChange={(e) => F("ngayDangKy", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Tầng gửi xe <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  {["Tầng B1", "Tầng B2"].map(t => (
                    <label key={t} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded border-2 cursor-pointer text-sm font-semibold transition-colors ${form.tangGuiXe === t ? "border-amber-500 bg-amber-50 text-amber-700" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                      <input type="radio" className="hidden" checked={form.tangGuiXe === t} onChange={() => F("tangGuiXe", t)} />
                      {t}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  {isDayCard ? "Số ngày đăng ký" : "Số tháng đăng ký"}
                </label>

                <select
                  className="w-full h-[36px] border border-gray-300 rounded px-3 text-sm bg-white focus:outline-none focus:border-blue-400"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                >
                  {Array.from({ length: isDayCard ? 29 : 12 }, (_, index) => index + 1).map(
                    (value) => (
                      <option key={value} value={value}>
                        {value} {isDayCard ? "ngày" : "tháng"}
                      </option>
                    )
                  )}
                </select>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded px-3 py-2.5 space-y-1">
                <div className="flex justify-between text-xs text-blue-700">
                  <span>Ngày hết hạn:</span><span className="font-semibold">{ngayHetHan}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-blue-700">Tổng phí ({duration} {isDayCard ? "ngày" : "tháng"}):</span>
                  <span className="text-sm font-bold text-blue-800">{price.toLocaleString("vi-VN")} VNĐ</span>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-200">
              <button onClick={handleNext} className="flex items-center gap-1.5 h-[34px] px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors">
                <QrCode className="w-3.5 h-3.5" />Tiếp theo: Thanh toán
              </button>
              <button onClick={onClose} className="h-[34px] px-3 border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm rounded transition-colors">Hủy</button>
            </div>
      </div>
    </div>
  );
}

/* ── Renew Modal ─────────────────────────────────────────────────── */
function RenewModal({ cardGroups, card, onSave, onClose }: {
  cardGroups: any[];
  card: MonthlyCard;
  onSave: (id: number, newExpiry: string) => void;
  onClose: () => void;
}) {
  const selectedGroup = cardGroups.find(g => g.groupName === card.nhomThe);
  const basePrice = selectedGroup ? selectedGroup.basePrice : 100000;
  const isDayCard = selectedGroup ? selectedGroup.ticketType === "DAY" : card.nhomThe.includes("NGÀY");

  const getRenewalOptions = () => {
    if (isDayCard) {
      return Array.from({ length: 29 }, (_, index) => {
        const days = index + 1;
        return { duration: days, unit: "ngày" as const, price: basePrice * days };
      });
    }

    const getMonthlyPrice = (m: number) => {
      if (m === 3) return Math.round(basePrice * 2.8);
      if (m === 6) return Math.round(basePrice * 5.4);
      return basePrice * m;
    };

    return Array.from({ length: 12 }, (_, index) => {
      const months = index + 1;
      return { duration: months, unit: "tháng" as const, price: getMonthlyPrice(months) };
    });
  };

  const renewalOptions = getRenewalOptions();
  const [selectedDuration, setSelectedDuration] = useState(renewalOptions[0]?.duration ?? 1);
  const today = getTodayDate();
  const renewalBaseDate = card.ngayHetHan >= today ? card.ngayHetHan : today;
  const newExpiry = isDayCard
    ? addDays(renewalBaseDate, selectedDuration)
    : addMonths(renewalBaseDate, selectedDuration);

  const canRenew = renewalOptions.length > 0;
  const cardIsExpired = card.ngayHetHan < today;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[480px] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 bg-emerald-600">
          <span className="text-white text-sm font-semibold flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Gia hạn thẻ
          </span>
          <button onClick={onClose} className="text-white/80 hover:text-white"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-gray-50 border border-gray-200 rounded p-3 space-y-2">
            <div className="flex justify-between gap-4"><span className="text-gray-500 text-xs">CardNo:</span><span className="text-xs font-semibold font-mono">{card.cardNo}</span></div>
            <div className="flex justify-between gap-4"><span className="text-gray-500 text-xs">Biển số xe:</span><span className="text-xs font-semibold uppercase">{card.bienSo}</span></div>
            <div className="flex justify-between gap-4"><span className="text-gray-500 text-xs">Ngày hết hạn hiện tại:</span><span className={`text-xs font-semibold ${cardIsExpired ? "text-red-600" : "text-gray-800"}`}>{card.ngayHetHan}</span></div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{isDayCard ? "Số ngày gia hạn" : "Số tháng gia hạn"}</label>
            <select
              className="w-full h-[38px] border border-gray-300 rounded px-3 text-sm bg-white focus:outline-none focus:border-emerald-500"
              value={selectedDuration}
              onChange={(e) => setSelectedDuration(Number(e.target.value))}
            >
              {renewalOptions.map((option) => (
                <option key={`${option.duration}-${option.unit}`} value={option.duration}>
                  {option.duration} {option.unit} — {option.price.toLocaleString("vi-VN")} VNĐ
                </option>
              ))}
            </select>
          </div>

          <div className="bg-emerald-600 rounded-lg p-4">
            <div className="flex justify-between text-emerald-100 text-xs mb-1"><span>Ngày hết hạn mới:</span><span className="font-semibold text-white">{newExpiry}</span></div>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-200">
          <button
            onClick={() => onSave(card.id, newExpiry)}
            disabled={!canRenew}
            className="flex items-center gap-1.5 h-[34px] px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-medium rounded transition-colors"
          >
            <QrCode className="w-3.5 h-3.5" />Tiếp theo: Thanh toán
          </button>
          <button onClick={onClose} className="h-[34px] px-3 border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm rounded transition-colors">Hủy</button>
        </div>
      </div>
    </div>
  );
}

/* ── Detail Modal ────────────────────────────────────────────────── */
function DetailModal({ card, onClose }: { card: MonthlyCard; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[420px] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 bg-blue-600">
          <span className="text-white text-sm font-semibold flex items-center gap-2"><Eye className="w-4 h-4" />Chi tiết — {card.cardNo}</span>
          <button onClick={onClose} className="text-white/80 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div className="space-y-0">
          {[
            ["CardNo", card.cardNo],
            ["Nhóm thẻ", card.nhomThe],
            ["Loại xe", card.loaiXe],
            ["Biển số xe", card.bienSo],
            ...(card.tangGuiXe ? [["Tầng gửi xe", card.tangGuiXe]] : []),
            ["Ngày đăng ký", card.ngayDangKy],
            ["Ngày hết hạn", card.ngayHetHan],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between items-center py-1.5 border-b border-gray-100">
              <span className="text-xs text-gray-500">{label}</span>
              <span className="text-sm font-semibold text-gray-800">{value}</span>
            </div>
          ))}
          <div className="flex justify-between items-center py-1.5">
            <span className="text-xs text-gray-500">Trạng thái</span>
            <StatusBadge card={card} />
          </div>
          </div>
          {card.soNgayConLai > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded px-3 py-2 text-xs text-blue-700 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />Còn <strong>{card.soNgayConLai}</strong> ngày hiệu lực
            </div>
          )}
        </div>
        <div className="flex justify-end px-5 py-3 border-t border-gray-200">
          <button onClick={onClose} className="h-[34px] px-4 border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm rounded transition-colors">Đóng</button>
        </div>
      </div>
    </div>
  );
}

/* ── Payment QR Modal ────────────────────────────────────────────── */
function PaymentQrModal({ orderCode, qrCode, checkoutUrl, paymentType = 'registration', onClose, onDone }: { orderCode?: number; qrCode: string; checkoutUrl: string; paymentType?: 'registration' | 'renewal'; onClose: () => void; onDone: () => void }) {
  const [isPaid, setIsPaid] = useState(false);

  useEffect(() => {
    if (!orderCode) return;

    // Polling kiem tra trang thai thanh toan moi 4 giay
    const interval = setInterval(async () => {
      try {
        const statusData = await cardService.checkPaymentStatus(orderCode);
        if (statusData && statusData.status === "PAID") {
          clearInterval(interval);
          setIsPaid(true); // Chuyen sang UI thanh cong
        } else if (statusData && statusData.status === "CANCELLED") {
          clearInterval(interval);
          onClose();
        }
      } catch (err) {
        console.error("Loi polling trang thai thanh toan", err);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [orderCode, onClose]);

  const handleCancel = async () => {
    if (!orderCode) { onClose(); return; }
    if (window.confirm("Ban co chac chan muon huy thanh toan nay khong?")) {
      try {
        await cardService.cancelPayment(orderCode, "Nguoi dung chu dong huy tren giao dien");
        // Xoa session khoi localStorage de QR khong tu dong hien lai khi F5
        localStorage.removeItem(SESSION_KEY);
        alert("Giao dich da duoc huy bo thanh cong tren he thong");
        onClose();
      } catch (err: any) {
        alert(err.message || "Loi khi huy thanh toan");
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-lg shadow-xl w-[400px] overflow-hidden text-center">
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-3 ${isPaid ? 'bg-emerald-600' : 'bg-blue-600'}`}>
          <span className="text-white text-sm font-semibold">
            {isPaid ? '✅ Thanh toán thành công!' : 'Thanh toán qua VNPay'}
          </span>
          {!isPaid && (
            <button onClick={onClose} className="text-white/80 hover:text-white"><X className="w-4 h-4" /></button>
          )}
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col items-center gap-4">
          {isPaid ? (
            <>
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                <span className="text-3xl">✅</span>
              </div>
              <p className="text-sm text-emerald-700 font-medium">
                {paymentType === 'renewal'
                  ? 'Hệ thống đã xác nhận thanh toán. Thẻ của bạn đã được gia hạn thành công!'
                  : 'Hệ thống đã xác nhận thanh toán. Thẻ của bạn đã được kích hoạt!'}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-600">Quét mã QR dưới đây bằng ứng dụng ngân hàng hoặc ví điện tử để thanh toán</p>
              <div className="p-2 border rounded-xl bg-white shadow-sm inline-block">
                <QRCodeSVG value={qrCode} size={256} />
              </div>
              <button
                onClick={() => {
                  // Danh dau la da redirect sang VNPay de khi quay lai khong hien QR modal
                  const raw = localStorage.getItem('vnpay_session');
                  if (raw) {
                    try {
                      const s = JSON.parse(raw);
                      localStorage.setItem('vnpay_session', JSON.stringify({ ...s, wasRedirected: true }));
                    } catch {}
                  }
                  window.location.href = checkoutUrl;
                }}
                className="text-sm text-blue-600 underline hover:text-blue-800 bg-transparent border-none cursor-pointer p-0"
              >
                Hoặc mở trang thanh toán VNPay
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex justify-end gap-2">
          {!isPaid && (
            <>
              <button 
                onClick={handleCancel} 
                className="px-4 py-1.5 border border-red-300 text-red-600 text-sm rounded hover:bg-red-50 transition-colors"
              >
                Hủy thanh toán
              </button>
              <button
                onClick={async () => {
                  if (!orderCode) return;
                  try {
                    await cardService.mockPaymentSuccess(orderCode);
                    setIsPaid(true);
                  } catch (err: any) {
                    alert(err.message || "Lỗi khi giả lập thanh toán.");
                  }
                }}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded transition-colors"
              >
                Giả lập Thanh toán (Test)
              </button>
            </>
          )}
          {isPaid && (
            <button
              onClick={onDone}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded transition-colors"
            >
              Hoàn tất ✓
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Main ────────────────────────────────────────────────────────── */
export default function UserMonthlyCards() {
  const [cards, setCards] = useState<MonthlyCard[]>([]);
  const [cardGroups, setCardGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [renewCard, setRenewCard] = useState<MonthlyCard | null>(null);
  const [detailCard, setDetailCard] = useState<MonthlyCard | null>(null);
  const [paymentQr, setPaymentQr] = useState<{orderCode?: number, qrCode: string, checkoutUrl: string, paymentType?: 'registration' | 'renewal'} | null>(null);
  // Trang thai cho khi nguoi dung da redirect sang VNPay va quay ve: hien banner thay vi QR modal
  const [pendingConfirmation, setPendingConfirmation] = useState<{ orderCode: number } | null>(null);
  const [confirmationSuccess, setConfirmationSuccess] = useState(false);

  const fetchCards = async () => {
    setLoading(true);
    try {
      const [myCards, groups] = await Promise.all([
        cardService.getMyCards(),
        cardService.getActiveCardGroups()
      ]);
      setCards(myCards);
      setCardGroups(groups);
      setError("");
    } catch (err: any) {
      setError(err.message || "Không thể tải danh sách thẻ.");
    } finally {
      setLoading(false);
    }
  };

  // Polling ngam khi dang o trang thai pendingConfirmation (da redirect sang VNPay)
  useEffect(() => {
    if (!pendingConfirmation) return;

    const MAX_POLLS = 20; // Toi da 20 lan x 4 giay = 80 giay
    let pollCount = 0;

    const interval = setInterval(async () => {
      pollCount++;
      try {
        const statusData = await cardService.checkPaymentStatus(pendingConfirmation.orderCode);

        if (statusData && statusData.status === 'PAID') {
          // Thanh toan thanh cong
          clearInterval(interval);
          localStorage.removeItem(SESSION_KEY);
          setPendingConfirmation(null);
          setConfirmationSuccess(true);
          fetchCards();
          setTimeout(() => setConfirmationSuccess(false), 6000);

        } else if (statusData && (statusData.status === 'CANCELLED' || statusData.status === 'FAILED')) {
          // Giao dich bi huy hoac that bai -> dung ngay
          clearInterval(interval);
          localStorage.removeItem(SESSION_KEY);
          setPendingConfirmation(null);
          // Hien thong bao huy nhe nhang (khong alert, chi clear banner)

        } else if (pollCount >= MAX_POLLS) {
          // Het thoi gian cho (80 giay)
          clearInterval(interval);
          localStorage.removeItem(SESSION_KEY);
          setPendingConfirmation(null);
          alert('⚠️ Giao dịch đã hết thời gian chờ hoặc bị hủy bỏ!\nVui lòng kiểm tra lại trạng thái thẻ.');
          fetchCards(); // Refresh de hien trang thai moi nhat
        }
      } catch (err) {
        console.error('Loi polling pending confirmation', err);
        pollCount++; // Van dem neu loi de khong bi loop vo han
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [pendingConfirmation]);

  useEffect(() => {
    fetchCards();

    // Khoi phuc session khi trang tai lai
    // CHU Y: Chi tu dong phuc hoi trang thai 'pendingConfirmation' (da redirect sang VNPay).
    // KHONG tu dong hien QR modal khi session.wasRedirected=false --
    // nguoi dung phai chu dong bam nut "Dang ky" hoac "Gia han" de hien QR.
    const savedSession = localStorage.getItem(SESSION_KEY);
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        if (session.expiresAt > Date.now()) {
          if (session.wasRedirected) {
            // Nguoi dung da redirect sang VNPay: chi polling am thanh, khong hien QR
            setPendingConfirmation({ orderCode: session.orderCode });
          }
          // Neu chua redirect (wasRedirected=false): KHONG tu dong bat QR modal.
          // Nguoi dung bam nut "Dang ky"/"Gia han" thi handleOpenAddModal/handleOpenRenewModal
          // se tu phuc hoi session va hien QR.
        } else {
          localStorage.removeItem(SESSION_KEY);
        }
      } catch (e) {
        localStorage.removeItem(SESSION_KEY);
      }
    }
  }, []);

  const handleAdd = async (data: NewMonthlyCard) => {
    const selectedGroup = cardGroups.find(g => g.groupName === data.nhomThe);
    const isDayCard = selectedGroup ? selectedGroup.ticketType === "DAY" : data.nhomThe.includes("NGÀY");
    let duration = 1;
    if (isDayCard) {
      duration = differenceInDays(data.ngayHetHan, data.ngayDangKy);
    } else {
      const start = parseDateOnly(data.ngayDangKy);
      const end = parseDateOnly(data.ngayHetHan);
      duration = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
      if (duration <= 0) duration = 1;
    }
    const unitPrice = selectedGroup ? selectedGroup.basePrice : 100000;
    const amount = unitPrice * duration;

    try {
      const newCard = await cardService.registerCard({
        nhomThe: data.nhomThe,
        bienSo: data.bienSo,
        tangGuiXe: data.tangGuiXe,
        duration,
        amount,
        startDate: data.ngayDangKy,
      });
      if (newCard.qrCode && newCard.checkoutUrl) {
        const sessionData = {
          orderCode: newCard.orderCode,
          qrCode: newCard.qrCode,
          checkoutUrl: newCard.checkoutUrl,
          expiresAt: Date.now() + 5 * 60 * 1000, // 5 phút
          paymentType: 'registration' as const,
        };
        localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
        setPaymentQr(sessionData);
        setShowAdd(false);
      } else if (newCard.checkoutUrl) {
        window.location.href = newCard.checkoutUrl;
      } else {
        setCards(prev => [...prev, refreshCardStatus(newCard)]);
        setShowAdd(false);
      }
    } catch (err: any) {
      alert(err.message || "Đăng ký thẻ thất bại.");
    }
  };

  const handleRenew = async (id: number, newExpiry: string) => {
    const card = cards.find(c => c.id === id);
    if (!card) return;

    const today = getTodayDate();
    const renewalBaseDate = card.ngayHetHan >= today ? card.ngayHetHan : today;
    const selectedGroup = cardGroups.find(g => g.groupName === card.nhomThe);
    const isDayCard = selectedGroup ? selectedGroup.ticketType === "DAY" : card.nhomThe.includes("NGÀY");

    let duration = 1;
    if (isDayCard) {
      duration = differenceInDays(newExpiry, renewalBaseDate);
    } else {
      const start = parseDateOnly(renewalBaseDate);
      const end = parseDateOnly(newExpiry);
      duration = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
      if (duration <= 0) duration = 1;
    }

    const basePrice = selectedGroup ? selectedGroup.basePrice : 100000;
    const getMonthlyPrice = (m: number) => {
      if (m === 3) return Math.round(basePrice * 2.8);
      if (m === 6) return Math.round(basePrice * 5.4);
      return basePrice * m;
    };
    const amount = isDayCard ? basePrice * duration : getMonthlyPrice(duration);

    try {
      const updatedCard = await cardService.renewCard({
        cardId: id,
        newExpiry,
        duration,
        amount,
      });
      if (updatedCard.qrCode && updatedCard.checkoutUrl) {
        const sessionData = {
          orderCode: updatedCard.orderCode,
          qrCode: updatedCard.qrCode,
          checkoutUrl: updatedCard.checkoutUrl,
          expiresAt: Date.now() + 5 * 60 * 1000, // 5 phút
          paymentType: 'renewal' as const,
        };
        localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
        setPaymentQr(sessionData);
        setRenewCard(null);
      } else if (updatedCard.checkoutUrl) {
        window.location.href = updatedCard.checkoutUrl;
      } else {
        setCards(prev => prev.map(c => c.id === id ? refreshCardStatus(updatedCard) : c));
        setRenewCard(null);
      }
    } catch (err: any) {
      alert(err.message || "Gia hạn thẻ thất bại.");
    }
  };

  const handleOpenAddModal = () => {
    const savedSession = localStorage.getItem(SESSION_KEY);
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        if (session.expiresAt > Date.now()) {
          setPaymentQr(session);
          return;
        } else {
          localStorage.removeItem(SESSION_KEY);
        }
      } catch (e) {
        localStorage.removeItem(SESSION_KEY);
      }
    }
    setShowAdd(true);
  };

  const handleOpenRenewModal = (card: MonthlyCard) => {
    const savedSession = localStorage.getItem(SESSION_KEY);
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        if (session.expiresAt > Date.now()) {
          setPaymentQr(session);
          return;
        } else {
          localStorage.removeItem(SESSION_KEY);
        }
      } catch (e) {
        localStorage.removeItem(SESSION_KEY);
      }
    }
    setRenewCard(card);
  };

  const active = cards.filter(c => c.trangThai !== "Hết hạn").length;
  const expired = cards.filter(c => c.trangThai === "Hết hạn").length;

  return (
    <div className="space-y-3">
      <div className="bg-white border border-gray-200 rounded shadow-sm px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2"><CreditCard className="w-4 h-4 text-blue-600" /><span className="text-sm font-semibold text-gray-700">Thẻ tháng của tôi</span></div>
        <button onClick={handleOpenAddModal} className="flex items-center gap-1.5 h-[34px] px-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors">
          <Plus className="w-3.5 h-3.5" />Đăng kí thẻ
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[{label:"Tổng số thẻ",value:cards.length,color:"text-gray-700",bg:"bg-gray-100"},{label:"Đang hoạt động",value:active,color:"text-emerald-700",bg:"bg-emerald-100"},{label:"Đã hết hạn",value:expired,color:"text-red-700",bg:"bg-red-100"}].map(s => (
          <div key={s.label} className={`${s.bg} rounded shadow-sm border border-gray-200 px-4 py-3`}>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Banner: Dang cho xac nhan thanh toan (nguoi dung da redirect sang VNPay va quay ve) */}
      {pendingConfirmation && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded px-4 py-3 text-sm text-blue-700">
          <RefreshCw className="w-4 h-4 animate-spin flex-shrink-0" />
          <span>
            <strong>Đang chờ xác nhận thanh toán...</strong> Hệ thống sẽ tự động cập nhật khi VNPay xác nhận giao dịch.
          </span>
        </div>
      )}

      {/* Banner: Thanh toan thanh cong */}
      {confirmationSuccess && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-300 rounded px-4 py-3 text-sm text-emerald-700">
          <span className="text-xl flex-shrink-0">✅</span>
          <span>
            <strong>Thanh toán thành công!</strong> Thẻ của bạn đã được kích hoạt. Danh sách đã được cập nhật.
          </span>
          <button onClick={() => setConfirmationSuccess(false)} className="ml-auto text-emerald-500 hover:text-emerald-700 font-bold">✕</button>
        </div>
      )}

      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-8 text-gray-500 bg-white border rounded shadow-sm flex items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
            Đang tải danh sách thẻ...
          </div>
        ) : error ? (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-4 text-center">
            {error}
          </div>
        ) : cards.length === 0 ? (
          <div className="text-center py-8 text-gray-500 border border-dashed border-gray-300 rounded bg-white shadow-sm">
            Bạn chưa đăng ký thẻ tháng nào.
          </div>
        ) : (
          cards.map(card => (
            <div key={card.id} className={`bg-white border rounded shadow-sm overflow-hidden ${card.trangThai==="Hết hạn"?"border-red-200":card.trangThai==="Sắp hết hạn"?"border-amber-200":"border-gray-200"}`}>
              <div className={`px-4 py-2.5 flex items-center justify-between ${card.trangThai==="Hết hạn"?"bg-red-50":card.trangThai==="Sắp hết hạn"?"bg-amber-50":"bg-gray-50"}`}>
                <div className="flex items-center gap-2">
                  <CreditCard className={`w-4 h-4 ${card.trangThai==="Hết hạn"?"text-red-500":card.trangThai==="Sắp hết hạn"?"text-amber-500":"text-blue-500"}`} />
                  <span className="text-sm font-bold text-gray-800 font-mono">{card.cardNo}</span>
                </div>
                <StatusBadge card={card} />
              </div>
              <div className={`px-4 py-3 grid gap-4 text-sm ${card.tangGuiXe ? "grid-cols-5" : "grid-cols-4"}`}>
                <div><div className="text-xs text-gray-400 mb-0.5">Loại xe</div>
                  <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${card.loaiXe==="Xe máy"?"bg-blue-100 text-blue-700":"bg-amber-100 text-amber-700"}`}>{card.loaiXe}</span>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-0.5">Biển số xe</div>
                  <div className="text-sm font-semibold text-gray-800 uppercase">{card.bienSo}</div>
                </div>
                {card.tangGuiXe && (
                  <div>
                    <div className="text-xs text-gray-400 mb-0.5">Tầng gửi xe</div>
                    <span className="inline-flex px-1.5 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                      {card.tangGuiXe}
                    </span>
                  </div>
                )}
                <div><div className="text-xs text-gray-400 mb-0.5">Ngày hết hạn</div>
                  <div className={`text-sm font-semibold ${card.trangThai==="Hết hạn"?"text-red-600":card.trangThai==="Sắp hết hạn"?"text-amber-600":"text-gray-700"}`}>{card.ngayHetHan}</div>
                </div>
                <div><div className="text-xs text-gray-400 mb-0.5">Còn lại</div>
                  <div className={`text-sm font-semibold ${card.soNgayConLai<0?"text-red-600":card.soNgayConLai<=14?"text-amber-600":"text-emerald-600"}`}>
                    {card.soNgayConLai<0?`Quá ${Math.abs(card.soNgayConLai)} ngày`:`${card.soNgayConLai} ngày`}
                  </div>
                </div>
              </div>
              <div className="px-4 py-2.5 border-t border-gray-100 flex gap-2">
                <button onClick={() => setDetailCard(card)} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 border border-blue-200 hover:border-blue-400 px-2.5 py-1 rounded transition-colors"><Eye className="w-3.5 h-3.5" />Xem chi tiết</button>
                {/* Hien nut Gia han voi moi the ACTIVE / Sap het han / Het han */}
                <button onClick={() => handleOpenRenewModal(card)} className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-800 border border-emerald-200 hover:border-emerald-400 px-2.5 py-1 rounded transition-colors"><RefreshCw className="w-3.5 h-3.5" />Gia hạn</button>
              </div>
            </div>
          ))
        )}
      </div>

      {showAdd && cardGroups.length > 0 && <AddCardModal cardGroups={cardGroups} onSave={handleAdd}  onClose={() => setShowAdd(false)} />}
      {renewCard && cardGroups.length > 0 && <RenewModal cardGroups={cardGroups} card={renewCard} onSave={handleRenew} onClose={() => setRenewCard(null)} />}
      {detailCard && <DetailModal card={detailCard} onClose={() => setDetailCard(null)} />}
      {paymentQr && <PaymentQrModal 
        orderCode={paymentQr.orderCode}
        qrCode={paymentQr.qrCode} 
        checkoutUrl={paymentQr.checkoutUrl}
        paymentType={paymentQr.paymentType}
        onClose={() => { setPaymentQr(null); }} 
        onDone={() => { localStorage.removeItem(SESSION_KEY); setPaymentQr(null); fetchCards(); }} 
      />}
    </div>
  );
}
