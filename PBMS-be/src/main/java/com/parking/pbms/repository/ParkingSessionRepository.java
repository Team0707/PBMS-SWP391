package com.parking.pbms.repository;

import com.parking.pbms.model.ParkingSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.List;

public interface ParkingSessionRepository extends JpaRepository<ParkingSession, Long> {
    Optional<ParkingSession> findBySessionNo(String sessionNo);
    Optional<ParkingSession> findByBarcode(String barcode);
    Optional<ParkingSession> findFirstByBarcodeAndStatusInOrderByCheckInAtDesc(String barcode, List<String> statuses);
    Optional<ParkingSession> findFirstByBarcodeOrderByCheckInAtDesc(String barcode);
    Optional<ParkingSession> findFirstByCardIdAndStatusOrderByCheckInAtDesc(Integer cardId, String status);
    Optional<ParkingSession> findFirstByReservationIdAndStatusOrderByCheckInAtDesc(Long reservationId, String status);
    Optional<ParkingSession> findFirstByPlateNoSnapshotAndStatusOrderByCheckInAtDesc(String plateNoSnapshot, String status);
    List<ParkingSession> findByEntryStaffIdOrExitStaffIdOrderByCheckInAtDesc(Integer entryStaffId, Integer exitStaffId);

    long countByEntryFloorIdAndVehicleTypeAndStatus(Integer entryFloorId, String vehicleType, String status);
    
    @Query("SELECT COUNT(t) FROM ParkingSession t WHERE " +
           "t.vehicleType = :vehicleType AND " +
           "t.entryFloorId = :floorId AND " +
           "t.checkInAt <= :endOfDay AND " +
           "(t.checkOutAt IS NULL OR t.checkOutAt >= :startOfDay) AND " +
           "t.status <> 'CANCELLED'")
    long countActiveSessions(
            @Param("floorId") Integer floorId,
            @Param("vehicleType") String vehicleType,
            @Param("startOfDay") LocalDateTime startOfDay,
            @Param("endOfDay") LocalDateTime endOfDay
    );

    @Query("SELECT COUNT(t) FROM ParkingSession t WHERE " +
           "t.vehicleType = :vehicleType AND " +
           "t.ticketType = 'MONTHLY' AND " +
           "t.entryFloorId = :floorId AND " +
           "t.checkInAt <= :endOfDay AND " +
           "(t.checkOutAt IS NULL OR t.checkOutAt >= :startOfDay) AND " +
           "t.status <> 'CANCELLED'")
    long countActiveMonthlySessions(
            @Param("floorId") Integer floorId,
            @Param("vehicleType") String vehicleType,
            @Param("startOfDay") LocalDateTime startOfDay,
            @Param("endOfDay") LocalDateTime endOfDay
    );

    @Query("SELECT COUNT(t) FROM ParkingSession t WHERE " +
           "t.vehicleType = :vehicleType AND " +
           "t.ticketType = 'SINGLE' AND " +
           "t.entryFloorId = :floorId AND " +
           "t.checkInAt <= :endOfDay AND " +
           "(t.checkOutAt IS NULL OR t.checkOutAt >= :startOfDay) AND " +
           "t.status <> 'CANCELLED'")
    long countActiveSingleSessions(
            @Param("floorId") Integer floorId,
            @Param("vehicleType") String vehicleType,
            @Param("startOfDay") LocalDateTime startOfDay,
            @Param("endOfDay") LocalDateTime endOfDay
    );
}
