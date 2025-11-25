// Herramienta de planificación personal de la guía
// Extraído desde guia.html para cumplir CSP estricto (sin inline scripts)
(function(){
  // Parseo robusto de números (soporta coma decimal en móviles/español)
  function parseNum(val){
    if (val === undefined || val === null) return NaN;
    const s = String(val).trim().replace(',', '.');
    const n = Number(s);
    return Number.isFinite(n) ? n : NaN;
  }
  const distTotalKm = 187;
  const segmentos = [
    { nombre: "Zócalo → La Loma",   kmIni: 0,   kmFin: 50 },
    { nombre: "La Loma → Cañón de Lobos", kmIni: 50,  kmFin: 110 },
    { nombre: "Cañón de Lobos → Tres Marías", kmIni: 110, kmFin: 145 },
    { nombre: "Tres Marías → Meta (C.U.)", kmIni: 145, kmFin: 187 }
  ];
  // Métricas de segmento desde GPX (distancias según hitos y ganancia positiva aproximada)
  const gpxSegMetrics = [
    { nombre: "Zócalo → La Loma", kmIni: 0, kmFin: 50, gain: 733 },
    { nombre: "La Loma → Cañón de Lobos", kmIni: 50, kmFin: 110, gain: 304 },
    { nombre: "Cañón de Lobos → Tres Marías", kmIni: 110, kmFin: 145, gain: 1479 },
    { nombre: "Tres Marías → Meta (C.U.)", kmIni: 145, kmFin: 187, gain: 357 }
  ];
  const slopeMax = (function(){
    let max = 0;
    gpxSegMetrics.forEach(m=>{ const km = (m.kmFin - m.kmIni); if(km>0){ const s = m.gain / km; if(s>max) max=s; } });
    return max>0 ? max : 1;
  })();
  const ALPHA_SEG_SLOPE = 2.0; // Intensifica el peso por pendiente relativa (0–2 recomendado)
  // Coeficientes de ajuste metabólico por segmento (físico/aerodinámico)
  const BETA_SLOPE_CHO = 0.12, BETA_SLOPE_HYD = 0.08, BETA_SLOPE_NA = 0.08;
  const BETA_MASS_CHO = 0.01,  BETA_MASS_HYD = 0.005, BETA_MASS_NA = 0.004;
  const BETA_DRAG_CHO = 0.02,  BETA_DRAG_HYD = 0.01,  BETA_DRAG_NA = 0.01;
  function bikeDragIndex({tipoBici=null, rodada=null, anchoLlanta=null}){
    const fType = { ruta:0.00, gravel:0.03, mtb:0.06, fixie:0.02 }; // aprox. mayor resistencia aerodinámica/rodadura
    const t = tipoBici || 'ruta';
    let idx = fType[t] || 0.00;
    if (rodada === '29' || rodada === '650b') idx += 0.008;
    else if (rodada === '27.5') idx += 0.004;
    else if (rodada === '26') idx += 0.010;
    if (typeof anchoLlanta === 'number' && !isNaN(anchoLlanta)){
      if (anchoLlanta >= 45) idx += 0.030;
      else if (anchoLlanta >= 35) idx += 0.015;
      else if (anchoLlanta >= 28) idx += 0.008;
    }
    return clamp(idx, 0.00, 0.12);
  }
  function bikeMassIndex({tipoBici=null, pesoBici=null}){
    const baseWeight = { ruta:8.5, gravel:9.5, mtb:12, fixie:9 };
    const t = tipoBici || 'ruta'; const bw = baseWeight[t] || 9.5;
    const wDelta = (typeof pesoBici === 'number' && !isNaN(pesoBici)) ? (pesoBici - bw) : 0;
    return clamp(wDelta, -4, 10);
  }
  function segmentMetabolicFactors(seg, {tipoBici, pesoBici, rodada, anchoLlanta}){
    const kmSeg = seg.kmFin - seg.kmIni;
    const m = gpxSegMetrics.find(x => x.kmIni === seg.kmIni && x.kmFin === seg.kmFin);
    const gain = m ? m.gain : 0;
    const slope = kmSeg>0 ? (gain / kmSeg) : 0; // m/km
    const slopeNorm = slopeMax>0 ? (slope / slopeMax) : 0;
    const dIdx = bikeDragIndex({tipoBici, rodada, anchoLlanta});
    const mIdx = bikeMassIndex({tipoBici, pesoBici});
    const fCHO = clamp(1 + BETA_SLOPE_CHO*slopeNorm + BETA_DRAG_CHO*dIdx + BETA_MASS_CHO*mIdx, 0.95, 1.30);
    const fHYD = clamp(1 + BETA_SLOPE_HYD*slopeNorm + BETA_DRAG_HYD*dIdx + BETA_MASS_HYD*mIdx, 0.92, 1.25);
    const fNA  = clamp(1 + BETA_SLOPE_NA*slopeNorm + BETA_DRAG_NA*dIdx + BETA_MASS_NA*mIdx, 0.92, 1.25);
    return { fCHO, fHYD, fNA, slopeNorm, dIdx, mIdx };
  }
  const eq = [
    { item:"1 gel", g:25 },
    { item:"1 plátano mediano", g:25 },
    { item:"8 dátiles (~50 g)", g:28 },
    { item:"1 barra típica", g:25 },
    { item:"sándwich sencillo", g:45 },
    { item:"tortilla + crema de cacahuate", g:30 },
    { item:"papas cocidas saladas (1 taza)", g:30 },
    { item:"gominolas porción", g:30 }
  ];
  function parseTiempoHHMM(t){
    if(!t) return null;
    t = String(t).trim().replace(',', '.');
    // Formato hh:mm
    let m = t.match(/^(\d{1,2}):(\d{1,2})$/);
    if (m) {
      let h = parseInt(m[1],10), min = parseInt(m[2],10);
      if (isNaN(h) || isNaN(min)) return null;
      if (min >= 60) { h += Math.floor(min/60); min = min % 60; }
      return h + (min/60);
    }
    // Horas decimales: "10" o "10.5"
    m = t.match(/^(\d{1,2})(?:\.(\d{1,2}))?$/);
    if (m) {
      let h = parseInt(m[1],10);
      let frac = m[2] ? parseInt(m[2],10) : 0;
      let base = m[2] ? Math.pow(10, m[2].length) : 1;
      let min = Math.round((frac / base) * 60);
      if (min >= 60) { h += 1; min = 0; }
      return h + (min/60);
    }
    return null;
  }
  function formatearTiempoObjetivoInput(inputEl){
    if(!inputEl || !inputEl.value) return;
    const horas = parseTiempoHHMM(inputEl.value);
    if (horas === null) return;
    let h = Math.floor(horas);
    let min = Math.round((horas - h) * 60);
    if (min >= 60) { h += 1; min = 0; }
    inputEl.value = String(h).padStart(2,'0') + ':' + String(min).padStart(2,'0');
  }
  function clamp(v,min,max){ return Math.max(min, Math.min(max,v)); }
  // Factores auxiliares por entrenamiento, edad y superficie corporal
  function trainingFactors(hrs){
    const h = Number(hrs)||0;
    const fCHO = clamp(1 + (h - 6) * 0.02, 0.90, 1.12);      // mayor entrenamiento → mejor tolerancia CHO
    const fHyd = clamp(1 + (h - 6) * 0.01, 0.94, 1.08);       // mejor manejo de hidratación
    const fSpeed = clamp(1 + (h - 6) * 0.015, 0.92, 1.10);    // condición física → más velocidad
    return { fCHO, fHyd, fSpeed };
  }
  function ageFactors(age){
    const a = Number(age)||0;
    const fHydAge = clamp(1 + (35 - a) * 0.001, 0.97, 1.03);  // jóvenes sudan un poco más; mayores un poco menos
    const fSpeedAge = clamp(1 - (a - 35) * 0.0015, 0.90, 1.06); // edad avanzada reduce ligeramente velocidad; jóvenes aumentan
    return { fHydAge, fSpeedAge };
  }
  function bsaMosteller(heightCm, weightKg){ // área superficial corporal (m^2)
    const h = Number(heightCm)||0, w = Number(weightKg)||0;
    if(!h||!w) return 1.9; // referencia media
    return Math.sqrt((h * w) / 3600);
  }
  // Factor de velocidad ajustado por tipo de bicicleta, peso, rodada y ancho
  function speedFactorPorBici({tipoBici=null, pesoBici=null, rodada=null, anchoLlanta=null}){
    const baseWeight = { ruta:8.5, gravel:9.5, mtb:12, fixie:9 };
    const fType = { ruta:1.00, gravel:0.97, mtb:0.93, fixie:0.98 };
    const t = tipoBici || 'ruta';
    let f = fType[t] || 1.00;
    const bw = baseWeight[t] || 9.5;
    const wDelta = (typeof pesoBici === 'number' && !isNaN(pesoBici)) ? (pesoBici - bw) : 0;
    const fWeight = clamp(1 - wDelta * 0.004, 0.94, 1.06); // ~0.4% por kg respecto al peso base
    f *= fWeight;
    if (rodada === '29') f *= 0.992;
    else if (rodada === '650b') f *= 0.990;
    else if (rodada === '27.5') f *= 0.995;
    else if (rodada === '26') f *= 0.988;
    else if (rodada === '700c') f *= 1.000;
    if (typeof anchoLlanta === 'number' && !isNaN(anchoLlanta)){
      if (anchoLlanta >= 45) f *= 0.98;
      else if (anchoLlanta >= 35) f *= 0.99;
      else if (anchoLlanta >= 28) f *= 0.995;
    }
    return clamp(f, 0.88, 1.08);
  }
  function calcObjetivos({peso,nivel,tolerancia,clima,sudor, tiempoObjetivo=null, tipoBici=null, pesoBici=null, rodada=null, anchoLlanta=null, edad=null, est=null, horasSem=null}){
    let baseCHO=60; if(tolerancia==="alta") baseCHO=80; if(tolerancia==="baja") baseCHO=50;
    const choPorKg = clamp(0.8 + (tolerancia==="alta"?0.2:(tolerancia==="baja"?-0.1:0)), 0.6, 1.2);
    let gHora = Math.round(clamp(choPorKg * peso, 45, 90));
    if(nivel==="avanzado") gHora = Math.max(gHora, baseCHO+5);
    if(nivel==="nuevo") gHora = Math.min(gHora, baseCHO);
    let mlHora = 600; if(clima==="frio") mlHora=400; if(clima==="calor") mlHora=850; if(sudor==="alta") mlHora+=100; if(sudor==="salada") mlHora+=150; mlHora = clamp(mlHora, 300, 1100);
    let naHora = 450; if(clima==="calor") naHora=700; if(sudor==="alta") naHora+=150; if(sudor==="salada") naHora+=250; naHora = clamp(naHora, 300, 1200);

    // Ajustes por entrenamiento, edad y superficie corporal
    const { fCHO, fHyd, fSpeed } = trainingFactors(horasSem);
    const { fHydAge } = ageFactors(edad);
    const bsa = bsaMosteller(est, peso);
    const fBSAHyd = clamp(1 + (bsa - 1.9) * 0.05, 0.95, 1.05);
    gHora = Math.round(clamp(gHora * fCHO, 45, 100));
    const mlPrev = mlHora; mlHora = Math.round(clamp(mlHora * fHyd * fHydAge * fBSAHyd, 300, 1100));
    const relHyd = clamp(mlHora / mlPrev, 0.90, 1.12);
    naHora = Math.round(clamp(naHora * (1 + (relHyd - 1) * 0.9), 300, 1200));

    // Ajustes suaves por tiempo objetivo (si el usuario definió uno)
    if (tiempoObjetivo && tiempoObjetivo > 0) {
      const delta = 10.5 - tiempoObjetivo; // <0: más lento, >0: más rápido
      const amp = (clima === "calor") ? 0.04 : 0.03; // mayor sensibilidad en calor
      const maxUp = (clima === "calor") ? 1.15 : 1.10;
      const factorHidratacion = clamp(1.0 + delta * amp, 0.90, maxUp);
      mlHora = Math.round(clamp(mlHora * factorHidratacion, 300, 1100));
      // Sodio ajusta en proporción ligeramente menor que el líquido
      const factorSodio = clamp(1.0 + delta * (amp * 0.85), 0.90, (clima === "calor" ? 1.14 : 1.09));
      naHora = Math.round(clamp(naHora * factorSodio, 300, 1200));

      // Ajuste leve de carbohidratos por hora según ritmo (±7% máx.)
      const factorCHO = clamp(1.0 + delta * 0.02, 0.93, 1.07);
      gHora = Math.round(clamp(gHora * factorCHO, 45, 100));

      // Microajuste adicional para extremos (>12 h o <9 h)
      if (tiempoObjetivo >= 12) {
        mlHora = Math.round(clamp(mlHora * 1.02, 300, 1100));
        naHora = Math.round(clamp(naHora * 1.02, 300, 1200));
      } else if (tiempoObjetivo <= 9) {
        mlHora = Math.round(clamp(mlHora * 0.98, 300, 1100));
        naHora = Math.round(clamp(naHora * 0.98, 300, 1200));
      }
    }

    // Ajustes opcionales según bicicleta (si se proporcionaron)
    if (tipoBici || pesoBici || rodada || anchoLlanta) {
      const baseWeight = { ruta:8.5, gravel:9.5, mtb:12, fixie:9 };
      const facChoByType = { ruta:1.00, gravel:1.03, mtb:1.05, fixie:1.02 };
      const facHydByType = { ruta:1.00, gravel:1.02, mtb:1.04, fixie:1.02 };
      const t = (tipoBici||'ruta');
      const bw = baseWeight[t] || 9.5;
      let wDelta = 0; if (typeof pesoBici === 'number' && !isNaN(pesoBici)) { wDelta = pesoBici - bw; }
      const facWeightCHO = clamp(1 + wDelta * 0.015, 0.95, 1.12);
      const facWeightHyd = clamp(1 + wDelta * 0.008, 0.96, 1.08);
      let facWheelCHO = 1.00; let facWheelHyd = 1.00;
      if (rodada === '29' || rodada === '650b') { facWheelCHO *= 1.01; facWheelHyd *= 1.01; }
      else if (rodada === '27.5') { facWheelCHO *= 1.005; facWheelHyd *= 1.005; }
      else if (rodada === '26') { facWheelCHO *= 0.995; facWheelHyd *= 0.995; }
      let facWidthCHO = 1.00; let facWidthHyd = 1.00;
      if (typeof anchoLlanta === 'number' && !isNaN(anchoLlanta)) {
        if (anchoLlanta >= 45) { facWidthCHO *= 1.03; facWidthHyd *= 1.02; }
        else if (anchoLlanta >= 35) { facWidthCHO *= 1.02; facWidthHyd *= 1.01; }
        else if (anchoLlanta >= 28) { facWidthCHO *= 1.01; }
      }
      const facCHO = clamp((facChoByType[t]||1.00) * facWeightCHO * facWheelCHO * facWidthCHO, 0.93, 1.15);
      const facHyd = clamp((facHydByType[t]||1.00) * facWeightHyd * facWheelHyd * facWidthHyd, 0.92, 1.14);
      gHora = Math.round(clamp(gHora * facCHO, 45, 100));
      const prevMl = mlHora; mlHora = Math.round(clamp(mlHora * facHyd, 300, 1100));
      const hydRel = clamp(mlHora / prevMl, 0.90, 1.12);
      const facNa = clamp(1 + (hydRel - 1) * 0.9, 0.90, 1.12);
      naHora = Math.round(clamp(naHora * facNa, 300, 1200));
    }

    return { gHora, mlHora, naHora, _interno:{ fCHO, fHyd, fSpeed, bsa } };
  }
  function tiempoSegmentoHoras(seg, horasTotales){
    const kmSeg = seg.kmFin - seg.kmIni;
    // Ponderación por pendiente relativa usando métricas del GPX
    const m = gpxSegMetrics.find(x => x.kmIni === seg.kmIni && x.kmFin === seg.kmFin);
    const gain = m ? m.gain : 0;
    const slope = kmSeg>0 ? (gain / kmSeg) : 0; // m por km
    const slopeNorm = slopeMax>0 ? (slope / slopeMax) : 0;
    const weightSeg = kmSeg * (1 + ALPHA_SEG_SLOPE * slopeNorm);
    const sumWeights = gpxSegMetrics.reduce((acc, x)=>{
      const k = x.kmFin - x.kmIni; if(k<=0) return acc;
      const s = x.gain / k; const sn = slopeMax>0 ? (s / slopeMax) : 0;
      return acc + k * (1 + ALPHA_SEG_SLOPE * sn);
    }, 0);
    const propor = sumWeights>0 ? (weightSeg / sumWeights) : (kmSeg / distTotalKm);
    return propor * horasTotales;
  }
  function redondear(n,dec=0){ const f=Math.pow(10,dec); return Math.round(n*f)/f; }
  function construirTexto(txt){ return new Blob([txt],{type:"text/plain"}); }
  const $ = (sel)=>document.querySelector(sel);
  const perfil = { edad:$("#edad"), est:$("#estatura"), peso:$("#peso"), nivel:$("#nivel"), horas:$("#horas"), objetivo:$("#objetivo"), clima:$("#clima"), sudor:$("#sudor"), tol:$("#tolerancia"), bidon:$("#bidon"), cafe:$("#cafe"), mgkg:$("#mgkg"), tipoBici:$("#tipoBici"), pesoBici:$("#pesoBici"), rodada:$("#rodada"), anchoLlanta:$("#anchoLlanta") };
  if (perfil.objetivo) { perfil.objetivo.addEventListener('blur', function(){ formatearTiempoObjetivoInput(perfil.objetivo); }); }
  const btnGenerar=$("#generar"), btnLimpiar=$("#limpiar"), contSalida=$("#salida"), kpi=$("#kpi"), objetivosUl=$("#objetivos"), segDiv=$("#segmentos"), racionesUl=$("#raciones"), btnDesc=$("#descargar"), avisoCafe=$("#avisoCafe"), avisoError=$("#avisoError");
  function showError(msg){
    if (avisoError){
      avisoError.innerHTML = msg;
      avisoError.hidden = false;
      try { avisoError.focus(); } catch(_){ }
    } else {
      // Fallback si no existe contenedor accesible
      alert(msg);
    }
  }
  btnLimpiar.addEventListener("click", ()=>{ document.getElementById("perfil").reset(); contSalida.hidden = true; kpi.innerHTML = objetivosUl.innerHTML = segDiv.innerHTML = racionesUl.innerHTML = ""; if(avisoCafe){ avisoCafe.hidden = true; avisoCafe.innerHTML=""; } });
  btnGenerar.addEventListener("click", (e)=>{
    e.preventDefault();
    const edad=parseNum(perfil.edad.value), est=parseNum(perfil.est.value), peso=parseNum(perfil.peso.value), nivel=perfil.nivel.value, horasSem=parseNum(perfil.horas.value), clima=perfil.clima.value, sudor=perfil.sudor.value, tol=perfil.tol.value, bidonRaw=parseNum(perfil.bidon.value), usaCafe=perfil.cafe.value==="si", mgkg=clamp(parseNum(perfil.mgkg.value), 0, 6);
    const bidon = clamp((Number.isFinite(bidonRaw)?bidonRaw:600), 200, 1200);
    const tipoBici = (perfil.tipoBici && perfil.tipoBici.value) ? perfil.tipoBici.value : null;
    const pesoBici = (perfil.pesoBici && perfil.pesoBici.value) ? clamp(parseNum(perfil.pesoBici.value), 5, 25) : null;
    const rodada = (perfil.rodada && perfil.rodada.value) ? perfil.rodada.value : null;
    const anchoLlanta = (perfil.anchoLlanta && perfil.anchoLlanta.value) ? clamp(parseNum(perfil.anchoLlanta.value), 18, 65) : null;
    const valid = Number.isFinite(edad) && edad>0 && Number.isFinite(est) && est>0 && Number.isFinite(peso) && peso>0 && Number.isFinite(horasSem) && horasSem>=0;
    if(!valid){
      showError("Completa edad, estatura y peso. Las horas pueden ser 0.");
      contSalida.hidden = true;
      return;
    }
    if (avisoError){ avisoError.hidden = true; avisoError.innerHTML = ""; }
    formatearTiempoObjetivoInput(perfil.objetivo);
    let tObjetivo = parseTiempoHHMM(perfil.objetivo.value||"");
    let usarTiempoObjetivo = (tObjetivo !== null);
    const tBase = (nivel==="avanzado")?9.5:(nivel==="intermedio"?10.5:11.5);
    // Factores para transparencia en KPI
    let fVelBiciLocal = 1.00, fSpeedLocal = 1.00, fSpeedAgeLocal = 1.00, fVelTotalLocal = 1.00;
    if (!usarTiempoObjetivo) {
      fVelBiciLocal = speedFactorPorBici({ tipoBici, pesoBici, rodada, anchoLlanta });
      const tf = trainingFactors(horasSem); fSpeedLocal = tf.fSpeed;
      const af = ageFactors(edad); fSpeedAgeLocal = af.fSpeedAge;
      fVelTotalLocal = clamp(fVelBiciLocal * fSpeedLocal * fSpeedAgeLocal, 0.86, 1.12);
      tObjetivo = redondear(tBase / fVelTotalLocal, 2);
    }
    const { gHora, mlHora, naHora } = calcObjetivos({ 
      peso, 
      nivel, 
      tolerancia:tol, 
      clima, 
      sudor,
      tiempoObjetivo: usarTiempoObjetivo ? tObjetivo : null,
      tipoBici, pesoBici, rodada, anchoLlanta,
      edad, est, horasSem
    });
    const velocidadPromedio = distTotalKm / tObjetivo;
    const modoCalculoTexto = usarTiempoObjetivo ? 'Tiempo específico' : 'Estimación automática';
    const imc = peso / Math.pow(est/100, 2);
    const ajusteKPI = usarTiempoObjetivo ? "" : `
          <div><div class="muted">Ajuste bici/entreno/edad</div><div class="mono">×${redondear(fVelTotalLocal,2)} (bici ${redondear(fVelBiciLocal,2)} · entreno ${redondear(fSpeedLocal,2)} · edad ${redondear(fSpeedAgeLocal,2)})</div></div>`;
    kpi.innerHTML = `
          <div><div class="muted">Tiempo objetivo</div><div class="mono">${redondear(tObjetivo,2)} h</div></div>
          <div><div class="muted">Velocidad promedio</div><div class="mono">${redondear(velocidadPromedio,1)} km/h</div></div>
          <div><div class="muted">IMC (ref.)</div><div class="mono">${redondear(imc,1)}</div></div>
          <div><div class="muted">Entreno/sem</div><div class="mono">${horasSem} h</div></div>
          <div><div class="muted">Clima</div><div class="mono">${clima}</div></div>
          <div><div class="muted">Modo cálculo</div><div class="mono">${modoCalculoTexto}</div></div>
          ${ajusteKPI}`;
    const CAFFEINE_MAX_TOTAL = 400; const CAFFEINE_MAX_DOSE = 200;
    const mgDeseado = Math.round(mgkg * peso);
    const mgPlan = Math.min(mgDeseado, CAFFEINE_MAX_TOTAL);
    const advCafe = usaCafe && mgDeseado > CAFFEINE_MAX_TOTAL;
    objetivosUl.innerHTML = `
          <li>Hidratos: <strong>${gHora} g/h</strong></li>
          <li>Sodio: <strong>${naHora} mg/h</strong></li>
          <li>Líquidos: <strong>${mlHora} ml/h</strong> &nbsp; (bidón ${bidon} ml → ~${redondear(mlHora/bidon,2)} bidones/h)</li>
          ${usaCafe ? `<li>Cafeína total orientativa: <strong>${mgPlan}</strong> mg (máx. salud ${CAFFEINE_MAX_TOTAL} mg; sugerencia ≤${CAFFEINE_MAX_DOSE} mg por toma)</li>` : ``}
          ${advCafe ? `<li class="muted">Advertencia: ingresaste ${mgDeseado} mg; se limita a ${CAFFEINE_MAX_TOTAL} mg por seguridad.</li>` : ``}`;
    if (bidonRaw && bidonRaw !== bidon){
      objetivosUl.innerHTML += `<li class="muted">Nota: bidón ajustado a ${bidon} ml para cálculos (entrada: ${bidonRaw} ml).</li>`;
    } else if (!bidonRaw){
      objetivosUl.innerHTML += `<li class="muted">Nota: sin valor de bidón; se usa ${bidon} ml por defecto.</li>`;
    }
    if (avisoCafe) {
      if (usaCafe) {
        const textoBase = `
              <strong>Advertencia de cafeína:</strong> máximo ${CAFFEINE_MAX_TOTAL} mg totales en el día y ≤${CAFFEINE_MAX_DOSE} mg por toma.
            `;
        const textoExtra = advCafe ? ` Ingresaste ${mgDeseado} mg; se limitará a ${CAFFEINE_MAX_TOTAL} mg por seguridad.` : '';
        avisoCafe.innerHTML = textoBase + textoExtra;
        avisoCafe.hidden = false;
      } else {
        avisoCafe.innerHTML = '';
        avisoCafe.hidden = true;
      }
    }
    let textoExport = []; segDiv.innerHTML = ""; let totalG=0,totalNa=0,totalMl=0,totalBid=0;
    segmentos.forEach(seg=>{
      const horasSeg = tiempoSegmentoHoras(seg, tObjetivo);
      const { fCHO: fSegCHO, fHYD: fSegHYD, fNA: fSegNA } = segmentMetabolicFactors(seg, { tipoBici, pesoBici, rodada, anchoLlanta });
      const gSeg = Math.round(clamp(gHora * fSegCHO, 45, 120) * horasSeg);
      const mlSeg = Math.round(clamp(mlHora * fSegHYD, 300, 1400) * horasSeg);
      const naSeg0 = Math.round(clamp(naHora * fSegNA, 300, 1400) * horasSeg);
      const bidSeg = Math.ceil(mlSeg / bidon);
      totalG+=gSeg; totalNa+=naSeg0; totalMl+=mlSeg; totalBid+=bidSeg;
      const mInfo = gpxSegMetrics.find(x => x.kmIni === seg.kmIni && x.kmFin === seg.kmFin);
      const gainInfo = mInfo ? mInfo.gain : 0;
      const linea = `<div class=\"card\"><strong>${seg.nombre}</strong> — ${redondear(horasSeg,2)} h<div>Hidratos: <strong>${gSeg} g</strong> | Sodio: <strong>${naSeg0} mg</strong> | Líquidos: <strong>${mlSeg} ml</strong> (~${bidSeg} bidones)</div><div class=\"muted\">GPX: +${gainInfo} m · variación por pendiente/bici aplicada</div></div>`;
      segDiv.insertAdjacentHTML("beforeend", linea);
      textoExport.push(`${seg.nombre} (${redondear(horasSeg,2)} h): ${gSeg} g CHO | ${naSeg0} mg Na | ${mlSeg} ml (~${bidSeg} bidones) | GPX +${gainInfo} m`);
    });
    const raciones = ["1 gel: ~25 g","1 plátano mediano: ~25 g","8 dátiles (~50 g): ~28 g","1 barra típica: ~25 g","sándwich sencillo: ~45 g","tortilla + crema de cacahuate: ~30 g","papas cocidas saladas (1 taza): ~30 g","gominolas porción: ~30 g"]; racionesUl.innerHTML = raciones.map(r=>`<li>${r}</li>`).join("");
    const totalesHTML = `<div class=\"card\"><strong>Totales estimados para ${redondear(tObjetivo,2)} h</strong><div>Hidratos: <strong>${totalG} g</strong> | Sodio: <strong>${totalNa} mg</strong> | Líquidos: <strong>${totalMl} ml</strong> (~${totalBid} bidones)</div></div>`; segDiv.insertAdjacentHTML("beforeend", totalesHTML);
    const biciLinea = `Bicicleta: ${tipoBici||'—'} | Peso: ${pesoBici!=null?pesoBici+' kg':'—'} | Rodada: ${rodada||'—'} | Ancho: ${anchoLlanta!=null?anchoLlanta+' mm':'—'}`;
    const cafeLinea = usaCafe ? `Cafeína: ${mgkg} mg/kg → ${mgPlan} mg total${advCafe?" (limitado a 400 mg por salud)":""}` : `Cafeína: no`;
    const ajusteLinea = usarTiempoObjetivo ? '' : `Ajuste bici/entreno/edad: ×${redondear(fVelTotalLocal,2)} (bici ${redondear(fVelBiciLocal,2)} · entreno ${redondear(fSpeedLocal,2)} · edad ${redondear(fSpeedAgeLocal,2)})\n`;
    const bidonNota = (bidonRaw && bidonRaw !== bidon) ? `\nNota: bidón ajustado a ${bidon} ml para cálculos (entrada: ${bidonRaw} ml).` : (!bidonRaw ? `\nNota: sin valor de bidón; se usa ${bidon} ml por defecto.` : '');
    const exportTxt = `Vuelta al Cóndor — Plan personal\nTiempo objetivo: ${redondear(tObjetivo,2)} h\nVelocidad promedio: ${redondear(velocidadPromedio,1)} km/h\nModo de cálculo: ${modoCalculoTexto}\n${ajusteLinea}Entreno/sem: ${horasSem} h\nIMC (ref.): ${redondear(imc,1)}\nEdad: ${edad}, Estatura: ${est} cm, Peso: ${peso} kg, Nivel: ${nivel}\n${biciLinea}\nClima: ${clima}, Sudoración: ${sudor}, Tolerancia: ${tol}\n${cafeLinea}\nObjetivos/h: ${gHora} g CHO | ${naHora} mg Na | ${mlHora} ml (bidón ${bidon} ml)${bidonNota}\n\nPor segmento:\n${textoExport.map(l=>" - "+l).join("\n")}\n\nTotales: ${totalG} g CHO | ${totalNa} mg Na | ${totalMl} ml (~${totalBid} bidones)\nNotas:\n- Ajusta por sensaciones; ensaya tu estrategia en tiradas largas.\n- Advertencia cafeína: máx. ${CAFFEINE_MAX_TOTAL} mg totales en el día y ≤${CAFFEINE_MAX_DOSE} mg por toma; evita si tienes hipertensión, arritmias o sensibilidad.\n- Nada se almacena. Este archivo es solo para ti.\n`;
    btnDesc.onclick = ()=>{ const blob = construirTexto(exportTxt); const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='plan_personal_condor.txt'; document.body.appendChild(a); a.click(); URL.revokeObjectURL(url); a.remove(); };
    contSalida.hidden = false; window.scrollTo({ top: contSalida.offsetTop - 20, behavior: "smooth" });
  });
})();
