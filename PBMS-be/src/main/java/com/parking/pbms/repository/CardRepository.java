package com.parking.pbms.repository;

import com.parking.pbms.model.Card;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface CardRepository extends JpaRepository<Card, Integer> {
    
    @Query("SELECT c FROM Card c JOIN CardGroup cg ON c.cardGroupId = cg.cardGroupId WHERE c.accountId = :accountId AND cg.ticketType IN ('MONTHLY', 'DAY')")
    List<Card> findMonthlyAndDayCardsByAccountId(@Param("accountId") Integer accountId);

    @Query("SELECT COUNT(c) FROM Card c JOIN CardGroup cg ON c.cardGroupId = cg.cardGroupId " +
           "WHERE c.preferredFloorID = :floorId AND cg.vehicleType = :vehicleType " +
           "AND cg.ticketType IN ('MONTHLY', 'DAY') AND c.status = 'ACTIVE'")
    long countActiveMonthlyAndDayCards(
            @Param("floorId") Integer floorId,
            @Param("vehicleType") String vehicleType
    );

    Optional<Card> findByCardNo(String cardNo);

    /**
     * Tìm tất cả thẻ đang ACTIVE nhưng đã quá ngày hết hạn (expireAt < today).
     * Dùng cho scheduled job tự động chuyển trạng thái sang EXPIRED.
     */
    @Query("SELECT c FROM Card c WHERE c.status = 'ACTIVE' AND c.expireAt IS NOT NULL AND c.expireAt < :today")
    List<Card> findExpiredActiveCards(@Param("today") LocalDate today);

    @Query("SELECT COUNT(c) FROM Card c JOIN CardGroup cg ON c.cardGroupId = cg.cardGroupId " +
           "WHERE c.status = 'ACTIVE' AND c.preferredFloorID = :floorId " +
           "AND cg.vehicleType = :vehicleType AND cg.ticketType IN ('MONTHLY', 'DAY')")
    long countActiveMonthlyAndDayCards(@Param("floorId") Integer floorId, @Param("vehicleType") String vehicleType);
}

