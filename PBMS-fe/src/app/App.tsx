import { useState } from "react";
import Login, { UserRole } from "./components/Login";
import Layout, { Screen } from "./components/Layout";
import { authService } from "../services/authService";
import Dashboard from "./components/Dashboard";
import VehicleEntryExit from "./components/reports/VehicleEntryExit";
import AlertEvents from "./components/reports/AlertEvents";
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

/* MARKER-MAKE-KIT-INVOKED */

function renderScreen(screen: Screen, adminName: string) {
  switch (screen) {
    case "dashboard":            return <Dashboard adminName={adminName} />;
    case "vehicle-entry-exit":   return <VehicleEntryExit />;
    case "alert-events":         return <AlertEvents />;
    case "card-history":         return <CardProcessing />;
    case "customer-management":  return <CustomerManagement />;
    case "card-groups":          return <CardGroups />;
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

  const handleLogout = () => {
    authService.logout();
    setAuth(null);
  };

  if (!auth) {
    return <Login onLogin={(role, name) => setAuth({ role, name })} />;
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
