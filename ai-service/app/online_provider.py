from __future__ import annotations

import json
import logging
import os
import re
import time
from pathlib import Path
from typing import Any

import httpx
from dotenv import load_dotenv

from .schemas import (
    CategoryCandidate,
    ClassificationResponse,
    ImageEvidence,
)


ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(ROOT_DIR / ".env")

logger = logging.getLogger("civia.ai.gemini")

DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite"

FREE_GEMINI_MODELS = [
    "gemini-3.5-flash-lite",
    "gemini-3.7-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash",
]

RETRYABLE_STATUS_CODES = {
    429,
    500,
    502,
    503,
    504,
}

MAX_ATTEMPTS_PER_MODEL = 2
RETRY_BASE_DELAY_SECONDS = 0.8
GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta"


class OnlineAiUnavailable(Exception):
    pass


def clamp_confidence(value: object) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return 0.0

    return max(0.0, min(1.0, number))


def extract_json(content: object) -> dict[str, Any]:
    if not isinstance(content, str):
        raise OnlineAiUnavailable(
            "La IA no devolvió contenido textual."
        )

    text = content.strip()

    if not text:
        raise OnlineAiUnavailable(
            "La IA devolvió una respuesta vacía."
        )

    if text.startswith("```"):
        lines = text.splitlines()

        if lines:
            lines = lines[1:]

        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]

        text = "\n".join(lines).strip()

        if text.lower().startswith("json"):
            text = text[4:].lstrip()

    start = text.find("{")
    end = text.rfind("}")

    if start == -1 or end == -1 or end <= start:
        raise OnlineAiUnavailable(
            "La IA no devolvió un objeto JSON."
        )

    try:
        parsed = json.loads(
            text[start : end + 1]
        )
    except json.JSONDecodeError as error:
        raise OnlineAiUnavailable(
            "La respuesta JSON de la IA no es válida."
        ) from error

    if not isinstance(parsed, dict):
        raise OnlineAiUnavailable(
            "La respuesta de la IA no es un objeto."
        )

    return parsed


def clean_base64_image(data: str) -> str:
    value = data.strip()

    if value.startswith("data:"):
        match = re.match(
            r"^data:[^;]+;base64,(.+)$",
            value,
            flags=re.DOTALL,
        )

        if not match:
            raise OnlineAiUnavailable(
                "Una de las imágenes no contiene Base64 válido."
            )

        value = match.group(1)

    value = re.sub(r"\s+", "", value)

    if not value:
        raise OnlineAiUnavailable(
            "Una de las imágenes está vacía."
        )

    return value


class GeminiClassifier:
    @property
    def enabled(self) -> bool:
        enabled = (
            os.getenv(
                "AI_ONLINE_ENABLED",
                "false",
            )
            .strip()
            .lower()
            == "true"
        )

        key = os.getenv(
            "GEMINI_API_KEY",
            "",
        ).strip()

        return enabled and bool(key)

    @property
    def model(self) -> str:
        return (
            os.getenv(
                "GEMINI_MODEL",
                DEFAULT_GEMINI_MODEL,
            )
            .strip()
            or DEFAULT_GEMINI_MODEL
        )

    @property
    def models(self) -> list[str]:
        configured = self.model

        candidates = [
            configured,
            *FREE_GEMINI_MODELS,
        ]

        unique: list[str] = []

        for model in candidates:
            if model and model not in unique:
                unique.append(model)

        return unique

    def _request_model(
        self,
        model: str,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        key = os.getenv(
            "GEMINI_API_KEY",
            "",
        ).strip()

        if not key:
            raise OnlineAiUnavailable(
                "No existe GEMINI_API_KEY."
            )

        url = (
            f"{GEMINI_BASE_URL}/models/"
            f"{model}:generateContent"
        )

        last_error: OnlineAiUnavailable | None = None

        for attempt in range(
            1,
            MAX_ATTEMPTS_PER_MODEL + 1,
        ):
            try:
                with httpx.Client(
                    timeout=45.0,
                ) as client:
                    response = client.post(
                        url,
                        headers={
                            "x-goog-api-key": key,
                            "Content-Type": "application/json",
                        },
                        json=payload,
                    )

            except httpx.TimeoutException as error:
                last_error = OnlineAiUnavailable(
                    "Gemini tardó demasiado en responder "
                    f"con {model}."
                )

                if attempt < MAX_ATTEMPTS_PER_MODEL:
                    delay = (
                        RETRY_BASE_DELAY_SECONDS
                        * (2 ** (attempt - 1))
                    )

                    logger.warning(
                        "Timeout con %s. "
                        "Reintento %s/%s en %.1fs.",
                        model,
                        attempt + 1,
                        MAX_ATTEMPTS_PER_MODEL,
                        delay,
                    )

                    time.sleep(delay)
                    continue

                raise last_error from error

            except httpx.HTTPError as error:
                last_error = OnlineAiUnavailable(
                    "No fue posible conectarse con Gemini "
                    f"usando {model}."
                )

                if attempt < MAX_ATTEMPTS_PER_MODEL:
                    delay = (
                        RETRY_BASE_DELAY_SECONDS
                        * (2 ** (attempt - 1))
                    )

                    logger.warning(
                        "Error de red con %s. "
                        "Reintento %s/%s en %.1fs.",
                        model,
                        attempt + 1,
                        MAX_ATTEMPTS_PER_MODEL,
                        delay,
                    )

                    time.sleep(delay)
                    continue

                raise last_error from error

            if not response.is_success:
                detail = response.text.strip()

                if len(detail) > 700:
                    detail = detail[:700]

                last_error = OnlineAiUnavailable(
                    f"Gemini respondió HTTP {response.status_code} "
                    f"con {model}. {detail}"
                )

                if (
                    response.status_code
                    in RETRYABLE_STATUS_CODES
                    and attempt < MAX_ATTEMPTS_PER_MODEL
                ):
                    delay = (
                        RETRY_BASE_DELAY_SECONDS
                        * (2 ** (attempt - 1))
                    )

                    logger.warning(
                        "Gemini %s temporalmente no disponible "
                        "(HTTP %s). Reintento %s/%s en %.1fs.",
                        model,
                        response.status_code,
                        attempt + 1,
                        MAX_ATTEMPTS_PER_MODEL,
                        delay,
                    )

                    time.sleep(delay)
                    continue

                raise last_error

            try:
                body = response.json()

            except ValueError as error:
                raise OnlineAiUnavailable(
                    "Gemini devolvió una respuesta no JSON "
                    f"con {model}."
                ) from error

            candidates = body.get("candidates")

            if (
                not isinstance(candidates, list)
                or not candidates
            ):
                prompt_feedback = body.get(
                    "promptFeedback"
                )

                raise OnlineAiUnavailable(
                    "Gemini no devolvió candidatos. "
                    f"Modelo: {model}. "
                    f"promptFeedback: {prompt_feedback}."
                )

            candidate = candidates[0]

            if not isinstance(candidate, dict):
                raise OnlineAiUnavailable(
                    "Gemini devolvió un candidato inválido "
                    f"con {model}."
                )

            finish_reason = str(
                candidate.get(
                    "finishReason",
                    "unknown",
                )
            )

            content = candidate.get("content")

            if not isinstance(content, dict):
                raise OnlineAiUnavailable(
                    "Gemini no devolvió contenido final. "
                    f"Modelo: {model}. "
                    f"finishReason: {finish_reason}."
                )

            parts = content.get("parts")

            if not isinstance(parts, list):
                raise OnlineAiUnavailable(
                    "Gemini no devolvió partes de contenido. "
                    f"Modelo: {model}. "
                    f"finishReason: {finish_reason}."
                )

            text_parts: list[str] = []

            for part in parts:
                if not isinstance(part, dict):
                    continue

                part_text = part.get("text")

                if (
                    isinstance(part_text, str)
                    and part_text.strip()
                ):
                    text_parts.append(part_text)

            final_text = "\n".join(
                text_parts
            ).strip()

            if not final_text:
                raise OnlineAiUnavailable(
                    "Gemini no devolvió texto final. "
                    f"Modelo: {model}. "
                    f"finishReason: {finish_reason}."
                )

            logger.info(
                "Respuesta válida de Gemini. "
                "Modelo=%s finishReason=%s intento=%s",
                model,
                finish_reason,
                attempt,
            )

            return extract_json(final_text)

        if last_error is not None:
            raise last_error

        raise OnlineAiUnavailable(
            f"Gemini no pudo responder con {model}."
        )

    def _request(
        self,
        payload: dict[str, Any],
    ) -> tuple[dict[str, Any], str]:
        errors: list[str] = []

        logger.info(
            "Ruta Gemini disponible: %s",
            " -> ".join(self.models),
        )

        for model in self.models:
            logger.info(
                "Consultando Gemini con modelo=%s",
                model,
            )

            try:
                return (
                    self._request_model(
                        model,
                        payload,
                    ),
                    model,
                )

            except OnlineAiUnavailable as error:
                errors.append(
                    str(error)
                )

                logger.warning(
                    "Falló Gemini con %s: %s",
                    model,
                    error,
                )

        raise OnlineAiUnavailable(
            "Ningún modelo gratuito de Gemini pudo "
            "completar el análisis en este momento. "
            + " | ".join(errors)
        )

    def classify(
        self,
        description: str,
        categories: list[CategoryCandidate],
        images: list[ImageEvidence] | None = None,
    ) -> ClassificationResponse:
        if not self.enabled:
            raise OnlineAiUnavailable(
                "Gemini no está configurado."
            )

        if not categories:
            raise OnlineAiUnavailable(
                "No existen categorías disponibles "
                "para realizar el análisis."
            )

        images = images or []

        if len(images) > 3:
            raise OnlineAiUnavailable(
                "CIVIA admite como máximo 3 imágenes "
                "por análisis."
            )

        category_payload = [
            {
                "id": category.id,
                "name": category.name,
                "description": (
                    category.description or ""
                ),
                "department_id": (
                    category.department_id
                ),
                "department_name": (
                    category.department_name
                ),
            }
            for category in categories
        ]

        category_ids = [
            category.id
            for category in categories
        ]

        categories_json = json.dumps(
            category_payload,
            ensure_ascii=False,
        )

        system_prompt = """
Eres CIVIA, el asistente de inteligencia artificial de una
plataforma de reportes ciudadanos y organizacionales.

Tu función es comprender el problema reportado por el usuario
y ayudar a clasificarlo correctamente.

Puedes recibir una descripción textual y también fotografías
adjuntas como evidencia del mismo reporte.

Analiza conjuntamente el texto y las fotografías disponibles.
Las fotografías son evidencia complementaria y no deben
ignorarse.

No inventes elementos que no sean razonablemente visibles o
deducibles de la evidencia proporcionada.

Si el texto y la imagen parecen contradecirse, reduce
detection_confidence y prioriza una descripción prudente del
problema en lugar de asumir información no demostrada.

No estás limitado a una lista predefinida de problemas.
Interpreta libremente la situación aunque nunca hayas visto un
reporte similar.

Primero identifica específicamente el problema real.
Después relaciónalo exclusivamente con las categorías reales
proporcionadas por la organización.

Nunca inventes IDs de categorías ni categorías que no aparezcan
en la lista proporcionada.

Si ninguna categoría representa razonablemente el problema y
existe una categoría llamada "Otro / No estoy seguro", utiliza
esa categoría.

Prioridad:
HIGH = peligro inmediato o riesgo considerable para personas o
bienes.
MEDIUM = requiere atención y afecta movilidad, funcionamiento,
seguridad o servicio, sin peligro grave inmediato.
LOW = problema menor, preventivo, estético o no urgente.

detection_confidence indica qué tan claramente se identifica el
problema usando toda la evidencia disponible.

category_match_confidence indica únicamente qué tan bien coincide
el problema con la categoría real seleccionada.

No aumentes artificialmente la confianza.
""".strip()

        evidence_text = (
            f"Se adjuntaron {len(images)} fotografía(s). "
            "Úsalas junto con la descripción."
            if images
            else
            "No se adjuntaron fotografías. "
            "Analiza únicamente la descripción."
        )

        user_prompt = f"""
DESCRIPCIÓN DEL REPORTE:

{description.strip()}

EVIDENCIA VISUAL:

{evidence_text}

CATEGORÍAS REALES DISPONIBLES:

{categories_json}

IDS DE CATEGORÍA PERMITIDOS:

{json.dumps(category_ids, ensure_ascii=False)}

Analiza qué ocurrió y selecciona únicamente una categoría real.
""".strip()

        response_schema = {
            "type": "object",
            "properties": {
                "problem_label": {
                    "type": "string",
                },
                "problem_type": {
                    "type": "string",
                },
                "domain": {
                    "type": "string",
                },
                "priority": {
                    "type": "string",
                    "enum": [
                        "LOW",
                        "MEDIUM",
                        "HIGH",
                    ],
                },
                "detection_confidence": {
                    "type": "number",
                    "minimum": 0,
                    "maximum": 1,
                },
                "suggested_category_id": {
                    "type": "string",
                    "enum": category_ids,
                },
                "category_match_confidence": {
                    "type": "number",
                    "minimum": 0,
                    "maximum": 1,
                },
            },
            "required": [
                "problem_label",
                "problem_type",
                "domain",
                "priority",
                "detection_confidence",
                "suggested_category_id",
                "category_match_confidence",
            ],
        }

        user_parts: list[dict[str, Any]] = [
            {
                "text": user_prompt,
            }
        ]

        for image in images:
            user_parts.append(
                {
                    "inlineData": {
                        "mimeType": (
                            image.mime_type
                        ),
                        "data": clean_base64_image(
                            image.data_base64
                        ),
                    }
                }
            )

        payload = {
            "system_instruction": {
                "parts": [
                    {
                        "text": system_prompt,
                    }
                ]
            },
            "contents": [
                {
                    "role": "user",
                    "parts": user_parts,
                }
            ],
            "generationConfig": {
                "temperature": 0,
                "maxOutputTokens": 1200,
                "responseFormat": {
                    "text": {
                        "mimeType": "APPLICATION_JSON",
                        "schema": response_schema,
                    }
                },
            },
        }

        logger.info(
            "Analizando reporte con Gemini. "
            "imágenes=%s modo=%s",
            len(images),
            (
                "texto+imagen"
                if images
                else "solo_texto"
            ),
        )

        data, model_used = self._request(
            payload
        )

        required = [
            "problem_label",
            "problem_type",
            "domain",
            "priority",
            "detection_confidence",
            "suggested_category_id",
            "category_match_confidence",
        ]

        missing_fields = [
            field
            for field in required
            if field not in data
        ]

        if missing_fields:
            raise OnlineAiUnavailable(
                "La respuesta de Gemini está incompleta. "
                "Faltan: "
                + ", ".join(missing_fields)
            )

        suggested_category_id = str(
            data[
                "suggested_category_id"
            ]
        )

        category = next(
            (
                candidate
                for candidate in categories
                if (
                    candidate.id
                    == suggested_category_id
                )
            ),
            None,
        )

        if category is None:
            generic = next(
                (
                    candidate
                    for candidate in categories
                    if (
                        "otro"
                        in candidate.name.lower()
                        or
                        "no estoy seguro"
                        in candidate.name.lower()
                    )
                ),
                None,
            )

            if generic is None:
                raise OnlineAiUnavailable(
                    "Gemini intentó utilizar "
                    "una categoría inexistente."
                )

            category = generic

            data[
                "category_match_confidence"
            ] = min(
                clamp_confidence(
                    data.get(
                        "category_match_confidence"
                    )
                ),
                0.15,
            )

        priority = str(
            data["priority"]
        ).upper()

        if priority not in {
            "LOW",
            "MEDIUM",
            "HIGH",
        }:
            priority = "MEDIUM"

        detection_confidence = (
            clamp_confidence(
                data[
                    "detection_confidence"
                ]
            )
        )

        category_match_confidence = (
            clamp_confidence(
                data[
                    "category_match_confidence"
                ]
            )
        )

        combined_confidence = (
            detection_confidence * 0.72
            + category_match_confidence * 0.28
        )

        problem_type = str(
            data["problem_type"]
        ).strip()

        problem_label = str(
            data["problem_label"]
        ).strip()

        domain = str(
            data["domain"]
        ).strip()

        if not problem_type:
            raise OnlineAiUnavailable(
                "Gemini no identificó "
                "el tipo de problema."
            )

        if not problem_label:
            raise OnlineAiUnavailable(
                "Gemini no identificó el problema."
            )

        if not domain:
            raise OnlineAiUnavailable(
                "Gemini no identificó el dominio."
            )

        return ClassificationResponse(
            intent=problem_type,
            domain=domain,
            problem_type=problem_type,
            problem_label=problem_label,
            suggested_category_id=(
                category.id
            ),
            suggested_category_name=(
                category.name
            ),
            suggested_department_id=(
                category.department_id
            ),
            suggested_department_name=(
                category.department_name
            ),
            priority=priority,
            detection_confidence=round(
                detection_confidence,
                4,
            ),
            category_match_confidence=round(
                category_match_confidence,
                4,
            ),
            confidence=round(
                combined_confidence,
                4,
            ),
            model=f"gemini:{model_used}",
            classification_mode=(
                "online_text_image"
                if images
                else "online_text"
            ),
        )


classifier = GeminiClassifier()
