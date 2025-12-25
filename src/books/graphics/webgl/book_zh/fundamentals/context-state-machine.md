# WebGL 上下文与状态机

> "理解 WebGL 状态机是掌握 WebGL 的关键。"

## WebGL 作为状态机

### 状态机模型

WebGL 采用状态机模型，所有渲染设置都作为全局状态保存。一旦设置了某个状态，它会一直保持，直到被显式修改。

```
┌─────────────────────────────────────────────┐
│              WebGL 状态机                    │
├─────────────────────────────────────────────┤
│                                             │
│  当前程序      ──────────────→ Program      │
│  当前缓冲区    ──────────────→ Buffer       │
│  当前纹理      ──────────────→ Texture      │
│  当前帧缓冲    ──────────────→ Framebuffer  │
│  深度测试      ──────────────→ enable/disable│
│  混合模式      ──────────────→ BlendFunc    │
│  视口设置      ──────────────→ Viewport     │
│  ...                                        │
│                                             │
└─────────────────────────────────────────────┘
```

### 状态机的优缺点

**优点**：
- 减少参数传递
- 批量设置状态
- 优化 GPU 状态切换

**缺点**：
- 状态可能被意外修改
- 需要跟踪当前状态
- 调试时难以确定状态

## 上下文属性

### 获取上下文时的选项

```javascript
const gl = canvas.getContext('webgl2', {
  // Alpha 通道
  alpha: true,
  
  // 抗锯齿
  antialias: true,
  
  // 深度缓冲区
  depth: true,
  
  // 模板缓冲区
  stencil: false,
  
  // 预乘 alpha
  premultipliedAlpha: true,
  
  // 保留绘制缓冲区
  preserveDrawingBuffer: false,
  
  // 性能偏好
  powerPreference: 'default', // 'default' | 'low-power' | 'high-performance'
  
  // 失败时是否回退
  failIfMajorPerformanceCaveat: false,
  
  // 深度模板兼容
  desynchronized: false
});
```

### 查询上下文能力

```javascript
// 获取 WebGL 版本信息
console.log('版本:', gl.getParameter(gl.VERSION));
console.log('着色器语言版本:', gl.getParameter(gl.SHADING_LANGUAGE_VERSION));
console.log('厂商:', gl.getParameter(gl.VENDOR));
console.log('渲染器:', gl.getParameter(gl.RENDERER));

// 获取限制参数
console.log('最大纹理尺寸:', gl.getParameter(gl.MAX_TEXTURE_SIZE));
console.log('最大顶点属性:', gl.getParameter(gl.MAX_VERTEX_ATTRIBS));
console.log('最大纹理单元:', gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS));
console.log('最大 Uniform 向量:', gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS));
```

## 常用状态操作

### 启用/禁用功能

```javascript
// 启用深度测试
gl.enable(gl.DEPTH_TEST);

// 启用背面剔除
gl.enable(gl.CULL_FACE);

// 启用混合
gl.enable(gl.BLEND);

// 启用裁剪测试
gl.enable(gl.SCISSOR_TEST);

// 禁用功能
gl.disable(gl.DEPTH_TEST);

// 检查功能是否启用
const isEnabled = gl.isEnabled(gl.DEPTH_TEST);
```

### 可启用的功能列表

| 功能 | 常量 | 说明 |
|------|------|------|
| 混合 | `BLEND` | 颜色混合 |
| 剔除 | `CULL_FACE` | 面剔除 |
| 深度测试 | `DEPTH_TEST` | 深度检测 |
| 抖动 | `DITHER` | 颜色抖动 |
| 多边形偏移 | `POLYGON_OFFSET_FILL` | 防止 Z-fighting |
| 采样覆盖 | `SAMPLE_COVERAGE` | 多重采样覆盖 |
| 采样遮罩 | `SAMPLE_ALPHA_TO_COVERAGE` | Alpha 到覆盖 |
| 裁剪测试 | `SCISSOR_TEST` | 裁剪区域 |
| 模板测试 | `STENCIL_TEST` | 模板检测 |
| 光栅化丢弃 | `RASTERIZER_DISCARD` | 禁止光栅化 |

### 设置视口和裁剪

```javascript
// 设置视口
// viewport(x, y, width, height)
gl.viewport(0, 0, canvas.width, canvas.height);

// 设置裁剪区域（需要先启用 SCISSOR_TEST）
gl.enable(gl.SCISSOR_TEST);
gl.scissor(100, 100, 400, 300);

// 获取当前视口
const viewport = gl.getParameter(gl.VIEWPORT);
console.log('视口:', viewport); // Int32Array [x, y, width, height]
```

### 设置清除值

```javascript
// 设置清除颜色
gl.clearColor(0.0, 0.0, 0.0, 1.0);

// 设置清除深度
gl.clearDepth(1.0);

// 设置清除模板值
gl.clearStencil(0);

// 清除缓冲区
gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
```

## 绑定点系统

### 什么是绑定点

WebGL 使用绑定点来连接资源和操作。操作作用于当前绑定到特定绑定点的对象。

```
┌─────────────────────────────────────────────┐
│              绑定点系统                      │
├─────────────────────────────────────────────┤
│                                             │
│  ARRAY_BUFFER  ────────→ 顶点数据缓冲       │
│  ELEMENT_ARRAY_BUFFER ──→ 索引数据缓冲      │
│  TEXTURE_2D ───────────→ 2D 纹理            │
│  FRAMEBUFFER ──────────→ 帧缓冲对象         │
│  RENDERBUFFER ─────────→ 渲染缓冲对象       │
│  ...                                        │
│                                             │
└─────────────────────────────────────────────┘
```

### 缓冲区绑定

```javascript
// 创建缓冲区
const buffer = gl.createBuffer();

// 绑定到 ARRAY_BUFFER 绑定点
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

// 后续操作作用于当前绑定的缓冲区
gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

// 解绑
gl.bindBuffer(gl.ARRAY_BUFFER, null);
```

### 纹理绑定

```javascript
// 创建纹理
const texture = gl.createTexture();

// 激活纹理单元
gl.activeTexture(gl.TEXTURE0);

// 绑定到 TEXTURE_2D 绑定点
gl.bindTexture(gl.TEXTURE_2D, texture);

// 后续操作作用于当前绑定的纹理
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
```

## 程序状态

### 着色器程序切换

```javascript
// 创建和链接程序后
const program = createProgram(gl, vertexShader, fragmentShader);

// 使用程序
gl.useProgram(program);

// 获取当前使用的程序
const currentProgram = gl.getParameter(gl.CURRENT_PROGRAM);

// 停止使用任何程序
gl.useProgram(null);
```

### 查询程序状态

```javascript
// 获取 uniform 位置
const uLocation = gl.getUniformLocation(program, 'u_matrix');

// 获取 attribute 位置
const aPosition = gl.getAttribLocation(program, 'a_position');

// 获取活动 uniform 数量
const uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);

// 获取活动 attribute 数量
const attribCount = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
```

## 状态管理最佳实践

### 封装状态管理器

```javascript
class GLStateManager {
  constructor(gl) {
    this.gl = gl;
    this.currentProgram = null;
    this.currentVAO = null;
    this.currentTextures = new Array(32).fill(null);
    this.depthTest = false;
    this.blend = false;
  }
  
  useProgram(program) {
    if (this.currentProgram !== program) {
      this.gl.useProgram(program);
      this.currentProgram = program;
    }
  }
  
  bindVAO(vao) {
    if (this.currentVAO !== vao) {
      this.gl.bindVertexArray(vao);
      this.currentVAO = vao;
    }
  }
  
  bindTexture(unit, texture) {
    if (this.currentTextures[unit] !== texture) {
      this.gl.activeTexture(this.gl.TEXTURE0 + unit);
      this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
      this.currentTextures[unit] = texture;
    }
  }
  
  setDepthTest(enabled) {
    if (this.depthTest !== enabled) {
      if (enabled) {
        this.gl.enable(this.gl.DEPTH_TEST);
      } else {
        this.gl.disable(this.gl.DEPTH_TEST);
      }
      this.depthTest = enabled;
    }
  }
  
  setBlend(enabled) {
    if (this.blend !== enabled) {
      if (enabled) {
        this.gl.enable(this.gl.BLEND);
      } else {
        this.gl.disable(this.gl.BLEND);
      }
      this.blend = enabled;
    }
  }
}
```

### 状态保存与恢复

```javascript
// 保存当前状态
function saveState(gl) {
  return {
    program: gl.getParameter(gl.CURRENT_PROGRAM),
    viewport: gl.getParameter(gl.VIEWPORT),
    depthTest: gl.isEnabled(gl.DEPTH_TEST),
    blend: gl.isEnabled(gl.BLEND),
    cullFace: gl.isEnabled(gl.CULL_FACE),
    activeTexture: gl.getParameter(gl.ACTIVE_TEXTURE),
    arrayBuffer: gl.getParameter(gl.ARRAY_BUFFER_BINDING)
  };
}

// 恢复状态
function restoreState(gl, state) {
  gl.useProgram(state.program);
  gl.viewport(...state.viewport);
  state.depthTest ? gl.enable(gl.DEPTH_TEST) : gl.disable(gl.DEPTH_TEST);
  state.blend ? gl.enable(gl.BLEND) : gl.disable(gl.BLEND);
  state.cullFace ? gl.enable(gl.CULL_FACE) : gl.disable(gl.CULL_FACE);
  gl.activeTexture(state.activeTexture);
  gl.bindBuffer(gl.ARRAY_BUFFER, state.arrayBuffer);
}
```

## 错误处理

### 检查 WebGL 错误

```javascript
function checkGLError(gl) {
  const error = gl.getError();
  switch (error) {
    case gl.NO_ERROR:
      return null;
    case gl.INVALID_ENUM:
      return 'INVALID_ENUM: 枚举参数无效';
    case gl.INVALID_VALUE:
      return 'INVALID_VALUE: 数值参数无效';
    case gl.INVALID_OPERATION:
      return 'INVALID_OPERATION: 当前状态不允许此操作';
    case gl.INVALID_FRAMEBUFFER_OPERATION:
      return 'INVALID_FRAMEBUFFER_OPERATION: 帧缓冲不完整';
    case gl.OUT_OF_MEMORY:
      return 'OUT_OF_MEMORY: 内存不足';
    case gl.CONTEXT_LOST_WEBGL:
      return 'CONTEXT_LOST_WEBGL: 上下文丢失';
    default:
      return `未知错误: ${error}`;
  }
}

// 使用
function glCall(fn) {
  const result = fn();
  const error = checkGLError(gl);
  if (error) {
    console.error('WebGL 错误:', error);
  }
  return result;
}
```

### 上下文丢失处理

```javascript
canvas.addEventListener('webglcontextlost', (event) => {
  event.preventDefault();
  console.log('WebGL 上下文丢失');
  // 停止渲染循环
  cancelAnimationFrame(animationId);
});

canvas.addEventListener('webglcontextrestored', () => {
  console.log('WebGL 上下文恢复');
  // 重新初始化资源
  initResources();
  // 重启渲染循环
  requestAnimationFrame(renderLoop);
});
```

## 本章小结

- WebGL 是状态机模型，设置的状态会持续生效直到修改
- 上下文属性在创建时指定，影响渲染能力
- 绑定点系统用于连接资源和操作
- 状态管理对性能和正确性至关重要
- 需要处理错误和上下文丢失情况

下一章，我们将绘制第一个 WebGL 图形——三角形。
