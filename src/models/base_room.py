"""
Casa Amara Hotel Reservation System - Base Room Model
"""

from abc import ABC, abstractmethod
from typing import List


class BaseRoom(ABC):
    """
    Abstract Base Class representing a hotel room type at Casa Amara.
    Enforces encapsulation with private attributes and property methods.
    """

    def __init__(self, room_type_id: str, name: str, base_rate: float, max_capacity: int, bed_config: str):
        self._room_type_id = room_type_id
        self._name = name
        self._base_rate = float(base_rate)
        self._max_capacity = int(max_capacity)
        self._bed_config = bed_config

    @property
    def room_type_id(self) -> str:
        """Getter for room type identifier."""
        return self._room_type_id

    @property
    def name(self) -> str:
        """Getter for human-readable room name."""
        return self._name

    @property
    def base_rate(self) -> float:
        """Getter for standard nightly rate in PHP."""
        return self._base_rate

    @base_rate.setter
    def base_rate(self, value: float):
        """Setter for base rate with encapsulation validation."""
        if value <= 0:
            raise ValueError("Room base rate must be greater than zero.")
        self._base_rate = float(value)

    @property
    def max_capacity(self) -> int:
        """Getter for maximum allowable guests."""
        return self._max_capacity

    @property
    def bed_config(self) -> str:
        """Getter for bed configuration description."""
        return self._bed_config

    @abstractmethod
    def calculate_cost(self, nights: int, guests: int = 1) -> float:
        """
        Abstract method: Subclasses must provide polymorphic rate calculation
        including taxes, fees, and extra guest adjustments.
        """
        pass

    @abstractmethod
    def get_amenities(self) -> List[str]:
        """Abstract method: Subclasses return specialized room amenity lists."""
        pass

    def __str__(self) -> str:
        return f"{self._name} (₱{self._base_rate:,.2f}/night, Up to {self._max_capacity} guests)"
