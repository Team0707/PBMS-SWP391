import { useState, useRef, useEffect } from "react";
import {
  Home,
  CreditCard,
  LogOut,
  ParkingSquare,
  Bell,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  XCircle,
  Info,
  AlertTriangle,
  LifeBuoy,
} from "lucide-react";

export type UserScreen =
  | "dashboard"
  | "monthly-cards"
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
    screen: "support",
    label: "Hỗ trợ",
    icon: LifeBuoy,
  },
];

const breadcrumbMap: Record<UserScreen, string> = {
  dashboard: "Hồ sơ của tôi",
  "monthly-cards": "Thẻ của tôi",
  support: "Hỗ trợ",
};

interface Notif {
  id: number;
  icon: React.FC<{ className?: string }>;
  iconColor: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
}

const SAMPLE_NOTIFS: Notif[] = [
  { id: 1, icon: CheckCircle,   iconColor: "text-green-500",  title: "Đặt chỗ thành công",         body: "Slot B1-A01 ngày 2026-06-13 đã được xác nhận.",   time: "08:05",  read: false },
  { id: 2, icon: AlertTriangle, iconColor: "text-orange-500", title: "Reassignment Required",       body: "Slot B2-A02 của bạn cần phân công lại.",          time: "09:20",  read: false },
  { id: 3, icon: XCircle,       iconColor: "text-red-500",    title: "Hủy bởi hệ thống",            body: "Đặt chỗ RES-003 đã bị hủy tự động (no-show).",    time: "Hôm qua", read: true },
  { id: 4, icon: Info,          iconColor: "text-blue-500",   title: "Kết quả khiếu nại",            body: "Khiếu nại PEN-003 đã được chấp nhận – Waived.",   time: "11/6",    read: true },
  { id: 5, icon: AlertCircle,   iconColor: "text-amber-500",  title: "Vi phạm mới",                  body: "Bạn có vi phạm mới PEN-005: Overtime 150.000đ.",  time: "10/6",    read: true },
  { id: 6, icon: CheckCircle,   iconColor: "text-teal-500",   title: "Hoàn tiền đang xử lý",         body: "Yêu cầu hoàn tiền REQ-007 đang được xử lý.",     time: "9/6",     read: true },
];

export default function UserLayout({ currentScreen, onNavigate, onLogout, children, userName = "Người dùng" }: UserLayoutProps) {
  const initials = userName.split(" ").map(w => w[0]).slice(-2).join("").toUpperCase();
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>(SAMPLE_NOTIFS);
  const notifRef = useRef<HTMLDivElement>(null);

  const unread = notifs.filter(n => !n.read).length;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const markAllRead = () => setNotifs(prev => prev.map(n => ({ ...n, read: true })));

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <aside className="w-[210px] flex-shrink-0 bg-[#1a3560] flex flex-col overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-4 border-b border-blue-900/60">
          <ParkingSquare className="w-7 h-7 text-sky-300 flex-shrink-0" />
          <div>
            <div className="text-white text-xs font-bold leading-tight tracking-wide">PARKING</div>
            <div className="text-sky-300 text-[10px] leading-tight tracking-widest">MEMBER PORTAL</div>
          </div>
        </div>
        <div className="px-4 py-3 border-b border-blue-900/40 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">{initials}</div>
          <div className="min-w-0">
            <div className="text-white text-xs font-medium truncate">{userName}</div>
            <div className="text-blue-300 text-[10px]">Thành viên</div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentScreen === item.screen;
            return (
              <button key={item.screen} onClick={() => onNavigate(item.screen)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded text-sm transition-colors ${isActive ? "bg-emerald-500 text-white font-medium" : "text-blue-200 hover:bg-blue-800/50 hover:text-white"}`}>
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
            {/* Bell + Notification Dropdown */}
            <div className="relative" ref={notifRef}>
              <button onClick={() => setNotifOpen(o => !o)} className="relative text-gray-500 hover:text-gray-700">
                <Bell className="w-4 h-4" />
                {unread > 0 && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center">{unread}</span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-7 w-80 bg-white border border-gray-200 rounded-lg shadow-xl z-50">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
                    <span className="text-sm font-semibold text-gray-700">Thông báo</span>
                    <button onClick={markAllRead} className="text-xs text-blue-600 hover:underline">Đánh dấu tất cả đã đọc</button>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifs.map(n => {
                      const Icon = n.icon;
                      return (
                        <div key={n.id} className={`flex gap-2.5 px-3 py-2.5 border-b border-gray-50 hover:bg-gray-50 cursor-pointer ${!n.read ? "bg-blue-50/40" : ""}`}>
                          <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${n.iconColor}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between gap-1">
                              <span className={`text-xs font-medium truncate ${!n.read ? "text-gray-800" : "text-gray-600"}`}>{n.title}</span>
                              <span className="text-[10px] text-gray-400 flex-shrink-0">{n.time}</span>
                            </div>
                            <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">{n.body}</p>
                          </div>
                          {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
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
