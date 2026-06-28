import { useEffect, useState } from "react";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
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
  Loader2,
} from "lucide-react";
import { authService } from "../../../services/authService";

interface UserDashboardProps {
  userName: string;
}

interface Profile {
  hoTen: string;
  email: string;
  soDienThoai: string;
  diaChi: string;
  ngayDangKy: string;
}

interface FormErrors {
  hoTen?: string;
  email?: string;
  soDienThoai?: string;
  diaChi?: string;
  newPassword?: string;
  confirmPassword?: string;
}

const initialProfile: Profile = {
  hoTen: "Nguyễn Văn An",
  email: "nguyen.van.an@gmail.com",
  soDienThoai: "0901 234 567",
  diaChi: "123 Lê Lợi, Quận 1, TP.HCM",
  ngayDangKy: "15/03/2023",
};

// Chỉ dùng để demo frontend
export default function UserDashboard({
  userName,
}: UserDashboardProps) {
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [form, setForm] = useState<Profile>(initialProfile);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Xác nhận mật khẩu hiện tại
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [currentPasswordError, setCurrentPasswordError] = useState("");
  const [checkingPassword, setCheckingPassword] = useState(false);

  // Chỉnh sửa hồ sơ
  const [showEdit, setShowEdit] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] =
    useState(false);

  const [errors, setErrors] = useState<FormErrors>({});
  const [saved, setSaved] = useState(false);

  // Đồng hồ
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await authService.getProfile();
        const formattedProfile: Profile = {
          hoTen: data.fullName,
          email: data.email,
          soDienThoai: data.phone,
          diaChi: data.address || "",
          ngayDangKy: data.createdAt ? new Date(data.createdAt).toLocaleDateString("vi-VN") : "15/03/2023",
        };
        setProfile(formattedProfile);
        setForm(formattedProfile);
      } catch (err) {
        console.error("Error loading user profile", err);
      } finally {
        setLoadingProfile(false);
      }
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const initials = profile.hoTen
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .slice(-2)
    .join("")
    .toUpperCase();

  const timeStr = now.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const dateStr = now.toLocaleDateString("vi-VN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const openPasswordConfirmation = () => {
    setCurrentPassword("");
    setCurrentPasswordError("");
    setShowCurrentPassword(false);
    setShowConfirmPassword(true);
    setSaved(false);
  };

  const closePasswordConfirmation = () => {
    setShowConfirmPassword(false);
    setCurrentPassword("");
    setCurrentPasswordError("");
    setShowCurrentPassword(false);
    setCheckingPassword(false);
  };

  const openEditForm = () => {
    setForm(profile);
    setNewPassword("");
    setConfirmNewPassword("");
    setShowNewPassword(false);
    setShowConfirmNewPassword(false);
    setErrors({});
    setShowEdit(true);
  };

  const handleConfirmCurrentPassword = async () => {
    if (!currentPassword.trim()) {
      setCurrentPasswordError("Vui lòng nhập mật khẩu hiện tại.");
      return;
    }

    setCheckingPassword(true);
    setCurrentPasswordError("");

    try {
      await authService.confirmPassword(currentPassword);

      setShowConfirmPassword(false);
      setCurrentPassword("");
      setCurrentPasswordError("");

      openEditForm();
    } catch (error) {
      setCurrentPasswordError("Mật khẩu không chính xác.");
    } finally {
      setCheckingPassword(false);
    }
  };

  const closeEdit = () => {
    setShowEdit(false);
    setForm(profile);
    setNewPassword("");
    setConfirmNewPassword("");
    setShowNewPassword(false);
    setShowConfirmNewPassword(false);
    setErrors({});
  };

  const validateForm = () => {
    const newErrors: FormErrors = {};

    if (!form.hoTen.trim()) {
      newErrors.hoTen = "Vui lòng nhập họ và tên.";
    }

    if (!form.email.trim()) {
      newErrors.email = "Vui lòng nhập email.";
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
    ) {
      newErrors.email = "Email không đúng định dạng.";
    }

    if (!form.soDienThoai.trim()) {
      newErrors.soDienThoai = "Vui lòng nhập số điện thoại.";
    } else {
      const normalizedPhone = form.soDienThoai.replace(/\s/g, "");

      if (!/^(0|\+84)[0-9]{9,10}$/.test(normalizedPhone)) {
        newErrors.soDienThoai = "Số điện thoại không hợp lệ.";
      }
    }

    if (!form.diaChi.trim()) {
      newErrors.diaChi = "Vui lòng nhập địa chỉ.";
    }

    // Có nhập một trong hai ô mật khẩu
    if (newPassword || confirmNewPassword) {
      if (!newPassword) {
        newErrors.newPassword = "Vui lòng nhập mật khẩu mới.";
      } else if (newPassword.length < 6) {
        newErrors.newPassword = "Mật khẩu phải có ít nhất 6 ký tự.";
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

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      const updatedData = await authService.updateProfile({
        fullName: form.hoTen,
        email: form.email,
        phone: form.soDienThoai,
        address: form.diaChi,
        newPassword: newPassword || undefined
      });

      const formattedProfile: Profile = {
        hoTen: updatedData.fullName,
        email: updatedData.email,
        soDienThoai: updatedData.phone,
        diaChi: updatedData.address || "",
        ngayDangKy: updatedData.createdAt ? new Date(updatedData.createdAt).toLocaleDateString("vi-VN") : "15/03/2023",
      };

      setProfile(formattedProfile);
      setForm(formattedProfile);

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
      alert(error instanceof Error ? error.message : "Không thể cập nhật hồ sơ.");
    }
  };

  const updateProfileField = (
    field: keyof Profile,
    value: string
  ) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    setErrors((previous) => ({
      ...previous,
      [field]: undefined,
    }));
  };

  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-3">
      {/* Ngày giờ */}
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

      {/* Hồ sơ */}
      <div className="bg-white border border-gray-200 rounded shadow-sm overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-[#1a3560] to-emerald-600" />

        <div className="px-6 pb-5">
          <div className="flex items-end gap-4 -mt-10 mb-4">
            <div className="w-20 h-20 rounded-full bg-emerald-500 border-4 border-white shadow flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
              {initials}
            </div>

            <div className="pb-1 flex-1 flex items-end justify-between">
              <div>
                <div className="text-lg font-bold text-gray-800">
                  {profile.hoTen}
                </div>

                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200 mt-0.5">
                  <User className="w-3 h-3" />
                  Thành viên
                </span>
              </div>

              <button
                type="button"
                onClick={openEditForm}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Chỉnh sửa hồ sơ
              </button>
            </div>
          </div>

          {saved && (
            <div className="mb-3 px-3 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5" />
              Hồ sơ đã được cập nhật thành công
            </div>
          )}

          <div className="divide-y divide-gray-100">
            {(
              [
                {
                  icon: User,
                  label: "Họ và tên",
                  value: profile.hoTen,
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
                  icon: MapPin,
                  label: "Địa chỉ",
                  value: profile.diaChi,
                },
                {
                  icon: Calendar,
                  label: "Ngày đăng ký",
                  value: profile.ngayDangKy,
                },
              ] as {
                icon: React.FC<{ className?: string }>;
                label: string;
                value: string;
              }[]
            ).map(({ icon: Icon, label, value }) => (
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
            ))}
          </div>
        </div>
      </div>

      {/* Modal xác nhận mật khẩu hiện tại */}
      {showConfirmPassword && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] px-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-[430px] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 bg-blue-600">
              <span className="text-white text-sm font-semibold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                Xác nhận mật khẩu
              </span>

              <button
                type="button"
                onClick={closePasswordConfirmation}
                className="text-white/80 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

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
                    Vui lòng nhập mật khẩu hiện tại trước khi chỉnh
                    sửa thông tin hồ sơ.
                  </p>
                </div>
              </div>

              <label
                htmlFor="current-password"
                className="block text-xs text-gray-600 mb-1"
              >
                Mật khẩu hiện tại
                <span className="text-red-500 ml-1">*</span>
              </label>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />

                <input
                  id="current-password"
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
                      handleConfirmCurrentPassword();
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
                    setShowCurrentPassword((previous) => !previous)
                  }
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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

            <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-200 bg-gray-50">
              <button
                type="button"
                onClick={handleConfirmCurrentPassword}
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

      {/* Modal chỉnh sửa hồ sơ */}
      {showEdit && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-[625px] max-h-[92vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-blue-600 flex-shrink-0">
              <span className="text-white text-base font-semibold flex items-center gap-2">
                <Edit2 className="w-5 h-5" />
                Chỉnh sửa hồ sơ
              </span>

              <button
                type="button"
                onClick={closeEdit}
                className="text-white/80 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 overflow-y-auto">
              {/* Họ tên */}
              <div>
                <label className="block text-sm text-gray-700 mb-1.5">
                  Họ và tên
                </label>

                <input
                  type="text"
                  value={form.hoTen}
                  onChange={(event) =>
                    updateProfileField("hoTen", event.target.value)
                  }
                  className={`w-full h-[46px] border rounded-md px-4 text-base focus:outline-none focus:ring-1 ${
                    errors.hoTen
                      ? "border-red-400 focus:border-red-400 focus:ring-red-100"
                      : "border-gray-300 focus:border-blue-400 focus:ring-blue-100"
                  }`}
                  placeholder="Nhập họ tên..."
                />

                {errors.hoTen && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.hoTen}
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm text-gray-700 mb-1.5">
                  Email
                </label>

                <input
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    updateProfileField("email", event.target.value)
                  }
                  className={`w-full h-[46px] border rounded-md px-4 text-base focus:outline-none focus:ring-1 ${
                    errors.email
                      ? "border-red-400 focus:border-red-400 focus:ring-red-100"
                      : "border-gray-300 focus:border-blue-400 focus:ring-blue-100"
                  }`}
                  placeholder="Nhập email..."
                />

                {errors.email && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Số điện thoại */}
              <div>
                <label className="block text-sm text-gray-700 mb-1.5">
                  Số điện thoại
                </label>

                <input
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
                  placeholder="VD: 0901 234 567"
                />

                {errors.soDienThoai && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.soDienThoai}
                  </p>
                )}
              </div>

              {/* Địa chỉ */}
              <div>
                <label className="block text-sm text-gray-700 mb-1.5">
                  Địa chỉ
                </label>

                <input
                  type="text"
                  value={form.diaChi}
                  onChange={(event) =>
                    updateProfileField("diaChi", event.target.value)
                  }
                  className={`w-full h-[46px] border rounded-md px-4 text-base focus:outline-none focus:ring-1 ${
                    errors.diaChi
                      ? "border-red-400 focus:border-red-400 focus:ring-red-100"
                      : "border-gray-300 focus:border-blue-400 focus:ring-blue-100"
                  }`}
                  placeholder="Nhập địa chỉ..."
                />

                {errors.diaChi && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.diaChi}
                  </p>
                )}
              </div>

              {/* Mật khẩu mới */}
              <div>
                <label className="block text-sm text-gray-700 mb-1.5">
                  <Lock className="w-4 h-4 inline mr-1" />
                  Mật khẩu mới
                  <span className="text-gray-400 ml-1">
                    (để trống nếu không đổi)
                  </span>
                </label>

                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
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
                      setShowNewPassword((previous) => !previous)
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
                <label className="block text-sm text-gray-700 mb-1.5">
                  <Lock className="w-4 h-4 inline mr-1" />
                  Xác nhận mật khẩu mới
                </label>

                <div className="relative">
                  <input
                    type={
                      showConfirmNewPassword ? "text" : "password"
                    }
                    value={confirmNewPassword}
                    onChange={(event) => {
                      setConfirmNewPassword(event.target.value);

                      setErrors((previous) => ({
                        ...previous,
                        confirmPassword: undefined,
                      }));
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        handleSave();
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
                onClick={handleSave}
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
