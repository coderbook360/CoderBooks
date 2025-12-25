# 顶点属性

> "顶点属性定义了每个顶点携带的信息。"

## 属性基础

### 什么是顶点属性

顶点属性（Vertex Attributes）是附加到每个顶点的数据，如位置、法线、颜色、纹理坐标等。

```
┌─────────────────────────────────────────────────────────┐
│                    顶点属性示例                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  顶点 0:                                                │
│  ┌────────────────────────────────────────────────┐    │
│  │ 位置     │ 法线     │ UV     │ 颜色     │ ...  │    │
│  │ (x,y,z) │ (x,y,z) │ (u,v)  │ (r,g,b,a)│      │    │
│  └────────────────────────────────────────────────┘    │
│                                                         │
│  顶点 1:                                                │
│  ┌────────────────────────────────────────────────┐    │
│  │ 位置     │ 法线     │ UV     │ 颜色     │ ...  │    │
│  └────────────────────────────────────────────────┘    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 属性限制

```javascript
// 获取最大属性数量
const maxAttribs = gl.getParameter(gl.MAX_VERTEX_ATTRIBS);
console.log('Max vertex attributes:', maxAttribs);  // 通常 16
```

## 属性定义

### 着色器中定义

```glsl
#version 300 es

// 使用 in 关键字定义属性
in vec3 a_position;
in vec3 a_normal;
in vec2 a_texCoord;
in vec4 a_color;

// 使用 layout 指定位置
layout(location = 0) in vec3 a_position;
layout(location = 1) in vec3 a_normal;
layout(location = 2) in vec2 a_texCoord;
layout(location = 3) in vec4 a_color;
```

### 获取属性位置

```javascript
// 方法 1：查询属性位置
const positionLoc = gl.getAttribLocation(program, 'a_position');
const normalLoc = gl.getAttribLocation(program, 'a_normal');
const texCoordLoc = gl.getAttribLocation(program, 'a_texCoord');
const colorLoc = gl.getAttribLocation(program, 'a_color');

// 方法 2：在链接前绑定位置
gl.bindAttribLocation(program, 0, 'a_position');
gl.bindAttribLocation(program, 1, 'a_normal');
gl.bindAttribLocation(program, 2, 'a_texCoord');
gl.bindAttribLocation(program, 3, 'a_color');
gl.linkProgram(program);

// 方法 3：着色器中使用 layout(location = n)
// 无需 JavaScript 端操作
```

## 属性配置

### vertexAttribPointer

```javascript
gl.vertexAttribPointer(
  index,      // 属性位置
  size,       // 分量数（1-4）
  type,       // 数据类型
  normalized, // 是否归一化
  stride,     // 步长（字节）
  offset      // 偏移（字节）
);
```

### 参数详解

#### index（属性位置）

```javascript
const posLoc = gl.getAttribLocation(program, 'a_position');
// 或使用 layout(location = 0)
const posLoc = 0;
```

#### size（分量数）

```javascript
// vec2: size = 2
gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 0, 0);

// vec3: size = 3
gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);

// vec4: size = 4
gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0);
```

#### type（数据类型）

```javascript
// 浮点类型
gl.FLOAT           // 32 位浮点
gl.HALF_FLOAT      // 16 位浮点

// 整数类型
gl.BYTE            // 8 位有符号
gl.UNSIGNED_BYTE   // 8 位无符号
gl.SHORT           // 16 位有符号
gl.UNSIGNED_SHORT  // 16 位无符号
gl.INT             // 32 位有符号
gl.UNSIGNED_INT    // 32 位无符号

// 特殊类型（WebGL 2.0）
gl.INT_2_10_10_10_REV     // 2-10-10-10 打包格式
gl.UNSIGNED_INT_2_10_10_10_REV
```

#### normalized（归一化）

```javascript
// 无符号归一化：[0, MAX] → [0.0, 1.0]
const colors = new Uint8Array([255, 128, 0, 255]);
gl.vertexAttribPointer(colorLoc, 4, gl.UNSIGNED_BYTE, true, 0, 0);
// 255 → 1.0, 128 → 0.5, 0 → 0.0

// 有符号归一化：[MIN, MAX] → [-1.0, 1.0]
const normals = new Int8Array([0, 127, 0]);
gl.vertexAttribPointer(normLoc, 3, gl.BYTE, true, 0, 0);
// 127 → 1.0, -128 → -1.0, 0 → 0.0

// 不归一化
gl.vertexAttribPointer(loc, 3, gl.FLOAT, false, 0, 0);
```

#### stride（步长）

```javascript
// stride = 0：紧密排列
// [x0, y0, z0, x1, y1, z1, x2, y2, z2]
gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);

// stride > 0：交错数据
// [x0, y0, z0, r0, g0, b0, x1, y1, z1, r1, g1, b1, ...]
const stride = 24;  // 6 floats × 4 bytes
gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, stride, 0);
gl.vertexAttribPointer(colorLoc, 3, gl.FLOAT, false, stride, 12);
```

#### offset（偏移）

```javascript
// 在交错数据中的起始位置
const stride = 32;  // 8 floats per vertex

// position: 偏移 0
gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, stride, 0);

// normal: 偏移 12 (3 × 4)
gl.vertexAttribPointer(normLoc, 3, gl.FLOAT, false, stride, 12);

// uv: 偏移 24 (6 × 4)
gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, stride, 24);
```

## 整数属性

### vertexAttribIPointer

用于整数类型属性（不转换为浮点）：

```javascript
// 骨骼索引必须保持为整数
const boneIds = new Uint8Array([0, 1, 2, 3]);

gl.bindBuffer(gl.ARRAY_BUFFER, boneIdBuffer);
gl.bufferData(gl.ARRAY_BUFFER, boneIds, gl.STATIC_DRAW);

// 使用 I 版本
gl.vertexAttribIPointer(
  boneIdLoc,
  4,              // 4 个骨骼
  gl.UNSIGNED_BYTE,
  0,
  0
);
gl.enableVertexAttribArray(boneIdLoc);
```

```glsl
// 着色器中使用整数类型
in ivec4 a_boneIds;  // 整数向量

void main() {
  mat4 bone = u_bones[a_boneIds.x];  // 作为索引使用
}
```

## 启用和禁用

### 启用属性数组

```javascript
// 启用属性数组
gl.enableVertexAttribArray(posLoc);
gl.enableVertexAttribArray(normLoc);
gl.enableVertexAttribArray(uvLoc);

// 禁用属性数组
gl.disableVertexAttribArray(posLoc);
```

### 常量属性值

禁用属性数组时，可以使用常量值：

```javascript
// 所有顶点使用相同的颜色
gl.disableVertexAttribArray(colorLoc);
gl.vertexAttrib4f(colorLoc, 1.0, 0.0, 0.0, 1.0);

// 其他变体
gl.vertexAttrib1f(loc, x);
gl.vertexAttrib2f(loc, x, y);
gl.vertexAttrib3f(loc, x, y, z);
gl.vertexAttrib4f(loc, x, y, z, w);

// 向量版本
gl.vertexAttrib4fv(colorLoc, [1.0, 0.0, 0.0, 1.0]);

// 整数版本
gl.vertexAttribI4i(loc, x, y, z, w);
gl.vertexAttribI4ui(loc, x, y, z, w);
```

## 实例化属性

### vertexAttribDivisor

控制属性更新频率：

```javascript
// divisor = 0：每个顶点更新（默认）
gl.vertexAttribDivisor(posLoc, 0);

// divisor = 1：每个实例更新
gl.vertexAttribDivisor(instanceColorLoc, 1);

// divisor = 2：每两个实例更新
gl.vertexAttribDivisor(loc, 2);
```

### 实例化示例

```javascript
// 顶点数据（一个立方体）
gl.bindBuffer(gl.ARRAY_BUFFER, cubeVBO);
gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(posLoc);
gl.vertexAttribDivisor(posLoc, 0);  // 每顶点

// 实例数据（每个立方体的位置偏移）
gl.bindBuffer(gl.ARRAY_BUFFER, instanceOffsetVBO);
gl.vertexAttribPointer(offsetLoc, 3, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(offsetLoc);
gl.vertexAttribDivisor(offsetLoc, 1);  // 每实例

// 绘制 100 个立方体
gl.drawArraysInstanced(gl.TRIANGLES, 0, 36, 100);
```

### 实例矩阵

mat4 需要 4 个属性位置：

```javascript
// 实例变换矩阵
gl.bindBuffer(gl.ARRAY_BUFFER, instanceMatrixVBO);

for (let i = 0; i < 4; i++) {
  const loc = matrixLoc + i;
  gl.vertexAttribPointer(
    loc,
    4,              // vec4
    gl.FLOAT,
    false,
    64,             // mat4 = 16 floats = 64 bytes
    i * 16          // 每列 4 floats = 16 bytes
  );
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribDivisor(loc, 1);
}
```

```glsl
// 着色器
layout(location = 0) in vec3 a_position;
layout(location = 1) in mat4 a_instanceMatrix;  // 占用 location 1-4

void main() {
  gl_Position = u_viewProj * a_instanceMatrix * vec4(a_position, 1.0);
}
```

## 压缩属性格式

### 法线压缩

```javascript
// 使用归一化 Int8 存储法线
// 节省 75% 内存（12 bytes → 3 bytes）
const normals = new Int8Array([
  0, 127, 0,    // 向上
  0, -128, 0,   // 向下
  127, 0, 0     // 向右
]);

gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);
gl.vertexAttribPointer(normLoc, 3, gl.BYTE, true, 0, 0);
```

### 2-10-10-10 格式

```javascript
// 将法线和切线打包到 32 位
// 每个分量 10 位，符号 2 位
const packed = new Uint32Array([...]);

gl.vertexAttribPointer(
  tangentLoc,
  4,
  gl.INT_2_10_10_10_REV,
  true,
  0,
  0
);
```

### UV 压缩

```javascript
// 使用归一化 Uint16 存储 UV
// 节省 50% 内存（8 bytes → 4 bytes）
const uvs = new Uint16Array([
  0, 0,           // (0, 0)
  65535, 0,       // (1, 0)
  65535, 65535    // (1, 1)
]);

gl.vertexAttribPointer(uvLoc, 2, gl.UNSIGNED_SHORT, true, 0, 0);
```

## 最佳实践

### 属性对齐

```javascript
// 确保 4 字节对齐
// 不好：3 字节法线
const badLayout = 3 + 3 + 2;  // 8 floats, 不是 4 的倍数字节时可能有问题

// 好：填充到 4 字节
// position(12) + normal(12) + uv(8) = 32 bytes
const goodLayout = 32;
```

### 使用预定义位置

```glsl
// 约定位置，避免查询
layout(location = 0) in vec3 a_position;
layout(location = 1) in vec3 a_normal;
layout(location = 2) in vec2 a_texCoord;
layout(location = 3) in vec4 a_color;
layout(location = 4) in vec4 a_tangent;
layout(location = 5) in ivec4 a_boneIds;
layout(location = 6) in vec4 a_boneWeights;
```

### 共享属性配置

```javascript
// 使用常量避免魔法数字
const ATTR_POSITION = 0;
const ATTR_NORMAL = 1;
const ATTR_TEXCOORD = 2;
const ATTR_COLOR = 3;

gl.vertexAttribPointer(ATTR_POSITION, 3, gl.FLOAT, false, stride, 0);
gl.vertexAttribPointer(ATTR_NORMAL, 3, gl.FLOAT, false, stride, 12);
```

## 调试

### 获取属性信息

```javascript
// 检查属性是否启用
const enabled = gl.getVertexAttrib(loc, gl.VERTEX_ATTRIB_ARRAY_ENABLED);

// 获取属性配置
const size = gl.getVertexAttrib(loc, gl.VERTEX_ATTRIB_ARRAY_SIZE);
const type = gl.getVertexAttrib(loc, gl.VERTEX_ATTRIB_ARRAY_TYPE);
const stride = gl.getVertexAttrib(loc, gl.VERTEX_ATTRIB_ARRAY_STRIDE);
const normalized = gl.getVertexAttrib(loc, gl.VERTEX_ATTRIB_ARRAY_NORMALIZED);
const divisor = gl.getVertexAttrib(loc, gl.VERTEX_ATTRIB_ARRAY_DIVISOR);
const buffer = gl.getVertexAttrib(loc, gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING);
const offset = gl.getVertexAttribOffset(loc, gl.VERTEX_ATTRIB_ARRAY_POINTER);

// 获取当前值（禁用时使用）
const currentValue = gl.getVertexAttrib(loc, gl.CURRENT_VERTEX_ATTRIB);
```

## 本章小结

- 顶点属性定义每个顶点的数据
- vertexAttribPointer 配置如何解释缓冲数据
- 归一化允许使用较小的整数类型
- vertexAttribIPointer 用于整数属性
- vertexAttribDivisor 控制实例化更新频率
- 压缩格式可显著减少内存使用
- 使用 layout(location = n) 预定义位置

下一章，我们将学习 Uniform 变量。
