package com.parking.pbms.service;

import com.parking.pbms.dto.PaymentRequest;
import com.parking.pbms.dto.PaymentResponse;

public interface PaymentService {
    PaymentResponse createPayment(PaymentRequest request);
    PaymentResponse createCashPayment(Long parkingSessionId);
    PaymentResponse checkStatus(Long parkingSessionId);
    java.util.Map<String, String> handleVnPayIpn(java.util.Map<String, String> params);
    PaymentResponse getPaymentStatus(Long orderCode);
    void cancelPayment(Long orderCode, String reason);
    void mockPaymentSuccess(Long orderCode);
}
