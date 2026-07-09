import { UserRole } from "../app/components/Login";
import { safeJson, authFetch } from "../utils/apiHelper";

export interface LoginResponseData {
  accessToken: string;
  tokenType: string;
  expiresInMs: number;
  accountId: number;
  username: string;
  fullName: string;
  role: string; // "admin" | "staff" | "user" or capitalized, backend sends lowercase
}

export interface ApiResponse<T> {
  status: number;
  message: string;
  data: T;
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5173/api/v1";

export const authService = {
  async login(username: string, password: string, remember = false): Promise<{ role: UserRole; name: string }> {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    const result: ApiResponse<LoginResponseData> = await safeJson(response);

    if (!response.ok) {
      throw new Error(result.message || "Tên đăng nhập hoặc mật khẩu không đúng.");
    }

    const { data } = result;
    const userRole = data.role.toLowerCase();
    const isRemember = remember || userRole === "admin";

    // Clear stale tokens from both storages (sessionStorage is legacy but good to clear)
    ["authToken", "userRole", "userName", "username", "tokenExpiry"].forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });

    // Calculate absolute expiry timestamp
    const expiryAt = Date.now() + data.expiresInMs;

    // Always store in localStorage to share session across all tabs
    localStorage.setItem("authToken", data.accessToken);
    localStorage.setItem("userRole", userRole);
    localStorage.setItem("userName", data.fullName);
    localStorage.setItem("username", data.username);
    localStorage.setItem("tokenExpiry", String(expiryAt));

    return {
      role: userRole as UserRole,
      name: data.fullName,
    };
  },

  logout(): void {
    ["authToken", "userRole", "userName", "username", "tokenExpiry"].forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
  },

  getCurrentUser(): { role: UserRole; name: string } | null {
    const token = this.getToken();
    const role = this.getStoredValue("userRole");
    const name = this.getStoredValue("userName");

    if (token && role && name) {
      return {
        role: role as UserRole,
        name: name,
      };
    }
    return null;
  },

  getToken(): string | null {
    const token = this.getStoredValue("authToken");
    if (!token) return null;

    // Check expiry
    const expiryStr = this.getStoredValue("tokenExpiry");
    if (expiryStr) {
      const expiry = parseInt(expiryStr, 10);
      if (Date.now() >= expiry) {
        // Token expired — clean up and signal session expiry
        this.logout();
        window.dispatchEvent(new Event("session:expired"));
        return null;
      }
    }

    return token;
  },

  getUsername(): string | null {
    return this.getStoredValue("username");
  },

  getStoredValue(key: string): string | null {
    // Prefer localStorage which is synced across tabs
    return localStorage.getItem(key) || sessionStorage.getItem(key);
  },

  async getProfile(): Promise<UserProfile> {
    const response = await authFetch(`${API_URL}/profile`);
    const result: ApiResponse<UserProfile> = await safeJson(response);
    if (!response.ok) throw new Error(result.message || "Không thể tải thông tin hồ sơ.");
    return result.data;
  },

  async updateProfile(payload: {
    fullName: string;
    email: string;
    phone: string;
    address?: string;
    newPassword?: string;
    oldPassword?: string;
  }): Promise<UserProfile> {
    const response = await authFetch(`${API_URL}/profile`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
    const result: ApiResponse<UserProfile> = await safeJson(response);
    if (!response.ok) throw new Error(result.message || "Không thể cập nhật hồ sơ.");
    return result.data;
  },

  async confirmPassword(password: string): Promise<void> {
    const response = await authFetch(`${API_URL}/profile/confirm-password`, {
      method: "POST",
      body: JSON.stringify({ password })
    });
    const result: ApiResponse<null> = await safeJson(response);
    if (!response.ok) throw new Error(result.message || "Mật khẩu hiện tại không chính xác.");
  },

  async register(payload: any): Promise<void> {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result: ApiResponse<any> = await safeJson(response);
    if (!response.ok) {
      throw new Error(result.message || "Có lỗi xảy ra khi đăng ký.");
    }
  },

  async verifyEmail(token: string): Promise<void> {
    const response = await fetch(`${API_URL}/auth/verify-email?token=${encodeURIComponent(token)}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const result: ApiResponse<any> = await safeJson(response);
    if (!response.ok) {
      throw new Error(result.message || "Xác thực email thất bại.");
    }
  },

  async forgotPassword(email: string): Promise<void> {
    const response = await fetch(`${API_URL}/auth/forgot-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    const result: ApiResponse<any> = await safeJson(response);
    if (!response.ok) {
      throw new Error(result.message || "Có lỗi xảy ra.");
    }
  },

  async resetPassword(payload: any): Promise<void> {
    const response = await fetch(`${API_URL}/auth/reset-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result: ApiResponse<any> = await safeJson(response);
    if (!response.ok) {
      throw new Error(result.message || "Đặt lại mật khẩu thất bại.");
    }
  }
};

export interface UserProfile {
  accountId: number;
  username: string;
  fullName: string;
  role: string;
  status: string;
  email: string;
  phone: string;
  address?: string;
  shift?: string;
  staffCode?: string;
  createdAt: string;
}
