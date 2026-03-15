from plant_eye.config import Settings
from plant_eye.hardware.protocol import ServoBackend


class ServoService:
    def __init__(self, backend: ServoBackend, settings: Settings) -> None:
        self._backend = backend
        self._settings = settings
        self._pan = 90
        self._tilt = 90

    def move(self, pan: int, tilt: int) -> tuple[int, int]:
        pan = max(self._settings.pan_min, min(self._settings.pan_max, pan))
        tilt = max(self._settings.tilt_min, min(self._settings.tilt_max, tilt))
        self._backend.move(pan, tilt)
        self._pan = pan
        self._tilt = tilt
        return pan, tilt

    def home(self) -> tuple[int, int]:
        return self.move(90, 90)

    @property
    def position(self) -> tuple[int, int]:
        return self._pan, self._tilt
