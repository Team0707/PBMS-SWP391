package com.parking.pbms.service.impl;

import com.parking.pbms.dto.VehicleReportResponse;
import com.parking.pbms.model.*;
import com.parking.pbms.repository.*;
import com.parking.pbms.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ReportServiceImpl implements ReportService {

    private final ParkingSessionRepository parkingSessionRepository;
    private final CardRepository cardRepository;
    private final CardGroupRepository cardGroupRepository;
    private final FloorRepository floorRepository;
    private final StaffRepository staffRepository;
    private final AccountRepository accountRepository;

    @Override
    public List<VehicleReportResponse> getVehicleReport(
            String tab,
            String keyword,
            LocalDateTime fromDate,
            LocalDateTime toDate,
            Integer staffId,
            String ticketType
    ) {
        List<ParkingSession> allSessions = parkingSessionRepository.findAll();

        return allSessions.stream()
                .filter(s -> {
                    // Filter by tab
                    if (tab != null && tab.equalsIgnoreCase("exit")) {
                        if (s.getCheckOutAt() == null) return false;
                    }

                    // Filter by keyword
                    if (keyword != null && !keyword.trim().isEmpty()) {
                        String kw = keyword.trim().toLowerCase();
                        boolean matchPlate = s.getPlateNoSnapshot() != null && s.getPlateNoSnapshot().toLowerCase().contains(kw);
                        boolean matchTicketNo = s.getSessionNo() != null && s.getSessionNo().toLowerCase().contains(kw);
                        if (!matchPlate && !matchTicketNo) return false;
                    }

                    // Filter by date range
                    if (tab != null && tab.equalsIgnoreCase("entry")) {
                        if (s.getCheckInAt() == null) return false;
                        if (fromDate != null && s.getCheckInAt().isBefore(fromDate)) return false;
                        if (toDate != null && s.getCheckInAt().isAfter(toDate)) return false;
                    } else {
                        if (s.getCheckOutAt() == null) return false;
                        if (fromDate != null && s.getCheckOutAt().isBefore(fromDate)) return false;
                        if (toDate != null && s.getCheckOutAt().isAfter(toDate)) return false;
                    }

                    // Filter by staff
                    if (staffId != null) {
                        if (tab != null && tab.equalsIgnoreCase("entry")) {
                            if (!staffId.equals(s.getEntryStaffId())) return false;
                        } else {
                            if (!staffId.equals(s.getExitStaffId())) return false;
                        }
                    }

                    if ("entry".equalsIgnoreCase(tab)) return s.getCheckInAt() != null;
                    if ("exit".equalsIgnoreCase(tab)) return s.getCheckOutAt() != null;
                    if ("violation".equalsIgnoreCase(tab)) return s.getPenaltyAmount() != null && s.getPenaltyAmount().compareTo(java.math.BigDecimal.ZERO) > 0;
                    return true;
                })
                .map(this::mapToResponse)
                .sorted((a, b) -> {
                    LocalDateTime timeA = (tab != null && tab.equalsIgnoreCase("entry")) ? a.checkInAt() : a.checkOutAt();
                    LocalDateTime timeB = (tab != null && tab.equalsIgnoreCase("entry")) ? b.checkInAt() : b.checkOutAt();
                    if (timeA == null) return 1;
                    if (timeB == null) return -1;
                    return timeB.compareTo(timeA);
                })
                .toList();
    }

    private VehicleReportResponse mapToResponse(ParkingSession session) {
        String cardNo = "";
        String groupName = "";
        String customerName = "";

        if (session.getCardId() != null) {
            Card card = cardRepository.findById(session.getCardId()).orElse(null);
            if (card != null) {
                cardNo = card.getCardNo();
                if (card.getCardGroupId() != null) {
                    CardGroup cg = cardGroupRepository.findById(card.getCardGroupId()).orElse(null);
                    if (cg != null) {
                        groupName = cg.getGroupName();
                    }
                }
                if (card.getAccountId() != null) {
                    Account account = accountRepository.findById(card.getAccountId()).orElse(null);
                    if (account != null) {
                        customerName = account.getFullName();
                    }
                }
            }
        }

        if (groupName.isEmpty()) {
            groupName = "VE LƯỢT " + (session.getVehicleType().equalsIgnoreCase("MOTO") ? "XE MÁY" : "Ô TÔ");
        }

        String floorName = "";
        if (session.getEntryFloorId() != null) {
            Floor f = floorRepository.findById(session.getEntryFloorId()).orElse(null);
            if (f != null) {
                floorName = f.getFloorName();
            }
        }

        String entryStaffName = "";
        if (session.getEntryStaffId() != null) {
            Staff s = staffRepository.findById(session.getEntryStaffId()).orElse(null);
            if (s != null) {
                entryStaffName = s.getFullName();
            }
        }

        String exitStaffName = "";
        if (session.getExitStaffId() != null) {
            Staff s = staffRepository.findById(session.getExitStaffId()).orElse(null);
            if (s != null) {
                exitStaffName = s.getFullName();
            }
        }

        return new VehicleReportResponse(
                session.getSessionId(),
                session.getSessionNo(),
                session.getPlateNoSnapshot(),
                session.getVehicleType(),
                cardNo,
                groupName,
                customerName,
                session.getCheckInAt(),
                session.getCheckOutAt(),
                session.getFeeAmount(),
                session.getPenaltyAmount(),
                session.getViolationReason(),
                floorName,
                entryStaffName,
                exitStaffName,
                session.getStatus(),
                session.getEntryImage(),
                session.getExitImage()
        );
    }
}
