// base.scad — Bottom shell of the plant-eye enclosure
// Houses the Raspberry Pi 5 with port cutouts and ventilation
//
// Print orientation: open side up (no supports needed)
// All dimensions in millimeters

use <lib/common.scad>
use <lib/pi5.scad>

// === Parametric Variables — Adjust These ===
wall        = 2.4;      // wall thickness
floor_h     = 2.0;      // floor thickness
tolerance   = 0.3;      // extra clearance for PCB fit
standoff_h  = 6;        // Pi standoff height above floor
corner_r    = 4;         // outer corner radius

// Interior dimensions (Pi 5 + clearance)
inner_w = pi5_board_w + tolerance * 2 + 2;  // +2 for cable routing space
inner_d = pi5_board_d + tolerance * 2 + 2;
inner_h = standoff_h + pi5_board_h + 16;    // room for tallest port (USB ~15.4mm)

// Outer dimensions
outer_w = inner_w + wall * 2;
outer_d = inner_d + wall * 2;
outer_h = inner_h + floor_h;

// Pi board offset inside the enclosure (centered X/Y, sitting on standoffs)
pi_offset_x = wall + tolerance + 1;   // +1 for cable routing margin on left
pi_offset_y = wall + tolerance + 1;
pi_offset_z = floor_h + standoff_h;

// Mounting tab dimensions for joining to top shell
tab_w       = 10;
tab_depth   = 8;
tab_h       = 3;
tab_hole_d  = 3.2;   // M3 clearance

// === Base Shell ===

module base_shell() {
    difference() {
        // Outer shell
        rounded_cube_bottom([outer_w, outer_d, outer_h], corner_r);

        // Hollow interior
        translate([0, 0, floor_h])
            rounded_cube_bottom([inner_w, inner_d, inner_h + 1], corner_r - wall/2);

        // Port cutouts (translated to Pi position)
        translate([pi_offset_x, pi_offset_y, pi_offset_z])
            pi5_port_cutouts(tolerance = 0.8, depth = wall + 2);

        // Bottom ventilation — hex pattern
        translate([0, 0, floor_h / 2])
            hex_vent(rows = 4, cols = 6, hex_r = 4, spacing = 10, thickness = floor_h + 1);

        // Side ventilation — left wall
        translate([-outer_w/2 + wall/2, 0, floor_h + inner_h * 0.6])
            rotate([0, 90, 0])
            vent_slots(count = 4, slot_length = 20, slot_width = 2, spacing = 5, thickness = wall + 1);

        // Side ventilation — right wall (above port cutouts)
        translate([outer_w/2 - wall/2, 0, floor_h + inner_h * 0.85])
            rotate([0, 90, 0])
            vent_slots(count = 3, slot_length = 15, slot_width = 2, spacing = 5, thickness = wall + 1);
    }
}

// === Pi Standoffs ===

module pi_standoffs() {
    translate([pi_offset_x, pi_offset_y, floor_h]) {
        for (pos = pi5_holes) {
            translate([pos[0], pos[1], 0])
                standoff(height = standoff_h, outer_d = 6, hole_d = 2.2);
        }
    }
}

// === Mounting Tabs (for joining to top shell) ===

module base_mounting_tabs() {
    tab_z = outer_h - tab_h;

    // Four tabs at corners (inset from edges)
    positions = [
        [ outer_w/2 - 12,  outer_d/2, 0],
        [-outer_w/2 + 12,  outer_d/2, 0],
        [ outer_w/2 - 12, -outer_d/2, 0],
        [-outer_w/2 + 12, -outer_d/2, 0],
    ];

    for (pos = positions) {
        translate([pos[0], pos[1], tab_z])
            mounting_tab(tab_w, tab_depth, tab_h, tab_hole_d);
    }
}

// === Cable Entry ===
// Slot in the back wall for USB-C power cable
module cable_entry() {
    // Back wall (-Y side), centered on USB-C position
    translate([pi_offset_x + 15.7, -outer_d/2, pi_offset_z + pi5_board_h])
        cube([12, wall + 1, 5], center = true);
}

// === Rubber Foot Indents ===
module foot_indents() {
    foot_inset = 12;
    for (x = [-1, 1], y = [-1, 1]) {
        translate([x * (outer_w/2 - foot_inset), y * (outer_d/2 - foot_inset), -0.1])
            cylinder(h = 0.8, d = 10, $fn = 24);
    }
}

// === Complete Base ===

module base() {
    difference() {
        union() {
            base_shell();
            pi_standoffs();
            base_mounting_tabs();
        }
        cable_entry();
        foot_indents();
    }
}

// Render
base();

// Uncomment to preview Pi 5 in position:
// %translate([pi_offset_x, pi_offset_y, pi_offset_z]) pi5_model();
