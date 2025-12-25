# MeshBasicMaterial 基础材质

> "基础材质是最简单的材质，不参与光照计算，直接显示颜色或纹理。"

## 材质特点

```
MeshBasicMaterial
├── 不受光照影响
├── 直接显示颜色/纹理
├── 支持环境贴图
├── 渲染效率最高
└── 适用场景
    ├── 全屏效果
    ├── 2D UI 元素
    ├── 调试可视化
    └── 自发光物体
```

## 完整实现

```typescript
// src/materials/MeshBasicMaterial.ts
import { Material, MaterialParameters } from './Material';
import { Color, ColorRepresentation } from '../math/Color';
import { Texture } from '../textures/Texture';
import { Combine, MultiplyOperation } from '../constants';

export interface MeshBasicMaterialParameters extends MaterialParameters {
  color?: ColorRepresentation;
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
  wireframeLinewidth?: number;
  fog?: boolean;
}

export class MeshBasicMaterial extends Material {
  readonly isMeshBasicMaterial = true;
  readonly type = 'MeshBasicMaterial';
  
  // 基础颜色
  color = new Color(0xffffff);
  
  // 纹理贴图
  map: Texture | null = null;
  
  // 光照贴图（烘焙光照）
  lightMap: Texture | null = null;
  lightMapIntensity = 1;
  
  // 环境光遮蔽贴图
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
  
  // 线框模式
  wireframe = false;
  wireframeLinewidth = 1;
  wireframeLinecap: 'butt' | 'round' | 'square' = 'round';
  wireframeLinejoin: 'round' | 'bevel' | 'miter' = 'round';
  
  // 雾效
  fog = true;
  
  constructor(parameters?: MeshBasicMaterialParameters) {
    super();
    this.setValues(parameters);
  }
  
  copy(source: MeshBasicMaterial): this {
    super.copy(source);
    
    this.color.copy(source.color);
    
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
    this.wireframeLinecap = source.wireframeLinecap;
    this.wireframeLinejoin = source.wireframeLinejoin;
    
    this.fog = source.fog;
    
    return this;
  }
  
  toJSON(meta?: any): any {
    const data = super.toJSON(meta);
    
    data.color = this.color.getHex();
    
    if (this.map) data.map = this.map.uuid;
    if (this.lightMap) {
      data.lightMap = this.lightMap.uuid;
      data.lightMapIntensity = this.lightMapIntensity;
    }
    if (this.aoMap) {
      data.aoMap = this.aoMap.uuid;
      data.aoMapIntensity = this.aoMapIntensity;
    }
    if (this.specularMap) data.specularMap = this.specularMap.uuid;
    if (this.alphaMap) data.alphaMap = this.alphaMap.uuid;
    if (this.envMap) {
      data.envMap = this.envMap.uuid;
      data.combine = this.combine;
      data.reflectivity = this.reflectivity;
      data.refractionRatio = this.refractionRatio;
    }
    
    if (this.wireframe) data.wireframe = this.wireframe;
    if (this.wireframeLinewidth !== 1) data.wireframeLinewidth = this.wireframeLinewidth;
    
    if (!this.fog) data.fog = false;
    
    return data;
  }
}
```

## 着色器实现

### 顶点着色器

```glsl
// meshbasic_vert.glsl
#version 300 es

in vec3 position;
in vec3 normal;
in vec2 uv;

#ifdef USE_COLOR
in vec3 color;
#endif

#ifdef USE_INSTANCING
in mat4 instanceMatrix;
#endif

uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform mat3 normalMatrix;

#ifdef USE_MAP
uniform mat3 mapTransform;
out vec2 vMapUv;
#endif

#ifdef USE_LIGHTMAP
out vec2 vLightMapUv;
#endif

#ifdef USE_AOMAP
out vec2 vAoMapUv;
#endif

#ifdef USE_ENVMAP
out vec3 vWorldPosition;
out vec3 vNormal;
#endif

#ifdef USE_COLOR
out vec3 vColor;
#endif

#ifdef USE_FOG
out float vFogDepth;
#endif

void main() {
    // 位置变换
    #ifdef USE_INSTANCING
    mat4 modelMat = modelMatrix * instanceMatrix;
    #else
    mat4 modelMat = modelMatrix;
    #endif
    
    vec4 worldPosition = modelMat * vec4(position, 1.0);
    
    // UV 变换
    #ifdef USE_MAP
    vMapUv = (mapTransform * vec3(uv, 1.0)).xy;
    #endif
    
    #ifdef USE_LIGHTMAP
    vLightMapUv = uv;
    #endif
    
    #ifdef USE_AOMAP
    vAoMapUv = uv;
    #endif
    
    // 环境贴图需要世界坐标和法线
    #ifdef USE_ENVMAP
    vWorldPosition = worldPosition.xyz;
    vNormal = normalize(mat3(modelMat) * normal);
    #endif
    
    // 顶点颜色
    #ifdef USE_COLOR
    vColor = color;
    #endif
    
    // 雾效深度
    #ifdef USE_FOG
    vFogDepth = -modelViewMatrix * vec4(position, 1.0)).z;
    #endif
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
```

### 片段着色器

```glsl
// meshbasic_frag.glsl
#version 300 es
precision highp float;

uniform vec3 diffuse;
uniform float opacity;

#ifdef USE_MAP
uniform sampler2D map;
in vec2 vMapUv;
#endif

#ifdef USE_LIGHTMAP
uniform sampler2D lightMap;
uniform float lightMapIntensity;
in vec2 vLightMapUv;
#endif

#ifdef USE_AOMAP
uniform sampler2D aoMap;
uniform float aoMapIntensity;
in vec2 vAoMapUv;
#endif

#ifdef USE_ALPHAMAP
uniform sampler2D alphaMap;
#endif

#ifdef USE_ENVMAP
uniform samplerCube envMap;
uniform float reflectivity;
uniform float refractionRatio;
uniform int combine;
uniform vec3 cameraPosition;
in vec3 vWorldPosition;
in vec3 vNormal;
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
in float vFogDepth;
#endif

out vec4 fragColor;

void main() {
    vec4 diffuseColor = vec4(diffuse, opacity);
    
    // 纹理颜色
    #ifdef USE_MAP
    vec4 texelColor = texture(map, vMapUv);
    diffuseColor *= texelColor;
    #endif
    
    // 顶点颜色
    #ifdef USE_COLOR
    diffuseColor.rgb *= vColor;
    #endif
    
    // Alpha 贴图
    #ifdef USE_ALPHAMAP
    diffuseColor.a *= texture(alphaMap, vMapUv).g;
    #endif
    
    // Alpha 测试
    #ifdef USE_ALPHATEST
    if (diffuseColor.a < alphaTest) discard;
    #endif
    
    // 环境贴图
    #ifdef USE_ENVMAP
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    vec3 normal = normalize(vNormal);
    
    #ifdef ENVMAP_MODE_REFLECTION
    vec3 reflectDir = reflect(-viewDir, normal);
    #else
    vec3 reflectDir = refract(-viewDir, normal, refractionRatio);
    #endif
    
    vec4 envColor = textureCube(envMap, reflectDir);
    
    if (combine == 0) { // Multiply
        diffuseColor.rgb *= envColor.rgb * reflectivity;
    } else if (combine == 1) { // Mix
        diffuseColor.rgb = mix(diffuseColor.rgb, envColor.rgb, reflectivity);
    } else if (combine == 2) { // Add
        diffuseColor.rgb += envColor.rgb * reflectivity;
    }
    #endif
    
    // 光照贴图
    #ifdef USE_LIGHTMAP
    vec4 lightMapTexel = texture(lightMap, vLightMapUv);
    diffuseColor.rgb *= lightMapTexel.rgb * lightMapIntensity;
    #endif
    
    // AO 贴图
    #ifdef USE_AOMAP
    float ambientOcclusion = (texture(aoMap, vAoMapUv).r - 1.0) * aoMapIntensity + 1.0;
    diffuseColor.rgb *= ambientOcclusion;
    #endif
    
    fragColor = diffuseColor;
    
    // 雾效
    #ifdef USE_FOG
    #ifdef FOG_EXP2
    float fogFactor = 1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
    #else
    float fogFactor = smoothstep(fogNear, fogFar, vFogDepth);
    #endif
    fragColor.rgb = mix(fragColor.rgb, fogColor, fogFactor);
    #endif
    
    // 颜色空间转换
    #ifdef SRGB_OUTPUT
    fragColor.rgb = linearToSRGB(fragColor.rgb);
    #endif
}
```

## 使用示例

### 基本用法

```typescript
// 纯色材质
const colorMaterial = new MeshBasicMaterial({
  color: 0xff0000, // 红色
});

// 带纹理的材质
const textureMaterial = new MeshBasicMaterial({
  map: new TextureLoader().load('/textures/wood.jpg'),
});

// 透明材质
const transparentMaterial = new MeshBasicMaterial({
  color: 0xffffff,
  transparent: true,
  opacity: 0.5,
});
```

### 线框模式

```typescript
// 线框可视化
const wireframeMaterial = new MeshBasicMaterial({
  color: 0x00ff00,
  wireframe: true,
  wireframeLinewidth: 2,
});

// 线框 + 实体双层渲染
const mesh = new Mesh(geometry, solidMaterial);
const wireframe = new Mesh(geometry, wireframeMaterial);
mesh.add(wireframe);
```

### 环境贴图

```typescript
// 加载立方体贴图
const envMap = new CubeTextureLoader()
  .setPath('/textures/env/')
  .load(['px.jpg', 'nx.jpg', 'py.jpg', 'ny.jpg', 'pz.jpg', 'nz.jpg']);

// 反射材质
const reflectiveMaterial = new MeshBasicMaterial({
  envMap: envMap,
  reflectivity: 1.0,
});

// 折射材质
const refractiveMaterial = new MeshBasicMaterial({
  envMap: envMap,
  refractionRatio: 0.98,
});
```

### 光照贴图

```typescript
// 使用烘焙的光照贴图
const bakedMaterial = new MeshBasicMaterial({
  map: diffuseTexture,
  lightMap: bakedLightTexture,
  lightMapIntensity: 1.0,
});
```

### 顶点颜色

```typescript
// 创建带顶点颜色的几何体
const geometry = new BufferGeometry();
geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));

// 使用顶点颜色
const vertexColorMaterial = new MeshBasicMaterial({
  vertexColors: true,
});
```

### 动态更新

```typescript
// 创建材质
const material = new MeshBasicMaterial({ color: 0xff0000 });

// 动态改变颜色
material.color.setHex(0x00ff00);
material.needsUpdate = true;

// 动态改变纹理
material.map = newTexture;
material.needsUpdate = true;

// 切换透明度
material.opacity = 0.5;
material.transparent = true;
```

## 性能优化

```typescript
// 材质复用
const sharedMaterial = new MeshBasicMaterial({ color: 0xffffff });

for (let i = 0; i < 1000; i++) {
  const mesh = new Mesh(geometry, sharedMaterial);
  scene.add(mesh);
}

// 实例化渲染
const instancedMesh = new InstancedMesh(geometry, sharedMaterial, 1000);
```

## 本章小结

- MeshBasicMaterial 不参与光照计算
- 支持颜色、纹理、环境贴图
- 可使用光照贴图实现烘焙效果
- 线框模式用于调试
- 性能最优，适合大批量渲染

下一章，我们将学习 MeshLambertMaterial 光照材质。
