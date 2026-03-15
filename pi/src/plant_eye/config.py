from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    model_config = {"env_prefix": "PLANT_"}

    # Identity
    room: str = "office"

    # Hardware
    hardware_mode: str = "real"  # "real" or "stub"
    i2c_bus: int = 1
    servo_i2c_addr: int = 0x0C

    # Servo limits (degrees)
    pan_min: int = 0
    pan_max: int = 180
    tilt_min: int = 30
    tilt_max: int = 150

    # Server
    host: str = "0.0.0.0"
    port: int = 8420
