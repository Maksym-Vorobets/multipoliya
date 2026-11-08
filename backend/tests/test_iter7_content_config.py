# Iteration 7: game_content_config endpoints (GET public, PUT admin with validation)
import copy
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
ADMIN = {"email": "admin@multipolia.app", "password": "Multipolia2026!"}


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN)
    if r.status_code != 200:
        pytest.skip("admin login failed")
    return r.json()["token"]


@pytest.fixture(scope="module")
def original():
    r = requests.get(f"{BASE_URL}/api/content-config")
    assert r.status_code == 200
    d = r.json()
    if not d.get("fields"):
        pytest.skip("no stored config to use as base")
    return {k: d[k] for k in ("defaultInflationRate", "defaultCreditRate", "fields", "cards", "systemModalsText") if k in d}


@pytest.fixture(scope="module", autouse=True)
def restore(token, original):
    yield
    r = requests.put(f"{BASE_URL}/api/admin/content-config", json=original, headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200


def H(tok):
    return {"Authorization": f"Bearer {tok}"}


class TestContentConfig:
    def test_get_public_structure(self, original):
        assert len(original["fields"]) == 36
        assert {k: len(v) for k, v in original["cards"].items()} == {"kap_chance": 16, "kap_borgi": 16, "gos_chance": 18, "gos_borgi": 18, "nar_chance": 16, "nar_borgi": 16}
        moon = next(f for f in original["fields"] if f["id"] == "moon")
        assert moon["type"] == "property" and len(moon["rentLevels"]) == 5
        orion = next(f for f in original["fields"] if f["id"] == "orion")
        assert len(orion["rentByCount"]) == 4
        kv = next(f for f in original["fields"] if f["id"] == "kvantal")
        assert len(kv["rentTable"]["one"]) == 4 and len(kv["rentTable"]["both"]) == 4
        # no inflation/deflation cards
        for deck in original["cards"].values():
            for c in deck:
                assert "inflation" not in c["actionType"].lower() and "deflation" not in c["actionType"].lower()

    def test_put_no_token_401(self, original):
        r = requests.put(f"{BASE_URL}/api/admin/content-config", json=original)
        assert r.status_code == 401

    def test_put_bad_token_401(self, original):
        r = requests.put(f"{BASE_URL}/api/admin/content-config", json=original, headers=H("garbage"))
        assert r.status_code == 401

    def test_put_negative_price_422(self, token, original):
        bad = copy.deepcopy(original)
        bad["fields"][0]["basePrice"] = -5
        r = requests.put(f"{BASE_URL}/api/admin/content-config", json=bad, headers=H(token))
        assert r.status_code == 422

    def test_put_bad_rent_levels_len_422(self, token, original):
        bad = copy.deepcopy(original)
        moon = next(f for f in bad["fields"] if f["id"] == "moon")
        moon["rentLevels"] = [1, 2, 3]
        r = requests.put(f"{BASE_URL}/api/admin/content-config", json=bad, headers=H(token))
        assert r.status_code == 422

    def test_put_bad_action_422(self, token, original):
        bad = copy.deepcopy(original)
        bad["cards"]["kap_chance"][0]["actionType"] = "inflation"
        r = requests.put(f"{BASE_URL}/api/admin/content-config", json=bad, headers=H(token))
        assert r.status_code == 422

    def test_put_empty_name_422(self, token, original):
        bad = copy.deepcopy(original)
        bad["fields"][0]["name"]["ru"] = ""
        r = requests.put(f"{BASE_URL}/api/admin/content-config", json=bad, headers=H(token))
        assert r.status_code == 422

    def test_put_inflation_over_10_422(self, token, original):
        bad = copy.deepcopy(original)
        bad["defaultInflationRate"] = 150
        r = requests.put(f"{BASE_URL}/api/admin/content-config", json=bad, headers=H(token))
        assert r.status_code == 422

    def test_put_valid_and_persist(self, token, original):
        good = copy.deepcopy(original)
        moon = next(f for f in good["fields"] if f["id"] == "moon")
        moon["name"]["ru"] = "TEST_Селена"
        moon["basePrice"] = 77
        good["cards"]["kap_chance"][1]["amount"] = 31
        r = requests.put(f"{BASE_URL}/api/admin/content-config", json=good, headers=H(token))
        assert r.status_code == 200 and r.json()["ok"] is True
        g = requests.get(f"{BASE_URL}/api/content-config").json()
        m2 = next(f for f in g["fields"] if f["id"] == "moon")
        assert m2["name"]["ru"] == "TEST_Селена" and m2["basePrice"] == 77
        assert g["cards"]["kap_chance"][1]["amount"] == 31
        assert "_id" not in g and "key" not in g
        assert g["updated_by"] == ADMIN["email"]
