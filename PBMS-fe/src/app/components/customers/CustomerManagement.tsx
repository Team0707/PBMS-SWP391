import { useState, useEffect } from "react";
import {
  Search,
  RotateCcw,
  Plus,
  Edit,
  Trash2,
  Eye,
  X,
  Save,
  Users,
  CreditCard,
} from "lucide-react";
import { cls } from "../common/ui";
import { FilterGroup } from "../common/DateInput";
import { DataTable, Column } from "../common/DataTable";
import { Pagination } from "../common/Pagination";
import {
  adminCardService,
  UserDto,
  UserCardDto,
  CreateUserPayload,
  UpdateUserPayload,
} from "../../../services/adminCardService";

interface Customer {
  id: number;
  stt: number;
  maKH: string;
  hoTen: string;
  sdt: string;
  email: string;
  diaChi: string;
  soThe: number;
  trangThai: string;
  roleName?: string;
}

interface CardDetail {
  id: number;
  nhomThe: string;
  maThe: string;
  cardNo: string;
  bienSo: string;
  khachHang: string;
  ngayDangKy: string;
  ngayHetHan: string;
  trangThai: string;
  ghiChu: string;
}

interface FormData {
  hoTen: string;
  sdt: string;
  email: string;
  diaChi: string;
  ghiChu: string;
  username?: string;
  roleName?: string;
  password?: string;
}

const defaultForm: FormData = {
  hoTen: "",
  sdt: "",
  email: "",
  diaChi: "",
  ghiChu: "",
  username: "",
  roleName: "USER",
  password: "",
};

const mapDtoToCustomer = (dto: UserDto, index: number): Customer => {
  return {
    id: dto.accountId,
    stt: index + 1,
    maKH: dto.username,
    hoTen: dto.fullName,
    sdt: dto.phone || "",
    email: dto.email || "",
    diaChi: dto.address || "",
    soThe: dto.cardCount || 0,
    trangThai: dto.status === "ACTIVE" ? "Hoạt động" : "Khóa",
    roleName: dto.roleName,
  };
};

function CustomerCardsModal({
  customer,
  onClose,
}: {
  customer: Customer;
  onClose: () => void;
}) {
  const [cards, setCards] = useState<CardDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchCards = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await adminCardService.getUserCards(customer.id);
        setCards(
          data.map((item) => ({
            id: item.cardId,
            nhomThe: item.groupName,
            maThe: item.cardNo,
            cardNo: item.rfidUid || "",
            bienSo: item.plateNo || "",
            khachHang: customer.hoTen,
            ngayDangKy: item.registeredAt || "",
            ngayHetHan: item.expireAt || "",
            trangThai:
              item.status === "ACTIVE"
                ? "Hoạt động"
                : item.status === "EXPIRED"
                  ? "Hết hạn"
                  : item.status === "EXPIRING"
                    ? "Sắp hết hạn"
                    : "Khóa",
            ghiChu: item.note || "",
          }))
        );
      } catch (err: any) {
        setError(err.message || "Không thể tải danh sách thẻ.");
      } finally {
        setLoading(false);
      }
    };

    fetchCards();
  }, [customer.id, customer.hoTen]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="flex max-h-[85vh] w-[680px] flex-col rounded-lg bg-white shadow-xl">
        <div className="flex flex-shrink-0 items-center justify-between rounded-t-lg bg-blue-600 px-5 py-3">
          <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-white" />
            <span className="text-sm font-semibold text-white">
              Thẻ của khách hàng: {customer.hoTen}
            </span>
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs text-white">
              {cards.length} thẻ
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-shrink-0 gap-6 border-b border-blue-200 bg-blue-50 px-5 py-2 text-xs text-gray-600">
          <span>
            <span className="text-gray-400">Mã KH:</span>{" "}
            <span className="font-medium text-gray-800">
              {customer.maKH}
            </span>
          </span>

          <span>
            <span className="text-gray-400">SĐT:</span>{" "}
            <span className="font-medium text-gray-800">
              {customer.sdt}
            </span>
          </span>

          <span>
            <span className="text-gray-400">Địa chỉ:</span>{" "}
            <span className="font-medium text-gray-800">
              {customer.diaChi}
            </span>
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-sm text-gray-500">
              Đang tải danh sách thẻ...
            </div>
          ) : error ? (
            <div className="rounded border border-red-200 bg-red-50 p-3 text-center text-xs text-red-600">
              {error}
            </div>
          ) : cards.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <CreditCard className="mb-2 h-10 w-10 opacity-30" />
              <p className="text-sm">
                Khách hàng chưa có thẻ liên kết / không thể truy xuất
              </p>
            </div>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-y border-gray-300 bg-gray-100">
                  <th className={cls.th}>Mã thẻ</th>
                  <th className={cls.th}>CardNo (RFID)</th>
                  <th className={cls.th}>Nhóm thẻ</th>
                  <th className={cls.th}>Biển số</th>
                  <th className={cls.th}>Ngày HH</th>
                  <th className={cls.th}>Trạng thái</th>
                </tr>
              </thead>

              <tbody>
                {cards.map((card, index) => (
                  <tr
                    key={card.id}
                    className={`border-b border-gray-200 transition-colors hover:bg-blue-50 ${
                      index % 2 === 1 ? "bg-gray-50" : "bg-white"
                    }`}
                  >
                    <td className={cls.td}>
                      <span className="font-medium text-blue-700">
                        {card.maThe}
                      </span>
                    </td>
                    <td className={cls.td}>{card.cardNo}</td>
                    <td className={cls.td}>
                      <span className={cls.badge.green}>
                        {card.nhomThe}
                      </span>
                    </td>
                    <td className={cls.td}>{card.bienSo}</td>
                    <td className={cls.td}>
                      {card.ngayHetHan ? (
                        <span
                          className={
                            card.trangThai === "Hết hạn"
                              ? "text-xs font-medium text-red-600"
                              : card.trangThai === "Sắp hết hạn"
                                ? "text-xs font-medium text-amber-600"
                                : "text-xs text-gray-700"
                          }
                        >
                          {card.ngayHetHan}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">---</span>
                      )}
                    </td>
                    <td className={cls.td}>
                      <span
                        className={
                          card.trangThai === "Hoạt động"
                            ? cls.badge.green
                            : card.trangThai === "Hết hạn"
                              ? cls.badge.red
                              : card.trangThai === "Sắp hết hạn"
                                ? cls.badge.amber
                                : cls.badge.gray
                        }
                      >
                        {card.trangThai}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex flex-shrink-0 justify-end border-t border-gray-200 px-5 py-3">
          <button
            type="button"
            className={cls.btnSecondary}
            onClick={onClose}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CustomerManagement() {
  const [data, setData] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [keyword, setKeyword] = useState("");
  const [trangThai, setTrangThai] = useState("");
  const [page, setPage] = useState(1);

  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Customer | null>(null);
  const [form, setForm] = useState<FormData>(defaultForm);
  const [formError, setFormError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [viewItem, setViewItem] = useState<Customer | null>(null);
  const [cardsCustomer, setCardsCustomer] = useState<Customer | null>(null);

  const fetchCustomers = async () => {
    setLoading(true);
    setError("");
    try {
      const list = await adminCardService.getUsers();
      const customersOnly = list.filter(item => item.roleName === "USER");
      setData(customersOnly.map((item, index) => mapDtoToCustomer(item, index)));
    } catch (err: any) {
      setError(err.message || "Không thể tải danh sách khách hàng.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const filtered = data.filter((customer) => {
    const searchValue = keyword.trim().toLowerCase();

    const matchKeyword =
      !searchValue ||
      customer.maKH.toLowerCase().includes(searchValue) ||
      customer.hoTen.toLowerCase().includes(searchValue) ||
      customer.sdt.includes(searchValue);

    const matchStatus =
      !trangThai || customer.trangThai === trangThai;

    return matchKeyword && matchStatus;
  });

  const openAdd = () => {
    setEditItem(null);
    setForm(defaultForm);
    setFormError("");
    setShowModal(true);
  };

  const openEdit = (item: Customer) => {
    setEditItem(item);
    setForm({
      hoTen: item.hoTen,
      sdt: item.sdt,
      email: item.email,
      diaChi: item.diaChi,
      ghiChu: "",
      username: item.maKH,
      roleName: item.roleName || "USER",
      password: "",
    });
    setFormError("");
    setShowModal(true);
  };

  const handleSave = async () => {
    setFormError("");
    if (!form.hoTen.trim()) {
      setFormError("Vui lòng nhập họ tên.");
      return;
    }
    if (!form.sdt.trim()) {
      setFormError("Vui lòng nhập số điện thoại.");
      return;
    }
    if (!form.username || !form.username.trim()) {
      setFormError("Vui lòng nhập tên đăng nhập.");
      return;
    }
    if (!editItem && (!form.password || form.password.length < 6)) {
      setFormError("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }

    try {
      if (editItem) {
        const payload: UpdateUserPayload = {
          fullName: form.hoTen.trim(),
          roleName: form.roleName || editItem.roleName || "USER",
          phone: form.sdt.trim(),
          email: form.email.trim() || undefined,
          password: form.password && form.password.length >= 6 ? form.password : undefined,
          status: editItem.trangThai === "Hoạt động" ? "ACTIVE" : "INACTIVE",
          address: form.diaChi.trim() || undefined,
        };
        await adminCardService.updateUser(editItem.id, payload);
      } else {
        const payload: CreateUserPayload = {
          username: form.username!.trim(),
          fullName: form.hoTen.trim(),
          roleName: form.roleName || "USER",
          phone: form.sdt.trim(),
          email: form.email.trim() || undefined,
          password: form.password || undefined,
          status: "ACTIVE",
          address: form.diaChi.trim() || undefined,
        };
        await adminCardService.createUser(payload);
      }
      await fetchCustomers();
      setShowModal(false);
      setForm(defaultForm);
    } catch (err: any) {
      setFormError(err.message || "Lưu khách hàng thất bại.");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await adminCardService.deleteUser(id);
      await fetchCustomers();
      setDeleteConfirm(null);
    } catch (err: any) {
      alert(err.message || "Vô hiệu hóa người dùng thất bại.");
    }
  };

  const columns: Column[] = [
    {
      key: "stt",
      label: "STT",
      width: "40px",
    },
    {
      key: "hoTen",
      label: "Họ tên",
      render: (value: string) => (
        <span className="font-medium text-gray-800">{value}</span>
      ),
    },
    {
      key: "sdt",
      label: "Số điện thoại",
    },
    {
      key: "email",
      label: "Email",
    },
    {
      key: "diaChi",
      label: "Địa chỉ",
    },
    {
      key: "soThe",
      label: "Số thẻ tháng",
      width: "110px",
      render: (value: number, row: Customer) => {
        return (
          <button
            type="button"
            onClick={() => setCardsCustomer(row)}
            title="Xem danh sách thẻ liên kết"
            className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700 transition-colors hover:bg-blue-200"
          >
            <CreditCard className="h-3 w-3" />
            {value} thẻ
          </button>
        );
      },
    },
    {
      key: "trangThai",
      label: "Trạng thái",
      render: (value: string) => (
        <span
          className={
            value === "Hoạt động" ? cls.badge.green : cls.badge.red
          }
        >
          {value}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Thao tác",
      width: "80px",
      render: (_value: unknown, row: Customer) => (
        <div className="flex gap-1">
          <button
            type="button"
            title="Xem"
            onClick={() => setViewItem(row)}
            className="rounded p-0.5 text-blue-500 hover:bg-blue-50 hover:text-blue-700"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            title="Sửa"
            onClick={() => openEdit(row)}
            className="rounded p-0.5 text-amber-500 hover:bg-amber-50 hover:text-amber-700"
          >
            <Edit className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            title="Vô hiệu hóa"
            onClick={() => setDeleteConfirm(row.id)}
            className="rounded p-0.5 text-red-500 hover:bg-red-50 hover:text-red-700"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-2">
      <div className={cls.filterSection}>
        <div className="mb-2 flex flex-wrap items-end gap-2">
          <FilterGroup label="Từ khóa (Tên KH, SĐT)">
            <input
              className={`${cls.input} w-[230px]`}
              placeholder="Nhập tên, SĐT..."
              value={keyword}
              onChange={(event) => {
                setKeyword(event.target.value);
                setPage(1);
              }}
            />
          </FilterGroup>

          <FilterGroup label="Trạng thái">
            <select
              className={`${cls.select} w-[140px]`}
              value={trangThai}
              onChange={(event) => {
                setTrangThai(event.target.value);
                setPage(1);
              }}
            >
              <option value="">-- Tất cả --</option>
              <option value="Hoạt động">Hoạt động</option>
              <option value="Khóa">Khóa</option>
            </select>
          </FilterGroup>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={cls.btnSearch}
            onClick={() => setPage(1)}
          >
            <Search className="h-3.5 w-3.5" />
            Tìm kiếm
          </button>

          <button
            type="button"
            className={cls.btnReset}
            onClick={() => {
              setKeyword("");
              setTrangThai("");
              setPage(1);
            }}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>

          <button
            type="button"
            className={cls.btnAdd}
            onClick={openAdd}
          >
            <Plus className="h-3.5 w-3.5" />
            Thêm mới
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className={cls.sectionCard}>
        <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-gray-700">
              Danh sách khách hàng
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-xs text-blue-500">
              <CreditCard className="h-3 w-3" />
              Click vào số thẻ tháng để xem chi tiết
            </span>
            <span className="text-xs text-gray-500">
              Tổng: {filtered.length} KH
            </span>
          </div>
        </div>

        <div className="p-2">
          {loading ? (
            <div className="flex items-center justify-center p-8 text-sm text-gray-500">
              Đang tải danh sách khách hàng...
            </div>
          ) : (
            <>
              <DataTable
                columns={columns}
                data={filtered.slice((page - 1) * 10, page * 10)}
              />

              <Pagination
                currentPage={page}
                totalPages={Math.max(1, Math.ceil(filtered.length / 10))}
                totalRecords={filtered.length}
                onPageChange={setPage}
              />
            </>
          )}
        </div>
      </div>

      {cardsCustomer && (
        <CustomerCardsModal
          customer={cardsCustomer}
          onClose={() => setCardsCustomer(null)}
        />
      )}

      {viewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-[440px] rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between rounded-t-lg bg-blue-600 px-5 py-3">
                <span className="text-sm font-semibold text-white">
                Thông tin khách hàng
              </span>

              <button
                type="button"
                onClick={() => setViewItem(null)}
                className="text-white/80 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2.5 p-5">
              {[
                { label: "Họ tên", value: viewItem.hoTen },
                { label: "Số điện thoại", value: viewItem.sdt },
                { label: "Email", value: viewItem.email },
                { label: "Địa chỉ", value: viewItem.diaChi },
                { label: "Số thẻ tháng", value: String(viewItem.soThe) },
                { label: "Trạng thái", value: viewItem.trangThai },
              ].map(({ label, value }) => (
                <div key={label} className="flex gap-2 text-sm">
                  <span className="w-36 flex-shrink-0 pt-0.5 text-xs text-gray-500 text-left">
                    {label}:
                  </span>
                  <span className="font-medium text-gray-800 text-left">{value}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-end border-t border-gray-200 px-5 py-3">
              <button
                type="button"
                className={cls.btnSecondary}
                onClick={() => setViewItem(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-[480px] rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between rounded-t-lg bg-blue-600 px-5 py-3">
              <span className="text-sm font-semibold text-white">
                {editItem ? "Chỉnh sửa khách hàng" : "Thêm khách hàng mới"}
              </span>

              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-white/80 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 p-5 text-left">
              <div>
                <label className="mb-1 block text-xs text-gray-600">
                  Tên đăng nhập <span className="text-red-500">*</span>
                </label>
                <input
                  className={`${cls.input} w-full`}
                  placeholder="username"
                  value={form.username}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      username: event.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-gray-600">
                  Họ tên <span className="text-red-500">*</span>
                </label>
                <input
                  className={`${cls.input} w-full`}
                  placeholder="Nhập họ và tên"
                  value={form.hoTen}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      hoTen: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-600">
                    Số điện thoại <span className="text-red-500">*</span>
                  </label>
                  <input
                    className={`${cls.input} w-full`}
                    placeholder="09xxxxxxxx"
                    value={form.sdt}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        sdt: event.target.value,
                      }))
                    }
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs text-gray-600">
                    Email
                  </label>
                  <input
                    className={`${cls.input} w-full`}
                    placeholder="email@gmail.com"
                    value={form.email}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        email: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              {!editItem && (
                <div>
                  <label className="mb-1 block text-xs text-gray-600">
                    Mật khẩu <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    className={`${cls.input} w-full`}
                    placeholder="Mật khẩu (ít nhất 6 ký tự)"
                    value={form.password}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        password: event.target.value,
                      }))
                    }
                  />
                </div>
              )}



              <div>
                <label className="mb-1 block text-xs text-gray-600">
                  Địa chỉ
                </label>
                <input
                  className={`${cls.input} w-full`}
                  placeholder="Số nhà, đường, quận, thành phố"
                  value={form.diaChi}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      diaChi: event.target.value,
                    }))
                  }
                />
              </div>

              {editItem && (
                <div>
                  <label className="mb-1 block text-xs text-gray-600">
                    Trạng thái
                  </label>
                  <select
                    className={`${cls.select} w-full`}
                    value={editItem.trangThai}
                    onChange={(event) => {
                      const newStatus = event.target.value;
                      setEditItem((prev) =>
                        prev ? { ...prev, trangThai: newStatus } : null
                      );
                    }}
                  >
                    <option value="Hoạt động">Hoạt động</option>
                    <option value="Khóa">Khóa</option>
                  </select>
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs text-gray-600">
                  Ghi chú
                </label>
                <textarea
                  className={`${cls.input} h-16 w-full resize-none py-1.5`}
                  placeholder="Ghi chú thêm..."
                  value={form.ghiChu}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      ghiChu: event.target.value,
                    }))
                  }
                />
              </div>

              {formError && (
                <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                  {formError}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-3">
              <button
                type="button"
                className={cls.btnSearch}
                onClick={handleSave}
              >
                <Save className="h-3.5 w-3.5" />
                Lưu
              </button>

              <button
                type="button"
                className={cls.btnReset}
                onClick={() => setShowModal(false)}
              >
                <X className="h-3.5 w-3.5" />
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-[360px] rounded-lg bg-white shadow-xl">
            <div className="px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
                  <Trash2 className="h-4 w-4 text-red-600" />
                </div>

                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-800">
                    Xác nhận vô hiệu hóa
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Bạn có chắc muốn vô hiệu hóa khách hàng này không? (Trạng thái sẽ đổi sang Khóa)
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-3">
              <button
                type="button"
                className={cls.btnDanger}
                onClick={() => handleDelete(deleteConfirm)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Khóa
              </button>

              <button
                type="button"
                className={cls.btnSecondary}
                onClick={() => setDeleteConfirm(null)}
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
