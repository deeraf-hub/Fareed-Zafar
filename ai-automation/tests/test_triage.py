"""Policy must hold in code, not only in the prompt."""

import pytest

from aiauto.models import Triage, Urgency
from aiauto.testing import FakeLLM, scripted
from aiauto.triage import apply_policy, route, triage_message


def record(**overrides) -> Triage:
    base = dict(
        intent="order_status",
        urgency=Urgency.normal,
        sentiment="neutral",
        language="English",
        summary="Customer asks where their order is.",
        suggested_reply="Let me check that order and come right back to you.",
        safe_to_auto_reply=True,
    )
    return Triage(**{**base, **overrides})


def test_ordinary_question_stays_auto_repliable():
    assert apply_policy(record()).safe_to_auto_reply is True


@pytest.mark.parametrize(
    "overrides",
    [
        {"intent": "complaint"},
        {"sentiment": "negative"},
        {"urgency": Urgency.high},
        {"intent": "spam"},
        {"intent": "other"},
    ],
    ids=["complaint", "negative", "urgent", "spam", "unclassified"],
)
def test_policy_overrides_an_over_confident_model(overrides):
    # The model claimed it was safe; policy disagrees, and policy wins.
    assert apply_policy(record(**overrides, safe_to_auto_reply=True)).safe_to_auto_reply is False


def test_policy_never_widens_permission():
    # A model that said "not safe" is never talked into "safe".
    assert apply_policy(record(safe_to_auto_reply=False)).safe_to_auto_reply is False


@pytest.mark.parametrize(
    "rec,expected",
    [
        (record(intent="spam"), "drop"),
        (record(), "auto_reply"),
        (record(intent="complaint", urgency=Urgency.high), "escalate_now"),
        (record(intent="complaint", urgency=Urgency.normal), "human_queue"),
    ],
    ids=["spam", "routine", "urgent", "needs-a-human"],
)
def test_routing(rec, expected):
    assert route(apply_policy(rec)) == expected


def test_triage_applies_policy_to_the_model_output(brand):
    unsafe = record(intent="complaint", sentiment="negative", safe_to_auto_reply=True)
    llm = FakeLLM(responses=scripted(unsafe))

    result = triage_message(llm, brand, "My order arrived open and I want a refund.")

    assert result.output.safe_to_auto_reply is False
    assert llm.calls[0].effort == "medium", "triage runs at the cheaper effort level"
