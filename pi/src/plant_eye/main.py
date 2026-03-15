import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from plant_eye.config import Settings
from plant_eye.routers import camera, health, servo
from plant_eye.services.camera_service import CameraService
from plant_eye.services.servo_service import ServoService

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = Settings()

    if settings.hardware_mode == "real":
        from plant_eye.hardware.camera_hw import PiCamera
        from plant_eye.hardware.servo_hw import ArducamServo

        camera_backend = PiCamera()
        servo_backend = ArducamServo(bus=settings.i2c_bus, addr=settings.servo_i2c_addr)
    else:
        from plant_eye.hardware.camera_stub import StubCamera
        from plant_eye.hardware.servo_stub import StubServo

        camera_backend = StubCamera()
        servo_backend = StubServo()

    camera_backend.startup()
    servo_backend.startup()

    app.state.camera = CameraService(camera_backend)
    app.state.servo = ServoService(servo_backend, settings)
    app.state.settings = settings

    logger.info("Plant Eye started (mode=%s, room=%s)", settings.hardware_mode, settings.room)
    yield

    servo_backend.shutdown()
    camera_backend.shutdown()
    logger.info("Plant Eye shut down")


app = FastAPI(title="Plant Eye", lifespan=lifespan)
app.include_router(health.router)
app.include_router(servo.router)
app.include_router(camera.router)

if __name__ == "__main__":
    import uvicorn

    settings = Settings()
    uvicorn.run("plant_eye.main:app", host=settings.host, port=settings.port, reload=True)
