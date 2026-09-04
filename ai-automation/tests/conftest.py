import pytest

from aiauto.models import BrandProfile


@pytest.fixture
def brand() -> BrandProfile:
    return BrandProfile(
        name="Karachi Coffee Roasters",
        industry="specialty coffee retail",
        tone="warm, unfussy",
        audience="city professionals",
        banned_words=["cheap", "guaranteed"],
    )
