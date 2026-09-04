"""The HTTP contract n8n depends on."""

import pytest
from fastapi.testclient import TestClient

from aiauto.api import main as api
from aiauto.content import ContentQualityError
from aiauto.models import SocialPost, Triage, Urgency
from aiauto.testing import FakeLLM, scripted

MERCHANT = {
    "name": "Karachi Coffee Roasters",
    "industry": "specialty coffee retail",
    "banned_words": ["cheap"],
}


@pytest.fixture
def client():
    fake = FakeLLM()
    api.app.dependency_overrides[api.get_llm] = lambda: fake
    with TestClient(api.app) as c:
        c.fake = fake
        yield c
    api.app.dependency_overrides.clear()


def test_healthz_reports_model_and_auth_mode(client):
    body = client.get("/healthz").json()
    assert body["status"] == "ok"
    assert body["auth"] in {"open", "bearer"}


def test_create_post_returns_a_validated_post(client):
    response = client.post(
        "/content/post",
        json={"merchant": MERCHANT, "platform": "instagram", "topic": "a new blend"},
    )
    assert response.status_code == 200
    body = response.json()
    assert set(body) == {"output", "cost_usd", "model"}
    assert set(body["output"]) == {"caption", "hashtags", "call_to_action", "image_prompt", "alt_text"}


def test_campaign_returns_one_post_per_platform(client):
    response = client.post(
        "/content/campaign",
        json={"merchant": MERCHANT, "topic": "Eid gift boxes", "platforms": ["instagram", "linkedin"]},
    )
    assert response.status_code == 200
    assert set(response.json()["output"]) == {"instagram", "linkedin"}


def test_campaign_rejects_an_empty_platform_list(client):
    response = client.post("/content/campaign", json={"merchant": MERCHANT, "topic": "x", "platforms": []})
    assert response.status_code == 422


def test_triage_includes_the_route(client):
    response = client.post(
        "/inbox/triage", json={"merchant": MERCHANT, "message": "Where is order 4471?"}
    )
    assert response.status_code == 200
    assert response.json()["output"]["route"] in {"auto_reply", "human_queue", "escalate_now", "drop"}


def test_triage_rejects_an_empty_message(client):
    assert client.post("/inbox/triage", json={"merchant": MERCHANT, "message": ""}).status_code == 422


def test_unusable_generation_is_a_422_with_the_issues(client):
    bad = SocialPost(
        caption="Beans so cheap you will not believe it.",
        hashtags=[],
        call_to_action="Visit",
        image_prompt="beans",
        alt_text="beans",
    )
    api.app.dependency_overrides[api.get_llm] = lambda: FakeLLM(responses=scripted(bad, bad))

    response = client.post(
        "/content/post", json={"merchant": MERCHANT, "platform": "instagram", "topic": "a new blend"}
    )

    assert response.status_code == 422
    assert any("banned word" in issue for issue in response.json()["issues"])


def test_bearer_token_is_enforced_when_configured(monkeypatch):
    from aiauto.config import Settings

    monkeypatch.setattr(api, "settings", Settings(api_token="s3cret"))
    api.app.dependency_overrides[api.get_llm] = lambda: FakeLLM()
    with TestClient(api.app) as c:
        payload = {"merchant": MERCHANT, "platform": "instagram", "topic": "a new blend"}
        assert c.post("/content/post", json=payload).status_code == 401
        assert c.post("/content/post", json=payload, headers={"Authorization": "Bearer wrong"}).status_code == 401
        assert c.post("/content/post", json=payload, headers={"Authorization": "Bearer s3cret"}).status_code == 200
    api.app.dependency_overrides.clear()
