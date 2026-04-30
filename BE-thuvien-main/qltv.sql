-- Tạo Database (nếu chưa có)
CREATE DATABASE IF NOT EXISTS qltv CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE qltv;

-- =======================================================
-- 1. BẢNG NGƯỜI DÙNG (core_user)
-- =======================================================
CREATE TABLE `core_user` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `password` VARCHAR(128) NOT NULL,
  `last_login` DATETIME(6) DEFAULT NULL,
  `is_superuser` TINYINT(1) NOT NULL DEFAULT 0,
  `username` VARCHAR(150) NOT NULL UNIQUE,
  `first_name` VARCHAR(150) NOT NULL,
  `last_name` VARCHAR(150) NOT NULL,
  `email` VARCHAR(254) NOT NULL,
  `is_staff` TINYINT(1) NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `date_joined` DATETIME(6) NOT NULL,
  `full_name` VARCHAR(255) DEFAULT NULL,
  `address` LONGTEXT DEFAULT NULL,
  `phone` VARCHAR(20) DEFAULT NULL,
  `date_of_birth` DATE DEFAULT NULL,
  `role` VARCHAR(20) DEFAULT NULL,
  PRIMARY KEY (`id`)
);

-- =======================================================
-- 2. BẢNG THỂ LOẠI SÁCH (books_category)
-- =======================================================
CREATE TABLE `books_category` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `note` LONGTEXT DEFAULT NULL,
  PRIMARY KEY (`id`)
);

-- =======================================================
-- 3. BẢNG SÁCH (books_book)
-- =======================================================
CREATE TABLE `books_book` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(255) NOT NULL,
  `published_year` INT DEFAULT NULL,
  `publisher` VARCHAR(255) DEFAULT NULL,
  `description` LONGTEXT DEFAULT NULL,
  `total_quantity` INT NOT NULL,
  `available_quantity` INT NOT NULL,
  `cover_image` VARCHAR(100) DEFAULT NULL,
  `category_id` BIGINT NOT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`category_id`) REFERENCES `books_category`(`id`) ON DELETE CASCADE
);

-- =======================================================
-- 4. BẢNG KHU VỰC THƯ VIỆN (library_zone)
-- =======================================================
CREATE TABLE `library_zone` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `description` LONGTEXT DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`)
);

-- =======================================================
-- 5. BẢNG GHẾ NGỒI (library_seat)
-- =======================================================
CREATE TABLE `library_seat` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `seat_number` VARCHAR(10) NOT NULL,
  `is_maintainance` TINYINT(1) NOT NULL DEFAULT 0,
  `zone_id` BIGINT NOT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`zone_id`) REFERENCES `library_zone`(`id`) ON DELETE CASCADE
);

-- =======================================================
-- 6. BẢNG PHIẾU MƯỢN TRẢ (loans_loan)
-- =======================================================
CREATE TABLE `loans_loan` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `borrow_date` DATE NOT NULL,
  `due_date` DATE NOT NULL,
  `return_date` DATE DEFAULT NULL,
  `status` VARCHAR(20) NOT NULL,
  `user_id` BIGINT NOT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`user_id`) REFERENCES `core_user`(`id`) ON DELETE CASCADE
);

-- =======================================================
-- 7. BẢNG CHI TIẾT MƯỢN TRẢ (loans_loandetail)
-- =======================================================
CREATE TABLE `loans_loandetail` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `fine_amounts` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `quantity` INT NOT NULL DEFAULT 1,
  `book_id` BIGINT NOT NULL,
  `loan_id` BIGINT NOT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`book_id`) REFERENCES `books_book`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`loan_id`) REFERENCES `loans_loan`(`id`) ON DELETE CASCADE
);

-- =======================================================
-- 8. BẢNG ĐẶT CHỖ NGỒI (library_seatreservation)
-- =======================================================
CREATE TABLE `library_seatreservation` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `date` DATE NOT NULL,
  `start_time` TIME NOT NULL,
  `end_time` TIME NOT NULL,
  `status` VARCHAR(20) NOT NULL,
  `seat_id` BIGINT NOT NULL,
  `user_id` BIGINT NOT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`seat_id`) REFERENCES `library_seat`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `core_user`(`id`) ON DELETE CASCADE
);