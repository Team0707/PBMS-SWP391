import { useState } from "react";
import {
  Home, LogOut, History,
  ParkingSquare, ChevronRight,
  ArrowDownToLine, ArrowUpFromLine,
  Layers, AlertOctagon,
} from "lucide-react";
import { FloorDto, StaffAssignmentDto } from "../../../services/staffService";

export type StaffScreen =
  | "dashboard"
  | "vehicle-entry"
  | "vehicle-exit"
  | "transaction-history"
  | "exceptions"
  | "floor-slot";

interface StaffLayoutProps {
  currentScreen: StaffScreen;
  onNavigate: (s: StaffScreen) => void;
  onLogout: () => void;
  children: React.ReactNode;
  staffName?: string;
  selectedFloorCode: string;
  floors: FloorDto[];
  onFloorChange: (code: string) => void;
  assignment?: StaffAssignmentDto | null;
}

const navItems: { screen: StaffScreen; label: string; icon: React.FC<{ className?: string }> }[] = [
  { screen: "dashboard",           label: "Dashboard",               icon: Home },
  { screen: "vehicle-entry",       label: "Xe vào",                  icon: ArrowDownToLine },
  { screen: "vehicle-exit",        label: "Xe ra",                   icon: ArrowUpFromLine },
  { screen: "transaction-history", label: "Lịch sử giao dịch",  icon: History },
  { screen: "floor-slot",          label: "Quản lý slot",            icon: Layers },
  { screen: "exceptions",          label: "Hỗ trợ",                  icon: AlertOctagon },
];

const breadcrumbMap: Record<StaffScreen, string> = {
  dashboard:             "Dashboard",
  "vehicle-entry":       "Xe vào",
  "vehicle-exit":        "Xe ra",
  "transaction-history": "Lịch sử giao dịch",
  "floor-slot":          "Quản lý slot",
  "exceptions":          "Hỗ trợ",
};

export default function StaffLayout({
  currentScreen,
  onNavigate,
  onLogout,
  children,
  staffName = "Nhân viên 01",
  selectedFloorCode,
  floors,
  onFloorChange,
  assignment,
}: StaffLayoutProps) {

  const allowedNavItems = navItems.filter(item => {
    if (!assignment) {
      // If not assigned today, hide entry/exit operations
      return item.screen !== "vehicle-entry" && item.screen !== "vehicle-exit";
    }
    return true;
  });

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Sidebar */}
      <aside className="w-[210px] flex-shrink-0 bg-[#1a3560] flex flex-col overflow-hidden">
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 py-4 border-b border-blue-900/60">
          <ParkingSquare className="w-7 h-7 text-sky-300 flex-shrink-0" />
          <div>
            <div className="text-white text-xs font-bold leading-tight tracking-wide">PARKING STAFF</div>
            <div className="text-sky-300 text-[10px] leading-tight tracking-widest">PORTAL</div>
          </div>
        </div>

        {/* Staff info strip */}
        <div className="px-4 py-3 border-b border-blue-900/40 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {staffName.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="text-white text-xs font-medium truncate">{staffName}</div>
            <div className="text-blue-300 text-[10px]">Parking Staff</div>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto">
          {allowedNavItems.map(item => {
            const Icon = item.icon;
            const active = currentScreen === item.screen;
            return (
              <button
                key={item.screen}
                onClick={() => onNavigate(item.screen)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded text-sm font-medium transition-all ${
                  active
                    ? "bg-[#2563eb] text-white shadow-sm"
                    : "text-blue-100 hover:bg-blue-900/20 hover:text-white"
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Bottom logout */}
        <div className="px-2 pb-4">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded text-sm text-red-300 hover:bg-red-900/30 hover:text-red-200 transition-colors"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Main Panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-11 bg-[#dbeafe] border-b border-blue-200 flex items-center justify-between px-4 flex-shrink-0 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 text-xs text-gray-600">
              <span className="text-blue-600 cursor-pointer hover:underline">Trang chủ</span>
              <ChevronRight className="w-3 h-3 text-gray-400" />
              <span className="text-gray-700 font-medium">{breadcrumbMap[currentScreen]}</span>
            </div>

            {assignment && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 bg-blue-50/90 text-blue-700 border border-blue-200 px-2 py-0.5 rounded text-xs font-semibold">
                  <span className="uppercase text-[9px] text-blue-500 font-extrabold tracking-wider">Tầng trực:</span>
                  <span>{assignment.floorName} ({assignment.floorCode})</span>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#10b981] text-white flex items-center justify-center text-xs font-bold">
                {staffName.charAt(0)}
              </div>
              <span className="text-xs text-gray-700">
                Xin chào, <span className="font-medium text-blue-700">{staffName}</span>
              </span>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 border border-red-200 hover:border-red-300 rounded px-2 py-1 transition-colors"
            >
              <LogOut className="w-3 h-3" />
              Đăng xuất
            </button>
          </div>
        </header>

        {/* Content body */}
        <main className="flex-1 overflow-y-auto p-3 bg-gray-100">
          {children}
        </main>
      </div>
    </div>
  );
}
