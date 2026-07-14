package com.parking.pbms.service.impl;

import com.parking.pbms.dto.CreateUserRequest;
import com.parking.pbms.dto.UpdateUserRequest;
import com.parking.pbms.dto.UserResponse;
import com.parking.pbms.model.*;
import com.parking.pbms.repository.*;
import com.parking.pbms.service.UserManagementService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserManagementServiceImpl implements UserManagementService {

    private final AccountRepository accountRepository;
    private final RoleRepository roleRepository;
    private final AdminRepository adminRepository;
    private final StaffRepository staffRepository;
    private final UserRepository userRepository;
    private final CardRepository cardRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public List<UserResponse> getAllUsers() {
        List<Account> accounts = accountRepository.findAll();
        return accounts.stream().map(this::mapToResponse).toList();
    }

    @Override
    @Transactional
    public UserResponse createUser(CreateUserRequest request) {
        String username = request.username().trim();
        if (accountRepository.findByUsernameIgnoreCase(username).isPresent()) {
            throw new RuntimeException("Tên đăng nhập đã tồn tại.");
        }

        Role role = roleRepository.findByRoleNameIgnoreCase(request.roleName().trim())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy vai trò: " + request.roleName()));

        Account account = Account.builder()
                .role(role)
                .username(username)
                .fullName(request.fullName().trim())
                .passwordHash(passwordEncoder.encode(request.password().trim()))
                .email(request.email() != null ? request.email().trim() : null)
                .phone(request.phone() != null ? request.phone().trim() : null)
                .address(request.address() != null ? request.address().trim() : null)
                .status(request.status().trim().toUpperCase())
                .build();

        Account saved = accountRepository.saveAndFlush(account);

        // Sync to corresponding profile table
        syncProfile(saved, "", role.getRoleName(), saved.getFullName(), saved.getEmail(), saved.getPhone(), saved.getAddress(), saved.getStatus());

        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public UserResponse updateUser(Integer accountId, UpdateUserRequest request) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tài khoản với ID: " + accountId));

        Role role = roleRepository.findByRoleNameIgnoreCase(request.roleName().trim())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy vai trò: " + request.roleName()));

        String oldRole = account.getRoleName();
        String newRole = role.getRoleName();

        account.setRole(role);
        account.setFullName(request.fullName().trim());
        account.setEmail(request.email() != null ? request.email().trim() : null);
        account.setPhone(request.phone() != null ? request.phone().trim() : null);
        account.setAddress(request.address() != null ? request.address().trim() : null);
        account.setStatus(request.status().trim().toUpperCase());

        if (request.password() != null && !request.password().trim().isEmpty()) {
            account.setPasswordHash(passwordEncoder.encode(request.password().trim()));
        }

        Account saved = accountRepository.saveAndFlush(account);

        // Sync profile changes and clean up old profiles if role changed
        syncProfile(saved, oldRole, newRole, saved.getFullName(), saved.getEmail(), saved.getPhone(), saved.getAddress(), saved.getStatus());

        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public UserResponse deleteUser(Integer accountId) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tài khoản với ID: " + accountId));

        account.setStatus("INACTIVE");
        Account saved = accountRepository.saveAndFlush(account);

        // Sync profile status to INACTIVE
        String roleName = saved.getRoleName();
        if (roleName != null) {
            if (roleName.equalsIgnoreCase("ADMIN")) {
                adminRepository.findByAccountId(accountId).ifPresent(p -> {
                    p.setStatus("INACTIVE");
                    adminRepository.save(p);
                });
            } else if (roleName.equalsIgnoreCase("STAFF")) {
                staffRepository.findByAccountId(accountId).ifPresent(p -> {
                    p.setStatus("INACTIVE");
                    staffRepository.save(p);
                });
            } else if (roleName.equalsIgnoreCase("USER")) {
                userRepository.findByAccountId(accountId).ifPresent(p -> {
                    p.setStatus("INACTIVE");
                    userRepository.save(p);
                });
            }
        }

        return mapToResponse(saved);
    }

    private void syncProfile(Account account, String oldRole, String newRole, String fullName, String email, String phone, String address, String status) {
        // Clean up old role profiles
        if (oldRole != null && !oldRole.isEmpty() && !newRole.equalsIgnoreCase(oldRole)) {
            if (oldRole.equalsIgnoreCase("ADMIN")) {
                adminRepository.findByAccountId(account.getAccountId()).ifPresent(adminRepository::delete);
            } else if (oldRole.equalsIgnoreCase("STAFF")) {
                staffRepository.findByAccountId(account.getAccountId()).ifPresent(staffRepository::delete);
            } else if (oldRole.equalsIgnoreCase("USER")) {
                userRepository.findByAccountId(account.getAccountId()).ifPresent(userRepository::delete);
            }
        }

        // Create or update new role profile
        if (newRole.equalsIgnoreCase("ADMIN")) {
            Admin admin = adminRepository.findByAccountId(account.getAccountId())
                    .orElseGet(() -> Admin.builder().accountId(account.getAccountId()).joinedDate(LocalDate.now()).build());
            admin.setFullName(fullName);
            admin.setEmail(email != null ? email : "");
            admin.setPhone(phone != null ? phone : "");
            admin.setStatus(status);
            adminRepository.save(admin);
        } else if (newRole.equalsIgnoreCase("STAFF")) {
            Staff staff = staffRepository.findByAccountId(account.getAccountId())
                    .orElseGet(() -> Staff.builder().accountId(account.getAccountId()).shift("Ca 1").joinedDate(LocalDate.now()).build());
            staff.setFullName(fullName);
            staff.setEmail(email != null ? email : "");
            staff.setPhone(phone != null ? phone : "");
            staff.setStatus(status);
            staffRepository.save(staff);
        } else if (newRole.equalsIgnoreCase("USER")) {
            User user = userRepository.findByAccountId(account.getAccountId())
                    .orElseGet(() -> User.builder().accountId(account.getAccountId()).build());
            user.setFullName(fullName);
            user.setEmail(email != null ? email : "");
            user.setPhone(phone != null ? phone : "");
            user.setAddress(address != null ? address : "");
            user.setStatus(status);
            userRepository.save(user);
        }
    }

    private UserResponse mapToResponse(Account account) {
        String resolvedAddress = "";
        if ("USER".equalsIgnoreCase(account.getRoleName())) {
            Optional<User> userOpt = userRepository.findByAccountId(account.getAccountId());
            if (userOpt.isPresent()) {
                resolvedAddress = userOpt.get().getAddress();
            }
        }
        if (resolvedAddress == null || resolvedAddress.isEmpty()) {
            resolvedAddress = account.getAddress() != null ? account.getAddress() : "";
        }

        int cardCount = 0;
        if ("USER".equalsIgnoreCase(account.getRoleName())) {
            cardCount = (int) cardRepository.findMonthlyAndDayCardsByAccountId(account.getAccountId()).stream()
                    .filter(c -> !"PENDING".equalsIgnoreCase(c.getStatus()) && !"INACTIVE".equalsIgnoreCase(c.getStatus()))
                    .count();
        }

        return new UserResponse(
                account.getAccountId(),
                account.getUsername(),
                account.getFullName(),
                account.getRoleName() != null ? account.getRoleName() : "USER",
                account.getPhone() != null ? account.getPhone() : "",
                account.getEmail() != null ? account.getEmail() : "",
                account.getStatus(),
                account.getCreatedAt(),
                resolvedAddress,
                cardCount
        );
    }
}
