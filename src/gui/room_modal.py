"""
Casa Amara Hotel Reservation System - Post / Edit Room Modal Window
Tkinter GUI Form adhering to OOP standards and Casa Amara Styling.
"""

import tkinter as tk
from tkinter import ttk, messagebox
from typing import Optional, Dict, Any, Callable
from src.gui.theme import THEME_COLORS, FONTS
from src.services.room_manager import RoomManager
from src.exceptions import CasaAmaraError


class RoomModal(tk.Toplevel):
    """
    Modal dialog allowing the Hotel Admin to post and publish available rooms.
    """

    def __init__(
        self,
        parent: tk.Tk,
        room_manager: RoomManager,
        room_data: Optional[Dict[str, Any]] = None,
        on_success: Optional[Callable[[], None]] = None
    ):
        super().__init__(parent)
        self.room_manager = room_manager
        self.room_data = room_data or {}
        self.on_success = on_success
        self.is_edit = bool(room_data)

        title_text = "Edit Room Details" if self.is_edit else "Post / Publish New Room"
        self.title(f"Casa Amara — {title_text}")
        self.geometry("560x650")
        self.minsize(520, 600)
        self.configure(bg=THEME_COLORS["bg_main"])
        self.transient(parent)
        self.grab_set()

        self._build_ui()
        self._populate_fields()
        self.center_window()

    def center_window(self):
        self.update_idletasks()
        w = self.winfo_width()
        h = self.winfo_height()
        sw = self.winfo_screenwidth()
        sh = self.winfo_screenheight()
        x = max(0, (sw - w) // 2)
        y = max(0, (sh - h) // 2)
        self.geometry(f"{w}x{h}+{x}+{y}")

    def _build_ui(self):
        # Header banner
        header_frame = tk.Frame(self, bg=THEME_COLORS["primary"], padx=20, pady=16)
        header_frame.pack(fill="x")

        title_lbl = tk.Label(
            header_frame,
            text="Edit Room Listing" if self.is_edit else "Publish Available Room",
            font=FONTS["title"],
            fg=THEME_COLORS["accent"],
            bg=THEME_COLORS["primary"]
        )
        title_lbl.pack(anchor="w")

        sub_lbl = tk.Label(
            header_frame,
            text="Manage rates, guest capacity, inventory units, and publish live to website.",
            font=FONTS["small"],
            fg=THEME_COLORS["text_light"],
            bg=THEME_COLORS["primary"]
        )
        sub_lbl.pack(anchor="w", pady=(3, 0))

        # Main Scrollable / Padded Form
        form_frame = tk.Frame(self, bg=THEME_COLORS["bg_main"], padx=25, pady=20)
        form_frame.pack(fill="both", expand=True)

        row = 0
        # Room Name
        tk.Label(form_frame, text="Room Title *", font=FONTS["body_bold"], fg=THEME_COLORS["text_dark"], bg=THEME_COLORS["bg_main"]).grid(row=row, column=0, sticky="w", pady=4)
        self.var_name = tk.StringVar()
        self.entry_name = ttk.Entry(form_frame, textvariable=self.var_name, font=FONTS["body"])
        self.entry_name.grid(row=row, column=1, sticky="ew", pady=4)

        row += 1
        # Rate per Night
        tk.Label(form_frame, text="Nightly Rate (₱) *", font=FONTS["body_bold"], fg=THEME_COLORS["text_dark"], bg=THEME_COLORS["bg_main"]).grid(row=row, column=0, sticky="w", pady=4)
        self.var_rate = tk.DoubleVar(value=8500.0)
        self.entry_rate = ttk.Entry(form_frame, textvariable=self.var_rate, font=FONTS["body"])
        self.entry_rate.grid(row=row, column=1, sticky="ew", pady=4)

        row += 1
        # Tagline
        tk.Label(form_frame, text="Tagline / Summary", font=FONTS["body_bold"], fg=THEME_COLORS["text_dark"], bg=THEME_COLORS["bg_main"]).grid(row=row, column=0, sticky="w", pady=4)
        self.var_tagline = tk.StringVar()
        self.entry_tagline = ttk.Entry(form_frame, textvariable=self.var_tagline, font=FONTS["body"])
        self.entry_tagline.grid(row=row, column=1, sticky="ew", pady=4)

        row += 1
        # Max Guests
        tk.Label(form_frame, text="Max Guest Capacity *", font=FONTS["body_bold"], fg=THEME_COLORS["text_dark"], bg=THEME_COLORS["bg_main"]).grid(row=row, column=0, sticky="w", pady=4)
        self.var_max_guests = tk.IntVar(value=2)
        self.spin_guests = ttk.Spinbox(form_frame, from_=1, to=10, textvariable=self.var_max_guests, font=FONTS["body"])
        self.spin_guests.grid(row=row, column=1, sticky="ew", pady=4)

        row += 1
        # Total Inventory Units
        tk.Label(form_frame, text="Total Inventory Units *", font=FONTS["body_bold"], fg=THEME_COLORS["text_dark"], bg=THEME_COLORS["bg_main"]).grid(row=row, column=0, sticky="w", pady=4)
        self.var_total_units = tk.IntVar(value=5)
        self.spin_total = ttk.Spinbox(form_frame, from_=1, to=50, textvariable=self.var_total_units, font=FONTS["body"])
        self.spin_total.grid(row=row, column=1, sticky="ew", pady=4)

        row += 1
        # Available Units
        tk.Label(form_frame, text="Available Units *", font=FONTS["body_bold"], fg=THEME_COLORS["text_dark"], bg=THEME_COLORS["bg_main"]).grid(row=row, column=0, sticky="w", pady=4)
        self.var_avail_units = tk.IntVar(value=5)
        self.spin_avail = ttk.Spinbox(form_frame, from_=0, to=50, textvariable=self.var_avail_units, font=FONTS["body"])
        self.spin_avail.grid(row=row, column=1, sticky="ew", pady=4)

        row += 1
        # Bed Configuration
        tk.Label(form_frame, text="Bed Configuration", font=FONTS["body_bold"], fg=THEME_COLORS["text_dark"], bg=THEME_COLORS["bg_main"]).grid(row=row, column=0, sticky="w", pady=4)
        self.var_beds = tk.StringVar(value="1 King Bed")
        self.entry_beds = ttk.Entry(form_frame, textvariable=self.var_beds, font=FONTS["body"])
        self.entry_beds.grid(row=row, column=1, sticky="ew", pady=4)

        row += 1
        # Size & View
        tk.Label(form_frame, text="Room Size & View", font=FONTS["body_bold"], fg=THEME_COLORS["text_dark"], bg=THEME_COLORS["bg_main"]).grid(row=row, column=0, sticky="w", pady=4)
        split_frame = tk.Frame(form_frame, bg=THEME_COLORS["bg_main"])
        split_frame.grid(row=row, column=1, sticky="ew", pady=4)
        split_frame.columnconfigure(0, weight=1)
        split_frame.columnconfigure(1, weight=1)

        self.var_size = tk.StringVar(value="42 m²")
        self.entry_size = ttk.Entry(split_frame, textvariable=self.var_size, font=FONTS["body"])
        self.entry_size.grid(row=0, column=0, sticky="ew", padx=(0, 4))

        self.var_view = tk.StringVar(value="Courtyard Garden")
        self.entry_view = ttk.Entry(split_frame, textvariable=self.var_view, font=FONTS["body"])
        self.entry_view.grid(row=0, column=1, sticky="ew", padx=(4, 0))

        row += 1
        # Status
        tk.Label(form_frame, text="Publishing Status *", font=FONTS["body_bold"], fg=THEME_COLORS["text_dark"], bg=THEME_COLORS["bg_main"]).grid(row=row, column=0, sticky="w", pady=4)
        self.var_status = tk.StringVar(value="available")
        self.combo_status = ttk.Combobox(form_frame, textvariable=self.var_status, state="readonly", values=["available", "maintenance", "sold_out"])
        self.combo_status.grid(row=row, column=1, sticky="ew", pady=4)

        row += 1
        # Badge
        tk.Label(form_frame, text="Badge Tag", font=FONTS["body_bold"], fg=THEME_COLORS["text_dark"], bg=THEME_COLORS["bg_main"]).grid(row=row, column=0, sticky="w", pady=4)
        self.var_badge = tk.StringVar(value="Signature")
        self.entry_badge = ttk.Entry(form_frame, textvariable=self.var_badge, font=FONTS["body"])
        self.entry_badge.grid(row=row, column=1, sticky="ew", pady=4)

        form_frame.columnconfigure(1, weight=1)

        # Bottom Actions Bar
        actions_bar = tk.Frame(self, bg=THEME_COLORS["bg_card"], padx=20, pady=16, bd=1, relief="ridge")
        actions_bar.pack(fill="x", side="bottom")

        btn_cancel = tk.Button(
            actions_bar,
            text="Cancel",
            font=FONTS["body"],
            fg=THEME_COLORS["primary"],
            bg=THEME_COLORS["bg_main"],
            bd=1,
            padx=16,
            pady=6,
            command=self.destroy
        )
        btn_cancel.pack(side="right", padx=(8, 0))

        btn_save = tk.Button(
            actions_bar,
            text="Save & Publish Room",
            font=FONTS["body_bold"],
            fg="#FFFFFF",
            bg=THEME_COLORS["accent"],
            activebackground=THEME_COLORS["accent_hover"],
            activeforeground="#FFFFFF",
            bd=0,
            padx=20,
            pady=6,
            command=self._on_save
        )
        btn_save.pack(side="right")

    def _populate_fields(self):
        if not self.room_data:
            return
        self.var_name.set(self.room_data.get("name", ""))
        self.var_rate.set(float(self.room_data.get("rate_per_night", 8500.0)))
        self.var_tagline.set(self.room_data.get("tagline", ""))
        self.var_max_guests.set(int(self.room_data.get("max_guests", 2)))
        self.var_total_units.set(int(self.room_data.get("inventory_units", 5)))
        self.var_avail_units.set(int(self.room_data.get("available_units", 5)))
        self.var_beds.set(self.room_data.get("bed_config", "1 King Bed"))
        self.var_size.set(self.room_data.get("room_size", "40 m²"))
        self.var_view.set(self.room_data.get("view", "Courtyard"))
        self.var_status.set(self.room_data.get("status", "available"))
        self.var_badge.set(self.room_data.get("badge", ""))

    def _on_save(self):
        name = self.var_name.get().strip()
        if not name:
            messagebox.showwarning("Validation Error", "Room name is required.", parent=self)
            return

        try:
            rate = float(self.var_rate.get())
            if rate <= 0:
                raise ValueError()
        except ValueError:
            messagebox.showwarning("Validation Error", "Rate per night must be a positive number.", parent=self)
            return

        room_id = self.room_data.get("id") or name.lower().replace(" ", "-").replace("/", "-")

        payload = {
            "id": room_id,
            "name": name,
            "rate_per_night": rate,
            "tagline": self.var_tagline.get().strip(),
            "max_guests": int(self.var_max_guests.get()),
            "inventory_units": int(self.var_total_units.get()),
            "available_units": int(self.var_avail_units.get()),
            "bed_config": self.var_beds.get().strip(),
            "room_size": self.var_size.get().strip(),
            "view": self.var_view.get().strip(),
            "badge": self.var_badge.get().strip(),
            "status": self.var_status.get(),
            "amenities": self.room_data.get("amenities", ["Courtyard view", "Walk-in rain shower", "Complimentary Wi-Fi"]),
            "image": self.room_data.get("image", "assets/images/deluxe-room.jpg"),
            "featured": self.room_data.get("featured", True)
        }

        try:
            self.room_manager.save_room(payload)
            messagebox.showinfo("Published", f"Room '{name}' is successfully published and updated!", parent=self)
            if self.on_success:
                self.on_success()
            self.destroy()
        except CasaAmaraError as err:
            messagebox.showerror("Error", str(err), parent=self)
