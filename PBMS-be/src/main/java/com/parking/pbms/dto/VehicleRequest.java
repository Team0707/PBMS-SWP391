package com.parking.pbms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record VehicleRequest(
        @NotBlank(message = "Biển số xe không được để trống")
        @Size(max = 20, message = "Biển số xe tối đa 20 ký tự")
        @Pattern(
            // Chấp nhận đầu vào với hoặc không có dấu phân cách (-, khoảng trắng, .)
            // Chuẩn hóa thực sự (loại bỏ tất cả ký tự phân cách) được xử lý trong Service
            regexp = "^(1[1-9]|[2-9]\\d)[A-Z1-9]([A-Z]|\\d)?[\\s.-]*\\d{4,5}$",
            message = "Biển số không đúng định dạng Việt Nam (VD: 29X1-12345 hoặc 29A-1234)"
        )
        String plateNo,

        @NotBlank(message = "Loại xe không được để trống")
        @Pattern(regexp = "MOTORCYCLE|CAR", message = "Loại xe phải là MOTORCYCLE hoặc CAR")
        String vehicleType,

        @Size(max = 50, message = "Hãng xe tối đa 50 ký tự")
        String brand,

        @Size(max = 50, message = "Model xe tối đa 50 ký tự")
        String model,

        @Size(max = 30, message = "Màu xe tối đa 30 ký tự")
        String color
) {}
