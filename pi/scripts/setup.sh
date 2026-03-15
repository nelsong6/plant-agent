#!/usr/bin/env bash
set -euo pipefail

# Plant Eye — Raspberry Pi setup script
# Run as root or with sudo

INSTALL_DIR="/opt/plant-eye"
ENV_DIR="/etc/plant-eye"
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== Installing system dependencies ==="
apt-get update
apt-get install -y python3-picamera2 python3-venv

echo "=== Enabling I2C ==="
raspi-config nonint do_i2c 0

echo "=== Adding pi user to i2c group ==="
usermod -aG i2c pi

echo "=== Setting up install directory ==="
mkdir -p "$INSTALL_DIR"
cp -r "$REPO_DIR"/* "$INSTALL_DIR/"

echo "=== Creating venv with system-site-packages ==="
python3 -m venv --system-site-packages "$INSTALL_DIR/.venv"
"$INSTALL_DIR/.venv/bin/pip" install "$INSTALL_DIR"

echo "=== Setting up environment config ==="
mkdir -p "$ENV_DIR"
if [ ! -f "$ENV_DIR/env" ]; then
    cp "$INSTALL_DIR/.env.example" "$ENV_DIR/env"
    echo "Created $ENV_DIR/env — edit with your settings"
fi

echo "=== Installing systemd service ==="
cp "$INSTALL_DIR/systemd/plant-eye.service" /etc/systemd/system/
systemctl daemon-reload
systemctl enable plant-eye
systemctl start plant-eye

echo "=== Done! ==="
echo "Check status: systemctl status plant-eye"
echo "View logs: journalctl -u plant-eye -f"
