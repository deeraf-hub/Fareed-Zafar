"""Phase 0 environment check for RepCoach.

Prints the Python / mediapipe / OpenCV / numpy versions actually in use,
verifies the classic ``mp.solutions.pose`` API is importable and can run,
then opens the webcam and shows a live mirrored preview window.

Run it from the repcoach/ directory:

    python scripts/check_env.py            # versions + live camera window
    python scripts/check_env.py --no-camera  # versions only (headless machines)

Exit code is 0 when every check passes, 1 otherwise.
"""

from __future__ import annotations

import argparse
import platform
import sys
import time
from pathlib import Path

# Allow "python scripts/check_env.py" to import config.py from the project root.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import config  # noqa: E402


MIN_PYTHON = (3, 11)
MAX_PYTHON = (3, 12)

OK = "  [ok]  "
BAD = "  [FAIL]"


def _line(char: str = "-") -> None:
    print(char * 62)


def check_python() -> bool:
    """Report the interpreter version and whether mediapipe supports it."""
    v = sys.version_info
    print(f"Python           : {v.major}.{v.minor}.{v.micro}  ({sys.executable})")
    print(f"Platform         : {platform.system()} {platform.release()} ({platform.machine()})")
    if (v.major, v.minor) < MIN_PYTHON:
        print(f"{BAD} Python {MIN_PYTHON[0]}.{MIN_PYTHON[1]}+ required.")
        return False
    if (v.major, v.minor) > MAX_PYTHON:
        print(
            f"{BAD} Python {v.major}.{v.minor} is newer than mediapipe 0.10.21 ships "
            f"wheels for. Create the venv with Python 3.11 or 3.12."
        )
        return False
    print(f"{OK} Interpreter version is supported by the pinned mediapipe wheel.")
    return True


def check_packages() -> bool:
    """Import the three pinned packages and print their versions."""
    ok = True
    try:
        import numpy

        print(f"numpy            : {numpy.__version__}")
    except Exception as exc:  # pragma: no cover - import failure path
        print(f"{BAD} numpy import failed: {exc}")
        return False

    try:
        import cv2

        print(f"OpenCV (cv2)     : {cv2.__version__}")
        print(f"{OK} OpenCV imported.")
    except Exception as exc:
        print(f"{BAD} OpenCV import failed: {exc}")
        ok = False

    try:
        import mediapipe as mp

        print(f"mediapipe        : {mp.__version__}")
    except Exception as exc:
        print(f"{BAD} mediapipe import failed: {exc}")
        return False

    if not hasattr(mp, "solutions") or not hasattr(mp.solutions, "pose"):
        print(
            f"{BAD} mediapipe {mp.__version__} has no mp.solutions.pose. "
            f"Version 1.0+ removed it — install the pinned 0.10.21 instead."
        )
        return False

    landmarks = len(list(mp.solutions.pose.PoseLandmark))
    print(f"{OK} mp.solutions.pose available ({landmarks} landmarks).")
    return ok


def check_pose_runs() -> bool:
    """Push one blank frame through Pose to prove the bundled model loads."""
    try:
        import mediapipe as mp
        import numpy as np

        with mp.solutions.pose.Pose(static_image_mode=True, model_complexity=1) as pose:
            blank = np.zeros((480, 640, 3), dtype=np.uint8)
            pose.process(blank)
    except Exception as exc:
        print(f"{BAD} Pose model failed to run: {exc}")
        return False
    print(f"{OK} Pose model loaded and processed a test frame.")
    return True


def open_camera():
    """Open the webcam, trying the platform-preferred backend first.

    Returns ``(capture, description)`` or ``(None, reason)``.
    """
    import cv2

    if config.IS_WINDOWS:
        backends = [(cv2.CAP_DSHOW, "CAP_DSHOW"), (cv2.CAP_MSMF, "CAP_MSMF")]
    elif config.IS_MACOS:
        backends = [(cv2.CAP_AVFOUNDATION, "CAP_AVFOUNDATION")]
    elif config.IS_LINUX:
        backends = [(cv2.CAP_V4L2, "CAP_V4L2")]
    else:
        backends = []
    backends.append((cv2.CAP_ANY, "CAP_ANY"))

    indices = [config.CAMERA_INDEX, *config.CAMERA_FALLBACK_INDICES]
    tried = []
    for index in indices:
        for api, api_name in backends:
            cap = cv2.VideoCapture(index, api)
            if not cap.isOpened():
                cap.release()
                tried.append(f"index {index} / {api_name}")
                continue
            cap.set(cv2.CAP_PROP_FRAME_WIDTH, config.CAMERA_WIDTH)
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, config.CAMERA_HEIGHT)
            cap.set(cv2.CAP_PROP_FPS, config.CAMERA_FPS)
            cap.set(cv2.CAP_PROP_BUFFERSIZE, config.CAMERA_BUFFER_SIZE)

            # Some drivers need a moment before the first frame arrives.
            deadline = time.time() + config.CAMERA_WARMUP_SECONDS
            while time.time() < deadline:
                ok, frame = cap.read()
                if ok and frame is not None:
                    h, w = frame.shape[:2]
                    return cap, f"index {index} via {api_name} at {w}x{h}"
            cap.release()
            tried.append(f"index {index} / {api_name} (opened, no frames)")

    return None, "; ".join(tried) if tried else "no backends available"


def show_camera() -> bool:
    """Show a live mirrored preview until the user presses q or ESC."""
    import cv2

    cap, info = open_camera()
    if cap is None:
        print(f"{BAD} Could not read from any camera. Tried: {info}")
        print(
            "        Close Zoom/Teams/Camera app, check privacy settings, "
            "then re-run. Use --no-camera to skip this step."
        )
        return False

    print(f"{OK} Camera open: {info}")
    print("\n  A window titled "
          f"'{config.CHECK_WINDOW_NAME}' should now show your live feed.")
    print("  Press q or ESC in that window to close it.\n")

    frames = 0
    started = time.time()
    try:
        while True:
            ok, frame = cap.read()
            if not ok or frame is None:
                print(f"{BAD} Camera stopped delivering frames after {frames}.")
                return False

            if config.MIRROR_VIEW:
                frame = cv2.flip(frame, 1)
            frames += 1

            elapsed = max(time.time() - started, 1e-6)
            cv2.putText(
                frame,
                f"RepCoach camera check  |  {frames / elapsed:5.1f} FPS  |  q to quit",
                (16, 34),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                config.COLOR_ACCENT,
                2,
                cv2.LINE_AA,
            )
            cv2.imshow(config.CHECK_WINDOW_NAME, frame)

            key = cv2.waitKey(1) & 0xFF
            if key in config.QUIT_KEYS:
                break
            # Also stop if the user closed the window with the title-bar X.
            if cv2.getWindowProperty(config.CHECK_WINDOW_NAME, cv2.WND_PROP_VISIBLE) < 1:
                break
    except cv2.error as exc:
        print(f"{BAD} OpenCV could not open a window: {exc}")
        print("        On a headless machine, run with --no-camera.")
        return False
    finally:
        cap.release()
        cv2.destroyAllWindows()

    elapsed = max(time.time() - started, 1e-6)
    print(f"{OK} Displayed {frames} frames at {frames / elapsed:.1f} FPS average.")
    return True


def main() -> int:
    parser = argparse.ArgumentParser(description="RepCoach environment check")
    parser.add_argument(
        "--no-camera",
        action="store_true",
        help="skip the live webcam preview (versions and model check only)",
    )
    args = parser.parse_args()

    _line("=")
    print("RepCoach — Phase 0 environment check")
    _line("=")

    results = [check_python()]
    _line()
    results.append(check_packages())
    if results[-1]:
        results.append(check_pose_runs())
    _line()

    if args.no_camera:
        print("Camera preview skipped (--no-camera).")
    else:
        results.append(show_camera())

    _line("=")
    if all(results):
        print("ALL CHECKS PASSED — Phase 0 is good. ✅")
        return 0
    print("SOME CHECKS FAILED — see [FAIL] lines above. ❌")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
