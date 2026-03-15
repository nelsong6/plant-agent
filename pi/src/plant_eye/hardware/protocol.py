from abc import ABC, abstractmethod


class CameraBackend(ABC):
    @abstractmethod
    def capture(self, quality: int = 90) -> bytes:
        """Capture a JPEG image, return raw bytes."""
        ...

    @abstractmethod
    def preview(self, width: int, height: int) -> bytes:
        """Capture a low-res preview JPEG."""
        ...

    def startup(self) -> None:
        """Initialize the camera hardware."""

    def shutdown(self) -> None:
        """Release the camera hardware."""


class ServoBackend(ABC):
    @abstractmethod
    def move(self, pan: int, tilt: int) -> None:
        """Move to absolute pan/tilt position (degrees 0-180)."""
        ...

    def startup(self) -> None:
        """Initialize the servo hardware."""

    def shutdown(self) -> None:
        """Release the servo hardware."""
