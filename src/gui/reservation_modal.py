"""
Casa Amara Hotel Reservation System - Add/Edit Reservation Modal
Demonstrates Form Windows, Textboxes, Comboboxes, Buttons, and Custom Exception Handling.
"""

import tkinter as tk
from tkinter import ttk, messagebox
from typing import Optional, Callable
from src.models.reservation import Reservation
from src.models.room_types import get_room_by_id
from src.services.reservation_manager import ReservationManager
from src.exceptions import (
    CapacityExceededError,
    InvalidDateError,
    InvalidReservationError,
    CasaAmaraError
)
from src.gui.theme import (
    COLOR_ESPRESSO, COLOR_OFF_WHITE, COLOR_GOLD, COLOR_CARD_BG,
    COLOR_CHARCOAL, COLOR_TEXT_MUTED, FONT_TITLE, FONT_HEADING, FONT_BODY, FONT_SMALL
)


class ReservationModal(tk.Toplevel):
    """
    Modal window for Adding a New Reservation or Editing an Existing Record.
    """

    ROOM_OPTIONS = [
        ("Deluxe Room (₱8,200/night, max 2 guests)", "deluxe"),
        ("Executive Room (₱11,500/night, max 3 guests)", "executive"),
        ("Family Room (₱9,800/night, max 5 guests)", "family"),
        ("Premium Suite (₱14,500/night, max 5 guests)", "premium"),
        ("Master's Villa (₱9,000/night, max 4 guests)", "master-s-villa"),
        ("Executive Garden Suite (₱12,500/night, max 2 guests)", "executive-garden-suite"),
    ]

    PAYMENT_STATUSES = ["Deposit paid", "Pay at hotel", "Fully paid"]

    def __init__(
        self,
        parent: tk.Tk,
        reservation_manager: ReservationManager,
        on_save_callback: Callable[[], None],
        reservation_to_edit: Optional[Reservation] = None
    ):
        super().__init__(parent)
        self.parent = parent
        self.manager = reservation_manager
        self.on_save_callback = on_save_callback
        self.reservation_to_edit = reservation_to_edit
        self.is_edit_mode = reservation_to_edit is not None

        mode_title = "Edit Reservation" if self.is_edit_mode else "New Reservation"
        self.title(f"Casa Amara - {mode_title}")
        self.geometry("540x680")
        self.resizable(False, False)
        self.configure(bg=COLOR_OFF_WHITE)

        # Make modal
        self.transient(parent)
        self.grab_set()

        # Center on parent
        self.update_idletasks()
        x = parent.winfo_x() + (parent.winfo_width() // 2) - 270
        y = parent.winfo_y() + (parent.winfo_height() // 2) - 340
        self.geometry(f"+{x}+{y}")

        self._build_widgets()

    def _build_widgets(self):
        # Header Banner
        header = tk.Frame(self, bg=COLOR_ESPRESSO, height=75)
        header.pack(fill=tk.X)
        header.pack_propagate(False)

        title_text = "Edit Reservation Record" if self.is_edit_mode else "Create New Reservation"
        subtitle_text = (
            f"Reference: {self.reservation_to_edit.reference_id}"
            if self.is_edit_mode
            else "Book guest room directly into Casa Amara system"
        )

        tk.Label(
            header,
            text=title_text,
            font=("Georgia", 14, "bold"),
            bg=COLOR_ESPRESSO,
            fg="#FFFFFF"
        ).pack(anchor="w", padx=25, pady=(14, 2))

        tk.Label(
            header,
            text=subtitle_text,
            font=FONT_SMALL,
            bg=COLOR_ESPRESSO,
            fg=COLOR_GOLD
        ).pack(anchor="w", padx=25)

        # Form Scrollable Canvas / Frame
        body_frame = tk.Frame(self, bg=COLOR_OFF_WHITE, padx=25, pady=18)
        body_frame.pack(fill=tk.BOTH, expand=True)

        # 1. Guest Name
        self._add_label(body_frame, "Guest Full Name *")
        self.name_entry = ttk.Entry(body_frame, font=FONT_BODY)
        self.name_entry.pack(fill=tk.X, pady=(0, 10))

        # 2. Email Address
        self._add_label(body_frame, "Email Address *")
        self.email_entry = ttk.Entry(body_frame, font=FONT_BODY)
        self.email_entry.pack(fill=tk.X, pady=(0, 10))

        # 3. Phone Number
        self._add_label(body_frame, "Contact Phone Number *")
        self.phone_entry = ttk.Entry(body_frame, font=FONT_BODY)
        self.phone_entry.pack(fill=tk.X, pady=(0, 10))

        # 4. Room Type & Assigned Room Number (2 Columns)
        room_row = tk.Frame(body_frame, bg=COLOR_OFF_WHITE)
        room_row.pack(fill=tk.X, pady=(0, 10))

        col_type = tk.Frame(room_row, bg=COLOR_OFF_WHITE)
        col_type.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 6))
        self._add_label(col_type, "Room Type *")
        self.room_combo = ttk.Combobox(
            col_type,
            values=[opt[0] for opt in self.ROOM_OPTIONS],
            state="readonly",
            font=FONT_BODY
        )
        self.room_combo.pack(fill=tk.X)
        self.room_combo.current(0)
        self.room_combo.bind("<<ComboboxSelected>>", lambda e: self._on_room_type_changed())

        col_num = tk.Frame(room_row, bg=COLOR_OFF_WHITE)
        col_num.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(6, 0))
        self._add_label(col_num, "Assigned Room No. *")
        self.room_number_entry = ttk.Entry(col_num, font=FONT_BODY)
        self.room_number_entry.pack(fill=tk.X)
        self.room_number_entry.insert(0, "101")

        # 5. Dates (Check-in & Check-out) 2 Columns
        dates_row = tk.Frame(body_frame, bg=COLOR_OFF_WHITE)
        dates_row.pack(fill=tk.X, pady=(0, 10))

        col_in = tk.Frame(dates_row, bg=COLOR_OFF_WHITE)
        col_in.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 6))
        self._add_label(col_in, "Check-in (MM/DD/YYYY) *")
        self.checkin_entry = ttk.Entry(col_in, font=FONT_BODY)
        self.checkin_entry.pack(fill=tk.X)
        self.checkin_entry.insert(0, "10/27/2026")
        self.checkin_entry.bind("<KeyRelease>", lambda e: self._recalculate_preview())

        col_out = tk.Frame(dates_row, bg=COLOR_OFF_WHITE)
        col_out.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(6, 0))
        self._add_label(col_out, "Check-out (MM/DD/YYYY) *")
        self.checkout_entry = ttk.Entry(col_out, font=FONT_BODY)
        self.checkout_entry.pack(fill=tk.X)
        self.checkout_entry.insert(0, "10/30/2026")
        self.checkout_entry.bind("<KeyRelease>", lambda e: self._recalculate_preview())

        # 6. Guests & Payment Status (2 Columns)
        extra_row = tk.Frame(body_frame, bg=COLOR_OFF_WHITE)
        extra_row.pack(fill=tk.X, pady=(0, 10))

        col_guests = tk.Frame(extra_row, bg=COLOR_OFF_WHITE)
        col_guests.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 6))
        self._add_label(col_guests, "Guests (Party Size) *")
        self.guests_combo = ttk.Combobox(
            col_guests,
            values=["1", "2", "3", "4", "5"],
            state="readonly",
            font=FONT_BODY
        )
        self.guests_combo.pack(fill=tk.X)
        self.guests_combo.set("2")
        self.guests_combo.bind("<<ComboboxSelected>>", lambda e: self._recalculate_preview())

        col_pay = tk.Frame(extra_row, bg=COLOR_OFF_WHITE)
        col_pay.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(6, 0))
        self._add_label(col_pay, "Payment Status")
        self.pay_combo = ttk.Combobox(
            col_pay,
            values=self.PAYMENT_STATUSES,
            state="readonly",
            font=FONT_BODY
        )
        self.pay_combo.pack(fill=tk.X)
        self.pay_combo.set("Deposit paid")

        # 7. Special Requests
        self._add_label(body_frame, "Special Requests (Optional)")
        self.requests_entry = ttk.Entry(body_frame, font=FONT_BODY)
        self.requests_entry.pack(fill=tk.X, pady=(0, 12))

        # 8. Live Total Price Preview Box
        self.preview_box = tk.Frame(body_frame, bg="#E8DFD3", padx=12, pady=10, relief="groove", borderwidth=1)
        self.preview_box.pack(fill=tk.X, pady=(0, 16))

        self.preview_lbl = tk.Label(
            self.preview_box,
            text="Estimated Total: ₱27,552.00 (3 nights, incl. 12% tax & fees)",
            font=FONT_HEADING,
            bg="#E8DFD3",
            fg=COLOR_CHARCOAL
        )
        self.preview_lbl.pack(anchor="w")

        # 9. Button Actions
        btn_bar = tk.Frame(body_frame, bg=COLOR_OFF_WHITE)
        btn_bar.pack(fill=tk.X)

        cancel_btn = ttk.Button(btn_bar, text="Cancel", command=self.destroy)
        cancel_btn.pack(side=tk.RIGHT, padx=(6, 0))

        save_btn_txt = "Save Changes" if self.is_edit_mode else "Create Reservation"
        save_btn = ttk.Button(btn_bar, text=save_btn_txt, style="Primary.TButton", command=self._save_record)
        save_btn.pack(side=tk.RIGHT)

        # Pre-fill if editing
        if self.is_edit_mode:
            self._prefill_edit_data()

    def _add_label(self, parent: tk.Widget, text: str):
        lbl = tk.Label(parent, text=text, font=FONT_HEADING, bg=COLOR_OFF_WHITE, fg=COLOR_CHARCOAL)
        lbl.pack(anchor="w", pady=(0, 2))

    def _get_selected_room_id(self) -> str:
        idx = self.room_combo.current()
        if idx >= 0 and idx < len(self.ROOM_OPTIONS):
            return self.ROOM_OPTIONS[idx][1]
        return "deluxe"

    def _prefill_edit_data(self):
        res = self.reservation_to_edit
        self.name_entry.insert(0, res.guest_name)
        self.email_entry.insert(0, res.email)
        self.phone_entry.insert(0, res.phone)
        self.room_number_entry.delete(0, tk.END)
        self.room_number_entry.insert(0, getattr(res, "room_number", "") or "101")
        self.checkin_entry.delete(0, tk.END)
        self.checkin_entry.insert(0, res.check_in)
        self.checkout_entry.delete(0, tk.END)
        self.checkout_entry.insert(0, res.check_out)
        self.guests_combo.set(str(res.guests))
        self.pay_combo.set(res.payment_status)
        self.requests_entry.insert(0, res.special_requests)

        matched = False
        for i, opt in enumerate(self.ROOM_OPTIONS):
            if opt[1] == res.room.room_type_id:
                self.room_combo.current(i)
                matched = True
                break
        if not matched:
            custom_opt = (f"{res.room.name} (₱{res.room.base_rate:,.0f}/night, max {res.room.max_capacity} guests)", res.room.room_type_id)
            self.ROOM_OPTIONS.append(custom_opt)
            self.room_combo["values"] = [opt[0] for opt in self.ROOM_OPTIONS]
            self.room_combo.current(len(self.ROOM_OPTIONS) - 1)
        self._recalculate_preview()

    def _on_room_type_changed(self):
        room_id = self._get_selected_room_id()
        default_room_map = {
            "deluxe": "101",
            "executive": "201",
            "family": "109",
            "premium": "301",
            "master-s-villa": "206",
            "villa": "205",
            "executive-garden-suite": "302"
        }
        if not self.is_edit_mode:
            self.room_number_entry.delete(0, tk.END)
            self.room_number_entry.insert(0, default_room_map.get(room_id, "101"))
        self._recalculate_preview()

    def _recalculate_preview(self):
        """Dynamically updates cost estimation while catching input errors gracefully."""
        try:
            room_id = self._get_selected_room_id()
            room = get_room_by_id(room_id)
            guests = int(self.guests_combo.get() or "2")
            check_in = self.checkin_entry.get().strip()
            check_out = self.checkout_entry.get().strip()

            from datetime import datetime
            d_in = datetime.strptime(check_in, "%m/%d/%Y")
            d_out = datetime.strptime(check_out, "%m/%d/%Y")
            nights = (d_out - d_in).days

            if nights > 0:
                cost = room.calculate_cost(nights, guests)
                self.preview_lbl.config(
                    text=f"Estimated Total: ₱{cost:,.2f} ({nights} nights, incl. 12% tax & fees)",
                    fg=COLOR_CHARCOAL
                )
            else:
                self.preview_lbl.config(
                    text="Check-out must be after check-in date.",
                    fg="#B71C1C"
                )
        except Exception:
            self.preview_lbl.config(
                text="Enter valid dates (MM/DD/YYYY) to preview cost.",
                fg=COLOR_TEXT_MUTED
            )

    def _save_record(self):
        """
        Validates all fields, handles custom exceptions, and persists record.
        Demonstrates Exception Handling requirement.
        """
        try:
            name = self.name_entry.get().strip()
            email = self.email_entry.get().strip()
            phone = self.phone_entry.get().strip()
            room_id = self._get_selected_room_id()
            check_in = self.checkin_entry.get().strip()
            check_out = self.checkout_entry.get().strip()
            guests = int(self.guests_combo.get() or "2")
            payment_status = self.pay_combo.get().strip()
            special_requests = self.requests_entry.get().strip()
            room_number = self.room_number_entry.get().strip() or "101"

            # Empty fields check
            if not name or not email or not phone or not check_in or not check_out:
                raise InvalidReservationError("All required fields with (*) must be completed.")

            room = get_room_by_id(room_id)

            if self.is_edit_mode:
                # Update existing record
                self.manager.update_reservation(
                    self.reservation_to_edit.reference_id,
                    guest_name=name,
                    email=email,
                    phone=phone,
                    room_type=room_id,
                    room_number=room_number,
                    check_in=check_in,
                    check_out=check_out,
                    guests=guests,
                    payment_status=payment_status,
                    special_requests=special_requests
                )
                messagebox.showinfo(
                    "Success",
                    f"Reservation #{self.reservation_to_edit.reference_id} was updated successfully!",
                    parent=self
                )
            else:
                # Create new record
                new_res = Reservation(
                    guest_name=name,
                    email=email,
                    phone=phone,
                    room=room,
                    room_number=room_number,
                    check_in=check_in,
                    check_out=check_out,
                    guests=guests,
                    payment_status=payment_status,
                    special_requests=special_requests
                )
                self.manager.add_reservation(new_res)
                messagebox.showinfo(
                    "Success",
                    f"Reservation #{new_res.reference_id} created successfully!",
                    parent=self
                )

            self.on_save_callback()
            self.destroy()

        except CapacityExceededError as e:
            messagebox.showerror("Room Capacity Exceeded", str(e), parent=self)
        except InvalidDateError as e:
            messagebox.showerror("Invalid Stay Dates", str(e), parent=self)
        except InvalidReservationError as e:
            messagebox.showerror("Validation Error", str(e), parent=self)
        except ValueError as e:
            messagebox.showerror("Invalid Input Value", str(e), parent=self)
        except CasaAmaraError as e:
            messagebox.showerror("Application Error", str(e), parent=self)
        except Exception as e:
            messagebox.showerror("System Error", f"Unexpected error occurred:\n{str(e)}", parent=self)
