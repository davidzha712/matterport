from fastapi.testclient import TestClient

from app.repository import get_space
from app.main import app

client = TestClient(app)


def test_export_all_csv():
    response = client.get("/api/v1/export/all/csv")
    assert response.status_code == 200
    assert response.headers["content-type"] == "text/csv; charset=utf-8"
    assert "attachment; filename=all_objects_export.csv" in response.headers["content-disposition"]
    
    content = response.text
    assert "Project,Space,ID,Title,Type,Room,Status,Disposition,AI Summary" in content
    assert "Orchard Estate Review" in content
    assert "Lantern House Digital Exhibition" in content


def test_export_space_csv():
    # orchard-main-house is a valid space ID from mock data
    response = client.get("/api/v1/export/spaces/orchard-main-house/csv")
    assert response.status_code == 200
    assert response.headers["content-type"] == "text/csv; charset=utf-8"
    assert "attachment; filename=space_orchard-main-house_objects.csv" in response.headers["content-disposition"]
    
    content = response.text
    assert "ID,Title,Type,Room,Status,Disposition,AI Summary" in content
    assert "walnut-cabinet" in content
    assert "mantel-clock" in content


def test_export_invalid_space_csv():
    response = client.get("/api/v1/export/spaces/non-existent/csv")
    assert response.status_code == 404


def test_export_space_csv_strict_blocks_pending_review():
    response = client.get("/api/v1/export/spaces/orchard-main-house/csv?strict=true")
    assert response.status_code == 409
    assert response.json() == {
        "detail": "Space export blocked until all objects leave Needs Review"
    }


def test_export_space_csv_strict_allows_ready_space():
    response = client.get("/api/v1/export/spaces/lantern-gallery/csv?strict=true")
    assert response.status_code == 200
    assert "lantern-gallery" in response.headers["content-disposition"]


def test_export_space_iiif_manifest_requires_publication_ready():
    blocked = client.get("/api/v1/export/spaces/orchard-main-house/iiif-manifest?strict=true")
    assert blocked.status_code == 409
    assert blocked.json() == {
        "detail": "Space export blocked until all objects leave Needs Review"
    }

    ready = client.get("/api/v1/export/spaces/lantern-gallery/iiif-manifest?strict=true")
    assert ready.status_code == 200
    payload = ready.json()
    assert payload["type"] == "Manifest"
    assert payload["items"][0]["type"] == "Canvas"
    assert payload["label"]["en"] == ["North Gallery"]


def test_export_escapes_formula_like_cells():
    space = get_space("orchard-main-house")
    assert space is not None
    original_title = space.objects[0].title
    space.objects[0].title = "=cmd|' /C calc'!A0"

    try:
        response = client.get("/api/v1/export/spaces/orchard-main-house/csv")
        assert response.status_code == 200
        assert "'=cmd|' /C calc'!A0" in response.text
    finally:
        space.objects[0].title = original_title
