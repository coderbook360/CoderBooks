# Uniform 变量

> "Uniform 是从 CPU 传递到 GPU 的全局常量。"

## Uniform 基础

### 什么是 Uniform

Uniform 变量在整个绘制调用期间保持不变，用于传递全局数据，如变换矩阵、材质参数、光照信息等。

```
┌─────────────────────────────────────────────────────────┐
│                    数据传递方式                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Attribute: 每顶点不同   →  位置、法线、UV              │
│  Uniform:   每绘制调用不变 →  变换矩阵、材质、光照       │
│  Varying:   顶点间插值   →  传递到片元着色器            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 着色器中定义

```glsl
#version 300 es

// 基本类型
uniform float u_time;
uniform int u_mode;
uniform bool u_enabled;

// 向量类型
uniform vec2 u_resolution;
uniform vec3 u_lightPos;
uniform vec4 u_color;

// 矩阵类型
uniform mat3 u_normalMatrix;
uniform mat4 u_modelMatrix;
uniform mat4 u_viewMatrix;
uniform mat4 u_projectionMatrix;

// 数组
uniform vec3 u_lightPositions[4];
uniform mat4 u_boneMatrices[64];

// 采样器
uniform sampler2D u_diffuseMap;
uniform samplerCube u_envMap;
```

## 获取 Uniform 位置

### getUniformLocation

```javascript
// 获取 uniform 位置
const u_mvpMatrix = gl.getUniformLocation(program, 'u_mvpMatrix');
const u_color = gl.getUniformLocation(program, 'u_color');
const u_time = gl.getUniformLocation(program, 'u_time');

// 位置可能为 null（未使用的 uniform 被优化掉）
if (u_mvpMatrix === null) {
  console.warn('u_mvpMatrix not found or unused');
}

// 数组元素
const u_lights0 = gl.getUniformLocation(program, 'u_lights[0]');
const u_lights1 = gl.getUniformLocation(program, 'u_lights[1]');

// 结构体成员
const u_material_diffuse = gl.getUniformLocation(program, 'u_material.diffuse');
const u_material_specular = gl.getUniformLocation(program, 'u_material.specular');
```

### 缓存 Uniform 位置

```javascript
// 着色器程序封装
class ShaderProgram {
  constructor(gl, vertSrc, fragSrc) {
    this.gl = gl;
    this.program = this.createProgram(vertSrc, fragSrc);
    this.uniforms = {};
  }
  
  getUniform(name) {
    if (!(name in this.uniforms)) {
      this.uniforms[name] = this.gl.getUniformLocation(this.program, name);
    }
    return this.uniforms[name];
  }
  
  setFloat(name, value) {
    this.gl.uniform1f(this.getUniform(name), value);
  }
  
  setVec3(name, value) {
    this.gl.uniform3fv(this.getUniform(name), value);
  }
  
  setMat4(name, value) {
    this.gl.uniformMatrix4fv(this.getUniform(name), false, value);
  }
}
```

## 设置 Uniform 值

### 标量类型

```javascript
// float
gl.uniform1f(u_time, 1.5);

// int
gl.uniform1i(u_mode, 2);

// bool（使用 int）
gl.uniform1i(u_enabled, 1);  // true
gl.uniform1i(u_enabled, 0);  // false

// unsigned int
gl.uniform1ui(u_count, 100);
```

### 向量类型

```javascript
// vec2
gl.uniform2f(u_resolution, 1920, 1080);
gl.uniform2fv(u_resolution, [1920, 1080]);
gl.uniform2fv(u_resolution, new Float32Array([1920, 1080]));

// vec3
gl.uniform3f(u_lightPos, 10, 20, 30);
gl.uniform3fv(u_lightPos, [10, 20, 30]);

// vec4
gl.uniform4f(u_color, 1.0, 0.0, 0.0, 1.0);
gl.uniform4fv(u_color, [1.0, 0.0, 0.0, 1.0]);

// 整数向量
gl.uniform2i(loc, 10, 20);
gl.uniform3iv(loc, [1, 2, 3]);
gl.uniform4uiv(loc, [1, 2, 3, 4]);
```

### 矩阵类型

```javascript
// mat2
gl.uniformMatrix2fv(u_mat2, false, [
  1, 0,
  0, 1
]);

// mat3
gl.uniformMatrix3fv(u_normalMatrix, false, normalMatrix);

// mat4
gl.uniformMatrix4fv(u_mvpMatrix, false, mvpMatrix);

// 第二个参数 transpose 在 WebGL 中必须为 false
// 矩阵按列主序存储
const identity = new Float32Array([
  1, 0, 0, 0,  // 第一列
  0, 1, 0, 0,  // 第二列
  0, 0, 1, 0,  // 第三列
  0, 0, 0, 1   // 第四列
]);
```

### 数组类型

```javascript
// 浮点数组
const values = new Float32Array([1.0, 2.0, 3.0, 4.0]);
gl.uniform1fv(u_floatArray, values);

// 向量数组
const positions = new Float32Array([
  1, 2, 3,  // 第一个 vec3
  4, 5, 6,  // 第二个 vec3
  7, 8, 9,  // 第三个 vec3
  10, 11, 12
]);
gl.uniform3fv(u_positions, positions);

// 矩阵数组
const matrices = new Float32Array(64 * 16);  // 64 个 mat4
gl.uniformMatrix4fv(u_boneMatrices, false, matrices);
```

### 采样器

```javascript
// 设置纹理单元索引
gl.uniform1i(u_diffuseMap, 0);  // 纹理单元 0
gl.uniform1i(u_normalMap, 1);   // 纹理单元 1
gl.uniform1i(u_envMap, 2);      // 纹理单元 2

// 绑定纹理到对应单元
gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, diffuseTexture);

gl.activeTexture(gl.TEXTURE1);
gl.bindTexture(gl.TEXTURE_2D, normalTexture);

gl.activeTexture(gl.TEXTURE2);
gl.bindTexture(gl.TEXTURE_CUBE_MAP, envTexture);
```

## Uniform 优化

### 减少 Uniform 调用

```javascript
// 不好：每帧设置不变的 uniform
function render() {
  gl.uniformMatrix4fv(u_projection, false, projectionMatrix);  // 每帧调用
  gl.uniformMatrix4fv(u_view, false, viewMatrix);
  
  objects.forEach(obj => {
    gl.uniformMatrix4fv(u_model, false, obj.matrix);
    gl.drawArrays(gl.TRIANGLES, 0, obj.count);
  });
}

// 好：只在变化时更新
function render() {
  // 投影矩阵只在 resize 时更新
  if (needUpdateProjection) {
    gl.uniformMatrix4fv(u_projection, false, projectionMatrix);
    needUpdateProjection = false;
  }
  
  // 视图矩阵只在相机移动时更新
  if (camera.dirty) {
    gl.uniformMatrix4fv(u_view, false, viewMatrix);
    camera.dirty = false;
  }
  
  objects.forEach(obj => {
    gl.uniformMatrix4fv(u_model, false, obj.matrix);
    gl.drawArrays(gl.TRIANGLES, 0, obj.count);
  });
}
```

### 合并矩阵

```javascript
// 不好：着色器中计算
// gl_Position = projection * view * model * vec4(pos, 1.0);

// 好：CPU 端预计算 MVP
const mvpMatrix = mat4.create();
mat4.multiply(mvpMatrix, projectionMatrix, viewMatrix);
mat4.multiply(mvpMatrix, mvpMatrix, modelMatrix);
gl.uniformMatrix4fv(u_mvpMatrix, false, mvpMatrix);

// 着色器简化为：
// gl_Position = u_mvpMatrix * vec4(pos, 1.0);
```

## Uniform Buffer Object (UBO)

### 什么是 UBO

UBO 允许将多个 uniform 打包到缓冲中，减少 API 调用并支持在程序间共享。

```glsl
#version 300 es

// 着色器中定义 uniform 块
layout(std140) uniform Matrices {
  mat4 u_projection;
  mat4 u_view;
  mat4 u_model;
};

layout(std140) uniform Material {
  vec4 u_diffuse;
  vec4 u_specular;
  float u_shininess;
};
```

### 创建和使用 UBO

```javascript
// 1. 创建缓冲
const ubo = gl.createBuffer();
gl.bindBuffer(gl.UNIFORM_BUFFER, ubo);

// 2. 分配空间
const data = new Float32Array(16 + 16 + 16);  // 3 个 mat4
gl.bufferData(gl.UNIFORM_BUFFER, data, gl.DYNAMIC_DRAW);

// 3. 获取块索引
const blockIndex = gl.getUniformBlockIndex(program, 'Matrices');

// 4. 绑定到绑定点
const bindingPoint = 0;
gl.uniformBlockBinding(program, blockIndex, bindingPoint);

// 5. 绑定缓冲到绑定点
gl.bindBufferBase(gl.UNIFORM_BUFFER, bindingPoint, ubo);

// 6. 更新数据
gl.bufferSubData(gl.UNIFORM_BUFFER, 0, projectionMatrix);
gl.bufferSubData(gl.UNIFORM_BUFFER, 64, viewMatrix);
gl.bufferSubData(gl.UNIFORM_BUFFER, 128, modelMatrix);
```

### std140 布局规则

```
布局规则（std140）:
- 标量：4 字节对齐
- vec2：8 字节对齐
- vec3/vec4：16 字节对齐
- mat4：每列 16 字节对齐
- 数组元素：16 字节对齐

示例：
┌─────────────────────────────────────────────────────────┐
│  成员            │  大小    │  对齐    │  偏移         │
├─────────────────────────────────────────────────────────┤
│  float a         │  4       │  4       │  0            │
│  vec2 b          │  8       │  8       │  8 (填充4)    │
│  vec3 c          │  12      │  16      │  16           │
│  float d         │  4       │  4       │  28           │
│  mat4 e          │  64      │  16      │  32           │
│  float f[3]      │  48      │  16      │  96 (每元素16)│
└─────────────────────────────────────────────────────────┘
```

### 查询块布局

```javascript
// 获取块大小
const blockSize = gl.getActiveUniformBlockParameter(
  program, blockIndex, gl.UNIFORM_BLOCK_DATA_SIZE
);

// 获取成员索引
const indices = gl.getUniformIndices(program, ['u_projection', 'u_view', 'u_model']);

// 获取偏移
const offsets = gl.getActiveUniforms(program, indices, gl.UNIFORM_OFFSET);

console.log('Block size:', blockSize);
console.log('Offsets:', offsets);
```

### 多程序共享

```javascript
// 多个程序可以共享同一个 UBO
const bindingPoint = 0;

// 程序 A
const blockA = gl.getUniformBlockIndex(programA, 'Matrices');
gl.uniformBlockBinding(programA, blockA, bindingPoint);

// 程序 B
const blockB = gl.getUniformBlockIndex(programB, 'Matrices');
gl.uniformBlockBinding(programB, blockB, bindingPoint);

// 共享的 UBO
gl.bindBufferBase(gl.UNIFORM_BUFFER, bindingPoint, matricesUBO);

// 只需更新一次，两个程序都能使用
gl.bufferSubData(gl.UNIFORM_BUFFER, 0, viewProjectionMatrix);
```

## 常用 Uniform 组织

### 分类管理

```javascript
// 按更新频率分组
const uniforms = {
  // 每帧更新一次
  perFrame: {
    time: 0,
    viewMatrix: null,
    projectionMatrix: null
  },
  
  // 每物体更新
  perObject: {
    modelMatrix: null,
    normalMatrix: null
  },
  
  // 每材质更新
  perMaterial: {
    diffuseColor: null,
    specularColor: null,
    shininess: 32
  },
  
  // 很少更新
  rarely: {
    ambientLight: [0.1, 0.1, 0.1]
  }
};
```

### 使用 UBO 分组

```glsl
// 每帧数据
layout(std140) uniform PerFrame {
  mat4 u_viewMatrix;
  mat4 u_projectionMatrix;
  float u_time;
  vec3 u_cameraPos;
};

// 每物体数据
layout(std140) uniform PerObject {
  mat4 u_modelMatrix;
  mat3 u_normalMatrix;
};

// 材质数据
layout(std140) uniform Material {
  vec4 u_diffuse;
  vec4 u_specular;
  float u_shininess;
};
```

## 调试 Uniform

### 获取当前值

```javascript
// 获取 uniform 当前值
const value = gl.getUniform(program, u_color);
console.log('u_color:', value);

// 获取活动 uniform 信息
const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
for (let i = 0; i < count; i++) {
  const info = gl.getActiveUniform(program, i);
  const loc = gl.getUniformLocation(program, info.name);
  console.log(`Uniform ${i}: ${info.name}, type: ${info.type}, size: ${info.size}`);
}
```

### 常见问题

```javascript
// 问题 1：uniform 位置为 null
const loc = gl.getUniformLocation(program, 'u_unused');
// 原因：着色器中定义但未使用的 uniform 被优化掉

// 问题 2：设置 uniform 前忘记使用程序
gl.uniformMatrix4fv(u_mvp, false, matrix);  // 错误！
gl.useProgram(program);
gl.uniformMatrix4fv(u_mvp, false, matrix);  // 正确

// 问题 3：数组索引越界
// GLSL: uniform vec3 u_lights[4];
const u_lights5 = gl.getUniformLocation(program, 'u_lights[5]');
// 返回 null
```

## 本章小结

- Uniform 在绘制调用期间保持不变
- 使用 getUniformLocation 获取位置
- 不同类型使用对应的 uniform* 函数
- 采样器设置为纹理单元索引
- UBO 减少 API 调用并支持共享
- 按更新频率组织 uniform 可优化性能

下一章，我们将学习 Uniform Buffer Object 的详细使用。
