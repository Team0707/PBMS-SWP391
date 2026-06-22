import { useState } from "react";
import { CreditCard, Plus, RefreshCw, Eye, X, Save, AlertTriangle, CheckCircle, Clock, QrCode } from "lucide-react";

/* ── Inline fake QR ─────────────────────────────────────────────── */
function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}
function FakeQR({ value, size = 140 }: { value: string; size?: number }) {
  const CELLS = 21; const cell = size / CELLS; const seed = hash(value);
  const isFixed = (r: number, c: number) => {
    if ((r < 7 && c < 7) || (r < 7 && c >= CELLS - 7) || (r >= CELLS - 7 && c < 7)) return true;
    return r === 6 || c === 6;
  };
  const isDark = (r: number, c: number) => {
    if (isFixed(r, c)) {
      const inC = (rr: number, cc: number) => rr >= 0 && rr < 7 && cc >= 0 && cc < 7;
      const draw = (rr: number, cc: number) => {
        if (rr === 0 || rr === 6 || cc === 0 || cc === 6) return true;
        if (rr === 1 || rr === 5 || cc === 1 || cc === 5) return false;
        return true;
      };
      if (inC(r, c)) return draw(r, c);
      if (inC(r, c - (CELLS - 7))) return draw(r, c - (CELLS - 7));
      if (inC(r - (CELLS - 7), c)) return draw(r - (CELLS - 7), c);
      return (r + c) % 2 === 0;
    }
    return ((seed >>> ((r * CELLS + c) % 32)) & 1) === 1;
  };
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block", imageRendering: "pixelated" }}>
      <rect width={size} height={size} fill="white" />
      {Array.from({ length: CELLS }, (_, r) =>
        Array.from({ length: CELLS }, (_, c) =>
          isDark(r, c) ? <rect key={`${r}-${c}`} x={c * cell} y={r * cell} width={cell} height={cell} fill="#111" /> : null
        )
      )}
    </svg>
  );
}

/* ── Types & data ────────────────────────────────────────────────── */
interface MonthlyCard {
  id: number; cardNo: string; maThe: string; nhomThe: string;
  loaiXe: string; ngayDangKy: string; ngayHetHan: string;
  tangGuiXe?: string;
  trangThai: "Hoạt động" | "Hết hạn" | "Sắp hết hạn"; soNgayConLai: number;
}

const initialCards: MonthlyCard[] = [
  { id: 1, cardNo: "0002100001", maThe: "TM001", nhomThe: "THẺ THÁNG XE MÁY", loaiXe: "Xe máy", ngayDangKy: "2024-01-05", ngayHetHan: "2024-12-31", trangThai: "Hoạt động", soNgayConLai: 351 },
  { id: 2, cardNo: "0002100005", maThe: "TM005", nhomThe: "THẺ THÁNG XE MÁY", loaiXe: "Xe máy", ngayDangKy: "2023-12-01", ngayHetHan: "2024-01-10", trangThai: "Hết hạn",    soNgayConLai: -5 },
];

const PRICE_MAP: Record<string, number> = {
  "THẺ THÁNG XE MÁY": 100000,
  "THẺ THÁNG Ô TÔ": 1000000,
  "THẺ NGÀY XE MÁY": 10000,
  "THẺ NGÀY Ô TÔ": 50000,
};
const RENEW_PRICE: Record<string, Record<number, number>> = {
  "THẺ THÁNG XE MÁY": { 1: 100000, 3: 280000, 6: 540000 },
  "THẺ THÁNG Ô TÔ": { 1: 1000000, 3: 2800000, 6: 5400000 },
};

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split("T")[0];
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function StatusBadge({ card }: { card: MonthlyCard }) {
  if (card.trangThai === "Hoạt động")
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-700 border border-green-200"><CheckCircle className="w-3 h-3" />Hoạt động</span>;
  if (card.trangThai === "Sắp hết hạn")
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200"><AlertTriangle className="w-3 h-3" />Sắp hết hạn</span>;
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700 border border-red-200"><X className="w-3 h-3" />Hết hạn</span>;
}

/* ── Payment QR step ─────────────────────────────────────────────── */
function PaymentStep({ amount, label, qrKey, onDone, onClose }: {
  amount: number; label: string; qrKey: string; onDone: () => void; onClose: () => void;
}) {
  return (
    <div className="p-5 flex flex-col items-center gap-4">
      <div className="text-center">
        <p className="text-sm font-semibold text-gray-700 mb-0.5">{label}</p>
        <p className="text-xs text-gray-400">Quét mã QR để thanh toán</p>
      </div>
      <div className="border-4 border-emerald-500 rounded-lg p-2 bg-white shadow">
        <FakeQR value={qrKey} size={160} />
      </div>
      <div className="bg-emerald-600 rounded-lg px-6 py-3 text-center w-full">
        <p className="text-emerald-100 text-xs mb-0.5">Số tiền thanh toán</p>
        <p className="text-white text-2xl font-bold">{amount.toLocaleString("vi-VN")} VNĐ</p>
      </div>
      <p className="text-xs text-gray-400 text-center">Hỗ trợ: VietQR • MoMo • ZaloPay • VNPay</p>
      <div className="flex gap-2 w-full">
        <button onClick={onDone}
          className="flex-1 h-[36px] bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded flex items-center justify-center gap-1.5 transition-colors">
          <CheckCircle className="w-4 h-4" />Xác nhận đã thanh toán
        </button>
        <button onClick={onClose}
          className="h-[36px] px-3 border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm rounded transition-colors">
          Hủy
        </button>
      </div>
    </div>
  );
}

/* ── Add Card Modal ──────────────────────────────────────────────── */
function AddCardModal({ onSave, onClose }: {
  onSave: (c: Omit<MonthlyCard,"id"|"trangThai"|"soNgayConLai">) => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState<"form"|"payment">("form");
  const [form, setForm] = useState({
    cardNo: "",
    maThe: "",
    nhomThe: "THẺ THÁNG XE MÁY",
    tangGuiXe: "",
  });
  const [duration, setDuration] = useState(1);
  const [err, setErr] = useState("");
  const [savedData, setSavedData] = useState<Omit<MonthlyCard,"id"|"trangThai"|"soNgayConLai"> | null>(null);
  const F = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const isDayCard = form.nhomThe.includes("NGÀY");
  const loaiXe = form.nhomThe.includes("Ô TÔ") ? "Ô tô" : "Xe máy";
  const isOto = loaiXe === "Ô tô";
  const today = new Date().toISOString().split("T")[0];
  const ngayHetHan = isDayCard ? addDays(today, duration) : addMonths(today, duration);

  const handleNext = () => {
    if (!form.cardNo.trim() || !form.maThe.trim()) { setErr("Vui lòng điền đầy đủ thông tin bắt buộc (*)"); return; }
    if (isOto && !form.tangGuiXe) { setErr("Vui lòng chọn tầng gửi xe cho ô tô (*)"); return; }
    const data = {
      ...form,
      loaiXe,
      ngayDangKy: today,
      ngayHetHan,
      tangGuiXe: isOto ? form.tangGuiXe : undefined,
    };
    setSavedData(data);
    setStep("payment");
  };

  const handleDone = () => {
    if (savedData) onSave(savedData);
  };

  const unitPrice = PRICE_MAP[form.nhomThe] ?? 100000;
  const price = unitPrice * duration;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[500px] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 bg-blue-600">
          <span className="text-white text-sm font-semibold flex items-center gap-2">
            <Plus className="w-4 h-4" />
            {step === "form" ? "Đăng kí thẻ" : "Thanh toán"}
          </span>
          <button onClick={onClose} className="text-white/80 hover:text-white"><X className="w-4 h-4" /></button>
        </div>

        {step === "form" && (
          <>
            <div className="p-5 space-y-3">
              {err && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{err}</div>}
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-gray-600 mb-1">CardNo <span className="text-red-500">*</span></label>
                  <input className="w-full h-[36px] border border-gray-300 rounded px-3 text-sm focus:outline-none focus:border-blue-400" placeholder="VD: 0002100010" value={form.cardNo} onChange={e => F("cardNo", e.target.value)} /></div>
                <div><label className="block text-xs text-gray-600 mb-1">Mã thẻ <span className="text-red-500">*</span></label>
                  <input className="w-full h-[36px] border border-gray-300 rounded px-3 text-sm focus:outline-none focus:border-blue-400" placeholder="VD: TM010" value={form.maThe} onChange={e => F("maThe", e.target.value)} /></div>
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

                    setForm((previous) => ({
                      ...previous,
                      nhomThe: nhomTheMoi,
                      tangGuiXe:
                        nhomTheMoi === "THẺ THÁNG Ô TÔ"
                          ? previous.tangGuiXe
                          : "",
                    }));

                    setErr("");
                  }}
                >
                  <option>THẺ THÁNG XE MÁY</option>
                  <option>THẺ THÁNG Ô TÔ</option>
                  <option>THẺ NGÀY XE MÁY</option>
                  <option>THẺ NGÀY Ô TÔ</option>
                </select>

                <div className="mt-1.5 rounded border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                  Loại xe tự động:{" "}
                  <span className="font-semibold">{loaiXe}</span>
                </div>
              </div>
              {isOto && (
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Tầng gửi xe <span className="text-red-500">*</span>
                    <span className="ml-1 text-gray-400">(bắt buộc cho ô tô)</span>
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
              )}
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
          </>
        )}

        {step === "payment" && (
          <PaymentStep
            amount={price}
            label={`Đăng ký thẻ ${form.maThe} — ${form.nhomThe}`}
            qrKey={`ADD-${form.maThe}-${form.nhomThe}-${price}`}
            onDone={handleDone}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
}

/* ── Renew Modal ─────────────────────────────────────────────────── */
function RenewModal({ card, onSave, onClose }: {
  card: MonthlyCard;
  onSave: (id: number, months: number, newExpiry: string) => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState<"select"|"payment">("select");
  const [months, setMonths] = useState(1);
  const baseDate = card.trangThai === "Hết hạn" ? new Date().toISOString().split("T")[0] : card.ngayHetHan;
  const newExpiry = addMonths(baseDate, months);
  const price = RENEW_PRICE[card.nhomThe]?.[months] ?? 0;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[460px] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 bg-emerald-600">
          <span className="text-white text-sm font-semibold flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            {step === "select" ? `Gia hạn thẻ — ${card.maThe}` : "Thanh toán gia hạn"}
          </span>
          <button onClick={onClose} className="text-white/80 hover:text-white"><X className="w-4 h-4" /></button>
        </div>

        {step === "select" && (
          <>
            <div className="p-5 space-y-4">
              <div className="bg-gray-50 border border-gray-200 rounded p-3 space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-gray-500 text-xs">Nhóm thẻ:</span><span className="text-xs font-medium">{card.nhomThe}</span></div>
                <div className="flex justify-between"><span className="text-gray-500 text-xs">Hết hạn hiện tại:</span><span className="text-xs font-medium text-red-600">{card.ngayHetHan}</span></div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Chọn thời hạn gia hạn</label>
                <div className="flex gap-2">
                  {[1, 3, 6].map(m => (
                    <button key={m} onClick={() => setMonths(m)}
                      className={`flex-1 py-2.5 rounded border-2 text-sm font-semibold transition-colors ${months === m ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                      +{m} tháng
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-emerald-600 rounded-lg p-4">
                <div className="flex justify-between text-emerald-100 text-xs mb-1">
                  <span>Ngày hết hạn mới:</span><span className="font-semibold text-white">{newExpiry}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-emerald-100 text-xs">Số tiền:</span>
                  <span className="text-white text-2xl font-bold">{price.toLocaleString("vi-VN")} VNĐ</span>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-200">
              <button onClick={() => setStep("payment")}
                className="flex items-center gap-1.5 h-[34px] px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded transition-colors">
                <QrCode className="w-3.5 h-3.5" />Tiếp theo: Thanh toán
              </button>
              <button onClick={onClose} className="h-[34px] px-3 border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm rounded transition-colors">Hủy</button>
            </div>
          </>
        )}

        {step === "payment" && (
          <PaymentStep
            amount={price}
            label={`Gia hạn ${card.maThe} thêm ${months} tháng`}
            qrKey={`RENEW-${card.maThe}-${months}-${price}`}
            onDone={() => { onSave(card.id, months, newExpiry); onClose(); }}
            onClose={onClose}
          />
        )}
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
          <span className="text-white text-sm font-semibold flex items-center gap-2"><Eye className="w-4 h-4" />Chi tiết — {card.maThe}</span>
          <button onClick={onClose} className="text-white/80 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-3">
          {/* QR code for staff scanning */}
          <div className="flex flex-col items-center gap-1.5 py-2 bg-gray-50 rounded-lg border border-gray-200">
            <div className="border-2 border-blue-500 rounded-lg p-1.5 bg-white shadow-sm">
              <FakeQR value={card.cardNo} size={130} />
            </div>
            <p className="text-[10px] text-gray-400">Xuất trình mã QR này cho nhân viên quét khi vào/ra bãi</p>
          </div>
          <div className="space-y-0">
          {[
            ["CardNo", card.cardNo],
            ["Mã thẻ", card.maThe],
            ["Nhóm thẻ", card.nhomThe],
            ["Loại xe", card.loaiXe],
            ...(card.loaiXe === "Ô tô" && card.tangGuiXe ? [["Tầng gửi xe", card.tangGuiXe]] : []),
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

/* ── Main ────────────────────────────────────────────────────────── */
export default function UserMonthlyCards() {
  const [cards, setCards] = useState<MonthlyCard[]>(initialCards);
  const [showAdd, setShowAdd] = useState(false);
  const [renewCard, setRenewCard] = useState<MonthlyCard | null>(null);
  const [detailCard, setDetailCard] = useState<MonthlyCard | null>(null);

  const handleAdd = (data: Omit<MonthlyCard,"id"|"trangThai"|"soNgayConLai">) => {
    const diff = Math.ceil((new Date(data.ngayHetHan).getTime() - new Date().getTime()) / 86400000);
    const trangThai: MonthlyCard["trangThai"] = diff < 0 ? "Hết hạn" : diff <= 14 ? "Sắp hết hạn" : "Hoạt động";
    setCards(prev => [...prev, { ...data, id: Date.now(), trangThai, soNgayConLai: diff }]);
    setShowAdd(false);
  };

  const handleRenew = (id: number, _m: number, newExpiry: string) => {
    setCards(prev => prev.map(c => {
      if (c.id !== id) return c;
      const diff = Math.ceil((new Date(newExpiry).getTime() - new Date().getTime()) / 86400000);
      return { ...c, ngayHetHan: newExpiry, trangThai: diff <= 14 ? "Sắp hết hạn" : "Hoạt động", soNgayConLai: diff };
    }));
  };

  const active = cards.filter(c => c.trangThai !== "Hết hạn").length;
  const expired = cards.filter(c => c.trangThai === "Hết hạn").length;

  return (
    <div className="space-y-3">
      <div className="bg-white border border-gray-200 rounded shadow-sm px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2"><CreditCard className="w-4 h-4 text-blue-600" /><span className="text-sm font-semibold text-gray-700">Thẻ tháng của tôi</span></div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 h-[34px] px-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors">
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

      <div className="space-y-3">
        {cards.map(card => (
          <div key={card.id} className={`bg-white border rounded shadow-sm overflow-hidden ${card.trangThai==="Hết hạn"?"border-red-200":card.trangThai==="Sắp hết hạn"?"border-amber-200":"border-gray-200"}`}>
            <div className={`px-4 py-2.5 flex items-center justify-between ${card.trangThai==="Hết hạn"?"bg-red-50":card.trangThai==="Sắp hết hạn"?"bg-amber-50":"bg-gray-50"}`}>
              <div className="flex items-center gap-2">
                <CreditCard className={`w-4 h-4 ${card.trangThai==="Hết hạn"?"text-red-500":card.trangThai==="Sắp hết hạn"?"text-amber-500":"text-blue-500"}`} />
                <span className="text-sm font-bold text-gray-800">{card.maThe}</span>
                <span className="text-xs text-gray-500 font-mono">{card.cardNo}</span>
              </div>
              <StatusBadge card={card} />
            </div>
            <div className={`px-4 py-3 grid gap-4 text-sm ${card.loaiXe === "Ô tô" && card.tangGuiXe ? "grid-cols-4" : "grid-cols-3"}`}>
              <div><div className="text-xs text-gray-400 mb-0.5">Loại xe</div>
                <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${card.loaiXe==="Xe máy"?"bg-blue-100 text-blue-700":"bg-amber-100 text-amber-700"}`}>{card.loaiXe}</span>
              </div>
              {card.loaiXe === "Ô tô" && card.tangGuiXe && (
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
              <button onClick={() => setRenewCard(card)} className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-800 border border-emerald-200 hover:border-emerald-400 px-2.5 py-1 rounded transition-colors"><RefreshCw className="w-3.5 h-3.5" />Gia hạn</button>
            </div>
          </div>
        ))}
      </div>

      {showAdd   && <AddCardModal onSave={handleAdd}  onClose={() => setShowAdd(false)} />}
      {renewCard && <RenewModal  card={renewCard} onSave={handleRenew} onClose={() => setRenewCard(null)} />}
      {detailCard && <DetailModal card={detailCard} onClose={() => setDetailCard(null)} />}
    </div>
  );
}
