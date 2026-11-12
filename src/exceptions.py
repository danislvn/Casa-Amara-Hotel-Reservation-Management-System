"""
Casa Amara Hotel Reservation System - Custom Exceptions
Defines error hierarchy for the application.
"""

class CasaAmaraError(Exception):
    """Base exception for all Casa Amara application errors."""
    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


class InvalidReservationError(CasaAmaraError):
    """Raised when reservation data fails validation rules."""
    pass


class CapacityExceededError(InvalidReservationError):
    """Raised when guest party size exceeds room maximum capacity."""
    def __init__(self, room_type: str, guests: int, max_capacity: int):
        message = (
            f"Capacity exceeded for {room_type}: requested {guests} guests, "
            f"maximum allowed is {max_capacity}."
        )
        super().__init__(message)
        self.room_type = room_type
        self.guests = guests
        self.max_capacity = max_capacity


class InvalidDateError(InvalidReservationError):
    """Raised when stay dates are malformed, in the past, or check-out is before check-in."""
    pass


class ReservationNotFoundError(CasaAmaraError):
    """Raised when looking up a booking reference that does not exist."""
    def __init__(self, reference_id: str):
        super().__init__(f"Reservation with reference '{reference_id}' was not found.")
        self.reference_id = reference_id


class DuplicateReservationError(CasaAmaraError):
    """Raised when attempting to add a reservation with an existing reference code."""
    def __init__(self, reference_id: str):
        super().__init__(f"Reservation with reference '{reference_id}' already exists.")
        self.reference_id = reference_id


class AuthenticationError(CasaAmaraError):
    """Raised when staff login credentials fail."""
    pass
