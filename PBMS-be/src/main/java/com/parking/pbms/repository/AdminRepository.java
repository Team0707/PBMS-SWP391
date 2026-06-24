package com.parking.pbms.repository;

import com.parking.pbms.model.Admin;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface AdminRepository extends JpaRepository<Admin, Integer> {
    Optional<Admin> findByAccountId(Integer accountId);
}
