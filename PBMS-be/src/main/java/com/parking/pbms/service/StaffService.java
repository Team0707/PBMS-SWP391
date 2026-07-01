package com.parking.pbms.service;

import com.parking.pbms.dto.StaffCheckInRequest;
import com.parking.pbms.dto.StaffCheckOutRequest;
import com.parking.pbms.dto.StaffTicketResponse;
import com.parking.pbms.dto.StaffTransactionResponse;
import com.parking.pbms.model.Floor;
import com.parking.pbms.model.Lane;
import java.util.List;

public interface StaffService {
    List<Lane> getLanes();
    List<Floor> getFloors();
    StaffTicketResponse checkIn(StaffCheckInRequest request, String username);
    StaffTicketResponse checkOut(StaffCheckOutRequest request, String username);
    StaffTicketResponse previewCheckOut(String ticketNoOrQrToken, String laneCode, String username);
    List<StaffTransactionResponse> getTransactionHistory(String username);
    java.util.Map<String, Object> getPreBookedDetails(String code);
}
