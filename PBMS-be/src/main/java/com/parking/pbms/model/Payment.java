package com.parking.pbms.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "Payments", schema = "dbo")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "PaymentID")
    private Long paymentId;

    @Column(name = "PaymentNo", insertable = false, updatable = false)
    private String paymentNo;

    @Column(name = "PayerAccountID")
    private Integer payerAccountId;

    @Column(name = "ParkingSessionID")
    private Long parkingSessionId;

    @Column(name = "CardID")
    private Integer cardId;

    @Column(name = "PaymentType", nullable = false, length = 30)
    private String paymentType;

    @Column(name = "Amount", nullable = false)
    private java.math.BigDecimal amount;

    @Column(name = "PaymentMethod", nullable = false, length = 30)
    private String paymentMethod;

    @Column(name = "Gateway", length = 30)
    private String gateway;

    @Column(name = "ReferenceCode", length = 100)
    private String referenceCode;

    @Column(name = "Status", nullable = false, length = 20)
    private String status;

    @Column(name = "PaidAt")
    private LocalDateTime paidAt;

    @Column(name = "CreatedAt", nullable = false, insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "UpdatedAt", nullable = false, insertable = false, updatable = false)
    private LocalDateTime updatedAt;
}
