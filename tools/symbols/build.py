#!/usr/bin/env python3
"""Build apps/symbols/data/symbols.json.

Every symbol is drawn on a 120x80 viewBox with the graphical forms of
CSN EN 60617 / IEC 60617 (schematic symbols) and CSN EN 60617-11 /
CSN 01 3411 (installation drawings).  Strokes use currentColor so the
page can theme them; nothing here depends on a font beyond the labels.
"""
import json
import os

W, H = 120, 80
CX, CY = 60, 40

# ---------------------------------------------------------------- primitives

def line(x1, y1, x2, y2, w=2):
    return f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke-width="{w}"/>'

def rect(x, y, w, h, rx=0, fill="none", sw=2):
    r = f' rx="{rx}"' if rx else ''
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}"{r} fill="{fill}" stroke-width="{sw}"/>'

def circ(cx, cy, r, fill="none", sw=2):
    return f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{fill}" stroke-width="{sw}"/>'

def dot(cx, cy, r=3):
    return f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="currentColor" stroke="none"/>'

def path(d, fill="none", sw=2):
    return f'<path d="{d}" fill="{fill}" stroke-width="{sw}"/>'

def text(x, y, s, size=12, anchor="middle"):
    return (f'<text x="{x}" y="{y}" font-size="{size}" text-anchor="{anchor}" '
            f'font-family="Helvetica,Arial,sans-serif" fill="currentColor" stroke="none">{s}</text>')

def g(*parts):
    return "".join(p for p in parts if p)

SYMBOLS = []
SEEN = set()

def add(sid, cat, en, cs, svg, ref="", kw_en="", kw_cs=""):
    assert sid not in SEEN, f"duplicate id {sid}"
    SEEN.add(sid)
    SYMBOLS.append({
        "id": sid, "cat": cat,
        "name": {"en": en, "cs": cs},
        "kw": {"en": kw_en, "cs": kw_cs},
        "ref": ref,
        "svg": svg,
    })

# ---------------------------------------------------------------- 1. sockets
# CSN EN 60617-11: socket outlet = semicircle on the wall/conductor line with a
# stem; the number of outlets is given by strokes across the stem, an earthing
# contact by the stem continuing through the half disc.

WALL = line(20, 50, 100, 50)
ARC = path("M 34 50 A 26 26 0 0 1 86 50")
STEM = line(60, 50, 60, 70)

def socket(gang=1, earth=True, filled=False, label=None, extra="", sub=None):
    body = [WALL, path("M 34 50 A 26 26 0 0 1 86 50", fill="currentColor" if filled else "none"), STEM]
    if earth:
        body.append(line(60, 50, 60, 27))
    if gang > 1:
        for i in range(gang):
            y = 56 + i * 5
            body.append(line(50, y, 70, y))
    if label:
        body.append(text(60, 22, label, 13))
    if sub:
        body.append(text(60, 78, sub, 11))
    body.append(extra)
    return g(*body)

S = "sockets"
add("sock-1", S, "Socket outlet, 1-gang", "Zásuvka jednonásobná", socket(1),
    "IEC 60617-11-02-04", "socket outlet plug receptacle 230V", "zásuvka jednoduchá vývod 230V")
add("sock-2", S, "Socket outlet, 2-gang", "Zásuvka dvojnásobná", socket(2),
    "IEC 60617-11-02-05", "double socket twin outlet", "dvojzásuvka dvojitá")
add("sock-3", S, "Socket outlet, 3-gang", "Zásuvka trojnásobná", socket(3),
    "IEC 60617-11-02-05", "triple socket three outlets", "trojzásuvka")
add("sock-4", S, "Socket outlet, 4-gang", "Zásuvka čtyřnásobná", socket(4),
    "IEC 60617-11-02-05", "quad socket four outlets", "čtyřzásuvka")
add("sock-noearth", S, "Socket outlet without protective contact",
    "Zásuvka bez ochranného kontaktu", socket(1, earth=False),
    "IEC 60617-11-02-04", "unearthed socket class II", "neuzemněná zásuvka bez kolíku")
add("sock-earth", S, "Socket outlet with protective contact",
    "Zásuvka s ochranným kontaktem", socket(1),
    "IEC 60617-11-02-04", "earthed socket PE schuko", "zásuvka s kolíkem PE ochranný")
add("sock-shutter", S, "Socket outlet with shutters", "Zásuvka s clonkami",
    socket(1, sub="clonky"), "", "child protection shuttered safety socket", "dětská pojistka clonky bezpečnostní")
add("sock-switched", S, "Socket outlet with interlocked switch",
    "Zásuvka s blokovaným vypínačem", socket(1, extra=g(line(72, 50, 88, 36), dot(72, 50))),
    "IEC 60617-11-02-07", "switched socket interlock", "spínaná zásuvka blokování")
add("sock-ip44", S, "Socket outlet IP44 (splashproof)", "Zásuvka IP44 (odolná stříkající vodě)",
    socket(1, label="IP44"), "", "outdoor weatherproof bathroom IP44", "venkovní do vlhka koupelna IP44")
add("sock-ip65", S, "Socket outlet IP65 (jetproof)", "Zásuvka IP65 (odolná tryskající vodě)",
    socket(1, label="IP65"), "", "outdoor washdown IP65", "venkovní IP65 tryskající voda")
add("sock-16a", S, "Socket outlet 16 A / 230 V", "Zásuvka 16 A / 230 V",
    socket(1, sub="16 A"), "", "16A rated socket", "16A jmenovitý proud")
add("sock-10a", S, "Socket outlet 10 A / 230 V", "Zásuvka 10 A / 230 V",
    socket(1, sub="10 A"), "", "10A socket", "10A zásuvka")
add("sock-3ph-16", S, "Three-phase socket 16 A / 400 V", "Zásuvka třífázová 16 A / 400 V",
    socket(1, label="3~", sub="16 A"), "", "three phase 400V industrial CEE 5-pin",
    "třífázová 400V průmyslová CEE pětikolík")
add("sock-3ph-32", S, "Three-phase socket 32 A / 400 V", "Zásuvka třífázová 32 A / 400 V",
    socket(1, label="3~", sub="32 A"), "", "three phase 32A cooker CEE", "třífázová 32A sporák CEE")
add("sock-cee", S, "Industrial socket (CEE)", "Zásuvka průmyslová (CEE)",
    socket(1, label="CEE"), "", "industrial IEC 60309 blue red", "průmyslová IEC 60309 modrá červená")
add("sock-flush", S, "Flush-mounted socket outlet", "Zásuvka zapuštěná (pod omítku)",
    socket(1), "IEC 60617-11-02-04", "flush recessed in wall", "pod omítku zapuštěná do zdi")
add("sock-surface", S, "Surface-mounted socket outlet", "Zásuvka na omítku",
    socket(1, extra=line(20, 56, 100, 56)), "", "surface mounted on wall", "na omítku povrchová")
add("sock-floor", S, "Floor socket outlet", "Zásuvka podlahová",
    socket(1, extra=rect(28, 44, 64, 24)), "", "floor box underfloor", "podlahová krabice v podlaze")
add("sock-multimedia", S, "Multimedia / data outlet", "Zásuvka datová (multimediální)",
    socket(1, label="RJ"), "", "data RJ45 ethernet network outlet", "datová RJ45 síťová internet")
add("sock-tv", S, "TV / radio aerial outlet", "Zásuvka televizní (anténní)",
    socket(1, label="TV"), "", "antenna coaxial TV SAT", "anténní koaxiální TV SAT")
add("sock-phone", S, "Telephone outlet", "Zásuvka telefonní",
    socket(1, label="TF"), "", "telephone RJ11 outlet", "telefonní RJ11")
add("sock-usb", S, "Socket outlet with USB charger", "Zásuvka s USB nabíječkou",
    socket(1, label="USB"), "", "USB charging outlet", "USB nabíjecí zásuvka")
add("sock-emergency", S, "Socket outlet on essential (UPS) supply",
    "Zásuvka na zálohovaném napájení (UPS)", socket(1, filled=True),
    "", "UPS backed essential circuit orange", "záložní okruh UPS nouzová")
add("sock-clean", S, "Socket outlet on clean earth circuit", "Zásuvka s odděleným zemněním",
    socket(1, label="CE"), "", "clean earth IT equipment", "oddělená zem IT technika")
add("sock-iso", S, "Socket outlet from isolating transformer",
    "Zásuvka z oddělovacího transformátoru", socket(1, label="sep."),
    "", "isolated supply shaver bathroom", "oddělené napájení holicí strojek koupelna")
add("sock-block", S, "Socket outlet block (trunking)", "Zásuvkový blok (parapetní kanál)",
    g(rect(18, 34, 84, 26), socket(1)), "", "trunking block bench desk", "parapetní kanál blok pracovní deska")
add("sock-plug", S, "Plug (male connector)", "Vidlice (zástrčka)",
    g(line(20, 50, 46, 50), path("M 46 30 A 20 20 0 0 0 46 70", fill="currentColor"), line(46, 50, 100, 50)),
    "IEC 60617-11-02-01", "plug male connector", "vidlice zástrčka kolík")
add("sock-connector", S, "Connector (female)", "Zásuvková spojka (zásuvková část)",
    g(line(20, 50, 46, 50), path("M 46 30 A 20 20 0 0 1 46 70"), line(66, 50, 100, 50)),
    "IEC 60617-11-02-02", "coupler female connector", "spojka zásuvková část")
add("sock-plugconn", S, "Plug and socket connection", "Vidlice se zásuvkou (rozpojitelný spoj)",
    g(line(14, 50, 44, 50), path("M 44 32 A 18 18 0 0 0 44 68", fill="currentColor"),
      path("M 50 32 A 18 18 0 0 1 50 68"), line(68, 50, 106, 50)),
    "IEC 60617-11-02-03", "plug and socket pluggable connection", "rozpojitelný spoj vidlice zásuvka")
add("sock-appliance", S, "Appliance connection outlet", "Vývod pro pevné připojení spotřebiče",
    g(WALL, circ(60, 50, 16), line(60, 50, 60, 70), dot(60, 50, 3)),
    "IEC 60617-11-02-08", "fixed appliance connection unit", "pevný vývod připojení spotřebiče")
add("sock-cooker", S, "Cooker connection unit", "Vývod pro sporák",
    g(WALL, circ(60, 50, 16), line(60, 50, 60, 70), text(60, 26, "El. sporák", 11)),
    "", "cooker hob oven connection 400V", "sporák varná deska trouba 400V")
add("sock-boiler", S, "Water heater connection", "Vývod pro ohřívač vody",
    g(WALL, circ(60, 50, 16), line(60, 50, 60, 70), text(60, 26, "Boiler", 11)),
    "", "water heater boiler DHW", "bojler ohřívač TUV")
add("sock-ev", S, "EV charging point", "Nabíjecí bod pro elektromobil",
    g(rect(40, 18, 40, 46, rx=4), line(60, 64, 60, 72), text(60, 46, "EV", 16)),
    "", "wallbox electric vehicle charger", "wallbox nabíječka elektromobil")
add("sock-outdoor-post", S, "Outdoor socket pillar", "Zahradní zásuvkový sloupek",
    g(rect(46, 16, 28, 48, rx=4), socket(1), line(20, 64, 100, 64)),
    "", "garden pillar outdoor post", "zahradní sloupek venkovní")

# --------------------------------------------------------------- 2. switches
# CSN EN 60617-11: switch = filled dot with an operating stem.

def switch(stems=1, label=None, extra="", dotfill=True, sub=None):
    parts = [dot(40, 58, 4) if dotfill else circ(40, 58, 4)]
    for i in range(stems):
        dy = i * 11
        parts.append(line(40, 58 - dy, 74, 34 - dy))
        parts.append(line(74, 34 - dy, 82, 42 - dy))
    if label:
        parts.append(text(88, 66, label, 13, "middle"))
    if sub:
        parts.append(text(60, 78, sub, 11))
    parts.append(extra)
    return g(*parts)

V = "switches"
add("sw-1way", V, "Switch, one-way (SPST)", "Vypínač jednopólový (řazení 1)", switch(1),
    "IEC 60617-11-03-01", "single pole light switch one way", "jednopólový spínač řazení 1")
add("sw-2gang", V, "Switch, 2-gang", "Vypínač dvojitý (řazení 5)", switch(2),
    "IEC 60617-11-03-02", "two gang double switch series", "dvojitý sériový lustrový řazení 5")
add("sw-3gang", V, "Switch, 3-gang", "Vypínač trojitý", switch(3),
    "IEC 60617-11-03-02", "three gang triple switch", "trojitý spínač")
add("sw-2pole", V, "Switch, double-pole (2P)", "Vypínač dvoupólový (řazení 2)",
    g(switch(1), line(46, 62, 80, 38)), "IEC 60617-11-03-03", "double pole 2P isolating switch",
    "dvoupólový řazení 2 odpojovací")
add("sw-3pole", V, "Switch, three-pole (3P)", "Vypínač třípólový",
    g(switch(1), line(46, 62, 80, 38), line(52, 66, 86, 42)), "", "three pole 3P switch", "třípólový spínač")
add("sw-2way", V, "Two-way switch (SPDT)", "Přepínač střídavý (řazení 6)",
    g(dot(40, 58, 4), line(40, 58, 74, 34), line(74, 34, 82, 42), line(74, 44, 84, 50)),
    "IEC 60617-11-03-04", "two way SPDT staircase switch", "střídavý přepínač schodišťový řazení 6")
add("sw-2way-2gang", V, "Two-way switch, 2-gang", "Přepínač střídavý dvojitý",
    g(dot(40, 58, 4), line(40, 58, 74, 34), line(74, 34, 82, 42), line(74, 44, 84, 50),
      line(40, 47, 74, 23), line(74, 23, 82, 31), line(74, 33, 84, 39)),
    "", "double two way", "dvojitý střídavý")
add("sw-inter", V, "Intermediate (crossover) switch", "Přepínač křížový (řazení 7)",
    g(dot(40, 58, 4), line(40, 58, 74, 34), line(74, 34, 84, 42), line(74, 44, 84, 52), line(56, 46, 64, 54)),
    "IEC 60617-11-03-05", "intermediate crossover four way", "křížový přepínač řazení 7")
add("sw-serial", V, "Series switch (two circuits)", "Vypínač sériový (lustrový)",
    switch(2), "IEC 60617-11-03-02", "series lustre switch two lamps", "lustrový sériový dvě světla")
add("sw-push", V, "Push button", "Tlačítko",
    g(dot(40, 58, 4), line(40, 58, 74, 34), line(74, 34, 82, 42), line(60, 40, 66, 28), dot(63, 28, 3)),
    "IEC 60617-11-03-06", "momentary push button bell", "tlačítko impulzní zvonkové")
add("sw-push-ind", V, "Push button with indicator lamp", "Tlačítko s doutnavkou",
    g(switch(1), circ(96, 58, 8), line(90, 52, 102, 64), line(102, 52, 90, 64)),
    "", "illuminated push button orientation", "prosvětlené tlačítko orientační doutnavka")
add("sw-pull", V, "Pull-cord switch", "Vypínač šňůrový (tahový)",
    g(switch(1), line(40, 58, 40, 74), dot(40, 74, 3)),
    "IEC 60617-11-03-07", "pull cord ceiling bathroom", "šňůrový tahový koupelna")
add("sw-dim", V, "Dimmer switch", "Stmívač",
    g(switch(1), path("M 30 70 L 50 70 L 50 62 Z", fill="currentColor")),
    "IEC 60617-11-03-08", "dimmer light regulator", "stmívač regulátor světla")
add("sw-dim-rot", V, "Rotary dimmer", "Stmívač otočný",
    g(circ(52, 48, 20), line(52, 48, 66, 34), text(52, 78, "0 – 100 %", 11)),
    "", "rotary dimmer knob", "otočný stmívač knoflík")
add("sw-time", V, "Time switch (staircase timer)", "Spínač časový (schodišťový automat)",
    g(switch(1), circ(96, 56, 12), line(96, 56, 96, 48), line(96, 56, 103, 59)),
    "IEC 60617-11-03-09", "timer staircase automat delay", "časový schodišťový automat zpoždění")
add("sw-motion", V, "Movement / presence detector switch", "Spínač s čidlem pohybu",
    g(switch(1), path("M 88 46 A 14 14 0 0 1 88 68"), path("M 96 40 A 22 22 0 0 1 96 74")),
    "", "PIR movement presence sensor", "PIR pohybové čidlo přítomnost")
add("sw-key", V, "Key-operated switch", "Vypínač s klíčem",
    g(switch(1), circ(40, 70, 6), line(40, 76, 40, 80)), "", "key switch lock", "klíčový spínač zámek")
add("sw-ind", V, "Switch with pilot lamp", "Vypínač s kontrolkou",
    g(switch(1), circ(96, 58, 8), line(88, 58, 104, 58), line(96, 50, 96, 66)),
    "IEC 60617-11-03-10", "illuminated switch pilot lamp", "vypínač s kontrolkou signalizace")
add("sw-ip44", V, "Switch IP44", "Vypínač IP44", switch(1, sub="IP44"),
    "", "splashproof switch bathroom outdoor", "vypínač do vlhka koupelna venkovní")
add("sw-surface", V, "Surface-mounted switch", "Vypínač na omítku",
    g(switch(1), rect(24, 44, 40, 28)), "", "surface switch", "na omítku")
add("sw-cord", V, "Cord switch (appliance)", "Spínač na přívodní šňůře",
    g(line(16, 58, 40, 58), switch(1), line(82, 42, 104, 42)), "", "inline cord switch", "šňůrový spínač spotřebiče")
add("sw-emergency", V, "Emergency stop (mushroom)", "Tlačítko nouzového zastavení (Total stop)",
    g(circ(60, 46, 20), path("M 44 46 A 16 16 0 0 1 76 46", fill="currentColor"), line(60, 66, 60, 74),
      text(60, 20, "STOP", 12)), "", "emergency stop mushroom central stop", "central stop nouzové zastavení hřib")
add("sw-cent-stop", V, "Central off / total stop button", "Tlačítko Central STOP",
    g(rect(34, 22, 52, 40, rx=4), text(60, 48, "C-STOP", 12), line(60, 62, 60, 74)),
    "", "central stop fire switch", "central stop požární vypínač")
add("sw-contactor-btn", V, "Impulse relay push button", "Tlačítko pro impulzní relé",
    g(switch(1), text(96, 66, "I", 14)), "", "impulse relay latching button", "impulzní relé bistabilní")
add("sw-changeover", V, "Changeover switch (manual transfer)", "Přepínač sítě / zdroje (ruční)",
    g(dot(40, 58, 4), line(40, 58, 74, 34), line(74, 30, 90, 30), line(74, 46, 90, 46), text(20, 62, "0-1-2", 11, "start")),
    "", "transfer changeover network generator", "přepínač síť generátor přepínání")
add("sw-rotary", V, "Rotary cam switch", "Vačkový (otočný) přepínač",
    g(circ(60, 42, 20), line(60, 42, 76, 30), line(60, 62, 60, 72), text(60, 78, "0-1-2", 11)),
    "", "cam rotary selector", "vačkový otočný přepínač volič")
add("sw-limit", V, "Limit switch", "Koncový spínač",
    g(line(20, 58, 40, 58), dot(40, 58, 3), line(40, 58, 72, 40), line(72, 58, 100, 58), dot(72, 58, 3),
      rect(52, 22, 16, 10)), "IEC 60617-07-08-01", "limit position switch", "koncový polohový spínač")
add("sw-float", V, "Float switch", "Plovákový spínač",
    g(line(20, 46, 40, 46), dot(40, 46, 3), line(40, 46, 72, 28), line(72, 46, 100, 46), dot(72, 46, 3),
      path("M 46 62 q 10 -8 20 0 t 20 0"), circ(60, 56, 6)),
    "IEC 60617-07-08-05", "float level switch tank", "plovákový hladinový spínač nádrž")
add("sw-thermostat", V, "Thermostat", "Termostat",
    g(rect(30, 26, 60, 34, rx=3), text(60, 50, "θ", 20), line(60, 60, 60, 72)),
    "IEC 60617-07-08-03", "thermostat temperature control heating", "termostat teplota regulace topení")
add("sw-humidistat", V, "Humidistat", "Hygrostat",
    g(rect(30, 26, 60, 34, rx=3), text(60, 50, "%rH", 15), line(60, 60, 60, 72)),
    "", "humidity sensor bathroom fan", "vlhkost čidlo ventilátor koupelna")
add("sw-daylight", V, "Daylight (photocell) switch", "Soumrakový spínač",
    g(rect(34, 26, 52, 34, rx=3), circ(60, 43, 9), line(60, 26, 60, 18), line(76, 30, 82, 24),
      line(44, 30, 38, 24), line(60, 60, 60, 72)),
    "", "photocell dusk dawn light sensor", "soumrakový spínač fotobuňka")
add("sw-isolator", V, "Isolating switch (disconnector)", "Odpínač (odpojovač)",
    g(line(60, 8, 60, 26), dot(60, 26), line(60, 26, 84, 50), dot(60, 60), line(60, 60, 60, 76),
      line(50, 56, 70, 56)), "IEC 60617-07-13-02", "isolator disconnector main switch",
    "odpínač odpojovač hlavní vypínač")
add("sw-main", V, "Main switch", "Hlavní vypínač",
    g(rect(28, 16, 64, 48, rx=4), line(60, 8, 60, 16), line(60, 64, 60, 76), line(44, 28, 44, 52),
      line(44, 28, 76, 52), text(60, 74, "", 10)), "", "main isolator board incomer",
    "hlavní vypínač rozvaděč přívod")

# --------------------------------------------------------------- 3. lighting
L = "lighting"
LUM = g(circ(60, 40, 18), line(47, 27, 73, 53), line(73, 27, 47, 53))

def lum(label=None, extra="", sub=None):
    parts = [LUM]
    if label:
        parts.append(text(60, 16, label, 13))
    if sub:
        parts.append(text(60, 76, sub, 11))
    parts.append(extra)
    return g(*parts)

def tube(n=1, label=None, emerg=False, sub=None):
    parts = [line(16, 40, 104, 40, 2)]
    parts.append(rect(28, 32, 64, 16, fill="currentColor" if emerg else "none"))
    for i in range(1, n):
        parts.append(line(28, 32 + i * (16 / (n)), 92, 32 + i * (16 / n), 1.4))
    if label:
        parts.append(text(60, 20, label, 13))
    if sub:
        parts.append(text(60, 70, sub, 11))
    return g(*parts)

add("lum-general", L, "Luminaire (general symbol)", "Svítidlo (obecná značka)", lum(),
    "IEC 60617-11-04-01", "lamp light luminaire point", "svítidlo světlo osvětlení bod")
add("lum-ceiling", L, "Ceiling luminaire", "Svítidlo stropní", lum(extra=line(16, 12, 104, 12)),
    "", "ceiling light", "stropní svítidlo strop")
add("lum-wall", L, "Wall luminaire (bracket)", "Svítidlo nástěnné",
    g(LUM, line(24, 12, 24, 68), line(24, 40, 42, 40)),
    "IEC 60617-11-04-02", "wall bracket sconce", "nástěnné svítidlo konzola")
add("lum-pendant", L, "Pendant luminaire", "Svítidlo závěsné",
    g(line(60, 8, 60, 22), LUM, line(16, 8, 104, 8)), "", "pendant suspended chandelier", "závěsné lustr")
add("lum-recessed", L, "Recessed (downlight) luminaire", "Svítidlo vestavné (podhledové)",
    g(LUM, rect(34, 14, 52, 52, rx=4)), "", "downlight recessed spot", "vestavné podhledové bodové")
add("lum-spot", L, "Spotlight", "Svítidlo bodové (reflektor)",
    g(circ(60, 34, 14), path("M 40 62 L 60 44 L 80 62"), line(60, 20, 60, 8)),
    "IEC 60617-11-04-06", "spot projector floodlight", "bodovka reflektor")
add("lum-flood", L, "Floodlight", "Svítidlo reflektorové (venkovní)",
    g(circ(56, 40, 14), path("M 70 26 L 100 14 M 70 40 L 104 40 M 70 54 L 100 66"), line(42, 40, 20, 40)),
    "IEC 60617-11-04-07", "floodlight outdoor projector", "reflektor venkovní osvětlení")
add("lum-fluor-1", L, "Fluorescent / LED batten, 1 lamp", "Zářivkové (LED) svítidlo, 1 trubice", tube(1),
    "IEC 60617-11-04-03", "fluorescent tube batten LED linear", "zářivka trubice lineární LED")
add("lum-fluor-2", L, "Fluorescent luminaire, 2 lamps", "Zářivkové svítidlo, 2 trubice", tube(2),
    "IEC 60617-11-04-04", "twin tube fluorescent", "dvoutrubicové zářivkové")
add("lum-fluor-3", L, "Fluorescent luminaire, 3 lamps", "Zářivkové svítidlo, 3 trubice", tube(3),
    "", "three tube fluorescent", "třítrubicové zářivkové")
add("lum-fluor-4", L, "Fluorescent luminaire, 4 lamps", "Zářivkové svítidlo, 4 trubice", tube(4),
    "", "four tube fluorescent panel", "čtyřtrubicové zářivkové panel")
add("lum-panel", L, "LED panel", "LED panel",
    g(rect(20, 22, 80, 36), text(60, 46, "LED", 15)), "", "LED panel office 600x600", "LED panel kancelář")
add("lum-strip", L, "LED strip", "LED pásek",
    g(line(12, 40, 108, 40), *[rect(20 + i * 18, 34, 10, 12, fill="currentColor") for i in range(5)]),
    "", "LED strip tape cove", "LED pásek podsvícení")
add("lum-emerg", L, "Emergency luminaire (maintained)", "Nouzové svítidlo (trvale svítící)",
    g(LUM, text(60, 74, "NO", 12), path("M 42 22 A 18 18 0 0 1 78 22", fill="currentColor")),
    "IEC 60617-11-04-08", "emergency lighting maintained", "nouzové osvětlení trvale")
add("lum-emerg-nm", L, "Emergency luminaire (non-maintained)", "Nouzové svítidlo (nepřetržité při výpadku)",
    g(LUM, text(60, 74, "NO/NM", 11)), "", "emergency non maintained battery", "nouzové při výpadku baterie")
add("lum-exit", L, "Exit sign luminaire", "Nouzový únikový piktogram",
    g(rect(24, 26, 72, 30), text(60, 47, "EXIT", 16), line(60, 56, 60, 70)),
    "", "exit sign escape route", "únikový východ piktogram")
add("lum-emerg-tube", L, "Emergency batten luminaire", "Nouzové zářivkové svítidlo", tube(1, emerg=True),
    "", "emergency batten", "nouzová zářivka")
add("lum-lamp", L, "Lamp (signal / indicating)", "Svítidlo signální (návěstní)",
    g(circ(60, 40, 18), line(42, 22, 78, 58), line(78, 22, 42, 58), line(60, 58, 60, 74)),
    "IEC 60617-08-10-01", "indicator lamp signal light", "signálka kontrolka návěstní")
add("lum-flash", L, "Flashing lamp / beacon", "Svítidlo výstražné (blikající)",
    g(circ(60, 40, 16), path("M 62 30 L 54 42 L 60 42 L 56 52 L 68 38 L 62 38 Z", fill="currentColor"),
      line(60, 56, 60, 72)), "IEC 60617-08-10-05", "beacon flashing warning strobe", "maják blikající výstražný")
add("lum-siren", L, "Sounder / siren", "Siréna (akustická signalizace)",
    g(path("M 34 30 L 34 50 L 56 62 L 56 18 Z"), path("M 66 28 A 16 16 0 0 1 66 52"),
      path("M 76 20 A 26 26 0 0 1 76 60")), "IEC 60617-08-10-08", "siren horn sounder alarm",
    "siréna houkačka poplach")
add("lum-track", L, "Track lighting", "Lištový systém osvětlení",
    g(line(14, 30, 106, 30, 3), *[g(line(30 + i * 28, 30, 30 + i * 28, 44), circ(30 + i * 28, 52, 8)) for i in range(3)]),
    "", "track spotlight rail", "lišta bodová kolejnice")
add("lum-group", L, "Group of luminaires (n lamps)", "Skupina svítidel (n zdrojů)",
    g(LUM, text(96, 32, "n", 15)), "", "group multiple lamps", "skupina více svítidel")
add("lum-switched-part", L, "Luminaire, part switched separately", "Svítidlo s odděleně spínanou částí",
    g(LUM, line(78, 40, 100, 40), line(88, 40, 96, 30)), "", "partly switched luminaire", "část spínaná odděleně")
add("lum-lamp-holder", L, "Lampholder / ceiling rose outlet", "Vývod pro svítidlo (svorkovnice)",
    g(circ(60, 40, 16), line(60, 24, 60, 8), text(60, 46, "×", 22)),
    "", "ceiling rose outlet lamp point", "vývod svítidlo svorkovnice strop")
add("lum-fan", L, "Ceiling fan (with light)", "Stropní ventilátor se světlem",
    g(circ(60, 40, 10), path("M 60 40 L 24 30 A 20 20 0 0 1 50 26 Z", fill="currentColor"),
      path("M 60 40 L 96 50 A 20 20 0 0 1 70 54 Z", fill="currentColor")),
    "", "ceiling fan ventilator", "stropní ventilátor")
add("lum-street", L, "Street lighting point", "Bod veřejného osvětlení",
    g(line(30, 72, 30, 20), path("M 30 20 q 0 -10 14 -10 h 16"), LUM.replace('cx="60" cy="40"', 'cx="76" cy="26"')
      if False else g(circ(70, 18, 8))), "", "street light column public", "veřejné osvětlení stožár")
add("lum-obstruct", L, "Obstruction light", "Překážkové návěstní světlo",
    g(circ(60, 40, 14, fill="currentColor"), path("M 38 40 A 22 22 0 0 1 82 40"), line(60, 54, 60, 72)),
    "", "obstruction aviation light", "překážkové světlo")
add("lum-uv", L, "UV / germicidal luminaire", "Zářič UV (germicidní)",
    g(rect(28, 32, 64, 16), text(60, 22, "UV", 13), line(16, 40, 28, 40), line(92, 40, 104, 40)),
    "", "UV germicidal lamp", "UV zářič germicidní")
add("lum-ir", L, "Infra-red heater", "Infrazářič",
    g(rect(28, 32, 64, 16), text(60, 22, "IR", 13), line(16, 40, 28, 40), line(92, 40, 104, 40)),
    "", "infrared heater patio", "infrazářič topení terasa")

# ------------------------------------------------------- 4. protection
P = "protection"

def modular(inner, label=None, poles=None, top=True):
    parts = [line(60, 4, 60, 16), rect(30, 16, 60, 48, rx=3), line(60, 64, 60, 76), inner]
    if label:
        parts.append(text(60, 78, label, 11))
    if poles:
        parts.append(text(84, 28, poles, 11))
    return g(*parts)

def cb_inner(x=50):
    # circuit-breaker: contact with the thermal/instantaneous hook
    return g(line(x, 22, x, 30), line(x, 30, x + 18, 52), line(x, 52, x, 58),
             dot(x, 30, 2.5), dot(x, 52, 2.5),
             path(f"M {x-8} 22 q -6 0 -6 6 t 6 6"))

FUSE_BODY = g(line(60, 6, 60, 22), rect(50, 22, 20, 36), line(60, 22, 60, 58), line(60, 58, 60, 74))
add("prot-fuse", P, "Fuse (general symbol)", "Pojistka (obecná značka)", FUSE_BODY,
    "IEC 60617-07-21-01", "fuse cartridge protection", "pojistka tavná jištění")
add("prot-fuse-switch", P, "Fuse-switch", "Pojistkový odpínač",
    g(FUSE_BODY, line(60, 22, 84, 4), dot(60, 22, 3)), "IEC 60617-07-21-05",
    "fuse switch disconnector", "pojistkový odpínač")
add("prot-fuse-nh", P, "NH fuse-link (knife-blade)", "Pojistková vložka NH (nožová)",
    g(FUSE_BODY, rect(46, 18, 28, 44), text(60, 78, "NH", 11)), "", "NH knife blade fuse link",
    "nožová pojistka NH vložka")
add("prot-fuse-d", P, "D-type fuse (Diazed)", "Pojistka závitová (D)",
    g(FUSE_BODY, text(60, 78, "D 25 A", 11)), "", "diazed screw fuse", "závitová pojistka Diazed")
add("prot-fuse-hrc", P, "HRC fuse", "Pojistka s vysokou vypínací schopností",
    g(FUSE_BODY, text(60, 78, "gG", 11)), "IEC 60617-07-21-02", "HRC gG gL cartridge",
    "gG gL vysoká vypínací schopnost")
add("prot-fuse-am", P, "Motor-rated fuse (aM)", "Pojistka pro jištění motorů (aM)",
    g(FUSE_BODY, text(60, 78, "aM", 11)), "", "aM motor fuse", "aM jištění motoru")
add("prot-fuse-3p", P, "Three-pole fuse set", "Pojistky třípólové",
    g(*[g(line(30 + i * 30, 10, 30 + i * 30, 26), rect(22 + i * 30, 26, 16, 28),
         line(30 + i * 30, 54, 30 + i * 30, 70)) for i in range(3)]),
    "", "three phase fuses", "třífázové pojistky")

add("prot-mcb-1p", P, "Miniature circuit-breaker 1P", "Jistič 1pólový",
    modular(cb_inner(), "B 16 A", "1P"), "IEC 60617-07-13-05", "MCB breaker B16 1 pole", "jistič jednopólový B16")
add("prot-mcb-1pn", P, "MCB 1P+N", "Jistič 1P+N",
    modular(g(cb_inner(44), line(74, 22, 74, 58)), "B 16 A", "1P+N"), "", "MCB with neutral 1P+N",
    "jistič s nulou 1P+N")
add("prot-mcb-2p", P, "MCB 2P", "Jistič 2pólový",
    modular(g(cb_inner(42), cb_inner(66)), "C 25 A", "2P"), "", "two pole MCB", "dvoupólový jistič")
add("prot-mcb-3p", P, "MCB 3P", "Jistič 3pólový",
    g(line(36, 4, 36, 16), line(60, 4, 60, 16), line(84, 4, 84, 16), rect(22, 16, 76, 48, rx=3),
      line(36, 64, 36, 76), line(60, 64, 60, 76), line(84, 64, 84, 76),
      *[cb_inner(x) for x in (30, 54, 78)], text(60, 78, "", 10)),
    "", "three pole MCB 3P", "třípólový jistič 3P")
add("prot-mcb-4p", P, "MCB 4P", "Jistič 4pólový",
    g(*[g(line(24 + i * 24, 4, 24 + i * 24, 16), line(24 + i * 24, 64, 24 + i * 24, 76)) for i in range(4)],
      rect(12, 16, 96, 48, rx=3), *[cb_inner(x) for x in (18, 42, 66, 90)]),
    "", "four pole MCB 3P+N", "čtyřpólový jistič 3P+N")
add("prot-mcb-b", P, "MCB characteristic B", "Jistič charakteristika B",
    modular(cb_inner(), "B", "1P"), "", "B curve lighting sockets", "charakteristika B světla zásuvky")
add("prot-mcb-c", P, "MCB characteristic C", "Jistič charakteristika C",
    modular(cb_inner(), "C", "1P"), "", "C curve motors transformers", "charakteristika C motory trafa")
add("prot-mcb-d", P, "MCB characteristic D", "Jistič charakteristika D",
    modular(cb_inner(), "D", "1P"), "", "D curve high inrush", "charakteristika D vysoké rázy")
add("prot-rcd-2p", P, "Residual current device (RCD) 2P", "Proudový chránič 2pólový",
    modular(g(line(44, 22, 44, 58), line(76, 22, 76, 58), circ(60, 40, 15),
              line(46, 40, 74, 40), text(60, 56, "I∆", 11)), "30 mA", "2P"),
    "IEC 60617-07-13-08", "RCD RCCB earth leakage 30mA", "proudový chránič RCD 30 mA")
add("prot-rcd-4p", P, "RCD 4P", "Proudový chránič 4pólový",
    g(rect(12, 16, 96, 48, rx=3), *[g(line(24 + i * 24, 4, 24 + i * 24, 16), line(24 + i * 24, 64, 24 + i * 24, 76),
      line(24 + i * 24, 22, 24 + i * 24, 58)) for i in range(4)], circ(60, 40, 15), text(60, 46, "I∆", 12)),
    "", "four pole RCD 3P+N", "čtyřpólový chránič 3P+N")
add("prot-rcbo", P, "RCBO (combined RCD + MCB)", "Chránič s nadproudovou ochranou (RCBO)",
    modular(g(cb_inner(42), circ(74, 40, 13), text(74, 45, "I∆", 11)), "B 16 / 30 mA", "1P+N"),
    "", "RCBO combined breaker", "kombinovaný chránič jistič RCBO")
add("prot-rcd-a", P, "RCD type A", "Chránič typu A", modular(g(circ(60, 40, 15), text(60, 46, "A", 14)), "30 mA"),
    "", "type A pulsating DC", "typ A pulzující stejnosměrná")
add("prot-rcd-ac", P, "RCD type AC", "Chránič typu AC", modular(g(circ(60, 40, 15), text(60, 46, "AC", 12)), "30 mA"),
    "", "type AC sinusoidal", "typ AC sinusový")
add("prot-rcd-b", P, "RCD type B", "Chránič typu B", modular(g(circ(60, 40, 15), text(60, 46, "B", 14)), "30 mA"),
    "", "type B smooth DC inverter EV", "typ B hladká stejnosměrná měnič")
add("prot-rcd-f", P, "RCD type F", "Chránič typu F", modular(g(circ(60, 40, 15), text(60, 46, "F", 14)), "30 mA"),
    "", "type F frequency inverter appliance", "typ F frekvenční měnič spotřebič")
add("prot-rcd-sel", P, "Selective (S) RCD", "Chránič selektivní (S)",
    modular(g(circ(60, 40, 15), text(60, 46, "S", 14)), "300 mA S"), "", "selective time delayed 300mA",
    "selektivní zpožděný 300 mA")
add("prot-rcm", P, "Residual current monitor (RCM)", "Hlídač reziduálního proudu (RCM)",
    modular(g(circ(60, 40, 15), text(60, 46, "RCM", 10))), "", "residual current monitoring",
    "monitorování reziduálního proudu")
add("prot-mccb", P, "Moulded-case circuit-breaker (MCCB)", "Kompaktní jistič (MCCB)",
    g(rect(20, 14, 80, 52, rx=4), *[cb_inner(x) for x in (32, 56, 80)],
      line(38, 4, 38, 14), line(62, 4, 62, 14), line(86, 4, 86, 14),
      line(38, 66, 38, 76), line(62, 66, 62, 76), line(86, 66, 86, 76)),
    "", "MCCB moulded case adjustable", "kompaktní jistič nastavitelný")
add("prot-acb", P, "Air circuit-breaker (ACB)", "Vzduchový jistič (ACB)",
    g(rect(18, 12, 84, 56, rx=4), *[cb_inner(x) for x in (32, 56, 80)], text(60, 78, "ACB", 11)),
    "", "air circuit breaker main", "vzduchový jistič hlavní")
add("prot-mpcb", P, "Motor protection circuit-breaker", "Motorový spouštěč (jistič motoru)",
    modular(g(cb_inner(42), cb_inner(66), text(60, 60, "M", 11)), "0,6 – 1 A"),
    "", "motor starter protector thermal", "motorový spouštěč tepelná ochrana")
add("prot-thermal", P, "Thermal overload relay", "Tepelné nadproudové relé",
    g(rect(30, 20, 60, 40), path("M 40 30 h 40 v 20 h -40"), line(60, 6, 60, 20), line(60, 60, 60, 74)),
    "IEC 60617-07-22-01", "overload relay bimetal", "tepelné relé bimetal přetížení")
add("prot-spd-t1", P, "Surge protective device type 1", "Svodič přepětí typ 1 (T1)",
    modular(g(path("M 50 24 L 70 24 L 70 56 L 50 56 Z"), path("M 56 46 L 66 34"), text(60, 40, "", 10)), "T1"),
    "IEC 60617-07-22-08", "SPD lightning arrester class I", "svodič bleskových proudů třída I")
add("prot-spd-t2", P, "Surge protective device type 2", "Svodič přepětí typ 2 (T2)",
    modular(g(path("M 50 24 L 70 24 L 70 56 L 50 56 Z"), path("M 56 46 L 66 34")), "T2"),
    "", "SPD surge arrester class II", "svodič přepětí třída II")
add("prot-spd-t3", P, "Surge protective device type 3", "Svodič přepětí typ 3 (T3)",
    modular(g(path("M 50 24 L 70 24 L 70 56 L 50 56 Z"), path("M 56 46 L 66 34")), "T3"),
    "", "SPD fine protection socket", "jemná ochrana zásuvková T3")
add("prot-varistor", P, "Varistor", "Varistor",
    g(line(60, 6, 60, 24), rect(46, 24, 28, 32), path("M 46 56 L 74 24"), line(60, 56, 60, 74)),
    "IEC 60617-04-01-06", "varistor voltage dependent resistor MOV", "varistor napěťově závislý odpor")
add("prot-contactor", P, "Contactor (NO)", "Stykač (spínací kontakt)",
    g(line(60, 6, 60, 24), dot(60, 24), line(60, 24, 84, 48), dot(60, 56), line(60, 56, 60, 74),
      path("M 76 52 a 8 8 0 0 0 -8 -8")), "IEC 60617-07-13-01", "contactor coil NO power",
    "stykač spínací hlavní kontakt")
add("prot-contactor-nc", P, "Contactor (NC)", "Stykač (rozpínací kontakt)",
    g(line(60, 6, 60, 24), dot(60, 24), line(60, 24, 84, 48), dot(60, 56), line(60, 56, 60, 74),
      line(78, 42, 92, 42)), "IEC 60617-07-02-03", "contactor normally closed", "rozpínací kontakt stykače")
add("prot-relay-coil", P, "Relay / contactor coil", "Cívka relé (stykače)",
    g(rect(40, 26, 40, 28), line(60, 6, 60, 26), line(60, 54, 60, 74)),
    "IEC 60617-07-15-01", "coil relay operating winding", "cívka relé ovládací vinutí")
add("prot-impulse", P, "Impulse (latching) relay", "Impulzní relé (bistabilní)",
    g(rect(40, 26, 40, 28), text(60, 46, "I", 16), line(60, 6, 60, 26), line(60, 54, 60, 74)),
    "", "latching impulse relay bistable", "impulzní bistabilní relé")
add("prot-timer-relay", P, "Time relay (on-delay)", "Časové relé (se zpožděným přítahem)",
    g(rect(40, 26, 40, 28), path("M 46 26 L 46 54 L 60 54"), line(60, 6, 60, 26), line(60, 54, 60, 74)),
    "IEC 60617-07-15-08", "time delay relay on delay", "časové relé zpoždění")
add("prot-aux-no", P, "Auxiliary contact NO", "Pomocný kontakt spínací (NO)",
    g(line(24, 40, 46, 40), dot(46, 40), line(46, 40, 74, 22), dot(74, 40), line(74, 40, 96, 40)),
    "IEC 60617-07-02-01", "normally open auxiliary", "spínací pomocný kontakt")
add("prot-aux-nc", P, "Auxiliary contact NC", "Pomocný kontakt rozpínací (NC)",
    g(line(24, 40, 46, 40), dot(46, 40), line(46, 40, 74, 22), line(70, 16, 82, 16), dot(74, 40),
      line(74, 40, 96, 40)), "IEC 60617-07-02-03", "normally closed auxiliary", "rozpínací pomocný kontakt")
add("prot-changeover", P, "Changeover contact", "Přepínací kontakt",
    g(line(20, 40, 44, 40), dot(44, 40), line(44, 40, 76, 24), dot(76, 24), line(76, 24, 98, 24),
      dot(76, 56), line(76, 56, 98, 56)), "IEC 60617-07-02-04", "changeover SPDT contact", "přepínací kontakt")
add("prot-afdd", P, "Arc fault detection device (AFDD)", "Přístroj pro detekci poruchového oblouku (AFDD)",
    modular(g(cb_inner(42), path("M 72 26 L 78 38 L 72 38 L 80 54"), text(74, 62, "", 10)), "AFDD"),
    "", "arc fault AFDD series arc", "detekce oblouku AFDD jiskření")
add("prot-earth-monitor", P, "Insulation monitoring device (IT)", "Hlídač izolačního stavu (IT síť)",
    modular(g(circ(60, 38, 15), text(60, 44, "IMD", 10))), "", "insulation monitoring IT system medical",
    "hlídač izolačního stavu IT síť zdravotnictví")
add("prot-current-limiter", P, "Current limiter (main)", "Hlavní jistič před elektroměrem (HJP)",
    modular(cb_inner(), "HJP 25 A"), "", "main breaker before meter", "hlavní jistič před elektroměrem")

# --------------------------------------------------------------- 5. boards
B = "boards"
add("bd-board", B, "Distribution board (general)", "Rozvaděč (obecná značka)",
    g(rect(18, 20, 84, 40), *[line(30 + i * 18, 20, 30 + i * 18, 60) for i in range(4)]),
    "IEC 60617-11-05-01", "distribution board panel consumer unit", "rozvaděč rozvodnice skříň")
add("bd-board-main", B, "Main distribution board", "Hlavní rozvaděč",
    g(rect(14, 16, 92, 48), rect(20, 22, 80, 12, fill="currentColor"),
      *[line(30 + i * 18, 34, 30 + i * 18, 64) for i in range(4)]),
    "", "main switchboard MDB", "hlavní rozvaděč HR")
add("bd-board-sub", B, "Sub-distribution board", "Podružný rozvaděč",
    g(rect(18, 20, 84, 40), *[line(30 + i * 18, 20, 30 + i * 18, 60) for i in range(4)], text(60, 74, "PR", 11)),
    "", "sub board SDB", "podružný rozvaděč PR")
add("bd-flush-board", B, "Flush-mounted consumer unit", "Rozvodnice pod omítku",
    g(rect(18, 20, 84, 40), rect(12, 14, 96, 52), *[line(32 + i * 18, 20, 32 + i * 18, 60) for i in range(3)]),
    "", "flush consumer unit apartment", "rozvodnice pod omítku bytová")
add("bd-surface-board", B, "Surface consumer unit", "Rozvodnice na omítku",
    g(rect(18, 20, 84, 40), line(12, 66, 108, 66), *[line(32 + i * 18, 20, 32 + i * 18, 60) for i in range(3)]),
    "", "surface consumer unit", "rozvodnice na omítku")
add("bd-meter-box", B, "Meter cabinet", "Elektroměrový rozvaděč",
    g(rect(18, 16, 84, 48), circ(44, 40, 12), text(44, 45, "kWh", 8), rect(66, 28, 24, 24)),
    "", "meter cabinet HDS pillar", "elektroměrový rozvaděč pilíř")
add("bd-hds", B, "Main service cut-out (HDS)", "Hlavní domovní skříň (HDS)",
    g(rect(24, 16, 72, 48), text(60, 46, "HDS", 15)), "", "service cut out main intake",
    "hlavní domovní skříň přípojková")
add("bd-hdv", B, "Main service line box (HDV)", "Hlavní domovní vedení (HDV)",
    g(rect(24, 16, 72, 48), text(60, 46, "HDV", 15)), "", "riser main line", "stoupací vedení HDV")
add("bd-junction", B, "Junction box", "Krabice odbočná (instalační)",
    g(rect(30, 22, 56, 36, rx=3), line(30, 40, 16, 40), line(86, 40, 104, 40), line(58, 22, 58, 8),
      line(58, 58, 58, 72)), "IEC 60617-11-05-05", "junction box connection", "odbočná krabice instalační")
add("bd-junction-round", B, "Round junction box", "Krabice kruhová",
    g(circ(60, 40, 22), line(38, 40, 16, 40), line(82, 40, 104, 40), line(60, 18, 60, 6)),
    "", "round box ceiling", "kruhová krabice strop")
add("bd-pull-box", B, "Pull box / draw box", "Krabice protahovací",
    g(rect(26, 20, 68, 40, rx=2), path("M 26 20 L 94 60 M 94 20 L 26 60")),
    "", "pull box draw", "protahovací krabice")
add("bd-terminal-box", B, "Terminal box", "Svorkovnicová krabice",
    g(rect(26, 22, 68, 36, rx=2), *[circ(38 + i * 14, 40, 5) for i in range(4)]),
    "", "terminal box connector", "svorkovnice krabice")
add("bd-busbar", B, "Busbar", "Přípojnice",
    g(line(10, 30, 110, 30, 4), *[line(30 + i * 24, 30, 30 + i * 24, 62) for i in range(3)]),
    "IEC 60617-11-05-02", "busbar rail distribution", "přípojnice sběrnice")
add("bd-busbar-3", B, "Three-phase busbar system", "Přípojnicový systém 3f",
    g(line(10, 22, 110, 22, 3), line(10, 34, 110, 34, 3), line(10, 46, 110, 46, 3),
      text(114, 26, "", 10)), "", "three phase busbars L1 L2 L3", "přípojnice L1 L2 L3")
add("bd-din-rail", B, "DIN rail (35 mm)", "Lišta DIN 35 mm",
    g(path("M 14 34 h 92 v 14 h -92 z"), path("M 14 34 v -6 M 106 34 v -6")),
    "", "DIN rail TH35 mounting", "DIN lišta montážní")
add("bd-bus-duct", B, "Busbar trunking", "Přípojnicový rozvod (bus-duct)",
    g(rect(10, 28, 100, 22), line(10, 39, 110, 39), *[line(34 + i * 26, 28, 34 + i * 26, 50) for i in range(3)]),
    "", "busbar trunking system", "přípojnicový rozvod")
add("bd-enclosure-ip", B, "Enclosure with IP rating", "Skříň s krytím IP",
    g(rect(20, 20, 80, 40, rx=3), text(60, 46, "IP65", 15)), "", "enclosure IP protection degree",
    "skříň krytí IP stupeň ochrany")
add("bd-cabinet-lock", B, "Lockable cabinet", "Uzamykatelná skříň",
    g(rect(20, 18, 80, 44, rx=3), circ(90, 40, 4), line(90, 44, 90, 52)),
    "", "lockable cabinet key", "uzamykatelná skříň klíč")
add("bd-equipotential", B, "Main earthing terminal (MET)", "Hlavní ochranná přípojnice (HOP)",
    g(rect(24, 30, 72, 16), *[line(36 + i * 16, 30, 36 + i * 16, 14) for i in range(4)],
      line(60, 46, 60, 62), path("M 46 62 h 28 M 51 68 h 18 M 56 74 h 8")),
    "", "main earthing terminal bonding bar", "hlavní ochranná pospojovací přípojnice HOP")
add("bd-tel-board", B, "Telecommunication cabinet", "Rozvaděč slaboproudý (datový)",
    g(rect(20, 18, 80, 44, rx=3), text(60, 46, "RACK", 13)), "", "data rack patch cabinet",
    "datový rozvaděč rack patch")

# --------------------------------------------------------------- 6. sources
SRC = "sources"
add("src-ac", SRC, "Alternating current (AC)", "Střídavý proud (AC)",
    g(path("M 24 40 q 18 -26 36 0 t 36 0")), "IEC 60617-02-02-04", "AC alternating sinusoidal",
    "střídavý proud sinusový")
add("src-dc", SRC, "Direct current (DC)", "Stejnosměrný proud (DC)",
    g(line(24, 34, 96, 34), line(24, 46, 40, 46), line(48, 46, 64, 46), line(72, 46, 88, 46)),
    "IEC 60617-02-02-05", "DC direct current", "stejnosměrný proud")
add("src-ac-dc", SRC, "AC/DC (universal)", "Střídavý i stejnosměrný proud",
    g(path("M 24 30 q 18 -18 36 0 t 36 0"), line(24, 52, 96, 52), line(24, 62, 96, 62)),
    "IEC 60617-02-02-06", "universal AC DC", "univerzální AC DC")
add("src-1ph", SRC, "Single-phase 230 V AC supply", "Napájení 1f 230 V AC",
    g(path("M 24 34 q 18 -22 36 0 t 36 0"), text(60, 64, "1~ 230 V 50 Hz", 13)),
    "", "single phase 230V 50Hz", "jednofázové 230 V 50 Hz")
add("src-3ph", SRC, "Three-phase 400 V AC supply", "Napájení 3f 400 V AC",
    g(path("M 24 30 q 18 -20 36 0 t 36 0"), text(60, 60, "3~ 400 V 50 Hz", 13),
      text(60, 76, "L1 L2 L3 N PE", 11)), "", "three phase 400V TN-S", "třífázové 400 V TN-S")
add("src-battery", SRC, "Battery / accumulator", "Baterie (akumulátor)",
    g(line(60, 8, 60, 22), line(40, 22, 80, 22, 3), line(48, 30, 72, 30), line(40, 38, 80, 38, 3),
      line(48, 46, 72, 46), line(60, 46, 60, 72), text(90, 26, "+", 14)),
    "IEC 60617-06-15-02", "battery accumulator cell", "baterie akumulátor článek")
add("src-cell", SRC, "Primary cell", "Galvanický článek",
    g(line(60, 14, 60, 32), line(40, 32, 80, 32, 3), line(48, 42, 72, 42), line(60, 42, 60, 66)),
    "IEC 60617-06-15-01", "cell primary battery", "článek baterie")
add("src-generator", SRC, "Generator", "Generátor",
    g(circ(60, 40, 24), text(60, 47, "G", 20), line(60, 64, 60, 76)),
    "IEC 60617-06-04-01", "generator alternator", "generátor alternátor")
add("src-genset", SRC, "Diesel generating set", "Dieselagregát (náhradní zdroj)",
    g(circ(46, 40, 18), text(46, 47, "G", 16), rect(70, 26, 30, 28), text(85, 46, "M", 14), line(64, 40, 70, 40)),
    "", "genset standby diesel", "dieselagregát náhradní zdroj")
add("src-ups", SRC, "UPS (uninterruptible power supply)", "Záložní zdroj UPS",
    g(rect(20, 22, 80, 36, rx=3), text(60, 46, "UPS", 18)), "", "UPS backup battery inverter",
    "UPS záložní zdroj měnič")
add("src-transformer", SRC, "Transformer (two windings)", "Transformátor dvouvinuťový",
    g(circ(50, 40, 18), circ(70, 40, 18), line(50, 8, 50, 22), line(70, 58, 70, 72)),
    "IEC 60617-06-09-01", "transformer two windings", "transformátor dvě vinutí")
add("src-transformer-iso", SRC, "Isolating transformer", "Oddělovací transformátor",
    g(circ(50, 40, 18), circ(70, 40, 18), line(60, 14, 60, 66, 1.5), line(50, 8, 50, 22), line(70, 58, 70, 72)),
    "IEC 60617-06-09-06", "isolating separating transformer", "oddělovací transformátor")
add("src-transformer-safety", SRC, "Safety isolating transformer (SELV)", "Bezpečnostní transformátor (SELV)",
    g(circ(50, 40, 18), circ(70, 40, 18), rect(40, 14, 40, 52), text(60, 78, "SELV", 11)),
    "", "safety SELV transformer 12V 24V", "bezpečnostní SELV 12 V 24 V")
add("src-transformer-auto", SRC, "Autotransformer", "Autotransformátor",
    g(circ(60, 40, 22), line(60, 18, 60, 8), line(82, 40, 96, 40), line(60, 62, 60, 74)),
    "IEC 60617-06-09-08", "autotransformer single winding", "autotransformátor jedno vinutí")
add("src-transformer-3ph", SRC, "Three-phase transformer Dyn", "Transformátor 3f Dyn",
    g(circ(48, 40, 18), circ(72, 40, 18), path("M 40 30 L 56 30 L 48 44 Z"),
      path("M 72 32 L 72 44 M 72 44 L 64 52 M 72 44 L 80 52")),
    "", "Dyn11 distribution transformer", "distribuční transformátor Dyn11")
add("src-ct", SRC, "Current transformer", "Měřicí transformátor proudu (MTP)",
    g(line(20, 30, 100, 30, 3), circ(60, 48, 14), line(60, 62, 60, 76)),
    "IEC 60617-06-11-01", "current transformer CT metering", "proudový transformátor MTP měření")
add("src-vt", SRC, "Voltage transformer", "Měřicí transformátor napětí (MTN)",
    g(circ(50, 40, 18), circ(70, 40, 18), line(50, 8, 50, 22), line(70, 58, 70, 72), text(60, 78, "MTN", 11)),
    "IEC 60617-06-11-04", "voltage transformer VT PT", "napěťový transformátor MTN")
add("src-rectifier", SRC, "Rectifier", "Usměrňovač",
    g(rect(30, 20, 60, 40), path("M 30 20 L 90 60"), path("M 44 32 q 10 -10 20 0"), line(66, 48, 82, 48),
      line(60, 6, 60, 20), line(60, 60, 60, 74)),
    "IEC 60617-06-16-01", "rectifier AC to DC", "usměrňovač AC na DC")
add("src-inverter", SRC, "Inverter", "Střídač (měnič)",
    g(rect(30, 20, 60, 40), path("M 30 60 L 90 20"), line(40, 32, 56, 32), path("M 66 50 q 8 -12 16 0"),
      line(60, 6, 60, 20), line(60, 60, 60, 74)),
    "IEC 60617-06-16-02", "inverter DC to AC", "střídač DC na AC")
add("src-vfd", SRC, "Variable frequency drive", "Frekvenční měnič",
    g(rect(24, 20, 72, 40, rx=3), text(60, 46, "f ~", 18), line(60, 6, 60, 20), line(60, 60, 60, 74)),
    "", "VFD frequency converter motor", "frekvenční měnič pohon")
add("src-pv", SRC, "Photovoltaic cell / panel", "Fotovoltaický článek (panel)",
    g(rect(22, 20, 76, 36), line(22, 38, 98, 38), *[line(22 + i * 19, 20, 22 + i * 19, 56) for i in range(1, 4)],
      path("M 34 12 L 46 4 M 60 12 L 72 4"), line(60, 56, 60, 74)),
    "IEC 60617-06-20-01", "photovoltaic solar panel PV", "fotovoltaika solární panel FVE")
add("src-wind", SRC, "Wind turbine generator", "Větrná elektrárna",
    g(line(60, 76, 60, 34), circ(60, 30, 4), path("M 60 30 L 60 8 M 60 30 L 80 42 M 60 30 L 40 42")),
    "", "wind turbine generator", "větrná turbína generátor")
add("src-heatpump", SRC, "Heat pump", "Tepelné čerpadlo",
    g(circ(60, 40, 24), text(60, 46, "HP", 16), line(60, 64, 60, 76)), "", "heat pump",
    "tepelné čerpadlo")
add("src-motor", SRC, "Motor (general)", "Motor (obecná značka)",
    g(circ(60, 38, 22), text(60, 45, "M", 20), line(60, 60, 60, 74)),
    "IEC 60617-06-04-01", "motor electric drive", "motor elektrický pohon")
add("src-motor-3ph", SRC, "Three-phase motor", "Motor třífázový",
    g(circ(60, 36, 22), text(60, 42, "M", 18), text(60, 56, "3~", 12), line(60, 58, 60, 74)),
    "", "three phase asynchronous motor", "asynchronní třífázový motor")
add("src-motor-1ph", SRC, "Single-phase motor", "Motor jednofázový",
    g(circ(60, 36, 22), text(60, 42, "M", 18), text(60, 56, "1~", 12), line(60, 58, 60, 74)),
    "", "single phase motor capacitor", "jednofázový motor kondenzátor")
add("src-capacitor", SRC, "Capacitor", "Kondenzátor",
    g(line(60, 8, 60, 34), line(36, 34, 84, 34, 3), line(36, 44, 84, 44, 3), line(60, 44, 60, 72)),
    "IEC 60617-04-02-01", "capacitor power factor", "kondenzátor kompenzace")
add("src-pfc", SRC, "Power factor correction unit", "Kompenzační rozvaděč (PFC)",
    g(rect(20, 20, 80, 40, rx=3), text(60, 46, "cos φ", 16)), "", "power factor correction capacitor bank",
    "kompenzace účiníku cos fí")

# ------------------------------------------------------------- 7. measuring
M = "measuring"

def meter(sym, size=20, sub=None):
    parts = [circ(60, 38, 22), text(60, 45, sym, size), line(38, 38, 20, 38), line(82, 38, 100, 38)]
    if sub:
        parts.append(text(60, 74, sub, 11))
    return g(*parts)

def sqmeter(sym, size=16, sub=None):
    parts = [rect(30, 16, 60, 44, rx=2), text(60, 44, sym, size), line(30, 38, 14, 38), line(90, 38, 106, 38)]
    if sub:
        parts.append(text(60, 74, sub, 11))
    return g(*parts)

add("m-ammeter", M, "Ammeter", "Ampérmetr", meter("A"), "IEC 60617-08-01-02", "ammeter current A", "ampérmetr proud")
add("m-voltmeter", M, "Voltmeter", "Voltmetr", meter("V"), "IEC 60617-08-01-03", "voltmeter voltage V",
    "voltmetr napětí")
add("m-wattmeter", M, "Wattmeter", "Wattmetr", meter("W"), "IEC 60617-08-01-04", "wattmeter power W",
    "wattmetr výkon")
add("m-varmeter", M, "Varmeter", "Varmetr", meter("var", 14), "", "reactive power var", "jalový výkon var")
add("m-cosphi", M, "Power factor meter", "Měřič účiníku", meter("cos φ", 13), "IEC 60617-08-01-09",
    "power factor cos phi", "účiník cos fí")
add("m-freq", M, "Frequency meter", "Kmitočtoměr", meter("Hz", 16), "IEC 60617-08-01-06",
    "frequency Hz meter", "frekvence Hz kmitočtoměr")
add("m-ohm", M, "Ohmmeter", "Ohmmetr", meter("Ω"), "", "resistance ohm meter", "odpor ohm měření")
add("m-megger", M, "Insulation resistance tester", "Měřič izolačního odporu",
    meter("MΩ", 15, sub="500 V DC"), "", "megger insulation resistance", "megmet izolační odpor revize")
add("m-loop", M, "Loop impedance tester", "Měřič impedance smyčky",
    sqmeter("Zs", 16, sub="Ω"), "", "loop impedance Zs earth fault", "impedance smyčky Zs revize")
add("m-rcd-test", M, "RCD tester", "Zkoušečka proudových chráničů",
    sqmeter("I∆n", 14, sub="ms"), "", "RCD test trip time", "test chrániče vybavovací čas")
add("m-earth-tester", M, "Earth resistance tester", "Měřič zemního odporu",
    sqmeter("RE", 16, sub="Ω"), "", "earth electrode resistance", "zemní odpor uzemnění")
add("m-clamp", M, "Clamp meter", "Klešťový ampérmetr",
    g(path("M 60 60 A 24 24 0 1 1 74 20"), line(74, 20, 90, 12), line(60, 60, 60, 74), text(36, 44, "A", 16)),
    "", "clamp current tester", "klešťový měřák proud")
add("m-multimeter", M, "Multimeter", "Multimetr",
    g(rect(30, 12, 60, 56, rx=4), rect(38, 20, 44, 18), circ(60, 52, 10), text(60, 34, "V Ω A", 11)),
    "", "multimeter tester", "multimetr měřicí přístroj")
add("m-tester", M, "Voltage tester (two-pole)", "Zkoušečka napětí (dvoupólová)",
    g(rect(28, 26, 44, 20, rx=3), line(28, 36, 10, 36), line(72, 36, 110, 36), text(50, 41, "V", 14)),
    "", "two pole voltage tester", "dvoupólová zkoušečka")
add("m-kwh", M, "Energy meter (kWh)", "Elektroměr (kWh)",
    sqmeter("kWh", 14), "IEC 60617-08-01-08", "energy meter kWh electricity", "elektroměr kWh měření spotřeby")
add("m-kwh-3ph", M, "Three-phase energy meter", "Elektroměr třífázový",
    sqmeter("kWh", 14, sub="3~"), "", "three phase meter", "třífázový elektroměr")
add("m-kwh-dual", M, "Dual-tariff energy meter", "Elektroměr dvoutarifní",
    sqmeter("kWh", 14, sub="VT / NT"), "", "dual tariff HDO day night", "dvoutarifní VT NT HDO")
add("m-kvarh", M, "Reactive energy meter", "Elektroměr jalové energie",
    sqmeter("kvarh", 12), "", "reactive energy meter", "jalová energie elektroměr")
add("m-hdo", M, "Ripple control receiver (HDO)", "Přijímač HDO",
    g(rect(28, 18, 64, 40, rx=3), text(60, 44, "HDO", 15), path("M 96 30 A 14 14 0 0 1 96 50")),
    "", "ripple control receiver tariff", "HDO přijímač hromadné dálkové ovládání")
add("m-submeter", M, "Sub-meter", "Podružný elektroměr", sqmeter("kWh", 14, sub="podružný"),
    "", "submeter tenant", "podružné měření nájemník")
add("m-ct-meter", M, "Metering via current transformers", "Měření přes MTP",
    g(sqmeter("kWh", 13), circ(20, 60, 10), text(20, 64, "CT", 9)), "", "CT metering indirect",
    "nepřímé měření MTP")
add("m-recorder", M, "Recording instrument", "Zapisovací přístroj",
    g(rect(28, 18, 64, 40, rx=2), path("M 36 46 L 48 32 L 60 44 L 72 26 L 84 38"), line(28, 38, 12, 38),
      line(92, 38, 108, 38)), "IEC 60617-08-01-11", "recorder logger chart", "zapisovač záznamník")
add("m-analyzer", M, "Power quality analyser", "Analyzátor sítě",
    g(rect(24, 14, 72, 48, rx=3), path("M 34 48 q 12 -26 24 0 t 24 0"), text(60, 28, "PQA", 12)),
    "", "power quality analyser harmonics", "analyzátor kvality sítě harmonické")
add("m-thermo-cam", M, "Thermal imaging check point", "Místo termovizní kontroly",
    g(rect(24, 20, 72, 36, rx=3), circ(60, 38, 10), text(60, 74, "IR", 12)), "",
    "thermography hotspot inspection", "termovize kontrola přehřátí")
add("m-transducer", M, "Measuring transducer", "Měřicí převodník",
    g(rect(30, 22, 60, 36), path("M 60 22 L 60 58"), text(45, 45, "I", 14), text(76, 45, "mA", 10),
      line(30, 40, 14, 40), line(90, 40, 106, 40)), "IEC 60617-08-02-01", "transducer 4-20mA",
    "převodník 4-20 mA")
add("m-pulse", M, "Pulse output / M-Bus meter", "Elektroměr s impulzním výstupem",
    g(sqmeter("kWh", 13), path("M 96 66 l 0 -10 l 6 0 l 0 10 l 6 0 l 0 -10"), ),
    "", "pulse output M-Bus remote reading", "impulzní výstup M-Bus dálkový odečet")
add("m-indicator", M, "Indicating instrument (general)", "Ukazovací přístroj (obecně)",
    meter("*", 20), "IEC 60617-08-01-01", "indicating instrument general", "ukazovací přístroj obecná značka")
add("m-phase-seq", M, "Phase sequence indicator", "Indikátor sledu fází",
    g(circ(60, 38, 22), path("M 50 30 L 70 38 L 50 46 Z", fill="currentColor"), text(60, 74, "L1-L2-L3", 11)),
    "", "phase rotation sequence", "sled fází točivé pole")
add("m-sensor-temp", M, "Temperature sensor", "Čidlo teploty",
    g(rect(30, 24, 60, 32, rx=3), text(60, 47, "θ", 20), line(30, 40, 12, 40), line(90, 40, 108, 40)),
    "", "temperature sensor Pt100", "teplotní čidlo Pt100")
add("m-sensor-lux", M, "Illuminance sensor", "Čidlo osvětlenosti",
    g(rect(30, 24, 60, 32, rx=3), text(60, 47, "lx", 16), line(30, 40, 12, 40), line(90, 40, 108, 40)),
    "", "lux light sensor", "luxmetr čidlo osvětlení")

# ---------------------------------------------------------------- 8. general
G = "general"
add("gen-conductor", G, "Conductor / line", "Vodič (vedení)", line(10, 40, 110, 40),
    "IEC 60617-03-01-01", "conductor wire line", "vodič vedení čára")
add("gen-conductor-3", G, "Three conductors", "Tři vodiče",
    g(line(10, 40, 110, 40), line(48, 32, 56, 48), line(58, 32, 66, 48), line(68, 32, 76, 48)),
    "IEC 60617-03-01-02", "multiple conductors three", "více vodičů tři")
add("gen-conductor-n", G, "n conductors", "n vodičů",
    g(line(10, 40, 110, 40), line(56, 32, 64, 48), text(60, 26, "n", 13)),
    "", "n conductors bundle", "n vodičů svazek")
add("gen-cable-3x15", G, "Cable 3 × 1,5 mm²", "Kabel 3 × 1,5 mm²",
    g(line(10, 44, 110, 44), line(52, 36, 60, 52), line(60, 36, 68, 52), line(68, 36, 76, 52),
      text(60, 26, "3 × 1,5", 13)), "", "cable CYKY 3x1.5 lighting", "CYKY 3x1,5 světelný okruh")
add("gen-cable-3x25", G, "Cable 3 × 2,5 mm²", "Kabel 3 × 2,5 mm²",
    g(line(10, 44, 110, 44), line(52, 36, 60, 52), line(60, 36, 68, 52), line(68, 36, 76, 52),
      text(60, 26, "3 × 2,5", 13)), "", "cable CYKY 3x2.5 sockets", "CYKY 3x2,5 zásuvkový okruh")
add("gen-cable-5x25", G, "Cable 5 × 2,5 mm²", "Kabel 5 × 2,5 mm²",
    g(line(10, 44, 110, 44), *[line(44 + i * 8, 36, 52 + i * 8, 52) for i in range(5)],
      text(60, 26, "5 × 2,5", 13)), "", "five core cable 400V", "pětižilový kabel 400 V")
add("gen-cable-coax", G, "Coaxial cable", "Kabel koaxiální",
    g(line(10, 40, 40, 40), circ(60, 40, 14), line(80, 40, 110, 40), line(46, 40, 74, 40)),
    "IEC 60617-03-01-07", "coaxial cable screened", "koaxiální kabel stíněný")
add("gen-cable-screen", G, "Screened cable", "Kabel stíněný",
    g(line(10, 40, 110, 40), path("M 34 26 A 26 26 0 0 0 34 54"), path("M 86 26 A 26 26 0 0 1 86 54"),
      line(34, 26, 86, 26), line(34, 54, 86, 54)), "IEC 60617-03-01-06", "shield screened cable",
    "stínění stíněný kabel")
add("gen-cable-fire", G, "Fire-resistant cable", "Kabel s funkční integritou (P/PH)",
    g(line(10, 40, 110, 40), text(60, 26, "PH 30-R", 13)), "", "fire resistant cable PH30",
    "kabel s funkční integritou PH30")
add("gen-conduit", G, "Conduit (installation pipe)", "Trubka (chránička) elektroinstalační",
    g(line(10, 32, 110, 32), line(10, 48, 110, 48), line(10, 32, 10, 48), line(110, 32, 110, 48)),
    "", "conduit pipe corrugated", "trubka chránička husí krk")
add("gen-tray", G, "Cable tray", "Kabelový žlab",
    g(path("M 14 24 L 14 52 L 106 52 L 106 24"), *[line(30 + i * 22, 52, 30 + i * 22, 40) for i in range(4)]),
    "", "cable tray ladder", "kabelový žlab rošt")
add("gen-trunking", G, "Trunking / skirting duct", "Lišta (kanál) elektroinstalační",
    g(rect(12, 28, 96, 22), line(12, 39, 108, 39)), "", "trunking skirting duct", "lišta kanál soklová")
add("gen-rising", G, "Conductor rising", "Vedení stoupající",
    g(line(20, 62, 100, 18), path("M 100 18 L 88 20 L 94 30 Z", fill="currentColor")),
    "IEC 60617-11-01-04", "wiring rising upward", "stoupající vedení nahoru")
add("gen-falling", G, "Conductor falling", "Vedení klesající",
    g(line(20, 18, 100, 62), path("M 100 62 L 88 60 L 94 50 Z", fill="currentColor")),
    "IEC 60617-11-01-05", "wiring falling downward", "klesající vedení dolů")
add("gen-through", G, "Conductor passing through", "Vedení procházející",
    g(line(20, 40, 100, 40), circ(60, 40, 10), dot(60, 40, 3)), "IEC 60617-11-01-06",
    "passing through floor", "procházející vedení podlahou")
add("gen-junction-dot", G, "Junction of conductors", "Spojení vodičů",
    g(line(10, 40, 110, 40), line(60, 10, 60, 70), dot(60, 40, 4)), "IEC 60617-03-02-01",
    "junction connection node", "spoj uzel připojení")
add("gen-crossing", G, "Crossing without connection", "Křížení bez spojení",
    g(line(10, 40, 110, 40), line(60, 10, 60, 70)), "IEC 60617-03-02-05", "crossing no connection",
    "křížení bez spojení")
add("gen-double-junction", G, "Double junction", "Dvojité spojení",
    g(line(10, 40, 110, 40), line(40, 10, 40, 40), line(80, 40, 80, 70), dot(40, 40, 4), dot(80, 40, 4)),
    "IEC 60617-03-02-02", "double junction T", "dvojitý spoj T")
add("gen-terminal", G, "Terminal", "Svorka",
    g(line(10, 40, 46, 40), circ(56, 40, 10), line(66, 40, 110, 40)),
    "IEC 60617-03-02-06", "terminal connector", "svorka spoj")
add("gen-terminal-strip", G, "Terminal strip", "Svorkovnice",
    g(rect(16, 28, 88, 24), *[circ(30 + i * 15, 40, 6) for i in range(5)]),
    "IEC 60617-03-02-07", "terminal block strip", "svorkovnice řadová")
add("gen-earth", G, "Earth (ground)", "Uzemnění",
    g(line(60, 8, 60, 40), line(36, 40, 84, 40, 3), line(44, 50, 76, 50), line(52, 60, 68, 60)),
    "IEC 60617-02-15-01", "earth ground PE", "uzemnění zem PE")
add("gen-earth-protective", G, "Protective earth (PE)", "Ochranné uzemnění (PE)",
    g(circ(60, 32, 14), line(60, 18, 60, 46), line(46, 32, 74, 32), line(48, 54, 72, 54),
      line(52, 62, 68, 62), line(56, 70, 64, 70)), "IEC 60617-02-15-03", "protective earth PE terminal",
    "ochranné uzemnění PE svorka")
add("gen-earth-noiseless", G, "Noiseless (clean) earth", "Uzemnění bezšumové (čisté)",
    g(line(60, 6, 60, 26), path("M 36 26 L 84 26 L 60 62 Z"), line(44, 40, 76, 40)),
    "IEC 60617-02-15-02", "clean earth functional", "funkční uzemnění bezšumové")
add("gen-frame", G, "Frame / chassis", "Kostra (rám)",
    g(line(60, 10, 60, 40), line(34, 40, 86, 40), line(34, 40, 26, 52), line(52, 40, 44, 52),
      line(70, 40, 62, 52), line(86, 40, 78, 52)), "IEC 60617-02-15-04", "chassis frame bonding",
    "kostra rám pospojování")
add("gen-equipot", G, "Equipotential bonding", "Pospojování (ekvipotenciální)",
    g(circ(60, 40, 18), line(42, 40, 78, 40), line(60, 22, 60, 58), line(60, 58, 60, 74), text(96, 30, "", 10)),
    "IEC 60617-02-15-05", "equipotential bonding EPB", "pospojování ekvipotenciální EPS")
add("gen-earth-electrode", G, "Earth electrode (rod)", "Zemnič (tyčový)",
    g(line(60, 8, 60, 40), path("M 52 40 L 68 40 L 60 72 Z"), line(20, 40, 100, 40)),
    "", "earth rod electrode", "zemnicí tyč zemnič")
add("gen-earth-foundation", G, "Foundation earth electrode", "Základový zemnič",
    g(line(60, 8, 60, 30), path("M 20 30 L 100 30 L 100 60 L 20 60 Z"), path("M 20 45 L 100 45")),
    "", "foundation earthing ring FeZn", "základový zemnič FeZn pásek")
add("gen-lps", G, "Lightning protection air termination", "Jímací tyč (hromosvod)",
    g(line(60, 6, 60, 60), line(46, 60, 74, 60), line(60, 60, 60, 74), path("M 56 6 L 60 0 L 64 6")),
    "", "lightning rod air terminal LPS", "jímací tyč hromosvod LPS")
add("gen-down-conductor", G, "Down conductor (lightning)", "Svod (hromosvod)",
    g(line(60, 6, 60, 70), circ(60, 40, 8), text(96, 44, "", 10)), "", "down conductor lightning",
    "svod hromosvodu")
add("gen-test-joint", G, "Test joint (lightning protection)", "Zkušební svorka (ZS)",
    g(line(60, 6, 60, 30), rect(48, 30, 24, 16), line(60, 46, 60, 74), text(90, 42, "ZS", 12)),
    "", "test clamp lightning", "zkušební svorka hromosvod")
add("gen-resistor", G, "Resistor", "Rezistor (odpor)",
    g(line(10, 40, 34, 40), rect(34, 28, 52, 24), line(86, 40, 110, 40)),
    "IEC 60617-04-01-02", "resistor ohm", "rezistor odpor")
add("gen-resistor-var", G, "Variable resistor", "Rezistor proměnný",
    g(line(10, 40, 34, 40), rect(34, 28, 52, 24), line(86, 40, 110, 40), line(40, 58, 82, 20),
      path("M 82 20 L 72 22 L 76 30 Z", fill="currentColor")), "IEC 60617-04-01-03",
    "potentiometer variable resistor", "potenciometr proměnný odpor")
add("gen-inductor", G, "Inductor / coil", "Cívka (tlumivka)",
    g(line(10, 44, 30, 44), path("M 30 44 q 10 -20 20 0 q 10 -20 20 0 q 10 -20 20 0"), line(90, 44, 110, 44)),
    "IEC 60617-04-03-01", "inductor coil choke", "cívka tlumivka")
add("gen-diode", G, "Diode", "Dioda",
    g(line(10, 40, 46, 40), path("M 46 24 L 46 56 L 76 40 Z", fill="currentColor"), line(76, 24, 76, 56),
      line(76, 40, 110, 40)), "IEC 60617-05-03-01", "diode rectifier", "dioda usměrňovací")
add("gen-led", G, "LED", "LED dioda",
    g(line(10, 40, 46, 40), path("M 46 24 L 46 56 L 76 40 Z", fill="currentColor"), line(76, 24, 76, 56),
      line(76, 40, 110, 40), path("M 60 18 L 74 6 M 70 18 L 84 6")),
    "IEC 60617-05-03-05", "light emitting diode", "svítivá dioda LED")
add("gen-transistor", G, "Transistor (NPN)", "Tranzistor NPN",
    g(circ(60, 40, 22), line(50, 26, 50, 54, 3), line(50, 34, 74, 22), line(50, 46, 74, 58),
      line(30, 40, 50, 40), line(74, 22, 74, 8), line(74, 58, 74, 72)),
    "IEC 60617-05-04-01", "transistor NPN", "tranzistor NPN")
add("gen-bell", G, "Bell", "Zvonek",
    g(path("M 34 52 A 26 26 0 0 1 86 52 Z"), line(20, 52, 100, 52), line(60, 20, 60, 12)),
    "IEC 60617-08-10-06", "bell door chime", "zvonek domovní")
add("gen-buzzer", G, "Buzzer", "Bzučák",
    g(path("M 34 52 A 26 26 0 0 0 86 52 Z".replace("0 0", "0 1")), line(20, 52, 100, 52)),
    "IEC 60617-08-10-07", "buzzer sounder", "bzučák")
add("gen-intercom", G, "Door intercom / entry phone", "Domovní telefon (interkom)",
    g(rect(30, 12, 60, 56, rx=4), rect(38, 20, 44, 20), circ(60, 54, 8)),
    "", "intercom door entry video", "domovní telefon videotelefon zvonek")
add("gen-detector-smoke", G, "Smoke detector", "Hlásič kouře",
    g(circ(60, 40, 22), text(60, 46, "S", 18), line(60, 62, 60, 74)), "",
    "smoke detector fire alarm EPS", "kouřový hlásič požární EPS")
add("gen-detector-heat", G, "Heat detector", "Hlásič teplotní",
    g(circ(60, 40, 22), text(60, 46, "θ", 18), line(60, 62, 60, 74)), "", "heat detector fire",
    "teplotní hlásič požární")
add("gen-detector-co", G, "CO detector", "Detektor CO",
    g(circ(60, 40, 22), text(60, 45, "CO", 15), line(60, 62, 60, 74)), "", "carbon monoxide detector",
    "detektor oxidu uhelnatého")
add("gen-manual-call", G, "Manual call point", "Tlačítkový hlásič požáru",
    g(rect(30, 14, 60, 50, rx=3), path("M 40 24 L 80 54 M 80 24 L 40 54"), text(60, 76, "EPS", 11)),
    "", "manual call point fire alarm", "tlačítkový hlásič EPS")
add("gen-antenna", G, "Antenna", "Anténa",
    g(line(60, 74, 60, 34), path("M 40 12 L 60 34 L 80 12")), "IEC 60617-11-15-01",
    "antenna aerial", "anténa")
add("gen-sat", G, "Satellite dish", "Satelitní anténa",
    g(path("M 34 62 A 30 30 0 0 1 82 20"), line(58, 44, 74, 34), dot(76, 33, 4), line(50, 52, 50, 72)),
    "", "satellite dish LNB", "satelitní parabola LNB")
add("gen-speaker", G, "Loudspeaker", "Reproduktor",
    g(path("M 34 30 L 34 50 L 56 62 L 56 18 Z"), line(20, 40, 34, 40)),
    "IEC 60617-08-10-09", "loudspeaker audio", "reproduktor ozvučení")
add("gen-camera", G, "CCTV camera", "Kamera (CCTV)",
    g(rect(26, 28, 50, 26, rx=3), path("M 76 32 L 96 22 L 96 60 L 76 50 Z"), line(44, 54, 44, 70)),
    "", "CCTV camera surveillance", "kamera kamerový systém CCTV")
add("gen-motion-sensor", G, "Motion sensor (PIR)", "Čidlo pohybu (PIR)",
    g(rect(36, 18, 48, 30, rx=4), path("M 44 56 A 20 20 0 0 0 76 56"), text(60, 38, "PIR", 13)),
    "", "PIR motion detector alarm", "PIR pohybové čidlo alarm")
add("gen-keypad", G, "Alarm keypad", "Klávesnice zabezpečení (EZS)",
    g(rect(34, 12, 52, 56, rx=4), *[circ(46 + (i % 3) * 14, 30 + (i // 3) * 14, 4) for i in range(6)]),
    "", "alarm keypad intruder EZS", "klávesnice EZS zabezpečení")
add("gen-thermostat-room", G, "Room thermostat", "Prostorový termostat",
    g(rect(28, 20, 64, 40, rx=4), text(60, 46, "θ °C", 14), line(60, 60, 60, 74)),
    "", "room thermostat heating", "prostorový termostat topení")
add("gen-heating", G, "Electric heating appliance", "Elektrické topné těleso",
    g(rect(24, 26, 72, 28), *[line(36 + i * 16, 26, 36 + i * 16, 54) for i in range(4)], line(60, 54, 60, 72)),
    "IEC 60617-11-07-02", "heater heating element", "topné těleso přímotop")
add("gen-floor-heating", G, "Electric floor heating", "Elektrické podlahové vytápění",
    g(path("M 18 26 h 60 a 8 8 0 0 1 0 16 h -60 a 8 8 0 0 0 0 16 h 60"), text(60, 74, "podlaha", 11)),
    "", "underfloor heating mat cable", "podlahové topení rohož kabel")
add("gen-fan", G, "Fan / ventilator", "Ventilátor",
    g(circ(60, 38, 22), path("M 60 38 L 42 24 A 22 22 0 0 1 66 20 Z", fill="currentColor"),
      path("M 60 38 L 78 52 A 22 22 0 0 1 54 56 Z", fill="currentColor"), line(60, 60, 60, 74)),
    "IEC 60617-11-07-05", "fan ventilator extractor", "ventilátor odsávání")
add("gen-appliance", G, "Appliance (general)", "Spotřebič (obecná značka)",
    g(rect(28, 22, 64, 36, rx=3), line(60, 58, 60, 74)), "", "appliance load general",
    "spotřebič zátěž obecně")
add("gen-load", G, "Load / consumer", "Zátěž (odběr)",
    g(rect(36, 22, 48, 36), path("M 36 22 L 84 58"), line(60, 58, 60, 74), line(60, 6, 60, 22)),
    "", "load consumer", "zátěž odběr spotřeba")
add("gen-pump", G, "Pump", "Čerpadlo",
    g(circ(60, 38, 22), path("M 50 28 L 72 38 L 50 48 Z"), line(60, 60, 60, 74)),
    "", "pump water circulation", "čerpadlo oběhové")
add("gen-plc", G, "PLC / controller", "Řídicí jednotka (PLC)",
    g(rect(22, 18, 76, 44, rx=3), line(22, 34, 98, 34), text(60, 30, "PLC", 12),
      *[line(34 + i * 16, 62, 34 + i * 16, 72) for i in range(4)]),
    "", "PLC controller automation KNX", "PLC řídicí jednotka automatizace KNX")
add("gen-knx", G, "Bus device (KNX)", "Sběrnicový přístroj (KNX)",
    g(rect(26, 22, 68, 34, rx=3), text(60, 45, "KNX", 15), line(14, 66, 106, 66), line(60, 56, 60, 66)),
    "", "KNX bus smart home", "KNX sběrnice inteligentní elektroinstalace")
add("gen-bus", G, "Bus / data line", "Sběrnice (datové vedení)",
    g(line(10, 34, 110, 34), line(10, 46, 110, 46), text(60, 70, "BUS", 12)),
    "", "bus data line communication", "sběrnice datové vedení komunikace")
add("gen-wireless", G, "Wireless link", "Bezdrátový přenos",
    g(dot(60, 60, 4), path("M 44 52 A 22 22 0 0 1 76 52"), path("M 34 44 A 36 36 0 0 1 86 44")),
    "", "wireless RF radio link", "bezdrátové rádiové spojení")
add("gen-note", G, "Reference / circuit designation", "Označení okruhu (odkaz)",
    g(circ(60, 38, 22), text(60, 45, "A1", 17), line(60, 60, 60, 74)),
    "", "circuit number reference designation", "číslo okruhu označení odkaz")
add("gen-arrow-supply", G, "Supply direction", "Směr napájení",
    g(line(16, 40, 92, 40), path("M 104 40 L 86 30 L 86 50 Z", fill="currentColor")),
    "", "direction of supply feed", "směr napájení přívod")

# ------------------------------------------------------------------- output
CATS = [
    {"id": "sockets", "en": "Sockets & outlets", "cs": "Zásuvky a vývody"},
    {"id": "switches", "en": "Switches & control", "cs": "Vypínače a ovládání"},
    {"id": "lighting", "en": "Lighting", "cs": "Svítidla a osvětlení"},
    {"id": "protection", "en": "Protection devices", "cs": "Jističe, chrániče, pojistky"},
    {"id": "boards", "en": "Distribution boards", "cs": "Rozvaděče a krabice"},
    {"id": "sources", "en": "Sources & machines", "cs": "Zdroje a stroje"},
    {"id": "measuring", "en": "Measuring instruments", "cs": "Měřicí přístroje"},
    {"id": "general", "en": "General schematic", "cs": "Obecné schematické značky"},
]

def main():
    out = os.path.join(os.path.dirname(__file__), "..", "..", "apps", "symbols", "data", "symbols.json")
    data = {
        "meta": {
            "standard": "ČSN EN 60617 / IEC 60617, ČSN EN 60617-11 (installation drawings)",
            "viewBox": "0 0 120 80",
            "count": len(SYMBOLS),
        },
        "categories": CATS,
        "symbols": SYMBOLS,
    }
    with open(os.path.abspath(out), "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    print(f"{len(SYMBOLS)} symbols -> {os.path.abspath(out)}")
    cats = {}
    for s in SYMBOLS:
        cats[s["cat"]] = cats.get(s["cat"], 0) + 1
    for c in CATS:
        print(f"  {c['id']:12} {cats.get(c['id'], 0)}")
    missing = set(cats) - {c["id"] for c in CATS}
    assert not missing, missing

if __name__ == "__main__":
    main()
