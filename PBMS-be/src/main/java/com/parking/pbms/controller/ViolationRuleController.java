package com.parking.pbms.controller;

import com.parking.pbms.dto.ViolationRuleDto;
import com.parking.pbms.service.ViolationRuleService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/violation-rules")
@RequiredArgsConstructor
public class ViolationRuleController {

    private final ViolationRuleService violationRuleService;

    @GetMapping
    public ResponseEntity<List<ViolationRuleDto>> getAllRules() {
        return ResponseEntity.ok(violationRuleService.getAllRules());
    }

    @PutMapping("/{ruleId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ViolationRuleDto> updateRule(
            @PathVariable String ruleId,
            @RequestBody ViolationRuleDto requestDto) {
        return ResponseEntity.ok(violationRuleService.updateRule(ruleId, requestDto));
    }
}
