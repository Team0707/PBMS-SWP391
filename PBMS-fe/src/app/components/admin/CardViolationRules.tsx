import { useState, useEffect } from "react";
import {
  Clock,
  Edit2,
  Save,
  X,
  Bike,
  Car,
  Settings,
  Coins,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { cls } from "../common/ui";
import violationRuleService from "../../../services/violationRuleService";

export interface ViolationRule {
  id: string;
  ruleName: string;
  ticketType: "SINGLE" | "DAY" | "MONTHLY";
  vehicleType: "MOTORCYCLE" | "CAR";
  maxDurationHours: number; // số giờ tối đa cho phép đỗ đối với thẻ lượt
  penaltyPerHour: number; // phạt mỗi giờ quá hạn
  description: string;
  isActive: boolean;
}

export default function CardViolationRules() {
  const [rules, setRules] = useState<ViolationRule[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingRule, setEditingRule] = useState<ViolationRule | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchRules = async () => {
    try {
      setLoading(true);
      const data = await violationRuleService.getAllRules();
      setRules(data);
    } catch (err: any) {
      setErrorMsg(err.message || "Lỗi khi lấy danh sách luật vi phạm");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  /** Sinh lại mô tả tự động cho thẻ lượt dựa trên số giờ và mức phạt */
  const generateSingleDescription = (
    vehicleType: string,
    maxHours: number,
    penalty: number
  ): string => {
    const vehicle = vehicleType === "MOTORCYCLE" ? "xe máy" : "ô tô";
    const penaltyStr = penalty.toLocaleString("vi-VN") + "đ";
    return `Áp dụng cho thẻ lượt ${vehicle} đỗ quá ${maxHours} giờ kể từ thời điểm check-in. Phạt ${penaltyStr} cho mỗi giờ quá hạn tiếp theo.`;
  };

  const handleEditClick = (rule: ViolationRule) => {
    setEditingRule({ ...rule });
  };

  const handleSaveEdit = async () => {
    if (!editingRule) return;

    if (editingRule.maxDurationHours < 0) {
      setErrorMsg("Thời gian cho phép đỗ không thể âm.");
      return;
    }
    if (editingRule.penaltyPerHour < 0) {
      setErrorMsg("Mức phạt mỗi giờ không thể âm.");
      return;
    }

    try {
      const updatedRule = await violationRuleService.updateRule(editingRule.id, editingRule);
      setRules(prev => prev.map(r => (r.id === updatedRule.id ? updatedRule : r)));
      setEditingRule(null);
      setErrorMsg(null);
      setSuccessMsg("Cập nhật luật vi phạm thẻ thành công!");
      setTimeout(() => setSuccessMsg(null), 2500);
    } catch (err: any) {
      setErrorMsg(err.message || "Lỗi khi cập nhật luật vi phạm");
    }
  };

  return (
    <div className={`${cls.pageWrapper} px-6 py-4 bg-gray-50/50 min-h-screen space-y-5`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-gray-200 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-red-100 rounded-lg text-red-600">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Quy Định Vi Phạm Thẻ</h1>
            <p className="text-xs text-gray-500">Thiết lập các mức phạt quá giờ đỗ đối với thẻ lượt, thẻ ngày và thẻ tháng</p>
          </div>
        </div>
      </div>

      {/* Alert Messages */}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          <span className="font-medium">{successMsg}</span>
        </div>
      )}
      {errorMsg && !editingRule && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center gap-2 animate-fadeIn">
          <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
          <span className="font-medium">Lỗi: {errorMsg}</span>
        </div>
      )}

      {/* Rules List Section */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold text-gray-400 flex items-center gap-1.5 uppercase tracking-wider">
          <Settings className="h-4 w-4 text-gray-400" />
          Các quy tắc xử lý vi phạm hiện hành
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rules.map((rule) => {
            const isMoto = rule.vehicleType === "MOTORCYCLE";
            const isSingle = rule.ticketType === "SINGLE";
            
            return (
              <div 
                key={rule.id}
                className="bg-white border border-gray-200 hover:border-blue-300 rounded-lg p-4 shadow-sm transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Badge header */}
                  <div className="flex justify-between items-start gap-2 mb-2.5">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${
                      rule.ticketType === "SINGLE" 
                        ? "bg-amber-100 text-amber-800 border border-amber-200" 
                        : rule.ticketType === "DAY"
                        ? "bg-blue-100 text-blue-800 border border-blue-200"
                        : "bg-purple-100 text-purple-800 border border-purple-200"
                    }`}>
                      Thẻ {rule.ticketType === "SINGLE" ? "lượt" : rule.ticketType === "DAY" ? "ngày" : "tháng"}
                    </span>

                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                      rule.isActive ? "bg-green-50 text-green-700 border border-green-200" : "bg-gray-100 text-gray-500 border border-gray-200"
                    }`}>
                      {rule.isActive ? "Đang áp dụng" : "Tạm dừng"}
                    </span>
                  </div>

                  {/* Rule Name */}
                  <h3 className="text-sm font-bold text-gray-800 mb-1 flex items-center gap-1.5">
                    {isMoto ? (
                      <Bike className="h-4 w-4 text-blue-600 flex-shrink-0" />
                    ) : (
                      <Car className="h-4 w-4 text-indigo-600 flex-shrink-0" />
                    )}
                    {rule.ruleName}
                  </h3>

                  {/* Description */}
                  <p className="text-xs text-gray-500 leading-relaxed mb-4 min-h-[48px]">
                    {rule.description}
                  </p>
                </div>

                {/* Pricing / Settings summary */}
                <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
                  <div className="space-y-1">
                    {isSingle && (
                      <div className="flex items-center gap-1 text-[11px] text-gray-500">
                        <Clock className="h-3 w-3 text-gray-400" />
                        <span>Cho phép: <strong>{rule.maxDurationHours} giờ</strong></span>
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-[11px] text-gray-500">
                      <Coins className="h-3 w-3 text-amber-500" />
                      <span>Phạt: <strong className="text-red-600 text-xs">{rule.penaltyPerHour.toLocaleString("vi-VN")}đ</strong>/giờ</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleEditClick(rule)}
                    className="p-1.5 text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-200 rounded transition-colors flex items-center justify-center cursor-pointer"
                    title="Chỉnh sửa quy tắc"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit Rule Modal */}
      {editingRule && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-[500px] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-blue-600 text-white">
              <span className="text-sm font-bold flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Cấu hình luật vi phạm thẻ
              </span>
              <button
                type="button"
                onClick={() => setEditingRule(null)}
                className="text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {errorMsg && (
                <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  {errorMsg}
                </div>
              )}

              {/* Rule Name (disabled) */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-500 uppercase">Tên quy tắc</label>
                <input
                  type="text"
                  value={editingRule.ruleName}
                  disabled
                  className="w-full h-[38px] border border-gray-200 rounded px-2.5 text-sm bg-gray-100 text-gray-500 cursor-not-allowed"
                />
              </div>

              {/* Max Duration (only for SINGLE) */}
              {editingRule.ticketType === "SINGLE" && (
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-600 uppercase">
                    Thời gian cho phép đỗ tối đa (giờ)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      value={editingRule.maxDurationHours}
                      onChange={(e) => {
                        const newHours = parseInt(e.target.value) || 0;
                        setEditingRule(prev => {
                          if (!prev) return null;
                          const newDesc = prev.ticketType === "SINGLE"
                            ? generateSingleDescription(prev.vehicleType, newHours, prev.penaltyPerHour)
                            : prev.description;
                          return { ...prev, maxDurationHours: newHours, description: newDesc };
                        });
                      }}
                      className={`${cls.input} w-full pr-10`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">giờ</span>
                  </div>
                  <p className="text-[10px] text-gray-400">Thời gian xe được đỗ miễn phí trước khi bị phạt.</p>
                </div>
              )}

              {/* Penalty Rate */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-600 uppercase">
                  Mức phạt mỗi giờ đỗ quá hạn (VND)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={editingRule.penaltyPerHour}
                    onChange={(e) => {
                      const newPenalty = parseInt(e.target.value) || 0;
                      setEditingRule(prev => {
                        if (!prev) return null;
                        const newDesc = prev.ticketType === "SINGLE"
                          ? generateSingleDescription(prev.vehicleType, prev.maxDurationHours, newPenalty)
                          : prev.description;
                        return { ...prev, penaltyPerHour: newPenalty, description: newDesc };
                      });
                    }}
                    className={`${cls.input} w-full pr-14`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">VND/h</span>
                </div>
              </div>

              {/* Rule Description */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-600 uppercase">Mô tả hiển thị</label>
                <textarea
                  value={editingRule.description}
                  onChange={(e) =>
                    setEditingRule(prev =>
                      prev ? { ...prev, description: e.target.value } : null
                    )
                  }
                  rows={3}
                  className="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:border-blue-400"
                  placeholder="Nhập mô tả quy định phạt..."
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-2 pt-1.5">
                <input
                  type="checkbox"
                  id="rule-active-toggle"
                  checked={editingRule.isActive}
                  onChange={(e) =>
                    setEditingRule(prev =>
                      prev ? { ...prev, isActive: e.target.checked } : null
                    )
                  }
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="rule-active-toggle" className="text-xs font-semibold text-gray-700 cursor-pointer uppercase">
                  Kích hoạt áp dụng quy tắc này
                </label>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-2 px-5 py-3.5 border-t border-gray-250 bg-gray-50">
              <button
                type="button"
                onClick={handleSaveEdit}
                className="flex items-center gap-1.5 h-[34px] px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded transition-colors cursor-pointer"
              >
                <Save className="h-3.5 w-3.5" />
                Lưu cấu hình
              </button>
              <button
                type="button"
                onClick={() => setEditingRule(null)}
                className="h-[34px] px-3 border border-gray-300 text-gray-600 hover:bg-gray-100 text-sm font-medium rounded transition-colors cursor-pointer"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
