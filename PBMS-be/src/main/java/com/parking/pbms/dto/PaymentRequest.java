package com.parking.pbms.dto;

import lombok.Data;

@Data
public class PaymentRequest {
    private Long ticketId;
    private String ipAddr;
}
