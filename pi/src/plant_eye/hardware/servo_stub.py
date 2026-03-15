import logging

from plant_eye.hardware.protocol import ServoBackend

logger = logging.getLogger(__name__)


class StubServo(ServoBackend):
    """Servo stub that logs movements without hardware."""

    def move(self, pan: int, tilt: int) -> None:
        logger.info("StubServo: move pan=%d tilt=%d", pan, tilt)
