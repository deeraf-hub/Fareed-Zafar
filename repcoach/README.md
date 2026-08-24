# RepCoach

A real-time AI fitness trainer that runs on a laptop webcam. It tracks your body
with MediaPipe Pose (33 landmarks), computes joint angles, counts reps with a
hysteresis state machine, and gives live form feedback on a polished HUD.

Everything runs locally on the CPU. No cloud, no GPU, no account.

> **Build status:** Phase 0 (environment) complete. Phases 1–5 in progress.

---

## Requirements

- **Python 3.11 or 3.12.** MediaPipe 0.10.21 ships wheels for 3.9–3.12 only, and
  MediaPipe 1.0+ removed the `mp.solutions.pose` API this project uses. Python
  3.13 will not work.
- A webcam.
- Windows, macOS, or Linux.

## Setup

### Windows (PowerShell)

```powershell
cd repcoach
py -3.11 -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

If `py -3.11` is not found, run `py -0p` to list the Python versions you have
installed and pick 3.11 or 3.12.

### macOS / Linux

```bash
cd repcoach
python3.11 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
```

## Phase 0 — verify the environment

```bash
python scripts/check_env.py
```

You should see the version report in the terminal, then a window titled
**"RepCoach — camera check"** showing your mirrored live webcam feed with an FPS
readout. Press `q` or `ESC` to close it.

On a machine with no camera or no display, run the version-only check:

```bash
python scripts/check_env.py --no-camera
```

The script exits `0` when every check passes and `1` otherwise.

### If the camera does not open

- Close anything else using it (Zoom, Teams, the Windows Camera app, OBS).
- Windows: Settings → Privacy & security → Camera → allow desktop apps.
- macOS: System Settings → Privacy & Security → Camera → allow your terminal.
- If you have several cameras, change `CAMERA_INDEX` in `config.py`. The checker
  also probes the indices listed in `CAMERA_FALLBACK_INDICES`.

## Pinned dependencies

| Package | Version | Why |
| --- | --- | --- |
| `mediapipe` | 0.10.21 | Last line with the classic `mp.solutions.pose` API and bundled models — no separate `.task` file to download. |
| `opencv-contrib-python` | 4.11.0.86 | MediaPipe's own OpenCV dependency. Same `import cv2`, a superset of `opencv-python`. Installing both packages makes them shadow each other, so only this one is pinned. |
| `numpy` | 1.26.4 | MediaPipe 0.10.x requires NumPy < 2. |

## Configuration

All tunable values — camera settings, colours, angle thresholds, smoothing
constants, exercise definitions — live in `config.py`. Logic modules read from
it and never hardcode their own numbers.

## Project layout

```
repcoach/
  config.py             # every tunable: camera, palette, thresholds, exercises
  scripts/check_env.py  # Phase 0 environment + camera check
  requirements.txt      # pinned versions
  README.md
```

Modules added in later phases: `pose_engine.py`, `angle_utils.py`,
`exercise.py`, `feedback.py`, `ui.py`, `main.py`.

## Roadmap

| Phase | Scope | Status |
| --- | --- | --- |
| 0 | Environment, pinned deps, camera check | ✅ done |
| 1 | Live pose skeleton on the mirrored feed | pending |
| 2 | Angle engine with EMA smoothing + debug overlay | pending |
| 3 | Bicep curl counter, progress arc, rep pulse | pending |
| 4 | Config-driven exercises: squat, shoulder press | pending |
| 5 | Form feedback, full HUD, clean demo mode | pending |

## Possible v2

A YOLO-pose backend as an alternative to MediaPipe. Not used in v1 — MediaPipe
runs fast enough on a CPU and needs no model download.
