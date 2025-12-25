# MeshLambertMaterial 兰伯特材质

> "Lambert 材质实现漫反射光照，适合哑光表面的快速渲染。"

## 材质特点

```
MeshLambertMaterial
├── 漫反射光照
│   └── Lambert 模型
├── 无镜面高光
├── 逐顶点计算
│   └── 性能优于 Phong
├── 适用场景
│   ├── 哑光材质
│   ├── 大场景渲染
│   └── 移动端性能优化
└── 支持
    ├── 多光源
    ├── 阴影
    ├── 环境贴图
    └── 自发光
```

## 完整实现

```typescript
// src/materials/MeshLambertMaterial.ts
import { Material, MaterialParameters } from './Material';
import { Color, ColorRepresentation } from '../math/Color';
import { Texture } from '../textures/Texture';
import { Combine, MultiplyOperation } from '../constants';

export interface MeshLambertMaterialParameters extends MaterialParameters {
  color?: ColorRepresentation;
  emissive?: ColorRepresentation;
  emissiveIntensity?: number;
  emissiveMap?: Texture | null;
  bumpMap?: Texture | null;
  bumpScale?: number;
  normalMap?: Texture | null;
  normalScale?: Vector2;
  displacementMap?: Texture | null;
  displacementScale?: number;
  displacementBias?: number;
  map?: Texture | null;
  lightMap?: Texture | null;
  lightMapIntensity?: number;
  aoMap?: Texture | null;
  aoMapIntensity?: number;
  specularMap?: Texture | null;
  alphaMap?: Texture | null;
  envMap?: Texture | null;
  combine?: Combine;
  reflectivity?: number;
  refractionRatio?: number;
  wireframe?: boolean;
  flatShading?: boolean;
  fog?: boolean;
}

export class MeshLambertMaterial extends Material {
  readonly isMeshLambertMaterial = true;
  readonly type = 'MeshLambertMaterial';
  
  // 基础颜色
  color = new Color(0xffffff);
  
  // 自发光
  emissive = new Color(0x000000);
  emissiveIntensity = 1;
  emissiveMap: Texture | null = null;
  
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
  
  // 纹理贴图
  map: Texture | null = null;
  
  // 光照贴图
  lightMap: Texture | null = null;
  lightMapIntensity = 1;
  
  // AO 贴图
  aoMap: Texture | null = null;
  aoMapIntensity = 1;
  
  // 高光贴图
  specularMap: Texture | null = null;
  
  // Alpha 贴图
  alphaMap: Texture | null = null;
  
  // 环境贴图
  envMap: Texture | null = null;
  combine: Combine = MultiplyOperation;
  reflectivity = 1;
  refractionRatio = 0.98;
  
  // 渲染选项
  wireframe = false;
  wireframeLinewidth = 1;
  
  // 平面着色
  flatShading = false;
  
  // 雾效
  fog = true;
  
  constructor(parameters?: MeshLambertMaterialParameters) {
    super();
    this.setValues(parameters);
  }
  
  copy(source: MeshLambertMaterial): this {
    super.copy(source);
    
    this.color.copy(source.color);
    
    this.emissive.copy(source.emissive);
    this.emissiveIntensity = source.emissiveIntensity;
    this.emissiveMap = source.emissiveMap;
    
    this.bumpMap = source.bumpMap;
    this.bumpScale = source.bumpScale;
    
    this.normalMap = source.normalMap;
    this.normalMapType = source.normalMapType;
    this.normalScale.copy(source.normalScale);
    
    this.displacementMap = source.displacementMap;
    this.displacementScale = source.displacementScale;
    this.displacementBias = source.displacementBias;
    
    this.map = source.map;
    
    this.lightMap = source.lightMap;
    this.lightMapIntensity = source.lightMapIntensity;
    
    this.aoMap = source.aoMap;
    this.aoMapIntensity = source.aoMapIntensity;
    
    this.specularMap = source.specularMap;
    
    this.alphaMap = source.alphaMap;
    
    this.envMap = source.envMap;
    this.combine = source.combine;
    this.reflectivity = source.reflectivity;
    this.refractionRatio = source.refractionRatio;
    
    this.wireframe = source.wireframe;
    this.wireframeLinewidth = source.wireframeLinewidth;
    
    this.flatShading = source.flatShading;
    
    this.fog = source.fog;
    
    return this;
  }
}
```

## 着色器实现

### 顶点着色器

```glsl
// meshlambert_vert.glsl
#version 300 es

in vec3 position;
in vec3 normal;
in vec2 uv;

#ifdef USE_COLOR
in vec3 color;
#endif

uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat3 normalMatrix;

// 光照
#define MAX_DIR_LIGHTS 4
#define MAX_POINT_LIGHTS 4

struct DirectionalLight {
    vec3 direction;
    vec3 color;
};

struct PointLight {
    vec3 position;
    vec3 color;
    float distance;
    float decay;
};

uniform DirectionalLight directionalLights[MAX_DIR_LIGHTS];
uniform PointLight pointLights[MAX_POINT_LIGHTS];
uniform vec3 ambientLightColor;

uniform int numDirectionalLights;
uniform int numPointLights;

// 输出
out vec3 vLightFront;
out vec3 vIndirectFront;
out vec2 vUv;

#ifdef USE_COLOR
out vec3 vColor;
#endif

#ifdef USE_ENVMAP
out vec3 vWorldPosition;
out vec3 vWorldNormal;
#endif

// 点光源衰减
float getDistanceAttenuation(float lightDistance, float cutoffDistance, float decayExponent) {
    if (cutoffDistance > 0.0 && decayExponent > 0.0) {
        float distanceFalloff = 1.0 / max(pow(lightDistance, decayExponent), 0.01);
        float cutoffFalloff = 1.0 - pow(lightDistance / cutoffDistance, 4.0);
        cutoffFalloff = max(cutoffFalloff, 0.0);
        return distanceFalloff * cutoffFalloff * cutoffFalloff;
    }
    return 1.0;
}

void main() {
    vec3 objectNormal = normal;
    
    #ifdef FLAT_SHADED
    objectNormal = vec3(0.0);
    #endif
    
    vec3 transformedNormal = normalize(normalMatrix * objectNormal);
    
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vec3 worldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    
    // 初始化光照
    vLightFront = vec3(0.0);
    vIndirectFront = vec3(0.0);
    
    // 环境光
    vIndirectFront += ambientLightColor;
    
    // 方向光
    for (int i = 0; i < MAX_DIR_LIGHTS; i++) {
        if (i >= numDirectionalLights) break;
        
        vec3 lightDir = directionalLights[i].direction;
        float dotNL = max(dot(transformedNormal, lightDir), 0.0);
        
        vLightFront += directionalLights[i].color * dotNL;
    }
    
    // 点光源
    for (int i = 0; i < MAX_POINT_LIGHTS; i++) {
        if (i >= numPointLights) break;
        
        vec3 lightVector = pointLights[i].position - worldPosition;
        float lightDistance = length(lightVector);
        vec3 lightDir = normalize(lightVector);
        
        float dotNL = max(dot(transformedNormal, lightDir), 0.0);
        float attenuation = getDistanceAttenuation(
            lightDistance,
            pointLights[i].distance,
            pointLights[i].decay
        );
        
        vLightFront += pointLights[i].color * dotNL * attenuation;
    }
    
    // UV
    vUv = uv;
    
    // 顶点颜色
    #ifdef USE_COLOR
    vColor = color;
    #endif
    
    // 环境贴图
    #ifdef USE_ENVMAP
    vWorldPosition = worldPosition;
    vWorldNormal = normalize(mat3(modelMatrix) * objectNormal);
    #endif
    
    gl_Position = projectionMatrix * mvPosition;
}
```

### 片段着色器

```glsl
// meshlambert_frag.glsl
#version 300 es
precision highp float;

uniform vec3 diffuse;
uniform vec3 emissive;
uniform float emissiveIntensity;
uniform float opacity;

in vec3 vLightFront;
in vec3 vIndirectFront;
in vec2 vUv;

#ifdef USE_MAP
uniform sampler2D map;
#endif

#ifdef USE_EMISSIVEMAP
uniform sampler2D emissiveMap;
#endif

#ifdef USE_LIGHTMAP
uniform sampler2D lightMap;
uniform float lightMapIntensity;
#endif

#ifdef USE_AOMAP
uniform sampler2D aoMap;
uniform float aoMapIntensity;
#endif

#ifdef USE_ENVMAP
uniform samplerCube envMap;
uniform float reflectivity;
uniform vec3 cameraPosition;
in vec3 vWorldPosition;
in vec3 vWorldNormal;
#endif

#ifdef USE_COLOR
in vec3 vColor;
#endif

#ifdef USE_FOG
uniform vec3 fogColor;
#ifdef FOG_EXP2
uniform float fogDensity;
#else
uniform float fogNear;
uniform float fogFar;
#endif
#endif

out vec4 fragColor;

void main() {
    vec4 diffuseColor = vec4(diffuse, opacity);
    
    // 纹理
    #ifdef USE_MAP
    vec4 texelColor = texture(map, vUv);
    diffuseColor *= texelColor;
    #endif
    
    // 顶点颜色
    #ifdef USE_COLOR
    diffuseColor.rgb *= vColor;
    #endif
    
    // 计算光照
    vec3 outgoingLight = vec3(0.0);
    
    // 直接光照
    outgoingLight += diffuseColor.rgb * vLightFront;
    
    // 间接光照（环境光）
    outgoingLight += diffuseColor.rgb * vIndirectFront;
    
    // 光照贴图
    #ifdef USE_LIGHTMAP
    vec4 lightMapTexel = texture(lightMap, vUv);
    outgoingLight *= lightMapTexel.rgb * lightMapIntensity;
    #endif
    
    // AO 贴图
    #ifdef USE_AOMAP
    float ao = (texture(aoMap, vUv).r - 1.0) * aoMapIntensity + 1.0;
    outgoingLight *= ao;
    #endif
    
    // 自发光
    vec3 totalEmissiveRadiance = emissive * emissiveIntensity;
    #ifdef USE_EMISSIVEMAP
    totalEmissiveRadiance *= texture(emissiveMap, vUv).rgb;
    #endif
    outgoingLight += totalEmissiveRadiance;
    
    // 环境贴图
    #ifdef USE_ENVMAP
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    vec3 worldNormal = normalize(vWorldNormal);
    vec3 reflectDir = reflect(-viewDir, worldNormal);
    
    vec4 envColor = texture(envMap, reflectDir);
    outgoingLight = mix(outgoingLight, envColor.rgb, reflectivity);
    #endif
    
    fragColor = vec4(outgoingLight, diffuseColor.a);
    
    // 雾效
    #ifdef USE_FOG
    float depth = gl_FragCoord.z / gl_FragCoord.w;
    #ifdef FOG_EXP2
    float fogFactor = 1.0 - exp(-fogDensity * fogDensity * depth * depth);
    #else
    float fogFactor = smoothstep(fogNear, fogFar, depth);
    #endif
    fragColor.rgb = mix(fragColor.rgb, fogColor, fogFactor);
    #endif
}
```

## 使用示例

### 基本用法

```typescript
// 基础 Lambert 材质
const lambertMaterial = new MeshLambertMaterial({
  color: 0x00ff00,
});

// 带纹理
const texturedLambert = new MeshLambertMaterial({
  map: new TextureLoader().load('/textures/wood.jpg'),
});
```

### 自发光效果

```typescript
// 自发光材质
const emissiveMaterial = new MeshLambertMaterial({
  color: 0x333333,
  emissive: 0xff0000,
  emissiveIntensity: 2,
});

// 带自发光贴图
const emissiveMapMaterial = new MeshLambertMaterial({
  color: 0xffffff,
  emissive: 0xffffff,
  emissiveIntensity: 1,
  emissiveMap: new TextureLoader().load('/textures/emissive.jpg'),
});
```

### 光照场景

```typescript
// 创建场景
const scene = new Scene();
scene.add(new AmbientLight(0x404040, 0.5));

// 方向光
const dirLight = new DirectionalLight(0xffffff, 1);
dirLight.position.set(5, 10, 5);
scene.add(dirLight);

// 点光源
const pointLight = new PointLight(0xff0000, 1, 100);
pointLight.position.set(0, 5, 0);
scene.add(pointLight);

// 使用 Lambert 材质
const mesh = new Mesh(
  new SphereGeometry(1, 32, 32),
  new MeshLambertMaterial({ color: 0xffffff })
);
scene.add(mesh);
```

### 平面着色

```typescript
// 低多边形风格
const flatMaterial = new MeshLambertMaterial({
  color: 0x00aaff,
  flatShading: true,
});

// 配合低面数几何体
const lowPolyGeometry = new IcosahedronGeometry(1, 0);
const lowPolyMesh = new Mesh(lowPolyGeometry, flatMaterial);
```

### 性能优化场景

```typescript
// 大批量物体使用 Lambert 而非 Standard
const material = new MeshLambertMaterial({ color: 0xffffff });

// 实例化渲染
const instancedMesh = new InstancedMesh(geometry, material, 10000);

for (let i = 0; i < 10000; i++) {
  const matrix = new Matrix4();
  matrix.setPosition(
    Math.random() * 100 - 50,
    Math.random() * 100 - 50,
    Math.random() * 100 - 50
  );
  instancedMesh.setMatrixAt(i, matrix);
}

scene.add(instancedMesh);
```

## 与其他材质对比

| 特性 | BasicMaterial | LambertMaterial | PhongMaterial | StandardMaterial |
|------|---------------|-----------------|---------------|------------------|
| 光照 | ✗ | 漫反射 | 漫反射+高光 | PBR |
| 高光 | ✗ | ✗ | ✓ | ✓ |
| 计算位置 | - | 顶点 | 片段 | 片段 |
| 性能 | ★★★★★ | ★★★★ | ★★★ | ★★ |
| 真实感 | ★ | ★★ | ★★★ | ★★★★★ |

## 本章小结

- MeshLambertMaterial 实现 Lambert 漫反射
- 逐顶点光照计算，性能较好
- 支持多种光源类型
- 支持自发光效果
- 适合哑光表面和性能敏感场景

下一章，我们将学习 MeshPhongMaterial 高光材质。
