package com.parking.pbms.service.impl;

import com.parking.pbms.dto.FloorStatDto;
import com.parking.pbms.dto.SlotResponse;
import com.parking.pbms.dto.SlotStatsResponse;
import com.parking.pbms.dto.UpdateSlotStatusRequest;
import com.parking.pbms.model.Floor;
import com.parking.pbms.model.ParkingSlot;
import com.parking.pbms.model.ParkingZone;
import com.parking.pbms.repository.FloorRepository;
import com.parking.pbms.repository.ParkingSlotRepository;
import com.parking.pbms.repository.ParkingTicketRepository;
import com.parking.pbms.repository.ParkingZoneRepository;
import com.parking.pbms.repository.ReservationRepository;
import com.parking.pbms.service.SlotService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SlotServiceImpl implements SlotService {

    private final ParkingSlotRepository parkingSlotRepository;
    private final ParkingZoneRepository parkingZoneRepository;
    private final FloorRepository floorRepository;
    private final ParkingTicketRepository parkingTicketRepository;
    private final ReservationRepository reservationRepository;

    @Override
    public List<SlotResponse> getAllSlots(Integer floorId, Integer zoneId, String status) {
        List<ParkingSlot> slots;
        if (floorId != null && zoneId != null) {
            slots = parkingSlotRepository.findByFloorIdAndZoneId(floorId, zoneId);
        } else if (floorId != null) {
            slots = parkingSlotRepository.findByFloorId(floorId);
        } else if (zoneId != null) {
            slots = parkingSlotRepository.findByZoneId(zoneId);
        } else {
            slots = parkingSlotRepository.findAll();
        }

        if (status != null && !status.trim().isEmpty()) {
            final String filterStatus = status.trim();
            slots = slots.stream()
                    .filter(s -> s.getStatus().equalsIgnoreCase(filterStatus))
                    .toList();
        }

        // Cache Floor and Zone maps for quick in-memory joins
        Map<Integer, Floor> floorMap = floorRepository.findAll().stream()
                .collect(Collectors.toMap(Floor::getFloorId, f -> f));

        Map<Integer, ParkingZone> zoneMap = parkingZoneRepository.findAll().stream()
                .collect(Collectors.toMap(ParkingZone::getZoneId, z -> z));

        return slots.stream().map(slot -> {
            Floor floor = floorMap.get(slot.getFloorId());
            ParkingZone zone = zoneMap.get(slot.getZoneId());

            return new SlotResponse(
                    slot.getSlotId(),
                    slot.getSlotCode(),
                    slot.getFloorId(),
                    floor != null ? floor.getFloorCode() : "",
                    floor != null ? floor.getFloorName() : "",
                    slot.getZoneId(),
                    zone != null ? zone.getZoneCode() : "",
                    zone != null ? zone.getZoneName() : "",
                    slot.getSlotNumber(),
                    slot.getVehicleType(),
                    slot.getStatus(),
                    slot.getDisabledReason(),
                    slot.getLastUpdatedAt()
            );
        }).toList();
    }

    @Override
    public List<ParkingZone> getZonesByFloor(Integer floorId) {
        if (floorId != null) {
            return parkingZoneRepository.findByFloorId(floorId);
        }
        return parkingZoneRepository.findAll();
    }

    @Override
    @Transactional
    public SlotResponse updateSlotStatus(Integer slotId, UpdateSlotStatusRequest request) {
        ParkingSlot slot = parkingSlotRepository.findById(slotId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy slot đỗ xe với ID: " + slotId));

        String newStatus = request.status().trim().toUpperCase();
        slot.setStatus(newStatus);
        slot.setDisabledReason(request.disabledReason());
        slot.setLastUpdatedAt(LocalDateTime.now());

        ParkingSlot saved = parkingSlotRepository.saveAndFlush(slot);
        
        Floor floor = floorRepository.findById(saved.getFloorId()).orElse(null);
        ParkingZone zone = parkingZoneRepository.findById(saved.getZoneId()).orElse(null);

        return new SlotResponse(
                saved.getSlotId(),
                saved.getSlotCode(),
                saved.getFloorId(),
                floor != null ? floor.getFloorCode() : "",
                floor != null ? floor.getFloorName() : "",
                saved.getZoneId(),
                zone != null ? zone.getZoneCode() : "",
                zone != null ? zone.getZoneName() : "",
                saved.getSlotNumber(),
                saved.getVehicleType(),
                saved.getStatus(),
                saved.getDisabledReason(),
                saved.getLastUpdatedAt()
        );
    }

    @Override
    public SlotStatsResponse getSlotStatistics(String dateString) {
        LocalDate date;
        if (dateString != null && !dateString.trim().isEmpty()) {
            try {
                date = LocalDate.parse(dateString.trim());
            } catch (Exception e) {
                date = LocalDate.now();
            }
        } else {
            date = LocalDate.now();
        }

        LocalDateTime startOfDay = date.atStartOfDay();
        LocalDateTime endOfDay = date.atTime(LocalTime.MAX);
        boolean isToday = date.equals(LocalDate.now());

        List<Floor> floors = floorRepository.findAll();
        List<FloorStatDto> floorStats = new ArrayList<>();

        int totalCarSlotsSum = 0;
        int totalMotorcycleSlotsSum = 0;
        int monthlyCarInsideSum = 0;
        int monthlyMotorcycleInsideSum = 0;

        for (Floor floor : floors) {
            Integer floorId = floor.getFloorId();

            // Total slots counts
            int totalCarSlots = (int) parkingSlotRepository.countByFloorIdAndVehicleType(floorId, "CAR");
            int totalMotorcycleSlots = (int) parkingSlotRepository.countByFloorIdAndVehicleType(floorId, "MOTORCYCLE");

            int occupiedCarSlots;
            int occupiedMotorcycleSlots;
            int availableCarSlots;
            int availableMotorcycleSlots;
            int monthlyCarInside;
            int monthlyMotorcycleInside;

            if (isToday) {
                // Đếm số xe đang gửi thực tế từ số vé ACTIVE
                occupiedCarSlots = (int) parkingTicketRepository.countByEntryFloorIdAndVehicleTypeAndStatus(floorId, "CAR", "ACTIVE");
                occupiedMotorcycleSlots = (int) parkingTicketRepository.countByEntryFloorIdAndVehicleTypeAndStatus(floorId, "MOTORCYCLE", "ACTIVE");
                
                availableCarSlots = Math.max(0, totalCarSlots - occupiedCarSlots);
                availableMotorcycleSlots = Math.max(0, totalMotorcycleSlots - occupiedMotorcycleSlots);

                monthlyCarInside = (int) reservationRepository.countPreBookedNotCheckedIn(floorId, "CAR", date);
                monthlyMotorcycleInside = (int) reservationRepository.countPreBookedNotCheckedIn(floorId, "MOTORCYCLE", date);
            } else {
                // If historical, calculate from checked-in tickets
                occupiedCarSlots = (int) parkingTicketRepository.countActiveTickets(floorId, "CAR", startOfDay, endOfDay);
                occupiedMotorcycleSlots = (int) parkingTicketRepository.countActiveTickets(floorId, "MOTORCYCLE", startOfDay, endOfDay);

                monthlyCarInside = (int) reservationRepository.countPreBookedNotCheckedIn(floorId, "CAR", date);
                monthlyMotorcycleInside = (int) reservationRepository.countPreBookedNotCheckedIn(floorId, "MOTORCYCLE", date);

                availableCarSlots = Math.max(0, totalCarSlots - occupiedCarSlots);
                availableMotorcycleSlots = Math.max(0, totalMotorcycleSlots - occupiedMotorcycleSlots);
            }

            FloorStatDto floorStat = new FloorStatDto(
                floorId,
                floor.getFloorCode(),
                floor.getFloorName(),
                totalCarSlots,
                availableCarSlots,
                occupiedCarSlots,
                monthlyCarInside,
                totalMotorcycleSlots,
                availableMotorcycleSlots,
                occupiedMotorcycleSlots,
                monthlyMotorcycleInside
            );
            floorStats.add(floorStat);

            totalCarSlotsSum += totalCarSlots;
            totalMotorcycleSlotsSum += totalMotorcycleSlots;
            monthlyCarInsideSum += monthlyCarInside;
            monthlyMotorcycleInsideSum += monthlyMotorcycleInside;
        }

        return new SlotStatsResponse(
            totalCarSlotsSum,
            totalMotorcycleSlotsSum,
            monthlyCarInsideSum,
            monthlyMotorcycleInsideSum,
            floorStats
        );
    }
}
