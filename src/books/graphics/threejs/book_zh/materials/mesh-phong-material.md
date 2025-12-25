# MeshPhongMaterial Phong 材质

> "Phong 着色模型引入镜面高光，让材质表面更具光泽感。"

## 材质特点

```
MeshPhongMaterial
├── 光照模型
│   ├── 漫反射（Lambert）
│   └── 镜面高光（Phong）
├── 逐片段计算
│   └── 高质量光照
├── 可调参数
│   ├── shininess（光泽度）
│   └── specular（高光颜色）
├── 适用场景
│   ├── 塑料
│   ├── 金属表面
│   └── 光泽材质
└── 支持
    ├── 多光源
    ├── 环境贴图
    ├── 法线贴图
    └── 高光贴图
```

## 完整实现

```typescript
// src/materials/MeshPhongMaterial.ts
import { Material, MaterialParameters } from './Material';
import { Color, ColorRepresentation } from '../math/Color';
import { Texture } from '../textures/Texture';
import { Vector2 } from '../math/Vector2';
import { Combine, MultiplyOperation, TangentSpaceNormalMap, NormalMapType } from '../constants';

export interface MeshPhongMaterialParameters extends MaterialParameters {
  color?: ColorRepresentation;
  specular?: ColorRepresentation;
  shininess?: number;
  emissive?: ColorRepresentation;
  emissiveIntensity?: number;
  emissiveMap?: Texture | null;
  bumpMap?: Texture | null;
  bumpScale?: number;
  normalMap?: Texture | null;
  normalMapType?: NormalMapType;
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

export class MeshPhongMaterial extends Material {
  readonly isMeshPhongMaterial = true;
  readonly type = 'MeshPhongMaterial';
  
  // 基础颜色
  color = new Color(0xffffff);
  
  // 高光
  specular = new Color(0x111111);
  shininess = 30;
  
  // 自发光
  emissive = new Color(0x000000);
  emissiveIntensity = 1;
  emissiveMap: Texture | null = null;
  
  // 凹凸贴图
  bumpMap: Texture | null = null;
  bumpScale = 1;
  
  // 法线贴图
  normalMap: Texture | null = null;
  normalMapType: NormalMapType = TangentSpaceNormalMap;
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
  flatShading = false;
  fog = true;
  
  constructor(parameters?: MeshPhongMaterialParameters) {
    super();
    this.setValues(parameters);
  }
  
  copy(source: MeshPhongMaterial): this {
    super.copy(source);
    
    this.color.copy(source.color);
    
    this.specular.copy(source.specular);
    this.shininess = source.shininess;
    
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
// meshphong_vert.glsl
#version 300 es

in vec3 position;
in vec3 normal;
in vec2 uv;

#ifdef USE_TANGENT
in vec4 tangent;
#endif

#ifdef USE_COLOR
in vec3 color;
#endif

uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat3 normalMatrix;
uniform vec3 cameraPosition;

out vec3 vNormal;
out vec3 vViewPosition;
out vec2 vUv;
out vec3 vWorldPosition;

#ifdef USE_TANGENT
out vec3 vTangent;
out vec3 vBitangent;
#endif

#ifdef USE_COLOR
out vec3 vColor;
#endif

void main() {
    // 法线变换
    vec3 objectNormal = normal;
    vec3 transformedNormal = normalize(normalMatrix * objectNormal);
    vNormal = transformedNormal;
    
    // 切线空间
    #ifdef USE_TANGENT
    vec3 objectTangent = tangent.xyz;
    vec3 transformedTangent = normalize(normalMatrix * objectTangent);
    vTangent = transformedTangent;
    vBitangent = normalize(cross(transformedNormal, transformedTangent) * tangent.w);
    #endif
    
    // 位置计算
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    
    // 世界位置
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    
    // UV
    vUv = uv;
    
    // 顶点颜色
    #ifdef USE_COLOR
    vColor = color;
    #endif
    
    gl_Position = projectionMatrix * mvPosition;
}
```

### 片段着色器

```glsl
// meshphong_frag.glsl
#version 300 es
precision highp float;

// 材质 uniform
uniform vec3 diffuse;
uniform vec3 specular;
uniform float shininess;
uniform vec3 emissive;
uniform float emissiveIntensity;
uniform float opacity;

// 光照
#define MAX_DIR_LIGHTS 4
#define MAX_POINT_LIGHTS 4
#define MAX_SPOT_LIGHTS 4

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

struct SpotLight {
    vec3 position;
    vec3 direction;
    vec3 color;
    float distance;
    float decay;
    float coneCos;
    float penumbraCos;
};

uniform DirectionalLight directionalLights[MAX_DIR_LIGHTS];
uniform PointLight pointLights[MAX_POINT_LIGHTS];
uniform SpotLight spotLights[MAX_SPOT_LIGHTS];
uniform vec3 ambientLightColor;

uniform int numDirectionalLights;
uniform int numPointLights;
uniform int numSpotLights;

uniform vec3 cameraPosition;

// 纹理
#ifdef USE_MAP
uniform sampler2D map;
#endif

#ifdef USE_NORMALMAP
uniform sampler2D normalMap;
uniform vec2 normalScale;
#endif

#ifdef USE_BUMPMAP
uniform sampler2D bumpMap;
uniform float bumpScale;
#endif

#ifdef USE_SPECULARMAP
uniform sampler2D specularMap;
#endif

#ifdef USE_EMISSIVEMAP
uniform sampler2D emissiveMap;
#endif

#ifdef USE_ENVMAP
uniform samplerCube envMap;
uniform float reflectivity;
#endif

// 输入
in vec3 vNormal;
in vec3 vViewPosition;
in vec2 vUv;
in vec3 vWorldPosition;

#ifdef USE_TANGENT
in vec3 vTangent;
in vec3 vBitangent;
#endif

#ifdef USE_COLOR
in vec3 vColor;
#endif

out vec4 fragColor;

// 光照衰减
float getDistanceAttenuation(float lightDistance, float cutoffDistance, float decayExponent) {
    if (cutoffDistance > 0.0 && decayExponent > 0.0) {
        float d = max(pow(lightDistance, decayExponent), 0.01);
        float c = 1.0 - pow(lightDistance / cutoffDistance, 4.0);
        return (1.0 / d) * max(c, 0.0) * max(c, 0.0);
    }
    return 1.0;
}

// 聚光灯衰减
float getSpotAttenuation(float coneCos, float penumbraCos, float angleCos) {
    return smoothstep(coneCos, penumbraCos, angleCos);
}

// Blinn-Phong 高光
vec3 BRDF_BlinnPhong(
    vec3 lightDir,
    vec3 viewDir,
    vec3 normal,
    vec3 specularColor,
    float shininess
) {
    vec3 halfDir = normalize(lightDir + viewDir);
    float dotNH = max(dot(normal, halfDir), 0.0);
    float specPower = max(shininess, 0.0001);
    
    // 归一化系数
    float normalization = (specPower + 2.0) / 8.0;
    
    return specularColor * normalization * pow(dotNH, specPower);
}

// 获取法线
vec3 getNormal() {
    vec3 normal = normalize(vNormal);
    
    #ifdef USE_NORMALMAP
    vec3 mapN = texture(normalMap, vUv).xyz * 2.0 - 1.0;
    mapN.xy *= normalScale;
    
    #ifdef USE_TANGENT
    mat3 TBN = mat3(normalize(vTangent), normalize(vBitangent), normal);
    normal = normalize(TBN * mapN);
    #else
    // 屏幕空间法线计算
    vec3 q0 = dFdx(vWorldPosition);
    vec3 q1 = dFdy(vWorldPosition);
    vec2 st0 = dFdx(vUv);
    vec2 st1 = dFdy(vUv);
    
    vec3 T = normalize(q0 * st1.t - q1 * st0.t);
    vec3 B = normalize(cross(normal, T));
    mat3 TBN = mat3(T, B, normal);
    normal = normalize(TBN * mapN);
    #endif
    #endif
    
    #ifdef USE_BUMPMAP
    // 简化凹凸贴图
    float h = texture(bumpMap, vUv).r * bumpScale;
    normal = normalize(normal + vec3(dFdx(h), dFdy(h), 0.0));
    #endif
    
    return normal;
}

void main() {
    // 基础颜色
    vec4 diffuseColor = vec4(diffuse, opacity);
    
    #ifdef USE_MAP
    vec4 texelColor = texture(map, vUv);
    diffuseColor *= texelColor;
    #endif
    
    #ifdef USE_COLOR
    diffuseColor.rgb *= vColor;
    #endif
    
    // 高光颜色
    vec3 specularColor = specular;
    
    #ifdef USE_SPECULARMAP
    specularColor *= texture(specularMap, vUv).rgb;
    #endif
    
    // 法线
    vec3 normal = getNormal();
    
    // 视线方向
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    
    // 光照计算
    vec3 totalDiffuse = vec3(0.0);
    vec3 totalSpecular = vec3(0.0);
    
    // 方向光
    for (int i = 0; i < MAX_DIR_LIGHTS; i++) {
        if (i >= numDirectionalLights) break;
        
        vec3 lightDir = directionalLights[i].direction;
        vec3 lightColor = directionalLights[i].color;
        
        float dotNL = max(dot(normal, lightDir), 0.0);
        
        totalDiffuse += lightColor * dotNL;
        totalSpecular += lightColor * BRDF_BlinnPhong(
            lightDir, viewDir, normal, specularColor, shininess
        ) * dotNL;
    }
    
    // 点光源
    for (int i = 0; i < MAX_POINT_LIGHTS; i++) {
        if (i >= numPointLights) break;
        
        vec3 lightVector = pointLights[i].position - vWorldPosition;
        float lightDistance = length(lightVector);
        vec3 lightDir = normalize(lightVector);
        vec3 lightColor = pointLights[i].color;
        
        float attenuation = getDistanceAttenuation(
            lightDistance,
            pointLights[i].distance,
            pointLights[i].decay
        );
        
        float dotNL = max(dot(normal, lightDir), 0.0);
        
        totalDiffuse += lightColor * attenuation * dotNL;
        totalSpecular += lightColor * attenuation * BRDF_BlinnPhong(
            lightDir, viewDir, normal, specularColor, shininess
        ) * dotNL;
    }
    
    // 聚光灯
    for (int i = 0; i < MAX_SPOT_LIGHTS; i++) {
        if (i >= numSpotLights) break;
        
        vec3 lightVector = spotLights[i].position - vWorldPosition;
        float lightDistance = length(lightVector);
        vec3 lightDir = normalize(lightVector);
        vec3 lightColor = spotLights[i].color;
        
        float angleCos = dot(lightDir, spotLights[i].direction);
        float spotAttenuation = getSpotAttenuation(
            spotLights[i].coneCos,
            spotLights[i].penumbraCos,
            angleCos
        );
        
        float distAttenuation = getDistanceAttenuation(
            lightDistance,
            spotLights[i].distance,
            spotLights[i].decay
        );
        
        float attenuation = spotAttenuation * distAttenuation;
        float dotNL = max(dot(normal, lightDir), 0.0);
        
        totalDiffuse += lightColor * attenuation * dotNL;
        totalSpecular += lightColor * attenuation * BRDF_BlinnPhong(
            lightDir, viewDir, normal, specularColor, shininess
        ) * dotNL;
    }
    
    // 环境光
    vec3 ambient = ambientLightColor;
    
    // 最终颜色
    vec3 outgoingLight = diffuseColor.rgb * (totalDiffuse + ambient) + totalSpecular;
    
    // 自发光
    vec3 totalEmissive = emissive * emissiveIntensity;
    #ifdef USE_EMISSIVEMAP
    totalEmissive *= texture(emissiveMap, vUv).rgb;
    #endif
    outgoingLight += totalEmissive;
    
    // 环境贴图
    #ifdef USE_ENVMAP
    vec3 reflectDir = reflect(-viewDir, normal);
    vec4 envColor = texture(envMap, reflectDir);
    outgoingLight = mix(outgoingLight, envColor.rgb, reflectivity);
    #endif
    
    fragColor = vec4(outgoingLight, diffuseColor.a);
}
```

## 使用示例

### 基本用法

```typescript
// 基础 Phong 材质
const phongMaterial = new MeshPhongMaterial({
  color: 0x00ff00,
  specular: 0xffffff,
  shininess: 100,
});

// 低光泽（哑光塑料）
const mattePlastic = new MeshPhongMaterial({
  color: 0xff0000,
  specular: 0x222222,
  shininess: 10,
});

// 高光泽（抛光金属）
const polishedMetal = new MeshPhongMaterial({
  color: 0x888888,
  specular: 0xffffff,
  shininess: 200,
});
```

### 法线贴图

```typescript
// 带法线贴图的材质
const normalMappedMaterial = new MeshPhongMaterial({
  color: 0xffffff,
  specular: 0x333333,
  shininess: 50,
  map: new TextureLoader().load('/textures/brick_diffuse.jpg'),
  normalMap: new TextureLoader().load('/textures/brick_normal.jpg'),
  normalScale: new Vector2(1, 1),
});
```

### 高光贴图

```typescript
// 高光贴图控制不同区域光泽度
const specularMappedMaterial = new MeshPhongMaterial({
  color: 0xffffff,
  specular: 0xffffff,
  shininess: 100,
  map: new TextureLoader().load('/textures/metal_diffuse.jpg'),
  specularMap: new TextureLoader().load('/textures/metal_specular.jpg'),
});
```

### 聚光灯效果

```typescript
// 场景设置
const scene = new Scene();

// 聚光灯
const spotLight = new SpotLight(0xffffff, 1);
spotLight.position.set(0, 10, 0);
spotLight.angle = Math.PI / 6;
spotLight.penumbra = 0.2;
spotLight.decay = 2;
spotLight.distance = 50;
scene.add(spotLight);

// Phong 材质能很好展现聚光灯高光
const floor = new Mesh(
  new PlaneGeometry(20, 20),
  new MeshPhongMaterial({
    color: 0x333333,
    specular: 0x111111,
    shininess: 30,
  })
);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);
```

### Shininess 对比

```typescript
// 创建多个球体展示 shininess 效果
const shininesValues = [1, 10, 30, 50, 100, 200];

shininesValues.forEach((shininess, i) => {
  const material = new MeshPhongMaterial({
    color: 0x2194ce,
    specular: 0xffffff,
    shininess,
  });
  
  const sphere = new Mesh(
    new SphereGeometry(0.5, 32, 32),
    material
  );
  sphere.position.x = (i - 2.5) * 1.5;
  scene.add(sphere);
});
```

## Phong vs Blinn-Phong

```
Phong 高光计算：
    R = reflect(-L, N)
    specular = pow(max(dot(R, V), 0), shininess)

Blinn-Phong 高光计算：
    H = normalize(L + V)
    specular = pow(max(dot(N, H), 0), shininess)

   L(光源)    N(法线)    V(视线)
      \        |        /
       \       |       /
        \      |      /
         \     |     /
          \    |    /
           \   |   /
            \  |  /
    ---------\-|-/---------- 表面
               \|/ H(半角向量)
                *
```

## 性能考虑

| 场景 | 建议 |
|------|------|
| 静态物体 | 可使用高 shininess |
| 动态物体 | 中等 shininess |
| 移动端 | 考虑使用 Lambert |
| 大量物体 | 共享材质实例 |
| 复杂法线 | 使用法线贴图 |

## 本章小结

- MeshPhongMaterial 实现 Blinn-Phong 光照模型
- 支持 shininess 和 specular 控制高光
- 逐片段计算，比 Lambert 更精确
- 支持法线贴图增加表面细节
- 适合塑料、金属等有光泽的表面

下一章，我们将学习 MeshStandardMaterial PBR 材质。
