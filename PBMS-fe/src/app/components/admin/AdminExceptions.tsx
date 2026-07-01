import { useState, useEffect } from "react";
import { AlertOctagon, Search, Eye, CheckCircle, XCircle, UserCheck, X, RefreshCw, User, Users } from "lucide-react";
import { cls } from "../common/ui";
import { adminCardService, RequestSupportDto } from "../../../services/adminCardService";
import { staffService, StaffMinimalDto } from "../../../services/staffService";

const statusBadge: Record<string, string> = {
  PENDING:    cls.badge.amber,
  PROCESSING: cls.badge.blue,
  RESOLVED:   cls.badge.green,
  APPROVED:   cls.badge.green,
  REJECTED:   cls.badge.red,
  CANCELLED:  cls.badge.gray,
};

const mapStatusToVi = (status: string) => {
  switch (status) {
    case "PENDING": return "Chờ xử lý";
    case "PROCESSING": return "Đang xử lý";
    case "RESOLVED":
    case "APPROVED": return "Đã xử lý";
    case "REJECTED": return "Từ chối";
    case "CANCELLED": return "Đã hủy";
    default: return status;
  }
};

export default function AdminExceptions() {
  const [requests, setRequests] = useState<RequestSupportDto[]>([]);
  const [staffs, setStaffs] = useState<StaffMinimalDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [keyword, setKeyword] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  
  const [viewItem, setViewItem] = useState<RequestSupportDto | null>(null);
  
  const [approveItem, setApproveItem] = useState<RequestSupportDto | null>(null);
  const [approveNote, setApproveNote] = useState("");

  const [rejectItem, setRejectItem] = useState<RequestSupportDto | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  
  const [assignItem, setAssignItem] = useState<RequestSupportDto | null>(null);
  const [assignStaffId, setAssignStaffId] = useState<number | "">("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");
      const [reqData, staffData] = await Promise.all([
        adminCardService.getAllRequests(),
        staffService.getActiveStaffList(),
      ]);
      setRequests(reqData);
      setStaffs(staffData);
    } catch (err: any) {
      console.error(err);
      setError("Không thể tải danh sách yêu cầu hỗ trợ hoặc nhân viên.");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!approveItem) return;
    try {
      setError("");
      const updated = await adminCardService.approveRequest(approveItem.requestId, approveNote.trim());
      setRequests(prev => prev.map(r => r.requestId === updated.requestId ? updated : r));
      setApproveItem(null);
      setApproveNote("");
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Duyệt yêu cầu thất bại.");
    }
  };

  const handleReject = async () => {
    if (!rejectItem) return;
    try {
      setError("");
      const updated = await adminCardService.rejectRequest(rejectItem.requestId, rejectReason.trim());
      setRequests(prev => prev.map(r => r.requestId === updated.requestId ? updated : r));
      setRejectItem(null);
      setRejectReason("");
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Từ chối yêu cầu thất bại.");
    }
  };

  const handleAssign = async () => {
    if (!assignItem || !assignStaffId) return;
    try {
      setError("");
      const updated = await adminCardService.assignRequestStaff(assignItem.requestId, Number(assignStaffId));
      setRequests(prev => prev.map(r => r.requestId === updated.requestId ? updated : r));
      setAssignItem(null);
      setAssignStaffId("");
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Phân công nhân viên thất bại.");
    }
  };

  // Summary counts
  const pendingCount = requests.filter(r => r.status === "PENDING").length;
  const processingCount = requests.filter(r => r.status === "PROCESSING").length;
  const resolvedCount = requests.filter(r => r.status === "RESOLVED" || r.status === "APPROVED").length;
  const rejectedCount = requests.filter(r => r.status === "REJECTED").length;

  const filtered = requests.filter(r => {
    if (filterStatus && r.status !== filterStatus) return false;
    if (filterRole) {
      const isStaff = r.senderRole === "STAFF";
      if (filterRole === "STAFF" && !isStaff) return false;
      if (filterRole === "USER" && isStaff) return false;
    }
    if (keyword.trim()) {
      const key = keyword.toLowerCase();
      const matchNo = r.requestNo?.toLowerCase().includes(key);
      const matchSender = r.senderName?.toLowerCase().includes(key);
      const matchSubject = r.subject?.toLowerCase().includes(key);
      const matchDesc = r.description?.toLowerCase().includes(key);
      if (!matchNo && !matchSender && !matchSubject && !matchDesc) return false;
    }
    return true;
  });

  return (
    <div className={cls.pageWrapper + " space-y-4 pb-8"}>
      {/* Page Header */}
      <div className="flex items-center gap-2 rounded border border-gray-200 bg-white px-4 py-2.5 shadow-sm">
        <AlertOctagon className="w-4 h-4 text-emerald-600" />
        <div>
          <div className="text-sm font-semibold text-gray-700">Xử lý đơn</div>
          <div className="text-[11px] text-gray-500">Xử lý đơn do người dùng và nhân viên gửi đến.</div>
        </div>
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2.5">{error}</div>}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Pending Card */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex flex-col justify-between shadow-sm">
          <div className="text-2xl font-bold text-amber-700">{pendingCount}</div>
          <div className="text-xs text-amber-800 font-medium">Chờ xử lý</div>
        </div>

        {/* Processing Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex flex-col justify-between shadow-sm">
          <div className="text-2xl font-bold text-blue-700">{processingCount}</div>
          <div className="text-xs text-blue-800 font-medium">Đang xử lý</div>
        </div>

        {/* Resolved Card */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex flex-col justify-between shadow-sm">
          <div className="text-2xl font-bold text-emerald-700">{resolvedCount}</div>
          <div className="text-xs text-emerald-800 font-medium">Đã xử lý</div>
        </div>

        {/* Rejected Card */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex flex-col justify-between shadow-sm">
          <div className="text-2xl font-bold text-red-700">{rejectedCount}</div>
          <div className="text-xs text-red-800 font-medium">Từ chối</div>
        </div>
      </div>

      {/* Filter Section */}
      <div className={`${cls.filterSection} flex flex-wrap gap-2 items-end`}>
        <div>
          <label className="block text-xs text-gray-500 mb-0.5">Tìm kiếm</label>
          <input
            type="text"
            className={cls.input}
            style={{ width: 220 }}
            placeholder="Mã đơn, người gửi, tiêu đề..."
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-0.5">Nguồn gửi</label>
          <select className={cls.select} value={filterRole} onChange={e => setFilterRole(e.target.value)}>
            <option value="">-- Tất cả --</option>
            <option value="STAFF">Nhân viên</option>
            <option value="USER">Người dùng</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-0.5">Trạng thái</label>
          <select className={cls.select} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">-- Tất cả --</option>
            <option value="PENDING">Chờ xử lý</option>
            <option value="PROCESSING">Đang xử lý</option>
            <option value="RESOLVED">Đã xử lý</option>
            <option value="REJECTED">Từ chối</option>
          </select>
        </div>
        <button className={cls.btnSearch} onClick={fetchData}>
          <Search className="w-3.5 h-3.5" /> Tìm kiếm
        </button>
        <button className={cls.btnReset} onClick={() => { setKeyword(""); setFilterRole(""); setFilterStatus(""); }}>
          <RefreshCw className="w-3.5 h-3.5" /> Reset
        </button>
      </div>

      {/* Request Table */}
      <div className={cls.sectionCard}>
        <div className="border-b border-gray-200 px-4 py-2 flex items-center justify-between bg-gray-50/50">
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Danh sách đơn</span>
          <span className="text-xs text-gray-500">{filtered.length}/{requests.length} đơn</span>
        </div>
        
        <div className={cls.tableWrapper}>
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                {["Mã đơn", "Nguồn gửi", "Tiêu đề", "Người gửi", "Nội dung", "Thời gian", "Trạng thái", "Thao tác"].map(h => (
                  <th key={h} className={cls.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400 text-sm">Đang tải dữ liệu...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400 text-sm">Không có đơn yêu cầu nào</td></tr>
              ) : (
                filtered.map((r, i) => (
                  <tr key={r.requestId} className={`border-b border-gray-100 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"} hover:bg-gray-100/30 transition-colors`}>
                    <td className={cls.td}><span className="font-mono text-xs text-blue-700">{r.requestNo}</span></td>
                    <td className={cls.td}>
                      <span className="flex items-center gap-1 text-xs">
                        {r.senderRole === "STAFF" ? (
                          <>
                            <User className="w-3.5 h-3.5 text-blue-600" />
                            <span>Nhân viên</span>
                          </>
                        ) : (
                          <>
                            <Users className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Người dùng</span>
                          </>
                        )}
                      </span>
                    </td>
                    
                    {/* Cột tiêu đề: Plain text, không hiệu ứng */}
                    <td className="px-2 py-1.5 text-sm border-r border-gray-200 text-gray-800 break-words">{r.subject}</td>
                    
                    <td className={cls.td}>{r.senderName}</td>
                    <td className="px-2 py-1.5 text-sm border-r border-gray-200 text-gray-600 truncate max-w-[200px]" title={r.description}>
                      {r.description}
                    </td>
                    <td className={cls.td}>{r.createdAt ? new Date(r.createdAt).toLocaleString("vi-VN") : "—"}</td>
                    <td className={cls.td}>
                      <span className={statusBadge[r.status] || cls.badge.gray}>{mapStatusToVi(r.status)}</span>
                    </td>
                    <td className={cls.td}>
                      <div className="flex gap-1 flex-wrap">
                        <button onClick={() => setViewItem(r)} className="h-6 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs rounded border border-blue-200 flex items-center gap-1 cursor-pointer">
                          <Eye className="w-3 h-3" /> Xem chi tiết
                        </button>
                        {(r.status === "PENDING" || r.status === "PROCESSING") && (
                          <button onClick={() => { setApproveItem(r); setApproveNote(""); }} className="h-6 px-2 bg-green-50 hover:bg-green-100 text-green-700 text-xs rounded border border-green-200 flex items-center gap-1 cursor-pointer">
                            <CheckCircle className="w-3 h-3" /> Duyệt
                          </button>
                        )}
                        {r.status !== "RESOLVED" && r.status !== "APPROVED" && r.status !== "REJECTED" && (
                          <button onClick={() => { setRejectItem(r); setRejectReason(""); }} className="h-6 px-2 bg-red-50 hover:bg-red-100 text-red-700 text-xs rounded border border-red-200 flex items-center gap-1 cursor-pointer">
                            <XCircle className="w-3 h-3" /> Từ chối
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Modal */}
      {viewItem && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-5 border border-gray-150">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
              <h3 className="font-semibold text-gray-700">Chi tiết yêu cầu – {viewItem.requestNo}</h3>
              <button onClick={() => setViewItem(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-2 text-sm max-h-[60vh] overflow-y-auto pr-1">
              <div className="flex justify-between border-b border-gray-100 pb-1">
                <span className="text-gray-500">Mã đơn:</span>
                <span className="font-mono text-blue-700">{viewItem.requestNo}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-1">
                <span className="text-gray-500">Nguồn gửi:</span>
                <span className="font-medium">{viewItem.senderRole === "STAFF" ? "Nhân viên" : "Người dùng"}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-1">
                <span className="text-gray-500">Tiêu đề:</span>
                <span className="font-medium text-gray-800">{viewItem.subject}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-1">
                <span className="text-gray-500">Người gửi:</span>
                <span className="font-medium">{viewItem.senderName || "—"}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-1">
                <span className="text-gray-500">Trạng thái:</span>
                <span className={statusBadge[viewItem.status] || cls.badge.gray}>{mapStatusToVi(viewItem.status)}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-1">
                <span className="text-gray-500">Tạo lúc:</span>
                <span>{viewItem.createdAt ? new Date(viewItem.createdAt).toLocaleString("vi-VN") : "—"}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-1">
                <span className="text-gray-500">Phân công cho:</span>
                <span>{viewItem.assignedStaffName || "—"}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-1">
                <span className="text-gray-500">Xử lý lúc:</span>
                <span>{viewItem.processingAt ? new Date(viewItem.processingAt).toLocaleString("vi-VN") : "—"}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-1">
                <span className="text-gray-500">Hoàn thành lúc:</span>
                <span>{viewItem.resolvedAt ? new Date(viewItem.resolvedAt).toLocaleString("vi-VN") : "—"}</span>
              </div>

              <div className="space-y-1 bg-gray-50 rounded p-2.5 border border-gray-200 mt-2">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Nội dung chi tiết:</div>
                <div className="text-gray-700 whitespace-pre-wrap text-xs font-mono">{viewItem.description}</div>
              </div>

              {viewItem.adminNote && (
                <div className="space-y-1 bg-emerald-50/50 rounded p-2.5 border border-emerald-200 text-emerald-800 mt-2">
                  <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Phản hồi của Admin:</div>
                  <div className="text-gray-700 whitespace-pre-wrap text-xs">{viewItem.adminNote}</div>
                </div>
              )}
            </div>
            <div className="mt-4 flex justify-end">
              <button onClick={() => setViewItem(null)} className={cls.btnSecondary}>Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {approveItem && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-5 border border-gray-150">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-gray-700">Duyệt & Giải quyết yêu cầu</h3>
              <button onClick={() => setApproveItem(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <p className="text-sm text-gray-600 mb-3">Yêu cầu: <strong className="font-mono text-blue-700">{approveItem.requestNo}</strong></p>
            <textarea
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 min-h-[90px] resize-none"
              value={approveNote}
              onChange={e => setApproveNote(e.target.value)}
              placeholder="Ghi chú phản hồi gửi người dùng (tùy chọn)..."
            />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setApproveItem(null)} className={cls.btnSecondary}>Hủy</button>
              <button onClick={handleApprove} className="h-[34px] px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded flex items-center gap-1.5 cursor-pointer">
                <CheckCircle className="w-3.5 h-3.5" /> Xác nhận duyệt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectItem && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-5 border border-gray-150">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-gray-700">Từ chối yêu cầu</h3>
              <button onClick={() => setRejectItem(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <p className="text-sm text-gray-600 mb-3">Yêu cầu: <strong className="font-mono text-blue-700">{rejectItem.requestNo}</strong></p>
            <textarea
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 min-h-[90px] resize-none"
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Nhập lý do từ chối (bắt buộc)..."
            />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setRejectItem(null)} className={cls.btnSecondary}>Hủy</button>
              <button onClick={handleReject} disabled={!rejectReason.trim()} className={`${cls.btnDanger} ${!rejectReason.trim() ? "opacity-50 cursor-not-allowed" : ""}`}>
                Từ chối
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
