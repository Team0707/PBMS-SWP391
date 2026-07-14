package com.parking.pbms.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record VehicleReportResponse(
    Long sessionId,
    String sessionNo,
    String plateNo,
    String vehicleType,
    String cardNo,
    String groupName,
    String customerName,
    LocalDateTime checkInAt,
    LocalDateTime checkOutAt,
    BigDecimal feeAmount,
    BigDecimal penaltyAmount,
    String violationReason,
    String floorName,
    String entryStaffName,
    String exitStaffName,
    String status,
    String entryImage,
    String exitImage
) {}
