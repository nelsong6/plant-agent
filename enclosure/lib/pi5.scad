// pi5.scad — Raspberry Pi 5 board model
// Reference: Raspberry Pi 5 mechanical drawing
// All dimensions in millimeters
//
// Board origin: bottom-left corner of PCB (component side up)
// Ports face: +X (USB/Ethernet) and -Y (HDMI/USB-C power)

// === Board Dimensions ===
pi5_board_w = 85;       // X length
pi5_board_d = 56;       // Y length
pi5_board_h = 1.6;      // PCB thickness
pi5_component_h = 5;    // Max component height above PCB (excluding ports)

// === Mounting Holes (M2.5) ===
// Positions relative to board origin (bottom-left)
pi5_hole_d = 2.75;      // M2.5 clearance hole
pi5_holes = [
    [3.5,   3.5],        // bottom-left
    [3.5,   52.5],       // top-left
    [61.5,  3.5],        // bottom-right
    [61.5,  52.5],       // top-right
];

// === Port positions and sizes [x_start, y_start, width, depth, height] ===
// Heights are above PCB top surface. Positions relative to board origin.

// Right edge ports (+X side, x ≈ 85)
pi5_ethernet = [73, 1.75, 21.5, 16, 13.5];    // Ethernet jack
pi5_usb2     = [73, 20.5, 17.4, 13.1, 15.4];  // USB 2.0 stacked
pi5_usb3     = [73, 36,   17.4, 13.1, 15.4];  // USB 3.0 stacked

// Bottom edge ports (-Y side)
pi5_hdmi0    = [25.5, -1.5, 7.4, 8,  3.2];    // micro-HDMI 0
pi5_hdmi1    = [39,   -1.5, 7.4, 8,  3.2];    // micro-HDMI 1
pi5_usbc     = [11.2, -1.5, 9,   7.5, 3.2];   // USB-C power

// Top edge port (+Y side)
pi5_poe_header = [42, 49.5, 5.8, 7, 8.5];     // PoE header (optional)

// Left edge
pi5_sd_slot  = [-2.5, 21.5, 14, 12, 2];       // microSD card slot

// Camera/display connectors (CSI/DSI ribbon cable)
pi5_cam0 = [3,  40, 22, 2.5, 5.5];   // CAM0 / DISP0 FPC connector
pi5_cam1 = [45, 40, 22, 2.5, 5.5];   // CAM1 / DISP1 FPC connector

// GPIO header
pi5_gpio = [7.4, 50, 51, 5, 8.5];    // 40-pin GPIO header

// === Visual Model ===
// Simplified board for fit-checking in the enclosure

module pi5_board() {
    color("green", 0.7)
        cube([pi5_board_w, pi5_board_d, pi5_board_h]);
}

module pi5_mounting_holes(depth = 10) {
    for (pos = pi5_holes) {
        translate([pos[0], pos[1], -1])
            cylinder(h = depth, d = pi5_hole_d, $fn = 24);
    }
}

// Port block for visualization
module _port_block(spec, clr) {
    color(clr, 0.5)
    translate([spec[0], spec[1], pi5_board_h])
        cube([spec[2], spec[3], spec[4]]);
}

module pi5_ports() {
    _port_block(pi5_ethernet, "silver");
    _port_block(pi5_usb2,     "silver");
    _port_block(pi5_usb3,     "blue");
    _port_block(pi5_hdmi0,    "silver");
    _port_block(pi5_hdmi1,    "silver");
    _port_block(pi5_usbc,     "silver");
    _port_block(pi5_cam0,     "black");
    _port_block(pi5_cam1,     "black");
    _port_block(pi5_gpio,     "black");
}

// Complete Pi 5 model for preview
module pi5_model() {
    pi5_board();
    pi5_ports();
}

// Port cutout volumes — slightly oversized for clearance
// tolerance: extra mm on each side
module pi5_port_cutouts(tolerance = 0.5, depth = 10) {
    module _cutout(spec) {
        translate([
            spec[0] - tolerance,
            spec[1] - tolerance,
            pi5_board_h - 1
        ])
        cube([
            spec[2] + tolerance * 2,
            spec[3] + depth,
            spec[4] + tolerance * 2
        ]);
    }

    // Right edge ports — extend in +X direction
    for (port = [pi5_ethernet, pi5_usb2, pi5_usb3]) {
        translate([0, 0, 0]) {
            translate([port[0] - tolerance, port[1] - tolerance, pi5_board_h - 1])
                cube([port[2] + depth, port[3] + tolerance * 2, port[4] + tolerance * 2]);
        }
    }

    // Bottom edge ports — extend in -Y direction
    for (port = [pi5_hdmi0, pi5_hdmi1, pi5_usbc]) {
        translate([port[0] - tolerance, port[1] - depth, pi5_board_h - 1])
            cube([port[2] + tolerance * 2, port[3] + depth + tolerance, port[4] + tolerance * 2]);
    }
}
