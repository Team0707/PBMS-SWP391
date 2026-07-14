package com.parking.pbms.repository;

import com.parking.pbms.model.Payment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    Optional<Payment> findFirstByTicketIdOrderByCreatedAtDesc(Long ticketId);
    Optional<Payment> findFirstByTicketIdAndStatus(Long ticketId, String status);
    Optional<Payment> findFirstByCardIdAndStatusAndPaymentType(Integer cardId, String status, String paymentType);
}
