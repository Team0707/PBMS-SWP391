package com.parking.pbms.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "ViolationRules", schema = "dbo")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ViolationRule {

    @Id
    @Column(name = "RuleID", length = 50)
    private String ruleId;

    @Column(name = "RuleName", nullable = false, length = 100)
    private String ruleName;

    @Column(name = "TicketType", nullable = false, length = 20)
    private String ticketType;

    @Column(name = "VehicleType", nullable = false, length = 20)
    private String vehicleType;

    @Column(name = "MaxDurationHours", nullable = false)
    private Integer maxDurationHours;

    @Column(name = "PenaltyPerHour", nullable = false)
    private BigDecimal penaltyPerHour;

    @Column(name = "Description", nullable = false, length = 500)
    private String description;

    @Column(name = "IsActive", nullable = false)
    private Boolean isActive;

    @Column(name = "CreatedAt", nullable = false, insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "UpdatedAt", nullable = false, insertable = false, updatable = false)
    private LocalDateTime updatedAt;
}
