"""The exported workflows are part of the deliverable, so they get checked too.

A workflow that fails to import is a broken deliverable that no Python test
would otherwise catch.
"""

import json
from pathlib import Path

import pytest

WORKFLOWS = sorted((Path(__file__).resolve().parents[1] / "n8n").glob("*.json"))


@pytest.fixture(params=WORKFLOWS, ids=lambda p: p.stem)
def workflow(request):
    return json.loads(request.param.read_text(encoding="utf-8"))


def test_there_are_workflows_to_check():
    assert WORKFLOWS


def test_has_the_keys_n8n_import_requires(workflow):
    assert {"name", "nodes", "connections"} <= set(workflow)
    assert workflow["nodes"]


def test_node_ids_and_names_are_unique(workflow):
    names = [n["name"] for n in workflow["nodes"]]
    ids = [n["id"] for n in workflow["nodes"]]
    assert len(names) == len(set(names))
    assert len(ids) == len(set(ids))


def test_every_connection_points_at_a_real_node(workflow):
    names = {n["name"] for n in workflow["nodes"]}
    for source, conns in workflow["connections"].items():
        assert source in names, f"connection from unknown node {source}"
        for group in conns["main"]:
            for target in group:
                assert target["node"] in names, f"connection to unknown node {target['node']}"


def test_every_node_but_the_trigger_is_reachable(workflow):
    targets = {
        t["node"]
        for conns in workflow["connections"].values()
        for group in conns["main"]
        for t in group
    }
    triggers = {
        n["name"] for n in workflow["nodes"] if "trigger" in n["type"].lower() or "webhook" in n["type"].lower()
    }
    orphans = {n["name"] for n in workflow["nodes"]} - targets - triggers
    assert not orphans, f"unreachable nodes: {orphans}"


def test_no_secret_is_baked_into_a_workflow(workflow):
    raw = json.dumps(workflow)
    for marker in ("sk-ant-", "EAAG", "xoxb-", "Bearer sk-"):
        assert marker not in raw, f"{marker!r} looks like a hardcoded credential"


def test_the_service_is_called_through_an_environment_variable(workflow):
    raw = json.dumps(workflow)
    if "/content/" in raw or "/inbox/" in raw:
        assert "$env.AIAUTO_BASE_URL" in raw, "hardcoded service host"
        assert "$env.AIAUTO_API_TOKEN" in raw, "the service call is unauthenticated"
