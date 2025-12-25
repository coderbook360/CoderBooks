# 阴影技术

> "阴影是增加场景深度和真实感最重要的视觉元素之一。"

## 阴影技术概览

```
阴影技术
├── Shadow Mapping（阴影贴图）
│   ├── 基础阴影贴图
│   ├── PCF（百分比近邻过滤）
│   └── VSM（方差阴影贴图）
├── Cascade Shadow Maps（级联阴影）
├── Point Light Shadows（点光源阴影）
│   └── Cube Map 阴影
├── 软阴影
│   ├── PCSS
│   └── Contact Shadows
└── 屏幕空间阴影
    └── SSAO
```

## Shadow Mapping 原理

### 基本流程

```
第一步：从光源视角渲染深度图

    光源
      │
      │  渲染深度
      ▼
    ┌─────────────┐
    │ ▓▓▓░░░▓▓▓░░ │
    │ ▓▓░░░░░▓▓░░ │ ← 深度缓冲（Shadow Map）
    │ ░░░░░░░░░░░ │
    └─────────────┘

第二步：从相机视角渲染，比较深度

    相机视角：
    对每个片段：
    1. 变换到光源空间
    2. 采样 Shadow Map
    3. 比较深度
    
    if (fragmentDepth > shadowMapDepth)
        片段在阴影中
```

### 深度图生成

```typescript
// src/renderers/WebGLShadowMap.ts
export class WebGLShadowMap {
  private _renderer: WebGLRenderer;
  private _shadowMapType: ShadowMapType;
  
  // 阴影材质
  private _depthMaterial: MeshDepthMaterial;
  private _distanceMaterial: MeshDistanceMaterial;
  
  constructor(renderer: WebGLRenderer, shadowMapType: ShadowMapType) {
    this._renderer = renderer;
    this._shadowMapType = shadowMapType;
    
    this._depthMaterial = new MeshDepthMaterial({
      depthPacking: RGBADepthPacking,
    });
    
    this._distanceMaterial = new MeshDistanceMaterial();
  }
  
  render(lights: Light[], scene: Object3D, camera: Camera): void {
    const currentRenderTarget = this._renderer.getRenderTarget();
    
    for (const light of lights) {
      if (!light.castShadow) continue;
      
      const shadow = light.shadow;
      
      // 更新阴影相机
      this.updateShadowCamera(light, shadow);
      
      // 渲染到阴影贴图
      this._renderer.setRenderTarget(shadow.map);
      this._renderer.clear();
      
      // 使用深度材质渲染场景
      scene.overrideMaterial = this._depthMaterial;
      this._renderer.render(scene, shadow.camera);
      scene.overrideMaterial = null;
    }
    
    this._renderer.setRenderTarget(currentRenderTarget);
  }
  
  private updateShadowCamera(light: Light, shadow: LightShadow): void {
    if (light.isDirectionalLight) {
      // 方向光使用正交相机
      const camera = shadow.camera as OrthographicCamera;
      // 设置视锥体包围场景
    } else if (light.isPointLight) {
      // 点光源使用六面立方体贴图
    } else if (light.isSpotLight) {
      // 聚光灯使用透视相机
      const camera = shadow.camera as PerspectiveCamera;
      camera.fov = light.angle * 2 * MathUtils.RAD2DEG;
    }
  }
}
```

### 阴影采样着色器

```glsl
// shadow_pars_fragment.glsl

uniform sampler2D shadowMap;
uniform mat4 shadowMatrix;
uniform float shadowBias;
uniform float shadowRadius;

// 深度比较
float texture2DCompare(sampler2D depths, vec2 uv, float compare) {
    return step(compare, unpackRGBAToDepth(texture2D(depths, uv)));
}

// 基础阴影采样
float getShadow(
    sampler2D shadowMap,
    vec2 shadowMapSize,
    float shadowBias,
    vec4 shadowCoord
) {
    // 透视除法
    shadowCoord.xyz /= shadowCoord.w;
    
    // 变换到 [0, 1] 范围
    shadowCoord.xyz = shadowCoord.xyz * 0.5 + 0.5;
    
    // 范围检查
    if (shadowCoord.x < 0.0 || shadowCoord.x > 1.0 ||
        shadowCoord.y < 0.0 || shadowCoord.y > 1.0 ||
        shadowCoord.z > 1.0) {
        return 1.0;
    }
    
    float depth = shadowCoord.z - shadowBias;
    
    return texture2DCompare(shadowMap, shadowCoord.xy, depth);
}
```

## PCF (Percentage Closer Filtering)

```glsl
// PCF 软阴影
float getShadowPCF(
    sampler2D shadowMap,
    vec2 shadowMapSize,
    float shadowBias,
    float shadowRadius,
    vec4 shadowCoord
) {
    shadowCoord.xyz /= shadowCoord.w;
    shadowCoord.xyz = shadowCoord.xyz * 0.5 + 0.5;
    
    if (shadowCoord.z > 1.0) return 1.0;
    
    float depth = shadowCoord.z - shadowBias;
    vec2 texelSize = 1.0 / shadowMapSize;
    
    float shadow = 0.0;
    
    // 3x3 采样
    for (int x = -1; x <= 1; x++) {
        for (int y = -1; y <= 1; y++) {
            vec2 offset = vec2(float(x), float(y)) * texelSize * shadowRadius;
            shadow += texture2DCompare(shadowMap, shadowCoord.xy + offset, depth);
        }
    }
    
    return shadow / 9.0;
}

// 优化的 PCF（泊松圆盘采样）
const vec2 poissonDisk[16] = vec2[](
    vec2(-0.94201624, -0.39906216),
    vec2(0.94558609, -0.76890725),
    vec2(-0.094184101, -0.92938870),
    vec2(0.34495938, 0.29387760),
    vec2(-0.91588581, 0.45771432),
    vec2(-0.81544232, -0.87912464),
    vec2(-0.38277543, 0.27676845),
    vec2(0.97484398, 0.75648379),
    vec2(0.44323325, -0.97511554),
    vec2(0.53742981, -0.47373420),
    vec2(-0.26496911, -0.41893023),
    vec2(0.79197514, 0.19090188),
    vec2(-0.24188840, 0.99706507),
    vec2(-0.81409955, 0.91437590),
    vec2(0.19984126, 0.78641367),
    vec2(0.14383161, -0.14100790)
);

float getShadowPoissonPCF(
    sampler2D shadowMap,
    vec2 shadowMapSize,
    float shadowBias,
    float shadowRadius,
    vec4 shadowCoord
) {
    shadowCoord.xyz /= shadowCoord.w;
    shadowCoord.xyz = shadowCoord.xyz * 0.5 + 0.5;
    
    float depth = shadowCoord.z - shadowBias;
    vec2 texelSize = 1.0 / shadowMapSize;
    
    float shadow = 0.0;
    
    for (int i = 0; i < 16; i++) {
        vec2 offset = poissonDisk[i] * texelSize * shadowRadius;
        shadow += texture2DCompare(shadowMap, shadowCoord.xy + offset, depth);
    }
    
    return shadow / 16.0;
}
```

## VSM (Variance Shadow Maps)

```glsl
// VSM：存储深度和深度²
// 第一步：渲染深度图

// vsm_depth_frag.glsl
void main() {
    float depth = gl_FragCoord.z;
    float dx = dFdx(depth);
    float dy = dFdy(depth);
    
    // 存储 (深度, 深度²)
    // 额外项用于减少 light bleeding
    float moment2 = depth * depth + 0.25 * (dx * dx + dy * dy);
    
    gl_FragColor = vec4(depth, moment2, 0.0, 1.0);
}

// 第二步：采样阴影

float linstep(float low, float high, float v) {
    return clamp((v - low) / (high - low), 0.0, 1.0);
}

float getShadowVSM(
    sampler2D shadowMap,
    vec4 shadowCoord
) {
    shadowCoord.xyz /= shadowCoord.w;
    shadowCoord.xyz = shadowCoord.xyz * 0.5 + 0.5;
    
    vec2 moments = texture2D(shadowMap, shadowCoord.xy).xy;
    
    float depth = shadowCoord.z;
    
    // 表面在光照中
    if (depth <= moments.x) {
        return 1.0;
    }
    
    // 计算方差
    float variance = moments.y - moments.x * moments.x;
    variance = max(variance, 0.00002);
    
    // 切比雪夫不等式
    float d = depth - moments.x;
    float pMax = variance / (variance + d * d);
    
    // 减少 light bleeding
    pMax = linstep(0.2, 1.0, pMax);
    
    return pMax;
}
```

## 级联阴影贴图 (CSM)

```typescript
// 大场景的方向光阴影
class CascadedShadowMap {
  private cascades: number = 4;
  private shadowMaps: WebGLRenderTarget[] = [];
  private cascadeSplits: number[] = [];
  
  // 计算级联分割点
  private calculateSplits(near: number, far: number, lambda: number): void {
    const cascades = this.cascades;
    this.cascadeSplits = [];
    
    for (let i = 0; i < cascades; i++) {
      const p = (i + 1) / cascades;
      
      // 对数分布
      const logSplit = near * Math.pow(far / near, p);
      
      // 均匀分布
      const uniformSplit = near + (far - near) * p;
      
      // 混合
      const split = lambda * logSplit + (1 - lambda) * uniformSplit;
      this.cascadeSplits.push(split);
    }
  }
  
  // 计算每个级联的光源相机
  private calculateCascadeCamera(
    cascade: number,
    camera: PerspectiveCamera,
    lightDirection: Vector3
  ): OrthographicCamera {
    const near = cascade === 0 ? camera.near : this.cascadeSplits[cascade - 1];
    const far = this.cascadeSplits[cascade];
    
    // 获取视锥体的 8 个角点
    const frustumCorners = this.getFrustumCorners(camera, near, far);
    
    // 计算包围盒
    const bounds = this.calculateBounds(frustumCorners, lightDirection);
    
    // 创建正交相机
    const shadowCamera = new OrthographicCamera(
      bounds.minX, bounds.maxX,
      bounds.maxY, bounds.minY,
      bounds.minZ, bounds.maxZ
    );
    
    return shadowCamera;
  }
}
```

### CSM 着色器

```glsl
// csm_pars_fragment.glsl
#define CSM_CASCADES 4

uniform sampler2D cascadeShadowMaps[CSM_CASCADES];
uniform mat4 cascadeMatrices[CSM_CASCADES];
uniform float cascadeSplits[CSM_CASCADES];

float getCSMShadow(vec3 worldPosition, float viewZ) {
    // 确定使用哪个级联
    int cascadeIndex = CSM_CASCADES - 1;
    for (int i = 0; i < CSM_CASCADES; i++) {
        if (-viewZ < cascadeSplits[i]) {
            cascadeIndex = i;
            break;
        }
    }
    
    // 变换到对应级联的光源空间
    vec4 shadowCoord = cascadeMatrices[cascadeIndex] * vec4(worldPosition, 1.0);
    
    // 采样对应的阴影贴图
    float shadow = 1.0;
    if (cascadeIndex == 0) {
        shadow = getShadow(cascadeShadowMaps[0], shadowCoord);
    } else if (cascadeIndex == 1) {
        shadow = getShadow(cascadeShadowMaps[1], shadowCoord);
    } else if (cascadeIndex == 2) {
        shadow = getShadow(cascadeShadowMaps[2], shadowCoord);
    } else {
        shadow = getShadow(cascadeShadowMaps[3], shadowCoord);
    }
    
    return shadow;
}
```

## 点光源阴影

```typescript
// 使用立方体贴图
class PointLightShadow extends LightShadow {
  _cubeDirections = [
    new Vector3(1, 0, 0),   // +X
    new Vector3(-1, 0, 0),  // -X
    new Vector3(0, 1, 0),   // +Y
    new Vector3(0, -1, 0),  // -Y
    new Vector3(0, 0, 1),   // +Z
    new Vector3(0, 0, -1),  // -Z
  ];
  
  _cubeUps = [
    new Vector3(0, -1, 0),
    new Vector3(0, -1, 0),
    new Vector3(0, 0, 1),
    new Vector3(0, 0, -1),
    new Vector3(0, -1, 0),
    new Vector3(0, -1, 0),
  ];
  
  render(renderer: WebGLRenderer, scene: Object3D): void {
    const cubeMap = this.map as WebGLCubeRenderTarget;
    
    for (let face = 0; face < 6; face++) {
      // 设置相机朝向
      this.camera.lookAt(
        this._cubeDirections[face]
      );
      this.camera.up.copy(this._cubeUps[face]);
      this.camera.updateMatrixWorld();
      
      // 渲染到立方体贴图的一个面
      renderer.setRenderTarget(cubeMap, face);
      renderer.clear();
      renderer.render(scene, this.camera);
    }
  }
}
```

### 点光源阴影采样

```glsl
// point_shadow_frag.glsl
uniform samplerCube shadowCubeMap;
uniform float shadowCameraNear;
uniform float shadowCameraFar;

float getPointShadow(
    samplerCube shadowMap,
    vec3 lightToFrag,
    float shadowBias,
    float shadowCameraNear,
    float shadowCameraFar
) {
    // 计算实际距离
    float dist = length(lightToFrag);
    
    // 归一化到 [0, 1]
    float normalizedDist = (dist - shadowCameraNear) / (shadowCameraFar - shadowCameraNear);
    normalizedDist += shadowBias;
    
    // 采样立方体贴图
    float closestDist = unpackRGBAToDepth(texture(shadowMap, lightToFrag));
    
    return step(normalizedDist, closestDist);
}
```

## PCSS (Percentage Closer Soft Shadows)

```glsl
// 基于遮挡物距离的软阴影
float getPCSSShadow(
    sampler2D shadowMap,
    vec2 shadowMapSize,
    vec4 shadowCoord,
    float lightSize
) {
    shadowCoord.xyz /= shadowCoord.w;
    shadowCoord.xyz = shadowCoord.xyz * 0.5 + 0.5;
    
    float receiverDepth = shadowCoord.z;
    vec2 texelSize = 1.0 / shadowMapSize;
    
    // 第一步：搜索遮挡物
    float avgBlockerDepth = 0.0;
    float numBlockers = 0.0;
    float searchRadius = lightSize / receiverDepth;
    
    for (int i = 0; i < 16; i++) {
        vec2 offset = poissonDisk[i] * searchRadius * texelSize;
        float shadowMapDepth = unpackRGBAToDepth(
            texture2D(shadowMap, shadowCoord.xy + offset)
        );
        
        if (shadowMapDepth < receiverDepth) {
            avgBlockerDepth += shadowMapDepth;
            numBlockers += 1.0;
        }
    }
    
    if (numBlockers < 1.0) {
        return 1.0;
    }
    
    avgBlockerDepth /= numBlockers;
    
    // 第二步：计算半影大小
    float penumbraRatio = (receiverDepth - avgBlockerDepth) / avgBlockerDepth;
    float filterRadius = penumbraRatio * lightSize;
    
    // 第三步：PCF with 变化的 radius
    float shadow = 0.0;
    for (int i = 0; i < 16; i++) {
        vec2 offset = poissonDisk[i] * filterRadius * texelSize;
        shadow += texture2DCompare(shadowMap, shadowCoord.xy + offset, receiverDepth);
    }
    
    return shadow / 16.0;
}
```

## 阴影偏移和常见问题

### Shadow Acne

```
问题：自阴影（表面对自己产生阴影）

    光线
      ↘
       ↘
    ────●────●────●────  表面
        ↑
       比较点略微偏下
       导致错误的阴影

解决方案：添加 bias（深度偏移）
```

```glsl
// 普通 bias
float bias = 0.005;
float depth = shadowCoord.z - bias;

// 斜率相关 bias
float cosTheta = max(dot(normal, lightDir), 0.0);
float bias = 0.005 * tan(acos(cosTheta));
bias = clamp(bias, 0.0, 0.01);
```

### Peter Panning

```
问题：过大的 bias 导致阴影与物体分离

    物体
    ┌───┐
    │   │
    └───┘
      ↑
     ╱ ╲ ← 阴影分离
    ─────

解决方案：
1. 使用更小的 bias
2. 使用法线偏移
3. 双面渲染深度图
```

```glsl
// 法线偏移
vec3 normalOffset = normal * normalBias;
vec4 shadowCoord = shadowMatrix * vec4(worldPosition + normalOffset, 1.0);
```

## 本章小结

- Shadow Mapping 是实时阴影的基础
- PCF 提供软阴影效果
- VSM 支持可过滤的阴影
- CSM 用于大场景方向光阴影
- 点光源使用立方体阴影贴图
- PCSS 提供物理正确的软阴影
- Bias 用于解决阴影失真问题

下一章，我们将学习光源实现。
