"""
Casa Amara Hotel Reservation System - GUI Theme & Styling
Defines color palette and typography matching Casa Amara luxury branding.
"""

from tkinter import ttk

# Brand Color Palette
COLOR_ESPRESSO = "#35281F"
COLOR_ESPRESSO_DARK = "#251B14"
COLOR_GOLD = "#B59A72"
COLOR_GOLD_HOVER = "#9E845F"
COLOR_OFF_WHITE = "#FAF7F2"
COLOR_WARM_BEIGE = "#EAE4DC"
COLOR_CARD_BG = "#FFFFFF"
COLOR_CHARCOAL = "#23201D"
COLOR_TEXT_MUTED = "#6E665E"
COLOR_BORDER = "#DCD5CA"
COLOR_SUCCESS = "#2E7D32"
COLOR_DANGER = "#C62828"

# Fonts
FONT_TITLE = ("Georgia", 18, "bold")
FONT_SUBTITLE = ("Georgia", 13)
FONT_HEADING = ("Segoe UI", 11, "bold")
FONT_BODY = ("Segoe UI", 10)
FONT_SMALL = ("Segoe UI", 9)
FONT_MONO = ("Consolas", 10)

THEME_COLORS = {
    "primary": COLOR_ESPRESSO,
    "primary_dark": COLOR_ESPRESSO_DARK,
    "accent": COLOR_GOLD,
    "accent_hover": COLOR_GOLD_HOVER,
    "bg_main": COLOR_OFF_WHITE,
    "bg_card": COLOR_CARD_BG,
    "text_dark": COLOR_CHARCOAL,
    "text_light": "#FFFFFF",
    "text_muted": COLOR_TEXT_MUTED,
    "border": COLOR_BORDER,
    "success": COLOR_SUCCESS,
    "danger": COLOR_DANGER,
}

FONTS = {
    "title": FONT_TITLE,
    "subtitle": FONT_SUBTITLE,
    "heading": FONT_HEADING,
    "body": FONT_BODY,
    "body_bold": FONT_HEADING,
    "small": FONT_SMALL,
    "mono": FONT_MONO,
}


def configure_ttk_theme(style: ttk.Style):
    """Configures modern styling for ttk widgets."""
    style.theme_use("clam")

    # Treeview (Data Table) Styling
    style.configure(
        "Treeview",
        background=COLOR_CARD_BG,
        foreground=COLOR_CHARCOAL,
        rowheight=28,
        fieldbackground=COLOR_CARD_BG,
        font=FONT_BODY,
        borderwidth=0
    )
    style.configure(
        "Treeview.Heading",
        background=COLOR_WARM_BEIGE,
        foreground=COLOR_CHARCOAL,
        font=FONT_HEADING,
        padding=6,
        borderwidth=1,
        relief="flat"
    )
    style.map(
        "Treeview",
        background=[("selected", COLOR_GOLD)],
        foreground=[("selected", "#FFFFFF")]
    )

    # Primary Gold Button
    style.configure(
        "Primary.TButton",
        background=COLOR_GOLD,
        foreground="#FFFFFF",
        font=FONT_HEADING,
        padding=(14, 6),
        borderwidth=0
    )
    style.map(
        "Primary.TButton",
        background=[("active", COLOR_GOLD_HOVER), ("disabled", "#D0C7BB")]
    )

    # Secondary Outline Button
    style.configure(
        "Secondary.TButton",
        background=COLOR_WARM_BEIGE,
        foreground=COLOR_CHARCOAL,
        font=FONT_BODY,
        padding=(12, 5),
        borderwidth=1
    )

    # Danger Button
    style.configure(
        "Danger.TButton",
        background="#B71C1C",
        foreground="#FFFFFF",
        font=FONT_BODY,
        padding=(12, 5)
    )

    # Combobox Styling
    style.configure(
        "TCombobox",
        fieldbackground=COLOR_CARD_BG,
        background=COLOR_WARM_BEIGE,
        foreground=COLOR_CHARCOAL,
        padding=4
    )
