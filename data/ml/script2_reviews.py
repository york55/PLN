"""
================================================================================
 SCRIPT 2 — Obtener RESEÑAS por la API oficial y armar el DATASET FINAL
================================================================================
 Lee el CSV de productos (Script 1) y, por cada producto, descarga sus reseñas
 CON TEXTO del país elegido usando la API oficial de Mercado Libre. Escribe el
 archivo final, una fila por reseña:
     idproducto, nombre, marca, precio, moneda, url, categoria,
     rating, titulo, resena

 Requisitos:
     - requests (lo instala configurar_entorno.ps1)
     - un TOKEN válido de la API de Mercado Libre.
================================================================================
"""
import csv
import os
import re
import sys
import time
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace", line_buffering=True)
except Exception:
    pass

# Config
ENTRADA = "productos.csv"          # salida del Script 1
SALIDA = "dataset_final.csv"       # dataset final
PROCESADOS = "procesados.txt"      # registro para reanudar (no borrar)
PAIS = "MPE"                       # código de país a conservar (Perú = MPE)
WORKERS = 6                        # descargas en paralelo
REVIEW_LIMIT = 50
MAX_REVIEW_PAGES = 40              # tope de páginas de reseñas por producto
DELAY = 0.15

API = "https://api.mercadolibre.com"
COLUMNAS = ["idproducto", "nombre", "marca", "precio", "moneda", "url",
            "categoria", "rating", "titulo", "resena"]

_TOKEN = None
_lock = threading.Lock()
_token_invalido = threading.Event()


def token():
    global _TOKEN
    if _TOKEN is None:
        _TOKEN = (sys.argv[1].strip() if len(sys.argv) > 1
                  else os.environ.get("MELI_TOKEN", "").strip())
        if not _TOKEN:
            raise SystemExit(
                'Falta el token. Usa:  $env:MELI_TOKEN="APP_USR-..."; python script2_reviews.py\n'
                "o:  python script2_reviews.py APP_USR-...")
    return _TOKEN


def log(*a):
    print(*a, flush=True)


def _codigo_pais(valor):
    m = re.match(r"([A-Z]{3})\d", str(valor or ""))
    return m.group(1) if m else None


def es_del_pais(rev):
    """True si la reseña es del país PAIS (descarta otros sitios de Mercado Libre)."""
    for campo in ("routing_key", "secondary_key"):
        cod = _codigo_pais(rev.get(campo))
        if cod and cod != PAIS:
            return False
    ro = rev.get("reviewable_object") or {}
    cod = _codigo_pais(ro.get("id"))
    if cod and cod != PAIS:
        return False
    return True


def api_get(path, params=None):
    h = {"Authorization": f"Bearer {token()}"}
    for intento in range(4):
        if _token_invalido.is_set():
            return None
        try:
            r = requests.get(f"{API}{path}", headers=h, params=params, timeout=30)
        except requests.RequestException:
            time.sleep(0.5 * (intento + 1))
            continue
        if r.status_code == 401:
            _token_invalido.set()
            return None
        if r.status_code == 429:                 # demasiadas peticiones: esperar
            time.sleep(2 * (intento + 1))
            continue
        if r.status_code != 200:
            return None
        try:
            return r.json()
        except ValueError:
            return None
    return None


def descargar_reviews(idproducto):
    filas = []
    offset = 0
    for _ in range(MAX_REVIEW_PAGES):
        data = api_get(f"/reviews/item/{idproducto}",
                       {"limit": REVIEW_LIMIT, "offset": offset})
        if not data:
            break
        reviews = data.get("reviews", [])
        if not reviews:
            break
        for rev in reviews:
            texto = (rev.get("content") or "").strip()
            if not texto or not es_del_pais(rev):
                continue
            filas.append({
                "rating": rev.get("rate"),
                "titulo": (rev.get("title") or "").strip(),
                "resena": texto,
            })
        offset += len(reviews)
        if offset >= data.get("paging", {}).get("total", 0):
            break
        time.sleep(DELAY)
    return filas


def leer_productos(ruta):
    if not os.path.exists(ruta):
        raise SystemExit(f"No existe '{ruta}'. Corre primero el Script 1 (script1_productos.py).")
    d = {}
    with open(ruta, newline="", encoding="utf-8-sig") as f:
        for r in csv.DictReader(f):
            pid = (r.get("idproducto") or "").strip()
            if pid and pid not in d:
                d[pid] = {k: r.get(k, "") for k in
                          ("nombre", "marca", "precio", "moneda", "url", "categoria")}
    return d


def ids_procesados():
    done = set()
    if os.path.exists(SALIDA):
        with open(SALIDA, newline="", encoding="utf-8-sig") as f:
            for r in csv.DictReader(f):
                if r.get("idproducto"):
                    done.add(r["idproducto"])
    if os.path.exists(PROCESADOS):
        with open(PROCESADOS, encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    done.add(line.strip())
    return done


def main():
    token()
    productos = leer_productos(ENTRADA)
    ya = ids_procesados()
    pendientes = [(pid, m) for pid, m in productos.items() if pid not in ya]
    log(f"Productos: {len(productos)} | ya procesados: {len(ya)} | pendientes: {len(pendientes)}")
    if not pendientes:
        log("Nada pendiente; el dataset ya está completo."); return

    nuevo = not os.path.exists(SALIDA)
    f = open(SALIDA, "a", newline="", encoding="utf-8-sig")
    w = csv.DictWriter(f, fieldnames=COLUMNAS)
    if nuevo:
        w.writeheader(); f.flush()
    fp = open(PROCESADOS, "a", encoding="utf-8")

    con_reviews = total_reviews = procesados = 0

    def trabajo(item):
        pid, meta = item
        return pid, meta, descargar_reviews(pid)

    try:
        with ThreadPoolExecutor(max_workers=WORKERS) as ex:
            futs = {ex.submit(trabajo, it): it for it in pendientes}
            for fut in as_completed(futs):
                if _token_invalido.is_set():
                    log("\n*** TOKEN CADUCADO/INVÁLIDO (401). Genera uno nuevo y vuelve a "
                        "correr: continúa solo donde quedó. ***")
                    break
                pid, meta, reviews = fut.result()
                procesados += 1
                with _lock:
                    for rev in reviews:
                        w.writerow({
                            "idproducto": pid, "nombre": meta["nombre"],
                            "marca": meta["marca"], "precio": meta["precio"],
                            "moneda": meta["moneda"], "url": meta["url"],
                            "categoria": meta["categoria"], "rating": rev["rating"],
                            "titulo": rev["titulo"], "resena": rev["resena"],
                        })
                    f.flush()
                    fp.write(pid + "\n"); fp.flush()
                if reviews:
                    con_reviews += 1
                    total_reviews += len(reviews)
                    if len(reviews) >= 10 or con_reviews % 25 == 0:
                        log(f"  [{procesados}/{len(pendientes)}] {pid}: {len(reviews)} "
                            f"| acum: {con_reviews} prod., {total_reviews} reseñas")
                elif procesados % 200 == 0:
                    log(f"  [{procesados}/{len(pendientes)}] ... {con_reviews} prod., "
                        f"{total_reviews} reseñas")
    finally:
        f.close(); fp.close()
        log(f"\nListo (esta corrida). Procesados: {procesados} | con reseñas: {con_reviews} "
            f"| reseñas nuevas: {total_reviews}")
        log(f"Salida: {SALIDA}")


if __name__ == "__main__":
    main()
