package com.parking.pbms.repository;

import com.parking.pbms.model.ViolationRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ViolationRuleRepository extends JpaRepository<ViolationRule, String> {
    Optional<ViolationRule> findByTicketTypeAndVehicleType(String ticketType, String vehicleType);
}
