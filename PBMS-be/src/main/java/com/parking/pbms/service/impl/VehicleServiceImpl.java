package com.parking.pbms.service.impl;

import com.parking.pbms.dto.VehicleDto;
import com.parking.pbms.dto.VehicleRequest;
import com.parking.pbms.model.Account;
import com.parking.pbms.model.Vehicle;
import com.parking.pbms.repository.AccountRepository;
import com.parking.pbms.repository.VehicleRepository;
import com.parking.pbms.service.VehicleService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class VehicleServiceImpl implements VehicleService {

    private final VehicleRepository vehicleRepository;
    private final AccountRepository accountRepository;

    @Override
    @Transactional(readOnly = true)
    public List<VehicleDto> getMyVehicles(String username) {
        Account account = resolveAccount(username);
        return vehicleRepository
                .findByAccountIdAndStatus(account.getAccountId(), "ACTIVE")
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Override
    @Transactional
    public VehicleDto addVehicle(String username, VehicleRequest request) {
        Account account = resolveAccount(username);
        String plateNo     = normalizePlateNo(request.plateNo());
        String vehicleType = request.vehicleType().trim().toUpperCase();

        crossValidatePlateAndType(plateNo, vehicleType);

        if (vehicleRepository.findByPlateNo(plateNo).isPresent()) {
            throw new RuntimeException("Biển số " + plateNo + " đã tồn tại trong hệ thống!");
        }

        Vehicle vehicle = Vehicle.builder()
                .accountId(account.getAccountId())
                .plateNo(plateNo)
                .vehicleType(vehicleType)
                .brand(request.brand())
                .model(request.model())
                .color(request.color())
                .status("ACTIVE")
                .build();

        return toDto(vehicleRepository.save(vehicle));
    }

    @Override
    @Transactional
    public VehicleDto updateVehicle(String username, Integer vehicleId, VehicleRequest request) {
        Account account = resolveAccount(username);
        Vehicle vehicle = vehicleRepository
                .findByVehicleIdAndAccountId(vehicleId, account.getAccountId())
                .orElseThrow(() -> new RuntimeException(
                        "Không tìm thấy phương tiện hoặc bạn không có quyền sửa phương tiện này"));

        String newPlate    = normalizePlateNo(request.plateNo());
        String vehicleType = request.vehicleType().trim().toUpperCase();

        crossValidatePlateAndType(newPlate, vehicleType);

        if (!newPlate.equals(vehicle.getPlateNo())) {
            if (vehicleRepository.findByPlateNo(newPlate).isPresent()) {
                throw new RuntimeException("Biển số " + newPlate + " đã tồn tại trong hệ thống!");
            }
            vehicle.setPlateNo(newPlate);
        }

        vehicle.setVehicleType(vehicleType);
        vehicle.setBrand(request.brand());
        vehicle.setModel(request.model());
        vehicle.setColor(request.color());

        return toDto(vehicleRepository.save(vehicle));
    }

    @Override
    @Transactional
    public void deleteVehicle(String username, Integer vehicleId) {
        Account account = resolveAccount(username);
        Vehicle vehicle = vehicleRepository
                .findByVehicleIdAndAccountId(vehicleId, account.getAccountId())
                .orElseThrow(() -> new RuntimeException(
                        "Không tìm thấy phương tiện hoặc bạn không có quyền xóa phương tiện này"));

        vehicle.setStatus("INACTIVE");
        vehicleRepository.save(vehicle);
    }

    // ── Plate normalization & cross-validation ───────────────────────────────
    /**
     * Loại bỏ tất cả khoảng trắng, dấu gạch ngang, dấu chấm và chuyển hoa.
     * "32V3 - 12345" → "32V312345", "29A1-12345" → "29A112345"
     */
    private static String normalizePlateNo(String raw) {
        return raw.replaceAll("[\\s.\\-]", "").toUpperCase();
    }

    /**
     * Suy ra loại xe bắt buộc từ cấu trúc sê-ri biển số đã chuẩn hóa.
     * Quy tắc (sau khi loại bỏ mọi dấu phân cách):
     *   - Dài 9 ký tự, vị trí [3] là chữ số  → MOTORCYCLE  (sê-ri Chữ+Số, số 5 chữ số)
     *   - Dài 9 ký tự, vị trí [3] là chữ cái → CAR         (sê-ri 2 Chữ, số 5 chữ số)
     *   - Dài 8 ký tự, vị trí [3] là chữ cái → CAR         (sê-ri 2 Chữ, số 4 chữ số)
     *   - Dài 7 ký tự                         → CAR         (sê-ri 1 Chữ, số 4 chữ số)
     *   - Dài 8 ký tự, vị trí [3] là chữ số  → null (mơ hồ: ô tô 5 số hoặc xe máy 4 số)
     */
    private static String inferRequiredType(String normalized) {
        if (normalized.length() < 7 || normalized.length() > 9) return null;
        char ch3 = normalized.charAt(3);
        if (normalized.length() == 7) return "CAR";
        if (normalized.length() == 8 && Character.isLetter(ch3)) return "CAR";
        if (normalized.length() == 9 && Character.isLetter(ch3)) return "CAR";
        if (normalized.length() == 9 && Character.isDigit(ch3))  return "MOTORCYCLE";
        return null; // dài 8 ký tự, vị trí [3] là chữ số → mơ hồ
    }

    /**
     * Kiểm tra chéo giữa sê-ri biển số (đã chuẩn hóa) và loại xe.
     * Ném RuntimeException với thông báo rõ ràng nếu không khớp.
     */
    private static void crossValidatePlateAndType(String normalized, String vehicleType) {
        String required = inferRequiredType(normalized);
        if (required == null || required.equals(vehicleType)) return;
        if ("MOTORCYCLE".equals(required)) {
            throw new RuntimeException(
                    "Biển số xe máy (sê-ri Chữ+Số: " + normalized.substring(2, 4) + ") " +
                    "không khớp với loại xe đã chọn (phải là Xe máy)");
        } else {
            throw new RuntimeException(
                    "Biển số ô tô (sê-ri chỉ có Chữ: " + normalized.charAt(2) + ") " +
                    "không khớp với loại xe đã chọn (phải là Ô tô)");
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────
    private Account resolveAccount(String username) {
        return accountRepository.findByUsernameIgnoreCase(username)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tài khoản: " + username));
    }

    private VehicleDto toDto(Vehicle v) {
        return new VehicleDto(v.getVehicleId(), v.getPlateNo(), v.getVehicleType(),
                v.getBrand(), v.getModel(), v.getColor());
    }
}
