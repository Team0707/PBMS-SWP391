package com.parking.pbms.dto;

import lombok.Data;

@Data
public class PaymentRequest {
    private Long parkingSessionId;
    private String ipAddr;
}
