import { useState, useEffect } from "react";
import { User, Lock, Eye, EyeOff, ParkingSquare, Loader2, Mail, Phone, MapPin, ArrowLeft } from "lucide-react";
import { authService } from "../../services/authService";

export type UserRole = "admin" | "staff" | "user";

interface LoginProps {
  onLogin: (role: UserRole, name: string) => void;
  initialVerifyStatus?: { success: boolean; message: string } | null;
  initialResetToken?: string | null;
  onClearVerifyStatus?: () => void;
  onClearResetToken?: () => void;
}

export default function Login({
  onLogin,
  initialVerifyStatus,
  initialResetToken,
  onClearVerifyStatus,
  onClearResetToken
}: LoginProps) {
  // Views: 'login' | 'register' | 'forgot' | 'reset'
  const [view, setView] = useState<"login" | "register" | "forgot" | "reset">("login");
  
  // Login fields
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPw, setShowPw] = useState(false);
  
  // Register fields
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regFullName, setRegFullName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regAddress, setRegAddress] = useState("");
  const [showRegPw, setShowRegPw] = useState(false);

  // Forgot password fields
  const [forgotEmail, setForgotEmail] = useState("");

  // Reset password fields
  const [resetPw, setResetPw] = useState("");
  const [resetConfirmPw, setResetConfirmPw] = useState("");
  const [showResetPw, setShowResetPw] = useState(false);
  const [showResetConfirmPw, setShowResetConfirmPw] = useState(false);
  const [currentToken, setCurrentToken] = useState<string | null>(null);

  // Status/Error states
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialResetToken) {
      setCurrentToken(initialResetToken);
      setView("reset");
      if (onClearResetToken) onClearResetToken();
    }
  }, [initialResetToken, onClearResetToken]);

  useEffect(() => {
    if (initialVerifyStatus) {
      if (initialVerifyStatus.success) {
        setSuccessMsg(initialVerifyStatus.message);
        setError("");
      } else {
        setError(initialVerifyStatus.message);
        setSuccessMsg("");
      }
      setView("login");
      if (onClearVerifyStatus) onClearVerifyStatus();
    }
  }, [initialVerifyStatus, onClearVerifyStatus]);

  const switchView = (newView: "login" | "register" | "forgot" | "reset") => {
    setView(newView);
    setError("");
    setSuccessMsg("");
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      const user = await authService.login(username, password, remember);
      onLogin(user.role, user.name);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Có lỗi xảy ra trong quá trình đăng nhập.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regUsername.trim() || !regPassword.trim() || !regFullName.trim() || !regEmail.trim() || !regPhone.trim()) {
      setError("Vui lòng điền đầy đủ các thông tin bắt buộc.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      await authService.register({
        username: regUsername,
        password: regPassword,
        fullName: regFullName,
        email: regEmail,
        phone: regPhone,
        address: regAddress
      });
      setSuccessMsg("Đăng ký tài khoản thành công! Vui lòng kiểm tra email để kích hoạt tài khoản.");
      setView("login");
      // Clear fields
      setRegUsername("");
      setRegPassword("");
      setRegFullName("");
      setRegEmail("");
      setRegPhone("");
      setRegAddress("");
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Có lỗi xảy ra trong quá trình đăng ký.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setError("Vui lòng nhập email của bạn.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      await authService.forgotPassword(forgotEmail);
      setSuccessMsg("Nếu email tồn tại trên hệ thống, một liên kết đặt lại mật khẩu đã được gửi đến email của bạn.");
      setView("login");
      setForgotEmail("");
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Có lỗi xảy ra.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPw.trim() || !resetConfirmPw.trim()) {
      setError("Vui lòng điền đầy đủ mật khẩu mới.");
      return;
    }
    if (resetPw !== resetConfirmPw) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }
    if (!currentToken) {
      setError("Token đặt lại mật khẩu không hợp lệ.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      await authService.resetPassword({
        token: currentToken,
        newPassword: resetPw
      });
      setSuccessMsg("Đặt lại mật khẩu thành công! Bạn có thể đăng nhập bằng mật khẩu mới.");
      setView("login");
      setResetPw("");
      setResetConfirmPw("");
      setCurrentToken(null);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Có lỗi xảy ra khi đặt lại mật khẩu.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-200 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg w-[400px] overflow-hidden">
        {/* Header */}
        <div className="bg-blue-700 px-8 py-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <ParkingSquare className="w-8 h-8 text-white" />
            <span className="text-white text-2xl font-bold tracking-wider">PARKING SYSTEM</span>
          </div>
          <p className="text-blue-200 text-xs">Hệ thống quản lý bãi xe</p>
        </div>

        {/* Content Box */}
        <div className="px-8 py-6">
          {view === "login" && (
            <>
              <h2 className="text-gray-700 text-base font-semibold text-center mb-1">LOGIN</h2>
              <p className="text-gray-500 text-xs text-center mb-5">Thông tin tài khoản</p>
            </>
          )}
          {view === "register" && (
            <>
              <h2 className="text-gray-700 text-base font-semibold text-center mb-1">REGISTER</h2>
              <p className="text-gray-500 text-xs text-center mb-5">Tạo tài khoản mới</p>
            </>
          )}
          {view === "forgot" && (
            <>
              <h2 className="text-gray-700 text-base font-semibold text-center mb-1">FORGOT PASSWORD</h2>
              <p className="text-gray-500 text-xs text-center mb-5">Khôi phục mật khẩu tài khoản</p>
            </>
          )}
          {view === "reset" && (
            <>
              <h2 className="text-gray-700 text-base font-semibold text-center mb-1">RESET PASSWORD</h2>
              <p className="text-gray-500 text-xs text-center mb-5">Đặt lại mật khẩu mới</p>
            </>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-3 py-2 rounded mb-4">
              {error}
            </div>
          )}
          
          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs px-3 py-2 rounded mb-4">
              {successMsg}
            </div>
          )}

          {/* VIEW: LOGIN */}
          {view === "login" && (
            <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Tên đăng nhập</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    disabled={loading}
                    placeholder="Nhập tên đăng nhập"
                    className="w-full h-[38px] border border-gray-300 rounded pl-9 pr-3 text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs text-gray-600">Mật khẩu</label>
                  <button
                    type="button"
                    onClick={() => switchView("forgot")}
                    className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium"
                  >
                    Quên mật khẩu?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    disabled={loading}
                    placeholder="Nhập mật khẩu"
                    className="w-full h-[38px] border border-gray-300 rounded pl-9 pr-9 text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    disabled={loading}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="remember"
                  checked={remember}
                  onChange={e => setRemember(e.target.checked)}
                  disabled={loading}
                  className="cursor-pointer disabled:cursor-not-allowed"
                />
                <label htmlFor="remember" className="text-xs text-gray-600 cursor-pointer disabled:cursor-not-allowed">
                  Ghi nhớ đăng nhập
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-[40px] bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded transition-colors mt-1 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang đăng nhập...
                  </>
                ) : (
                  "Đăng nhập"
                )}
              </button>

              <div className="text-center mt-3">
                <span className="text-xs text-gray-500">Chưa có tài khoản? </span>
                <button
                  type="button"
                  onClick={() => switchView("register")}
                  className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium"
                >
                  Đăng ký tài khoản
                </button>
              </div>
            </form>
          )}

          {/* VIEW: REGISTER */}
          {view === "register" && (
            <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-3 max-h-[420px] overflow-y-auto pr-1">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Tên đăng nhập <span className="text-red-500">*</span></label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={regUsername}
                    onChange={e => setRegUsername(e.target.value)}
                    disabled={loading}
                    placeholder="Nhập tên đăng nhập"
                    required
                    className="w-full h-[38px] border border-gray-300 rounded pl-9 pr-3 text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">Họ và tên <span className="text-red-500">*</span></label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={regFullName}
                    onChange={e => setRegFullName(e.target.value)}
                    disabled={loading}
                    placeholder="Nhập họ và tên của bạn"
                    required
                    className="w-full h-[38px] border border-gray-300 rounded pl-9 pr-3 text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">Mật khẩu <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showRegPw ? "text" : "password"}
                    value={regPassword}
                    onChange={e => setRegPassword(e.target.value)}
                    disabled={loading}
                    placeholder="Nhập mật khẩu (tối thiểu 6 ký tự)"
                    required
                    className="w-full h-[38px] border border-gray-300 rounded pl-9 pr-9 text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPw(!showRegPw)}
                    disabled={loading}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showRegPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">Email <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={regEmail}
                    onChange={e => setRegEmail(e.target.value)}
                    disabled={loading}
                    placeholder="Nhập địa chỉ email của bạn"
                    required
                    className="w-full h-[38px] border border-gray-300 rounded pl-9 pr-3 text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">Số điện thoại <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={regPhone}
                    onChange={e => setRegPhone(e.target.value)}
                    disabled={loading}
                    placeholder="Nhập số điện thoại"
                    required
                    className="w-full h-[38px] border border-gray-300 rounded pl-9 pr-3 text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">Địa chỉ</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={regAddress}
                    onChange={e => setRegAddress(e.target.value)}
                    disabled={loading}
                    placeholder="Nhập địa chỉ (không bắt buộc)"
                    className="w-full h-[38px] border border-gray-300 rounded pl-9 pr-3 text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-[40px] bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded transition-colors mt-2 flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang đăng ký...
                  </>
                ) : (
                  "Đăng ký"
                )}
              </button>

              <button
                type="button"
                onClick={() => switchView("login")}
                className="flex items-center justify-center gap-1.5 text-xs text-gray-600 hover:text-blue-600 mt-2 py-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Quay lại đăng nhập
              </button>
            </form>
          )}

          {/* VIEW: FORGOT PASSWORD */}
          {view === "forgot" && (
            <form onSubmit={handleForgotSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Email tài khoản</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    disabled={loading}
                    placeholder="Nhập email của tài khoản cần lấy lại mật khẩu"
                    required
                    className="w-full h-[38px] border border-gray-300 rounded pl-9 pr-3 text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-[40px] bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded transition-colors mt-1 flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  "Gửi yêu cầu đặt lại mật khẩu"
                )}
              </button>

              <button
                type="button"
                onClick={() => switchView("login")}
                className="flex items-center justify-center gap-1.5 text-xs text-gray-600 hover:text-blue-600 mt-2 py-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Quay lại đăng nhập
              </button>
            </form>
          )}

          {/* VIEW: RESET PASSWORD */}
          {view === "reset" && (
            <form onSubmit={handleResetSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Mật khẩu mới</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showResetPw ? "text" : "password"}
                    value={resetPw}
                    onChange={e => setResetPw(e.target.value)}
                    disabled={loading}
                    placeholder="Nhập mật khẩu mới"
                    required
                    className="w-full h-[38px] border border-gray-300 rounded pl-9 pr-9 text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPw(!showResetPw)}
                    disabled={loading}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showResetPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">Xác nhận mật khẩu mới</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showResetConfirmPw ? "text" : "password"}
                    value={resetConfirmPw}
                    onChange={e => setResetConfirmPw(e.target.value)}
                    disabled={loading}
                    placeholder="Nhập lại mật khẩu mới"
                    required
                    className="w-full h-[38px] border border-gray-300 rounded pl-9 pr-9 text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetConfirmPw(!showResetConfirmPw)}
                    disabled={loading}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showResetConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-[40px] bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded transition-colors mt-1 flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang cập nhật...
                  </>
                ) : (
                  "Lưu mật khẩu mới"
                )}
              </button>

              <button
                type="button"
                onClick={() => switchView("login")}
                className="flex items-center justify-center gap-1.5 text-xs text-gray-600 hover:text-blue-600 mt-2 py-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Quay lại đăng nhập
              </button>
            </form>
          )}

          <p className="text-center text-xs text-gray-400 mt-5">
            © 2026 KzParking - Hệ thống quản lý bãi xe thông minh
          </p>
        </div>
      </div>
    </div>
  );
}
