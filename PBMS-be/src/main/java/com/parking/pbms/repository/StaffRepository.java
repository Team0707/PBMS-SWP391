package com.parking.pbms.repository;

import com.parking.pbms.model.Staff;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface StaffRepository extends JpaRepository<Staff, Integer> {
    Optional<Staff> findByAccountId(Integer accountId);
}
