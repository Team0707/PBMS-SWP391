package com.parking.pbms.service;

import com.parking.pbms.dto.StaffCheckInRequest;
import com.parking.pbms.dto.StaffCheckOutRequest;
import com.parking.pbms.dto.StaffTicketResponse;
import com.parking.pbms.dto.StaffTransactionResponse;
import com.parking.pbms.model.Floor;
import java.util.List;

public interface StaffService {
    List<Floor> getFloors();
    StaffTicketResponse checkIn(StaffCheckInRequest request, String username);
    StaffTicketResponse checkOut(StaffCheckOutRequest request, String username);
    StaffTicketResponse previewCheckOut(String parkingSessionNoOrQrToken, String username);
    List<StaffTransactionResponse> getTransactionHistory(String username);
    java.util.Map<String, Object> getPreBookedDetails(String code);
    java.util.Map<String, Object> getCardInfo(String cardNo);
}
