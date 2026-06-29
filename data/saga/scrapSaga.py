"""
Scrapea TODOS los productos de la categoría Tecnología de Falabella PE,
recorriendo todas las páginas (?page=1, 2, 3...) hasta agotarlas.

Guarda productos_falabella.csv, que luego usa reseñas_definitivo.py.

Requiere: pip install playwright pandas  +  playwright install chromium
"""

import time
import pandas as pd
from playwright.sync_api import sync_playwright

CATEGORY_URL = "https://www.falabella.com.pe/falabella-pe/category/cat40793/Tecnologia"
MAX_PAGINAS = 200   # tope de seguridad (no debería alcanzarse)


def texto(elemento, selector):
    el = elemento.query_selector(selector)
    return el.inner_text().strip() if el else None


def scrapear_pagina(page, url):
    page.goto(url, wait_until="domcontentloaded", timeout=40000)
    time.sleep(6)
    productos = page.query_selector_all("[data-pod]")
    datos = []
    for prod in productos:
        u = prod.get_attribute("href")
        if u and "?" in u:
            u = u.split("?")[0]
        datos.append({
            "marca":       texto(prod, "b[class*='brand']"),
            "nombre":      texto(prod, "[class*='subTitle']"),
            "precio":      texto(prod, "[class*='prices-0'] span"),
            "num_resenas": texto(prod, "[class*='reviewCount']"),
            "url":         u,
        })
    return datos


def main():
    todos = {}          # url -> fila (el dict evita duplicados)
    urls_vistas = set()
    n = 0

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()

        while n < MAX_PAGINAS:
            n += 1
            url = CATEGORY_URL if n == 1 else f"{CATEGORY_URL}?page={n}"
            print(f"Página {n}...", end=" ")
            try:
                datos = scrapear_pagina(page, url)
            except Exception as e:
                print(f"error: {e} — paro.")
                break

            if not datos:
                print("vacía — fin.")
                break

            urls_pagina = {d["url"] for d in datos if d["url"]}
            nuevas = urls_pagina - urls_vistas
            print(f"{len(datos)} productos, {len(nuevas)} nuevos")

            # Si la página no aporta ningún producto nuevo, llegamos al final
            if not nuevas:
                print("Sin productos nuevos — fin de la paginación.")
                break

            for d in datos:
                if d["url"] and d["url"] not in todos:
                    todos[d["url"]] = d
            urls_vistas |= urls_pagina

        browser.close()

    df = pd.DataFrame(list(todos.values()))
    df["num_resenas"] = (
        df["num_resenas"].astype(str)
        .str.replace("(", "", regex=False)
        .str.replace(")", "", regex=False)
    )
    df.to_csv("productos_falabella.csv", index=False, encoding="utf-8-sig")

    print(f"\n=== RESUMEN ===")
    print(f"Páginas recorridas: {n}")
    print(f"Productos únicos: {len(df)}")
    print("Guardado en productos_falabella.csv")


if __name__ == "__main__":
    main()