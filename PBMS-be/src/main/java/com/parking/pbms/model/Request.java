package com.parking.pbms.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "Requests", schema = "dbo")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Request {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "RequestID")
    private Long requestId;

    @Column(name = "RequestNo", insertable = false, updatable = false)
    private String requestNo;

    @Column(name = "RequestType", nullable = false, length = 50)
    private String requestType;

    @Column(name = "SenderAccountID", nullable = false)
    private Integer senderAccountId;

    @Column(name = "AssignedStaffID")
    private Integer assignedStaffId;

    @Column(name = "ParkingSessionID")
    private Long parkingSessionId;

    @Column(name = "CardID")
    private Integer cardId;

    @Column(name = "ReservationID")
    private Long reservationId;

    @Column(name = "VehicleID")
    private Integer vehicleId;

    @Column(name = "Subject", length = 200)
    private String subject;

    @Column(name = "Description", nullable = false, columnDefinition = "NVARCHAR(MAX)")
    private String description;

    @Column(name = "EvidenceURL", length = 500)
    private String evidenceUrl;

    @Column(name = "Priority", nullable = false, length = 20)
    private String priority;

    @Column(name = "Status", nullable = false, length = 20)
    private String status;

    @Column(name = "AdminNote", columnDefinition = "NVARCHAR(MAX)")
    private String adminNote;

    @Column(name = "CreatedAt", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "ProcessingAt")
    private LocalDateTime processingAt;

    @Column(name = "ResolvedAt")
    private LocalDateTime resolvedAt;

    @Column(name = "UpdatedAt", nullable = false)
    private LocalDateTime updatedAt;
}
