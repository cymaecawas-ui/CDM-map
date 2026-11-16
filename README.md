# Colegio de Montalban Campus Map

The site uses the supplied four floor plans, PHP JSON endpoints, and MySQL for room and schedule data. It does not create class schedule records: actual schedules must be entered by an authorized administrator.

## Requirements

- PHP 8.1+ with PDO MySQL enabled (`pdo_mysql`)
- MySQL 8.0.16+ (for enforced `CHECK` constraints)
- Apache with PHP, or PHP's built-in development server

## Local setup with XAMPP

1. Copy this project folder into `C:\xampp\htdocs\cdm-campus` (or configure an Apache virtual host for this folder).
2. Start Apache and MySQL in XAMPP.
3. Open phpMyAdmin, select **Import**, and run `supabase/schema.sql`. Despite its historic directory name, this file now contains MySQL 8 SQL, not Supabase/PostgreSQL SQL.
4. Import `database/seed/rooms.sql` (also available as `database/seed-rooms.sql`). It inserts the 71 room and facility shapes read from the supplied map images. It intentionally contains no class schedules.
5. Create a dedicated MySQL application user and grant only the required privileges. Run this while signed in as a MySQL administrator:

   ```sql
   CREATE USER 'cdm_app'@'localhost' IDENTIFIED BY 'use-a-long-unique-password';
   GRANT SELECT, INSERT, UPDATE, DELETE ON cdm_map.* TO 'cdm_app'@'localhost';
   FLUSH PRIVILEGES;
   ```

6. Copy `api/config.example.php` to `api/config.local.php`. Put the database username and password in that local copy. The local config is ignored by Git and blocked from direct HTTP requests by `api/.htaccess`.
7. Create an administrator from a terminal opened at the project folder:

   ```text
   php api/create-admin.php campus-admin
   ```

   The script prompts for a password and stores a PHP password hash. Password input is visible while typing in this simple CLI script; run it locally and do not reuse another account's password.

8. Open `http://localhost/cdm-campus/`. Sign in through **Admin login** to add the school's real schedule records.

For PHP's built-in development server instead of XAMPP, run `php -S 127.0.0.1:8000 -t .` from the project folder and visit `http://127.0.0.1:8000/`. This is for local development; use Apache or another PHP-capable server for deployment. `node server.js` only serves static files and cannot run this PHP application.

## API endpoints

- `GET /api/session.php` returns the current admin session state.
- `GET /api/rooms.php?floor=1` returns published rooms. Signed-in administrators can also read unpublished rooms.
- `POST /api/rooms.php`, `PUT /api/rooms.php?id=...`, and `DELETE /api/rooms.php?id=...` manage rooms and require an administrator session plus CSRF token.
- `GET /api/schedules.php?q=...&day=0` returns published schedules, joined with room, subject, teacher, and section details. Days use `0=Monday` through `4=Friday` in the browser API.
- `POST /api/schedules.php`, `PUT /api/schedules.php?id=...`, and `DELETE /api/schedules.php?id=...` manage schedules. Writes validate time ranges and reject room overlaps inside a transaction.
- `POST /api/login.php` and `POST /api/logout.php` start/end the PHP administrator session.

`src/main.js` fetches rooms and schedules at startup. It now displays a database error with a Retry action if the API cannot connect. Room overlay coordinates are stored in `rooms.polygon` as `{ "x": ..., "y": ..., "w": ..., "h": ... }` rectangles in the original 1920×1080 plan coordinate space.

## Security and production notes

- Never put MySQL credentials in JavaScript or commit `api/config.local.php`.
- The PHP endpoints use PDO prepared statements, PHP password verification, HttpOnly/SameSite session cookies, CSRF tokens for admin writes, and server-side admin checks.
- MySQL does not have the PostgreSQL row-level-security policies from the old Supabase draft. The PHP API is the access-control boundary; do not expose MySQL directly to browsers.
- The MySQL schema has foreign keys and time/day checks. The schedule endpoint serializes writes by locking a room row, then rejects any overlapping schedule in that room/day. Keep schedule writes going through the API.
- This starter has no real schedule records. Add approved school data before using the student timetable or occupancy display as an authoritative source.
- Room edit/add forms are intentionally basic; map coordinates for a newly added room must be entered in the image's 1920×1080 coordinate system.

## Files

- `index.php` — browser app shell
- `src/main.js` — map, schedule search, room status, and API client
- `api/` — PHP endpoints and database/session helpers
- `supabase/schema.sql` — MySQL schema (historic filename only)
- `database/seed/rooms.sql` — room inventory and overlay geometry; no schedules
- `database/generate-room-seed.mjs` — regenerates the room seed from the coordinate definitions in `src/main.js`
- `public/floor-plans/` — supplied maps
