package com.parking.pbms.dto;

import jakarta.validation.constraints.NotBlank;

public record StaffCheckOutRequest(
        @NotBlank(message = "Mã vé hoặc token QR không được để trống")
        String ticketNoOrQrToken,

        @NotBlank(message = "Mã làn không được để trống")
        String laneCode,

        // Phuong thuc thanh toan: CASH hoac VNPAY (optional, default = VNPAY)
        String paymentMethod,

        String exitImage
) {}
