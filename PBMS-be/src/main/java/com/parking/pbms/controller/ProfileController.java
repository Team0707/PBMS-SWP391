package com.parking.pbms.controller;

import com.parking.pbms.dto.ApiResponse;
import com.parking.pbms.dto.ProfileResponse;
import com.parking.pbms.dto.ProfileUpdateRequest;
import com.parking.pbms.service.ProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@RestController
@RequestMapping("/api/v1/profile")
@RequiredArgsConstructor
public class ProfileController {

    private final ProfileService profileService;

    @GetMapping
    public ResponseEntity<ApiResponse<ProfileResponse>> getProfile(Principal principal) {
        String username = principal.getName();
        ProfileResponse response = profileService.getProfileByUsername(username);
        return ResponseEntity.ok(
                ApiResponse.success(200, "Lấy thông tin hồ sơ thành công", response)
        );
    }

    @PutMapping
    public ResponseEntity<ApiResponse<ProfileResponse>> updateProfile(
            @Valid @RequestBody ProfileUpdateRequest request,
            Principal principal
    ) {
        String username = principal.getName();
        ProfileResponse response = profileService.updateProfileByUsername(username, request);
        return ResponseEntity.ok(
                ApiResponse.success(200, "Cập nhật hồ sơ thành công", response)
        );
    }
}
