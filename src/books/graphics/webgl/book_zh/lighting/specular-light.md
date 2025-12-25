# 高光反射

> "高光是表面光泽度的表现，让物体看起来有金属感或塑料感。"

## 什么是高光反射

### 物理原理

高光反射（Specular Reflection）是光线在光滑表面上的镜面反射，形成亮点。

```
┌─────────────────────────────────────────────────────────┐
│                    高光反射原理                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│                    V (观察方向)                         │
│                    ↗                                    │
│                   ╱                                     │
│                  ╱  亮点！                              │
│   L (入射)      ╱                                       │
│        ↘       ╱                                        │
│         ↘     ╱                                         │
│          ↘   ╱                                          │
│           ↘ ↗                                          │
│   ─────────●─────────→ N                               │
│            ↖                                            │
│             ╲                                           │
│              R (反射方向)                               │
│                                                         │
│   当 V 接近 R 时，看到高光                              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 与漫反射对比

| 特性 | 漫反射 | 高光反射 |
|------|--------|----------|
| 方向依赖 | 只依赖光源方向 | 依赖光源和观察方向 |
| 外观 | 均匀渐变 | 集中亮点 |
| 材质表现 | 物体颜色 | 光源颜色 |
| 表面类型 | 粗糙表面 | 光滑表面 |

## Phong 高光

### 基本公式

```
高光强度 = (R · V)^shininess

R = reflect(-L, N)  // 反射向量
V = 观察方向
shininess = 光泽度（越高越锐利）
```

### 实现

```glsl
#version 300 es
precision highp float;

uniform vec3 u_lightDir;
uniform vec3 u_lightColor;
uniform vec3 u_viewPos;
uniform vec3 u_specularColor;
uniform float u_shininess;

in vec3 v_worldPos;
in vec3 v_normal;

out vec4 fragColor;

void main() {
  vec3 N = normalize(v_normal);
  vec3 L = normalize(u_lightDir);
  vec3 V = normalize(u_viewPos - v_worldPos);
  
  // 反射向量
  vec3 R = reflect(-L, N);
  
  // Phong 高光
  float RdotV = max(dot(R, V), 0.0);
  float spec = pow(RdotV, u_shininess);
  
  vec3 specular = u_lightColor * u_specularColor * spec;
  
  fragColor = vec4(specular, 1.0);
}
```

### 反射函数

```glsl
// GLSL 内置的 reflect 函数
// reflect(I, N) = I - 2 * dot(N, I) * N

// 手动实现
vec3 myReflect(vec3 I, vec3 N) {
  return I - 2.0 * dot(N, I) * N;
}
```

## Blinn-Phong 高光

### 半角向量

```
┌─────────────────────────────────────────────────────────┐
│                    Blinn-Phong 半角向量                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│              H (半角向量)                               │
│              ↑                                          │
│             ╱│╲                                         │
│            ╱ │ ╲                                        │
│           ╱  │  ╲                                       │
│          ╱   │   ╲                                      │
│         L    │    V                                     │
│          ↘   │   ↗                                     │
│           ↘  │  ↗                                      │
│            ↘ │ ↗                                       │
│   ──────────●─────────→ N                              │
│                                                         │
│   H = normalize(L + V)                                  │
│   高光强度 = (N · H)^shininess                          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 实现

```glsl
void main() {
  vec3 N = normalize(v_normal);
  vec3 L = normalize(u_lightDir);
  vec3 V = normalize(u_viewPos - v_worldPos);
  
  // 半角向量
  vec3 H = normalize(L + V);
  
  // Blinn-Phong 高光
  float NdotH = max(dot(N, H), 0.0);
  float spec = pow(NdotH, u_shininess);
  
  vec3 specular = u_lightColor * u_specularColor * spec;
  
  fragColor = vec4(specular, 1.0);
}
```

### Phong vs Blinn-Phong

| 特性 | Phong | Blinn-Phong |
|------|-------|-------------|
| 计算 | reflect + dot | normalize + dot |
| 速度 | 较慢 | 较快 |
| 效果 | 更锐利 | 更柔和 |
| 使用 | 较少 | 工业标准 |

## 光泽度

### shininess 参数

```
┌─────────────────────────────────────────────────────────┐
│                    光泽度效果                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   shininess = 8     shininess = 32    shininess = 128  │
│   ┌─────────┐       ┌─────────┐       ┌─────────┐      │
│   │ ▓▓▓▓▓▓▓ │       │   ▓▓▓   │       │    ●    │      │
│   │ ▓▓▓▓▓▓▓ │       │   ▓▓▓   │       │         │      │
│   │ ▓▓▓▓▓▓▓ │       │   ▓▓▓   │       │         │      │
│   └─────────┘       └─────────┘       └─────────┘      │
│    宽泛模糊          中等               锐利集中        │
│    (粗糙)           (塑料)             (金属)          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 常见材质值

| 材质 | Shininess | 说明 |
|------|-----------|------|
| 粗糙木材 | 4-8 | 几乎无高光 |
| 塑料 | 16-32 | 明显高光 |
| 金属 | 64-128 | 锐利高光 |
| 镜面 | 256+ | 极其锐利 |

## 高光贴图

### 使用贴图控制高光

```glsl
uniform sampler2D u_specularMap;  // 高光强度贴图

void main() {
  vec3 N = normalize(v_normal);
  vec3 L = normalize(u_lightDir);
  vec3 V = normalize(u_viewPos - v_worldPos);
  vec3 H = normalize(L + V);
  
  // 从贴图获取高光强度
  float specStrength = texture(u_specularMap, v_texCoord).r;
  
  float NdotH = max(dot(N, H), 0.0);
  float spec = pow(NdotH, u_shininess);
  
  vec3 specular = u_lightColor * spec * specStrength;
  
  fragColor = vec4(specular, 1.0);
}
```

### 完整材质着色器

```glsl
uniform sampler2D u_diffuseMap;
uniform sampler2D u_specularMap;
uniform float u_shininess;

void main() {
  vec3 N = normalize(v_normal);
  vec3 L = normalize(u_lightDir);
  vec3 V = normalize(u_viewPos - v_worldPos);
  vec3 H = normalize(L + V);
  
  // 材质属性
  vec3 diffuseColor = texture(u_diffuseMap, v_texCoord).rgb;
  float specStrength = texture(u_specularMap, v_texCoord).r;
  
  // 漫反射
  float NdotL = max(dot(N, L), 0.0);
  vec3 diffuse = u_lightColor * diffuseColor * NdotL;
  
  // 高光
  float NdotH = max(dot(N, H), 0.0);
  float spec = pow(NdotH, u_shininess);
  vec3 specular = u_lightColor * spec * specStrength;
  
  // 环境光
  vec3 ambient = u_ambientColor * diffuseColor * 0.1;
  
  fragColor = vec4(ambient + diffuse + specular, 1.0);
}
```

## 金属与非金属

### 区别

```
┌─────────────────────────────────────────────────────────┐
│                金属 vs 非金属高光                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   非金属（绝缘体）:                                      │
│   • 高光颜色 = 光源颜色                                 │
│   • 漫反射颜色 = 材质颜色                               │
│   • 例: 塑料、木材、皮肤                                │
│                                                         │
│   金属（导体）:                                          │
│   • 高光颜色 = 材质颜色                                 │
│   • 几乎无漫反射                                        │
│   • 例: 金、银、铜                                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 实现

```glsl
uniform float u_metallic;  // 0 = 非金属, 1 = 金属

void main() {
  vec3 diffuseColor = texture(u_diffuseMap, v_texCoord).rgb;
  
  // 金属的高光颜色来自材质
  vec3 specColor = mix(vec3(0.04), diffuseColor, u_metallic);
  
  // 金属几乎没有漫反射
  vec3 diffuse = diffuseColor * NdotL * (1.0 - u_metallic);
  
  // 高光
  float spec = pow(NdotH, u_shininess);
  vec3 specular = specColor * spec;
  
  fragColor = vec4(diffuse + specular, 1.0);
}
```

## 菲涅尔效应

### 概念

```
┌─────────────────────────────────────────────────────────┐
│                    菲涅尔效应                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   从正面看        从侧面看                              │
│   ┌─────────┐     ┌─────────┐                          │
│   │   ░░░   │     │▓▓▓▓▓▓▓▓▓│                          │
│   │  物体   │     │▓ 物体 ▓│                           │
│   │   ░░░   │     │▓▓▓▓▓▓▓▓▓│                          │
│   └─────────┘     └─────────┘                          │
│   较少反射         边缘更反光                           │
│                                                         │
│   观察角度越大，反射越强                                │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Schlick 近似

```glsl
// Schlick 菲涅尔近似
vec3 fresnelSchlick(float cosTheta, vec3 F0) {
  return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
}

void main() {
  vec3 N = normalize(v_normal);
  vec3 V = normalize(u_viewPos - v_worldPos);
  
  float NdotV = max(dot(N, V), 0.0);
  
  // F0: 基础反射率
  // 非金属约 0.04, 金属使用材质颜色
  vec3 F0 = mix(vec3(0.04), u_baseColor, u_metallic);
  
  vec3 fresnel = fresnelSchlick(NdotV, F0);
  
  // 应用到高光
  vec3 specular = fresnel * spec;
}
```

### 环境反射菲涅尔

```glsl
uniform samplerCube u_envMap;

void main() {
  vec3 N = normalize(v_normal);
  vec3 V = normalize(u_viewPos - v_worldPos);
  vec3 R = reflect(-V, N);
  
  float NdotV = max(dot(N, V), 0.0);
  vec3 fresnel = fresnelSchlick(NdotV, vec3(0.04));
  
  // 环境反射
  vec3 envColor = texture(u_envMap, R).rgb;
  vec3 reflection = envColor * fresnel;
  
  // 混合
  vec3 result = diffuse * (1.0 - fresnel) + reflection;
  fragColor = vec4(result, 1.0);
}
```

## 各向异性高光

### 概念

```
┌─────────────────────────────────────────────────────────┐
│                各向异性高光                              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   各向同性（普通）       各向异性（拉丝金属）           │
│   ┌─────────────┐       ┌─────────────┐                │
│   │     ●       │       │   ═════     │                │
│   │             │       │             │                │
│   └─────────────┘       └─────────────┘                │
│   圆形高光               拉伸高光                       │
│                                                         │
│   材质: 毛发、拉丝金属、唱片等                          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 实现

```glsl
uniform vec3 u_tangent;  // 切线方向

float anisotropicSpec(vec3 N, vec3 H, vec3 T, float anisotropy) {
  vec3 B = cross(N, T);  // 副切线
  
  float NdotH = dot(N, H);
  float TdotH = dot(T, H);
  float BdotH = dot(B, H);
  
  float aspect = sqrt(1.0 - anisotropy * 0.9);
  float ax = max(0.001, u_roughness / aspect);
  float ay = max(0.001, u_roughness * aspect);
  
  float d = TdotH * TdotH / (ax * ax) + 
            BdotH * BdotH / (ay * ay) + 
            NdotH * NdotH;
  
  return 1.0 / (3.14159 * ax * ay * d * d);
}
```

## 多光源高光

### 累加处理

```glsl
vec3 calculateSpecular(vec3 lightDir, vec3 lightColor) {
  vec3 L = normalize(lightDir);
  vec3 H = normalize(L + V);
  
  float NdotH = max(dot(N, H), 0.0);
  float spec = pow(NdotH, u_shininess);
  
  return lightColor * u_specularColor * spec;
}

void main() {
  vec3 N = normalize(v_normal);
  vec3 V = normalize(u_viewPos - v_worldPos);
  
  vec3 totalSpecular = vec3(0.0);
  
  // 累加每个光源的高光
  for (int i = 0; i < u_numLights; i++) {
    totalSpecular += calculateSpecular(u_lights[i].direction, u_lights[i].color);
  }
  
  fragColor = vec4(ambient + diffuse + totalSpecular, 1.0);
}
```

## 本章小结

- 高光表现表面光泽度
- Phong: 使用反射向量 R 和观察向量 V
- Blinn-Phong: 使用半角向量 H，更高效
- shininess 控制高光锐利度
- 高光贴图可控制不同区域的光泽
- 金属高光颜色来自材质颜色
- 菲涅尔效应使边缘更反光
- 各向异性适用于毛发和拉丝金属

下一章，我们将学习完整的 Phong 光照模型。
