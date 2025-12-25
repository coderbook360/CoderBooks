# 错误排查

> "调试是编程的一半，了解常见问题能让你事半功倍。"

## 着色器错误

### 编译错误

```
┌─────────────────────────────────────────────────────────┐
│                常见着色器编译错误                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   1. 语法错误                                           │
│      ERROR: 0:5: ';' expected                          │
│      → 检查分号、括号是否匹配                           │
│                                                         │
│   2. 类型错误                                           │
│      ERROR: 0:10: cannot convert from 'int' to 'float' │
│      → 使用显式类型转换: float(intValue)               │
│                                                         │
│   3. 未声明变量                                         │
│      ERROR: 0:15: 'myVar' : undeclared identifier      │
│      → 检查变量名拼写和作用域                           │
│                                                         │
│   4. 精度缺失                                           │
│      ERROR: 0:1: No precision specified for (float)    │
│      → 在片元着色器开头添加 precision mediump float;   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 着色器调试助手

```javascript
function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    const typeName = type === gl.VERTEX_SHADER ? 'VERTEX' : 'FRAGMENT';
    
    console.error(`===== ${typeName} SHADER ERROR =====`);
    
    // 解析错误行
    const lines = source.split('\n');
    const errors = log.match(/ERROR: \d+:(\d+):/g) || [];
    const errorLines = new Set(errors.map(e => parseInt(e.match(/:(\d+):/)[1])));
    
    // 打印带行号的源码
    lines.forEach((line, i) => {
      const lineNum = i + 1;
      const marker = errorLines.has(lineNum) ? '>>>' : '   ';
      console.log(`${marker} ${lineNum.toString().padStart(3)}: ${line}`);
    });
    
    console.error('\nError Log:\n', log);
    
    gl.deleteShader(shader);
    return null;
  }
  
  return shader;
}
```

### 链接错误

```javascript
function createProgram(gl, vertexShader, fragmentShader) {
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program);
    
    console.error('===== PROGRAM LINK ERROR =====');
    console.error(log);
    
    // 常见链接错误
    if (log.includes('Varyings')) {
      console.error('提示: varying 变量在顶点和片元着色器中不匹配');
    }
    if (log.includes('uniform')) {
      console.error('提示: uniform 变量类型不匹配');
    }
    
    gl.deleteProgram(program);
    return null;
  }
  
  return program;
}
```

## 渲染问题

### 黑屏

```javascript
function diagnoseBlackScreen(gl, canvas) {
  const issues = [];
  
  // 1. 检查 canvas 尺寸
  if (canvas.width === 0 || canvas.height === 0) {
    issues.push('Canvas 尺寸为 0');
  }
  
  // 2. 检查视口
  const viewport = gl.getParameter(gl.VIEWPORT);
  if (viewport[2] === 0 || viewport[3] === 0) {
    issues.push('视口尺寸为 0');
  }
  
  // 3. 检查清除颜色
  const clearColor = gl.getParameter(gl.COLOR_CLEAR_VALUE);
  console.log('Clear Color:', clearColor);
  
  // 4. 检查当前程序
  const program = gl.getParameter(gl.CURRENT_PROGRAM);
  if (!program) {
    issues.push('没有活动的着色器程序');
  }
  
  // 5. 检查 WebGL 错误
  let error;
  while ((error = gl.getError()) !== gl.NO_ERROR) {
    issues.push(`WebGL Error: ${getErrorName(gl, error)}`);
  }
  
  // 6. 检查帧缓冲完整性
  const fbStatus = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  if (fbStatus !== gl.FRAMEBUFFER_COMPLETE) {
    issues.push(`帧缓冲不完整: ${fbStatus}`);
  }
  
  // 7. 检查深度测试
  if (gl.isEnabled(gl.DEPTH_TEST)) {
    const depthFunc = gl.getParameter(gl.DEPTH_FUNC);
    const depthMask = gl.getParameter(gl.DEPTH_WRITEMASK);
    console.log('Depth Test: enabled, func:', depthFunc, 'mask:', depthMask);
  }
  
  if (issues.length > 0) {
    console.error('诊断结果:', issues);
  } else {
    console.log('基本检查通过，问题可能在矩阵或几何数据');
  }
  
  return issues;
}
```

### 物体不可见

```
┌─────────────────────────────────────────────────────────┐
│                物体不可见的常见原因                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   几何问题:                                             │
│   - 顶点数据未上传                                      │
│   - 索引越界                                            │
│   - 顶点顺序导致背面剔除                                │
│   - 几何体在视锥外                                      │
│                                                         │
│   矩阵问题:                                             │
│   - 投影矩阵 near/far 设置不当                         │
│   - 模型矩阵导致物体在相机后面                          │
│   - 矩阵未更新                                          │
│                                                         │
│   状态问题:                                             │
│   - 深度测试失败 (z-fighting)                          │
│   - 颜色写入被禁用                                      │
│   - 混合设置导致完全透明                                │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 矩阵验证

```javascript
function validateMatrices(modelMatrix, viewMatrix, projectionMatrix) {
  // 检查是否有 NaN 或 Infinity
  function hasInvalidValues(matrix) {
    for (const v of matrix) {
      if (!isFinite(v)) return true;
    }
    return false;
  }
  
  if (hasInvalidValues(modelMatrix)) {
    console.error('Model matrix contains NaN or Infinity');
    return false;
  }
  if (hasInvalidValues(viewMatrix)) {
    console.error('View matrix contains NaN or Infinity');
    return false;
  }
  if (hasInvalidValues(projectionMatrix)) {
    console.error('Projection matrix contains NaN or Infinity');
    return false;
  }
  
  // 检查投影矩阵是否为单位矩阵（可能未初始化）
  function isIdentity(m) {
    return m[0] === 1 && m[5] === 1 && m[10] === 1 && m[15] === 1 &&
           m[1] === 0 && m[2] === 0 && m[3] === 0;
  }
  
  if (isIdentity(projectionMatrix)) {
    console.warn('Projection matrix is identity - might not be initialized');
  }
  
  // 检查行列式（缩放为 0 会导致问题）
  function determinant3x3(m) {
    return m[0] * (m[4] * m[8] - m[5] * m[7]) -
           m[1] * (m[3] * m[8] - m[5] * m[6]) +
           m[2] * (m[3] * m[7] - m[4] * m[6]);
  }
  
  // 提取 3x3 旋转/缩放部分
  const det = determinant3x3([
    modelMatrix[0], modelMatrix[1], modelMatrix[2],
    modelMatrix[4], modelMatrix[5], modelMatrix[6],
    modelMatrix[8], modelMatrix[9], modelMatrix[10]
  ]);
  
  if (Math.abs(det) < 0.0001) {
    console.warn('Model matrix has near-zero determinant - object is scaled to nothing');
  }
  
  return true;
}
```

## 纹理问题

### 常见纹理错误

```javascript
function diagnoseTextureIssues(gl, texture) {
  gl.bindTexture(gl.TEXTURE_2D, texture);
  
  // 检查纹理参数
  const minFilter = gl.getTexParameter(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER);
  const wrapS = gl.getTexParameter(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S);
  const wrapT = gl.getTexParameter(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T);
  
  console.log('Texture Parameters:');
  console.log('  MIN_FILTER:', minFilter);
  console.log('  WRAP_S:', wrapS);
  console.log('  WRAP_T:', wrapT);
  
  // 非 2 的幂纹理限制
  // 在 WebGL 1 中需要 CLAMP_TO_EDGE 和非 mipmap 过滤
  const needsMipmap = 
    minFilter === gl.NEAREST_MIPMAP_NEAREST ||
    minFilter === gl.LINEAR_MIPMAP_NEAREST ||
    minFilter === gl.NEAREST_MIPMAP_LINEAR ||
    minFilter === gl.LINEAR_MIPMAP_LINEAR;
  
  if (needsMipmap) {
    console.log('纹理使用 mipmap，确保已调用 generateMipmap()');
  }
  
  // 检查完整性
  const complete = gl.getTexParameter(gl.TEXTURE_2D, gl.TEXTURE_IMMUTABLE_FORMAT);
  console.log('Immutable Format:', complete);
}

// 安全的纹理创建
function createTextureSafe(gl, image) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  
  // 检查图像是否加载
  if (image.width === 0 || image.height === 0) {
    console.error('Image not loaded or has zero dimensions');
    return null;
  }
  
  // 检查是否是 2 的幂
  const isPowerOf2 = (n) => (n & (n - 1)) === 0;
  const npot = !isPowerOf2(image.width) || !isPowerOf2(image.height);
  
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  
  if (npot) {
    // NPOT 纹理限制
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    console.log('NPOT texture - using CLAMP_TO_EDGE and LINEAR filter');
  } else {
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  }
  
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  
  return texture;
}
```

### 纹理显示为纯色

```
问题: 纹理显示为纯黑/纯白/单一颜色

检查清单:
1. 纹理坐标是否正确 (范围 0-1)
2. 纹理是否加载完成后再使用
3. sampler uniform 是否正确绑定
4. 纹理单元是否正确激活
5. 着色器中采样是否正确
```

```javascript
// 调试纹理坐标
// 片元着色器
`
// 用纹理坐标作为颜色来检查
fragColor = vec4(v_texCoord, 0.0, 1.0);
// 红色 = U, 绿色 = V
// 左下角应该是黑色 (0, 0)
// 右上角应该是黄色 (1, 1)
`
```

## 性能问题

### 帧率下降诊断

```javascript
class PerformanceProfiler {
  constructor() {
    this.timings = {};
    this.frameCount = 0;
  }
  
  startSection(name) {
    if (!this.timings[name]) {
      this.timings[name] = { total: 0, count: 0, start: 0 };
    }
    this.timings[name].start = performance.now();
  }
  
  endSection(name) {
    const timing = this.timings[name];
    if (timing) {
      timing.total += performance.now() - timing.start;
      timing.count++;
    }
  }
  
  endFrame() {
    this.frameCount++;
    
    if (this.frameCount % 60 === 0) {
      console.log('=== Performance Report ===');
      
      for (const [name, timing] of Object.entries(this.timings)) {
        const avg = timing.total / timing.count;
        console.log(`${name}: ${avg.toFixed(2)}ms avg`);
      }
      
      // 重置
      for (const timing of Object.values(this.timings)) {
        timing.total = 0;
        timing.count = 0;
      }
    }
  }
}

// 使用
const profiler = new PerformanceProfiler();

function render() {
  profiler.startSection('total');
  
  profiler.startSection('update');
  updateScene();
  profiler.endSection('update');
  
  profiler.startSection('render');
  renderScene();
  profiler.endSection('render');
  
  profiler.endSection('total');
  profiler.endFrame();
}
```

### 常见性能问题

```
┌─────────────────────────────────────────────────────────┐
│                性能问题诊断表                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   症状                 可能原因                          │
│   ─────────────────────────────────────────────────────│
│   帧率不稳定           GC 频繁触发                       │
│                       → 减少对象创建，使用对象池         │
│                                                         │
│   GPU 时间长           着色器过于复杂                    │
│                       → 简化着色器，减少采样次数         │
│                                                         │
│   CPU 时间长           绘制调用过多                      │
│                       → 使用批处理/实例化                │
│                                                         │
│   内存增长             资源泄漏                          │
│                       → 确保删除不用的纹理/缓冲区        │
│                                                         │
│   加载时卡顿           同步资源加载                      │
│                       → 使用异步加载，显示进度条         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 状态泄漏

### 状态检查

```javascript
function captureGLState(gl) {
  return {
    program: gl.getParameter(gl.CURRENT_PROGRAM),
    arrayBuffer: gl.getParameter(gl.ARRAY_BUFFER_BINDING),
    elementBuffer: gl.getParameter(gl.ELEMENT_ARRAY_BUFFER_BINDING),
    vertexArray: gl.getParameter(gl.VERTEX_ARRAY_BINDING),
    framebuffer: gl.getParameter(gl.FRAMEBUFFER_BINDING),
    activeTexture: gl.getParameter(gl.ACTIVE_TEXTURE),
    texture0: (() => {
      gl.activeTexture(gl.TEXTURE0);
      return gl.getParameter(gl.TEXTURE_BINDING_2D);
    })(),
    depthTest: gl.isEnabled(gl.DEPTH_TEST),
    blend: gl.isEnabled(gl.BLEND),
    cullFace: gl.isEnabled(gl.CULL_FACE),
    viewport: gl.getParameter(gl.VIEWPORT),
    scissor: gl.getParameter(gl.SCISSOR_BOX)
  };
}

function compareGLState(before, after) {
  const changes = [];
  
  for (const key of Object.keys(before)) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      changes.push({
        property: key,
        before: before[key],
        after: after[key]
      });
    }
  }
  
  return changes;
}

// 使用
const stateBefore = captureGLState(gl);
renderSomeStuff();
const stateAfter = captureGLState(gl);

const changes = compareGLState(stateBefore, stateAfter);
if (changes.length > 0) {
  console.warn('State leaked:', changes);
}
```

## 跨浏览器问题

### 兼容性检查

```javascript
function checkWebGLCompatibility() {
  const report = {
    webgl2: false,
    extensions: {},
    limits: {},
    issues: []
  };
  
  // 创建临时 canvas
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2');
  
  if (!gl) {
    report.issues.push('WebGL 2 not supported');
    return report;
  }
  
  report.webgl2 = true;
  
  // 检查重要扩展
  const importantExtensions = [
    'EXT_color_buffer_float',
    'OES_texture_float_linear',
    'EXT_texture_filter_anisotropic',
    'WEBGL_compressed_texture_s3tc'
  ];
  
  for (const ext of importantExtensions) {
    report.extensions[ext] = gl.getExtension(ext) !== null;
  }
  
  // 检查限制
  report.limits = {
    maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
    maxCubeMapSize: gl.getParameter(gl.MAX_CUBE_MAP_TEXTURE_SIZE),
    maxRenderbufferSize: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
    maxVertexAttribs: gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
    maxVaryings: gl.getParameter(gl.MAX_VARYING_VECTORS),
    maxVertexUniforms: gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS),
    maxFragmentUniforms: gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS),
    maxColorAttachments: gl.getParameter(gl.MAX_COLOR_ATTACHMENTS),
    maxSamples: gl.getParameter(gl.MAX_SAMPLES)
  };
  
  // 检查常见限制问题
  if (report.limits.maxTextureSize < 4096) {
    report.issues.push('Low max texture size: ' + report.limits.maxTextureSize);
  }
  
  if (report.limits.maxColorAttachments < 4) {
    report.issues.push('Limited MRT support: ' + report.limits.maxColorAttachments);
  }
  
  return report;
}
```

### 移动端问题

```
┌─────────────────────────────────────────────────────────┐
│                移动端常见问题                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   1. 精度问题                                           │
│      - 移动 GPU 的 highp 支持不一致                    │
│      - 解决: 在片元着色器中检查精度支持                │
│                                                         │
│   2. 扩展支持                                           │
│      - 某些桌面扩展在移动端不可用                       │
│      - 解决: 总是检查扩展可用性                         │
│                                                         │
│   3. 性能                                               │
│      - 填充率限制更严格                                 │
│      - 解决: 降低分辨率，减少过度绘制                   │
│                                                         │
│   4. 内存                                               │
│      - 显存更有限                                       │
│      - 解决: 压缩纹理，减少帧缓冲数量                   │
│                                                         │
│   5. 电池                                               │
│      - 高 GPU 使用导致发热和耗电                       │
│      - 解决: 限制帧率，降低复杂度                       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 调试清单

### 渲染前检查

```javascript
function preRenderChecks(gl, program, geometry) {
  const errors = [];
  
  // 1. 程序检查
  if (!program || !gl.isProgram(program)) {
    errors.push('Invalid program');
  } else {
    gl.validateProgram(program);
    if (!gl.getProgramParameter(program, gl.VALIDATE_STATUS)) {
      errors.push('Program validation failed: ' + gl.getProgramInfoLog(program));
    }
  }
  
  // 2. 几何检查
  if (!geometry.vao) {
    errors.push('No VAO bound');
  }
  
  // 3. 属性检查
  const numAttribs = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
  for (let i = 0; i < numAttribs; i++) {
    const info = gl.getActiveAttrib(program, i);
    const loc = gl.getAttribLocation(program, info.name);
    if (!gl.getVertexAttrib(loc, gl.VERTEX_ATTRIB_ARRAY_ENABLED)) {
      errors.push(`Attribute ${info.name} not enabled`);
    }
  }
  
  // 4. Uniform 检查
  const numUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < numUniforms; i++) {
    const info = gl.getActiveUniform(program, i);
    const loc = gl.getUniformLocation(program, info.name);
    const value = gl.getUniform(program, loc);
    
    if (value === null || value === undefined) {
      errors.push(`Uniform ${info.name} not set`);
    }
  }
  
  // 5. WebGL 错误
  let error;
  while ((error = gl.getError()) !== gl.NO_ERROR) {
    errors.push(`GL Error: ${getErrorName(gl, error)}`);
  }
  
  if (errors.length > 0) {
    console.error('Pre-render check failed:', errors);
    return false;
  }
  
  return true;
}
```

## 本章小结

- 着色器错误需要解析行号定位问题
- 黑屏问题按清单逐项排查
- 矩阵验证防止数值错误
- 纹理问题注意 NPOT 限制
- 性能分析找出瓶颈
- 状态检查发现泄漏
- 跨浏览器测试确保兼容

下一章，我们将学习从 WebGL 过渡到 Three.js。
