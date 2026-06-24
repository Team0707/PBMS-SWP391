package com.parking.pbms.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "Admin", schema = "dbo")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Admin {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "adminId")
    private Integer adminId;

    @Column(name = "fullName", nullable = false, length = 100)
    private String fullName;

    @Column(name = "email", nullable = false, length = 100)
    private String email;

    @Column(name = "phone", nullable = false, length = 20)
    private String phone;

    @Column(name = "status", nullable = false, length = 20)
    private String status;

    @Column(name = "accountId", nullable = false, unique = true)
    private Integer accountId;
}
