package com.parking.pbms.repository;

import com.parking.pbms.model.ParkingTicket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.List;

public interface ParkingTicketRepository extends JpaRepository<ParkingTicket, Long> {
    Optional<ParkingTicket> findByTicketNo(String ticketNo);
    Optional<ParkingTicket> findByQrToken(String qrToken);
    Optional<ParkingTicket> findFirstByCardIdAndStatusOrderByCheckInAtDesc(Integer cardId, String status);
    Optional<ParkingTicket> findFirstByReservationIdAndStatusOrderByCheckInAtDesc(Long reservationId, String status);
    Optional<ParkingTicket> findFirstByPlateNoSnapshotAndStatusOrderByCheckInAtDesc(String plateNoSnapshot, String status);
    List<ParkingTicket> findByEntryStaffIdOrExitStaffIdOrderByCheckInAtDesc(Integer entryStaffId, Integer exitStaffId);

    long countByEntryFloorIdAndVehicleTypeAndStatus(Integer entryFloorId, String vehicleType, String status);
    
    @Query("SELECT COUNT(t) FROM ParkingTicket t WHERE " +
           "t.vehicleType = :vehicleType AND " +
           "t.entryFloorId = :floorId AND " +
           "t.checkInAt <= :endOfDay AND " +
           "(t.checkOutAt IS NULL OR t.checkOutAt >= :startOfDay) AND " +
           "t.status <> 'CANCELLED'")
    long countActiveTickets(
            @Param("floorId") Integer floorId,
            @Param("vehicleType") String vehicleType,
            @Param("startOfDay") LocalDateTime startOfDay,
            @Param("endOfDay") LocalDateTime endOfDay
    );

    @Query("SELECT COUNT(t) FROM ParkingTicket t WHERE " +
           "t.vehicleType = :vehicleType AND " +
           "t.ticketType = 'MONTHLY' AND " +
           "t.entryFloorId = :floorId AND " +
           "t.checkInAt <= :endOfDay AND " +
           "(t.checkOutAt IS NULL OR t.checkOutAt >= :startOfDay) AND " +
           "t.status <> 'CANCELLED'")
    long countActiveMonthlyTickets(
            @Param("floorId") Integer floorId,
            @Param("vehicleType") String vehicleType,
            @Param("startOfDay") LocalDateTime startOfDay,
            @Param("endOfDay") LocalDateTime endOfDay
    );
}
