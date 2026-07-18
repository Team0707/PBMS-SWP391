/**
 * ============================================================================
 * HỆ THỐNG QUẢN LÝ BÃI XE THÔNG MINH (PBMS - Parking Building Management System)
 * ============================================================================
 * File: adminCardService.ts
 * Đường dẫn: /src/services/adminCardService.ts
 *
 * VAI TRÒ & CHỨC NĂNG CHÍNH:
 * - Đây là tầng cung cấp dịch vụ (Service Layer) dành riêng cho vai trò Quản trị viên (Admin)
 *   và Nhân viên hệ thống (Staff) trong dự án SWP391.
 * - Quản lý toàn bộ vòng đời của Thẻ giữ xe (Cards) và Nhóm thẻ giữ xe (Card Groups).
 * - Cung cấp các API truy vấn lịch sử thao tác thẻ (Card History) nhằm phục vụ mục đích kiểm toán.
 * - Quản lý tài khoản Người dùng (Users/Customers) đăng ký sử dụng dịch vụ gửi xe tại hệ thống bãi đỗ.
 * - Truy vấn và xuất báo cáo lưu lượng xe vào/ra (Vehicle Entry & Exit Reports).
 * - Quản lý và xử lý các yêu cầu hỗ trợ (Support Requests) từ khách hàng gửi tới ban quản lý bãi xe.
 *
 * CÔNG NGHỆ & THƯ VIỆN SỬ DỤNG:
 * - TypeScript: Định nghĩa chặt chẽ các kiểu dữ liệu DTO (Data Transfer Object) và Payload.
 * - Fetch API: Được bọc qua hàm trợ giúp `authFetch` để tự động đính kèm JWT Token vào header.
 * - API Helper: Sử dụng `safeJson` để xử lý an toàn dữ liệu JSON trả về từ phía Backend.
 *
 * TÁC GIẢ: Antigravity Developer
 * NGÀY KHỞI TẠO: 2026-07-18
 * ============================================================================
 */

import { ApiResponse } from "./authService";
import { authFetch, safeJson } from "../utils/apiHelper";

/**
 * Đường dẫn cơ sở (Base URL) của API Backend.
 * Được lấy từ biến môi trường `VITE_API_URL` được định nghĩa trong file `.env`.
 * Nếu không có biến môi trường này, hệ thống sẽ sử dụng giá trị mặc định là "http://localhost:8080/api/v1".
 */
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1";

/**
 * ============================================================================
 * SECTION 1: CÁC KHÁI NIỆM & ĐỊNH NGHĨA KIỂU DỮ LIỆU (INTERFACES & DTOS) - NHÓM THẺ
 * ============================================================================
 */

/**
 * Interface CardGroupDto
 * Đại diện cho cấu trúc dữ liệu của một Nhóm thẻ (Card Group) trả về từ máy chủ Backend.
 * Nhóm thẻ xác định cách thức phân loại xe, loại vé (vé lượt hay vé tháng) và biểu phí gửi xe.
 */
export interface CardGroupDto {
  /**
   * Mã định danh duy nhất của nhóm thẻ trong cơ sở dữ liệu.
   * Đây là khóa chính (Primary Key) tự động tăng.
   */
  cardGroupId: number;

  /**
   * Tên của nhóm thẻ.
   * Ví dụ: "Xe máy - Vé ngày", "Ô tô - Vé tháng cư dân", "Xe đạp - Vé lượt".
   */
  groupName: string;

  /**
   * Loại phương tiện được phép sử dụng nhóm thẻ này.
   * Giá trị thường gặp: "BIKE" (Xe máy, xe đạp điện), "CAR" (Ô tô), "BICYCLE" (Xe đạp).
   */
  vehicleType: string;

  /**
   * Loại vé áp dụng cho nhóm thẻ này.
   * Quyết định cách tính phí:
   * - "DAILY": Vé lượt (tính tiền theo block giờ hoặc mỗi lần vào/ra).
   * - "MONTHLY": Vé tháng (đăng ký trả phí định kỳ theo tháng).
   */
  ticketType: string;

  /**
   * Mức giá cơ bản áp dụng cho nhóm thẻ này.
   * - Đối với vé lượt ("DAILY"): Đây là giá tiền cho mỗi lượt gửi cơ bản.
   * - Đối với vé tháng ("MONTHLY"): Đây là giá tiền đăng ký hoặc gia hạn cho mỗi chu kỳ tháng.
   * Đơn vị tính: Việt Nam Đồng (VNĐ).
   */
  basePrice: number;

  /**
   * Số ngày hiệu lực mặc định của thẻ khi đăng ký mới hoặc gia hạn.
   * Trường này chỉ có giá trị đối với loại vé tháng ("MONTHLY").
   * Ví dụ: 30 ngày, 90 ngày. Có thể là undefined đối với vé lượt.
   */
  defaultDurationDays?: number;

  /**
   * Cờ xác định xem nhóm thẻ này có cho phép khách hàng đặt chỗ đỗ xe trước hay không.
   * - true: Khách hàng có thể dùng ứng dụng để giữ chỗ trước (áp dụng cho ô tô VIP).
   * - false: Không cho phép đặt chỗ trước, hoạt động theo nguyên tắc ai đến trước đỗ trước.
   */
  reservationAllowed: boolean;

  /**
   * Mô tả chi tiết về nhóm thẻ.
   * Cung cấp thêm thông tin về đối tượng khách hàng áp dụng hoặc quy định đặc biệt.
   * Ví dụ: "Dành riêng cho nhân viên tòa nhà gửi xe ô tô tại tầng hầm B1".
   */
  description?: string;

  /**
   * Trạng thái hoạt động của nhóm thẻ trong hệ thống.
   * - "ACTIVE": Nhóm thẻ đang hoạt động bình thường, có thể gán thẻ mới vào nhóm này.
   * - "INACTIVE": Nhóm thẻ đã bị tạm ngưng, không cho phép gán thẻ mới hoặc đăng ký mới.
   */
  status: string;
}

/**
 * Interface CardGroupPayload
 * Đại diện cho cấu trúc dữ liệu cần thiết khi gửi yêu cầu Tạo mới hoặc Cập nhật một Nhóm thẻ.
 * Loại bỏ trường `cardGroupId` vì ID sẽ do Backend tự sinh hoặc xác định qua URL.
 */
export interface CardGroupPayload {
  /**
   * Tên của nhóm thẻ cần tạo hoặc cập nhật.
   * Bắt buộc phải có giá trị và mang tính mô tả rõ ràng.
   */
  groupName: string;

  /**
   * Loại phương tiện áp dụng (ví dụ: "BIKE", "CAR").
   * Dùng để hệ thống phân luồng làn xe và kiểm tra tính hợp lệ ở barrier.
   */
  vehicleType: string;

  /**
   * Loại vé áp dụng ("DAILY" hoặc "MONTHLY").
   * Quyết định cấu trúc tính phí của hệ thống.
   */
  ticketType: string;

  /**
   * Mức giá cơ bản mới (đơn vị: VNĐ).
   * Phải là số dương lớn hơn hoặc bằng 0.
   */
  basePrice: number;

  /**
   * Số ngày hiệu lực mặc định của thẻ (chỉ áp dụng đối với vé tháng).
   * Tùy chọn, thường là 30 ngày cho các loại gói tháng thông thường.
   */
  defaultDurationDays?: number;

  /**
   * Trạng thái cho phép đặt chỗ trước của nhóm thẻ.
   * Xác định xem nhóm thẻ này có được liên kết với dịch vụ Booking đỗ xe hay không.
   */
  reservationAllowed: boolean;

  /**
   * Mô tả chi tiết tùy chọn về nhóm thẻ này.
   */
  description?: string;

  /**
   * Trạng thái áp dụng cho nhóm thẻ ("ACTIVE" hoặc "INACTIVE").
   */
  status: string;
}

/**
 * Interface CardHistoryDto
 * Đại diện cho một bản ghi lịch sử tương tác/thao tác thẻ giữ xe.
 * Cung cấp thông tin lịch sử phục vụ cho công tác kiểm tra, rà soát và giám sát hệ thống.
 */
export interface CardHistoryDto {
  /**
   * ID duy nhất của bản ghi lịch sử trong cơ sở dữ liệu.
   */
  id: number;

  /**
   * Số thứ tự hiển thị trên danh sách bảng (phục vụ phân trang/giao diện).
   */
  stt: number;

  /**
   * Mốc thời gian xảy ra hành động/thao tác trên thẻ.
   * Được định dạng dưới dạng chuỗi ISO hoặc định dạng ngày giờ chuẩn của hệ thống (ví dụ: "YYYY-MM-DD HH:mm:ss").
   */
  thoiGian: string;

  /**
   * Mã số in trên thẻ vật lý (Card Number).
   * Ví dụ: "CARD0001", "CARD9999".
   */
  cardNo: string;

  /**
   * Tên nhóm thẻ mà thẻ này đang hoặc đã từng thuộc về tại thời điểm thao tác.
   */
  nhomThe: string;

  /**
   * Hành động/Thao tác đã thực hiện đối với thẻ.
   * Ví dụ: "ACTIVE" (Kích hoạt), "LOCK" (Khóa thẻ do làm mất), "RELEASE" (Mở khóa), "REPLACE" (Cấp lại thẻ).
   */
  thaoTac: string;

  /**
   * Tên của chủ sở hữu thẻ (Khách hàng đăng ký thẻ tháng).
   * Có thể để trống hoặc hiển thị "Khách vãng lai" đối với thẻ ngày/vé lượt.
   */
  chuThe: string;

  /**
   * Biển số xe đăng ký gắn liền với thẻ này (đối với thẻ tháng).
   * Ví dụ: "29A-123.45". Để trống hoặc hiển thị "-" đối với vé lượt.
   */
  bienSo: string;

  /**
   * Họ tên của người thực hiện thao tác này (thường là Admin hoặc Nhân viên trực quầy).
   */
  nguoiThaoTac: string;
}

/**
 * Interface HistorySearchParams
 * Định nghĩa các bộ lọc tìm kiếm khi quản trị viên muốn truy vấn Lịch sử Thẻ.
 * Tất cả các trường lọc đều là tùy chọn (optional).
 */
export interface HistorySearchParams {
  /**
   * Từ khóa tìm kiếm tự do.
   * Có thể tìm theo Mã thẻ (Card No), Mã RFID, Tên chủ thẻ, Biển số xe hoặc tên nhân viên thao tác.
   */
  keyword?: string;

  /**
   * Ngày bắt đầu lọc dữ liệu (Định dạng: YYYY-MM-DD).
   * Giới hạn mốc thời gian bắt đầu của lịch sử thao tác cần xem.
   */
  fromDate?: string;

  /**
   * Ngày kết thúc lọc dữ liệu (Định dạng: YYYY-MM-DD).
   * Giới hạn mốc thời gian kết thúc của lịch sử thao tác cần xem.
   */
  toDate?: string;

  /**
   * Bộ lọc theo loại hành động/thao tác cụ thể.
   * Ví dụ: "Kích hoạt", "Khóa thẻ", "Gia hạn", "Đổi thẻ".
   */
  hanhDong?: string;

  /**
   * Bộ lọc theo tên người thực hiện thao tác (Admin/Staff).
   */
  nguoiDung?: string;

  /**
   * Bộ lọc theo Nhóm thẻ muốn truy vấn.
   */
  nhomThe?: string;
}

/**
 * ============================================================================
 * SECTION 2: DỊCH VỤ ADMIN & STAFF (ADMIN CARD SERVICE OBJECT)
 * ============================================================================
 * Chứa tập hợp các phương thức thực hiện gọi API (API calls) kết nối tới Backend.
 */
export const adminCardService = {

  /**
   * --------------------------------------------------------------------------
   * 1. CÁC API QUẢN LÝ NHÓM THẺ (CARD GROUPS MANAGEMENT)
   * --------------------------------------------------------------------------
   */

  /**
   * Lấy toàn bộ danh sách các Nhóm thẻ hiện có trong hệ thống.
   * Thường được dùng để hiển thị trên bảng quản trị hoặc đổ dữ liệu vào các ô chọn (Select box).
   *
   * @returns {Promise<CardGroupDto[]>} Mảng chứa thông tin chi tiết của các nhóm thẻ.
   * @throws {Error} Trả về lỗi kèm thông báo cụ thể nếu yêu cầu API thất bại.
   */
  async getAllCardGroups(): Promise<CardGroupDto[]> {
    const response = await authFetch(`${API_URL}/admin/card-groups`);
    const result: ApiResponse<CardGroupDto[]> = await safeJson(response);
    if (!response.ok) throw new Error(result.message || "Không thể tải danh sách nhóm thẻ.");
    return result.data;
  },

  /**
   * Tạo mới một nhóm thẻ đỗ xe.
   * Quản trị viên nhập thông tin biểu phí, loại phương tiện, loại vé để cấu hình nhóm thẻ mới.
   *
   * @param {CardGroupPayload} payload Dữ liệu cấu hình nhóm thẻ cần tạo.
   * @returns {Promise<CardGroupDto>} Nhóm thẻ vừa tạo thành công kèm ID do Backend cấp.
   * @throws {Error} Trả về lỗi nếu dữ liệu không hợp lệ hoặc trùng tên nhóm thẻ.
   */
  async createCardGroup(payload: CardGroupPayload): Promise<CardGroupDto> {
    const response = await authFetch(`${API_URL}/admin/card-groups`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
    const result: ApiResponse<CardGroupDto> = await safeJson(response);
    if (!response.ok) throw new Error(result.message || "Tạo nhóm thẻ thất bại.");
    return result.data;
  },

  /**
   * Cập nhật thông tin của một nhóm thẻ đã tồn tại.
   * Cho phép thay đổi biểu phí, mô tả hoặc trạng thái hoạt động của nhóm thẻ.
   *
   * @param {number} id Mã định danh duy nhất của nhóm thẻ cần sửa.
   * @param {CardGroupPayload} payload Dữ liệu cập nhật mới cho nhóm thẻ.
   * @returns {Promise<CardGroupDto>} Đối tượng nhóm thẻ sau khi đã lưu chỉnh sửa thành công.
   * @throws {Error} Trả về lỗi nếu ID không tồn tại hoặc lỗi kết nối.
   */
  async updateCardGroup(id: number, payload: CardGroupPayload): Promise<CardGroupDto> {
    const response = await authFetch(`${API_URL}/admin/card-groups/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
    const result: ApiResponse<CardGroupDto> = await safeJson(response);
    if (!response.ok) throw new Error(result.message || "Cập nhật nhóm thẻ thất bại.");
    return result.data;
  },

  /**
   * Xóa một nhóm thẻ ra khỏi hệ thống.
   * Lưu ý: Việc xóa nhóm thẻ chỉ thành công nếu không có thẻ vật lý nào đang liên kết với nhóm này.
   * Nếu đã có thẻ thuộc nhóm thẻ này, Backend sẽ trả ra lỗi ràng buộc toàn vẹn.
   *
   * @param {number} id Mã định danh của nhóm thẻ cần xóa.
   * @returns {Promise<void>} Không trả về dữ liệu nếu xóa thành công.
   * @throws {Error} Trả về lỗi ràng buộc hoặc không có quyền thực hiện hành động.
   */
  async deleteCardGroup(id: number): Promise<void> {
    const response = await authFetch(`${API_URL}/admin/card-groups/${id}`, {
      method: "DELETE"
    });
    if (!response.ok) {
      const result: ApiResponse<any> = await safeJson(response);
      throw new Error(result.message || "Xóa nhóm thẻ thất bại.");
    }
  },

  /**
   * --------------------------------------------------------------------------
   * 2. API TRUY VẤN LỊCH SỬ THAO TÁC THẺ (CARD AUDIT LOGS)
   * --------------------------------------------------------------------------
   */

  /**
   * Truy vấn lịch sử tương tác thẻ dựa trên bộ lọc tìm kiếm.
   * Giúp Admin theo dõi xem nhân viên nào đã khóa thẻ, kích hoạt thẻ hoặc đổi thẻ vào lúc nào.
   *
   * @param {HistorySearchParams} params Các tiêu chí lọc tìm kiếm lịch sử.
   * @returns {Promise<CardHistoryDto[]>} Danh sách các bản ghi lịch sử tương ứng với bộ lọc.
   * @throws {Error} Lỗi kết nối mạng hoặc lỗi định dạng tham số truyền vào.
   */
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

  /**
   * --------------------------------------------------------------------------
   * 3. CÁC API QUẢN LÝ NGƯỜI DÙNG (USER ACCOUNTS MANAGEMENT)
   * --------------------------------------------------------------------------
   */

  /**
   * Lấy danh sách toàn bộ người dùng trong hệ thống (bao gồm Khách hàng, Staff, Admin).
   * Phục vụ trang quản lý nhân sự và quản lý thông tin khách hàng đăng ký gửi xe.
   *
   * @returns {Promise<UserDto[]>} Mảng chứa thông tin của tất cả tài khoản người dùng.
   * @throws {Error} Lỗi xác thực hoặc không thể tải dữ liệu từ server.
   */
  async getUsers(): Promise<UserDto[]> {
    const response = await authFetch(`${API_URL}/admin/users`);
    const result: ApiResponse<UserDto[]> = await safeJson(response);
    if (!response.ok) throw new Error(result.message || "Không thể tải danh sách người dùng.");
    return result.data;
  },

  /**
   * Tạo mới một tài khoản người dùng trong hệ thống bãi xe.
   * Phương thức này thường được dùng bởi Admin để cấp tài khoản mới cho Nhân viên trực quầy (Staff)
   * hoặc đăng ký tài khoản nội bộ cho cư dân, khách hàng VIP.
   *
   * @param {CreateUserPayload} payload Thông tin tài khoản cần tạo mới.
   * @returns {Promise<UserDto>} Đối tượng tài khoản người dùng sau khi được khởi tạo thành công.
   * @throws {Error} Lỗi nếu tên đăng nhập (username) hoặc email đã bị trùng lặp trong hệ thống.
   */
  async createUser(payload: CreateUserPayload): Promise<UserDto> {
    const response = await authFetch(`${API_URL}/admin/users`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
    const result: ApiResponse<UserDto> = await safeJson(response);
    if (!response.ok) throw new Error(result.message || "Tạo người dùng thất bại.");
    return result.data;
  },

  /**
   * Cập nhật thông tin chi tiết của một tài khoản người dùng.
   * Cho phép chỉnh sửa họ tên, số điện thoại, vai trò (role), địa chỉ, mật khẩu mới hoặc trạng thái.
   *
   * @param {number} id Mã định danh duy nhất của tài khoản cần cập nhật.
   * @param {UpdateUserPayload} payload Dữ liệu chỉnh sửa thông tin người dùng.
   * @returns {Promise<UserDto>} Thông tin tài khoản sau khi đã lưu các chỉnh sửa.
   * @throws {Error} Lỗi cập nhật dữ liệu.
   */
  async updateUser(id: number, payload: UpdateUserPayload): Promise<UserDto> {
    const response = await authFetch(`${API_URL}/admin/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
    const result: ApiResponse<UserDto> = await safeJson(response);
    if (!response.ok) throw new Error(result.message || "Cập nhật người dùng thất bại.");
    return result.data;
  },

  /**
   * Khóa tài khoản người dùng hoặc xóa mềm (soft delete).
   * Trên thực tế, thao tác này sẽ gửi yêu cầu DELETE để chuyển trạng thái của tài khoản
   * sang trạng thái "LOCKED" hoặc "DELETED", ngăn chặn người dùng đăng nhập vào hệ thống.
   *
   * @param {number} id Mã định danh của tài khoản cần khóa/xóa.
   * @returns {Promise<UserDto>} Đối tượng tài khoản phản hồi từ server biểu thị trạng thái đã khóa.
   * @throws {Error} Lỗi thao tác khóa tài khoản từ phía API.
   */
  async deleteUser(id: number): Promise<UserDto> {
    const response = await authFetch(`${API_URL}/admin/users/${id}`, { method: "DELETE" });
    const result: ApiResponse<UserDto> = await safeJson(response);
    if (!response.ok) throw new Error(result.message || "Khóa tài khoản thất bại.");
    return result.data;
  },

  /**
   * Lấy danh sách các thẻ giữ xe vật lý đang được liên kết với một tài khoản người dùng cụ thể.
   * Thường dùng để kiểm tra xem một khách hàng đang sở hữu bao nhiêu thẻ tháng và biển số xe nào đi kèm.
   *
   * @param {number} userId Mã tài khoản người dùng cần kiểm tra thẻ.
   * @returns {Promise<UserCardDto[]>} Danh sách các thẻ mà người dùng này đang sở hữu.
   * @throws {Error} Lỗi truy vấn danh sách thẻ của khách hàng.
   */
  async getUserCards(userId: number): Promise<UserCardDto[]> {
    const response = await authFetch(`${API_URL}/admin/users/${userId}/cards`);
    const result: ApiResponse<UserCardDto[]> = await safeJson(response);
    if (!response.ok) throw new Error(result.message || "Không thể tải danh sách thẻ của người dùng.");
    return result.data;
  },

  /**
   * --------------------------------------------------------------------------
   * 4. API BÁO CÁO THỐNG KÊ LƯỢT XE VÀO/RA (VEHICLE REPORTS)
   * --------------------------------------------------------------------------
   */

  /**
   * Truy vấn danh sách báo cáo xe vào/ra hệ thống bãi giữ xe.
   * Cung cấp dữ liệu trực quan cho cả 2 tab: Lượt xe vào (Entry) và Lượt xe ra (Exit).
   * Hỗ trợ tìm kiếm theo từ khóa biển số xe, mã thẻ, lọc theo khoảng thời gian, làn xe,
   * nhân viên trực làn hoặc loại vé tháng/vé ngày.
   *
   * @param {VehicleReportParams} params Các điều kiện tìm kiếm và phân loại báo cáo xe.
   * @returns {Promise<VehicleReportDto[]>} Mảng danh sách thông tin lượt xe vào/ra.
   * @throws {Error} Lỗi kết nối hoặc định dạng tham số không đúng.
   */
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

  /**
   * --------------------------------------------------------------------------
   * 5. CÁC API QUẢN LÝ YÊU CẦU HỖ TRỢ (SUPPORT REQUESTS)
   * --------------------------------------------------------------------------
   */

  /**
   * Lấy danh sách các yêu cầu hỗ trợ do CHÍNH người dùng hiện tại (Staff hoặc Admin) đã tạo.
   * Thường dùng trên trang cá nhân của nhân viên để theo dõi các phản hồi từ Admin cấp cao hơn.
   *
   * @returns {Promise<RequestSupportDto[]>} Danh sách yêu cầu hỗ trợ cá nhân.
   * @throws {Error} Lỗi truy xuất danh sách yêu cầu cá nhân.
   */
  async getMyRequests(): Promise<RequestSupportDto[]> {
    const response = await authFetch(`${API_URL}/support/my`);
    const result: ApiResponse<RequestSupportDto[]> = await safeJson(response);
    if (!response.ok) throw new Error(result.message || "Không thể tải danh sách yêu cầu.");
    return result.data;
  },

  /**
   * Gửi một yêu cầu hỗ trợ mới lên hệ thống.
   * Nhân viên hoặc khách hàng có thể gửi yêu cầu báo lỗi thiết bị, sự cố thẻ hoặc đề xuất nâng cấp.
   *
   * @param {Object} payload Nội dung yêu cầu hỗ trợ.
   * @param {string} payload.subject Tiêu đề ngắn gọn của yêu cầu hỗ trợ.
   * @param {string} payload.description Chi tiết mô tả nội dung sự cố/yêu cầu.
   * @param {string} payload.requestType Phân loại yêu cầu (Ví dụ: "CARD_ISSUE", "PAYMENT", "SYSTEM_BUG").
   * @returns {Promise<RequestSupportDto>} Chi tiết yêu cầu hỗ trợ vừa được tạo.
   * @throws {Error} Lỗi tạo mới yêu cầu hỗ trợ.
   */
  async createSupportRequest(payload: { subject: string; description: string; requestType: string }): Promise<RequestSupportDto> {
    const response = await authFetch(`${API_URL}/support/my`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
    const result: ApiResponse<RequestSupportDto> = await safeJson(response);
    if (!response.ok) throw new Error(result.message || "Gửi yêu cầu thất bại.");
    return result.data;
  },

  /**
   * Lấy toàn bộ danh sách các yêu cầu hỗ trợ từ tất cả người dùng trong hệ thống bãi xe.
   * Chức năng này dành cho Quản trị viên (Admin) để có cái nhìn tổng quan và tiến hành xử lý yêu cầu.
   *
   * @returns {Promise<RequestSupportDto[]>} Toàn bộ danh sách yêu cầu hỗ trợ trên toàn hệ thống.
   * @throws {Error} Lỗi phân quyền hoặc kết nối máy chủ.
   */
  async getAllRequests(): Promise<RequestSupportDto[]> {
    const response = await authFetch(`${API_URL}/admin/requests`);
    const result: ApiResponse<RequestSupportDto[]> = await safeJson(response);
    if (!response.ok) throw new Error(result.message || "Không thể tải danh sách yêu cầu.");
    return result.data;
  },

  /**
   * Phê duyệt một yêu cầu hỗ trợ từ khách hàng hoặc nhân viên.
   * Khi phê duyệt, Admin có thể đính kèm một ghi chú giải trình hoặc hướng dẫn xử lý.
   * Trạng thái yêu cầu sẽ chuyển sang "APPROVED" hoặc "RESOLVED".
   *
   * @param {number} requestId Mã định danh của yêu cầu hỗ trợ cần duyệt.
   * @param {string} note Nội dung ghi chú, phản hồi của Admin gửi lại người yêu cầu.
   * @returns {Promise<RequestSupportDto>} Bản ghi yêu cầu hỗ trợ sau khi cập nhật trạng thái phê duyệt.
   * @throws {Error} Lỗi cập nhật trạng thái phê duyệt từ Backend.
   */
  async approveRequest(requestId: number, note: string): Promise<RequestSupportDto> {
    const response = await authFetch(`${API_URL}/admin/requests/${requestId}/approve?note=${encodeURIComponent(note)}`, {
      method: "POST"
    });
    const result: ApiResponse<RequestSupportDto> = await safeJson(response);
    if (!response.ok) throw new Error(result.message || "Duyệt yêu cầu thất bại.");
    return result.data;
  },

  /**
   * Từ chối một yêu cầu hỗ trợ.
   * Dùng khi yêu cầu hỗ trợ không hợp lý, thông tin cung cấp sai lệch hoặc không thuộc thẩm quyền giải quyết.
   * Trạng thái yêu cầu sẽ chuyển sang "REJECTED".
   *
   * @param {number} requestId Mã định danh của yêu cầu cần từ chối.
   * @param {string} note Lý do từ chối yêu cầu (bắt buộc nhập để thông báo cho người dùng).
   * @returns {Promise<RequestSupportDto>} Bản ghi yêu cầu hỗ trợ sau khi cập nhật trạng thái từ chối.
   * @throws {Error} Lỗi thực hiện từ chối yêu cầu.
   */
  async rejectRequest(requestId: number, note: string): Promise<RequestSupportDto> {
    const response = await authFetch(`${API_URL}/admin/requests/${requestId}/reject?note=${encodeURIComponent(note)}`, {
      method: "POST"
    });
    const result: ApiResponse<RequestSupportDto> = await safeJson(response);
    if (!response.ok) throw new Error(result.message || "Từ chối yêu cầu thất bại.");
    return result.data;
  },

  /**
   * Phân công một nhân viên cụ thể chịu trách nhiệm giải quyết yêu cầu hỗ trợ này.
   * Chức năng này cho phép Admin phân bổ công việc lỗi thiết bị hoặc thẻ cho kỹ thuật viên/nhân viên trực quầy.
   * Trạng thái yêu cầu thường chuyển sang "PROCESSING" (Đang xử lý).
   *
   * @param {number} requestId Mã định danh của yêu cầu cần phân công.
   * @param {number} staffId Mã tài khoản nhân viên (Staff Account ID) được chỉ định giải quyết.
   * @returns {Promise<RequestSupportDto>} Bản ghi yêu cầu hỗ trợ chứa thông tin nhân viên xử lý mới.
   * @throws {Error} Lỗi trong quá trình phân công công việc.
   */
  async assignRequestStaff(requestId: number, staffId: number): Promise<RequestSupportDto> {
    const response = await authFetch(`${API_URL}/admin/requests/${requestId}/assign?staffId=${staffId}`, {
      method: "POST"
    });
    const result: ApiResponse<RequestSupportDto> = await safeJson(response);
    if (!response.ok) throw new Error(result.message || "Phân công nhân viên thất bại.");
    return result.data;
  }
};

/**
 * ============================================================================
 * SECTION 3: CÁC KHÁI NIỆM & ĐỊNH NGHĨA KIỂU DỮ LIỆU (INTERFACES & DTOS) - NGƯỜI DÙNG
 * ============================================================================
 */

/**
 * Interface UserDto
 * Đại diện cho thông tin tài khoản người dùng đầy đủ được trả về từ phía Backend.
 * Dùng để hiển thị danh sách người dùng trong bảng Admin.
 */
export interface UserDto {
  /**
   * Mã định danh tài khoản duy nhất của người dùng trong hệ thống.
   * Là khóa chính liên kết với bảng tài khoản (Accounts).
   */
  accountId: number;

  /**
   * Tên đăng nhập dùng để truy cập vào hệ thống.
   * Thường là duy nhất và viết liền không dấu, không chứa ký tự đặc biệt.
   */
  username: string;

  /**
   * Họ và tên đầy đủ của người dùng (ví dụ: "Nguyễn Văn A").
   */
  fullName: string;

  /**
   * Tên vai trò (Role) của tài khoản trong hệ thống để thực hiện phân quyền.
   * Các vai trò chuẩn: "ADMIN" (Quản trị viên), "STAFF" (Nhân viên trực làn/quầy), "CUSTOMER" (Khách hàng).
   */
  roleName: string;

  /**
   * Số điện thoại liên lạc của chủ tài khoản.
   */
  phone: string;

  /**
   * Địa chỉ email liên lạc, dùng để nhận thông báo hoặc đặt lại mật khẩu.
   */
  email: string;

  /**
   * Trạng thái hiện tại của tài khoản người dùng.
   * - "ACTIVE": Tài khoản đang hoạt động bình thường.
   * - "LOCKED": Tài khoản bị khóa (không thể đăng nhập).
   * - "INACTIVE": Tài khoản chưa được kích hoạt hoặc tạm dừng.
   */
  status: string;

  /**
   * Ngày giờ khởi tạo tài khoản này trong hệ thống.
   * Định dạng chuỗi ngày giờ (ví dụ: ISO 8601).
   */
  createdAt: string;

  /**
   * Địa chỉ nơi ở hoặc văn phòng làm việc của người dùng.
   * Thuộc tính tùy chọn, chủ yếu dùng cho Cư dân / Khách hàng thân thiết đăng ký vé tháng.
   */
  address?: string;

  /**
   * Số lượng thẻ gửi xe (cả thẻ tháng/thẻ ngày) đang thuộc quyền sở hữu của người dùng này.
   * Tùy chọn, được tính toán từ Backend thông qua phép đếm (Count queries).
   */
  cardCount?: number;
}

/**
 * Interface CreateUserPayload
 * Định nghĩa cấu trúc dữ liệu gửi lên Backend khi Admin tạo mới một tài khoản người dùng.
 */
export interface CreateUserPayload {
  /**
   * Tên đăng nhập cho tài khoản mới. Bắt buộc phải duy nhất.
   */
  username: string;

  /**
   * Họ tên đầy đủ của chủ tài khoản mới.
   */
  fullName: string;

  /**
   * Vai trò phân quyền cho tài khoản mới ("ADMIN", "STAFF" hoặc "CUSTOMER").
   */
  roleName: string;

  /**
   * Số điện thoại liên hệ của người dùng. Tùy chọn.
   */
  phone?: string;

  /**
   * Địa chỉ email liên lạc. Tùy chọn.
   */
  email?: string;

  /**
   * Mật khẩu đăng nhập ban đầu của người dùng.
   * Nếu không nhập, Backend có thể tự sinh một mật khẩu mặc định (ví dụ: "123456").
   */
  password?: string;

  /**
   * Trạng thái ban đầu của tài khoản khi vừa khởi tạo (thường là "ACTIVE").
   */
  status: string;

  /**
   * Địa chỉ cư trú tùy chọn của người dùng mới.
   */
  address?: string;
}

/**
 * Interface UpdateUserPayload
 * Định nghĩa cấu trúc dữ liệu gửi lên Backend khi Admin chỉnh sửa thông tin một tài khoản người dùng.
 * Loại bỏ trường `username` vì tên đăng nhập là duy nhất và không được phép sửa đổi sau khi tạo.
 */
export interface UpdateUserPayload {
  /**
   * Họ tên đầy đủ mới của người dùng sau khi chỉnh sửa.
   */
  fullName: string;

  /**
   * Vai trò mới của tài khoản sau khi điều chuyển công tác hoặc thăng cấp quyền hạn.
   */
  roleName: string;

  /**
   * Số điện thoại liên lạc cập nhật mới. Tùy chọn.
   */
  phone?: string;

  /**
   * Địa chỉ email liên lạc cập nhật mới. Tùy chọn.
   */
  email?: string;

  /**
   * Mật khẩu đăng nhập mới (trong trường hợp Admin hỗ trợ đặt lại mật khẩu cho nhân viên).
   * Tùy chọn, để trống nếu người dùng không có nhu cầu đổi mật khẩu.
   */
  password?: string;

  /**
   * Trạng thái hoạt động mới của tài khoản sau khi chỉnh sửa ("ACTIVE", "LOCKED", "INACTIVE").
   */
  status: string;

  /**
   * Địa chỉ cư trú cập nhật mới. Tùy chọn.
   */
  address?: string;
}

/**
 * Interface UserCardDto
 * Định nghĩa cấu trúc dữ liệu của một chiếc thẻ đỗ xe đang được liên kết với một tài khoản người dùng.
 * Thẻ này có thể là thẻ tháng đã đăng ký gửi một phương tiện cụ thể.
 */
export interface UserCardDto {
  /**
   * Mã số ID duy nhất của thẻ trong cơ sở dữ liệu.
   */
  cardId: number;

  /**
   * Mã số thẻ hiển thị in trên thẻ vật lý (ví dụ: "CARD-1002").
   */
  cardNo: string;

  /**
   * Mã UID của chip RFID (Radio Frequency Identification) bên trong thẻ.
   * Thường là mã hexa (ví dụ: "8A2F5E01"). Dùng để đầu đọc RFID ở cổng nhận diện nhanh.
   */
  rfidUid: string;

  /**
   * Tên nhóm thẻ mà thẻ này đang được phân loại vào (ví dụ: "Xe máy cư dân").
   */
  groupName: string;

  /**
   * Loại vé của thẻ này ("MONTHLY" hoặc "DAILY").
   */
  ticketType: string;

  /**
   * Biển số xe đã được gán cố định cho thẻ tháng này.
   * Hệ thống sẽ đối chiếu biển số nhận diện từ camera AI với biển số này để mở barrier tự động.
   * Ví dụ: "30F-999.99".
   */
  plateNo: string;

  /**
   * Ngày giờ thẻ được đăng ký kích hoạt cho người dùng.
   * Định dạng chuỗi ngày giờ hệ thống.
   */
  registeredAt: string;

  /**
   * Ngày hết hạn hiệu lực của thẻ (chỉ áp dụng đối với thẻ tháng).
   * Khi vượt quá ngày này, nếu khách hàng chưa đóng tiền gia hạn, thẻ sẽ bị chặn tại cổng barrier.
   */
  expireAt: string;

  /**
   * Trạng thái hoạt động hiện tại của chiếc thẻ này.
   * - "ACTIVE": Thẻ hoạt động bình thường, cho phép quẹt vào/ra.
   * - "LOCKED": Thẻ bị khóa tạm thời (ví dụ: khách báo mất thẻ).
   * - "EXPIRED": Thẻ tháng đã quá hạn nộp phí giữ xe.
   */
  status: string;

  /**
   * Các ghi chú phụ trợ đi kèm thẻ (ví dụ: "Cấp lại lần 2 do mất thẻ cũ", "Xe chính chủ cư dân").
   */
  note: string;
}

/**
 * ============================================================================
 * SECTION 4: CÁC KHÁI NIỆM & ĐỊNH NGHĨA KIỂU DỮ LIỆU (INTERFACES & DTOS) - BÁO CÁO XE
 * ============================================================================
 */

/**
 * Interface VehicleReportParams
 * Định nghĩa các tham số lọc tìm kiếm phục vụ việc tra cứu lịch sử xe vào/ra.
 */
export interface VehicleReportParams {
  /**
   * Tab báo cáo hiện tại cần truy vấn dữ liệu.
   * - "entry": Xem lịch sử các lượt xe tiến hành quẹt thẻ đi vào bãi đỗ.
   * - "exit": Xem lịch sử các lượt xe quẹt thẻ và thanh toán đi ra khỏi bãi đỗ.
   */
  tab: "entry" | "exit";

  /**
   * Từ khóa tìm kiếm nhanh.
   * Tìm theo biển số xe, mã số thẻ hoặc họ tên chủ thẻ/nhân viên trực cổng.
   */
  keyword?: string;

  /**
   * Thời gian bắt đầu của khoảng lọc dữ liệu vào/ra (định dạng YYYY-MM-DD HH:mm:ss).
   */
  fromDate?: string;

  /**
   * Thời gian kết thúc của khoảng lọc dữ liệu vào/ra (định dạng YYYY-MM-DD HH:mm:ss).
   */
  toDate?: string;

  /**
   * Bộ lọc theo làn xe cụ thể (Lane ID).
   * Hỗ trợ thống kê lưu lượng xe qua làn số 1, làn số 2, làn vào, làn ra,...
   */
  laneId?: number;

  /**
   * Bộ lọc theo mã nhân viên trực làn (Staff ID) để đánh giá năng suất và trách nhiệm làm việc.
   */
  staffId?: number;

  /**
   * Bộ lọc theo loại vé gửi xe ("DAILY" - Vé lượt hoặc "MONTHLY" - Vé tháng).
   */
  ticketType?: string;
}

/**
 * Interface VehicleReportDto
 * DTO chi tiết đại diện cho một bản ghi thông tin lượt xe gửi tại bãi (Parking Session).
 * Chứa đầy đủ thông tin hình ảnh camera chụp lúc vào/ra, nhân viên trực cổng, mức phí phát sinh.
 */
export interface VehicleReportDto {
  /**
   * ID phiên đỗ xe (Parking Session ID) duy nhất trong hệ thống dữ liệu.
   */
  parkingSessionId: number;

  /**
   * Mã số phiên đỗ xe định dạng thân thiện với người dùng (ví dụ: "PS-20260718-0001").
   */
  parkingSessionNo: string;

  /**
   * Mã số thẻ vật lý được quẹt để thực hiện phiên đỗ xe này.
   */
  cardNo: string;

  /**
   * Mã UID của thẻ RFID được nhận dạng tại đầu đọc.
   */
  rfidUid: string;

  /**
   * Biển số xe được nhận diện tự động hoặc do nhân viên nhập thủ công.
   */
  plateNo: string;

  /**
   * Tên tầng đỗ xe mà phương tiện được hướng dẫn gửi (ví dụ: "Tầng trệt G", "Hầm B1").
   */
  floorName: string;

  /**
   * Mốc thời gian chính xác xe quẹt thẻ vào bãi đỗ (Check In Time).
   */
  checkInAt: string;

  /**
   * Mốc thời gian chính xác xe quẹt thẻ ra khỏi bãi đỗ (Check Out Time).
   * Có giá trị null/undefined nếu xe vẫn đang nằm trong bãi đỗ và chưa check out.
   */
  checkOutAt?: string;

  /**
   * Số tiền phí gửi xe thực tế phát sinh mà khách hàng phải trả khi check-out.
   * Đơn vị tính: VNĐ. Bằng 0 đối với vé tháng đã đóng tiền trước.
   */
  feeAmount: number;

  /**
   * Tên nhóm thẻ áp dụng cho phiên đỗ xe này (ví dụ: "Ô tô khách vãng lai").
   */
  groupName: string;

  /**
   * Họ tên của khách hàng (nếu là thẻ tháng cư dân) hoặc hiển thị "Khách vãng lai".
   */
  customerName: string;

  /**
   * Tên của làn xe mà phương tiện đi vào (ví dụ: "Làn số 1 - Cổng A").
   */
  entryLaneName: string;

  /**
   * Tên của làn xe mà phương tiện đi ra (ví dụ: "Làn số 2 - Cổng B").
   * Sẽ trống/undefined nếu xe chưa làm thủ tục ra khỏi bãi.
   */
  exitLaneName?: string;

  /**
   * Họ tên của nhân viên trực làn lúc xe đi vào bãi đỗ.
   */
  entryStaffName: string;

  /**
   * Họ tên của nhân viên trực làn lúc xe làm thủ tục thanh toán đi ra.
   * Sẽ trống/undefined nếu xe chưa check out.
   */
  exitStaffName?: string;

  /**
   * Đường dẫn URL ảnh chụp biển số xe hoặc toàn cảnh lúc xe quẹt thẻ vào bãi đỗ.
   * Ảnh này dùng để đối chiếu khi xe đi ra, tránh tình trạng tráo biển số, tráo xe.
   */
  entryImage?: string;

  /**
   * Đường dẫn URL ảnh chụp biển số xe hoặc toàn cảnh lúc xe quẹt thẻ đi ra.
   * Chỉ khả dụng khi xe đã check-out hoàn tất.
   */
  exitImage?: string;
}

/**
 * ============================================================================
 * SECTION 5: CÁC KHÁI NIỆM & ĐỊNH NGHĨA KIỂU DỮ LIỆU (INTERFACES & DTOS) - HỖ TRỢ (SUPPORT)
 * ============================================================================
 */

/**
 * Interface RequestSupportDto
 * Định nghĩa cấu trúc thông tin chi tiết của một Yêu cầu hỗ trợ (Support Ticket).
 * Cho phép người dùng và quản trị viên thảo luận, giải quyết các sự cố vận hành bãi xe.
 */
export interface RequestSupportDto {
  /**
   * Mã định danh duy nhất của yêu cầu hỗ trợ trong cơ sở dữ liệu.
   */
  requestId: number;

  /**
   * Số hiệu yêu cầu hỗ trợ hiển thị trên giao diện (ví dụ: "REQ-2026-0034").
   */
  requestNo: string;

  /**
   * Loại yêu cầu hỗ trợ giúp hệ thống phân loại dễ xử lý.
   * Ví dụ:
   * - "CARD_ISSUE": Sự cố liên quan đến thẻ (hỏng thẻ, mất thẻ, thẻ không nhận diện).
   * - "PAYMENT": Tranh chấp hoặc lỗi trong quá trình thanh toán ví điện tử/vé tháng.
   * - "EQUIPMENT": Lỗi barrier không mở, lỗi camera không nhận dạng được biển số.
   * - "OTHER": Các yêu cầu phản ánh dịch vụ khác.
   */
  requestType: string;

  /**
   * Mã ID tài khoản của người gửi yêu cầu hỗ trợ này.
   */
  senderAccountId: number;

  /**
   * Họ và tên đầy đủ của người gửi yêu cầu (Khách hàng hoặc Nhân viên trực ca).
   */
  senderName: string;

  /**
   * Vai trò của người gửi yêu cầu hỗ trợ lúc tạo đơn (ví dụ: "STAFF", "CUSTOMER").
   */
  senderRole: string;

  /**
   * Mã tài khoản của nhân viên kỹ thuật hoặc hành chính được phân công giải quyết.
   * Có thể mang giá trị null nếu yêu cầu này mới tạo và chưa được điều phối xử lý.
   */
  assignedStaffId: number | null;

  /**
   * Họ tên của nhân viên đang chịu trách nhiệm giải quyết yêu cầu.
   * Có giá trị null nếu chưa được phân công.
   */
  assignedStaffName: string | null;

  /**
   * Tiêu đề của yêu cầu hỗ trợ. Khái quát ngắn gọn nội dung sự cố gặp phải.
   * Ví dụ: "Báo cáo lỗi đầu đọc thẻ RFID tại làn vào số 2 không phản hồi".
   */
  subject: string;

  /**
   * Nội dung chi tiết của sự cố hoặc vấn đề cần ban quản lý hỗ trợ giải quyết.
   */
  description: string;

  /**
   * Đường dẫn URL ảnh chụp bằng chứng lỗi, biên lai thanh toán hoặc hình ảnh lỗi thực tế.
   * Có thể null nếu người gửi không cung cấp tệp đính kèm.
   */
  evidenceUrl: string | null;

  /**
   * Mức độ ưu tiên của yêu cầu hỗ trợ nhằm sắp xếp thứ tự xử lý.
   * Ví dụ: "LOW" (Thấp), "MEDIUM" (Trung bình), "HIGH" (Cao), "CRITICAL" (Khẩn cấp - cần xử lý ngay).
   */
  priority: string;

  /**
   * Trạng thái vòng đời xử lý của yêu cầu hỗ trợ này.
   * Các trạng thái cơ bản bao gồm:
   * - "PENDING": Đơn vừa tạo, đang chờ Admin tiếp nhận.
   * - "PROCESSING": Admin đã giao việc cho nhân viên xử lý, đang trong quá trình khắc phục.
   * - "APPROVED": Yêu cầu đã được phê duyệt thành công (áp dụng với yêu cầu xin cấp lại thẻ/phí).
   * - "REJECTED": Yêu cầu bị bác bỏ do thông tin không hợp lệ.
   * - "RESOLVED": Sự cố đã được xử lý xong xuôi và nghiệm thu thành công.
   */
  status: string;

  /**
   * Ghi chú phản hồi từ quản trị viên khi phê duyệt hoặc từ chối yêu cầu hỗ trợ này.
   * Cung cấp lý do hoặc hướng dẫn cụ thể cho người gửi yêu cầu.
   */
  adminNote: string | null;

  /**
   * Mốc thời gian yêu cầu hỗ trợ được gửi lên hệ thống.
   * Định dạng chuỗi ngày giờ.
   */
  createdAt: string;

  /**
   * Mốc thời gian yêu cầu hỗ trợ bắt đầu được chuyển sang trạng thái xử lý ("PROCESSING").
   * Sẽ mang giá trị null nếu yêu cầu vẫn đang ở trạng thái chờ duyệt ("PENDING").
   */
  processingAt: string | null;

  /**
   * Mốc thời gian yêu cầu hỗ trợ được giải quyết triệt để và khép lại đơn.
   * Sẽ mang giá trị null nếu yêu cầu chưa hoàn tất xử lý.
   */
  resolvedAt: string | null;
}
