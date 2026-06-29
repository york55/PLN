"""
================================================================================
 SCRIPT 1 — Descubrir PRODUCTOS de Mercado Libre (web scraping del listado)
================================================================================
 Genera un CSV con los productos y sus datos:
     idproducto, nombre, marca, precio, moneda, url, categoria

 Requisitos (los instala configurar_entorno.ps1):
     - playwright, beautifulsoup4
     - una ventana de Chrome abierta en "modo control remoto" con sesión iniciada
       en Mercado Libre  ->  ejecuta antes:  configurar_entorno.ps1

 Uso:
     python script1_productos.py
================================================================================
"""
import csv
import os
import re
import sys
import time
import random

from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace", line_buffering=True)
except Exception:
    pass

# ============================== CONFIG ==========================================
PUERTO_CDP = 9222                       # mismo puerto que configurar_entorno.ps1
DOMINIO = "mercadolibre.com.pe"         # país: com.pe (Perú), com.ar, com.mx, ...
SALIDA = "productos.csv"                # archivo de salida (es reanudable)
OBJETIVO = 200000                       # tope de productos únicos (alto = sin tope)
MAX_PAGINAS = 60                        # tope de páginas por categoría

# Categorías a recorrer: ETIQUETA -> término en la URL del listado del país.
# Agrega/quita libremente. Verifica que el término exista en
#   https://listado.<DOMINIO>/<término>
CATEGORIAS = {
    "Celulares": "celulares", "Smartphones": "smartphones",
    "CelularesLiberados": "celulares-liberados",
    "Laptops": "laptops", "Computadoras": "computadoras",
    "PCEscritorio": "computadoras-de-escritorio", "AllInOne": "all-in-one",
    "Tablets": "tablets", "Monitores": "monitores",
    "Procesadores": "procesadores", "TarjetasVideo": "tarjetas-de-video",
    "PlacasMadre": "placas-madre", "MemoriasRAM": "memorias-ram",
    "DiscosSSD": "discos-solidos-ssd", "DiscosDuros": "discos-duros",
    "FuentesPoder": "fuentes-de-poder", "Gabinetes": "gabinetes",
    "Coolers": "coolers-para-cpu",
    "Teclados": "teclados", "Mouse": "mouse",
    "TecladosMecanicos": "teclados-mecanicos", "MouseGamer": "mouse-gamer",
    "Webcams": "webcams", "Microfonos": "microfonos",
    "Impresoras": "impresoras", "Escaneres": "escaneres",
    "Audifonos": "audifonos", "AudifonosInalam": "audifonos-inalambricos",
    "AudifonosGamer": "audifonos-gamer", "Parlantes": "parlantes-bluetooth",
    "ParlantesPortat": "parlantes-portatiles", "BarrasSonido": "barras-de-sonido",
    "HomeTheater": "home-theater",
    "Televisores": "televisores", "SmartTV": "smart-tv",
    "Proyectores": "proyectores", "TVBox": "tv-box",
    "Camaras": "camaras-digitales", "CamarasSeguridad": "camaras-de-seguridad",
    "CamarasDeportivas": "camaras-deportivas",
    "Smartwatches": "smartwatch", "Smartbands": "pulseras-inteligentes",
    "Consolas": "consolas-videojuegos", "Videojuegos": "videojuegos",
    "SillasGamer": "sillas-gamer",
    "Routers": "routers", "RepetidoresWifi": "repetidores-wifi",
    "MemoriasUSB": "memorias-usb", "TarjetasMemoria": "tarjetas-de-memoria",
    "PowerBanks": "power-banks", "UPS": "ups", "Drones": "drones",
    "Ereaders": "lectores-de-ebooks",
}

# Lista de marcas para deducir la marca desde el título (el listado no la trae).
MARCAS = [
    "Samsung", "Apple", "Xiaomi", "Redmi", "Poco", "Motorola", "Moto", "Huawei",
    "Honor", "Realme", "Oppo", "Vivo", "Nokia", "Tecno", "Infinix", "ZTE", "TCL",
    "Cubot", "OnePlus", "Google Pixel", "Pixel", "LG", "Sony", "Bose", "JBL",
    "Marshall", "Sennheiser", "Logitech", "Razer", "Corsair", "HyperX",
    "SteelSeries", "HP", "Lenovo", "Dell", "Asus", "Acer", "MSI", "Gigabyte",
    "Toshiba", "Microsoft", "Intel", "AMD", "Nvidia", "Kingston", "Adata",
    "Crucial", "Western Digital", "Seagate", "Sandisk", "Epson", "Canon", "Nikon",
    "Brother", "GoPro", "DJI", "Anker", "Belkin", "TP-Link", "Tp Link", "Tplink",
    "Mercusys", "Netgear", "D-Link", "Philips", "Panasonic", "Hisense", "Caixun",
    "Miray", "Teros", "Micronics", "Antryx", "Vorago", "Halion", "Garmin",
    "Amazfit", "Fitbit", "Huion", "Wacom", "Pioneer", "Edifier", "Klipsch",
    "Yamaha", "Starlink", "Nintendo", "PlayStation", "Xbox", "Meta", "Oculus",
    "Ugreen", "Baseus", "Kanji", "Advance", "Stylos",
]
# ===============================================================================

CDP_URL = f"http://127.0.0.1:{PUERTO_CDP}"
BASE = f"https://listado.{DOMINIO}"
MARCAS_RE = sorted(MARCAS, key=len, reverse=True)
COLS = ["idproducto", "nombre", "marca", "precio", "moneda", "url", "categoria"]


def log(*a):
    print(*a, flush=True)


def marca_de_titulo(titulo):
    t = (titulo or "").lower()
    for m in MARCAS_RE:
        if re.search(r"\b" + re.escape(m.lower()) + r"\b", t):
            return m
    return ""


def itemid_de_href(href):
    m = re.search(r"wid=(MPE\d+|ML[A-Z]\d+)", href)
    if m:
        return m.group(1)
    m = re.search(r"item_id[:%A-Za-z0-9]*?(MPE\d+|ML[A-Z]\d+)", href)
    if m:
        return m.group(1)
    m = re.search(r"/p/(MPE\d+|ML[A-Z]\d+)", href)
    return m.group(1) if m else None


def articulo_url(itemid):
    # itemid tipo MPE123 / MLA123 -> https://articulo.<dominio>/MPE-123
    m = re.match(r"([A-Z]{3})(\d+)", itemid)
    return f"https://articulo.{DOMINIO}/{m.group(1)}-{m.group(2)}" if m else ""


def extraer_cards(html):
    out = {}
    soup = BeautifulSoup(html, "html.parser")
    for card in soup.select("div.poly-card"):
        a = card.select_one("h3.poly-component__title-wrapper > a, a.poly-component__title")
        if not a:
            continue
        href = a.get("href", "")
        nombre = a.get_text(strip=True)
        iid = itemid_de_href(href) if href else None
        if not iid or not nombre or iid in out:
            continue
        precio, moneda = "", ""
        money = (card.select_one(".poly-price__current .andes-money-amount")
                 or card.select_one(".andes-money-amount"))
        if money:
            aria = money.get("aria-label", "")
            mt = re.search(r"([\d.,]+)\s*(soles|d[oó]lares|sol|d[oó]lar|pesos?)", aria, re.I)
            if mt:
                precio = mt.group(1)
                u = mt.group(2).lower()
                moneda = "USD" if "dol" in u or "dól" in u else ("PEN" if "sol" in u else "")
            else:
                precio = money.get_text(strip=True)
        out[iid] = (nombre, marca_de_titulo(nombre), precio, moneda, articulo_url(iid))
    return out


def bloqueada(page):
    try:
        body = page.inner_text("body")[:300].lower()
    except Exception:
        return True
    if "ingresa a" in body and "tu cuenta" in body:
        return True
    html = page.content()
    return "poly-component__title" not in html and "/p/" not in html


def hay_acceso(page):
    try:
        page.goto(f"{BASE}/celulares", wait_until="domcontentloaded", timeout=40000)
        time.sleep(3)
    except Exception:
        return False
    return not bloqueada(page)


def main():
    vistos = set()
    if os.path.exists(SALIDA):
        with open(SALIDA, newline="", encoding="utf-8-sig") as f:
            for row in csv.DictReader(f):
                if row.get("idproducto"):
                    vistos.add(row["idproducto"])
        log(f"Reanudando: {len(vistos)} productos ya en '{SALIDA}'.")

    nuevo = not os.path.exists(SALIDA)
    f = open(SALIDA, "a", newline="", encoding="utf-8-sig")
    w = csv.DictWriter(f, fieldnames=COLS)
    if nuevo:
        w.writeheader(); f.flush()

    with sync_playwright() as pw:
        try:
            browser = pw.chromium.connect_over_cdp(CDP_URL)
        except Exception as e:
            f.close()
            raise SystemExit(
                f"No hay Chrome en {CDP_URL} ({str(e)[:60]}).\n"
                "Ejecuta primero:  powershell -ExecutionPolicy Bypass -File configurar_entorno.ps1")
        ctx = browser.contexts[0]
        page = ctx.new_page()
        if not hay_acceso(page):
            f.close()
            raise SystemExit(
                "El listado pide iniciar sesión. Inicia sesión en Mercado Libre en\n"
                "la ventana de Chrome abierta por configurar_entorno.ps1 y reintenta.")
        log("Acceso OK. Recolectando productos...")

        try:
            for cat, term in CATEGORIAS.items():
                log(f"\n[{cat}] {BASE}/{term}")
                try:
                    page.goto(f"{BASE}/{term}", wait_until="domcontentloaded", timeout=40000)
                except Exception:
                    continue
                sin_nuevos = 0
                for pagina in range(MAX_PAGINAS):
                    time.sleep(random.uniform(1.5, 3.0))
                    if bloqueada(page):
                        time.sleep(20)
                        if not hay_acceso(page):
                            break
                        continue
                    cards = extraer_cards(page.content())
                    nuevos = 0
                    for iid, (nombre, marca, precio, moneda, url) in cards.items():
                        if iid not in vistos:
                            vistos.add(iid); nuevos += 1
                            w.writerow({"idproducto": iid, "nombre": nombre,
                                        "marca": marca, "precio": precio,
                                        "moneda": moneda, "url": url, "categoria": cat})
                    f.flush()
                    log(f"  pág {pagina+1}: {len(cards)} en página, {nuevos} nuevos "
                        f"| total {len(vistos)}")
                    if len(vistos) >= OBJETIVO:
                        log(f"\nObjetivo de {OBJETIVO} alcanzado."); return
                    sin_nuevos = sin_nuevos + 1 if nuevos == 0 else 0
                    if sin_nuevos >= 2:
                        break
                    try:
                        btn = page.locator('a[title="Siguiente"]').first
                        clase = (btn.locator("xpath=ancestor::li[1]")
                                 .get_attribute("class", timeout=2000) or "")
                        if "disabled" in clase:
                            break
                        btn.scroll_into_view_if_needed(timeout=3000)
                        btn.click(timeout=5000)
                        page.wait_for_load_state("domcontentloaded", timeout=25000)
                    except Exception:
                        break
        finally:
            f.close()
            try:
                page.close()
            except Exception:
                pass
            log(f"\nListo. {len(vistos)} productos en '{SALIDA}'.")


if __name__ == "__main__":
    main()
