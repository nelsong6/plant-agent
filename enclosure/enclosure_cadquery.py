"""
enclosure_cadquery.py — CadQuery port of the plant-eye enclosure

Generates STEP files for both base and top shells.
All dimensions in millimeters, matching the OpenSCAD originals.

Usage:
    python enclosure_cadquery.py              # exports base.step, top.step, assembly.step
    python enclosure_cadquery.py --part base  # export only base
    python enclosure_cadquery.py --part top   # export only top
"""

import argparse
import math
import os

import cadquery as cq

# ── Shared Parameters ────────────────────────────────────────────────

WALL = 2.4          # wall thickness
FLOOR_H = 2.0       # floor thickness
TOLERANCE = 0.3     # extra clearance for PCB fit
STANDOFF_H = 6      # Pi standoff height above floor
CORNER_R = 4        # outer corner radius

# ── Raspberry Pi 5 Dimensions ────────────────────────────────────────

PI5_BOARD_W = 85    # X length
PI5_BOARD_D = 56    # Y length
PI5_BOARD_H = 1.6   # PCB thickness

PI5_HOLES = [       # mounting hole positions from board origin (bottom-left)
    (3.5, 3.5),
    (3.5, 52.5),
    (61.5, 3.5),
    (61.5, 52.5),
]

# Port specs: (x_start, y_start, width, depth, height) from board origin
# Right edge ports (+X side)
PI5_ETHERNET = (73, 1.75, 21.5, 16, 13.5)
PI5_USB2     = (73, 20.5, 17.4, 13.1, 15.4)
PI5_USB3     = (73, 36,   17.4, 13.1, 15.4)
# Bottom edge ports (-Y side)
PI5_HDMI0    = (25.5, -1.5, 7.4, 8,  3.2)
PI5_HDMI1    = (39,   -1.5, 7.4, 8,  3.2)
PI5_USBC     = (11.2, -1.5, 9,   7.5, 3.2)

# ── Arducam B0283 Dimensions ─────────────────────────────────────────

B0283_CLEARANCE_R = 35    # radius needed for full pan+tilt sweep
B0283_MOUNT_SPACING_X = 24
B0283_MOUNT_SPACING_Y = 24

# ── Derived Dimensions ───────────────────────────────────────────────

INNER_W = PI5_BOARD_W + TOLERANCE * 2 + 2  # +2 for cable routing space
INNER_D = PI5_BOARD_D + TOLERANCE * 2 + 2
INNER_H = STANDOFF_H + PI5_BOARD_H + 16    # room for tallest port (USB ~15.4mm)

OUTER_W = INNER_W + WALL * 2
OUTER_D = INNER_D + WALL * 2
OUTER_H = INNER_H + FLOOR_H

# Pi board offset inside enclosure
PI_OFFSET_X = WALL + TOLERANCE + 1
PI_OFFSET_Y = WALL + TOLERANCE + 1
PI_OFFSET_Z = FLOOR_H + STANDOFF_H

# Mounting tabs
TAB_W = 10
TAB_DEPTH = 8
TAB_H = 3
TAB_HOLE_D = 3.2  # M3 clearance

# Top shell
TOP_WALL_H = 8       # overlap skirt
PLATFORM_H = 4       # bracket mounting platform
TURRET_H = 50        # turret height above platform
TURRET_OUTER_R = B0283_CLEARANCE_R + WALL + 2
TURRET_INNER_R = B0283_CLEARANCE_R + 1


# ── Helper Functions ──────────────────────────────────────────────────

def rounded_box(width, depth, height, radius):
    """Create a box with rounded vertical edges, bottom face at Z=0, centered on XY."""
    r = min(radius, width / 2 - 0.01, depth / 2 - 0.01)
    return (
        cq.Workplane("XY")
        .box(width, depth, height, centered=(True, True, False))
        .edges("|Z")
        .fillet(r)
    )


def rounded_box_full(width, depth, height, radius):
    """Create a box with all edges rounded, bottom face at Z=0, centered on XY."""
    r = min(radius, width / 2 - 0.01, depth / 2 - 0.01, height / 2 - 0.01)
    return (
        cq.Workplane("XY")
        .box(width, depth, height, centered=(True, True, False))
        .edges("|Z")
        .fillet(r)
        .edges("#Z")
        .fillet(min(r, height / 2 - 0.01))
    )


def standoff(height, outer_d, hole_d):
    """Cylindrical standoff with screw hole."""
    return (
        cq.Workplane("XY")
        .circle(outer_d / 2)
        .extrude(height)
        .faces(">Z")
        .hole(hole_d, height)
    )


def mounting_tab(width, depth, thickness, hole_d):
    """Rectangular tab with central screw hole."""
    return (
        cq.Workplane("XY")
        .box(width, depth, thickness, centered=(True, True, False))
        .faces(">Z")
        .hole(hole_d, thickness)
    )


# ── Base Shell ────────────────────────────────────────────────────────

def make_base():
    # Outer shell
    base = rounded_box(OUTER_W, OUTER_D, OUTER_H, CORNER_R)

    # Hollow interior
    cavity = rounded_box(INNER_W, INNER_D, INNER_H + 1, max(CORNER_R - WALL / 2, 0.5))
    cavity = cavity.translate((0, 0, FLOOR_H))
    base = base.cut(cavity)

    # ── Port cutouts ──
    port_tol = 0.8  # extra clearance for ports
    cut_depth = WALL + 2

    # Board origin in enclosure coordinates (centered XY system)
    # The board sits at (PI_OFFSET_X, PI_OFFSET_Y) from the corner of the outer box.
    # Since we're centered, corner is at (-OUTER_W/2, -OUTER_D/2).
    board_origin_x = -OUTER_W / 2 + PI_OFFSET_X
    board_origin_y = -OUTER_D / 2 + PI_OFFSET_Y
    board_origin_z = PI_OFFSET_Z

    # Right edge ports (+X) — extend outward through right wall
    for port in [PI5_ETHERNET, PI5_USB2, PI5_USB3]:
        px = port[0] - port_tol
        py = port[1] - port_tol
        pw = port[2] + cut_depth  # extend through wall
        pd = port[3] + port_tol * 2
        ph = port[4] + port_tol * 2
        cutout = (
            cq.Workplane("XY")
            .box(pw, pd, ph, centered=(False, False, False))
            .translate((
                board_origin_x + px,
                board_origin_y + py,
                board_origin_z + PI5_BOARD_H - 1,
            ))
        )
        base = base.cut(cutout)

    # Bottom edge ports (-Y) — extend outward through front wall
    for port in [PI5_HDMI0, PI5_HDMI1, PI5_USBC]:
        px = port[0] - port_tol
        py = port[1] - cut_depth  # extend through wall
        pw = port[2] + port_tol * 2
        pd = port[3] + cut_depth + port_tol
        ph = port[4] + port_tol * 2
        cutout = (
            cq.Workplane("XY")
            .box(pw, pd, ph, centered=(False, False, False))
            .translate((
                board_origin_x + px,
                board_origin_y + py,
                board_origin_z + PI5_BOARD_H - 1,
            ))
        )
        base = base.cut(cutout)

    # ── Bottom ventilation — hex pattern ──
    hex_r = 4
    spacing = 10
    rows, cols = 4, 6
    dx = spacing
    dy = spacing * math.sqrt(3) / 2
    for row in range(rows):
        for col in range(cols):
            x_off = (dx / 2) if (row % 2 == 1) else 0
            hx = col * dx + x_off - (cols - 1) * dx / 2
            hy = row * dy - (rows - 1) * dy / 2
            hex_hole = (
                cq.Workplane("XY")
                .polygon(6, hex_r * 2)
                .extrude(FLOOR_H + 1)
                .translate((hx, hy, -0.5))
            )
            base = base.cut(hex_hole)

    # ── Side ventilation — left wall ──
    for i in range(4):
        slot_y = (i - 1.5) * 5
        slot = (
            cq.Workplane("XY")
            .box(WALL + 1, 20, 2, centered=(True, True, True))
            .translate((-OUTER_W / 2 + WALL / 2, slot_y, FLOOR_H + INNER_H * 0.6))
        )
        base = base.cut(slot)

    # ── Side ventilation — right wall (above ports) ──
    for i in range(3):
        slot_y = (i - 1) * 5
        slot = (
            cq.Workplane("XY")
            .box(WALL + 1, 15, 2, centered=(True, True, True))
            .translate((OUTER_W / 2 - WALL / 2, slot_y, FLOOR_H + INNER_H * 0.85))
        )
        base = base.cut(slot)

    # ── Pi Standoffs ──
    for hx, hy in PI5_HOLES:
        so = standoff(STANDOFF_H, 6, 2.2)
        so = so.translate((
            board_origin_x + hx,
            board_origin_y + hy,
            FLOOR_H,
        ))
        base = base.union(so)

    # ── Mounting tabs (4 corners) ──
    tab_positions = [
        (OUTER_W / 2 - 12,  OUTER_D / 2),
        (-OUTER_W / 2 + 12, OUTER_D / 2),
        (OUTER_W / 2 - 12,  -OUTER_D / 2),
        (-OUTER_W / 2 + 12, -OUTER_D / 2),
    ]
    tab_z = OUTER_H - TAB_H
    for tx, ty in tab_positions:
        tab = mounting_tab(TAB_W, TAB_DEPTH, TAB_H, TAB_HOLE_D)
        tab = tab.translate((tx, ty, tab_z))
        base = base.union(tab)

    # ── Cable entry slot (back wall, for USB-C power) ──
    cable_slot = (
        cq.Workplane("XY")
        .box(12, WALL + 1, 5, centered=(True, True, True))
        .translate((
            board_origin_x + 15.7,
            -OUTER_D / 2,
            board_origin_z + PI5_BOARD_H,
        ))
    )
    base = base.cut(cable_slot)

    # ── Rubber foot indents ──
    foot_inset = 12
    for sx in [-1, 1]:
        for sy in [-1, 1]:
            foot = (
                cq.Workplane("XY")
                .circle(5)
                .extrude(0.8)
                .translate((
                    sx * (OUTER_W / 2 - foot_inset),
                    sy * (OUTER_D / 2 - foot_inset),
                    -0.1,
                ))
            )
            base = base.cut(foot)

    return base


# ── Top Shell ─────────────────────────────────────────────────────────

def make_top():
    # ── Skirt walls that nest inside base opening ──
    skirt_outer_w = OUTER_W - 0.4
    skirt_outer_d = OUTER_D - 0.4
    skirt_inner_w = INNER_W - 0.4
    skirt_inner_d = INNER_D - 0.4
    skirt_corner_r = max(CORNER_R - 0.2, 0.5)
    skirt_inner_r = max(CORNER_R - WALL / 2 - 0.2, 0.5)

    skirt = rounded_box(skirt_outer_w, skirt_outer_d, TOP_WALL_H, skirt_corner_r)
    skirt_cavity = rounded_box(skirt_inner_w, skirt_inner_d, TOP_WALL_H + 0.2, skirt_inner_r)
    skirt_cavity = skirt_cavity.translate((0, 0, -0.1))
    skirt = skirt.cut(skirt_cavity)

    # ── Bracket mounting platform ──
    platform = rounded_box(OUTER_W, OUTER_D, PLATFORM_H, CORNER_R)
    platform = platform.translate((0, 0, TOP_WALL_H))

    # Ribbon cable pass-through hole
    ribbon_hole = (
        cq.Workplane("XY")
        .box(20, 8, PLATFORM_H + 0.2, centered=(False, False, False))
        .translate((-15, 10, TOP_WALL_H - 0.1))
    )
    platform = platform.cut(ribbon_hole)

    # I2C wire pass-through hole
    i2c_hole = (
        cq.Workplane("XY")
        .box(8, 8, PLATFORM_H + 0.2, centered=(False, False, False))
        .translate((10, -15, TOP_WALL_H - 0.1))
    )
    platform = platform.cut(i2c_hole)

    top = skirt.union(platform)

    # ── Bracket standoffs ──
    for sx in [-1, 1]:
        for sy in [-1, 1]:
            so = standoff(4, 6, 2.2)
            so = so.translate((
                sx * B0283_MOUNT_SPACING_X / 2,
                sy * B0283_MOUNT_SPACING_Y / 2,
                TOP_WALL_H + PLATFORM_H,
            ))
            top = top.union(so)

    # ── Rectangular-to-round transition blend ──
    # We approximate this with a loft-like approach using a short cylinder
    # that merges the rectangular platform into the turret base
    turret_base_z = TOP_WALL_H + PLATFORM_H
    blend_h = 6

    # Use a hull-like approach: union a rounded box at bottom and cylinder at top
    # CadQuery doesn't have hull(), so we use a loft between rect and circle
    blend_bottom = (
        cq.Workplane("XY")
        .transformed(offset=(0, 0, turret_base_z))
        .rect(OUTER_W - 2, OUTER_D - 2)
    )
    blend_top = (
        cq.Workplane("XY")
        .transformed(offset=(0, 0, turret_base_z + blend_h))
        .circle(TURRET_OUTER_R)
    )
    blend = (
        cq.Workplane("XY")
        .transformed(offset=(0, 0, turret_base_z))
        .rect(OUTER_W - 2, OUTER_D - 2)
        .workplane(offset=blend_h)
        .circle(TURRET_OUTER_R)
        .loft(ruled=True)
    )
    top = top.union(blend)

    # ── Camera turret ──
    turret_outer = (
        cq.Workplane("XY")
        .circle(TURRET_OUTER_R)
        .extrude(TURRET_H)
        .translate((0, 0, turret_base_z))
    )
    turret_inner = (
        cq.Workplane("XY")
        .circle(TURRET_INNER_R)
        .extrude(TURRET_H + 0.2)
        .translate((0, 0, turret_base_z - 0.1))
    )
    turret = turret_outer.cut(turret_inner)

    # Viewing slot — 140° arc cut in front of turret
    # Create a wedge-shaped cutout
    slot_height = TURRET_H * 0.65
    slot_bottom_z = turret_base_z + TURRET_H * 0.2
    slot_angle = 140
    # Build the slot as a thick arc segment
    slot_r_outer = TURRET_OUTER_R + 2
    slot_r_inner = TURRET_INNER_R - 1

    # Create a full annular segment for the viewing slot
    slot_points = []
    start_angle = -slot_angle / 2
    end_angle = slot_angle / 2
    n_pts = 40
    # Outer arc
    for i in range(n_pts + 1):
        angle = math.radians(start_angle + (end_angle - start_angle) * i / n_pts)
        slot_points.append((slot_r_outer * math.cos(angle), slot_r_outer * math.sin(angle)))
    # Inner arc (reversed)
    for i in range(n_pts, -1, -1):
        angle = math.radians(start_angle + (end_angle - start_angle) * i / n_pts)
        slot_points.append((slot_r_inner * math.cos(angle), slot_r_inner * math.sin(angle)))

    viewing_slot = (
        cq.Workplane("XY")
        .polyline(slot_points)
        .close()
        .extrude(slot_height)
        .translate((0, 0, slot_bottom_z))
    )
    turret = turret.cut(viewing_slot)

    # Turret rim/lip at top
    rim = (
        cq.Workplane("XY")
        .circle(TURRET_OUTER_R + 1)
        .circle(TURRET_INNER_R)
        .extrude(2)
        .translate((0, 0, turret_base_z + TURRET_H - 2))
    )
    turret = turret.union(rim)

    top = top.union(turret)

    # ── Turret rear vent slots ──
    for angle_deg in [160, 180, 200]:
        for i in range(3):
            slot_z = turret_base_z + TURRET_H * 0.3 + i * 5
            angle_rad = math.radians(angle_deg)
            sx = TURRET_OUTER_R * math.cos(angle_rad)
            sy = TURRET_OUTER_R * math.sin(angle_rad)
            # Slot oriented radially
            slot = (
                cq.Workplane("XY")
                .box(WALL + 2, 12, 2, centered=(True, True, True))
                .rotateAboutCenter((0, 0, 1), angle_deg)
                .translate((sx, sy, slot_z))
            )
            top = top.cut(slot)

    # ── Mounting tabs ──
    tab_positions = [
        (OUTER_W / 2 - 12,  OUTER_D / 2),
        (-OUTER_W / 2 + 12, OUTER_D / 2),
        (OUTER_W / 2 - 12,  -OUTER_D / 2),
        (-OUTER_W / 2 + 12, -OUTER_D / 2),
    ]
    for tx, ty in tab_positions:
        tab = mounting_tab(TAB_W, TAB_DEPTH, TAB_H, TAB_HOLE_D)
        tab = tab.translate((tx, ty, 0))
        top = top.union(tab)

    return top


# ── Export ────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Generate STEP files for plant-eye enclosure")
    parser.add_argument(
        "--part",
        choices=["base", "top", "assembly"],
        default=None,
        help="Which part to export (default: all)",
    )
    parser.add_argument(
        "--output-dir",
        default=os.path.join(os.path.dirname(os.path.abspath(__file__)), "step"),
        help="Output directory for STEP files (default: ./step/)",
    )
    args = parser.parse_args()

    os.makedirs(args.output_dir, exist_ok=True)

    parts_to_export = [args.part] if args.part else ["base", "top", "assembly"]

    if "base" in parts_to_export:
        print("Building base...")
        base = make_base()
        base_path = os.path.join(args.output_dir, "base.step")
        cq.exporters.export(base, base_path, cq.exporters.ExportTypes.STEP)
        print(f"  Exported: {base_path}")

    if "top" in parts_to_export:
        print("Building top...")
        top = make_top()
        top_path = os.path.join(args.output_dir, "top.step")
        cq.exporters.export(top, top_path, cq.exporters.ExportTypes.STEP)
        print(f"  Exported: {top_path}")

    if "assembly" in parts_to_export:
        print("Building assembly...")
        if "base" not in parts_to_export:
            base = make_base()
        if "top" not in parts_to_export:
            top = make_top()
        assembly = base.union(top.translate((0, 0, OUTER_H)))
        assembly_path = os.path.join(args.output_dir, "assembly.step")
        cq.exporters.export(assembly, assembly_path, cq.exporters.ExportTypes.STEP)
        print(f"  Exported: {assembly_path}")

    print("Done.")


if __name__ == "__main__":
    main()
