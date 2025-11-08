import xml.etree.ElementTree as ET
import math
from pathlib import Path

R = 6371000.0  # Earth radius in meters

def haversine(lat1, lon1, lat2, lon2):
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def load_trkpts(gpx_path: Path):
    tree = ET.parse(gpx_path)
    root = tree.getroot()
    ns = {'gpx': 'http://www.topografix.com/GPX/1/1'}
    points = []
    for trk in root.findall('gpx:trk', ns):
        for seg in trk.findall('gpx:trkseg', ns):
            for pt in seg.findall('gpx:trkpt', ns):
                lat = float(pt.attrib.get('lat'))
                lon = float(pt.attrib.get('lon'))
                ele_el = pt.find('gpx:ele', ns)
                ele = float(ele_el.text) if ele_el is not None else None
                points.append((lat, lon, ele))
    return points

def summarize(points):
    total_m = 0.0
    gain_m = 0.0
    loss_m = 0.0
    min_ele = None
    max_ele = None
    km_marks = []  # cumulative km for each point
    cum_m = 0.0
    last = None
    for p in points:
        lat, lon, ele = p
        if last is not None:
            d = haversine(last[0], last[1], lat, lon)
            cum_m += d
            total_m += d
            km_marks.append(cum_m / 1000.0)
            if ele is not None and last[2] is not None:
                de = ele - last[2]
                if de > 0:
                    gain_m += de
                else:
                    loss_m += -de
        else:
            km_marks.append(0.0)
        if ele is not None:
            min_ele = ele if (min_ele is None or ele < min_ele) else min_ele
            max_ele = ele if (max_ele is None or ele > max_ele) else max_ele
        last = p
    return {
        'total_km': total_m / 1000.0,
        'gain_m': gain_m,
        'loss_m': loss_m,
        'min_ele': min_ele,
        'max_ele': max_ele,
        'start': points[0] if points else None,
        'finish': points[-1] if points else None,
        'km_marks': km_marks,
    }

def segment_stats(km_marks, segments):
    # segments: list of dicts with kmIni, kmFin
    stats = []
    for seg in segments:
        ini = seg['kmIni']
        fin = seg['kmFin']
        # Find nearest indices for ini and fin
        idx_ini = min(range(len(km_marks)), key=lambda i: abs(km_marks[i] - ini))
        idx_fin = min(range(len(km_marks)), key=lambda i: abs(km_marks[i] - fin))
        km_len = km_marks[idx_fin] - km_marks[idx_ini]
        stats.append({ 'nombre': seg['nombre'], 'km': km_len, 'kmIni': ini, 'kmFin': fin, 'idx_ini': idx_ini, 'idx_fin': idx_fin })
    return stats

def main():
    gpx_path = Path('route') / 'vac.gpx'
    if not gpx_path.exists():
        print('ERROR: GPX no encontrado en', gpx_path)
        return 2
    pts = load_trkpts(gpx_path)
    if not pts:
        print('ERROR: sin puntos en GPX')
        return 3
    s = summarize(pts)
    print('Resumen GPX:')
    print(f" - Distancia total: {s['total_km']:.2f} km")
    print(f" - Desnivel positivo: {s['gain_m']:.0f} m | negativo: {s['loss_m']:.0f} m")
    print(f" - Elevación min/max: {s['min_ele']:.1f} m / {s['max_ele']:.1f} m")
    print(f" - Inicio: lat={s['start'][0]:.6f} lon={s['start'][1]:.6f} ele={s['start'][2]:.1f}")
    print(f" - Fin:    lat={s['finish'][0]:.6f} lon={s['finish'][1]:.6f} ele={s['finish'][2]:.1f}")

    # Segmentos definidos en la guía
    segmentos = [
        { 'nombre': 'Zócalo → La Loma', 'kmIni': 0,   'kmFin': 50 },
        { 'nombre': 'La Loma → Cañón de Lobos', 'kmIni': 50,  'kmFin': 110 },
        { 'nombre': 'Cañón de Lobos → Tres Marías', 'kmIni': 110, 'kmFin': 145 },
        { 'nombre': 'Tres Marías → Meta (C.U.)', 'kmIni': 145, 'kmFin': 187 },
    ]
    segs = segment_stats(s['km_marks'], segmentos)
    print('Segmentos (km medidos vs. esperados):')
    for seg in segs:
        esperado = seg['kmFin'] - seg['kmIni']
        print(f" - {seg['nombre']}: {seg['km']:.2f} km (esperado {esperado} km)")

    # Ganancia por segmento (aproximada)
    print('Desnivel positivo por segmento (aprox.):')
    pts = load_trkpts(Path('route') / 'vac.gpx')
    for seg in segs:
        gain = 0.0
        last_ele = None
        for i in range(seg['idx_ini'], seg['idx_fin'] + 1):
            ele = pts[i][2]
            if last_ele is not None and ele is not None:
                d = ele - last_ele
                if d > 0:
                    gain += d
            last_ele = ele
        print(f" - {seg['nombre']}: {gain:.0f} m +")

if __name__ == '__main__':
    main()