from fastapi import APIRouter, Request, Response
from pydantic import BaseModel, Field

router = APIRouter(prefix="/camera")


class CaptureRequest(BaseModel):
    quality: int = Field(default=90, ge=1, le=100)


class CaptureResponse(BaseModel):
    size_bytes: int


@router.post("/capture", response_model=CaptureResponse)
async def capture(body: CaptureRequest, request: Request):
    camera = request.app.state.camera
    jpeg_bytes = await camera.capture(quality=body.quality)
    # Store the last capture in app state so the caller can retrieve it
    request.app.state.last_capture = jpeg_bytes
    return CaptureResponse(size_bytes=len(jpeg_bytes))


@router.get("/last")
async def last_capture(request: Request):
    """Return the most recently captured image as JPEG."""
    jpeg_bytes = getattr(request.app.state, "last_capture", None)
    if jpeg_bytes is None:
        return Response(status_code=404)
    return Response(content=jpeg_bytes, media_type="image/jpeg")


class PreviewRequest(BaseModel):
    width: int = Field(default=640, ge=1, le=1920)
    height: int = Field(default=480, ge=1, le=1080)


@router.post("/preview")
async def preview(body: PreviewRequest, request: Request):
    camera = request.app.state.camera
    jpeg_bytes = await camera.preview(body.width, body.height)
    return Response(content=jpeg_bytes, media_type="image/jpeg")
