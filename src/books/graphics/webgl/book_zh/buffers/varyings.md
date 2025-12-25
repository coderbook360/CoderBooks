# Varying 变量

> "Varying 在光栅化过程中实现顶点数据到片元的平滑过渡。"

## Varying 基础

### 什么是 Varying

Varying 变量是从顶点着色器传递到片元着色器的数据，在光栅化阶段自动进行插值。

```
┌─────────────────────────────────────────────────────────┐
│                    Varying 数据流                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  顶点着色器                    片元着色器               │
│  ┌──────────────┐             ┌──────────────┐         │
│  │ out vec3 v_  │             │ in vec3 v_   │         │
│  │   normal     │ ─ 插值 ───→ │   normal     │         │
│  └──────────────┘             └──────────────┘         │
│                                                         │
│  顶点 A: (0, 1, 0)                                      │
│  顶点 B: (1, 0, 0)    →  片元: (0.5, 0.5, 0) (中间值)   │
│  顶点 C: (0, 0, 1)                                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 基本语法

```glsl
// 顶点着色器
#version 300 es

in vec3 a_position;
in vec3 a_normal;
in vec2 a_texCoord;

out vec3 v_position;    // varying 输出
out vec3 v_normal;
out vec2 v_texCoord;

void main() {
  v_position = a_position;
  v_normal = a_normal;
  v_texCoord = a_texCoord;
  gl_Position = u_mvpMatrix * vec4(a_position, 1.0);
}
```

```glsl
// 片元着色器
#version 300 es
precision highp float;

in vec3 v_position;     // varying 输入
in vec3 v_normal;
in vec2 v_texCoord;

out vec4 fragColor;

void main() {
  vec3 normal = normalize(v_normal);  // 需要重新归一化
  fragColor = vec4(normal * 0.5 + 0.5, 1.0);
}
```

## 插值类型

### 透视校正插值（默认）

```glsl
// 默认：透视校正插值
out vec3 v_worldPos;

// 等同于显式声明
smooth out vec3 v_worldPos;
```

透视校正保证在 3D 空间中正确插值：

```
透视校正:              线性插值（错误）:
┌────────────────┐    ┌────────────────┐
│╲              ╱│    │╲              ╱│
│ ╲   正确纹理 ╱ │    │ ╲   扭曲纹理 ╱ │
│  ╲          ╱  │    │  ╲          ╱  │
│   ╲        ╱   │    │   ╲        ╱   │
│    ╲──────╱    │    │    ╲──────╱    │
└────────────────┘    └────────────────┘
```

### 平坦插值（Flat）

```glsl
// 顶点着色器
flat out int v_instanceId;
flat out vec4 v_flatColor;

void main() {
  v_instanceId = gl_InstanceID;
  v_flatColor = u_colors[gl_InstanceID];
}

// 片元着色器
flat in int v_instanceId;
flat in vec4 v_flatColor;
```

Flat 插值不进行插值，使用图元第一个顶点（或最后一个，取决于约定）的值：

```
Flat 插值:
┌─────────────────────────────────────┐
│                                     │
│  顶点 0: 红色 ←── 使用这个值         │
│  顶点 1: 绿色                       │
│  顶点 2: 蓝色                       │
│                                     │
│  整个三角形都是红色                  │
│                                     │
└─────────────────────────────────────┘
```

### 无透视校正插值

```glsl
// 屏幕空间线性插值（无透视校正）
noperspective out vec2 v_screenUV;
```

用于 2D 效果，如后处理、UI 渲染。

## 常见 Varying 数据

### 位置相关

```glsl
// 顶点着色器
uniform mat4 u_modelMatrix;
uniform mat4 u_viewMatrix;
uniform mat4 u_projectionMatrix;

out vec3 v_worldPos;     // 世界坐标
out vec3 v_viewPos;      // 观察空间坐标
out vec4 v_clipPos;      // 裁剪坐标

void main() {
  vec4 worldPos = u_modelMatrix * vec4(a_position, 1.0);
  vec4 viewPos = u_viewMatrix * worldPos;
  vec4 clipPos = u_projectionMatrix * viewPos;
  
  v_worldPos = worldPos.xyz;
  v_viewPos = viewPos.xyz;
  v_clipPos = clipPos;
  
  gl_Position = clipPos;
}
```

### 法线相关

```glsl
// 顶点着色器
uniform mat3 u_normalMatrix;

out vec3 v_normal;
out vec3 v_tangent;
out vec3 v_bitangent;

void main() {
  v_normal = normalize(u_normalMatrix * a_normal);
  v_tangent = normalize(u_normalMatrix * a_tangent.xyz);
  v_bitangent = cross(v_normal, v_tangent) * a_tangent.w;
}

// 片元着色器
in vec3 v_normal;
in vec3 v_tangent;
in vec3 v_bitangent;

void main() {
  // 构建 TBN 矩阵
  mat3 TBN = mat3(
    normalize(v_tangent),
    normalize(v_bitangent),
    normalize(v_normal)
  );
  
  // 从法线贴图获取法线
  vec3 normalMap = texture(u_normalMap, v_texCoord).rgb * 2.0 - 1.0;
  vec3 worldNormal = TBN * normalMap;
}
```

### 纹理坐标

```glsl
// 顶点着色器
out vec2 v_texCoord;
out vec2 v_lightmapUV;

void main() {
  v_texCoord = a_texCoord;
  v_lightmapUV = a_lightmapUV;
}
```

### 顶点颜色

```glsl
// 顶点着色器
in vec4 a_color;
out vec4 v_color;

void main() {
  v_color = a_color;
}

// 片元着色器
in vec4 v_color;

void main() {
  fragColor = v_color * texture(u_texture, v_texCoord);
}
```

## 插值限制

### 最大 Varying 数量

```javascript
// 获取最大 varying 组件数
const maxVaryings = gl.getParameter(gl.MAX_VARYING_COMPONENTS);
console.log('Max varying components:', maxVaryings);  // 通常 60-124

// 每个 vec4 = 4 个组件
// 60 组件 = 15 个 vec4
```

### 打包优化

```glsl
// 不好：浪费 varying 槽位
out float v_intensity;  // 使用 1 个组件
out vec2 v_uv;          // 使用 2 个组件
out float v_ao;         // 使用 1 个组件
// 总计：使用 4 个组件，可能占 4 个槽位

// 好：打包到更少的变量
out vec4 v_packed;  // xy = uv, z = intensity, w = ao
// 总计：1 个 vec4 槽位
```

### 超出限制处理

```glsl
// 方法 1：使用 UBO 传递额外数据

// 方法 2：在片元着色器中重新计算
// 顶点着色器只传递必要数据

// 方法 3：使用多 pass 渲染
```

## 精度问题

### Varying 精度

```glsl
// 顶点着色器
out highp vec3 v_worldPos;    // 高精度
out mediump vec3 v_normal;    // 中精度足够
out lowp vec4 v_color;        // 低精度

// 片元着色器（精度必须匹配）
in highp vec3 v_worldPos;
in mediump vec3 v_normal;
in lowp vec4 v_color;
```

### 大坐标精度问题

```glsl
// 问题：远离原点时精度下降
out vec3 v_worldPos;  // 如果值很大，插值后可能有伪影

// 解决：使用相对坐标
uniform vec3 u_cameraPos;
out vec3 v_relativePos;  // 相对相机的位置

void main() {
  v_relativePos = worldPos - u_cameraPos;  // 值更小，精度更好
}
```

## 法线插值问题

### 归一化

插值后的法线可能不再是单位向量：

```glsl
// 顶点着色器
out vec3 v_normal;

void main() {
  v_normal = normalize(u_normalMatrix * a_normal);
}

// 片元着色器
in vec3 v_normal;

void main() {
  // 必须重新归一化！
  vec3 normal = normalize(v_normal);
  
  // 使用归一化后的法线
  float diffuse = max(dot(normal, lightDir), 0.0);
}
```

### 可视化

```
插值前:
  ↗       ↖
 v0       v1
 
插值后（未归一化）:
       ↑
      / \
     /   \
  ↗   →   ↖
  v0       v1
  
  中间的向量长度 < 1
```

## 特殊用法

### 屏幕坐标传递

```glsl
// 顶点着色器
out vec4 v_screenPos;

void main() {
  gl_Position = u_mvpMatrix * vec4(a_position, 1.0);
  v_screenPos = gl_Position;  // 传递裁剪坐标
}

// 片元着色器
in vec4 v_screenPos;

void main() {
  // 手动透视除法
  vec2 screenUV = (v_screenPos.xy / v_screenPos.w) * 0.5 + 0.5;
  
  // 用于采样屏幕空间纹理
  vec4 reflection = texture(u_screenTexture, screenUV);
}
```

### 阴影映射

```glsl
// 顶点着色器
uniform mat4 u_lightSpaceMatrix;
out vec4 v_lightSpacePos;

void main() {
  v_lightSpacePos = u_lightSpaceMatrix * u_modelMatrix * vec4(a_position, 1.0);
  gl_Position = u_mvpMatrix * vec4(a_position, 1.0);
}

// 片元着色器
in vec4 v_lightSpacePos;
uniform sampler2D u_shadowMap;

float calculateShadow() {
  vec3 projCoords = v_lightSpacePos.xyz / v_lightSpacePos.w;
  projCoords = projCoords * 0.5 + 0.5;
  
  float closestDepth = texture(u_shadowMap, projCoords.xy).r;
  float currentDepth = projCoords.z;
  
  return currentDepth > closestDepth + 0.005 ? 0.3 : 1.0;
}
```

### 立方体贴图反射

```glsl
// 顶点着色器
out vec3 v_worldPos;
out vec3 v_worldNormal;

// 片元着色器
in vec3 v_worldPos;
in vec3 v_worldNormal;

uniform vec3 u_cameraPos;
uniform samplerCube u_envMap;

void main() {
  vec3 viewDir = normalize(v_worldPos - u_cameraPos);
  vec3 reflectDir = reflect(viewDir, normalize(v_worldNormal));
  
  vec4 envColor = texture(u_envMap, reflectDir);
  fragColor = envColor;
}
```

## 调试 Varying

### 可视化 Varying

```glsl
// 可视化法线
fragColor = vec4(v_normal * 0.5 + 0.5, 1.0);

// 可视化 UV
fragColor = vec4(v_texCoord, 0.0, 1.0);

// 可视化位置
fragColor = vec4(fract(v_worldPos), 1.0);
```

### 检查插值问题

```glsl
// 显示 flat vs smooth 区别
flat out vec3 v_flatNormal;
out vec3 v_smoothNormal;

// 片元着色器中比较
vec3 diff = abs(v_flatNormal - v_smoothNormal);
fragColor = vec4(diff * 10.0, 1.0);  // 放大差异
```

## 本章小结

- Varying 在光栅化时自动插值
- 默认使用透视校正插值
- flat 限定符禁用插值
- noperspective 使用屏幕空间线性插值
- 法线插值后需要重新归一化
- 注意 varying 数量限制
- 可以打包多个值到单个 vec4

下一章，我们将学习纹理的基础知识。
