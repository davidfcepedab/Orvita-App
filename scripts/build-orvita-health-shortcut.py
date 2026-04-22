#!/usr/bin/env python3
"""Genera el plist del atajo iOS, listo para `plutil` + `shortcuts sign`.

Compatibilidad: las acciones usan identificadores estándar de Shortcuts
(`is.workflow.actions.filter.health.quantity`, `calculatestatistics`, `filter.workouts`, etc.),
no dependen de un iOS "futuro". Si en el iPhone muchas acciones salen «Acción desconocida»,
suele ser import corrupto, .shortcut desactualizado o permisos de Salud; no el número de
versión de iOS por encima o por debajo de un mínimo mágico.

Métricas incluidas (aportan columnas o `readiness` derivado en Órvita):
- Pasos, minutos de ejercicio, energía activa, HRV, FC en reposo, entrenamientos (conteo + duración).
- **No** incluimos agregado de sueño por categoría + «Calcular estadísticas (duración)» en dispositivos donde Atajos muestra
  «Acción desconocida»; ese par es el fallo más habitual. Puedes añadir sueño a mano en el atajo o registrar sueño en la app
  / otras fuentes. El diccionario ya no manda `sleep_duration_seconds` desde el atajo generado.

No añadimos más tipos HealthKit aquí sin columna/UI en la app (peso, SpO2, presión, etc.):
sí puedes mandarlos como números extra en el JSON y se guardan en `metadata.shortcut_bundle_extras`.
"""
from __future__ import annotations

import plistlib
import sys
import uuid
from pathlib import Path


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


def find_health_quantity(
    *,
    u_find: str,
    identifier: str,
) -> dict:
    return {
        "WFWorkflowActionIdentifier": "is.workflow.actions.filter.health.quantity",
        "WFWorkflowActionParameters": {
            "UUID": u_find,
            "WFContentItemFilter": content_filter_today(),
            # Probado en Shortcuts 17: el tipo se serializa como picker de cantidad.
            "WFQuantityType": {
                "Value": {"WFQuantityTypeIdentifier": identifier},
                "WFSerializationType": "WFQuantityTypeFieldValue",
            },
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
        params["WFStatisticsSampleProperty"] = aggregate_property
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


def ask_text(*, u: str, prompt: str) -> dict:
    return {
        "WFWorkflowActionIdentifier": "is.workflow.actions.ask",
        "WFWorkflowActionParameters": {
            "UUID": u,
            "WFAskActionPrompt": prompt,
            "WFInputType": "Text",
        },
    }


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


def dictionary_bundle(
    *,
    u_dict: str,
    u_iso: str,
    u_steps: str,
    u_exercise_min: str,
    u_energy: str,
    u_hrv: str,
    u_rhr: str,
    u_workout_count: str,
    u_workout_dur_sec: str,
) -> dict:
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
        {
            "WFItemType": 1,
            "WFKey": text_plain("exercise_minutes"),
            "WFValue": {
                "Value": text_token_string(u_exercise_min, "Calculation Result"),
                "WFSerializationType": "WFTextTokenString",
            },
        },
        {
            "WFItemType": 1,
            "WFKey": text_plain("active_energy_kcal"),
            "WFValue": {
                "Value": text_token_string(u_energy, "Calculation Result"),
                "WFSerializationType": "WFTextTokenString",
            },
        },
        {
            "WFItemType": 1,
            "WFKey": text_plain("hrv_ms"),
            "WFValue": {
                "Value": text_token_string(u_hrv, "Calculation Result"),
                "WFSerializationType": "WFTextTokenString",
            },
        },
        {
            "WFItemType": 1,
            "WFKey": text_plain("resting_hr_bpm"),
            "WFValue": {
                "Value": text_token_string(u_rhr, "Calculation Result"),
                "WFSerializationType": "WFTextTokenString",
            },
        },
        {
            "WFItemType": 1,
            "WFKey": text_plain("workouts_count"),
            "WFValue": {
                "Value": text_token_string(u_workout_count, "Count"),
                "WFSerializationType": "WFTextTokenString",
            },
        },
        {
            "WFItemType": 1,
            "WFKey": text_plain("workouts_duration_seconds"),
            "WFValue": {
                "Value": text_token_string(u_workout_dur_sec, "Calculation Result"),
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


def post_import(*, u_post: str, u_token: str, u_dict: str) -> dict:
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


def build_root(actions: list[dict]) -> dict:
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
        "WFWorkflowName": "Órvita – Importar Salud Hoy",
        "WFWorkflowOutputContentItemClasses": [],
        "WFWorkflowTypes": [],
    }


def main() -> int:
    u_token = uid()
    u_date = uid()
    u_iso = uid()

    u_find_steps = uid()
    u_stat_steps = uid()
    u_find_exercise = uid()
    u_stat_exercise = uid()
    u_find_energy = uid()
    u_stat_energy = uid()
    u_find_hrv = uid()
    u_stat_hrv = uid()
    u_find_rhr = uid()
    u_stat_rhr = uid()

    u_find_workouts = uid()
    u_count_workouts = uid()
    u_stat_workout_dur = uid()

    u_dict = uid()
    u_post = uid()
    u_show = uid()

    actions: list[dict] = [
        comment(
            "Entrenos del día, pasos, minutos de ejercicio, energía activa, HRV y FC en reposo; envía todo a Órvita. "
            "Sin agregado automático de sueño (categoría) para evitar «Acción desconocida» en Atajos. "
            "Genera un token en la app (Salud) y pégalo cuando te lo pida el atajo."
        ),
        ask_text(
            u=u_token,
            prompt="Pega el token de importación que generaste en Órvita (Salud).",
        ),
        current_date(u=u_date),
        format_iso8601(u=u_iso, u_date=u_date),
        find_health_quantity(u_find=u_find_steps, identifier="HKQuantityTypeIdentifierStepCount"),
        statistics_on(u_find_steps, u_stat_steps, "Sum"),
        find_health_quantity(
            u_find=u_find_exercise, identifier="HKQuantityTypeIdentifierAppleExerciseTime"
        ),
        statistics_on(u_find_exercise, u_stat_exercise, "Sum"),
        find_health_quantity(u_find=u_find_energy, identifier="HKQuantityTypeIdentifierActiveEnergyBurned"),
        statistics_on(u_find_energy, u_stat_energy, "Sum"),
        find_health_quantity(u_find=u_find_hrv, identifier="HKQuantityTypeIdentifierHeartRateVariabilitySDNN"),
        statistics_on(u_find_hrv, u_stat_hrv, "Average"),
        find_health_quantity(u_find=u_find_rhr, identifier="HKQuantityTypeIdentifierRestingHeartRate"),
        statistics_on(u_find_rhr, u_stat_rhr, "Average"),
        find_workouts(u_find=u_find_workouts),
        count_items(u_input=u_find_workouts, u_count=u_count_workouts, output_name="Workouts"),
        statistics_on(
            u_find_workouts,
            u_stat_workout_dur,
            "Sum",
            output_name="Workouts",
            aggregate_property="Duration",
        ),
        dictionary_bundle(
            u_dict=u_dict,
            u_iso=u_iso,
            u_steps=u_stat_steps,
            u_exercise_min=u_stat_exercise,
            u_energy=u_stat_energy,
            u_hrv=u_stat_hrv,
            u_rhr=u_stat_rhr,
            u_workout_count=u_count_workouts,
            u_workout_dur_sec=u_stat_workout_dur,
        ),
        post_import(u_post=u_post, u_token=u_token, u_dict=u_dict),
        show_result(u=u_show, u_post=u_post),
    ]

    out = Path(sys.argv[1] if len(sys.argv) > 1 else "orvita-importar-salud-hoy.shortcut.src.plist")
    with out.open("wb") as f:
        plistlib.dump(build_root(actions), f, fmt=plistlib.FMT_XML)
    print(out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
