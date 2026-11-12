"""
Unit tests for Casa Amara Hotel Reservation System
Verifies OOP principles, calculations, exceptions, and CRUD persistence.
"""

import unittest
import os
import shutil
from src.models.base_room import BaseRoom
from src.models.room_types import (
    DeluxeRoom,
    ExecutiveRoom,
    FamilyRoom,
    PremiumSuite,
    ExecutiveGardenSuite,
    MastersVilla,
    CustomRoom,
    get_room_by_id
)
from src.models.reservation import Reservation
from src.services.reservation_manager import ReservationManager
from src.services.auth_service import AuthService
from src.exceptions import (
    CapacityExceededError,
    InvalidReservationError,
    InvalidDateError,
    ReservationNotFoundError,
    AuthenticationError
)


class TestCasaAmaraOOP(unittest.TestCase):
    """Verifies Object-Oriented Design and Business Logic."""

    def test_inheritance_and_polymorphism(self):
        """Verifies room subclasses inherit from BaseRoom and calculate costs polymorphically."""
        deluxe = DeluxeRoom()
        executive = ExecutiveRoom()
        family = FamilyRoom()
        premium = PremiumSuite()
        exec_garden = ExecutiveGardenSuite()
        masters_villa = MastersVilla()
        custom = CustomRoom("ocean-view", "Ocean View", 10000.0, 3)

        self.assertIsInstance(deluxe, BaseRoom)
        self.assertIsInstance(executive, BaseRoom)
        self.assertIsInstance(family, BaseRoom)
        self.assertIsInstance(premium, BaseRoom)
        self.assertIsInstance(exec_garden, BaseRoom)
        self.assertIsInstance(masters_villa, BaseRoom)
        self.assertIsInstance(custom, BaseRoom)

        # 3 nights for Deluxe: (8200 * 3) + 12% = 24600 + 2952 = 27552.0
        self.assertEqual(deluxe.calculate_cost(3, 2), 27552.0)
        # 3 nights for Executive with 2 guests: (11500 * 3) + 12% = 34500 + 4140 = 38640.0
        self.assertEqual(executive.calculate_cost(3, 2), 38640.0)
        # 1 night for Executive Garden Suite with 2 guests: (12500 * 1) + 12% = 14000.0
        self.assertEqual(exec_garden.calculate_cost(1, 2), 14000.0)
        # 3 nights for Master's Villa with 4 guests: (9000 * 3) + 12% = 30240.0
        self.assertEqual(masters_villa.calculate_cost(3, 4), 30240.0)

    def test_room_factory_and_existing_data(self):
        """Verifies get_room_by_id resolves all existing room IDs and loads data/reservations.json."""
        r1 = get_room_by_id("executive-garden-suite")
        self.assertIsInstance(r1, ExecutiveGardenSuite)
        self.assertEqual(r1.room_type_id, "executive-garden-suite")

        r2 = get_room_by_id("master-s-villa")
        self.assertIsInstance(r2, MastersVilla)
        self.assertEqual(r2.room_type_id, "master-s-villa")

        # Verify ReservationManager loads data/reservations.json without throwing exceptions
        mgr = ReservationManager(storage_path="data/reservations.json")
        records = mgr.get_all()
        self.assertGreater(len(records), 0)
        # Verify references exist
        ref_ids = [res.reference_id for res in records]
        self.assertIn("CA-LGSOBQ-4IT", ref_ids)
        self.assertIn("CA-HVYUG0-1ZO", ref_ids)

    def test_capacity_exceeded_exception(self):
        """Verifies custom CapacityExceededError when guest limit exceeded."""
        deluxe = DeluxeRoom()
        with self.assertRaises(CapacityExceededError):
            deluxe.calculate_cost(nights=2, guests=4)

    def test_encapsulation_and_validation(self):
        """Verifies private attribute protection and setter validation."""
        room = DeluxeRoom()
        # Invalid email format
        with self.assertRaises(InvalidReservationError):
            Reservation(
                guest_name="Jane Doe",
                email="invalid-email-address",
                phone="12345",
                room=room,
                check_in="10/27/2026",
                check_out="10/30/2026"
            )

        # Check-out before check-in
        with self.assertRaises(InvalidDateError):
            Reservation(
                guest_name="Jane Doe",
                email="jane@example.com",
                phone="12345",
                room=room,
                check_in="10/30/2026",
                check_out="10/27/2026"
            )

    def test_reservation_crud_and_persistence(self):
        """Verifies CRUD operations and file persistence."""
        test_file = "tests/temp_reservations.json"
        if os.path.exists(test_file):
            os.remove(test_file)

        mgr = ReservationManager(storage_path=test_file)
        self.assertGreater(len(mgr.get_all()), 0)

        # Add
        new_res = Reservation(
            reference_id="CA-TEST01-ABC",
            guest_name="Tester Guest",
            email="tester@test.com",
            phone="+63 999 111 2222",
            room=DeluxeRoom(),
            check_in="10/27/2026",
            check_out="10/29/2026",
            guests=2
        )
        mgr.add_reservation(new_res)
        self.assertEqual(mgr.get_reservation("CA-TEST01-ABC").guest_name, "Tester Guest")

        # Search
        results = mgr.search_reservations(query="Tester")
        self.assertEqual(len(results), 1)

        # Edit
        mgr.update_reservation("CA-TEST01-ABC", guest_name="Updated Guest Name")
        self.assertEqual(mgr.get_reservation("CA-TEST01-ABC").guest_name, "Updated Guest Name")

        # Delete
        mgr.delete_reservation("CA-TEST01-ABC")
        with self.assertRaises(ReservationNotFoundError):
            mgr.get_reservation("CA-TEST01-ABC")

        if os.path.exists(test_file):
            os.remove(test_file)

    def test_authentication(self):
        """Verifies staff authentication service."""
        auth_file = "tests/temp_users.json"
        if os.path.exists(auth_file):
            os.remove(auth_file)

        auth = AuthService(users_file=auth_file)
        # Success
        user = auth.login("admin", "casaamara2026")
        self.assertEqual(user["username"], "admin")

        # Failure
        with self.assertRaises(AuthenticationError):
            auth.login("admin", "wrongpassword")

        if os.path.exists(auth_file):
            os.remove(auth_file)

    def test_room_manager_publishing(self):
        """Verifies admin RoomManager inventory publishing, toggling, and deletion."""
        from src.services.room_manager import RoomManager
        test_rooms_file = "tests/temp_rooms.json"
        if os.path.exists(test_rooms_file):
            os.remove(test_rooms_file)

        rm = RoomManager(json_path=test_rooms_file)
        # 1. Post new room
        new_room = rm.save_room({
            "name": "Presidential Villa",
            "rate_per_night": 22000.0,
            "max_guests": 6,
            "inventory_units": 2,
            "available_units": 2,
            "status": "available"
        })
        self.assertEqual(new_room["id"], "presidential-villa")
        self.assertEqual(len(rm.get_all_rooms()), 1)

        # 2. Toggle status
        status = rm.toggle_room_status("presidential-villa")
        self.assertEqual(status, "maintenance")

        # 3. Validation failure
        with self.assertRaises(InvalidReservationError):
            rm.save_room({"name": "", "rate_per_night": 5000})

        # 4. Delete room
        deleted = rm.delete_room("presidential-villa")
        self.assertTrue(deleted)
        self.assertEqual(len(rm.get_all_rooms()), 0)

        if os.path.exists(test_rooms_file):
            os.remove(test_rooms_file)


if __name__ == "__main__":
    unittest.main()

