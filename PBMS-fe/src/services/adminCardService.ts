import { ApiResponse } from "./authService";
import { authFetch, safeJson } from "../utils/apiHelper";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1";

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

export interface CardGroupPayload {
  groupName: string;
  vehicleType: string;
  ticketType: string;
  basePrice: number;
  defaultDurationDays?: number;
  reservationAllowed: boolean;
  description?: string;
  status: string;
}

export interface CardHistoryDto {
  id: number;
  stt: number;
  thoiGian: string;
  cardNo: string;
  nhomThe: string;
  thaoTac: string;
  chuThe: string;
  bienSo: string;
  nguoiThaoTac: string;
}

export interface HistorySearchParams {
  keyword?: string;
  fromDate?: string;
  toDate?: string;
  hanhDong?: string;
  nguoiDung?: string;
  nhomThe?: string;
}

export const adminCardService = {
  async getAllCardGroups(): Promise<CardGroupDto[]> {
    const response = await authFetch(`${API_URL}/admin/card-groups`);
    const result: ApiResponse<CardGroupDto[]> = await safeJson(response);
    if (!response.ok) throw new Error(result.message || "Không thể tải danh sách nhóm thẻ.");
    return result.data;
  },

  async createCardGroup(payload: CardGroupPayload): Promise<CardGroupDto> {
    const response = await authFetch(`${API_URL}/admin/card-groups`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
    const result: ApiResponse<CardGroupDto> = await safeJson(response);
    if (!response.ok) throw new Error(result.message || "Tạo nhóm thẻ thất bại.");
    return result.data;
  },

  async updateCardGroup(id: number, payload: CardGroupPayload): Promise<CardGroupDto> {
    const response = await authFetch(`${API_URL}/admin/card-groups/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
    const result: ApiResponse<CardGroupDto> = await safeJson(response);
    if (!response.ok) throw new Error(result.message || "Cập nhật nhóm thẻ thất bại.");
    return result.data;
  },

  async deleteCardGroup(id: number): Promise<void> {
    const response = await authFetch(`${API_URL}/admin/card-groups/${id}`, {
      method: "DELETE"
    });
    if (!response.ok) {
      const result: ApiResponse<any> = await safeJson(response);
      throw new Error(result.message || "Xóa nhóm thẻ thất bại.");
    }
  },

  async getCardHistories(params: HistorySearchParams): Promise<CardHistoryDto[]> {
    const query = new URLSearchParams();
    if (params.keyword) query.append("keyword", params.keyword);
    if (params.fromDate) query.append("fromDate", params.fromDate);
    if (params.toDate) query.append("toDate", params.toDate);
    if (params.hanhDong) query.append("hanhDong", params.hanhDong);
    if (params.nguoiDung) query.append("nguoiDung", params.nguoiDung);
    if (params.nhomThe) query.append("nhomThe", params.nhomThe);
    const response = await authFetch(`${API_URL}/admin/card-histories?${query.toString()}`);
    const result: ApiResponse<CardHistoryDto[]> = await safeJson(response);
    if (!response.ok) throw new Error(result.message || "Không thể tải lịch sử thẻ.");
    return result.data;
  },

  async getUsers(): Promise<UserDto[]> {
    const response = await authFetch(`${API_URL}/admin/users`);
    const result: ApiResponse<UserDto[]> = await safeJson(response);
    if (!response.ok) throw new Error(result.message || "Không thể tải danh sách người dùng.");
    return result.data;
  },

  async createUser(payload: CreateUserPayload): Promise<UserDto> {
    const response = await authFetch(`${API_URL}/admin/users`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
    const result: ApiResponse<UserDto> = await safeJson(response);
    if (!response.ok) throw new Error(result.message || "Tạo người dùng thất bại.");
    return result.data;
  },

  async updateUser(id: number, payload: UpdateUserPayload): Promise<UserDto> {
    const response = await authFetch(`${API_URL}/admin/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
    const result: ApiResponse<UserDto> = await safeJson(response);
    if (!response.ok) throw new Error(result.message || "Cập nhật người dùng thất bại.");
    return result.data;
  },

  async deleteUser(id: number): Promise<UserDto> {
    const response = await authFetch(`${API_URL}/admin/users/${id}`, { method: "DELETE" });
    const result: ApiResponse<UserDto> = await safeJson(response);
    if (!response.ok) throw new Error(result.message || "Khóa tài khoản thất bại.");
    return result.data;
  },

  async getUserCards(userId: number): Promise<UserCardDto[]> {
    const response = await authFetch(`${API_URL}/admin/users/${userId}/cards`);
    const result: ApiResponse<UserCardDto[]> = await safeJson(response);
    if (!response.ok) throw new Error(result.message || "Không thể tải danh sách thẻ của người dùng.");
    return result.data;
  },

  async getVehicleReport(params: VehicleReportParams): Promise<VehicleReportDto[]> {
    const query = new URLSearchParams();
    query.append("tab", params.tab);
    if (params.keyword) query.append("keyword", params.keyword);
    if (params.fromDate) query.append("fromDate", params.fromDate);
    if (params.toDate) query.append("toDate", params.toDate);
    if (params.laneId) query.append("laneId", String(params.laneId));
    if (params.staffId) query.append("staffId", String(params.staffId));
    if (params.ticketType) query.append("ticketType", params.ticketType);
    const response = await authFetch(`${API_URL}/admin/reports/vehicle-entry-exit?${query.toString()}`);
    const result: ApiResponse<VehicleReportDto[]> = await safeJson(response);
    if (!response.ok) throw new Error(result.message || "Không thể tải báo cáo xe vào/ra.");
    return result.data;
  },

  async getMyRequests(): Promise<RequestSupportDto[]> {
    const response = await authFetch(`${API_URL}/support/my`);
    const result: ApiResponse<RequestSupportDto[]> = await safeJson(response);
    if (!response.ok) throw new Error(result.message || "Không thể tải danh sách yêu cầu.");
    return result.data;
  },

  async createSupportRequest(payload: { subject: string; description: string; requestType: string }): Promise<RequestSupportDto> {
    const response = await authFetch(`${API_URL}/support/my`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
    const result: ApiResponse<RequestSupportDto> = await safeJson(response);
    if (!response.ok) throw new Error(result.message || "Gửi yêu cầu thất bại.");
    return result.data;
  },

  async getAllRequests(): Promise<RequestSupportDto[]> {
    const response = await authFetch(`${API_URL}/admin/requests`);
    const result: ApiResponse<RequestSupportDto[]> = await safeJson(response);
    if (!response.ok) throw new Error(result.message || "Không thể tải danh sách yêu cầu.");
    return result.data;
  },

  async approveRequest(requestId: number, note: string): Promise<RequestSupportDto> {
    const response = await authFetch(`${API_URL}/admin/requests/${requestId}/approve?note=${encodeURIComponent(note)}`, {
      method: "POST"
    });
    const result: ApiResponse<RequestSupportDto> = await safeJson(response);
    if (!response.ok) throw new Error(result.message || "Duyệt yêu cầu thất bại.");
    return result.data;
  },

  async rejectRequest(requestId: number, note: string): Promise<RequestSupportDto> {
    const response = await authFetch(`${API_URL}/admin/requests/${requestId}/reject?note=${encodeURIComponent(note)}`, {
      method: "POST"
    });
    const result: ApiResponse<RequestSupportDto> = await safeJson(response);
    if (!response.ok) throw new Error(result.message || "Từ chối yêu cầu thất bại.");
    return result.data;
  },

  async assignRequestStaff(requestId: number, staffId: number): Promise<RequestSupportDto> {
    const response = await authFetch(`${API_URL}/admin/requests/${requestId}/assign?staffId=${staffId}`, {
      method: "POST"
    });
    const result: ApiResponse<RequestSupportDto> = await safeJson(response);
    if (!response.ok) throw new Error(result.message || "Phân công nhân viên thất bại.");
    return result.data;
  }
};

export interface UserDto {
  accountId: number;
  username: string;
  fullName: string;
  roleName: string;
  phone: string;
  email: string;
  status: string;
  createdAt: string;
  address?: string;
  cardCount?: number;
}

export interface CreateUserPayload {
  username: string;
  fullName: string;
  roleName: string;
  phone?: string;
  email?: string;
  password?: string;
  status: string;
  address?: string;
}

export interface UpdateUserPayload {
  fullName: string;
  roleName: string;
  phone?: string;
  email?: string;
  password?: string;
  status: string;
  address?: string;
}

export interface UserCardDto {
  cardId: number;
  cardNo: string;
  rfidUid: string;
  groupName: string;
  ticketType: string;
  plateNo: string;
  registeredAt: string;
  expireAt: string;
  status: string;
  note: string;
}

export interface VehicleReportParams {
  tab: "entry" | "exit";
  keyword?: string;
  fromDate?: string;
  toDate?: string;
  laneId?: number;
  staffId?: number;
  ticketType?: string;
}

export interface VehicleReportDto {
  parkingSessionId: number;
  parkingSessionNo: string;
  cardNo: string;
  rfidUid: string;
  plateNo: string;
  floorName: string;
  checkInAt: string;
  checkOutAt?: string;
  feeAmount: number;
  groupName: string;
  customerName: string;
  entryLaneName: string;
  exitLaneName?: string;
  entryStaffName: string;
  exitStaffName?: string;
  entryImage?: string;
  exitImage?: string;
}

export interface RequestSupportDto {
  requestId: number;
  requestNo: string;
  requestType: string;
  senderAccountId: number;
  senderName: string;
  senderRole: string;
  assignedStaffId: number | null;
  assignedStaffName: string | null;
  subject: string;
  description: string;
  evidenceUrl: string | null;
  priority: string;
  status: string;
  adminNote: string | null;
  createdAt: string;
  processingAt: string | null;
  resolvedAt: string | null;
}
