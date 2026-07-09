import { useState, useEffect } from "react";
import {
  Search, RotateCcw, Plus, RefreshCw, Ban,
  X, Save, Users, MapPin, Clock, CheckCircle, AlertCircle,
} from "lucide-react";
import { cls } from "../common/ui";
import { DateInput, FilterGroup } from "../common/DateInput";
import {
  staffService,
  StaffAssignmentDto,
  StaffMinimalDto,
  WorkShiftDto,
  FloorDto
} from "../../../services/staffService";

// ─── Status Config Map ────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { label: string; badge: string }> = {
  ASSIGNED:  { label: "Đã phân công", badge: "inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200" },
  ON_DUTY:   { label: "Đang trực",    badge: "inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 border border-green-200" },
  COMPLETED: { label: "Đã kết thúc",  badge: "inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-slate-200 text-slate-600 border border-slate-300" },
  CANCELLED: { label: "Đã hủy",      badge: "inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-600 border border-red-200" },
};

// ─── Sub-components ───────────────────────────────────────────────────────────
function ShiftBadge({ label, time }: { label: string; time: string }) {
  const isSang = label.toLowerCase().includes("1") || label.toLowerCase().includes("sáng");
  const isChieu = label.toLowerCase().includes("2") || label.toLowerCase().includes("chiều");
  let color = "bg-purple-100 text-purple-700 border border-purple-200";
  if (isSang) {
    color = "bg-amber-100 text-amber-700 border border-amber-200";
  } else if (isChieu) {
    color = "bg-blue-100 text-blue-700 border border-blue-200";
  }

  return (
    <div className={`inline-flex flex-col items-center px-2 py-0.5 rounded text-xs font-medium ${color}`}>
      <span>{label}</span>
      <span className="text-[10px] opacity-75">{time}</span>
    </div>
  );
}

// ─── Create/Assign Modal ──────────────────────────────────────────────────────
interface CreateModalProps {
  onSave: (payload: { workDate: string; shiftId: number; floorId: number; staffId: number; note?: string }) => Promise<void>;
  onClose: () => void;
  shifts: WorkShiftDto[];
  staffList: StaffMinimalDto[];
  floors: FloorDto[];
}

function CreateModal({ onSave, onClose, shifts, staffList, floors }: CreateModalProps) {
  const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const [ngay, setNgay] = useState(getTodayString());
  const [ca, setCa] = useState<number>(shifts[0]?.shiftId ?? 0);
  const [floorId, setFloorId] = useState<number>(floors[0]?.floorId ?? 0);
  const [staffId, setStaffId] = useState<number>(0);
  const [ghiChu, setGhiChu] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!ngay || !ca || !floorId || !staffId) {
      setError("Vui lòng điền đầy đủ thông tin bắt buộc.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await onSave({
        workDate: ngay,
        shiftId: ca,
        floorId,
        staffId,
        note: ghiChu
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Tạo phân công nhân viên thất bại.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white rounded-lg shadow-xl w-[500px]">
        <div className="flex items-center justify-between px-5 py-3 bg-blue-600 rounded-t-lg">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-white" />
            <span className="text-white text-sm font-semibold">Tạo phân công nhân viên trực tầng</span>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-3">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-3 py-2 rounded flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Ngày làm việc <span className="text-red-500">*</span></label>
              <input type="date" className={`${cls.input} w-full`} value={ngay} onChange={e => { setNgay(e.target.value); setError(""); }} />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Ca làm việc <span className="text-red-500">*</span></label>
              <select className={`${cls.select} w-full`} value={ca} onChange={e => { setCa(Number(e.target.value)); setError(""); }}>
                <option value={0}>-- Chọn ca --</option>
                {shifts.map(s => (
                  <option key={s.shiftId} value={s.shiftId}>{s.shiftName} ({s.startTime.substring(0, 5)} – {s.endTime.substring(0, 5)})</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Tầng trực <span className="text-red-500">*</span></label>
            <select className={`${cls.select} w-full`} value={floorId} onChange={e => { setFloorId(Number(e.target.value)); setError(""); }}>
              <option value={0}>-- Chọn tầng trực --</option>
              {floors.map(f => (
                <option key={f.floorId} value={f.floorId}>{f.floorName}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Nhân viên phụ trách <span className="text-red-500">*</span></label>
            <select className={`${cls.select} w-full`} value={staffId} onChange={e => { setStaffId(Number(e.target.value)); setError(""); }}>
              <option value={0}>-- Chọn nhân viên --</option>
              {staffList.map(s => (
                <option key={s.staffId} value={s.staffId}>{s.fullName} ({s.staffCode})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Ghi chú</label>
            <textarea
              className={`${cls.input} w-full h-16 py-1.5 resize-none`}
              placeholder="Ghi chú thêm về ca trực..."
              value={ghiChu}
              onChange={e => setGhiChu(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-200">
          <button className={cls.btnSearch} onClick={handleSave} disabled={saving}>
            <Save className="w-3.5 h-3.5" />
            {saving ? "Đang lưu..." : "Lưu phân công"}
          </button>
          <button className={cls.btnReset} onClick={onClose} disabled={saving}>
            <X className="w-3.5 h-3.5" />
            Hủy
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Replace Staff Modal ──────────────────────────────────────────────────────
interface ReplaceModalProps {
  assignment: StaffAssignmentDto;
  onSave: (assignmentId: number, payload: { staffId: number; note: string }) => Promise<void>;
  onClose: () => void;
  staffList: StaffMinimalDto[];
}

function ReplaceModal({ assignment, onSave, onClose, staffList }: ReplaceModalProps) {
  const [newStaffId, setNewStaffId] = useState<number>(0);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const activeStaff = staffList.filter(s => s.staffId !== assignment.staffId);

  const handleSave = async () => {
    if (!newStaffId) {
      setError("Vui lòng chọn nhân viên thay thế.");
      return;
    }
    if (!reason.trim()) {
      setError("Vui lòng nhập lý do thay đổi.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await onSave(assignment.assignmentId, {
        staffId: newStaffId,
        note: reason.trim()
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Đổi nhân viên thất bại.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white rounded-lg shadow-xl w-[460px]">
        <div className="flex items-center justify-between px-5 py-3 bg-amber-500 rounded-t-lg">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-white" />
            <span className="text-white text-sm font-semibold">Đổi nhân viên phụ trách</span>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-3">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-3 py-2 rounded flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Info strip */}
          <div className="bg-blue-50 border border-blue-200 rounded p-3 space-y-1.5 text-xs">
            <div className="flex gap-2">
              <span className="text-gray-500 w-32">Vị trí trực:</span>
              <span className="font-semibold text-gray-800">Tầng {assignment.floorName}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-gray-500 w-32">Ca làm việc:</span>
              <span className="font-semibold text-gray-800">{assignment.shiftName} ({assignment.shiftTime})</span>
            </div>
            <div className="flex gap-2">
              <span className="text-gray-500 w-32">Ngày làm việc:</span>
              <span className="font-semibold text-gray-800">{assignment.workDate}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Nhân viên hiện tại</label>
            <input
              className={`${cls.input} w-full bg-gray-50 text-gray-500`}
              value={assignment.staffName ? `${assignment.staffName} (${assignment.staffCode})` : "Chưa có nhân viên"}
              readOnly
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Nhân viên thay thế <span className="text-red-500">*</span></label>
            <select
              className={`${cls.select} w-full`}
              value={newStaffId}
              onChange={e => { setNewStaffId(Number(e.target.value)); setError(""); }}
            >
              <option value={0}>-- Chọn nhân viên thay thế --</option>
              {activeStaff.map(s => (
                <option key={s.staffId} value={s.staffId}>{s.fullName} ({s.staffCode})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Lý do thay đổi <span className="text-red-500">*</span></label>
            <textarea
              className={`${cls.input} w-full h-16 py-1.5 resize-none`}
              placeholder="Nhập lý do thay đổi nhân viên..."
              value={reason}
              onChange={e => { setReason(e.target.value); setError(""); }}
            />
            <p className="text-[10px] text-gray-400 mt-0.5">* Lý do sẽ được cập nhật vào ghi chú phân công</p>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-200">
          <button className={cls.btnWarning} onClick={handleSave} disabled={saving}>
            <CheckCircle className="w-3.5 h-3.5" />
            {saving ? "Đang xử lý..." : "Xác nhận thay đổi"}
          </button>
          <button className={cls.btnReset} onClick={onClose} disabled={saving}>
            <X className="w-3.5 h-3.5" />
            Hủy
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function StaffAssignment() {
  const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const [dateStr, setDateStr] = useState<string>(getTodayString());
  const [assignments, setAssignments] = useState<StaffAssignmentDto[]>([]);
  const [shifts, setShifts] = useState<WorkShiftDto[]>([]);
  const [staffList, setStaffList] = useState<StaffMinimalDto[]>([]);
  const [floors, setFloors] = useState<FloorDto[]>([]);

  // Filter UI states
  const [fCa, setFCa] = useState("");
  const [fStatus, setFStatus] = useState("");

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [showReplace, setShowReplace] = useState<StaffAssignmentDto | null>(null);

  // Load catalogs on mount
  useEffect(() => {
    async function loadCatalogs() {
      try {
        const [shiftData, staffData, floorData] = await Promise.all([
          staffService.getShifts(),
          staffService.getActiveStaffList(),
          staffService.getFloors()
        ]);
        setShifts(shiftData);
        setStaffList(staffData);
        setFloors(floorData);
      } catch (err: any) {
        setErrorMsg("Không thể tải danh mục cấu hình: " + err.message);
      }
    }
    loadCatalogs();
  }, []);

  // Fetch assignments on date change
  const fetchAssignments = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const list = await staffService.getAssignments(dateStr);
      setAssignments(list);
    } catch (err: any) {
      setErrorMsg("Không thể tải danh sách phân công: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, [dateStr]);

  const handleCreateAssignment = async (payload: any) => {
    await staffService.createAssignment(payload);
    fetchAssignments();
  };

  const handleReassignStaff = async (assignmentId: number, payload: any) => {
    await staffService.reassignStaff(assignmentId, payload);
    fetchAssignments();
  };

  const handleCancelAssignment = async (assignmentId: number) => {
    if (!window.confirm("Bạn có chắc chắn muốn hủy phân công này không?")) return;
    try {
      await staffService.cancelAssignment(assignmentId);
      fetchAssignments();
    } catch (err: any) {
      alert("Hủy phân công thất bại: " + err.message);
    }
  };

  // Filtered rows
  const filtered = assignments.filter(row => {
    if (fCa && String(row.shiftId) !== fCa) return false;
    if (fStatus && row.status !== fStatus) return false;
    return true;
  });

  // Simple statistics
  const totalFloorsCount = floors.length;
  const assignedCount = assignments.filter(r => r.status !== "CANCELLED" && r.staffId).length;
  const unassignedCount = floors.length - assignedCount;
  const onDutyCount = assignments.filter(r => r.status === "ON_DUTY").length;

  return (
    <div className="space-y-4">
      {/* ── Filter Section ── */}
      <div className={cls.filterSection}>
        <div className="flex flex-wrap gap-3 items-end mb-3">
          <DateInput label="Ngày làm việc" value={dateStr} onChange={setDateStr} />
          
          <FilterGroup label="Ca làm việc">
            <select className={`${cls.select} w-[180px]`} value={fCa} onChange={e => setFCa(e.target.value)}>
              <option value="">-- Tất cả ca --</option>
              {shifts.map(s => (
                <option key={s.shiftId} value={s.shiftId}>{s.shiftName}</option>
              ))}
            </select>
          </FilterGroup>

          <FilterGroup label="Trạng thái">
            <select className={`${cls.select} w-[160px]`} value={fStatus} onChange={e => setFStatus(e.target.value)}>
              <option value="">-- Tất cả --</option>
              {Object.entries(STATUS_CFG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </FilterGroup>
        </div>

        <div className="flex flex-wrap gap-2">
          <button className={cls.btnSearch} onClick={fetchAssignments}>
            <Search className="w-3.5 h-3.5" />
            Tìm kiếm
          </button>
          <button className={cls.btnReset} onClick={() => { setFCa(""); setFStatus(""); }}>
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
          <button className={cls.btnAdd} onClick={() => setShowCreate(true)}>
            <Plus className="w-3.5 h-3.5" />
            Tạo phân công
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-3 py-2.5 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ── Summary Stats cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Tổng số tầng", value: totalFloorsCount, icon: MapPin, color: "text-blue-600 bg-blue-50" },
          { label: "Đã phân công", value: assignedCount, icon: CheckCircle, color: "text-green-600 bg-green-50" },
          { label: "Chưa phân công", value: Math.max(0, unassignedCount), icon: AlertCircle, color: "text-amber-600 bg-amber-50" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white border border-gray-200 rounded-lg shadow-sm px-4 py-3 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${color}`}>
              <Icon className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-semibold text-gray-400">{label}</div>
              <div className="text-xl font-bold text-gray-800">{value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Data Table Section ── */}
      <div className={cls.sectionCard}>
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-bold text-gray-700 uppercase tracking-wider">Danh sách phân công nhân viên trực tầng</span>
          </div>
          <span className="text-xs font-semibold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full border border-gray-200">
            Tổng: {filtered.length} bản ghi
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-max">
            <thead>
              <tr className="border-b border-gray-200">
                <th className={`${cls.th} w-12 text-center`}>STT</th>
                <th className={cls.th}>Ngày</th>
                <th className={cls.th}>Ca làm việc</th>
                <th className={cls.th}>Tầng đỗ xe</th>
                <th className={cls.th}>Nhân viên phụ trách</th>
                <th className={cls.th}>Trạng thái</th>
                <th className={cls.th}>Ghi chú</th>
                <th className={`${cls.th} text-center`}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400 text-sm">
                    <div className="flex justify-center items-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                      Đang tải danh sách phân công...
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-gray-400 text-sm">Không có dữ liệu phân công trực trong ngày này</td>
                </tr>
              ) : (
                filtered.map((row, i) => {
                  const canEdit = row.status !== "COMPLETED" && row.status !== "CANCELLED";
                  return (
                    <tr
                      key={row.assignmentId}
                      className={`border-b border-gray-100 hover:bg-gray-50/50 transition-colors ${
                        i % 2 === 1 ? "bg-gray-50/30" : "bg-white"
                      }`}
                    >
                      <td className="px-4 py-3.5 text-center text-xs font-semibold text-gray-400">{i + 1}</td>
                      <td className="px-4 py-3.5 text-xs text-gray-600 whitespace-nowrap">{row.workDate}</td>
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <ShiftBadge label={row.shiftName} time={row.shiftTime} />
                      </td>
                      <td className="px-4 py-3.5 text-sm font-extrabold text-blue-600 whitespace-nowrap">
                        {row.floorName} ({row.floorCode})
                      </td>
                      <td className="px-4 py-3.5">
                        {row.staffName ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">
                              {row.staffName[0]}
                            </div>
                            <span className="text-xs font-medium text-gray-800">{row.staffName} ({row.staffCode})</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">— Chưa phân công —</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={STATUS_CFG[row.status]?.badge || cls.badge.gray}>
                          {STATUS_CFG[row.status]?.label || row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs text-gray-500 truncate max-w-[200px] block">{row.note || "—"}</span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Đổi nhân viên */}
                          {canEdit && (
                            <button
                              title="Thay đổi nhân viên"
                              onClick={() => setShowReplace(row)}
                              className="text-amber-500 hover:text-amber-700 p-1.5 rounded-full hover:bg-amber-50 transition-colors"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {/* Hủy */}
                          {canEdit && (
                            <button
                              title="Hủy phân công"
                              onClick={() => handleCancelAssignment(row.assignmentId)}
                              className="text-red-500 hover:text-red-700 p-1.5 rounded-full hover:bg-red-50 transition-colors"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {showCreate && (
        <CreateModal
          shifts={shifts}
          staffList={staffList}
          floors={floors}
          onSave={handleCreateAssignment}
          onClose={() => setShowCreate(false)}
        />
      )}
      {showReplace && (
        <ReplaceModal
          assignment={showReplace}
          staffList={staffList}
          onSave={handleReassignStaff}
          onClose={() => setShowReplace(null)}
        />
      )}
    </div>
  );
}
