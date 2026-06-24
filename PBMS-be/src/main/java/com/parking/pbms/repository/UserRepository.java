package com.parking.pbms.repository;

import com.parking.pbms.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Integer> {
    Optional<User> findByAccountId(Integer accountId);
}
