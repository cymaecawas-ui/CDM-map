-- MySQL 8.0.16+ schema. Filename retained for existing project references;
-- this is no longer a Supabase/PostgreSQL script.
CREATE DATABASE IF NOT EXISTS cdm_map CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE cdm_map;

CREATE TABLE IF NOT EXISTS floors (
  id TINYINT UNSIGNED PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  plan_path VARCHAR(255) NOT NULL,
  CONSTRAINT floors_id_range CHECK (id BETWEEN 1 AND 4)
) ENGINE=InnoDB;

INSERT INTO floors (id,name,plan_path) VALUES
 (1,'First Floor','/floor-plans/floor-1.png'),
 (2,'Second Floor','/floor-plans/floor-2.png'),
 (3,'Third Floor','/floor-plans/floor-3.png'),
 (4,'Fourth Floor','/floor-plans/floor-4.png')
ON DUPLICATE KEY UPDATE name=VALUES(name),plan_path=VALUES(plan_path);

CREATE TABLE IF NOT EXISTS rooms (
  id VARCHAR(100) PRIMARY KEY,
  room_name VARCHAR(150) NOT NULL,
  room_number VARCHAR(50) NULL,
  floor_id TINYINT UNSIGNED NOT NULL,
  building VARCHAR(150) NOT NULL DEFAULT 'Colegio de Montalban',
  room_type VARCHAR(40) NOT NULL DEFAULT 'Classroom',
  capacity INT UNSIGNED NULL,
  description TEXT NOT NULL,
  polygon JSON NOT NULL,
  published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT rooms_floor_fk FOREIGN KEY (floor_id) REFERENCES floors(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS teachers (
  id VARCHAR(100) PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(255) NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE KEY uq_teacher_name (full_name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS subjects (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  code VARCHAR(40) NULL,
  UNIQUE KEY uq_subject_name (name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sections (
  id VARCHAR(100) PRIMARY KEY,
  grade_level VARCHAR(40) NOT NULL,
  section_name VARCHAR(100) NOT NULL,
  UNIQUE KEY uq_grade_section (grade_level, section_name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS administrators (
  id VARCHAR(100) PRIMARY KEY,
  username VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE KEY uq_admin_username (username)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS schedules (
  id VARCHAR(100) PRIMARY KEY,
  room_id VARCHAR(100) NOT NULL,
  teacher_id VARCHAR(100) NOT NULL,
  subject_id VARCHAR(100) NOT NULL,
  section_id VARCHAR(100) NOT NULL,
  day_of_week TINYINT UNSIGNED NOT NULL COMMENT '1=Monday through 5=Friday',
  starts_at TIME NOT NULL,
  ends_at TIME NOT NULL,
  published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT schedules_day_range CHECK (day_of_week BETWEEN 1 AND 5),
  CONSTRAINT schedules_time_order CHECK (ends_at > starts_at),
  CONSTRAINT schedules_room_fk FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE RESTRICT,
  CONSTRAINT schedules_teacher_fk FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE RESTRICT,
  CONSTRAINT schedules_subject_fk FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE RESTRICT,
  CONSTRAINT schedules_section_fk FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE RESTRICT,
  INDEX schedules_room_day_time (room_id,day_of_week,starts_at,ends_at),
  INDEX schedules_teacher_day (teacher_id,day_of_week),
  INDEX schedules_section_day (section_id,day_of_week),
  INDEX schedules_subject_day (subject_id,day_of_week)
) ENGINE=InnoDB;

-- MySQL has no PostgreSQL-style exclusion constraint. The PHP schedule endpoint
-- serializes room changes with a transaction and rejects overlapping time ranges.
