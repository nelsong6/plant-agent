"""Real camera implementation using picamera2.

Requires: apt install python3-picamera2
Venv must be created with --system-site-packages.
"""

import io
import logging

from plant_eye.hardware.protocol import CameraBackend

logger = logging.getLogger(__name__)


class PiCamera(CameraBackend):
    def __init__(self) -> None:
        self._picam2 = None
        self._lock = None

    def startup(self) -> None:
        import asyncio

        from picamera2 import Picamera2

        self._picam2 = Picamera2()
        self._picam2.configure(self._picam2.create_still_configuration())
        self._picam2.start()
        self._lock = asyncio.Lock()
        logger.info("PiCamera initialized")

    def shutdown(self) -> None:
        if self._picam2:
            self._picam2.stop()
            self._picam2.close()
            logger.info("PiCamera shut down")

    def capture(self, quality: int = 90) -> bytes:
        from PIL import Image

        array = self._picam2.capture_array()
        img = Image.fromarray(array)
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=quality)
        return buf.getvalue()

    def preview(self, width: int, height: int) -> bytes:
        from PIL import Image

        array = self._picam2.capture_array()
        img = Image.fromarray(array).resize((width, height))
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=70)
        return buf.getvalue()
