/* Fluid Velocity Background using GPU-IO with auto-performance tuning */
(function () {
  const canvas = document.getElementById('fluid-bg');
  if (!canvas) return;

  const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent || '');

  // Ensure GPU-IO is available
  if (!window.GPUIO) {
    return;
  }

  const { GPUComposer, GPULayer, GPUProgram, FLOAT, INT, NEAREST, CLAMP_TO_EDGE } = window.GPUIO;

  // Quality presets for auto-performance; controls resolution scaling and step budgeting
  const QUALITY = {
    high: { scale: 1.0, advectSteps: 2, decay: 0.996, forceBase: 0.042, radiusPx: 128 },
    medium: { scale: 0.8, advectSteps: 2, decay: 0.992, forceBase: 0.038, radiusPx: 124 },
    low: { scale: 0.6, advectSteps: 1, decay: 0.986, forceBase: 0.034, radiusPx: 118 },
    minimal: { scale: 0.45, advectSteps: 1, decay: 0.980, forceBase: 0.030, radiusPx: 110 },
  };

  let currentPreset = reducedMotion ? 'minimal' : (isMobile ? 'medium' : 'high');
  let composer;
  let velocity;
  let ink;
  let advectProgram, injectProgram, decayProgram;
  let advectInkProgram, injectInkProgram, decayInkProgram, renderInkProgram;
  let running = false;

  // Pointer state (use window events so canvas can remain pointer-events:none)
  const pointer = {
    down: false,
    x: 0,
    y: 0,
    dx: 0,
    dy: 0,
    lastX: 0,
    lastY: 0,
  };

  function setCanvasSize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.floor((window.innerWidth || document.documentElement.clientWidth) * dpr));
    const h = Math.max(1, Math.floor((window.innerHeight || document.documentElement.clientHeight) * dpr));
    canvas.width = w;
    canvas.height = h;
    canvas.style.width = (w / dpr) + 'px';
    canvas.style.height = (h / dpr) + 'px';
  }

  //
  // Nota: funciones auxiliares no utilizadas han sido removidas para reducir warnings ESLint.
  //

  function buildPrograms() {
    const w = velocity.width;
    const h = velocity.height;
    const pxSize = [1 / w, 1 / h];

    advectProgram = new GPUProgram(composer, {
      name: 'advectVelocity',
      fragmentShader: `
        in vec2 v_uv;
        uniform sampler2D u_vel;
        uniform vec2 u_pxSize;
        uniform float u_dt;
        out vec2 out_result;
        void main() {
          vec2 vel = texture(u_vel, v_uv).xy;
          // Simple semi-Lagrangian advection
          // Convert velocity in pixel units to UV units using pixel size
          vec2 prevUV = v_uv - (vel * u_dt) * u_pxSize;
          vec2 adv = texture(u_vel, prevUV).xy;
          out_result = adv;
        }
      `,
      uniforms: [
        { name: 'u_vel', value: 0, type: INT },
        { name: 'u_pxSize', value: pxSize, type: FLOAT },
        { name: 'u_dt', value: 0.98, type: FLOAT },
      ],
    });

    injectProgram = new GPUProgram(composer, {
      name: 'injectForce',
      fragmentShader: `
        in vec2 v_uv;
        uniform sampler2D u_vel;
        uniform vec2 u_mouse;
        uniform float u_force; // scalar impulse strength
        uniform float u_radius; // radius in UV space
        out vec2 out_result;
        void main() {
          vec2 v = texture(u_vel, v_uv).xy;
          vec2 diff = v_uv - u_mouse;
          float dist = length(diff);
          float R = max(u_radius, 0.0001);
          float falloff = exp(- (dist*dist) / (R * R));
          // Robust tangent direction (avoid NaNs at center)
          vec2 dir = dist > 1e-4 ? diff / dist : vec2(0.0);
          vec2 tangent = vec2(-dir.y, dir.x);
          // Pure swirl impulse around cursor plus a tiny radial push
          v += tangent * u_force * falloff;
          v += dir * (u_force * 0.12) * falloff;
          out_result = v;
        }
      `,
      uniforms: [
        { name: 'u_vel', value: 0, type: INT },
        { name: 'u_mouse', value: [0.5, 0.5], type: FLOAT },
        { name: 'u_force', value: 0.0, type: FLOAT },
        { name: 'u_radius', value: (QUALITY[currentPreset].radiusPx * 1.25) / Math.max(w, h), type: FLOAT },
      ],
    });

    decayProgram = new GPUProgram(composer, {
      name: 'decay',
      fragmentShader: `
        in vec2 v_uv;
        uniform sampler2D u_vel;
        uniform float u_decay;
        out vec2 out_result;
        void main() {
          vec2 v = texture(u_vel, v_uv).xy;
          out_result = v * u_decay;
        }
      `,
      uniforms: [
        { name: 'u_vel', value: 0, type: INT },
        { name: 'u_decay', value: QUALITY[currentPreset].decay, type: FLOAT },
      ],
    });

    // Renderizadores de velocidad no usados han sido eliminados para evitar sobrecarga.

    // ---- Ink trail programs (scalar field advected by velocity) ----
    advectInkProgram = new GPUProgram(composer, {
      name: 'advectInk',
      fragmentShader: `
        in vec2 v_uv;
        uniform sampler2D u_ink;
        uniform sampler2D u_vel;
        uniform vec2 u_pxSize;
        uniform float u_dt;
        out float out_value;
        void main(){
          vec2 vel = texture(u_vel, v_uv).xy;
          vec2 prevUV = v_uv - (vel * u_dt) * u_pxSize;
          float dens = texture(u_ink, prevUV).x;
          out_value = dens;
        }
      `,
      uniforms: [
        { name: 'u_ink', value: 0, type: INT },
        { name: 'u_vel', value: 1, type: INT },
        { name: 'u_pxSize', value: pxSize, type: FLOAT },
        { name: 'u_dt', value: 0.98, type: FLOAT },
      ],
    });

    injectInkProgram = new GPUProgram(composer, {
      name: 'injectInk',
      fragmentShader: `
        in vec2 v_uv;
        uniform sampler2D u_ink;
        uniform vec2 u_mouse;
        uniform float u_strength;
        uniform float u_radius;
        out float out_value;
        float gauss(vec2 p, vec2 c, float r){
          vec2 d = p - c; float rr = max(r, 1e-4); return exp(-dot(d,d)/(rr*rr));
        }
        void main(){
          float dens = texture(u_ink, v_uv).x;
          float add = u_strength * gauss(v_uv, u_mouse, u_radius);
          out_value = clamp(dens + add, 0.0, 1.0);
        }
      `,
      uniforms: [
        { name: 'u_ink', value: 0, type: INT },
        { name: 'u_mouse', value: [0.5, 0.5], type: FLOAT },
        { name: 'u_strength', value: 0.0, type: FLOAT },
        { name: 'u_radius', value: (QUALITY[currentPreset].radiusPx * 0.9) / Math.max(w, h), type: FLOAT },
      ],
    });

    decayInkProgram = new GPUProgram(composer, {
      name: 'decayInk',
      fragmentShader: `
        in vec2 v_uv;
        uniform sampler2D u_ink;
        uniform float u_decay;
        out float out_value;
        void main(){
          float dens = texture(u_ink, v_uv).x;
          out_value = dens * u_decay;
        }
      `,
      uniforms: [
        { name: 'u_ink', value: 0, type: INT },
        { name: 'u_decay', value: 0.985, type: FLOAT },
      ],
    });

    renderInkProgram = new GPUProgram(composer, {
      name: 'renderInk',
      fragmentShader: `
        in vec2 v_uv;
        uniform sampler2D u_ink;
        uniform float u_gain;
        uniform float u_alpha;
        uniform vec3 u_color;
        out vec4 out_color;
        void main(){
          float d = texture(u_ink, v_uv).x;
          float a = clamp(d * u_gain * u_alpha, 0.0, 1.0);
          out_color = vec4(u_color, a);
        }
      `,
      uniforms: [
        { name: 'u_ink', value: 0, type: INT },
        { name: 'u_gain', value: 2.2, type: FLOAT },
        { name: 'u_alpha', value: 1.0, type: FLOAT },
        { name: 'u_color', value: [1.0, 0.92, 0.65], type: FLOAT },
      ],
    });
  }

  function initComposer() {
    if (composer) composer.dispose?.();
    // Initialize composer with supported options only
    composer = new GPUComposer({
      canvas,
      // Use straight alpha to avoid unintended brightening during page compositing
      contextAttributes: { alpha: true, premultipliedAlpha: false },
      clearValue: [0, 0, 0, 0],
      verboseLogging: false,
    });
    // Keep canvas transparent so strokes composite over the hero background
    canvas.style.background = 'transparent';
    try {
      if (composer.gl && typeof composer.gl.clearColor === 'function') {
        composer.gl.clearColor(0, 0, 0, 0);
        composer.gl.clear(composer.gl.COLOR_BUFFER_BIT);
      }
    } catch {}
    // Ensure composer matches canvas size
    composer.resize([canvas.width, canvas.height]);
  }

  function initLayers() {
    const preset = QUALITY[currentPreset];
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(16, Math.floor((canvas.width / dpr) * preset.scale));
    const height = Math.max(16, Math.floor((canvas.height / dpr) * preset.scale));

    // Initialize velocity field with no baseline motion to avoid page washout
    const seed = new Float32Array(width * height * 2);
    velocity = new GPULayer(composer, {
      name: 'velocity',
      dimensions: [width, height],
      numComponents: 2,
      type: FLOAT,
      filter: NEAREST,
      numBuffers: 2,
      wrapX: CLAMP_TO_EDGE,
      wrapY: CLAMP_TO_EDGE,
      array: seed,
    });
    // Seed ink with subtle noise so trails are visible immediately
    const inkSeed = new Float32Array(width * height);
    for (let i = 0; i < inkSeed.length; i++) {
      inkSeed[i] = Math.random() * 0.15; // slightly stronger noise
    }
    ink = new GPULayer(composer, {
      name: 'ink',
      dimensions: [width, height],
      numComponents: 1,
      type: FLOAT,
      filter: NEAREST,
      numBuffers: 2,
      wrapX: CLAMP_TO_EDGE,
      wrapY: CLAMP_TO_EDGE,
      array: inkSeed,
    });

    buildPrograms();
  }

  function setQualityPreset(profileId) {
    if (!QUALITY[profileId]) return;
    currentPreset = profileId;
    initLayers();
  }

  // Pointer event handling
  function onPointerMove(ev) {
    const x = ev.clientX;
    const y = ev.clientY;
    pointer.dx = x - pointer.lastX;
    pointer.dy = y - pointer.lastY;
    pointer.x = x;
    pointer.y = y;
    pointer.lastX = x;
    pointer.lastY = y;
  }
  function onPointerDown(ev) {
    pointer.down = true;
    onPointerMove(ev);
  }
  function onPointerUp() {
    pointer.down = false;
    pointer.dx = 0;
    pointer.dy = 0;
  }

  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerdown', onPointerDown, { passive: true });
  window.addEventListener('pointerup', onPointerUp, { passive: true });

  function stepSimulation() {
    if (!running) return;
    const preset = QUALITY[currentPreset];
    composer.tick();

    // Advect velocity
    for (let i = 0; i < preset.advectSteps; i++) {
      composer.step({ program: advectProgram, input: velocity, output: velocity });
    }

    // Ambient swirl: small baseline motion to keep idle subtly visible
    {
      const ambientForce = 0.08; // moderate idle motion
      injectProgram.setUniform('u_mouse', [0.5, 0.5]);
      injectProgram.setUniform('u_force', ambientForce);
      injectProgram.setUniform('u_radius', (QUALITY[currentPreset].radiusPx * 0.40) / Math.max(velocity.width, velocity.height));
      composer.step({ program: injectProgram, input: velocity, output: velocity });
    }

    // Inject mouse force if active
    if (pointer.down || (Math.abs(pointer.dx) + Math.abs(pointer.dy)) > 0.15) {
      const rect = canvas.getBoundingClientRect();
      const mouseUV = [
        Math.min(1, Math.max(0, (pointer.x - rect.left) / rect.width)),
        Math.min(1, Math.max(0, 1 - (pointer.y - rect.top) / rect.height)),
      ];
      // Even if pointer is slightly outside, allow clamped injection to keep reactivity
      // Strong, responsive swirl impulse for visible strokes
      const moveMag = Math.hypot(pointer.dx, pointer.dy);
      const base = pointer.down ? 0.9 : 0.35;
      const forceMag = Math.max(0.18, Math.min(moveMag / 8, 3.2) + base);
      injectProgram.setUniform('u_mouse', mouseUV);
      injectProgram.setUniform('u_force', forceMag);
      injectProgram.setUniform('u_radius', (QUALITY[currentPreset].radiusPx * 1.25) / Math.max(velocity.width, velocity.height));
      composer.step({ program: injectProgram, input: velocity, output: velocity });
      // decay pointer deltas quickly
      pointer.dx *= 0.5;
      pointer.dy *= 0.5;
    }

    // Apply decay
    decayProgram.setUniform('u_decay', preset.decay);
    composer.step({ program: decayProgram, input: velocity, output: velocity });

    // Clear the default framebuffer to avoid alpha accumulation (white wash)
    try {
      if (composer.gl && typeof composer.gl.clearColor === 'function') {
        composer.gl.clearColor(0, 0, 0, 0);
        composer.gl.clear(composer.gl.COLOR_BUFFER_BIT);
      }
    } catch {}

    // ---- Ink pipeline ----
    // Advect ink using latest velocity field
    advectInkProgram.setUniform('u_pxSize', [1 / velocity.width, 1 / velocity.height]);
    composer.step({ program: advectInkProgram, input: [ink, velocity], output: ink });

    // Inject ink at cursor when interacting
    if (pointer.down || (Math.abs(pointer.dx) + Math.abs(pointer.dy)) > 0.15) {
      const rect = canvas.getBoundingClientRect();
      const mouseUV = [
        Math.min(1, Math.max(0, (pointer.x - rect.left) / rect.width)),
        Math.min(1, Math.max(0, 1 - (pointer.y - rect.top) / rect.height)),
      ];
      const moveMag = Math.hypot(pointer.dx, pointer.dy);
      const s = Math.max(0.06, Math.min(moveMag / 12, 0.8));
      injectInkProgram.setUniform('u_mouse', mouseUV);
      injectInkProgram.setUniform('u_strength', s);
      injectInkProgram.setUniform('u_radius', (QUALITY[currentPreset].radiusPx * 0.45) / Math.max(velocity.width, velocity.height));
      composer.step({ program: injectInkProgram, input: ink, output: ink });
    }

    // Make trails fade faster for a snappier look
    decayInkProgram.setUniform('u_decay', 0.985);
    composer.step({ program: decayInkProgram, input: ink, output: ink });

    // Render ink to screen (blended within hero)
    renderInkProgram.setUniform('u_gain', 3.2);
    renderInkProgram.setUniform('u_alpha', 1.0);
    renderInkProgram.setUniform('u_color', [1.0, 0.92, 0.65]);
    composer.step({ program: renderInkProgram, input: ink, blendAlpha: true });

    // Remove amplitude fallback to avoid washing out UI

    requestAnimationFrame(stepSimulation);
  }

  function start() {
    // Si el usuario prefiere menos movimiento, no iniciar la animación
    if (reducedMotion) {
      try { canvas.style.display = 'none'; } catch {}
      return;
    }
    // Animación normal
    setCanvasSize();
    initComposer();
    initLayers();
    running = true;
    requestAnimationFrame(stepSimulation);
  }

  window.addEventListener('resize', () => {
    setCanvasSize();
    composer.resize([canvas.width, canvas.height]);
    initLayers();
  });

  // Pause GPU work when the tab is hidden; resume on visible
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      running = false;
    } else if (!running) {
      running = true;
      requestAnimationFrame(stepSimulation);
    }
  });

  // Start deferred on mobile (first interaction or idle), immediate on desktop
  function scheduleStart(){
    if (reducedMotion) {
      try { canvas.style.display = 'none'; } catch {}
      return;
    }
    if (isMobile) {
      const starter = function(){
        window.removeEventListener('pointerdown', starter);
        if (!running) start();
      };
      window.addEventListener('pointerdown', starter, { once: true, passive: true });
      if ('requestIdleCallback' in window) {
        requestIdleCallback(function(){ if (!running) start(); }, { timeout: 2500 });
      } else {
        setTimeout(function(){ if (!running) start(); }, 2000);
      }
    } else {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start, { once: true });
      } else {
        start();
      }
    }
  }
  scheduleStart();

  // Expose minimal API for performance mode control
  try {
    window.FluidBG = {
      setQualityPreset,
      pause: function(){ running = false; },
      resume: function(){ if (!running) { running = true; requestAnimationFrame(stepSimulation); } },
      isRunning: function(){ return !!running; }
    };
  } catch {}
})();