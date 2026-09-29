from __future__ import annotations

import re
import unicodedata

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics.pairwise import cosine_similarity

from .schemas import CategoryCandidate, ClassificationResponse


MODEL_NAME = "civia-hybrid-tfidf-logreg-es-v2"


PROBLEMS = {
    "water_leak": {
        "domain": "Agua",
        "intent": "agua",
        "label": "Fuga o tubería dañada",
        "hints": [
            "fuga",
            "tuberia rota",
            "tuberia quebrada",
            "caneria rota",
            "agua saliendo",
            "desperdiciando agua",
            "derrame de agua",
        ],
        "category_hints": [
            "agua",
            "fuga",
            "tuberia",
            "caneria",
        ],
    },
    "road_sinkhole": {
        "domain": "Vialidad / Infraestructura",
        "intent": "vialidad",
        "label": "Hundimiento o deslizamiento de suelo",
        "hints": [
            "hundimiento",
            "deslizamiento",
            "socavon",
            "suelo cedio",
            "tierra cedio",
            "hueco profundo",
            "hueco en la calle",
            "terreno cedio",
        ],
        "category_hints": [
            "hundimiento",
            "deslizamiento",
            "socavon",
            "bache",
            "calle",
            "vialidad",
            "infraestructura",
            "suelo",
        ],
    },
    "pothole": {
        "domain": "Vialidad",
        "intent": "vialidad",
        "label": "Bache o daño en la calzada",
        "hints": [
            "bache",
            "hoyo",
            "pavimento roto",
            "asfalto roto",
            "calle danada",
            "carretera danada",
        ],
        "category_hints": [
            "bache",
            "calle",
            "carretera",
            "asfalto",
            "pavimento",
            "vialidad",
        ],
    },
    "public_lighting": {
        "domain": "Alumbrado público",
        "intent": "alumbrado",
        "label": "Falla de alumbrado público",
        "hints": [
            "luminaria",
            "lampara",
            "sin luz",
            "calle oscura",
            "alumbrado",
            "poste sin luz",
        ],
        "category_hints": [
            "alumbrado",
            "luminaria",
            "lampara",
            "iluminacion",
            "luz",
        ],
    },
    "blocked_drain": {
        "domain": "Drenaje / Saneamiento",
        "intent": "drenaje",
        "label": "Drenaje o alcantarillado obstruido",
        "hints": [
            "alcantarilla tapada",
            "tragante tapado",
            "drenaje tapado",
            "aguas negras",
            "alcantarillado",
            "drenaje",
        ],
        "category_hints": [
            "drenaje",
            "alcantarilla",
            "alcantarillado",
            "tragante",
            "aguas negras",
        ],
    },
    "trash_accumulation": {
        "domain": "Residuos",
        "intent": "basura",
        "label": "Acumulación de basura o residuos",
        "hints": [
            "basura",
            "desechos",
            "residuos",
            "botadero",
            "no recogen la basura",
        ],
        "category_hints": [
            "basura",
            "desechos",
            "residuos",
            "recoleccion",
            "botadero",
        ],
    },
    "tree_hazard": {
        "domain": "Vegetación / Riesgo",
        "intent": "arboles",
        "label": "Árbol o ramas en condición peligrosa",
        "hints": [
            "arbol caido",
            "arbol a punto de caer",
            "rama peligrosa",
            "ramas peligrosas",
            "podar arbol",
            "arbol seco",
        ],
        "category_hints": [
            "arbol",
            "rama",
            "poda",
            "vegetacion",
            "zona verde",
        ],
    },
    "structural_damage": {
        "domain": "Infraestructura",
        "intent": "infraestructura",
        "label": "Daño estructural",
        "hints": [
            "muro agrietado",
            "pared agrietada",
            "estructura danada",
            "techo danado",
            "grada rota",
            "edificio danado",
        ],
        "category_hints": [
            "infraestructura",
            "estructura",
            "muro",
            "pared",
            "edificio",
            "techo",
        ],
    },
    "electrical_hazard": {
        "domain": "Riesgo eléctrico",
        "intent": "riesgo",
        "label": "Riesgo eléctrico",
        "hints": [
            "cable electrico caido",
            "cables electricos caidos",
            "cable energizado",
            "cables expuestos",
            "poste electrico caido",
        ],
        "category_hints": [
            "electrico",
            "electricidad",
            "cable",
            "poste",
            "riesgo",
        ],
    },
    "noise_pollution": {
        "domain": "Convivencia / Ambiente",
        "intent": "ruido",
        "label": "Ruido excesivo o contaminación sonora",
        "hints": [
            "ruido",
            "musica alta",
            "volumen excesivo",
            "contaminacion sonora",
        ],
        "category_hints": [
            "ruido",
            "sonido",
            "musica",
            "contaminacion sonora",
        ],
    },
    "other": {
        "domain": "General",
        "intent": "otro",
        "label": "Incidencia no clasificada",
        "hints": [
            "otro problema",
            "no se como clasificar",
            "no estoy seguro",
        ],
        "category_hints": [
            "otro",
            "general",
            "no estoy seguro",
        ],
    },
}


TRAINING_DATA = [
    # Fuga de agua
    ("Hay una fuga de agua en la calle", "water_leak"),
    ("Se rompió una tubería y está saliendo agua", "water_leak"),
    ("La cañería está rota y desperdicia agua", "water_leak"),
    ("Hay agua saliendo de una tubería dañada", "water_leak"),

    # Hundimiento / deslizamiento
    ("Hay un hundimiento grande en la calle", "road_sinkhole"),
    ("El suelo cedió y se formó un hueco profundo", "road_sinkhole"),
    ("Existe riesgo de deslizamiento de tierra", "road_sinkhole"),
    ("Se abrió un socavón en la vía", "road_sinkhole"),
    ("El terreno se está deslizando junto a la calle", "road_sinkhole"),

    # Baches
    ("Hay un bache en la calle", "pothole"),
    ("El pavimento está roto y lleno de hoyos", "pothole"),
    ("La carretera tiene varios baches", "pothole"),
    ("El asfalto está dañado", "pothole"),

    # Alumbrado
    ("La luminaria de la calle no enciende", "public_lighting"),
    ("El poste está sin luz", "public_lighting"),
    ("La calle queda oscura en la noche", "public_lighting"),
    ("La lámpara pública está dañada", "public_lighting"),

    # Drenajes
    ("La alcantarilla está tapada", "blocked_drain"),
    ("El drenaje se rebalsa cuando llueve", "blocked_drain"),
    ("Hay aguas negras saliendo del alcantarillado", "blocked_drain"),
    ("El tragante está obstruido", "blocked_drain"),

    # Basura
    ("Hay basura acumulada en la calle", "trash_accumulation"),
    ("No han recogido los desechos", "trash_accumulation"),
    ("Existe un botadero clandestino", "trash_accumulation"),
    ("Hay residuos acumulados en la acera", "trash_accumulation"),

    # Árboles
    ("Un árbol está a punto de caer", "tree_hazard"),
    ("Hay ramas peligrosas sobre la calle", "tree_hazard"),
    ("Un árbol caído bloquea la vía", "tree_hazard"),
    ("Se necesita podar un árbol peligroso", "tree_hazard"),

    # Infraestructura
    ("El muro tiene grietas peligrosas", "structural_damage"),
    ("Una estructura pública está dañada", "structural_damage"),
    ("El techo del edificio está dañado", "structural_damage"),
    ("Una grada pública está rota", "structural_damage"),

    # Riesgo eléctrico
    ("Hay cables eléctricos caídos", "electrical_hazard"),
    ("Un cable energizado está expuesto", "electrical_hazard"),
    ("Hay cables eléctricos sobre la calle", "electrical_hazard"),
    ("Un poste eléctrico cayó", "electrical_hazard"),

    # Ruido
    ("Hay demasiado ruido durante la noche", "noise_pollution"),
    ("La música está a volumen excesivo", "noise_pollution"),
    ("Existe contaminación sonora", "noise_pollution"),
    ("No podemos dormir por el ruido", "noise_pollution"),

    # Otro
    ("No sé cómo clasificar esta situación", "other"),
    ("Es un problema diferente", "other"),
    ("No encuentro una categoría adecuada", "other"),
    ("Quiero informar otra incidencia", "other"),
]


HIGH_RISK_TERMS = [
    "riesgo de caida",
    "puede caer",
    "personas pueden caer",
    "deslizamiento",
    "derrumbe",
    "socavon",
    "cable energizado",
    "cables electricos caidos",
    "riesgo electrico",
    "riesgo inmediato",
    "peligro para la vida",
    "accidente grave",
    "a punto de caer",
]

MEDIUM_RISK_TERMS = [
    "fuga",
    "tuberia rota",
    "bache",
    "hoyo",
    "hundimiento",
    "inundacion",
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


class CiviaClassifierV2:
    def __init__(self) -> None:
        texts = [
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
            texts
        )

        self.model = LogisticRegression(
            max_iter=2500,
            class_weight="balanced",
            random_state=42,
        )

        self.model.fit(
            matrix,
            labels,
        )

    def _ml_prediction(
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

    def _rule_scores(
        self,
        description: str,
    ) -> dict[str, float]:
        text = normalize(description)

        scores: dict[str, float] = {}

        for problem_type, definition in PROBLEMS.items():
            score = 0.0

            for hint in definition["hints"]:
                normalized_hint = normalize(hint)

                if normalized_hint in text:
                    # Frases más específicas pesan más.
                    word_count = len(
                        normalized_hint.split()
                    )

                    score += (
                        1.6
                        if word_count >= 2
                        else 1.0
                    )

            scores[problem_type] = score

        return scores

    def detect_problem(
        self,
        description: str,
    ) -> tuple[str, float]:
        ml_type, ml_confidence = (
            self._ml_prediction(description)
        )

        rule_scores = self._rule_scores(
            description
        )

        rule_type = max(
            rule_scores,
            key=rule_scores.get,
        )

        rule_score = rule_scores[rule_type]

        if rule_score > 0:
            agreement_bonus = (
                0.08
                if rule_type == ml_type
                else 0.0
            )

            confidence = min(
                0.98,
                0.66
                + min(rule_score, 3.0) * 0.08
                + agreement_bonus,
            )

            return (
                rule_type,
                confidence,
            )

        return (
            ml_type,
            max(
                0.30,
                min(0.90, ml_confidence),
            ),
        )

    def calculate_priority(
        self,
        description: str,
        problem_type: str,
    ) -> str:
        text = normalize(description)

        if any(
            normalize(term) in text
            for term in HIGH_RISK_TERMS
        ):
            return "HIGH"

        if problem_type in {
            "electrical_hazard",
            "road_sinkhole",
        }:
            return "MEDIUM"

        if any(
            normalize(term) in text
            for term in MEDIUM_RISK_TERMS
        ):
            return "MEDIUM"

        return "LOW"

    def category_score(
        self,
        description: str,
        problem_type: str,
        category: CategoryCandidate,
    ) -> float:
        definition = PROBLEMS[problem_type]

        category_text = " ".join(
            value
            for value in [
                category.name,
                category.description or "",
                category.department_name or "",
            ]
            if value
        )

        normalized_category = normalize(
            category_text
        )

        normalized_description = normalize(
            description
        )

        try:
            matrix = TfidfVectorizer(
                ngram_range=(1, 2),
                strip_accents="unicode",
            ).fit_transform(
                [
                    normalized_description,
                    normalized_category,
                ]
            )

            similarity = float(
                cosine_similarity(
                    matrix[0:1],
                    matrix[1:2],
                )[0][0]
            )
        except ValueError:
            similarity = 0.0

        hint_bonus = 0.0

        for hint in definition[
            "category_hints"
        ]:
            if normalize(hint) in normalized_category:
                hint_bonus = max(
                    hint_bonus,
                    0.68,
                )

        if (
            problem_type == "other"
            and (
                "otro" in normalized_category
                or "no estoy seguro"
                in normalized_category
            )
        ):
            hint_bonus = 0.90

        return min(
            1.0,
            similarity * 0.32
            + hint_bonus,
        )

    def choose_category(
        self,
        description: str,
        problem_type: str,
        categories: list[CategoryCandidate],
    ) -> tuple[CategoryCandidate, float]:
        scored = [
            (
                category,
                self.category_score(
                    description,
                    problem_type,
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

        # Si ninguna categoría real encaja suficientemente,
        # usar la categoría genérica.
        if best_score < 0.20:
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
                return fallback, 0.12

        return (
            best_category,
            best_score,
        )

    def classify(
        self,
        description: str,
        categories: list[CategoryCandidate],
    ) -> ClassificationResponse:
        (
            problem_type,
            detection_confidence,
        ) = self.detect_problem(
            description
        )

        definition = PROBLEMS[
            problem_type
        ]

        (
            suggested_category,
            category_match_confidence,
        ) = self.choose_category(
            description,
            problem_type,
            categories,
        )

        priority = self.calculate_priority(
            description,
            problem_type,
        )

        combined_confidence = (
            detection_confidence * 0.72
            + category_match_confidence * 0.28
        )

        combined_confidence = max(
            0.01,
            min(
                0.99,
                combined_confidence,
            ),
        )

        return ClassificationResponse(
            intent=definition["intent"],
            domain=definition["domain"],
            problem_type=problem_type,
            problem_label=definition["label"],
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
            model=MODEL_NAME,
            classification_mode="text",
        )


classifier = CiviaClassifierV2()