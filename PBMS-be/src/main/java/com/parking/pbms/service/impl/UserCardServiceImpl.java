package com.parking.pbms.service.impl;

import com.parking.pbms.dto.MonthlyCardResponse;
import com.parking.pbms.dto.RegisterCardRequest;
import com.parking.pbms.dto.RenewCardRequest;
import com.parking.pbms.model.*;
import com.parking.pbms.repository.*;
import com.parking.pbms.repository.CustomerRepository;
import com.parking.pbms.service.UserCardService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.*;
import java.util.stream.Collectors;

import com.parking.pbms.config.VnPayConfig;

@Service
@RequiredArgsConstructor
public class UserCardServiceImpl implements UserCardService {

    private final AccountRepository accountRepository;
    private final CustomerRepository customerRepository;
    private final CardRepository cardRepository;
    private final CardGroupRepository cardGroupRepository;
    private final VehicleRepository vehicleRepository;
    private final FloorRepository floorRepository;
    private final PaymentRepository paymentRepository;
    private final CardHistoryRepository cardHistoryRepository;
    private final VnPayConfig vnPayConfig;

    private final Random random = new Random();

    @Override
    @Transactional(readOnly = true)
    public List<MonthlyCardResponse> getMyCards(String username) {
        Account account = accountRepository.findByUsernameIgnoreCase(username)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tài khoản: " + username));

        Customer customer = customerRepository.findByAccountId(account.getAccountId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy khách hàng tương ứng với tài khoản: " + username));

        List<Card> cards = cardRepository.findMonthlyAndDayCardsByCustomerId(customer.getCustomerId());

        return cards.stream()
                .filter(card -> !"PENDING".equalsIgnoreCase(card.getStatus()) && !"INACTIVE".equalsIgnoreCase(card.getStatus()))
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public MonthlyCardResponse registerCard(String username, RegisterCardRequest request) {
        Account account = accountRepository.findByUsernameIgnoreCase(username)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tài khoản: " + username));

        Customer customer = customerRepository.findByAccountId(account.getAccountId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy khách hàng tương ứng với tài khoản: " + username));

        CardGroup cardGroup = cardGroupRepository.findByGroupName(request.nhomThe())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy nhóm thẻ: " + request.nhomThe()));

        // Find or create vehicle
        String plateNo = request.bienSo().trim().toUpperCase();
        Vehicle vehicle = vehicleRepository.findByPlateNo(plateNo).orElse(null);
        if (vehicle == null) {
            vehicle = Vehicle.builder()
                    .customerId(customer.getCustomerId())
                    .plateNo(plateNo)
                    .vehicleType(cardGroup.getVehicleType())
                    .status("ACTIVE")
                    .build();
        } else {
            // Update owner and activate if it was inactives
            vehicle.setCustomerId(customer.getCustomerId());
            vehicle.setStatus("ACTIVE");
        }
        vehicle = vehicleRepository.save(vehicle);

        // Find preferred floor if provided
        Integer preferredFloorId = null;
        if (request.tangGuiXe() != null && !request.tangGuiXe().trim().isEmpty()) {
            String floorCode = "B1";
            if (request.tangGuiXe().contains("B2")) {
                floorCode = "B2";
            } else if (request.tangGuiXe().contains("B3")) {
                floorCode = "B3";
            }
            Floor floor = floorRepository.findByFloorCode(floorCode).orElse(null);
            if (floor != null) {
                preferredFloorId = floor.getFloorId();
            }
        }

        // Calculate Expiry Date based on startDate
        LocalDate startDate = request.startDate() != null ? request.startDate() : LocalDate.now();
        LocalDate expireAt;
        if (cardGroup.getTicketType().equalsIgnoreCase("DAY")) {
            expireAt = startDate.plusDays(request.duration());
        } else {
            expireAt = startDate.plusMonths(request.duration());
        }

        // Generate unique RFIDUID
        String rfidUid;
        do {
            rfidUid = String.format("RFID%08d", random.nextInt(100000000));
        } while (cardRepository.existsByRfidUid(rfidUid));

        // Create Card
        Card card = Card.builder()
                .rfidUid(rfidUid)
                .cardGroupId(cardGroup.getCardGroupId())
                .customerId(customer.getCustomerId())
                .vehicleId(vehicle.getVehicleId())
                .preferredFloorID(preferredFloorId)
                .registeredAt(LocalDate.now())
                .effectiveFrom(startDate)
                .expireAt(expireAt)
                .status("PENDING")
                .note("Đăng ký trực tuyến - chờ thanh toán")
                .build();
        card = cardRepository.save(card);

        java.math.BigDecimal calculatedAmount = calculateAmount(cardGroup, request.duration());

        // Create Payment
        Payment payment = Payment.builder()
                .payerAccountId(account.getAccountId())
                .cardId(card.getCardId())
                .paymentType("CARD_REGISTRATION")
                .amount(calculatedAmount)
                .paymentMethod("VIETQR")
                .gateway("VNPAY")
                .referenceCode("REG-" + card.getCardId() + "-" + System.currentTimeMillis())
                .status("PENDING")
                .paidAt(null)
                .build();
        payment = paymentRepository.save(payment);

        // Create Card History
        CardHistory history = CardHistory.builder()
                .cardId(card.getCardId())
                .actionType("REGISTER")
                .performedBy(account.getAccountId())
                .paymentId(payment.getPaymentId())
                .newExpireAt(expireAt)
                .durationMonths(cardGroup.getTicketType().equalsIgnoreCase("MONTHLY") ? request.duration() : null)
                .detail("Đăng ký nhóm thẻ: " + cardGroup.getGroupName())
                .build();
        cardHistoryRepository.save(history);

        MonthlyCardResponse response = mapToResponse(card);
        
        try {
            long amount = payment.getAmount().longValue();
            String cardNoForDesc = card.getCardNo() != null ? card.getCardNo() : String.format("CARD%06d", card.getCardId());
            String paymentUrl = vnPayConfig.createPaymentUrl(
                    payment.getPaymentId().longValue(),
                    amount,
                    "Dang ky the " + cardNoForDesc,
                    "127.0.0.1"
            );

            response.setCheckoutUrl(paymentUrl);
            response.setQrCode(paymentUrl); // Dùng chính URL làm QR để hiển thị
            response.setOrderCode(payment.getPaymentId().longValue());
        } catch (Exception e) {
            throw new RuntimeException("Lỗi khi tạo link thanh toán VNPay: " + e.getMessage());
        }

        return response;
    }

    @Override
    @Transactional
    public MonthlyCardResponse renewCard(String username, RenewCardRequest request) {
        Account account = accountRepository.findByUsernameIgnoreCase(username)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tài khoản: " + username));

        Customer customer = customerRepository.findByAccountId(account.getAccountId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy khách hàng tương ứng với tài khoản: " + username));

        Card card = cardRepository.findById(request.cardId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy thẻ với ID: " + request.cardId()));

        if (!card.getCustomerId().equals(customer.getCustomerId())) {
            throw new RuntimeException("Thẻ này không thuộc quyền sở hữu của bạn.");
        }

        CardGroup cardGroup = cardGroupRepository.findById(card.getCardGroupId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy nhóm thẻ của thẻ."));

        LocalDate oldExpiry = card.getExpireAt();
        LocalDate today = LocalDate.now();

        // Tính ngày hết hạn mới dựa trên trạng thái thẻ hiện tại trong DB:
        // - Nếu thẻ đã hết hạn (ExpireAt < ngày hiện tại): cộng từ hôm nay
        // - Nếu thẻ còn hiệu lực: cộng dồn từ ngày hết hạn cũ
        boolean isExpired = (oldExpiry == null || oldExpiry.isBefore(today));
        LocalDate newExpiry = isExpired
                ? today.plusMonths(request.duration())
                : oldExpiry.plusMonths(request.duration());

        // Cập nhật thẻ ngay: gán ExpireAt mới và đảm bảo trạng thái ACTIVE
        card.setExpireAt(newExpiry);
        card.setStatus("ACTIVE");
        cardRepository.save(card);

        java.math.BigDecimal calculatedAmount = calculateAmount(cardGroup, request.duration());

        // Create Payment
        Payment payment = Payment.builder()
                .payerAccountId(account.getAccountId())
                .cardId(card.getCardId())
                .paymentType("CARD_RENEWAL")
                .amount(calculatedAmount)
                .paymentMethod("VIETQR")
                .gateway("VNPAY")
                .referenceCode("REN-" + card.getCardId() + "-" + System.currentTimeMillis())
                .status("PENDING")
                .paidAt(null)
                .build();
        payment = paymentRepository.save(payment);

        // Create Card History
        CardHistory history = CardHistory.builder()
                .cardId(card.getCardId())
                .actionType("RENEW")
                .performedBy(account.getAccountId())
                .paymentId(payment.getPaymentId())
                .oldExpireAt(oldExpiry)
                .newExpireAt(newExpiry)
                .durationMonths(cardGroup.getTicketType().equalsIgnoreCase("MONTHLY") ? request.duration() : null)
                .detail("Gia hạn thẻ, thêm " + request.duration() + (cardGroup.getTicketType().equalsIgnoreCase("MONTHLY") ? " tháng" : " ngày"))
                .build();
        cardHistoryRepository.save(history);

        MonthlyCardResponse response = mapToResponse(card);
        
        try {
            long amount = payment.getAmount().longValue();
            String cardNoForDesc = card.getCardNo() != null ? card.getCardNo() : String.format("CARD%06d", card.getCardId());
            String paymentUrl = vnPayConfig.createPaymentUrl(
                    payment.getPaymentId().longValue(),
                    amount,
                    "Gia han the thang " + cardNoForDesc,
                    "127.0.0.1"
            );

            response.setCheckoutUrl(paymentUrl);
            response.setQrCode(paymentUrl);
            response.setOrderCode(payment.getPaymentId().longValue());
        } catch (Exception e) {
            throw new RuntimeException("Lỗi khi tạo link thanh toán VNPay: " + e.getMessage());
        }

        return response;
    }

    @Override
    @Transactional(readOnly = true)
    public List<CardGroup> getActiveCardGroups() {
        return cardGroupRepository.findAll().stream()
                .filter(cg -> cg.getStatus().equalsIgnoreCase("ACTIVE") && !cg.getTicketType().equalsIgnoreCase("SINGLE"))
                .collect(Collectors.toList());
    }

    private java.math.BigDecimal calculateAmount(CardGroup cardGroup, int duration) {
        java.math.BigDecimal basePrice = cardGroup.getBasePrice();
        java.math.BigDecimal result;
        if (cardGroup.getTicketType().equalsIgnoreCase("MONTHLY")) {
            if (duration == 3) {
                result = basePrice.multiply(java.math.BigDecimal.valueOf(2.8)).setScale(0, java.math.RoundingMode.HALF_UP);
            } else if (duration == 6) {
                result = basePrice.multiply(java.math.BigDecimal.valueOf(5.4)).setScale(0, java.math.RoundingMode.HALF_UP);
            } else {
                result = basePrice.multiply(java.math.BigDecimal.valueOf(duration));
            }
        } else {
            result = basePrice.multiply(java.math.BigDecimal.valueOf(duration));
        }
        // Enforce VNPay minimum: 10,000 VND
        java.math.BigDecimal minimum = java.math.BigDecimal.valueOf(10000);
        return result.compareTo(minimum) < 0 ? minimum : result;
    }

    private MonthlyCardResponse mapToResponse(Card card) {
        CardGroup group = cardGroupRepository.findById(card.getCardGroupId()).orElse(null);
        Vehicle vehicle = card.getVehicleId() != null ? vehicleRepository.findById(card.getVehicleId()).orElse(null) : null;
        Floor floor = card.getPreferredFloorID() != null ? floorRepository.findById(card.getPreferredFloorID()).orElse(null) : null;

        String nhomThe = group != null ? group.getGroupName() : "";
        String loaiXe = group != null ? (group.getVehicleType().equalsIgnoreCase("MOTORCYCLE") ? "Xe máy" : "Ô tô") : "";
        String bienSo = vehicle != null ? vehicle.getPlateNo() : "";
        String tangGuiXe = floor != null ? (floor.getFloorCode().equals("B1") ? "Tầng B1" : floor.getFloorCode().equals("B2") ? "Tầng B2" : floor.getFloorName()) : null;

        // Calculate remaining days
        int remainingDays = 0;
        if (card.getExpireAt() != null) {
            remainingDays = (int) ChronoUnit.DAYS.between(LocalDate.now(), card.getExpireAt());
        }
        String trangThai = remainingDays <= 0 ? "Hết hạn" : (remainingDays <= 14 ? "Sắp hết hạn" : "Hoạt động");

        String cardNo = card.getCardNo();
        if (cardNo == null) {
            cardNo = String.format("CARD%06d", card.getCardId());
        }

        return MonthlyCardResponse.builder()
                .id(card.getCardId())
                .cardNo(cardNo)
                .nhomThe(nhomThe)
                .loaiXe(loaiXe)
                .bienSo(bienSo)
                .ngayDangKy(card.getRegisteredAt() != null ? card.getRegisteredAt().toString() : "")
                .ngayHetHan(card.getExpireAt() != null ? card.getExpireAt().toString() : "")
                .tangGuiXe(tangGuiXe)
                .trangThai(trangThai)
                .soNgayConLai(remainingDays)
                .build();
    }
}
