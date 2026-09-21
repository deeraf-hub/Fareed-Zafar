# Convenience targets. Run from this directory with the backend virtualenv activated.
PY ?= python
DATA ?= backend/data/raw/online_retail_II.xlsx

.PHONY: install migrate download import analytics features train predict report test lint api web all

install:
	cd backend && pip install -r requirements-dev.txt && pip install -e .
	cd frontend && npm ci

migrate:
	cd backend && alembic upgrade head

download:
	cd backend && gci download --dest data/raw

import:
	cd backend && gci import-data ../$(DATA)

analytics:
	cd backend && gci build-analytics

features:
	cd backend && gci build-features

train:
	cd backend && gci train

predict:
	cd backend && gci predict

report:
	cd backend && gci quality-report --out reports/data_quality.md

all: migrate import analytics features train predict report

test:
	cd backend && pytest
	cd frontend && npm test

lint:
	cd backend && ruff check .
	cd frontend && npm run lint

api:
	cd backend && uvicorn gci.api.main:app --reload --port 8000

web:
	cd frontend && npm run dev
