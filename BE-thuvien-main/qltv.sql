CREATE qltv;
USE qltv;

CREATE TABLE Category (
    CategoryID VARCHAR(50) PRIMARY KEY,
    TenTheLoai NVARCHAR(255) NOT NULL,
    ChuThich NVARCHAR(500)
);


CREATE TABLE User (
    UserID VARCHAR(50) PRIMARY KEY,
    HoVaTen NVARCHAR(255) NOT NULL,
    ChucVu NVARCHAR(50),
    DiaChi NVARCHAR(500),
    SoDienThoai VARCHAR(20),
    NgaySinh DATE,
    Email VARCHAR(255)
);


CREATE TABLE Zone (
    id VARCHAR(50) PRIMARY KEY,
    name NVARCHAR(255) NOT NULL,
    description NVARCHAR(500),
    is_active BIT DEFAULT 1 -- Dùng BIT (1/0) cho SQL Server hoặc BOOLEAN cho MySQL/PostgreSQL
);


CREATE TABLE Book (
    BookID VARCHAR(50) PRIMARY KEY,
    TenSach NVARCHAR(255) NOT NULL,
    NamXuatBan INT,
    NhaXuatBan NVARCHAR(255),
    MoTa VARCHAR(1000),-- Dùng NVARCHAR(MAX) hoặc TEXT để lưu mô tả dài
    CategoryID VARCHAR(50),
    FOREIGN KEY (CategoryID) REFERENCES Category(CategoryID)
);


CREATE TABLE Seat (
    id VARCHAR(50) PRIMARY KEY,
    zone_id VARCHAR(50),
    seat_number VARCHAR(20) NOT NULL,
    is_maintainance BIT DEFAULT 0, -- 1: Đang bảo trì, 0: Bình thường
    FOREIGN KEY (zone_id) REFERENCES Zone(id)
);


CREATE TABLE Loan (
    LoanID VARCHAR(50) PRIMARY KEY,
    UserID VARCHAR(50),
    NgayMuon DATE,
    NgayDenHan DATE,
    NgayTra DATE,
    TrangThai NVARCHAR(50) CHECK (TrangThai IN (N'Đang mượn', N'Đã trả', N'Quá hạn')),
    FOREIGN KEY (UserID) REFERENCES User(UserID)
);


CREATE TABLE LoanDetail (
    LoanDetailID VARCHAR(50) PRIMARY KEY,
    LoanID VARCHAR(50),
    BookID VARCHAR(50),
    TienPhat DECIMAL(18,2), -- Khuyến nghị dùng DECIMAL cho tiền tệ thay vì FLOAT
    FOREIGN KEY (LoanID) REFERENCES Loan(LoanID),
    FOREIGN KEY (BookID) REFERENCES Book(BookID)
);


CREATE TABLE SeatReservation (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50),
    seat_id VARCHAR(50),
    date DATE,
    start_time TIME,
    end_time TIME,
    status NVARCHAR(50) CHECK (status IN (N'Đã đặt', N'Đang ngồi', N'Đã rời đi', N'Hủy')),
    FOREIGN KEY (user_id) REFERENCES User(UserID),
    FOREIGN KEY (seat_id) REFERENCES Seat(id)
);
CREATE TABLE LoanDetail (
    LoanDetailID VARCHAR(50) PRIMARY KEY,
    LoanID VARCHAR(50),
    BookID VARCHAR(50),
    TienPhat DECIMAL(18,2),
    FOREIGN KEY (LoanID) REFERENCES Loan(LoanID),
    FOREIGN KEY (BookID) REFERENCES Book(BookID)
);

-- ==========================================
-- 1. THÊM DỮ LIỆU VÀO CÁC BẢNG ĐỘC LẬP
-- ==========================================

-- Thêm Thể loại
INSERT INTO Category (CategoryID, TenTheLoai, ChuThich)
VALUES 
('CAT01', N'Công nghệ thông tin', N'Sách lập trình, phần mềm, phần cứng'),
('CAT02', N'Văn học trong nước', N'Tiểu thuyết, truyện ngắn Việt Nam');

-- Thêm Người dùng
INSERT INTO User (UserID, HoVaTen, ChucVu, DiaChi, SoDienThoai, NgaySinh, Email)
VALUES 
('U01', N'Nguyễn Văn A', N'Thành viên', N'Hà Nội', '0901234567', '2000-05-15', 'nva@email.com'),
('U02', N'Trần Thị B', N'Thủ thư', N'Hà Nội', '0912345678', '1995-10-20', 'ttb_admin@email.com');

-- Thêm Khu vực
INSERT INTO Zone (id, name, description, is_active)
VALUES 
('Z01', N'Khu tự học yên tĩnh', N'Tầng 1 - Cấm làm ồn', 1),
('Z02', N'Khu thảo luận nhóm', N'Tầng 2 - Có trang bị bảng trắng', 1);

-- ==========================================
-- 2. THÊM DỮ LIỆU VÀO CÁC BẢNG PHỤ THUỘC
-- ==========================================


USE qltv;
INSERT INTO Category (CategoryID, TenTheLoai, ChuThich)
VALUES 
('CAT01', 'Công nghệ thông tin', 'Sách lập trình, phần mềm, phần cứng'),
('CAT02', 'Văn học trong nước', 'Tiểu thuyết, truyện ngắn Việt Nam');

INSERT INTO Book (BookID, TenSach, NamXuatBan, NhaXuatBan, MoTa, CategoryID)
VALUES 
('B01', 'Lập trình SQL Server cơ bản', 2022, 'NXB Giáo Dục', 'Sách hướng dẫn cơ sở dữ liệu', 'CAT01'),
('B02', 'Truyện Kiều', 2018, 'NXB Văn Học', 'Tác phẩm kinh điển của Nguyễn Du', 'CAT02');

INSERT INTO Zone (id, name, description, is_active)
VALUES 
('Z01', 'Khu tự học yên tĩnh', 'Tầng 1 - Cấm làm ồn', 1),
('Z02', 'Khu thảo luận nhóm', 'Tầng 2 - Có trang bị bảng trắng', 1);

INSERT INTO Seat (id, zone_id, seat_number, is_maintainance)
VALUES 
('S01', 'Z01', 'A01', 0),
('S02', 'Z01', 'A02', 0),
('S03', 'Z02', 'B01', 1); 

INSERT INTO User (UserID, HoVaTen, ChucVu, DiaChi, SoDienThoai, NgaySinh, Email)
VALUES 
('U01', 'Nguyễn Văn A', 'Thành viên', 'Hà Nội', '0901234567', '2000-05-15', 'nva@email.com'),
('U02', 'Trần Thị B', 'Thủ thư', 'Hà Nội', '0912345678', '1995-10-20', 'ttb_admin@email.com');

INSERT INTO Loan (LoanID, UserID, NgayMuon, NgayDenHan, NgayTra, TrangThai)
VALUES 
('L01', 'U01', '2024-03-01', '2024-03-15', NULL, 'Đang mượn');

INSERT INTO LoanDetail (LoanDetailID, LoanID, BookID, TienPhat)
VALUES 
('LD01', 'L01', 'B01', 0.00);

INSERT INTO SeatReservation (id, user_id, seat_id, date, start_time, end_time, status)
VALUES 
('SR01', 'U01', 'S01', '2024-03-20', '08:00:00', '11:00:00', 'Đã đặt');