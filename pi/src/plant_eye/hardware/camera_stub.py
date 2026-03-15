import io
import logging

from PIL import Image

from plant_eye.hardware.protocol import CameraBackend

logger = logging.getLogger(__name__)


class StubCamera(CameraBackend):
    """Camera stub that returns a solid-color test image."""

    def capture(self, quality: int = 90) -> bytes:
        logger.info("StubCamera: capture (quality=%d)", quality)
        return self._generate_image(1920, 1080, quality)

    def preview(self, width: int, height: int) -> bytes:
        logger.info("StubCamera: preview (%dx%d)", width, height)
        return self._generate_image(width, height, 70)

    def _generate_image(self, width: int, height: int, quality: int) -> bytes:
        img = Image.new("RGB", (width, height), color=(34, 139, 34))  # forest green
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=quality)
        return buf.getvalue()
