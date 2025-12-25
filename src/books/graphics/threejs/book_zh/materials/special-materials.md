# 特殊材质类型

> "Three.js 提供多种特殊用途的材质，满足调试、后处理和特殊渲染需求。"

## 特殊材质概览

```
特殊材质
├── 调试材质
│   ├── MeshNormalMaterial
│   └── MeshDepthMaterial
├── 辅助材质
│   ├── MeshDistanceMaterial
│   └── ShadowMaterial
├── 线条材质
│   ├── LineBasicMaterial
│   ├── LineDashedMaterial
│   └── Line2 材质
├── 点材质
│   └── PointsMaterial
├── 精灵材质
│   └── SpriteMaterial
└── 卡通材质
    └── MeshToonMaterial
```

## MeshNormalMaterial 法线材质

```typescript
// src/materials/MeshNormalMaterial.ts
export class MeshNormalMaterial extends Material {
  readonly isMeshNormalMaterial = true;
  readonly type = 'MeshNormalMaterial';
  
  // 凹凸贴图
  bumpMap: Texture | null = null;
  bumpScale = 1;
  
  // 法线贴图
  normalMap: Texture | null = null;
  normalMapType = TangentSpaceNormalMap;
  normalScale = new Vector2(1, 1);
  
  // 置换贴图
  displacementMap: Texture | null = null;
  displacementScale = 1;
  displacementBias = 0;
  
  // 渲染选项
  wireframe = false;
  flatShading = false;
  
  constructor(parameters?: MeshNormalMaterialParameters) {
    super();
    this.setValues(parameters);
  }
}
```

### 法线材质着色器

```glsl
// meshnormal_frag.glsl
#version 300 es
precision highp float;

in vec3 vNormal;
out vec4 fragColor;

void main() {
    // 法线映射到 RGB
    // xyz: [-1, 1] -> RGB: [0, 1]
    vec3 normal = normalize(vNormal);
    vec3 color = normal * 0.5 + 0.5;
    
    fragColor = vec4(color, 1.0);
}
```

### 使用示例

```typescript
// 用于调试法线方向
const normalMaterial = new MeshNormalMaterial();

// 带法线贴图
const normalMaterialWithMap = new MeshNormalMaterial({
  normalMap: loader.load('/textures/brick_normal.jpg'),
  flatShading: false,
});

// 低多边形风格
const flatNormalMaterial = new MeshNormalMaterial({
  flatShading: true,
});
```

## MeshDepthMaterial 深度材质

```typescript
// src/materials/MeshDepthMaterial.ts
export class MeshDepthMaterial extends Material {
  readonly isMeshDepthMaterial = true;
  readonly type = 'MeshDepthMaterial';
  
  // 深度打包模式
  depthPacking = BasicDepthPacking;
  
  // 纹理
  map: Texture | null = null;
  alphaMap: Texture | null = null;
  
  // 置换
  displacementMap: Texture | null = null;
  displacementScale = 1;
  displacementBias = 0;
  
  // 渲染
  wireframe = false;
  
  constructor(parameters?: MeshDepthMaterialParameters) {
    super();
    this.setValues(parameters);
  }
}
```

### 深度打包方式

```typescript
// 常量定义
const BasicDepthPacking = 3200;      // 基础深度
const RGBADepthPacking = 3201;       // RGBA 编码深度

// 着色器中的打包/解包
const packDepthGLSL = /* glsl */`
// 将浮点深度值打包到 RGBA
vec4 packDepthToRGBA(float v) {
    vec4 r = vec4(1.0, 255.0, 65025.0, 16581375.0) * v;
    r = fract(r);
    r -= r.yzww * vec4(1.0/255.0, 1.0/255.0, 1.0/255.0, 0.0);
    return r;
}

// 从 RGBA 解包深度值
float unpackRGBAToDepth(vec4 v) {
    return dot(v, vec4(1.0, 1.0/255.0, 1.0/65025.0, 1.0/16581375.0));
}
`;
```

### 深度材质着色器

```glsl
// meshdepth_frag.glsl
#version 300 es
precision highp float;

#include <packing>

uniform float cameraNear;
uniform float cameraFar;

out vec4 fragColor;

void main() {
    float depth = gl_FragCoord.z;
    
    #ifdef DEPTH_PACKING_RGBA
    fragColor = packDepthToRGBA(depth);
    #else
    fragColor = vec4(vec3(depth), 1.0);
    #endif
}
```

### 使用示例

```typescript
// 基础深度材质
const depthMaterial = new MeshDepthMaterial();

// RGBA 打包（用于阴影贴图）
const packedDepthMaterial = new MeshDepthMaterial({
  depthPacking: RGBADepthPacking,
});

// 自定义深度写入
scene.overrideMaterial = depthMaterial;
renderer.setRenderTarget(depthRenderTarget);
renderer.render(scene, camera);
```

## MeshDistanceMaterial 距离材质

```typescript
// src/materials/MeshDistanceMaterial.ts
// 用于点光源阴影的距离计算
export class MeshDistanceMaterial extends Material {
  readonly isMeshDistanceMaterial = true;
  readonly type = 'MeshDistanceMaterial';
  
  // 参考点（光源位置）
  referencePosition = new Vector3();
  nearDistance = 1;
  farDistance = 1000;
  
  // 纹理
  map: Texture | null = null;
  alphaMap: Texture | null = null;
  
  // 置换
  displacementMap: Texture | null = null;
  displacementScale = 1;
  displacementBias = 0;
  
  constructor(parameters?: MeshDistanceMaterialParameters) {
    super();
    this.setValues(parameters);
  }
}
```

### 距离材质着色器

```glsl
// meshdistance_frag.glsl
#version 300 es
precision highp float;

#include <packing>

uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;

in vec3 vWorldPosition;

out vec4 fragColor;

void main() {
    float dist = length(vWorldPosition - referencePosition);
    dist = (dist - nearDistance) / (farDistance - nearDistance);
    dist = saturate(dist);
    
    fragColor = packDepthToRGBA(dist);
}
```

## ShadowMaterial 阴影材质

```typescript
// src/materials/ShadowMaterial.ts
// 只接收阴影，不渲染物体本身
export class ShadowMaterial extends Material {
  readonly isShadowMaterial = true;
  readonly type = 'ShadowMaterial';
  
  color = new Color(0x000000);
  
  constructor(parameters?: ShadowMaterialParameters) {
    super();
    
    this.transparent = true;
    
    this.setValues(parameters);
  }
}
```

### 使用示例

```typescript
// 用于地面接收阴影
const shadowMaterial = new ShadowMaterial({
  color: 0x000000,
  opacity: 0.5,
});

const ground = new Mesh(
  new PlaneGeometry(10, 10),
  shadowMaterial
);
ground.receiveShadow = true;
ground.rotation.x = -Math.PI / 2;
scene.add(ground);
```

## MeshToonMaterial 卡通材质

```typescript
// src/materials/MeshToonMaterial.ts
export class MeshToonMaterial extends Material {
  readonly isMeshToonMaterial = true;
  readonly type = 'MeshToonMaterial';
  
  color = new Color(0xffffff);
  
  // 渐变贴图（控制色阶）
  gradientMap: Texture | null = null;
  
  // 纹理
  map: Texture | null = null;
  lightMap: Texture | null = null;
  lightMapIntensity = 1;
  aoMap: Texture | null = null;
  aoMapIntensity = 1;
  
  // 自发光
  emissive = new Color(0x000000);
  emissiveIntensity = 1;
  emissiveMap: Texture | null = null;
  
  // 法线
  bumpMap: Texture | null = null;
  bumpScale = 1;
  normalMap: Texture | null = null;
  normalScale = new Vector2(1, 1);
  
  // 置换
  displacementMap: Texture | null = null;
  displacementScale = 1;
  displacementBias = 0;
  
  // Alpha
  alphaMap: Texture | null = null;
  
  // 渲染
  wireframe = false;
  fog = true;
  
  constructor(parameters?: MeshToonMaterialParameters) {
    super();
    this.setValues(parameters);
  }
}
```

### 卡通着色器

```glsl
// meshtoon_frag.glsl
#version 300 es
precision highp float;

uniform vec3 diffuse;
uniform sampler2D gradientMap;

in vec3 vNormal;
in vec3 vLightDir;

out vec4 fragColor;

void main() {
    vec3 normal = normalize(vNormal);
    
    // 计算光照强度
    float NdotL = dot(normal, vLightDir);
    float intensity = NdotL * 0.5 + 0.5;
    
    // 使用渐变贴图量化
    #ifdef USE_GRADIENTMAP
    vec4 gradient = texture(gradientMap, vec2(intensity, 0.0));
    intensity = gradient.r;
    #else
    // 默认 3 色阶
    intensity = floor(intensity * 3.0) / 3.0;
    #endif
    
    vec3 color = diffuse * intensity;
    
    fragColor = vec4(color, 1.0);
}
```

### 使用示例

```typescript
// 基础卡通材质
const toonMaterial = new MeshToonMaterial({
  color: 0xff0000,
});

// 自定义色阶
const threeTone = new DataTexture(
  new Uint8Array([0, 128, 255]),
  3, 1,
  RGBAFormat
);
threeTone.needsUpdate = true;

const customToonMaterial = new MeshToonMaterial({
  color: 0x00ff00,
  gradientMap: threeTone,
});

// 5 色阶
const fiveTone = new DataTexture(
  new Uint8Array([0, 64, 128, 192, 255]),
  5, 1,
  RedFormat
);
fiveTone.minFilter = NearestFilter;
fiveTone.magFilter = NearestFilter;
fiveTone.needsUpdate = true;
```

## 线条材质

### LineBasicMaterial

```typescript
// src/materials/LineBasicMaterial.ts
export class LineBasicMaterial extends Material {
  readonly isLineBasicMaterial = true;
  readonly type = 'LineBasicMaterial';
  
  color = new Color(0xffffff);
  linewidth = 1;
  linecap = 'round';
  linejoin = 'round';
  fog = true;
  
  constructor(parameters?: LineBasicMaterialParameters) {
    super();
    this.setValues(parameters);
  }
}
```

### LineDashedMaterial

```typescript
// src/materials/LineDashedMaterial.ts
export class LineDashedMaterial extends LineBasicMaterial {
  readonly isLineDashedMaterial = true;
  readonly type = 'LineDashedMaterial';
  
  scale = 1;
  dashSize = 3;
  gapSize = 1;
  
  constructor(parameters?: LineDashedMaterialParameters) {
    super();
    this.setValues(parameters);
  }
}
```

### 使用示例

```typescript
// 基础线条
const lineMaterial = new LineBasicMaterial({
  color: 0x00ff00,
});

const points = [
  new Vector3(-1, 0, 0),
  new Vector3(0, 1, 0),
  new Vector3(1, 0, 0),
];
const geometry = new BufferGeometry().setFromPoints(points);
const line = new Line(geometry, lineMaterial);

// 虚线
const dashedMaterial = new LineDashedMaterial({
  color: 0xff0000,
  linewidth: 1,
  scale: 1,
  dashSize: 0.3,
  gapSize: 0.1,
});

const dashedLine = new Line(geometry, dashedMaterial);
dashedLine.computeLineDistances(); // 必须调用
```

## PointsMaterial 点材质

```typescript
// src/materials/PointsMaterial.ts
export class PointsMaterial extends Material {
  readonly isPointsMaterial = true;
  readonly type = 'PointsMaterial';
  
  color = new Color(0xffffff);
  size = 1;
  sizeAttenuation = true;
  
  map: Texture | null = null;
  alphaMap: Texture | null = null;
  
  fog = true;
  
  constructor(parameters?: PointsMaterialParameters) {
    super();
    this.setValues(parameters);
  }
}
```

### 点着色器

```glsl
// points_vert.glsl
#version 300 es

uniform float size;
uniform float scale;

#ifdef USE_SIZEATTENUATION
// 根据距离衰减大小
void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (scale / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
}
#else
void main() {
    gl_PointSize = size;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
#endif
```

### 使用示例

```typescript
// 粒子系统
const particleCount = 10000;
const positions = new Float32Array(particleCount * 3);

for (let i = 0; i < particleCount; i++) {
  positions[i * 3] = (Math.random() - 0.5) * 10;
  positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
  positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
}

const geometry = new BufferGeometry();
geometry.setAttribute('position', new BufferAttribute(positions, 3));

const pointsMaterial = new PointsMaterial({
  color: 0xffffff,
  size: 0.1,
  sizeAttenuation: true,
  transparent: true,
  opacity: 0.8,
  map: loader.load('/textures/particle.png'),
  blending: AdditiveBlending,
  depthWrite: false,
});

const particles = new Points(geometry, pointsMaterial);
scene.add(particles);
```

## SpriteMaterial 精灵材质

```typescript
// src/materials/SpriteMaterial.ts
export class SpriteMaterial extends Material {
  readonly isSpriteMaterial = true;
  readonly type = 'SpriteMaterial';
  
  color = new Color(0xffffff);
  map: Texture | null = null;
  alphaMap: Texture | null = null;
  
  rotation = 0;
  sizeAttenuation = true;
  
  fog = true;
  
  constructor(parameters?: SpriteMaterialParameters) {
    super();
    
    this.transparent = true;
    
    this.setValues(parameters);
  }
}
```

### 使用示例

```typescript
// 基础精灵
const spriteMaterial = new SpriteMaterial({
  map: loader.load('/textures/sprite.png'),
  color: 0xffffff,
});

const sprite = new Sprite(spriteMaterial);
sprite.scale.set(2, 2, 1);
scene.add(sprite);

// 标签精灵
const labelTexture = createTextTexture('Hello World');
const labelMaterial = new SpriteMaterial({
  map: labelTexture,
  transparent: true,
});

const label = new Sprite(labelMaterial);
label.position.set(0, 2, 0);
scene.add(label);

// 创建文字纹理
function createTextTexture(text: string): Texture {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  
  canvas.width = 256;
  canvas.height = 64;
  
  ctx.fillStyle = 'white';
  ctx.font = '32px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(text, 128, 40);
  
  const texture = new CanvasTexture(canvas);
  return texture;
}
```

## 材质对比表

| 材质类型 | 用途 | 光照 | 性能 |
|----------|------|------|------|
| NormalMaterial | 调试法线 | ✗ | ★★★★★ |
| DepthMaterial | 深度可视化/阴影 | ✗ | ★★★★★ |
| DistanceMaterial | 点光源阴影 | ✗ | ★★★★★ |
| ShadowMaterial | 只接收阴影 | 阴影 | ★★★★★ |
| ToonMaterial | 卡通风格 | 量化光照 | ★★★★ |
| LineBasicMaterial | 线条渲染 | ✗ | ★★★★★ |
| PointsMaterial | 粒子系统 | ✗ | ★★★★★ |
| SpriteMaterial | 广告牌/UI | ✗ | ★★★★★ |

## 本章小结

- NormalMaterial 显示法线方向用于调试
- DepthMaterial 渲染深度信息
- ToonMaterial 实现卡通渲染风格
- 线条材质支持实线和虚线
- 点材质用于粒子系统
- 精灵材质用于 2D 元素

下一章，我们将学习光照理论。
