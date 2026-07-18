import { ApiResponse } from "./authService";
import { authFetch, safeJson } from "../utils/apiHelper";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5173/api/v1";


export interface FloorDto {
  floorId: number;
  floorCode: string;
  floorName: string;
  vehicleType: string;
  totalSlots: number;
  note?: string;
  status: string;
}

export interface StaffCheckInRequest {
  plateNo: string;
  vehicleType: string;
  isPreBooked: boolean;
  preBookedCode?: string;
  floorCode: string;
  entryImage?: string;
  cardBarcode?: string;
}

export interface StaffCheckOutRequest {
  parkingSessionNoOrQrToken: string;
  floorCode?: string;
  paymentMethod?: "CASH" | "VNPAY";
  exitImage?: string;
  exitPlate?: string;
}

export interface StaffTicketResponse {
  parkingSessionId: number;
  parkingSessionNo: string;
  qrToken: string;
  ticketType: string;
  vehicleType: string;
  plateNoSnapshot: string;
  entryFloorCode: string;
  entryStaffName: string;
  exitStaffName?: string;
  checkInAt: string;
  checkOutAt?: string;
  feeAmount: number;
  status: string;
  message?: string;
  violationReason?: string;
  entryImage?: string;
  exitImage?: string;
}

export interface SlotDto {
  slotId: number;
  slotCode: string;
  floorId: number;
  floorCode: string;
  floorName: string;
  zoneId: number;
  zoneCode: string;
  zoneName: string;
  slotNumber: number;
  vehicleType: "MOTORCYCLE" | "CAR";
  status: "AVAILABLE" | "RESERVED" | "OCCUPIED" | "MAINTENANCE" | "DISABLED";
  disabledReason?: string;
  lastUpdatedAt: string;
}

export interface FloorStatDto {
  floorId: number;
  floorCode: string;
  floorName: string;
  totalCarSlots: number;
  availableCarSlots: number;
  occupiedCarSlots: number;
  monthlyCarInside: number;
  totalMotorcycleSlots: number;
  availableMotorcycleSlots: number;
  occupiedMotorcycleSlots: number;
  monthlyMotorcycleInside: number;
}

export interface SlotStatsResponse {
  totalCarSlots: number;
  totalMotorcycleSlots: number;
  monthlyCarInside: number;
  monthlyMotorcycleInside: number;
  floorStats: FloorStatDto[];
}

export interface ZoneDto {
  zoneId: number;
  floorId: number;
  zoneCode: string;
  zoneName?: string;
  status: string;
}

export interface TransactionDto {
  id: number;
  maVe: string;
  bienSo: string;
  loaiXe: string;
  loaiVe: string;
  tgVao: string;
  tgRa?: string;
  phi: number;
  nhanVien: string;
  trangThai: string;
  entryImage?: string;
  exitImage?: string;
}

export interface WorkShiftDto {
  shiftId: number;
  shiftCode: string;
  shiftName: string;
  startTime: string;
  endTime: string;
  status: string;
}

export interface StaffAssignmentDto {
  assignmentId: number;
  workDate: string;
  shiftId: number;
  shiftCode: string;
  shiftName: string;
  shiftTime: string;
  floorId: number;
  floorCode: string;
  floorName: string;
  staffId: number | null;
  staffCode: string;
  staffName: string;
  status: "ASSIGNED" | "ON_DUTY" | "COMPLETED" | "CANCELLED";
  note: string;
  assignedAt: string;
}

export interface CreateAssignmentRequest {
  workDate: string;
  shiftId: number;
  floorId: number;
  staffId: number;
  note?: string;
}

export interface ReassignStaffRequest {
  staffId: number;
  note: string;
}

export interface StaffMinimalDto {
  staffId: number;
  accountId: number;
  fullName: string;
  email: string;
  phone: string;
  shift: string;
  status: string;
  staffCode: string;
}

export const staffService = {

  async getFloors(): Promise<FloorDto[]> {
    const response = await authFetch(`${API_URL}/staff/floors`);
    const result: ApiResponse<FloorDto[]> = await safeJson(response);
    if (!response.ok) throw new Error(result.message || "Không thể tải danh sách tầng.");
    return result.data;
  },

  async checkIn(payload: StaffCheckInRequest): Promise<StaffTicketResponse> {
    const response = await authFetch(`${API_URL}/staff/check-in`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
    const result: ApiResponse<StaffTicketResponse> = await safeJson(response);
    if (!response.ok) throw new Error(result.message || "Quét xe vào thất bại.");
    return result.data;
  },

  async checkOut(payload: StaffCheckOutRequest): Promise<StaffTicketResponse> {
    const response = await authFetch(`${API_URL}/staff/check-out`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
    const result: ApiResponse<StaffTicketResponse> = await safeJson(response);
    if (!response.ok) throw new Error(result.message || "Quét xe ra thất bại.");
    return result.data;
  },

  async previewCheckOut(parkingSessionNoOrQrToken: string): Promise<StaffTicketResponse> {
    const response = await authFetch(`${API_URL}/staff/check-out-preview?parkingSessionNoOrQrToken=${encodeURIComponent(parkingSessionNoOrQrToken)}`);
    const result: ApiResponse<StaffTicketResponse> = await safeJson(response);
    if (!response.ok) throw new Error(result.message || "Xem trước thông tin xe ra thất bại.");
    return result.data;
  },

  async getTransactions(): Promise<TransactionDto[]> {
    const response = await authFetch(`${API_URL}/staff/transactions`);
    const result: ApiResponse<TransactionDto[]> = await safeJson(response);
    if (!response.ok) throw new Error(result.message || "Không thể tải lịch sử giao dịch.");
    return result.data;
  },

  async getSlots(floorId?: number, zoneId?: number, status?: string): Promise<SlotDto[]> {
    const query = new URLSearchParams();
    if (floorId) query.append("floorId", String(floorId));
    if (zoneId) query.append("zoneId", String(zoneId));
    if (status) query.append("status", status);
    const response = await authFetch(`${API_URL}/slots?${query.toString()}`);
    const result: ApiResponse<SlotDto[]> = await safeJson(response);
    if (!response.ok) throw new Error(result.message || "Không thể tải danh sách slot đỗ xe.");
    return result.data;
  },

  async getZones(floorId?: number): Promise<ZoneDto[]> {
    const query = new URLSearchParams();
    if (floorId) query.append("floorId", String(floorId));
    const response = await authFetch(`${API_URL}/slots/zones?${query.toString()}`);
    const result: ApiResponse<ZoneDto[]> = await safeJson(response);
    if (!response.ok) throw new Error(result.message || "Không thể tải danh sách zone đỗ xe.");
    return result.data;
  },

  async updateSlotStatus(slotId: number, payload: { status: string; disabledReason?: string }): Promise<SlotDto> {
    const response = await authFetch(`${API_URL}/slots/${slotId}/status`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
    const result: ApiResponse<SlotDto> = await safeJson(response);
    if (!response.ok) throw new Error(result.message || "Cập nhật trạng thái slot đỗ xe thất bại.");
    return result.data;
  },

  async getSlotStatistics(date?: string): Promise<SlotStatsResponse> {
    const query = new URLSearchParams();
    if (date) query.append("date", date);
    const response = await authFetch(`${API_URL}/slots/statistics?${query.toString()}`);
    const result: ApiResponse<SlotStatsResponse> = await safeJson(response);
    if (!response.ok) throw new Error(result.message || "Không thể tải thống kê slot đỗ xe.");
    return result.data;
  },

  async getAssignments(date?: string): Promise<StaffAssignmentDto[]> {
    const query = new URLSearchParams();
    if (date) query.append("date", date);
    const response = await authFetch(`${API_URL}/assignments?${query.toString()}`);
    const result: ApiResponse<StaffAssignmentDto[]> = await safeJson(response);
    if (!response.ok) throw new Error(result.message || "Không thể tải danh sách phân công.");
    return result.data;
  },

  async createAssignment(payload: CreateAssignmentRequest): Promise<StaffAssignmentDto> {
    const response = await authFetch(`${API_URL}/assignments`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
    const result: ApiResponse<StaffAssignmentDto> = await safeJson(response);
    if (!response.ok) throw new Error(result.message || "Tạo phân công nhân viên thất bại.");
    return result.data;
  },

  async reassignStaff(assignmentId: number, payload: ReassignStaffRequest): Promise<StaffAssignmentDto> {
    const response = await authFetch(`${API_URL}/assignments/${assignmentId}/staff`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
    const result: ApiResponse<StaffAssignmentDto> = await safeJson(response);
    if (!response.ok) throw new Error(result.message || "Đổi nhân viên thất bại.");
    return result.data;
  },

  async cancelAssignment(assignmentId: number): Promise<StaffAssignmentDto> {
    const response = await authFetch(`${API_URL}/assignments/${assignmentId}/cancel`, {
      method: "PUT"
    });
    const result: ApiResponse<StaffAssignmentDto> = await safeJson(response);
    if (!response.ok) throw new Error(result.message || "Hủy phân công thất bại.");
    return result.data;
  },

  async getActiveStaffList(): Promise<StaffMinimalDto[]> {
    const response = await authFetch(`${API_URL}/assignments/staff-list`);
    const result: ApiResponse<StaffMinimalDto[]> = await safeJson(response);
    if (!response.ok) throw new Error(result.message || "Không thể tải danh sách nhân viên.");
    return result.data;
  },

  async getShifts(): Promise<WorkShiftDto[]> {
    const response = await authFetch(`${API_URL}/assignments/shifts`);
    const result: ApiResponse<WorkShiftDto[]> = await safeJson(response);
    if (!response.ok) throw new Error(result.message || "Không thể tải danh sách ca trực.");
    return result.data;
  },

  async getActiveAssignment(): Promise<StaffAssignmentDto | null> {
    const response = await authFetch(`${API_URL}/staff/active-assignment`);
    const result: ApiResponse<StaffAssignmentDto | null> = await safeJson(response);
    if (!response.ok) throw new Error(result.message || "Không thể tải thông tin ca trực của bạn.");
    return result.data;
  },

  async checkPaymentStatus(ticketId: number): Promise<string> {
    const response = await authFetch(`${API_URL}/payments/check-status/${ticketId}`);
    const result: ApiResponse<string> = await safeJson(response);
    if (!response.ok) throw new Error(result.message || "Không thể kiểm tra trạng thái thanh toán.");
    return result.data;
  },

  async getPreBookedDetails(code: string): Promise<{ plate: string; type: string; status: string }> {
    const response = await authFetch(`${API_URL}/staff/prebooked/${code}`);
    const result: ApiResponse<{ plate: string; type: string; status: string }> = await safeJson(response);
    if (!response.ok) throw new Error(result.message || "Không thể tải thông tin thẻ/đặt trước.");
    return result.data;
  },

  async getCardInfo(cardNo: string): Promise<{ plateNumber: string; vehicleType: string; status: string }> {
    const response = await authFetch(`${API_URL}/staff/cards/${encodeURIComponent(cardNo)}`);
    const result: ApiResponse<{ plateNumber: string; vehicleType: string; status: string }> = await safeJson(response);
    if (!response.ok) throw new Error(result.message || "Không thể tải thông tin thẻ tháng.");
    return result.data;
  }
};
