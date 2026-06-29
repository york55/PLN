"""
Extractor HÍBRIDO de reseñas de Falabella PE.

Para cada producto:
  1. Intenta el proxy bvp.falabella.services (requests) -> trae TODAS las reseñas.
  2. Si el proxy devuelve 0, cae al JSON-LD de la página del producto
     (Playwright) -> rescata las reseñas que estén en el HTML (hasta ~5).

Así cubrimos los productos que están en BazaarVoice (vía proxy) y también
los que solo tienen reseñas en el HTML (vía JSON-LD).

Requiere: productos_falabella.csv (columnas url, nombre, marca, num_resenas).
"""

import re
import json
import time
import requests
import pandas as pd
from playwright.sync_api import sync_playwright

PASSKEY = "caA1SPlXPQxP0ls9JbfylYuAHLRhIoV3tsUaqUBh8bnKc"

BASE = "https://bvp.falabella.services/reviews"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
    "Referer": "https://www.falabella.com.pe/",
    "Accept": "application/json",
}
PAGINA = 30


def product_id_de_url(url):
    partes = [p for p in str(url).split("?")[0].split("/") if p.isdigit()]
    return partes[0] if partes else None


# ---------- MÉTODO 1: proxy (todas las reseñas) ----------
def reviews_por_proxy(pid):
    todas, offset, total = [], 0, None
    while True:
        params = {
            "passKey": PASSKEY, "productId": pid,
            "offset": offset, "limit": PAGINA,
            "fetchStats": "true", "multiLangReviews": "true",
        }
        try:
            r = requests.get(BASE, params=params, headers=HEADERS, timeout=20)
            if r.status_code != 200:
                break
            data = r.json()
        except Exception:
            break
        if data.get("HasErrors"):
            break
        results = data.get("Results", []) or []
        todas.extend(results)
        if total is None:
            total = data.get("TotalResults", 0) or 0
        offset += PAGINA
        if offset >= total or not results:
            break
        time.sleep(0.4)
    # Normalizamos al formato común
    norm = [{
        "autor":  rv.get("UserNickname"),
        "fecha":  rv.get("SubmissionTime"),
        "rating": rv.get("Rating"),
        "titulo": rv.get("Title"),
        "reseña": rv.get("ReviewText"),
        "fuente": "proxy",
    } for rv in todas]
    return norm


# ---------- MÉTODO 2: JSON-LD de la página (respaldo) ----------
def reviews_por_jsonld(page, url):
    try:
        page.goto(url, wait_until="domcontentloaded", timeout=30000)
        time.sleep(2.5)
        html = page.content()
    except Exception:
        return []
    bloques = re.findall(
        r'<script type="application/ld\+json">(.*?)</script>', html, re.DOTALL)
    for b in bloques:
        try:
            data = json.loads(b)
        except Exception:
            continue
        if data.get("@type") == "Product" and "review" in data:
            norm = []
            for rv in data.get("review", []):
                norm.append({
                    "autor":  rv.get("author", {}).get("name"),
                    "fecha":  rv.get("datePublished"),
                    "rating": rv.get("reviewRating", {}).get("ratingValue"),
                    "titulo": rv.get("name"),
                    "reseña": rv.get("reviewBody"),
                    "fuente": "jsonld",
                })
            return norm
    return []


def main():
    df = pd.read_csv("productos_falabella.csv")
    df["num_resenas"] = pd.to_numeric(df["num_resenas"], errors="coerce").fillna(0)
    df_con = df[df["num_resenas"] > 0].reset_index(drop=True)
    print(f"Productos con reseñas: {len(df_con)}\n")

    filas = []
    proxy_ok = jsonld_ok = sin_nada = 0

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        for idx, row in df_con.iterrows():
            pid = product_id_de_url(row["url"])
            if not pid:
                continue

            # 1) proxy
            reviews = reviews_por_proxy(pid)
            fuente = "proxy"

            # 2) si el proxy no trajo nada, respaldo con JSON-LD
            if not reviews:
                reviews = reviews_por_jsonld(page, row["url"])
                fuente = "jsonld" if reviews else "ninguna"

            if fuente == "proxy":
                proxy_ok += 1
            elif fuente == "jsonld":
                jsonld_ok += 1
            else:
                sin_nada += 1

            print(f"[{idx+1}/{len(df_con)}] {str(row['nombre'])[:38]:38} -> {len(reviews):3} ({fuente})")

            for rev in reviews:
                filas.append({
                    "producto":   row["nombre"],
                    "marca":      row["marca"],
                    "product_id": pid,
                    "url":        row["url"],
                    **rev,
                })
            time.sleep(0.3)

        browser.close()

    df_rev = pd.DataFrame(filas)
    df_rev.to_csv("reseñas_hibrido.csv", index=False, encoding="utf-8-sig")

    print(f"\n=== RESUMEN ===")
    print(f"Total reseñas: {len(df_rev)}")
    print(f"Productos resueltos por proxy:  {proxy_ok}")
    print(f"Productos rescatados por JSON-LD: {jsonld_ok}")
    print(f"Productos sin reseñas reales:   {sin_nada}")
    if len(df_rev):
        df_texto = df_rev[df_rev["reseña"].notna() & (df_rev["reseña"].astype(str).str.len() > 0)]
        df_texto.to_csv("reseñas_hibrido_con_texto.csv", index=False, encoding="utf-8-sig")
        print(f"Reseñas con texto (para NLP): {len(df_texto)}")
        print("Guardado: reseñas_hibrido.csv y reseñas_hibrido_con_texto.csv")


if __name__ == "__main__":
    main()