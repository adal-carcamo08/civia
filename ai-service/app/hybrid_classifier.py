from __future__ import annotations

import logging

from .online_provider import (
    OnlineAiUnavailable,
    classifier as online_classifier,
)
from .schemas import (
    CategoryCandidate,
    ClassificationResponse,
    ImageEvidence,
)


logger = logging.getLogger("civia.ai")


class CiviaClassifier:
    @property
    def online_enabled(self) -> bool:
        return online_classifier.enabled

    @property
    def model(self) -> str:
        return online_classifier.model

    def classify(
        self,
        description: str,
        categories: list[CategoryCandidate],
        images: list[ImageEvidence] | None = None,
    ) -> ClassificationResponse:
        if not online_classifier.enabled:
            raise OnlineAiUnavailable(
                "CIVIA IA no está disponible."
            )

        result = online_classifier.classify(
            description,
            categories,
            images or [],
        )

        logger.info(
            "Clasificación realizada con %s modo=%s imágenes=%s",
            result.model,
            result.classification_mode,
            len(images or []),
        )

        return result


classifier = CiviaClassifier()
