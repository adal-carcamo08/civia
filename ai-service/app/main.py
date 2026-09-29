import logging

from fastapi import (
    FastAPI,
    HTTPException,
)

from .hybrid_classifier import classifier
from .online_provider import OnlineAiUnavailable
from .schemas import (
    ClassificationRequest,
    ClassificationResponse,
)


logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)s: %(name)s: %(message)s",
)

logger = logging.getLogger("civia.ai.api")


app = FastAPI(
    title="CIVIA AI Service",
    version="1.2.0",
    description=(
        "Microservicio multimodal de inteligencia artificial "
        "para clasificación de incidencias de CIVIA."
    ),
)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "civia-ai",
        "version": "1.2.0",
        "online_ai_enabled": classifier.online_enabled,
        "configured_model": classifier.model,
        "multimodal": True,
        "max_analysis_images": 3,
    }


@app.post(
    "/classify",
    response_model=ClassificationResponse,
)
def classify(
    payload: ClassificationRequest,
):
    try:
        result = classifier.classify(
            payload.description,
            payload.categories,
            payload.images,
        )

        logger.info(
            "Análisis completado. "
            "Modelo=%s modo=%s problema=%s categoría=%s imágenes=%s",
            result.model,
            result.classification_mode,
            result.problem_label,
            result.suggested_category_name,
            len(payload.images),
        )

        return result

    except OnlineAiUnavailable as error:
        logger.error(
            "CIVIA IA no pudo completar el análisis: %s",
            error,
        )

        raise HTTPException(
            status_code=503,
            detail=str(error),
        ) from error

    except Exception:
        logger.exception(
            "Error inesperado durante el análisis de CIVIA."
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Ocurrió un error inesperado "
                "durante el análisis."
            ),
        )
