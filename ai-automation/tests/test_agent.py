"""The agent's tools return the numbers the report is built from."""

import json

import pytest

from aiauto import agent
from aiauto.config import Settings
from aiauto.models import Usage


@pytest.fixture(autouse=True)
def demo_store():
    # Reset to the bundled dataset after any test that repoints it.
    yield
    agent.use_store(agent.MetricsStore().path)


def test_list_merchants_returns_json_array():
    assert isinstance(json.loads(agent.list_merchants()), list)


def test_get_performance_aggregates_a_window():
    merchant = json.loads(agent.list_merchants())[0]
    data = json.loads(agent.get_performance(merchant, days=7))
    assert data["merchant"] == merchant
    assert data["posts"] > 0
    assert 0.0 <= data["engagement_rate"] <= 1.0


def test_unknown_merchant_returns_an_error_the_model_can_read():
    data = json.loads(agent.get_performance("Nobody Ltd", days=7))
    assert "error" in data and "Nobody Ltd" in data["error"]


def test_compare_periods_splits_into_two_windows():
    merchant = json.loads(agent.list_merchants())[0]
    data = json.loads(agent.compare_periods(merchant, days=7))
    assert data["current_period"]["posts"] > 0
    assert data["previous_period"]["posts"] > 0


class _Message:
    def __init__(self, text, stop_reason="end_turn"):
        self.content = [type("Block", (), {"type": "text", "text": text})()]
        self.stop_reason = stop_reason
        self.usage = type("U", (), {"input_tokens": 1000, "output_tokens": 400, "cache_read_input_tokens": 0})()


class _FakeClient:
    """Stands in for anthropic.Anthropic — yields scripted runner messages."""

    def __init__(self, messages):
        self._messages = messages
        self.beta = type("Beta", (), {"messages": self})()

    def tool_runner(self, **kwargs):
        self.kwargs = kwargs
        return iter(self._messages)


def test_report_agent_returns_the_final_text_and_sums_usage():
    client = _FakeClient([_Message("thinking out loud"), _Message("Headline: a strong week.")])

    result = agent.run_report_agent("How did we do?", settings=Settings(), client=client)

    assert result.output == "Headline: a strong week."
    assert result.usage.output_tokens == 800, "usage from every turn is counted"
    assert result.usage.cost_usd > 0


def test_report_agent_refuses_to_return_a_refusal():
    client = _FakeClient([_Message("", stop_reason="refusal")])
    with pytest.raises(RuntimeError, match="declined"):
        agent.run_report_agent("How did we do?", settings=Settings(), client=client)


def test_report_agent_stops_at_max_turns():
    client = _FakeClient([_Message(f"turn {i}") for i in range(20)])
    result = agent.run_report_agent("x", settings=Settings(), client=client, max_turns=3)
    assert result.output == "turn 2", "it stopped after three turns rather than looping on"


def test_agent_sends_a_cached_system_prompt():
    client = _FakeClient([_Message("done")])
    agent.run_report_agent("x", settings=Settings(), client=client)
    assert client.kwargs["system"][0]["cache_control"] == {"type": "ephemeral"}
