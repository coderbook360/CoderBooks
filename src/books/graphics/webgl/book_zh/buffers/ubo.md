# Uniform Buffer Object (UBO)

> "UBO 是高效管理大量 Uniform 数据的现代方式。"

## UBO 概述

### 什么是 UBO

Uniform Buffer Object 允许将 uniform 数据存储在 GPU 缓冲中，提供更高效的数据传输和程序间共享。

```
┌─────────────────────────────────────────────────────────┐
│                    UBO vs 传统 Uniform                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  传统方式:                                              │
│  ┌─────────┐                                           │
│  │ Program │ ← uniform1f, uniform3fv, uniformMatrix... │
│  └─────────┘   (多次 API 调用)                         │
│                                                         │
│  UBO 方式:                                              │
│  ┌─────────┐      ┌─────────┐                          │
│  │   UBO   │ ───→ │ Program │                          │
│  └─────────┘      └─────────┘                          │
│       │                                                 │
│       └──────────→ │ Program │                          │
│                    └─────────┘                          │
│   (一次缓冲更新，多程序共享)                             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### UBO 优势

| 方面 | 传统 Uniform | UBO |
|------|-------------|-----|
| API 调用 | 每个 uniform 一次 | 一次缓冲更新 |
| 程序间共享 | 不支持 | 支持 |
| 最大数据量 | 较小 | 较大 |
| 更新灵活性 | 单个更新 | 批量更新 |

## 定义 Uniform 块

### 着色器定义

```glsl
#version 300 es

// 使用 std140 布局（最常用，跨平台兼容）
layout(std140) uniform Matrices {
  mat4 u_modelMatrix;
  mat4 u_viewMatrix;
  mat4 u_projectionMatrix;
  mat3 u_normalMatrix;
};

layout(std140) uniform Lights {
  vec4 u_lightPositions[4];
  vec4 u_lightColors[4];
  int u_lightCount;
};

layout(std140) uniform Material {
  vec4 u_diffuseColor;
  vec4 u_specularColor;
  float u_shininess;
  float u_opacity;
};
```

### 块布局限定符

```glsl
// std140：标准布局，跨平台兼容
layout(std140) uniform Block1 { ... };

// shared：允许驱动优化，需要查询偏移
layout(shared) uniform Block2 { ... };

// packed：最紧凑，需要查询偏移，不保证跨程序兼容
layout(packed) uniform Block3 { ... };
```

## 创建 UBO

### 基本创建流程

```javascript
// 1. 创建缓冲
const ubo = gl.createBuffer();
gl.bindBuffer(gl.UNIFORM_BUFFER, ubo);

// 2. 分配空间
const bufferSize = 256;  // 字节
gl.bufferData(gl.UNIFORM_BUFFER, bufferSize, gl.DYNAMIC_DRAW);

// 3. 获取 uniform 块索引
const blockIndex = gl.getUniformBlockIndex(program, 'Matrices');

// 4. 设置块绑定点
const bindingPoint = 0;
gl.uniformBlockBinding(program, blockIndex, bindingPoint);

// 5. 将 UBO 绑定到绑定点
gl.bindBufferBase(gl.UNIFORM_BUFFER, bindingPoint, ubo);
```

### 动态查询块大小

```javascript
// 查询块所需的大小
const blockSize = gl.getActiveUniformBlockParameter(
  program, 
  blockIndex, 
  gl.UNIFORM_BLOCK_DATA_SIZE
);

console.log('Block size:', blockSize);

// 根据实际大小分配
gl.bufferData(gl.UNIFORM_BUFFER, blockSize, gl.DYNAMIC_DRAW);
```

## std140 布局规则

### 基本规则

```
┌─────────────────────────────────────────────────────────┐
│                    std140 对齐规则                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  类型              基础对齐    大小                     │
│  ─────────────────────────────────────────────────────  │
│  float             4           4                        │
│  int               4           4                        │
│  bool              4           4                        │
│  vec2              8           8                        │
│  vec3              16          12                       │
│  vec4              16          16                       │
│  mat3              16          48 (3×16)                │
│  mat4              16          64 (4×16)                │
│  数组元素          16          元素大小取整到16         │
│  结构体            最大成员    成员大小之和             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 布局计算示例

```glsl
layout(std140) uniform Example {
  float a;      // 偏移 0, 大小 4
  // 填充 4 字节 (vec2 需要 8 对齐)
  vec2 b;       // 偏移 8, 大小 8
  vec3 c;       // 偏移 16, 大小 12 (vec3 需要 16 对齐)
  // 填充 4 字节
  float d;      // 偏移 32, 大小 4
  // 填充 12 字节 (mat4 需要 16 对齐)
  mat4 e;       // 偏移 48, 大小 64
  float f[3];   // 偏移 112, 大小 48 (每元素 16 对齐)
};
// 总大小: 160 字节
```

### JavaScript 端数据准备

```javascript
// 手动计算偏移
function createExampleBuffer() {
  const buffer = new ArrayBuffer(160);
  const f32 = new Float32Array(buffer);
  
  // float a at offset 0
  f32[0] = 1.0;
  
  // vec2 b at offset 8 (index 2)
  f32[2] = 2.0;
  f32[3] = 3.0;
  
  // vec3 c at offset 16 (index 4)
  f32[4] = 4.0;
  f32[5] = 5.0;
  f32[6] = 6.0;
  
  // float d at offset 32 (index 8)
  f32[8] = 7.0;
  
  // mat4 e at offset 48 (index 12)
  const identity = [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  ];
  f32.set(identity, 12);
  
  // float f[3] at offset 112 (index 28)
  // 每个元素占 16 字节（4 个 float）
  f32[28] = 8.0;   // f[0]
  f32[32] = 9.0;   // f[1]
  f32[36] = 10.0;  // f[2]
  
  return buffer;
}
```

## 更新 UBO 数据

### 完整更新

```javascript
gl.bindBuffer(gl.UNIFORM_BUFFER, ubo);

const data = new Float32Array([...]);
gl.bufferData(gl.UNIFORM_BUFFER, data, gl.DYNAMIC_DRAW);
```

### 部分更新

```javascript
gl.bindBuffer(gl.UNIFORM_BUFFER, ubo);

// 更新特定偏移的数据
const viewMatrix = new Float32Array(16);
gl.bufferSubData(gl.UNIFORM_BUFFER, 64, viewMatrix);  // 偏移 64 字节
```

### 使用 TypedArray 视图

```javascript
// 创建主缓冲
const bufferData = new ArrayBuffer(256);
const f32View = new Float32Array(bufferData);

// 创建子视图
const modelMatrix = new Float32Array(bufferData, 0, 16);
const viewMatrix = new Float32Array(bufferData, 64, 16);
const projMatrix = new Float32Array(bufferData, 128, 16);

// 更新并上传
mat4.perspective(projMatrix, fov, aspect, near, far);
mat4.lookAt(viewMatrix, eye, target, up);

gl.bindBuffer(gl.UNIFORM_BUFFER, ubo);
gl.bufferSubData(gl.UNIFORM_BUFFER, 0, bufferData);
```

## 绑定点管理

### 绑定点范围

```javascript
// 获取最大绑定点数
const maxBindings = gl.getParameter(gl.MAX_UNIFORM_BUFFER_BINDINGS);
console.log('Max UBO bindings:', maxBindings);  // 通常 24-84
```

### 绑定点分配策略

```javascript
// 定义绑定点常量
const BINDING_MATRICES = 0;
const BINDING_LIGHTS = 1;
const BINDING_MATERIAL = 2;
const BINDING_CAMERA = 3;

// 绑定 UBO 到固定点
gl.bindBufferBase(gl.UNIFORM_BUFFER, BINDING_MATRICES, matricesUBO);
gl.bindBufferBase(gl.UNIFORM_BUFFER, BINDING_LIGHTS, lightsUBO);
gl.bindBufferBase(gl.UNIFORM_BUFFER, BINDING_MATERIAL, materialUBO);
```

### 范围绑定

```javascript
// 绑定缓冲的一部分
gl.bindBufferRange(
  gl.UNIFORM_BUFFER,
  bindingPoint,
  ubo,
  offset,    // 必须是 UNIFORM_BUFFER_OFFSET_ALIGNMENT 的倍数
  size
);

// 获取对齐要求
const alignment = gl.getParameter(gl.UNIFORM_BUFFER_OFFSET_ALIGNMENT);
console.log('UBO offset alignment:', alignment);  // 通常 256
```

## 程序间共享

### 共享 UBO

```javascript
// 创建共享的 Matrices UBO
const matricesUBO = gl.createBuffer();
gl.bindBuffer(gl.UNIFORM_BUFFER, matricesUBO);
gl.bufferData(gl.UNIFORM_BUFFER, 192, gl.DYNAMIC_DRAW);
gl.bindBufferBase(gl.UNIFORM_BUFFER, BINDING_MATRICES, matricesUBO);

// 程序 A
const blockA = gl.getUniformBlockIndex(programA, 'Matrices');
gl.uniformBlockBinding(programA, blockA, BINDING_MATRICES);

// 程序 B
const blockB = gl.getUniformBlockIndex(programB, 'Matrices');
gl.uniformBlockBinding(programB, blockB, BINDING_MATRICES);

// 程序 C
const blockC = gl.getUniformBlockIndex(programC, 'Matrices');
gl.uniformBlockBinding(programC, blockC, BINDING_MATRICES);

// 更新一次，三个程序都能使用
gl.bindBuffer(gl.UNIFORM_BUFFER, matricesUBO);
gl.bufferSubData(gl.UNIFORM_BUFFER, 0, viewProjectionData);
```

### 实际应用示例

```javascript
class UBOManager {
  constructor(gl) {
    this.gl = gl;
    this.ubos = {};
    this.nextBinding = 0;
  }
  
  create(name, size) {
    const ubo = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, ubo);
    this.gl.bufferData(this.gl.UNIFORM_BUFFER, size, this.gl.DYNAMIC_DRAW);
    
    const binding = this.nextBinding++;
    this.gl.bindBufferBase(this.gl.UNIFORM_BUFFER, binding, ubo);
    
    this.ubos[name] = { buffer: ubo, binding, size };
    return binding;
  }
  
  bind(program, blockName, uboName) {
    const ubo = this.ubos[uboName];
    const blockIndex = this.gl.getUniformBlockIndex(program, blockName);
    this.gl.uniformBlockBinding(program, blockIndex, ubo.binding);
  }
  
  update(name, data, offset = 0) {
    const ubo = this.ubos[name];
    this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, ubo.buffer);
    this.gl.bufferSubData(this.gl.UNIFORM_BUFFER, offset, data);
  }
}

// 使用
const uboManager = new UBOManager(gl);
uboManager.create('camera', 144);
uboManager.create('lights', 256);

uboManager.bind(phongProgram, 'Camera', 'camera');
uboManager.bind(pbrProgram, 'Camera', 'camera');

uboManager.update('camera', cameraData);
```

## 查询 Uniform 块信息

### 块信息

```javascript
const blockIndex = gl.getUniformBlockIndex(program, 'Matrices');

// 块大小
const size = gl.getActiveUniformBlockParameter(
  program, blockIndex, gl.UNIFORM_BLOCK_DATA_SIZE
);

// 活动 uniform 数量
const uniformCount = gl.getActiveUniformBlockParameter(
  program, blockIndex, gl.UNIFORM_BLOCK_ACTIVE_UNIFORMS
);

// uniform 索引列表
const uniformIndices = gl.getActiveUniformBlockParameter(
  program, blockIndex, gl.UNIFORM_BLOCK_ACTIVE_UNIFORM_INDICES
);

// 绑定点
const binding = gl.getActiveUniformBlockParameter(
  program, blockIndex, gl.UNIFORM_BLOCK_BINDING
);

// 在哪些着色器中引用
const vertexRef = gl.getActiveUniformBlockParameter(
  program, blockIndex, gl.UNIFORM_BLOCK_REFERENCED_BY_VERTEX_SHADER
);
const fragmentRef = gl.getActiveUniformBlockParameter(
  program, blockIndex, gl.UNIFORM_BLOCK_REFERENCED_BY_FRAGMENT_SHADER
);
```

### 成员信息

```javascript
// 获取 uniform 名称
const names = ['u_modelMatrix', 'u_viewMatrix', 'u_projectionMatrix'];
const indices = gl.getUniformIndices(program, names);

// 获取偏移
const offsets = gl.getActiveUniforms(program, indices, gl.UNIFORM_OFFSET);

// 获取类型
const types = gl.getActiveUniforms(program, indices, gl.UNIFORM_TYPE);

// 获取大小（数组长度）
const sizes = gl.getActiveUniforms(program, indices, gl.UNIFORM_SIZE);

// 获取数组步长
const strides = gl.getActiveUniforms(program, indices, gl.UNIFORM_ARRAY_STRIDE);

// 获取矩阵步长
const matStrides = gl.getActiveUniforms(program, indices, gl.UNIFORM_MATRIX_STRIDE);

console.log('Offsets:', offsets);
console.log('Types:', types);
```

## 最佳实践

### 按更新频率分组

```glsl
// 每帧更新一次
layout(std140) uniform PerFrame {
  mat4 u_viewMatrix;
  mat4 u_projectionMatrix;
  vec4 u_cameraPosition;
  float u_time;
};

// 每物体更新
layout(std140) uniform PerObject {
  mat4 u_modelMatrix;
  mat4 u_normalMatrix;
};

// 材质数据（切换材质时更新）
layout(std140) uniform Material {
  vec4 u_baseColor;
  float u_metallic;
  float u_roughness;
};
```

### 避免小 UBO

```javascript
// 不好：太小的 UBO
layout(std140) uniform Tiny {
  float u_time;  // 只有 4 字节
};

// 好：合并小数据或使用传统 uniform
uniform float u_time;  // 小数据用传统方式
```

### 预计算偏移

```javascript
// 使用类定义布局
class MatricesUBO {
  static SIZE = 192;
  static OFFSET_MODEL = 0;
  static OFFSET_VIEW = 64;
  static OFFSET_PROJECTION = 128;
}

// 更新时使用
gl.bufferSubData(gl.UNIFORM_BUFFER, MatricesUBO.OFFSET_VIEW, viewMatrix);
```

## 本章小结

- UBO 将 uniform 数据存储在 GPU 缓冲中
- std140 布局提供跨平台的对齐规则
- 使用绑定点连接 UBO 和着色器块
- UBO 支持多程序共享
- 按更新频率分组 UBO 可优化性能
- 使用 bindBufferRange 实现更灵活的绑定

下一章，我们将学习 Varying 变量。
