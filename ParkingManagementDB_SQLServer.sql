/*
====================================================================
 PARKING BUILDING MANAGEMENT SYSTEM (PBMS)
 Database: Microsoft SQL Server
 Generated from frontend PBMS-fe(1)

 LUU Y:
 - Script KHONG xoa database/bang cu.
 - CardNo duoc tu dong sinh tu CardID, khong co cot DisplayCode/CardCode.
 - Mat khau mau cua admin, staff01, staff02, user01, user02 la: 123456
 - PasswordHash da ma hoa BCrypt, dung duoc voi Spring Security.
====================================================================
*/

USE master;
GO

IF DB_ID(N'ParkingManagementDB') IS NULL
BEGIN
    CREATE DATABASE ParkingManagementDB;
END;
GO

USE ParkingManagementDB;
GO

/* ================================================================
   1. AUTHENTICATION, ROLES, PROFILES
   ================================================================ */

IF OBJECT_ID(N'dbo.Roles', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Roles (
        RoleID          INT IDENTITY(1,1) PRIMARY KEY,
        RoleName        VARCHAR(20) NOT NULL UNIQUE,
        Description     NVARCHAR(255) NULL,
        CreatedAt       DATETIME2(0) NOT NULL CONSTRAINT DF_Roles_CreatedAt DEFAULT SYSDATETIME(),
        CONSTRAINT CK_Roles_RoleName CHECK (RoleName IN ('ADMIN', 'STAFF', 'USER'))
    );
END;
GO

IF OBJECT_ID(N'dbo.Accounts', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Accounts (
        AccountID       INT IDENTITY(1,1) PRIMARY KEY,
        RoleID          INT NOT NULL,
        Username        VARCHAR(50) NOT NULL,
        PasswordHash    VARCHAR(100) NOT NULL,
        FullName        NVARCHAR(100) NOT NULL,
        Email           VARCHAR(100) NULL,
        Phone           VARCHAR(20) NULL,
        Address         NVARCHAR(255) NULL,
        PortraitURL     NVARCHAR(500) NULL,
        Status          VARCHAR(20) NOT NULL CONSTRAINT DF_Accounts_Status DEFAULT 'ACTIVE',
        LastLoginAt     DATETIME2(0) NULL,
        CreatedAt       DATETIME2(0) NOT NULL CONSTRAINT DF_Accounts_CreatedAt DEFAULT SYSDATETIME(),
        UpdatedAt       DATETIME2(0) NOT NULL CONSTRAINT DF_Accounts_UpdatedAt DEFAULT SYSDATETIME(),
        CONSTRAINT UQ_Accounts_Username UNIQUE (Username),
        CONSTRAINT FK_Accounts_Roles FOREIGN KEY (RoleID) REFERENCES dbo.Roles(RoleID),
        CONSTRAINT CK_Accounts_Status CHECK (Status IN ('ACTIVE', 'LOCKED', 'INACTIVE'))
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_Accounts_Email' AND object_id = OBJECT_ID('dbo.Accounts'))
    CREATE UNIQUE INDEX UX_Accounts_Email ON dbo.Accounts(Email) WHERE Email IS NOT NULL;
GO

IF OBJECT_ID(N'dbo.Admin', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Admin (
        AdminID         INT IDENTITY(1,1) PRIMARY KEY,
        AccountID       INT NOT NULL UNIQUE,
        FullName        NVARCHAR(100) NOT NULL,
        Email           VARCHAR(100) NOT NULL,
        Phone           VARCHAR(20) NOT NULL,
        Status          VARCHAR(20) NOT NULL CONSTRAINT DF_Admin_Status DEFAULT 'ACTIVE',
        AdminCode       AS ('AD' + RIGHT('0000' + CONVERT(VARCHAR(10), AdminID), 4)) PERSISTED,
        Department      NVARCHAR(100) NULL,
        JoinedDate      DATE NULL,
        CreatedAt       DATETIME2(0) NOT NULL CONSTRAINT DF_Admin_CreatedAt DEFAULT SYSDATETIME(),
        CONSTRAINT FK_Admin_Accounts FOREIGN KEY (AccountID) REFERENCES dbo.Accounts(AccountID)
    );
END;
GO

IF OBJECT_ID(N'dbo.Staff', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Staff (
        StaffID         INT IDENTITY(1,1) PRIMARY KEY,
        AccountID       INT NOT NULL UNIQUE,
        FullName        NVARCHAR(100) NOT NULL,
        Email           VARCHAR(100) NOT NULL,
        Phone           VARCHAR(20) NOT NULL,
        Shift           VARCHAR(30) NOT NULL,
        Status          VARCHAR(20) NOT NULL CONSTRAINT DF_Staff_Status DEFAULT 'ACTIVE',
        StaffCode       AS ('ST' + RIGHT('0000' + CONVERT(VARCHAR(10), StaffID), 4)) PERSISTED,
        Department      NVARCHAR(100) NULL,
        JoinedDate      DATE NULL,
        CreatedAt       DATETIME2(0) NOT NULL CONSTRAINT DF_Staff_CreatedAt DEFAULT SYSDATETIME(),
        CONSTRAINT FK_Staff_Accounts FOREIGN KEY (AccountID) REFERENCES dbo.Accounts(AccountID)
    );
END;
GO

IF OBJECT_ID(N'dbo.Customers', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Customers (
        CustomerID      INT IDENTITY(1,1) PRIMARY KEY,
        CustomerCode    AS ('CUS' + RIGHT('000000' + CONVERT(VARCHAR(10), CustomerID), 6)) PERSISTED,
        AccountID       INT NULL,
        FullName        NVARCHAR(100) NOT NULL,
        Phone           VARCHAR(20) NULL,
        Email           VARCHAR(100) NULL,
        Address         NVARCHAR(255) NULL,
        Note            NVARCHAR(500) NULL,
        Status          VARCHAR(20) NOT NULL CONSTRAINT DF_Customers_Status DEFAULT 'ACTIVE',
        CreatedAt       DATETIME2(0) NOT NULL CONSTRAINT DF_Customers_CreatedAt DEFAULT SYSDATETIME(),
        UpdatedAt       DATETIME2(0) NOT NULL CONSTRAINT DF_Customers_UpdatedAt DEFAULT SYSDATETIME(),
        CONSTRAINT FK_Customers_Accounts FOREIGN KEY (AccountID) REFERENCES dbo.Accounts(AccountID),
        CONSTRAINT CK_Customers_Status CHECK (Status IN ('ACTIVE', 'INACTIVE', 'LOCKED'))
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_Customers_AccountID' AND object_id = OBJECT_ID('dbo.Customers'))
    CREATE UNIQUE INDEX UX_Customers_AccountID ON dbo.Customers(AccountID) WHERE AccountID IS NOT NULL;
GO

IF OBJECT_ID(N'dbo.[User]', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.[User] (
        UserID                  INT IDENTITY(1,1) PRIMARY KEY,
        AccountID               INT NOT NULL UNIQUE,
        CustomerID              INT NOT NULL UNIQUE,
        FullName                NVARCHAR(100) NOT NULL,
        Email                   VARCHAR(100) NOT NULL,
        Phone                   VARCHAR(20) NOT NULL,
        Address                 NVARCHAR(255) NOT NULL,
        Status                  VARCHAR(20) NOT NULL CONSTRAINT DF_User_Status DEFAULT 'ACTIVE',
        CreatedAt               DATETIME2(0) NOT NULL CONSTRAINT DF_User_CreatedAt DEFAULT SYSDATETIME(),
        CONSTRAINT FK_User_Accounts FOREIGN KEY (AccountID) REFERENCES dbo.Accounts(AccountID),
        CONSTRAINT FK_User_Customers FOREIGN KEY (CustomerID) REFERENCES dbo.Customers(CustomerID)
    );
END;
GO

/* ================================================================
   2. VEHICLE, FLOOR, SLOT, LANE, SHIFT
   ================================================================ */

IF OBJECT_ID(N'dbo.Vehicles', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Vehicles (
        VehicleID       INT IDENTITY(1,1) PRIMARY KEY,
        CustomerID      INT NULL,
        PlateNo         VARCHAR(20) NOT NULL,
        VehicleType     VARCHAR(20) NOT NULL,
        Brand           NVARCHAR(50) NULL,
        Model           NVARCHAR(50) NULL,
        Color           NVARCHAR(30) NULL,
        Status          VARCHAR(20) NOT NULL CONSTRAINT DF_Vehicles_Status DEFAULT 'ACTIVE',
        CreatedAt       DATETIME2(0) NOT NULL CONSTRAINT DF_Vehicles_CreatedAt DEFAULT SYSDATETIME(),
        UpdatedAt       DATETIME2(0) NOT NULL CONSTRAINT DF_Vehicles_UpdatedAt DEFAULT SYSDATETIME(),
        CONSTRAINT UQ_Vehicles_PlateNo UNIQUE (PlateNo),
        CONSTRAINT FK_Vehicles_Customers FOREIGN KEY (CustomerID) REFERENCES dbo.Customers(CustomerID),
        CONSTRAINT CK_Vehicles_Type CHECK (VehicleType IN ('MOTORCYCLE', 'CAR')),
        CONSTRAINT CK_Vehicles_Status CHECK (Status IN ('ACTIVE', 'INACTIVE', 'BLACKLISTED'))
    );
END;
GO

IF OBJECT_ID(N'dbo.Floors', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Floors (
        FloorID         INT IDENTITY(1,1) PRIMARY KEY,
        FloorCode       VARCHAR(10) NOT NULL UNIQUE,
        FloorName       NVARCHAR(100) NOT NULL,
        VehicleType     VARCHAR(20) NOT NULL,
        TotalSlots      INT NOT NULL,
        Note            NVARCHAR(500) NULL,
        Status          VARCHAR(20) NOT NULL CONSTRAINT DF_Floors_Status DEFAULT 'ACTIVE',
        CreatedAt       DATETIME2(0) NOT NULL CONSTRAINT DF_Floors_CreatedAt DEFAULT SYSDATETIME(),
        UpdatedAt       DATETIME2(0) NOT NULL CONSTRAINT DF_Floors_UpdatedAt DEFAULT SYSDATETIME(),
        CONSTRAINT CK_Floors_Type CHECK (VehicleType IN ('MOTORCYCLE', 'CAR', 'BOTH')),
        CONSTRAINT CK_Floors_TotalSlots CHECK (TotalSlots >= 0),
        CONSTRAINT CK_Floors_Status CHECK (Status IN ('ACTIVE', 'INACTIVE'))
    );
END;
GO

IF OBJECT_ID(N'dbo.ParkingZones', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ParkingZones (
        ZoneID          INT IDENTITY(1,1) PRIMARY KEY,
        FloorID         INT NOT NULL,
        ZoneCode        VARCHAR(10) NOT NULL,
        ZoneName        NVARCHAR(100) NULL,
        Status          VARCHAR(20) NOT NULL CONSTRAINT DF_ParkingZones_Status DEFAULT 'ACTIVE',
        CONSTRAINT UQ_ParkingZones UNIQUE (FloorID, ZoneCode),
        CONSTRAINT FK_ParkingZones_Floors FOREIGN KEY (FloorID) REFERENCES dbo.Floors(FloorID),
        CONSTRAINT CK_ParkingZones_Status CHECK (Status IN ('ACTIVE', 'INACTIVE'))
    );
END;
GO

IF OBJECT_ID(N'dbo.ParkingSlots', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ParkingSlots (
        SlotID          INT IDENTITY(1,1) PRIMARY KEY,
        SlotCode        VARCHAR(20) NOT NULL UNIQUE,
        FloorID         INT NOT NULL,
        ZoneID          INT NOT NULL,
        SlotNumber      INT NOT NULL,
        VehicleType     VARCHAR(20) NOT NULL CONSTRAINT DF_ParkingSlots_Type DEFAULT 'CAR',
        Status          VARCHAR(20) NOT NULL CONSTRAINT DF_ParkingSlots_Status DEFAULT 'AVAILABLE',
        DisabledReason  NVARCHAR(500) NULL,
        LastUpdatedAt   DATETIME2(0) NOT NULL CONSTRAINT DF_ParkingSlots_UpdatedAt DEFAULT SYSDATETIME(),
        CONSTRAINT UQ_ParkingSlots_Position UNIQUE (FloorID, ZoneID, SlotNumber),
        CONSTRAINT FK_ParkingSlots_Floors FOREIGN KEY (FloorID) REFERENCES dbo.Floors(FloorID),
        CONSTRAINT FK_ParkingSlots_Zones FOREIGN KEY (ZoneID) REFERENCES dbo.ParkingZones(ZoneID),
        CONSTRAINT CK_ParkingSlots_Type CHECK (VehicleType IN ('MOTORCYCLE', 'CAR')),
        CONSTRAINT CK_ParkingSlots_Status CHECK (Status IN ('AVAILABLE', 'RESERVED', 'OCCUPIED', 'DISABLED')),
        CONSTRAINT CK_ParkingSlots_Number CHECK (SlotNumber > 0)
    );
END;
GO

IF OBJECT_ID(N'dbo.Lanes', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Lanes (
        LaneID          INT IDENTITY(1,1) PRIMARY KEY,
        LaneCode        VARCHAR(20) NOT NULL UNIQUE,
        LaneName        NVARCHAR(100) NOT NULL,
        LaneType        VARCHAR(10) NOT NULL,
        VehicleType     VARCHAR(20) NOT NULL,
        AreaName        NVARCHAR(100) NULL,
        Status          VARCHAR(20) NOT NULL CONSTRAINT DF_Lanes_Status DEFAULT 'ACTIVE',
        CONSTRAINT CK_Lanes_Type CHECK (LaneType IN ('ENTRY', 'EXIT')),
        CONSTRAINT CK_Lanes_VehicleType CHECK (VehicleType IN ('MOTORCYCLE', 'CAR', 'BOTH')),
        CONSTRAINT CK_Lanes_Status CHECK (Status IN ('ACTIVE', 'INACTIVE'))
    );
END;
GO

IF OBJECT_ID(N'dbo.WorkShifts', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.WorkShifts (
        ShiftID         INT IDENTITY(1,1) PRIMARY KEY,
        ShiftCode       VARCHAR(10) NOT NULL UNIQUE,
        ShiftName       NVARCHAR(50) NOT NULL,
        StartTime       TIME(0) NOT NULL,
        EndTime         TIME(0) NOT NULL,
        Status          VARCHAR(20) NOT NULL CONSTRAINT DF_WorkShifts_Status DEFAULT 'ACTIVE',
        CONSTRAINT CK_WorkShifts_Status CHECK (Status IN ('ACTIVE', 'INACTIVE'))
    );
END;
GO

IF OBJECT_ID(N'dbo.StaffAssignments', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.StaffAssignments (
        AssignmentID    BIGINT IDENTITY(1,1) PRIMARY KEY,
        StaffID         INT NULL,
        LaneID          INT NOT NULL,
        FloorID         INT NOT NULL,
        ShiftID         INT NOT NULL,
        WorkDate        DATE NOT NULL,
        Status          VARCHAR(20) NOT NULL CONSTRAINT DF_StaffAssignments_Status DEFAULT 'ASSIGNED',
        Note            NVARCHAR(500) NULL,
        AssignedBy      INT NULL,
        AssignedAt      DATETIME2(0) NOT NULL CONSTRAINT DF_StaffAssignments_AssignedAt DEFAULT SYSDATETIME(),
        StartedAt       DATETIME2(0) NULL,
        EndedAt         DATETIME2(0) NULL,
        CONSTRAINT FK_StaffAssignments_Staff FOREIGN KEY (StaffID) REFERENCES dbo.Staff(StaffID),
        CONSTRAINT FK_StaffAssignments_Lanes FOREIGN KEY (LaneID) REFERENCES dbo.Lanes(LaneID),
        CONSTRAINT FK_StaffAssignments_Floors FOREIGN KEY (FloorID) REFERENCES dbo.Floors(FloorID),
        CONSTRAINT FK_StaffAssignments_Shifts FOREIGN KEY (ShiftID) REFERENCES dbo.WorkShifts(ShiftID),
        CONSTRAINT FK_StaffAssignments_AssignedBy FOREIGN KEY (AssignedBy) REFERENCES dbo.Admin(AdminID),
        CONSTRAINT CK_StaffAssignments_Status CHECK (Status IN ('UNASSIGNED', 'ASSIGNED', 'ON_DUTY', 'COMPLETED', 'CANCELLED'))
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_StaffAssignments_Lane' AND object_id = OBJECT_ID('dbo.StaffAssignments'))
    CREATE UNIQUE INDEX UX_StaffAssignments_Lane
    ON dbo.StaffAssignments(WorkDate, ShiftID, LaneID)
    WHERE Status <> 'CANCELLED';
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_StaffAssignments_Staff' AND object_id = OBJECT_ID('dbo.StaffAssignments'))
    CREATE UNIQUE INDEX UX_StaffAssignments_Staff
    ON dbo.StaffAssignments(WorkDate, ShiftID, StaffID)
    WHERE StaffID IS NOT NULL AND Status <> 'CANCELLED';
GO

/* ================================================================
   3. CARD GROUPS AND CARDS
   ================================================================ */

IF OBJECT_ID(N'dbo.CardGroups', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.CardGroups (
        CardGroupID         INT IDENTITY(1,1) PRIMARY KEY,
        GroupName           NVARCHAR(100) NOT NULL UNIQUE,
        VehicleType         VARCHAR(20) NOT NULL,
        TicketType          VARCHAR(20) NOT NULL,
        BasePrice           DECIMAL(18,2) NOT NULL CONSTRAINT DF_CardGroups_Price DEFAULT 0,
        DefaultDurationDays INT NULL,
        ReservationAllowed  BIT NOT NULL CONSTRAINT DF_CardGroups_Reservation DEFAULT 0,
        Description         NVARCHAR(500) NULL,
        Status              VARCHAR(20) NOT NULL CONSTRAINT DF_CardGroups_Status DEFAULT 'ACTIVE',
        CreatedAt           DATETIME2(0) NOT NULL CONSTRAINT DF_CardGroups_CreatedAt DEFAULT SYSDATETIME(),
        UpdatedAt           DATETIME2(0) NOT NULL CONSTRAINT DF_CardGroups_UpdatedAt DEFAULT SYSDATETIME(),
        CONSTRAINT CK_CardGroups_VehicleType CHECK (VehicleType IN ('MOTORCYCLE', 'CAR')),
        CONSTRAINT CK_CardGroups_TicketType CHECK (TicketType IN ('SINGLE', 'DAY', 'MONTHLY')),
        CONSTRAINT CK_CardGroups_Price CHECK (BasePrice >= 0),
        CONSTRAINT CK_CardGroups_Status CHECK (Status IN ('ACTIVE', 'INACTIVE'))
    );
END;
GO

IF OBJECT_ID(N'dbo.Cards', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Cards (
        CardID              INT IDENTITY(1,1) PRIMARY KEY,
        CardNo              AS ('CARD' + RIGHT('000000' + CONVERT(VARCHAR(10), CardID), 6)) PERSISTED,
        RFIDUID             VARCHAR(100) NULL,
        CardGroupID         INT NOT NULL,
        CustomerID          INT NULL,
        VehicleID           INT NULL,
        PreferredFloorID    INT NULL,
        RegisteredAt        DATE NOT NULL CONSTRAINT DF_Cards_RegisteredAt DEFAULT CAST(SYSDATETIME() AS DATE),
        EffectiveFrom       DATE NOT NULL CONSTRAINT DF_Cards_EffectiveFrom DEFAULT CAST(SYSDATETIME() AS DATE),
        ExpireAt            DATE NULL,
        Status              VARCHAR(20) NOT NULL CONSTRAINT DF_Cards_Status DEFAULT 'ACTIVE',
        Note                NVARCHAR(500) NULL,
        CreatedAt           DATETIME2(0) NOT NULL CONSTRAINT DF_Cards_CreatedAt DEFAULT SYSDATETIME(),
        UpdatedAt           DATETIME2(0) NOT NULL CONSTRAINT DF_Cards_UpdatedAt DEFAULT SYSDATETIME(),
        CONSTRAINT UQ_Cards_CardNo UNIQUE (CardNo),
        CONSTRAINT FK_Cards_CardGroups FOREIGN KEY (CardGroupID) REFERENCES dbo.CardGroups(CardGroupID),
        CONSTRAINT FK_Cards_Customers FOREIGN KEY (CustomerID) REFERENCES dbo.Customers(CustomerID),
        CONSTRAINT FK_Cards_Vehicles FOREIGN KEY (VehicleID) REFERENCES dbo.Vehicles(VehicleID),
        CONSTRAINT FK_Cards_Floors FOREIGN KEY (PreferredFloorID) REFERENCES dbo.Floors(FloorID),
        CONSTRAINT CK_Cards_Status CHECK (Status IN ('PENDING', 'ACTIVE', 'EXPIRING', 'EXPIRED', 'LOCKED', 'INACTIVE')),
        CONSTRAINT CK_Cards_Date CHECK (ExpireAt IS NULL OR ExpireAt >= EffectiveFrom)
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_Cards_RFIDUID' AND object_id = OBJECT_ID('dbo.Cards'))
    CREATE UNIQUE INDEX UX_Cards_RFIDUID ON dbo.Cards(RFIDUID) WHERE RFIDUID IS NOT NULL;
GO

/* ================================================================
   4. RESERVATIONS
   ================================================================ */

IF OBJECT_ID(N'dbo.Reservations', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Reservations (
        ReservationID       BIGINT IDENTITY(1,1) PRIMARY KEY,
        ReservationNo       AS ('RES' + RIGHT('000000' + CONVERT(VARCHAR(20), ReservationID), 6)) PERSISTED,
        UserID              INT NOT NULL,
        CardID              INT NOT NULL,
        VehicleID           INT NOT NULL,
        ReservationDate     DATE NOT NULL,
        ExpectedArrivalTime TIME(0) NOT NULL,
        FloorID             INT NOT NULL,
        ZoneID              INT NOT NULL,
        OriginalSlotID      INT NOT NULL,
        CurrentSlotID       INT NOT NULL,
        Status              VARCHAR(40) NOT NULL CONSTRAINT DF_Reservations_Status DEFAULT 'CONFIRMED',
        IsActive            BIT NOT NULL CONSTRAINT DF_Reservations_IsActive DEFAULT 1,
        UserRespondedAt     DATETIME2(0) NULL,
        CheckInAt           DATETIME2(0) NULL,
        CompletedAt         DATETIME2(0) NULL,
        CancelledAt         DATETIME2(0) NULL,
        CancelReason        NVARCHAR(500) NULL,
        NoShowMarkedAt      DATETIME2(0) NULL,
        AdminSLAAt          DATETIME2(0) NULL,
        IsOverdue           BIT NOT NULL CONSTRAINT DF_Reservations_IsOverdue DEFAULT 0,
        CreatedAt           DATETIME2(0) NOT NULL CONSTRAINT DF_Reservations_CreatedAt DEFAULT SYSDATETIME(),
        UpdatedAt           DATETIME2(0) NOT NULL CONSTRAINT DF_Reservations_UpdatedAt DEFAULT SYSDATETIME(),
        CONSTRAINT UQ_Reservations_No UNIQUE (ReservationNo),
        CONSTRAINT FK_Reservations_Users FOREIGN KEY (UserID) REFERENCES dbo.[User](UserID),
        CONSTRAINT FK_Reservations_Cards FOREIGN KEY (CardID) REFERENCES dbo.Cards(CardID),
        CONSTRAINT FK_Reservations_Vehicles FOREIGN KEY (VehicleID) REFERENCES dbo.Vehicles(VehicleID),
        CONSTRAINT FK_Reservations_Floors FOREIGN KEY (FloorID) REFERENCES dbo.Floors(FloorID),
        CONSTRAINT FK_Reservations_Zones FOREIGN KEY (ZoneID) REFERENCES dbo.ParkingZones(ZoneID),
        CONSTRAINT FK_Reservations_OriginalSlot FOREIGN KEY (OriginalSlotID) REFERENCES dbo.ParkingSlots(SlotID),
        CONSTRAINT FK_Reservations_CurrentSlot FOREIGN KEY (CurrentSlotID) REFERENCES dbo.ParkingSlots(SlotID),
        CONSTRAINT CK_Reservations_Status CHECK (Status IN (
            'CONFIRMED', 'AWAITING_USER_CONFIRMATION', 'REASSIGNMENT_REQUIRED',
            'CHECKED_IN', 'COMPLETED', 'CANCELLED_BY_USER', 'CANCELLED_BY_SYSTEM', 'NO_SHOW'
        ))
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_Reservations_VehicleDateActive' AND object_id = OBJECT_ID('dbo.Reservations'))
    CREATE UNIQUE INDEX UX_Reservations_VehicleDateActive
    ON dbo.Reservations(VehicleID, ReservationDate)
    WHERE IsActive = 1;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_Reservations_SlotDateActive' AND object_id = OBJECT_ID('dbo.Reservations'))
    CREATE UNIQUE INDEX UX_Reservations_SlotDateActive
    ON dbo.Reservations(CurrentSlotID, ReservationDate)
    WHERE IsActive = 1;
GO

/* ================================================================
   5. VEHICLE ENTRY/EXIT, TICKETS, ACCESS LOG
   ================================================================ */

IF OBJECT_ID(N'dbo.ParkingTickets', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ParkingTickets (
        TicketID             BIGINT IDENTITY(1,1) PRIMARY KEY,
        TicketNo             AS ('TK' + RIGHT('000000' + CONVERT(VARCHAR(20), TicketID), 6)) PERSISTED,
        QRToken              VARCHAR(500) NOT NULL,
        CardID               INT NULL,
        VehicleID            INT NULL,
        ReservationID        BIGINT NULL,
        TicketType           VARCHAR(20) NOT NULL,
        VehicleType          VARCHAR(20) NOT NULL,
        PlateNoSnapshot      VARCHAR(20) NOT NULL,
        EntryImage           VARCHAR(MAX) NULL,
        ExitImage            VARCHAR(MAX) NULL,
        EntryFloorID         INT NOT NULL,
        ParkingSlotID        INT NULL,
        SuggestedSlotID      INT NULL,
        SlotOverrideReason   NVARCHAR(500) NULL,
        EntryLaneID          INT NOT NULL,
        ExitLaneID           INT NULL,
        EntryStaffID         INT NOT NULL,
        ExitStaffID          INT NULL,
        CheckInAt            DATETIME2(0) NOT NULL CONSTRAINT DF_ParkingTickets_CheckIn DEFAULT SYSDATETIME(),
        CheckOutAt           DATETIME2(0) NULL,
        FeeAmount            DECIMAL(18,2) NOT NULL CONSTRAINT DF_ParkingTickets_Fee DEFAULT 0,
        PenaltyAmount        DECIMAL(18,2) NOT NULL CONSTRAINT DF_ParkingTickets_Penalty DEFAULT 0,
        ViolationReason      NVARCHAR(500) NULL,
        Status               VARCHAR(20) NOT NULL CONSTRAINT DF_ParkingTickets_Status DEFAULT 'ACTIVE',
        ForceCheckout        BIT NOT NULL CONSTRAINT DF_ParkingTickets_Force DEFAULT 0,
        ForceCheckoutReason  NVARCHAR(500) NULL,
        CreatedAt            DATETIME2(0) NOT NULL CONSTRAINT DF_ParkingTickets_CreatedAt DEFAULT SYSDATETIME(),
        UpdatedAt            DATETIME2(0) NOT NULL CONSTRAINT DF_ParkingTickets_UpdatedAt DEFAULT SYSDATETIME(),
        CONSTRAINT UQ_ParkingTickets_No UNIQUE (TicketNo),
        CONSTRAINT UQ_ParkingTickets_QR UNIQUE (QRToken),
        CONSTRAINT FK_ParkingTickets_Cards FOREIGN KEY (CardID) REFERENCES dbo.Cards(CardID),
        CONSTRAINT FK_ParkingTickets_Vehicles FOREIGN KEY (VehicleID) REFERENCES dbo.Vehicles(VehicleID),
        CONSTRAINT FK_ParkingTickets_Reservations FOREIGN KEY (ReservationID) REFERENCES dbo.Reservations(ReservationID),
        CONSTRAINT FK_ParkingTickets_Floor FOREIGN KEY (EntryFloorID) REFERENCES dbo.Floors(FloorID),
        CONSTRAINT FK_ParkingTickets_Slot FOREIGN KEY (ParkingSlotID) REFERENCES dbo.ParkingSlots(SlotID),
        CONSTRAINT FK_ParkingTickets_SuggestedSlot FOREIGN KEY (SuggestedSlotID) REFERENCES dbo.ParkingSlots(SlotID),
        CONSTRAINT FK_ParkingTickets_EntryLane FOREIGN KEY (EntryLaneID) REFERENCES dbo.Lanes(LaneID),
        CONSTRAINT FK_ParkingTickets_ExitLane FOREIGN KEY (ExitLaneID) REFERENCES dbo.Lanes(LaneID),
        CONSTRAINT FK_ParkingTickets_EntryStaff FOREIGN KEY (EntryStaffID) REFERENCES dbo.Staff(StaffID),
        CONSTRAINT FK_ParkingTickets_ExitStaff FOREIGN KEY (ExitStaffID) REFERENCES dbo.Staff(StaffID),
        CONSTRAINT CK_ParkingTickets_TicketType CHECK (TicketType IN ('SINGLE', 'DAY', 'MONTHLY')),
        CONSTRAINT CK_ParkingTickets_VehicleType CHECK (VehicleType IN ('MOTORCYCLE', 'CAR')),
        CONSTRAINT CK_ParkingTickets_Status CHECK (Status IN ('ACTIVE', 'PAID', 'COMPLETED', 'CANCELLED', 'LOST')),
        CONSTRAINT CK_ParkingTickets_Fee CHECK (FeeAmount >= 0),
        CONSTRAINT CK_ParkingTickets_Penalty CHECK (PenaltyAmount >= 0),
        CONSTRAINT CK_ParkingTickets_CheckOut CHECK (CheckOutAt IS NULL OR CheckOutAt >= CheckInAt),
        CONSTRAINT CK_ParkingTickets_ForceReason CHECK (ForceCheckout = 0 OR ForceCheckoutReason IS NOT NULL)
    );
END;
GO

/* ================================================================
   6. REQUEST / EXCEPTION PROCESSING
   ================================================================ */

IF OBJECT_ID(N'dbo.Requests', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Requests (
        RequestID               BIGINT IDENTITY(1,1) PRIMARY KEY,
        RequestNo               AS ('REQ' + RIGHT('000000' + CONVERT(VARCHAR(20), RequestID), 6)) PERSISTED,
        RequestType             VARCHAR(50) NOT NULL,
        SenderAccountID         INT NOT NULL,
        AssignedStaffID         INT NULL,
        TicketID                BIGINT NULL,
        CardID                  INT NULL,
        ReservationID           BIGINT NULL,
        VehicleID               INT NULL,
        Subject                 NVARCHAR(200) NULL,
        Description             NVARCHAR(MAX) NOT NULL,
        EvidenceURL             NVARCHAR(500) NULL,
        Priority                VARCHAR(20) NOT NULL CONSTRAINT DF_Requests_Priority DEFAULT 'NORMAL',
        Status                  VARCHAR(20) NOT NULL CONSTRAINT DF_Requests_Status DEFAULT 'PENDING',
        AdminNote               NVARCHAR(MAX) NULL,
        CreatedAt               DATETIME2(0) NOT NULL CONSTRAINT DF_Requests_CreatedAt DEFAULT SYSDATETIME(),
        ProcessingAt            DATETIME2(0) NULL,
        ResolvedAt              DATETIME2(0) NULL,
        UpdatedAt               DATETIME2(0) NOT NULL CONSTRAINT DF_Requests_UpdatedAt DEFAULT SYSDATETIME(),
        CONSTRAINT UQ_Requests_No UNIQUE (RequestNo),
        CONSTRAINT FK_Requests_Sender FOREIGN KEY (SenderAccountID) REFERENCES dbo.Accounts(AccountID),
        CONSTRAINT FK_Requests_AssignedStaff FOREIGN KEY (AssignedStaffID) REFERENCES dbo.Staff(StaffID),
        CONSTRAINT FK_Requests_Tickets FOREIGN KEY (TicketID) REFERENCES dbo.ParkingTickets(TicketID),
        CONSTRAINT FK_Requests_Cards FOREIGN KEY (CardID) REFERENCES dbo.Cards(CardID),
        CONSTRAINT FK_Requests_Reservations FOREIGN KEY (ReservationID) REFERENCES dbo.Reservations(ReservationID),
        CONSTRAINT FK_Requests_Vehicles FOREIGN KEY (VehicleID) REFERENCES dbo.Vehicles(VehicleID),
        CONSTRAINT CK_Requests_Type CHECK (RequestType IN (
            'LOST_TICKET', 'WRONG_VEHICLE_INFO', 'SUPPORT', 'WRONG_SLOT_REPORT',
            'CANNOT_ENTER', 'CANNOT_EXIT', 'MONTHLY_CARD_ERROR', 'PENALTY_APPEAL',
            'VEHICLE_INFORMATION_UPDATE', 'REFUND_NOT_RECEIVED', 'CHANGE_SHIFT', 'OTHER'
        )),
        CONSTRAINT CK_Requests_Priority CHECK (Priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
        CONSTRAINT CK_Requests_Status CHECK (Status IN ('PENDING', 'PROCESSING', 'APPROVED', 'RESOLVED', 'REJECTED', 'CANCELLED'))
    );
END;
GO

/* ================================================================
   8. PAYMENTS AND CARD HISTORY
   ================================================================ */

IF OBJECT_ID(N'dbo.Payments', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Payments (
        PaymentID         BIGINT IDENTITY(1,1) PRIMARY KEY,
        PaymentNo         AS ('PAY' + RIGHT('000000' + CONVERT(VARCHAR(20), PaymentID), 6)) PERSISTED,
        PayerAccountID    INT NULL,
        TicketID          BIGINT NULL,
        CardID            INT NULL,
        PaymentType       VARCHAR(30) NOT NULL,
        Amount            DECIMAL(18,2) NOT NULL,
        PaymentMethod     VARCHAR(30) NOT NULL,
        Gateway           VARCHAR(30) NULL,
        ReferenceCode     VARCHAR(100) NULL,
        Status            VARCHAR(20) NOT NULL CONSTRAINT DF_Payments_Status DEFAULT 'PENDING',
        PaidAt            DATETIME2(0) NULL,
        CreatedAt         DATETIME2(0) NOT NULL CONSTRAINT DF_Payments_CreatedAt DEFAULT SYSDATETIME(),
        UpdatedAt         DATETIME2(0) NOT NULL CONSTRAINT DF_Payments_UpdatedAt DEFAULT SYSDATETIME(),
        CONSTRAINT UQ_Payments_No UNIQUE (PaymentNo),
        CONSTRAINT FK_Payments_Accounts FOREIGN KEY (PayerAccountID) REFERENCES dbo.Accounts(AccountID),
        CONSTRAINT FK_Payments_Tickets FOREIGN KEY (TicketID) REFERENCES dbo.ParkingTickets(TicketID),
        CONSTRAINT FK_Payments_Cards FOREIGN KEY (CardID) REFERENCES dbo.Cards(CardID),
        CONSTRAINT CK_Payments_Type CHECK (PaymentType IN ('PARKING_FEE', 'CARD_REGISTRATION', 'CARD_RENEWAL', 'PENALTY', 'REFUND')),
        CONSTRAINT CK_Payments_Method CHECK (PaymentMethod IN ('CASH', 'VIETQR', 'MOMO', 'ZALOPAY', 'VNPAY', 'BANK_TRANSFER', 'OTHER')),
        CONSTRAINT CK_Payments_Status CHECK (Status IN ('PENDING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED')),
        CONSTRAINT CK_Payments_Amount CHECK (Amount >= 0)
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_Payments_ReferenceCode' AND object_id = OBJECT_ID('dbo.Payments'))
    CREATE UNIQUE INDEX UX_Payments_ReferenceCode ON dbo.Payments(ReferenceCode) WHERE ReferenceCode IS NOT NULL;
GO

IF OBJECT_ID(N'dbo.CardHistories', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.CardHistories (
        CardHistoryID   BIGINT IDENTITY(1,1) PRIMARY KEY,
        CardID          INT NOT NULL,
        ActionType      VARCHAR(30) NOT NULL,
        PerformedBy     INT NOT NULL,
        PaymentID       BIGINT NULL,
        OldExpireAt     DATE NULL,
        NewExpireAt     DATE NULL,
        DurationMonths  INT NULL,
        Detail          NVARCHAR(500) NULL,
        ActionAt        DATETIME2(0) NOT NULL CONSTRAINT DF_CardHistories_ActionAt DEFAULT SYSDATETIME(),
        CONSTRAINT FK_CardHistories_Cards FOREIGN KEY (CardID) REFERENCES dbo.Cards(CardID),
        CONSTRAINT FK_CardHistories_Accounts FOREIGN KEY (PerformedBy) REFERENCES dbo.Accounts(AccountID),
        CONSTRAINT FK_CardHistories_Payments FOREIGN KEY (PaymentID) REFERENCES dbo.Payments(PaymentID),
        CONSTRAINT CK_CardHistories_Action CHECK (ActionType IN ('REGISTER', 'ACTIVATE', 'RENEW', 'LOCK', 'UNLOCK', 'EXPIRE', 'UPDATE_INFO', 'CANCEL')),
        CONSTRAINT CK_CardHistories_Duration CHECK (DurationMonths IS NULL OR DurationMonths > 0)
    );
END;
GO

/* ================================================================
   9. VIOLATION RULES
   ================================================================ */

IF OBJECT_ID(N'dbo.ViolationRules', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ViolationRules (
        RuleID              VARCHAR(50) PRIMARY KEY,
        RuleName            NVARCHAR(100) NOT NULL,
        TicketType          VARCHAR(20) NOT NULL,
        VehicleType         VARCHAR(20) NOT NULL,
        MaxDurationHours    INT NOT NULL CONSTRAINT DF_ViolationRules_MaxDuration DEFAULT 0,
        PenaltyPerHour      DECIMAL(18,2) NOT NULL CONSTRAINT DF_ViolationRules_Penalty DEFAULT 0,
        Description         NVARCHAR(500) NOT NULL,
        IsActive            BIT NOT NULL CONSTRAINT DF_ViolationRules_IsActive DEFAULT 1,
        CreatedAt           DATETIME2(0) NOT NULL CONSTRAINT DF_ViolationRules_CreatedAt DEFAULT SYSDATETIME(),
        UpdatedAt           DATETIME2(0) NOT NULL CONSTRAINT DF_ViolationRules_UpdatedAt DEFAULT SYSDATETIME(),
        CONSTRAINT CK_ViolationRules_TicketType CHECK (TicketType IN ('SINGLE', 'DAY', 'MONTHLY')),
        CONSTRAINT CK_ViolationRules_VehicleType CHECK (VehicleType IN ('MOTORCYCLE', 'CAR')),
        CONSTRAINT CK_ViolationRules_Duration CHECK (MaxDurationHours >= 0),
        CONSTRAINT CK_ViolationRules_Penalty CHECK (PenaltyPerHour >= 0)
    );
END;
GO

/* ================================================================
   10. INDEXES
   ================================================================ */

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Cards_Customer_Status' AND object_id = OBJECT_ID('dbo.Cards'))
    CREATE INDEX IX_Cards_Customer_Status ON dbo.Cards(CustomerID, Status);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Cards_ExpireAt' AND object_id = OBJECT_ID('dbo.Cards'))
    CREATE INDEX IX_Cards_ExpireAt ON dbo.Cards(ExpireAt);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ParkingSlots_Floor_Status' AND object_id = OBJECT_ID('dbo.ParkingSlots'))
    CREATE INDEX IX_ParkingSlots_Floor_Status ON dbo.ParkingSlots(FloorID, Status);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Reservations_Date_Status' AND object_id = OBJECT_ID('dbo.Reservations'))
    CREATE INDEX IX_Reservations_Date_Status ON dbo.Reservations(ReservationDate, Status);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ParkingTickets_CheckIn_Status' AND object_id = OBJECT_ID('dbo.ParkingTickets'))
    CREATE INDEX IX_ParkingTickets_CheckIn_Status ON dbo.ParkingTickets(CheckInAt, Status);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ParkingTickets_Plate' AND object_id = OBJECT_ID('dbo.ParkingTickets'))
    CREATE INDEX IX_ParkingTickets_Plate ON dbo.ParkingTickets(PlateNoSnapshot);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Requests_Status_Type' AND object_id = OBJECT_ID('dbo.Requests'))
    CREATE INDEX IX_Requests_Status_Type ON dbo.Requests(Status, RequestType, CreatedAt DESC);
GO

/* ================================================================
   11. SAMPLE DATA
   ================================================================ */

IF NOT EXISTS (SELECT 1 FROM dbo.Roles WHERE RoleName = 'ADMIN')
    INSERT dbo.Roles(RoleName, Description) VALUES ('ADMIN', N'Quản trị hệ thống');
IF NOT EXISTS (SELECT 1 FROM dbo.Roles WHERE RoleName = 'STAFF')
    INSERT dbo.Roles(RoleName, Description) VALUES ('STAFF', N'Nhân viên bãi xe');
IF NOT EXISTS (SELECT 1 FROM dbo.Roles WHERE RoleName = 'USER')
    INSERT dbo.Roles(RoleName, Description) VALUES ('USER', N'Khách hàng có tài khoản');
GO

DECLARE @PasswordHash VARCHAR(100) = '$2a$10$SVPEFhYqVBRvDux00x1X6Ot3goMXRI2/EwLryvUKkEzao2akJM3cO';

IF NOT EXISTS (SELECT 1 FROM dbo.Accounts WHERE Username = 'admin')
    INSERT dbo.Accounts(RoleID, Username, PasswordHash, FullName, Email, Phone, Address, Status)
    SELECT RoleID, 'admin', @PasswordHash, N'Quản trị hệ thống', 'admin@parkingsystem.vn', '0912000001', N'TP. Hồ Chí Minh', 'ACTIVE'
    FROM dbo.Roles WHERE RoleName = 'ADMIN';

IF NOT EXISTS (SELECT 1 FROM dbo.Accounts WHERE Username = 'staff01')
    INSERT dbo.Accounts(RoleID, Username, PasswordHash, FullName, Email, Phone, Address, Status)
    SELECT RoleID, 'staff01', @PasswordHash, N'Nguyễn Hoàng Nam', 'staff01@parkingsystem.vn', '0912000002', N'Gò Vấp, TP. Hồ Chí Minh', 'ACTIVE'
    FROM dbo.Roles WHERE RoleName = 'STAFF';

IF NOT EXISTS (SELECT 1 FROM dbo.Accounts WHERE Username = 'staff02')
    INSERT dbo.Accounts(RoleID, Username, PasswordHash, FullName, Email, Phone, Address, Status)
    SELECT RoleID, 'staff02', @PasswordHash, N'Trần Quốc Huy', 'staff02@parkingsystem.vn', '0912000003', N'Quận 12, TP. Hồ Chí Minh', 'ACTIVE'
    FROM dbo.Roles WHERE RoleName = 'STAFF';

IF NOT EXISTS (SELECT 1 FROM dbo.Accounts WHERE Username = 'user01')
    INSERT dbo.Accounts(RoleID, Username, PasswordHash, FullName, Email, Phone, Address, Status)
    SELECT RoleID, 'user01', @PasswordHash, N'Nguyễn Văn An', 'khoiotaku1907@gmail.com', '0901234567', N'123 Lê Lợi, Quận 1, TP. Hồ Chí Minh', 'ACTIVE'
    FROM dbo.Roles WHERE RoleName = 'USER';

IF NOT EXISTS (SELECT 1 FROM dbo.Accounts WHERE Username = 'user02')
    INSERT dbo.Accounts(RoleID, Username, PasswordHash, FullName, Email, Phone, Address, Status)
    SELECT RoleID, 'user02', @PasswordHash, N'Trần Thị Bích', 'user02@gmail.com', '0909876543', N'456 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh', 'ACTIVE'
    FROM dbo.Roles WHERE RoleName = 'USER';
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Admin ap JOIN dbo.Accounts a ON a.AccountID = ap.AccountID WHERE a.Username = 'admin')
    INSERT dbo.Admin(AccountID, FullName, Email, Phone, Status, Department, JoinedDate)
    SELECT
        a.AccountID,
        COALESCE(a.FullName, N'Quản trị hệ thống'),
        COALESCE(a.Email, 'admin@parkingsystem.vn'),
        COALESCE(a.Phone, '0912000001'),
        COALESCE(a.Status, 'ACTIVE'),
        N'Ban quản trị',
        '2024-01-01'
    FROM dbo.Accounts a
    WHERE a.Username = 'admin';

IF NOT EXISTS (SELECT 1 FROM dbo.Staff sp JOIN dbo.Accounts a ON a.AccountID = sp.AccountID WHERE a.Username = 'staff01')
    INSERT dbo.Staff(AccountID, FullName, Email, Phone, Shift, Status, Department, JoinedDate)
    SELECT
        a.AccountID,
        COALESCE(a.FullName, N'Nguyễn Hoàng Nam'),
        COALESCE(a.Email, 'staff01@parkingsystem.vn'),
        COALESCE(a.Phone, '0912000002'),
        'CA1',
        COALESCE(a.Status, 'ACTIVE'),
        N'Vận hành bãi xe',
        '2024-01-05'
    FROM dbo.Accounts a
    WHERE a.Username = 'staff01';

IF NOT EXISTS (SELECT 1 FROM dbo.Staff sp JOIN dbo.Accounts a ON a.AccountID = sp.AccountID WHERE a.Username = 'staff02')
    INSERT dbo.Staff(AccountID, FullName, Email, Phone, Shift, Status, Department, JoinedDate)
    SELECT
        a.AccountID,
        COALESCE(a.FullName, N'Trần Quốc Huy'),
        COALESCE(a.Email, 'staff02@parkingsystem.vn'),
        COALESCE(a.Phone, '0912000003'),
        'CA2',
        COALESCE(a.Status, 'ACTIVE'),
        N'Vận hành bãi xe',
        '2024-01-05'
    FROM dbo.Accounts a
    WHERE a.Username = 'staff02';
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Customers WHERE Email = 'khoiotaku1907@gmail.com')
    INSERT dbo.Customers(AccountID, FullName, Phone, Email, Address, Status)
    SELECT AccountID, FullName, Phone, Email, Address, 'ACTIVE' FROM dbo.Accounts WHERE Username = 'user01';

IF NOT EXISTS (SELECT 1 FROM dbo.Customers WHERE Email = 'user02@gmail.com')
    INSERT dbo.Customers(AccountID, FullName, Phone, Email, Address, Status)
    SELECT AccountID, FullName, Phone, Email, Address, 'ACTIVE' FROM dbo.Accounts WHERE Username = 'user02';

IF NOT EXISTS (SELECT 1 FROM dbo.Customers WHERE Email = 'levancuong@gmail.com')
    INSERT dbo.Customers(FullName, Phone, Email, Address, Note, Status)
    VALUES (N'Lê Văn Cường', '0905555777', 'levancuong@gmail.com', N'789 Trần Hưng Đạo, Quận 5, TP. Hồ Chí Minh', N'Khách hàng tại quầy', 'ACTIVE');
GO

IF NOT EXISTS (SELECT 1 FROM dbo.[User] up JOIN dbo.Accounts a ON a.AccountID = up.AccountID WHERE a.Username = 'user01')
    INSERT dbo.[User](AccountID, CustomerID, FullName, Email, Phone, Address, Status)
    SELECT
        a.AccountID,
        c.CustomerID,
        COALESCE(a.FullName, c.FullName, N'Nguyễn Văn An'),
        COALESCE(a.Email, c.Email, 'khoiotaku1907@gmail.com'),
        COALESCE(a.Phone, c.Phone, '0901234567'),
        COALESCE(a.Address, c.Address, N'123 Lê Lợi, Quận 1, TP. Hồ Chí Minh'),
        COALESCE(a.Status, 'ACTIVE')
    FROM dbo.Accounts a
    JOIN dbo.Customers c ON c.AccountID = a.AccountID
    WHERE a.Username = 'user01';

IF NOT EXISTS (SELECT 1 FROM dbo.[User] up JOIN dbo.Accounts a ON a.AccountID = up.AccountID WHERE a.Username = 'user02')
    INSERT dbo.[User](AccountID, CustomerID, FullName, Email, Phone, Address, Status)
    SELECT
        a.AccountID,
        c.CustomerID,
        COALESCE(a.FullName, c.FullName, N'Trần Thị Bích'),
        COALESCE(a.Email, c.Email, 'user02@gmail.com'),
        COALESCE(a.Phone, c.Phone, '0909876543'),
        COALESCE(a.Address, c.Address, N'456 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh'),
        COALESCE(a.Status, 'ACTIVE')
    FROM dbo.Accounts a
    JOIN dbo.Customers c ON c.AccountID = a.AccountID
    WHERE a.Username = 'user02';
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Vehicles WHERE PlateNo = '29X1-123.45')
    INSERT dbo.Vehicles(CustomerID, PlateNo, VehicleType, Brand, Color)
    SELECT CustomerID, '29X1-123.45', 'MOTORCYCLE', N'Honda', N'Đen' FROM dbo.Customers WHERE Email = 'khoiotaku1907@gmail.com';

IF NOT EXISTS (SELECT 1 FROM dbo.Vehicles WHERE PlateNo = '51A-123.45')
    INSERT dbo.Vehicles(CustomerID, PlateNo, VehicleType, Brand, Color)
    SELECT CustomerID, '51A-123.45', 'CAR', N'Toyota', N'Trắng' FROM dbo.Customers WHERE Email = 'khoiotaku1907@gmail.com';

IF NOT EXISTS (SELECT 1 FROM dbo.Vehicles WHERE PlateNo = '43A-999.11')
    INSERT dbo.Vehicles(CustomerID, PlateNo, VehicleType, Brand, Color)
    SELECT CustomerID, '43A-999.11', 'MOTORCYCLE', N'Yamaha', N'Xanh' FROM dbo.Customers WHERE Email = 'user02@gmail.com';

IF NOT EXISTS (SELECT 1 FROM dbo.Vehicles WHERE PlateNo = '51F-888.88')
    INSERT dbo.Vehicles(CustomerID, PlateNo, VehicleType, Brand, Color)
    SELECT CustomerID, '51F-888.88', 'CAR', N'Kia', N'Đen' FROM dbo.Customers WHERE Email = 'user02@gmail.com';

IF NOT EXISTS (SELECT 1 FROM dbo.Vehicles WHERE PlateNo = '59A-123.45')
    INSERT dbo.Vehicles(CustomerID, PlateNo, VehicleType, Brand, Color)
    SELECT CustomerID, '59A-123.45', 'MOTORCYCLE', N'Honda', N'Đỏ' FROM dbo.Customers WHERE Email = 'levancuong@gmail.com';
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Floors WHERE FloorCode = 'B1')
    INSERT dbo.Floors(FloorCode, FloorName, VehicleType, TotalSlots, Note) VALUES ('B1', N'Tầng B1', 'BOTH', 80, N'Tầng B1 - Ô tô & Xe máy');
ELSE
    UPDATE dbo.Floors SET VehicleType = 'BOTH', TotalSlots = 80, FloorName = N'Tầng B1' WHERE FloorCode = 'B1';

IF NOT EXISTS (SELECT 1 FROM dbo.Floors WHERE FloorCode = 'B2')
    INSERT dbo.Floors(FloorCode, FloorName, VehicleType, TotalSlots, Note) VALUES ('B2', N'Tầng B2', 'BOTH', 100, N'Tầng B2 - Ô tô & Xe máy');
ELSE
    UPDATE dbo.Floors SET VehicleType = 'BOTH', TotalSlots = 100, FloorName = N'Tầng B2' WHERE FloorCode = 'B2';

IF EXISTS (SELECT 1 FROM dbo.Floors WHERE FloorCode = 'B3')
BEGIN
    DECLARE @B3_ID INT;
    SELECT @B3_ID = FloorID FROM dbo.Floors WHERE FloorCode = 'B3';
    DELETE FROM dbo.ParkingSlots WHERE FloorID = @B3_ID;
    DELETE FROM dbo.ParkingZones WHERE FloorID = @B3_ID;
    DELETE FROM dbo.Floors WHERE FloorID = @B3_ID;
END;
GO

DECLARE @FloorCode VARCHAR(10);
DECLARE @FloorID INT;
DECLARE @ZoneCode VARCHAR(10);
DECLARE @ZoneID INT;
DECLARE @i INT;

DECLARE floor_cursor CURSOR LOCAL FAST_FORWARD FOR SELECT FloorCode FROM dbo.Floors WHERE FloorCode IN ('B1','B2');
OPEN floor_cursor;
FETCH NEXT FROM floor_cursor INTO @FloorCode;
WHILE @@FETCH_STATUS = 0
BEGIN
    SELECT @FloorID = FloorID FROM dbo.Floors WHERE FloorCode = @FloorCode;

    IF NOT EXISTS (SELECT 1 FROM dbo.ParkingZones WHERE FloorID = @FloorID AND ZoneCode = 'A')
        INSERT dbo.ParkingZones(FloorID, ZoneCode, ZoneName) VALUES (@FloorID, 'A', N'Khu A');

    IF NOT EXISTS (SELECT 1 FROM dbo.ParkingZones WHERE FloorID = @FloorID AND ZoneCode = 'B')
        INSERT dbo.ParkingZones(FloorID, ZoneCode, ZoneName) VALUES (@FloorID, 'B', N'Khu B');

    SET @ZoneCode = 'A';
    SELECT @ZoneID = ZoneID FROM dbo.ParkingZones WHERE FloorID = @FloorID AND ZoneCode = @ZoneCode;
    SET @i = 1;
    WHILE @i <= 20
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM dbo.ParkingSlots WHERE SlotCode = @FloorCode + '-A' + RIGHT('00' + CONVERT(VARCHAR(2), @i), 2))
            INSERT dbo.ParkingSlots(SlotCode, FloorID, ZoneID, SlotNumber, VehicleType, Status)
            VALUES (@FloorCode + '-A' + RIGHT('00' + CONVERT(VARCHAR(2), @i), 2), @FloorID, @ZoneID, @i, 'CAR', 'AVAILABLE');
        SET @i += 1;
    END;

    SET @ZoneCode = 'B';
    SELECT @ZoneID = ZoneID FROM dbo.ParkingZones WHERE FloorID = @FloorID AND ZoneCode = @ZoneCode;
    SET @i = 1;
    DECLARE @MaxMotorcycles INT;
    SET @MaxMotorcycles = CASE WHEN @FloorCode = 'B1' THEN 60 ELSE 80 END;

    WHILE @i <= @MaxMotorcycles
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM dbo.ParkingSlots WHERE SlotCode = @FloorCode + '-B' + RIGHT('00' + CONVERT(VARCHAR(2), @i), 2))
            INSERT dbo.ParkingSlots(SlotCode, FloorID, ZoneID, SlotNumber, VehicleType, Status)
            VALUES (@FloorCode + '-B' + RIGHT('00' + CONVERT(VARCHAR(2), @i), 2), @FloorID, @ZoneID, @i, 'MOTORCYCLE', 'AVAILABLE');
        SET @i += 1;
    END;

    FETCH NEXT FROM floor_cursor INTO @FloorCode;
END;
CLOSE floor_cursor;
DEALLOCATE floor_cursor;
GO

UPDATE dbo.ParkingSlots SET Status = 'OCCUPIED', LastUpdatedAt = SYSDATETIME() WHERE SlotCode IN ('B1-A03', 'B1-B02', 'B2-B03');
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Lanes WHERE LaneCode = 'L1')
    INSERT dbo.Lanes(LaneCode, LaneName, LaneType, VehicleType, AreaName) VALUES ('L1', N'Làn xe máy vào 1', 'ENTRY', 'MOTORCYCLE', N'Khu A - Xe máy');

IF NOT EXISTS (SELECT 1 FROM dbo.Lanes WHERE LaneCode = 'L2')
    INSERT dbo.Lanes(LaneCode, LaneName, LaneType, VehicleType, AreaName) VALUES ('L2', N'Làn xe máy ra 1', 'EXIT', 'MOTORCYCLE', N'Khu A - Xe máy');

IF NOT EXISTS (SELECT 1 FROM dbo.Lanes WHERE LaneCode = 'L3')
    INSERT dbo.Lanes(LaneCode, LaneName, LaneType, VehicleType, AreaName) VALUES ('L3', N'Làn ô tô vào 1', 'ENTRY', 'CAR', N'Khu B - Ô tô');

IF NOT EXISTS (SELECT 1 FROM dbo.Lanes WHERE LaneCode = 'L4')
    INSERT dbo.Lanes(LaneCode, LaneName, LaneType, VehicleType, AreaName) VALUES ('L4', N'Làn ô tô ra 1', 'EXIT', 'CAR', N'Khu B - Ô tô');
GO

IF NOT EXISTS (SELECT 1 FROM dbo.WorkShifts WHERE ShiftCode = 'CA1')
    INSERT dbo.WorkShifts(ShiftCode, ShiftName, StartTime, EndTime) VALUES ('CA1', N'Ca 1', '06:00', '14:00');

IF NOT EXISTS (SELECT 1 FROM dbo.WorkShifts WHERE ShiftCode = 'CA2')
    INSERT dbo.WorkShifts(ShiftCode, ShiftName, StartTime, EndTime) VALUES ('CA2', N'Ca 2', '14:00', '22:00');

IF NOT EXISTS (SELECT 1 FROM dbo.WorkShifts WHERE ShiftCode = 'CA3')
    INSERT dbo.WorkShifts(ShiftCode, ShiftName, StartTime, EndTime) VALUES ('CA3', N'Ca 3', '22:00', '06:00');
GO

IF NOT EXISTS (SELECT 1 FROM dbo.CardGroups WHERE GroupName = N'THẺ LƯỢT XE MÁY')
    INSERT dbo.CardGroups(GroupName, VehicleType, TicketType, BasePrice, ReservationAllowed, Description)
    VALUES (N'THẺ LƯỢT XE MÁY', 'MOTORCYCLE', 'SINGLE', 5000, 0, N'Vé lượt dành cho xe máy');

IF NOT EXISTS (SELECT 1 FROM dbo.CardGroups WHERE GroupName = N'THẺ LƯỢT Ô TÔ')
    INSERT dbo.CardGroups(GroupName, VehicleType, TicketType, BasePrice, ReservationAllowed, Description)
    VALUES (N'THẺ LƯỢT Ô TÔ', 'CAR', 'SINGLE', 20000, 0, N'Vé lượt dành cho ô tô');

IF NOT EXISTS (SELECT 1 FROM dbo.CardGroups WHERE GroupName = N'THẺ NGÀY XE MÁY')
    INSERT dbo.CardGroups(GroupName, VehicleType, TicketType, BasePrice, DefaultDurationDays, ReservationAllowed, Description)
    VALUES (N'THẺ NGÀY XE MÁY', 'MOTORCYCLE', 'DAY', 10000, 1, 0, N'Vé ngày dành cho xe máy');

IF NOT EXISTS (SELECT 1 FROM dbo.CardGroups WHERE GroupName = N'THẺ NGÀY Ô TÔ')
    INSERT dbo.CardGroups(GroupName, VehicleType, TicketType, BasePrice, DefaultDurationDays, ReservationAllowed, Description)
    VALUES (N'THẺ NGÀY Ô TÔ', 'CAR', 'DAY', 50000, 1, 0, N'Vé ngày dành cho ô tô');

IF NOT EXISTS (SELECT 1 FROM dbo.CardGroups WHERE GroupName = N'THẺ THÁNG XE MÁY')
    INSERT dbo.CardGroups(GroupName, VehicleType, TicketType, BasePrice, DefaultDurationDays, ReservationAllowed, Description)
    VALUES (N'THẺ THÁNG XE MÁY', 'MOTORCYCLE', 'MONTHLY', 100000, 30, 0, N'Vé tháng dành cho xe máy');

IF NOT EXISTS (SELECT 1 FROM dbo.CardGroups WHERE GroupName = N'THẺ THÁNG Ô TÔ')
    INSERT dbo.CardGroups(GroupName, VehicleType, TicketType, BasePrice, DefaultDurationDays, ReservationAllowed, Description)
    VALUES (N'THẺ THÁNG Ô TÔ', 'CAR', 'MONTHLY', 1000000, 30, 1, N'Vé tháng ô tô được phép đặt slot');
GO

IF NOT EXISTS (SELECT 1 FROM dbo.ViolationRules WHERE RuleID = 'RULE_SINGLE_MOTO')
    INSERT dbo.ViolationRules(RuleID, RuleName, TicketType, VehicleType, MaxDurationHours, PenaltyPerHour, Description)
    VALUES ('RULE_SINGLE_MOTO', N'Thẻ lượt xe máy quá giờ', 'SINGLE', 'MOTORCYCLE', 6, 10000, N'Áp dụng cho thẻ lượt xe máy đỗ quá 6 giờ kể từ thời điểm check-in. Phạt 10.000đ cho mỗi giờ quá hạn tiếp theo.');

IF NOT EXISTS (SELECT 1 FROM dbo.ViolationRules WHERE RuleID = 'RULE_SINGLE_CAR')
    INSERT dbo.ViolationRules(RuleID, RuleName, TicketType, VehicleType, MaxDurationHours, PenaltyPerHour, Description)
    VALUES ('RULE_SINGLE_CAR', N'Thẻ lượt ô tô quá giờ', 'SINGLE', 'CAR', 6, 50000, N'Áp dụng cho thẻ lượt ô tô đỗ quá 6 giờ kể từ thời điểm check-in. Phạt 50.000đ cho mỗi giờ quá hạn tiếp theo.');

IF NOT EXISTS (SELECT 1 FROM dbo.ViolationRules WHERE RuleID = 'RULE_DAY_EXPIRED_MOTO')
    INSERT dbo.ViolationRules(RuleID, RuleName, TicketType, VehicleType, MaxDurationHours, PenaltyPerHour, Description)
    VALUES ('RULE_DAY_EXPIRED_MOTO', N'Thẻ ngày hết hạn khi checkout (Xe máy)', 'DAY', 'MOTORCYCLE', 0, 10000, N'Áp dụng khi thẻ ngày xe máy bị hết hạn tại thời điểm check-out. Tính phạt 10.000đ cho mỗi giờ quá hạn kể từ mốc hết hiệu lực.');

IF NOT EXISTS (SELECT 1 FROM dbo.ViolationRules WHERE RuleID = 'RULE_DAY_EXPIRED_CAR')
    INSERT dbo.ViolationRules(RuleID, RuleName, TicketType, VehicleType, MaxDurationHours, PenaltyPerHour, Description)
    VALUES ('RULE_DAY_EXPIRED_CAR', N'Thẻ ngày hết hạn khi checkout (Ô tô)', 'DAY', 'CAR', 0, 50000, N'Áp dụng khi thẻ ngày ô tô bị hết hạn tại thời điểm check-out. Tính phạt 50.000đ cho mỗi giờ quá hạn kể từ mốc hết hiệu lực.');

IF NOT EXISTS (SELECT 1 FROM dbo.ViolationRules WHERE RuleID = 'RULE_MONTHLY_EXPIRED_MOTO')
    INSERT dbo.ViolationRules(RuleID, RuleName, TicketType, VehicleType, MaxDurationHours, PenaltyPerHour, Description)
    VALUES ('RULE_MONTHLY_EXPIRED_MOTO', N'Thẻ tháng hết hạn khi checkout (Xe máy)', 'MONTHLY', 'MOTORCYCLE', 0, 10000, N'Áp dụng khi thẻ tháng xe máy đã hết hạn tại thời điểm check-out. Tính phạt 10.000đ cho mỗi giờ quá hạn kể từ mốc hết hiệu lực.');

IF NOT EXISTS (SELECT 1 FROM dbo.ViolationRules WHERE RuleID = 'RULE_MONTHLY_EXPIRED_CAR')
    INSERT dbo.ViolationRules(RuleID, RuleName, TicketType, VehicleType, MaxDurationHours, PenaltyPerHour, Description)
    VALUES ('RULE_MONTHLY_EXPIRED_CAR', N'Thẻ tháng hết hạn khi checkout (Ô tô)', 'MONTHLY', 'CAR', 0, 50000, N'Áp dụng khi thẻ tháng ô tô đã hết hạn tại thời điểm check-out. Tính phạt 50.000đ cho mỗi giờ quá hạn kể từ mốc hết hiệu lực.');
GO

/* ================================================================
   12. VIEWS FOR FRONTEND / REPORTING
   ================================================================ */

CREATE OR ALTER VIEW dbo.vw_AccountProfiles
AS
SELECT
    a.AccountID,
    a.Username,
    a.FullName,
    r.RoleName,
    a.Email,
    a.Phone,
    a.Address,
    a.PortraitURL,
    a.Status,
    sp.StaffID,
    up.UserID,
    c.CustomerID,
    a.CreatedAt
FROM dbo.Accounts a
JOIN dbo.Roles r ON r.RoleID = a.RoleID
LEFT JOIN dbo.Staff sp ON sp.AccountID = a.AccountID
LEFT JOIN dbo.[User] up ON up.AccountID = a.AccountID
LEFT JOIN dbo.Customers c ON c.AccountID = a.AccountID;
GO

CREATE OR ALTER VIEW dbo.vw_CardList
AS
SELECT
    c.CardID,
    c.CardNo,
    c.RFIDUID,
    cg.GroupName,
    cg.VehicleType,
    cg.TicketType,
    v.PlateNo,
    cu.CustomerCode,
    cu.FullName AS CustomerName,
    cu.Address,
    f.FloorCode AS PreferredFloor,
    c.RegisteredAt,
    c.EffectiveFrom,
    c.ExpireAt,
    c.Status,
    c.Note
FROM dbo.Cards c
JOIN dbo.CardGroups cg ON cg.CardGroupID = c.CardGroupID
LEFT JOIN dbo.Customers cu ON cu.CustomerID = c.CustomerID
LEFT JOIN dbo.Vehicles v ON v.VehicleID = c.VehicleID
LEFT JOIN dbo.Floors f ON f.FloorID = c.PreferredFloorID;
GO

CREATE OR ALTER VIEW dbo.vw_VehicleEntryExitReport
AS
SELECT
    pt.TicketID,
    pt.TicketNo,
    c.CardNo,
    pt.PlateNoSnapshot AS PlateNo,
    pt.VehicleType,
    pt.TicketType,
    f.FloorCode,
    pt.CheckInAt,
    pt.CheckOutAt,
    DATEDIFF(MINUTE, pt.CheckInAt, COALESCE(pt.CheckOutAt, SYSDATETIME())) AS ParkingMinutes,
    pt.FeeAmount,
    entryLane.LaneName AS EntryLane,
    exitLane.LaneName AS ExitLane,
    entryAccount.Username AS EntryStaff,
    exitAccount.Username AS ExitStaff,
    pt.Status
FROM dbo.ParkingTickets pt
LEFT JOIN dbo.Cards c ON c.CardID = pt.CardID
JOIN dbo.Floors f ON f.FloorID = pt.EntryFloorID
JOIN dbo.Lanes entryLane ON entryLane.LaneID = pt.EntryLaneID
LEFT JOIN dbo.Lanes exitLane ON exitLane.LaneID = pt.ExitLaneID
JOIN dbo.Staff entryStaff ON entryStaff.StaffID = pt.EntryStaffID
JOIN dbo.Accounts entryAccount ON entryAccount.AccountID = entryStaff.AccountID
LEFT JOIN dbo.Staff exitStaff ON exitStaff.StaffID = pt.ExitStaffID
LEFT JOIN dbo.Accounts exitAccount ON exitAccount.AccountID = exitStaff.AccountID;
GO

IF OBJECT_ID(N'dbo.ViolationRules', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ViolationRules (
        RuleID              VARCHAR(50) PRIMARY KEY,
        RuleName            NVARCHAR(100) NOT NULL,
        TicketType          VARCHAR(20) NOT NULL,
        VehicleType         VARCHAR(20) NOT NULL,
        MaxDurationHours    INT NOT NULL CONSTRAINT DF_ViolationRules_MaxDuration DEFAULT 0,
        PenaltyPerHour      DECIMAL(18,2) NOT NULL CONSTRAINT DF_ViolationRules_Penalty DEFAULT 0,
        Description         NVARCHAR(500) NOT NULL,
        IsActive            BIT NOT NULL CONSTRAINT DF_ViolationRules_IsActive DEFAULT 1,
        CreatedAt           DATETIME2(0) NOT NULL CONSTRAINT DF_ViolationRules_CreatedAt DEFAULT SYSDATETIME(),
        UpdatedAt           DATETIME2(0) NOT NULL CONSTRAINT DF_ViolationRules_UpdatedAt DEFAULT SYSDATETIME(),
        CONSTRAINT CK_ViolationRules_TicketType CHECK (TicketType IN ('SINGLE', 'DAY', 'MONTHLY')),
        CONSTRAINT CK_ViolationRules_VehicleType CHECK (VehicleType IN ('MOTORCYCLE', 'CAR')),
        CONSTRAINT CK_ViolationRules_Duration CHECK (MaxDurationHours >= 0),
        CONSTRAINT CK_ViolationRules_Penalty CHECK (PenaltyPerHour >= 0)
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.ViolationRules WHERE RuleID = 'RULE_SINGLE_MOTO')
    INSERT dbo.ViolationRules(RuleID, RuleName, TicketType, VehicleType, MaxDurationHours, PenaltyPerHour, Description)
    VALUES ('RULE_SINGLE_MOTO', N'Thẻ lượt xe máy quá giờ', 'SINGLE', 'MOTORCYCLE', 6, 10000, N'Áp dụng cho thẻ lượt xe máy đỗ quá 6 giờ kể từ thời điểm check-in. Phạt 10.000đ cho mỗi giờ quá hạn tiếp theo.');

IF NOT EXISTS (SELECT 1 FROM dbo.ViolationRules WHERE RuleID = 'RULE_SINGLE_CAR')
    INSERT dbo.ViolationRules(RuleID, RuleName, TicketType, VehicleType, MaxDurationHours, PenaltyPerHour, Description)
    VALUES ('RULE_SINGLE_CAR', N'Thẻ lượt ô tô quá giờ', 'SINGLE', 'CAR', 6, 50000, N'Áp dụng cho thẻ lượt ô tô đỗ quá 6 giờ kể từ thời điểm check-in. Phạt 50.000đ cho mỗi giờ quá hạn tiếp theo.');

IF NOT EXISTS (SELECT 1 FROM dbo.ViolationRules WHERE RuleID = 'RULE_DAY_EXPIRED_MOTO')
    INSERT dbo.ViolationRules(RuleID, RuleName, TicketType, VehicleType, MaxDurationHours, PenaltyPerHour, Description)
    VALUES ('RULE_DAY_EXPIRED_MOTO', N'Thẻ ngày hết hạn khi checkout (Xe máy)', 'DAY', 'MOTORCYCLE', 0, 10000, N'Áp dụng khi thẻ ngày xe máy bị hết hạn tại thời điểm check-out. Tính phạt 10.000đ cho mỗi giờ quá hạn kể từ mốc hết hiệu lực.');

IF NOT EXISTS (SELECT 1 FROM dbo.ViolationRules WHERE RuleID = 'RULE_DAY_EXPIRED_CAR')
    INSERT dbo.ViolationRules(RuleID, RuleName, TicketType, VehicleType, MaxDurationHours, PenaltyPerHour, Description)
    VALUES ('RULE_DAY_EXPIRED_CAR', N'Thẻ ngày hết hạn khi checkout (Ô tô)', 'DAY', 'CAR', 0, 50000, N'Áp dụng khi thẻ ngày ô tô bị hết hạn tại thời điểm check-out. Tính phạt 50.000đ cho mỗi giờ quá hạn kể từ mốc hết hiệu lực.');

IF NOT EXISTS (SELECT 1 FROM dbo.ViolationRules WHERE RuleID = 'RULE_MONTHLY_EXPIRED_MOTO')
    INSERT dbo.ViolationRules(RuleID, RuleName, TicketType, VehicleType, MaxDurationHours, PenaltyPerHour, Description)
    VALUES ('RULE_MONTHLY_EXPIRED_MOTO', N'Thẻ tháng hết hạn khi checkout (Xe máy)', 'MONTHLY', 'MOTORCYCLE', 0, 10000, N'Áp dụng khi thẻ tháng xe máy đã hết hạn tại thời điểm check-out. Tính phạt 10.000đ cho mỗi giờ quá hạn kể từ mốc hết hiệu lực.');

IF NOT EXISTS (SELECT 1 FROM dbo.ViolationRules WHERE RuleID = 'RULE_MONTHLY_EXPIRED_CAR')
    INSERT dbo.ViolationRules(RuleID, RuleName, TicketType, VehicleType, MaxDurationHours, PenaltyPerHour, Description)
    VALUES ('RULE_MONTHLY_EXPIRED_CAR', N'Thẻ tháng hết hạn khi checkout (Ô tô)', 'MONTHLY', 'CAR', 0, 50000, N'Áp dụng khi thẻ tháng ô tô đã hết hạn tại thời điểm check-out. Tính phạt 50.000đ cho mỗi giờ quá hạn kể từ mốc hết hiệu lực.');
GO

CREATE OR ALTER VIEW dbo.vw_FloorAvailability
AS
SELECT
    f.FloorID,
    f.FloorCode,
    f.FloorName,
    f.VehicleType,
    f.TotalSlots,
    SUM(CASE WHEN ps.Status = 'AVAILABLE' THEN 1 ELSE 0 END) AS AvailableSlots,
    SUM(CASE WHEN ps.Status = 'RESERVED' THEN 1 ELSE 0 END) AS ReservedSlots,
    SUM(CASE WHEN ps.Status = 'OCCUPIED' THEN 1 ELSE 0 END) AS OccupiedSlots,
    SUM(CASE WHEN ps.Status = 'DISABLED' THEN 1 ELSE 0 END) AS DisabledSlots
FROM dbo.Floors f
LEFT JOIN dbo.ParkingSlots ps ON ps.FloorID = f.FloorID
GROUP BY f.FloorID, f.FloorCode, f.FloorName, f.VehicleType, f.TotalSlots;
GO

/* Validate required sample profiles before reporting success. */
IF NOT EXISTS (
    SELECT 1
    FROM dbo.Admin ad
    JOIN dbo.Accounts a ON a.AccountID = ad.AccountID
    WHERE a.Username = 'admin'
)
    THROW 50001, N'Không tạo được hồ sơ Admin cho tài khoản admin.', 1;

IF EXISTS (
    SELECT v.Username
    FROM (VALUES ('staff01'), ('staff02')) v(Username)
    WHERE NOT EXISTS (
        SELECT 1
        FROM dbo.Staff s
        JOIN dbo.Accounts a ON a.AccountID = s.AccountID
        WHERE a.Username = v.Username
    )
)
    THROW 50002, N'Không tạo đủ hồ sơ Staff mẫu.', 1;

IF EXISTS (
    SELECT v.Username
    FROM (VALUES ('user01'), ('user02')) v(Username)
    WHERE NOT EXISTS (
        SELECT 1
        FROM dbo.[User] u
        JOIN dbo.Accounts a ON a.AccountID = u.AccountID
        WHERE a.Username = v.Username
    )
)
    THROW 50003, N'Không tạo đủ hồ sơ User mẫu.', 1;

PRINT N'ParkingManagementDB đã được tạo/cập nhật thành công.';
PRINT N'Tài khoản mẫu: admin, staff01, staff02, user01, user02';
PRINT N'Mật khẩu chung: 123456';
GO