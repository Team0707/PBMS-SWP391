package com.parking.pbms.service;

import com.parking.pbms.dto.ViolationRuleDto;

import java.util.List;

public interface ViolationRuleService {
    List<ViolationRuleDto> getAllRules();
    ViolationRuleDto updateRule(String ruleId, ViolationRuleDto requestDto);
}
