package com.parking.pbms.service.impl;

import com.parking.pbms.dto.ProfileResponse;
import com.parking.pbms.dto.ProfileUpdateRequest;
import com.parking.pbms.model.Account;
import com.parking.pbms.model.Admin;
import com.parking.pbms.model.Staff;
import com.parking.pbms.model.User;
import com.parking.pbms.repository.AccountRepository;
import com.parking.pbms.repository.AdminRepository;
import com.parking.pbms.repository.StaffRepository;
import com.parking.pbms.repository.UserRepository;
import com.parking.pbms.service.ProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Service
@RequiredArgsConstructor
@Transactional
public class ProfileServiceImpl implements ProfileService {

    private final AccountRepository accountRepository;
    private final UserRepository userRepository;
    private final StaffRepository staffRepository;
    private final AdminRepository adminRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional(readOnly = true)
    public ProfileResponse getProfileByUsername(String username) {
        Account account = accountRepository.findByUsernameIgnoreCase(username)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tài khoản: " + username));

        String role = account.getRole().toUpperCase(Locale.ROOT);
        String email = "";
        String phone = "";
        String address = null;
        String shift = null;

        if ("ADMIN".equals(role)) {
            Admin admin = adminRepository.findByAccountId(account.getAccountId()).orElse(null);
            if (admin != null) {
                email = admin.getEmail();
                phone = admin.getPhone();
            }
        } else if ("STAFF".equals(role)) {
            Staff staff = staffRepository.findByAccountId(account.getAccountId()).orElse(null);
            if (staff != null) {
                email = staff.getEmail();
                phone = staff.getPhone();
                shift = staff.getShift();
            }
        } else if ("USER".equals(role)) {
            User user = userRepository.findByAccountId(account.getAccountId()).orElse(null);
            if (user != null) {
                email = user.getEmail();
                phone = user.getPhone();
                address = user.getAddress();
            }
        }

        return new ProfileResponse(
                account.getAccountId(),
                account.getUsername(),
                account.getFullName(),
                account.getRole().toLowerCase(Locale.ROOT),
                account.getStatus(),
                email,
                phone,
                address,
                shift,
                account.getCreatedAt()
        );
    }

    @Override
    public ProfileResponse updateProfileByUsername(String username, ProfileUpdateRequest request) {
        Account account = accountRepository.findByUsernameIgnoreCase(username)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tài khoản: " + username));

        // Update fullName on Account
        account.setFullName(request.fullName());

        // Update password if provided
        if (request.newPassword() != null && !request.newPassword().trim().isEmpty()) {
            account.setPasswordHash(passwordEncoder.encode(request.newPassword().trim()));
        }

        accountRepository.save(account);

        String role = account.getRole().toUpperCase(Locale.ROOT);
        String email = request.email();
        String phone = request.phone();
        String address = null;
        String shift = null;

        if ("ADMIN".equals(role)) {
            Admin admin = adminRepository.findByAccountId(account.getAccountId())
                    .orElseGet(() -> Admin.builder().accountId(account.getAccountId()).status("ACTIVE").build());
            admin.setFullName(request.fullName());
            admin.setEmail(request.email());
            admin.setPhone(request.phone());
            adminRepository.save(admin);
        } else if ("STAFF".equals(role)) {
            Staff staff = staffRepository.findByAccountId(account.getAccountId())
                    .orElseGet(() -> Staff.builder().accountId(account.getAccountId()).status("ACTIVE").shift("MORNING").build());
            staff.setFullName(request.fullName());
            staff.setEmail(request.email());
            staff.setPhone(request.phone());
            shift = staff.getShift();
            staffRepository.save(staff);
        } else if ("USER".equals(role)) {
            User user = userRepository.findByAccountId(account.getAccountId())
                    .orElseGet(() -> User.builder().accountId(account.getAccountId()).status("ACTIVE").build());
            user.setFullName(request.fullName());
            user.setEmail(request.email());
            user.setPhone(request.phone());
            user.setAddress(request.address() != null ? request.address() : "");
            address = user.getAddress();
            userRepository.save(user);
        }

        return new ProfileResponse(
                account.getAccountId(),
                account.getUsername(),
                account.getFullName(),
                account.getRole().toLowerCase(Locale.ROOT),
                account.getStatus(),
                email,
                phone,
                address,
                shift,
                account.getCreatedAt()
        );
    }
}
