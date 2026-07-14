package com.parking.pbms.dto;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;

@Data
@Builder
public class PaymentResponse {
    private Long paymentId;
    private Long parkingSessionId;
    private BigDecimal amount;
    private String description;
    private String status;
    private String checkoutUrl;
}