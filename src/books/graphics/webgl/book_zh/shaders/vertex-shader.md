# 顶点着色器详解

> "顶点着色器是渲染管线的入口，决定了每个顶点的最终位置。"

## 顶点着色器的角色

### 主要职责

```
┌─────────────────────────────────────────────┐
│              顶点着色器职责                  │
├─────────────────────────────────────────────┤
│                                             │
│  1. 坐标变换：模型空间 → 裁剪空间            │
│  2. 属性传递：传递数据给片元着色器           │
│  3. 顶点计算：法线变换、骨骼动画等           │
│  4. 特效计算：顶点位移、变形等               │
│                                             │
└─────────────────────────────────────────────┘
```

### 执行时机

```
顶点数据
    │
    ▼
┌─────────────────┐
│  顶点着色器     │ ← 每个顶点执行一次
│  (Vertex Shader)│
└────────┬────────┘
         │
         ▼
    裁剪坐标
```

## 输入与输出

### 输入类型

```glsl
#version 300 es

// Attribute：每顶点数据
in vec3 a_position;      // 位置
in vec3 a_normal;        // 法线
in vec2 a_texCoord;      // 纹理坐标
in vec4 a_color;         // 顶点颜色
in vec4 a_tangent;       // 切线
in vec4 a_boneWeights;   // 骨骼权重
in ivec4 a_boneIndices;  // 骨骼索引

// Uniform：全局数据
uniform mat4 u_modelMatrix;
uniform mat4 u_viewMatrix;
uniform mat4 u_projectionMatrix;
uniform mat4 u_normalMatrix;
uniform float u_time;
```

### 输出类型

```glsl
// 传递给片元着色器
out vec3 v_position;     // 世界空间位置
out vec3 v_normal;       // 世界空间法线
out vec2 v_texCoord;     // 纹理坐标
out vec4 v_color;        // 颜色

// 内置输出
// gl_Position - 必须设置的裁剪空间位置
// gl_PointSize - 点大小（绘制点时）
```

## 坐标变换

### 标准变换

```glsl
void main() {
  // 计算世界坐标
  vec4 worldPosition = u_modelMatrix * vec4(a_position, 1.0);
  
  // 计算观察坐标
  vec4 viewPosition = u_viewMatrix * worldPosition;
  
  // 计算裁剪坐标
  vec4 clipPosition = u_projectionMatrix * viewPosition;
  
  // 输出位置（必须）
  gl_Position = clipPosition;
  
  // 或者一步到位
  // gl_Position = u_projectionMatrix * u_viewMatrix * u_modelMatrix * vec4(a_position, 1.0);
}
```

### 使用 MVP 矩阵

```glsl
uniform mat4 u_mvpMatrix;  // 预计算的 MVP 矩阵

void main() {
  gl_Position = u_mvpMatrix * vec4(a_position, 1.0);
}
```

### 法线变换

法线不能直接用模型矩阵变换，需要使用法线矩阵（模型矩阵的逆转置）：

```glsl
uniform mat3 u_normalMatrix;  // (modelMatrix^-1)^T 的左上 3x3

void main() {
  // 正确的法线变换
  v_normal = normalize(u_normalMatrix * a_normal);
  
  // 如果只有均匀缩放，可以简化为
  // v_normal = normalize(mat3(u_modelMatrix) * a_normal);
  
  gl_Position = u_mvpMatrix * vec4(a_position, 1.0);
}
```

## 常见应用

### 顶点位移

```glsl
uniform float u_time;
uniform float u_amplitude;
uniform float u_frequency;

void main() {
  vec3 pos = a_position;
  
  // 正弦波位移
  pos.y += sin(pos.x * u_frequency + u_time) * u_amplitude;
  
  gl_Position = u_mvpMatrix * vec4(pos, 1.0);
}
```

### 广告牌效果

```glsl
// 让物体始终面向相机
void main() {
  // 获取视图矩阵的右向量和上向量
  vec3 right = vec3(u_viewMatrix[0][0], u_viewMatrix[1][0], u_viewMatrix[2][0]);
  vec3 up = vec3(u_viewMatrix[0][1], u_viewMatrix[1][1], u_viewMatrix[2][1]);
  
  // 计算广告牌位置
  vec3 pos = u_center + right * a_position.x * u_scale + up * a_position.y * u_scale;
  
  gl_Position = u_projectionMatrix * u_viewMatrix * vec4(pos, 1.0);
}
```

### 骨骼动画

```glsl
uniform mat4 u_boneMatrices[64];

void main() {
  // 混合骨骼变换
  mat4 boneTransform = 
    u_boneMatrices[a_boneIndices[0]] * a_boneWeights[0] +
    u_boneMatrices[a_boneIndices[1]] * a_boneWeights[1] +
    u_boneMatrices[a_boneIndices[2]] * a_boneWeights[2] +
    u_boneMatrices[a_boneIndices[3]] * a_boneWeights[3];
  
  // 应用骨骼变换
  vec4 skinnedPosition = boneTransform * vec4(a_position, 1.0);
  vec3 skinnedNormal = mat3(boneTransform) * a_normal;
  
  gl_Position = u_mvpMatrix * skinnedPosition;
  v_normal = normalize(u_normalMatrix * skinnedNormal);
}
```

### 实例化渲染

```glsl
// 使用 gl_InstanceID 获取实例索引
uniform mat4 u_instanceMatrices[100];

void main() {
  mat4 instanceMatrix = u_instanceMatrices[gl_InstanceID];
  gl_Position = u_vpMatrix * instanceMatrix * vec4(a_position, 1.0);
}

// 或使用实例化属性
in mat4 a_instanceMatrix;  // 每实例不同

void main() {
  gl_Position = u_vpMatrix * a_instanceMatrix * vec4(a_position, 1.0);
}
```

## 数据传递

### varying 插值

```glsl
// 顶点着色器
out vec2 v_texCoord;
out vec3 v_normal;
out vec3 v_worldPos;

void main() {
  v_texCoord = a_texCoord;
  v_normal = normalize(u_normalMatrix * a_normal);
  v_worldPos = (u_modelMatrix * vec4(a_position, 1.0)).xyz;
  
  gl_Position = u_mvpMatrix * vec4(a_position, 1.0);
}
```

### flat 修饰符

```glsl
// 禁用插值，使用最后一个顶点的值
flat out int v_instanceID;
flat out vec3 v_flatNormal;

void main() {
  v_instanceID = gl_InstanceID;
  v_flatNormal = a_normal;
  // ...
}
```

## 优化技巧

### 减少计算

```glsl
// 不好：在着色器中计算不变的值
mat4 mvp = u_projectionMatrix * u_viewMatrix * u_modelMatrix;

// 好：在 CPU 预计算 MVP 矩阵
uniform mat4 u_mvpMatrix;
```

### 合理使用精度

```glsl
// 位置使用高精度
highp vec4 position = u_mvpMatrix * vec4(a_position, 1.0);

// 纹理坐标可以使用中精度
mediump vec2 texCoord = a_texCoord;
```

### 避免不必要的归一化

```glsl
// 只在需要时归一化
v_normal = u_normalMatrix * a_normal;  // 传递未归一化的

// 在片元着色器中归一化
// vec3 normal = normalize(v_normal);
```

## 调试技巧

### 可视化输出

```glsl
// 在片元着色器中可视化顶点着色器的输出
// 可视化法线
fragColor = vec4(v_normal * 0.5 + 0.5, 1.0);

// 可视化纹理坐标
fragColor = vec4(v_texCoord, 0.0, 1.0);

// 可视化深度
fragColor = vec4(vec3(gl_FragCoord.z), 1.0);
```

## 本章小结

- 顶点着色器处理每个顶点，输出裁剪空间位置
- 必须设置 `gl_Position`
- 法线变换需要使用法线矩阵
- varying 变量会在片元之间自动插值
- 骨骼动画、实例化渲染等高级技术都在顶点着色器中实现

下一章，我们将详细学习片元着色器。
