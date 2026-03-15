# Plant-Eye Enclosure

3D-printable enclosure for the plant-eye device: Raspberry Pi 5 + Arducam B0283 pan-tilt camera bracket.

## Design

Two-piece enclosure (base + top) joined with M3 screws:

- **Base**: Houses the Raspberry Pi 5 with port cutouts, ventilation, and rubber foot indents
- **Top**: Mounting platform for the Arducam B0283 bracket, with a cylindrical turret giving the camera full pan/tilt freedom and a wide viewing slot

All files are parametric OpenSCAD — key dimensions (wall thickness, tolerances, screw sizes) are variables at the top of each file.

## Files

| File | Purpose |
|------|---------|
| `enclosure.scad` | Full assembly preview (open this first) |
| `base.scad` | Bottom shell — export this as STL for printing |
| `top.scad` | Top shell — export this as STL for printing |
| `lib/pi5.scad` | Raspberry Pi 5 board model and dimensions |
| `lib/arducam_b0283.scad` | Arducam B0283 bracket model and dimensions |
| `lib/common.scad` | Shared utility modules |
| `stl/` | Pre-exported STL files (when available) |

## Print Settings

| Setting | Recommended |
|---------|-------------|
| Material | PLA or PETG |
| Layer height | 0.2mm |
| Infill | 15-20% |
| Walls | 3 perimeters |
| Supports | Top shell turret may need supports for the viewing slot overhang |

## Bill of Materials

| Item | Qty | Notes |
|------|-----|-------|
| Raspberry Pi 5 | 1 | Any RAM variant |
| Arducam B0283 pan-tilt bracket | 1 | With Camera Module 3 |
| M2.5 × 8mm screws | 4 | Pi mounting to standoffs |
| M3 × 12mm screws | 4 | Joining base to top |
| M2.5 × 6mm screws | 4 | Bracket mounting to platform |
| Adhesive rubber feet | 4 | ~10mm diameter |

## Assembly

1. Mount the Pi 5 onto the base standoffs with M2.5 screws
2. Route the CSI ribbon cable through the platform pass-through hole
3. Route I2C wires through the wire pass-through hole
4. Mount the Arducam B0283 bracket onto the top shell platform standoffs
5. Connect the ribbon cable to the camera and I2C wires to the Pi GPIO
6. Place the top shell onto the base (skirt nests inside)
7. Secure with M3 screws through the mounting tabs

## Customization

Open any `.scad` file and adjust the variables at the top:

- `wall` — wall thickness (default 2.4mm)
- `tolerance` — fit clearance (default 0.3mm, increase if parts are tight)
- `corner_r` — outer corner radius
- `standoff_h` — Pi standoff height

### Arducam B0283 Dimensions

The bracket dimensions in `lib/arducam_b0283.scad` are approximate. **Measure your actual bracket** and update these values before printing:

- `b0283_base_w`, `b0283_base_d` — base plate size
- `b0283_mount_spacing_x`, `b0283_mount_spacing_y` — mounting hole spacing
- `b0283_clearance_r` — radius needed for full camera sweep

## Exporting STLs

1. Open `base.scad` in OpenSCAD
2. Press F6 to render
3. File > Export > Export as STL → save to `stl/base.stl`
4. Repeat for `top.scad` → `stl/top.stl`
