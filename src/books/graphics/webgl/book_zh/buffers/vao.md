# 顶点数组对象（VAO）

> "VAO 封装了顶点状态，让渲染代码更简洁高效。"

## 什么是 VAO

### 定义

顶点数组对象（Vertex Array Object，VAO）存储顶点属性配置状态，包括：
- 顶点属性指针
- 启用的属性数组
- 绑定的索引缓冲

```
┌─────────────────────────────────────────────────────────┐
│                      VAO 存储内容                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │  顶点属性 0:                                      │ │
│  │  - 启用状态: true                                 │ │
│  │  - 绑定的 VBO                                     │ │
│  │  - size: 3, type: FLOAT, stride: 0, offset: 0    │ │
│  └───────────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────┐ │
│  │  顶点属性 1:                                      │ │
│  │  - 启用状态: true                                 │ │
│  │  - 绑定的 VBO                                     │ │
│  │  - size: 2, type: FLOAT, stride: 0, offset: 0    │ │
│  └───────────────────────────────────────────────────┘ │
│  ...                                                    │
│  ┌───────────────────────────────────────────────────┐ │
│  │  绑定的索引缓冲 (ELEMENT_ARRAY_BUFFER)            │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 为什么需要 VAO

不使用 VAO 时，每次绘制都需要重新配置：

```javascript
// 不使用 VAO（繁琐且低效）
function drawMesh(mesh) {
  gl.bindBuffer(gl.ARRAY_BUFFER, mesh.positionBuffer);
  gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(posLoc);
  
  gl.bindBuffer(gl.ARRAY_BUFFER, mesh.normalBuffer);
  gl.vertexAttribPointer(normLoc, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(normLoc);
  
  gl.bindBuffer(gl.ARRAY_BUFFER, mesh.uvBuffer);
  gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(uvLoc);
  
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indexBuffer);
  gl.drawElements(gl.TRIANGLES, mesh.indexCount, gl.UNSIGNED_SHORT, 0);
}
```

使用 VAO 后：

```javascript
// 使用 VAO（简洁高效）
function drawMesh(mesh) {
  gl.bindVertexArray(mesh.vao);
  gl.drawElements(gl.TRIANGLES, mesh.indexCount, gl.UNSIGNED_SHORT, 0);
}
```

## 创建和使用 VAO

### 创建 VAO

```javascript
// 创建 VAO
const vao = gl.createVertexArray();

// 检查是否创建成功
if (!vao) {
  console.error('Failed to create VAO');
}
```

### 配置 VAO

```javascript
// 绑定 VAO，开始记录状态
gl.bindVertexArray(vao);

// 配置位置属性
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(0);

// 配置法线属性
gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(1);

// 配置 UV 属性
gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(2);

// 绑定索引缓冲
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

// 解绑 VAO，结束记录
gl.bindVertexArray(null);
```

### 使用 VAO 绘制

```javascript
// 绑定 VAO
gl.bindVertexArray(vao);

// 绘制
gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_SHORT, 0);

// 可选：解绑
gl.bindVertexArray(null);
```

### 删除 VAO

```javascript
// 删除 VAO
gl.deleteVertexArray(vao);

// 检查是否有效
gl.isVertexArray(vao);  // 删除后返回 false
```

## 完整示例

### 创建带 VAO 的网格

```javascript
function createMesh(positions, normals, uvs, indices) {
  // 创建 VAO
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  
  // 位置 VBO
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(0);
  
  // 法线 VBO
  const normalBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
  gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(1);
  
  // UV VBO
  const uvBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs), gl.STATIC_DRAW);
  gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(2);
  
  // 索引缓冲
  const indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
  
  // 解绑 VAO
  gl.bindVertexArray(null);
  
  return {
    vao,
    indexCount: indices.length,
    // 保存缓冲引用以便后续删除
    buffers: [positionBuffer, normalBuffer, uvBuffer, indexBuffer]
  };
}

// 使用
const mesh = createMesh(positions, normals, uvs, indices);

// 渲染
gl.bindVertexArray(mesh.vao);
gl.drawElements(gl.TRIANGLES, mesh.indexCount, gl.UNSIGNED_SHORT, 0);
```

### 删除网格资源

```javascript
function deleteMesh(mesh) {
  gl.deleteVertexArray(mesh.vao);
  mesh.buffers.forEach(buffer => gl.deleteBuffer(buffer));
}
```

## VAO 与交错数据

### 配置交错属性

```javascript
// 交错数据：position(3) + normal(3) + uv(2) = 8 floats = 32 bytes
const stride = 32;

const vao = gl.createVertexArray();
gl.bindVertexArray(vao);

// 绑定交错 VBO
gl.bindBuffer(gl.ARRAY_BUFFER, interleavedBuffer);

// 位置：偏移 0
gl.vertexAttribPointer(0, 3, gl.FLOAT, false, stride, 0);
gl.enableVertexAttribArray(0);

// 法线：偏移 12 字节
gl.vertexAttribPointer(1, 3, gl.FLOAT, false, stride, 12);
gl.enableVertexAttribArray(1);

// UV：偏移 24 字节
gl.vertexAttribPointer(2, 2, gl.FLOAT, false, stride, 24);
gl.enableVertexAttribArray(2);

gl.bindVertexArray(null);
```

## VAO 与实例化

### 实例属性

```javascript
const vao = gl.createVertexArray();
gl.bindVertexArray(vao);

// 常规顶点属性
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(0);

// 实例属性（每个实例的变换矩阵）
gl.bindBuffer(gl.ARRAY_BUFFER, instanceMatrixBuffer);

// mat4 需要 4 个 vec4 属性位置
for (let i = 0; i < 4; i++) {
  const loc = 1 + i;
  gl.vertexAttribPointer(loc, 4, gl.FLOAT, false, 64, i * 16);
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribDivisor(loc, 1);  // 每个实例更新一次
}

gl.bindVertexArray(null);
```

### vertexAttribDivisor

```javascript
// divisor = 0：每个顶点更新（默认）
gl.vertexAttribDivisor(loc, 0);

// divisor = 1：每个实例更新
gl.vertexAttribDivisor(loc, 1);

// divisor = 2：每两个实例更新
gl.vertexAttribDivisor(loc, 2);
```

## 默认 VAO

### WebGL 2.0 默认 VAO

```javascript
// WebGL 2.0 有一个默认的全局 VAO
// 绑定 null 会使用默认 VAO
gl.bindVertexArray(null);

// 此时配置会影响默认 VAO
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
// 这些配置存储在默认 VAO 中
```

### 最佳实践

```javascript
// 始终使用自己创建的 VAO
const vao = gl.createVertexArray();
gl.bindVertexArray(vao);
// 配置...

// 避免使用默认 VAO
// 在渲染循环开始时不要忘记绑定 VAO
```

## 多 VAO 切换

### 高效切换

```javascript
const meshes = [
  { vao: vao1, indexCount: 100 },
  { vao: vao2, indexCount: 200 },
  { vao: vao3, indexCount: 150 }
];

function render() {
  meshes.forEach(mesh => {
    gl.bindVertexArray(mesh.vao);
    gl.drawElements(gl.TRIANGLES, mesh.indexCount, gl.UNSIGNED_SHORT, 0);
  });
}
```

### 减少切换

```javascript
// 按 VAO 分组绘制
function renderOptimized() {
  // 按 VAO 排序的物体列表
  const sorted = objects.sort((a, b) => a.mesh.vao - b.mesh.vao);
  
  let currentVao = null;
  
  sorted.forEach(obj => {
    if (obj.mesh.vao !== currentVao) {
      gl.bindVertexArray(obj.mesh.vao);
      currentVao = obj.mesh.vao;
    }
    
    // 更新 uniform
    gl.uniformMatrix4fv(u_model, false, obj.transform);
    
    // 绘制
    gl.drawElements(gl.TRIANGLES, obj.mesh.indexCount, gl.UNSIGNED_SHORT, 0);
  });
}
```

## 调试 VAO

### 检查 VAO 状态

```javascript
gl.bindVertexArray(vao);

// 检查属性是否启用
const enabled = gl.getVertexAttrib(0, gl.VERTEX_ATTRIB_ARRAY_ENABLED);

// 获取属性配置
const size = gl.getVertexAttrib(0, gl.VERTEX_ATTRIB_ARRAY_SIZE);
const type = gl.getVertexAttrib(0, gl.VERTEX_ATTRIB_ARRAY_TYPE);
const stride = gl.getVertexAttrib(0, gl.VERTEX_ATTRIB_ARRAY_STRIDE);
const normalized = gl.getVertexAttrib(0, gl.VERTEX_ATTRIB_ARRAY_NORMALIZED);

// 获取绑定的缓冲
const buffer = gl.getVertexAttrib(0, gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING);

// 获取偏移
const offset = gl.getVertexAttribOffset(0, gl.VERTEX_ATTRIB_ARRAY_POINTER);

console.log('Attribute 0:', {
  enabled, size, type, stride, normalized, buffer, offset
});
```

### 常见问题

```javascript
// 问题 1：忘记绑定 VAO
gl.drawElements(...);  // 错误：没有绑定 VAO

// 解决
gl.bindVertexArray(vao);
gl.drawElements(...);

// 问题 2：配置时没有绑定 VAO
const vao = gl.createVertexArray();
// 忘记 gl.bindVertexArray(vao);
gl.vertexAttribPointer(...);  // 配置到了默认 VAO

// 问题 3：绑定错误的 VBO
gl.bindVertexArray(vao);
gl.bindBuffer(gl.ARRAY_BUFFER, wrongBuffer);  // 不会影响已配置的 VAO
// VAO 记录的是配置时的缓冲绑定
```

## 性能考虑

### VAO 切换开销

```
操作成本（相对值）:
- 绑定 VAO：低
- 绑定着色器程序：中
- 绑定纹理：中
- Draw call：高

优化优先级：
1. 减少 Draw call
2. 减少着色器切换
3. 减少纹理切换
4. 减少 VAO 切换
```

### 内存占用

```javascript
// VAO 本身占用很小
// 主要内存在 VBO 和 IBO 中

// 多个 VAO 可以共享同一个 VBO
const sharedVBO = gl.createBuffer();
// ...

const vao1 = gl.createVertexArray();
gl.bindVertexArray(vao1);
gl.bindBuffer(gl.ARRAY_BUFFER, sharedVBO);
gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);  // 不同配置

const vao2 = gl.createVertexArray();
gl.bindVertexArray(vao2);
gl.bindBuffer(gl.ARRAY_BUFFER, sharedVBO);
gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 12);  // 不同偏移
```

## 本章小结

- VAO 封装顶点属性配置状态
- 使用 VAO 简化渲染代码
- VAO 存储属性指针和索引缓冲绑定
- vertexAttribDivisor 支持实例化属性
- 按 VAO 分组渲染减少切换开销
- 多个 VAO 可以共享 VBO

下一章，我们将学习顶点属性的详细配置。
