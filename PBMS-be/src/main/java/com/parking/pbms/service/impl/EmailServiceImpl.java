package com.parking.pbms.service.impl;

import com.parking.pbms.service.EmailService;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailServiceImpl implements EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Override
    public void sendVerificationEmail(String toEmail, String fullName, String token) {
        String verifyLink = frontendUrl + "/?verifyToken=" + token;
        
        String subject = "Xác nhận kích hoạt tài khoản - PBMS";
        String content = "<div style=\"font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;\">"
                + "<div style=\"background-color: #1d4ed8; padding: 20px; text-align: center; border-top-left-radius: 8px; border-top-right-radius: 8px;\">"
                + "<h2 style=\"color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;\">PARKING SYSTEM</h2>"
                + "<p style=\"color: #bfdbfe; margin: 5px 0 0 0; font-size: 14px;\">Hệ thống quản lý bãi xe thông minh</p>"
                + "</div>"
                + "<div style=\"padding: 24px; color: #374151;\">"
                + "<p style=\"font-size: 16px; margin-top: 0;\">Xin chào <strong>" + fullName + "</strong>,</p>"
                + "<p style=\"font-size: 14px; line-height: 1.6;\">Cảm ơn bạn đã đăng ký tài khoản tại hệ thống của chúng tôi. Vui lòng nhấn vào nút bấm bên dưới để kích hoạt tài khoản của bạn:</p>"
                + "<div style=\"text-align: center; margin: 30px 0;\">"
                + "<a href=\"" + verifyLink + "\" style=\"background-color: #2563eb; color: #ffffff; padding: 12px 24px; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 6px; display: inline-block;\">Kích hoạt tài khoản</a>"
                + "</div>"
                + "<p style=\"font-size: 14px; line-height: 1.6; color: #6b7280;\">Nếu nút bấm trên không hoạt động, bạn có thể sao chép và dán liên kết sau vào trình duyệt của mình:</p>"
                + "<p style=\"font-size: 12px; word-break: break-all; color: #3b82f6;\"><a href=\"" + verifyLink + "\">" + verifyLink + "</a></p>"
                + "<p style=\"font-size: 12px; color: #9ca3af; margin-top: 30px;\">Liên kết này sẽ có hiệu lực trong vòng 24 giờ. Nếu bạn không thực hiện đăng ký này, vui lòng bỏ qua email.</p>"
                + "</div>"
                + "<div style=\"background-color: #f9fafb; padding: 15px; text-align: center; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px; border-top: 1px solid #f3f4f6;\">"
                + "<p style=\"margin: 0; font-size: 12px; color: #9ca3af;\">© 2026 KzParking - Hệ thống quản lý bãi xe thông minh</p>"
                + "</div>"
                + "</div>";

        try {
            sendHtmlMail(toEmail, subject, content);
            log.info("Email xác thực đã được gửi tới: {}", toEmail);
        } catch (Exception e) {
            log.error("Lỗi khi gửi email xác thực tới {}: {}", toEmail, e.getMessage());
            throw new RuntimeException("Không thể gửi email xác thực tài khoản. Vui lòng kiểm tra lại cấu hình email.");
        }
    }

    @Override
    public void sendResetPasswordEmail(String toEmail, String fullName, String token) {
        String resetLink = frontendUrl + "/?resetToken=" + token;

        String subject = "Yêu cầu đặt lại mật khẩu - PBMS";
        String content = "<div style=\"font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;\">"
                + "<div style=\"background-color: #1d4ed8; padding: 20px; text-align: center; border-top-left-radius: 8px; border-top-right-radius: 8px;\">"
                + "<h2 style=\"color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;\">PARKING SYSTEM</h2>"
                + "<p style=\"color: #bfdbfe; margin: 5px 0 0 0; font-size: 14px;\">Hệ thống quản lý bãi xe thông minh</p>"
                + "</div>"
                + "<div style=\"padding: 24px; color: #374151;\">"
                + "<p style=\"font-size: 16px; margin-top: 0;\">Xin chào <strong>" + fullName + "</strong>,</p>"
                + "<p style=\"font-size: 14px; line-height: 1.6;\">Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Vui lòng nhấn vào nút bên dưới để tiến hành đổi mật khẩu mới:</p>"
                + "<div style=\"text-align: center; margin: 30px 0;\">"
                + "<a href=\"" + resetLink + "\" style=\"background-color: #eb5757; color: #ffffff; padding: 12px 24px; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 6px; display: inline-block;\">Đặt lại mật khẩu</a>"
                + "</div>"
                + "<p style=\"font-size: 14px; line-height: 1.6; color: #6b7280;\">Nếu nút bấm trên không hoạt động, bạn có thể sao chép và dán liên kết sau vào trình duyệt của mình:</p>"
                + "<p style=\"font-size: 12px; word-break: break-all; color: #3b82f6;\"><a href=\"" + resetLink + "\">" + resetLink + "</a></p>"
                + "<p style=\"font-size: 12px; color: #9ca3af; margin-top: 30px;\">Liên kết này sẽ hết hạn sau 15 phút. Nếu bạn không yêu cầu đặt lại mật khẩu, bạn có thể an tâm bỏ qua email này.</p>"
                + "</div>"
                + "<div style=\"background-color: #f9fafb; padding: 15px; text-align: center; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px; border-top: 1px solid #f3f4f6;\">"
                + "<p style=\"margin: 0; font-size: 12px; color: #9ca3af;\">© 2026 KzParking - Hệ thống quản lý bãi xe thông minh</p>"
                + "</div>"
                + "</div>";

        try {
            sendHtmlMail(toEmail, subject, content);
            log.info("Email đặt lại mật khẩu đã được gửi tới: {}", toEmail);
        } catch (Exception e) {
            log.error("Lỗi khi gửi email đặt lại mật khẩu tới {}: {}", toEmail, e.getMessage());
            throw new RuntimeException("Không thể gửi email đặt lại mật khẩu. Vui lòng kiểm tra lại cấu hình email.");
        }
    }

    private void sendHtmlMail(String toEmail, String subject, String htmlContent) throws MessagingException {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
        
        helper.setFrom(fromEmail);
        helper.setTo(toEmail);
        helper.setSubject(subject);
        helper.setText(htmlContent, true);
        
        mailSender.send(message);
    }
}
