"""aiauto — small, production-shaped AI automation building blocks.

Four layers, each usable on its own:

* ``llm``        — a thin, injectable Claude client (structured output, tool loop, usage/cost).
* ``workflows``  — the business automations: social content generation and inbox triage.
* ``agent``      — a tool-using reporting agent built on the SDK tool runner.
* ``evaluation`` — a grading harness so every prompt change is measured, not guessed.

The FastAPI app in ``aiauto.api`` exposes the workflows over HTTP so no-code
platforms (n8n, Make, Zapier) can call them as ordinary REST steps.
"""

__version__ = "1.0.0"
