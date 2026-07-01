package com.parking.pbms.controller;

import com.parking.pbms.dto.ApiResponse;
import com.parking.pbms.dto.PaymentRequest;
import com.parking.pbms.dto.PaymentResponse;
import com.parking.pbms.dto.StaffAssignmentResponse;
import com.parking.pbms.dto.StaffCheckInRequest;
import com.parking.pbms.dto.StaffCheckOutRequest;
import com.parking.pbms.dto.StaffTicketResponse;
import com.parking.pbms.dto.StaffTransactionResponse;
import com.parking.pbms.model.Floor;
import com.parking.pbms.model.Lane;
import com.parking.pbms.model.Payment;
import com.parking.pbms.repository.PaymentRepository;
import com.parking.pbms.repository.ParkingTicketRepository;
import com.parking.pbms.service.AssignmentService;
import com.parking.pbms.service.PaymentService;
import com.parking.pbms.service.StaffService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.security.Principal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/staff")
@RequiredArgsConstructor
public class StaffController {

    private final StaffService staffService;
    private final AssignmentService assignmentService;
    private final PaymentService paymentService;
    private final PaymentRepository paymentRepository;
    private final ParkingTicketRepository parkingTicketRepository;

    @GetMapping("/lanes")
    public ResponseEntity<ApiResponse<List<Lane>>> getLanes() {
        List<Lane> lanes = staffService.getLanes();
        return ResponseEntity.ok(
                ApiResponse.success(200, "Lấy danh sách làn xe thành công", lanes)
        );
    }

    @GetMapping("/floors")
    public ResponseEntity<ApiResponse<List<Floor>>> getFloors() {
        List<Floor> floors = staffService.getFloors();
        return ResponseEntity.ok(
                ApiResponse.success(200, "Lấy danh sách tầng thành công", floors)
        );
    }

    @PostMapping("/check-in")
    public ResponseEntity<ApiResponse<StaffTicketResponse>> checkIn(
            @Valid @RequestBody StaffCheckInRequest request,
            Principal principal
    ) {
        String username = principal.getName();
        StaffTicketResponse response = staffService.checkIn(request, username);
        return ResponseEntity.ok(
                ApiResponse.success(200, response.message(), response)
        );
    }

    @PostMapping("/check-out")
    public ResponseEntity<ApiResponse<StaffTicketResponse>> checkOut(
            @Valid @RequestBody StaffCheckOutRequest request,
            Principal principal
    ) {
        String username = principal.getName();
        StaffTicketResponse response = staffService.checkOut(request, username);
        return ResponseEntity.ok(
                ApiResponse.success(200, response.message(), response)
        );
    }

    @GetMapping("/check-out-preview")
    public ResponseEntity<ApiResponse<StaffTicketResponse>> previewCheckOut(
            @RequestParam String ticketNoOrQrToken,
            @RequestParam String laneCode,
            Principal principal
    ) {
        String username = principal.getName();
        StaffTicketResponse response = staffService.previewCheckOut(ticketNoOrQrToken, laneCode, username);
        return ResponseEntity.ok(
                ApiResponse.success(200, "Xem trước thông tin vé ra", response)
        );
    }

    /**
     * Staff bam xac nhan thanh toan sau khi checkout:
     * - CASH: cap nhat ngay ticket -> PAID, tao payment record thanh cong
     * - VNPAY: tao link thanh toan VNPay, tra ve checkoutUrl
     */
    @PostMapping("/checkout-payment")
    public ResponseEntity<ApiResponse<PaymentResponse>> checkoutPayment(
            @RequestBody Map<String, Object> body,
            Principal principal
    ) {
        try {
            Long ticketId = Long.parseLong(body.get("ticketId").toString());
            String method = body.getOrDefault("paymentMethod", "VNPAY").toString().toUpperCase();
            String ipAddr = body.getOrDefault("ipAddr", "127.0.0.1").toString();

            if ("CASH".equals(method)) {
                // Thanh toan tien mat: cap nhat ngay, khong qua VNPay
                PaymentResponse resp = paymentService.createCashPayment(ticketId);
                return ResponseEntity.ok(ApiResponse.success(200, "Thanh toan tien mat thanh cong", resp));
            } else {
                // Thanh toan VNPay: tao link
                PaymentRequest req = new PaymentRequest();
                req.setTicketId(ticketId);
                req.setIpAddr(ipAddr);
                PaymentResponse resp = paymentService.createPayment(req);
                return ResponseEntity.ok(ApiResponse.success(200, "Tao link VNPay thanh cong", resp));
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(
                new ApiResponse<>(400, "Loi checkout payment: " + e.getMessage(), null)
            );
        }
    }

    @GetMapping("/payment-status/{ticketId}")
    public ResponseEntity<ApiResponse<String>> getPaymentStatus(@PathVariable Long ticketId) {
        try {
            // Tim payment moi nhat theo ticketId
            com.parking.pbms.model.Payment payment = paymentRepository
                .findFirstByTicketIdOrderByCreatedAtDesc(ticketId)
                .orElse(null);
            String status = (payment != null) ? payment.getStatus() : "NOT_FOUND";
            return ResponseEntity.ok(ApiResponse.success(200, "OK", status));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ApiResponse<>(400, e.getMessage(), null));
        }
    }

    @GetMapping("/transactions")
    public ResponseEntity<ApiResponse<List<StaffTransactionResponse>>> getTransactionHistory(
            Principal principal
    ) {
        String username = principal.getName();
        List<StaffTransactionResponse> response = staffService.getTransactionHistory(username);
        return ResponseEntity.ok(
                ApiResponse.success(200, "Lấy lịch sử giao dịch thành công", response)
        );
    }

    @GetMapping("/active-assignment")
    public ResponseEntity<ApiResponse<StaffAssignmentResponse>> getActiveAssignment(
            Principal principal
    ) {
        String username = principal.getName();
        StaffAssignmentResponse response = assignmentService.getActiveAssignmentForStaff(username);
        return ResponseEntity.ok(
                ApiResponse.success(200, "Lấy phân công ca trực hôm nay thành công", response)
        );
    }

    @GetMapping("/prebooked/{code}")
    public ResponseEntity<ApiResponse<java.util.Map<String, Object>>> getPreBookedDetails(
            @PathVariable("code") String code
    ) {
        java.util.Map<String, Object> details = staffService.getPreBookedDetails(code);
        return ResponseEntity.ok(
                ApiResponse.success(200, "Lấy thông tin đặt trước/thẻ tháng thành công", details)
        );
    }
}
