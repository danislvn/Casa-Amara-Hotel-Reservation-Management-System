"""
Casa Amara Hotel Reservation System - Reservation Entity
Demonstrates Encapsulation with private attributes, validation, and JSON serialization.
"""

import uuid
import re
from datetime import datetime
from typing import Dict, Any, Optional
from src.models.base_room import BaseRoom
from src.models.room_types import get_room_by_id
from src.exceptions import InvalidReservationError, InvalidDateError, CapacityExceededError


class Reservation:
    """
    Encapsulated representation of a guest reservation at Casa Amara.
    All attributes are strictly private with validated properties.
    """

    def __init__(
        self,
        guest_name: str,
        email: str,
        phone: str,
        room: BaseRoom,
        check_in: str,
        check_out: str,
        guests: int = 2,
        reference_id: Optional[str] = None,
        payment_status: str = "Deposit paid",
        special_requests: str = "",
        room_number: Optional[str] = None
    ):
        # Generate official Casa Amara reference if not provided (e.g. CA-6COZNS-5OJ)
        self.__reference_id = reference_id if reference_id else self._generate_reference()
        
        # Setter validation
        self.guest_name = guest_name
        self.email = email
        self.phone = phone
        self.__room = room
        self.__room_number = str(room_number).strip() if room_number else ""
        self.set_stay_dates(check_in, check_out)
        self.guests = guests
        self.__payment_status = payment_status
        self.__special_requests = special_requests.strip()
        
        # Calculate initial total
        self.__total_amount = self.__room.calculate_cost(self.__nights, self.__guests)

    @staticmethod
    def _generate_reference() -> str:
        """Generates authentic Casa Amara booking reference like CA-6COZNS-5OJ."""
        token = uuid.uuid4().hex[:10].upper()
        return f"CA-{token[:6]}-{token[6:]}"

    # --- Encapsulated Property Getters and Setters ---

    @property
    def reference_id(self) -> str:
        return self.__reference_id

    @property
    def guest_name(self) -> str:
        return self.__guest_name

    @guest_name.setter
    def guest_name(self, value: str):
        if not value or not value.strip():
            raise InvalidReservationError("Guest name cannot be empty.")
        if len(value.strip()) < 2:
            raise InvalidReservationError("Guest name must contain at least 2 characters.")
        self.__guest_name = value.strip().title()

    @property
    def email(self) -> str:
        return self.__email

    @email.setter
    def email(self, value: str):
        if not value or not value.strip():
            raise InvalidReservationError("Email address cannot be empty.")
        pattern = r"^[\w\.-]+@[\w\.-]+\.\w+$"
        if not re.match(pattern, value.strip()):
            raise InvalidReservationError(f"Invalid email address format: '{value}'")
        self.__email = value.strip().lower()

    @property
    def phone(self) -> str:
        return self.__phone

    @phone.setter
    def phone(self, value: str):
        if not value or not value.strip():
            raise InvalidReservationError("Phone number cannot be empty.")
        self.__phone = value.strip()

    @property
    def room(self) -> BaseRoom:
        return self.__room

    @room.setter
    def room(self, new_room: BaseRoom):
        if not isinstance(new_room, BaseRoom):
            raise InvalidReservationError("Room must be an instance of BaseRoom.")
        if self.__guests > new_room.max_capacity:
            raise CapacityExceededError(new_room.name, self.__guests, new_room.max_capacity)
        self.__room = new_room
        self.__total_amount = self.__room.calculate_cost(self.__nights, self.__guests)

    @property
    def check_in(self) -> str:
        return self.__check_in

    @property
    def check_out(self) -> str:
        return self.__check_out

    @property
    def nights(self) -> int:
        return self.__nights

    def set_stay_dates(self, check_in_str: str, check_out_str: str):
        """
        Validates check-in and check-out dates and calculates length of stay.
        Accepts MM/DD/YYYY or YYYY-MM-DD.
        """
        date_formats = ["%m/%d/%Y", "%Y-%m-%d", "%b %d, %Y"]
        d_in = None
        d_out = None

        for fmt in date_formats:
            try:
                if not d_in:
                    d_in = datetime.strptime(check_in_str.strip(), fmt)
            except ValueError:
                pass
            try:
                if not d_out:
                    d_out = datetime.strptime(check_out_str.strip(), fmt)
            except ValueError:
                pass

        if not d_in or not d_out:
            raise InvalidDateError("Dates must be valid formatted dates (e.g. MM/DD/YYYY).")

        delta = (d_out - d_in).days
        if delta <= 0:
            raise InvalidDateError("Check-out date must be after check-in date.")

        self.__check_in = d_in.strftime("%m/%d/%Y")
        self.__check_out = d_out.strftime("%m/%d/%Y")
        self.__nights = delta

    @property
    def guests(self) -> int:
        return self.__guests

    @guests.setter
    def guests(self, value: int):
        val = int(value)
        if val <= 0:
            raise InvalidReservationError("Guest party size must be at least 1.")
        if hasattr(self, '_Reservation__room') and val > self.__room.max_capacity:
            raise CapacityExceededError(self.__room.name, val, self.__room.max_capacity)
        self.__guests = val

    @property
    def total_amount(self) -> float:
        return self.__total_amount

    @property
    def payment_status(self) -> str:
        return self.__payment_status

    @payment_status.setter
    def payment_status(self, value: str):
        self.__payment_status = value.strip()

    @property
    def special_requests(self) -> str:
        return self.__special_requests

    @special_requests.setter
    def special_requests(self, value: str):
        self.__special_requests = value.strip()

    @property
    def room_number(self) -> str:
        return self.__room_number

    @room_number.setter
    def room_number(self, value: str):
        self.__room_number = str(value).strip() if value else ""

    # --- Method Overloading Demonstration ---
    def update_reservation(self, **kwargs):
        """
        Method Overloading via variable keyword arguments:
        Allows partial or complete update of reservation attributes.
        """
        if "guest_name" in kwargs:
            self.guest_name = kwargs["guest_name"]
        if "email" in kwargs:
            self.email = kwargs["email"]
        if "phone" in kwargs:
            self.phone = kwargs["phone"]
        if "room_type" in kwargs:
            self.room = get_room_by_id(kwargs["room_type"])
        if "room_number" in kwargs:
            self.room_number = kwargs["room_number"]
        if "guests" in kwargs:
            self.guests = kwargs["guests"]
        if "check_in" in kwargs and "check_out" in kwargs:
            self.set_stay_dates(kwargs["check_in"], kwargs["check_out"])
        if "payment_status" in kwargs:
            self.payment_status = kwargs["payment_status"]
        if "special_requests" in kwargs:
            self.special_requests = kwargs["special_requests"]

        # Recalculate total after update
        self.__total_amount = self.__room.calculate_cost(self.__nights, self.__guests)

    # --- JSON Serialization / Deserialization ---
    def to_dict(self) -> Dict[str, Any]:
        """Converts Reservation object to JSON-serializable dictionary."""
        d = {
            "reference_id": self.__reference_id,
            "guest_name": self.__guest_name,
            "email": self.__email,
            "phone": self.__phone,
            "room_type_id": self.__room.room_type_id,
            "room_name": self.__room.name,
            "room_number": self.__room_number,
            "check_in": self.__check_in,
            "check_out": self.__check_out,
            "nights": self.__nights,
            "guests": self.__guests,
            "total_amount": self.__total_amount,
            "payment_status": self.__payment_status,
            "special_requests": self.__special_requests
        }
        if hasattr(self, "_extra_fields") and isinstance(self._extra_fields, dict):
            for k, v in self._extra_fields.items():
                if k not in d:
                    d[k] = v
        return d

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Reservation":
        """Instantiates Reservation object from dictionary data."""
        room_id = data.get("room_type_id", "deluxe")
        room = get_room_by_id(room_id)
        instance = cls(
            reference_id=data.get("reference_id"),
            guest_name=data.get("guest_name", ""),
            email=data.get("email", ""),
            phone=data.get("phone", ""),
            room=room,
            room_number=data.get("room_number", ""),
            check_in=data.get("check_in", "10/27/2026"),
            check_out=data.get("check_out", "10/30/2026"),
            guests=data.get("guests", 2),
            payment_status=data.get("payment_status", "Deposit paid"),
            special_requests=data.get("special_requests", "")
        )
        if "total_amount" in data and data["total_amount"] is not None:
            try:
                instance._Reservation__total_amount = float(data["total_amount"])
            except (ValueError, TypeError):
                pass
        instance._extra_fields = {
            k: v for k, v in data.items()
            if k not in [
                "reference_id", "guest_name", "email", "phone",
                "room_type_id", "room_name", "room_number",
                "check_in", "check_out", "nights", "guests",
                "total_amount", "payment_status", "special_requests"
            ]
        }
        return instance

    def __str__(self) -> str:
        return (
            f"Reservation #{self.__reference_id} | {self.__guest_name} | "
            f"{self.__room.name} ({self.__nights} nights) | ₱{self.__total_amount:,.2f}"
        )
