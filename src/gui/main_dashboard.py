"""
Casa Amara Hotel Reservation System - Main Dashboard Window
Demonstrates Tables/List Displays (Treeview), Menus, Search/Filter, Buttons, and CRUD Operations.
"""

import tkinter as tk
from tkinter import ttk, messagebox, filedialog
import csv
from typing import Optional
from src.services.reservation_manager import ReservationManager
from src.services.auth_service import AuthService
from src.services.room_manager import RoomManager
from src.gui.reservation_modal import ReservationModal
from src.gui.room_modal import RoomModal
from src.gui.room_inventory_dialog import RoomInventoryDialog
from src.gui.theme import (
    COLOR_ESPRESSO, COLOR_ESPRESSO_DARK, COLOR_GOLD, COLOR_OFF_WHITE,
    COLOR_WARM_BEIGE, COLOR_CARD_BG, COLOR_CHARCOAL, COLOR_TEXT_MUTED,
    FONT_TITLE, FONT_SUBTITLE, FONT_HEADING, FONT_BODY, FONT_SMALL, FONT_MONO
)


class MainDashboardWindow:
    """
    Primary administrative interface for Casa Amara hotel staff.
    """

    def __init__(self, root: tk.Tk, manager: ReservationManager, auth_service: AuthService, user_info: dict):
        self.root = root
        self.manager = manager
        self.room_manager = RoomManager()
        self.auth_service = auth_service
        self.user_info = user_info

        self.root.title("Casa Amara Boutique Hotel - Reservation Management System")
        self.root.geometry("1180x720")
        self.root.minsize(980, 600)
        self.root.configure(bg=COLOR_OFF_WHITE)

        self._build_menu()
        self._build_header()
        self._build_search_toolbar()
        self._build_table()
        self._build_action_bar()
        self._build_status_bar()

        # Load initial table data
        self.refresh_table()

    def _build_menu(self):
        """Builds top application menu bar (Rubric: Menus)."""
        menubar = tk.Menu(self.root)

        # File Menu
        file_menu = tk.Menu(menubar, tearoff=0)
        file_menu.add_command(label="Save Database (Ctrl+S)", command=self._save_database)
        file_menu.add_command(label="Reload Database", command=self._reload_database)
        file_menu.add_separator()
        file_menu.add_command(label="Export Table to CSV...", command=self._export_csv)
        file_menu.add_separator()
        file_menu.add_command(label="Exit", command=self.root.quit)
        menubar.add_cascade(label="File", menu=file_menu)

        # Reservations Menu
        res_menu = tk.Menu(menubar, tearoff=0)
        res_menu.add_command(label="New Reservation...", command=self._open_add_modal)
        res_menu.add_command(label="Edit Selected...", command=self._open_edit_modal)
        res_menu.add_command(label="Cancel / Delete Selected", command=self._delete_selected)
        res_menu.add_separator()
        res_menu.add_command(label="Refresh Table (F5)", command=self.refresh_table)
        menubar.add_cascade(label="Reservations", menu=res_menu)

        # Rooms Inventory Menu
        room_menu = tk.Menu(menubar, tearoff=0)
        room_menu.add_command(label="Post / Publish New Room...", command=self._open_publish_room_modal)
        room_menu.add_command(label="Manage Room Inventory...", command=self._open_manage_rooms_dialog)
        menubar.add_cascade(label="Room Inventory", menu=room_menu)

        # Help Menu
        help_menu = tk.Menu(menubar, tearoff=0)
        help_menu.add_command(label="About Casa Amara System", command=self._show_about)
        menubar.add_cascade(label="Help", menu=help_menu)

        self.root.config(menu=menubar)
        self.root.bind("<Control-s>", lambda e: self._save_database())
        self.root.bind("<F5>", lambda e: self.refresh_table())

    def _build_header(self):
        """Builds branded header banner with user profile badge."""
        header = tk.Frame(self.root, bg=COLOR_ESPRESSO, height=75)
        header.pack(fill=tk.X)
        header.pack_propagate(False)

        left_box = tk.Frame(header, bg=COLOR_ESPRESSO)
        left_box.pack(side=tk.LEFT, padx=25, pady=12)

        logo_lbl = tk.Label(
            left_box,
            text="CA",
            font=("Georgia", 14, "italic"),
            bg="#423326",
            fg=COLOR_GOLD,
            width=3,
            relief="groove",
            borderwidth=1
        )
        logo_lbl.pack(side=tk.LEFT, padx=(0, 12))

        title_box = tk.Frame(left_box, bg=COLOR_ESPRESSO)
        title_box.pack(side=tk.LEFT)

        tk.Label(
            title_box,
            text="Casa Amara Boutique Hotel",
            font=("Georgia", 14, "bold"),
            bg=COLOR_ESPRESSO,
            fg="#FFFFFF"
        ).pack(anchor="w")

        tk.Label(
            title_box,
            text="MANAGEMENT SUITE & RESERVATIONS DATABASE",
            font=FONT_SMALL,
            bg=COLOR_ESPRESSO,
            fg=COLOR_GOLD
        ).pack(anchor="w")

        # Right: User badge
        right_box = tk.Frame(header, bg=COLOR_ESPRESSO)
        right_box.pack(side=tk.RIGHT, padx=25, pady=16)

        user_txt = f"{self.user_info.get('full_name')} ({self.user_info.get('role')})"
        tk.Label(
            right_box,
            text=user_txt,
            font=FONT_BODY,
            bg=COLOR_ESPRESSO,
            fg="#FFFFFF"
        ).pack(side=tk.LEFT, padx=(0, 14))

        logout_btn = tk.Button(
            right_box,
            text="Logout",
            font=FONT_SMALL,
            bg="#4A3B2F",
            fg="#FFFFFF",
            relief="flat",
            padx=10,
            pady=3,
            command=self._logout
        )
        logout_btn.pack(side=tk.RIGHT)

    def _build_search_toolbar(self):
        """Toolbar with search textbox and room combobox filter."""
        toolbar = tk.Frame(self.root, bg=COLOR_WARM_BEIGE, padx=25, pady=12)
        toolbar.pack(fill=tk.X)

        # Search Query Textbox
        tk.Label(
            toolbar,
            text="Search Reservations:",
            font=FONT_HEADING,
            bg=COLOR_WARM_BEIGE,
            fg=COLOR_CHARCOAL
        ).pack(side=tk.LEFT, padx=(0, 8))

        self.search_entry = ttk.Entry(toolbar, width=28, font=FONT_BODY)
        self.search_entry.pack(side=tk.LEFT, padx=(0, 15))
        self.search_entry.bind("<Return>", lambda e: self._on_search())

        # Room Type Filter Combo Box
        tk.Label(
            toolbar,
            text="Room Filter:",
            font=FONT_HEADING,
            bg=COLOR_WARM_BEIGE,
            fg=COLOR_CHARCOAL
        ).pack(side=tk.LEFT, padx=(0, 8))

        self.room_filter_combo = ttk.Combobox(
            toolbar,
            values=[
                "All Rooms",
                "Deluxe Room",
                "Executive Room",
                "Family Room",
                "Premium Suite",
                "Master's Villa",
                "Executive Garden Suite"
            ],
            state="readonly",
            width=22,
            font=FONT_BODY
        )
        self.room_filter_combo.pack(side=tk.LEFT, padx=(0, 15))
        self.room_filter_combo.current(0)
        self.room_filter_combo.bind("<<ComboboxSelected>>", lambda e: self._on_search())

        # Buttons
        search_btn = ttk.Button(toolbar, text="Search", style="Primary.TButton", command=self._on_search)
        search_btn.pack(side=tk.LEFT, padx=(0, 6))

        reset_btn = ttk.Button(toolbar, text="Reset", style="Secondary.TButton", command=self._on_reset)
        reset_btn.pack(side=tk.LEFT)

    def _build_table(self):
        """Builds Treeview table display for listing records."""
        table_container = tk.Frame(self.root, bg=COLOR_OFF_WHITE, padx=25, pady=16)
        table_container.pack(fill=tk.BOTH, expand=True)

        columns = (
            "reference", "guest_name", "room_type", "room_number", "check_in",
            "check_out", "nights", "guests", "status", "total_amount"
        )

        self.tree = ttk.Treeview(
            table_container,
            columns=columns,
            show="headings",
            selectmode="browse"
        )

        # Configure Headings and Column widths
        self.tree.heading("reference", text="Reference ID")
        self.tree.heading("guest_name", text="Guest Name")
        self.tree.heading("room_type", text="Room Type")
        self.tree.heading("room_number", text="Room No.")
        self.tree.heading("check_in", text="Check-in")
        self.tree.heading("check_out", text="Check-out")
        self.tree.heading("nights", text="Nights")
        self.tree.heading("guests", text="Guests")
        self.tree.heading("status", text="Payment Status")
        self.tree.heading("total_amount", text="Total (PHP)")

        self.tree.column("reference", width=125, anchor="center")
        self.tree.column("guest_name", width=160, anchor="w")
        self.tree.column("room_type", width=130, anchor="w")
        self.tree.column("room_number", width=85, anchor="center")
        self.tree.column("check_in", width=95, anchor="center")
        self.tree.column("check_out", width=95, anchor="center")
        self.tree.column("nights", width=65, anchor="center")
        self.tree.column("guests", width=65, anchor="center")
        self.tree.column("status", width=115, anchor="center")
        self.tree.column("total_amount", width=115, anchor="e")

        # Scrollbars
        v_scroll = ttk.Scrollbar(table_container, orient=tk.VERTICAL, command=self.tree.yview)
        self.tree.configure(yscrollcommand=v_scroll.set)

        self.tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        v_scroll.pack(side=tk.RIGHT, fill=tk.Y)

        # Double click to edit
        self.tree.bind("<Double-1>", lambda e: self._open_edit_modal())

    def _build_action_bar(self):
        """Action button row below the table."""
        action_bar = tk.Frame(self.root, bg=COLOR_OFF_WHITE, padx=25, pady=(0, 14))
        action_bar.pack(fill=tk.X)

        # Left buttons
        add_btn = ttk.Button(
            action_bar,
            text="+ Add Reservation",
            style="Primary.TButton",
            command=self._open_add_modal
        )
        add_btn.pack(side=tk.LEFT, padx=(0, 8))

        edit_btn = ttk.Button(
            action_bar,
            text="Edit Selected",
            style="Secondary.TButton",
            command=self._open_edit_modal
        )
        edit_btn.pack(side=tk.LEFT, padx=(0, 8))

        details_btn = ttk.Button(
            action_bar,
            text="View Full Details",
            style="Secondary.TButton",
            command=self._view_details
        )
        details_btn.pack(side=tk.LEFT, padx=(0, 8))

        room_mgmt_btn = ttk.Button(
            action_bar,
            text="🏷 Publish / Manage Rooms",
            style="Secondary.TButton",
            command=self._open_manage_rooms_dialog
        )
        room_mgmt_btn.pack(side=tk.LEFT, padx=(0, 8))

        # Right buttons
        del_btn = ttk.Button(
            action_bar,
            text="Cancel / Delete Record",
            style="Danger.TButton",
            command=self._delete_selected
        )
        del_btn.pack(side=tk.RIGHT)

    def _build_status_bar(self):
        """Status bar at bottom showing records count and system status."""
        self.status_bar = tk.Frame(self.root, bg=COLOR_ESPRESSO, height=28, padx=20)
        self.status_bar.pack(fill=tk.X, side=tk.BOTTOM)
        self.status_bar.pack_propagate(False)

        self.status_lbl = tk.Label(
            self.status_bar,
            text="Ready",
            font=FONT_SMALL,
            bg=COLOR_ESPRESSO,
            fg="#E5DFD7"
        )
        self.status_lbl.pack(side=tk.LEFT)

        self.records_count_lbl = tk.Label(
            self.status_bar,
            text="0 records loaded",
            font=FONT_SMALL,
            bg=COLOR_ESPRESSO,
            fg=COLOR_GOLD
        )
        self.records_count_lbl.pack(side=tk.RIGHT)

    # --- Data Operations & Event Handlers ---

    def refresh_table(self, records=None):
        """Populates Treeview with current reservation records."""
        # Clear existing rows
        for item in self.tree.get_children():
            self.tree.delete(item)

        if records is None:
            records = self.manager.get_all()

        for res in records:
            room_no = getattr(res, "room_number", "") or "101"
            self.tree.insert(
                "",
                tk.END,
                values=(
                    res.reference_id,
                    res.guest_name,
                    res.room.name,
                    room_no,
                    res.check_in,
                    res.check_out,
                    res.nights,
                    res.guests,
                    res.payment_status,
                    f"₱{res.total_amount:,.2f}"
                )
            )

        self.records_count_lbl.config(text=f"Total: {len(records)} active reservation(s)")
        self.status_lbl.config(text="Table updated successfully.")

    def _on_search(self):
        """Handles query string and room category filtering."""
        query = self.search_entry.get().strip()
        filter_val = self.room_filter_combo.get()

        room_map = {
            "All Rooms": "",
            "Deluxe Room": "deluxe",
            "Executive Room": "executive",
            "Family Room": "family",
            "Premium Suite": "premium",
            "Master's Villa": "master-s-villa",
            "Executive Garden Suite": "executive-garden-suite"
        }
        room_filter = room_map.get(filter_val, "")

        results = self.manager.search_reservations(query=query, room_filter=room_filter)
        self.refresh_table(results)
        self.status_lbl.config(text=f"Found {len(results)} matching record(s).")

    def _on_reset(self):
        """Clears search and reloads all records."""
        self.search_entry.delete(0, tk.END)
        self.room_filter_combo.current(0)
        self.refresh_table()

    def _get_selected_reference(self) -> Optional[str]:
        selected = self.tree.selection()
        if not selected:
            messagebox.showwarning(
                "No Selection",
                "Please select a reservation record from the table first.",
                parent=self.root
            )
            return None
        item_values = self.tree.item(selected[0], "values")
        return item_values[0]

    def _open_add_modal(self):
        ReservationModal(
            parent=self.root,
            reservation_manager=self.manager,
            on_save_callback=self.refresh_table
        )

    def _open_edit_modal(self):
        ref = self._get_selected_reference()
        if not ref:
            return
        res = self.manager.get_reservation(ref)
        ReservationModal(
            parent=self.root,
            reservation_manager=self.manager,
            on_save_callback=self.refresh_table,
            reservation_to_edit=res
        )

    def _delete_selected(self):
        ref = self._get_selected_reference()
        if not ref:
            return
        res = self.manager.get_reservation(ref)

        confirm = messagebox.askyesno(
            "Confirm Cancellation",
            f"Are you sure you want to cancel and delete reservation #{ref} for {res.guest_name}?",
            parent=self.root
        )
        if confirm:
            self.manager.delete_reservation(ref)
            self.refresh_table()
            messagebox.showinfo(
                "Cancelled",
                f"Reservation #{ref} has been removed from the database.",
                parent=self.root
            )

    def _view_details(self):
        ref = self._get_selected_reference()
        if not ref:
            return
        res = self.manager.get_reservation(ref)

        details_msg = (
            f"Casa Amara Reservation Details\n"
            f"---------------------------------------\n"
            f"Reference ID:    {res.reference_id}\n"
            f"Guest Name:      {res.guest_name}\n"
            f"Email Address:   {res.email}\n"
            f"Phone Number:    {res.phone}\n\n"
            f"Room Type:       {res.room.name}\n"
            f"Room Number:     Room {getattr(res, 'room_number', '') or '101'}\n"
            f"Bed Setup:       {res.room.bed_config}\n"
            f"Party Size:      {res.guests} guest(s)\n"
            f"Stay Dates:      {res.check_in} to {res.check_out} ({res.nights} nights)\n"
            f"Nightly Rate:    ₱{res.room.base_rate:,.2f}\n"
            f"Total Amount:    ₱{res.total_amount:,.2f} (incl. 12% tax)\n"
            f"Payment Status:  {res.payment_status}\n\n"
            f"Special Requests:\n"
            f"{res.special_requests if res.special_requests else 'None specified'}\n"
        )
        messagebox.showinfo(f"Details: {ref}", details_msg, parent=self.root)

    def _save_database(self):
        self.manager.save_data()
        messagebox.showinfo("Saved", "Database saved to data/reservations.json successfully!", parent=self.root)

    def _reload_database(self):
        self.manager.load_data()
        self.refresh_table()
        messagebox.showinfo("Reloaded", "Database reloaded from data/reservations.json.", parent=self.root)

    def _export_csv(self):
        path = filedialog.asksaveasfilename(
            parent=self.root,
            defaultextension=".csv",
            filetypes=[("CSV Spreadsheet", "*.csv"), ("All Files", "*.*")],
            title="Export Casa Amara Reservations"
        )
        if not path:
            return

        records = self.manager.get_all()
        with open(path, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow([
                "Reference ID", "Guest Name", "Email", "Phone",
                "Room Type", "Check-in", "Check-out", "Nights", "Guests",
                "Payment Status", "Total Amount (PHP)", "Special Requests"
            ])
            for r in records:
                writer.writerow([
                    r.reference_id, r.guest_name, r.email, r.phone,
                    r.room.name, r.check_in, r.check_out, r.nights, r.guests,
                    r.payment_status, r.total_amount, r.special_requests
                ])

        messagebox.showinfo("Export Successful", f"Exported {len(records)} records to:\n{path}", parent=self.root)

    def _show_about(self):
        about_text = (
            "Casa Amara Boutique Hotel\n"
            "Hotel Reservation & Management System v1.0\n\n"
            "Developed with Python & Tkinter\n"
            "Complies with Object-Oriented Programming (OOP) Principles:\n"
            "• Inheritance, Polymorphism & Abstraction\n"
            "• Encapsulation with Data Validation\n"
            "• Robust Custom Exception Handling\n"
            "• Full CRUD Operations & JSON File Persistence"
        )
        messagebox.showinfo("About Casa Amara System", about_text, parent=self.root)

    def _open_publish_room_modal(self):
        """Opens modal for posting/publishing a new room."""
        RoomModal(self.root, self.room_manager, on_success=self.refresh_table)

    def _open_manage_rooms_dialog(self):
        """Opens dialog for managing and reviewing published rooms."""
        RoomInventoryDialog(self.root, self.room_manager, on_change=self.refresh_table)

    def _logout(self):
        self.auth_service.logout()
        self.root.destroy()
        # Relaunch entry point
        import subprocess, sys
        subprocess.Popen([sys.executable, "main.py"])
