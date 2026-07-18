import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X, Car, Bike } from "lucide-react";
import { cardService, VehicleDto, VehicleRequest } from "../../../services/cardService";

// ── Helpers ───────────────────────────────────────────────────────────────────
const VEHICLE_TYPES = [
  { value: "MOTORCYCLE", label: "Xe máy" },
  { value: "CAR", label: "Ô tô" },
];

function typeLabel(type: string) {
  return type === "CAR" ? "Ô tô" : "Xe máy";
}

function TypeIcon({ type }: { type: string }) {
  return type === "CAR"
    ? <Car className="w-4 h-4 text-blue-500" />
    : <Bike className="w-4 h-4 text-emerald-500" />;
}

// ── Plate utilities ───────────────────────────────────────────────────────────
/**
 * Loại bỏ khoảng trắng, dấu gạch ngang, dấu chấm và chuyển hoa.
 * "32V3 - 12345" → "32V312345"
 */
function normalizePlateNo(raw: string): string {
  return raw.replace(/[\s.\-]/g, "").toUpperCase();
}

// Regex nhận diện
const CAR_REGEX = /^[1-9]\d[A-Z]{1,2}\d{4,5}$/;
const MOTO_REGEX = /^[1-9]\d[A-Z]\d\d{4,5}$/;

function validateVehicleForm(
  form: VehicleRequest
): Partial<Record<keyof VehicleRequest, string>> {
  const errors: Partial<Record<keyof VehicleRequest, string>> = {};
  const normalized = normalizePlateNo(form.plateNo);

  if (!normalized) {
    errors.plateNo = "Biển số xe không được để trống.";
  } else {
    const isCar = CAR_REGEX.test(normalized);
    const isMoto = MOTO_REGEX.test(normalized);

    if (!isCar && !isMoto) {
      errors.plateNo = "Biển số xe không đúng định dạng Việt Nam!";
    } else {
      // Để giải quyết sự nhập nhằng ở các biển 8 ký tự (VD: 32X12345 vừa khớp Ô tô 5 số, vừa khớp Xe máy 4 số),
      // ưu tiên nhận diện là Ô tô theo logic biển 5 số hiện hành.
      const strictCar = isCar && (!isMoto || normalized.length === 8);
      const strictMoto = isMoto && (!isCar || normalized.length === 9);

      if (form.vehicleType === "CAR" && !strictCar) {
        errors.vehicleType = "Biển số này thuộc về Xe máy, không khớp với loại xe đã chọn!";
      } else if (form.vehicleType === "MOTORCYCLE" && !strictMoto) {
        errors.vehicleType = "Biển số này thuộc về Ô tô, không khớp với loại xe đã chọn!";
      }
    }
  }

  if (!["MOTORCYCLE", "CAR"].includes(form.vehicleType) && !errors.vehicleType) {
    errors.vehicleType = "Vui lòng chọn loại xe hợp lệ.";
  }
  if (form.brand && form.brand.length > 50) {
    errors.brand = "Hãng xe tối đa 50 ký tự.";
  }
  if (form.model && form.model.length > 50) {
    errors.model = "Model xe tối đa 50 ký tự.";
  }
  if (form.color && form.color.length > 30) {
    errors.color = "Màu xe tối đa 30 ký tự.";
  }

  return errors;
}

// ── AddEditModal ──────────────────────────────────────────────────────────────
function VehicleFormModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: VehicleDto;
  onSave: (payload: VehicleRequest) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<VehicleRequest>({
    plateNo: initial?.plateNo ?? "",
    vehicleType: initial?.vehicleType ?? "MOTORCYCLE",
    brand: initial?.brand ?? "",
    model: initial?.model ?? "",
    color: initial?.color ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [apiErr, setApiErr] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof VehicleRequest, string>>>({});

  const F = (k: keyof VehicleRequest, v: string) => {
    setForm((p) => ({ ...p, [k]: v }));
    if (fieldErrors[k]) setFieldErrors((e) => ({ ...e, [k]: "" }));
  };

  const handleSubmit = async () => {
    const errors = validateVehicleForm(form);
    if (Object.values(errors).some(Boolean)) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setLoading(true);
    setApiErr("");
    try {
      await onSave({ ...form, plateNo: normalizePlateNo(form.plateNo) });
    } catch (e: any) {
      setApiErr(e.message || "Có lỗi xảy ra.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[70]">
      <div className="bg-white rounded-lg shadow-xl w-[420px] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 bg-blue-600">
          <span className="text-white text-sm font-semibold">
            {initial ? "Chỉnh sửa phương tiện" : "Thêm phương tiện mới"}
          </span>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3">
          {apiErr && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {apiErr}
            </div>
          )}

          {/* Biển số xe */}
          <div>
            <label className="block text-xs text-gray-600 mb-1">
              Biển số xe <span className="text-red-500">*</span>
            </label>
            <input
              className={`w-full h-[36px] border rounded px-3 text-sm uppercase focus:outline-none focus:border-blue-400 ${
                fieldErrors.plateNo ? "border-red-400 bg-red-50" : "border-gray-300"
              }`}
              placeholder="VD: 29X1-12345"
              value={form.plateNo}
              onChange={(e) => F("plateNo", e.target.value.toUpperCase())}
            />
            {fieldErrors.plateNo && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.plateNo}</p>
            )}
          </div>

          {/* Loại xe */}
          <div>
            <label className="block text-xs text-gray-600 mb-1">
              Loại xe <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              {VEHICLE_TYPES.map((t) => (
                <label
                  key={t.value}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded border-2 cursor-pointer text-sm font-semibold transition-colors ${
                    form.vehicleType === t.value
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    className="hidden"
                    checked={form.vehicleType === t.value}
                    onChange={() => F("vehicleType", t.value)}
                  />
                  {t.label}
                </label>
              ))}
            </div>
            {fieldErrors.vehicleType && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.vehicleType}</p>
            )}
          </div>

          {/* Hãng xe + Model */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Hãng xe</label>
              <input
                className={`w-full h-[36px] border rounded px-3 text-sm focus:outline-none focus:border-blue-400 ${
                  fieldErrors.brand ? "border-red-400 bg-red-50" : "border-gray-300"
                }`}
                placeholder="VD: Honda, Yamaha..."
                value={form.brand}
                onChange={(e) => F("brand", e.target.value)}
              />
              {fieldErrors.brand && (
                <p className="mt-1 text-xs text-red-500">{fieldErrors.brand}</p>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Model</label>
              <input
                className={`w-full h-[36px] border rounded px-3 text-sm focus:outline-none focus:border-blue-400 ${
                  fieldErrors.model ? "border-red-400 bg-red-50" : "border-gray-300"
                }`}
                placeholder="VD: Wave, Vision..."
                value={form.model}
                onChange={(e) => F("model", e.target.value)}
              />
              {fieldErrors.model && (
                <p className="mt-1 text-xs text-red-500">{fieldErrors.model}</p>
              )}
            </div>
          </div>

          {/* Màu xe */}
          <div>
            <label className="block text-xs text-gray-600 mb-1">Màu xe</label>
            <input
              className={`w-full h-[36px] border rounded px-3 text-sm focus:outline-none focus:border-blue-400 ${
                fieldErrors.color ? "border-red-400 bg-red-50" : "border-gray-300"
              }`}
              placeholder="VD: Đen, Trắng, Đỏ..."
              value={form.color}
              onChange={(e) => F("color", e.target.value)}
            />
            {fieldErrors.color && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.color}</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-200">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="h-[34px] px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded transition-colors"
          >
            {loading ? "Đang lưu..." : initial ? "Lưu thay đổi" : "Thêm phương tiện"}
          </button>
          <button
            onClick={onClose}
            className="h-[34px] px-3 border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm rounded transition-colors"
          >
            Hủy
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function UserMyVehicles() {
  const [vehicles, setVehicles] = useState<VehicleDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<VehicleDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<VehicleDto | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await cardService.getMyVehicles();
      setVehicles(data);
    } catch (e: any) {
      setError(e.message || "Không thể tải danh sách phương tiện.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (payload: VehicleRequest) => {
    await cardService.addVehicle(payload);
    setShowAdd(false);
    load();
  };

  const handleEdit = async (payload: VehicleRequest) => {
    if (!editTarget) return;
    await cardService.updateVehicle(editTarget.id, payload);
    setEditTarget(null);
    load();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await cardService.deleteVehicle(deleteTarget.id);
      setDeleteTarget(null);
      load();
    } catch (e: any) {
      alert(e.message || "Xóa phương tiện thất bại.");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Title bar */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-800">Phương tiện của tôi</h2>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 h-[34px] px-3 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
        >
          <Plus className="w-4 h-4" />
          Thêm phương tiện
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-sm text-gray-500 text-center py-10">Đang tải...</div>
      ) : error ? (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-4 py-3">{error}</div>
      ) : vehicles.length === 0 ? (
        <div className="text-sm text-gray-500 text-center py-10 border-2 border-dashed border-gray-200 rounded-lg">
          Bạn chưa đăng ký phương tiện nào.<br />
          <span className="text-blue-600 cursor-pointer hover:underline" onClick={() => setShowAdd(true)}>
            Thêm phương tiện ngay
          </span>
        </div>
      ) : (
        <div className="space-y-2">
          {vehicles.map((v) => (
            <div
              key={v.id}
              className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3 hover:border-blue-200 transition-colors"
            >
              <div className="flex items-center gap-3">
                <TypeIcon type={v.vehicleType} />
                <div>
                  <p className="text-sm font-semibold text-gray-800 tracking-wide">{v.plateNo}</p>
                  <p className="text-xs text-gray-500">
                    {typeLabel(v.vehicleType)}
                    {v.brand && ` · ${v.brand}`}
                    {v.model && ` ${v.model}`}
                    {v.color && ` · ${v.color}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setEditTarget(v)}
                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  title="Chỉnh sửa"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteTarget(v)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="Xóa"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showAdd && (
        <VehicleFormModal onSave={handleAdd} onClose={() => setShowAdd(false)} />
      )}
      {editTarget && (
        <VehicleFormModal
          initial={editTarget}
          onSave={handleEdit}
          onClose={() => setEditTarget(null)}
        />
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[70]">
          <div className="bg-white rounded-lg shadow-xl w-[360px] p-6 text-center">
            <Trash2 className="w-10 h-10 text-red-500 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-800 mb-1">Xóa phương tiện?</p>
            <p className="text-xs text-gray-500 mb-4">
              Bạn có chắc muốn xóa biển số{" "}
              <span className="font-semibold text-gray-700">{deleteTarget.plateNo}</span> khỏi danh sách không?
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm rounded transition-colors"
              >
                {deleteLoading ? "Đang xóa..." : "Xác nhận xóa"}
              </button>
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-1.5 border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm rounded transition-colors"
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
