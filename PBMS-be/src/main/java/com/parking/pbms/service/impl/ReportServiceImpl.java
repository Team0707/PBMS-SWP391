package com.parking.pbms.service.impl;

import com.parking.pbms.dto.VehicleReportResponse;
import com.parking.pbms.model.*;
import com.parking.pbms.repository.*;
import com.parking.pbms.repository.CustomerRepository;
import com.parking.pbms.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ReportServiceImpl implements ReportService {

    private final ParkingTicketRepository parkingTicketRepository;
    private final CardRepository cardRepository;
    private final CardGroupRepository cardGroupRepository;
    private final FloorRepository floorRepository;
    private final LaneRepository laneRepository;
    private final StaffRepository staffRepository;
    private final CustomerRepository customerRepository;

    @Override
    public List<VehicleReportResponse> getVehicleReport(
            String tab,
            String keyword,
            LocalDateTime fromDate,
            LocalDateTime toDate,
            Integer laneId,
            Integer staffId,
            String ticketType
    ) {
        List<ParkingTicket> tickets = parkingTicketRepository.findAll();

        return tickets.stream()
                .filter(t -> {
                    // Filter by tab
                    if (tab != null && tab.equalsIgnoreCase("exit")) {
                        if (t.getCheckOutAt() == null) return false;
                    }

                    // Filter by keyword
                    if (keyword != null && !keyword.trim().isEmpty()) {
                        String kw = keyword.trim().toLowerCase();
                        boolean matchPlate = t.getPlateNoSnapshot() != null && t.getPlateNoSnapshot().toLowerCase().contains(kw);
                        boolean matchTicketNo = t.getTicketNo() != null && t.getTicketNo().toLowerCase().contains(kw);
                        if (!matchPlate && !matchTicketNo) return false;
                    }

                    // Filter by date range
                    if (tab != null && tab.equalsIgnoreCase("entry")) {
                        if (t.getCheckInAt() == null) return false;
                        if (fromDate != null && t.getCheckInAt().isBefore(fromDate)) return false;
                        if (toDate != null && t.getCheckInAt().isAfter(toDate)) return false;
                    } else {
                        if (t.getCheckOutAt() == null) return false;
                        if (fromDate != null && t.getCheckOutAt().isBefore(fromDate)) return false;
                        if (toDate != null && t.getCheckOutAt().isAfter(toDate)) return false;
                    }

                    // Filter by lane
                    if (laneId != null) {
                        if (tab != null && tab.equalsIgnoreCase("entry")) {
                            if (!laneId.equals(t.getEntryLaneId())) return false;
                        } else {
                            if (!laneId.equals(t.getExitLaneId())) return false;
                        }
                    }

                    // Filter by staff
                    if (staffId != null) {
                        if (tab != null && tab.equalsIgnoreCase("entry")) {
                            if (!staffId.equals(t.getEntryStaffId())) return false;
                        } else {
                            if (!staffId.equals(t.getExitStaffId())) return false;
                        }
                    }

                    // Filter by ticket type
                    if (ticketType != null && !ticketType.trim().isEmpty()) {
                        if (!ticketType.equalsIgnoreCase(t.getTicketType())) return false;
                    }

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

    private VehicleReportResponse mapToResponse(ParkingTicket ticket) {
        String cardNo = "";
        String rfidUid = "";
        String groupName = "";
        String customerName = "";

        if (ticket.getCardId() != null) {
            Card card = cardRepository.findById(ticket.getCardId()).orElse(null);
            if (card != null) {
                cardNo = card.getCardNo();
                rfidUid = card.getRfidUid();
                if (card.getCardGroupId() != null) {
                    CardGroup cg = cardGroupRepository.findById(card.getCardGroupId()).orElse(null);
                    if (cg != null) {
                        groupName = cg.getGroupName();
                    }
                }
                if (card.getCustomerId() != null) {
                    Customer cust = customerRepository.findById(card.getCustomerId()).orElse(null);
                    if (cust != null) {
                        customerName = cust.getFullName();
                    }
                }
            }
        }

        if (groupName.isEmpty()) {
            groupName = "VE LƯỢT " + (ticket.getVehicleType().equalsIgnoreCase("MOTO") ? "XE MÁY" : "Ô TÔ");
        }

        String floorName = "";
        if (ticket.getEntryFloorId() != null) {
            Floor f = floorRepository.findById(ticket.getEntryFloorId()).orElse(null);
            if (f != null) {
                floorName = f.getFloorName();
            }
        }

        String entryLaneName = "";
        if (ticket.getEntryLaneId() != null) {
            Lane l = laneRepository.findById(ticket.getEntryLaneId()).orElse(null);
            if (l != null) {
                entryLaneName = l.getLaneName();
            }
        }

        String exitLaneName = "";
        if (ticket.getExitLaneId() != null) {
            Lane l = laneRepository.findById(ticket.getExitLaneId()).orElse(null);
            if (l != null) {
                exitLaneName = l.getLaneName();
            }
        }

        String entryStaffName = "";
        if (ticket.getEntryStaffId() != null) {
            Staff s = staffRepository.findById(ticket.getEntryStaffId()).orElse(null);
            if (s != null) {
                entryStaffName = s.getFullName();
            }
        }

        String exitStaffName = "";
        if (ticket.getExitStaffId() != null) {
            Staff s = staffRepository.findById(ticket.getExitStaffId()).orElse(null);
            if (s != null) {
                exitStaffName = s.getFullName();
            }
        }

        return new VehicleReportResponse(
                ticket.getTicketId(),
                ticket.getTicketNo(),
                cardNo,
                rfidUid,
                ticket.getPlateNoSnapshot(),
                floorName,
                ticket.getCheckInAt(),
                ticket.getCheckOutAt(),
                ticket.getFeeAmount(),
                groupName,
                customerName,
                entryLaneName,
                exitLaneName,
                entryStaffName,
                exitStaffName,
                ticket.getEntryImage(),
                ticket.getExitImage()
        );
    }
}
