package com.parking.pbms.dto;

import java.time.LocalDateTime;

public record UserResponse(
    Integer accountId,
    String username,
    String fullName,
    String roleName,
    String phone,
    String email,
    String status,
    LocalDateTime createdAt,
    String address,
    Integer cardCount
) {}
