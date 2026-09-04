"""The harness has to be trustworthy before its numbers mean anything."""

import json

from aiauto.evaluation.runner import EvalCase, load_cases, run_eval
from aiauto.models import Usage

USAGE = Usage(model="fake", input_tokens=100, output_tokens=50, cost_usd=0.001)


def case(case_id: str, **meta) -> EvalCase:
    return EvalCase(
        id=case_id,
        payload={"topic": "beans"},
        graders=["required_fields"],
        meta={"required_fields": ["caption"], **meta},
    )


def always(caption: str):
    def workflow(_payload):
        return {"caption": caption}, USAGE

    return workflow


def test_report_counts_passes_and_cost():
    report = run_eval("demo", [case("a"), case("b")], always("hello"))
    assert report.pass_rate == 1.0
    assert report.total_cost_usd == 0.002
    assert report.failures() == []


def test_failing_case_is_reported_with_its_reason():
    report = run_eval("demo", [case("a")], always(""))
    assert report.pass_rate == 0.0
    detail = report.to_dict()["failures"][0]["failed_graders"][0]
    assert detail["name"] == "required_fields"
    assert "caption" in detail["detail"]


def test_a_crashing_workflow_is_a_failed_run_not_a_dead_eval():
    def explodes(_payload):
        raise ValueError("upstream timeout")

    report = run_eval("demo", [case("a"), case("b")], explodes)
    assert len(report.runs) == 2, "the second case still ran"
    assert report.pass_rate == 0.0
    assert "upstream timeout" in report.to_dict()["failures"][0]["error"]


def test_repeat_multiplies_runs_but_not_cases():
    report = run_eval("demo", [case("a"), case("b")], always("hi"), repeat=3)
    assert len(report.runs) == 6
    assert report.to_dict()["cases"] == 2


def test_consistency_is_one_when_every_repeat_agrees():
    report = run_eval("demo", [case("a")], always("hi"), repeat=4)
    assert report.consistency() == 1.0


def test_consistency_falls_when_a_case_flip_flops():
    captions = iter(["hi", "", "hi", ""])

    def flaky(_payload):
        return {"caption": next(captions)}, USAGE

    report = run_eval("demo", [case("a"), case("b")], flaky, repeat=2)
    # Both cases passed once and failed once, so neither is consistent.
    assert report.consistency() == 0.0


def test_grader_breakdown_names_the_losing_rule():
    both = EvalCase(
        id="c",
        payload={},
        graders=["required_fields", "max_length"],
        meta={"required_fields": ["caption"], "max_chars": 2},
    )
    report = run_eval("demo", [both], always("far too long"))
    breakdown = report.grader_breakdown()
    assert breakdown["required_fields"] == 1.0
    assert breakdown["max_length"] == 0.0


def test_render_and_to_dict_agree():
    report = run_eval("demo", [case("a")], always("hi"))
    rendered = report.render()
    assert "pass rate    100%" in rendered
    assert json.loads(json.dumps(report.to_dict()))["eval"] == "demo"


def test_shipped_datasets_load_and_name_known_graders():
    from aiauto.evaluation.graders import GRADERS
    from aiauto.suites import DATASETS

    for path in sorted(DATASETS.glob("*.jsonl")):
        cases = load_cases(path)
        assert cases, f"{path.name} is empty"
        assert len({c.id for c in cases}) == len(cases), f"duplicate ids in {path.name}"
        for c in cases:
            for grader in c.graders:
                assert grader in GRADERS, f"{path.name}:{c.id} names unknown grader {grader}"
