import { authService, ApiResponse } from "./authService";
import { safeJson } from "../utils/apiHelper";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5173/api/v1";

export interface MonthlyCardDto {
  id: number;
  cardNo: string;
  nhomThe: string;
  loaiXe: string;
  bienSo: string;
  ngayDangKy: string;
  ngayHetHan: string;
  tangGuiXe?: string;
  trangThai: "Hoạt động" | "Hết hạn" | "Sắp hết hạn";
  soNgayConLai: number;
  checkoutUrl?: string;
  qrCode?: string;
  orderCode?: number;
}

export interface RegisterCardRequest {
  nhomThe: string;
  bienSo: string;
  tangGuiXe?: string;
  duration: number;
  amount: number;
  startDate: string;
}

export interface RenewCardRequest {
  cardId: number;
  newExpiry: string;
  duration: number;
  amount: number;
}

export interface CardGroupDto {
  cardGroupId: number;
  groupName: string;
  vehicleType: string;
  ticketType: string;
  basePrice: number;
  defaultDurationDays?: number;
  reservationAllowed: boolean;
  description?: string;
  status: string;
}

export const cardService = {
  async getMyCards(): Promise<MonthlyCardDto[]> {
    const token = authService.getToken();
    const response = await fetch(`${API_URL}/user/monthly-cards`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      }
    });

    const result: ApiResponse<MonthlyCardDto[]> = await safeJson(response);
    if (!response.ok) {
      throw new Error(result.message || "Không thể tải danh sách thẻ.");
    }
    return result.data;
  },

  async registerCard(payload: RegisterCardRequest): Promise<MonthlyCardDto> {
    const token = authService.getToken();
    const response = await fetch(`${API_URL}/user/monthly-cards`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const result: ApiResponse<MonthlyCardDto> = await safeJson(response);
    if (!response.ok) {
      throw new Error(result.message || "Đăng ký thẻ thất bại.");
    }
    return result.data;
  },

  async renewCard(payload: RenewCardRequest): Promise<MonthlyCardDto> {
    const token = authService.getToken();
    const response = await fetch(`${API_URL}/user/monthly-cards/renew`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const result: ApiResponse<MonthlyCardDto> = await safeJson(response);
    if (!response.ok) {
      throw new Error(result.message || "Gia hạn thẻ thất bại.");
    }
    return result.data;
  },

  async getActiveCardGroups(): Promise<CardGroupDto[]> {
    const token = authService.getToken();
    const response = await fetch(`${API_URL}/user/monthly-cards/groups`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      }
    });

    const result: ApiResponse<CardGroupDto[]> = await safeJson(response);
    if (!response.ok) {
      throw new Error(result.message || "Không thể tải danh sách nhóm thẻ.");
    }
    return result.data;
  },

  async cancelPayment(orderCode: number, reason?: string): Promise<void> {
    const token = authService.getToken();
    const response = await fetch(`${API_URL}/payments/cancel/${orderCode}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ reason: reason || "Người dùng chủ động hủy trên giao diện" })
    });

    const result: ApiResponse<any> = await safeJson(response);
    if (!response.ok) {
      throw new Error(result.message || "Không thể hủy thanh toán.");
    }
  },

  async checkPaymentStatus(orderCode: number): Promise<any> {
    const token = authService.getToken();
    const response = await fetch(`${API_URL}/payments/status/${orderCode}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      }
    });

    const result: ApiResponse<any> = await safeJson(response);
    if (!response.ok) {
      throw new Error(result.message || "Lỗi kiểm tra trạng thái thanh toán.");
    }
    return result.data;
  },

  async mockPaymentSuccess(orderCode: number): Promise<void> {
    const token = authService.getToken();
    const response = await fetch(`${API_URL}/payments/mock-success/${orderCode}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      }
    });

    const result: ApiResponse<any> = await safeJson(response);
    if (!response.ok) {
      throw new Error(result.message || "Lỗi khi giả lập thanh toán.");
    }
  }
};
