"""RepCoach configuration.

Every tunable number in RepCoach lives here: camera settings, colours, angle
thresholds, smoothing constants and exercise definitions. Logic modules import
from this file and never hardcode magic numbers of their own.

This file grows one section per build phase.
"""

import sys

# ---------------------------------------------------------------------------
# Platform
# ---------------------------------------------------------------------------

IS_WINDOWS = sys.platform.startswith("win")
IS_MACOS = sys.platform == "darwin"
IS_LINUX = sys.platform.startswith("linux")

# ---------------------------------------------------------------------------
# Camera
# ---------------------------------------------------------------------------

#: Webcam device index. 0 is the built-in laptop camera on most machines.
CAMERA_INDEX = 0

#: Extra indices to probe if CAMERA_INDEX does not open (USB cams, virtual cams).
CAMERA_FALLBACK_INDICES = (1, 2)

#: Requested capture resolution. The driver may hand back the nearest supported
#: mode instead, which is fine — everything downstream reads the real frame size.
CAMERA_WIDTH = 1280
CAMERA_HEIGHT = 720

#: Requested capture frame rate.
CAMERA_FPS = 30

#: Capture buffer depth. 1 keeps latency low so the skeleton tracks "now",
#: not a frame or two ago. Not every backend honours it.
CAMERA_BUFFER_SIZE = 1

#: Seconds to wait for the first frame before declaring the camera dead.
CAMERA_WARMUP_SECONDS = 5.0

#: Selfie view — mirror the frame horizontally so moving left moves left.
MIRROR_VIEW = True

# ---------------------------------------------------------------------------
# Window
# ---------------------------------------------------------------------------

WINDOW_NAME = "RepCoach"
CHECK_WINDOW_NAME = "RepCoach — camera check"

#: Keys that close a window (ASCII). 27 is ESC.
QUIT_KEYS = (ord("q"), ord("Q"), 27)

# ---------------------------------------------------------------------------
# Palette (BGR, because OpenCV)
# ---------------------------------------------------------------------------

COLOR_PANEL = (18, 18, 18)        # near-black overlay panels
COLOR_TEXT = (255, 255, 255)      # white
COLOR_ACCENT = (194, 255, 0)      # #00FFC2 mint
COLOR_TIP = (0, 176, 255)         # amber
COLOR_WARNING = (60, 60, 255)     # red
COLOR_MUTED = (150, 150, 150)     # dim grey for secondary text
