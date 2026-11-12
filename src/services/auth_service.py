"""
Casa Amara Hotel Reservation System - Authentication Service
Handles staff login, user credentials, and session state.
"""

import json
import os
import hashlib
from typing import Optional, Dict
from src.exceptions import AuthenticationError


class AuthService:
    """Manages staff authentication and persistent credentials."""

    def __init__(self, users_file: str = "data/users.json"):
        self.users_file = users_file
        self._current_user: Optional[str] = None
        os.makedirs(os.path.dirname(self.users_file), exist_ok=True)
        self._initialize_credentials()

    @staticmethod
    def _hash_password(password: str) -> str:
        """Computes SHA-256 hash of password string."""
        return hashlib.sha256(password.encode("utf-8")).hexdigest()

    def _initialize_credentials(self):
        """Creates default admin credentials if users file is absent."""
        if not os.path.exists(self.users_file):
            default_users = {
                "admin": {
                    "role": "Admin",
                    "full_name": "Casa Amara Administrator",
                    "email": "admin@casaamara.ph",
                    "password_hash": self._hash_password("casaamara2026")
                },
                "manager": {
                    "role": "Manager",
                    "full_name": "Casa Amara Manager",
                    "email": "manager@casaamara.ph",
                    "password_hash": self._hash_password("casaamara2026")
                }
            }
            with open(self.users_file, "w", encoding="utf-8") as f:
                json.dump(default_users, f, indent=2)

    def _load_users(self) -> Dict[str, dict]:
        try:
            with open(self.users_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}

    def login(self, username: str, password: str) -> dict:
        """
        Validates username and password.
        Raises AuthenticationError if invalid.
        """
        user_clean = username.strip().lower()
        if not user_clean or not password:
            raise AuthenticationError("Username and password are required.")

        users = self._load_users()
        if user_clean not in users:
            raise AuthenticationError("Invalid username or password.")

        user_data = users[user_clean]
        if user_data.get("password_hash") != self._hash_password(password):
            raise AuthenticationError("Invalid username or password.")

        self._current_user = user_clean
        return {
            "username": user_clean,
            "full_name": user_data.get("full_name"),
            "role": user_data.get("role")
        }

    def logout(self):
        """Clears the logged-in session."""
        self._current_user = None

    @property
    def current_user(self) -> Optional[str]:
        return self._current_user

    @property
    def is_authenticated(self) -> bool:
        return self._current_user is not None
