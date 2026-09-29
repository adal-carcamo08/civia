import os
os.environ["CIVIA_FORCE_LOCAL_AI"] = "true"

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


CATEGORIES = [
    {
        "id": "cat-water",
        "name": "Fuga de agua",
        "description": "Problemas de tuberías y red de agua",
        "department_id": "dep-maintenance",
        "department_name": "Mantenimiento",
    },
    {
        "id": "cat-light",
        "name": "Alumbrado público",
        "description": "Problemas de iluminación y luminarias",
        "department_id": "dep-maintenance",
        "department_name": "Mantenimiento",
    },
    {
        "id": "cat-road",
        "name": "Baches y calles",
        "description": "Daños en calles, pavimento y carreteras",
        "department_id": "dep-infrastructure",
        "department_name": "Infraestructura",
    },
    {
        "id": "cat-other",
        "name": "Otro / No estoy seguro",
        "description": "Incidencias no clasificadas",
        "department_id": None,
        "department_name": None,
    },
]


def test_health():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.json()["service"] == "civia-ai"


def test_suggests_water_category():
    response = client.post(
        "/classify",
        json={
            "description": (
                "Hay una fuga grande de agua porque "
                "se rompió una tubería en la calle."
            ),
            "categories": CATEGORIES,
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["suggested_category_id"] == "cat-water"
    assert data["suggested_category_name"] == "Fuga de agua"
    assert data["suggested_department_id"] == "dep-maintenance"
    assert 0 < data["confidence"] <= 1


def test_suggests_public_lighting():
    response = client.post(
        "/classify",
        json={
            "description": (
                "La luminaria del poste no enciende "
                "y la calle queda completamente oscura."
            ),
            "categories": CATEGORIES,
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["suggested_category_id"] == "cat-light"


def test_detects_high_priority():
    response = client.post(
        "/classify",
        json={
            "description": (
                "Hay cables eléctricos caídos "
                "y energizados sobre la calle."
            ),
            "categories": CATEGORIES,
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["priority"] == "HIGH"


def test_rejects_short_description():
    response = client.post(
        "/classify",
        json={
            "description": "Fuga",
            "categories": CATEGORIES,
        },
    )

    assert response.status_code == 422

def test_broken_water_pipe_is_medium_priority():
    response = client.post(
        "/classify",
        json={
            "description": (
                "Hay una tubería rota frente a la escuela "
                "y se está desperdiciando mucha agua."
            ),
            "categories": CATEGORIES,
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["suggested_category_id"] == "cat-water"
    assert data["priority"] == "MEDIUM"

def test_v2_detects_sinkhole_even_without_matching_category():
    categories_without_road = [
        category
        for category in CATEGORIES
        if category["id"] != "cat-road"
    ]

    response = client.post(
        "/classify",
        json={
            "description": (
                "Hay un hueco en la calle y existe riesgo "
                "de caída y deslizamiento del suelo."
            ),
            "categories": categories_without_road,
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["problem_type"] == "road_sinkhole"
    assert (
        data["problem_label"]
        == "Hundimiento o deslizamiento de suelo"
    )
    assert data["domain"] == "Vialidad / Infraestructura"
    assert data["priority"] == "HIGH"

    # Si la organización realmente no posee
    # una categoría vial compatible, usa la genérica.
    assert (
        data["suggested_category_id"]
        == "cat-other"
    )

    assert (
        data["detection_confidence"]
        > data["category_match_confidence"]
    )


def test_v2_uses_broad_road_category_when_available():
    response = client.post(
        "/classify",
        json={
            "description": (
                "Hay un hueco en la calle y existe riesgo "
                "de caída y deslizamiento del suelo."
            ),
            "categories": CATEGORIES,
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["problem_type"] == "road_sinkhole"
    assert data["suggested_category_id"] == "cat-road"
    assert data["priority"] == "HIGH"

def test_v2_maps_sinkhole_to_real_road_category():
    categories = CATEGORIES + [
        {
            "id": "cat-sinkhole",
            "name": "Baches, hundimientos y calles",
            "description": (
                "Problemas de pavimento, huecos, "
                "hundimientos y daños en la vía."
            ),
            "department_id": "dep-infrastructure",
            "department_name": "Infraestructura",
        }
    ]

    response = client.post(
        "/classify",
        json={
            "description": (
                "Se formó un hundimiento profundo "
                "en medio de la calle."
            ),
            "categories": categories,
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["problem_type"] == "road_sinkhole"
    assert (
        data["suggested_category_id"]
        == "cat-sinkhole"
    )
    assert (
        data["suggested_department_name"]
        == "Infraestructura"
    )


def test_v2_preserves_water_classification():
    response = client.post(
        "/classify",
        json={
            "description": (
                "Hay una tubería rota y se está "
                "desperdiciando mucha agua."
            ),
            "categories": CATEGORIES,
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["problem_type"] == "water_leak"
    assert data["suggested_category_id"] == "cat-water"
    assert data["priority"] == "MEDIUM"
    assert data["classification_mode"] == "text"