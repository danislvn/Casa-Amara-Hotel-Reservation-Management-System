"""
Casa Amara Hotel Reservation System - Room Inventory & Publishing Service
Fulfills OOP Abstraction, Encapsulation, and Persistence best practices.
"""

from abc import ABC, abstractmethod
import json
import os
from typing import List, Optional, Dict, Any
from src.exceptions import InvalidReservationError


class AbstractRoomService(ABC):
    """
    Abstract interface for Hotel Room Management & Publishing.
    """

    @abstractmethod
    def get_all_rooms(self) -> List[Dict[str, Any]]:
        """Retrieve all registered room types and inventory."""
        pass

    @abstractmethod
    def get_room_by_id(self, room_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve a specific room by its identifier."""
        pass

    @abstractmethod
    def save_room(self, room_data: Dict[str, Any]) -> Dict[str, Any]:
        """Post/Publish or update a room category."""
        pass

    @abstractmethod
    def toggle_room_status(self, room_id: str) -> str:
        """Toggle room status between available and maintenance."""
        pass

    @abstractmethod
    def delete_room(self, room_id: str) -> bool:
        """Unpublish and remove a room category."""
        pass


class RoomManager(AbstractRoomService):
    """
    Concrete Property Management Service managing room publishing and inventory.
    """

    def __init__(self, json_path: str = "data/rooms.json"):
        self._json_path = json_path
        self._rooms: List[Dict[str, Any]] = []
        self.load_from_storage()

    def load_from_storage(self) -> None:
        """Loads rooms from JSON persistence."""
        if not os.path.exists(self._json_path):
            self._rooms = []
            return

        try:
            with open(self._json_path, "r", encoding="utf-8") as f:
                self._rooms = json.load(f)
        except (json.JSONDecodeError, OSError):
            self._rooms = []

    def save_to_storage(self) -> None:
        """Persists rooms to JSON storage."""
        os.makedirs(os.path.dirname(os.path.abspath(self._json_path)), exist_ok=True)
        with open(self._json_path, "w", encoding="utf-8") as f:
            json.dump(self._rooms, f, indent=2, ensure_ascii=False)

    def get_all_rooms(self) -> List[Dict[str, Any]]:
        self.load_from_storage()
        return list(self._rooms)

    def get_room_by_id(self, room_id: str) -> Optional[Dict[str, Any]]:
        self.load_from_storage()
        clean_id = room_id.lower().strip()
        for r in self._rooms:
            if r.get("id", "").lower() == clean_id:
                return dict(r)
        return None

    def save_room(self, room_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validates and adds/updates room data.
        """
        self.load_from_storage()
        name = room_data.get("name", "").strip()
        rate = float(room_data.get("rate_per_night", 0))

        if not name:
            raise InvalidReservationError("Room name is mandatory.")
        if rate <= 0:
            raise InvalidReservationError("Rate per night must be greater than zero.")

        room_id = room_data.get("id")
        if not room_id:
            room_id = name.lower().replace(" ", "-").replace("/", "-")
            room_data["id"] = room_id

        # Normalize types
        room_data["rate_per_night"] = rate
        room_data["max_guests"] = int(room_data.get("max_guests", 2))
        room_data["inventory_units"] = int(room_data.get("inventory_units", 5))
        room_data["available_units"] = int(room_data.get("available_units", room_data["inventory_units"]))
        room_data["status"] = room_data.get("status", "available")
        room_data["tagline"] = room_data.get("tagline", "")
        room_data["bed_config"] = room_data.get("bed_config", "1 King Bed")
        room_data["room_size"] = room_data.get("room_size", "40 m²")
        room_data["view"] = room_data.get("view", "Courtyard")
        room_data["badge"] = room_data.get("badge", "")
        room_data["amenities"] = room_data.get("amenities", ["Rain shower", "Wi-Fi"])

        existing_idx = next((i for i, r in enumerate(self._rooms) if r.get("id") == room_id), -1)
        if existing_idx >= 0:
            self._rooms[existing_idx] = room_data
        else:
            self._rooms.append(room_data)

        self.save_to_storage()
        return room_data

    def toggle_room_status(self, room_id: str) -> str:
        """
        Toggles room status between 'available' and 'maintenance'.
        """
        self.load_from_storage()
        for r in self._rooms:
            if r.get("id") == room_id:
                new_status = "maintenance" if r.get("status") == "available" else "available"
                r["status"] = new_status
                self.save_to_storage()
                return new_status
        raise InvalidReservationError(f"Room '{room_id}' not found.")

    def delete_room(self, room_id: str) -> bool:
        """
        Unpublishes and deletes room.
        """
        self.load_from_storage()
        initial_len = len(self._rooms)
        self._rooms = [r for r in self._rooms if r.get("id") != room_id]
        if len(self._rooms) < initial_len:
            self.save_to_storage()
            return True
        return False
