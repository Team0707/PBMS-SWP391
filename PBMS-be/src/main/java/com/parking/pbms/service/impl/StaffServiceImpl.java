package com.parking.pbms.service.impl;

import com.parking.pbms.dto.StaffCheckInRequest;
import com.parking.pbms.dto.StaffCheckOutRequest;
import com.parking.pbms.dto.StaffTicketResponse;
import com.parking.pbms.dto.StaffTransactionResponse;
import com.parking.pbms.model.*;
import com.parking.pbms.repository.*;
import com.parking.pbms.service.StaffService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class StaffServiceImpl implements StaffService {

    private final FloorRepository floorRepository;
    private final ParkingSessionRepository ParkingSessionRepository;
    private final ReservationRepository reservationRepository;
    private final CardRepository cardRepository;
    private final VehicleRepository vehicleRepository;
    private final StaffRepository staffRepository;
    private final AccountRepository accountRepository;
    private final ViolationRuleRepository violationRuleRepository;
    private final BarcodeCardRepository barcodeCardRepository;
    private final CardGroupRepository cardGroupRepository;

    @Override
    public List<Floor> getFloors() {
        return floorRepository.findAll();
    }

    @Override
    @Transactional
    public StaffTicketResponse checkIn(StaffCheckInRequest request, String username) {
        // Find staff
        Account account = accountRepository.findByUsernameIgnoreCase(username)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tài khoản: " + username));
        Staff staff = staffRepository.findByAccountId(account.getAccountId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy nhân viên tương ứng với tài khoản: " + username));

        // Find floor
        Floor floor = floorRepository.findByFloorCode(request.floorCode())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tầng: " + request.floorCode()));

        String plateNo = request.plateNo().trim().toUpperCase();
        String vehicleType = request.vehicleType().trim().toUpperCase();

        // Always validate cardBarcode for all check-ins (visitor & pre-booked)
        String cardBarcode = request.cardBarcode();
        if (cardBarcode == null || cardBarcode.trim().length() != 10) {
            throw new RuntimeException("Barcode thẻ xe phải đúng 10 ký tự.");
        }
        String barcodeClean = cardBarcode.trim().toUpperCase();

        // Check if barcode exists in database and is active
        boolean barcodeExists = barcodeCardRepository.findByBarcodeAndIsActive(barcodeClean, true).isPresent();
        if (!barcodeExists) {
            throw new RuntimeException("Thẻ xe barcode này không hợp lệ hoặc đã bị khóa.");
        }

        // Check if barcode is already in use (only block if ticket is currently ACTIVE = xe đang trong bãi)
        // Không block PAID/COMPLETED vì barcode có thể tái sử dụng sau khi xe đã ra
        Optional<ParkingSession> activeCardTicket = ParkingSessionRepository
                .findFirstByBarcodeAndStatusInOrderByCheckInAtDesc(barcodeClean, java.util.List.of("ACTIVE"));
        if (activeCardTicket.isPresent()) {
            throw new RuntimeException("Thẻ xe này đang được sử dụng trong bãi xe.");
        }

        Integer cardId = null;
        Integer vehicleId = null;
        Long reservationId = null;
        String ticketType = "SINGLE";
        String message = "Xe vào thành công";

        if (request.isPreBooked()) {
            String rawCode = request.preBookedCode();
            if (rawCode == null || rawCode.trim().isEmpty()) {
                throw new RuntimeException("Vui lòng cung cấp mã vé tháng hoặc đặt trước");
            }
            final String code = rawCode.trim().toUpperCase();

            if (code.toUpperCase().startsWith("CARD")) {
                Card card = cardRepository.findByCardNo(code)
                        .orElseThrow(() -> new RuntimeException("Không tìm thấy thẻ tháng: " + code));

                // Ưu tiên 1: Kiểm tra thời hạn trước, KHÔNG tin vào cột status trong DB
                // Dùng !isAfter để bắt cả expireAt < today VÀ expireAt == today
                if (card.getExpireAt() != null && !card.getExpireAt().isAfter(LocalDate.now())) {
                    // Đồng bộ trạng thái thực tế vào DB
                    if ("ACTIVE".equalsIgnoreCase(card.getStatus())) {
                        card.setStatus("EXPIRED");
                        cardRepository.save(card);
                    }
                    throw new RuntimeException("Thẻ tháng đã hết hạn từ ngày " + card.getExpireAt() + "! Vui lòng gia hạn để vào bãi.");
                }

                // Ưu tiên 2: Kiểm tra trạng thái hoạt động
                if (!card.getStatus().equalsIgnoreCase("ACTIVE")) {
                    throw new RuntimeException("Thẻ tháng " + code + " không hoạt động (Trạng thái: " + card.getStatus() + ")");
                }

                if (card.getEffectiveFrom() != null && card.getEffectiveFrom().isAfter(LocalDate.now())) {
                    throw new RuntimeException("Thẻ tháng chưa đến ngày bắt đầu sử dụng (Ngày bắt đầu: " + card.getEffectiveFrom() + ")");
                }

                Vehicle vehicle = vehicleRepository.findById(card.getVehicleId())
                        .orElseThrow(() -> new RuntimeException("Không tìm thấy phương tiện đăng ký cho thẻ tháng này"));

                if (!vehicle.getPlateNo().trim().equalsIgnoreCase(plateNo)) {
                    throw new RuntimeException("Biển số xe không khớp. Thẻ đăng ký biển: " + vehicle.getPlateNo());
                }

                if (!vehicle.getVehicleType().trim().equalsIgnoreCase(vehicleType)) {
                    throw new RuntimeException("Loại xe không khớp với loại xe đăng ký trên thẻ");
                }

                // Check if card is already inside
                Optional<ParkingSession> activeTicket = ParkingSessionRepository
                        .findFirstByCardIdAndStatusOrderByCheckInAtDesc(card.getCardId(), "ACTIVE");
                if (activeTicket.isPresent()) {
                    throw new RuntimeException("Thẻ này đã được quét vào và chưa quét ra");
                }

                cardId = card.getCardId();
                vehicleId = vehicle.getVehicleId();
                ticketType = "MONTHLY";
                message = "Xác nhận vé tháng hợp lệ. Cho xe vào.";

            } else if (code.toUpperCase().startsWith("RES")) {
                Reservation res = reservationRepository.findByReservationNo(code)
                        .orElseThrow(() -> new RuntimeException("Không tìm thấy thông tin đặt trước: " + code));

                if (!res.getStatus().equalsIgnoreCase("CONFIRMED")) {
                    throw new RuntimeException("Đơn đặt trước không khả dụng (Trạng thái: " + res.getStatus() + ")");
                }

                if (!res.getReservationDate().equals(LocalDate.now())) {
                    throw new RuntimeException("Đơn đặt trước dành cho ngày " + res.getReservationDate() + ". Hôm nay là " + LocalDate.now());
                }

                Vehicle vehicle = vehicleRepository.findById(res.getVehicleId())
                        .orElseThrow(() -> new RuntimeException("Không tìm thấy phương tiện đăng ký cho đơn đặt trước"));

                if (!vehicle.getPlateNo().trim().equalsIgnoreCase(plateNo)) {
                    throw new RuntimeException("Biển số xe không khớp. Đơn đặt trước đăng ký biển: " + vehicle.getPlateNo());
                }

                if (!vehicle.getVehicleType().trim().equalsIgnoreCase(vehicleType)) {
                    throw new RuntimeException("Loại xe không khớp với loại xe đăng ký của đơn đặt trước");
                }

                Optional<ParkingSession> activeTicket = ParkingSessionRepository
                        .findFirstByReservationIdAndStatusOrderByCheckInAtDesc(res.getReservationId(), "ACTIVE");
                if (activeTicket.isPresent()) {
                    throw new RuntimeException("Đơn đặt trước này đã được quét vào và chưa quét ra");
                }

                cardId = res.getCardId();
                vehicleId = res.getVehicleId();
                reservationId = res.getReservationId();
                ticketType = "DAY";
                message = "Xác nhận đơn đặt trước hợp lệ. Cho xe vào.";

                // Update reservation
                res.setStatus("CHECKED_IN");
                res.setCheckInAt(LocalDateTime.now());
                reservationRepository.save(res);

            } else {
                throw new RuntimeException("Mã đặt trước không hợp lệ (Phải bắt đầu bằng CARD hoặc RES)");
            }
        } else {
            // Find or create vehicle for single visitor
            Vehicle vehicle = vehicleRepository.findByPlateNo(plateNo).orElse(null);
            if (vehicle == null) {
                vehicle = Vehicle.builder()
                        .plateNo(plateNo)
                        .vehicleType(vehicleType)
                        .status("ACTIVE")
                        .build();
                vehicle = vehicleRepository.save(vehicle);
            }
            vehicleId = vehicle.getVehicleId();

            // Check if vehicle already in parking
            Optional<ParkingSession> activeTicket = ParkingSessionRepository
                    .findFirstByPlateNoSnapshotAndStatusOrderByCheckInAtDesc(plateNo, "ACTIVE");
            if (activeTicket.isPresent()) {
                throw new RuntimeException("Xe mang biển số " + plateNo + " đã ở trong bãi xe");
            }
        }

        // Create Parking Ticket
        ParkingSession ticket = ParkingSession.builder()
                .barcode(barcodeClean)
                .cardId(cardId)
                .vehicleId(vehicleId)
                .reservationId(reservationId)
                .ticketType(ticketType)
                .vehicleType(vehicleType)
                .plateNoSnapshot(plateNo)
                .entryImage(request.entryImage())
                .entryFloorId(floor.getFloorId())
                .entryStaffId(staff.getStaffId())
                .checkInAt(LocalDateTime.now())
                .feeAmount(BigDecimal.ZERO)
                .penaltyAmount(BigDecimal.ZERO)
                .status("ACTIVE")
                .forceCheckout(false)
                .build();

        ParkingSessionRepository.saveAndFlush(ticket);

        // Fetch re-loaded entity to get DB computed TicketNo
        ticket = ParkingSessionRepository.findById(ticket.getSessionId()).orElse(ticket);
        String ticketNo = ticket.getSessionNo() != null ? ticket.getSessionNo() : "PSN" + String.format("%06d", ticket.getSessionId());

        return new StaffTicketResponse(
                ticket.getSessionId(),
                ticketNo,
                ticket.getBarcode(),
                ticket.getTicketType(),
                ticket.getVehicleType(),
                ticket.getPlateNoSnapshot(),
                floor.getFloorCode(),
                staff.getFullName(),
                null,
                ticket.getCheckInAt(),
                null,
                ticket.getFeeAmount(),
                ticket.getStatus(),
                message,
                null,
                ticket.getEntryImage(),
                null
        );
    }

    @Override
    @Transactional
    public StaffTicketResponse checkOut(StaffCheckOutRequest request, String username) {
        // Find staff
        Account account = accountRepository.findByUsernameIgnoreCase(username)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tài khoản: " + username));
        Staff staff = staffRepository.findByAccountId(account.getAccountId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy nhân viên tương ứng với tài khoản: " + username));

        String input = request.parkingSessionNoOrQrToken().trim().toUpperCase();
        Optional<ParkingSession> ticketOpt = Optional.empty();

        // 1. Try by ticket number
        ticketOpt = ParkingSessionRepository.findBySessionNo(input);

        // 2. Try by QR Token
        if (!ticketOpt.isPresent()) {
            ticketOpt = ParkingSessionRepository.findFirstByBarcodeAndStatusInOrderByCheckInAtDesc(input, java.util.List.of("ACTIVE", "PAID"));
            if (!ticketOpt.isPresent()) {
                ticketOpt = ParkingSessionRepository.findFirstByBarcodeOrderByCheckInAtDesc(input);
            }
        }

        // 3. Try by CardNo
        if (!ticketOpt.isPresent() && input.startsWith("CARD")) {
            Optional<Card> card = cardRepository.findByCardNo(input);
            if (card.isPresent()) {
                ticketOpt = ParkingSessionRepository.findFirstByCardIdAndStatusOrderByCheckInAtDesc(card.get().getCardId(), "ACTIVE");
                if (!ticketOpt.isPresent()) {
                    ticketOpt = ParkingSessionRepository.findFirstByCardIdAndStatusOrderByCheckInAtDesc(card.get().getCardId(), "PAID");
                }
            }
        }

        // 4. Try by ReservationNo
        if (!ticketOpt.isPresent() && input.startsWith("RES")) {
            Optional<Reservation> res = reservationRepository.findByReservationNo(input);
            if (res.isPresent()) {
                ticketOpt = ParkingSessionRepository.findFirstByReservationIdAndStatusOrderByCheckInAtDesc(res.get().getReservationId(), "ACTIVE");
                if (!ticketOpt.isPresent()) {
                    ticketOpt = ParkingSessionRepository.findFirstByReservationIdAndStatusOrderByCheckInAtDesc(res.get().getReservationId(), "PAID");
                }
            }
        }

        // 5. Try by PlateNo
        if (!ticketOpt.isPresent()) {
            ticketOpt = ParkingSessionRepository.findFirstByPlateNoSnapshotAndStatusOrderByCheckInAtDesc(input, "ACTIVE");
            if (!ticketOpt.isPresent()) {
                ticketOpt = ParkingSessionRepository.findFirstByPlateNoSnapshotAndStatusOrderByCheckInAtDesc(input, "PAID");
            }
        }

        ParkingSession ticket = ticketOpt.orElseThrow(() -> new RuntimeException("Không tìm thấy thông tin xe đang gửi hoặc vé đã được thanh toán"));

        if (!ticket.getStatus().equalsIgnoreCase("ACTIVE") && !ticket.getStatus().equalsIgnoreCase("PAID")) {
            throw new RuntimeException("Không tìm thấy thông tin xe đang gửi hoặc vé đã được thanh toán");
        }

        // Validate exit license plate against entry license plate snapshot
        if (request.exitPlate() != null && !request.exitPlate().trim().isEmpty()) {
            String entryPlateClean = ticket.getPlateNoSnapshot().trim().toUpperCase().replaceAll("[^A-Z0-9]", "");
            String exitPlateClean = request.exitPlate().trim().toUpperCase().replaceAll("[^A-Z0-9]", "");
            if (!entryPlateClean.equals(exitPlateClean)) {
                throw new RuntimeException("Biển số xe lúc ra không khớp với biển số xe lúc vào.");
            }
        }

        // Compute fee
        BigDecimal fee = BigDecimal.ZERO;
        BigDecimal penalty = BigDecimal.ZERO;
        String violationReason = null;
        LocalDateTime checkIn = ticket.getCheckInAt();
        LocalDateTime checkOutTime = LocalDateTime.now();
        String ticketType = ticket.getTicketType();
        String vehicleType = ticket.getVehicleType();

        if ("SINGLE".equalsIgnoreCase(ticketType)) {
            BigDecimal basePrice = "CAR".equalsIgnoreCase(vehicleType) ? new BigDecimal("20000") : new BigDecimal("5000");
            Optional<CardGroup> cgOpt = cardGroupRepository.findFirstByVehicleTypeIgnoreCaseAndTicketTypeIgnoreCaseAndStatusIgnoreCase(
                vehicleType, "SINGLE", "ACTIVE"
            );
            if (cgOpt.isPresent()) {
                basePrice = cgOpt.get().getBasePrice();
            }
            fee = basePrice;

            // Phạt đỗ quá giờ (lấy từ database)
            Optional<ViolationRule> ruleOpt = violationRuleRepository.findByTicketTypeAndVehicleType(ticketType, vehicleType);
            if (ruleOpt.isPresent() && ruleOpt.get().getIsActive()) {
                ViolationRule rule = ruleOpt.get();
                long diffMs = java.time.Duration.between(checkIn, checkOutTime).toMillis();
                long diffHours = (long) Math.floor((double) diffMs / (1000 * 60 * 60));
                if (diffHours > rule.getMaxDurationHours()) {
                    long overdueHours = diffHours - rule.getMaxDurationHours();
                    penalty = rule.getPenaltyPerHour().multiply(BigDecimal.valueOf(overdueHours));
                    fee = fee.add(penalty);
                    violationReason = "Đỗ quá giờ cho phép (quá " + rule.getMaxDurationHours() + "h) - quá hạn " + overdueHours + " giờ";
                }
            }
        } else if ("DAY".equalsIgnoreCase(ticketType) || "MONTHLY".equalsIgnoreCase(ticketType)) {
            if (ticket.getCardId() != null) {
                Optional<Card> cardOpt = cardRepository.findById(ticket.getCardId());
                if (cardOpt.isPresent()) {
                    Card card = cardOpt.get();
                    if (card.getExpireAt() != null) {
                        LocalDateTime expireDateTime = card.getExpireAt().atTime(23, 59, 59);
                        if (checkOutTime.isAfter(expireDateTime)) {
                            long overMs = java.time.Duration.between(expireDateTime, checkOutTime).toMillis();
                            long overdueHours = (long) Math.floor((double) overMs / (1000 * 60 * 60));
                            if (overdueHours > 0) {
                                Optional<ViolationRule> ruleOpt = violationRuleRepository.findByTicketTypeAndVehicleType(ticketType, vehicleType);
                                if (ruleOpt.isPresent() && ruleOpt.get().getIsActive()) {
                                    ViolationRule rule = ruleOpt.get();
                                    penalty = rule.getPenaltyPerHour().multiply(BigDecimal.valueOf(overdueHours));
                                    fee = penalty; // Chỉ thu tiền phạt vì phí thẻ đã mua trước
                                    violationReason = "Thẻ " + ("DAY".equalsIgnoreCase(ticketType) ? "ngày" : "tháng") 
                                            + " hết hạn tại thời điểm check-out - quá hạn " + overdueHours + " giờ";
                                }
                            }
                        }
                    }
                }
            }
        }

        // Update Ticket
        ticket.setCheckOutAt(checkOutTime);
        ticket.setExitStaffId(staff.getStaffId());
        ticket.setFeeAmount(fee);
        ticket.setPenaltyAmount(penalty);
        ticket.setViolationReason(violationReason);
        ticket.setExitImage(request.exitImage());
        ticket.setStatus("COMPLETED");
        ParkingSessionRepository.save(ticket);

        // Update Reservation if exists
        if (ticket.getReservationId() != null) {
            Optional<Reservation> resOpt = reservationRepository.findById(ticket.getReservationId());
            if (resOpt.isPresent()) {
                Reservation res = resOpt.get();
                res.setStatus("COMPLETED");
                res.setCompletedAt(checkOutTime);
                res.setIsActive(false);
                reservationRepository.save(res);
            }
        }

        // Get Floor code for response
        String floorCode = "Unknown";
        Floor floor = floorRepository.findById(ticket.getEntryFloorId()).orElse(null);
        if (floor != null) {
            floorCode = floor.getFloorCode();
        }

        // Get entry staff name
        String entryStaffName = "Unknown";
        Staff entryStaff = staffRepository.findById(ticket.getEntryStaffId()).orElse(null);
        if (entryStaff != null) {
            entryStaffName = entryStaff.getFullName();
        }

        String ticketNo = ticket.getSessionNo() != null ? ticket.getSessionNo() : "PSN" + String.format("%06d", ticket.getSessionId());

        return new StaffTicketResponse(
                ticket.getSessionId(),
                ticketNo,
                ticket.getBarcode(),
                ticket.getTicketType(),
                ticket.getVehicleType(),
                ticket.getPlateNoSnapshot(),
                floorCode,
                entryStaffName,
                staff.getFullName(),
                ticket.getCheckInAt(),
                ticket.getCheckOutAt(),
                ticket.getFeeAmount(),
                ticket.getStatus(),
                "Xe ra thành công",
                ticket.getViolationReason(),
                ticket.getEntryImage(),
                ticket.getExitImage()
        );
    }

    @Override
    @Transactional
    public StaffTicketResponse previewCheckOut(String parkingSessionNoOrQrToken, String username) {
        // Find staff
        Account account = accountRepository.findByUsernameIgnoreCase(username)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tài khoản: " + username));
        Staff staff = staffRepository.findByAccountId(account.getAccountId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy nhân viên tương ứng với tài khoản: " + username));

        String input = parkingSessionNoOrQrToken.trim().toUpperCase();
        Optional<ParkingSession> ticketOpt = Optional.empty();

        ticketOpt = ParkingSessionRepository.findBySessionNo(input);

        if (!ticketOpt.isPresent()) {
            ticketOpt = ParkingSessionRepository.findFirstByBarcodeAndStatusInOrderByCheckInAtDesc(input, java.util.List.of("ACTIVE", "PAID"));
            if (!ticketOpt.isPresent()) {
                ticketOpt = ParkingSessionRepository.findFirstByBarcodeOrderByCheckInAtDesc(input);
            }
        }

        if (!ticketOpt.isPresent() && input.startsWith("CARD")) {
            Optional<Card> card = cardRepository.findByCardNo(input);
            if (card.isPresent()) {
                ticketOpt = ParkingSessionRepository.findFirstByCardIdAndStatusOrderByCheckInAtDesc(card.get().getCardId(), "ACTIVE");
                if (!ticketOpt.isPresent()) {
                    ticketOpt = ParkingSessionRepository.findFirstByCardIdAndStatusOrderByCheckInAtDesc(card.get().getCardId(), "PAID");
                }
            }
        }

        if (!ticketOpt.isPresent() && input.startsWith("RES")) {
            Optional<Reservation> res = reservationRepository.findByReservationNo(input);
            if (res.isPresent()) {
                ticketOpt = ParkingSessionRepository.findFirstByReservationIdAndStatusOrderByCheckInAtDesc(res.get().getReservationId(), "ACTIVE");
                if (!ticketOpt.isPresent()) {
                    ticketOpt = ParkingSessionRepository.findFirstByReservationIdAndStatusOrderByCheckInAtDesc(res.get().getReservationId(), "PAID");
                }
            }
        }

        if (!ticketOpt.isPresent()) {
            ticketOpt = ParkingSessionRepository.findFirstByPlateNoSnapshotAndStatusOrderByCheckInAtDesc(input, "ACTIVE");
            if (!ticketOpt.isPresent()) {
                ticketOpt = ParkingSessionRepository.findFirstByPlateNoSnapshotAndStatusOrderByCheckInAtDesc(input, "PAID");
            }
        }

        ParkingSession ticket = ticketOpt.orElseThrow(() -> new RuntimeException("Không tìm thấy thông tin xe đang gửi hoặc vé đã được thanh toán"));

        if (!ticket.getStatus().equalsIgnoreCase("ACTIVE") && !ticket.getStatus().equalsIgnoreCase("PAID")) {
            throw new RuntimeException("Không tìm thấy thông tin xe đang gửi hoặc vé đã được thanh toán");
        }

        BigDecimal fee = BigDecimal.ZERO;
        BigDecimal penalty = BigDecimal.ZERO;
        String violationReason = null;
        LocalDateTime checkIn = ticket.getCheckInAt();
        LocalDateTime checkOutTime = LocalDateTime.now();
        String ticketType = ticket.getTicketType();
        String vehicleType = ticket.getVehicleType();

        if ("SINGLE".equalsIgnoreCase(ticketType)) {
            BigDecimal basePrice = "CAR".equalsIgnoreCase(vehicleType) ? new BigDecimal("20000") : new BigDecimal("5000");
            Optional<CardGroup> cgOpt = cardGroupRepository.findFirstByVehicleTypeIgnoreCaseAndTicketTypeIgnoreCaseAndStatusIgnoreCase(
                vehicleType, "SINGLE", "ACTIVE"
            );
            if (cgOpt.isPresent()) {
                basePrice = cgOpt.get().getBasePrice();
            }
            fee = basePrice;

            Optional<ViolationRule> ruleOpt = violationRuleRepository.findByTicketTypeAndVehicleType(ticketType, vehicleType);
            if (ruleOpt.isPresent() && ruleOpt.get().getIsActive()) {
                ViolationRule rule = ruleOpt.get();
                long diffMs = java.time.Duration.between(checkIn, checkOutTime).toMillis();
                long diffHours = (long) Math.floor((double) diffMs / (1000 * 60 * 60));
                if (diffHours > rule.getMaxDurationHours()) {
                    long overdueHours = diffHours - rule.getMaxDurationHours();
                    penalty = rule.getPenaltyPerHour().multiply(BigDecimal.valueOf(overdueHours));
                    fee = fee.add(penalty);
                    violationReason = "Đỗ quá giờ cho phép (quá " + rule.getMaxDurationHours() + "h) - quá hạn " + overdueHours + " giờ";
                }
            }
        } else if ("DAY".equalsIgnoreCase(ticketType) || "MONTHLY".equalsIgnoreCase(ticketType)) {
            if (ticket.getCardId() != null) {
                Optional<Card> cardOpt = cardRepository.findById(ticket.getCardId());
                if (cardOpt.isPresent()) {
                    Card card = cardOpt.get();
                    if (card.getExpireAt() != null) {
                        LocalDateTime expireDateTime = card.getExpireAt().atTime(23, 59, 59);
                        if (checkOutTime.isAfter(expireDateTime)) {
                            long overMs = java.time.Duration.between(expireDateTime, checkOutTime).toMillis();
                            long overdueHours = (long) Math.floor((double) overMs / (1000 * 60 * 60));
                            if (overdueHours > 0) {
                                Optional<ViolationRule> ruleOpt = violationRuleRepository.findByTicketTypeAndVehicleType(ticketType, vehicleType);
                                if (ruleOpt.isPresent() && ruleOpt.get().getIsActive()) {
                                    ViolationRule rule = ruleOpt.get();
                                    penalty = rule.getPenaltyPerHour().multiply(BigDecimal.valueOf(overdueHours));
                                    fee = penalty;
                                    violationReason = "Thẻ " + ("DAY".equalsIgnoreCase(ticketType) ? "ngày" : "tháng") 
                                            + " hết hạn tại thời điểm check-out - quá hạn " + overdueHours + " giờ";
                                }
                            }
                        }
                    }
                }
            }
        }

        String floorCode = "Unknown";
        Floor floor = floorRepository.findById(ticket.getEntryFloorId()).orElse(null);
        if (floor != null) {
            floorCode = floor.getFloorCode();
        }

        String entryStaffName = "Unknown";
        Staff entryStaff = staffRepository.findById(ticket.getEntryStaffId()).orElse(null);
        if (entryStaff != null) {
            entryStaffName = entryStaff.getFullName();
        }

        // Lưu phí đã tính vào DB để các bước thanh toán (Cash/VNPay) có số liệu
        ticket.setFeeAmount(fee);
        ticket.setPenaltyAmount(penalty);
        ticket.setViolationReason(violationReason);
        ParkingSessionRepository.save(ticket);

        String ticketNo = ticket.getSessionNo() != null ? ticket.getSessionNo() : "PSN" + String.format("%06d", ticket.getSessionId());

        String checkoutMsg = "Xem trước thông tin vé ra thành công";
        if (penalty.compareTo(BigDecimal.ZERO) > 0) {
            checkoutMsg = "Phạt quá hạn đỗ: " + String.format("%,d", penalty.longValue()) + "đ (đã cộng vào tổng tiền vé)";
        }

        return new StaffTicketResponse(
                ticket.getSessionId(),
                ticketNo,
                ticket.getBarcode(),
                ticket.getTicketType(),
                ticket.getVehicleType(),
                ticket.getPlateNoSnapshot(),
                floorCode,
                entryStaffName,
                staff.getFullName(),
                ticket.getCheckInAt(),
                checkOutTime,
                fee,
                ticket.getStatus(),
                checkoutMsg,
                violationReason,
                ticket.getEntryImage(),
                null
        );
    }

    @Override
    public List<StaffTransactionResponse> getTransactionHistory(String username) {
        Account account = accountRepository.findByUsernameIgnoreCase(username)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tài khoản: " + username));
        Staff staff = staffRepository.findByAccountId(account.getAccountId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy nhân viên tương ứng với tài khoản: " + username));

        List<ParkingSession> tickets = ParkingSessionRepository.findByEntryStaffIdOrExitStaffIdOrderByCheckInAtDesc(
                staff.getStaffId(), staff.getStaffId());

        return tickets.stream().map(ticket -> {
            String vehicleDisplay = ticket.getVehicleType().equalsIgnoreCase("CAR") ? "Ô tô" : "Xe máy";
            String ticketDisplay = ticket.getTicketType().equalsIgnoreCase("SINGLE") ? "Vé lượt" : "Vé tháng";

            return new StaffTransactionResponse(
                    ticket.getSessionId(),
                    ticket.getSessionNo() != null ? ticket.getSessionNo() : "TK" + String.format("%06d", ticket.getSessionId()),
                    ticket.getPlateNoSnapshot(),
                    vehicleDisplay,
                    ticketDisplay,
                    ticket.getCheckInAt(),
                    ticket.getCheckOutAt(),
                    ticket.getFeeAmount(),
                    staff.getFullName(),
                    ticket.getStatus(),
                    ticket.getEntryImage(),
                    ticket.getExitImage()
            );
        }).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public java.util.Map<String, Object> getPreBookedDetails(String code) {
        String cleanCode = code.trim().toUpperCase();
        java.util.Map<String, Object> result = new java.util.HashMap<>();
        if (cleanCode.startsWith("CARD")) {
            Card card = cardRepository.findByCardNo(cleanCode)
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy thẻ tháng: " + cleanCode));

            if (!card.getStatus().equalsIgnoreCase("ACTIVE")) {
                throw new RuntimeException("Thẻ tháng " + cleanCode + " không hoạt động (Trạng thái: " + card.getStatus() + ")");
            }

            if (card.getEffectiveFrom() != null && card.getEffectiveFrom().isAfter(LocalDate.now())) {
                throw new RuntimeException("Thẻ tháng chưa đến ngày bắt đầu sử dụng (Ngày bắt đầu: " + card.getEffectiveFrom() + ")");
            }

            if (card.getExpireAt() != null && card.getExpireAt().isBefore(LocalDate.now())) {
                throw new RuntimeException("Thẻ tháng đã hết hạn vào ngày " + card.getExpireAt());
            }

            Vehicle vehicle = vehicleRepository.findById(card.getVehicleId())
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy phương tiện đăng ký cho thẻ tháng này"));

            result.put("plate", vehicle.getPlateNo());
            String typeDisplay = vehicle.getVehicleType().equalsIgnoreCase("CAR") ? "Ô tô" : "Xe máy";
            result.put("type", typeDisplay);
            result.put("status", card.getStatus());
            return result;
        } else if (cleanCode.startsWith("RES")) {
            Reservation res = reservationRepository.findByReservationNo(cleanCode)
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy thông tin đặt trước: " + cleanCode));

            if (!res.getStatus().equalsIgnoreCase("CONFIRMED")) {
                throw new RuntimeException("Đơn đặt trước không khả dụng (Trạng thái: " + res.getStatus() + ")");
            }

            if (!res.getReservationDate().equals(LocalDate.now())) {
                throw new RuntimeException("Đơn đặt trước dành cho ngày " + res.getReservationDate() + ". Hôm nay là " + LocalDate.now());
            }

            Vehicle vehicle = vehicleRepository.findById(res.getVehicleId())
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy phương tiện đăng ký cho đơn đặt trước"));

            result.put("plate", vehicle.getPlateNo());
            String typeDisplay = vehicle.getVehicleType().equalsIgnoreCase("CAR") ? "Ô tô" : "Xe máy";
            result.put("type", typeDisplay);
            result.put("status", res.getStatus());
            return result;
        } else {
            throw new RuntimeException("Mã đặt trước không hợp lệ (Phải bắt đầu bằng CARD hoặc RES)");
        }
    }

    @Override
    @Transactional(readOnly = true)
    public java.util.Map<String, Object> getCardInfo(String cardNo) {
        String cleanCode = cardNo.trim().toUpperCase();
        Card card = cardRepository.findByCardNo(cleanCode)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy thẻ tháng: " + cleanCode));

        java.util.Map<String, Object> result = new java.util.HashMap<>();
        result.put("status", card.getStatus());

        if (card.getVehicleId() != null) {
            Vehicle vehicle = vehicleRepository.findById(card.getVehicleId()).orElse(null);
            if (vehicle != null) {
                result.put("plateNumber", vehicle.getPlateNo());
                result.put("vehicleType", vehicle.getVehicleType());
            } else {
                result.put("plateNumber", "");
                result.put("vehicleType", "");
            }
        } else {
            result.put("plateNumber", "");
            result.put("vehicleType", "");
        }

        return result;
    }
}
