import json
import re
import urllib.error
import urllib.request
from typing import Any, Dict, List, Optional
import config


def _extract_json_object(raw_text: str) -> Optional[Dict[str, Any]]:
    """Extracts a JSON object from raw LLM output, handling markdown code fences cleanly."""
    if not raw_text:
        return None
    cleaned = raw_text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    try:
        parsed = json.loads(cleaned)
        return parsed if isinstance(parsed, dict) else None
    except Exception:
        pass
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start >= 0 and end > start:
        try:
            parsed = json.loads(cleaned[start : end + 1])
            return parsed if isinstance(parsed, dict) else None
        except Exception:
            return None
    return None


def call_gemini_chat(
    messages: List[Dict[str, str]],
    temperature: float = 0.3,
    max_tokens: int = 1200,
    timeout_s: float = 7.0,
    json_mode: bool = False,
) -> Optional[str]:
    """
    Calls the configured Gemini OpenAI-compatible endpoint with automatic multi-key
    failover across all keys returned by config.get_ordered_llm_keys().
    Returns None gracefully if unconfigured or all keys fail.
    """
    base_url = (config.LLM_BASE_URL or "").strip().rstrip("/")
    key_pool = config.get_ordered_llm_keys()
    if not base_url or not key_pool:
        return None

    endpoint = f"{base_url}/chat/completions"
    payload: Dict[str, Any] = {
        "model": config.LLM_MODEL or "gemini-3.5-flash-lite",
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    if json_mode:
        payload["response_format"] = {"type": "json_object"}

    req_bytes = json.dumps(payload, ensure_ascii=False).encode("utf-8")

    for api_key in key_pool[:2]:
        try:
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
            }
            req = urllib.request.Request(endpoint, data=req_bytes, headers=headers, method="POST")
            with urllib.request.urlopen(req, timeout=timeout_s) as resp:
                if resp.status == 200:
                    data = json.loads(resp.read().decode("utf-8"))
                    content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                    if content and str(content).strip():
                        return str(content).strip()
        except urllib.error.HTTPError as he:
            if he.code in (401, 403, 429, 500, 502, 503, 504):
                config.rotate_llm_key(api_key)
                continue
            # Retry without json_mode hint if model rejected response_format (HTTP 400)
            if he.code == 400 and json_mode:
                try:
                    fallback_payload = dict(payload)
                    fallback_payload.pop("response_format", None)
                    req2 = urllib.request.Request(
                        endpoint,
                        data=json.dumps(fallback_payload, ensure_ascii=False).encode("utf-8"),
                        headers=headers,
                        method="POST",
                    )
                    with urllib.request.urlopen(req2, timeout=timeout_s) as resp2:
                        if resp2.status == 200:
                            data2 = json.loads(resp2.read().decode("utf-8"))
                            c2 = data2.get("choices", [{}])[0].get("message", {}).get("content", "")
                            if c2 and str(c2).strip():
                                return str(c2).strip()
                except Exception:
                    pass
            config.rotate_llm_key(api_key)
        except Exception:
            config.rotate_llm_key(api_key)
    return None


def call_gemini_json(
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.15,
    max_tokens: int = 900,
    timeout_s: float = 6.5,
) -> Optional[Dict[str, Any]]:
    """Requests a structured JSON object from Gemini with automatic key rotation."""
    raw = call_gemini_chat(
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=temperature,
        max_tokens=max_tokens,
        timeout_s=timeout_s,
        json_mode=True,
    )
    return _extract_json_object(raw) if raw else None

