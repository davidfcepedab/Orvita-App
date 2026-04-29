#!/usr/bin/env python3
"""Genera el plist del atajo iOS, listo para `plutil` + `shortcuts sign` (en macOS).

Compatibilidad: las acciones usan identificadores estándar de Shortcuts
(`is.workflow.actions.filter.health.quantity`, `statistics` + `detect.number`, etc.).
En iOS reciente, `filter.workouts` y `properties.workout` suelen aparecer como «Acción desconocida»;
el modo por defecto usa **Buscar muestras de salud** con tipo **Workouts** + detalle Duración (misma
cadena que el sueño). Opción `--legacy-workout-actions` restaura el flujo antiguo si tu dispositivo
lo soporta. Si al importar ves «Buscar muestras de Salud» con tipo (null)
o tarjetas «Acción desconocida» en el medio, suele ser **serialización** del .shortcut, no
permisos ni caché: prueba `--mode minimal` y/o `--omit-workout-duration-stat` (ver `--help`).

Modo `full`: token → fecha ISO → por cada métrica: Buscar muestras (tipo + hoy) → Calcular (Suma/Media) o Conteo.
`--variant historial-15d`: segundo plist «Orvita-Salud-Historial-15Dias» (mismo flujo; comentario en el atajo).
→ Obtener números → Establecer variable (`*_num`) → diccionario y POST JSON **plano** (sin `apple_bundle`).
Entrenos: conteo real y duración en segundos (suma de `Duration`) como variables distintas.
Sueño: **Sleep Analysis**, inicio = hoy, **Valor no es Awake ni In Bed**, suma de Duración (y el conteo usa el mismo filtro).
Variación manual por diccionario de fases (REM/Light/Deep/Core): ver `scripts/shortcuts/orvita-sleep-stages-orvita.txt`.
Derivadas `training_load` / `recovery_score_proxy`
las calcula el servidor si faltan en el cuerpo.

Modo `minimal`: token, fecha ISO, una sola búsqueda (pasos) + suma, diccionario mínimo, POST
— para validar en un iPhone real que el flujo básico no se rompe antes de añadir métricas.
El POST incluye cabecera `x-orvita-observed-at` (misma fecha que `apple_bundle.observed_at`) para
evitar fallos de Atajos cuando el JSON serializa `observed_at` como null (ver API `applyObservedAtFromRequestHeaders`).

**Token en el iPhone (por defecto):** el plist lee/escribe `Shortcuts/orvita_import_token.txt` en **iCloud Drive**
(sin selector de archivo). Si el archivo tiene texto (recuento de caracteres > 0), se usa como cabecera
`x-orvita-import-token`. Si no, se pide una vez con «Solicitar entrada», se guarda en esa ruta y se reutiliza en
siguientes ejecuciones. Con `--legacy-token-prompt` se omite archivo y solo se pregunta siempre (modo antiguo).

Claves numéricas extra siguen guardándose en `metadata.shortcut_bundle_extras` si no están en el contrato.
"""
from __future__ import annotations

import argparse
import plistlib
import sys
import uuid
from pathlib import Path

# (variable_atajo, clave_JSON, etiqueta_tipo_Shortcuts_en_inglés, operación_statistics)
QUANTITY_SUM_AVG: list[tuple[str, str, str, str]] = [
    ("steps_num", "steps", "Steps", "Sum"),
    ("active_energy_num", "active_energy_kcal", "Active Calories", "Sum"),
    ("exercise_minutes_num", "exercise_minutes", "Exercise Time", "Sum"),
    ("stand_minutes_num", "stand_minutes", "Stand Time", "Sum"),
    ("distance_meters_num", "distance_meters", "Walking + Running Distance", "Sum"),
    ("hrv_num", "hrv_ms", "Heart Rate Variability", "Average"),
    ("resting_hr_num", "resting_hr_bpm", "Resting Heart Rate", "Average"),
    ("walking_heart_rate_avg_num", "walking_heart_rate_avg", "Walking Heart Rate Average", "Average"),
    ("vo2max_num", "vo2max", "VO2 Max", "Average"),
    ("sleep_duration_num", "sleep_duration_seconds", "Sleep", "Sum"),
]

# (variable_atajo, clave_JSON, etiqueta_tipo) — conteo de muestras con acción Contar
QUANTITY_COUNT_ONLY: list[tuple[str, str, str]] = [
    ("sleep_sessions_count_num", "sleep_sessions_count", "Sleep"),
]


def uid() -> str:
    return str(uuid.uuid4()).upper()


def text_token_string(attachment_uuid: str, output_name: str = "Provided Input") -> dict:
    return {
        "Value": {
            "attachmentsByRange": {
                "{0, 1}": {
                    "Type": "ActionOutput",
                    "OutputUUID": attachment_uuid,
                    "OutputName": output_name,
                }
            },
            "string": "\ufffc",
        },
        "WFSerializationType": "WFTextTokenString",
    }


def wf_value_named_variable(variable_name: str) -> dict:
    """Valor de campo WFDictionaryFieldValue cuando es solo una variable nombrada.

    En importación iOS, WFTextTokenString + attachmentsByRange a veces se pierde y el valor queda «Texto» vacío.
    Apple documenta variables nombradas como WFTextTokenAttachment (`Type` + `VariableName`).
    """
    return {
        "Value": {
            "Type": "Variable",
            "VariableName": variable_name,
        },
        "WFSerializationType": "WFTextTokenAttachment",
    }


def content_filter_today() -> dict:
    return {
        "Value": {
            "WFActionParameterFilterPrefix": 1,
            "WFContentPredicateBoundedDate": False,
            "WFActionParameterFilterTemplates": [
                {
                    "Operator": 1002,
                    "Property": "Start Date",
                    "Removable": True,
                }
            ],
        },
        "WFSerializationType": "WFContentPredicateTableTemplate",
    }


def content_filter_health_quantity_today(type_value: str) -> dict:
    """Tipo explícito (evita null) + fecha de inicio = hoy (plantilla Start Date)."""
    return {
        "Value": {
            "WFActionParameterFilterPrefix": 1,
            "WFContentPredicateBoundedDate": False,
            "WFActionParameterFilterTemplates": [
                {
                    "Bounded": True,
                    "Operator": 4,
                    "Property": "Type",
                    "Removable": False,
                    "Values": {
                        "Enumeration": {
                            "Value": type_value,
                            "WFSerializationType": "WFStringSubstitutableState",
                        }
                    },
                },
                {
                    "Operator": 1002,
                    "Property": "Start Date",
                    "Removable": True,
                },
            ],
        },
        "WFSerializationType": "WFContentPredicateTableTemplate",
    }


def _filter_enum_row(
    *,
    property_name: str,
    operator: int,
    enumeration_value: str,
    bounded: bool | None = None,
    removable: bool = False,
) -> dict:
    row: dict = {
        "Operator": operator,
        "Property": property_name,
        "Removable": removable,
        "Values": {
            "Enumeration": {
                "Value": enumeration_value,
                "WFSerializationType": "WFStringSubstitutableState",
            }
        },
    }
    if bounded is not None:
        row["Bounded"] = bounded
    return row


def content_filter_sleep_analysis_asleep_phases_today() -> dict:
    """Sleep Analysis (HKCategory) + inicio hoy; excluye Awake e In Bed (solo tiempo dormido por fases).

    Etiquetas como en el selector en inglés de Atajos («Sleep Analysis», «Awake», «In Bed»).
    Si tu iPhone solo muestra nombres en español en la UI, el plist sigue usando las claves internas en inglés.
    """
    return {
        "Value": {
            "WFActionParameterFilterPrefix": 1,
            "WFContentPredicateBoundedDate": False,
            "WFActionParameterFilterTemplates": [
                _filter_enum_row(
                    property_name="Type",
                    operator=4,
                    enumeration_value="Sleep Analysis",
                    bounded=True,
                    removable=False,
                ),
                {
                    "Operator": 1002,
                    "Property": "Start Date",
                    "Removable": True,
                },
                # Operator 5 = «no es» (excluir tiempo despierto / en cama del total)
                _filter_enum_row(property_name="Value", operator=5, enumeration_value="Awake", removable=True),
                _filter_enum_row(property_name="Value", operator=5, enumeration_value="In Bed", removable=True),
            ],
        },
        "WFSerializationType": "WFContentPredicateTableTemplate",
    }


def find_health_quantity(
    *,
    u_find: str,
    type_value: str,
) -> dict:
    return {
        "WFWorkflowActionIdentifier": "is.workflow.actions.filter.health.quantity",
        "WFWorkflowActionParameters": {
            "UUID": u_find,
            "WFContentItemFilter": content_filter_health_quantity_today(type_value),
        },
    }


def find_sleep_samples(*, u_find: str) -> dict:
    """Busca muestras categoría Sleep Analysis (HealthKit) para el día; sin Awake ni In Bed.

    Suma de duraciones ≈ tiempo en fases dormidas (Core/Deep/REM/Unspecified); ver notas en
    `scripts/shortcuts/orvita-sleep-stages-orvita.txt`.
    """
    return {
        "WFWorkflowActionIdentifier": "is.workflow.actions.filter.health.quantity",
        "WFWorkflowActionParameters": {
            "UUID": u_find,
            "WFContentItemFilter": content_filter_sleep_analysis_asleep_phases_today(),
        },
    }


def find_workouts(*, u_find: str) -> dict:
    return {
        "WFWorkflowActionIdentifier": "is.workflow.actions.filter.workouts",
        "WFWorkflowActionParameters": {
            "UUID": u_find,
            "WFContentItemFilter": content_filter_today(),
        },
    }


def statistics_on(
    u_find: str,
    u_stat: str,
    operation: str,
    *,
    output_name: str = "Health Samples",
    aggregate_property: str | None = None,
    aggregate_property_serialization: str = "string",
) -> dict:
    params: dict = {
        "UUID": u_stat,
        "Input": {
            "Value": {
                "OutputUUID": u_find,
                "OutputName": output_name,
                "Type": "ActionOutput",
            },
            "WFSerializationType": "WFTextTokenAttachment",
        },
        "WFStatisticsOperation": operation,
    }
    if aggregate_property:
        if aggregate_property_serialization == "string":
            params["WFStatisticsSampleProperty"] = aggregate_property
        elif aggregate_property_serialization == "texttoken":
            params["WFStatisticsSampleProperty"] = {
                "Value": {"string": aggregate_property},
                "WFSerializationType": "WFTextTokenString",
            }
        else:
            raise ValueError(f"Unknown aggregate property serialization: {aggregate_property_serialization!r}")
    return {
        "WFWorkflowActionIdentifier": "is.workflow.actions.statistics",
        "WFWorkflowActionParameters": params,
    }


def get_health_sample_detail_duration(*, u: str, u_find: str) -> dict:
    """Obtener detalles de muestras de salud: Duración (entrada = muestras de la búsqueda previa)."""
    return {
        "WFWorkflowActionIdentifier": "is.workflow.actions.properties.health.quantity",
        "WFWorkflowActionParameters": {
            "UUID": u,
            "WFInput": {
                "Value": {
                    "OutputUUID": u_find,
                    "OutputName": "Health Samples",
                    "Type": "ActionOutput",
                },
                "WFSerializationType": "WFTextTokenAttachment",
            },
            "WFContentItemPropertyName": "Duration",
        },
    }


def get_workout_detail_duration(*, u: str, u_find_workouts: str) -> dict:
    """Obtener detalles de entrenos: Duración (entrada = entrenos encontrados)."""
    return {
        "WFWorkflowActionIdentifier": "is.workflow.actions.properties.workout",
        "WFWorkflowActionParameters": {
            "UUID": u,
            "WFInput": {
                "Value": {
                    "OutputUUID": u_find_workouts,
                    "OutputName": "Workouts",
                    "Type": "ActionOutput",
                },
                "WFSerializationType": "WFTextTokenAttachment",
            },
            "WFContentItemPropertyName": "Duration",
        },
    }


def detect_numbers_from_input(*, u: str) -> dict:
    """Coerción «Obtener números»; entrada = salida de la acción anterior (p. ej. Suma/Media)."""
    return {
        "WFWorkflowActionIdentifier": "is.workflow.actions.detect.number",
        "WFWorkflowActionParameters": {"UUID": u},
    }


def count_items(*, u_input: str, u_count: str, output_name: str = "Workouts") -> dict:
    return {
        "WFWorkflowActionIdentifier": "is.workflow.actions.count",
        "WFWorkflowActionParameters": {
            "UUID": u_count,
            "Input": {
                "Value": {
                    "OutputUUID": u_input,
                    "OutputName": output_name,
                    "Type": "ActionOutput",
                },
                "WFSerializationType": "WFTextTokenAttachment",
            },
        },
    }


def static_number(*, u: str, n: float) -> dict:
    return {
        "WFWorkflowActionIdentifier": "is.workflow.actions.number",
        "WFWorkflowActionParameters": {
            "UUID": u,
            "WFNumberActionNumber": float(n),
        },
    }


def ask_text(*, u: str, prompt: str) -> dict:
    return {
        "WFWorkflowActionIdentifier": "is.workflow.actions.ask",
        "WFWorkflowActionParameters": {
            "UUID": u,
            "WFAskActionPrompt": prompt,
            "WFInputType": "Text",
        },
    }


# Ruta en iCloud Drive (sin «Mostrar selector»), misma carpeta que documenta la app (`Shortcuts/…`).
ORVITA_TOKEN_ICLOUD_PATH = "Shortcuts/orvita_import_token.txt"


def action_output_ref(output_uuid: str, output_name: str) -> dict:
    return {
        "Value": {
            "OutputUUID": output_uuid,
            "OutputName": output_name,
            "Type": "ActionOutput",
        },
        "WFSerializationType": "WFTextTokenAttachment",
    }


def get_file_from_icloud_path(*, u: str, path: str, error_if_not_found: bool) -> dict:
    return {
        "WFWorkflowActionIdentifier": "is.workflow.actions.documentpicker.open",
        "WFWorkflowActionParameters": {
            "UUID": u,
            "WFFileStorageService": "iCloud Drive",
            "WFShowFilePicker": False,
            "SelectMultiple": False,
            "WFGetFilePath": path,
            "WFFileErrorIfNotFound": error_if_not_found,
        },
    }


def detect_text_from_input(*, u: str) -> dict:
    return {
        "WFWorkflowActionIdentifier": "is.workflow.actions.detect.text",
        "WFWorkflowActionParameters": {"UUID": u},
    }


def count_characters(*, u: str) -> dict:
    return {
        "WFWorkflowActionIdentifier": "is.workflow.actions.count",
        "WFWorkflowActionParameters": {
            "UUID": u,
            "WFCountType": "Characters",
        },
    }


def conditional_if_count_gt_zero(*, u: str, grouping: str, u_count: str) -> dict:
    return {
        "WFWorkflowActionIdentifier": "is.workflow.actions.conditional",
        "WFWorkflowActionParameters": {
            "UUID": u,
            "GroupingIdentifier": grouping,
            "WFControlFlowMode": 0,
            "WFCondition": "Is Greater Than",
            "WFNumberValue": 0,
            "WFInput": action_output_ref(u_count, "Count"),
        },
    }


def conditional_otherwise(*, u: str, grouping: str) -> dict:
    return {
        "WFWorkflowActionIdentifier": "is.workflow.actions.conditional",
        "WFWorkflowActionParameters": {
            "UUID": u,
            "GroupingIdentifier": grouping,
            "WFControlFlowMode": 1,
        },
    }


def conditional_end_if(*, u: str, grouping: str) -> dict:
    return {
        "WFWorkflowActionIdentifier": "is.workflow.actions.conditional",
        "WFWorkflowActionParameters": {
            "UUID": u,
            "GroupingIdentifier": grouping,
            "WFControlFlowMode": 2,
        },
    }


def set_variable_from_output(*, u: str, variable_name: str, source_uuid: str, source_output_name: str) -> dict:
    return {
        "WFWorkflowActionIdentifier": "is.workflow.actions.setvariable",
        "WFWorkflowActionParameters": {
            "UUID": u,
            "WFVariableName": variable_name,
            "WFInput": action_output_ref(source_uuid, source_output_name),
        },
    }


def save_file_to_icloud_path(*, u: str, path: str) -> dict:
    """Guarda la entrada (texto del paso anterior, p. ej. Solicitar entrada) en iCloud Drive."""
    return {
        "WFWorkflowActionIdentifier": "is.workflow.actions.documentpicker.save",
        "WFWorkflowActionParameters": {
            "UUID": u,
            "WFFileStorageService": "iCloud Drive",
            "WFAskWhereToSave": False,
            "WFFileDestinationPath": path,
            "WFSaveFileOverwrite": True,
        },
    }


def get_named_variable(*, u: str, variable_name: str, custom_output_name: str) -> dict:
    return {
        "WFWorkflowActionIdentifier": "is.workflow.actions.getvariable",
        "WFWorkflowActionParameters": {
            "UUID": u,
            "CustomOutputName": custom_output_name,
            "WFVariable": {
                "Value": {"Type": "Variable", "VariableName": variable_name},
                "WFSerializationType": "WFTextTokenAttachment",
            },
        },
    }


def build_token_storage_prelude(*, ask_prompt: str) -> tuple[list[dict], str]:
    """Devuelve (acciones, uuid_get_var) — el POST usa la variable `import_token` (get final)."""
    u_file = uid()
    u_text = uid()
    u_count = uid()
    u_if = uid()
    u_other = uid()
    u_end = uid()
    group = uid()
    u_set_ok = uid()
    u_ask = uid()
    u_save = uid()
    u_set_ask = uid()
    u_get = uid()

    actions: list[dict] = [
        get_file_from_icloud_path(u=u_file, path=ORVITA_TOKEN_ICLOUD_PATH, error_if_not_found=False),
        detect_text_from_input(u=u_text),
        count_characters(u=u_count),
        conditional_if_count_gt_zero(u=u_if, grouping=group, u_count=u_count),
        set_variable_from_output(
            u=u_set_ok,
            variable_name="import_token",
            source_uuid=u_text,
            source_output_name="Text",
        ),
        conditional_otherwise(u=u_other, grouping=group),
        ask_text(
            u=u_ask,
            prompt=ask_prompt,
        ),
        save_file_to_icloud_path(u=u_save, path=ORVITA_TOKEN_ICLOUD_PATH),
        set_variable_from_output(
            u=u_set_ask,
            variable_name="import_token",
            source_uuid=u_ask,
            source_output_name="Provided Input",
        ),
        conditional_end_if(u=u_end, grouping=group),
        get_named_variable(u=u_get, variable_name="import_token", custom_output_name="Provided Input"),
    ]
    return actions, u_get


def current_date(*, u: str) -> dict:
    return {
        "WFWorkflowActionIdentifier": "is.workflow.actions.date",
        "WFWorkflowActionParameters": {
            "UUID": u,
            "WFDateActionMode": "Current Date",
        },
    }


def format_observed_at_ymd(*, u: str, u_date: str) -> dict:
    """Salida estricta yyyy-MM-dd (día civil del dispositivo): API, cabecera y bundle alineados."""
    return {
        "WFWorkflowActionIdentifier": "is.workflow.actions.format.date",
        "WFWorkflowActionParameters": {
            "UUID": u,
            "WFDateFormatStyle": "Custom",
            "WFDateFormat": "yyyy-MM-dd",
            "WFTimeFormatStyle": "None",
            "WFInput": {
                "Value": {
                    "OutputUUID": u_date,
                    "OutputName": "Date",
                    "Type": "ActionOutput",
                },
                "WFSerializationType": "WFTextTokenAttachment",
            },
        },
    }


def build_flat_payload_items() -> list[dict]:
    """Mismo orden de claves para Diccionario y cuerpo JSON del POST (referencias a variables).

    WFItemType en WFDictionaryFieldValueItems (JSON / Diccionario):
    - 0 = texto plano (WFTextTokenString) o variable nombrada (WFTextTokenAttachment en WFValue).
    - 1 = subdiccionario (en iOS aparece como «0 elementos» si no hay hijos) — no usar para *_num.

    Variables: usar `WFTextTokenAttachment` en el valor, no string+attachments, para que iOS importe el atajo con pastillas.
    """
    items: list[dict] = [
        {
            "WFItemType": 0,
            "WFKey": text_plain("observed_at"),
            "WFValue": wf_value_named_variable("observed_at"),
        },
    ]
    for _var, payload_key in [
        ("steps_num", "steps"),
        ("active_energy_num", "active_energy_kcal"),
        ("workouts_count_num", "workouts_count"),
        ("workouts_duration_seconds_num", "workouts_duration_seconds"),
        ("sleep_duration_num", "sleep_duration_seconds"),
        ("resting_hr_num", "resting_hr_bpm"),
        ("hrv_num", "hrv_ms"),
        ("exercise_minutes_num", "exercise_minutes"),
        ("stand_minutes_num", "stand_minutes"),
        ("distance_meters_num", "distance_meters"),
        ("vo2max_num", "vo2max"),
        ("walking_heart_rate_avg_num", "walking_heart_rate_avg"),
        ("sleep_sessions_count_num", "sleep_sessions_count"),
    ]:
        items.append(
            {
                "WFItemType": 0,
                "WFKey": text_plain(payload_key),
                "WFValue": wf_value_named_variable(_var),
            }
        )
    return items


def build_post_json_apple_bundle_items() -> list[dict]:
    """Cuerpo POST: una sola clave `apple_bundle` = diccionario (mismo contrato que el atajo que ya funcionó en iOS)."""
    return [
        {
            "WFItemType": 0,
            "WFKey": text_plain("apple_bundle"),
            "WFValue": wf_value_named_variable("apple_bundle"),
        }
    ]


def dictionary_from_items(*, u_dict: str, items: list[dict]) -> dict:
    return {
        "WFWorkflowActionIdentifier": "is.workflow.actions.dictionary",
        "WFWorkflowActionParameters": {
            "UUID": u_dict,
            "WFItems": {
                "Value": {"WFDictionaryFieldValueItems": items},
                "WFSerializationType": "WFDictionaryFieldValue",
            },
        },
    }


def text_plain(s: str) -> dict:
    return {"Value": {"string": s}, "WFSerializationType": "WFTextTokenString"}


def post_import(*, u_post: str, json_items: list[dict]) -> dict:
    """POST JSON: por defecto `{ apple_bundle: <variable apple_bundle> }` (API `extractHealthBundleFromBody`)."""
    return {
        "WFWorkflowActionIdentifier": "is.workflow.actions.downloadurl",
        "WFWorkflowActionParameters": {
            "UUID": u_post,
            "WFURL": {
                "Value": {"string": "https://orvita.app/api/integrations/health/apple/import"},
                "WFSerializationType": "WFTextTokenString",
            },
            "WFHTTPMethod": "POST",
            "WFHTTPBodyType": "JSON",
            "WFHTTPHeaders": {
                "Value": {
                    "WFDictionaryFieldValueItems": [
                        {
                            "WFItemType": 0,
                            "WFKey": text_plain("Content-Type"),
                            "WFValue": text_plain("application/json"),
                        },
                        {
                            "WFItemType": 0,
                            "WFKey": text_plain("x-orvita-import-token"),
                            "WFValue": wf_value_named_variable("import_token"),
                        },
                        {
                            "WFItemType": 0,
                            "WFKey": text_plain("x-orvita-observed-at"),
                            "WFValue": wf_value_named_variable("observed_at"),
                        },
                        {
                            "WFItemType": 0,
                            "WFKey": text_plain("x-orvita-client"),
                            "WFValue": text_plain("orvita-ios-shortcut"),
                        },
                        {
                            "WFItemType": 0,
                            "WFKey": text_plain("x-orvita-health-source"),
                            "WFValue": text_plain("apple_health_shortcut"),
                        },
                    ]
                },
                "WFSerializationType": "WFDictionaryFieldValue",
            },
            "WFJSONValues": {
                "Value": {"WFDictionaryFieldValueItems": json_items},
                "WFSerializationType": "WFDictionaryFieldValue",
            },
        },
    }


def success_notification(*, u: str) -> dict:
    """Notificación al usuario tras POST 2xx (errores HTTP detienen el atajo antes)."""
    return {
        "WFWorkflowActionIdentifier": "is.workflow.actions.notification",
        "WFWorkflowActionParameters": {
            "UUID": u,
            "WFNotificationActionBody": {
                "Value": {"string": "Datos de Apple Health importados a Órvita ✓"},
                "WFSerializationType": "WFTextTokenString",
            },
            "WFNotificationActionTitle": {
                "Value": {"string": "Órvita"},
                "WFSerializationType": "WFTextTokenString",
            },
        },
    }


def comment(text: str) -> dict:
    u = uid()
    return {
        "WFWorkflowActionIdentifier": "is.workflow.actions.comment",
        "WFWorkflowActionParameters": {"UUID": u, "WFCommentActionText": text},
    }


def build_root(actions: list[dict], *, workflow_name: str = "Orvita-Importar-Salud-Hoy") -> dict:
    return {
        "WFWorkflowActions": actions,
        "WFWorkflowClientVersion": "2700.0.4",
        "WFWorkflowClientRelease": "23A344",
        "WFWorkflowHasOutputFallback": False,
        "WFWorkflowIcon": {
            "WFWorkflowIconGlyphNumber": 59448,
            "WFWorkflowIconStartColor": 4292093695,
        },
        "WFWorkflowImportQuestions": [],
        "WFWorkflowInputContentItemClasses": [],
        "WFWorkflowMinimumClientVersion": 1113,
        "WFWorkflowMinimumClientVersionString": "1113",
        "WFWorkflowName": workflow_name,
        "WFWorkflowOutputContentItemClasses": [],
        "WFWorkflowTypes": [],
    }


def append_quantity_sum_avg_chain(
    actions: list[dict],
    *,
    variable_name: str,
    type_label: str,
    operation: str,
    use_duration_detail: bool = False,
) -> None:
    u_find = uid()
    u_detail = uid()
    u_stat = uid()
    u_detect = uid()
    u_set = uid()
    if use_duration_detail and variable_name == "sleep_duration_num":
        actions.append(find_sleep_samples(u_find=u_find))
    else:
        actions.append(find_health_quantity(u_find=u_find, type_value=type_label))
    if use_duration_detail:
        actions.append(get_health_sample_detail_duration(u=u_detail, u_find=u_find))
        actions.append(statistics_on(u_detail, u_stat, operation, output_name="Duración"))
    else:
        actions.append(statistics_on(u_find, u_stat, operation))
    actions.append(detect_numbers_from_input(u=u_detect))
    actions.append(
        set_variable_from_output(
            u=u_set,
            variable_name=variable_name,
            source_uuid=u_detect,
            source_output_name="Numbers",
        )
    )


def append_quantity_count_chain(
    actions: list[dict],
    *,
    variable_name: str,
    type_label: str,
) -> None:
    u_find = uid()
    u_cnt = uid()
    u_set = uid()
    if variable_name == "sleep_sessions_count_num":
        actions.append(find_sleep_samples(u_find=u_find))
    else:
        actions.append(find_health_quantity(u_find=u_find, type_value=type_label))
    actions.append(count_items(u_input=u_find, u_count=u_cnt, output_name="Health Samples"))
    actions.append(
        set_variable_from_output(
            u=u_set,
            variable_name=variable_name,
            source_uuid=u_cnt,
            source_output_name="Count",
        )
    )


def build_actions_full(
    *,
    quantity_type_style: str,
    omit_workout_duration_stat: bool,
    duration_placeholders: str,
    workout_stat_prop_ser: str,
    legacy_token_prompt: bool,
    legacy_workout_actions: bool,
) -> list[dict]:
    _ = quantity_type_style  # reservado por compatibilidad CLI; el plist ya no usa HKQuantityType.
    _ = workout_stat_prop_ser  # reservado (ruta legacy de serialización en estadística de entrenos).

    u_date = uid()
    u_iso = uid()
    u_set_obs = uid()

    u_find_workouts = uid()
    u_count_workouts = uid()
    u_stat_workout_dur = uid()
    u_detect_workout_dur = uid()
    u_zero_dur = uid()
    u_set_wd = uid()

    u_dict = uid()
    u_set_bundle = uid()
    u_post = uid()
    u_show = uid()

    if legacy_token_prompt:
        u_token = uid()
        u_set_import_token = uid()
        token_actions: list[dict] = [
            ask_text(
                u=u_token,
                prompt="Pega el token de importación que generaste en Órvita (Configuración).",
            ),
            set_variable_from_output(
                u=u_set_import_token,
                variable_name="import_token",
                source_uuid=u_token,
                source_output_name="Provided Input",
            ),
        ]
    else:
        token_actions, _ = build_token_storage_prelude(
            ask_prompt="Pega tu token de Órvita",
        )

    actions: list[dict] = [
        comment(
            "Órvita · Si al abrir el atajo ves datos en gris y vacíos, suele ser una copia duplicada en Atajos (nombre con «2» o «3»). "
            "Bórrala y vuelve a instalar desde Órvita en Safari. "
            "Entrenos: si hoy no entrenaste, ver cero sesiones es normal. "
            "La clave del iPhone se guarda sola en iCloud (carpeta Atajos del teléfono); la fecha del día se arma en el propio atajo."
        ),
        *token_actions,
        current_date(u=u_date),
        format_observed_at_ymd(u=u_iso, u_date=u_date),
        set_variable_from_output(
            u=u_set_obs,
            variable_name="observed_at",
            source_uuid=u_iso,
            source_output_name="Formatted Date",
        ),
    ]

    for var_name, _json_key, type_label, op in QUANTITY_SUM_AVG:
        append_quantity_sum_avg_chain(
            actions,
            variable_name=var_name,
            type_label=type_label,
            operation=op,
            use_duration_detail=(var_name == "sleep_duration_num"),
        )

    for var_name, _json_key, type_label in QUANTITY_COUNT_ONLY:
        append_quantity_count_chain(actions, variable_name=var_name, type_label=type_label)

    u_set_wc = uid()
    if legacy_workout_actions:
        actions.append(find_workouts(u_find=u_find_workouts))
        actions.append(count_items(u_input=u_find_workouts, u_count=u_count_workouts, output_name="Workouts"))
    else:
        # iOS 18+: filter.workouts / properties.workout → «Acción desconocida». Misma acción que pasos/HRV.
        actions.append(find_health_quantity(u_find=u_find_workouts, type_value="Workouts"))
        actions.append(count_items(u_input=u_find_workouts, u_count=u_count_workouts, output_name="Health Samples"))
    actions.append(
        set_variable_from_output(
            u=u_set_wc,
            variable_name="workouts_count_num",
            source_uuid=u_count_workouts,
            source_output_name="Count",
        )
    )

    if omit_workout_duration_stat:
        actions.append(static_number(u=u_zero_dur, n=0.0))
        actions.append(
            set_variable_from_output(
                u=u_set_wd,
                variable_name="workouts_duration_seconds_num",
                source_uuid=u_zero_dur,
                source_output_name="Number",
            )
        )
    else:
        u_workout_detail_dur = uid()
        if legacy_workout_actions:
            actions.append(
                get_workout_detail_duration(u=u_workout_detail_dur, u_find_workouts=u_find_workouts)
            )
            actions.append(
                statistics_on(
                    u_workout_detail_dur,
                    u_stat_workout_dur,
                    "Sum",
                    output_name="Workout Detail",
                )
            )
        else:
            actions.append(get_health_sample_detail_duration(u=u_workout_detail_dur, u_find=u_find_workouts))
            actions.append(
                statistics_on(
                    u_workout_detail_dur,
                    u_stat_workout_dur,
                    "Sum",
                    output_name="Duración",
                )
            )
        actions.append(detect_numbers_from_input(u=u_detect_workout_dur))
        actions.append(
            set_variable_from_output(
                u=u_set_wd,
                variable_name="workouts_duration_seconds_num",
                source_uuid=u_detect_workout_dur,
                source_output_name="Numbers",
            )
        )

    json_items = build_flat_payload_items()
    actions.append(dictionary_from_items(u_dict=u_dict, items=json_items))
    actions.append(
        set_variable_from_output(
            u=u_set_bundle,
            variable_name="apple_bundle",
            source_uuid=u_dict,
            source_output_name="Dictionary",
        )
    )
    actions.append(post_import(u_post=u_post, json_items=build_post_json_apple_bundle_items()))
    actions.append(success_notification(u=u_show))
    return actions


HISTORIAL_15D_INTRO = (
    "Orvita · Salud Historial-15Dias: instálalo y ejecútalo una vez como primer paso (junto a la guía en la web); "
    "luego usa «Importar Salud Hoy» y automatízalo dos veces al día. "
    "Backfill de 15 fechas con filtros por día en el generador: en roadmap."
)


def build_actions_historial_15d_full(
    *,
    quantity_type_style: str,
    omit_workout_duration_stat: bool,
    duration_placeholders: str,
    workout_stat_prop_ser: str,
    legacy_token_prompt: bool,
    legacy_workout_actions: bool,
) -> list[dict]:
    return [
        comment(HISTORIAL_15D_INTRO),
        *build_actions_full(
            quantity_type_style=quantity_type_style,
            omit_workout_duration_stat=omit_workout_duration_stat,
            duration_placeholders=duration_placeholders,
            workout_stat_prop_ser=workout_stat_prop_ser,
            legacy_token_prompt=legacy_token_prompt,
            legacy_workout_actions=legacy_workout_actions,
        ),
    ]


def build_actions_minimal(*, quantity_type_style: str, legacy_token_prompt: bool) -> list[dict]:
    _ = quantity_type_style
    u_date = uid()
    u_iso = uid()
    u_set_obs = uid()
    u_find_steps = uid()
    u_stat_steps = uid()
    u_detect_steps = uid()
    u_set_steps = uid()
    u_zero = uid()
    u_dict = uid()
    u_set_bundle = uid()
    u_post = uid()
    u_show = uid()

    if legacy_token_prompt:
        u_token = uid()
        u_set_import_token = uid()
        token_actions = [
            ask_text(
                u=u_token,
                prompt="Pega el token de importación que generaste en Órvita (Configuración).",
            ),
            set_variable_from_output(
                u=u_set_import_token,
                variable_name="import_token",
                source_uuid=u_token,
                source_output_name="Provided Input",
            ),
        ]
    else:
        token_actions, _ = build_token_storage_prelude(
            ask_prompt="Pega tu token de Órvita",
        )

    json_items = build_flat_payload_items()
    zero_fill = [
        "active_energy_num",
        "exercise_minutes_num",
        "stand_minutes_num",
        "distance_meters_num",
        "hrv_num",
        "resting_hr_num",
        "walking_heart_rate_avg_num",
        "vo2max_num",
        "sleep_duration_num",
        "sleep_sessions_count_num",
        "workouts_count_num",
        "workouts_duration_seconds_num",
    ]
    actions: list[dict] = [
        comment("Diagnóstico: solo pasos reales; el resto de claves a 0 (atajo mínimo)."),
        *token_actions,
        current_date(u=u_date),
        format_observed_at_ymd(u=u_iso, u_date=u_date),
        set_variable_from_output(
            u=u_set_obs,
            variable_name="observed_at",
            source_uuid=u_iso,
            source_output_name="Formatted Date",
        ),
        find_health_quantity(u_find=u_find_steps, type_value="Steps"),
        statistics_on(u_find_steps, u_stat_steps, "Sum"),
        detect_numbers_from_input(u=u_detect_steps),
        set_variable_from_output(
            u=u_set_steps,
            variable_name="steps_num",
            source_uuid=u_detect_steps,
            source_output_name="Numbers",
        ),
        static_number(u=u_zero, n=0.0),
    ]
    for zname in zero_fill:
        actions.append(
            set_variable_from_output(
                u=uid(),
                variable_name=zname,
                source_uuid=u_zero,
                source_output_name="Number",
            )
        )
    actions.append(dictionary_from_items(u_dict=u_dict, items=json_items))
    actions.append(
        set_variable_from_output(
            u=u_set_bundle,
            variable_name="apple_bundle",
            source_uuid=u_dict,
            source_output_name="Dictionary",
        )
    )
    actions.extend(
        [
            post_import(u_post=u_post, json_items=build_post_json_apple_bundle_items()),
            success_notification(u=u_show),
        ]
    )
    return actions


def main() -> int:
    here = Path(__file__).resolve().parent
    default_out_hoy = here / "shortcuts" / "orvita-importar-salud-hoy.shortcut.src.plist"
    default_out_historial = here / "shortcuts" / "orvita-salud-historial-15dias.src.plist"
    p = argparse.ArgumentParser(description="Genera plist XML del atajo Salud (Órvita).")
    p.add_argument(
        "output",
        nargs="?",
        type=Path,
        default=None,
        help=f"Ruta de salida (default: {default_out_hoy} o {default_out_historial} según --variant)",
    )
    p.add_argument(
        "--variant",
        choices=("hoy", "historial-15d"),
        default="hoy",
        help="hoy = atajo diario; historial-15d = segundo atajo (misma lógica, otro nombre; ver comentario en plist).",
    )
    p.add_argument(
        "--mode",
        choices=("full", "minimal"),
        default="full",
        help="full = todas las métricas; minimal = solo pasos (diagnóstico en iPhone).",
    )
    p.add_argument(
        "--quantity-type",
        dest="quantity_type",
        choices=("field", "plain"),
        default="field",
        help="Obsoleto: ignorado (el plist usa etiquetas de tipo en inglés, sin HKQuantityTypeIdentifier).",
    )
    p.add_argument(
        "--omit-workout-duration-stat",
        action="store_true",
        help="No añade suma de Duration sobre entrenamientos (estadística + números); evita un bloque a menudo gris.",
    )
    p.add_argument(
        "--workout-duration-placeholder",
        dest="wplace",
        choices=("zero", "omit"),
        default="zero",
        help="Solo con --omit-workout-duration-stat: 0 fijo (zero) o quitar clave workouts_duration_seconds (omit).",
    )
    p.add_argument(
        "--workout-stat-aggregate-serialization",
        dest="workout_agg_ser",
        choices=("string", "texttoken"),
        default="string",
        help="Solo si NO omites la suma de duración: cómo se serializa 'Duration' en la acción de estadística.",
    )
    p.add_argument(
        "--legacy-token-prompt",
        action="store_true",
        help="Solo «Solicitar entrada» del token en cada ejecución (sin leer/guardar archivo en iCloud).",
    )
    p.add_argument(
        "--legacy-workout-actions",
        action="store_true",
        help="Usa is.workflow.actions.filter.workouts + properties.workout (solo si tu iOS aún las reconoce).",
    )
    args = p.parse_args()
    if args.wplace == "omit" and not args.omit_workout_duration_stat:
        p.error("--workout-duration-placeholder=omit requiere --omit-workout-duration-stat")
    if args.variant == "historial-15d" and args.mode != "full":
        p.error("--variant historial-15d solo admite --mode full")
    out: Path = args.output or (
        default_out_historial if args.variant == "historial-15d" else default_out_hoy
    )
    wname: str
    if args.variant == "historial-15d":
        wname = "Orvita-Salud-Historial-15Dias"
    elif args.mode == "minimal":
        wname = "Orvita-Importar-Salud-Hoy (mín.)"
    else:
        wname = "Orvita-Importar-Salud-Hoy"
    if args.mode == "minimal":
        actions = build_actions_minimal(
            quantity_type_style=args.quantity_type,
            legacy_token_prompt=args.legacy_token_prompt,
        )
    elif args.variant == "historial-15d":
        actions = build_actions_historial_15d_full(
            quantity_type_style=args.quantity_type,
            omit_workout_duration_stat=args.omit_workout_duration_stat,
            duration_placeholders=args.wplace,
            workout_stat_prop_ser=args.workout_agg_ser,
            legacy_token_prompt=args.legacy_token_prompt,
            legacy_workout_actions=args.legacy_workout_actions,
        )
    else:
        actions = build_actions_full(
            quantity_type_style=args.quantity_type,
            omit_workout_duration_stat=args.omit_workout_duration_stat,
            duration_placeholders=args.wplace,
            workout_stat_prop_ser=args.workout_agg_ser,
            legacy_token_prompt=args.legacy_token_prompt,
            legacy_workout_actions=args.legacy_workout_actions,
        )
    with out.open("wb") as f:
        plistlib.dump(build_root(actions, workflow_name=wname), f, fmt=plistlib.FMT_XML)
    print(out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
