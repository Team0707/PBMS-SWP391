import { useEffect, useState } from "react";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  Clock,
  Edit2,
  Save,
  X,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  ShieldCheck,
  CheckCircle,
} from "lucide-react";

interface DashboardProps {
  adminName?: string;
}

interface AdminProfile {
  hoTen: string;
  tenDangNhap: string;
  email: string;
  soDienThoai: string;
  ngayTaoTaiKhoan: string;
  vaiTro: string;
}

interface FormErrors {
  hoTen?: string;
  email?: string;
  soDienThoai?: string;
  newPassword?: string;
  confirmPassword?: string;
}

const initialProfile: AdminProfile = {
  hoTen: "Quản trị hệ thống",
  tenDangNhap: "admin",
  email: "admin@parking.vn",
  soDienThoai: "0909 888 777",
  ngayTaoTaiKhoan: "01/01/2023",
  vaiTro: "Quản trị viên hệ thống",
};

// Mật khẩu dùng để test frontend
const DEMO_CURRENT_PASSWORD = "123456";

export default function Dashboard({
  adminName = "Quản trị hệ thống",
}: DashboardProps) {
  const [profile, setProfile] = useState<AdminProfile>({
    ...initialProfile,
    hoTen: adminName,
  });

  const [form, setForm] = useState<AdminProfile>({
    ...initialProfile,
    hoTen: adminName,
  });

  // Đồng hồ
  const [now, setNow] = useState(new Date());

  // Modal xác nhận mật khẩu hiện tại
  const [showPasswordConfirmation, setShowPasswordConfirmation] =
    useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] =
    useState(false);

  const [currentPasswordError, setCurrentPasswordError] =
    useState("");

  const [checkingPassword, setCheckingPassword] =
    useState(false);

  // Modal chỉnh sửa hồ sơ
  const [showEdit, setShowEdit] = useState(false);

  // Đổi mật khẩu
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] =
    useState("");

  const [showNewPassword, setShowNewPassword] =
    useState(false);

  const [showConfirmNewPassword, setShowConfirmNewPassword] =
    useState(false);

  // Lỗi form
  const [errors, setErrors] = useState<FormErrors>({});

  // Thông báo thành công
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const initials = profile.hoTen
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .slice(-2)
    .join("")
    .toUpperCase();

  const dateStr = now.toLocaleDateString("vi-VN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const timeStr = now.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  // Mở modal xác nhận mật khẩu
  const openPasswordConfirmation = () => {
    setCurrentPassword("");
    setCurrentPasswordError("");
    setShowCurrentPassword(false);
    setSaved(false);
    setShowPasswordConfirmation(true);
  };

  // Đóng modal xác nhận mật khẩu
  const closePasswordConfirmation = () => {
    setShowPasswordConfirmation(false);
    setCurrentPassword("");
    setCurrentPasswordError("");
    setShowCurrentPassword(false);
    setCheckingPassword(false);
  };

  // Mở modal chỉnh sửa hồ sơ
  const openEditForm = () => {
    setForm(profile);
    setNewPassword("");
    setConfirmNewPassword("");
    setShowNewPassword(false);
    setShowConfirmNewPassword(false);
    setErrors({});
    setShowEdit(true);
  };

  // Xác nhận mật khẩu hiện tại
  const handleConfirmCurrentPassword = async () => {
    if (!currentPassword.trim()) {
      setCurrentPasswordError(
        "Vui lòng nhập mật khẩu hiện tại."
      );
      return;
    }

    setCheckingPassword(true);
    setCurrentPasswordError("");

    try {
      /*
        Khi đã có backend, thay phần demo bên dưới bằng API:

        const response = await fetch(
          "/api/admin/profile/confirm-password",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem(
                "token"
              )}`,
            },
            body: JSON.stringify({
              password: currentPassword,
            }),
          }
        );

        if (!response.ok) {
          throw new Error("Mật khẩu không chính xác.");
        }
      */

      // Giả lập thời gian gọi API
      await new Promise((resolve) => {
        window.setTimeout(resolve, 400);
      });

      if (currentPassword !== DEMO_CURRENT_PASSWORD) {
        setCurrentPasswordError(
          "Mật khẩu hiện tại không chính xác."
        );
        return;
      }

      setShowPasswordConfirmation(false);
      setCurrentPassword("");
      setCurrentPasswordError("");

      openEditForm();
    } catch (error) {
      setCurrentPasswordError(
        error instanceof Error
          ? error.message
          : "Không thể xác nhận mật khẩu."
      );
    } finally {
      setCheckingPassword(false);
    }
  };

  // Đóng form chỉnh sửa
  const closeEdit = () => {
    setShowEdit(false);
    setForm(profile);
    setNewPassword("");
    setConfirmNewPassword("");
    setShowNewPassword(false);
    setShowConfirmNewPassword(false);
    setErrors({});
  };

  // Kiểm tra dữ liệu
  const validateForm = () => {
    const newErrors: FormErrors = {};

    if (!form.hoTen.trim()) {
      newErrors.hoTen = "Vui lòng nhập họ và tên.";
    }

    if (!form.email.trim()) {
      newErrors.email = "Vui lòng nhập email.";
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        form.email.trim()
      )
    ) {
      newErrors.email = "Email không đúng định dạng.";
    }

    if (!form.soDienThoai.trim()) {
      newErrors.soDienThoai =
        "Vui lòng nhập số điện thoại.";
    } else {
      const normalizedPhone = form.soDienThoai.replace(
        /\s/g,
        ""
      );

      if (!/^(0|\+84)[0-9]{9,10}$/.test(normalizedPhone)) {
        newErrors.soDienThoai =
          "Số điện thoại không hợp lệ.";
      }
    }



    // Chỉ kiểm tra đổi mật khẩu khi admin nhập ít nhất một ô
    if (newPassword || confirmNewPassword) {
      if (!newPassword) {
        newErrors.newPassword =
          "Vui lòng nhập mật khẩu mới.";
      } else if (newPassword.length < 6) {
        newErrors.newPassword =
          "Mật khẩu phải có ít nhất 6 ký tự.";
      } else if (newPassword === currentPassword) {
        newErrors.newPassword =
          "Mật khẩu mới không được giống mật khẩu hiện tại.";
      }

      if (!confirmNewPassword) {
        newErrors.confirmPassword =
          "Vui lòng xác nhận mật khẩu mới.";
      } else if (newPassword !== confirmNewPassword) {
        newErrors.confirmPassword =
          "Mật khẩu xác nhận không khớp.";
      }
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  // Lưu hồ sơ
  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      /*
        Khi đã có backend:

        const response = await fetch("/api/admin/profile", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem(
              "token"
            )}`,
          },
          body: JSON.stringify({
            fullName: form.hoTen,
            email: form.email,
            phone: form.soDienThoai,
            department: form.boPhan,
            newPassword: newPassword || null,
            confirmNewPassword:
              confirmNewPassword || null,
          }),
        });

        if (!response.ok) {
          throw new Error(
            "Không thể cập nhật hồ sơ quản trị viên."
          );
        }

        const updatedProfile = await response.json();
      */

      setProfile({
        ...form,
        hoTen: form.hoTen.trim(),
        email: form.email.trim(),
        soDienThoai: form.soDienThoai.trim(),
      });

      setShowEdit(false);
      setNewPassword("");
      setConfirmNewPassword("");
      setErrors({});
      setSaved(true);

      window.setTimeout(() => {
        setSaved(false);
      }, 2500);
    } catch (error) {
      console.error(error);
    }
  };

  // Cập nhật từng trường trong form
  const updateProfileField = (
    field: keyof AdminProfile,
    value: string
  ) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    if (
      field === "hoTen" ||
      field === "email" ||
      field === "soDienThoai"
    ) {
      setErrors((previous) => ({
        ...previous,
        [field]: undefined,
      }));
    }
  };

  const profileRows = [
    {
      icon: User,
      label: "Họ và tên",
      value: profile.hoTen,
    },
    {
      icon: User,
      label: "Tên đăng nhập",
      value: profile.tenDangNhap,
    },
    {
      icon: Mail,
      label: "Email",
      value: profile.email,
    },
    {
      icon: Phone,
      label: "Số điện thoại",
      value: profile.soDienThoai,
    },
    {
      icon: Calendar,
      label: "Ngày tạo tài khoản",
      value: profile.ngayTaoTaiKhoan,
    },
    {
      icon: Shield,
      label: "Vai trò",
      value: profile.vaiTro,
    },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-3">
      {/* Ngày và giờ */}
      <div className="bg-white border border-gray-200 rounded shadow-sm px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-500" />

          <span className="text-sm text-gray-700 font-medium capitalize">
            {dateStr}
          </span>
        </div>

        <span className="text-sm font-semibold text-blue-700 tabular-nums">
          {timeStr}
        </span>
      </div>

      {/* Hồ sơ Admin */}
      <div className="bg-white border border-gray-200 rounded shadow-sm overflow-hidden">
        {/* Banner */}
        <div className="h-24 bg-gradient-to-r from-[#1a3560] to-blue-600" />

        <div className="px-6 pb-5">
          {/* Avatar, tên và nút chỉnh sửa */}
          <div className="flex items-end gap-4 -mt-10 mb-4">
            <div className="w-20 h-20 rounded-full bg-blue-600 border-4 border-white shadow flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
              {initials}
            </div>

            <div className="pb-1 flex-1 flex items-end justify-between gap-3">
              <div>
                <div className="text-lg font-bold text-gray-800">
                  {profile.hoTen}
                </div>

                <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-200">
                    <Shield className="w-3 h-3" />
                    Admin
                  </span>

                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                    <ShieldCheck className="w-3 h-3" />
                    Toàn quyền
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={openEditForm}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors flex-shrink-0"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Chỉnh sửa hồ sơ
              </button>
            </div>
          </div>

          {/* Thông báo lưu thành công */}
          {saved && (
            <div className="mb-3 px-3 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5" />
              Hồ sơ quản trị viên đã được cập nhật thành công
            </div>
          )}

          {/* Danh sách thông tin */}
          <div className="divide-y divide-gray-100">
            {profileRows.map(
              ({ icon: Icon, label, value }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 py-3"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-blue-500" />
                  </div>

                  <div className="flex-1 flex justify-between items-center gap-4">
                    <span className="text-xs text-gray-500">
                      {label}
                    </span>

                    <span className="text-sm font-medium text-gray-800 text-right">
                      {value}
                    </span>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Modal xác nhận mật khẩu */}
      {showPasswordConfirmation && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] px-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-[430px] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 bg-blue-600">
              <span className="text-white text-sm font-semibold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                Xác nhận mật khẩu Admin
              </span>

              <button
                type="button"
                onClick={closePasswordConfirmation}
                className="text-white/80 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Nội dung */}
            <div className="p-5">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Lock className="w-5 h-5 text-blue-600" />
                </div>

                <div>
                  <div className="text-sm font-semibold text-gray-800">
                    Xác nhận danh tính
                  </div>

                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    Vui lòng nhập mật khẩu hiện tại trước khi
                    chỉnh sửa thông tin quản trị viên.
                  </p>
                </div>
              </div>

              <label
                htmlFor="admin-current-password"
                className="block text-xs text-gray-600 mb-1"
              >
                Mật khẩu hiện tại
                <span className="text-red-500 ml-1">*</span>
              </label>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />

                <input
                  id="admin-current-password"
                  type={
                    showCurrentPassword ? "text" : "password"
                  }
                  autoFocus
                  value={currentPassword}
                  onChange={(event) => {
                    setCurrentPassword(event.target.value);
                    setCurrentPasswordError("");
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      void handleConfirmCurrentPassword();
                    }
                  }}
                  className={`w-full h-[38px] border rounded pl-9 pr-10 text-sm focus:outline-none focus:ring-1 ${
                    currentPasswordError
                      ? "border-red-400 focus:border-red-400 focus:ring-red-100"
                      : "border-gray-300 focus:border-blue-400 focus:ring-blue-100"
                  }`}
                  placeholder="Nhập mật khẩu hiện tại..."
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowCurrentPassword(
                      (previous) => !previous
                    )
                  }
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={
                    showCurrentPassword
                      ? "Ẩn mật khẩu"
                      : "Hiện mật khẩu"
                  }
                >
                  {showCurrentPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>

              {currentPasswordError && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-red-600">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  {currentPasswordError}
                </div>
              )}

              <div className="mt-4 px-3 py-2.5 rounded bg-amber-50 border border-amber-200 text-xs text-amber-700">
                Mật khẩu demo là{" "}
                <span className="font-semibold">123456</span>.
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-200 bg-gray-50">
              <button
                type="button"
                onClick={() => {
                  void handleConfirmCurrentPassword();
                }}
                disabled={checkingPassword}
                className="flex items-center gap-1.5 h-[34px] px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded transition-colors"
              >
                <ShieldCheck className="w-3.5 h-3.5" />

                {checkingPassword
                  ? "Đang kiểm tra..."
                  : "Xác nhận"}
              </button>

              <button
                type="button"
                onClick={closePasswordConfirmation}
                disabled={checkingPassword}
                className="h-[34px] px-3 border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-60 text-sm rounded transition-colors"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal chỉnh sửa hồ sơ Admin */}
      {showEdit && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-[625px] max-h-[92vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-blue-600 flex-shrink-0">
              <span className="text-white text-base font-semibold flex items-center gap-2">
                <Edit2 className="w-5 h-5" />
                Chỉnh sửa hồ sơ Admin
              </span>

              <button
                type="button"
                onClick={closeEdit}
                className="text-white/80 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Nội dung form */}
            <div className="p-6 space-y-4 overflow-y-auto">
              {/* Họ và tên */}
              <div>
                <label
                  htmlFor="admin-full-name"
                  className="block text-sm text-gray-700 mb-1.5"
                >
                  Họ và tên
                  <span className="text-red-500 ml-1">*</span>
                </label>

                <input
                  id="admin-full-name"
                  type="text"
                  value={form.hoTen}
                  onChange={(event) =>
                    updateProfileField(
                      "hoTen",
                      event.target.value
                    )
                  }
                  className={`w-full h-[46px] border rounded-md px-4 text-base focus:outline-none focus:ring-1 ${
                    errors.hoTen
                      ? "border-red-400 focus:border-red-400 focus:ring-red-100"
                      : "border-gray-300 focus:border-blue-400 focus:ring-blue-100"
                  }`}
                  placeholder="Nhập họ và tên..."
                />

                {errors.hoTen && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.hoTen}
                  </p>
                )}
              </div>

              {/* Tên đăng nhập */}
              <div>
                <label
                  htmlFor="admin-username"
                  className="block text-sm text-gray-700 mb-1.5"
                >
                  Tên đăng nhập
                </label>

                <input
                  id="admin-username"
                  type="text"
                  value={form.tenDangNhap}
                  disabled
                  className="w-full h-[46px] border border-gray-200 rounded-md px-4 text-base bg-gray-100 text-gray-500 cursor-not-allowed"
                />

                <p className="mt-1 text-xs text-gray-400">
                  Tên đăng nhập không thể thay đổi.
                </p>
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="admin-email"
                  className="block text-sm text-gray-700 mb-1.5"
                >
                  Email
                  <span className="text-red-500 ml-1">*</span>
                </label>

                <input
                  id="admin-email"
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    updateProfileField(
                      "email",
                      event.target.value
                    )
                  }
                  className={`w-full h-[46px] border rounded-md px-4 text-base focus:outline-none focus:ring-1 ${
                    errors.email
                      ? "border-red-400 focus:border-red-400 focus:ring-red-100"
                      : "border-gray-300 focus:border-blue-400 focus:ring-blue-100"
                  }`}
                  placeholder="Nhập email..."
                />

                {errors.email && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Số điện thoại */}
              <div>
                <label
                  htmlFor="admin-phone"
                  className="block text-sm text-gray-700 mb-1.5"
                >
                  Số điện thoại
                  <span className="text-red-500 ml-1">*</span>
                </label>

                <input
                  id="admin-phone"
                  type="tel"
                  value={form.soDienThoai}
                  onChange={(event) =>
                    updateProfileField(
                      "soDienThoai",
                      event.target.value
                    )
                  }
                  className={`w-full h-[46px] border rounded-md px-4 text-base focus:outline-none focus:ring-1 ${
                    errors.soDienThoai
                      ? "border-red-400 focus:border-red-400 focus:ring-red-100"
                      : "border-gray-300 focus:border-blue-400 focus:ring-blue-100"
                  }`}
                  placeholder="VD: 0909 888 777"
                />

                {errors.soDienThoai && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.soDienThoai}
                  </p>
                )}
              </div>

              {/* Bộ phận */}

              {/* Vai trò */}
              <div>
                <label
                  htmlFor="admin-role"
                  className="block text-sm text-gray-700 mb-1.5"
                >
                  Vai trò
                </label>

                <input
                  id="admin-role"
                  type="text"
                  value={form.vaiTro}
                  disabled
                  className="w-full h-[46px] border border-gray-200 rounded-md px-4 text-base bg-gray-100 text-gray-500 cursor-not-allowed"
                />

                <p className="mt-1 text-xs text-gray-400">
                  Admin không thể tự thay đổi vai trò của mình.
                </p>
              </div>

              {/* Mật khẩu mới */}
              <div>
                <label
                  htmlFor="admin-new-password"
                  className="block text-sm text-gray-700 mb-1.5"
                >
                  <Lock className="w-4 h-4 inline mr-1" />
                  Mật khẩu mới
                  <span className="text-gray-400 ml-1">
                    (để trống nếu không đổi)
                  </span>
                </label>

                <div className="relative">
                  <input
                    id="admin-new-password"
                    type={
                      showNewPassword ? "text" : "password"
                    }
                    value={newPassword}
                    onChange={(event) => {
                      setNewPassword(event.target.value);

                      setErrors((previous) => ({
                        ...previous,
                        newPassword: undefined,
                        confirmPassword: undefined,
                      }));
                    }}
                    className={`w-full h-[46px] border rounded-md px-4 pr-11 text-base focus:outline-none focus:ring-1 ${
                      errors.newPassword
                        ? "border-red-400 focus:border-red-400 focus:ring-red-100"
                        : "border-gray-300 focus:border-blue-400 focus:ring-blue-100"
                    }`}
                    placeholder="Nhập mật khẩu mới..."
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowNewPassword(
                        (previous) => !previous
                      )
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label={
                      showNewPassword
                        ? "Ẩn mật khẩu mới"
                        : "Hiện mật khẩu mới"
                    }
                  >
                    {showNewPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>

                {errors.newPassword && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.newPassword}
                  </p>
                )}
              </div>

              {/* Xác nhận mật khẩu mới */}
              <div>
                <label
                  htmlFor="admin-confirm-new-password"
                  className="block text-sm text-gray-700 mb-1.5"
                >
                  <Lock className="w-4 h-4 inline mr-1" />
                  Xác nhận mật khẩu mới
                </label>

                <div className="relative">
                  <input
                    id="admin-confirm-new-password"
                    type={
                      showConfirmNewPassword
                        ? "text"
                        : "password"
                    }
                    value={confirmNewPassword}
                    onChange={(event) => {
                      setConfirmNewPassword(
                        event.target.value
                      );

                      setErrors((previous) => ({
                        ...previous,
                        confirmPassword: undefined,
                      }));
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        void handleSave();
                      }
                    }}
                    className={`w-full h-[46px] border rounded-md px-4 pr-11 text-base focus:outline-none focus:ring-1 ${
                      errors.confirmPassword
                        ? "border-red-400 focus:border-red-400 focus:ring-red-100"
                        : "border-gray-300 focus:border-blue-400 focus:ring-blue-100"
                    }`}
                    placeholder="Nhập lại mật khẩu mới..."
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmNewPassword(
                        (previous) => !previous
                      )
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label={
                      showConfirmNewPassword
                        ? "Ẩn mật khẩu xác nhận"
                        : "Hiện mật khẩu xác nhận"
                    }
                  >
                    {showConfirmNewPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>

                {errors.confirmPassword && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.confirmPassword}
                  </p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200 bg-white flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  void handleSave();
                }}
                className="flex items-center gap-2 h-[44px] px-5 bg-blue-600 hover:bg-blue-700 text-white text-base font-medium rounded-md transition-colors"
              >
                <Save className="w-4 h-4" />
                Lưu thay đổi
              </button>

              <button
                type="button"
                onClick={closeEdit}
                className="h-[44px] px-4 border border-gray-300 text-gray-700 hover:bg-gray-50 text-base rounded-md transition-colors"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}