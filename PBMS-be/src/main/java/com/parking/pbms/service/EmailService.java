package com.parking.pbms.service;

public interface EmailService {
    void sendVerificationEmail(String toEmail, String fullName, String token);
    void sendResetPasswordEmail(String toEmail, String fullName, String token);
}
