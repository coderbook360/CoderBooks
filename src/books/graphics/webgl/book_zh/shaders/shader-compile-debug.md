# 着色器的编译、链接与调试

> "良好的错误处理和调试能力是高效 WebGL 开发的关键。"

## 着色器编译流程

### 完整生命周期

```
┌──────────────────────────────────────────────────────────┐
│                    着色器生命周期                         │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  创建 ──→ 附加源码 ──→ 编译 ──→ 附加到程序 ──→ 删除      │
│                                                          │
│  createShader → shaderSource → compileShader → attach    │
│                                                          │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│                    程序生命周期                           │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  创建 ──→ 附加着色器 ──→ 链接 ──→ 使用 ──→ 删除          │
│                                                          │
│  createProgram → attachShader → linkProgram → useProgram │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 编译着色器

```javascript
function compileShader(gl, type, source) {
  // 创建着色器对象
  const shader = gl.createShader(type);
  
  // 附加源代码
  gl.shaderSource(shader, source);
  
  // 编译
  gl.compileShader(shader);
  
  // 检查编译状态
  const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  
  if (!success) {
    // 获取错误信息
    const info = gl.getShaderInfoLog(shader);
    
    // 清理
    gl.deleteShader(shader);
    
    // 格式化错误信息
    const typeName = type === gl.VERTEX_SHADER ? 'Vertex' : 'Fragment';
    throw new Error(`${typeName} shader compilation failed:\n${info}`);
  }
  
  return shader;
}
```

### 链接程序

```javascript
function createProgram(gl, vertexShader, fragmentShader) {
  // 创建程序
  const program = gl.createProgram();
  
  // 附加着色器
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  
  // 链接
  gl.linkProgram(program);
  
  // 检查链接状态
  const success = gl.getProgramParameter(program, gl.LINK_STATUS);
  
  if (!success) {
    const info = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`Program linking failed:\n${info}`);
  }
  
  return program;
}
```

### 验证程序

```javascript
function validateProgram(gl, program) {
  gl.validateProgram(program);
  
  const valid = gl.getProgramParameter(program, gl.VALIDATE_STATUS);
  
  if (!valid) {
    const info = gl.getProgramInfoLog(program);
    console.warn(`Program validation warning:\n${info}`);
  }
  
  return valid;
}
```

## 错误类型

### 常见编译错误

| 错误信息 | 可能原因 | 解决方法 |
|---------|---------|---------|
| `Syntax error` | 语法错误 | 检查分号、括号 |
| `Undeclared identifier` | 变量未声明 | 声明变量或检查拼写 |
| `Type mismatch` | 类型不匹配 | 检查变量类型 |
| `No default precision` | 片元着色器未指定精度 | 添加 `precision` 声明 |
| `Cannot find function` | 函数不存在 | 检查函数名和参数 |

### 常见链接错误

| 错误信息 | 可能原因 | 解决方法 |
|---------|---------|---------|
| `Varying type mismatch` | varying 类型不匹配 | 确保顶点和片元着色器 varying 类型一致 |
| `Varying name not found` | varying 名称不匹配 | 检查变量名拼写 |
| `Undefined reference` | 引用了未定义的函数 | 确保函数已定义 |

### 错误信息解析

```javascript
function parseShaderError(infoLog, source) {
  const lines = source.split('\n');
  const errors = [];
  
  // 解析错误格式: "ERROR: 0:12: ..."
  const errorRegex = /ERROR:\s*\d+:(\d+):\s*(.+)/g;
  
  let match;
  while ((match = errorRegex.exec(infoLog)) !== null) {
    const lineNum = parseInt(match[1]) - 1;
    const message = match[2];
    
    errors.push({
      line: lineNum + 1,
      message: message,
      source: lines[lineNum] || ''
    });
  }
  
  return errors;
}

// 使用
try {
  compileShader(gl, gl.FRAGMENT_SHADER, source);
} catch (e) {
  const errors = parseShaderError(e.message, source);
  errors.forEach(err => {
    console.error(`Line ${err.line}: ${err.message}`);
    console.error(`  ${err.source}`);
  });
}
```

## 调试技术

### 颜色编码调试

```glsl
// 在片元着色器中输出调试信息

// 可视化法线
fragColor = vec4(v_normal * 0.5 + 0.5, 1.0);

// 可视化纹理坐标
fragColor = vec4(v_texCoord, 0.0, 1.0);

// 可视化深度
fragColor = vec4(vec3(gl_FragCoord.z), 1.0);

// 可视化世界位置
fragColor = vec4(fract(v_worldPos), 1.0);

// 可视化光照分量
fragColor = vec4(vec3(diffuse), 1.0);  // 仅漫反射
fragColor = vec4(vec3(specular), 1.0); // 仅镜面反射

// 检查 NaN 或 Inf
if (any(isnan(color)) || any(isinf(color))) {
  fragColor = vec4(1.0, 0.0, 1.0, 1.0); // 洋红色表示错误
} else {
  fragColor = color;
}
```

### 条件编译

```glsl
#define DEBUG_NORMALS 0
#define DEBUG_UV 0
#define DEBUG_DEPTH 0

void main() {
  // 正常渲染
  vec4 finalColor = calculateLighting();
  
  #if DEBUG_NORMALS
    finalColor = vec4(v_normal * 0.5 + 0.5, 1.0);
  #elif DEBUG_UV
    finalColor = vec4(v_texCoord, 0.0, 1.0);
  #elif DEBUG_DEPTH
    finalColor = vec4(vec3(gl_FragCoord.z), 1.0);
  #endif
  
  fragColor = finalColor;
}
```

### 使用 Uniform 控制调试

```glsl
uniform int u_debugMode;

void main() {
  vec4 color = calculateLighting();
  
  if (u_debugMode == 1) {
    color = vec4(v_normal * 0.5 + 0.5, 1.0);
  } else if (u_debugMode == 2) {
    color = vec4(v_texCoord, 0.0, 1.0);
  } else if (u_debugMode == 3) {
    color = vec4(vec3(gl_FragCoord.z), 1.0);
  }
  
  fragColor = color;
}
```

```javascript
// JavaScript 控制
let debugMode = 0;

document.addEventListener('keydown', (e) => {
  if (e.key >= '0' && e.key <= '9') {
    debugMode = parseInt(e.key);
    gl.uniform1i(u_debugMode, debugMode);
  }
});
```

## 开发工具

### Spector.js

```html
<!-- 引入 Spector.js -->
<script src="https://spectorcdn.babylonjs.com/spector.bundle.js"></script>

<script>
  // 自动捕获
  const spector = new SPECTOR.Spector();
  spector.displayUI();
  
  // 或者手动捕获
  spector.captureNextFrame(canvas);
</script>
```

**Spector.js 功能**：
- 捕获 WebGL 命令
- 查看着色器源码
- 检查状态变化
- 分析绘制调用

### WebGL Inspector

Chrome 扩展，提供：
- 实时状态查看
- 帧捕获
- 资源检查

### 控制台日志

```javascript
// 封装 WebGL 调用日志
function wrapGL(gl) {
  const wrapped = {};
  
  for (const key in gl) {
    if (typeof gl[key] === 'function') {
      wrapped[key] = function(...args) {
        console.log(`gl.${key}(${args.join(', ')})`);
        return gl[key].apply(gl, args);
      };
    } else {
      wrapped[key] = gl[key];
    }
  }
  
  return wrapped;
}
```

## 着色器管理

### 着色器缓存

```javascript
class ShaderCache {
  constructor(gl) {
    this.gl = gl;
    this.shaders = new Map();
    this.programs = new Map();
  }
  
  getShader(source, type) {
    const key = `${type}_${source}`;
    
    if (!this.shaders.has(key)) {
      const shader = compileShader(this.gl, type, source);
      this.shaders.set(key, shader);
    }
    
    return this.shaders.get(key);
  }
  
  getProgram(vsSource, fsSource) {
    const key = `${vsSource}_${fsSource}`;
    
    if (!this.programs.has(key)) {
      const vs = this.getShader(vsSource, this.gl.VERTEX_SHADER);
      const fs = this.getShader(fsSource, this.gl.FRAGMENT_SHADER);
      const program = createProgram(this.gl, vs, fs);
      this.programs.set(key, program);
    }
    
    return this.programs.get(key);
  }
  
  clear() {
    for (const shader of this.shaders.values()) {
      this.gl.deleteShader(shader);
    }
    for (const program of this.programs.values()) {
      this.gl.deleteProgram(program);
    }
    this.shaders.clear();
    this.programs.clear();
  }
}
```

### 热重载

```javascript
class ShaderHotReload {
  constructor(gl, shaderCache) {
    this.gl = gl;
    this.cache = shaderCache;
    this.listeners = [];
  }
  
  watch(url, callback) {
    // 使用 WebSocket 或轮询检测变化
    const ws = new WebSocket(`ws://localhost:8080/watch?file=${url}`);
    
    ws.onmessage = async () => {
      try {
        const response = await fetch(url + '?t=' + Date.now());
        const source = await response.text();
        callback(source);
      } catch (e) {
        console.error('Shader reload failed:', e);
      }
    };
  }
  
  reloadProgram(vsUrl, fsUrl, onReload) {
    this.watch(vsUrl, (vsSource) => {
      this.watch(fsUrl, async (fsSource) => {
        try {
          const vs = compileShader(this.gl, this.gl.VERTEX_SHADER, vsSource);
          const fs = compileShader(this.gl, this.gl.FRAGMENT_SHADER, fsSource);
          const program = createProgram(this.gl, vs, fs);
          onReload(program);
          console.log('Shader reloaded successfully');
        } catch (e) {
          console.error('Shader reload error:', e);
        }
      });
    });
  }
}
```

## 最佳实践

### 代码组织

```javascript
// shaders/common.glsl
const commonGLSL = `
  #define PI 3.14159265359
  
  vec3 gammaCorrect(vec3 color) {
    return pow(color, vec3(1.0 / 2.2));
  }
`;

// 动态拼接
function buildShader(mainCode) {
  return `#version 300 es
precision highp float;
${commonGLSL}
${mainCode}
`;
}
```

### 清理资源

```javascript
function cleanupShaderProgram(gl, program) {
  // 获取附加的着色器
  const shaders = gl.getAttachedShaders(program);
  
  // 分离并删除着色器
  for (const shader of shaders) {
    gl.detachShader(program, shader);
    gl.deleteShader(shader);
  }
  
  // 删除程序
  gl.deleteProgram(program);
}
```

## 本章小结

- 着色器编译分为：创建、附加源码、编译、链接
- 良好的错误处理能加快开发速度
- 颜色编码是有效的调试方法
- 使用开发工具（Spector.js）深入分析
- 着色器缓存和热重载提升开发效率

下一章，我们将学习渲染管线的工作原理。
