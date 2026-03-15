import time

from fastapi import APIRouter, Request

router = APIRouter()

_start_time = time.monotonic()


@router.get("/health")
async def health(request: Request):
    return {
        "status": "ok",
        "uptime_seconds": round(time.monotonic() - _start_time, 1),
        "camera_ready": request.app.state.camera is not None,
        "servo_ready": request.app.state.servo is not None,
    }
