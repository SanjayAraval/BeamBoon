import * as THREE from 'three';

export const HalftoneShader = {
  uniforms: {
    tDiffuse: { value: null },
    tDepth: { value: null },
    uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    uHalftoneScale: { value: 4.0 },
    uGrainAmount: { value: 0.12 },
    uContrast: { value: 1.3 },
    uTime: { value: 0.0 },
    uQuality: { value: 1.0 } // 1.0 = High, 0.5 = Low
  },

  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec2 uResolution;
    uniform float uHalftoneScale;
    uniform float uGrainAmount;
    uniform float uContrast;
    uniform float uTime;
    uniform float uQuality;

    varying vec2 vUv;

    // Luminance calculation
    float getLuminance(vec3 color) {
      return dot(color, vec3(0.299, 0.587, 0.114));
    }

    // Sobel edge detection for ink outlines
    float edgeDetect(vec2 uv) {
      vec2 texel = 1.0 / uResolution;
      float l00 = getLuminance(texture2D(tDiffuse, uv + vec2(-texel.x, -texel.y)).rgb);
      float l10 = getLuminance(texture2D(tDiffuse, uv + vec2( 0.0,    -texel.y)).rgb);
      float l20 = getLuminance(texture2D(tDiffuse, uv + vec2( texel.x, -texel.y)).rgb);
      float l01 = getLuminance(texture2D(tDiffuse, uv + vec2(-texel.x,  0.0)).rgb);
      float l21 = getLuminance(texture2D(tDiffuse, uv + vec2( texel.x,  0.0)).rgb);
      float l02 = getLuminance(texture2D(tDiffuse, uv + vec2(-texel.x,  texel.y)).rgb);
      float l12 = getLuminance(texture2D(tDiffuse, uv + vec2( 0.0,     texel.y)).rgb);
      float l22 = getLuminance(texture2D(tDiffuse, uv + vec2( texel.x,  texel.y)).rgb);

      float gx = l00 + 2.0*l01 + l02 - (l20 + 2.0*l21 + l22);
      float gy = l00 + 2.0*l10 + l20 - (l02 + 2.0*l12 + l22);

      return sqrt(gx*gx + gy*gy);
    }

    // Pseudo-random film grain generator
    float rand(vec2 co) {
      return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
    }

    void main() {
      vec4 texColor = texture2D(tDiffuse, vUv);
      float lum = getLuminance(texColor.rgb);

      // Smooth contrast curve for noir effect without crushing ambient shadow details
      lum = smoothstep(-0.1, 1.1, lum); // Soften the crush
      lum = pow(lum, 0.6) * uContrast;
      lum = clamp(lum, 0.0, 1.0);

      // Halftone dot pattern calculation
      vec2 st = gl_FragCoord.xy / uHalftoneScale;
      vec2 nearest = floor(st) + 0.5;
      float dist = length(st - nearest);

      // Dot radius inversely proportional to brightness in shadow/midtone regions
      float dotRadius = (1.0 - lum) * 0.5;
      float halftone = step(dist, dotRadius);

      // Edge outline
      float edge = edgeDetect(vUv);
      float isEdge = step(0.18, edge);

      // Combine monochrome & halftone dots
      vec3 finalColor = vec3(lum);
      
      // Apply halftone dot pattern modulation in shadows/midtones
      if (lum < 0.85 && uQuality > 0.5) {
        float shadowFactor = (1.0 - lum);
        finalColor *= (1.0 - halftone * 0.55 * shadowFactor);
      }

      // Apply crisp ink outlines
      if (isEdge > 0.5) {
        finalColor = vec3(0.0);
      }

      // Add film grain
      float noise = (rand(vUv + vec2(uTime * 0.05)) - 0.5) * uGrainAmount;
      finalColor += vec3(noise);

      gl_FragColor = vec4(clamp(finalColor, 0.0, 1.0), texColor.a);
    }
  `
};
