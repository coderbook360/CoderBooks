# 缓冲对象概述

> "缓冲是 GPU 与 CPU 之间的数据桥梁。"

## 什么是缓冲对象

### 定义

缓冲对象（Buffer Object）是 GPU 内存中存储数据的区域，用于高效传输顶点数据、索引数据和其他信息。

```
┌─────────────────────────────────────────────────────────┐
│                    数据流向                             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   CPU 内存              GPU 内存                        │
│  ┌──────────┐         ┌──────────┐                     │
│  │ JavaScript │  上传  │  Buffer  │                     │
│  │ TypedArray │ ───→  │  Object  │                     │
│  └──────────┘         └────┬─────┘                     │
│                            │                            │
│                            ▼                            │
│                      ┌──────────┐                       │
│                      │  着色器  │                       │
│                      └──────────┘                       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 缓冲类型

| 类型 | 绑定目标 | 用途 |
|------|---------|------|
| 顶点缓冲 | ARRAY_BUFFER | 顶点属性数据 |
| 索引缓冲 | ELEMENT_ARRAY_BUFFER | 顶点索引 |
| Uniform 缓冲 | UNIFORM_BUFFER | 共享 uniform 数据 |
| 变换反馈缓冲 | TRANSFORM_FEEDBACK_BUFFER | 捕获变换后的顶点 |
| 像素缓冲 | PIXEL_PACK_BUFFER / PIXEL_UNPACK_BUFFER | 像素数据传输 |
| 复制缓冲 | COPY_READ_BUFFER / COPY_WRITE_BUFFER | 缓冲间复制 |

## 缓冲生命周期

### 创建缓冲

```javascript
// 创建缓冲对象
const buffer = gl.createBuffer();

// 检查是否创建成功
if (!buffer) {
  console.error('Failed to create buffer');
}
```

### 绑定缓冲

```javascript
// 绑定到目标
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

// 解绑
gl.bindBuffer(gl.ARRAY_BUFFER, null);
```

### 上传数据

```javascript
// 方法 1：创建并初始化
gl.bufferData(gl.ARRAY_BUFFER, data, usage);

// 方法 2：分配空间，稍后填充
gl.bufferData(gl.ARRAY_BUFFER, sizeInBytes, usage);

// 方法 3：更新部分数据
gl.bufferSubData(gl.ARRAY_BUFFER, offset, data);
```

### 删除缓冲

```javascript
// 删除缓冲对象
gl.deleteBuffer(buffer);

// 检查是否有效
gl.isBuffer(buffer);  // 删除后返回 false
```

## 使用模式

### usage 参数

```javascript
// 静态数据：上传一次，使用多次
gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

// 动态数据：频繁更新
gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);

// 流数据：每帧更新
gl.bufferData(gl.ARRAY_BUFFER, data, gl.STREAM_DRAW);

// 读取数据（用于 transform feedback 等）
gl.bufferData(gl.TRANSFORM_FEEDBACK_BUFFER, size, gl.STATIC_READ);
gl.bufferData(gl.TRANSFORM_FEEDBACK_BUFFER, size, gl.DYNAMIC_READ);
gl.bufferData(gl.TRANSFORM_FEEDBACK_BUFFER, size, gl.STREAM_READ);

// 复制数据
gl.bufferData(gl.COPY_WRITE_BUFFER, size, gl.STATIC_COPY);
```

### 使用模式指南

| 使用场景 | 推荐模式 |
|---------|---------|
| 静态模型 | STATIC_DRAW |
| 粒子系统 | DYNAMIC_DRAW 或 STREAM_DRAW |
| 每帧变化的数据 | STREAM_DRAW |
| GPU 生成数据 | STATIC_READ / DYNAMIC_READ |
| 缓冲复制 | STATIC_COPY |

## 数据类型

### TypedArray

```javascript
// 常用类型
const positions = new Float32Array([...]);     // 位置、UV、法线
const colors = new Float32Array([...]);        // 颜色
const indices = new Uint16Array([...]);        // 索引（< 65536 顶点）
const largeIndices = new Uint32Array([...]);   // 索引（大型模型）
const bytes = new Uint8Array([...]);           // 压缩数据

// 数据视图
const buffer = new ArrayBuffer(100);
const view = new DataView(buffer);
view.setFloat32(0, 1.5, true);  // 小端序
```

### 数据对齐

```javascript
// 确保正确的字节对齐
// Float32Array 需要 4 字节对齐
const data = new Float32Array([
  // x, y, z, padding
  1.0, 2.0, 3.0, 0.0,  // 第一个顶点
  4.0, 5.0, 6.0, 0.0   // 第二个顶点
]);

// 交错数据
// position (3) + normal (3) + uv (2) = 8 floats = 32 bytes
const stride = 32;
const interleaved = new Float32Array([
  // pos.x, pos.y, pos.z, norm.x, norm.y, norm.z, u, v
  0, 0, 0, 0, 1, 0, 0, 0,  // 顶点 1
  1, 0, 0, 0, 1, 0, 1, 0,  // 顶点 2
  // ...
]);
```

## WebGL 2.0 增强功能

### bufferData 的新重载

```javascript
// 从源数组的指定位置开始读取
gl.bufferData(target, srcData, usage, srcOffset);

// 读取指定长度
gl.bufferData(target, srcData, usage, srcOffset, length);

// 示例：上传数组的一部分
const fullData = new Float32Array(1000);
gl.bufferData(gl.ARRAY_BUFFER, fullData, gl.STATIC_DRAW, 100, 200);
// 从索引 100 开始，上传 200 个元素
```

### bufferSubData 的新重载

```javascript
// 从源数组指定位置更新
gl.bufferSubData(target, dstOffset, srcData, srcOffset, length);

// 示例
const updateData = new Float32Array([1, 2, 3, 4, 5]);
gl.bufferSubData(gl.ARRAY_BUFFER, 0, updateData, 2, 3);
// 从 updateData[2] 开始读取 3 个元素，写入缓冲偏移 0
```

### getBufferSubData

```javascript
// 从 GPU 读回数据
const readBuffer = new Float32Array(100);
gl.getBufferSubData(gl.ARRAY_BUFFER, 0, readBuffer);

// 指定读取范围
gl.getBufferSubData(gl.ARRAY_BUFFER, byteOffset, readBuffer, dstOffset, length);
```

### copyBufferSubData

```javascript
// 在 GPU 内部复制数据
gl.bindBuffer(gl.COPY_READ_BUFFER, srcBuffer);
gl.bindBuffer(gl.COPY_WRITE_BUFFER, dstBuffer);

gl.copyBufferSubData(
  gl.COPY_READ_BUFFER,
  gl.COPY_WRITE_BUFFER,
  srcOffset,
  dstOffset,
  size
);
```

## 缓冲映射

### 同步读取问题

```javascript
// 这会导致 GPU/CPU 同步，性能差
gl.getBufferSubData(gl.ARRAY_BUFFER, 0, data);
// CPU 等待 GPU 完成所有命令

// 推荐：使用 fence sync
const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);

function checkSync() {
  const status = gl.clientWaitSync(sync, 0, 0);
  if (status === gl.ALREADY_SIGNALED || status === gl.CONDITION_SATISFIED) {
    gl.deleteSync(sync);
    // 现在可以安全读取
    gl.getBufferSubData(gl.ARRAY_BUFFER, 0, data);
  } else {
    requestAnimationFrame(checkSync);
  }
}
requestAnimationFrame(checkSync);
```

## 最佳实践

### 批量上传

```javascript
// 不好：多次小上传
for (let i = 0; i < 100; i++) {
  gl.bufferSubData(gl.ARRAY_BUFFER, i * 12, smallData[i]);
}

// 好：一次大上传
const combined = new Float32Array(100 * 3);
for (let i = 0; i < 100; i++) {
  combined.set(smallData[i], i * 3);
}
gl.bufferData(gl.ARRAY_BUFFER, combined, gl.STATIC_DRAW);
```

### 避免帧中更新

```javascript
// 不好：渲染循环中更新静态缓冲
function render() {
  gl.bufferData(gl.ARRAY_BUFFER, staticData, gl.STATIC_DRAW);  // 每帧重新上传
  gl.drawArrays(gl.TRIANGLES, 0, count);
}

// 好：初始化时上传，循环中只绘制
function init() {
  gl.bufferData(gl.ARRAY_BUFFER, staticData, gl.STATIC_DRAW);
}

function render() {
  gl.drawArrays(gl.TRIANGLES, 0, count);
}
```

### 双缓冲更新

```javascript
// 使用两个缓冲轮换，避免 GPU/CPU 同步
const buffers = [gl.createBuffer(), gl.createBuffer()];
let currentBuffer = 0;

function update(newData) {
  // 切换到另一个缓冲
  currentBuffer = 1 - currentBuffer;
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers[currentBuffer]);
  gl.bufferData(gl.ARRAY_BUFFER, newData, gl.DYNAMIC_DRAW);
}
```

## 调试技巧

### 检查缓冲状态

```javascript
// 获取缓冲大小
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
const size = gl.getBufferParameter(gl.ARRAY_BUFFER, gl.BUFFER_SIZE);
const usage = gl.getBufferParameter(gl.ARRAY_BUFFER, gl.BUFFER_USAGE);

console.log(`Buffer size: ${size} bytes, usage: ${usage}`);
```

### 验证数据

```javascript
// 读回并验证
const verify = new Float32Array(count);
gl.getBufferSubData(gl.ARRAY_BUFFER, 0, verify);
console.log('Buffer content:', verify);
```

## 本章小结

- 缓冲对象在 GPU 内存中存储数据
- 使用 createBuffer、bindBuffer、bufferData 管理缓冲
- usage 参数影响 GPU 优化策略
- WebGL 2.0 提供更灵活的数据操作
- 使用 fence sync 避免同步阻塞
- 批量上传和双缓冲提升性能

下一章，我们将详细学习顶点缓冲对象（VBO）。
