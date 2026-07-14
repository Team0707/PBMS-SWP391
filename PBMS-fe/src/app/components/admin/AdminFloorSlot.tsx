import { useState, useEffect } from "react";
import {
  Layers,
  RefreshCw,
  Car,
  Bike,
  CreditCard,
  AlertTriangle,
  CheckCircle2
} from "lucide-react";

import { cls } from "../common/ui";
import { staffService, SlotStatsResponse } from "../../../services/staffService";

export default function AdminFloorSlot() {
  const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const [dateStr, setDateStr] = useState<string>(getTodayString());
  const [stats, setStats] = useState<SlotStatsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchStats = async (targetDate: string) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await staffService.getSlotStatistics(targetDate);
      setStats(data);
    } catch (err: any) {
      setErrorMsg("Không thể tải thống kê slot đỗ xe: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats(dateStr);
  }, []);

  const handleUpdate = () => {
    fetchStats(dateStr);
    setSuccessMsg("Đã cập nhật dữ liệu thành công!");
    setTimeout(() => setSuccessMsg(null), 2500);
  };

  return (
    <div className={`${cls.pageWrapper} px-6 py-4 bg-gray-50/50 min-h-screen`}>
      {/* Breadcrumb */}
      <div className="text-xs text-gray-500 mb-3 flex items-center gap-1">
        <span>Trang chủ</span>
        <span className="text-gray-300">/</span>
        <span>Web</span>
        <span className="text-gray-300">/</span>
        <span>Hệ thống</span>
        <span className="text-gray-300">/</span>
        <span className="font-medium text-gray-700">Quản lý slot</span>
      </div>

      {/* Title */}
      <div className="mb-5 flex items-center gap-2 border-b border-gray-100 pb-3">
        <Layers className="h-6 w-6 text-blue-600" />
        <h1 className="text-xl font-bold text-gray-800">
          Thông tin tầng đỗ xe
        </h1>
      </div>

      {/* Date Filter Card */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Ngày xem thống kê
            </label>
            <input
              type="date"
              className={`${cls.input} w-48`}
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={handleUpdate}
            disabled={loading}
            className={`${cls.btnSearch} self-end`}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Cập nhật
          </button>
        </div>
      </div>

      {/* Global notifications */}
      {errorMsg && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm font-medium text-red-700 shadow-sm animate-fade-in">
          <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3.5 text-sm font-medium text-green-700 shadow-sm animate-fade-in">
          <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Card 1: Tổng slot ô tô */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <Car className="h-6 w-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tổng slot ô tô</div>
            <div className="text-2xl font-black text-blue-600 mt-1">
              {loading ? "..." : stats?.totalCarSlots ?? 0}
            </div>
          </div>
        </div>

        {/* Card 2: Tổng slot xe máy */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-green-600">
            <Bike className="h-6 w-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tổng slot xe máy</div>
            <div className="text-2xl font-black text-green-600 mt-1">
              {loading ? "..." : stats?.totalMotorcycleSlots ?? 0}
            </div>
          </div>
        </div>
      </div>

      {/* Main Stats Table Card */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
            Thống kê phương tiện theo tầng
          </h2>
          <span className="text-xs font-semibold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full border border-gray-200">
            {loading ? "..." : `${stats?.floorStats.length ?? 0} tầng`}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Tầng</th>
                <th className="px-4 py-3 text-center">Tổng slot ô tô</th>
                <th className="px-4 py-3 text-center">Trống ô tô</th>
                <th className="px-4 py-3 text-center">Tổng slot xe máy</th>
                <th className="px-4 py-3 text-center">Trống xe máy</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-400 text-sm">
                    <div className="flex justify-center items-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                      Đang tải thống kê...
                    </div>
                  </td>
                </tr>
              ) : !stats || stats.floorStats.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-400 text-sm">
                    Không tìm thấy dữ liệu thống kê nào.
                  </td>
                </tr>
              ) : (
                stats.floorStats.map((floor) => (
                  <tr key={floor.floorId} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                    {/* Tầng */}
                    <td className="px-4 py-3.5 text-sm font-extrabold text-blue-600 whitespace-nowrap">
                      {floor.floorCode}
                    </td>
                    {/* Tổng slot ô tô */}
                    <td className="px-4 py-3.5 text-center text-sm font-semibold text-gray-700">
                      {floor.totalCarSlots}
                    </td>
                    {/* Trống ô tô */}
                    <td className="px-4 py-3.5 text-center">
                      <span className="inline-flex justify-center items-center min-w-[34px] px-2.5 py-0.5 rounded text-xs font-bold bg-green-50 text-green-700">
                        {floor.availableCarSlots}
                      </span>
                    </td>
                    {/* Tổng slot xe máy */}
                    <td className="px-4 py-3.5 text-center text-sm font-semibold text-gray-700">
                      {floor.totalMotorcycleSlots}
                    </td>
                    {/* Trống xe máy */}
                    <td className="px-4 py-3.5 text-center">
                      <span className="inline-flex justify-center items-center min-w-[34px] px-2.5 py-0.5 rounded text-xs font-bold bg-green-50 text-green-700">
                        {floor.availableMotorcycleSlots}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
