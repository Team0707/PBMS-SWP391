package com.parking.pbms.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record StaffTransactionResponse(
        Long id,
        String maVe,
        String bienSo,
        String loaiXe,
        String loaiVe,
        LocalDateTime tgVao,
        LocalDateTime tgRa,
        BigDecimal phi,
        String nhanVien,
        String trangThai,
        String entryImage,
        String exitImage
) {}
