# Phong 光照模型

> "Phong 模型是经典光照的基石，简洁而有效。"

## 模型概述

### 三分量组合

```
┌─────────────────────────────────────────────────────────┐
│                    Phong 光照模型                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   最终颜色 = 环境光 + 漫反射 + 高光                     │
│                                                         │
│   ┌────────┐   ┌────────┐   ┌────────┐                 │
│   │ 环境光 │ + │ 漫反射 │ + │ 高光   │                 │
│   │  ░░░░  │   │  ▓▓▓░  │   │   ●    │                 │
│   │ 均匀   │   │ 渐变   │   │ 亮点   │                 │
│   └────────┘   └────────┘   └────────┘                 │
│      ↓             ↓             ↓                      │
│   Ka * Ia      Kd * Id       Ks * Is                   │
│      ↓             ↓             ↓                      │
│   ────────────────┬──────────────                      │
│                   ↓                                     │
│              最终颜色                                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 数学公式

```
I = Ia * Ka + Id * Kd * max(N·L, 0) + Is * Ks * max(R·V, 0)^n

其中:
Ia, Id, Is = 光源的环境、漫反射、高光强度
Ka, Kd, Ks = 材质的环境、漫反射、高光系数
N = 表面法向量
L = 光线方向
R = 反射方向
V = 观察方向
n = 光泽度
```

## 完整实现

### 顶点着色器

```glsl
#version 300 es

in vec3 a_position;
in vec3 a_normal;
in vec2 a_texCoord;

uniform mat4 u_model;
uniform mat4 u_view;
uniform mat4 u_projection;
uniform mat3 u_normalMatrix;

out vec3 v_worldPos;
out vec3 v_normal;
out vec2 v_texCoord;

void main() {
  vec4 worldPos = u_model * vec4(a_position, 1.0);
  v_worldPos = worldPos.xyz;
  v_normal = u_normalMatrix * a_normal;
  v_texCoord = a_texCoord;
  
  gl_Position = u_projection * u_view * worldPos;
}
```

### 片元着色器

```glsl
#version 300 es
precision highp float;

// 材质属性
struct Material {
  vec3 ambient;
  vec3 diffuse;
  vec3 specular;
  float shininess;
};

// 光源属性
struct Light {
  vec3 position;
  vec3 ambient;
  vec3 diffuse;
  vec3 specular;
};

uniform Material u_material;
uniform Light u_light;
uniform vec3 u_viewPos;

in vec3 v_worldPos;
in vec3 v_normal;
in vec2 v_texCoord;

out vec4 fragColor;

void main() {
  // 标准化向量
  vec3 N = normalize(v_normal);
  vec3 L = normalize(u_light.position - v_worldPos);
  vec3 V = normalize(u_viewPos - v_worldPos);
  vec3 R = reflect(-L, N);
  
  // 环境光
  vec3 ambient = u_light.ambient * u_material.ambient;
  
  // 漫反射
  float diff = max(dot(N, L), 0.0);
  vec3 diffuse = u_light.diffuse * (diff * u_material.diffuse);
  
  // 高光 (Phong)
  float spec = pow(max(dot(R, V), 0.0), u_material.shininess);
  vec3 specular = u_light.specular * (spec * u_material.specular);
  
  // 组合
  vec3 result = ambient + diffuse + specular;
  fragColor = vec4(result, 1.0);
}
```

## Blinn-Phong 变体

### 改进的高光计算

```glsl
void main() {
  vec3 N = normalize(v_normal);
  vec3 L = normalize(u_light.position - v_worldPos);
  vec3 V = normalize(u_viewPos - v_worldPos);
  
  // 半角向量替代反射向量
  vec3 H = normalize(L + V);
  
  // 环境光
  vec3 ambient = u_light.ambient * u_material.ambient;
  
  // 漫反射
  float diff = max(dot(N, L), 0.0);
  vec3 diffuse = u_light.diffuse * (diff * u_material.diffuse);
  
  // 高光 (Blinn-Phong)
  float spec = pow(max(dot(N, H), 0.0), u_material.shininess);
  vec3 specular = u_light.specular * (spec * u_material.specular);
  
  vec3 result = ambient + diffuse + specular;
  fragColor = vec4(result, 1.0);
}
```

## 多光源支持

### 光源结构

```glsl
#define MAX_LIGHTS 8

struct DirectionalLight {
  vec3 direction;
  vec3 ambient;
  vec3 diffuse;
  vec3 specular;
};

struct PointLight {
  vec3 position;
  vec3 ambient;
  vec3 diffuse;
  vec3 specular;
  float constant;
  float linear;
  float quadratic;
};

struct SpotLight {
  vec3 position;
  vec3 direction;
  vec3 ambient;
  vec3 diffuse;
  vec3 specular;
  float cutOff;
  float outerCutOff;
  float constant;
  float linear;
  float quadratic;
};
```

### 光源计算函数

```glsl
// 方向光
vec3 calcDirLight(DirectionalLight light, vec3 N, vec3 V) {
  vec3 L = normalize(-light.direction);
  vec3 H = normalize(L + V);
  
  // 漫反射
  float diff = max(dot(N, L), 0.0);
  
  // 高光
  float spec = pow(max(dot(N, H), 0.0), u_material.shininess);
  
  vec3 ambient = light.ambient * u_material.ambient;
  vec3 diffuse = light.diffuse * diff * u_material.diffuse;
  vec3 specular = light.specular * spec * u_material.specular;
  
  return ambient + diffuse + specular;
}

// 点光源
vec3 calcPointLight(PointLight light, vec3 N, vec3 fragPos, vec3 V) {
  vec3 L = normalize(light.position - fragPos);
  vec3 H = normalize(L + V);
  
  // 衰减
  float distance = length(light.position - fragPos);
  float attenuation = 1.0 / (light.constant + 
                             light.linear * distance + 
                             light.quadratic * distance * distance);
  
  // 漫反射
  float diff = max(dot(N, L), 0.0);
  
  // 高光
  float spec = pow(max(dot(N, H), 0.0), u_material.shininess);
  
  vec3 ambient = light.ambient * u_material.ambient;
  vec3 diffuse = light.diffuse * diff * u_material.diffuse;
  vec3 specular = light.specular * spec * u_material.specular;
  
  return (ambient + diffuse + specular) * attenuation;
}

// 聚光灯
vec3 calcSpotLight(SpotLight light, vec3 N, vec3 fragPos, vec3 V) {
  vec3 L = normalize(light.position - fragPos);
  vec3 H = normalize(L + V);
  
  // 衰减
  float distance = length(light.position - fragPos);
  float attenuation = 1.0 / (light.constant + 
                             light.linear * distance + 
                             light.quadratic * distance * distance);
  
  // 聚光锥
  float theta = dot(L, normalize(-light.direction));
  float epsilon = light.cutOff - light.outerCutOff;
  float intensity = clamp((theta - light.outerCutOff) / epsilon, 0.0, 1.0);
  
  // 漫反射
  float diff = max(dot(N, L), 0.0);
  
  // 高光
  float spec = pow(max(dot(N, H), 0.0), u_material.shininess);
  
  vec3 ambient = light.ambient * u_material.ambient;
  vec3 diffuse = light.diffuse * diff * u_material.diffuse;
  vec3 specular = light.specular * spec * u_material.specular;
  
  return (ambient + diffuse + specular) * attenuation * intensity;
}
```

### 组合多光源

```glsl
uniform DirectionalLight u_dirLight;
uniform PointLight u_pointLights[MAX_LIGHTS];
uniform int u_numPointLights;
uniform SpotLight u_spotLight;

void main() {
  vec3 N = normalize(v_normal);
  vec3 V = normalize(u_viewPos - v_worldPos);
  
  // 方向光
  vec3 result = calcDirLight(u_dirLight, N, V);
  
  // 点光源
  for (int i = 0; i < u_numPointLights; i++) {
    result += calcPointLight(u_pointLights[i], N, v_worldPos, V);
  }
  
  // 聚光灯
  result += calcSpotLight(u_spotLight, N, v_worldPos, V);
  
  fragColor = vec4(result, 1.0);
}
```

## 纹理材质

### 使用贴图

```glsl
uniform sampler2D u_diffuseMap;
uniform sampler2D u_specularMap;

void main() {
  vec3 N = normalize(v_normal);
  vec3 L = normalize(u_light.position - v_worldPos);
  vec3 V = normalize(u_viewPos - v_worldPos);
  vec3 H = normalize(L + V);
  
  // 从贴图获取材质属性
  vec3 diffuseColor = texture(u_diffuseMap, v_texCoord).rgb;
  float specularStrength = texture(u_specularMap, v_texCoord).r;
  
  // 环境光
  vec3 ambient = u_light.ambient * diffuseColor * 0.1;
  
  // 漫反射
  float diff = max(dot(N, L), 0.0);
  vec3 diffuse = u_light.diffuse * diff * diffuseColor;
  
  // 高光
  float spec = pow(max(dot(N, H), 0.0), u_shininess);
  vec3 specular = u_light.specular * spec * specularStrength;
  
  fragColor = vec4(ambient + diffuse + specular, 1.0);
}
```

## JavaScript 实现

### 材质类

```javascript
class Material {
  constructor() {
    this.ambient = [0.1, 0.1, 0.1];
    this.diffuse = [0.8, 0.8, 0.8];
    this.specular = [1.0, 1.0, 1.0];
    this.shininess = 32.0;
  }
  
  setUniforms(gl, program) {
    gl.uniform3fv(gl.getUniformLocation(program, 'u_material.ambient'), this.ambient);
    gl.uniform3fv(gl.getUniformLocation(program, 'u_material.diffuse'), this.diffuse);
    gl.uniform3fv(gl.getUniformLocation(program, 'u_material.specular'), this.specular);
    gl.uniform1f(gl.getUniformLocation(program, 'u_material.shininess'), this.shininess);
  }
}

// 预设材质
const Materials = {
  Gold: {
    ambient: [0.24725, 0.1995, 0.0745],
    diffuse: [0.75164, 0.60648, 0.22648],
    specular: [0.628281, 0.555802, 0.366065],
    shininess: 51.2
  },
  Silver: {
    ambient: [0.19225, 0.19225, 0.19225],
    diffuse: [0.50754, 0.50754, 0.50754],
    specular: [0.508273, 0.508273, 0.508273],
    shininess: 51.2
  },
  Jade: {
    ambient: [0.135, 0.2225, 0.1575],
    diffuse: [0.54, 0.89, 0.63],
    specular: [0.316228, 0.316228, 0.316228],
    shininess: 12.8
  }
};
```

### 光源类

```javascript
class PointLight {
  constructor(position) {
    this.position = position;
    this.ambient = [0.1, 0.1, 0.1];
    this.diffuse = [1.0, 1.0, 1.0];
    this.specular = [1.0, 1.0, 1.0];
    this.constant = 1.0;
    this.linear = 0.09;
    this.quadratic = 0.032;
  }
  
  setUniforms(gl, program, index) {
    const prefix = `u_pointLights[${index}]`;
    gl.uniform3fv(gl.getUniformLocation(program, `${prefix}.position`), this.position);
    gl.uniform3fv(gl.getUniformLocation(program, `${prefix}.ambient`), this.ambient);
    gl.uniform3fv(gl.getUniformLocation(program, `${prefix}.diffuse`), this.diffuse);
    gl.uniform3fv(gl.getUniformLocation(program, `${prefix}.specular`), this.specular);
    gl.uniform1f(gl.getUniformLocation(program, `${prefix}.constant`), this.constant);
    gl.uniform1f(gl.getUniformLocation(program, `${prefix}.linear`), this.linear);
    gl.uniform1f(gl.getUniformLocation(program, `${prefix}.quadratic`), this.quadratic);
  }
}
```

## 渲染循环

### 完整示例

```javascript
function render() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
  gl.useProgram(program);
  
  // 设置矩阵
  gl.uniformMatrix4fv(u_model, false, modelMatrix);
  gl.uniformMatrix4fv(u_view, false, viewMatrix);
  gl.uniformMatrix4fv(u_projection, false, projectionMatrix);
  gl.uniformMatrix3fv(u_normalMatrix, false, normalMatrix);
  
  // 设置相机位置
  gl.uniform3fv(u_viewPos, camera.position);
  
  // 设置材质
  material.setUniforms(gl, program);
  
  // 设置光源
  for (let i = 0; i < pointLights.length; i++) {
    pointLights[i].setUniforms(gl, program, i);
  }
  gl.uniform1i(u_numPointLights, pointLights.length);
  
  // 绑定纹理
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, diffuseMap);
  gl.uniform1i(u_diffuseMap, 0);
  
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, specularMap);
  gl.uniform1i(u_specularMap, 1);
  
  // 绘制
  gl.bindVertexArray(vao);
  gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_SHORT, 0);
  
  requestAnimationFrame(render);
}
```

## 调试技巧

### 分别显示各分量

```glsl
// 调试模式
uniform int u_debugMode;

void main() {
  // ... 计算 ambient, diffuse, specular ...
  
  if (u_debugMode == 1) {
    fragColor = vec4(ambient, 1.0);  // 只显示环境光
  } else if (u_debugMode == 2) {
    fragColor = vec4(diffuse, 1.0);  // 只显示漫反射
  } else if (u_debugMode == 3) {
    fragColor = vec4(specular, 1.0); // 只显示高光
  } else if (u_debugMode == 4) {
    fragColor = vec4(N * 0.5 + 0.5, 1.0); // 显示法向量
  } else {
    fragColor = vec4(ambient + diffuse + specular, 1.0);
  }
}
```

## 本章小结

- Phong 模型 = 环境光 + 漫反射 + 高光
- Blinn-Phong 使用半角向量，更高效
- 多光源需要累加各光源贡献
- 不同光源类型有不同的计算方式
- 纹理可以控制材质的空间变化
- 调试时可分别查看各分量

下一章，我们将学习法线贴图技术。
