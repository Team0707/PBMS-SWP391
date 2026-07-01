package com.parking.pbms.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record StaffTicketResponse(
        Long ticketId,
        String ticketNo,
        String qrToken,
        String ticketType,
        String vehicleType,
        String plateNoSnapshot,
        String entryFloorCode,
        String entryLaneCode,
        String exitLaneCode,
        String entryStaffName,
        String exitStaffName,
        LocalDateTime checkInAt,
        LocalDateTime checkOutAt,
        BigDecimal feeAmount,
        String status,
        String message,
        String violationReason,
        String entryImage,
        String exitImage
) {}
