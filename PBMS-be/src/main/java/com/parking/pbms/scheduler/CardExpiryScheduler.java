package com.parking.pbms.scheduler;

import com.parking.pbms.model.Card;
import com.parking.pbms.repository.CardRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Scheduled job chạy mỗi ngày lúc 00:05 để tự động cập nhật trạng thái
 * thẻ đặt trước (CARD) từ ACTIVE → EXPIRED khi đã quá ngày hết hạn.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class CardExpiryScheduler {

    private final CardRepository cardRepository;

    /**
     * Chạy mỗi ngày lúc 00:05 (giờ Việt Nam).
     * Cron expression: giây phút giờ ngày tháng thứ
     */
    @Scheduled(cron = "0 5 0 * * *", zone = "Asia/Ho_Chi_Minh")
    @Transactional
    public void expireOverdueCards() {
        LocalDate today = LocalDate.now();
        log.info("[CardExpiryScheduler] Bắt đầu kiểm tra thẻ hết hạn. Ngày hiện tại: {}", today);

        List<Card> expiredCards = cardRepository.findExpiredActiveCards(today);

        if (expiredCards.isEmpty()) {
            log.info("[CardExpiryScheduler] Không có thẻ nào cần cập nhật trạng thái EXPIRED.");
            return;
        }

        for (Card card : expiredCards) {
            log.info("[CardExpiryScheduler] Cập nhật thẻ {} (CardNo={}) sang EXPIRED. ExpireAt={}",
                    card.getCardId(), card.getCardNo(), card.getExpireAt());
            card.setStatus("EXPIRED");
        }

        cardRepository.saveAll(expiredCards);

        log.info("[CardExpiryScheduler] Hoàn thành. Đã cập nhật {} thẻ sang trạng thái EXPIRED.", expiredCards.size());
    }

    /**
     * Chạy ngay khi ứng dụng khởi động (delay 30 giây) để bắt kịp
     * các thẻ hết hạn trong thời gian server dừng.
     * fixedDelay = Long.MAX_VALUE để chỉ chạy 1 lần duy nhất lúc startup.
     */
    @Scheduled(initialDelayString = "30000", fixedDelayString = "9223372036854775807")
    @Transactional
    public void expireOverdueCardsOnStartup() {
        LocalDate today = LocalDate.now();
        log.info("[CardExpiryScheduler] Kiểm tra thẻ hết hạn lúc khởi động server. Ngày: {}", today);

        List<Card> expiredCards = cardRepository.findExpiredActiveCards(today);

        if (!expiredCards.isEmpty()) {
            for (Card card : expiredCards) {
                log.info("[CardExpiryScheduler][Startup] Cập nhật thẻ {} (CardNo={}) sang EXPIRED.",
                        card.getCardId(), card.getCardNo());
                card.setStatus("EXPIRED");
            }
            cardRepository.saveAll(expiredCards);
            log.info("[CardExpiryScheduler][Startup] Đã cập nhật {} thẻ sang EXPIRED.", expiredCards.size());
        } else {
            log.info("[CardExpiryScheduler][Startup] Không có thẻ nào cần cập nhật.");
        }
    }
}
