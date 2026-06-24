package com.parking.pbms.exception;

import com.parking.pbms.dto.ApiResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ApiResponse<Void>> handleBadCredentials(
            BadCredentialsException exception
    ) {
        return ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)
                .body(
                        new ApiResponse<>(
                                401,
                                "Tên đăng nhập hoặc mật khẩu không đúng",
                                null
                        )
                );
    }

    @ExceptionHandler(DisabledException.class)
    public ResponseEntity<ApiResponse<Void>> handleDisabledAccount(
            DisabledException exception
    ) {
        return ResponseEntity
                .status(HttpStatus.FORBIDDEN)
                .body(
                        new ApiResponse<>(
                                403,
                                "Tài khoản đã bị khóa hoặc ngừng hoạt động",
                                null
                        )
                );
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidation(
            MethodArgumentNotValidException exception
    ) {
        String message = exception
                .getBindingResult()
                .getFieldErrors()
                .stream()
                .findFirst()
                .map(error -> error.getDefaultMessage())
                .orElse("Dữ liệu gửi lên không hợp lệ");

        return ResponseEntity
                .badRequest()
                .body(
                        new ApiResponse<>(
                                400,
                                message,
                                null
                        )
                );
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGeneralException(
            Exception exception
    ) {
        exception.printStackTrace();
        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(
                        new ApiResponse<>(
                                500,
                                "Lỗi hệ thống: " + exception.getMessage(),
                                null
                        )
                );
    }
}
