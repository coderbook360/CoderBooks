# 性能优化

> "性能优化是艺术与科学的结合，了解瓶颈所在才能对症下药。"

## 性能分析

### 识别瓶颈

```
┌─────────────────────────────────────────────────────────┐
│                常见性能瓶颈                              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   CPU 瓶颈:                                             │
│   - 过多绘制调用                                        │
│   - JavaScript 计算过重                                 │
│   - 状态切换频繁                                        │
│                                                         │
│   GPU 瓶颈:                                             │
│   - 顶点处理 (复杂几何/骨骼动画)                       │
│   - 片元处理 (复杂着色器/过度绘制)                     │
│   - 显存带宽 (大纹理/频繁更新)                         │
│                                                         │
│   内存瓶颈:                                             │
│   - 纹理内存不足                                        │
│   - 缓冲区过大                                          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 性能计时

```javascript
class PerformanceMonitor {
  constructor() {
    this.frameTimes = [];
    this.maxSamples = 60;
    this.lastTime = performance.now();
  }
  
  beginFrame() {
    this.frameStart = performance.now();
  }
  
  endFrame() {
    const now = performance.now();
    const frameTime = now - this.frameStart;
    
    this.frameTimes.push(frameTime);
    if (this.frameTimes.length > this.maxSamples) {
      this.frameTimes.shift();
    }
  }
  
  getAverageFrameTime() {
    if (this.frameTimes.length === 0) return 0;
    const sum = this.frameTimes.reduce((a, b) => a + b, 0);
    return sum / this.frameTimes.length;
  }
  
  getFPS() {
    const avgTime = this.getAverageFrameTime();
    return avgTime > 0 ? 1000 / avgTime : 0;
  }
  
  getStats() {
    return {
      fps: this.getFPS().toFixed(1),
      frameTime: this.getAverageFrameTime().toFixed(2) + 'ms',
      minFrameTime: Math.min(...this.frameTimes).toFixed(2) + 'ms',
      maxFrameTime: Math.max(...this.frameTimes).toFixed(2) + 'ms'
    };
  }
}
```

### GPU 时间查询

```javascript
class GPUTimer {
  constructor(gl) {
    this.gl = gl;
    this.ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
    this.queries = [];
    this.results = [];
  }
  
  isSupported() {
    return this.ext !== null;
  }
  
  beginQuery(name) {
    if (!this.ext) return;
    
    const query = this.gl.createQuery();
    this.gl.beginQuery(this.ext.TIME_ELAPSED_EXT, query);
    this.queries.push({ name, query, pending: true });
  }
  
  endQuery() {
    if (!this.ext) return;
    this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);
  }
  
  update() {
    const gl = this.gl;
    
    // 检查 GPU 是否重置
    const disjoint = gl.getParameter(this.ext.GPU_DISJOINT_EXT);
    if (disjoint) {
      // 丢弃所有挂起的查询
      this.queries.forEach(q => gl.deleteQuery(q.query));
      this.queries = [];
      return;
    }
    
    // 检查完成的查询
    for (let i = this.queries.length - 1; i >= 0; i--) {
      const q = this.queries[i];
      
      const available = gl.getQueryParameter(q.query, gl.QUERY_RESULT_AVAILABLE);
      if (available) {
        const elapsed = gl.getQueryParameter(q.query, gl.QUERY_RESULT);
        this.results.push({
          name: q.name,
          time: elapsed / 1000000  // 纳秒转毫秒
        });
        
        gl.deleteQuery(q.query);
        this.queries.splice(i, 1);
      }
    }
    
    // 保持结果数量有限
    while (this.results.length > 100) {
      this.results.shift();
    }
  }
  
  getAverageTime(name) {
    const matching = this.results.filter(r => r.name === name);
    if (matching.length === 0) return 0;
    return matching.reduce((a, b) => a + b.time, 0) / matching.length;
  }
}
```

## 绘制调用优化

### 批处理

```javascript
class BatchRenderer {
  constructor(gl, maxVertices = 65536) {
    this.gl = gl;
    this.maxVertices = maxVertices;
    this.vertexSize = 9;  // pos(3) + color(4) + uv(2)
    
    // 预分配缓冲
    this.vertexData = new Float32Array(maxVertices * this.vertexSize);
    this.vertexCount = 0;
    
    this.vao = gl.createVertexArray();
    this.vbo = gl.createBuffer();
    
    this.setupVAO();
    this.currentTexture = null;
    this.drawCalls = 0;
  }
  
  setupVAO() {
    const gl = this.gl;
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, this.vertexData.byteLength, gl.DYNAMIC_DRAW);
    
    const stride = this.vertexSize * 4;
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, stride, 12);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 2, gl.FLOAT, false, stride, 28);
    
    gl.bindVertexArray(null);
  }
  
  begin() {
    this.vertexCount = 0;
    this.drawCalls = 0;
  }
  
  drawQuad(x, y, w, h, color, texture, uvs) {
    // 纹理变化需要刷新批次
    if (this.currentTexture !== texture) {
      this.flush();
      this.currentTexture = texture;
    }
    
    // 缓冲区满需要刷新
    if (this.vertexCount + 6 > this.maxVertices) {
      this.flush();
    }
    
    // 添加顶点数据
    this.addVertex(x, y, 0, color, uvs[0], uvs[1]);
    this.addVertex(x + w, y, 0, color, uvs[2], uvs[1]);
    this.addVertex(x + w, y + h, 0, color, uvs[2], uvs[3]);
    
    this.addVertex(x, y, 0, color, uvs[0], uvs[1]);
    this.addVertex(x + w, y + h, 0, color, uvs[2], uvs[3]);
    this.addVertex(x, y + h, 0, color, uvs[0], uvs[3]);
  }
  
  addVertex(x, y, z, color, u, v) {
    const offset = this.vertexCount * this.vertexSize;
    this.vertexData[offset + 0] = x;
    this.vertexData[offset + 1] = y;
    this.vertexData[offset + 2] = z;
    this.vertexData[offset + 3] = color[0];
    this.vertexData[offset + 4] = color[1];
    this.vertexData[offset + 5] = color[2];
    this.vertexData[offset + 6] = color[3];
    this.vertexData[offset + 7] = u;
    this.vertexData[offset + 8] = v;
    this.vertexCount++;
  }
  
  flush() {
    if (this.vertexCount === 0) return;
    
    const gl = this.gl;
    
    // 上传数据
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, 
      this.vertexData.subarray(0, this.vertexCount * this.vertexSize));
    
    // 绑定纹理
    if (this.currentTexture) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.currentTexture);
    }
    
    // 绘制
    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLES, 0, this.vertexCount);
    
    this.drawCalls++;
    this.vertexCount = 0;
  }
  
  end() {
    this.flush();
    return this.drawCalls;
  }
}
```

### 纹理图集

```javascript
class TextureAtlas {
  constructor(gl, width, height) {
    this.gl = gl;
    this.width = width;
    this.height = height;
    
    // 创建图集纹理
    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    
    this.regions = new Map();
    this.packer = new RectanglePacker(width, height);
  }
  
  addImage(name, image) {
    const gl = this.gl;
    
    // 打包位置
    const rect = this.packer.pack(image.width, image.height);
    if (!rect) {
      console.warn('Atlas full, cannot add:', name);
      return null;
    }
    
    // 上传到图集
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texSubImage2D(
      gl.TEXTURE_2D, 0,
      rect.x, rect.y,
      gl.RGBA, gl.UNSIGNED_BYTE,
      image
    );
    
    // 保存区域信息（归一化坐标）
    const region = {
      x: rect.x,
      y: rect.y,
      width: image.width,
      height: image.height,
      u0: rect.x / this.width,
      v0: rect.y / this.height,
      u1: (rect.x + image.width) / this.width,
      v1: (rect.y + image.height) / this.height
    };
    
    this.regions.set(name, region);
    return region;
  }
  
  getRegion(name) {
    return this.regions.get(name);
  }
}
```

## 状态管理

### 状态缓存

```javascript
class GLStateCache {
  constructor(gl) {
    this.gl = gl;
    this.cache = new Map();
    
    // 初始化缓存
    this.currentProgram = null;
    this.currentVAO = null;
    this.currentTextures = new Array(16).fill(null);
    this.currentActiveTexture = gl.TEXTURE0;
    
    this.depthTestEnabled = false;
    this.blendEnabled = false;
    this.cullFaceEnabled = false;
  }
  
  useProgram(program) {
    if (this.currentProgram !== program) {
      this.gl.useProgram(program);
      this.currentProgram = program;
    }
  }
  
  bindVertexArray(vao) {
    if (this.currentVAO !== vao) {
      this.gl.bindVertexArray(vao);
      this.currentVAO = vao;
    }
  }
  
  bindTexture(unit, target, texture) {
    const gl = this.gl;
    
    if (this.currentActiveTexture !== gl.TEXTURE0 + unit) {
      gl.activeTexture(gl.TEXTURE0 + unit);
      this.currentActiveTexture = gl.TEXTURE0 + unit;
    }
    
    if (this.currentTextures[unit] !== texture) {
      gl.bindTexture(target, texture);
      this.currentTextures[unit] = texture;
    }
  }
  
  setDepthTest(enabled) {
    if (this.depthTestEnabled !== enabled) {
      if (enabled) {
        this.gl.enable(this.gl.DEPTH_TEST);
      } else {
        this.gl.disable(this.gl.DEPTH_TEST);
      }
      this.depthTestEnabled = enabled;
    }
  }
  
  setBlend(enabled) {
    if (this.blendEnabled !== enabled) {
      if (enabled) {
        this.gl.enable(this.gl.BLEND);
      } else {
        this.gl.disable(this.gl.BLEND);
      }
      this.blendEnabled = enabled;
    }
  }
  
  setCullFace(enabled) {
    if (this.cullFaceEnabled !== enabled) {
      if (enabled) {
        this.gl.enable(this.gl.CULL_FACE);
      } else {
        this.gl.disable(this.gl.CULL_FACE);
      }
      this.cullFaceEnabled = enabled;
    }
  }
}
```

### 渲染排序

```javascript
class RenderQueue {
  constructor() {
    this.opaqueObjects = [];
    this.transparentObjects = [];
  }
  
  add(object) {
    if (object.material.transparent) {
      this.transparentObjects.push(object);
    } else {
      this.opaqueObjects.push(object);
    }
  }
  
  sort(cameraPosition) {
    // 不透明物体：按材质/着色器排序减少状态切换
    this.opaqueObjects.sort((a, b) => {
      // 先按着色器
      if (a.material.programId !== b.material.programId) {
        return a.material.programId - b.material.programId;
      }
      // 再按纹理
      if (a.material.textureId !== b.material.textureId) {
        return a.material.textureId - b.material.textureId;
      }
      // 最后从前往后（利用 early-z）
      return a.distanceToCamera - b.distanceToCamera;
    });
    
    // 透明物体：从后往前排序
    this.transparentObjects.sort((a, b) => {
      return b.distanceToCamera - a.distanceToCamera;
    });
  }
  
  clear() {
    this.opaqueObjects.length = 0;
    this.transparentObjects.length = 0;
  }
}
```

## 缓冲区优化

### 缓冲区使用提示

```javascript
// 静态数据
gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

// 频繁更新
gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);

// 每帧更新且只用一次
gl.bufferData(gl.ARRAY_BUFFER, data, gl.STREAM_DRAW);

// 变换反馈输出
gl.bufferData(gl.ARRAY_BUFFER, size, gl.DYNAMIC_COPY);
```

### 避免同步

```javascript
// 不好：立即更新会导致等待
gl.bufferSubData(gl.ARRAY_BUFFER, 0, newData);
gl.drawArrays(gl.TRIANGLES, 0, count);

// 好：orphaning 技术
gl.bufferData(gl.ARRAY_BUFFER, newData, gl.DYNAMIC_DRAW);
gl.drawArrays(gl.TRIANGLES, 0, count);

// 更好：双缓冲
class DoubleBuffer {
  constructor(gl, size) {
    this.gl = gl;
    this.buffers = [gl.createBuffer(), gl.createBuffer()];
    this.current = 0;
    
    for (const buffer of this.buffers) {
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, size, gl.DYNAMIC_DRAW);
    }
  }
  
  getWriteBuffer() {
    return this.buffers[1 - this.current];
  }
  
  getReadBuffer() {
    return this.buffers[this.current];
  }
  
  swap() {
    this.current = 1 - this.current;
  }
}
```

## 着色器优化

### 精度选择

```glsl
// 尽可能使用低精度
precision mediump float;  // 大多数情况够用
precision highp float;    // 需要高精度时

// 或针对单个变量
mediump vec3 color;
highp vec3 position;
```

### 避免分支

```glsl
// 不好：分支可能导致 GPU 串行
if (useTexture) {
  color = texture(u_texture, uv);
} else {
  color = u_color;
}

// 好：使用 mix
color = mix(u_color, texture(u_texture, uv), float(useTexture));

// 更好：使用不同的着色器变体
```

### 预计算

```glsl
// 不好：每个片元都计算
float result = sin(angle) * cos(angle) * factor;

// 好：使用数学恒等式
float result = sin(2.0 * angle) * 0.5 * factor;

// 更好：在 CPU 预计算常量
uniform float u_precomputedFactor;  // sin(2*angle) * 0.5 * factor
```

### 减少纹理采样

```glsl
// 不好：多次采样
vec3 color = texture(u_texture, uv).rgb;
float alpha = texture(u_texture, uv).a;

// 好：一次采样
vec4 sample = texture(u_texture, uv);
vec3 color = sample.rgb;
float alpha = sample.a;
```

## 纹理优化

### 纹理压缩

```javascript
// 使用压缩纹理扩展
const ext = gl.getExtension('WEBGL_compressed_texture_s3tc');

if (ext) {
  gl.compressedTexImage2D(
    gl.TEXTURE_2D, 0,
    ext.COMPRESSED_RGBA_S3TC_DXT5_EXT,
    width, height, 0,
    compressedData
  );
}

// 移动端使用 ETC/ASTC
const etc = gl.getExtension('WEBGL_compressed_texture_etc');
const astc = gl.getExtension('WEBGL_compressed_texture_astc');
```

### Mipmap 和各向异性过滤

```javascript
// 生成 mipmap
gl.generateMipmap(gl.TEXTURE_2D);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);

// 各向异性过滤
const ext = gl.getExtension('EXT_texture_filter_anisotropic');
if (ext) {
  const max = gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
  gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(4, max));
}
```

### 纹理尺寸

```
┌─────────────────────────────────────────────────────────┐
│                纹理尺寸建议                              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   - 使用 2 的幂次尺寸 (256, 512, 1024...)              │
│   - 避免超过必要的分辨率                                │
│   - 考虑使用纹理图集减少切换                            │
│   - 渲染目标使用适当分辨率                              │
│                                                         │
│   显存估算:                                             │
│   RGBA8:     width × height × 4 bytes                  │
│   RGBA16F:   width × height × 8 bytes                  │
│   Mipmap:    额外约 33% 空间                           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 几何优化

### 索引复用

```javascript
// 不好：重复顶点
const vertices = [
  // 三角形 1
  0, 0, 0,
  1, 0, 0,
  1, 1, 0,
  // 三角形 2
  0, 0, 0,   // 重复
  1, 1, 0,   // 重复
  0, 1, 0
];

// 好：使用索引
const vertices = [
  0, 0, 0,  // 0
  1, 0, 0,  // 1
  1, 1, 0,  // 2
  0, 1, 0   // 3
];
const indices = [0, 1, 2, 0, 2, 3];
```

### 顶点缓存优化

```javascript
// 使用库优化索引顺序以提高缓存命中率
// 例如使用 meshoptimizer.js

import { MeshoptEncoder } from 'meshoptimizer';

const optimizedIndices = MeshoptEncoder.reorderMesh(
  indices, true, true
);
```

### LOD

```javascript
class LODMesh {
  constructor(lods) {
    this.lods = lods;  // [{ distance, mesh }, ...]
    this.lods.sort((a, b) => a.distance - b.distance);
  }
  
  getMesh(distance) {
    for (let i = this.lods.length - 1; i >= 0; i--) {
      if (distance >= this.lods[i].distance) {
        return this.lods[i].mesh;
      }
    }
    return this.lods[0].mesh;
  }
}
```

## 视锥裁剪

### 实现

```javascript
class Frustum {
  update(viewProjectionMatrix) {
    const m = viewProjectionMatrix;
    
    // 提取 6 个平面
    // 左
    this.planes[0] = this.normalizePlane(
      m[3] + m[0], m[7] + m[4], m[11] + m[8], m[15] + m[12]
    );
    // 右
    this.planes[1] = this.normalizePlane(
      m[3] - m[0], m[7] - m[4], m[11] - m[8], m[15] - m[12]
    );
    // 下
    this.planes[2] = this.normalizePlane(
      m[3] + m[1], m[7] + m[5], m[11] + m[9], m[15] + m[13]
    );
    // 上
    this.planes[3] = this.normalizePlane(
      m[3] - m[1], m[7] - m[5], m[11] - m[9], m[15] - m[13]
    );
    // 近
    this.planes[4] = this.normalizePlane(
      m[3] + m[2], m[7] + m[6], m[11] + m[10], m[15] + m[14]
    );
    // 远
    this.planes[5] = this.normalizePlane(
      m[3] - m[2], m[7] - m[6], m[11] - m[10], m[15] - m[14]
    );
  }
  
  normalizePlane(a, b, c, d) {
    const len = Math.sqrt(a * a + b * b + c * c);
    return [a / len, b / len, c / len, d / len];
  }
  
  containsPoint(point) {
    for (const plane of this.planes) {
      if (plane[0] * point[0] + plane[1] * point[1] + 
          plane[2] * point[2] + plane[3] < 0) {
        return false;
      }
    }
    return true;
  }
  
  intersectsBox(min, max) {
    for (const plane of this.planes) {
      const px = plane[0] > 0 ? max[0] : min[0];
      const py = plane[1] > 0 ? max[1] : min[1];
      const pz = plane[2] > 0 ? max[2] : min[2];
      
      if (plane[0] * px + plane[1] * py + plane[2] * pz + plane[3] < 0) {
        return false;
      }
    }
    return true;
  }
}
```

## 本章小结

- 先分析瓶颈再优化
- 减少绘制调用（批处理、实例化）
- 缓存 GL 状态避免重复设置
- 合理排序减少状态切换
- 选择正确的缓冲区使用提示
- 优化着色器（精度、分支、预计算）
- 使用压缩纹理和 mipmap
- 视锥裁剪跳过不可见物体

下一章，我们将学习 WebGL 调试工具与技巧。
