# 调试工具

> "调试是发现问题的艺术，好的工具能让这个过程事半功倍。"

## 浏览器开发者工具

### Chrome DevTools

```
┌─────────────────────────────────────────────────────────┐
│                Chrome 调试功能                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   Performance 面板:                                     │
│   - 帧率分析                                            │
│   - GPU 活动时间线                                      │
│   - JavaScript 执行时间                                 │
│                                                         │
│   Memory 面板:                                          │
│   - 内存快照                                            │
│   - 内存泄漏检测                                        │
│                                                         │
│   Console:                                              │
│   - WebGL 错误日志                                      │
│   - 自定义调试输出                                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 启用 WebGL 调试

```javascript
// 获取带有调试扩展的上下文
const gl = canvas.getContext('webgl2', {
  // 开发时启用，生产环境关闭
  powerPreference: 'high-performance',
  failIfMajorPerformanceCaveat: false
});

// 检查上下文是否丢失
canvas.addEventListener('webglcontextlost', (event) => {
  event.preventDefault();
  console.error('WebGL context lost');
});

canvas.addEventListener('webglcontextrestored', () => {
  console.log('WebGL context restored');
  // 重新初始化资源
  initWebGL();
});
```

## Spector.js

### 安装和使用

```html
<!-- CDN 引入 -->
<script src="https://cdn.jsdelivr.net/npm/spectorjs@0.9.30/dist/spector.bundle.js"></script>

<script>
const spector = new SPECTOR.Spector();

// 启动 UI
spector.displayUI();

// 或者手动捕获
spector.onCapture.add((capture) => {
  console.log('Capture:', capture);
});

// 捕获下一帧
spector.captureNextFrame(canvas);
</script>
```

### 功能

```
┌─────────────────────────────────────────────────────────┐
│                Spector.js 功能                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   命令列表:                                              │
│   - 查看每个 WebGL 调用                                 │
│   - 参数和返回值                                        │
│   - 调用耗时                                            │
│                                                         │
│   状态查看:                                              │
│   - 当前绑定的缓冲区、纹理                              │
│   - 着色器程序                                          │
│   - 混合状态、深度状态等                                │
│                                                         │
│   资源查看:                                              │
│   - 纹理内容预览                                        │
│   - 缓冲区数据                                          │
│   - 着色器源码                                          │
│                                                         │
│   帧缓冲查看:                                            │
│   - 每个绘制调用后的结果                                │
│   - 深度/模板缓冲可视化                                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## WebGL Inspector

### Chrome 扩展

WebGL Inspector 是一个 Chrome 扩展，提供类似 Spector.js 的功能。

### 主要功能

- 帧捕获和回放
- 资源管理器
- 着色器编辑器
- 状态检查器

## 自定义调试工具

### 错误检查包装器

```javascript
function createDebugContext(gl) {
  const wrapper = {};
  
  // 包装所有 GL 函数
  for (const key in gl) {
    if (typeof gl[key] === 'function') {
      wrapper[key] = function(...args) {
        const result = gl[key].apply(gl, args);
        
        // 检查错误
        const error = gl.getError();
        if (error !== gl.NO_ERROR) {
          const errorName = getErrorName(gl, error);
          console.error(`WebGL Error in ${key}:`, errorName);
          console.trace();
        }
        
        return result;
      };
    } else {
      // 复制常量
      wrapper[key] = gl[key];
    }
  }
  
  return wrapper;
}

function getErrorName(gl, error) {
  switch (error) {
    case gl.INVALID_ENUM: return 'INVALID_ENUM';
    case gl.INVALID_VALUE: return 'INVALID_VALUE';
    case gl.INVALID_OPERATION: return 'INVALID_OPERATION';
    case gl.INVALID_FRAMEBUFFER_OPERATION: return 'INVALID_FRAMEBUFFER_OPERATION';
    case gl.OUT_OF_MEMORY: return 'OUT_OF_MEMORY';
    case gl.CONTEXT_LOST_WEBGL: return 'CONTEXT_LOST_WEBGL';
    default: return `Unknown error: ${error}`;
  }
}

// 使用
const debugGL = createDebugContext(gl);
```

### 着色器调试

```javascript
function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    const typeName = type === gl.VERTEX_SHADER ? 'Vertex' : 'Fragment';
    
    // 格式化错误信息
    console.error(`${typeName} Shader Compilation Error:`);
    
    // 解析行号
    const lines = source.split('\n');
    const errorLines = log.match(/ERROR: \d+:(\d+):/g) || [];
    
    errorLines.forEach(match => {
      const lineNum = parseInt(match.match(/:(\d+):/)[1]);
      console.error(`Line ${lineNum}: ${lines[lineNum - 1]}`);
    });
    
    console.error(log);
    
    gl.deleteShader(shader);
    return null;
  }
  
  return shader;
}

function linkProgram(gl, vs, fs) {
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program);
    console.error('Program Link Error:', log);
    gl.deleteProgram(program);
    return null;
  }
  
  // 验证程序
  gl.validateProgram(program);
  if (!gl.getProgramParameter(program, gl.VALIDATE_STATUS)) {
    console.warn('Program Validation Warning:', gl.getProgramInfoLog(program));
  }
  
  return program;
}
```

### 可视化调试输出

```glsl
// 调试片元着色器 - 可视化法线
#version 300 es
precision highp float;

in vec3 v_normal;
out vec4 fragColor;

uniform int u_debugMode;

void main() {
  if (u_debugMode == 0) {
    // 正常渲染
    fragColor = vec4(1.0);
  } else if (u_debugMode == 1) {
    // 显示法线
    fragColor = vec4(v_normal * 0.5 + 0.5, 1.0);
  } else if (u_debugMode == 2) {
    // 显示 UV
    fragColor = vec4(v_texCoord, 0.0, 1.0);
  } else if (u_debugMode == 3) {
    // 显示深度
    float depth = gl_FragCoord.z;
    fragColor = vec4(vec3(depth), 1.0);
  }
}
```

```javascript
// JavaScript 端切换调试模式
document.addEventListener('keydown', (e) => {
  switch (e.key) {
    case '1': debugMode = 0; break;  // 正常
    case '2': debugMode = 1; break;  // 法线
    case '3': debugMode = 2; break;  // UV
    case '4': debugMode = 3; break;  // 深度
  }
  gl.uniform1i(u_debugMode, debugMode);
});
```

## 帧缓冲调试

### 可视化帧缓冲内容

```javascript
class FramebufferDebugger {
  constructor(gl) {
    this.gl = gl;
    this.program = this.createDebugProgram();
    this.quad = this.createQuad();
  }
  
  createDebugProgram() {
    return createProgram(this.gl, `
      #version 300 es
      layout(location = 0) in vec2 a_position;
      layout(location = 1) in vec2 a_texCoord;
      out vec2 v_texCoord;
      void main() {
        v_texCoord = a_texCoord;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `, `
      #version 300 es
      precision highp float;
      in vec2 v_texCoord;
      out vec4 fragColor;
      
      uniform sampler2D u_texture;
      uniform int u_channel;  // 0=RGB, 1=R, 2=G, 3=B, 4=A
      uniform float u_scale;
      uniform float u_bias;
      
      void main() {
        vec4 sample = texture(u_texture, v_texCoord);
        vec3 color;
        
        if (u_channel == 0) {
          color = sample.rgb;
        } else if (u_channel == 1) {
          color = vec3(sample.r);
        } else if (u_channel == 2) {
          color = vec3(sample.g);
        } else if (u_channel == 3) {
          color = vec3(sample.b);
        } else {
          color = vec3(sample.a);
        }
        
        color = color * u_scale + u_bias;
        fragColor = vec4(color, 1.0);
      }
    `);
  }
  
  visualize(texture, x, y, width, height, options = {}) {
    const gl = this.gl;
    const { channel = 0, scale = 1.0, bias = 0.0 } = options;
    
    // 设置视口
    gl.viewport(x, y, width, height);
    
    // 使用调试程序
    gl.useProgram(this.program);
    
    // 绑定纹理
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(gl.getUniformLocation(this.program, 'u_texture'), 0);
    
    // 设置参数
    gl.uniform1i(gl.getUniformLocation(this.program, 'u_channel'), channel);
    gl.uniform1f(gl.getUniformLocation(this.program, 'u_scale'), scale);
    gl.uniform1f(gl.getUniformLocation(this.program, 'u_bias'), bias);
    
    // 绘制
    gl.bindVertexArray(this.quad);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  
  // 在屏幕角落显示多个纹理
  showThumbnails(textures, size = 200) {
    const gl = this.gl;
    gl.disable(gl.DEPTH_TEST);
    
    textures.forEach((tex, i) => {
      const x = i * size;
      const y = 0;
      this.visualize(tex, x, y, size, size);
    });
  }
}
```

### 深度缓冲可视化

```glsl
#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_depthTexture;
uniform float u_near;
uniform float u_far;

float linearizeDepth(float depth) {
  float z = depth * 2.0 - 1.0;
  return (2.0 * u_near * u_far) / (u_far + u_near - z * (u_far - u_near));
}

void main() {
  float depth = texture(u_depthTexture, v_texCoord).r;
  float linear = linearizeDepth(depth);
  float normalized = linear / u_far;
  
  fragColor = vec4(vec3(normalized), 1.0);
}
```

## 性能分析

### 绘制调用统计

```javascript
class DrawCallTracker {
  constructor(gl) {
    this.gl = gl;
    this.stats = this.reset();
    
    // 包装绘制函数
    this.wrapDrawCalls();
  }
  
  reset() {
    return {
      drawArrays: 0,
      drawElements: 0,
      drawArraysInstanced: 0,
      drawElementsInstanced: 0,
      totalDrawCalls: 0,
      triangles: 0,
      vertices: 0
    };
  }
  
  wrapDrawCalls() {
    const gl = this.gl;
    const self = this;
    
    const originalDrawArrays = gl.drawArrays.bind(gl);
    gl.drawArrays = function(mode, first, count) {
      self.stats.drawArrays++;
      self.stats.totalDrawCalls++;
      self.stats.vertices += count;
      if (mode === gl.TRIANGLES) {
        self.stats.triangles += count / 3;
      }
      return originalDrawArrays(mode, first, count);
    };
    
    const originalDrawElements = gl.drawElements.bind(gl);
    gl.drawElements = function(mode, count, type, offset) {
      self.stats.drawElements++;
      self.stats.totalDrawCalls++;
      self.stats.vertices += count;
      if (mode === gl.TRIANGLES) {
        self.stats.triangles += count / 3;
      }
      return originalDrawElements(mode, count, type, offset);
    };
    
    const originalDrawArraysInstanced = gl.drawArraysInstanced.bind(gl);
    gl.drawArraysInstanced = function(mode, first, count, instanceCount) {
      self.stats.drawArraysInstanced++;
      self.stats.totalDrawCalls++;
      self.stats.vertices += count * instanceCount;
      if (mode === gl.TRIANGLES) {
        self.stats.triangles += (count / 3) * instanceCount;
      }
      return originalDrawArraysInstanced(mode, first, count, instanceCount);
    };
    
    const originalDrawElementsInstanced = gl.drawElementsInstanced.bind(gl);
    gl.drawElementsInstanced = function(mode, count, type, offset, instanceCount) {
      self.stats.drawElementsInstanced++;
      self.stats.totalDrawCalls++;
      self.stats.vertices += count * instanceCount;
      if (mode === gl.TRIANGLES) {
        self.stats.triangles += (count / 3) * instanceCount;
      }
      return originalDrawElementsInstanced(mode, count, type, offset, instanceCount);
    };
  }
  
  beginFrame() {
    this.stats = this.reset();
  }
  
  endFrame() {
    return { ...this.stats };
  }
  
  getStats() {
    return this.stats;
  }
}
```

### 显示统计信息

```javascript
class DebugOverlay {
  constructor() {
    this.element = document.createElement('div');
    this.element.style.cssText = `
      position: fixed;
      top: 10px;
      left: 10px;
      background: rgba(0, 0, 0, 0.7);
      color: #0f0;
      font-family: monospace;
      font-size: 12px;
      padding: 10px;
      z-index: 10000;
      white-space: pre;
    `;
    document.body.appendChild(this.element);
  }
  
  update(stats) {
    this.element.textContent = `
FPS: ${stats.fps.toFixed(1)}
Frame Time: ${stats.frameTime.toFixed(2)}ms
Draw Calls: ${stats.drawCalls}
Triangles: ${stats.triangles.toLocaleString()}
Vertices: ${stats.vertices.toLocaleString()}
Textures: ${stats.textureBinds}
State Changes: ${stats.stateChanges}
    `.trim();
  }
}
```

## 内存监控

### 资源追踪

```javascript
class ResourceTracker {
  constructor(gl) {
    this.gl = gl;
    this.resources = {
      textures: new Set(),
      buffers: new Set(),
      framebuffers: new Set(),
      renderbuffers: new Set(),
      programs: new Set(),
      shaders: new Set()
    };
    
    this.wrapCreationFunctions();
  }
  
  wrapCreationFunctions() {
    const gl = this.gl;
    const self = this;
    
    // 纹理
    const originalCreateTexture = gl.createTexture.bind(gl);
    gl.createTexture = function() {
      const texture = originalCreateTexture();
      self.resources.textures.add(texture);
      return texture;
    };
    
    const originalDeleteTexture = gl.deleteTexture.bind(gl);
    gl.deleteTexture = function(texture) {
      self.resources.textures.delete(texture);
      return originalDeleteTexture(texture);
    };
    
    // 缓冲区
    const originalCreateBuffer = gl.createBuffer.bind(gl);
    gl.createBuffer = function() {
      const buffer = originalCreateBuffer();
      self.resources.buffers.add(buffer);
      return buffer;
    };
    
    const originalDeleteBuffer = gl.deleteBuffer.bind(gl);
    gl.deleteBuffer = function(buffer) {
      self.resources.buffers.delete(buffer);
      return originalDeleteBuffer(buffer);
    };
    
    // 类似地包装其他资源类型...
  }
  
  getStats() {
    return {
      textures: this.resources.textures.size,
      buffers: this.resources.buffers.size,
      framebuffers: this.resources.framebuffers.size,
      renderbuffers: this.resources.renderbuffers.size,
      programs: this.resources.programs.size,
      shaders: this.resources.shaders.size
    };
  }
  
  findLeaks() {
    // 检查是否有未删除的资源
    const stats = this.getStats();
    const warnings = [];
    
    if (stats.shaders > stats.programs * 2) {
      warnings.push('可能有未删除的着色器');
    }
    
    return warnings;
  }
}
```

## 常见问题排查

### 问题清单

```
┌─────────────────────────────────────────────────────────┐
│                常见 WebGL 问题                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   黑屏:                                                 │
│   - 检查着色器编译错误                                  │
│   - 检查矩阵是否正确                                    │
│   - 检查 clearColor 和 clear 调用                      │
│   - 检查视口设置                                        │
│                                                         │
│   闪烁/撕裂:                                            │
│   - 确保使用 requestAnimationFrame                     │
│   - 检查深度测试设置                                    │
│   - 检查绘制顺序                                        │
│                                                         │
│   性能差:                                               │
│   - 减少绘制调用                                        │
│   - 检查着色器复杂度                                    │
│   - 检查是否有过度绘制                                  │
│                                                         │
│   纹理问题:                                              │
│   - 检查纹理是否加载完成                                │
│   - 检查纹理参数（wrap、filter）                       │
│   - 非 2 的幂纹理需要特殊处理                          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 诊断函数

```javascript
function diagnoseWebGL(gl) {
  const report = [];
  
  // 检查 WebGL 版本
  const version = gl.getParameter(gl.VERSION);
  report.push(`WebGL Version: ${version}`);
  
  // 检查渲染器
  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
  if (debugInfo) {
    report.push(`Vendor: ${gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)}`);
    report.push(`Renderer: ${gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)}`);
  }
  
  // 检查限制
  report.push(`Max Texture Size: ${gl.getParameter(gl.MAX_TEXTURE_SIZE)}`);
  report.push(`Max Vertex Attribs: ${gl.getParameter(gl.MAX_VERTEX_ATTRIBS)}`);
  report.push(`Max Uniform Vectors: ${gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS)}`);
  report.push(`Max Color Attachments: ${gl.getParameter(gl.MAX_COLOR_ATTACHMENTS)}`);
  
  // 检查错误
  let error;
  while ((error = gl.getError()) !== gl.NO_ERROR) {
    report.push(`Error: ${getErrorName(gl, error)}`);
  }
  
  // 检查扩展
  const extensions = gl.getSupportedExtensions();
  report.push(`Extensions: ${extensions.length} available`);
  
  return report.join('\n');
}
```

## 本章小结

- 使用浏览器开发者工具分析性能
- Spector.js 可捕获和分析帧
- 自定义错误检查包装器发现问题
- 着色器调试输出可视化中间结果
- 帧缓冲调试器查看渲染目标内容
- 统计绘制调用和资源使用
- 系统性排查常见问题

下一章，我们将进入实战项目部分。
