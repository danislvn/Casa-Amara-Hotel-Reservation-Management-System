# Casa Amara Boutique Hotel — Management System & Web Platform
*Personal Project*

A luxury boutique hotel web platform and Python Object-Oriented Hotel Reservation & Inventory Management desktop application.

---

## Features

### 1. Luxury Boutique Web Platform
- **Landing Page (`index.html`)**: Branded navigation, hero section with atmospheric zoom, floating Reserve Direct card, curated room previews, architectural amenities split section, dining & pool showcases, and Glyphs-inspired kinetic footer with font-stretching wave.
- **Rooms & Suites Catalog (`rooms.html`)**: 2x2 room catalog matching Figma specifications with interactive search availability bar and dynamic API catalog synchronization.
- **Interactive View Room Detail Modal**: Split 2-column modal replicating the Figma design with full-bleed photography, amenities checklist, live pricing, and direct booking trigger.
- **6-Step Booking Wizard (`booking.html`)**: Complete multi-step reservation engine (Stay details &rarr; Available rooms &rarr; Guest information &rarr; Review reservation &rarr; Payment simulation &rarr; Confirmation with unique reference ID).
- **Hotel Admin Portal (`admin.html`)**: Property Management System (PMS) accessible at `/admin` for publishing rooms, setting nightly rates, managing inventory units, and monitoring reservations.

### 2. Python OOP Desktop Management System (`main.py`)
- **Object-Oriented Programming (OOP) Compliance**:
  - **Abstraction**: Abstract Base Classes (`BaseRoom`, `AbstractReservationService`, `AbstractRoomService`).
  - **Inheritance & Polymorphism**: Room hierarchy (`DeluxeRoom`, `ExecutiveRoom`, `FamilyRoom`, `PremiumSuite`) with polymorphic rate calculations and custom amenity inclusions.
  - **Encapsulation**: Private/protected attributes with validated `@property` getters and setters.
  - **Method Overloading**: Flexible parameter calculations for custom fees and discounts.
- **Functional Features (CRUD)**:
  - Staff authentication with SHA-256 password hashing.
  - Full CRUD operations for reservations and room inventory.
  - Real-time search and filtering by guest name, reference ID, and room category.
  - Synchronized JSON persistence (`data/reservations.json` & `data/rooms.json`).
- **Graphical User Interface (`Tkinter` / `TTK`)**:
  - Staff login window, main reservations dashboard with styled Treeview tables, and modal dialogs for reservations and room publishing.
  - Custom Casa Amara palette (`#35281F`, `#B59A72`, `#FAF7F2`).
- **Custom Exception Handling**: Custom error hierarchy (`CapacityExceededError`, `InvalidDateError`, `InvalidReservationError`, `ReservationNotFoundError`, `AuthenticationError`).
- **Automated Test Suite**: 6 unit tests in `tests/test_oop_system.py`.

---

## Project Structure

```
casa-amara/
├── index.html                      # Luxury landing page
├── rooms.html                      # 2x2 Rooms catalog
├── booking.html                    # 6-step booking flow
├── admin.html                      # Web Admin & PMS portal (/admin)
├── server.js                       # Node.js static server & REST API
├── main.py                         # Python OOP desktop application
├── css/
│   ├── style.css                   # Casa Amara luxury styling & design system
│   ├── animations.css              # Micro-interactions, reveals, and progress bar
│   └── admin.css                   # Admin portal & PMS styling
├── js/
│   ├── main.js                     # Navigation, kinetic footer, modal & animations
│   ├── booking.js                  # 6-step booking machine & REST API sync
│   └── admin.js                    # Admin PMS management & auth engine
├── assets/
│   └── images/                     # Suite photography & architectural visuals
├── data/
│   ├── rooms.json                  # Room inventory database
│   ├── reservations.json           # Shared reservations database
│   └── users.json                  # Staff user directory (SHA-256)
├── src/
│   ├── exceptions.py               # Custom OOP exception hierarchy
│   ├── models/                     # BaseRoom, room types & reservation models
│   ├── services/                   # AuthService, ReservationManager & RoomManager
│   └── gui/                        # Tkinter theme, login, dashboard & modal dialogs
└── tests/
    └── test_oop_system.py          # Automated unit test suite
```

---

## Getting Started

### 1. Web Application & REST API
Start the local server:
```bash
node server.js
```
- Website: [http://localhost:3000](http://localhost:3000)
- Rooms Catalog: [http://localhost:3000/rooms.html](http://localhost:3000/rooms.html)
- Booking Flow: [http://localhost:3000/booking.html](http://localhost:3000/booking.html)
- Admin Portal: [http://localhost:3000/admin](http://localhost:3000/admin)

### 2. Python Desktop Application
Run the Tkinter GUI:
```bash
python main.py
```

### 3. Run Automated Tests
```bash
python -m unittest discover -s tests -v
```

---

## Staff Login Credentials
- **Username**: `admin`
- **Password**: `casaamara2026`
*(Also available: `staff` / `casaamara2026`)*
>>>>>>> 5bc2395 (feat: complete Casa Amara Boutique Hotel platform with web experience, admin portal, and Python OOP reservation system)
