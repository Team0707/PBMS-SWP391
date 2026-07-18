package com.parking.pbms.repository;

import com.parking.pbms.model.Payment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    Optional<Payment> findFirstByParkingSessionIdOrderByCreatedAtDesc(Long parkingSessionId);
    Optional<Payment> findByReferenceCode(String referenceCode);
}
