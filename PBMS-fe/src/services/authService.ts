import { UserRole } from "../app/components/Login";

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

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1";

export const authService = {
  async login(username: string, password: string): Promise<{ role: UserRole; name: string }> {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    const result: ApiResponse<LoginResponseData> = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Tên đăng nhập hoặc mật khẩu không đúng.");
    }

    const { data } = result;
    
    // Store in localStorage
    localStorage.setItem("authToken", data.accessToken);
    localStorage.setItem("userRole", data.role.toLowerCase());
    localStorage.setItem("userName", data.fullName);
    localStorage.setItem("username", data.username);

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
  },

  getCurrentUser(): { role: UserRole; name: string } | null {
    const token = localStorage.getItem("authToken");
    const role = localStorage.getItem("userRole");
    const name = localStorage.getItem("userName");

    if (token && role && name) {
      return {
        role: role as UserRole,
        name: name,
      };
    }
    return null;
  },

  getToken(): string | null {
    return localStorage.getItem("authToken");
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

    const result: ApiResponse<UserProfile> = await response.json();
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

    const result: ApiResponse<UserProfile> = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "Không thể cập nhật hồ sơ.");
    }
    return result.data;
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
  createdAt: string;
}
