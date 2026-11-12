"""
Casa Amara Hotel Reservation System - Login Form Window
Demonstrates User Login feature, textboxes, buttons, labels, and exception handling.
"""

import tkinter as tk
from tkinter import ttk, messagebox
from typing import Callable
from src.services.auth_service import AuthService
from src.exceptions import AuthenticationError
from src.gui.theme import (
    COLOR_ESPRESSO, COLOR_OFF_WHITE, COLOR_GOLD, COLOR_CARD_BG,
    COLOR_CHARCOAL, COLOR_TEXT_MUTED, FONT_TITLE, FONT_HEADING, FONT_BODY, FONT_SMALL
)


class LoginWindow(tk.Toplevel):
    """
    Staff Authentication Window.
    Allows front-desk and management staff to securely sign into the system.
    """

    def __init__(self, parent: tk.Tk, auth_service: AuthService, on_login_success: Callable[[dict], None]):
        super().__init__(parent)
        self.parent = parent
        self.auth_service = auth_service
        self.on_login_success = on_login_success

        self.title("Casa Amara - Staff Login")
        self.geometry("420x460")
        self.resizable(False, False)
        self.configure(bg=COLOR_OFF_WHITE)

        # Center window on screen
        self.update_idletasks()
        width = 420
        height = 460
        x = (self.winfo_screenwidth() // 2) - (width // 2)
        y = (self.winfo_screenheight() // 2) - (height // 2)
        self.geometry(f"{width}x{height}+{x}+{y}")

        self.protocol("WM_DELETE_WINDOW", self._on_close)
        self._build_widgets()

    def _build_widgets(self):
        # Top Header Banner
        header_frame = tk.Frame(self, bg=COLOR_ESPRESSO, height=110)
        header_frame.pack(fill=tk.X)
        header_frame.pack_propagate(False)

        logo_circle = tk.Label(
            header_frame,
            text="CA",
            font=("Georgia", 16, "italic"),
            bg="#423326",
            fg=COLOR_GOLD,
            width=3,
            height=1,
            relief="groove",
            borderwidth=1
        )
        logo_circle.pack(pady=(18, 4))

        title_lbl = tk.Label(
            header_frame,
            text="Casa Amara Boutique Hotel",
            font=("Georgia", 12, "bold"),
            bg=COLOR_ESPRESSO,
            fg="#FFFFFF"
        )
        title_lbl.pack()

        subtitle_lbl = tk.Label(
            header_frame,
            text="STAFF & MANAGEMENT PORTAL",
            font=FONT_SMALL,
            bg=COLOR_ESPRESSO,
            fg=COLOR_GOLD
        )
        subtitle_lbl.pack()

        # Login Form Card
        form_card = tk.Frame(self, bg=COLOR_CARD_BG, padx=25, pady=25, relief="solid", borderwidth=1)
        form_card.pack(padx=30, pady=25, fill=tk.BOTH, expand=True)

        welcome_lbl = tk.Label(
            form_card,
            text="Welcome Back",
            font=FONT_TITLE,
            bg=COLOR_CARD_BG,
            fg=COLOR_CHARCOAL
        )
        welcome_lbl.pack(anchor="w", pady=(0, 4))

        hint_lbl = tk.Label(
            form_card,
            text="Please sign in to access guest reservations.",
            font=FONT_SMALL,
            bg=COLOR_CARD_BG,
            fg=COLOR_TEXT_MUTED
        )
        hint_lbl.pack(anchor="w", pady=(0, 16))

        # Username Input
        user_lbl = tk.Label(
            form_card,
            text="Username",
            font=FONT_HEADING,
            bg=COLOR_CARD_BG,
            fg=COLOR_CHARCOAL
        )
        user_lbl.pack(anchor="w", pady=(0, 2))

        self.user_entry = ttk.Entry(form_card, font=FONT_BODY)
        self.user_entry.pack(fill=tk.X, pady=(0, 12))
        self.user_entry.insert(0, "admin")

        # Password Input
        pass_lbl = tk.Label(
            form_card,
            text="Password",
            font=FONT_HEADING,
            bg=COLOR_CARD_BG,
            fg=COLOR_CHARCOAL
        )
        pass_lbl.pack(anchor="w", pady=(0, 2))

        self.pass_entry = ttk.Entry(form_card, font=FONT_BODY, show="●")
        self.pass_entry.pack(fill=tk.X, pady=(0, 18))
        self.pass_entry.insert(0, "casaamara2026")
        self.pass_entry.bind("<Return>", lambda e: self._attempt_login())

        # Submit Button
        login_btn = ttk.Button(
            form_card,
            text="Sign In to System",
            style="Primary.TButton",
            command=self._attempt_login
        )
        login_btn.pack(fill=tk.X, pady=(4, 0))

        # Credentials Hint
        creds_hint = tk.Label(
            form_card,
            text="Default Admin: admin / casaamara2026",
            font=("Segoe UI", 8),
            bg=COLOR_CARD_BG,
            fg="#9C9184"
        )
        creds_hint.pack(pady=(12, 0))

    def _attempt_login(self):
        """Attempts authentication and catches custom AuthenticationError."""
        username = self.user_entry.get().strip()
        password = self.pass_entry.get().strip()

        try:
            user_info = self.auth_service.login(username, password)
            self.destroy()
            self.on_login_success(user_info)
        except AuthenticationError as e:
            messagebox.showerror(
                "Authentication Failed",
                str(e),
                parent=self
            )
            self.pass_entry.delete(0, tk.END)
            self.pass_entry.focus()
        except Exception as e:
            messagebox.showerror(
                "System Error",
                f"An unexpected error occurred during login:\n{str(e)}",
                parent=self
            )

    def _on_close(self):
        """Exits main application if login is cancelled."""
        self.parent.destroy()
