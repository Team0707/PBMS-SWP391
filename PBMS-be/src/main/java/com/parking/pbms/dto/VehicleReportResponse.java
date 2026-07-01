package com.parking.pbms.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record VehicleReportResponse(
    Long ticketId,
    String ticketNo,
    String cardNo,
    String rfidUid,
    String plateNo,
    String floorName,
    LocalDateTime checkInAt,
    LocalDateTime checkOutAt,
    BigDecimal feeAmount,
    String groupName,
    String customerName,
    String entryLaneName,
    String exitLaneName,
    String entryStaffName,
    String exitStaffName,
    String entryImage,
    String exitImage
) {}
