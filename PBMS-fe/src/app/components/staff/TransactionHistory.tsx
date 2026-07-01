import { useState, useEffect } from "react";
import { Search, RotateCcw, History } from "lucide-react";
import { staffService, TransactionDto } from "../../../services/staffService";

const PAGE_SIZE = 10;

function formatDateTime(isoString?: string): string {
  if (!isoString) return "—";
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return "—";

  const pad = (num: number) => String(num).padStart(2, "0");
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  const seconds = pad(d.getSeconds());
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();

  return `${hours}:${minutes}:${seconds} ${day}/${month}/${year}`;
}

export default function TransactionHistory() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [bienSo, setBienSo] = useState("");
  
  const [transactions, setTransactions] = useState<TransactionDto[]>([]);
  const [filtered, setFiltered] = useState<TransactionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [page, setPage] = useState(1);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  const fetchTransactions = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await staffService.getTransactions();
      setTransactions(data);
      setFiltered(data);
    } catch (err: any) {
      setErrorMsg(err.message || "Không thể tải lịch sử giao dịch.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleSearch = () => {
    let result = transactions;
    
    if (bienSo.trim()) {
      const term = bienSo.toLowerCase().trim();
      result = result.filter(t => t.bienSo.toLowerCase().includes(term));
    }
    
    if (fromDate) {
      const start = new Date(fromDate + "T00:00:00").getTime();
      result = result.filter(t => new Date(t.tgVao).getTime() >= start);
    }
    
    if (toDate) {
      const end = new Date(toDate + "T23:59:59").getTime();
      result = result.filter(t => new Date(t.tgVao).getTime() <= end);
    }
    
    setFiltered(result);
    setPage(1);
  };

  const handleReset = () => {
    setFromDate("");
    setToDate("");
    setBienSo("");
    setFiltered(transactions);
    setPage(1);
  };

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-3">
      {/* Title */}
      <div className="bg-white border border-gray-200 rounded shadow-sm px-4 py-2.5 flex items-center gap-2">
        <History className="w-4 h-4 text-blue-600" />
        <span className="text-sm font-semibold text-gray-700">Lịch sử giao dịch</span>
      </div>

      {/* Filter */}
      <div className="bg-white border border-gray-200 rounded shadow-sm px-4 py-3">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Từ ngày</label>
            <input
              type="date"
              className="h-[34px] border border-gray-300 rounded px-3 text-sm focus:outline-none focus:border-blue-400 w-[150px]"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Đến ngày</label>
            <input
              type="date"
              className="h-[34px] border border-gray-300 rounded px-3 text-sm focus:outline-none focus:border-blue-400 w-[150px]"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Biển số</label>
            <input
              className="h-[34px] border border-gray-300 rounded px-3 text-sm focus:outline-none focus:border-blue-400 w-[160px] uppercase font-semibold"
              placeholder="Tìm biển số..."
              value={bienSo}
              onChange={e => setBienSo(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
            />
          </div>
          <button
            onClick={handleSearch}
            className="h-[34px] px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded flex items-center gap-1.5 transition-colors"
          >
            <Search className="w-3.5 h-3.5" />Tìm kiếm
          </button>
          <button
            onClick={handleReset}
            className="h-[34px] px-3 border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm rounded flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />Reset
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 border-b border-gray-200 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Danh sách giao dịch</span>
          <span className="text-xs text-gray-400">Tổng: {filtered.length} giao dịch</span>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center items-center py-16 text-sm text-gray-400">
              <div className="animate-spin mr-2">⏳</div> Đang tải lịch sử giao dịch...
            </div>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {["STT", "Mã vé", "Biển số", "Ảnh xe vào", "Ảnh xe ra", "Loại xe", "Loại vé", "Thời gian vào", "Thời gian ra", "Phí gửi xe", "Trạng thái"].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-600 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageData.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-8 text-center text-sm text-gray-400">
                      Không tìm thấy giao dịch nào
                    </td>
                  </tr>
                ) : pageData.map((row, i) => (
                  <tr key={row.id} className={`border-b border-gray-100 hover:bg-blue-50/50 ${i % 2 === 1 ? "bg-gray-50/30" : "bg-white"}`}>
                    <td className="px-3 py-2 text-xs text-gray-500">{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td className="px-3 py-2 text-xs font-semibold text-blue-700">{row.maVe}</td>
                    <td className="px-3 py-2 text-xs font-bold text-gray-800 uppercase">{row.bienSo}</td>
                    <td className="px-3 py-2">
                      {row.entryImage ? (
                        <button
                          type="button"
                          onClick={() => setSelectedImageUrl(row.entryImage!)}
                          className="text-xs text-blue-600 hover:text-blue-800 underline font-medium"
                        >
                          Xem ảnh
                        </button>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {row.exitImage ? (
                        <button
                          type="button"
                          onClick={() => setSelectedImageUrl(row.exitImage!)}
                          className="text-xs text-blue-600 hover:text-blue-800 underline font-medium"
                        >
                          Xem ảnh
                        </button>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${row.loaiXe === "Xe máy" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>
                        {row.loaiXe}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${row.loaiVe === "Vé tháng" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                        {row.loaiVe}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-600 tabular-nums">{formatDateTime(row.tgVao)}</td>
                    <td className="px-3 py-2 text-xs text-gray-600 tabular-nums">{formatDateTime(row.tgRa)}</td>
                    <td className="px-3 py-2 text-xs font-medium text-gray-700">
                      {row.phi !== null && row.phi !== undefined ? `${row.phi.toLocaleString("vi-VN")} VNĐ` : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold tracking-wide ${
                        row.trangThai === "ACTIVE"
                          ? "bg-green-100 text-green-700 border border-green-200"
                          : "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}>
                        {row.trangThai}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-2.5 border-t border-gray-200 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Hiển thị {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} / {filtered.length} giao dịch
            </span>
            <div className="flex items-center gap-1">
              {[
                { label: "«", disabled: page === 1, action: () => setPage(1) },
                { label: "‹", disabled: page === 1, action: () => setPage(p => Math.max(1, p - 1)) },
                { label: String(page), disabled: true, action: () => {} },
                { label: "›", disabled: page === totalPages, action: () => setPage(p => Math.min(totalPages, p + 1)) },
                { label: "»", disabled: page === totalPages, action: () => setPage(totalPages) },
              ].map(({ label, disabled, action }) => (
                <button
                  key={label}
                  onClick={action}
                  disabled={disabled}
                  className={`w-7 h-7 text-xs rounded border transition-colors ${
                    label === String(page)
                      ? "bg-blue-600 text-white border-blue-600"
                      : disabled
                      ? "text-gray-300 border-gray-200 cursor-not-allowed"
                      : "text-gray-600 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {selectedImageUrl && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-lg overflow-hidden shadow-2xl max-w-2xl w-full flex flex-col">
            <div className="px-4 py-2 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <span className="text-sm font-semibold text-gray-700">Ảnh xe vào chi tiết</span>
              <button
                type="button"
                onClick={() => setSelectedImageUrl(null)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>
            <div className="p-4 flex justify-center items-center bg-black/5 min-h-[300px]">
              <img
                src={selectedImageUrl}
                alt="Vehicle Entry Detail"
                className="max-h-[500px] object-contain border border-gray-300 rounded"
              />
            </div>
            <div className="px-4 py-2 border-t border-gray-200 flex justify-end bg-gray-50">
              <button
                type="button"
                onClick={() => setSelectedImageUrl(null)}
                className="px-4 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-xs font-semibold rounded"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
