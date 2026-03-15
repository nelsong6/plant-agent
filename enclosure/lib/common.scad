// common.scad — Shared utility modules for the plant-eye enclosure
// All dimensions in millimeters

// Rounded box centered at origin
module rounded_cube(size, radius = 2) {
    hull() {
        for (x = [-1, 1], y = [-1, 1], z = [-1, 1]) {
            translate([
                x * (size[0]/2 - radius),
                y * (size[1]/2 - radius),
                z * (size[2]/2 - radius)
            ])
            sphere(r = radius, $fn = 20);
        }
    }
}

// Rounded box sitting on Z=0 (bottom face at origin)
module rounded_cube_bottom(size, radius = 2) {
    translate([0, 0, size[2]/2])
        rounded_cube(size, radius);
}

// Ventilation slot pattern — a row of slots along X axis
// count: number of slots
// slot_length: length of each slot
// slot_width: width of each slot
// spacing: center-to-center distance between slots
// thickness: extrusion depth (should exceed wall thickness)
module vent_slots(count, slot_length, slot_width, spacing, thickness) {
    for (i = [0 : count - 1]) {
        translate([(i - (count - 1) / 2) * spacing, 0, 0])
            cube([slot_width, slot_length, thickness], center = true);
    }
}

// Cylinder standoff for PCB mounting
// height: total standoff height
// outer_d: outer diameter
// hole_d: screw hole diameter
module standoff(height, outer_d, hole_d) {
    difference() {
        cylinder(h = height, d = outer_d, $fn = 24);
        translate([0, 0, -0.1])
            cylinder(h = height + 0.2, d = hole_d, $fn = 24);
    }
}

// Screw boss — a standoff with a surrounding reinforcement base
module screw_boss(height, outer_d, hole_d, base_d, base_h) {
    standoff(height, outer_d, hole_d);
    cylinder(h = base_h, d = base_d, $fn = 24);
}

// Mounting tab with screw hole, for joining base and top
module mounting_tab(width, depth, thickness, hole_d) {
    difference() {
        translate([0, 0, thickness/2])
            cube([width, depth, thickness], center = true);
        cylinder(h = thickness * 3, d = hole_d, center = true, $fn = 24);
    }
}

// Hexagonal vent pattern (honeycomb)
// rows, cols: grid size
// hex_r: hex radius (center to vertex)
// spacing: center-to-center
// thickness: extrusion depth
module hex_vent(rows, cols, hex_r, spacing, thickness) {
    dx = spacing;
    dy = spacing * sqrt(3) / 2;
    for (row = [0 : rows - 1]) {
        for (col = [0 : cols - 1]) {
            x_off = (row % 2 == 0) ? 0 : dx / 2;
            translate([
                col * dx + x_off - (cols - 1) * dx / 2,
                row * dy - (rows - 1) * dy / 2,
                0
            ])
            cylinder(h = thickness, r = hex_r, $fn = 6, center = true);
        }
    }
}
