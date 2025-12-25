# 第一个 WebGL 程序：绘制三角形

> "三角形是所有 3D 图形的基本组成单元。"

## 绘制三角形的完整流程

### 总体流程图

```
┌──────────────────┐
│  1. 准备顶点数据  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  2. 创建着色器    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  3. 创建缓冲区    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  4. 配置顶点属性  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  5. 绘制调用      │
└──────────────────┘
```

## 顶点数据

### 定义三角形顶点

```javascript
// 三角形的三个顶点坐标
// WebGL 使用归一化设备坐标 (NDC)
// X: -1 到 1 (左到右)
// Y: -1 到 1 (下到上)
const vertices = new Float32Array([
  // X,    Y
   0.0,  0.5,   // 顶部顶点
  -0.5, -0.5,   // 左下顶点
   0.5, -0.5    // 右下顶点
]);
```

### 坐标系统说明

```
          Y
          │
          │  (0, 0.5)
    1.0   │     ▲
          │    /│\
          │   / │ \
          │  /  │  \
          │ /   │   \
    ──────┼─────────────── X
   -1.0   │(-0.5,-0.5)  (0.5,-0.5)
          │
   -1.0   │
```

## 着色器代码

### 顶点着色器

```glsl
#version 300 es

// 输入顶点属性
in vec2 a_position;

void main() {
  // gl_Position 是内置变量，表示顶点的最终位置
  // 需要输出 vec4，所以补充 z=0, w=1
  gl_Position = vec4(a_position, 0.0, 1.0);
}
```

### 片元着色器

```glsl
#version 300 es

// 指定精度
precision highp float;

// 输出颜色
out vec4 fragColor;

void main() {
  // 输出红色
  fragColor = vec4(1.0, 0.0, 0.0, 1.0);
}
```

## 完整代码实现

### 创建和编译着色器

```javascript
// 创建着色器
function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  
  // 检查编译状态
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error('着色器编译失败: ' + info);
  }
  
  return shader;
}

// 创建程序
function createProgram(gl, vertexShader, fragmentShader) {
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  
  // 检查链接状态
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error('程序链接失败: ' + info);
  }
  
  return program;
}
```

### 主程序

```javascript
// 着色器源码
const vertexShaderSource = `#version 300 es
  in vec2 a_position;
  
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const fragmentShaderSource = `#version 300 es
  precision highp float;
  out vec4 fragColor;
  
  void main() {
    fragColor = vec4(1.0, 0.0, 0.0, 1.0);
  }
`;

// 初始化
function init() {
  const canvas = document.getElementById('canvas');
  const gl = canvas.getContext('webgl2');
  
  if (!gl) {
    alert('WebGL 2.0 不支持');
    return;
  }
  
  // 设置画布尺寸
  canvas.width = canvas.clientWidth * devicePixelRatio;
  canvas.height = canvas.clientHeight * devicePixelRatio;
  gl.viewport(0, 0, canvas.width, canvas.height);
  
  // 创建着色器
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  
  // 创建程序
  const program = createProgram(gl, vertexShader, fragmentShader);
  
  // 顶点数据
  const vertices = new Float32Array([
     0.0,  0.5,
    -0.5, -0.5,
     0.5, -0.5
  ]);
  
  // 创建 VAO
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  
  // 创建 VBO
  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  
  // 配置顶点属性
  const positionLoc = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(positionLoc);
  gl.vertexAttribPointer(
    positionLoc,  // attribute 位置
    2,            // 每个顶点的分量数 (x, y)
    gl.FLOAT,     // 数据类型
    false,        // 是否归一化
    0,            // 步长 (0 = 自动计算)
    0             // 偏移量
  );
  
  // 解绑 VAO
  gl.bindVertexArray(null);
  
  // 渲染函数
  function render() {
    // 清除画布
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    // 使用程序
    gl.useProgram(program);
    
    // 绑定 VAO
    gl.bindVertexArray(vao);
    
    // 绘制三角形
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  
  // 执行渲染
  render();
}

// 页面加载完成后初始化
window.onload = init;
```

## 代码详解

### 1. 着色器创建流程

```
gl.createShader(type)
        │
        ▼
gl.shaderSource(shader, source)
        │
        ▼
gl.compileShader(shader)
        │
        ▼
gl.getShaderParameter(shader, gl.COMPILE_STATUS)
        │
        ▼
    成功 / 失败
```

### 2. 程序链接流程

```
gl.createProgram()
        │
        ▼
gl.attachShader(program, vertexShader)
        │
        ▼
gl.attachShader(program, fragmentShader)
        │
        ▼
gl.linkProgram(program)
        │
        ▼
gl.getProgramParameter(program, gl.LINK_STATUS)
        │
        ▼
    成功 / 失败
```

### 3. 顶点属性配置

```javascript
gl.vertexAttribPointer(
  index,      // 属性索引
  size,       // 每个顶点的分量数 (1-4)
  type,       // 数据类型
  normalized, // 是否归一化到 [-1,1] 或 [0,1]
  stride,     // 相邻顶点的字节间隔
  offset      // 第一个分量的偏移量
);
```

### 4. 绘制命令

```javascript
gl.drawArrays(
  mode,   // 绘制模式
  first,  // 起始索引
  count   // 顶点数量
);
```

**绘制模式**：

| 模式 | 说明 |
|------|------|
| `POINTS` | 点 |
| `LINES` | 线段 |
| `LINE_STRIP` | 连续线段 |
| `LINE_LOOP` | 闭合线段 |
| `TRIANGLES` | 三角形 |
| `TRIANGLE_STRIP` | 三角形条带 |
| `TRIANGLE_FAN` | 三角形扇 |

## 添加颜色

### 修改顶点数据

```javascript
// 每个顶点包含位置 (x, y) 和颜色 (r, g, b)
const vertices = new Float32Array([
  // 位置        // 颜色
   0.0,  0.5,   1.0, 0.0, 0.0,  // 顶部 - 红色
  -0.5, -0.5,   0.0, 1.0, 0.0,  // 左下 - 绿色
   0.5, -0.5,   0.0, 0.0, 1.0   // 右下 - 蓝色
]);
```

### 修改顶点着色器

```glsl
#version 300 es

in vec2 a_position;
in vec3 a_color;

out vec3 v_color;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_color = a_color;
}
```

### 修改片元着色器

```glsl
#version 300 es

precision highp float;

in vec3 v_color;
out vec4 fragColor;

void main() {
  fragColor = vec4(v_color, 1.0);
}
```

### 配置多个属性

```javascript
const FLOAT_SIZE = 4; // Float32 的字节大小
const stride = 5 * FLOAT_SIZE; // 每个顶点 5 个分量

// 位置属性
const positionLoc = gl.getAttribLocation(program, 'a_position');
gl.enableVertexAttribArray(positionLoc);
gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, stride, 0);

// 颜色属性
const colorLoc = gl.getAttribLocation(program, 'a_color');
gl.enableVertexAttribArray(colorLoc);
gl.vertexAttribPointer(colorLoc, 3, gl.FLOAT, false, stride, 2 * FLOAT_SIZE);
```

## 渲染效果

渲染结果是一个彩色渐变三角形：
- 顶点颜色会在片元着色器中自动插值
- 产生平滑的颜色过渡效果

```
          红
          ▲
         /│\
        / │ \
       /  │  \
      /   │   \
     /    │    \
    ──────────────
   绿            蓝
```

## 本章小结

- 绘制需要：顶点数据、着色器、缓冲区、绘制调用
- VAO 封装了顶点属性配置
- VBO 存储顶点数据
- 着色器定义了顶点处理和像素着色逻辑
- 颜色插值由 GPU 自动完成

下一章，我们将详细了解 WebGL 的坐标系统和视口。
