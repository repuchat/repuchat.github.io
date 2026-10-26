// Web version of the moving background in shaders/ambient.frag and
// lib/design/background/ambient_painter.dart.
(() => {
  const tintColors = ['#6a6a6a','#00c2ff','#8b5cff','#ff4fd8','#00e5b0','#ffd23f','#3d7bff','#ff7a45','#b4f000','#00f0ff','#c77dff','#ff9ec4','#7fa8c9'];
  const tintKey = 'repuchat-site-tint';
  const vertexSource = `
    attribute vec2 aPosition;
    void main(){ gl_Position = vec4(aPosition, 0.0, 1.0); }
  `;
  const fragmentSource = `
    precision mediump float;
    uniform vec2 uSize;
    uniform float uTime;
    uniform vec2 uTilt;
    uniform float uAmplitude;
    uniform float uRim;
    uniform vec3 uDeep;
    uniform vec3 uBase;
    uniform vec3 uLight;
    uniform vec3 uGlow;

    float cloud(vec2 p, vec2 center, vec2 stretch) {
      vec2 d = (p - center) * stretch;
      return exp(-dot(d, d) * 3.0);
    }

    void main() {
      vec2 uv = vec2(gl_FragCoord.x / uSize.x, 1.0 - gl_FragCoord.y / uSize.y);
      float aspect = uSize.x / uSize.y;
      vec2 p = vec2(uv.x * aspect, uv.y) + uTilt * 0.035;
      float t = uTime;
      vec3 color = mix(uBase * 1.05, uBase * 0.75, smoothstep(0.0, 0.55, uv.y));
      color = mix(color, uLight, 0.85 * cloud(p, vec2(0.22 * aspect + 0.14 * sin(t * 0.07), 0.10 + 0.05 * cos(t * 0.05)), vec2(1.0, 2.0)));
      color = mix(color, mix(uLight, uGlow, 0.5), 0.7 * cloud(p, vec2(0.85 * aspect + 0.12 * cos(t * 0.06), 0.24 + 0.05 * sin(t * 0.08)), vec2(1.2, 2.4)));
      for (int i = 0; i < 3; i++) {
        float f = float(i);
        float x = p.x + f * 0.9;
        float crest = 0.36 + f * 0.15
          + uAmplitude * sin(x * (3.0 + f * 0.7) + t * (0.19 + f * 0.05) + f * 1.7)
          + uAmplitude * 0.55 * sin(x * (5.6 + f * 1.1) - t * (0.23 + f * 0.06) + f * 2.9)
          + uAmplitude * 0.25 * sin(x * (9.0 + f * 1.7) + t * 0.31);
        float below = uv.y - crest;
        float body = smoothstep(-0.02, 0.05, below);
        vec3 depth = mix(uBase * (0.62 - f * 0.18), uDeep, smoothstep(0.0, 0.35, below));
        float above = max(-below, 0.0);
        float strength = uRim * (1.0 - f * 0.25);
        color += uGlow * strength * 0.45 * exp(-above * 13.0) * (1.0 - body);
        color = mix(color, depth, body * 0.95);
        color += mix(uGlow, uLight, 0.4) * strength * 0.7 * exp(-abs(below) * 70.0);
      }
      gl_FragColor = vec4(color, 1.0);
    }
  `;

  function hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360 / 360;
    if (!s) return [l, l, l];
    const q = l < .5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const channel = t => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    return [channel(h + 1 / 3), channel(h), channel(h - 1 / 3)];
  }

  function rgbToHsl(rgb) {
    const [r, g, b] = rgb;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
    const l = (max + min) / 2;
    let h = 0, s = 0;
    if (delta) {
      s = delta / (1 - Math.abs(2 * l - 1));
      if (max === r) h = 60 * (((g - b) / delta) % 6);
      else if (max === g) h = 60 * ((b - r) / delta + 2);
      else h = 60 * ((r - g) / delta + 4);
    }
    return [((h % 360) + 360) % 360, s, l];
  }

  function luminance([r, g, b]) {
    const linear = v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
    return .2126 * linear(r) + .7152 * linear(g) + .0722 * linear(b);
  }

  function tones(hex) {
    const raw = hex.slice(1).match(/.{2}/g).map(part => parseInt(part, 16) / 255);
    const [h, s] = rgbToHsl(raw);
    const tone = (target, turn = 0, saturation = 1) => {
      let low = 0, high = 1;
      for (let i = 0; i < 12; i++) {
        const middle = (low + high) / 2;
        if (luminance(hslToRgb(h + turn, Math.min(1, s * saturation), middle)) < target) low = middle;
        else high = middle;
      }
      return hslToRgb(h + turn, Math.min(1, s * saturation), low);
    };
    return {
      deep: tone(.003, 0, .9), base: tone(.028),
      light: tone(.12, 8, .75), glow: tone(.13, -8),
    };
  }

  const waveCanvas = document.createElement('canvas');
  waveCanvas.className = 'ambient-canvas ambient-wave-canvas';
  waveCanvas.setAttribute('aria-hidden', 'true');
  const signCanvas = document.createElement('canvas');
  signCanvas.className = 'ambient-canvas ambient-sign-canvas';
  signCanvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(waveCanvas, signCanvas);

  const gl = waveCanvas.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'low-power' });
  const signContext = signCanvas.getContext('2d');
  if (!gl || !signContext) return;

  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    return shader;
  }

  let program;
  try {
    program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSource));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  } catch (_) {
    return;
  }

  gl.useProgram(program);
  const vertices = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertices);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'aPosition');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const uniform = name => gl.getUniformLocation(program, name);
  const u = { size:uniform('uSize'), time:uniform('uTime'), tilt:uniform('uTilt'), amplitude:uniform('uAmplitude'), rim:uniform('uRim'), deep:uniform('uDeep'), base:uniform('uBase'), light:uniform('uLight'), glow:uniform('uGlow') };

  let tint = tintColors[0];
  try {
    const stored = localStorage.getItem(tintKey);
    if (tintColors.includes(stored)) tint = stored;
  } catch (_) {}
  let palette = tones(tint);
  function setTint(color) {
    if (!tintColors.includes(color)) return;
    tint = color;
    palette = tones(color);
  }
  window.RepuchatAmbient = { setTint };

  let seed = 11;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const between = (min, max) => min + random() * (max - min);
  const signs = Array.from({ length: 12 }, () => ({
    x:random(), size:between(12,256), depth:between(.35,1), rise:between(20,44),
    phase:random(), sway:between(6,22), spin:between(-.3,.3), threshold:random(),
  }));

  let width = 0, height = 0, dpr = 1;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    width = window.innerWidth;
    height = window.innerHeight;
    waveCanvas.width = signCanvas.width = Math.round(width * dpr);
    waveCanvas.height = signCanvas.height = Math.round(height * dpr);
    gl.viewport(0, 0, waveCanvas.width, waveCanvas.height);
    gl.uniform2f(u.size, waveCanvas.width, waveCanvas.height);
    signContext.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize, { passive:true });
  resize();

  function drawSigns(seconds) {
    signContext.clearRect(0, 0, width, height);
    const light = palette.light.map(value => Math.round(value * 255));
    const ink = light.map((value, i) => Math.round(255 * .5 + value * .5));
    const color = `rgb(${ink.join(',')})`;
    for (const sign of signs) {
      const progress = (seconds / sign.rise + sign.phase) % 1;
      const y = height + sign.size * 2 - progress * (height + sign.size * 4);
      const x = sign.x * width + Math.sin((progress + sign.phase) * 4 * Math.PI) * sign.sway;
      const edge = Math.min(progress, 1 - progress, .15) / .15;
      const alpha = .3 * sign.depth * edge;
      if (alpha <= 0) continue;
      const morph = Math.max(0, Math.min(1, ((.5 - sign.threshold) * 10 + .5)));
      const scale = sign.size * (.7 + .3 * sign.depth);
      const blur = .6 + (1 - sign.depth) * 4.5;
      const shape = new Path2D();
      shape.roundRect(-.5, -.1, 1, .2, .1);
      if (morph > .2) shape.roundRect(-.1, -morph / 2, .2, morph, .1);
      signContext.save();
      signContext.globalAlpha = alpha;
      signContext.fillStyle = color;
      signContext.filter = `blur(${blur}px)`;
      signContext.translate(x, y);
      signContext.rotate(seconds * sign.spin);
      signContext.scale(scale, scale);
      signContext.fill(shape);
      signContext.restore();
    }
  }

  const start = performance.now();
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const frameInterval = 1000 / 30;
  let lastFrame = 0;
  function frame(now) {
    if (now - lastFrame < frameInterval) {
      if (!reduceMotion && !document.hidden) requestAnimationFrame(frame);
      return;
    }
    lastFrame = now;
    const seconds = reduceMotion ? 0 : (now - start) / 1000;
    gl.uniform1f(u.time, seconds);
    gl.uniform2f(u.tilt, 0, 0);
    gl.uniform1f(u.amplitude, .075);
    gl.uniform1f(u.rim, .6);
    gl.uniform3fv(u.deep, palette.deep);
    gl.uniform3fv(u.base, palette.base);
    gl.uniform3fv(u.light, palette.light);
    gl.uniform3fv(u.glow, palette.glow);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    drawSigns(seconds);
    if (!reduceMotion && !document.hidden) requestAnimationFrame(frame);
  }
  document.documentElement.classList.add('ambient-webgl-ready');
  requestAnimationFrame(frame);
  document.addEventListener('visibilitychange', () => {
    if (!reduceMotion && !document.hidden) requestAnimationFrame(frame);
  });
})();
