# 实例化渲染

> "实例化渲染用一次绘制调用绘制千万物体，是大规模场景的关键技术。"

## 什么是实例化渲染

### 概念

实例化渲染（Instanced Rendering）允许使用单个绘制调用渲染多个相同几何体的副本。

```
┌─────────────────────────────────────────────────────────┐
│                传统渲染 vs 实例化渲染                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   传统渲染:                                             │
│   for (i = 0; i < 1000; i++) {                         │
│     setUniforms(instances[i]);                         │
│     drawElements();  // 1000 次绘制调用                │
│   }                                                     │
│                                                         │
│   实例化渲染:                                           │
│   setInstanceData(allInstances);                        │
│   drawElementsInstanced(count, 1000);  // 1 次绘制调用 │
│                                                         │
│   减少 CPU-GPU 通信开销                                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 应用场景

| 场景 | 说明 |
|------|------|
| 草地/植被 | 大量重复的草叶 |
| 粒子系统 | 数万个粒子 |
| 森林 | 大量树木 |
| 城市 | 重复的建筑元素 |
| 人群 | 大量相似角色 |

## 基础实例化

### drawArraysInstanced

```javascript
// 创建基础几何体
const vertices = new Float32Array([
  -0.5, -0.5, 0.0,
   0.5, -0.5, 0.0,
   0.0,  0.5, 0.0
]);

const vao = gl.createVertexArray();
gl.bindVertexArray(vao);

const vbo = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

gl.enableVertexAttribArray(0);
gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

// 实例化绘制
const instanceCount = 1000;
gl.drawArraysInstanced(gl.TRIANGLES, 0, 3, instanceCount);
```

### drawElementsInstanced

```javascript
// 创建索引几何体
const indices = new Uint16Array([0, 1, 2, 2, 3, 0]);

const ebo = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

// 实例化绘制
gl.drawElementsInstanced(
  gl.TRIANGLES,
  6,                    // 索引数量
  gl.UNSIGNED_SHORT,    // 索引类型
  0,                    // 偏移
  instanceCount         // 实例数量
);
```

## 实例属性

### 属性除数

```javascript
// 实例数据 - 每个实例的位置偏移
const offsets = new Float32Array(instanceCount * 3);
for (let i = 0; i < instanceCount; i++) {
  offsets[i * 3 + 0] = Math.random() * 100 - 50;  // x
  offsets[i * 3 + 1] = Math.random() * 100 - 50;  // y
  offsets[i * 3 + 2] = Math.random() * 100 - 50;  // z
}

// 创建实例缓冲
const instanceVBO = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, instanceVBO);
gl.bufferData(gl.ARRAY_BUFFER, offsets, gl.STATIC_DRAW);

// 设置实例属性
gl.enableVertexAttribArray(1);
gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);

// 关键：设置属性除数
// 除数 0 = 每顶点更新（默认）
// 除数 1 = 每实例更新
// 除数 n = 每 n 个实例更新
gl.vertexAttribDivisor(1, 1);
```

### 着色器中使用

```glsl
#version 300 es

layout(location = 0) in vec3 a_position;
layout(location = 1) in vec3 a_instanceOffset;  // 实例属性

uniform mat4 u_viewProjection;

void main() {
  vec3 worldPos = a_position + a_instanceOffset;
  gl_Position = u_viewProjection * vec4(worldPos, 1.0);
}
```

## 实例矩阵

### 传递变换矩阵

```javascript
// 每个实例的模型矩阵 (4x4 = 16 floats)
const matrices = new Float32Array(instanceCount * 16);

for (let i = 0; i < instanceCount; i++) {
  const matrix = mat4.create();
  mat4.translate(matrix, matrix, [
    Math.random() * 100 - 50,
    Math.random() * 100 - 50,
    Math.random() * 100 - 50
  ]);
  mat4.rotateY(matrix, matrix, Math.random() * Math.PI * 2);
  mat4.scale(matrix, matrix, [0.5 + Math.random(), 0.5 + Math.random(), 0.5 + Math.random()]);
  
  matrices.set(matrix, i * 16);
}

// 创建矩阵缓冲
const matrixBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, matrixBuffer);
gl.bufferData(gl.ARRAY_BUFFER, matrices, gl.DYNAMIC_DRAW);

// mat4 需要 4 个属性位置（每个 vec4）
const bytesPerMatrix = 4 * 16;

for (let i = 0; i < 4; i++) {
  const loc = 2 + i;  // 属性位置 2, 3, 4, 5
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(
    loc,
    4,                      // 每个属性 4 个分量
    gl.FLOAT,
    false,
    bytesPerMatrix,         // 步长 = 整个矩阵大小
    i * 16                  // 偏移 = 第 i 行
  );
  gl.vertexAttribDivisor(loc, 1);  // 每实例更新
}
```

### 着色器

```glsl
#version 300 es

layout(location = 0) in vec3 a_position;
layout(location = 1) in vec3 a_normal;

// 实例矩阵（4 个 vec4 = mat4）
layout(location = 2) in vec4 a_modelMatrix0;
layout(location = 3) in vec4 a_modelMatrix1;
layout(location = 4) in vec4 a_modelMatrix2;
layout(location = 5) in vec4 a_modelMatrix3;

uniform mat4 u_viewProjection;

out vec3 v_normal;

void main() {
  // 重建模型矩阵
  mat4 modelMatrix = mat4(
    a_modelMatrix0,
    a_modelMatrix1,
    a_modelMatrix2,
    a_modelMatrix3
  );
  
  // 计算法线矩阵（简化版，假设均匀缩放）
  mat3 normalMatrix = mat3(modelMatrix);
  
  vec4 worldPos = modelMatrix * vec4(a_position, 1.0);
  v_normal = normalMatrix * a_normal;
  
  gl_Position = u_viewProjection * worldPos;
}
```

## 实例颜色

### 添加颜色属性

```javascript
// 每个实例的颜色
const colors = new Float32Array(instanceCount * 4);
for (let i = 0; i < instanceCount; i++) {
  colors[i * 4 + 0] = Math.random();  // R
  colors[i * 4 + 1] = Math.random();  // G
  colors[i * 4 + 2] = Math.random();  // B
  colors[i * 4 + 3] = 1.0;            // A
}

const colorBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);

gl.enableVertexAttribArray(6);
gl.vertexAttribPointer(6, 4, gl.FLOAT, false, 0, 0);
gl.vertexAttribDivisor(6, 1);
```

### 着色器

```glsl
// 顶点着色器
layout(location = 6) in vec4 a_instanceColor;
out vec4 v_color;

void main() {
  v_color = a_instanceColor;
  // ...
}

// 片元着色器
in vec4 v_color;
out vec4 fragColor;

void main() {
  fragColor = v_color;
}
```

## 实例 ID

### 内置变量 gl_InstanceID

```glsl
#version 300 es

layout(location = 0) in vec3 a_position;

uniform mat4 u_viewProjection;
uniform float u_time;

void main() {
  // 使用实例 ID 计算偏移
  float angle = float(gl_InstanceID) * 0.1 + u_time;
  float radius = 5.0 + float(gl_InstanceID) * 0.05;
  
  vec3 offset = vec3(
    cos(angle) * radius,
    sin(float(gl_InstanceID) * 0.5) * 2.0,
    sin(angle) * radius
  );
  
  vec3 worldPos = a_position + offset;
  gl_Position = u_viewProjection * vec4(worldPos, 1.0);
}
```

## 实例化渲染器

### 完整实现

```javascript
class InstancedMesh {
  constructor(gl, geometry, maxInstances) {
    this.gl = gl;
    this.geometry = geometry;
    this.maxInstances = maxInstances;
    this.instanceCount = 0;
    
    // 创建 VAO
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);
    
    // 绑定几何体
    this.setupGeometry();
    
    // 创建实例缓冲
    this.setupInstanceBuffers();
    
    gl.bindVertexArray(null);
  }
  
  setupGeometry() {
    const gl = this.gl;
    const geo = this.geometry;
    
    // 顶点位置
    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, geo.positions, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    
    // 法线
    if (geo.normals) {
      const normBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, normBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, geo.normals, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(1);
      gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
    }
    
    // 索引
    if (geo.indices) {
      this.indexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geo.indices, gl.STATIC_DRAW);
      this.indexCount = geo.indices.length;
    }
  }
  
  setupInstanceBuffers() {
    const gl = this.gl;
    
    // 实例矩阵缓冲
    this.matrixData = new Float32Array(this.maxInstances * 16);
    this.matrixBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.matrixBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.matrixData.byteLength, gl.DYNAMIC_DRAW);
    
    const bytesPerMatrix = 64;
    for (let i = 0; i < 4; i++) {
      const loc = 2 + i;
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 4, gl.FLOAT, false, bytesPerMatrix, i * 16);
      gl.vertexAttribDivisor(loc, 1);
    }
    
    // 实例颜色缓冲
    this.colorData = new Float32Array(this.maxInstances * 4);
    this.colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.colorData.byteLength, gl.DYNAMIC_DRAW);
    
    gl.enableVertexAttribArray(6);
    gl.vertexAttribPointer(6, 4, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(6, 1);
  }
  
  setInstanceData(matrices, colors) {
    const gl = this.gl;
    
    this.instanceCount = matrices.length;
    
    // 更新矩阵数据
    for (let i = 0; i < this.instanceCount; i++) {
      this.matrixData.set(matrices[i], i * 16);
    }
    
    gl.bindBuffer(gl.ARRAY_BUFFER, this.matrixBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.matrixData.subarray(0, this.instanceCount * 16));
    
    // 更新颜色数据
    if (colors) {
      for (let i = 0; i < this.instanceCount; i++) {
        this.colorData.set(colors[i], i * 4);
      }
      
      gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.colorData.subarray(0, this.instanceCount * 4));
    }
  }
  
  draw() {
    const gl = this.gl;
    
    gl.bindVertexArray(this.vao);
    
    if (this.indexBuffer) {
      gl.drawElementsInstanced(
        gl.TRIANGLES,
        this.indexCount,
        gl.UNSIGNED_SHORT,
        0,
        this.instanceCount
      );
    } else {
      gl.drawArraysInstanced(
        gl.TRIANGLES,
        0,
        this.geometry.positions.length / 3,
        this.instanceCount
      );
    }
    
    gl.bindVertexArray(null);
  }
}
```

## 动态更新

### 部分更新

```javascript
class DynamicInstancedMesh extends InstancedMesh {
  updateInstance(index, matrix, color) {
    const gl = this.gl;
    
    // 更新单个实例的矩阵
    this.matrixData.set(matrix, index * 16);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.matrixBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, index * 64, matrix);
    
    // 更新颜色
    if (color) {
      this.colorData.set(color, index * 4);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, index * 16, color);
    }
  }
  
  updateRange(startIndex, matrices, colors) {
    const gl = this.gl;
    const count = matrices.length;
    
    // 更新矩阵范围
    const matrixOffset = startIndex * 16;
    for (let i = 0; i < count; i++) {
      this.matrixData.set(matrices[i], matrixOffset + i * 16);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.matrixBuffer);
    gl.bufferSubData(
      gl.ARRAY_BUFFER,
      startIndex * 64,
      this.matrixData.subarray(matrixOffset, matrixOffset + count * 16)
    );
    
    // 更新颜色范围
    if (colors) {
      const colorOffset = startIndex * 4;
      for (let i = 0; i < count; i++) {
        this.colorData.set(colors[i], colorOffset + i * 4);
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
      gl.bufferSubData(
        gl.ARRAY_BUFFER,
        startIndex * 16,
        this.colorData.subarray(colorOffset, colorOffset + count * 4)
      );
    }
  }
}
```

## 视锥裁剪

### CPU 端裁剪

```javascript
class CulledInstancedMesh extends InstancedMesh {
  constructor(gl, geometry, maxInstances) {
    super(gl, geometry, maxInstances);
    
    this.allInstances = [];
    this.visibleInstances = [];
    this.boundingSphere = geometry.boundingSphere || { radius: 1 };
  }
  
  setInstances(instances) {
    this.allInstances = instances;
  }
  
  cull(frustum) {
    this.visibleInstances = [];
    
    for (const instance of this.allInstances) {
      // 获取实例位置
      const position = [
        instance.matrix[12],
        instance.matrix[13],
        instance.matrix[14]
      ];
      
      // 计算缩放后的包围球半径
      const scale = Math.max(
        Math.abs(instance.matrix[0]),
        Math.abs(instance.matrix[5]),
        Math.abs(instance.matrix[10])
      );
      const radius = this.boundingSphere.radius * scale;
      
      // 视锥裁剪测试
      if (frustum.containsSphere(position, radius)) {
        this.visibleInstances.push(instance);
      }
    }
    
    // 更新可见实例数据
    const matrices = this.visibleInstances.map(i => i.matrix);
    const colors = this.visibleInstances.map(i => i.color);
    this.setInstanceData(matrices, colors);
  }
  
  draw() {
    if (this.visibleInstances.length > 0) {
      super.draw();
    }
  }
}

// 视锥类
class Frustum {
  constructor() {
    this.planes = new Array(6);
  }
  
  setFromMatrix(matrix) {
    // 从视图投影矩阵提取平面
    // ...
  }
  
  containsSphere(center, radius) {
    for (const plane of this.planes) {
      const distance = 
        plane[0] * center[0] +
        plane[1] * center[1] +
        plane[2] * center[2] +
        plane[3];
      
      if (distance < -radius) {
        return false;  // 完全在平面外
      }
    }
    return true;  // 至少部分可见
  }
}
```

## LOD 实例化

### 距离 LOD

```javascript
class LODInstancedMesh {
  constructor(gl, lodGeometries, maxInstances) {
    this.gl = gl;
    
    // 创建不同 LOD 级别的实例化网格
    this.lodMeshes = lodGeometries.map(
      geo => new InstancedMesh(gl, geo, maxInstances)
    );
    
    // LOD 距离阈值
    this.lodDistances = [0, 20, 50, 100];
  }
  
  setInstances(instances, cameraPosition) {
    // 按 LOD 分组
    const lodGroups = this.lodMeshes.map(() => []);
    
    for (const instance of instances) {
      const position = [
        instance.matrix[12],
        instance.matrix[13],
        instance.matrix[14]
      ];
      
      const distance = vec3.distance(position, cameraPosition);
      
      // 确定 LOD 级别
      let lodLevel = 0;
      for (let i = 1; i < this.lodDistances.length; i++) {
        if (distance > this.lodDistances[i]) {
          lodLevel = i;
        }
      }
      
      lodLevel = Math.min(lodLevel, this.lodMeshes.length - 1);
      lodGroups[lodLevel].push(instance);
    }
    
    // 更新每个 LOD 级别的实例数据
    for (let i = 0; i < this.lodMeshes.length; i++) {
      const matrices = lodGroups[i].map(inst => inst.matrix);
      const colors = lodGroups[i].map(inst => inst.color);
      this.lodMeshes[i].setInstanceData(matrices, colors);
    }
  }
  
  draw(program) {
    for (const mesh of this.lodMeshes) {
      if (mesh.instanceCount > 0) {
        mesh.draw();
      }
    }
  }
}
```

## 性能对比

```
┌─────────────────────────────────────────────────────────┐
│                   性能对比 (10,000 对象)                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   方法              绘制调用    帧时间   CPU 占用       │
│   ─────────────────────────────────────────────────────│
│   传统循环           10,000     45ms     高            │
│   实例化渲染              1      8ms     低            │
│   带裁剪的实例化         1-5      5ms     中            │
│                                                         │
│   实例化优势:                                           │
│   - 减少 API 调用开销                                   │
│   - 减少状态切换                                        │
│   - 更好的批处理                                        │
│   - GPU 并行处理                                        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 本章小结

- 实例化渲染大幅减少绘制调用
- `vertexAttribDivisor` 控制属性更新频率
- 实例矩阵需要 4 个属性位置
- `gl_InstanceID` 提供实例索引
- 动态更新使用 `bufferSubData`
- CPU 端裁剪减少不必要的渲染
- LOD 结合实例化优化大场景

下一章，我们将学习变换反馈技术。
