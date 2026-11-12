"""
Casa Amara Hotel Reservation System - Reservation Manager
Demonstrates Abstract Base Classes (Interfaces), CRUD Operations, File Persistence (Save/Load).
"""

import json
import os
from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
from src.models.reservation import Reservation
from src.exceptions import (
    ReservationNotFoundError,
    DuplicateReservationError,
    CasaAmaraError
)


class AbstractReservationService(ABC):
    """
    Interface / Abstract Base Class defining required operations
    for hotel reservation record management.
    """

    @abstractmethod
    def add_reservation(self, reservation: Reservation) -> Reservation:
        """Add a new reservation record."""
        pass

    @abstractmethod
    def get_reservation(self, reference_id: str) -> Reservation:
        """Retrieve a reservation by its unique reference ID."""
        pass

    @abstractmethod
    def update_reservation(self, reference_id: str, **kwargs) -> Reservation:
        """Edit an existing reservation record."""
        pass

    @abstractmethod
    def delete_reservation(self, reference_id: str) -> bool:
        """Delete / cancel a reservation record."""
        pass

    @abstractmethod
    def search_reservations(self, query: str = "", room_filter: str = "") -> List[Reservation]:
        """Search records by reference ID, guest name, or email, with optional room filtering."""
        pass

    @abstractmethod
    def get_all(self) -> List[Reservation]:
        """Display all reservation records."""
        pass

    @abstractmethod
    def save_data(self) -> bool:
        """Save data to persistent storage."""
        pass

    @abstractmethod
    def load_data(self) -> bool:
        """Load data from persistent storage."""
        pass


class ReservationManager(AbstractReservationService):
    """
    Concrete implementation of the reservation management system.
    Manages in-memory reservation records and persists to JSON.
    """

    def __init__(self, storage_path: str = "data/reservations.json"):
        self.storage_path = storage_path
        self._reservations: Dict[str, Reservation] = {}
        
        # Ensure data directory exists
        os.makedirs(os.path.dirname(self.storage_path), exist_ok=True)
        
        # Automatically load data on startup
        self.load_data()

    def add_reservation(self, reservation: Reservation) -> Reservation:
        """Adds a new record to the system."""
        if not isinstance(reservation, Reservation):
            raise TypeError("Object must be an instance of Reservation.")
        
        if reservation.reference_id in self._reservations:
            raise DuplicateReservationError(reservation.reference_id)
        
        self._reservations[reservation.reference_id] = reservation
        self.save_data()
        return reservation

    def get_reservation(self, reference_id: str) -> Reservation:
        """Finds a reservation by reference ID (case-insensitive)."""
        ref_clean = reference_id.strip().upper()
        if ref_clean not in self._reservations:
            raise ReservationNotFoundError(ref_clean)
        return self._reservations[ref_clean]

    def update_reservation(self, reference_id: str, **kwargs) -> Reservation:
        """Updates attributes of an existing reservation record."""
        reservation = self.get_reservation(reference_id)
        reservation.update_reservation(**kwargs)
        self.save_data()
        return reservation

    def delete_reservation(self, reference_id: str) -> bool:
        """Deletes a reservation record from the system."""
        ref_clean = reference_id.strip().upper()
        if ref_clean not in self._reservations:
            raise ReservationNotFoundError(ref_clean)
        del self._reservations[ref_clean]
        self.save_data()
        return True

    def search_reservations(self, query: str = "", room_filter: str = "") -> List[Reservation]:
        """
        Searches records matching reference, guest name, or email.
        Supports method overloading behavior through default optional arguments.
        """
        q = query.strip().lower()
        rf = room_filter.strip().lower()
        results = []

        for res in self._reservations.values():
            # Check room type filter
            if rf and rf != "all" and res.room.room_type_id != rf:
                continue

            # Check query string
            if not q:
                results.append(res)
            elif (
                q in res.reference_id.lower()
                or q in res.guest_name.lower()
                or q in res.email.lower()
                or q in res.phone.lower()
                or (getattr(res, "room_number", None) and q in str(res.room_number).lower())
            ):
                results.append(res)

        return results

    def get_all(self) -> List[Reservation]:
        """Returns all reservation records."""
        return list(self._reservations.values())

    def save_data(self) -> bool:
        """Saves current reservations to JSON file with atomic write."""
        try:
            records = [res.to_dict() for res in self._reservations.values()]
            temp_path = self.storage_path + ".tmp"
            with open(temp_path, "w", encoding="utf-8") as f:
                json.dump(records, f, indent=2, ensure_ascii=False)
            os.replace(temp_path, self.storage_path)
            return True
        except Exception as e:
            raise CasaAmaraError(f"Failed to save reservations to '{self.storage_path}': {str(e)}")

    def load_data(self) -> bool:
        """Loads reservation records from JSON file. Initializes seed data if missing."""
        if not os.path.exists(self.storage_path):
            self._create_initial_seed_data()
            return True

        try:
            with open(self.storage_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            
            self._reservations.clear()
            for item in data:
                try:
                    res = Reservation.from_dict(item)
                    self._reservations[res.reference_id] = res
                except Exception as item_err:
                    print(f"Warning: Skipping invalid reservation item {item.get('reference_id', 'unknown')}: {item_err}")
            return True
        except json.JSONDecodeError as e:
            raise CasaAmaraError(f"Corrupted reservations file '{self.storage_path}': {str(e)}")
        except Exception as e:
            raise CasaAmaraError(f"Error loading reservations from '{self.storage_path}': {str(e)}")

    def _create_initial_seed_data(self):
        """Initializes sample reservations matching the Figma screenshots."""
        from src.models.room_types import DeluxeRoom, ExecutiveRoom, FamilyRoom, PremiumSuite

        seed_reservations = [
            Reservation(
                reference_id="CA-6COZNS-5OJ",
                guest_name="John Doe",
                email="guest@example.com",
                phone="+63 917 123 4567",
                room=DeluxeRoom(),
                check_in="10/27/2026",
                check_out="10/30/2026",
                guests=2,
                payment_status="Deposit paid",
                special_requests="High floor garden view requested."
            ),
            Reservation(
                reference_id="CA-7EX49A-12B",
                guest_name="Maria Santos",
                email="maria.santos@gmail.com",
                phone="+63 918 555 8821",
                room=ExecutiveRoom(),
                check_in="11/02/2026",
                check_out="11/05/2026",
                guests=2,
                payment_status="Deposit paid",
                special_requests="Late arrival around 8:00 PM."
            ),
            Reservation(
                reference_id="CA-8FAM88-99K",
                guest_name="Alexander Tan",
                email="alex.tan@yahoo.com",
                phone="+63 920 334 1122",
                room=FamilyRoom(),
                check_in="11/10/2026",
                check_out="11/14/2026",
                guests=4,
                payment_status="Pay at hotel",
                special_requests="Need extra pillows and baby cot."
            ),
            Reservation(
                reference_id="CA-9SUITE-77M",
                guest_name="Isabella Rossi",
                email="i.rossi@luxury.it",
                phone="+39 02 8841 9921",
                room=PremiumSuite(),
                check_in="12/20/2026",
                check_out="12/26/2026",
                guests=2,
                payment_status="Deposit paid",
                special_requests="Honeymoon arrangement with champagne."
            )
        ]

        for res in seed_reservations:
            self._reservations[res.reference_id] = res

        self.save_data()
