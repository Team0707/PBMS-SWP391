package com.parking.pbms.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalTime;

/**
 * Entity đại diện cho bảng WorkShifts trong cơ sở dữ liệu.
 * Lưu thông tin về các ca làm việc của nhân viên.
 */
@Entity // Đánh dấu đây là một Entity để JPA quản lý
@Table(name = "WorkShifts", schema = "dbo") // Ánh xạ với bảng WorkShifts trong schema dbo
@Getter // Lombok tự động tạo getter cho tất cả thuộc tính
@Setter // Lombok tự động tạo setter cho tất cả thuộc tính
@NoArgsConstructor // Tạo constructor không tham số
@AllArgsConstructor // Tạo constructor có đầy đủ tham số
@Builder // Hỗ trợ tạo đối tượng theo mẫu Builder
public class WorkShift {

    /**
     * Mã định danh của ca làm việc.
     * Là khóa chính và tự động tăng.
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ShiftID")
    private Integer shiftId;

    /**
     * Mã ca làm việc.
     * Không được để trống và phải là duy nhất.
     * Ví dụ: S1, S2, CA01,...
     */
    @Column(name = "ShiftCode", nullable = false, unique = true, length = 10)
    private String shiftCode;

    /**
     * Tên ca làm việc.
     * Ví dụ: Ca sáng, Ca chiều, Ca đêm.
     */
    @Column(name = "ShiftName", nullable = false, length = 50)
    private String shiftName;

    /**
     * Thời gian bắt đầu ca làm việc.
     */
    @Column(name = "StartTime", nullable = false)
    private LocalTime startTime;

    /**
     * Thời gian kết thúc ca làm việc.
     */
    @Column(name = "EndTime", nullable = false)
    private LocalTime endTime;

    /**
     * Trạng thái của ca làm việc.
     * Ví dụ:
     * - Active: Đang sử dụng
     * - Inactive: Ngừng sử dụng
     */
    @Column(name = "Status", nullable = false, length = 20)
    private String status;
}