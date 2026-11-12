"""
Casa Amara Hotel Reservation System - Room Inventory & Publishing Dialog
Allows staff/admin to post, review, edit, toggle, and unpublish rooms.
"""

import tkinter as tk
from tkinter import ttk, messagebox
from typing import Optional, Callable
from src.services.room_manager import RoomManager
from src.gui.room_modal import RoomModal
from src.gui.theme import THEME_COLORS, FONTS


class RoomInventoryDialog(tk.Toplevel):
    """
    Toplevel window for managing the entire published room catalog in Python.
    """

    def __init__(self, parent: tk.Tk, room_manager: RoomManager, on_change: Optional[Callable[[], None]] = None):
        super().__init__(parent)
        self.room_manager = room_manager
        self.on_change = on_change

        self.title("Casa Amara — Room Inventory & Publishing Catalog")
        self.geometry("860x520")
        self.minsize(780, 440)
        self.configure(bg=THEME_COLORS["bg_main"])
        self.transient(parent)
        self.grab_set()

        self._build_ui()
        self.refresh_table()
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
        header = tk.Frame(self, bg=THEME_COLORS["primary"], padx=20, pady=16)
        header.pack(fill="x")

        tk.Label(
            header,
            text="Room Inventory & Website Publishing",
            font=FONTS["title"],
            fg=THEME_COLORS["accent"],
            bg=THEME_COLORS["primary"]
        ).pack(anchor="w")

        tk.Label(
            header,
            text="Published room categories automatically sync with the website catalog and booking flow.",
            font=FONTS["small"],
            fg=THEME_COLORS["text_light"],
            bg=THEME_COLORS["primary"]
        ).pack(anchor="w", pady=(3, 0))

        # Main Table Container
        container = tk.Frame(self, bg=THEME_COLORS["bg_main"], padx=20, pady=16)
        container.pack(fill="both", expand=True)

        cols = ("id", "name", "rate", "capacity", "inventory", "status", "view")
        self.tree = ttk.Treeview(container, columns=cols, show="headings", height=12)

        self.tree.heading("id", text="Room ID")
        self.tree.heading("name", text="Room Title")
        self.tree.heading("rate", text="Rate / Night")
        self.tree.heading("capacity", text="Max Guests")
        self.tree.heading("inventory", text="Inventory (Avail/Total)")
        self.tree.heading("status", text="Publish Status")
        self.tree.heading("view", text="View")

        self.tree.column("id", width=90, anchor="center")
        self.tree.column("name", width=170, anchor="w")
        self.tree.column("rate", width=110, anchor="e")
        self.tree.column("capacity", width=90, anchor="center")
        self.tree.column("inventory", width=130, anchor="center")
        self.tree.column("status", width=110, anchor="center")
        self.tree.column("view", width=120, anchor="w")

        scrollbar = ttk.Scrollbar(container, orient="vertical", command=self.tree.yview)
        self.tree.configure(yscrollcommand=scrollbar.set)

        self.tree.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")

        # Action Buttons
        actions_bar = tk.Frame(self, bg=THEME_COLORS["bg_card"], padx=20, pady=14, bd=1, relief="ridge")
        actions_bar.pack(fill="x", side="bottom")

        btn_post = tk.Button(
            actions_bar,
            text="+ Post New Room",
            font=FONTS["body_bold"],
            fg="#FFFFFF",
            bg=THEME_COLORS["accent"],
            activebackground=THEME_COLORS["accent_hover"],
            activeforeground="#FFFFFF",
            bd=0,
            padx=16,
            pady=6,
            command=self._on_post_new
        )
        btn_post.pack(side="left", padx=(0, 8))

        btn_edit = tk.Button(
            actions_bar,
            text="Edit Room",
            font=FONTS["body"],
            fg=THEME_COLORS["primary"],
            bg=THEME_COLORS["bg_main"],
            bd=1,
            padx=14,
            pady=6,
            command=self._on_edit
        )
        btn_edit.pack(side="left", padx=(0, 8))

        btn_toggle = tk.Button(
            actions_bar,
            text="Toggle Status (Available/Maintenance)",
            font=FONTS["body"],
            fg=THEME_COLORS["primary"],
            bg=THEME_COLORS["bg_main"],
            bd=1,
            padx=14,
            pady=6,
            command=self._on_toggle_status
        )
        btn_toggle.pack(side="left", padx=(0, 8))

        btn_delete = tk.Button(
            actions_bar,
            text="Unpublish / Delete",
            font=FONTS["body"],
            fg="#C53030",
            bg="#FFF5F5",
            bd=1,
            padx=14,
            pady=6,
            command=self._on_delete
        )
        btn_delete.pack(side="left")

        btn_close = tk.Button(
            actions_bar,
            text="Close",
            font=FONTS["body"],
            fg=THEME_COLORS["primary"],
            bg=THEME_COLORS["bg_main"],
            bd=1,
            padx=16,
            pady=6,
            command=self.destroy
        )
        btn_close.pack(side="right")

    def refresh_table(self):
        for item in self.tree.get_children():
            self.tree.delete(item)

        rooms = self.room_manager.get_all_rooms()
        for r in rooms:
            avail = r.get("available_units", r.get("inventory_units", 0))
            total = r.get("inventory_units", 0)
            self.tree.insert(
                "",
                tk.END,
                values=(
                    r.get("id", ""),
                    r.get("name", ""),
                    f"₱{float(r.get('rate_per_night', 0)):,.2f}",
                    f"{r.get('max_guests', 2)} guests",
                    f"{avail} / {total} units",
                    r.get("status", "available").upper(),
                    r.get("view", "Courtyard")
                )
            )

    def _get_selected_room(self) -> Optional[dict]:
        selected = self.tree.selection()
        if not selected:
            messagebox.showwarning("Selection Required", "Please select a room category first.", parent=self)
            return None
        item_vals = self.tree.item(selected[0], "values")
        room_id = item_vals[0]
        return self.room_manager.get_room_by_id(room_id)

    def _on_post_new(self):
        RoomModal(self, self.room_manager, room_data=None, on_success=self._on_data_updated)

    def _on_edit(self):
        room = self._get_selected_room()
        if room:
            RoomModal(self, self.room_manager, room_data=room, on_success=self._on_data_updated)

    def _on_toggle_status(self):
        room = self._get_selected_room()
        if not room:
            return
        new_status = self.room_manager.toggle_room_status(room["id"])
        messagebox.showinfo("Status Updated", f"Room '{room['name']}' is now set to {new_status.upper()}.", parent=self)
        self._on_data_updated()

    def _on_delete(self):
        room = self._get_selected_room()
        if not room:
            return
        if messagebox.askyesno("Confirm Unpublish", f"Unpublish room '{room['name']}' from the hotel catalog?", parent=self):
            self.room_manager.delete_room(room["id"])
            messagebox.showinfo("Deleted", f"Room '{room['name']}' has been removed.", parent=self)
            self._on_data_updated()

    def _on_data_updated(self):
        self.refresh_table()
        if self.on_change:
            self.on_change()
