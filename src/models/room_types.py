"""
Casa Amara Hotel Reservation System - Room Subclasses
Demonstrates OOP Inheritance and Polymorphism.
"""

from typing import List, Optional, Dict, Any
import os
import json
import re
from src.models.base_room import BaseRoom
from src.exceptions import CapacityExceededError


class DeluxeRoom(BaseRoom):
    """
    Deluxe Room: Garden-facing retreat, up to 2 guests, ₱8,200/night.
    """
    def __init__(self):
        super().__init__(
            room_type_id="deluxe",
            name="Deluxe Room",
            base_rate=8200.0,
            max_capacity=2,
            bed_config="1 King Bed"
        )

    def calculate_cost(self, nights: int, guests: int = 2) -> float:
        if guests > self.max_capacity:
            raise CapacityExceededError(self.name, guests, self.max_capacity)
        subtotal = self.base_rate * nights
        taxes = subtotal * 0.12  # 12% hotel tax & service
        return round(subtotal + taxes, 2)

    def get_amenities(self) -> List[str]:
        return ["King bed", "Garden view", "Rainfall shower", "Complimentary Wi-Fi"]


class ExecutiveRoom(BaseRoom):
    """
    Executive Room: Terrace and soaking tub, up to 3 guests, ₱11,500/night.
    """
    def __init__(self):
        super().__init__(
            room_type_id="executive",
            name="Executive Room",
            base_rate=11500.0,
            max_capacity=3,
            bed_config="1 King Bed and Daybed"
        )

    def calculate_cost(self, nights: int, guests: int = 2) -> float:
        if guests > self.max_capacity:
            raise CapacityExceededError(self.name, guests, self.max_capacity)
        subtotal = self.base_rate * nights
        # 3rd guest includes amenity package
        if guests == 3:
            subtotal += (800.0 * nights)
        taxes = subtotal * 0.12
        return round(subtotal + taxes, 2)

    def get_amenities(self) -> List[str]:
        return ["Private terrace", "King bed & daybed", "Deep soaking tub", "Espresso machine"]


class FamilyRoom(BaseRoom):
    """
    Family Room: Inner courtyard, up to 5 guests, ₱9,800/night.
    """
    def __init__(self):
        super().__init__(
            room_type_id="family",
            name="Family Room",
            base_rate=9800.0,
            max_capacity=5,
            bed_config="2 Queen Beds"
        )

    def calculate_cost(self, nights: int, guests: int = 4) -> float:
        if guests > self.max_capacity:
            raise CapacityExceededError(self.name, guests, self.max_capacity)
        subtotal = self.base_rate * nights
        # Extra 5th guest breakfast surcharge
        if guests > 4:
            subtotal += (650.0 * nights)
        taxes = subtotal * 0.12
        return round(subtotal + taxes, 2)

    def get_amenities(self) -> List[str]:
        return ["Two queen beds", "Courtyard view", "Daily family breakfast", "Child-friendly setup"]


class PremiumSuite(BaseRoom):
    """
    Premium Suite: Most spacious retreat, lounge, up to 5 guests, ₱14,500/night.
    """
    def __init__(self):
        super().__init__(
            room_type_id="premium",
            name="Premium Suite",
            base_rate=14500.0,
            max_capacity=5,
            bed_config="1 King Bed and Sofa Bed"
        )

    def calculate_cost(self, nights: int, guests: int = 2) -> float:
        if guests > self.max_capacity:
            raise CapacityExceededError(self.name, guests, self.max_capacity)
        subtotal = self.base_rate * nights
        taxes = subtotal * 0.12
        return round(subtotal + taxes, 2)

    def get_amenities(self) -> List[str]:
        return ["Separate private lounge", "Soaking tub", "Evening turndown", "Welcome champagne", "Butler service"]


class ExecutiveGardenSuite(BaseRoom):
    """
    Executive Garden Suite: Private outdoor terrace, deep soaking tub, up to 2 guests, ₱12,500/night.
    """
    def __init__(self):
        super().__init__(
            room_type_id="executive-garden-suite",
            name="Executive Garden Suite",
            base_rate=12500.0,
            max_capacity=2,
            bed_config="1 King Bed"
        )

    def calculate_cost(self, nights: int, guests: int = 2) -> float:
        if guests > self.max_capacity:
            raise CapacityExceededError(self.name, guests, self.max_capacity)
        subtotal = self.base_rate * nights
        taxes = subtotal * 0.12  # 12% hotel tax & service
        return round(subtotal + taxes, 2)

    def get_amenities(self) -> List[str]:
        return [
            "Courtyard garden view",
            "Private outdoor terrace",
            "Deep soaking marble tub",
            "Complimentary daily breakfast",
            "Complimentary Wi-Fi"
        ]


class MastersVilla(BaseRoom):
    """
    Master's Villa: Expansive luxury retreat, courtyard view, butler assistance, up to 4 guests, ₱9,000/night.
    """
    def __init__(self):
        super().__init__(
            room_type_id="master-s-villa",
            name="Master's Villa",
            base_rate=9000.0,
            max_capacity=4,
            bed_config="1 King Bed, 2 Daybeds & 1 Sofa Bed"
        )

    def calculate_cost(self, nights: int, guests: int = 4) -> float:
        if guests > self.max_capacity:
            raise CapacityExceededError(self.name, guests, self.max_capacity)
        subtotal = self.base_rate * nights
        taxes = subtotal * 0.12  # 12% hotel tax & service
        return round(subtotal + taxes, 2)

    def get_amenities(self) -> List[str]:
        return [
            "Courtyard garden view",
            "Walk-in rain shower",
            "Complimentary daily breakfast",
            "Nespresso coffee bar",
            "Complimentary Wi-Fi",
            "Dedicated butler assistance"
        ]


class CustomRoom(BaseRoom):
    """
    Dynamic or user-published room category loaded from inventory/rooms.json.
    Demonstrates OOP Polymorphism and dynamic extensibility.
    """
    def __init__(
        self,
        room_type_id: str,
        name: str,
        base_rate: float,
        max_capacity: int = 2,
        bed_config: str = "1 King Bed",
        amenities: Optional[List[str]] = None
    ):
        super().__init__(
            room_type_id=room_type_id,
            name=name,
            base_rate=base_rate,
            max_capacity=max_capacity,
            bed_config=bed_config
        )
        self._amenities = list(amenities) if amenities else ["Complimentary Wi-Fi", "Daily housekeeping"]

    def calculate_cost(self, nights: int, guests: int = 1) -> float:
        if guests > self.max_capacity:
            raise CapacityExceededError(self.name, guests, self.max_capacity)
        subtotal = self.base_rate * nights
        taxes = subtotal * 0.12  # 12% hotel tax & service
        return round(subtotal + taxes, 2)

    def get_amenities(self) -> List[str]:
        return list(self._amenities)


def _load_room_from_catalog(room_id: str) -> Optional[BaseRoom]:
    """Helper to locate and instantiate a room from data/rooms.json."""
    clean_id = room_id.lower().strip()
    norm_id = re.sub(r"[^a-z0-9]", "", clean_id)
    candidates = [
        os.path.join("data", "rooms.json"),
        os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data", "rooms.json")
    ]
    for path in candidates:
        if os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    rooms_data = json.load(f)
                for r in rooms_data:
                    curr_id = str(r.get("id", "")).lower().strip()
                    curr_norm = re.sub(r"[^a-z0-9]", "", curr_id)
                    curr_name = str(r.get("name", "")).lower().strip()
                    curr_name_norm = re.sub(r"[^a-z0-9]", "", curr_name)
                    if curr_id == clean_id or curr_norm == norm_id or curr_name_norm == norm_id:
                        return CustomRoom(
                            room_type_id=r.get("id", clean_id),
                            name=r.get("name", clean_id.replace("-", " ").title()),
                            base_rate=float(r.get("rate_per_night", 8500.0)),
                            max_capacity=int(r.get("max_guests", 2)),
                            bed_config=str(r.get("bed_config", "1 King Bed")),
                            amenities=r.get("amenities", [])
                        )
            except Exception:
                pass
    return None


def get_room_by_id(room_id: str, fallback_to_custom: bool = True) -> BaseRoom:
    """
    Factory method to instantiate a room object by its ID or alias.
    Supports predefined OOP subclasses, dynamically published catalog rooms,
    and graceful custom fallback to ensure robust deserialization.
    """
    clean_id = str(room_id).lower().strip()

    # Predefined factory map
    room_factories = {
        "deluxe": DeluxeRoom,
        "executive": ExecutiveRoom,
        "family": FamilyRoom,
        "premium": PremiumSuite,
        "premium-suite": PremiumSuite,
        "executive-garden-suite": ExecutiveGardenSuite,
        "executive_garden_suite": ExecutiveGardenSuite,
        "executive-garden": ExecutiveGardenSuite,
        "master-s-villa": MastersVilla,
        "masters-villa": MastersVilla,
        "master_s_villa": MastersVilla,
        "villa": MastersVilla
    }

    if clean_id in room_factories:
        return room_factories[clean_id]()

    # Check normalized ID against predefined types (handles punctuation differences)
    norm_id = re.sub(r"[^a-z0-9]", "", clean_id)
    for key, factory in room_factories.items():
        if re.sub(r"[^a-z0-9]", "", key) == norm_id:
            return factory()

    # Dynamic lookup from data/rooms.json
    catalog_room = _load_room_from_catalog(clean_id)
    if catalog_room is not None:
        return catalog_room

    if not fallback_to_custom:
        raise ValueError(f"Unknown room type identifier: '{room_id}'")

    # Graceful fallback: return a CustomRoom so unknown/legacy records do not crash the app
    fallback_name = clean_id.replace("-", " ").replace("_", " ").title()
    return CustomRoom(
        room_type_id=clean_id,
        name=fallback_name,
        base_rate=8200.0,
        max_capacity=4,
        bed_config="1 King Bed",
        amenities=["Complimentary Wi-Fi", "Daily housekeeping"]
    )
