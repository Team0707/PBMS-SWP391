package com.parking.pbms.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateUserRequest(
    @NotBlank(message = "Họ tên không được để trống")
    @Size(max = 100, message = "Họ tên tối đa 100 ký tự")
    String fullName,

    @NotBlank(message = "Vai trò không được để trống")
    String roleName,

    String phone,

    @Email(message = "Email không hợp lệ")
    String email,

    @NotBlank(message = "Trạng thái không được để trống")
    String status,

    String password,

    String address
) {}
