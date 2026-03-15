"""Real servo implementation for Arducam B0283 pan-tilt bracket via I2C.

The B0283 PTZ controller board communicates over I2C at address 0x0C.
Pan servo: registers 0x00 (low) and 0x01 (high) — pulse width in microseconds.
Tilt servo: registers 0x02 (low) and 0x03 (high) — pulse width in microseconds.
Pulse range: 500-2500us maps to 0-180 degrees.
"""

import logging
import time

from plant_eye.hardware.protocol import ServoBackend

logger = logging.getLogger(__name__)


class ArducamServo(ServoBackend):
    PAN_REG = 0x00
    TILT_REG = 0x02
    PULSE_MIN = 500
    PULSE_MAX = 2500

    def __init__(self, bus: int = 1, addr: int = 0x0C) -> None:
        self._bus_num = bus
        self._addr = addr
        self._bus = None

    def startup(self) -> None:
        import smbus2

        self._bus = smbus2.SMBus(self._bus_num)
        logger.info("ArducamServo initialized on bus=%d addr=0x%02X", self._bus_num, self._addr)

    def shutdown(self) -> None:
        if self._bus:
            self._bus.close()
            logger.info("ArducamServo shut down")

    def move(self, pan: int, tilt: int) -> None:
        self._write_angle(self.PAN_REG, pan)
        self._write_angle(self.TILT_REG, tilt)
        time.sleep(0.3)  # allow servos to settle
        logger.info("ArducamServo: moved pan=%d tilt=%d", pan, tilt)

    def _write_angle(self, reg: int, angle: int) -> None:
        pulse = int(self.PULSE_MIN + (angle / 180) * (self.PULSE_MAX - self.PULSE_MIN))
        low = pulse & 0xFF
        high = (pulse >> 8) & 0xFF
        self._bus.write_byte_data(self._addr, reg, low)
        self._bus.write_byte_data(self._addr, reg + 1, high)
