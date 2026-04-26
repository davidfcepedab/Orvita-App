#!/usr/bin/env python3
"""Genera el plist del atajo iOS, listo para `plutil` + `shortcuts sign` (en macOS).

Compatibilidad: las acciones usan identificadores estándar de Shortcuts
(`is.workflow.actions.filter.health.quantity`, `calculatestatistics`, `filter.workouts`, etc.),
no dependen de un iOS "futuro". Si al importar ves «Buscar muestras de Salud» con tipo (null)
o tarjetas «Acción desconocida» en el medio, suele ser **serialización** del .shortcut, no
permisos ni caché: prueba `--mode minimal`, `--quantity-type plain` y/o
`--omit-workout-duration-stat` (ver `--help`).

Métricas en modo `full` (lista `BUNDLE_QUANTITY_METRICS`, alineada con `lib/integrations/appleHealthBundleContract.ts`):
- Pasos, minutos de ejercicio, energía activa, HRV, FC en reposo, distancia caminar/correr (m),
  plantas, VO₂, saturación O₂ (media HK → `oxygen_saturation_avg`), frecuencia respiratoria,
  FC media al caminar, velocidad al caminar, test 6 min (m), masa corporal; entrenamientos
  (conteo + duración salvo `--omit-workout-duration-stat`).
- **No** incluimos agregado de sueño por categoría + «Calcular estadísticas (duración)»;
  el diccionario no manda `sleep_hours` / `sleep_duration_seconds` desde el atajo generado
  (puedes añadirlos a mano en Atajos si lo necesitas).

Modo `minimal`: token, fecha ISO, una sola búsqueda (pasos) + suma, diccionario mínimo, POST
— para validar en un iPhone real que el flujo básico no se rompe antes de añadir métricas.
El POST incluye cabecera `x-orvita-observed-at` (misma fecha que `apple_bundle.observed_at`) para
evitar fallos de Atajos cuando el JSON serializa `observed_at` como null (ver API `applyObservedAtFromRequestHeaders`).

**Token en el iPhone (por defecto):** el plist generado intenta leer `Shortcuts/orvita_import_token.txt` en **iCloud Drive**
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

# Alinear con `APPLE_SHORTCUT_BUNDLE_INPUT_KEYS` / atajo → merge (TypeScript).
BUNDLE_QUANTITY_METRICS: list[tuple[str, str, str]] = [
    ("steps", "HKQuantityTypeIdentifierStepCount", "Sum"),
    ("exercise_minutes", "HKQuantityTypeIdentifierAppleExerciseTime", "Sum"),
    ("active_energy_kcal", "HKQuantityTypeIdentifierActiveEnergyBurned", "Sum"),
    ("hrv_ms", "HKQuantityTypeIdentifierHeartRateVariabilitySDNN", "Average"),
    ("resting_hr_bpm", "HKQuantityTypeIdentifierRestingHeartRate", "Average"),
    ("walking_running_m", "HKQuantityTypeIdentifierDistanceWalkingRunning", "Sum"),
    ("floors_climbed", "HKQuantityTypeIdentifierFlightsClimbed", "Sum"),
    ("vo2_max", "HKQuantityTypeIdentifierVO2Max", "Average"),
    ("oxygen_saturation_avg", "HKQuantityTypeIdentifierOxygenSaturation", "Average"),
    ("respiratory_rate", "HKQuantityTypeIdentifierRespiratoryRate", "Average"),
    ("walking_hr_avg", "HKQuantityTypeIdentifierWalkingHeartRateAverage", "Average"),
    ("walking_speed_m_s", "HKQuantityTypeIdentifierWalkingSpeed", "Average"),
    ("six_minute_walk_m", "HKQuantityTypeIdentifierSixMinuteWalkTestDistance", "Average"),
    ("body_mass_kg", "HKQuantityTypeIdentifierBodyMass", "Average"),
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


def wf_quantity_type_parameter(identifier: str, style: str) -> str | dict:
    """Cómo se guarda el tipo de muestra (HK…) en el picker de Atajos.

    - field: estructura clásica Value + WFQuantityTypeFieldValue (la que exportan muchos plist).
    - plain: un solo string (algunas builds de Atajos lo aceptan si el anidado no resuelve).
    """
    if style == "plain":
        return identifier
    if style != "field":
        raise ValueError(f"Unknown quantity type style: {style!r}")
    return {
        "Value": {"WFQuantityTypeIdentifier": identifier},
        "WFSerializationType": "WFQuantityTypeFieldValue",
    }


def find_health_quantity(
    *,
    u_find: str,
    identifier: str,
    quantity_type_style: str = "field",
) -> dict:
    return {
        "WFWorkflowActionIdentifier": "is.workflow.actions.filter.health.quantity",
        "WFWorkflowActionParameters": {
            "UUID": u_find,
            "WFContentItemFilter": content_filter_today(),
            "WFQuantityType": wf_quantity_type_parameter(identifier, quantity_type_style),
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
        "WFInput": {
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
        "WFWorkflowActionIdentifier": "is.workflow.actions.calculatestatistics",
        "WFWorkflowActionParameters": params,
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


# Ruta en iCloud Drive (sin «Mostrar selector») donde el atajo guarda el token persistente.
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
    """Devuelve (acciones, uuid_cabecera) donde uuid_cabecera alimenta x-orvita-import-token en el POST."""
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
        comment(
            "Token: lee iCloud Drive/Shortcuts/orvita_import_token.txt; si está vacío o no existe, "
            "pide el token una vez, lo guarda y reutiliza. Borra el archivo en iCloud si regeneras/revocas en Órvita."
        ),
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


def format_iso8601(*, u: str, u_date: str) -> dict:
    return {
        "WFWorkflowActionIdentifier": "is.workflow.actions.format.date",
        "WFWorkflowActionParameters": {
            "UUID": u,
            "WFDateFormatStyle": "ISO 8601",
            "WFTimeFormatStyle": "Short",
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


def dictionary_bundle_dynamic(
    *,
    u_dict: str,
    u_iso: str,
    quantity_stat_pairs: list[tuple[str, str, str]],
    u_workout_count: str,
    u_workout_dur_sec: str,
    include_workout_duration_seconds: bool = True,
    workout_duration_output_name: str = "Calculation Result",
) -> dict:
    items: list[dict] = [
        {
            "WFItemType": 0,
            "WFKey": text_plain("observed_at"),
            "WFValue": text_token_string(u_iso, "Formatted Date"),
        },
    ]
    for key, u_stat, output_name in quantity_stat_pairs:
        items.append(
            {
                "WFItemType": 1,
                "WFKey": text_plain(key),
                "WFValue": {
                    "Value": text_token_string(u_stat, output_name),
                    "WFSerializationType": "WFTextTokenString",
                },
            }
        )
    items.append(
        {
            "WFItemType": 1,
            "WFKey": text_plain("workouts_count"),
            "WFValue": {
                "Value": text_token_string(u_workout_count, "Count"),
                "WFSerializationType": "WFTextTokenString",
            },
        }
    )
    if include_workout_duration_seconds:
        items.append(
            {
                "WFItemType": 1,
                "WFKey": text_plain("workouts_duration_seconds"),
                "WFValue": {
                    "Value": text_token_string(u_workout_dur_sec, workout_duration_output_name),
                    "WFSerializationType": "WFTextTokenString",
                },
            }
        )
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


def dictionary_bundle_minimal(*, u_dict: str, u_iso: str, u_steps: str) -> dict:
    items: list[dict] = [
        {
            "WFItemType": 0,
            "WFKey": text_plain("observed_at"),
            "WFValue": text_token_string(u_iso, "Formatted Date"),
        },
        {
            "WFItemType": 1,
            "WFKey": text_plain("steps"),
            "WFValue": {
                "Value": text_token_string(u_steps, "Calculation Result"),
                "WFSerializationType": "WFTextTokenString",
            },
        },
    ]
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


def post_import(*, u_post: str, u_token: str, u_dict: str, u_iso: str) -> dict:
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
                            "WFValue": {
                                "Value": text_token_string(u_token, "Provided Input"),
                                "WFSerializationType": "WFTextTokenString",
                            },
                        },
                        {
                            "WFItemType": 0,
                            "WFKey": text_plain("x-orvita-observed-at"),
                            "WFValue": {
                                "Value": text_token_string(u_iso, "Formatted Date"),
                                "WFSerializationType": "WFTextTokenString",
                            },
                        },
                    ]
                },
                "WFSerializationType": "WFDictionaryFieldValue",
            },
            "WFJSONValues": {
                "Value": {
                    "WFDictionaryFieldValueItems": [
                        {
                            "WFItemType": 3,
                            "WFKey": text_plain("apple_bundle"),
                            "WFValue": {
                                "Value": {
                                    "OutputUUID": u_dict,
                                    "OutputName": "Dictionary",
                                    "Type": "ActionOutput",
                                },
                                "WFSerializationType": "WFTextTokenAttachment",
                            },
                        }
                    ]
                },
                "WFSerializationType": "WFDictionaryFieldValue",
            },
        },
    }


def show_result(*, u: str, u_post: str) -> dict:
    return {
        "WFWorkflowActionIdentifier": "is.workflow.actions.showresult",
        "WFWorkflowActionParameters": {
            "UUID": u,
            "Text": {
                "Value": {
                    "attachmentsByRange": {
                        "{0, 1}": {
                            "Type": "ActionOutput",
                            "OutputUUID": u_post,
                            "OutputName": "Contents of URL",
                        }
                    },
                    "string": "\ufffc",
                },
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


def build_root(actions: list[dict], *, workflow_name: str = "Órvita – Importar Salud Hoy") -> dict:
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


def build_actions_full(
    *,
    quantity_type_style: str,
    omit_workout_duration_stat: bool,
    duration_placeholders: str,
    workout_stat_prop_ser: str,
) -> list[dict]:
    u_token = uid()
    u_date = uid()
    u_iso = uid()

    u_find_workouts = uid()
    u_count_workouts = uid()
    u_stat_workout_dur = uid()
    u_zero_dur = uid()

    u_dict = uid()
    u_post = uid()
    u_show = uid()

    actions: list[dict] = [
        comment(
            "Métricas de cantidad del día (lista BUNDLE_QUANTITY_METRICS) + entrenos; POST a Órvita. "
            "Sin sueño automático por categoría (evita «Acción desconocida» en muchos iPhone). "
            "Token desde Órvita → Salud."
        ),
        ask_text(
            u=u_token,
            prompt="Pega el token de importación que generaste en Órvita (Salud).",
        ),
        current_date(u=u_date),
        format_iso8601(u=u_iso, u_date=u_date),
    ]

    quantity_stat_pairs: list[tuple[str, str, str]] = []
    for key, hk_id, op in BUNDLE_QUANTITY_METRICS:
        u_find = uid()
        u_stat = uid()
        actions.append(
            find_health_quantity(
                u_find=u_find,
                identifier=hk_id,
                quantity_type_style=quantity_type_style,
            )
        )
        actions.append(statistics_on(u_find, u_stat, op))
        quantity_stat_pairs.append((key, u_stat, "Calculation Result"))

    actions.extend(
        [
            find_workouts(u_find=u_find_workouts),
            count_items(u_input=u_find_workouts, u_count=u_count_workouts, output_name="Workouts"),
        ]
    )

    u_dur_for_dict: str
    include_dur: bool
    dur_output_name: str
    if omit_workout_duration_stat:
        if duration_placeholders == "zero":
            actions.append(static_number(u=u_zero_dur, n=0.0))
            u_dur_for_dict = u_zero_dur
            include_dur = True
            dur_output_name = "Number"
        else:
            u_dur_for_dict = u_stat_workout_dur
            include_dur = False
            dur_output_name = "Calculation Result"
    else:
        actions.append(
            statistics_on(
                u_find_workouts,
                u_stat_workout_dur,
                "Sum",
                output_name="Workouts",
                aggregate_property="Duration",
                aggregate_property_serialization=workout_stat_prop_ser,
            )
        )
        u_dur_for_dict = u_stat_workout_dur
        include_dur = True
        dur_output_name = "Calculation Result"

    actions.append(
        dictionary_bundle_dynamic(
            u_dict=u_dict,
            u_iso=u_iso,
            quantity_stat_pairs=quantity_stat_pairs,
            u_workout_count=u_count_workouts,
            u_workout_dur_sec=u_dur_for_dict,
            include_workout_duration_seconds=include_dur,
            workout_duration_output_name=dur_output_name,
        )
    )
    actions.extend(
        [
            post_import(u_post=u_post, u_token=u_token, u_dict=u_dict, u_iso=u_iso),
            show_result(u=u_show, u_post=u_post),
        ]
    )
    return actions


def build_actions_minimal(*, quantity_type_style: str) -> list[dict]:
    u_token = uid()
    u_date = uid()
    u_iso = uid()
    u_find_steps = uid()
    u_stat_steps = uid()
    u_dict = uid()
    u_post = uid()
    u_show = uid()
    return [
        comment(
            "Mínimo de validación: solo pasos (suma) + token + ISO + POST. "
            "Si esto abre sin (null) ni tarjetas grises, el fallo estaba en otra acción/serialización; "
            "vuelve al modo completo o añade métricas de una en una."
        ),
        ask_text(
            u=u_token,
            prompt="Pega el token de importación que generaste en Órvita (Salud).",
        ),
        current_date(u=u_date),
        format_iso8601(u=u_iso, u_date=u_date),
        find_health_quantity(
            u_find=u_find_steps,
            identifier="HKQuantityTypeIdentifierStepCount",
            quantity_type_style=quantity_type_style,
        ),
        statistics_on(u_find_steps, u_stat_steps, "Sum"),
        dictionary_bundle_minimal(u_dict=u_dict, u_iso=u_iso, u_steps=u_stat_steps),
        post_import(u_post=u_post, u_token=u_token, u_dict=u_dict, u_iso=u_iso),
        show_result(u=u_show, u_post=u_post),
    ]


def main() -> int:
    here = Path(__file__).resolve().parent
    default_out = here / "shortcuts" / "orvita-importar-salud-hoy.shortcut.src.plist"
    p = argparse.ArgumentParser(description="Genera plist XML del atajo Salud (Órvita).")
    p.add_argument(
        "output",
        nargs="?",
        type=Path,
        default=default_out,
        help=f"Ruta de salida (default: {default_out})",
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
        help="Serialización de WFQuantityType: field (anidado) o plain (string HK…).",
    )
    p.add_argument(
        "--omit-workout-duration-stat",
        action="store_true",
        help="No añade «Calcular estadísticas» sumando Duration sobre entrenamientos; evita un bloque a menudo gris.",
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
        help="Solo si NO omites el estadístico de duración: cómo se serializa 'Duration' en Calcular estadísticas.",
    )
    args = p.parse_args()
    if args.wplace == "omit" and not args.omit_workout_duration_stat:
        p.error("--workout-duration-placeholder=omit requiere --omit-workout-duration-stat")
    wname = (
        "Órvita – Importar Salud Hoy (mín.)"
        if args.mode == "minimal"
        else "Órvita – Importar Salud Hoy"
    )
    if args.mode == "minimal":
        actions = build_actions_minimal(quantity_type_style=args.quantity_type)
    else:
        actions = build_actions_full(
            quantity_type_style=args.quantity_type,
            omit_workout_duration_stat=args.omit_workout_duration_stat,
            duration_placeholders=args.wplace,
            workout_stat_prop_ser=args.workout_agg_ser,
        )
    out: Path = args.output
    with out.open("wb") as f:
        plistlib.dump(build_root(actions, workflow_name=wname), f, fmt=plistlib.FMT_XML)
    print(out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
