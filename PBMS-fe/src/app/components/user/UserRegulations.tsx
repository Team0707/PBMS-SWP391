import { useEffect, useState } from "react";
import {
  ShieldAlert,
  Bike,
  Car,
  Clock,
  Coins,
  Info,
  ParkingSquare,
  Tag,
  CalendarDays,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "lucide-react";
import violationRuleService from "../../../services/violationRuleService";
import { adminCardService, CardGroupDto } from "../../../services/adminCardService";
import { ViolationRule } from "../admin/CardViolationRules";

/* ─── FAQ items ─────────────────────────────────────────── */
const FAQ = [
  {
    q: "Thẻ lượt có giới hạn thời gian đỗ không?",
    a: "Có. Thẻ lượt có giới hạn số giờ tối đa được đỗ (xem mục Quy định phạt bên dưới). Nếu vượt quá, hệ thống sẽ tự động tính phí phạt thêm.",
  },
  {
    q: "Tôi có thể gia hạn thẻ tháng không?",
    a: "Có. Bạn vào mục \"Thẻ của tôi\" để gia hạn trước ngày hết hạn. Nếu đã hết hạn mà vẫn đỗ xe, hệ thống sẽ tính phí phạt theo giờ quá hạn.",
  },
  {
    q: "Phí phạt được tính từ thời điểm nào?",
    a: "Đối với thẻ lượt: tính từ khi vượt quá số giờ cho phép kể từ check-in. Đối với thẻ ngày/tháng: tính từ thời điểm thẻ hết hiệu lực.",
  },
  {
    q: "Tôi muốn khiếu nại vi phạm thì làm thế nào?",
    a: "Vào mục \"Hỗ trợ\" để gửi yêu cầu khiếu nại. Nhân viên sẽ xem xét và phản hồi trong vòng 24 giờ làm việc.",
  },
];

/* ─── Helpers ───────────────────────────────────────────── */
type TicketGroup = "SINGLE" | "DAY" | "MONTHLY";

const TICKET_GROUP_LABEL: Record<TicketGroup, string> = {
  SINGLE: "Thẻ lượt",
  DAY: "Thẻ ngày",
  MONTHLY: "Thẻ tháng",
};

const TICKET_GROUP_COLOR: Record<TicketGroup, { bg: string; border: string; icon: string; text: string; badge: string }> = {
  SINGLE:  { bg: "bg-amber-50",  border: "border-amber-200",  icon: "text-amber-500",  text: "text-amber-700",  badge: "bg-amber-100 text-amber-800"  },
  DAY:     { bg: "bg-blue-50",   border: "border-blue-200",   icon: "text-blue-500",   text: "text-blue-700",   badge: "bg-blue-100 text-blue-800"     },
  MONTHLY: { bg: "bg-purple-50", border: "border-purple-200", icon: "text-purple-500", text: "text-purple-700", badge: "bg-purple-100 text-purple-800"  },
};

const TICKET_ICONS: Record<TicketGroup, React.FC<{ className?: string }>> = {
  SINGLE:  Tag,
  DAY:     CalendarDays,
  MONTHLY: CreditCardSvg,
};

function CreditCardSvg({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  );
}

/* ─── Component chính ───────────────────────────────────── */
export default function UserRegulations() {
  const [groups, setGroups] = useState<CardGroupDto[]>([]);
  const [rules, setRules] = useState<ViolationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      adminCardService.getAllCardGroups().catch(() => [] as CardGroupDto[]),
      violationRuleService.getAllRules().catch(() => [] as ViolationRule[]),
    ]).then(([g, r]) => {
      setGroups(g.filter((x) => x.status === "ACTIVE"));
      setRules(r.filter((x) => x.isActive));
    }).finally(() => setLoading(false));
  }, []);

  /* Nhóm card-groups theo ticketType */
  const groupedPrices = (["SINGLE", "DAY", "MONTHLY"] as TicketGroup[]).map((type) => ({
    type,
    items: groups.filter((g) => g.ticketType === type),
  })).filter((g) => g.items.length > 0);

  const singleRules  = rules.filter((r) => r.ticketType === "SINGLE");
  const expiredRules = rules.filter((r) => r.ticketType !== "SINGLE");

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">

      {/* ── Hero giới thiệu ── */}
      <section className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#1a3560] via-[#1e4080] to-[#0e6ba8] p-8 text-white shadow-xl">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 50%, #60a5fa 0%, transparent 60%), radial-gradient(circle at 80% 20%, #34d399 0%, transparent 50%)",
          }}
        />
        <div className="relative flex items-start gap-5">
          <div className="p-3 bg-white/15 rounded-xl flex-shrink-0 backdrop-blur-sm">
            <ParkingSquare className="w-10 h-10 text-sky-300" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase tracking-widest font-bold bg-sky-400/30 text-sky-200 px-2 py-0.5 rounded-full border border-sky-400/30">
                Parking Management System
              </span>
            </div>
            <h1 className="text-2xl font-extrabold leading-tight mb-2">
              Hệ thống Quản lý Bãi xe <span className="text-sky-300">PBMS</span>
            </h1>
            <p className="text-blue-100 text-sm leading-relaxed max-w-2xl">
              PBMS là hệ thống quản lý bãi đỗ xe thông minh, hỗ trợ các loại thẻ lượt, thẻ ngày và thẻ tháng cho xe
              máy và ô tô. Hệ thống tự động ghi nhận thời gian check-in / check-out, tính phí và xử lý vi phạm minh
              bạch, nhanh chóng.
            </p>
            <div className="flex flex-wrap gap-3 mt-4">
              {[
                { icon: CheckCircle2, label: "Quản lý thẻ thông minh" },
                { icon: Clock,        label: "Tự động tính giờ" },
                { icon: ShieldAlert,  label: "Xử lý vi phạm minh bạch" },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-1.5 text-xs bg-white/10 rounded-full px-3 py-1 border border-white/20"
                >
                  <Icon className="w-3.5 h-3.5 text-sky-300" />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Bảng giá vé (từ API) ── */}
      <section>
        <SectionTitle
          icon={Coins}
          title="Bảng giá vé"
          subtitle="Mức phí áp dụng cho từng loại thẻ và phương tiện (cập nhật theo cấu hình hệ thống)"
        />

        {loading ? (
          <LoadingSpinner label="Đang tải bảng giá..." />
        ) : groupedPrices.length === 0 ? (
          <p className="text-sm text-gray-400 mt-4 text-center py-6 border border-dashed border-gray-200 rounded-xl">
            Chưa có dữ liệu bảng giá.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            {groupedPrices.map(({ type, items }) => {
              const c = TICKET_GROUP_COLOR[type];
              const Icon = TICKET_ICONS[type];
              return (
                <div key={type} className={`rounded-xl border ${c.border} ${c.bg} p-4 shadow-sm`}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 rounded-lg bg-white shadow-sm">
                      <Icon className={`w-4 h-4 ${c.icon}`} />
                    </div>
                    <span className={`text-xs font-bold uppercase tracking-wide ${c.text}`}>
                      {TICKET_GROUP_LABEL[type]}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {items.map((g) => (
                      <div key={g.cardGroupId} className="flex justify-between items-center gap-2">
                        <span className="text-xs text-gray-600 flex items-center gap-1">
                          {g.vehicleType === "MOTORCYCLE"
                            ? <Bike className="w-3 h-3 text-gray-400" />
                            : <Car className="w-3 h-3 text-gray-400" />}
                          {g.groupName}
                        </span>
                        <span className="text-sm font-bold text-gray-800 whitespace-nowrap">
                          {g.basePrice.toLocaleString("vi-VN")}đ
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-[11px] text-gray-400 mt-2 flex items-center gap-1">
          <Info className="w-3 h-3" /> Giá vé phản ánh cấu hình hiện tại của hệ thống, có thể thay đổi theo thông báo của ban quản lý.
        </p>
      </section>

      {/* ── Quy định phạt (từ API) ── */}
      <section>
        <SectionTitle
          icon={ShieldAlert}
          title="Quy định phạt"
          subtitle="Các mức phạt vi phạm đang được áp dụng (cập nhật theo cấu hình hệ thống)"
        />

        {loading ? (
          <LoadingSpinner label="Đang tải quy định phạt..." />
        ) : (
          <div className="space-y-5 mt-4">
            {singleRules.length > 0 && (
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-amber-600 mb-2 flex items-center gap-1">
                  <Tag className="w-3 h-3" /> Thẻ lượt – Quá giờ đỗ
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {singleRules.map((r) => <RuleCard key={r.id} rule={r} />)}
                </div>
              </div>
            )}
            {expiredRules.length > 0 && (
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-red-500 mb-2 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Thẻ ngày / tháng – Hết hạn khi checkout
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {expiredRules.map((r) => <RuleCard key={r.id} rule={r} />)}
                </div>
              </div>
            )}
            {singleRules.length === 0 && expiredRules.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6 border border-dashed border-gray-200 rounded-xl">
                Chưa có quy định phạt nào đang áp dụng.
              </p>
            )}
          </div>
        )}
      </section>

      {/* ── Lưu ý chung ── */}
      <section className="rounded-xl border border-blue-200 bg-blue-50 p-5">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-blue-800 mb-1.5">Lưu ý chung</p>
            <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside leading-relaxed">
              <li>Phí phạt được tính tự động và ghi nhận vào hồ sơ vi phạm của tài khoản.</li>
              <li>Khách hàng có thể khiếu nại vi phạm trong vòng <strong>7 ngày</strong> kể từ ngày phát sinh.</li>
              <li>Xe không xuất trình thẻ hợp lệ khi ra sẽ bị giữ lại để xác minh.</li>
              <li>Mọi thắc mắc vui lòng liên hệ qua mục <strong>Hỗ trợ</strong> trong ứng dụng.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section>
        <SectionTitle icon={Info} title="Câu hỏi thường gặp" subtitle="Giải đáp các thắc mắc phổ biến" />
        <div className="mt-4 space-y-2">
          {FAQ.map((item, idx) => (
            <div key={idx} className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm font-semibold text-gray-800">{item.q}</span>
                {openFaq === idx
                  ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
              </button>
              {openFaq === idx && (
                <div className="px-4 pb-4 text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-2">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────── */

function SectionTitle({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.FC<{ className?: string }>;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="p-2 bg-[#1a3560]/10 rounded-lg">
        <Icon className="w-5 h-5 text-[#1a3560]" />
      </div>
      <div>
        <h2 className="text-base font-bold text-gray-800">{title}</h2>
        <p className="text-[11px] text-gray-500">{subtitle}</p>
      </div>
    </div>
  );
}

function LoadingSpinner({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center h-20 text-gray-400 text-sm gap-2 mt-4">
      <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
      {label}
    </div>
  );
}

function RuleCard({ rule }: { rule: ViolationRule }) {
  const isMoto   = rule.vehicleType === "MOTORCYCLE";
  const isSingle = rule.ticketType  === "SINGLE";

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:border-red-200 hover:shadow-md transition-all">
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg flex-shrink-0 ${isMoto ? "bg-blue-50" : "bg-indigo-50"}`}>
          {isMoto
            ? <Bike className="w-4 h-4 text-blue-600" />
            : <Car  className="w-4 h-4 text-indigo-600" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-800 leading-tight">{rule.ruleName}</p>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">{rule.description}</p>
          <div className="flex flex-wrap gap-2 mt-2.5">
            {isSingle && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5">
                <Clock className="w-3 h-3" />
                Cho phép: {rule.maxDurationHours} giờ
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200 rounded-full px-2 py-0.5">
              <Coins className="w-3 h-3" />
              Phạt: {rule.penaltyPerHour.toLocaleString("vi-VN")}đ/giờ
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
