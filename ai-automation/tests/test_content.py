"""The guardrail is the product here, so it gets the most tests."""

import pytest

from aiauto.content import (
    ContentQualityError,
    build_system_prompt,
    generate_post,
    validate_post,
)
from aiauto.models import ContentBrief, Platform, SocialPost
from aiauto.testing import FakeLLM, scripted


def make_post(**overrides) -> SocialPost:
    base = dict(
        caption="Fresh beans landed this morning.",
        hashtags=["#coffee"],
        call_to_action="Visit the shop",
        image_prompt="Beans on a counter in morning light.",
        alt_text="Sacks of coffee beans on a wooden counter.",
    )
    return SocialPost(**{**base, **overrides})


def brief_for(brand, platform=Platform.tiktok, **kw) -> ContentBrief:
    return ContentBrief(merchant=brand, platform=platform, topic="a new blend", **kw)


def test_system_prompt_carries_brand_and_bans(brand):
    prompt = build_system_prompt(brand)
    assert brand.name in prompt
    assert "cheap" in prompt and "guaranteed" in prompt


def test_clean_post_has_no_issues(brand):
    assert validate_post(make_post(), brief_for(brand)) == []


def test_caption_over_platform_limit_is_caught(brand):
    # TikTok caps at 220 characters.
    post = make_post(caption="x" * 400)
    issues = validate_post(post, brief_for(brand, Platform.tiktok))
    assert any("limit is 220" in issue for issue in issues)


def test_too_many_hashtags_is_caught(brand):
    post = make_post(hashtags=[f"#tag{i}" for i in range(20)])
    issues = validate_post(post, brief_for(brand, Platform.facebook))
    assert any("hashtags" in issue for issue in issues)


def test_malformed_hashtag_is_caught(brand):
    issues = validate_post(make_post(hashtags=["coffee time"]), brief_for(brand))
    assert any("malformed hashtag" in issue for issue in issues)


def test_banned_word_is_caught(brand):
    post = make_post(caption="Our beans are cheap and always fresh.")
    issues = validate_post(post, brief_for(brand))
    assert any("banned word" in issue for issue in issues)


def test_banned_word_matching_is_word_bounded(brand):
    # "cheaper" contains "cheap" but is not the banned word.
    post = make_post(caption="A cheaper way to start the morning.")
    assert not any("banned word" in i for i in validate_post(post, brief_for(brand)))


def test_empty_alt_text_is_caught(brand):
    issues = validate_post(make_post(alt_text="  "), brief_for(brand))
    assert "alt_text is empty" in issues


def test_bad_draft_is_repaired_and_shipped(brand):
    bad = make_post(caption="Beans so cheap you will not believe it.")
    good = make_post(caption="Beans roasted this morning.")
    llm = FakeLLM(responses=scripted(bad, good))

    result = generate_post(llm, brief_for(brand))

    assert result.output.caption == good.caption
    assert len(llm.calls) == 2, "one generation, one repair"
    assert "banned word" in llm.calls[1].user, "the repair prompt quotes the violation"
    assert result.usage.cost_usd == pytest.approx(0.015), "both calls are billed"


def test_second_failure_raises_instead_of_shipping(brand):
    bad = make_post(caption="Beans so cheap you will not believe it.")
    llm = FakeLLM(responses=scripted(bad, bad))

    with pytest.raises(ContentQualityError) as excinfo:
        generate_post(llm, brief_for(brand))

    assert any("banned word" in issue for issue in excinfo.value.issues)
    assert len(llm.calls) == 2, "it stops after one repair, it does not keep paying"


def test_platform_limits_reach_the_prompt(brand):
    llm = FakeLLM(responses=scripted(make_post()))
    generate_post(llm, brief_for(brand, Platform.linkedin))
    assert "1300 characters" in llm.calls[0].user
