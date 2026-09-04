"""Graders decide what ships, so a wrong grader is worse than a wrong prompt."""

import pytest

from aiauto.evaluation.graders import (
    field_equals,
    max_hashtags,
    max_length,
    must_mention,
    must_not_fabricate,
    no_banned_words,
    required_fields,
)


def test_field_equals_reports_partial_credit():
    case = {"expect": {"intent": "pricing", "urgency": "low"}}
    grade = field_equals(case, {"intent": "pricing", "urgency": "high"})
    assert grade.passed is False
    assert grade.score == 0.5
    assert "urgency" in grade.detail


def test_field_equals_passes_on_exact_match():
    case = {"expect": {"intent": "spam"}}
    assert field_equals(case, {"intent": "spam", "summary": "junk"}).passed


def test_banned_words_search_nested_strings_and_lists():
    case = {"banned_words": ["guaranteed"]}
    output = {"caption": "Fresh beans", "hashtags": ["#guaranteed"]}
    assert no_banned_words(case, output).passed is False


def test_banned_words_respect_word_boundaries():
    assert no_banned_words({"banned_words": ["cheap"]}, {"caption": "cheaper"}).passed


def test_length_and_hashtag_limits():
    assert max_length({"max_chars": 10}, {"caption": "x" * 11}).passed is False
    assert max_length({"max_chars": 10}, {"caption": "x" * 10}).passed
    assert max_hashtags({"max_hashtags": 2}, {"hashtags": ["#a", "#b", "#c"]}).passed is False


def test_limits_absent_from_the_case_are_not_failures():
    assert max_length({}, {"caption": "x" * 5000}).passed
    assert max_hashtags({}, {"hashtags": ["#a"] * 50}).passed


def test_required_fields_treats_whitespace_as_missing():
    grade = required_fields({"required_fields": ["alt_text", "caption"]}, {"alt_text": "  ", "caption": "hi"})
    assert grade.passed is False
    assert grade.score == 0.5


def test_must_mention_is_case_insensitive():
    assert must_mention({"must_mention": ["10PM"]}, {"caption": "open until 10pm"}).passed


@pytest.mark.parametrize(
    "caption,passes",
    [
        ("We cut delivery time by 18% this quarter.", True),
        ("We cut delivery time by 40% this quarter.", False),
        ("Bags start at Rs 1200.", False),
    ],
    ids=["figure-from-brief", "invented-percentage", "invented-price"],
)
def test_fabricated_figures_are_caught(caption, passes):
    case = {"input": "we cut average delivery time by 18% after zone-based routing"}
    assert must_not_fabricate(case, {"caption": caption}).passed is passes
