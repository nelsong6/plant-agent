// top.scad — Top shell of the plant-eye enclosure
// Houses the Arducam B0283 pan-tilt bracket with camera turret
//
// Print orientation: open side up (may need supports for turret rim)
// All dimensions in millimeters

use <lib/common.scad>
use <lib/pi5.scad>
use <lib/arducam_b0283.scad>

// === Parametric Variables — Adjust These ===
wall        = 2.4;       // wall thickness (should match base.scad)
tolerance   = 0.3;       // fit tolerance (should match base.scad)
corner_r    = 4;          // outer corner radius (should match base.scad)

// Must match base.scad outer dimensions
inner_w = pi5_board_w + tolerance * 2 + 2;
inner_d = pi5_board_d + tolerance * 2 + 2;
outer_w = inner_w + wall * 2;
outer_d = inner_d + wall * 2;

// Top shell dimensions
top_wall_h    = 8;       // overlap skirt that nests into base
platform_h    = 4;       // bracket mounting platform thickness
turret_h      = 50;      // turret height above platform (clearance for camera sweep)
turret_outer_r = b0283_clearance_r + wall + 2;
turret_inner_r = b0283_clearance_r + 1;

total_h = top_wall_h + platform_h + turret_h;

// Mounting tab dimensions (must match base.scad)
tab_w       = 10;
tab_depth   = 8;
tab_h       = 3;
tab_hole_d  = 3.2;   // M3 clearance

// === Top Shell ===

module top_skirt() {
    // Skirt walls that nest inside the base opening
    difference() {
        rounded_cube_bottom([outer_w - 0.4, outer_d - 0.4, top_wall_h], corner_r - 0.2);
        translate([0, 0, -0.1])
            rounded_cube_bottom([inner_w - 0.4, inner_d - 0.4, top_wall_h + 0.2], corner_r - wall/2 - 0.2);
    }
}

// === Bracket Mounting Platform ===

module bracket_platform() {
    translate([0, 0, top_wall_h]) {
        difference() {
            // Solid platform spanning the interior
            rounded_cube_bottom([outer_w, outer_d, platform_h], corner_r);

            // Hole for ribbon cable pass-through (CSI connector area)
            translate([-15, 10, -0.1])
                cube([20, 8, platform_h + 0.2]);

            // Hole for I2C wires
            translate([10, -15, -0.1])
                cube([8, 8, platform_h + 0.2]);
        }
    }
}

// === Bracket Standoffs ===

module bracket_standoffs() {
    translate([0, 0, top_wall_h + platform_h]) {
        // B0283 mounting holes — centered on platform
        for (x = [-1, 1], y = [-1, 1]) {
            translate([
                x * b0283_mount_spacing_x / 2,
                y * b0283_mount_spacing_y / 2,
                0
            ])
            standoff(height = 4, outer_d = 6, hole_d = 2.2);
        }
    }
}

// === Camera Turret ===

module turret() {
    turret_base_z = top_wall_h + platform_h;

    translate([0, 0, turret_base_z]) {
        difference() {
            // Outer turret cylinder
            cylinder(h = turret_h, r = turret_outer_r, $fn = 64);

            // Inner clearance for camera sweep
            translate([0, 0, -0.1])
                cylinder(h = turret_h + 0.2, r = turret_inner_r, $fn = 64);

            // Front viewing slot — wide opening for camera to see out
            // Spans ~120 degrees of the front arc
            translate([0, 0, turret_h * 0.2])
                rotate([0, 0, 0])
                viewing_slot();
        }

        // Turret rim/lip at top
        translate([0, 0, turret_h - 2])
        difference() {
            cylinder(h = 2, r = turret_outer_r + 1, $fn = 64);
            translate([0, 0, -0.1])
                cylinder(h = 2.2, r = turret_inner_r, $fn = 64);
        }
    }
}

// Viewing slot — cutout in turret wall for camera field of view
module viewing_slot() {
    slot_height = turret_h * 0.65;
    slot_angle = 140;  // degrees of arc to cut

    rotate([0, 0, -slot_angle/2])
    rotate_extrude(angle = slot_angle, $fn = 64)
        translate([turret_inner_r - 1, 0, 0])
        square([wall + 4, slot_height]);
}

// === Side Vents on Turret ===

module turret_vents() {
    turret_base_z = top_wall_h + platform_h;

    // Rear vent slots (opposite the viewing slot)
    for (angle = [160, 180, 200]) {
        rotate([0, 0, angle])
        translate([turret_outer_r, 0, turret_base_z + turret_h * 0.3])
            rotate([0, 90, 0])
            vent_slots(count = 3, slot_length = 12, slot_width = 2, spacing = 5, thickness = wall + 2);
    }
}

// === Mounting Tabs (matching base) ===

module top_mounting_tabs() {
    positions = [
        [ outer_w/2 - 12,  outer_d/2, 0],
        [-outer_w/2 + 12,  outer_d/2, 0],
        [ outer_w/2 - 12, -outer_d/2, 0],
        [-outer_w/2 + 12, -outer_d/2, 0],
    ];

    for (pos = positions) {
        translate([pos[0], pos[1], 0])
            mounting_tab(tab_w, tab_depth, tab_h, tab_hole_d);
    }
}

// === Rectangular-to-Round Transition ===
// Smoothly blend the rectangular platform into the round turret
module platform_to_turret_blend() {
    turret_base_z = top_wall_h + platform_h;

    translate([0, 0, turret_base_z])
    hull() {
        // Bottom: rectangular shape matching platform
        translate([0, 0, 0])
            rounded_cube_bottom([outer_w, outer_d, 0.1], corner_r);

        // Top: circular shape matching turret
        translate([0, 0, 6])
            cylinder(h = 0.1, r = turret_outer_r, $fn = 64);
    }
}

// === Complete Top ===

module top() {
    difference() {
        union() {
            top_skirt();
            bracket_platform();
            bracket_standoffs();
            platform_to_turret_blend();
            turret();
            top_mounting_tabs();
        }
        turret_vents();
    }
}

// Render
top();

// Uncomment to preview bracket in position:
// %translate([0, 0, top_wall_h + platform_h + 4]) b0283_model();
