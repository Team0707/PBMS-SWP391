package com.parking.pbms.controller;

import com.parking.pbms.dto.ApiResponse;
import com.parking.pbms.dto.PaymentRequest;
import com.parking.pbms.dto.PaymentResponse;
import com.parking.pbms.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    @PostMapping("/create")
    public ResponseEntity<ApiResponse<PaymentResponse>> createPayment(@RequestBody PaymentRequest request) {
        PaymentResponse response = paymentService.createPayment(request);
        return ResponseEntity.ok(
                ApiResponse.success(
                        200,
                        "Tạo giao dịch thanh toán thành công",
                        response
                )
        );
    }

    @GetMapping("/check-status/{ticketId}")
    public ResponseEntity<ApiResponse<PaymentResponse>> checkStatus(@PathVariable Long ticketId) {
        PaymentResponse response = paymentService.checkStatus(ticketId);
        return ResponseEntity.ok(
                ApiResponse.success(
                        200,
                        "Lấy trạng thái giao dịch thành công",
                        response
                )
        );
    }

    @GetMapping("/vnpay-ipn")
    public ResponseEntity<java.util.Map<String, String>> vnpayIpn(
            @RequestParam java.util.Map<String, String> params) {
        System.out.println("VNPay IPN Received: " + params);
        try {
            java.util.Map<String, String> result = paymentService.handleVnPayIpn(params);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            e.printStackTrace();
            java.util.Map<String, String> error = new java.util.HashMap<>();
            error.put("RspCode", "99");
            error.put("Message", "Unknown error");
            return ResponseEntity.ok(error);
        }
    }

    @GetMapping("/vnpay-return")
    public void vnpayReturn(
            @RequestParam java.util.Map<String, String> params,
            jakarta.servlet.http.HttpServletResponse response) throws java.io.IOException {

        System.out.println("===== VNPay Return Received =====");
        System.out.println("Params: " + params);

        String responseCode = params.get("vnp_ResponseCode");
        if ("24".equals(responseCode)) {
            System.out.println("[vnpay-return] Nguoi dung HUY giao dich (code=24). Cap nhat DB CANCELLED.");
        }

        // Verify chu ky va cap nhat DB:
        // - responseCode=00  -> PAID
        // - responseCode=24 hoac bat ky code loi khac -> CANCELLED
        try {
            java.util.Map<String, String> ipnResult = paymentService.handleVnPayIpn(new java.util.HashMap<>(params));
            System.out.println("[vnpay-return] IPN Result: " + ipnResult);
        } catch (Exception e) {
            System.out.println("[vnpay-return] Loi khi xu ly IPN: " + e.getMessage());
        }

        // HEADER BYPASS NGROK WARNING:
        // Khi dien thoai truy cap Ngrok URL, Ngrok se hien trang canh bao.
        // Header nay bao Ngrok bo qua trang canh bao va tra ket qua thang.
        response.setHeader("ngrok-skip-browser-warning", "true");
        response.setHeader("Access-Control-Allow-Origin", "*");

        // Redirect nguoi dung ve Frontend.
        // Them ?ngrok-skip-browser-warning=true vao query de tuong thich voi moi phien ban Ngrok.
        String redirectUrl = this.frontendUrl + "/payment/success";
        StringBuilder query = new StringBuilder();
        query.append("ngrok-skip-browser-warning=true");
        for (java.util.Map.Entry<String, String> entry : params.entrySet()) {
            try {
                query.append("&")
                     .append(entry.getKey())
                     .append("=")
                     .append(java.net.URLEncoder.encode(entry.getValue(), "UTF-8"));
            } catch (Exception ignored) {}
        }
        response.sendRedirect(redirectUrl + "?" + query.toString());
    }

    @GetMapping("/status/{orderCode}")
    public ResponseEntity<ApiResponse<PaymentResponse>> getPaymentStatus(@PathVariable Long orderCode) {
        PaymentResponse response = paymentService.getPaymentStatus(orderCode);
        return ResponseEntity.ok(
                ApiResponse.success(
                        200,
                        "Lấy trạng thái giao dịch thành công",
                        response
                )
        );
    }

    @PostMapping("/cancel/{orderCode}")
    public ResponseEntity<ApiResponse<Object>> cancelPayment(
            @PathVariable Long orderCode,
            @RequestBody(required = false) java.util.Map<String, String> body) {
        try {
            String reason = body != null && body.containsKey("reason") ? body.get("reason") : "Người dùng chủ động hủy trên giao diện";
            paymentService.cancelPayment(orderCode, reason);
            return ResponseEntity.ok(
                    ApiResponse.success(
                            200,
                            "Đã hủy thanh toán thành công",
                            null
                    )
            );
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(
                    new ApiResponse<>(400, "Lỗi hủy thanh toán: " + e.getMessage(), null)
            );
        }
    }

    @PostMapping("/mock-success/{orderCode}")
    public ResponseEntity<ApiResponse<Object>> mockPaymentSuccess(@PathVariable Long orderCode) {
        try {
            paymentService.mockPaymentSuccess(orderCode);
            return ResponseEntity.ok(
                    ApiResponse.success(
                            200,
                            "Giả lập thanh toán thành công",
                            null
                    )
            );
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(
                    new ApiResponse<>(400, "Lỗi giả lập thanh toán: " + e.getMessage(), null)
            );
        }
    }
}