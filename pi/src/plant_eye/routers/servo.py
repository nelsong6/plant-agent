from fastapi import APIRouter, Request
from pydantic import BaseModel, Field

router = APIRouter(prefix="/servo")


class MoveRequest(BaseModel):
    pan: int = Field(ge=0, le=180)
    tilt: int = Field(ge=0, le=180)


class PositionResponse(BaseModel):
    pan: int
    tilt: int


@router.post("/move", response_model=PositionResponse)
async def move(body: MoveRequest, request: Request):
    servo = request.app.state.servo
    pan, tilt = servo.move(body.pan, body.tilt)
    return PositionResponse(pan=pan, tilt=tilt)


@router.get("/position", response_model=PositionResponse)
async def position(request: Request):
    servo = request.app.state.servo
    pan, tilt = servo.position
    return PositionResponse(pan=pan, tilt=tilt)


@router.post("/home", response_model=PositionResponse)
async def home(request: Request):
    servo = request.app.state.servo
    pan, tilt = servo.home()
    return PositionResponse(pan=pan, tilt=tilt)
