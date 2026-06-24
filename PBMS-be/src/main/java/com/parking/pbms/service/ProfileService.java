package com.parking.pbms.service;

import com.parking.pbms.dto.ProfileResponse;
import com.parking.pbms.dto.ProfileUpdateRequest;

public interface ProfileService {
    ProfileResponse getProfileByUsername(String username);
    ProfileResponse updateProfileByUsername(String username, ProfileUpdateRequest request);
}
