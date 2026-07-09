package com.parking.pbms.controller;

import com.parking.pbms.dto.ApiResponse;
import com.parking.pbms.dto.CardGroupRequest;
import com.parking.pbms.dto.CardHistoryResponse;
import com.parking.pbms.model.CardGroup;
import com.parking.pbms.service.CardGroupService;
import com.parking.pbms.service.CardHistoryService;
import com.parking.pbms.service.UserCardService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class AdminCardController {

    private final CardGroupService cardGroupService;
    private final CardHistoryService cardHistoryService;
        private final UserCardService userCardService;

    // --- CARD GROUPS ---

    @GetMapping("/card-groups")
    public ResponseEntity<ApiResponse<List<CardGroup>>> getAllCardGroups() {
        List<CardGroup> cardGroups = cardGroupService.getAllCardGroups();
        return ResponseEntity.ok(
                ApiResponse.success(200, "Lấy danh sách nhóm thẻ thành công", cardGroups)
        );
    }

    @PostMapping("/card-groups")
    public ResponseEntity<ApiResponse<CardGroup>> createCardGroup(
            @Valid @RequestBody CardGroupRequest request
    ) {
        CardGroup cardGroup = cardGroupService.createCardGroup(request);
        return ResponseEntity.ok(
                ApiResponse.success(200, "Tạo nhóm thẻ mới thành công", cardGroup)
        );
    }

    @PutMapping("/card-groups/{id}")
    public ResponseEntity<ApiResponse<CardGroup>> updateCardGroup(
            @PathVariable("id") Integer id,
            @Valid @RequestBody CardGroupRequest request
    ) {
        CardGroup cardGroup = cardGroupService.updateCardGroup(id, request);
        return ResponseEntity.ok(
                ApiResponse.success(200, "Cập nhật nhóm thẻ thành công", cardGroup)
        );
    }

    @DeleteMapping("/card-groups/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteCardGroup(@PathVariable("id") Integer id) {
        cardGroupService.deleteCardGroup(id);
        return ResponseEntity.ok(
                ApiResponse.success(200, "Xóa nhóm thẻ thành công", null)
        );
    }

    // --- CARD HISTORIES ---

    @GetMapping("/card-histories")
    public ResponseEntity<ApiResponse<List<CardHistoryResponse>>> getCardHistories(
            @RequestParam(value = "keyword", required = false) String keyword,
            @RequestParam(value = "fromDate", required = false) String fromDate,
            @RequestParam(value = "toDate", required = false) String toDate,
            @RequestParam(value = "hanhDong", required = false) String hanhDong,
            @RequestParam(value = "nguoiDung", required = false) String nguoiDung,
            @RequestParam(value = "nhomThe", required = false) String nhomThe
    ) {
        List<CardHistoryResponse> histories = cardHistoryService.searchHistory(
                keyword, fromDate, toDate, hanhDong, nguoiDung, nhomThe
        );
        return ResponseEntity.ok(
                ApiResponse.success(200, "Lấy lịch sử thẻ thành công", histories)
        );
    }

    @GetMapping("/users/{accountId}/cards")
    public ResponseEntity<ApiResponse<List<com.parking.pbms.dto.MonthlyCardResponse>>> getUserCards(
            @PathVariable("accountId") Integer accountId
    ) {
        List<com.parking.pbms.dto.MonthlyCardResponse> cards = userCardService.getCardsByAccountId(accountId);
        return ResponseEntity.ok(
                ApiResponse.success(200, "Lấy danh sách thẻ của người dùng thành công", cards)
        );
    }
}
