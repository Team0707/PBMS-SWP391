import { useState } from "react";
import { Search, RotateCcw, Eye, List, X } from "lucide-react";

interface Ticket {
  id: number;
  maVe: string;
  bienSo: string;
  loaiXe: string;
  tgVao: string;
  thoiGian: string;
  trangThai: "ACTIVE";
}

const activeTickets: Ticket[] = [
  { id: 1, maVe: "TK000021", bienSo: "59A-123.45", loaiXe: "Xe máy", tgVao: "14:22:10 15/01/2024", thoiGian: "45 phút", trangThai: "ACTIVE" },
  { id: 2, maVe: "TK000017", bienSo: "43A-999.11", loaiXe: "Xe máy", tgVao: "13:05:33 15/01/2024", thoiGian: "1 giờ 12 phút", trangThai: "ACTIVE" },
  { id: 3, maVe: "TK000013", bienSo: "52C-222.44", loaiXe: "Ô tô",   tgVao: "11:55:20 15/01/2024", thoiGian: "2 giờ 22 phút", trangThai: "ACTIVE" },
  { id: 4, maVe: "TK000009", bienSo: "30G-456.78", loaiXe: "Ô tô",   tgVao: "10:30:05 15/01/2024", thoiGian: "3 giờ 47 phút", trangThai: "ACTIVE" },
  { id: 5, maVe: "TK000005", bienSo: "61C-333.55", loaiXe: "Xe máy", tgVao: "09:10:40 15/01/2024", thoiGian: "5 giờ 07 phút", trangThai: "ACTIVE" },
  { id: 6, maVe: "TK000003", bienSo: "29X3-144.84",loaiXe: "Xe máy", tgVao: "08:45:22 15/01/2024", thoiGian: "5 giờ 32 phút", trangThai: "ACTIVE" },
  { id: 7, maVe: "TK000001", bienSo: "51F-888.88", loaiXe: "Ô tô",   tgVao: "08:15:10 15/01/2024", thoiGian: "6 giờ 02 phút", trangThai: "ACTIVE" },
];

export default function ActiveTickets() {
  const [bienSo, setBienSo] = useState("");
  const [maVe, setMaVe] = useState("");
  const [filtered, setFiltered] = useState(activeTickets);
  const [detail, setDetail] = useState<Ticket | null>(null);

  const handleSearch = () => {
    setFiltered(activeTickets.filter(t => {
      const matchBienSo = !bienSo || t.bienSo.toLowerCase().includes(bienSo.toLowerCase());
      const matchMaVe = !maVe || t.maVe.toLowerCase().includes(maVe.toLowerCase());
      return matchBienSo && matchMaVe;
    }));
  };

  const handleReset = () => {
    setBienSo("");
    setMaVe("");
    setFiltered(activeTickets);
  };

  return (
    <div className="space-y-3">
      {/* Title */}
      <div className="bg-white border border-gray-200 rounded shadow-sm px-4 py-2.5 flex items-center gap-2">
        <List className="w-4 h-4 text-blue-600" />
        <span className="text-sm font-semibold text-gray-700">Vé đang hoạt động</span>
        <span className="ml-auto text-xs bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 rounded font-medium">
          {filtered.length} vé ACTIVE
        </span>
      </div>

      {/* Filter */}
      <div className="bg-white border border-gray-200 rounded shadow-sm px-4 py-3">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Biển số</label>
            <input
              className="h-[34px] border border-gray-300 rounded px-3 text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 w-[150px]"
              placeholder="Tìm biển số..."
              value={bienSo}
              onChange={e => setBienSo(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Mã vé</label>
            <input
              className="h-[34px] border border-gray-300 rounded px-3 text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 w-[150px]"
              placeholder="VD: TK000021"
              value={maVe}
              onChange={e => setMaVe(e.target.value)}
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

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 border-b border-gray-200">
          <span className="text-sm font-medium text-gray-700">Danh sách vé đang hoạt động</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {["STT", "Mã vé", "Biển số", "Loại xe", "Thời gian vào", "Thời gian gửi", "Trạng thái", "Thao tác"].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-600 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">
                    Không tìm thấy vé nào
                  </td>
                </tr>
              ) : filtered.map((row, i) => (
                <tr key={row.id} className={`border-b border-gray-100 hover:bg-blue-50 ${i % 2 === 1 ? "bg-gray-50/50" : "bg-white"}`}>
                  <td className="px-3 py-2 text-xs text-gray-500">{i + 1}</td>
                  <td className="px-3 py-2 text-xs font-semibold text-blue-700">{row.maVe}</td>
                  <td className="px-3 py-2 text-xs font-bold text-gray-800">{row.bienSo}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${row.loaiXe === "Xe máy" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>
                      {row.loaiXe}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-600 tabular-nums">{row.tgVao}</td>
                  <td className="px-3 py-2 text-xs text-gray-600">{row.thoiGian}</td>
                  <td className="px-3 py-2">
                    <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700 border border-green-200 tracking-wide">
                      ACTIVE
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => setDetail(row)}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 border border-blue-200 hover:border-blue-400 px-2 py-1 rounded transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />Xem chi tiết
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 border-t border-gray-200 flex items-center justify-between">
          <span className="text-xs text-gray-500">Tổng: {filtered.length} vé đang hoạt động</span>
        </div>
      </div>

      {/* Detail Modal */}
      {detail && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-[420px] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 bg-blue-600">
              <span className="text-white text-sm font-semibold">Chi tiết vé — {detail.maVe}</span>
              <button onClick={() => setDetail(null)} className="text-white/80 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5">
              <div className="space-y-3.5">
                {[
                  { label: "Mã vé", value: detail.maVe },
                  { label: "Biển số xe", value: detail.bienSo },
                  { label: "Loại xe", value: detail.loaiXe },
                  { label: "Thời gian vào", value: detail.tgVao },
                  { label: "Thời gian gửi", value: detail.thoiGian },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-xs text-gray-500 font-medium">{label}</span>
                    <span className="text-sm font-semibold text-gray-800">{value}</span>
                  </div>
                ))}
                  <div>
                    <div className="text-xs text-gray-500">Trạng thái</div>
                    <span className="inline-flex px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-700 border border-green-200 tracking-wide mt-0.5">
                      ACTIVE
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end px-5 py-3 border-t border-gray-200">
              <button
                onClick={() => setDetail(null)}
                className="px-4 py-2 border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm rounded transition-colors"
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
