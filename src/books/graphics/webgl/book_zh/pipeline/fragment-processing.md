# 片元处理阶段

> "每个像素的颜色都是片元着色器的杰作。"

## 片元处理概述

### 什么是片元

片元（Fragment）是光栅化生成的潜在像素，包含：
- 屏幕坐标
- 深度值
- 插值后的顶点属性

```
┌─────────────────────────────────────────────────────────┐
│                     片元数据                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  • gl_FragCoord.xy    ─ 屏幕坐标                       │
│  • gl_FragCoord.z     ─ 深度值                         │
│  • gl_FrontFacing     ─ 是否正面                       │
│  • varying 变量        ─ 插值后的顶点属性               │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 片元着色器输入

### 内置输入变量

```glsl
#version 300 es
precision highp float;

void main() {
  // 片元屏幕坐标
  vec2 screenPos = gl_FragCoord.xy;
  
  // 片元深度 [0, 1]
  float depth = gl_FragCoord.z;
  
  // 1.0 / gl_Position.w（用于透视校正）
  float fragCoordW = gl_FragCoord.w;
  
  // 是否是正面
  bool isFront = gl_FrontFacing;
  
  // 点图元的坐标（仅 gl.POINTS 模式）
  vec2 pointCoord = gl_PointCoord;  // [0,1] x [0,1]
}
```

### Varying 输入

```glsl
#version 300 es
precision highp float;

// 从顶点着色器接收的插值数据
in vec3 v_worldPos;
in vec3 v_normal;
in vec2 v_texCoord;
in vec4 v_color;

out vec4 fragColor;

void main() {
  // 使用插值后的数据
  vec3 normal = normalize(v_normal);
  vec4 texColor = texture(u_texture, v_texCoord);
  fragColor = v_color * texColor;
}
```

## 片元着色器输出

### 单一输出

```glsl
#version 300 es
precision highp float;

out vec4 fragColor;

void main() {
  fragColor = vec4(1.0, 0.0, 0.0, 1.0);  // 红色
}
```

### 多渲染目标（MRT）

```glsl
#version 300 es
precision highp float;

// 多个输出目标
layout(location = 0) out vec4 gPosition;  // 位置
layout(location = 1) out vec4 gNormal;    // 法线
layout(location = 2) out vec4 gAlbedo;    // 颜色

in vec3 v_worldPos;
in vec3 v_normal;
in vec2 v_texCoord;

uniform sampler2D u_diffuse;

void main() {
  gPosition = vec4(v_worldPos, 1.0);
  gNormal = vec4(normalize(v_normal), 0.0);
  gAlbedo = texture(u_diffuse, v_texCoord);
}
```

## 纹理采样

### 基本采样

```glsl
uniform sampler2D u_texture;
in vec2 v_texCoord;

void main() {
  // 2D 纹理采样
  vec4 color = texture(u_texture, v_texCoord);
  
  fragColor = color;
}
```

### 多纹理

```glsl
uniform sampler2D u_diffuseMap;
uniform sampler2D u_normalMap;
uniform sampler2D u_specularMap;

void main() {
  vec4 diffuse = texture(u_diffuseMap, v_texCoord);
  vec3 normal = texture(u_normalMap, v_texCoord).rgb * 2.0 - 1.0;
  float specular = texture(u_specularMap, v_texCoord).r;
  
  // 组合使用
}
```

### 纹理 LOD 和偏导

```glsl
void main() {
  // 手动指定 LOD
  vec4 color = textureLod(u_texture, v_texCoord, 2.0);
  
  // 使用偏导计算
  vec2 dFdxTC = dFdx(v_texCoord);
  vec2 dFdyTC = dFdy(v_texCoord);
  vec4 colorGrad = textureGrad(u_texture, v_texCoord, dFdxTC, dFdyTC);
}
```

## 光照计算

### Phong 光照模型

```glsl
uniform vec3 u_lightPos;
uniform vec3 u_viewPos;
uniform vec3 u_lightColor;
uniform float u_shininess;

in vec3 v_worldPos;
in vec3 v_normal;

void main() {
  vec3 N = normalize(v_normal);
  vec3 L = normalize(u_lightPos - v_worldPos);
  vec3 V = normalize(u_viewPos - v_worldPos);
  vec3 R = reflect(-L, N);
  
  // 环境光
  vec3 ambient = 0.1 * u_lightColor;
  
  // 漫反射
  float diff = max(dot(N, L), 0.0);
  vec3 diffuse = diff * u_lightColor;
  
  // 高光
  float spec = pow(max(dot(V, R), 0.0), u_shininess);
  vec3 specular = spec * u_lightColor;
  
  vec3 result = ambient + diffuse + specular;
  fragColor = vec4(result, 1.0);
}
```

### PBR 光照

```glsl
// 简化的 PBR 片元着色器
uniform float u_metallic;
uniform float u_roughness;

vec3 fresnelSchlick(float cosTheta, vec3 F0) {
  return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
}

float DistributionGGX(vec3 N, vec3 H, float roughness) {
  float a = roughness * roughness;
  float a2 = a * a;
  float NdotH = max(dot(N, H), 0.0);
  float NdotH2 = NdotH * NdotH;
  
  float num = a2;
  float denom = (NdotH2 * (a2 - 1.0) + 1.0);
  denom = 3.14159265 * denom * denom;
  
  return num / denom;
}

void main() {
  // PBR 计算...
}
```

## discard 语句

### 透明度裁剪

```glsl
uniform sampler2D u_texture;
uniform float u_alphaThreshold;

void main() {
  vec4 color = texture(u_texture, v_texCoord);
  
  // Alpha 测试：低于阈值的片元被丢弃
  if (color.a < u_alphaThreshold) {
    discard;
  }
  
  fragColor = color;
}
```

### 程序化裁剪

```glsl
void main() {
  // 棋盘格裁剪
  vec2 grid = floor(gl_FragCoord.xy / 10.0);
  if (mod(grid.x + grid.y, 2.0) < 1.0) {
    discard;
  }
  
  fragColor = vec4(1.0);
}
```

### discard 的性能影响

```
┌─────────────────────────────────────────────────────────┐
│                  discard 注意事项                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  • 破坏 Early-Z 优化                                   │
│  • 可能影响相邻片元（GPU 并行处理）                     │
│  • 大量 discard 会降低性能                             │
│  • 优先使用 Alpha Blending 或预排序                    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 深度值修改

### 写入自定义深度

```glsl
#version 300 es
precision highp float;

out vec4 fragColor;

void main() {
  // 自定义深度值
  gl_FragDepth = 0.5;  // 覆盖默认深度
  
  fragColor = vec4(1.0, 0.0, 0.0, 1.0);
}
```

### 深度范围约束

```glsl
// WebGL 2.0 深度范围约束
layout(depth_any) out float gl_FragDepth;     // 任意修改
layout(depth_greater) out float gl_FragDepth; // 只能增大
layout(depth_less) out float gl_FragDepth;    // 只能减小
layout(depth_unchanged) out float gl_FragDepth; // 不修改

// 使用约束可保持 Early-Z 优化
layout(depth_greater) out float gl_FragDepth;

void main() {
  fragColor = vec4(1.0);
  gl_FragDepth = gl_FragCoord.z + 0.001;  // 只增大
}
```

## 导数函数

### dFdx 和 dFdy

计算屏幕空间的偏导数：

```glsl
void main() {
  // 纹理坐标在屏幕 x 和 y 方向的变化率
  vec2 dx = dFdx(v_texCoord);
  vec2 dy = dFdy(v_texCoord);
  
  // 可用于边缘检测
  float edge = length(dFdx(v_normal)) + length(dFdy(v_normal));
  
  fragColor = vec4(vec3(edge), 1.0);
}
```

### fwidth

```glsl
void main() {
  // fwidth = abs(dFdx) + abs(dFdy)
  float fw = fwidth(v_value);
  
  // 用于抗锯齿
  float line = smoothstep(0.0, fw, abs(v_value));
}
```

### 程序化纹理抗锯齿

```glsl
// 棋盘格纹理（抗锯齿版本）
float checkerboard(vec2 uv) {
  vec2 fw = fwidth(uv);
  vec2 p = fract(uv) * 2.0 - 1.0;
  vec2 aa = smoothstep(-fw, fw, p);
  return aa.x * aa.y * 2.0 - aa.x - aa.y + 1.0;
}
```

## 后处理效果

### 灰度化

```glsl
void main() {
  vec4 color = texture(u_screen, v_texCoord);
  float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
  fragColor = vec4(vec3(gray), 1.0);
}
```

### 边缘检测（Sobel）

```glsl
uniform vec2 u_texelSize;

void main() {
  // Sobel 算子
  float gx = 
    texture(u_screen, v_texCoord + vec2(-1, -1) * u_texelSize).r * -1.0 +
    texture(u_screen, v_texCoord + vec2(-1,  0) * u_texelSize).r * -2.0 +
    texture(u_screen, v_texCoord + vec2(-1,  1) * u_texelSize).r * -1.0 +
    texture(u_screen, v_texCoord + vec2( 1, -1) * u_texelSize).r *  1.0 +
    texture(u_screen, v_texCoord + vec2( 1,  0) * u_texelSize).r *  2.0 +
    texture(u_screen, v_texCoord + vec2( 1,  1) * u_texelSize).r *  1.0;
  
  float gy = 
    texture(u_screen, v_texCoord + vec2(-1, -1) * u_texelSize).r * -1.0 +
    texture(u_screen, v_texCoord + vec2( 0, -1) * u_texelSize).r * -2.0 +
    texture(u_screen, v_texCoord + vec2( 1, -1) * u_texelSize).r * -1.0 +
    texture(u_screen, v_texCoord + vec2(-1,  1) * u_texelSize).r *  1.0 +
    texture(u_screen, v_texCoord + vec2( 0,  1) * u_texelSize).r *  2.0 +
    texture(u_screen, v_texCoord + vec2( 1,  1) * u_texelSize).r *  1.0;
  
  float edge = sqrt(gx * gx + gy * gy);
  fragColor = vec4(vec3(edge), 1.0);
}
```

### 高斯模糊

```glsl
uniform vec2 u_direction;  // (1,0) 或 (0,1)
uniform vec2 u_texelSize;

const float weights[5] = float[](0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216);

void main() {
  vec3 result = texture(u_screen, v_texCoord).rgb * weights[0];
  
  for (int i = 1; i < 5; i++) {
    vec2 offset = u_direction * u_texelSize * float(i);
    result += texture(u_screen, v_texCoord + offset).rgb * weights[i];
    result += texture(u_screen, v_texCoord - offset).rgb * weights[i];
  }
  
  fragColor = vec4(result, 1.0);
}
```

## 本章小结

- 片元着色器为每个片元计算颜色
- gl_FragCoord 提供屏幕坐标和深度
- 可以输出到多个渲染目标（MRT）
- 纹理采样是片元着色器的核心操作
- discard 可丢弃片元但影响性能
- dFdx/dFdy 用于边缘检测和抗锯齿
- 后处理效果在片元着色器中实现

下一章，我们将学习帧缓冲与输出阶段。
