package com.parking.pbms.service.impl;

import com.parking.pbms.dto.PaymentRequest;
import com.parking.pbms.dto.PaymentResponse;
import com.parking.pbms.model.ParkingSession;
import com.parking.pbms.model.Payment;
import com.parking.pbms.model.Card;
import com.parking.pbms.model.CardHistory;
import com.parking.pbms.repository.CardRepository;
import com.parking.pbms.repository.CardHistoryRepository;
import com.parking.pbms.repository.ParkingSessionRepository;
import com.parking.pbms.repository.PaymentRepository;
import com.parking.pbms.service.PaymentService;
import com.parking.pbms.config.VnPayConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentServiceImpl implements PaymentService {

    private final PaymentRepository paymentRepository;
    private final ParkingSessionRepository ticketRepository;
    private final CardRepository cardRepository;
    private final CardHistoryRepository cardHistoryRepository;
    private final VnPayConfig vnPayConfig;

    @Override
    @Transactional
    public PaymentResponse createPayment(PaymentRequest request) {
        ParkingSession ticket = ticketRepository.findById(request.getTicketId())
                .orElseThrow(() -> new RuntimeException("Ticket not found"));

        BigDecimal fee = ticket.getFeeAmount() != null ? ticket.getFeeAmount() : BigDecimal.ZERO;
        BigDecimal penalty = ticket.getPenaltyAmount() != null ? ticket.getPenaltyAmount() : BigDecimal.ZERO;
        BigDecimal totalAmount = fee.add(penalty);

        // CHỈ CHẶN KHI SỐ TIỀN BỊ ÂM
        if (totalAmount.compareTo(BigDecimal.ZERO) < 0) {
            throw new RuntimeException("Số tiền thanh toán không được nhỏ hơn 0 VND");
        }

        String description = "ThanhToanVeXe_" + ticket.getSessionId();

        // Resolve payerAccountId from the card owner (null for guest/SINGLE sessions)
        Integer payerAccountId = null;
        if (ticket.getCardId() != null) {
            payerAccountId = cardRepository.findById(ticket.getCardId())
                    .map(card -> card.getAccountId())
                    .orElse(null);
        }

        // 1. Lưu trạng thái PENDING vào Database trước
        Payment payment = Payment.builder()
                .ticketId(ticket.getSessionId())
                .payerAccountId(payerAccountId)
                .amount(totalAmount)
                .paymentMethod("VIETQR")
                .paymentType("PARKING_FEE")
                .referenceCode(description)
                .status("PENDING")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        payment = paymentRepository.save(payment);

        long orderCode = payment.getPaymentId().longValue();

        try {
            long amount = totalAmount.longValue();
            String ip = (request.getIpAddr() != null && !request.getIpAddr().isBlank())
                    ? request.getIpAddr() : "127.0.0.1";
            String paymentUrl = vnPayConfig.createPaymentUrl(
                    orderCode,
                    amount,
                    "ThanhToanVeXe_" + ticket.getSessionId(),
                    ip
            );

            // NẾU SỐ TIỀN BẰNG 0 VND: Duyệt hoàn tất giao dịch luôn tại hệ thống, không qua VNPay
            if (amount == 0) {
                payment.setStatus("PAID");
                payment.setPaidAt(LocalDateTime.now());
                payment.setPaymentMethod("SYSTEM");
                paymentRepository.save(payment);

                // Cập nhật luôn trạng thái của Vé xe (Ticket) thành PAID để mở barrier
                ticket.setStatus("PAID");
                ticketRepository.save(ticket);

                log.info("Ticket {} mien phi (0 VND). Da tu dong cap nhat trang thai PAID.", ticket.getSessionId());
            }
            // NẾU SỐ TIỀN > 0 VND: Tiến hành tạo link thanh toán VNPay bình thường
            else {
                String ip = (request.getIpAddr() != null && !request.getIpAddr().isBlank())
                        ? request.getIpAddr() : "127.0.0.1";
                paymentUrl = vnPayConfig.createPaymentUrl(
                        orderCode,
                        amount,
                        newReferenceCode,
                        ip
                );
            }

            // Trả kết quả về cho Frontend (Nếu là 0 VND thì checkoutUrl sẽ là null)
            return PaymentResponse.builder()
                    .paymentId(payment.getPaymentId())
                    .ticketId(payment.getTicketId())
                    .amount(payment.getAmount())
                    .description(payment.getReferenceCode())
                    .status(payment.getStatus())
                    .checkoutUrl(paymentUrl)
                    .build();
        } catch (Exception e) {
            log.error("Lỗi khi tạo payment link trên VNPay", e);
            throw new RuntimeException("Không thể tạo giao dịch VNPay");
        }
    }

    @Override
    @Transactional
    public PaymentResponse createCashPayment(Long ticketId) {
        ParkingSession ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new RuntimeException("Ticket not found: " + ticketId));

        BigDecimal fee = ticket.getFeeAmount() != null ? ticket.getFeeAmount() : BigDecimal.ZERO;
        BigDecimal penalty = ticket.getPenaltyAmount() != null ? ticket.getPenaltyAmount() : BigDecimal.ZERO;
        BigDecimal totalAmount = fee.add(penalty);

        // Resolve payerAccountId from the card owner (null for guest/SINGLE sessions)
        Integer payerAccountId = null;
        if (ticket.getCardId() != null) {
            payerAccountId = cardRepository.findById(ticket.getCardId())
                    .map(card -> card.getAccountId())
                    .orElse(null);
        }

        // Tao Payment record voi trang thai PAID ngay (khong qua cong thanh toan)
        Payment payment = Payment.builder()
                .ticketId(ticket.getSessionId())
                .payerAccountId(payerAccountId)
                .amount(totalAmount)
                .paymentMethod("CASH")
                .paymentType("PARKING_FEE")
                .referenceCode("CASH_" + ticket.getSessionId() + "_" + System.currentTimeMillis())
                .status("PAID")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .paidAt(LocalDateTime.now())
                .build();
        payment = paymentRepository.save(payment);

        // Cap nhat trang thai ticket thanh PAID
        ticket.setStatus("PAID");
        ticketRepository.save(ticket);

        log.info("[CASH] Ticket {} da duoc thanh toan tien mat. Tong: {}", ticketId, totalAmount);

        return PaymentResponse.builder()
                .paymentId(payment.getPaymentId())
                .ticketId(payment.getTicketId())
                .amount(payment.getAmount())
                .description(payment.getReferenceCode())
                .status(payment.getStatus())
                .build();
    }

    @Override
    public PaymentResponse checkStatus(Long ticketId) {
        return paymentRepository.findById(ticketId)
                .map(payment -> PaymentResponse.builder()
                        .paymentId(payment.getPaymentId())
                        .ticketId(payment.getTicketId())
                        .amount(payment.getAmount())
                        .description(payment.getReferenceCode())
                        .status(payment.getStatus())
                        .build())
                .orElseThrow(() -> new RuntimeException("Payment not found"));
    }

    @Override
    @Transactional
    public java.util.Map<String, String> handleVnPayIpn(java.util.Map<String, String> params) {
        java.util.Map<String, String> response = new java.util.HashMap<>();
        try {
            // Lay va xoa vnp_SecureHash ra khoi map truoc khi build chuoi hash
            String vnp_SecureHash = params.get("vnp_SecureHash");
            params.remove("vnp_SecureHashType");
            params.remove("vnp_SecureHash");

            // Sort theo alphabet (dung TreeMap de dam bao dung thu tu)
            Map<String, String> sortedParams = new TreeMap<>(params);

            // Build chuoi hashData GIONG HET voi luc tao URL trong VnPayConfig:
            // - fieldName: giu nguyen (KHONG encode)
            // - fieldValue: URLEncoder.encode(..., US_ASCII) - giu dau +, KHONG replace %20
            // - Dung boolean first de noi &, KHONG dung itr.hasNext() de tranh bug trailing &
            StringBuilder hashData = new StringBuilder();
            boolean first = true;
            for (Map.Entry<String, String> entry : sortedParams.entrySet()) {
                String fieldName  = entry.getKey();
                String fieldValue = entry.getValue();
                if (fieldValue != null && !fieldValue.isEmpty()) {
                    if (!first) hashData.append('&');
                    hashData.append(fieldName)
                            .append('=')
                            .append(URLEncoder.encode(fieldValue, StandardCharsets.US_ASCII.toString()));
                    first = false;
                }
            }

            String hashDataStr = hashData.toString();
            String signValue   = VnPayConfig.hmacSHA512(vnPayConfig.getVnpHashSecret(), hashDataStr);

            System.out.println("[IPN] HashSecret  : " + vnPayConfig.getVnpHashSecret());
            System.out.println("[IPN] Hash Data   : " + hashDataStr);
            System.out.println("[IPN] Computed    : " + signValue);
            System.out.println("[IPN] From VNPay  : " + vnp_SecureHash);
            System.out.println("[IPN] Match?      : " + signValue.equals(vnp_SecureHash));

            if (!signValue.equals(vnp_SecureHash)) {
                response.put("RspCode", "97");
                response.put("Message", "Invalid Checksum");
                return response;
            }

            long orderCode = Long.parseLong(params.get("vnp_TxnRef"));
            Payment payment = paymentRepository.findById(orderCode).orElse(null);

            if (payment == null) {
                response.put("RspCode", "01");
                response.put("Message", "Order not found");
                return response;
            }

            long amount = Long.parseLong(params.get("vnp_Amount")) / 100;
            if (payment.getAmount().longValue() != amount) {
                response.put("RspCode", "04");
                response.put("Message", "Invalid amount");
                return response;
            }

            if ("PAID".equalsIgnoreCase(payment.getStatus()) || "CANCELLED".equalsIgnoreCase(payment.getStatus())) {
                response.put("RspCode", "02");
                response.put("Message", "Order already confirmed");
                return response;
            }

            String responseCode = params.get("vnp_ResponseCode");
            if ("00".equals(responseCode)) {
                payment.setStatus("PAID");
                payment.setPaidAt(LocalDateTime.now());
                paymentRepository.save(payment);

                if ("CARD_REGISTRATION".equalsIgnoreCase(payment.getPaymentType())) {
                    Card card = cardRepository.findById(payment.getCardId()).orElse(null);
                    if (card != null) {
                        card.setStatus("ACTIVE");
                        cardRepository.save(card);
                    }
                } else if ("CARD_RENEWAL".equalsIgnoreCase(payment.getPaymentType())) {
                    Card card = cardRepository.findById(payment.getCardId()).orElse(null);
                    if (card != null) {
                        CardHistory history = cardHistoryRepository.findByPaymentId(payment.getPaymentId()).orElse(null);
                        if (history != null && history.getNewExpireAt() != null) {
                            card.setExpireAt(history.getNewExpireAt());
                        }
                        card.setStatus("ACTIVE");
                        cardRepository.save(card);
                    }
                } else if ("PARKING_FEE".equalsIgnoreCase(payment.getPaymentType())) {
                    ParkingSession ticket = ticketRepository.findById(payment.getTicketId()).orElse(null);
                    if (ticket != null) {
                        ticket.setStatus("PAID");
                        ticketRepository.save(ticket);
                    }
                }
            } else {
                payment.setStatus("CANCELLED");
                paymentRepository.save(payment);
            }

            response.put("RspCode", "00");
            response.put("Message", "Confirm Success");
            return response;
        } catch (Exception e) {
            log.error("Lỗi khi xử lý IPN từ VNPay", e);
            response.put("RspCode", "99");
            response.put("Message", "Unknown error");
            return response;
        }
    }

    @Override
    public PaymentResponse getPaymentStatus(Long orderCode) {
        Payment payment = paymentRepository.findById(orderCode)
                .orElseThrow(() -> new RuntimeException("Giao dịch không tồn tại"));

        return PaymentResponse.builder()
                .paymentId(payment.getPaymentId())
                .ticketId(payment.getTicketId())
                .amount(payment.getAmount())
                .description(payment.getReferenceCode())
                .status(payment.getStatus())
                .build();
    }

    @Override
    @Transactional
    public void cancelPayment(Long orderCode, String reason) {
        Payment payment = paymentRepository.findById(orderCode)
                .orElseThrow(() -> new RuntimeException("Giao dịch không tồn tại"));

        if (!"PENDING".equalsIgnoreCase(payment.getStatus())) {
            throw new RuntimeException("Chỉ có thể hủy giao dịch đang chờ thanh toán");
        }

        // Bỏ logic gọi huỷ sang cổng thanh toán vì VNPay không có API huỷ trực tiếp như các hệ thống cũ
        // Thường giao dịch VNPay chưa thanh toán sẽ tự hết hạn (vnp_ExpireDate)
        // Nên chỉ cần update ở Database là đủ


        payment.setStatus("CANCELLED");
        paymentRepository.save(payment);

        if ("CARD_REGISTRATION".equalsIgnoreCase(payment.getPaymentType())) {
            Card card = cardRepository.findById(payment.getCardId()).orElse(null);
            if (card != null) {
                card.setStatus("INACTIVE");
                cardRepository.save(card);
            }
        }
    }

    @Override
    @Transactional
    public void mockPaymentSuccess(Long orderCode) {
        Payment payment = paymentRepository.findById(orderCode)
                .orElseThrow(() -> new RuntimeException("Giao dịch không tồn tại"));

        if ("PAID".equalsIgnoreCase(payment.getStatus())) {
            return;
        }

        payment.setStatus("PAID");
        payment.setPaidAt(LocalDateTime.now());
        paymentRepository.save(payment);

        if ("CARD_REGISTRATION".equalsIgnoreCase(payment.getPaymentType())) {
            Card card = cardRepository.findById(payment.getCardId()).orElse(null);
            if (card != null) {
                card.setStatus("ACTIVE");
                cardRepository.save(card);
            }
        } else if ("CARD_RENEWAL".equalsIgnoreCase(payment.getPaymentType())) {
            Card card = cardRepository.findById(payment.getCardId()).orElse(null);
            if (card != null) {
                CardHistory history = cardHistoryRepository.findByPaymentId(payment.getPaymentId()).orElse(null);
                if (history != null && history.getNewExpireAt() != null) {
                    card.setExpireAt(history.getNewExpireAt());
                }
                card.setStatus("ACTIVE");
                cardRepository.save(card);
            }
        } else if ("PARKING_FEE".equalsIgnoreCase(payment.getPaymentType())) {
            ParkingSession ticket = ticketRepository.findById(payment.getTicketId()).orElse(null);
            if (ticket != null) {
                ticket.setStatus("PAID");
                ticketRepository.save(ticket);
            }
        }
    }
}
