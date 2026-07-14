import { useState } from "react";
import {
  BarChart2, CreditCard, Users, Shield,
  ChevronDown, ChevronRight, ParkingSquare, Home,
  ArrowRightLeft, History, Tag, AlertTriangle,
  UserCheck, UserCog, ClipboardList, LogOut,
  Layers, AlertOctagon,
} from "lucide-react";

export type Screen =
  | "dashboard"
  | "vehicle-entry-exit"
  | "card-history"
  | "customer-management"
  | "card-groups"
  | "card-violation-rules"
  | "user-management"
  | "staff-assignment"
  | "admin-floor-slot"
  | "admin-exceptions";

interface LayoutProps {
  currentScreen: Screen;
  onNavigate: (s: Screen) => void;
  onLogout: () => void;
  children: React.ReactNode;
}

const screenBreadcrumb: Record<Screen, string> = {
  dashboard:             "Dashboard",
  "vehicle-entry-exit":  "Báo cáo > Xe vào / ra",
  "card-history":        "Quản lý thẻ > Lịch sử thẻ",
  "customer-management": "Quản lý khách hàng",
  "card-groups":         "Quản lý thẻ > Nhóm thẻ",
  "card-violation-rules":"Quản lý thẻ > Thẻ vi phạm",
  "user-management":     "Hệ thống > Quản lý người dùng",
  "staff-assignment":    "Hệ thống > Phân công nhân viên",
  "admin-floor-slot":    "Hệ thống > Quản lý slot",
  "admin-exceptions":    "Hệ thống > Xử lý đơn",
};

type SectionKey = "reports" | "cards" | "customers" | "system";

const menuSections = [
  {
    key: "reports" as SectionKey,
    label: "Báo cáo",
    icon: BarChart2,
    items: [
      { screen: "vehicle-entry-exit" as Screen, label: "Xe vào / ra",        icon: ArrowRightLeft },
    ],
  },
  {
    key: "cards" as SectionKey,
    label: "Quản lý thẻ",
    icon: CreditCard,
    items: [
      { screen: "card-history" as Screen, label: "Lịch sử thẻ",  icon: History },
      { screen: "card-groups"  as Screen, label: "Nhóm thẻ",     icon: Tag },
      { screen: "card-violation-rules" as Screen, label: "Thẻ vi phạm", icon: AlertTriangle },
    ],
  },
  {
    key: "customers" as SectionKey,
    label: "Quản lý khách hàng",
    icon: Users,
    items: [
      { screen: "customer-management" as Screen, label: "Danh sách KH", icon: UserCheck },
    ],
  },
  {
    key: "system" as SectionKey,
    label: "Hệ thống",
    icon: Shield,
    items: [
      { screen: "user-management"   as Screen, label: "Quản lý người dùng",  icon: UserCog },
      { screen: "staff-assignment"  as Screen, label: "Phân công nhân viên", icon: ClipboardList },
      { screen: "admin-floor-slot"  as Screen, label: "Quản lý slot",        icon: Layers },
      { screen: "admin-exceptions" as Screen, label: "Xử lý đơn", icon: AlertOctagon },
    ],
  },
];

function getDefaultOpen(screen: Screen): Set<SectionKey> {
  const open = new Set<SectionKey>();
  for (const sec of menuSections) {
    if (sec.items.some(i => i.screen === screen)) open.add(sec.key);
  }
  return open;
}

export default function Layout({ currentScreen, onNavigate, onLogout, children }: LayoutProps) {
  const [openSections, setOpenSections] = useState<Set<SectionKey>>(getDefaultOpen(currentScreen));

  const toggleSection = (key: SectionKey) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const breadcrumb = screenBreadcrumb[currentScreen] || "Dashboard";

  return (
    <div
      className="flex h-screen w-screen overflow-hidden bg-gray-100"
      style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
    >
      {/* Sidebar */}
      <aside className="w-[210px] flex-shrink-0 bg-[#1e293b] flex flex-col overflow-hidden">
        {/* Logo area */}
        <div className="flex items-center gap-2 px-4 py-4 border-b border-slate-700">
          <ParkingSquare className="w-7 h-7 text-sky-400 flex-shrink-0" />
          <div className="flex flex-col">
            <span className="text-white text-xs font-black tracking-wider uppercase leading-none">Parking</span>
            <span className="text-sky-400 text-[10px] uppercase tracking-widest font-semibold mt-1">System</span>
          </div>
        </div>

        {/* Menu list */}
        <nav className="flex-1 px-2 py-3 space-y-1.5 overflow-y-auto">
          {/* Dashboard item */}
          <button
            onClick={() => onNavigate("dashboard")}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded text-sm font-medium transition-all ${
              currentScreen === "dashboard"
                ? "bg-[#2563eb] text-white shadow-sm font-semibold"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <Home className="w-4 h-4 flex-shrink-0" />
            <span>Dashboard</span>
          </button>

          {menuSections.map(section => {
            const SectionIcon = section.icon;
            const isOpen = openSections.has(section.key);
            const anyActive = section.items.some(item => item.screen === currentScreen);

            return (
              <div key={section.key} className="space-y-0.5">
                <button
                  onClick={() => toggleSection(section.key)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded text-sm font-medium transition-all ${
                    anyActive
                      ? "text-white bg-slate-800/40"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <SectionIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{section.label}</span>
                  </div>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 transition-transform flex-shrink-0 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="pl-4 pr-1 py-0.5 space-y-0.5 border-l border-slate-700/60 ml-5">
                    {section.items.map(item => {
                      const ItemIcon = item.icon;
                      const active = currentScreen === item.screen;
                      return (
                        <button
                          key={item.screen}
                          onClick={() => onNavigate(item.screen)}
                          className={`w-full flex items-center gap-2 px-3 py-1.5 rounded text-xs transition-all ${
                            active
                              ? "bg-[#2563eb]/95 text-white font-semibold"
                              : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                          }`}
                        >
                          <ItemIcon className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Bottom Area */}
        <div className="p-2 border-t border-slate-700/80">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded text-sm text-red-300 hover:bg-red-900/30 hover:text-red-200 transition-colors"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-11 bg-[#dbeafe] border-b border-blue-200 flex items-center justify-between px-4 flex-shrink-0 shadow-sm">
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <span className="text-blue-600 hover:underline cursor-pointer">Trang chủ</span>
            <span className="text-gray-400">›</span>
            <span className="text-blue-600 hover:underline cursor-pointer">Web</span>
            {breadcrumb.split(" > ").map((part, i, arr) => (
              <span key={i} className="flex items-center gap-1">
                <span className="text-gray-400">›</span>
                <span className={i === arr.length - 1 ? "text-gray-700 font-medium" : "text-blue-600 hover:underline cursor-pointer"}>
                  {part}
                </span>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">A</div>
              <span className="text-xs text-gray-700">
                Xin chào, <span className="font-medium text-blue-700">Quản trị hệ thống</span>
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

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-3 bg-gray-100">
          {children}
        </main>
      </div>
    </div>
  );
}
