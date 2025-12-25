# RectAreaLight 矩形区域光

> "矩形区域光模拟窗户、屏幕等面光源，提供柔和真实的照明效果。"

## 矩形区域光特点

```
RectAreaLight
├── 面光源
│   └── 矩形发光区域
├── 尺寸参数
│   ├── width（宽度）
│   └── height（高度）
├── 单面照明
│   └── 只向一侧发光
├── 限制
│   ├── 仅支持 Standard/Physical 材质
│   └── 不支持阴影
└── 用途
    ├── 窗户光
    ├── 显示器/电视
    ├── 荧光灯管
    └── 柔光箱
```

## 完整实现

```typescript
// src/lights/RectAreaLight.ts
import { Light } from './Light';
import { ColorRepresentation } from '../math/Color';

export class RectAreaLight extends Light {
  readonly isRectAreaLight = true;
  readonly type = 'RectAreaLight';
  
  // 尺寸
  width: number;
  height: number;
  
  constructor(
    color?: ColorRepresentation,
    intensity: number = 1,
    width: number = 10,
    height: number = 10
  ) {
    super(color, intensity);
    
    this.width = width;
    this.height = height;
  }
  
  // 获取功率
  get power(): number {
    // 矩形光功率 = intensity × width × height × π
    return this.intensity * this.width * this.height * Math.PI;
  }
  
  set power(power: number) {
    this.intensity = power / (this.width * this.height * Math.PI);
  }
  
  copy(source: RectAreaLight, recursive?: boolean): this {
    super.copy(source, recursive);
    
    this.width = source.width;
    this.height = source.height;
    
    return this;
  }
}
```

## LTC（Linearly Transformed Cosines）实现

```typescript
// src/lights/RectAreaLightUniformsLib.ts
// 矩形区域光需要预计算的 LUT 纹理

export const RectAreaLightUniformsLib = {
  // 初始化 uniform
  init(): void {
    // LTC 矩阵纹理（64x64）
    UniformsLib.LTC_FLOAT_1 = createLTC1Texture();
    UniformsLib.LTC_FLOAT_2 = createLTC2Texture();
  }
};

// 创建 LTC 纹理
function createLTC1Texture(): DataTexture {
  // LTC 矩阵数据（预计算）
  const data = new Float32Array(64 * 64 * 4);
  
  // 填充 LTC 矩阵数据
  // 这些数据用于将 GGX BRDF 转换为余弦分布
  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 64; x++) {
      const roughness = x / 63;
      const cosTheta = y / 63;
      
      // 计算 LTC 矩阵参数
      const ltcParams = computeLTCMatrix(roughness, cosTheta);
      
      const index = (y * 64 + x) * 4;
      data[index] = ltcParams.m11;
      data[index + 1] = ltcParams.m22;
      data[index + 2] = ltcParams.m13;
      data[index + 3] = ltcParams.m31;
    }
  }
  
  const texture = new DataTexture(
    data,
    64, 64,
    RGBAFormat,
    FloatType
  );
  texture.needsUpdate = true;
  
  return texture;
}
```

## 着色器实现

```glsl
// rect_area_light.glsl

// 矩形区域光结构
struct RectAreaLight {
    vec3 color;
    vec3 position;
    vec3 halfWidth;   // 宽度的一半向量
    vec3 halfHeight;  // 高度的一半向量
};

#if NUM_RECT_AREA_LIGHTS > 0
uniform RectAreaLight rectAreaLights[NUM_RECT_AREA_LIGHTS];
#endif

// LTC 纹理
uniform sampler2D ltc_1;  // LTC 矩阵
uniform sampler2D ltc_2;  // GGX 菲涅尔

// LTC 区域光积分
vec3 LTC_Evaluate(
    vec3 N, vec3 V,
    vec3 P,
    mat3 Minv,
    vec3 points[4]
) {
    // 变换顶点到分布坐标
    vec3 T1 = normalize(V - N * dot(V, N));
    vec3 T2 = cross(N, T1);
    
    mat3 Tb = mat3(T1, T2, N);
    
    // 变换矩形顶点
    vec3 L[4];
    for (int i = 0; i < 4; i++) {
        L[i] = Minv * (Tb * (points[i] - P));
    }
    
    // 投影到球面
    for (int i = 0; i < 4; i++) {
        L[i] = normalize(L[i]);
    }
    
    // 边向量的球面积分
    vec3 vsum = vec3(0.0);
    for (int i = 0; i < 4; i++) {
        int j = (i + 1) % 4;
        vsum += integrateEdge(L[i], L[j]);
    }
    
    // 归一化
    float len = length(vsum);
    float z = vsum.z / len;
    
    if (z > 0.0) {
        return vec3(len);
    }
    
    return vec3(0.0);
}

// 边积分
vec3 integrateEdge(vec3 v1, vec3 v2) {
    float cosTheta = dot(v1, v2);
    float theta = acos(cosTheta);
    vec3 res = cross(v1, v2) * (theta / sin(theta));
    return res;
}

// 计算矩形区域光贡献
void RE_Direct_RectArea(
    const in RectAreaLight rectAreaLight,
    const in vec3 geometryPosition,
    const in vec3 geometryNormal,
    const in vec3 geometryViewDir,
    const in PhysicalMaterial material,
    inout ReflectedLight reflectedLight
) {
    vec3 P = geometryPosition;
    vec3 N = geometryNormal;
    vec3 V = geometryViewDir;
    
    // 获取矩形四个顶点
    vec3 points[4];
    points[0] = rectAreaLight.position + rectAreaLight.halfWidth - rectAreaLight.halfHeight;
    points[1] = rectAreaLight.position - rectAreaLight.halfWidth - rectAreaLight.halfHeight;
    points[2] = rectAreaLight.position - rectAreaLight.halfWidth + rectAreaLight.halfHeight;
    points[3] = rectAreaLight.position + rectAreaLight.halfWidth + rectAreaLight.halfHeight;
    
    // 查询 LTC 纹理
    float dotNV = saturate(dot(N, V));
    vec2 uv = vec2(material.roughness, sqrt(1.0 - dotNV));
    uv = uv * (64.0 - 1.0) / 64.0 + 0.5 / 64.0;
    
    vec4 t1 = texture2D(ltc_1, uv);
    vec4 t2 = texture2D(ltc_2, uv);
    
    // LTC 矩阵
    mat3 Minv = mat3(
        vec3(t1.x, 0, t1.y),
        vec3(0, 1, 0),
        vec3(t1.z, 0, t1.w)
    );
    
    // 漫反射
    vec3 diffuse = LTC_Evaluate(N, V, P, mat3(1.0), points);
    
    // 镜面反射
    vec3 specular = LTC_Evaluate(N, V, P, Minv, points);
    
    // 菲涅尔
    vec3 fresnel = material.specularColor * t2.x + (1.0 - material.specularColor) * t2.y;
    
    reflectedLight.directDiffuse += rectAreaLight.color * diffuse * material.diffuseColor;
    reflectedLight.directSpecular += rectAreaLight.color * specular * fresnel;
}
```

## 使用示例

### 基本用法

```typescript
// 初始化 LUT 纹理
RectAreaLightUniformsLib.init();

// 创建矩形区域光
const rectLight = new RectAreaLight(
  0xffffff,  // 颜色
  5,         // 强度
  4,         // 宽度
  10         // 高度
);
rectLight.position.set(5, 5, 0);
rectLight.lookAt(0, 0, 0);
scene.add(rectLight);
```

### 窗户光效果

```typescript
// 模拟窗户光照
function createWindowLight(scene: Scene): RectAreaLight {
  RectAreaLightUniformsLib.init();
  
  // 窗户尺寸
  const windowWidth = 3;
  const windowHeight = 4;
  
  // 创建光源
  const light = new RectAreaLight(
    0xffeedd,  // 暖白色
    10,
    windowWidth,
    windowHeight
  );
  
  // 位置在墙上
  light.position.set(5, 3, 0);
  light.rotation.y = -Math.PI / 2;  // 面向室内
  
  scene.add(light);
  
  // 创建可视化几何体（窗户）
  const windowGeometry = new PlaneGeometry(windowWidth, windowHeight);
  const windowMaterial = new MeshBasicMaterial({
    color: 0xffeedd,
    side: DoubleSide,
  });
  const windowMesh = new Mesh(windowGeometry, windowMaterial);
  windowMesh.position.copy(light.position);
  windowMesh.rotation.copy(light.rotation);
  scene.add(windowMesh);
  
  return light;
}
```

### 显示器光效果

```typescript
// 模拟显示器/电视屏幕发光
function createScreenLight(scene: Scene): RectAreaLight {
  RectAreaLightUniformsLib.init();
  
  // 16:9 屏幕
  const screenWidth = 1.6;
  const screenHeight = 0.9;
  
  const light = new RectAreaLight(
    0x88aaff,  // 蓝白色
    3,
    screenWidth,
    screenHeight
  );
  
  light.position.set(0, 1.2, -2);
  light.lookAt(0, 1.2, 0);
  
  scene.add(light);
  
  // 屏幕几何体
  const screenGeometry = new PlaneGeometry(screenWidth, screenHeight);
  const screenMaterial = new MeshBasicMaterial({
    color: 0x88aaff,
  });
  const screenMesh = new Mesh(screenGeometry, screenMaterial);
  screenMesh.position.copy(light.position);
  screenMesh.position.z += 0.01;
  screenMesh.lookAt(0, 1.2, 0);
  scene.add(screenMesh);
  
  return light;
}
```

### 柔光箱（摄影棚）

```typescript
class SoftboxSetup {
  private lights: RectAreaLight[] = [];
  private scene: Scene;
  
  constructor(scene: Scene) {
    this.scene = scene;
    RectAreaLightUniformsLib.init();
  }
  
  // 三点照明
  setupThreePointLighting(): void {
    // 主光（Key Light）
    const keyLight = this.createSoftbox({
      color: 0xffffff,
      intensity: 10,
      width: 2,
      height: 2,
      position: new Vector3(3, 3, 2),
      lookAt: new Vector3(0, 1, 0),
    });
    
    // 补光（Fill Light）
    const fillLight = this.createSoftbox({
      color: 0xccccff,
      intensity: 5,
      width: 1.5,
      height: 1.5,
      position: new Vector3(-2, 2, 2),
      lookAt: new Vector3(0, 1, 0),
    });
    
    // 背光（Back/Rim Light）
    const backLight = this.createSoftbox({
      color: 0xffffcc,
      intensity: 8,
      width: 1,
      height: 2,
      position: new Vector3(0, 3, -2),
      lookAt: new Vector3(0, 1, 0),
    });
    
    this.lights.push(keyLight, fillLight, backLight);
  }
  
  private createSoftbox(config: {
    color: number;
    intensity: number;
    width: number;
    height: number;
    position: Vector3;
    lookAt: Vector3;
  }): RectAreaLight {
    const light = new RectAreaLight(
      config.color,
      config.intensity,
      config.width,
      config.height
    );
    
    light.position.copy(config.position);
    light.lookAt(config.lookAt);
    
    this.scene.add(light);
    
    // 辅助器
    const helper = new RectAreaLightHelper(light);
    this.scene.add(helper);
    
    return light;
  }
}
```

### 动态颜色变化

```typescript
// 屏幕内容变化
function animateScreenColor(light: RectAreaLight, time: number): void {
  // 模拟视频播放时的颜色变化
  const hue = (Math.sin(time * 0.001) + 1) * 0.5;
  light.color.setHSL(hue, 0.5, 0.6);
  
  // 闪烁效果
  light.intensity = 3 + Math.sin(time * 0.01) * 0.5;
}
```

## 辅助工具

```typescript
// 矩形区域光辅助器
import { RectAreaLightHelper } from 'three/examples/jsm/helpers/RectAreaLightHelper.js';

const helper = new RectAreaLightHelper(rectLight);
scene.add(helper);

// 需要在光源位置/方向改变时更新
// helper 会自动更新
```

## 矩形区域光原理

```
矩形区域光照明：

         ┌─────────────────┐
         │                 │
         │   发光区域      │
         │   (RectArea)    │
         │                 │
         └────────●────────┘
                  │
        ──────────┼──────────
        ╲         │         ╱
         ╲        ↓        ╱
          ╲   照射范围   ╱
           ╲           ╱
            ╲         ╱
             ╲       ╱
              ╲     ╱
               ╲   ╱
                ╲ ╱
                 ▼
               接收表面

LTC 原理：
- 将复杂的 BRDF 积分转换为简单的余弦分布积分
- 使用预计算的变换矩阵
- 实现高效的面光源照明
```

## 限制说明

| 特性 | 支持情况 |
|------|----------|
| MeshStandardMaterial | ✓ |
| MeshPhysicalMaterial | ✓ |
| MeshBasicMaterial | ✗ |
| MeshLambertMaterial | ✗ |
| MeshPhongMaterial | ✗ |
| 阴影 | ✗ |
| 实时 GI | ✗ |

## 本章小结

- RectAreaLight 模拟矩形面光源
- 使用 LTC 技术高效计算
- 需要初始化 LUT 纹理
- 仅支持 Standard/Physical 材质
- 适合窗户、屏幕、柔光箱等效果

下一章，我们将学习相机系统。
