# 顶点处理阶段

> "顶点是 3D 图形的基本构建单元。"

## 顶点处理概述

### 什么是顶点处理

顶点处理阶段负责将模型空间的顶点数据转换到裁剪空间，同时计算每个顶点所需的属性。

```
┌─────────────────────────────────────────────────────────┐
│                    顶点处理阶段                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  输入                    处理                    输出    │
│  ─────                  ─────                  ─────   │
│  位置                   坐标变换              裁剪坐标   │
│  法线         →        法线变换       →       变换法线  │
│  UV                    直接传递              UV坐标    │
│  颜色                   光照计算              颜色      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 顶点数据输入

### Attribute 变量

```glsl
#version 300 es

// 顶点属性输入
in vec3 a_position;    // 位置
in vec3 a_normal;      // 法线
in vec2 a_texCoord;    // 纹理坐标
in vec4 a_color;       // 顶点颜色
in vec4 a_tangent;     // 切线（法线贴图用）
in vec4 a_boneWeights; // 骨骼权重
in ivec4 a_boneIds;    // 骨骼索引
```

### JavaScript 端设置

```javascript
// 获取属性位置
const posLoc = gl.getAttribLocation(program, 'a_position');
const normLoc = gl.getAttribLocation(program, 'a_normal');
const uvLoc = gl.getAttribLocation(program, 'a_texCoord');

// 设置顶点属性指针
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(posLoc);

gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
gl.vertexAttribPointer(normLoc, 3, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(normLoc);

gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(uvLoc);
```

## 坐标变换

### 变换矩阵层级

```
模型坐标 ─────→ 世界坐标 ─────→ 观察坐标 ─────→ 裁剪坐标
          Model           View            Projection
          矩阵            矩阵             矩阵
```

### 模型矩阵（Model Matrix）

将模型从局部空间变换到世界空间：

```javascript
// 构建模型矩阵
function createModelMatrix(position, rotation, scale) {
  const mat = mat4.create();
  
  // 平移
  mat4.translate(mat, mat, position);
  
  // 旋转 (X, Y, Z)
  mat4.rotateX(mat, mat, rotation[0]);
  mat4.rotateY(mat, mat, rotation[1]);
  mat4.rotateZ(mat, mat, rotation[2]);
  
  // 缩放
  mat4.scale(mat, mat, scale);
  
  return mat;
}
```

### 视图矩阵（View Matrix）

将世界空间变换到相机空间：

```javascript
// 使用 lookAt 构建视图矩阵
function createViewMatrix(eye, target, up) {
  const mat = mat4.create();
  mat4.lookAt(mat, eye, target, up);
  return mat;
}

// 示例
const eye = [0, 5, 10];      // 相机位置
const target = [0, 0, 0];    // 看向的点
const up = [0, 1, 0];        // 上方向
const viewMatrix = createViewMatrix(eye, target, up);
```

### 投影矩阵（Projection Matrix）

将观察空间变换到裁剪空间：

```javascript
// 透视投影
function createPerspectiveMatrix(fov, aspect, near, far) {
  const mat = mat4.create();
  mat4.perspective(mat, fov, aspect, near, far);
  return mat;
}

// 正交投影
function createOrthographicMatrix(left, right, bottom, top, near, far) {
  const mat = mat4.create();
  mat4.ortho(mat, left, right, bottom, top, near, far);
  return mat;
}
```

### 完整顶点着色器

```glsl
#version 300 es

in vec3 a_position;
in vec3 a_normal;
in vec2 a_texCoord;

uniform mat4 u_modelMatrix;
uniform mat4 u_viewMatrix;
uniform mat4 u_projectionMatrix;
uniform mat3 u_normalMatrix;

out vec3 v_worldPos;
out vec3 v_normal;
out vec2 v_texCoord;

void main() {
  // 世界坐标
  vec4 worldPos = u_modelMatrix * vec4(a_position, 1.0);
  v_worldPos = worldPos.xyz;
  
  // 法线变换（使用法线矩阵）
  v_normal = u_normalMatrix * a_normal;
  
  // 纹理坐标直接传递
  v_texCoord = a_texCoord;
  
  // 最终裁剪坐标
  gl_Position = u_projectionMatrix * u_viewMatrix * worldPos;
}
```

## 法线变换

### 为什么需要法线矩阵

法线不能直接使用模型矩阵变换，因为非均匀缩放会导致法线错误：

```
正确变换                   错误变换（直接使用模型矩阵）
    ↑ 法线                      ↗ 法线
    │                          /
────┼────                 ────/────
    表面                      表面（被缩放）
```

### 法线矩阵计算

法线矩阵 = 模型矩阵逆转置的左上 3x3 部分

```javascript
// 计算法线矩阵
function calculateNormalMatrix(modelMatrix) {
  const normalMatrix = mat3.create();
  mat3.normalFromMat4(normalMatrix, modelMatrix);
  return normalMatrix;
}

// 上传到着色器
gl.uniformMatrix3fv(u_normalMatrix, false, normalMatrix);
```

### GLSL 中使用

```glsl
uniform mat3 u_normalMatrix;

in vec3 a_normal;
out vec3 v_normal;

void main() {
  // 变换法线并归一化
  v_normal = normalize(u_normalMatrix * a_normal);
  // ...
}
```

## 顶点动画

### 形变动画（Morph Target）

```glsl
#version 300 es

// 基础形状
in vec3 a_position;

// 形变目标
in vec3 a_morphTarget1;
in vec3 a_morphTarget2;

// 形变权重
uniform float u_morphWeight1;
uniform float u_morphWeight2;

void main() {
  // 混合形状
  vec3 morphedPos = a_position;
  morphedPos += (a_morphTarget1 - a_position) * u_morphWeight1;
  morphedPos += (a_morphTarget2 - a_position) * u_morphWeight2;
  
  gl_Position = u_mvpMatrix * vec4(morphedPos, 1.0);
}
```

### 骨骼动画（Skeletal Animation）

```glsl
#version 300 es

// 顶点属性
in vec3 a_position;
in vec3 a_normal;
in ivec4 a_boneIds;     // 影响此顶点的骨骼索引
in vec4 a_boneWeights;  // 对应的权重

// 骨骼变换矩阵数组
uniform mat4 u_boneMatrices[64];
uniform mat4 u_mvpMatrix;
uniform mat3 u_normalMatrix;

out vec3 v_normal;

void main() {
  // 计算蒙皮矩阵
  mat4 skinMatrix = 
    u_boneMatrices[a_boneIds.x] * a_boneWeights.x +
    u_boneMatrices[a_boneIds.y] * a_boneWeights.y +
    u_boneMatrices[a_boneIds.z] * a_boneWeights.z +
    u_boneMatrices[a_boneIds.w] * a_boneWeights.w;
  
  // 应用蒙皮
  vec4 skinnedPos = skinMatrix * vec4(a_position, 1.0);
  vec3 skinnedNormal = mat3(skinMatrix) * a_normal;
  
  // 变换法线
  v_normal = normalize(u_normalMatrix * skinnedNormal);
  
  // 输出裁剪坐标
  gl_Position = u_mvpMatrix * skinnedPos;
}
```

### 顶点位移动画

```glsl
#version 300 es

in vec3 a_position;
in vec3 a_normal;

uniform float u_time;
uniform mat4 u_mvpMatrix;

void main() {
  vec3 pos = a_position;
  
  // 波浪效果
  float wave = sin(pos.x * 2.0 + u_time) * 0.1;
  pos.y += wave;
  
  gl_Position = u_mvpMatrix * vec4(pos, 1.0);
}
```

## 内置变量

### gl_Position

必须输出的裁剪空间坐标：

```glsl
void main() {
  // 必须设置 gl_Position
  gl_Position = u_mvpMatrix * vec4(a_position, 1.0);
}
```

### gl_PointSize

点图元的大小（像素）：

```glsl
void main() {
  gl_Position = u_mvpMatrix * vec4(a_position, 1.0);
  
  // 设置点大小
  gl_PointSize = 10.0;
  
  // 可以根据距离调整大小
  float dist = length((u_viewMatrix * u_modelMatrix * vec4(a_position, 1.0)).xyz);
  gl_PointSize = 100.0 / dist;
}
```

### gl_VertexID

当前顶点的索引：

```glsl
void main() {
  // 可以用于程序化生成顶点
  float angle = float(gl_VertexID) * 0.1;
  vec3 pos = vec3(cos(angle), sin(angle), 0.0);
  gl_Position = u_mvpMatrix * vec4(pos, 1.0);
}
```

### gl_InstanceID

当前实例的索引（实例化渲染）：

```glsl
uniform mat4 u_instanceMatrices[100];

void main() {
  // 使用实例矩阵
  mat4 instanceMatrix = u_instanceMatrices[gl_InstanceID];
  gl_Position = u_projMatrix * u_viewMatrix * instanceMatrix * vec4(a_position, 1.0);
}
```

## 顶点处理优化

### 减少属性数量

```glsl
// 优化前：独立的法线和切线
in vec3 a_normal;
in vec3 a_tangent;
in vec3 a_bitangent;  // 12 floats

// 优化后：计算副切线
in vec3 a_normal;
in vec4 a_tangent;  // w 存储副切线方向

void main() {
  vec3 bitangent = cross(a_normal, a_tangent.xyz) * a_tangent.w;
  // 7 floats + 运行时计算
}
```

### 压缩顶点数据

```javascript
// 使用半精度浮点数（需要扩展）
const ext = gl.getExtension('OES_vertex_half_float');

// 使用归一化整数
gl.vertexAttribPointer(
  normalLoc, 4, gl.BYTE,
  true,  // 归一化：将 [-128, 127] 映射到 [-1, 1]
  stride, offset
);
```

### 顶点缓存友好

```
// 优化前：随机顺序的索引
indices: [0, 5, 100, 3, 99, 50, ...]

// 优化后：优化后的索引顺序
indices: [0, 1, 2, 2, 1, 3, ...]  // 利用 GPU 顶点缓存
```

## 本章小结

- 顶点处理阶段负责坐标变换和属性计算
- 模型-视图-投影矩阵将顶点变换到裁剪空间
- 法线需要使用法线矩阵（模型矩阵的逆转置）变换
- 骨骼动画在顶点着色器中实现蒙皮
- gl_Position 是必须输出的内置变量
- 可以通过压缩数据和优化索引顺序提升性能

下一章，我们将学习图元装配与光栅化阶段。
