package com.parking.pbms.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "ParkingSessions", schema = "dbo")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ParkingSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ParkingSessionID")
    private Long sessionId;

    @Column(name = "ParkingSessionNo", insertable = false, updatable = false)
    private String sessionNo;

    @Column(name = "Barcode", nullable = false)
    private String barcode;

    @Column(name = "CardID")
    private Integer cardId;

    @Column(name = "VehicleID")
    private Integer vehicleId;

    @Column(name = "ReservationID")
    private Long reservationId;

    @Column(name = "TicketType", nullable = false, length = 20)
    private String ticketType;

    @Column(name = "VehicleType", nullable = false, length = 20)
    private String vehicleType;

    @Column(name = "PlateNoSnapshot", nullable = false, length = 20)
    private String plateNoSnapshot;

    @Column(name = "EntryImage", columnDefinition = "VARCHAR(MAX)")
    private String entryImage;

    @Column(name = "ExitImage", columnDefinition = "VARCHAR(MAX)")
    private String exitImage;

    @Column(name = "EntryFloorID", nullable = false)
    private Integer entryFloorId;

    @Column(name = "EntryStaffID", nullable = false)
    private Integer entryStaffId;

    @Column(name = "ExitStaffID")
    private Integer exitStaffId;

    @Column(name = "CheckInAt", nullable = false)
    private LocalDateTime checkInAt;

    @Column(name = "CheckOutAt")
    private LocalDateTime checkOutAt;

    @Column(name = "FeeAmount", nullable = false)
    private BigDecimal feeAmount;

    @Column(name = "PenaltyAmount", nullable = false)
    private BigDecimal penaltyAmount;

    @Column(name = "ViolationReason", length = 500)
    private String violationReason;

    @Column(name = "Status", nullable = false, length = 20)
    private String status;

    @Column(name = "ForceCheckout", nullable = false)
    private Boolean forceCheckout;

    @Column(name = "ForceCheckoutReason", length = 500)
    private String forceCheckoutReason;

    @Column(name = "CreatedAt", nullable = false, insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "UpdatedAt", nullable = false, insertable = false, updatable = false)
    private LocalDateTime updatedAt;
}
