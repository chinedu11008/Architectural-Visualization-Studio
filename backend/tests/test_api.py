import hashlib
import json

import pytest
from fastapi.testclient import TestClient

from backend import main


IFC_BYTES = b"""ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');
FILE_NAME('tiny.ifc','','','','','','');
FILE_SCHEMA(('IFC4'));
ENDSEC;
DATA;
ENDSEC;
END-ISO-10303-21;
"""
PNG_BYTES = b"\x89PNG\r\n\x1a\n" + b"\x00\x00\x00\x0dIHDR" + b"\x00\x00\x00\x01\x00\x00\x00\x01" + b"\x08\x06\x00\x00\x00" + b"\x1f\x15\xc4\x89"


@pytest.fixture
def api(tmp_path, monkeypatch):
    main._asset_verification_cache.clear()
    monkeypatch.setattr(main, "DATA_DIR", tmp_path)
    monkeypatch.setattr(main, "ASSET_DIR", tmp_path / "assets")
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "test.sqlite3")
    with TestClient(main.app) as client:
        yield client


def upload_assets(client):
    model_response = client.post(
        "/api/projects/test-project/assets/model",
        files={"file": ("building.ifc", IFC_BYTES, "application/x-step")},
    )
    reference_response = client.post(
        "/api/projects/test-project/assets/reference",
        files={"file": ("reference.png", PNG_BYTES, "image/png")},
    )
    assert model_response.status_code == 201
    assert reference_response.status_code == 201
    return model_response.json(), reference_response.json()


def test_health_declares_immutable_geometry_policy(api):
    response = api.get("/api/health")
    assert response.status_code == 200
    assert response.json()["geometry_policy"] == "immutable"



def test_ifc_api_upload_size_limit_is_64_mib(api, monkeypatch):
    assert main.MAX_IFC_BYTES == 64 * 1024 * 1024
    monkeypatch.setattr(main, "MAX_IFC_BYTES", len(IFC_BYTES) - 1)
    response = api.post(
        "/api/projects/test-project/assets/model",
        files={"file": ("building.ifc", IFC_BYTES, "application/x-step")},
    )
    assert response.status_code == 413

def test_uploads_are_hashed_read_only_assets(api):
    model, reference = upload_assets(api)
    assert model["sha256"] == hashlib.sha256(IFC_BYTES).hexdigest()
    assert model["kind"] == "ifc"
    assert reference["kind"] == "reference"
    assert api.get(model["url"]).content == IFC_BYTES



def test_asset_verification_hashes_once_per_file_metadata(api):
    model, _ = upload_assets(api)
    row = main.lookup_asset(model["id"])
    path = main.ASSET_DIR / (model["id"] + ".ifc")
    main._asset_verification_cache.pop(str(path.resolve()), None)

    from unittest.mock import patch

    with patch.object(main, "compute_file_sha256", wraps=main.compute_file_sha256) as hash_file:
        assert main.verify_asset(row) == path
        assert main.verify_asset(row) == path
        assert hash_file.call_count == 1

def test_render_job_only_accepts_presentation_settings(api):
    model, reference = upload_assets(api)
    payload = {
        "project_id": "test-project",
        "model_asset_id": model["id"],
        "reference_asset_id": reference["id"],
        "prompt": "Soft daylight and a pale stone material palette.",
        "presentation": {
            "camera": "isometric",
            "lighting": "daylight",
            "material_style": "warm",
            "environment": "golden",
            "ground": "grass",
            "context_objects": {"trees": True, "shrubs": True, "cars": True, "people": True, "boundary": True, "paths": True, "grass": True},
            "building_roles": {"exteriorWall": "#d7d0c4", "roof": "#3c464b"},
            "building_type": "hospital",
            "building_type_override": "hospital",
            "surroundings_rules": {
                "hospital": {
                    "vegetation": "formal",
                    "trees": 5,
                    "shrubs": 10,
                    "people": 12,
                    "vehicles": ["ambulance", "car"],
                    "fence": "low masonry and dark metal",
                },
            },
            "layout_seed": 721,
            "visible_storey_id": "201",
        },
        "geometry": {"scale": 4},
    }
    response = api.post("/api/render-jobs", json=payload)
    assert response.status_code == 422

    payload.pop("geometry")
    payload["presentation"]["context_objects"]["scale"] = 4
    context_mutation = api.post("/api/render-jobs", json=payload)
    assert context_mutation.status_code == 422

    payload["presentation"]["context_objects"].pop("scale")
    response = api.post("/api/render-jobs", json=payload)
    assert response.status_code == 201
    assert response.json()["geometry_policy"] == "immutable"
    assert response.json()["status"] == "queued"
    assert response.json()["presentation"]["environment"] == "golden"
    assert response.json()["presentation"]["context_objects"]["cars"] is True
    assert response.json()["presentation"]["context_objects"]["paths"] is True
    assert response.json()["presentation"]["building_roles"]["exteriorWall"] == "#d7d0c4"
    assert response.json()["presentation"]["building_type"] == "hospital"
    assert response.json()["presentation"]["surroundings_rules"]["hospital"]["vehicles"] == ["ambulance", "car"]
    assert response.json()["presentation"]["layout_seed"] == 721
    assert response.json()["presentation"]["visible_storey_id"] == "201"


def test_source_tampering_rejects_render_start(api):
    model, reference = upload_assets(api)
    response = api.post("/api/render-jobs", json={
        "project_id": "test-project",
        "model_asset_id": model["id"],
        "reference_asset_id": reference["id"],
        "prompt": "Overcast studio lighting.",
        "presentation": {"camera": "eye-level", "lighting": "overcast", "material_style": "source"},
    })
    asset_path = main.ASSET_DIR / (model["id"] + ".ifc")
    asset_path.chmod(0o600)
    asset_path.write_bytes(IFC_BYTES + b"tampered")
    started = api.post(f"/api/render-jobs/{response.json()['id']}/start")
    assert started.status_code == 409


def test_render_completion_requires_original_model_hash(api):
    model, reference = upload_assets(api)
    created = api.post("/api/render-jobs", json={
        "project_id": "test-project",
        "model_asset_id": model["id"],
        "reference_asset_id": reference["id"],
        "prompt": "Golden hour.",
        "presentation": {"camera": "isometric", "lighting": "golden", "material_style": "source"},
    }).json()
    api.post(f"/api/render-jobs/{created['id']}/start")
    wrong_metadata = json.dumps({"model_sha256": "0" * 64, "width": 1, "height": 1})
    rejected = api.post(
        f"/api/render-jobs/{created['id']}/complete",
        data={"metadata": wrong_metadata},
        files={"image": ("render.png", PNG_BYTES, "image/png")},
    )
    assert rejected.status_code == 409

    correct_metadata = json.dumps({"model_sha256": model["sha256"], "width": 1, "height": 1})
    completed = api.post(
        f"/api/render-jobs/{created['id']}/complete",
        data={"metadata": correct_metadata},
        files={"image": ("render.png", PNG_BYTES, "image/png")},
    )
    assert completed.status_code == 201
    assert completed.json()["status"] == "complete"
    assert completed.json()["result_url"]
    downloaded = api.get(completed.json()["result_url"])
    assert downloaded.status_code == 200
    assert downloaded.content == PNG_BYTES
    # Render images must be served inline without attachment header
    assert "attachment" not in downloaded.headers.get("content-disposition", "")


def test_list_project_assets_and_jobs(api):
    model, reference = upload_assets(api)
    assets_resp = api.get("/api/projects/test-project/assets")
    assert assets_resp.status_code == 200
    assets = assets_resp.json()
    assert len(assets) == 2
    kinds = {a["kind"] for a in assets}
    assert kinds == {"ifc", "reference"}

    created = api.post("/api/render-jobs", json={
        "project_id": "test-project",
        "model_asset_id": model["id"],
        "reference_asset_id": reference["id"],
        "prompt": "Soft daylight.",
        "presentation": {"camera": "isometric", "lighting": "daylight", "material_style": "source"},
    }).json()

    jobs_resp = api.get("/api/projects/test-project/render-jobs")
    assert jobs_resp.status_code == 200
    jobs = jobs_resp.json()
    assert len(jobs) == 1
    assert jobs[0]["id"] == created["id"]


def test_render_completion_cleans_up_on_invalid_dimensions(api):
    model, reference = upload_assets(api)
    created = api.post("/api/render-jobs", json={
        "project_id": "test-project",
        "model_asset_id": model["id"],
        "reference_asset_id": reference["id"],
        "prompt": "Test dimension mismatch.",
        "presentation": {"camera": "isometric", "lighting": "daylight", "material_style": "source"},
    }).json()
    api.post(f"/api/render-jobs/{created['id']}/start")

    # Mismatched dimensions (PNG is 1x1, claims 2x2)
    mismatched_metadata = json.dumps({"model_sha256": model["sha256"], "width": 2, "height": 2})
    rejected = api.post(
        f"/api/render-jobs/{created['id']}/complete",
        data={"metadata": mismatched_metadata},
        files={"image": ("render.png", PNG_BYTES, "image/png")},
    )
    assert rejected.status_code == 422

    # Check that orphan asset was cleaned up from the assets list
    assets_resp = api.get("/api/projects/test-project/assets")
    assert len(assets_resp.json()) == 2  # Only model and reference remain
