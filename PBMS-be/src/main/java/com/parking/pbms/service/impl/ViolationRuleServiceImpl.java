package com.parking.pbms.service.impl;

import com.parking.pbms.dto.ViolationRuleDto;
import com.parking.pbms.model.ViolationRule;
import com.parking.pbms.repository.ViolationRuleRepository;
import com.parking.pbms.service.ViolationRuleService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ViolationRuleServiceImpl implements ViolationRuleService {

    private final ViolationRuleRepository violationRuleRepository;

    @jakarta.annotation.PostConstruct
    public void initDefaultRules() {
        if (violationRuleRepository.count() == 0) {
            violationRuleRepository.save(ViolationRule.builder()
                    .ruleId("RULE_SINGLE_MOTO")
                    .ruleName("Thẻ lượt xe máy quá giờ")
                    .ticketType("SINGLE")
                    .vehicleType("MOTORCYCLE")
                    .maxDurationHours(6)
                    .penaltyPerHour(new java.math.BigDecimal("10000"))
                    .description("Áp dụng cho thẻ lượt xe máy đỗ quá 6 giờ kể từ thời điểm check-in. Phạt 10.000đ cho mỗi giờ quá hạn tiếp theo.")
                    .isActive(true)
                    .build());

            violationRuleRepository.save(ViolationRule.builder()
                    .ruleId("RULE_SINGLE_CAR")
                    .ruleName("Thẻ lượt ô tô quá giờ")
                    .ticketType("SINGLE")
                    .vehicleType("CAR")
                    .maxDurationHours(6)
                    .penaltyPerHour(new java.math.BigDecimal("50000"))
                    .description("Áp dụng cho thẻ lượt ô tô đỗ quá 6 giờ kể từ thời điểm check-in. Phạt 50.000đ cho mỗi giờ quá hạn tiếp theo.")
                    .isActive(true)
                    .build());

            violationRuleRepository.save(ViolationRule.builder()
                    .ruleId("RULE_DAY_EXPIRED_MOTO")
                    .ruleName("Thẻ ngày hết hạn khi checkout (Xe máy)")
                    .ticketType("DAY")
                    .vehicleType("MOTORCYCLE")
                    .maxDurationHours(0)
                    .penaltyPerHour(new java.math.BigDecimal("10000"))
                    .description("Áp dụng khi thẻ ngày xe máy bị hết hạn tại thời điểm check-out. Tính phạt 10.000đ cho mỗi giờ quá hạn kể từ mốc hết hiệu lực.")
                    .isActive(true)
                    .build());

            violationRuleRepository.save(ViolationRule.builder()
                    .ruleId("RULE_DAY_EXPIRED_CAR")
                    .ruleName("Thẻ ngày hết hạn khi checkout (Ô tô)")
                    .ticketType("DAY")
                    .vehicleType("CAR")
                    .maxDurationHours(0)
                    .penaltyPerHour(new java.math.BigDecimal("50000"))
                    .description("Áp dụng khi thẻ ngày ô tô bị hết hạn tại thời điểm check-out. Tính phạt 50.000đ cho mỗi giờ quá hạn kể từ mốc hết hiệu lực.")
                    .isActive(true)
                    .build());

            violationRuleRepository.save(ViolationRule.builder()
                    .ruleId("RULE_MONTHLY_EXPIRED_MOTO")
                    .ruleName("Thẻ tháng hết hạn khi checkout (Xe máy)")
                    .ticketType("MONTHLY")
                    .vehicleType("MOTORCYCLE")
                    .maxDurationHours(0)
                    .penaltyPerHour(new java.math.BigDecimal("10000"))
                    .description("Áp dụng khi thẻ tháng xe máy đã hết hạn tại thời điểm check-out. Tính phạt 10.000đ cho mỗi giờ quá hạn kể từ mốc hết hiệu lực.")
                    .isActive(true)
                    .build());

            violationRuleRepository.save(ViolationRule.builder()
                    .ruleId("RULE_MONTHLY_EXPIRED_CAR")
                    .ruleName("Thẻ tháng hết hạn khi checkout (Ô tô)")
                    .ticketType("MONTHLY")
                    .vehicleType("CAR")
                    .maxDurationHours(0)
                    .penaltyPerHour(new java.math.BigDecimal("50000"))
                    .description("Áp dụng khi thẻ tháng ô tô đã hết hạn tại thời điểm check-out. Tính phạt 50.000đ cho mỗi giờ quá hạn kể từ mốc hết hiệu lực.")
                    .isActive(true)
                    .build());
        }
    }

    @Override
    public List<ViolationRuleDto> getAllRules() {
        return violationRuleRepository.findAll().stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Override
    public ViolationRuleDto updateRule(String ruleId, ViolationRuleDto requestDto) {
        ViolationRule rule = violationRuleRepository.findById(ruleId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy luật vi phạm với ID: " + ruleId));

        rule.setMaxDurationHours(requestDto.getMaxDurationHours());
        rule.setPenaltyPerHour(requestDto.getPenaltyPerHour());
        rule.setDescription(requestDto.getDescription());
        rule.setIsActive(requestDto.getIsActive() != null ? requestDto.getIsActive() : rule.getIsActive());

        ViolationRule updatedRule = violationRuleRepository.save(rule);
        return mapToDto(updatedRule);
    }

    private ViolationRuleDto mapToDto(ViolationRule rule) {
        ViolationRuleDto dto = new ViolationRuleDto();
        dto.setId(rule.getRuleId());
        dto.setRuleName(rule.getRuleName());
        dto.setTicketType(rule.getTicketType());
        dto.setVehicleType(rule.getVehicleType());
        dto.setMaxDurationHours(rule.getMaxDurationHours());
        dto.setPenaltyPerHour(rule.getPenaltyPerHour());
        dto.setDescription(rule.getDescription());
        dto.setIsActive(rule.getIsActive());
        return dto;
    }
}
