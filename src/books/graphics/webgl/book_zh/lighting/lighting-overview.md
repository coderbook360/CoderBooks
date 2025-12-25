# 光照概述

> "光照赋予 3D 世界生命，让平面变成立体。"

## 光照基础

### 真实光照

```
┌─────────────────────────────────────────────────────────┐
│                    真实光照原理                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   光源 ──→ 表面 ──→ 眼睛                               │
│                                                         │
│   光线与表面相互作用:                                   │
│   • 反射 (Reflection): 光线弹回                         │
│   • 折射 (Refraction): 光线穿透                         │
│   • 吸收 (Absorption): 光线被吸收                       │
│   • 散射 (Scattering): 光线分散                         │
│                                                         │
│   我们看到的颜色 = 表面反射到眼睛的光                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 局部光照模型

```
┌─────────────────────────────────────────────────────────┐
│                    局部光照组成                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│         最终颜色 = 环境光 + 漫反射 + 高光               │
│                                                         │
│   ┌────────┐  ┌────────┐  ┌────────┐                   │
│   │ 环境光 │ +│ 漫反射 │ +│ 高光   │                   │
│   │Ambient │  │Diffuse │  │Specular│                   │
│   │  ░░░   │  │  ▓▓▓   │  │   ●    │                   │
│   │ 均匀   │  │ 渐变   │  │ 亮点   │                   │
│   └────────┘  └────────┘  └────────┘                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 光源类型

### 方向光（Directional Light）

```
┌─────────────────────────────────────────────────────────┐
│                    方向光                                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   太阳光模拟: 平行光线，无衰减                          │
│                                                         │
│   ↓   ↓   ↓   ↓   ↓   ↓   ↓   ↓   ↓                   │
│   ↓   ↓   ↓   ↓   ↓   ↓   ↓   ↓   ↓                   │
│   ↓   ↓   ↓   ↓   ↓   ↓   ↓   ↓   ↓                   │
│   ──────────────────────────────────                   │
│        表面                                             │
│                                                         │
│   只需存储方向向量                                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

```glsl
struct DirectionalLight {
  vec3 direction;  // 光照方向（指向光源）
  vec3 color;      // 光源颜色
  float intensity; // 强度
};
```

### 点光源（Point Light）

```
┌─────────────────────────────────────────────────────────┐
│                    点光源                                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   灯泡模拟: 从一点向四周发射                            │
│                                                         │
│              ↗   ↑   ↖                                 │
│            ↗    ★    ↖                                 │
│           →   光源   ←                                  │
│            ↘    ↓   ↙                                  │
│              ↘     ↙                                   │
│                                                         │
│   需要位置、有距离衰减                                  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

```glsl
struct PointLight {
  vec3 position;   // 光源位置
  vec3 color;      // 光源颜色
  float intensity; // 强度
  float constant;  // 常量衰减
  float linear;    // 线性衰减
  float quadratic; // 二次衰减
};
```

### 聚光灯（Spot Light）

```
┌─────────────────────────────────────────────────────────┐
│                    聚光灯                                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   手电筒模拟: 锥形光束                                  │
│                                                         │
│           ★ ← 光源位置                                 │
│          /│\                                            │
│         / │ \ ← 内锥角                                 │
│        /  │  \                                          │
│       /   │   \ ← 外锥角                               │
│      /    ↓    \                                        │
│     ─────────────                                       │
│                                                         │
│   需要位置、方向、两个角度                              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

```glsl
struct SpotLight {
  vec3 position;    // 光源位置
  vec3 direction;   // 照射方向
  vec3 color;       // 光源颜色
  float intensity;  // 强度
  float innerCutoff; // 内锥角余弦
  float outerCutoff; // 外锥角余弦
  float constant;
  float linear;
  float quadratic;
};
```

### 区域光（Area Light）

```glsl
// 区域光更复杂，通常需要特殊技术
struct AreaLight {
  vec3 position;   // 中心位置
  vec3 normal;     // 面法向
  vec2 size;       // 尺寸
  vec3 color;      // 颜色
  float intensity; // 强度
};
```

## 表面法向量

### 什么是法向量

```
┌─────────────────────────────────────────────────────────┐
│                    表面法向量                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│              ↑ N (法向量)                              │
│              │                                          │
│   ──────────────────────                               │
│        表面                                             │
│                                                         │
│   法向量垂直于表面，用于计算光照角度                    │
│                                                         │
│   平面法向量:                                           │
│        N = normalize(cross(edge1, edge2))               │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 顶点法向量

```javascript
// 顶点数据包含法向量
const vertices = [
  // 位置           // 法向量
  -1, 0, 0,         0, 1, 0,
   1, 0, 0,         0, 1, 0,
   0, 0, 1,         0, 1, 0
];

// 设置属性
gl.vertexAttribPointer(a_position, 3, gl.FLOAT, false, 24, 0);
gl.vertexAttribPointer(a_normal, 3, gl.FLOAT, false, 24, 12);
```

### 法向量插值

```glsl
// 顶点着色器
out vec3 v_normal;

void main() {
  // 变换法向量到世界空间
  v_normal = mat3(u_normalMatrix) * a_normal;
  // ...
}

// 片元着色器
in vec3 v_normal;

void main() {
  // 必须重新归一化
  vec3 normal = normalize(v_normal);
  // ...
}
```

### 法向矩阵

```javascript
// 法向矩阵 = 模型矩阵的逆转置
function calculateNormalMatrix(modelMatrix) {
  const normalMatrix = mat3.create();
  mat3.fromMat4(normalMatrix, modelMatrix);
  mat3.invert(normalMatrix, normalMatrix);
  mat3.transpose(normalMatrix, normalMatrix);
  return normalMatrix;
}
```

## 光照向量

### 基础向量

```glsl
// 光照计算中的关键向量
vec3 N;  // 法向量 (Normal)
vec3 L;  // 光照方向 (Light direction)
vec3 V;  // 观察方向 (View direction)
vec3 R;  // 反射方向 (Reflection)
vec3 H;  // 半角向量 (Halfway)
```

### 计算方法

```glsl
// 法向量（从顶点着色器传入）
vec3 N = normalize(v_normal);

// 光照方向
// 方向光：直接使用
vec3 L = normalize(u_lightDir);
// 点光源：从片元指向光源
vec3 L = normalize(u_lightPos - v_worldPos);

// 观察方向（从片元指向相机）
vec3 V = normalize(u_cameraPos - v_worldPos);

// 反射方向
vec3 R = reflect(-L, N);

// 半角向量（Blinn-Phong 使用）
vec3 H = normalize(L + V);
```

## 光照空间

### 世界空间 vs 视图空间

| 空间 | 优点 | 缺点 |
|------|------|------|
| 世界空间 | 直观，光源位置固定 | 需要传相机位置 |
| 视图空间 | 相机在原点，计算简单 | 光源需要变换 |

### 视图空间光照

```glsl
// 顶点着色器
uniform mat4 u_modelView;
uniform mat3 u_normalViewMatrix;

out vec3 v_viewPos;
out vec3 v_viewNormal;

void main() {
  v_viewPos = (u_modelView * vec4(a_position, 1.0)).xyz;
  v_viewNormal = u_normalViewMatrix * a_normal;
  // ...
}

// 片元着色器
void main() {
  vec3 N = normalize(v_viewNormal);
  vec3 V = normalize(-v_viewPos);  // 相机在原点
  // ...
}
```

## 光照模型简介

### 经验模型

```
┌─────────────────────────────────────────────────────────┐
│                    光照模型类型                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   经验模型（快速，不精确）:                              │
│   • Lambert 漫反射                                       │
│   • Phong 高光                                          │
│   • Blinn-Phong 高光                                    │
│                                                         │
│   物理模型（慢，精确）:                                  │
│   • Cook-Torrance BRDF                                  │
│   • Oren-Nayar 漫反射                                   │
│   • GGX 高光分布                                        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Lambert 漫反射

```glsl
// 最简单的漫反射模型
float NdotL = max(dot(N, L), 0.0);
vec3 diffuse = lightColor * materialDiffuse * NdotL;
```

### Phong 高光

```glsl
// Phong 高光
vec3 R = reflect(-L, N);
float RdotV = max(dot(R, V), 0.0);
float spec = pow(RdotV, shininess);
vec3 specular = lightColor * materialSpecular * spec;
```

### Blinn-Phong 高光

```glsl
// Blinn-Phong（更高效）
vec3 H = normalize(L + V);
float NdotH = max(dot(N, H), 0.0);
float spec = pow(NdotH, shininess);
vec3 specular = lightColor * materialSpecular * spec;
```

## 材质属性

### 基本材质

```glsl
struct Material {
  vec3 ambient;    // 环境光反射
  vec3 diffuse;    // 漫反射颜色
  vec3 specular;   // 高光颜色
  float shininess; // 光泽度
};
```

### 纹理材质

```glsl
struct TexturedMaterial {
  sampler2D diffuseMap;   // 漫反射贴图
  sampler2D specularMap;  // 高光贴图
  sampler2D normalMap;    // 法线贴图
  float shininess;
};
```

## 着色频率

### 平面着色（Flat Shading）

```
   每个面一个颜色
   ┌─────────────┐
   │             │
   │  均匀颜色   │
   │             │
   └─────────────┘
```

```glsl
// 使用 flat 关键字
flat out vec3 v_color;

// 或在片元着色器中计算面法向量
vec3 N = normalize(cross(dFdx(v_worldPos), dFdy(v_worldPos)));
```

### 顶点着色（Gouraud Shading）

```
   每个顶点计算光照，插值颜色
   ┌─────────────┐
   │ ▓         ░ │
   │   ▓     ░   │
   │     ▓ ░     │
   └─────────────┘
```

```glsl
// 顶点着色器中计算
v_color = ambientColor + diffuseColor + specularColor;

// 片元着色器直接使用
fragColor = vec4(v_color, 1.0);
```

### 像素着色（Phong Shading）

```
   每个像素计算光照
   ┌─────────────┐
   │ ▓▓▓▒▒▒░░░░░ │
   │ ▓▓▒▒▒░░░░░░ │
   │ ▓▒▒▒░░░░░░░ │
   └─────────────┘
```

```glsl
// 顶点着色器传递法向量
out vec3 v_normal;

// 片元着色器计算光照
void main() {
  vec3 N = normalize(v_normal);
  // 完整光照计算
}
```

## 本章小结

- 局部光照 = 环境光 + 漫反射 + 高光
- 光源类型：方向光、点光源、聚光灯、区域光
- 法向量垂直于表面，必须归一化
- 法向矩阵 = 模型矩阵的逆转置
- Blinn-Phong 比 Phong 更高效
- 像素着色（逐片元）质量最好

下一章，我们将学习环境光。
