import { UserRole } from "../app/components/Login";
import { safeJson } from "../utils/apiHelper";

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

const API_URL = import.meta.env.VITE_API_URL || "http://192.168.1.17:8080/api/v1";

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
    const storage = remember ? localStorage : sessionStorage;

    // Ensure we do not keep a stale token/username in the other storage.
    localStorage.removeItem("authToken");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userName");
    localStorage.removeItem("username");
    sessionStorage.removeItem("authToken");
    sessionStorage.removeItem("userRole");
    sessionStorage.removeItem("userName");
    sessionStorage.removeItem("username");

    storage.setItem("authToken", data.accessToken);
    storage.setItem("userRole", data.role.toLowerCase());
    storage.setItem("userName", data.fullName);
    storage.setItem("username", data.username);

    return {
      role: data.role.toLowerCase() as UserRole,
      name: data.fullName,
    };
  },

  logout(): void {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userName");
    localStorage.removeItem("username");

    sessionStorage.removeItem("authToken");
    sessionStorage.removeItem("userRole");
    sessionStorage.removeItem("userName");
    sessionStorage.removeItem("username");
  },

  getCurrentUser(): { role: UserRole; name: string } | null {
    const token = this.getStoredValue("authToken");
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
    return this.getStoredValue("authToken");
  },

  getUsername(): string | null {
    return this.getStoredValue("username");
  },

  getStoredValue(key: string): string | null {
    return sessionStorage.getItem(key) ?? localStorage.getItem(key);
  },

  async getProfile(): Promise<UserProfile> {
    const token = this.getToken();
    const response = await fetch(`${API_URL}/profile`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      }
    });

    const result: ApiResponse<UserProfile> = await safeJson(response);
    if (!response.ok) {
      throw new Error(result.message || "Không thể tải thông tin hồ sơ.");
    }
    return result.data;
  },

  async updateProfile(payload: {
    fullName: string;
    email: string;
    phone: string;
    address?: string;
    newPassword?: string;
  }): Promise<UserProfile> {
    const token = this.getToken();
    const response = await fetch(`${API_URL}/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const result: ApiResponse<UserProfile> = await safeJson(response);
    if (!response.ok) {
      throw new Error(result.message || "Không thể cập nhật hồ sơ.");
    }
    return result.data;
  },

  async confirmPassword(password: string): Promise<void> {
    const token = this.getToken();
    const response = await fetch(`${API_URL}/profile/confirm-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ password })
    });

    const result: ApiResponse<null> = await safeJson(response);
    if (!response.ok) {
      throw new Error(result.message || "Mat khau hien tai khong chinh xac.");
    }
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
