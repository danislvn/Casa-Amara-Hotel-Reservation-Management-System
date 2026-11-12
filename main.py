"""
Casa Amara Boutique Hotel - Main Application Entry Point
Starts the Python Tkinter Object-Oriented Hotel Reservation System.
"""

import tkinter as tk
from tkinter import ttk
from src.services.reservation_manager import ReservationManager
from src.services.auth_service import AuthService
from src.gui.theme import configure_ttk_theme
from src.gui.login_window import LoginWindow
from src.gui.main_dashboard import MainDashboardWindow


def main():
    # 1. Initialize core services & storage
    reservation_manager = ReservationManager(storage_path="data/reservations.json")
    auth_service = AuthService(users_file="data/users.json")

    # 2. Initialize Tkinter root
    root = tk.Tk()
    root.withdraw()  # Hide root until login succeeds

    # 3. Configure Casa Amara theme
    style = ttk.Style()
    configure_ttk_theme(style)

    # 4. Success callback after user logs in
    def on_login_success(user_info: dict):
        root.deiconify()  # Show main dashboard
        MainDashboardWindow(
            root=root,
            manager=reservation_manager,
            auth_service=auth_service,
            user_info=user_info
        )

    # 5. Launch Login Window
    LoginWindow(
        parent=root,
        auth_service=auth_service,
        on_login_success=on_login_success
    )

    # 6. Start GUI event loop
    root.mainloop()


if __name__ == "__main__":
    main()
