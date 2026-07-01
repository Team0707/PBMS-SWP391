package com.parking.pbms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record StaffCheckInRequest(
        @NotBlank(message = "Biển số xe không được để trống")
        String plateNo,

        @NotBlank(message = "Loại xe không được để trống")
        String vehicleType,

        @NotNull(message = "isPreBooked không được để trống")
        Boolean isPreBooked,

        String preBookedCode,

        @NotBlank(message = "Mã tầng không được để trống")
        String floorCode,

        @NotBlank(message = "Mã làn không được để trống")
        String laneCode,

        String entryImage
) {}
