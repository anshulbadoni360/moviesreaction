import json
import re

from services.exceptions import ModelParseError


def to_bool(value: object) -> bool:
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in ("true", "1", "yes")


def safe_json_parse(raw: str) -> dict[str, object]:
    text = raw.strip()

    # Strip thinking tokens if returned by reasoning VLMs
    if "<think>" in text and "</think>" in text:
        text = text.split("</think>", 1)[1].strip()

    if text.startswith("```"):
        text = text.partition("\n")[2]
    text = text.removesuffix("```").strip()

    # Extract JSON substring between the first { and last }
    first_brace = text.find("{")
    last_brace = text.rfind("}")
    if first_brace != -1 and last_brace != -1 and last_brace >= first_brace:
        text = text[first_brace : last_brace + 1]

    try:
        parsed: object = json.loads(text.strip())
    except json.JSONDecodeError as exc:
        raise ModelParseError(
            f"VLM output could not be parsed as JSON: {exc}",
            details={"raw_output": raw[:500]},
        ) from exc
    if not isinstance(parsed, dict):
        raise ModelParseError(
            f"Expected JSON object from VLM, got {type(parsed).__name__}",
            details={"raw_output": raw[:500]},
        )
    return {str(k): v for k, v in parsed.items()}
