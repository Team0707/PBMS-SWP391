import { useState, useEffect } from "react";
import Login, { UserRole } from "./components/Login";
import Layout, { Screen } from "./components/Layout";
import { authService } from "../services/authService";
import Dashboard from "./components/Dashboard";
import VehicleEntryExit from "./components/reports/VehicleEntryExit";
import CardProcessing from "./components/reports/CardProcessing";
import CustomerManagement from "./components/customers/CustomerManagement";
import CardGroups from "./components/catalog/CardGroups";
import UserManagement from "./components/system/UserManagement";
import StaffAssignment from "./components/system/StaffAssignment";
import PlaceholderScreen from "./components/PlaceholderScreen";
import StaffApp from "./components/staff/StaffApp";
import UserApp from "./components/user/UserApp";

import AdminFloorSlot from "./components/admin/AdminFloorSlot";
import AdminExceptions from "./components/admin/AdminExceptions";
import CardViolationRules from "./components/admin/CardViolationRules";

/* MARKER-MAKE-KIT-INVOKED */

function renderScreen(screen: Screen, adminName: string) {
  switch (screen) {
    case "dashboard":            return <Dashboard adminName={adminName} />;
    case "vehicle-entry-exit":   return <VehicleEntryExit />;
    case "card-history":         return <CardProcessing />;
    case "customer-management":  return <CustomerManagement />;
    case "card-groups":          return <CardGroups />;
    case "card-violation-rules": return <CardViolationRules />;
    case "user-management":      return <UserManagement />;
    case "staff-assignment":     return <StaffAssignment />;
    case "admin-floor-slot":     return <AdminFloorSlot />;
    case "admin-exceptions":     return <AdminExceptions />;
    default:                     return <PlaceholderScreen title={screen} />;
  }
}

interface AuthState {
  role: UserRole;
  name: string;
}

export default function App() {
  const [auth, setAuth] = useState<AuthState | null>(() => {
    return authService.getCurrentUser();
  });
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [verifyStatus, setVerifyStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [sessionExpiredMsg, setSessionExpiredMsg] = useState<string | null>(null);

  // Listen for session expiry (token expired or 401 from any API)
  useEffect(() => {
    const handleSessionExpired = () => {
      setAuth(null);
      setSessionExpiredMsg("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
    };
    window.addEventListener("session:expired", handleSessionExpired);
    return () => window.removeEventListener("session:expired", handleSessionExpired);
  }, []);


  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verifyTokenParam = params.get("verifyToken");
    const resetTokenParam = params.get("resetToken");

    if (verifyTokenParam) {
      window.history.replaceState({}, document.title, window.location.pathname);
      authService.verifyEmail(verifyTokenParam)
        .then(() => {
          setVerifyStatus({
            success: true,
            message: "Xác thực tài khoản thành công! Bạn có thể đăng nhập ngay bây giờ."
          });
        })
        .catch((err) => {
          setVerifyStatus({
            success: false,
            message: err.message || "Xác thực email thất bại hoặc liên kết đã hết hạn."
          });
        });
    } else if (resetTokenParam) {
      window.history.replaceState({}, document.title, window.location.pathname);
      setResetToken(resetTokenParam);
    }
  }, []);

  const handleLogout = () => {
    authService.logout();
    setAuth(null);
  };

  if (!auth) {
    return (
      <Login
        onLogin={(role, name) => { setAuth({ role, name }); setSessionExpiredMsg(null); }}
        initialVerifyStatus={sessionExpiredMsg ? { success: false, message: sessionExpiredMsg } : verifyStatus}
        initialResetToken={resetToken}
        onClearVerifyStatus={() => { setVerifyStatus(null); setSessionExpiredMsg(null); }}
        onClearResetToken={() => setResetToken(null)}
      />
    );
  }

  if (auth.role === "staff") {
    return <StaffApp staffName={auth.name} onLogout={handleLogout} />;
  }

  if (auth.role === "user") {
    return <UserApp userName={auth.name} onLogout={handleLogout} />;
  }

  return (
    <Layout currentScreen={screen} onNavigate={setScreen} onLogout={handleLogout}>
      {renderScreen(screen, auth.name)}
    </Layout>
  );
}
