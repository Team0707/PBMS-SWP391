package com.parking.pbms.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class ViolationRuleDto {
    private String id;
    private String ruleName;
    private String ticketType;
    private String vehicleType;
    private Integer maxDurationHours;
    private BigDecimal penaltyPerHour;
    private String description;
    private Boolean isActive;
}
