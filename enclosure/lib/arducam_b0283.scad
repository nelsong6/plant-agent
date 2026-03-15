// arducam_b0283.scad — Arducam B0283 Pan-Tilt Bracket Model
// Reference: Arducam B0283 product specs (best-effort estimates)
// All dimensions in millimeters
//
// NOTE: These dimensions are approximate. Measure your actual bracket
// and update the values below for a precise fit.
//
// The B0283 consists of:
// 1. A base plate with mounting holes and the pan servo
// 2. A tilt arm that holds the camera
// 3. An I2C controller board (on the base)

// === Base Plate ===
b0283_base_w = 32;        // X width of base plate
b0283_base_d = 32;        // Y depth of base plate
b0283_base_h = 25;        // Z height of base assembly (plate + pan servo)

// Base mounting holes (M2.5, 4 corners)
b0283_mount_hole_d = 2.75;
b0283_mount_spacing_x = 24;   // hole-to-hole X distance
b0283_mount_spacing_y = 24;   // hole-to-hole Y distance

// === Pan Rotation ===
b0283_pan_range = 180;    // degrees of pan travel

// === Tilt Arm + Camera ===
b0283_tilt_arm_h = 20;    // height from base top to camera center
b0283_tilt_range = 180;   // degrees of tilt travel
b0283_cam_offset_z = 45;  // total height from base bottom to camera lens center

// === Clearance Envelope ===
// The full sweep volume the bracket+camera needs to move freely
// This is a cylinder centered on the pan axis
b0283_clearance_r = 35;   // radius needed for full pan+tilt sweep
b0283_clearance_h = 55;   // height of clearance envelope

// === I2C Controller ===
b0283_controller_w = 20;
b0283_controller_d = 15;
b0283_controller_h = 5;

// === Visual Model ===

module b0283_base_plate() {
    color("darkgray", 0.7)
    translate([-b0283_base_w/2, -b0283_base_d/2, 0])
        cube([b0283_base_w, b0283_base_d, 5]);
}

module b0283_pan_servo() {
    color("dimgray", 0.7)
    translate([0, 0, 5])
        cylinder(h = b0283_base_h - 5, d = 24, $fn = 32);
}

module b0283_tilt_arm() {
    color("gray", 0.7)
    translate([0, 0, b0283_base_h]) {
        // Upright arm
        translate([-3, -3, 0])
            cube([6, 6, b0283_tilt_arm_h]);
        // Camera platform
        translate([-12, -12, b0283_tilt_arm_h - 3])
            cube([24, 24, 3]);
    }
}

module b0283_mounting_holes(depth = 10) {
    for (x = [-1, 1], y = [-1, 1]) {
        translate([
            x * b0283_mount_spacing_x / 2,
            y * b0283_mount_spacing_y / 2,
            -1
        ])
        cylinder(h = depth, d = b0283_mount_hole_d, $fn = 24);
    }
}

// Complete bracket model for preview
module b0283_model() {
    b0283_base_plate();
    b0283_pan_servo();
    b0283_tilt_arm();
}

// Clearance volume — subtract this from the enclosure top to give
// the bracket room to move
module b0283_clearance_volume() {
    cylinder(h = b0283_clearance_h, r = b0283_clearance_r, $fn = 48);
}
