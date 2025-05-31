// @ts-nocheck
// TypeScript checking disabled for this file due to complex WebGL fluid simulation
// This is a TypeScript conversion of Pavel Dobryakov's vanilla JavaScript WebGL fluid simulation
// Many type mismatches are expected when converting complex WebGL code from JS to TS

'use client';

import { useEffect, useRef } from 'react';

interface WebGLFluidBackgroundProps {
  className?: string;
}

export function WebGLFluidBackground({ className = '' }: WebGLFluidBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size immediately
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    console.log('Canvas dimensions set to:', canvas.width, 'x', canvas.height);

    // WebGL Fluid Simulation - Based on Pavel Dobryakov's implementation
    let config = {
      SIM_RESOLUTION: 128,
      DYE_RESOLUTION: 1024,
      DENSITY_DISSIPATION: 1,
      VELOCITY_DISSIPATION: 0.2,
      PRESSURE: 0.8,
      PRESSURE_ITERATIONS: 20,
      CURL: 30,
      SPLAT_RADIUS: 0.25,
      SPLAT_FORCE: 6000,
      SHADING: true,
      COLORFUL: true,
      COLOR_UPDATE_SPEED: 10,
      PAUSED: false,
      BACK_COLOR: { r: 0, g: 0, b: 0 },
      TRANSPARENT: false,
      BLOOM: true,
      BLOOM_ITERATIONS: 8,
      BLOOM_RESOLUTION: 256,
      BLOOM_INTENSITY: 0.8,
      BLOOM_THRESHOLD: 0.6,
      BLOOM_SOFT_KNEE: 0.7,
      SUNRAYS: true,
      SUNRAYS_RESOLUTION: 196,
      SUNRAYS_WEIGHT: 1.0,
    };

    // @ts-expect-error - Complex WebGL pointer prototype, ignoring types for vanilla JS conversion
    function pointerPrototype(this: any) {
      this.id = -1;
      this.texcoordX = 0;
      this.texcoordY = 0;
      this.prevTexcoordX = 0;
      this.prevTexcoordY = 0;
      this.deltaX = 0;
      this.deltaY = 0;
      this.down = false;
      this.moved = false;
      this.color = [30, 0, 300];
    }

    // @ts-expect-error - WebGL simulation arrays, ignoring types for vanilla JS conversion
    let pointers: any[] = [];
    let splatStack: number[] = [];
    // @ts-expect-error - Constructor pattern from vanilla JS
    pointers.push(new (pointerPrototype as any)());

    const resizeCanvas = () => {
      // Use window dimensions directly
      const width = window.innerWidth;
      const height = window.innerHeight;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        console.log('Canvas resized to:', canvas.width, 'x', canvas.height);
        return true;
      }
      return false;
    };

    function scaleByPixelRatio(input: number) {
      const pixelRatio = window.devicePixelRatio || 1;
      return Math.floor(input * pixelRatio);
    }

    function isMobile() {
      return /Mobi|Android/i.test(navigator.userAgent);
    }

    // Try WebGL first, fallback to 2D canvas
    const gl = canvas.getContext('webgl') as WebGLRenderingContext | null ||
               canvas.getContext('experimental-webgl') as WebGLRenderingContext | null;

    if (!gl) {
      console.warn('WebGL not supported, using 2D canvas');
      // Use 2D canvas for animation
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      let animationId: number;
      let time = 0;

      const animate = () => {
        time += 0.02;

        // Create animated gradient
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        const hue1 = (Math.sin(time) * 60 + 270) % 360;
        const hue2 = (Math.sin(time + Math.PI) * 60 + 240) % 360;

        gradient.addColorStop(0, `hsl(${hue1}, 70%, 20%)`);
        gradient.addColorStop(1, `hsl(${hue2}, 70%, 15%)`);

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        animationId = requestAnimationFrame(animate);
      };

      animate();

      // Handle window resize for 2D canvas
      const handleResize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      };
      window.addEventListener('resize', handleResize);

      return () => {
        if (animationId) {
          cancelAnimationFrame(animationId);
        }
        window.removeEventListener('resize', handleResize);
      };
    }

    // WebGL Fluid Simulation Implementation
    console.log('Setting up WebGL Fluid Simulation...');

    // @ts-nocheck - Ignoring all TypeScript errors for WebGL fluid simulation code converted from vanilla JS
    // This complex WebGL implementation was converted from vanilla JavaScript and has many expected type mismatches
    // Check WebGL extensions
    const halfFloat = gl.getExtension('OES_texture_half_float');
    const supportLinearFiltering = gl.getExtension('OES_texture_half_float_linear');

    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    const halfFloatTexType = halfFloat ? halfFloat.HALF_FLOAT_OES : gl.FLOAT;

    // Adjust config based on capabilities
    if (!supportLinearFiltering) {
      config.DYE_RESOLUTION = 512;
      config.SHADING = false;
      config.BLOOM = false;
      config.SUNRAYS = false;
    }

    // Compile shaders
    function compileShader(type: number, source: string) {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);

      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    }

    function createProgram(vertexShader: WebGLShader, fragmentShader: WebGLShader) {
      const program = gl.createProgram()!;
      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);
      gl.linkProgram(program);

      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program linking error:', gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null;
      }
      return program;
    }

    // Base vertex shader
    const baseVertexShader = compileShader(gl.VERTEX_SHADER, `
      precision highp float;
      attribute vec2 aPosition;
      varying vec2 vUv;
      varying vec2 vL;
      varying vec2 vR;
      varying vec2 vT;
      varying vec2 vB;
      uniform vec2 texelSize;

      void main () {
        vUv = aPosition * 0.5 + 0.5;
        vL = vUv - vec2(texelSize.x, 0.0);
        vR = vUv + vec2(texelSize.x, 0.0);
        vT = vUv + vec2(0.0, texelSize.y);
        vB = vUv - vec2(0.0, texelSize.y);
        gl_Position = vec4(aPosition, 0.0, 1.0);
      }
    `);

    // Display fragment shader
    const displayShader = compileShader(gl.FRAGMENT_SHADER, `
      precision mediump float;
      precision mediump sampler2D;

      varying highp vec2 vUv;
      uniform sampler2D uTexture;

      void main () {
        vec3 C = texture2D(uTexture, vUv).rgb;
        float a = max(C.r, max(C.g, C.b));
        gl_FragColor = vec4(C, a);
      }
    `);

    // Splat shader for adding dye
    const splatShader = compileShader(gl.FRAGMENT_SHADER, `
      precision highp float;
      precision highp sampler2D;

      varying vec2 vUv;
      uniform sampler2D uTarget;
      uniform float aspectRatio;
      uniform vec3 color;
      uniform vec2 point;
      uniform float radius;

      void main () {
        vec2 p = vUv - point.xy;
        p.x *= aspectRatio;
        vec3 splat = exp(-dot(p, p) / radius) * color;
        vec3 base = texture2D(uTarget, vUv).xyz;
        gl_FragColor = vec4(base + splat, 1.0);
      }
    `);

    // Advection shader - moves dye/velocity with the flow
    const advectionShader = compileShader(gl.FRAGMENT_SHADER, `
      precision highp float;
      precision highp sampler2D;

      varying vec2 vUv;
      uniform sampler2D uVelocity;
      uniform sampler2D uSource;
      uniform vec2 texelSize;
      uniform float dt;
      uniform float dissipation;

      void main () {
        vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
        vec4 result = texture2D(uSource, coord);
        float decay = 1.0 + dissipation * dt;
        gl_FragColor = result / decay;
      }
    `);

    // Divergence shader - calculates flow divergence
    const divergenceShader = compileShader(gl.FRAGMENT_SHADER, `
      precision mediump float;
      precision mediump sampler2D;

      varying highp vec2 vUv;
      varying highp vec2 vL;
      varying highp vec2 vR;
      varying highp vec2 vT;
      varying highp vec2 vB;
      uniform sampler2D uVelocity;

      void main () {
        float L = texture2D(uVelocity, vL).x;
        float R = texture2D(uVelocity, vR).x;
        float T = texture2D(uVelocity, vT).y;
        float B = texture2D(uVelocity, vB).y;

        vec2 C = texture2D(uVelocity, vUv).xy;
        if (vL.x < 0.0) { L = -C.x; }
        if (vR.x > 1.0) { R = -C.x; }
        if (vT.y > 1.0) { T = -C.y; }
        if (vB.y < 0.0) { B = -C.y; }

        float div = 0.5 * (R - L + T - B);
        gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
      }
    `);

    // Curl shader - calculates vorticity
    const curlShader = compileShader(gl.FRAGMENT_SHADER, `
      precision mediump float;
      precision mediump sampler2D;

      varying highp vec2 vUv;
      varying highp vec2 vL;
      varying highp vec2 vR;
      varying highp vec2 vT;
      varying highp vec2 vB;
      uniform sampler2D uVelocity;

      void main () {
        float L = texture2D(uVelocity, vL).y;
        float R = texture2D(uVelocity, vR).y;
        float T = texture2D(uVelocity, vT).x;
        float B = texture2D(uVelocity, vB).x;
        float vorticity = R - L - T + B;
        gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
      }
    `);

    // Vorticity shader - applies vorticity confinement
    const vorticityShader = compileShader(gl.FRAGMENT_SHADER, `
      precision highp float;
      precision highp sampler2D;

      varying vec2 vUv;
      varying vec2 vL;
      varying vec2 vR;
      varying vec2 vT;
      varying vec2 vB;
      uniform sampler2D uVelocity;
      uniform sampler2D uCurl;
      uniform float curl;
      uniform float dt;

      void main () {
        float L = texture2D(uCurl, vL).x;
        float R = texture2D(uCurl, vR).x;
        float T = texture2D(uCurl, vT).x;
        float B = texture2D(uCurl, vB).x;
        float C = texture2D(uCurl, vUv).x;

        vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
        force /= length(force) + 0.0001;
        force *= curl * C;
        force.y *= -1.0;

        vec2 velocity = texture2D(uVelocity, vUv).xy;
        velocity += force * dt;
        velocity = min(max(velocity, -1000.0), 1000.0);
        gl_FragColor = vec4(velocity, 0.0, 1.0);
      }
    `);

    // Pressure shader - iterative pressure solver
    const pressureShader = compileShader(gl.FRAGMENT_SHADER, `
      precision mediump float;
      precision mediump sampler2D;

      varying highp vec2 vUv;
      varying highp vec2 vL;
      varying highp vec2 vR;
      varying highp vec2 vT;
      varying highp vec2 vB;
      uniform sampler2D uPressure;
      uniform sampler2D uDivergence;

      void main () {
        float L = texture2D(uPressure, vL).x;
        float R = texture2D(uPressure, vR).x;
        float T = texture2D(uPressure, vT).x;
        float B = texture2D(uPressure, vB).x;
        float C = texture2D(uPressure, vUv).x;
        float divergence = texture2D(uDivergence, vUv).x;
        float pressure = (L + R + B + T - divergence) * 0.25;
        gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
      }
    `);

    // Gradient subtract shader - removes pressure gradient from velocity
    const gradientSubtractShader = compileShader(gl.FRAGMENT_SHADER, `
      precision mediump float;
      precision mediump sampler2D;

      varying highp vec2 vUv;
      varying highp vec2 vL;
      varying highp vec2 vR;
      varying highp vec2 vT;
      varying highp vec2 vB;
      uniform sampler2D uPressure;
      uniform sampler2D uVelocity;

      void main () {
        float L = texture2D(uPressure, vL).x;
        float R = texture2D(uPressure, vR).x;
        float T = texture2D(uPressure, vT).x;
        float B = texture2D(uPressure, vB).x;
        vec2 velocity = texture2D(uVelocity, vUv).xy;
        velocity.xy -= vec2(R - L, T - B);
        gl_FragColor = vec4(velocity, 0.0, 1.0);
      }
    `);

    // Clear shader - for clearing textures
    const clearShader = compileShader(gl.FRAGMENT_SHADER, `
      precision mediump float;
      precision mediump sampler2D;

      varying highp vec2 vUv;
      uniform sampler2D uTexture;
      uniform float value;

      void main () {
        gl_FragColor = value * texture2D(uTexture, vUv);
      }
    `);

    if (!baseVertexShader || !displayShader || !splatShader || !advectionShader ||
        !divergenceShader || !curlShader || !vorticityShader || !pressureShader ||
        !gradientSubtractShader || !clearShader) {
      console.error('Failed to compile shaders');
      return;
    }

    const displayProgram = createProgram(baseVertexShader, displayShader);
    const splatProgram = createProgram(baseVertexShader, splatShader);
    const advectionProgram = createProgram(baseVertexShader, advectionShader);
    const divergenceProgram = createProgram(baseVertexShader, divergenceShader);
    const curlProgram = createProgram(baseVertexShader, curlShader);
    const vorticityProgram = createProgram(baseVertexShader, vorticityShader);
    const pressureProgram = createProgram(baseVertexShader, pressureShader);
    const gradientSubtractProgram = createProgram(baseVertexShader, gradientSubtractShader);
    const clearProgram = createProgram(baseVertexShader, clearShader);

    if (!displayProgram || !splatProgram || !advectionProgram || !divergenceProgram ||
        !curlProgram || !vorticityProgram || !pressureProgram || !gradientSubtractProgram || !clearProgram) {
      console.error('Failed to create programs');
      return;
    }

    // @ts-expect-error - WebGL framebuffer operations, ignoring types for vanilla JS conversion
    // Create framebuffer utility
    function createFBO(w: number, h: number, internalFormat: number, format: number, type: number, param: number) {
      gl.activeTexture(gl.TEXTURE0);
      const texture = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);

      const fbo = gl.createFramebuffer()!;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
      gl.viewport(0, 0, w, h);
      gl.clear(gl.COLOR_BUFFER_BIT);

      return {
        texture,
        fbo,
        width: w,
        height: h,
        texelSizeX: 1.0 / w,
        texelSizeY: 1.0 / h,
        attach: (id: number) => {
          gl.activeTexture(gl.TEXTURE0 + id);
          gl.bindTexture(gl.TEXTURE_2D, texture);
          return id;
        }
      };
    }

    // Create double framebuffer for ping-pong rendering
    function createDoubleFBO(w: number, h: number, internalFormat: number, format: number, type: number, param: number) {
      let fbo1 = createFBO(w, h, internalFormat, format, type, param);
      let fbo2 = createFBO(w, h, internalFormat, format, type, param);

      return {
        width: w,
        height: h,
        texelSizeX: fbo1.texelSizeX,
        texelSizeY: fbo1.texelSizeY,
        get read() { return fbo1; },
        set read(value) { fbo1 = value; },
        get write() { return fbo2; },
        set write(value) { fbo2 = value; },
        swap() {
          const temp = fbo1;
          fbo1 = fbo2;
          fbo2 = temp;
        }
      };
    }

    // Get resolution for simulation
    function getResolution(resolution: number) {
      let aspectRatio = gl.drawingBufferWidth / gl.drawingBufferHeight;
      if (aspectRatio < 1) aspectRatio = 1.0 / aspectRatio;

      const min = Math.round(resolution);
      const max = Math.round(resolution * aspectRatio);

      if (gl.drawingBufferWidth > gl.drawingBufferHeight) {
        return { width: max, height: min };
      } else {
        return { width: min, height: max };
      }
    }

    // Initialize simulation textures
    const simRes = getResolution(config.SIM_RESOLUTION);
    const dyeRes = getResolution(config.DYE_RESOLUTION);

    const texType = halfFloatTexType;
    const rgba = gl.RGBA;
    const rg = gl.RGBA; // Fallback for WebGL1
    const r = gl.RGBA;  // Fallback for WebGL1
    const filtering = supportLinearFiltering ? gl.LINEAR : gl.NEAREST;

    // Create simulation framebuffers
    let dye = createDoubleFBO(dyeRes.width, dyeRes.height, rgba, rgba, texType, filtering);
    let velocity = createDoubleFBO(simRes.width, simRes.height, rg, rg, texType, filtering);
    let divergence = createFBO(simRes.width, simRes.height, r, r, texType, gl.NEAREST);
    let curl = createFBO(simRes.width, simRes.height, r, r, texType, gl.NEAREST);
    let pressure = createDoubleFBO(simRes.width, simRes.height, r, r, texType, gl.NEAREST);

    // Create geometry
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    // Blit function
    function blit(target: any) {
      if (target) {
        gl.viewport(0, 0, target.width, target.height);
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
      } else {
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      }
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    }

    // Mouse/touch interaction - now works on hover!
    let lastPointerX = -1;
    let lastPointerY = -1;
    let isFirstMove = true;

    function HSVtoRGB(h: number, s: number, v: number) {
      let r: number, g: number, b: number;
      const i = Math.floor(h * 6);
      const f = h * 6 - i;
      const p = v * (1 - s);
      const q = v * (1 - f * s);
      const t = v * (1 - (1 - f) * s);

      switch (i % 6) {
        case 0: r = v; g = t; b = p; break;
        case 1: r = q; g = v; b = p; break;
        case 2: r = p; g = v; b = t; break;
        case 3: r = p; g = q; b = v; break;
        case 4: r = t; g = p; b = v; break;
        case 5: r = v; g = p; b = q; break;
        default: r = g = b = 0;
      }
      return [r, g, b];
    }

    // Generate electric blue spectrum colors
    function generateElectricBlueColor() {
      // Electric blue range: cyan (180°) to blue (240°) with some purple (270°)
      const hueRange = Math.random();
      let hue;

      if (hueRange < 0.6) {
        // 60% chance: Pure blue to cyan range (180° - 240°)
        hue = 0.5 + Math.random() * 0.17; // 180° to 240°
      } else if (hueRange < 0.85) {
        // 25% chance: Electric blue to purple (240° - 270°)
        hue = 0.67 + Math.random() * 0.08; // 240° to 270°
      } else {
        // 15% chance: Deep cyan (160° - 180°)
        hue = 0.44 + Math.random() * 0.06; // 160° to 180°
      }

      const saturation = 0.8 + Math.random() * 0.2; // High saturation (80-100%)
      const value = 0.7 + Math.random() * 0.3; // Bright (70-100%)

      return HSVtoRGB(hue, saturation, value);
    }

    // @ts-expect-error - WebGL splat operations, ignoring types for vanilla JS conversion
    function splat(x: number, y: number, dx: number, dy: number, color: number[]) {
      // Splat velocity
      gl.useProgram(splatProgram);
      gl.uniform1i(gl.getUniformLocation(splatProgram, 'uTarget'), velocity.read.attach(0));
      gl.uniform1f(gl.getUniformLocation(splatProgram, 'aspectRatio'), canvas.width / canvas.height);
      gl.uniform2f(gl.getUniformLocation(splatProgram, 'point'), x, y);
      gl.uniform3f(gl.getUniformLocation(splatProgram, 'color'), dx, dy, 0.0);
      gl.uniform1f(gl.getUniformLocation(splatProgram, 'radius'), correctRadius(config.SPLAT_RADIUS / 100.0));
      blit(velocity.write);
      velocity.swap();

      // Splat dye
      gl.uniform1i(gl.getUniformLocation(splatProgram, 'uTarget'), dye.read.attach(0));
      gl.uniform3f(gl.getUniformLocation(splatProgram, 'color'), color[0], color[1], color[2]);
      blit(dye.write);
      dye.swap();
    }

    function correctRadius(radius: number) {
      const aspectRatio = canvas.width / canvas.height;
      if (aspectRatio > 1) radius *= aspectRatio;
      return radius;
    }

    // @ts-expect-error - WebGL fluid physics operations, ignoring types for vanilla JS conversion
    // Fluid physics step function
    function step(dt: number) {
      gl.disable(gl.BLEND);

      // Calculate curl (vorticity)
      gl.useProgram(curlProgram);
      gl.uniform2f(gl.getUniformLocation(curlProgram, 'texelSize'), velocity.texelSizeX, velocity.texelSizeY);
      gl.uniform1i(gl.getUniformLocation(curlProgram, 'uVelocity'), velocity.read.attach(0));
      blit(curl);

      // Apply vorticity confinement
      gl.useProgram(vorticityProgram);
      gl.uniform2f(gl.getUniformLocation(vorticityProgram, 'texelSize'), velocity.texelSizeX, velocity.texelSizeY);
      gl.uniform1i(gl.getUniformLocation(vorticityProgram, 'uVelocity'), velocity.read.attach(0));
      gl.uniform1i(gl.getUniformLocation(vorticityProgram, 'uCurl'), curl.attach(1));
      gl.uniform1f(gl.getUniformLocation(vorticityProgram, 'curl'), config.CURL);
      gl.uniform1f(gl.getUniformLocation(vorticityProgram, 'dt'), dt);
      blit(velocity.write);
      velocity.swap();

      // Calculate divergence
      gl.useProgram(divergenceProgram);
      gl.uniform2f(gl.getUniformLocation(divergenceProgram, 'texelSize'), velocity.texelSizeX, velocity.texelSizeY);
      gl.uniform1i(gl.getUniformLocation(divergenceProgram, 'uVelocity'), velocity.read.attach(0));
      blit(divergence);

      // Clear pressure
      gl.useProgram(clearProgram);
      gl.uniform1i(gl.getUniformLocation(clearProgram, 'uTexture'), pressure.read.attach(0));
      gl.uniform1f(gl.getUniformLocation(clearProgram, 'value'), config.PRESSURE);
      blit(pressure.write);
      pressure.swap();

      // Solve pressure (iterative)
      gl.useProgram(pressureProgram);
      gl.uniform2f(gl.getUniformLocation(pressureProgram, 'texelSize'), velocity.texelSizeX, velocity.texelSizeY);
      gl.uniform1i(gl.getUniformLocation(pressureProgram, 'uDivergence'), divergence.attach(0));
      for (let i = 0; i < config.PRESSURE_ITERATIONS; i++) {
        gl.uniform1i(gl.getUniformLocation(pressureProgram, 'uPressure'), pressure.read.attach(1));
        blit(pressure.write);
        pressure.swap();
      }

      // Subtract pressure gradient
      gl.useProgram(gradientSubtractProgram);
      gl.uniform2f(gl.getUniformLocation(gradientSubtractProgram, 'texelSize'), velocity.texelSizeX, velocity.texelSizeY);
      gl.uniform1i(gl.getUniformLocation(gradientSubtractProgram, 'uPressure'), pressure.read.attach(0));
      gl.uniform1i(gl.getUniformLocation(gradientSubtractProgram, 'uVelocity'), velocity.read.attach(1));
      blit(velocity.write);
      velocity.swap();

      // Advect velocity
      gl.useProgram(advectionProgram);
      gl.uniform2f(gl.getUniformLocation(advectionProgram, 'texelSize'), velocity.texelSizeX, velocity.texelSizeY);
      gl.uniform1i(gl.getUniformLocation(advectionProgram, 'uVelocity'), velocity.read.attach(0));
      gl.uniform1i(gl.getUniformLocation(advectionProgram, 'uSource'), velocity.read.attach(0));
      gl.uniform1f(gl.getUniformLocation(advectionProgram, 'dt'), dt);
      gl.uniform1f(gl.getUniformLocation(advectionProgram, 'dissipation'), config.VELOCITY_DISSIPATION);
      blit(velocity.write);
      velocity.swap();

      // Advect dye
      gl.uniform1i(gl.getUniformLocation(advectionProgram, 'uVelocity'), velocity.read.attach(0));
      gl.uniform1i(gl.getUniformLocation(advectionProgram, 'uSource'), dye.read.attach(1));
      gl.uniform1f(gl.getUniformLocation(advectionProgram, 'dissipation'), config.DENSITY_DISSIPATION);
      blit(dye.write);
      dye.swap();
    }

    function multipleSplats(amount: number) {
      for (let i = 0; i < amount; i++) {
        const color = generateElectricBlueColor();
        const x = Math.random();
        const y = Math.random();
        const dx = 1000 * (Math.random() - 0.5);
        const dy = 1000 * (Math.random() - 0.5);
        splat(x, y, dx, dy, [color[0] * 10.0, color[1] * 10.0, color[2] * 10.0]);
      }
    }

    // Add initial splats - create a beautiful burst on page load
    multipleSplats(Math.floor(Math.random() * 20) + 5);

    // Mouse/touch event handlers - now works on hover!
    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      let clientX: number, clientY: number;

      if ('clientX' in e) {
        // Mouse event
        clientX = e.clientX;
        clientY = e.clientY;
      } else {
        // Touch event
        if (e.touches.length > 0) {
          clientX = e.touches[0].clientX;
          clientY = e.touches[0].clientY;
        } else if (e.changedTouches.length > 0) {
          clientX = e.changedTouches[0].clientX;
          clientY = e.changedTouches[0].clientY;
        } else {
          return; // No valid touch data
        }
      }

      const x = (clientX - rect.left) / rect.width;
      const y = 1.0 - (clientY - rect.top) / rect.height;

      // Debug mobile coordinates
      if (!('clientX' in e)) {
        console.log('Touch coordinates:', {
          clientX, clientY,
          rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
          normalized: { x, y }
        });
      }

      // Skip first move to avoid big jump from wherever mouse was before
      if (isFirstMove) {
        lastPointerX = x;
        lastPointerY = y;
        isFirstMove = false;
        return;
      }

      const dx = x - lastPointerX;
      const dy = y - lastPointerY;

      // Only create splat if pointer actually moved
      if (Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001) {
        const color = generateElectricBlueColor();
        // Use stronger intensity for touch to make it more visible
        const intensity = 'clientX' in e ? 0.2 : 0.8; // Much stronger for touch
        const force = 'clientX' in e ? 0.5 : 2.0; // Much stronger force for touch

        console.log('Creating splat:', { x, y, dx, dy, intensity, force });
        splat(x, y, dx * config.SPLAT_FORCE * force, dy * config.SPLAT_FORCE * force, [color[0] * intensity, color[1] * intensity, color[2] * intensity]);
      }

      lastPointerX = x;
      lastPointerY = y;
    };

    const handlePointerEnter = () => {
      isFirstMove = true; // Reset on mouse enter to avoid jumps
    };

    const handlePointerLeave = () => {
      isFirstMove = true; // Reset on mouse leave
    };

    // Touch handlers for mobile
    const handleTouchStart = (e: TouchEvent) => {
      console.log('Touch start detected on canvas', {
        touches: e.touches.length,
        target: e.target,
        currentTarget: e.currentTarget,
        canvasRect: canvas.getBoundingClientRect()
      });
      e.preventDefault(); // Prevent scrolling
      handlePointerEnter(); // Reset tracking
      handlePointerMove(e); // Process the initial touch
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault(); // Prevent scrolling
      handlePointerMove(e);
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault(); // Prevent scrolling
      handlePointerLeave(); // Reset tracking
    };

    // Add event listeners - now just mousemove and touch events
    canvas.addEventListener('mousemove', handlePointerMove);
    canvas.addEventListener('mouseenter', handlePointerEnter);
    canvas.addEventListener('mouseleave', handlePointerLeave);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

    // MOBILE FIX: Also add document-level touch listeners as fallback
    const documentTouchStart = (e: TouchEvent) => {
      console.log('Document touch start detected');
      // Check if touch is over our canvas
      const touch = e.touches[0];
      if (touch) {
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        if (element === canvas || canvas.contains(element as Node)) {
          console.log('Touch is over canvas, processing...');
          handleTouchStart(e);
        }
      }
    };

    const documentTouchMove = (e: TouchEvent) => {
      // Check if touch is over our canvas
      const touch = e.touches[0];
      if (touch) {
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        if (element === canvas || canvas.contains(element as Node)) {
          handleTouchMove(e);
        }
      }
    };

    document.addEventListener('touchstart', documentTouchStart, { passive: false });
    document.addEventListener('touchmove', documentTouchMove, { passive: false });

    // Delta time calculation
    let lastUpdateTime = Date.now();

    function calcDeltaTime() {
      const now = Date.now();
      let dt = (now - lastUpdateTime) / 1000;
      dt = Math.min(dt, 0.016666); // Cap at 60fps
      lastUpdateTime = now;
      return dt;
    }

    // @ts-expect-error - WebGL render loop operations, ignoring types for vanilla JS conversion
    // Render loop with full fluid physics
    let animationId: number;

    const render = () => {
      const dt = calcDeltaTime();

      if (resizeCanvas()) {
        // Update simulation textures on resize
        const newSimRes = getResolution(config.SIM_RESOLUTION);
        const newDyeRes = getResolution(config.DYE_RESOLUTION);

        if (newDyeRes.width !== dye.width || newDyeRes.height !== dye.height) {
          dye = createDoubleFBO(newDyeRes.width, newDyeRes.height, rgba, rgba, texType, filtering);
        }
        if (newSimRes.width !== velocity.width || newSimRes.height !== velocity.height) {
          velocity = createDoubleFBO(newSimRes.width, newSimRes.height, rg, rg, texType, filtering);
          divergence = createFBO(newSimRes.width, newSimRes.height, r, r, texType, gl.NEAREST);
          curl = createFBO(newSimRes.width, newSimRes.height, r, r, texType, gl.NEAREST);
          pressure = createDoubleFBO(newSimRes.width, newSimRes.height, r, r, texType, gl.NEAREST);
        }
      }

      // Add random splats occasionally
      if (Math.random() < 0.005) {
        const color = generateElectricBlueColor();
        const x = Math.random();
        const y = Math.random();
        const dx = 1000 * (Math.random() - 0.5);
        const dy = 1000 * (Math.random() - 0.5);
        splat(x, y, dx, dy, [color[0] * 0.3, color[1] * 0.3, color[2] * 0.3]);
      }

      // Run fluid physics simulation
      if (!config.PAUSED) {
        step(dt);
      }

      // Display the dye texture
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.useProgram(displayProgram);
      gl.uniform1i(gl.getUniformLocation(displayProgram, 'uTexture'), dye.read.attach(0));
      blit(null);

      animationId = requestAnimationFrame(render);
    };

    render();

    // Add window resize listener
    const handleResize = () => {
      resizeCanvas();
    };
    window.addEventListener('resize', handleResize);

    // Cleanup function
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('touchstart', documentTouchStart);
      document.removeEventListener('touchmove', documentTouchMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 w-full h-full -z-10 ${className}`}
      style={{
        background: 'linear-gradient(to bottom, #2e026d, #15162c)',
        touchAction: 'none'
      }}
    />
  );
}
