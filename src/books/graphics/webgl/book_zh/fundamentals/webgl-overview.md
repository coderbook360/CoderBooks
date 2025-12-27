# WebGL 概述与环境搭建

> "WebGL 让网页浏览器拥有了真正的 3D 渲染能力。"

## 什么是 WebGL

### 为什么需要 WebGL？

在 WebGL 出现之前，浏览器中的图形渲染主要依赖两种技术：

1. **Canvas 2D**：功能强大，但只能绘制 2D 图形，无法利用 GPU 加速
2. **插件（如 Flash）**：支持 3D，但需要安装额外软件，有安全风险

WebGL 的出现解决了这些问题：**无需插件，直接在浏览器中利用 GPU 进行高性能 3D 渲染**。

如今，WebGL 广泛应用于：
- **3D 游戏**：从休闲游戏到复杂的多人在线游戏
- **数据可视化**：大规模数据的 3D 展示
- **CAD/建模**：浏览器中的设计软件
- **虚拟现实**：WebXR 体验

### WebGL 的定义

WebGL（Web Graphics Library）是一套在浏览器中渲染 2D 和 3D 图形的 JavaScript API。它基于 OpenGL ES 2.0/3.0 标准，无需任何插件即可在支持的浏览器中运行。

```
┌─────────────────────────────────────────────┐
│                 应用程序                     │
│          (JavaScript + WebGL API)           │
├─────────────────────────────────────────────┤
│                 浏览器                       │
│            (WebGL 实现层)                   │
├─────────────────────────────────────────────┤
│              图形驱动程序                    │
│         (OpenGL/DirectX/Vulkan)             │
├─────────────────────────────────────────────┤
│                  GPU                         │
│             (图形处理器)                     │
└─────────────────────────────────────────────┘
```

### WebGL 的版本

| 版本 | 基于 | 主要特性 | 浏览器支持 |
|------|------|---------|-----------|
| WebGL 1.0 | OpenGL ES 2.0 | 基础渲染 | 广泛支持 |
| WebGL 2.0 | OpenGL ES 3.0 | 更多特性 | 现代浏览器 |

### WebGL 与其他技术的关系

```
                    OpenGL
                       │
                       ▼
               OpenGL ES 2.0/3.0
                       │
           ┌───────────┴───────────┐
           │                       │
           ▼                       ▼
        WebGL                   移动设备
     (浏览器)               (Android/iOS)
```

## WebGL 的优势与局限

### 优势

1. **跨平台**：支持所有主流浏览器和操作系统
2. **无需插件**：原生支持，不需要 Flash 或其他插件
3. **硬件加速**：直接使用 GPU 进行渲染
4. **广泛访问**：用户无需安装即可使用

### 局限

1. **API 较底层**：需要编写大量样板代码
2. **调试困难**：GPU 编程的调试比 CPU 复杂
3. **浏览器差异**：不同浏览器实现可能有差异
4. **安全限制**：跨域资源访问受限

## 环境搭建

### 检查浏览器支持

```javascript
function checkWebGLSupport() {
  const canvas = document.createElement('canvas');
  
  // 尝试获取 WebGL 2.0 上下文
  let gl = canvas.getContext('webgl2');
  if (gl) {
    console.log('WebGL 2.0 支持');
    return 2;
  }
  
  // 尝试获取 WebGL 1.0 上下文
  gl = canvas.getContext('webgl') || 
       canvas.getContext('experimental-webgl');
  if (gl) {
    console.log('WebGL 1.0 支持');
    return 1;
  }
  
  console.log('WebGL 不支持');
  return 0;
}
```

### 创建基础 HTML 结构

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WebGL 入门</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      overflow: hidden;
      background: #000;
    }
    
    #canvas {
      display: block;
      width: 100vw;
      height: 100vh;
    }
  </style>
</head>
<body>
  <canvas id="canvas"></canvas>
  <script src="main.js"></script>
</body>
</html>
```

### 获取 WebGL 上下文

```javascript
// main.js
function initWebGL() {
  // 获取 canvas 元素
  const canvas = document.getElementById('canvas');
  
  // 设置 canvas 实际尺寸（像素）
  canvas.width = window.innerWidth * window.devicePixelRatio;
  canvas.height = window.innerHeight * window.devicePixelRatio;
  
  // 获取 WebGL 上下文
  const gl = canvas.getContext('webgl2', {
    alpha: false,              // 是否包含 alpha 缓冲区
    antialias: true,           // 是否开启抗锯齿
    depth: true,               // 是否有深度缓冲区
    stencil: false,            // 是否有模板缓冲区
    premultipliedAlpha: true,  // 预乘 alpha
    preserveDrawingBuffer: false, // 是否保留绘制缓冲区
    powerPreference: 'high-performance' // 使用高性能 GPU
  });
  
  if (!gl) {
    alert('无法初始化 WebGL，您的浏览器可能不支持。');
    return null;
  }
  
  return gl;
}

// 初始化
const gl = initWebGL();
if (gl) {
  console.log('WebGL 版本:', gl.getParameter(gl.VERSION));
  console.log('GLSL 版本:', gl.getParameter(gl.SHADING_LANGUAGE_VERSION));
  console.log('厂商:', gl.getParameter(gl.VENDOR));
  console.log('渲染器:', gl.getParameter(gl.RENDERER));
}
```

## 基础渲染流程

### 清除画布

```javascript
function render() {
  // 设置清除颜色（RGBA，范围 0-1）
  gl.clearColor(0.1, 0.1, 0.2, 1.0);
  
  // 清除颜色缓冲区和深度缓冲区
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
}

// 执行渲染
render();
```

### 处理窗口大小变化

```javascript
function resize() {
  const canvas = gl.canvas;
  const displayWidth = canvas.clientWidth * window.devicePixelRatio;
  const displayHeight = canvas.clientHeight * window.devicePixelRatio;
  
  if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
    canvas.width = displayWidth;
    canvas.height = displayHeight;
    
    // 更新视口
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
}

// 监听窗口大小变化
window.addEventListener('resize', () => {
  resize();
  render();
});

// 初始调用
resize();
```

### 渲染循环

```javascript
function renderLoop(time) {
  // 处理尺寸变化
  resize();
  
  // 渲染
  render();
  
  // 请求下一帧
  requestAnimationFrame(renderLoop);
}

// 启动渲染循环
requestAnimationFrame(renderLoop);
```

## 开发工具推荐

### 浏览器开发者工具

| 工具 | 说明 |
|------|------|
| Chrome DevTools | 基础调试 |
| Spector.js | WebGL 调试扩展 |
| WebGL Inspector | WebGL 状态查看 |

### 代码编辑器

推荐 VS Code，配合以下扩展：
- GLSL Lint：GLSL 语法检查
- Shader languages support：着色器语法高亮

### 在线调试工具

- [WebGL Report](https://webglreport.com/)：查看 WebGL 能力
- [Shadertoy](https://www.shadertoy.com/)：着色器编写练习

## 本章小结

- WebGL 是在浏览器中进行 GPU 渲染的 JavaScript API
- WebGL 基于 OpenGL ES，无需插件即可运行
- 环境搭建包括创建 Canvas、获取上下文、设置渲染循环
- 良好的开发工具能大大提高开发效率

下一章，我们将深入了解 WebGL 上下文和状态机模型。
