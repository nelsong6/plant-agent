import asyncio

from plant_eye.hardware.protocol import CameraBackend


class CameraService:
    def __init__(self, backend: CameraBackend) -> None:
        self._backend = backend
        self._lock = asyncio.Lock()

    async def capture(self, quality: int = 90) -> bytes:
        async with self._lock:
            return self._backend.capture(quality)

    async def preview(self, width: int = 640, height: int = 480) -> bytes:
        async with self._lock:
            return self._backend.preview(width, height)
