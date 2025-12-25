# 自定义着色器

> "着色器是 GPU 的灵魂。"

## ShaderMaterial 基础

```
着色器执行流程：

┌─────────────────┐
│   JavaScript    │
│  (Uniforms)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Vertex Shader   │ ← 每个顶点执行一次
│  - Transform    │
│  - Varyings     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Rasterization  │ ← GPU 自动处理
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Fragment Shader │ ← 每个像素执行一次
│  - Color        │
│  - Effects      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Final Pixel    │
└─────────────────┘
```

## 基本 ShaderMaterial

```typescript
import { ShaderMaterial, Vector2, Color } from 'three';

const material = new ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uColor: { value: new Color(0xff0000) },
    uResolution: { value: new Vector2(window.innerWidth, window.innerHeight) },
  },
  vertexShader: `
    varying vec2 vUv;
    
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uColor;
    uniform vec2 uResolution;
    varying vec2 vUv;
    
    void main() {
      vec3 color = uColor * (sin(uTime + vUv.x * 10.0) * 0.5 + 0.5);
      gl_FragColor = vec4(color, 1.0);
    }
  `,
});

// 动画更新
function animate(time: number) {
  material.uniforms.uTime.value = time * 0.001;
}
```

## Three.js 内置变量

```glsl
// 顶点着色器中可用

// 属性 (Attributes)
attribute vec3 position;    // 顶点位置
attribute vec3 normal;      // 顶点法线
attribute vec2 uv;          // 纹理坐标
attribute vec2 uv1;         // 第二套 UV
attribute vec4 tangent;     // 切线

// 矩阵 (Uniforms)
uniform mat4 modelMatrix;       // 模型矩阵
uniform mat4 viewMatrix;        // 视图矩阵
uniform mat4 projectionMatrix;  // 投影矩阵
uniform mat4 modelViewMatrix;   // 模型视图矩阵
uniform mat3 normalMatrix;      // 法线矩阵

// 相机
uniform vec3 cameraPosition;    // 相机位置

// 片段着色器额外可用
uniform float opacity;          // 透明度
```

## Uniform 类型

```typescript
const material = new ShaderMaterial({
  uniforms: {
    // 标量
    uFloat: { value: 1.0 },
    uInt: { value: 1 },
    
    // 向量
    uVec2: { value: new Vector2(1, 2) },
    uVec3: { value: new Vector3(1, 2, 3) },
    uVec4: { value: new Vector4(1, 2, 3, 4) },
    
    // 颜色
    uColor: { value: new Color(0xff0000) },
    
    // 矩阵
    uMat3: { value: new Matrix3() },
    uMat4: { value: new Matrix4() },
    
    // 纹理
    uTexture: { value: texture },
    uCubeTexture: { value: cubeTexture },
    
    // 数组
    uFloatArray: { value: [1.0, 2.0, 3.0] },
    uVec2Array: { value: [new Vector2(1, 2), new Vector2(3, 4)] },
  },
  
  vertexShader: `...`,
  fragmentShader: `...`,
});
```

## 纹理采样

```typescript
const material = new ShaderMaterial({
  uniforms: {
    uTexture: { value: texture },
    uNormalMap: { value: normalMap },
  },
  vertexShader: `
    varying vec2 vUv;
    
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D uTexture;
    uniform sampler2D uNormalMap;
    varying vec2 vUv;
    
    void main() {
      // 基础纹理采样
      vec4 texColor = texture2D(uTexture, vUv);
      
      // 法线贴图采样
      vec3 normal = texture2D(uNormalMap, vUv).rgb;
      normal = normalize(normal * 2.0 - 1.0);
      
      gl_FragColor = texColor;
    }
  `,
});
```

## 光照计算

```glsl
// 兰伯特漫反射
float lambertDiffuse(vec3 normal, vec3 lightDir) {
  return max(dot(normal, lightDir), 0.0);
}

// Phong 高光
float phongSpecular(vec3 normal, vec3 lightDir, vec3 viewDir, float shininess) {
  vec3 reflectDir = reflect(-lightDir, normal);
  return pow(max(dot(viewDir, reflectDir), 0.0), shininess);
}

// Blinn-Phong 高光
float blinnPhongSpecular(vec3 normal, vec3 lightDir, vec3 viewDir, float shininess) {
  vec3 halfDir = normalize(lightDir + viewDir);
  return pow(max(dot(normal, halfDir), 0.0), shininess);
}

// 完整光照
vec3 calculateLighting(
  vec3 normal,
  vec3 lightPos,
  vec3 viewPos,
  vec3 fragPos,
  vec3 lightColor,
  vec3 objectColor
) {
  // 环境光
  vec3 ambient = 0.1 * lightColor;
  
  // 漫反射
  vec3 lightDir = normalize(lightPos - fragPos);
  float diff = lambertDiffuse(normal, lightDir);
  vec3 diffuse = diff * lightColor;
  
  // 高光
  vec3 viewDir = normalize(viewPos - fragPos);
  float spec = blinnPhongSpecular(normal, lightDir, viewDir, 32.0);
  vec3 specular = spec * lightColor;
  
  return (ambient + diffuse + specular) * objectColor;
}
```

## 噪声函数

```glsl
// 简单 2D 噪声
float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

// 值噪声
float noise(vec2 st) {
  vec2 i = floor(st);
  vec2 f = fract(st);
  
  float a = random(i);
  float b = random(i + vec2(1.0, 0.0));
  float c = random(i + vec2(0.0, 1.0));
  float d = random(i + vec2(1.0, 1.0));
  
  vec2 u = f * f * (3.0 - 2.0 * f);
  
  return mix(a, b, u.x) +
         (c - a) * u.y * (1.0 - u.x) +
         (d - b) * u.x * u.y;
}

// 分形布朗运动 (FBM)
float fbm(vec2 st) {
  float value = 0.0;
  float amplitude = 0.5;
  
  for (int i = 0; i < 6; i++) {
    value += amplitude * noise(st);
    st *= 2.0;
    amplitude *= 0.5;
  }
  
  return value;
}

// Simplex 噪声（需要引入额外代码）
// 或使用纹理存储预计算的噪声
```

## 常用效果

```typescript
// 1. 菲涅尔效果
const fresnelShader = {
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vViewPosition = -mvPosition.xyz;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    uniform vec3 uColor;
    uniform float uFresnelPower;
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    
    void main() {
      vec3 viewDir = normalize(vViewPosition);
      float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), uFresnelPower);
      vec3 color = mix(vec3(0.0), uColor, fresnel);
      gl_FragColor = vec4(color, 1.0);
    }
  `,
};

// 2. 溶解效果
const dissolveShader = {
  uniforms: {
    uProgress: { value: 0 },
    uNoiseScale: { value: 3.0 },
    uEdgeColor: { value: new Color(0xff6600) },
    uEdgeWidth: { value: 0.1 },
  },
  fragmentShader: `
    uniform float uProgress;
    uniform float uNoiseScale;
    uniform vec3 uEdgeColor;
    uniform float uEdgeWidth;
    varying vec2 vUv;
    
    float random(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
    }
    
    float noise(vec2 st) {
      vec2 i = floor(st);
      vec2 f = fract(st);
      float a = random(i);
      float b = random(i + vec2(1.0, 0.0));
      float c = random(i + vec2(0.0, 1.0));
      float d = random(i + vec2(1.0, 1.0));
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    }
    
    void main() {
      float n = noise(vUv * uNoiseScale);
      
      if (n < uProgress) {
        discard;
      }
      
      // 边缘发光
      float edge = smoothstep(uProgress, uProgress + uEdgeWidth, n);
      vec3 color = mix(uEdgeColor, vec3(1.0), edge);
      
      gl_FragColor = vec4(color, 1.0);
    }
  `,
};

// 3. 全息效果
const hologramShader = {
  vertexShader: `
    varying vec3 vPosition;
    varying vec3 vNormal;
    
    void main() {
      vPosition = position;
      vNormal = normal;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uColor;
    varying vec3 vPosition;
    varying vec3 vNormal;
    
    void main() {
      // 扫描线
      float scanline = sin(vPosition.y * 50.0 + uTime * 5.0) * 0.5 + 0.5;
      
      // 闪烁
      float flicker = sin(uTime * 20.0) * 0.1 + 0.9;
      
      // 边缘发光
      vec3 viewDir = normalize(cameraPosition - vPosition);
      float edge = pow(1.0 - abs(dot(viewDir, vNormal)), 2.0);
      
      vec3 color = uColor * (scanline * 0.3 + 0.7) * flicker;
      float alpha = edge * 0.8 + 0.2;
      
      gl_FragColor = vec4(color, alpha);
    }
  `,
};
```

## RawShaderMaterial

```typescript
// 完全手动控制，不注入任何 Three.js 变量
const rawMaterial = new RawShaderMaterial({
  uniforms: {
    uProjectionMatrix: { value: camera.projectionMatrix },
    uModelViewMatrix: { value: new Matrix4() },
    uColor: { value: new Color(0xff0000) },
  },
  vertexShader: `
    precision mediump float;
    
    attribute vec3 position;
    attribute vec2 uv;
    
    uniform mat4 uProjectionMatrix;
    uniform mat4 uModelViewMatrix;
    
    varying vec2 vUv;
    
    void main() {
      vUv = uv;
      gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    precision mediump float;
    
    uniform vec3 uColor;
    varying vec2 vUv;
    
    void main() {
      gl_FragColor = vec4(uColor, 1.0);
    }
  `,
});

// 每帧更新矩阵
function animate() {
  mesh.updateMatrixWorld();
  rawMaterial.uniforms.uModelViewMatrix.value
    .copy(camera.matrixWorldInverse)
    .multiply(mesh.matrixWorld);
}
```

## onBeforeCompile 修改内置材质

```typescript
const material = new MeshStandardMaterial({
  color: 0x00ff00,
});

material.onBeforeCompile = (shader) => {
  // 添加自定义 uniform
  shader.uniforms.uTime = { value: 0 };
  
  // 修改顶点着色器
  shader.vertexShader = shader.vertexShader.replace(
    '#include <common>',
    `
    #include <common>
    uniform float uTime;
    `
  );
  
  shader.vertexShader = shader.vertexShader.replace(
    '#include <begin_vertex>',
    `
    #include <begin_vertex>
    // 添加波动效果
    transformed.y += sin(position.x * 10.0 + uTime) * 0.1;
    `
  );
  
  // 保存引用以便更新
  material.userData.shader = shader;
};

// 更新 uniform
function animate(time: number) {
  if (material.userData.shader) {
    material.userData.shader.uniforms.uTime.value = time * 0.001;
  }
}
```

## 着色器模块化

```typescript
// 着色器 chunks
const chunks = {
  noise: `
    float random(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
    }
    
    float noise(vec2 st) {
      vec2 i = floor(st);
      vec2 f = fract(st);
      float a = random(i);
      float b = random(i + vec2(1.0, 0.0));
      float c = random(i + vec2(0.0, 1.0));
      float d = random(i + vec2(1.0, 1.0));
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    }
  `,
  
  lighting: `
    float lambertDiffuse(vec3 normal, vec3 lightDir) {
      return max(dot(normal, lightDir), 0.0);
    }
  `,
};

// 使用
const fragmentShader = `
  ${chunks.noise}
  ${chunks.lighting}
  
  void main() {
    float n = noise(vUv * 10.0);
    gl_FragColor = vec4(vec3(n), 1.0);
  }
`;
```

## 调试技巧

```glsl
// 可视化法线
gl_FragColor = vec4(vNormal * 0.5 + 0.5, 1.0);

// 可视化 UV
gl_FragColor = vec4(vUv, 0.0, 1.0);

// 可视化深度
float depth = gl_FragCoord.z;
gl_FragColor = vec4(vec3(depth), 1.0);

// 可视化世界位置
gl_FragColor = vec4(fract(vWorldPosition), 1.0);

// 检查 NaN
if (isnan(value) || isinf(value)) {
  gl_FragColor = vec4(1.0, 0.0, 1.0, 1.0); // 品红色表示错误
  return;
}
```

## 本章小结

- ShaderMaterial 允许编写自定义 GLSL
- Three.js 自动注入常用 uniforms 和 attributes
- RawShaderMaterial 完全手动控制
- onBeforeCompile 可修改内置材质着色器
- 噪声函数是程序化纹理的基础
- 模块化着色器代码提高复用性

下一章，我们将学习 InstancedMesh 实例化渲染。
