# ShaderMaterial 自定义着色器

> "ShaderMaterial 让你完全控制 GPU 渲染管线，实现任何你能想象的视觉效果。"

## ShaderMaterial 概述

```
ShaderMaterial
├── 自定义着色器
│   ├── vertexShader（顶点）
│   └── fragmentShader（片段）
├── Uniforms
│   └── 传递数据到 GPU
├── Defines
│   └── 预处理指令
├── 扩展选项
│   ├── extensions
│   └── glslVersion
└── 内置变量
    ├── 自动注入
    └── Three.js 内置
```

## 完整实现

```typescript
// src/materials/ShaderMaterial.ts
import { Material, MaterialParameters } from './Material';
import { UniformsUtils } from '../renderers/shaders/UniformsUtils';
import { GLSL3 } from '../constants';

export interface ShaderMaterialParameters extends MaterialParameters {
  uniforms?: { [uniform: string]: { value: any } };
  vertexShader?: string;
  fragmentShader?: string;
  linewidth?: number;
  wireframe?: boolean;
  wireframeLinewidth?: number;
  fog?: boolean;
  lights?: boolean;
  clipping?: boolean;
  extensions?: {
    derivatives?: boolean;
    fragDepth?: boolean;
    drawBuffers?: boolean;
    shaderTextureLOD?: boolean;
  };
  glslVersion?: typeof GLSL3 | null;
  defines?: { [key: string]: any };
}

export class ShaderMaterial extends Material {
  readonly isShaderMaterial = true;
  readonly type = 'ShaderMaterial';
  
  // 着色器代码
  vertexShader = defaultVertexShader;
  fragmentShader = defaultFragmentShader;
  
  // Uniforms
  uniforms: { [uniform: string]: { value: any } } = {};
  
  // Defines
  defines: { [key: string]: any } = {};
  
  // 渲染选项
  linewidth = 1;
  wireframe = false;
  wireframeLinewidth = 1;
  
  // 特性开关
  fog = false;
  lights = false;
  clipping = false;
  
  // WebGL 扩展
  extensions = {
    derivatives: false,
    fragDepth: false,
    drawBuffers: false,
    shaderTextureLOD: false,
  };
  
  // GLSL 版本
  glslVersion: typeof GLSL3 | null = null;
  
  // 索引用于缓存
  uniformsNeedUpdate = false;
  
  // 默认属性
  defaultAttributeValues = {
    'color': [1, 1, 1],
    'uv': [0, 0],
    'uv2': [0, 0],
  };
  
  constructor(parameters?: ShaderMaterialParameters) {
    super();
    
    if (parameters) {
      if (parameters.uniforms !== undefined) {
        this.uniforms = UniformsUtils.clone(parameters.uniforms);
      }
      
      this.setValues(parameters);
    }
  }
  
  copy(source: ShaderMaterial): this {
    super.copy(source);
    
    this.fragmentShader = source.fragmentShader;
    this.vertexShader = source.vertexShader;
    
    this.uniforms = UniformsUtils.clone(source.uniforms);
    this.defines = { ...source.defines };
    
    this.wireframe = source.wireframe;
    this.wireframeLinewidth = source.wireframeLinewidth;
    
    this.fog = source.fog;
    this.lights = source.lights;
    this.clipping = source.clipping;
    
    this.extensions = { ...source.extensions };
    
    this.glslVersion = source.glslVersion;
    
    return this;
  }
  
  toJSON(meta?: any): any {
    const data = super.toJSON(meta);
    
    data.glslVersion = this.glslVersion;
    data.uniforms = {};
    
    for (const name in this.uniforms) {
      const uniform = this.uniforms[name];
      const value = uniform.value;
      
      if (value && value.isTexture) {
        data.uniforms[name] = {
          type: 't',
          value: value.toJSON(meta).uuid,
        };
      } else if (value && value.isColor) {
        data.uniforms[name] = {
          type: 'c',
          value: value.getHex(),
        };
      } else if (value && value.isVector2) {
        data.uniforms[name] = {
          type: 'v2',
          value: value.toArray(),
        };
      } else if (value && value.isVector3) {
        data.uniforms[name] = {
          type: 'v3',
          value: value.toArray(),
        };
      } else if (value && value.isMatrix4) {
        data.uniforms[name] = {
          type: 'm4',
          value: value.toArray(),
        };
      } else {
        data.uniforms[name] = { value };
      }
    }
    
    if (Object.keys(this.defines).length > 0) {
      data.defines = this.defines;
    }
    
    data.vertexShader = this.vertexShader;
    data.fragmentShader = this.fragmentShader;
    
    data.lights = this.lights;
    data.clipping = this.clipping;
    
    const extensions: Record<string, boolean> = {};
    for (const key in this.extensions) {
      if ((this.extensions as any)[key] === true) {
        extensions[key] = true;
      }
    }
    
    if (Object.keys(extensions).length > 0) {
      data.extensions = extensions;
    }
    
    return data;
  }
}

// 默认顶点着色器
const defaultVertexShader = /* glsl */`
void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// 默认片段着色器
const defaultFragmentShader = /* glsl */`
void main() {
  gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
}
`;
```

## Three.js 内置 Uniform

```glsl
// 自动注入的 uniform（无需声明）

// 矩阵
uniform mat4 modelMatrix;           // 模型矩阵
uniform mat4 modelViewMatrix;       // 模型视图矩阵
uniform mat4 projectionMatrix;      // 投影矩阵
uniform mat4 viewMatrix;            // 视图矩阵
uniform mat3 normalMatrix;          // 法线矩阵
uniform vec3 cameraPosition;        // 相机位置

// 顶点属性（attribute）
attribute vec3 position;            // 顶点位置
attribute vec3 normal;              // 顶点法线
attribute vec2 uv;                  // UV 坐标
attribute vec2 uv2;                 // 第二套 UV
attribute vec3 color;               // 顶点颜色
```

## 基础示例

### 纯色材质

```typescript
const material = new ShaderMaterial({
  uniforms: {
    uColor: { value: new Color(0xff0000) },
  },
  vertexShader: /* glsl */`
    void main() {
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */`
    uniform vec3 uColor;
    
    void main() {
      gl_FragColor = vec4(uColor, 1.0);
    }
  `,
});
```

### 渐变效果

```typescript
const gradientMaterial = new ShaderMaterial({
  uniforms: {
    uColorA: { value: new Color(0xff0000) },
    uColorB: { value: new Color(0x0000ff) },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */`
    uniform vec3 uColorA;
    uniform vec3 uColorB;
    varying vec2 vUv;
    
    void main() {
      vec3 color = mix(uColorA, uColorB, vUv.y);
      gl_FragColor = vec4(color, 1.0);
    }
  `,
});
```

### 动画效果

```typescript
const waveMaterial = new ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uAmplitude: { value: 0.5 },
    uFrequency: { value: 2.0 },
  },
  vertexShader: /* glsl */`
    uniform float uTime;
    uniform float uAmplitude;
    uniform float uFrequency;
    
    varying vec2 vUv;
    
    void main() {
      vUv = uv;
      
      vec3 pos = position;
      pos.z += sin(pos.x * uFrequency + uTime) * uAmplitude;
      pos.z += sin(pos.y * uFrequency + uTime) * uAmplitude;
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: /* glsl */`
    varying vec2 vUv;
    
    void main() {
      gl_FragColor = vec4(vUv, 0.5, 1.0);
    }
  `,
});

// 动画循环
function animate() {
  waveMaterial.uniforms.uTime.value = performance.now() * 0.001;
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
```

## 高级示例

### 菲涅尔效果

```typescript
const fresnelMaterial = new ShaderMaterial({
  uniforms: {
    uFresnelPower: { value: 2.0 },
    uFresnelColor: { value: new Color(0x00ffff) },
    uBaseColor: { value: new Color(0x222222) },
  },
  vertexShader: /* glsl */`
    varying vec3 vNormal;
    varying vec3 vViewDir;
    
    void main() {
      vNormal = normalize(normalMatrix * normal);
      
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vViewDir = normalize(-mvPosition.xyz);
      
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: /* glsl */`
    uniform float uFresnelPower;
    uniform vec3 uFresnelColor;
    uniform vec3 uBaseColor;
    
    varying vec3 vNormal;
    varying vec3 vViewDir;
    
    void main() {
      float fresnel = pow(1.0 - dot(vNormal, vViewDir), uFresnelPower);
      vec3 color = mix(uBaseColor, uFresnelColor, fresnel);
      
      gl_FragColor = vec4(color, 1.0);
    }
  `,
});
```

### 噪声纹理

```typescript
const noiseMaterial = new ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uScale: { value: 5.0 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    varying vec3 vPosition;
    
    void main() {
      vUv = uv;
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */`
    uniform float uTime;
    uniform float uScale;
    
    varying vec2 vUv;
    varying vec3 vPosition;
    
    // Simplex noise 函数
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
    
    float snoise(vec3 v) {
      const vec2 C = vec2(1.0/6.0, 1.0/3.0);
      const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
      
      vec3 i  = floor(v + dot(v, C.yyy));
      vec3 x0 = v - i + dot(i, C.xxx);
      
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min(g.xyz, l.zxy);
      vec3 i2 = max(g.xyz, l.zxy);
      
      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;
      
      i = mod289(i);
      vec4 p = permute(permute(permute(
        i.z + vec4(0.0, i1.z, i2.z, 1.0))
        + i.y + vec4(0.0, i1.y, i2.y, 1.0))
        + i.x + vec4(0.0, i1.x, i2.x, 1.0));
      
      float n_ = 0.142857142857;
      vec3 ns = n_ * D.wyz - D.xzx;
      
      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_);
      
      vec4 x = x_ *ns.x + ns.yyyy;
      vec4 y = y_ *ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);
      
      vec4 b0 = vec4(x.xy, y.xy);
      vec4 b1 = vec4(x.zw, y.zw);
      
      vec4 s0 = floor(b0)*2.0 + 1.0;
      vec4 s1 = floor(b1)*2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));
      
      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
      vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
      
      vec3 p0 = vec3(a0.xy, h.x);
      vec3 p1 = vec3(a0.zw, h.y);
      vec3 p2 = vec3(a1.xy, h.z);
      vec3 p3 = vec3(a1.zw, h.w);
      
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
      p0 *= norm.x;
      p1 *= norm.y;
      p2 *= norm.z;
      p3 *= norm.w;
      
      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }
    
    void main() {
      float noise = snoise(vec3(vPosition.xy * uScale, uTime * 0.5));
      noise = noise * 0.5 + 0.5; // 0-1 范围
      
      vec3 color = vec3(noise);
      gl_FragColor = vec4(color, 1.0);
    }
  `,
});
```

### 溶解效果

```typescript
const dissolveMaterial = new ShaderMaterial({
  uniforms: {
    uMap: { value: texture },
    uNoiseMap: { value: noiseTexture },
    uThreshold: { value: 0.5 },
    uEdgeWidth: { value: 0.1 },
    uEdgeColor: { value: new Color(0xff6600) },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D uMap;
    uniform sampler2D uNoiseMap;
    uniform float uThreshold;
    uniform float uEdgeWidth;
    uniform vec3 uEdgeColor;
    
    varying vec2 vUv;
    
    void main() {
      vec4 texColor = texture2D(uMap, vUv);
      float noise = texture2D(uNoiseMap, vUv).r;
      
      // 溶解判断
      if (noise < uThreshold) {
        discard;
      }
      
      // 边缘发光
      float edge = 1.0 - smoothstep(uThreshold, uThreshold + uEdgeWidth, noise);
      vec3 color = mix(texColor.rgb, uEdgeColor, edge);
      
      gl_FragColor = vec4(color, 1.0);
    }
  `,
  transparent: true,
});

// 动画控制
function animateDissolve() {
  dissolveMaterial.uniforms.uThreshold.value = 
    (Math.sin(performance.now() * 0.001) + 1) * 0.5;
}
```

## RawShaderMaterial

```typescript
// 不注入内置变量，完全手动控制
import { RawShaderMaterial } from 'three';

const rawMaterial = new RawShaderMaterial({
  uniforms: {
    uProjectionMatrix: { value: new Matrix4() },
    uModelViewMatrix: { value: new Matrix4() },
    uColor: { value: new Color(0xff0000) },
  },
  vertexShader: /* glsl */`#version 300 es
    in vec3 position;
    
    uniform mat4 uProjectionMatrix;
    uniform mat4 uModelViewMatrix;
    
    void main() {
      gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */`#version 300 es
    precision highp float;
    
    uniform vec3 uColor;
    out vec4 fragColor;
    
    void main() {
      fragColor = vec4(uColor, 1.0);
    }
  `,
  glslVersion: GLSL3,
});
```

## 调试技巧

### 法线可视化

```glsl
// 显示法线方向
void main() {
  vec3 normalColor = vNormal * 0.5 + 0.5;
  gl_FragColor = vec4(normalColor, 1.0);
}
```

### UV 可视化

```glsl
// 显示 UV 坐标
void main() {
  gl_FragColor = vec4(vUv, 0.0, 1.0);
}
```

### 深度可视化

```glsl
// 显示深度
void main() {
  float depth = gl_FragCoord.z;
  gl_FragColor = vec4(vec3(depth), 1.0);
}
```

## 本章小结

- ShaderMaterial 允许完全自定义着色器
- Three.js 自动注入常用 uniform
- uniforms 用于向着色器传递数据
- RawShaderMaterial 不注入任何变量
- 可实现任意视觉效果

下一章，我们将学习特殊材质类型。
