-- Ghumfir: Nepal travel planner schema (MySQL 8+)

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('traveler','admin') NOT NULL DEFAULT 'traveler',
  home_city_id INT NULL,
  location VARCHAR(150) NOT NULL DEFAULT '',
  avatar_url VARCHAR(500) NOT NULL DEFAULT '',
  interests VARCHAR(255) NOT NULL DEFAULT '',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  is_verified TINYINT(1) NOT NULL DEFAULT 1,
  verify_token VARCHAR(255) NULL,
  reset_token VARCHAR(255) NULL,
  reset_expires DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE destinations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  name_np VARCHAR(100) NOT NULL DEFAULT '',
  province VARCHAR(60) NOT NULL,
  tagline VARCHAR(160) NOT NULL DEFAULT '',
  description TEXT NOT NULL,
  lat DECIMAL(9,6) NOT NULL,
  lng DECIMAL(9,6) NOT NULL,
  altitude_m INT NOT NULL DEFAULT 0,
  tags VARCHAR(255) NOT NULL DEFAULT '',
  best_months VARCHAR(40) NOT NULL DEFAULT '',
  min_days TINYINT NOT NULL DEFAULT 1,
  ideal_days TINYINT NOT NULL DEFAULT 2,
  daily_food_cost INT NOT NULL DEFAULT 1000,
  has_airport TINYINT(1) NOT NULL DEFAULT 0,
  access_factor DECIMAL(3,2) NOT NULL DEFAULT 1.00,
  image_url VARCHAR(500) NOT NULL DEFAULT '',
  image_credit VARCHAR(255) NOT NULL DEFAULT '',
  is_start_city TINYINT(1) NOT NULL DEFAULT 0,
  permit_fee INT NOT NULL DEFAULT 0,
  permit_note VARCHAR(200) NOT NULL DEFAULT '',
  weather_risk TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Known road links (real-world km / hours). Pairs not listed fall back to a
-- haversine x winding-factor estimate in the planner.
CREATE TABLE road_links (
  from_id INT NOT NULL,
  to_id INT NOT NULL,
  road_km INT NOT NULL,
  road_hours DECIMAL(4,1) NOT NULL,
  note VARCHAR(200) NOT NULL DEFAULT '',
  PRIMARY KEY (from_id, to_id),
  FOREIGN KEY (from_id) REFERENCES destinations(id) ON DELETE CASCADE,
  FOREIGN KEY (to_id) REFERENCES destinations(id) ON DELETE CASCADE
) ENGINE=InnoDB;

ALTER TABLE users ADD CONSTRAINT fk_users_home FOREIGN KEY (home_city_id) REFERENCES destinations(id) ON DELETE SET NULL;

CREATE TABLE attractions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  destination_id INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  category VARCHAR(40) NOT NULL,
  description VARCHAR(400) NOT NULL DEFAULT '',
  entry_fee INT NOT NULL DEFAULT 0,
  duration_hours DECIMAL(3,1) NOT NULL DEFAULT 1.0,
  rating DECIMAL(2,1) NOT NULL DEFAULT 4.0,
  lat DECIMAL(9,6) NOT NULL,
  lng DECIMAL(9,6) NOT NULL,
  FOREIGN KEY (destination_id) REFERENCES destinations(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE hotels (
  id INT AUTO_INCREMENT PRIMARY KEY,
  destination_id INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  tier ENUM('budget','standard','premium') NOT NULL,
  price_per_night INT NOT NULL,
  rating DECIMAL(2,1) NOT NULL DEFAULT 4.0,
  amenities VARCHAR(255) NOT NULL DEFAULT '',
  image_url VARCHAR(500) NOT NULL DEFAULT '',
  image_credit VARCHAR(255) NOT NULL DEFAULT '',
  FOREIGN KEY (destination_id) REFERENCES destinations(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  destination_id INT NOT NULL,
  rating TINYINT NOT NULL,
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_review (user_id, destination_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (destination_id) REFERENCES destinations(id) ON DELETE CASCADE,
  CHECK (rating BETWEEN 1 AND 5)
) ENGINE=InnoDB;

CREATE TABLE wishlist (
  user_id INT NOT NULL,
  destination_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, destination_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (destination_id) REFERENCES destinations(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE trips (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(150) NOT NULL,
  start_city_id INT NOT NULL,
  start_date DATE NULL,
  days TINYINT NOT NULL,
  budget INT NOT NULL,
  travelers TINYINT NOT NULL DEFAULT 1,
  style ENUM('budget','standard','premium') NOT NULL DEFAULT 'standard',
  interests VARCHAR(255) NOT NULL DEFAULT '',
  total_cost INT NOT NULL,
  plan_json JSON NOT NULL,
  share_code CHAR(10) NOT NULL UNIQUE,
  is_public TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (start_city_id) REFERENCES destinations(id)
) ENGINE=InnoDB;

-- Normalised stop list, used for "travellers also visited" (collaborative filtering)
CREATE TABLE trip_destinations (
  trip_id INT NOT NULL,
  destination_id INT NOT NULL,
  position TINYINT NOT NULL,
  nights TINYINT NOT NULL DEFAULT 1,
  PRIMARY KEY (trip_id, destination_id),
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
  FOREIGN KEY (destination_id) REFERENCES destinations(id) ON DELETE CASCADE
) ENGINE=InnoDB;
