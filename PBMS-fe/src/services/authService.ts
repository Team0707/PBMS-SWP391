/**
 * ============================================================================
 * HỆ THỐNG QUẢN LÝ BÃI XE THÔNG MINH (PBMS - Parking Building Management System)
 * ============================================================================
 * File: authService.ts
 * Đường dẫn: /src/services/authService.ts
 *
 * VAI TRÒ & CHỨC NĂNG CHÍNH:
 * - Tầng Dịch vụ Xác thực (Authentication Service): Chịu trách nhiệm trực tiếp
 *   với các tiến trình bảo mật thiết yếu như Đăng nhập, Đăng ký, Đăng xuất tài khoản.
 * - Quản lý Trạng thái Phiên làm việc (Session Lifecycle Management): Lưu trữ
 *   chặt chẽ JWT (Json Web Token) của người dùng xuống thiết bị đầu cuối của trình duyệt.
 * - Xử lý Đồng bộ Token giữa các Tab: Sử dụng Storage kết hợp lắng nghe các
 *   sự kiện để đồng bộ hóa phiên làm việc của người dùng trên toàn bộ trình duyệt.
 * - Xử lý Hết hạn Phiên làm việc (Token Expiration Check): Tự động phát hiện
 *   token hết hạn dựa trên thời gian tuyệt đối và phát đi sự kiện toàn cục để buộc đăng xuất.
 * - Quản lý Hồ sơ Cá nhân (User Profile): Xem, xác nhận mật khẩu hiện tại,
 *   cập nhật thông tin cá nhân và thay đổi mật khẩu tài khoản trực tiếp.
 * - Các dịch vụ phục hồi & xác thực bổ sung: Gửi email đăng ký, xác thực tài khoản qua link kích hoạt,
 *   xử lý yêu cầu quên mật khẩu và đặt lại mật khẩu mới thông qua Token bảo mật.
 *
 * CÔNG NGHỆ & THƯ VIỆN SỬ DỤNG:
 * - Type/Interfaces: Đồng bộ chặt chẽ với đối tượng xác thực trên UI và phản hồi từ phía Backend.
 * - Storage APIs: Hỗ trợ linh hoạt cả `localStorage` và `sessionStorage` để bảo mật tối ưu thông tin.
 * - Event Dispatcher: Cơ chế phát sự kiện tùy biến (Custom Event) để tương tác đồng bộ phi trạng thái (stateless).
 *
 * TÁC GIẢ: Antigravity Developer
 * NGÀY KHỞI TẠO: 2026-07-18
 * ============================================================================
 */

import { UserRole } from "../app/components/Login";
import { safeJson, authFetch } from "../utils/apiHelper";

/**
 * Interface LoginResponseData
 * Định nghĩa cấu trúc gói dữ liệu trả về từ máy chủ Backend sau khi người dùng đăng nhập thành công.
 * Chứa JWT Token bảo mật và các thông tin định danh cơ bản của người dùng.
 */
export interface LoginResponseData {
  /**
   * Mã thông báo xác thực JWT (JSON Web Token).
   * Chuỗi mã hóa này được đính kèm vào mỗi yêu cầu API tiếp theo tại Header `Authorization: Bearer <token>`.
   */
  accessToken: string;

  /**
   * Loại token được cung cấp bởi hệ thống xác thực.
   * Thông thường có giá trị mặc định là "Bearer".
   */
  tokenType: string;

  /**
   * Thời gian hiệu lực của mã thông báo (Token) tính bằng mili-giây (ms).
   * Dùng để tính toán thời điểm hết hạn của phiên đăng nhập ở Client.
   * Ví dụ: 86400000 ms tương ứng với 24 giờ.
   */
  expiresInMs: number;

  /**
   * ID định danh duy nhất của tài khoản người dùng vừa đăng nhập thành công.
   */
  accountId: number;

  /**
   * Tên tài khoản đăng nhập của người dùng trong hệ thống (Username).
   */
  username: string;

  /**
   * Họ và tên đầy đủ của người dùng sở hữu tài khoản (ví dụ: "Nguyễn Văn A").
   */
  fullName: string;

  /**
   * Vai trò/Quyền hạn của tài khoản trên hệ thống.
   * - Lưu ý: Backend có thể gửi về chữ hoa hoặc chữ thường ("ADMIN", "STAFF", "CUSTOMER").
   * - Tại client, giá trị này sẽ được đưa về dạng chữ thường để khớp với định nghĩa phân quyền nội bộ.
   */
  role: string;
}

/**
 * Interface ApiResponse
 * Định nghĩa cấu trúc phản hồi chuẩn hóa (Wrapper Schema) cho toàn bộ API từ Backend.
 * Giúp tối ưu hóa việc phân tích cú pháp dữ liệu (parsing JSON) và xử lý lỗi đồng bộ.
 *
 * @template T Kiểu dữ liệu cụ thể nằm trong thuộc tính `data` của phản hồi.
 */
export interface ApiResponse<T> {
  /**
   * Mã trạng thái HTTP hoặc mã trạng thái tùy biến từ máy chủ Backend (ví dụ: 200, 201, 400, 403, 500).
   */
  status: number;

  /**
   * Thông báo phản hồi mô tả trạng thái của tác vụ từ server gửi về.
   * Thường được hiển thị trên giao diện người dùng nếu có lỗi xảy ra hoặc khi thao tác thành công.
   */
  message: string;

  /**
   * Khối dữ liệu phản hồi thực tế (Payload).
   * Kiểu dữ liệu của khối này thay đổi linh hoạt tùy thuộc vào mục đích gọi API.
   */
  data: T;
}

/**
 * Đường dẫn cơ sở (Base URL) của API Backend phục vụ quá trình Xác thực.
 * Giá trị này được đọc tự động từ biến môi trường `VITE_API_URL`.
 * Nếu không cấu hình trong file `.env`, hệ thống sẽ sử dụng giá trị mặc định là "http://localhost:5173/api/v1".
 */
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5173/api/v1";

/**
 * Đối tượng authService
 * Đóng gói tất cả các phương thức và biến trạng thái dùng để giao tiếp với hệ thống xác thực của Backend.
 */
export const authService = {

  /**
   * Thực hiện gửi yêu cầu đăng nhập tài khoản lên máy chủ Backend.
   *
   * @param {string} username Tên đăng nhập của tài khoản cần xác thực.
   * @param {string} password Mật khẩu của tài khoản.
   * @param {boolean} [remember=false] Cờ ghi nhớ đăng nhập (nếu là true, phiên đăng nhập được duy trì lâu hơn).
   * @returns {Promise<{ role: UserRole; name: string }>} Trả về đối tượng chứa vai trò đã chuẩn hóa và tên hiển thị nếu thành công.
   * @throws {Error} Trả về lỗi kèm thông báo cụ thể từ Backend nếu thông tin đăng nhập sai.
   */
  async login(username: string, password: string, remember = false): Promise<{ role: UserRole; name: string }> {
    // 1. Thực hiện gửi yêu cầu POST đến endpoint đăng nhập của backend
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    // 2. Chuyển đổi dữ liệu trả về một cách an toàn tránh crash giao diện
    const result: ApiResponse<LoginResponseData> = await safeJson(response);

    // 3. Kiểm tra mã trạng thái phản hồi, nếu không thành công thì quăng lỗi ra ngoài
    if (!response.ok) {
      throw new Error(result.message || "Tên đăng nhập hoặc mật khẩu không đúng.");
    }

    const { data } = result;
    // Chuẩn hóa tên quyền về chữ thường để đồng bộ với ứng dụng React Frontend
    const userRole = data.role.toLowerCase();
    
    // Nếu tài khoản đăng nhập có quyền admin, hệ thống tự động thiết lập ghi nhớ đăng nhập
    const isRemember = remember || userRole === "admin";

    /**
     * 4. Dọn dẹp các thông tin đăng nhập cũ còn sót lại trong cả localStorage
     *    và sessionStorage trước khi lưu trữ thông tin của phiên làm việc mới.
     *    Điều này ngăn ngừa hiện tượng xung đột dữ liệu giữa các phiên đăng nhập.
     */
    ["authToken", "userRole", "userName", "username", "tokenExpiry"].forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });

    // 5. Tính toán thời điểm hết hạn tuyệt đối của token dựa trên thời gian hiện tại
    const expiryAt = Date.now() + data.expiresInMs;

    /**
     * 6. Lưu trữ thông tin xác thực mới vào LocalStorage.
     *    Sử dụng LocalStorage giúp đồng bộ hóa phiên làm việc của người dùng
     *    trên nhiều tab khác nhau của cùng một trình duyệt một cách mượt mà.
     */
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

  /**
   * Đăng xuất người dùng ra khỏi hệ thống.
   * Xóa sạch toàn bộ các key thông tin xác thực và token đã lưu trữ dưới trình duyệt.
   * Hành động này sẽ chuyển trạng thái ứng dụng về màn hình đăng nhập (Login).
   */
  logout(): void {
    ["authToken", "userRole", "userName", "username", "tokenExpiry"].forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
  },

  /**
   * Lấy thông tin tài khoản người dùng hiện tại đang đăng nhập từ bộ nhớ tạm.
   *
   * @returns {{ role: UserRole; name: string } | null} Trả về vai trò và tên của người dùng, hoặc null nếu chưa đăng nhập.
   */
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

  /**
   * Lấy mã JWT Token hiện tại và tự động kiểm tra thời gian hết hạn (expiration).
   *
   * @returns {string | null} Trả về chuỗi JWT Token hợp lệ hoặc null nếu không tồn tại hoặc đã hết hạn.
   */
  getToken(): string | null {
    const token = this.getStoredValue("authToken");
    if (!token) return null;

    // Lấy thời điểm hết hạn được lưu trữ
    const expiryStr = this.getStoredValue("tokenExpiry");
    if (expiryStr) {
      const expiry = parseInt(expiryStr, 10);
      
      /**
       * Nếu thời gian hiện tại của trình duyệt đã vượt quá thời điểm hết hạn
       * hệ thống sẽ tự động thực hiện đăng xuất và phát ra một sự kiện toàn cục.
       */
      if (Date.now() >= expiry) {
        this.logout();
        // Phát sự kiện để báo cho React Components cập nhật lại giao diện và điều hướng về trang Login
        window.dispatchEvent(new Event("session:expired"));
        return null;
      }
    }

    return token;
  },

  /**
   * Lấy Tên đăng nhập (Username) của người dùng hiện tại đang đăng nhập.
   * Thường dùng làm khóa phụ hoặc phục vụ các API cần truyền username làm định danh.
   *
   * @returns {string | null} Tên đăng nhập hoặc null nếu chưa có phiên đăng nhập nào.
   */
  getUsername(): string | null {
    return this.getStoredValue("username");
  },

  /**
   * Hàm trợ giúp nội bộ để truy xuất dữ liệu từ LocalStorage hoặc SessionStorage.
   * Ưu tiên LocalStorage trước để đảm bảo tính đồng bộ liên tab.
   *
   * @param {string} key Tên khóa dữ liệu cần truy xuất.
   * @returns {string | null} Giá trị tương ứng dạng chuỗi hoặc null nếu không tìm thấy.
   */
  getStoredValue(key: string): string | null {
    return localStorage.getItem(key) || sessionStorage.getItem(key);
  },

  /**
   * --------------------------------------------------------------------------
   * CÁC API THAO TÁC HỒ SƠ CÁ NHÂN (USER PROFILE APIS)
   * --------------------------------------------------------------------------
   */

  /**
   * Lấy thông tin hồ sơ chi tiết của tài khoản hiện tại đang đăng nhập từ Backend.
   * API này sử dụng `authFetch` nên yêu cầu phải có Token hợp lệ đính kèm trong header.
   *
   * @returns {Promise<UserProfile>} Thông tin hồ sơ chi tiết của người dùng.
   * @throws {Error} Trả về lỗi nếu không thể kết nối hoặc token không hợp lệ.
   */
  async getProfile(): Promise<UserProfile> {
    const response = await authFetch(`${API_URL}/profile`);
    const result: ApiResponse<UserProfile> = await safeJson(response);
    if (!response.ok) throw new Error(result.message || "Không thể tải thông tin hồ sơ.");
    return result.data;
  },

  /**
   * Gửi yêu cầu cập nhật thông tin hồ sơ cá nhân hoặc thay đổi mật khẩu tài khoản.
   *
   * @param {Object} payload Dữ liệu cần cập nhật của người dùng.
   * @param {string} payload.fullName Họ và tên mới cần cập nhật.
   * @param {string} payload.email Địa chỉ email mới.
   * @param {string} payload.phone Số điện thoại mới.
   * @param {string} [payload.address] Địa chỉ cư trú tùy chọn.
   * @param {string} [payload.newPassword] Mật khẩu mới nếu muốn đổi mật khẩu.
   * @param {string} [payload.oldPassword] Mật khẩu cũ (bắt buộc truyền nếu có thay đổi mật khẩu).
   * @returns {Promise<UserProfile>} Đối tượng hồ sơ người dùng sau khi đã cập nhật thành công.
   * @throws {Error} Trả về lỗi từ Backend (ví dụ: email đã trùng, mật khẩu cũ sai).
   */
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

  /**
   * Xác nhận lại mật khẩu hiện tại của người dùng.
   * Thường được dùng làm lớp bảo vệ thứ hai trước khi cho phép thực hiện các thao tác quan trọng
   * như thay đổi cấu hình bảo mật hoặc rút tiền ví điện tử nội bộ.
   *
   * @param {string} password Mật khẩu hiện tại cần xác minh.
   * @returns {Promise<void>} Trả về Promise rỗng nếu mật khẩu chính xác.
   * @throws {Error} Ném lỗi nếu mật khẩu truyền vào không khớp với dữ liệu trên Server.
   */
  async confirmPassword(password: string): Promise<void> {
    const response = await authFetch(`${API_URL}/profile/confirm-password`, {
      method: "POST",
      body: JSON.stringify({ password })
    });
    const result: ApiResponse<null> = await safeJson(response);
    if (!response.ok) throw new Error(result.message || "Mật khẩu hiện tại không chính xác.");
  },

  /**
   * --------------------------------------------------------------------------
   * CÁC API PHỤC VỤ LUỒNG ĐĂNG KÝ VÀ PHỤC HỒI TÀI KHOẢN (REGISTRATION & PASSWORD RECOVERY)
   * --------------------------------------------------------------------------
   */

  /**
   * Đăng ký một tài khoản khách hàng mới vào hệ thống gửi xe.
   * Khách hàng tự điền các thông tin họ tên, email, số điện thoại, mật khẩu để đăng ký.
   * Sau khi đăng ký thành công, hệ thống thường sẽ gửi một email xác thực tài khoản.
   *
   * @param {any} payload Gói dữ liệu chứa thông tin đăng ký của khách hàng.
   * @returns {Promise<void>} Không trả về giá trị nếu đăng ký thành công.
   * @throws {Error} Lỗi nếu dữ liệu đầu vào không hợp lệ hoặc email/username đã được sử dụng.
   */
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

  /**
   * Xác thực tài khoản thông qua đường dẫn liên kết được gửi tới email của người dùng.
   * Quá trình này giúp đảm bảo email người dùng đăng ký là có thật và chính chủ.
   *
   * @param {string} token Mã xác thực (Token) được trích xuất từ URL của liên kết trong email.
   * @returns {Promise<void>}
   * @throws {Error} Trả về lỗi nếu token xác thực đã quá hạn hoặc không đúng.
   */
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

  /**
   * Gửi yêu cầu lấy lại mật khẩu khi người dùng quên mật khẩu đăng nhập.
   * Backend sẽ tiếp nhận email và gửi một mã token đặt lại mật khẩu về email của khách hàng.
   *
   * @param {string} email Địa chỉ email của tài khoản cần khôi phục mật khẩu.
   * @returns {Promise<void>}
   * @throws {Error} Trả về lỗi nếu email không tồn tại trong hệ thống.
   */
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

  /**
   * Đặt lại mật khẩu mới cho tài khoản dựa vào token bảo mật được cấp từ email.
   *
   * @param {any} payload Dữ liệu chứa mã token khôi phục và mật khẩu mới thiết lập.
   * @returns {Promise<void>}
   * @throws {Error} Trả về lỗi nếu mã token hết hạn hoặc không khớp.
   */
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

/**
 * ============================================================================
 * SECTION 6: ĐỊNH NGHĨA KIỂU HỒ SƠ NGƯỜI DÙNG CHÂN THỰC (USER PROFILE DTO SCHEMA)
 * ============================================================================
 */

/**
 * Interface UserProfile
 * Định nghĩa cấu trúc dữ liệu chi tiết của Hồ sơ cá nhân người dùng (User Profile).
 * Chứa các thông tin đầy đủ nhất để hiển thị tại giao diện Trang cá nhân hoặc Quản trị thông tin.
 */
export interface UserProfile {
  /**
   * Mã định danh tài khoản duy nhất của người dùng sở hữu hồ sơ.
   */
  accountId: number;

  /**
   * Tên đăng nhập của tài khoản (Username).
   */
  username: string;

  /**
   * Họ và tên đầy đủ của người dùng (ví dụ: "Nguyễn Văn B").
   */
  fullName: string;

  /**
   * Vai trò phân quyền của tài khoản trong hệ thống ("admin", "staff" hoặc "customer").
   */
  role: string;

  /**
   * Trạng thái hoạt động của tài khoản người dùng tại thời điểm truy vấn.
   * Các giá trị chuẩn: "ACTIVE", "LOCKED", "INACTIVE".
   */
  status: string;

  /**
   * Địa chỉ email liên lạc chính thức của tài khoản.
   */
  email: string;

  /**
   * Số điện thoại liên lạc của người dùng.
   */
  phone: string;

  /**
   * Địa chỉ cư trú hoặc nơi làm việc tùy chọn của người dùng.
   */
  address?: string;

  /**
   * Ca làm việc được gán cho nhân viên (chỉ áp dụng cho vai trò "STAFF").
   * Ví dụ: "Ca Sáng (06:00 - 14:00)", "Ca Chiều (14:00 - 22:00)", "Ca Đêm".
   */
  shift?: string;

  /**
   * Mã số nhân viên định danh nội bộ (chỉ áp dụng cho vai trò "STAFF").
   * Ví dụ: "STAFF-0012", "ST-2026-99".
   */
  staffCode?: string;

  /**
   * Ngày giờ khởi tạo bản ghi thông tin người dùng này trong hệ thống.
   */
  createdAt: string;
}
