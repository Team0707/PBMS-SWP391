package com.parking.pbms.dto;

import java.time.LocalDateTime;

public record ProfileResponse(
        Integer accountId,
        String username,
        String fullName,
        String role,
        String status,
        String email,
        String phone,
        String address, // USER only
        String shift,   // STAFF only
        LocalDateTime createdAt
) {
}
