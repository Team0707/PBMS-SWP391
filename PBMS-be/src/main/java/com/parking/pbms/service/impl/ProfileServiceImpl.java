package com.parking.pbms.service.impl;

import com.parking.pbms.dto.ProfileResponse;
import com.parking.pbms.dto.ProfileUpdateRequest;
import com.parking.pbms.model.*;
import com.parking.pbms.repository.*;
import com.parking.pbms.service.ProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class ProfileServiceImpl implements ProfileService {

    private final AccountRepository accountRepository;
    private final AdminRepository adminRepository;
    private final StaffRepository staffRepository;
    private final UserRepository userRepository;
    private final StaffAssignmentRepository staffAssignmentRepository;
    private final WorkShiftRepository workShiftRepository;
    private final AuthenticationManager authenticationManager;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional(readOnly = true)
    public ProfileResponse getProfileByUsername(String username) {
        Account account = accountRepository.findByUsernameIgnoreCase(username)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tài khoản: " + username));

        String role = account.getRoleName() != null ? account.getRoleName().toLowerCase(Locale.ROOT) : "";
        String shift = null;
        String staffCode = null;
        String address = account.getAddress();

        // Fetch role-specific data
        if ("staff".equals(role)) {
            Optional<Staff> staffOpt = staffRepository.findByAccountId(account.getAccountId());
            if (staffOpt.isPresent()) {
                Staff staff = staffOpt.get();
                staffCode = staff.getStaffCode();
                
                Optional<StaffAssignment> assignOpt = staffAssignmentRepository.findFirstByStaffIdAndWorkDateAndStatusNot(
                        staff.getStaffId(),
                        java.time.LocalDate.now(),
                        "CANCELLED"
                );
                if (assignOpt.isPresent()) {
                    Optional<WorkShift> wsOpt = workShiftRepository.findById(assignOpt.get().getShiftId());
                    shift = wsOpt.map(WorkShift::getShiftName).orElse("chưa được phân công");
                } else {
                    shift = "chưa được phân công";
                }
                
                address = staff.getDepartment();
            }
        } else if ("user".equals(role)) {
            Optional<User> userOpt = userRepository.findByAccountId(account.getAccountId());
            if (userOpt.isPresent()) {
                address = userOpt.get().getAddress();
            }
        } else if ("admin".equals(role)) {
            Optional<Admin> adminOpt = adminRepository.findByAccountId(account.getAccountId());
            if (adminOpt.isPresent()) {
                address = adminOpt.get().getDepartment();
            }
        }

        return new ProfileResponse(
                account.getAccountId(),
                account.getUsername(),
                account.getFullName(),
                role,
                account.getStatus(),
                account.getEmail(),
                account.getPhone(),
                address,
                shift,
                staffCode,
                account.getCreatedAt()
        );
    }

    @Override
    public ProfileResponse updateProfileByUsername(String username, ProfileUpdateRequest request) {
        Account account = accountRepository.findByUsernameIgnoreCase(username)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tài khoản: " + username));

        String fullName = request.fullName().trim();
        String email = request.email().trim();
        String phone = request.phone().trim();

        account.setFullName(fullName);
        account.setEmail(email);
        account.setPhone(phone);

        if (request.newPassword() != null && !request.newPassword().trim().isEmpty()) {
            if (request.oldPassword() == null || request.oldPassword().trim().isEmpty()) {
                throw new IllegalArgumentException("Vui lòng nhập mật khẩu cũ để đổi mật khẩu mới");
            }
            if (!passwordEncoder.matches(request.oldPassword().trim(), account.getPasswordHash())) {
                throw new BadCredentialsException("Mật khẩu cũ không chính xác");
            }
            account.setPasswordHash(passwordEncoder.encode(request.newPassword().trim()));
        }

        accountRepository.save(account);

        String role = account.getRoleName() != null ? account.getRoleName().toLowerCase(Locale.ROOT) : "";
        String shift = null;
        String staffCode = null;
        String address = account.getAddress();

        // Keep the role-specific profile tables in sync with Accounts.
        if ("staff".equals(role)) {
            Optional<Staff> staffOpt = staffRepository.findByAccountId(account.getAccountId());
            if (staffOpt.isPresent()) {
                Staff staff = staffOpt.get();
                staff.setFullName(fullName);
                staff.setEmail(email);
                staff.setPhone(phone);
                if (request.address() != null) {
                    staff.setDepartment(request.address().trim());
                }
                staffRepository.save(staff);
                staffCode = staff.getStaffCode();
                
                Optional<StaffAssignment> assignOpt = staffAssignmentRepository.findFirstByStaffIdAndWorkDateAndStatusNot(
                        staff.getStaffId(),
                        java.time.LocalDate.now(),
                        "CANCELLED"
                );
                if (assignOpt.isPresent()) {
                    Optional<WorkShift> wsOpt = workShiftRepository.findById(assignOpt.get().getShiftId());
                    shift = wsOpt.map(WorkShift::getShiftName).orElse("chưa được phân công");
                } else {
                    shift = "chưa được phân công";
                }
                
                address = staff.getDepartment();
            }
            if (request.address() != null) {
                account.setAddress(request.address().trim());
                accountRepository.save(account);
            }
        } else if ("user".equals(role)) {
            Optional<User> userOpt = userRepository.findByAccountId(account.getAccountId());
            if (userOpt.isPresent()) {
                User user = userOpt.get();
                user.setFullName(fullName);
                user.setEmail(email);
                user.setPhone(phone);
                if (request.address() != null && !request.address().trim().isEmpty()) {
                    user.setAddress(request.address().trim());
                }
                userRepository.save(user);
                address = user.getAddress();
            }
            // Keep Customers table in sync
            userRepository.updateCustomerProfile(account.getAccountId(), fullName, email, phone, address);
        } else if ("admin".equals(role)) {
            Optional<Admin> adminOpt = adminRepository.findByAccountId(account.getAccountId());
            if (adminOpt.isPresent()) {
                Admin admin = adminOpt.get();
                admin.setFullName(fullName);
                admin.setEmail(email);
                admin.setPhone(phone);
                if (request.address() != null) {
                    admin.setDepartment(request.address().trim());
                }
                adminRepository.save(admin);
                address = admin.getDepartment();
            }
            if (request.address() != null && !request.address().trim().isEmpty()) {
                account.setAddress(request.address().trim());
                accountRepository.save(account);
            }
        }

        return new ProfileResponse(
                account.getAccountId(),
                account.getUsername(),
                account.getFullName(),
                role,
                account.getStatus(),
                account.getEmail(),
                account.getPhone(),
                address,
                shift,
                staffCode,
                account.getCreatedAt()
        );
    }

    @Override
    @Transactional(readOnly = true)
    public void confirmPassword(String username, String password) {
        Account account = accountRepository.findByUsernameIgnoreCase(username)
                .orElseThrow(() -> new IllegalArgumentException("Khong tim thay tai khoan: " + username));

        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            account.getUsername(),
                            password
                    )
            );
        } catch (BadCredentialsException exception) {
            throw new BadCredentialsException("Mat khau hien tai khong chinh xac");
        }
    }
}
