from __future__ import annotations

import re
import unicodedata

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics.pairwise import cosine_similarity

from .schemas import CategoryCandidate, ClassificationResponse


MODEL_NAME = "civia-tfidf-logreg-es-v1"


TRAINING_DATA = [
    # Agua
    ("Hay una fuga de agua en la calle", "agua"),
    ("Se rompió una tubería y está saliendo agua", "agua"),
    ("La cañería tiene una fuga grande", "agua"),
    ("Se desperdicia agua por una tubería rota", "agua"),

    # Alumbrado
    ("La lámpara del poste no enciende", "alumbrado"),
    ("La calle está oscura porque no hay alumbrado", "alumbrado"),
    ("Hay una luminaria pública dañada", "alumbrado"),
    ("Varias luces de la calle están apagadas", "alumbrado"),

    # Calles / baches
    ("Hay un bache grande en la calle", "vialidad"),
    ("La carretera tiene un hoyo peligroso", "vialidad"),
    ("El pavimento está destruido", "vialidad"),
    ("La calle necesita reparación del asfalto", "vialidad"),

    # Basura
    ("Hay basura acumulada en la acera", "basura"),
    ("No han recogido los desechos", "basura"),
    ("Existe un botadero clandestino", "basura"),
    ("Hay residuos acumulados en la calle", "basura"),

    # Drenajes
    ("La alcantarilla está tapada", "drenaje"),
    ("El drenaje se rebalsa cuando llueve", "drenaje"),
    ("Hay aguas negras saliendo del alcantarillado", "drenaje"),
    ("Un tragante está obstruido", "drenaje"),

    # Árboles
    ("Un árbol está a punto de caer", "arboles"),
    ("Hay ramas peligrosas sobre la calle", "arboles"),
    ("Se necesita podar un árbol", "arboles"),
    ("Un árbol caído bloquea el paso", "arboles"),

    # Infraestructura
    ("Una estructura pública está dañada", "infraestructura"),
    ("El muro tiene grietas peligrosas", "infraestructura"),
    ("Una grada pública está quebrada", "infraestructura"),
    ("Hay daños estructurales en el edificio", "infraestructura"),

    # Riesgo
    ("Hay cables eléctricos caídos", "riesgo"),
    ("Existe peligro inmediato para las personas", "riesgo"),
    ("Un poste está a punto de caer sobre alguien", "riesgo"),
    ("Existe riesgo de un accidente grave", "riesgo"),

    # Ruido
    ("Hay demasiado ruido durante la noche", "ruido"),
    ("La música está a volumen excesivo", "ruido"),
    ("Existe contaminación sonora", "ruido"),
    ("No podemos dormir por el ruido", "ruido"),

    # Otros
    ("No sé cómo clasificar este problema", "otro"),
    ("Es una incidencia diferente", "otro"),
    ("No encuentro una categoría adecuada", "otro"),
    ("Necesito reportar otro tipo de situación", "otro"),
]


INTENT_HINTS = {
    "agua": [
        "agua",
        "fuga",
        "tuberia",
        "caneria",
    ],
    "alumbrado": [
        "alumbrado",
        "luz",
        "lampara",
        "luminaria",
        "iluminacion",
    ],
    "vialidad": [
        "bache",
        "calle",
        "carretera",
        "asfalto",
        "pavimento",
        "vial",
        "hoyo",
    ],
    "basura": [
        "basura",
        "desecho",
        "residuo",
        "recoleccion",
        "botadero",
    ],
    "drenaje": [
        "drenaje",
        "alcantarilla",
        "alcantarillado",
        "tragante",
        "aguas negras",
    ],
    "arboles": [
        "arbol",
        "rama",
        "poda",
        "zona verde",
    ],
    "infraestructura": [
        "infraestructura",
        "estructura",
        "muro",
        "edificio",
        "grada",
    ],
    "riesgo": [
        "riesgo",
        "peligro",
        "emergencia",
        "accidente",
        "electrico",
    ],
    "ruido": [
        "ruido",
        "sonido",
        "musica",
        "volumen",
    ],
    "otro": [
        "otro",
        "general",
        "no estoy seguro",
    ],
}


HIGH_PRIORITY_TERMS = [
    "incendio",
    "explosion",
    "cable energizado",
    "cables electricos caidos",
    "riesgo inmediato",
    "peligro para la vida",
    "accidente grave",
    "a punto de caer",
]

MEDIUM_PRIORITY_TERMS = [
    "fuga",
    "tuberia rota",
    "tuberia quebrada",
    "caneria rota",
    "desperdiciando agua",
    "agua desperdiciada",
    "agua saliendo",
    "inundacion",
    "bache",
    "alcantarilla",
    "drenaje",
    "poste",
    "arbol",
]


def normalize(text: str) -> str:
    normalized = unicodedata.normalize(
        "NFKD",
        text.lower(),
    )

    normalized = "".join(
        character
        for character in normalized
        if not unicodedata.combining(character)
    )

    normalized = re.sub(
        r"[^a-z0-9\s]",
        " ",
        normalized,
    )

    return re.sub(
        r"\s+",
        " ",
        normalized,
    ).strip()


class CiviaClassifier:
    def __init__(self) -> None:
        training_texts = [
            normalize(text)
            for text, _ in TRAINING_DATA
        ]

        labels = [
            label
            for _, label in TRAINING_DATA
        ]

        self.vectorizer = TfidfVectorizer(
            ngram_range=(1, 2),
            sublinear_tf=True,
            strip_accents="unicode",
        )

        matrix = self.vectorizer.fit_transform(
            training_texts
        )

        self.model = LogisticRegression(
            max_iter=2000,
            class_weight="balanced",
            random_state=42,
        )

        self.model.fit(
            matrix,
            labels,
        )

    def predict_intent(
        self,
        description: str,
    ) -> tuple[str, float]:
        vector = self.vectorizer.transform(
            [normalize(description)]
        )

        probabilities = self.model.predict_proba(
            vector
        )[0]

        best_index = int(
            probabilities.argmax()
        )

        return (
            str(self.model.classes_[best_index]),
            float(probabilities[best_index]),
        )

    def category_score(
        self,
        description: str,
        intent: str,
        category: CategoryCandidate,
    ) -> float:
        category_text = " ".join(
            filter(
                None,
                [
                    category.name,
                    category.description,
                    category.department_name,
                ],
            )
        )

        normalized_category = normalize(
            category_text
        )

        texts = [
            normalize(description),
            normalized_category,
        ]

        try:
            matrix = TfidfVectorizer(
                ngram_range=(1, 2),
                strip_accents="unicode",
            ).fit_transform(texts)

            similarity = float(
                cosine_similarity(
                    matrix[0:1],
                    matrix[1:2],
                )[0][0]
            )
        except ValueError:
            similarity = 0.0

        hint_score = 0.0

        for hint in INTENT_HINTS.get(
            intent,
            [],
        ):
            if normalize(hint) in normalized_category:
                hint_score = max(
                    hint_score,
                    0.70,
                )

        if (
            intent == "otro"
            and (
                "otro" in normalized_category
                or "no estoy seguro"
                in normalized_category
            )
        ):
            hint_score = 0.90

        return min(
            1.0,
            similarity * 0.30
            + hint_score,
        )

    def choose_category(
        self,
        description: str,
        intent: str,
        categories: list[CategoryCandidate],
    ) -> tuple[CategoryCandidate, float]:
        scored = [
            (
                category,
                self.category_score(
                    description,
                    intent,
                    category,
                ),
            )
            for category in categories
        ]

        scored.sort(
            key=lambda item: item[1],
            reverse=True,
        )

        best_category, best_score = scored[0]

        if best_score < 0.15:
            fallback = next(
                (
                    category
                    for category in categories
                    if (
                        "otro"
                        in normalize(category.name)
                        or "no estoy seguro"
                        in normalize(category.name)
                    )
                ),
                None,
            )

            if fallback is not None:
                return fallback, 0.15

        return best_category, best_score

    def calculate_priority(
        self,
        description: str,
    ) -> str:
        text = normalize(description)

        if any(
            normalize(term) in text
            for term in HIGH_PRIORITY_TERMS
        ):
            return "HIGH"

        if any(
            normalize(term) in text
            for term in MEDIUM_PRIORITY_TERMS
        ):
            return "MEDIUM"

        return "LOW"

    def classify(
        self,
        description: str,
        categories: list[CategoryCandidate],
    ) -> ClassificationResponse:
        (
            intent,
            intent_confidence,
        ) = self.predict_intent(
            description
        )

        (
            suggested_category,
            category_confidence,
        ) = self.choose_category(
            description,
            intent,
            categories,
        )

        confidence = (
            intent_confidence * 0.55
            + category_confidence * 0.45
        )

        confidence = max(
            0.01,
            min(0.99, confidence),
        )

        return ClassificationResponse(
            intent=intent,
            suggested_category_id=(
                suggested_category.id
            ),
            suggested_category_name=(
                suggested_category.name
            ),
            suggested_department_id=(
                suggested_category.department_id
            ),
            suggested_department_name=(
                suggested_category.department_name
            ),
            priority=self.calculate_priority(
                description
            ),
            confidence=round(
                confidence,
                4,
            ),
            model=MODEL_NAME,
        )


classifier = CiviaClassifier()