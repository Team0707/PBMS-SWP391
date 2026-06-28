package com.parking.pbms.service.impl;

import com.parking.pbms.dto.*;
import com.parking.pbms.model.Account;
import com.parking.pbms.model.Customer;
import com.parking.pbms.model.Role;
import com.parking.pbms.model.User;
import com.parking.pbms.repository.AccountRepository;
import com.parking.pbms.repository.CustomerRepository;
import com.parking.pbms.repository.RoleRepository;
import com.parking.pbms.repository.UserRepository;
import com.parking.pbms.service.AuthService;
import com.parking.pbms.service.EmailService;
import com.parking.pbms.service.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Transactional
public class AuthServiceImpl implements AuthService {

    private final AuthenticationManager authenticationManager;
    private final AccountRepository accountRepository;
    private final JwtService jwtService;
    private final RoleRepository roleRepository;
    private final CustomerRepository customerRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    @Override
    public LoginResponse login(LoginRequest request) {

        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.username(),
                        request.password()
                )
        );

        Account account = accountRepository
                .findByUsernameIgnoreCase(request.username())
                .orElseThrow();

        account.setLastLoginAt(LocalDateTime.now());
        accountRepository.save(account);

        String accessToken =
                jwtService.generateToken(account);

        String roleName = account.getRoleName();

        return new LoginResponse(
                accessToken,
                "Bearer",
                jwtService.getJwtExpirationMs(),
                account.getAccountId(),
                account.getUsername(),
                account.getFullName(),
                roleName != null ? roleName.toLowerCase(Locale.ROOT) : ""
        );
    }

    @Override
    public void register(RegisterRequest request) {
        String username = request.username().trim();
        String email = request.email().trim();

        if (accountRepository.existsByUsernameIgnoreCase(username)) {
            throw new RuntimeException("Tên đăng nhập đã tồn tại.");
        }
        if (accountRepository.existsByEmailIgnoreCase(email)) {
            throw new RuntimeException("Email đã được sử dụng.");
        }

        Role role = roleRepository.findByRoleNameIgnoreCase("USER")
                .orElseThrow(() -> new RuntimeException("Không tìm thấy vai trò USER."));

        Account account = Account.builder()
                .role(role)
                .username(username)
                .fullName(request.fullName().trim())
                .passwordHash(passwordEncoder.encode(request.password().trim()))
                .email(email)
                .phone(request.phone().trim())
                .address(request.address() != null ? request.address().trim() : "")
                .status("INACTIVE")
                .build();

        Account savedAccount = accountRepository.saveAndFlush(account);

        Customer customer = Customer.builder()
                .accountId(savedAccount.getAccountId())
                .fullName(savedAccount.getFullName())
                .email(savedAccount.getEmail())
                .phone(savedAccount.getPhone())
                .status("INACTIVE")
                .build();
        customerRepository.saveAndFlush(customer);

        User user = User.builder()
                .accountId(savedAccount.getAccountId())
                .customerId(customer.getCustomerId())
                .fullName(savedAccount.getFullName())
                .email(savedAccount.getEmail())
                .phone(savedAccount.getPhone())
                .address(savedAccount.getAddress())
                .status("INACTIVE")
                .build();
        userRepository.save(user);

        String token = jwtService.generateVerificationToken(savedAccount.getUsername());
        emailService.sendVerificationEmail(savedAccount.getEmail(), savedAccount.getFullName(), token);
    }

    @Override
    public void verifyEmail(String token) {
        String username = jwtService.extractUsernameAndVerifyPurpose(token, "verification");
        Account account = accountRepository.findByUsernameIgnoreCase(username)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tài khoản."));

        if ("ACTIVE".equalsIgnoreCase(account.getStatus())) {
            return;
        }

        account.setStatus("ACTIVE");
        accountRepository.save(account);

        customerRepository.findByAccountId(account.getAccountId()).ifPresent(customer -> {
            customer.setStatus("ACTIVE");
            customerRepository.save(customer);
        });

        userRepository.findByAccountId(account.getAccountId()).ifPresent(user -> {
            user.setStatus("ACTIVE");
            userRepository.save(user);
        });
    }

    @Override
    @Transactional(readOnly = true)
    public void forgotPassword(ForgotPasswordRequest request) {
        String email = request.email().trim();
        Account account = accountRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tài khoản với email này."));

        String token = jwtService.generateResetPasswordToken(account.getUsername());
        emailService.sendResetPasswordEmail(account.getEmail(), account.getFullName(), token);
    }

    @Override
    public void resetPassword(ResetPasswordRequest request) {
        String username = jwtService.extractUsernameAndVerifyPurpose(request.token(), "reset-password");
        Account account = accountRepository.findByUsernameIgnoreCase(username)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tài khoản."));

        account.setPasswordHash(passwordEncoder.encode(request.newPassword().trim()));
        accountRepository.save(account);
    }
}
