// enclosure.scad — Complete assembly preview for the plant-eye enclosure
//
// Open this file in OpenSCAD to see the full assembled device.
// Use base.scad and top.scad individually to export STLs for printing.
//
// All dimensions in millimeters

use <lib/common.scad>
use <lib/pi5.scad>
use <lib/arducam_b0283.scad>
use <base.scad>
use <top.scad>

// === Assembly Parameters ===
// Vertical offset where top sits on base
// (base outer_h from base.scad — duplicated here for assembly)
wall        = 2.4;
tolerance   = 0.3;
inner_w     = pi5_board_w + tolerance * 2 + 2;
inner_d     = pi5_board_d + tolerance * 2 + 2;
inner_h_base = 6 + pi5_board_h + 16;  // standoff_h + board + port clearance
base_outer_h = inner_h_base + 2.0;     // + floor_h

pi_offset_x = wall + tolerance + 1;
pi_offset_y = wall + tolerance + 1;
pi_offset_z = 2.0 + 6;  // floor_h + standoff_h

// Show assembly exploded or together
exploded = false;
explode_gap = 30;  // mm gap when exploded

// === Assembly ===

// Base shell
color("SlateGray", 0.85) base();

// Top shell — positioned on top of base
translate([0, 0, base_outer_h + (exploded ? explode_gap : 0)])
    color("DimGray", 0.85) top();

// Ghost Pi 5 for reference (transparent)
%translate([pi_offset_x, pi_offset_y, pi_offset_z])
    pi5_model();

// Ghost camera bracket for reference (transparent)
%translate([0, 0, base_outer_h + 8 + 4 + 4 + (exploded ? explode_gap : 0)])
    b0283_model();

// === Instructions ===
// 1. Toggle `exploded = true` to see parts separated
// 2. Use F5 to preview, F6 to render
// 3. To export STLs, open base.scad or top.scad individually and use
//    File > Export > Export as STL
