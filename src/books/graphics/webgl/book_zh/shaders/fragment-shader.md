# 片元着色器详解

> "片元着色器决定了每个像素的最终颜色。"

## 片元着色器的角色

### 主要职责

```
┌─────────────────────────────────────────────┐
│              片元着色器职责                  │
├─────────────────────────────────────────────┤
│                                             │
│  1. 颜色计算：确定每个片元的颜色             │
│  2. 纹理采样：从纹理中获取颜色               │
│  3. 光照计算：实现光照模型                   │
│  4. 特效处理：后处理、滤镜等                 │
│  5. Alpha 测试：决定是否丢弃片元             │
│                                             │
└─────────────────────────────────────────────┘
```

### 执行时机

```
光栅化
    │
    ▼ 生成片元
┌─────────────────┐
│  片元着色器     │ ← 每个片元执行一次
│(Fragment Shader)│
└────────┬────────┘
         │
         ▼
    帧缓冲区
```

## 基本结构

### 必需元素

```glsl
#version 300 es

// 必须指定精度
precision highp float;

// 从顶点着色器接收的插值数据
in vec3 v_position;
in vec3 v_normal;
in vec2 v_texCoord;

// Uniform 变量
uniform sampler2D u_texture;
uniform vec3 u_lightDir;
uniform vec3 u_viewPos;

// 输出颜色（必须声明）
out vec4 fragColor;

void main() {
  // 计算并输出颜色
  fragColor = vec4(1.0, 0.0, 0.0, 1.0);
}
```

### 多渲染目标 (MRT)

```glsl
#version 300 es
precision highp float;

// 多个输出
layout(location = 0) out vec4 gPosition;
layout(location = 1) out vec4 gNormal;
layout(location = 2) out vec4 gAlbedo;

void main() {
  gPosition = vec4(v_position, 1.0);
  gNormal = vec4(normalize(v_normal), 1.0);
  gAlbedo = texture(u_albedoMap, v_texCoord);
}
```

## 内置变量

### 输入变量

```glsl
// 片元坐标（窗口空间）
vec4 coord = gl_FragCoord;
// coord.x, coord.y: 像素位置
// coord.z: 深度值 (0-1)
// coord.w: 1/w

// 是否是正面
bool front = gl_FrontFacing;

// 点精灵坐标（绘制点时）
vec2 pointCoord = gl_PointCoord;  // (0,0) 到 (1,1)
```

### 使用 gl_FragCoord

```glsl
void main() {
  // 归一化坐标
  vec2 uv = gl_FragCoord.xy / u_resolution;
  
  // 创建渐变效果
  fragColor = vec4(uv, 0.0, 1.0);
}
```

### 使用 gl_FrontFacing

```glsl
void main() {
  vec3 normal = v_normal;
  
  // 根据面的朝向翻转法线
  if (!gl_FrontFacing) {
    normal = -normal;
  }
  
  // 或使用条件表达式
  normal = gl_FrontFacing ? normal : -normal;
  
  // 继续光照计算...
}
```

## 纹理采样

### 基本采样

```glsl
uniform sampler2D u_texture;

void main() {
  vec4 texColor = texture(u_texture, v_texCoord);
  fragColor = texColor;
}
```

### 多纹理混合

```glsl
uniform sampler2D u_diffuseMap;
uniform sampler2D u_normalMap;
uniform sampler2D u_specularMap;

void main() {
  vec4 diffuse = texture(u_diffuseMap, v_texCoord);
  vec3 normal = texture(u_normalMap, v_texCoord).rgb * 2.0 - 1.0;
  float specular = texture(u_specularMap, v_texCoord).r;
  
  // 使用这些值进行光照计算...
}
```

### 纹理 LOD 采样

```glsl
// 指定 LOD 级别
vec4 color = textureLod(u_texture, v_texCoord, 2.0);

// 使用梯度采样
vec2 dPdx = dFdx(v_texCoord);
vec2 dPdy = dFdy(v_texCoord);
vec4 color = textureGrad(u_texture, v_texCoord, dPdx, dPdy);
```

## 光照计算

### Phong 光照模型

```glsl
uniform vec3 u_lightPos;
uniform vec3 u_viewPos;
uniform vec3 u_lightColor;
uniform float u_shininess;

void main() {
  vec3 normal = normalize(v_normal);
  vec3 lightDir = normalize(u_lightPos - v_position);
  vec3 viewDir = normalize(u_viewPos - v_position);
  
  // 环境光
  vec3 ambient = 0.1 * u_lightColor;
  
  // 漫反射
  float diff = max(dot(normal, lightDir), 0.0);
  vec3 diffuse = diff * u_lightColor;
  
  // 镜面反射
  vec3 reflectDir = reflect(-lightDir, normal);
  float spec = pow(max(dot(viewDir, reflectDir), 0.0), u_shininess);
  vec3 specular = spec * u_lightColor;
  
  // 组合
  vec4 texColor = texture(u_diffuseMap, v_texCoord);
  vec3 result = (ambient + diffuse + specular) * texColor.rgb;
  
  fragColor = vec4(result, texColor.a);
}
```

### Blinn-Phong 光照模型

```glsl
void main() {
  vec3 normal = normalize(v_normal);
  vec3 lightDir = normalize(u_lightPos - v_position);
  vec3 viewDir = normalize(u_viewPos - v_position);
  
  // 使用半程向量代替反射向量
  vec3 halfDir = normalize(lightDir + viewDir);
  
  float diff = max(dot(normal, lightDir), 0.0);
  float spec = pow(max(dot(normal, halfDir), 0.0), u_shininess);
  
  // ...
}
```

## 丢弃片元

### discard 语句

```glsl
uniform float u_alphaThreshold;

void main() {
  vec4 texColor = texture(u_texture, v_texCoord);
  
  // Alpha 测试
  if (texColor.a < u_alphaThreshold) {
    discard;  // 丢弃此片元
  }
  
  fragColor = texColor;
}
```

### 裁剪效果

```glsl
uniform vec3 u_clipPlane;  // 平面法线和距离
uniform float u_clipDist;

void main() {
  // 计算到裁剪平面的距离
  float dist = dot(v_position, u_clipPlane) - u_clipDist;
  
  if (dist < 0.0) {
    discard;
  }
  
  fragColor = texture(u_texture, v_texCoord);
}
```

## 导数函数

### dFdx 和 dFdy

```glsl
void main() {
  // 获取相邻片元的变化率
  vec2 dx = dFdx(v_texCoord);  // 水平方向变化
  vec2 dy = dFdy(v_texCoord);  // 垂直方向变化
  
  // 计算屏幕空间法线
  vec3 N = normalize(cross(dFdx(v_position), dFdy(v_position)));
  
  // 使用 fwidth 获取总变化（abs(dFdx) + abs(dFdy)）
  float edge = fwidth(v_value);
}
```

### 抗锯齿边缘

```glsl
void main() {
  float dist = length(v_position.xy - u_circleCenter);
  float edge = fwidth(dist);
  
  // 平滑边缘
  float alpha = 1.0 - smoothstep(u_radius - edge, u_radius + edge, dist);
  
  fragColor = vec4(u_color, alpha);
}
```

## 常见特效

### 卡通着色

```glsl
void main() {
  vec3 normal = normalize(v_normal);
  vec3 lightDir = normalize(u_lightDir);
  
  float NdotL = dot(normal, lightDir);
  
  // 量化光照
  float intensity;
  if (NdotL > 0.95) intensity = 1.0;
  else if (NdotL > 0.5) intensity = 0.7;
  else if (NdotL > 0.25) intensity = 0.4;
  else intensity = 0.2;
  
  fragColor = vec4(u_baseColor * intensity, 1.0);
}
```

### 边缘检测

```glsl
void main() {
  vec3 normal = normalize(v_normal);
  vec3 viewDir = normalize(u_viewPos - v_position);
  
  float edge = 1.0 - dot(normal, viewDir);
  edge = pow(edge, u_edgePower);
  
  fragColor = vec4(mix(u_fillColor, u_edgeColor, edge), 1.0);
}
```

### 雾效果

```glsl
uniform float u_fogStart;
uniform float u_fogEnd;
uniform vec3 u_fogColor;

void main() {
  vec4 color = texture(u_texture, v_texCoord);
  
  // 计算雾因子（线性雾）
  float dist = length(v_position - u_viewPos);
  float fogFactor = clamp((u_fogEnd - dist) / (u_fogEnd - u_fogStart), 0.0, 1.0);
  
  // 混合雾颜色
  color.rgb = mix(u_fogColor, color.rgb, fogFactor);
  
  fragColor = color;
}
```

## 性能优化

### 避免分支

```glsl
// 不好
if (x > 0.5) {
  color = colorA;
} else {
  color = colorB;
}

// 好
color = mix(colorB, colorA, step(0.5, x));
```

### 减少纹理采样

```glsl
// 打包多个值到一个纹理
// R: ambient occlusion
// G: roughness
// B: metallic
vec3 orm = texture(u_ormMap, v_texCoord).rgb;
float ao = orm.r;
float roughness = orm.g;
float metallic = orm.b;
```

### 使用合适的精度

```glsl
// 颜色可以使用低精度
lowp vec4 color = texture(u_texture, v_texCoord);

// 纹理坐标使用中精度
mediump vec2 uv = v_texCoord;

// 位置和法线使用高精度
highp vec3 position = v_position;
```

## 本章小结

- 片元着色器为每个片元计算颜色
- 必须声明精度和输出变量
- 内置变量提供片元位置、朝向等信息
- 纹理采样是片元着色器的核心功能
- 光照计算决定了物体的视觉效果
- discard 可以丢弃不需要的片元

下一章，我们将学习着色器的编译、链接与调试。
