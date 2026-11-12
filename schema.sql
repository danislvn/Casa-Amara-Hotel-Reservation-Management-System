-- =============================================================================
-- Casa Amara Boutique Hotel — MySQL Database Schema & Seed Data
-- =============================================================================

SET @OLD_FOREIGN_KEY_CHECKS = @@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS = 0;

-- 1. Create Database
CREATE DATABASE IF NOT EXISTS casa_amara_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE casa_amara_db;

-- 2. Staff Users Table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(150),
  status VARCHAR(20) DEFAULT 'ACTIVE',
  last_signin VARCHAR(50) DEFAULT 'Never',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2b. Activity Logs Table (Append-only Audit Trail)
CREATE TABLE IF NOT EXISTS activity_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  date_time VARCHAR(50) NOT NULL,
  user_name VARCHAR(100) NOT NULL,
  user_email VARCHAR(150) NOT NULL,
  action VARCHAR(100) NOT NULL,
  affected_record VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  outcome VARCHAR(50) NOT NULL DEFAULT 'SUCCESSFUL',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Room Inventory Table
CREATE TABLE IF NOT EXISTS rooms (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  tagline VARCHAR(255),
  rate_per_night DECIMAL(10, 2) NOT NULL,
  max_guests INT NOT NULL DEFAULT 2,
  bed_config VARCHAR(100),
  room_number VARCHAR(50),
  floor_number VARCHAR(50),
  room_size VARCHAR(50),
  view VARCHAR(100),
  badge VARCHAR(50),
  inventory_units INT NOT NULL DEFAULT 5,
  available_units INT NOT NULL DEFAULT 5,
  status ENUM('available', 'maintenance', 'hidden') DEFAULT 'available',
  featured BOOLEAN DEFAULT FALSE,
  amenities JSON,
  image LONGBLOB,
  date_posted DATE DEFAULT (CURRENT_DATE),
  posted_by VARCHAR(100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Reservations Table
CREATE TABLE IF NOT EXISTS reservations (
  reference_id VARCHAR(30) PRIMARY KEY,
  guest_name VARCHAR(120) NOT NULL,
  email VARCHAR(150) NOT NULL,
  phone VARCHAR(40) NOT NULL,
  room_type_id VARCHAR(50) NOT NULL,
  room_name VARCHAR(100) NOT NULL,
  room_number VARCHAR(50),
  check_in VARCHAR(30) NOT NULL,
  check_out VARCHAR(30) NOT NULL,
  nights INT NOT NULL,
  guests INT NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  payment_status VARCHAR(50) DEFAULT 'Deposit paid',
  special_requests TEXT,
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (room_type_id) REFERENCES rooms(id) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Seed Staff Accounts (Pass: 'casaamara2026' with SHA-256)
INSERT INTO users (username, password_hash, role, full_name, email, status, last_signin) VALUES
('manager', '290698401e58d12f22e8a4107f4e77c0240f5d306d991d5a7b39f010a968b168', 'Manager', 'Casa Amara Manager', 'manager@casaamara.ph', 'ACTIVE', 'Oct 20, 2026, 9:41 PM'),
('admin', '290698401e58d12f22e8a4107f4e77c0240f5d306d991d5a7b39f010a968b168', 'Admin', 'Casa Amara Administrator', 'admin@casaamara.ph', 'ACTIVE', 'Never')
ON DUPLICATE KEY UPDATE username=username;

-- 5b. Seed Initial Activity Logs
INSERT INTO activity_logs (date_time, user_name, user_email, action, affected_record, description, outcome) VALUES
('Oct 20, 2026, 9:41 PM', 'Casa Amara Manager', 'manager@casaamara.ph', 'Staff login', 'Authentication', 'Casa Amara Manager signed in.', 'SUCCESSFUL'),
('Oct 20, 2026, 9:41 PM', 'Casa Amara Manager', 'manager@casaamara.ph', 'Staff login', 'Authentication', 'Casa Amara Manager signed in.', 'SUCCESSFUL')
ON DUPLICATE KEY UPDATE id=id;

-- 6. Seed Rooms Catalog
INSERT INTO rooms (id, name, tagline, rate_per_night, max_guests, bed_config, room_number, floor_number, room_size, view, badge, inventory_units, available_units, status, featured, amenities, image, posted_by) VALUES
('deluxe', 'Deluxe Room', 'Refined quietude overlooking the courtyard garden.', 8200.00, 2, '1 King Bed', '101 - 108', '1st Floor (Garden Wing)', '50 m²', 'Courtyard Garden', 'Popular', 8, 6, 'available', TRUE, '["Courtyard garden view", "Walk-in rain shower", "Nespresso coffee bar", "Complimentary Wi-Fi", "Custom bathrobes & slippers", "4K Smart TV"]', 'assets/images/deluxe-room.jpg', 'Front Desk Manager'),
('executive', 'Executive Room', 'Elevated comfort with private terrace and bespoke work alcove.', 11500.00, 3, '1 King Bed & Daybed', '701 - 705', '7th Floor (Skyline Wing)', '48 m²', 'City Skyline & Garden', 'Signature', 5, 4, 'available', TRUE, '["Private outdoor terrace", "Deep soaking marble tub", "Evening turndown service", "Dedicated workspace alcove", "Complimentary mini-bar selection", "Complimentary Wi-Fi"]', 'assets/images/executive-room.jpg', 'Casa Amara Manager'),
('family', 'Family Room', 'Spacious dual-chamber retreat designed for families and group travelers.', 9800.00, 5, '2 Queen Beds', '401 - 408', '4th Floor (Courtyard Wing)', '56 m²', 'Courtyard & Pool', 'Spacious', 6, 5, 'available', FALSE, '["Two queen beds", "Courtyard view", "Complimentary breakfast for four", "En-suite double vanity bathroom", "Children welcome amenities", "Complimentary Wi-Fi"]', 'assets/images/family-room.jpg', 'Casa Amara Manager'),
('premium', 'Premium Suite', 'The pinnacle of Casa Amara luxury with expansive living salon and butler pantry.', 14500.00, 5, '1 King Bed & Sofa Bed', '1001 - 1003', '10th Floor (Penthouse Wing)', '72 m²', 'Panoramic Ocean & Garden', 'Luxury', 3, 2, 'available', TRUE, '["Panoramic ocean view", "Separate living salon", "Marble soaking tub with views", "Complimentary airport transfer", "Private butler service", "Complimentary Wi-Fi"]', 'assets/images/premium-suite.jpg', 'Casa Amara Manager')
ON DUPLICATE KEY UPDATE
  name=VALUES(name),
  tagline=VALUES(tagline),
  rate_per_night=VALUES(rate_per_night),
  max_guests=VALUES(max_guests),
  bed_config=VALUES(bed_config),
  room_number=VALUES(room_number),
  floor_number=VALUES(floor_number),
  room_size=VALUES(room_size),
  view=VALUES(view),
  badge=VALUES(badge),
  inventory_units=VALUES(inventory_units),
  available_units=VALUES(available_units),
  status=VALUES(status),
  featured=VALUES(featured),
  amenities=VALUES(amenities),
  image=VALUES(image),
  posted_by=VALUES(posted_by);

SET FOREIGN_KEY_CHECKS = @OLD_FOREIGN_KEY_CHECKS;
