package com.parking.pbms.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "Staff", schema = "dbo")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Staff {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "staffId")
    private Integer staffId;

    @Column(name = "fullName", nullable = false, length = 100)
    private String fullName;

    @Column(name = "email", nullable = false, length = 100)
    private String email;

    @Column(name = "phone", nullable = false, length = 20)
    private String phone;

    @Column(name = "shift", nullable = false, length = 30)
    private String shift;

    @Column(name = "status", nullable = false, length = 20)
    private String status;

    @Column(name = "accountId", nullable = false, unique = true)
    private Integer accountId;
}
