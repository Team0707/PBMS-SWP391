import { useState } from "react";
import {
  Home,
  CreditCard,
  LogOut,
  ParkingSquare,
  ChevronRight,
  LifeBuoy,
  BookOpen,
} from "lucide-react";

export type UserScreen =
  | "dashboard"
  | "monthly-cards"
  | "regulations"
  | "support";

interface UserLayoutProps {
  currentScreen: UserScreen;
  onNavigate: (s: UserScreen) => void;
  onLogout: () => void;
  children: React.ReactNode;
  userName?: string;
}

const navItems: {
  screen: UserScreen;
  label: string;
  icon: React.FC<{ className?: string }>;
}[] = [
  {
    screen: "dashboard",
    label: "Hồ sơ của tôi",
    icon: Home,
  },
  {
    screen: "monthly-cards",
    label: "Thẻ của tôi",
    icon: CreditCard,
  },
  {
    screen: "regulations",
    label: "Quy định",
    icon: BookOpen,
  },
  {
    screen: "support",
    label: "Hỗ trợ",
    icon: LifeBuoy,
  },
];

const breadcrumbMap: Record<UserScreen, string> = {
  dashboard: "Hồ sơ của tôi",
  "monthly-cards": "Thẻ của tôi",
  regulations: "Quy định",
  support: "Hỗ trợ",
};

export default function UserLayout({ currentScreen, onNavigate, onLogout, children, userName = "Người dùng" }: UserLayoutProps) {
  const initials = userName.split(" ").map(w => w[0]).slice(-2).join("").toUpperCase();

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <aside className="w-[210px] flex-shrink-0 bg-[#1a3560] flex flex-col overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-4 border-b border-blue-900/60">
          <ParkingSquare className="w-7 h-7 text-sky-300 flex-shrink-0" />
          <div className="flex flex-col">
            <span className="text-xs font-black tracking-wider text-white uppercase leading-none">Parking</span>
            <span className="text-[10px] text-sky-200 uppercase tracking-widest font-semibold mt-1">Member Portal</span>
          </div>
        </div>
        <div className="px-3 py-3 border-b border-blue-900/30 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-sky-500/20 text-sky-300 flex items-center justify-center font-bold text-sm border border-sky-400/30">{initials}</div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-white truncate leading-tight">{userName}</span>
            <span className="text-[9px] text-sky-300 font-medium">Thành viên</span>
          </div>
        </div>
        <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto">
          {navItems.map(item => {
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
        <div className="px-2 pb-4">
          <button onClick={onLogout} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded text-sm text-red-300 hover:bg-red-900/30 hover:text-red-200 transition-colors">
            <LogOut className="w-4 h-4 flex-shrink-0" /><span>Đăng xuất</span>
          </button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-11 bg-[#dbeafe] border-b border-blue-200 flex items-center justify-between px-4 flex-shrink-0 shadow-sm">
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <span className="text-blue-600 cursor-pointer hover:underline">Trang chủ</span>
            <ChevronRight className="w-3 h-3 text-gray-400" />
            <span className="text-gray-700 font-medium">{breadcrumbMap[currentScreen]}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-bold">{initials}</div>
              <span className="text-xs text-gray-700">Xin chào, <span className="font-medium text-blue-700">{userName}</span></span>
            </div>
            <button onClick={onLogout} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 border border-red-200 hover:border-red-300 rounded px-2 py-1 transition-colors">
              <LogOut className="w-3 h-3" />Đăng xuất
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-3 bg-gray-100">{children}</main>
      </div>
    </div>
  );
}
