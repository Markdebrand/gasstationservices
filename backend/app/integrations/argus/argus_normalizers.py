"""Normalizadores de Argus (prices, news)."""
from app.integrations.common.normalizers import to_str, to_bool, to_m2o, to_m2m_ids
from datetime import datetime


def _clean_label(val) -> str:
    """Return a trimmed string unless it looks like a numeric placeholder."""
    if val is None:
        return ""
    try:
        text = str(val).strip()
    except Exception:
        return ""
    if not text:
        return ""
    try:
        float(text)
        return ""
    except Exception:
        pass
    if "/" in text:
        parts = [p.strip() for p in text.split("/") if p.strip()]
        if parts:
            all_numeric = True
            for part in parts:
                try:
                    float(part)
                except Exception:
                    all_numeric = False
                    break
            if all_numeric:
                return ""
    return text


def _pick_label(*candidates) -> str:
    for cand in candidates:
        cleaned = _clean_label(cand)
        if cleaned:
            return cleaned
    return ""

def _parse_date(dt: str | None) -> str | None:
    if not dt:
        return None
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
        try:
            return datetime.strptime(dt, fmt).isoformat()
        except Exception:
            continue
    return dt


def _make_label_from_unit(unit_id_value):
    if not unit_id_value:
        return ""
    try:
        return f"{int(unit_id_value)}.0"
    except Exception:
        return str(unit_id_value)


def _label_from_m2o(val):
    """Extrae el nombre de un many2one tipo [id, "NAME"]."""
    try:
        if isinstance(val, (list, tuple)) and len(val) > 1:
            return str(val[1])
        return str(val or "")
    except Exception:
        return ""


def normalize_argus_price_row(row: dict) -> dict:
    out = dict(row)
    out["continuous_forward"] = to_bool(out.get("continuous_forward"))

    for key in (
        "product_description",
        "publication_date",
        "fmt_date",
        "forward_period",
        "date_modified",
        "correction",
        "tag",
        "code_id",
        "delivery_mode_label",
        "delivery_mode_name",
        "delivery_mode_from_metadata",
        "delivery_mode_raw",
        "delivery_mode_num",
        "currency_from_metadata",
        "unit_from_metadata",
        "unit1_label",
        "unit2_label",
    ):
        out[key] = to_str(out.get(key))

    # Normalize casing for metadata-derived labels so UI shows consistent codes (USD, USG, FOB...)
    if out.get("currency_from_metadata"):
        out["currency_from_metadata"] = out["currency_from_metadata"].strip().upper()
    if out.get("unit_from_metadata"):
        out["unit_from_metadata"] = out["unit_from_metadata"].strip()

    if not out.get("unit1_label"):
        out["unit1_label"] = _make_label_from_unit(out.get("unit_id1"))
    if not out.get("unit2_label"):
        out["unit2_label"] = _make_label_from_unit(out.get("unit_id2"))

    dbv = out.get("diff_base_value")
    out["diff_base_value"] = "-" if dbv in (None, False, "") else dbv

    try:
        dp = int(out.get("decimal_places") or 0)
    except Exception:
        dp = 0

    # Normalize numeric price fields with decimal_places precision
    for price_key in ("value", "value_mid", "value_close", "value_open"):
        try:
            val = out.get(price_key)
            if val in (None, False, ""):
                out[price_key] = ""
            else:
                out[price_key] = f"{float(val):.{max(dp, 0)}f}"
        except Exception:
            # leave as-is on formatting error
            pass

    dbr = out.get("diff_base_roll")
    if dbr in (None, False, ""):
        out["diff_base_roll"] = ""
    else:
        out["diff_base_roll"] = f"{float(dbr):.2f}"

    return out


def collapse_price_row(row: dict, *, date_pref: str = "publication") -> dict:
    """Produce un shape compacto para frontend.

    Campos expuestos:
        id, description, deliveryMode, units, unitLabel, publishedAt, value,
        currency, diffBase (si existe), forwardPeriod, repoId

    Reglas de preferencia (cuando vengan desde Odoo):
      - units: usar row["units_display"] si existe; si no, unit1_label/unit2_label
      - currency: usar label de row["currency_unit_id"]; si no, unit1_label
      - unitLabel: usar label de row["measure_unit_id"]; si no, unit2_label
    """
    norm = normalize_argus_price_row(row)

    # Units: prefer explicit display, otherwise combine currency/unit codes skipping numeric placeholders
    raw_units = _clean_label(row.get("units_display"))
    currency_unit = _pick_label(
        norm.get("currency_from_metadata"),
        _label_from_m2o(row.get("currency_unit_id")),
        norm.get("unit1_label"),
    )
    measure_unit = _pick_label(
        norm.get("unit_from_metadata"),
        _label_from_m2o(row.get("measure_unit_id")),
        norm.get("unit2_label"),
    )
    if raw_units:
        units = raw_units
    else:
        combo_parts = [p for p in (currency_unit, measure_unit) if p]
        units = "/".join(combo_parts)

    # Moneda / Unidad: tomar los many2one si existen; si no, caer a los labels normalizados
    currency = _pick_label(
        norm.get("currency_from_metadata"),
        _label_from_m2o(row.get("currency_id")),
        _label_from_m2o(row.get("currency_unit_id")),
        norm.get("unit1_label"),
    )
    unit_label = _pick_label(
        norm.get("unit_from_metadata"),
        _label_from_m2o(row.get("measure_unit_id")),
        norm.get("unit2_label"),
    )

    # Delivery label: try explicit label, then name, then m2o label
    delivery = (
        norm.get("delivery_mode_label")
        or norm.get("delivery_mode_name")
        or norm.get("delivery_mode_from_metadata")
        or norm.get("delivery_mode_raw")
        or norm.get("delivery_mode_num")
        or _label_from_m2o(row.get("delivery_mode_id"))
        or ""
    )
    # Selección de fecha: por defecto preferimos publication_date para evitar desfaces vistos (día +1)
    if date_pref == "fmt":
        published = norm.get("fmt_date") or norm.get("publication_date") or ""
    else:
        published = norm.get("publication_date") or norm.get("fmt_date") or ""
    # Reducir a solo fecha (sin hora) sin reinterpretar TZ: corte textual
    if published:
        if " " in published:
            published_date_only = published.split(" ", 1)[0]
        elif "T" in published:
            published_date_only = published.split("T", 1)[0]
        else:
            published_date_only = published
    else:
        published_date_only = ""

    return {
        "id": norm.get("id"),
        "description": norm.get("product_description"),
        "codeId": norm.get("code_id"),
        "deliveryMode": delivery,
        "units": units,               # ⇢ Units (USC/USG)
        "unitLabel": unit_label,      # ⇢ Unidad (USG)
        # Mantener la fecha EXACTAMENTE como viene de Odoo (sin normalizar ni añadir 'T')
        # para evitar desplazamientos de día por interpretaciones de zona horaria en el frontend.
    "publishedAt": published_date_only,
        # Provide all three price variants in compact shape too
        "value": norm.get("value"),              # low/min
        "value_mid": norm.get("value_mid"),      # mid
        "value_close": norm.get("value_close"),  # high/close
        "currency": currency,         # ⇢ Moneda (USC)
        "diffBase": norm.get("diff_base_value") if norm.get("diff_base_value") not in (None, "", "-") else None,
        "forwardPeriod": norm.get("forward_period") or None,
        "forwardYear": norm.get("forward_year") or None,
        "repoId": norm.get("repository_id"),
    }


def normalize_argus_news_list_row(row: dict) -> dict:
    out = dict(row)
    if "id" in out:
        try:
            out["id"] = int(out["id"]) if out["id"] is not None else None
        except Exception:
            out["id"] = None
    out["news_id"] = to_str(out.get("news_id")) or None
    out["headline"] = to_str(out.get("headline"))
    out["publication_date"] = to_str(out.get("publication_date"))
    out["free"] = to_bool(out.get("free"))
    out["featured"] = to_bool(out.get("featured"))
    out["language_id"] = to_m2o(out.get("language_id"))
    return out


def normalize_argus_news_detail_row(row: dict) -> dict:
    out = dict(row)
    out["news_id"] = to_str(out.get("news_id"))
    out["headline"] = to_str(out.get("headline"))
    out["publication_date"] = to_str(out.get("publication_date"))
    out["date_modified"] = to_str(out.get("date_modified"))
    out["text_html"] = to_str(out.get("text_html"))
    out["free"] = to_bool(out.get("free"))
    out["featured"] = to_bool(out.get("featured"))
    out["language_id"] = to_m2o(out.get("language_id"))
    out["news_type_id"] = to_m2o(out.get("news_type_id"))
    out["region_ids"] = to_m2m_ids(out.get("region_ids"))
    out["sector_ids"] = to_m2m_ids(out.get("sector_ids"))
    out["context_ids"] = to_m2m_ids(out.get("context_ids"))
    out["stream_ids"] = to_m2m_ids(out.get("stream_ids"))
    return out
