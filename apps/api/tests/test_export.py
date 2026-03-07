from fastapi.testclient import TestClient
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
