# 着色器概述与工作流程

> "着色器是运行在 GPU 上的小程序，决定了每个顶点和像素如何被处理。"

## 什么是着色器

### 着色器的定义

着色器（Shader）是运行在 GPU 上的程序，使用 GLSL（OpenGL Shading Language）编写。着色器决定了图形如何被渲染。

```
┌─────────────────────────────────────────────┐
│                渲染管线                      │
├─────────────────────────────────────────────┤
│                                             │
│    顶点数据 ──→ 顶点着色器 ──→ 图元装配     │
│                     │                       │
│                     ▼                       │
│                  光栅化                      │
│                     │                       │
│                     ▼                       │
│               片元着色器 ──→ 帧缓冲          │
│                                             │
└─────────────────────────────────────────────┘
```

### 着色器类型

| 着色器类型 | 作用 | 执行频率 |
|-----------|------|---------|
| 顶点着色器 | 处理每个顶点 | 每顶点一次 |
| 片元着色器 | 处理每个片元（像素） | 每像素一次 |
| 几何着色器 | 处理图元（WebGL 2.0 不支持） | - |
| 计算着色器 | 通用计算（WebGL 不支持） | - |

## 顶点着色器

### 职责

- 接收顶点属性数据
- 进行坐标变换
- 输出顶点位置
- 传递数据给片元着色器

### 基本结构

```glsl
#version 300 es

// 输入：顶点属性
in vec3 a_position;
in vec2 a_texCoord;
in vec3 a_normal;

// 输出：传递给片元着色器
out vec2 v_texCoord;
out vec3 v_normal;

// Uniform：全局变量
uniform mat4 u_mvpMatrix;
uniform mat4 u_normalMatrix;

void main() {
  // 必须：设置顶点位置
  gl_Position = u_mvpMatrix * vec4(a_position, 1.0);
  
  // 传递数据
  v_texCoord = a_texCoord;
  v_normal = mat3(u_normalMatrix) * a_normal;
}
```

### 内置变量

| 变量 | 类型 | 说明 |
|------|------|------|
| `gl_Position` | vec4 | 输出顶点位置（必须设置） |
| `gl_PointSize` | float | 点的大小（绘制点时） |
| `gl_VertexID` | int | 当前顶点索引 |
| `gl_InstanceID` | int | 当前实例索引 |

## 片元着色器

### 职责

- 接收插值后的数据
- 计算片元颜色
- 执行纹理采样
- 实现光照效果

### 基本结构

```glsl
#version 300 es

// 必须指定精度
precision highp float;

// 输入：从顶点着色器插值而来
in vec2 v_texCoord;
in vec3 v_normal;

// 输出：片元颜色
out vec4 fragColor;

// Uniform
uniform sampler2D u_texture;
uniform vec3 u_lightDir;

void main() {
  // 采样纹理
  vec4 texColor = texture(u_texture, v_texCoord);
  
  // 计算光照
  float light = max(dot(normalize(v_normal), u_lightDir), 0.0);
  
  // 输出颜色
  fragColor = texColor * light;
}
```

### 内置变量

| 变量 | 类型 | 说明 |
|------|------|------|
| `gl_FragCoord` | vec4 | 片元在窗口中的坐标 |
| `gl_FrontFacing` | bool | 是否是正面 |
| `gl_PointCoord` | vec2 | 点精灵坐标 |

## 数据流

### 数据传递流程

```
    JavaScript                   GPU
        │                         │
        ▼                         │
    Attribute ──────────────────→ 顶点着色器
    Uniform ────────────────────→    │
        │                            │
        │                       ┌────┴────┐
        │                       │ varying │
        │                       │  插值   │
        │                       └────┬────┘
        │                            │
        │                            ▼
    Uniform ────────────────────→ 片元着色器
    Sampler ────────────────────→    │
        │                            │
        │                            ▼
        │                       帧缓冲区
```

### 数据类型

| 类型 | 来源 | 特点 |
|------|------|------|
| Attribute | 顶点缓冲区 | 每顶点不同 |
| Uniform | JavaScript | 所有顶点/片元相同 |
| Varying | 顶点着色器输出 | 自动插值 |
| Sampler | 纹理单元 | 纹理采样 |

## 着色器编译流程

### 完整流程

```
源代码（字符串）
      │
      ▼ gl.createShader(type)
    着色器对象
      │
      ▼ gl.shaderSource(shader, source)
    附加源代码
      │
      ▼ gl.compileShader(shader)
    编译着色器
      │
      ▼ 检查编译状态
     成功 / 失败
      │
      ▼ gl.createProgram()
    程序对象
      │
      ▼ gl.attachShader(program, shader)
    附加着色器
      │
      ▼ gl.linkProgram(program)
    链接程序
      │
      ▼ 检查链接状态
     成功 / 失败
```

### 代码实现

```javascript
class ShaderProgram {
  constructor(gl, vsSource, fsSource) {
    this.gl = gl;
    
    // 编译着色器
    const vs = this.compileShader(gl.VERTEX_SHADER, vsSource);
    const fs = this.compileShader(gl.FRAGMENT_SHADER, fsSource);
    
    // 链接程序
    this.program = this.linkProgram(vs, fs);
    
    // 清理着色器对象
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    
    // 缓存 uniform 和 attribute 位置
    this.uniformLocations = {};
    this.attributeLocations = {};
  }
  
  compileShader(type, source) {
    const gl = this.gl;
    const shader = gl.createShader(type);
    
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const typeName = type === gl.VERTEX_SHADER ? '顶点' : '片元';
      const info = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`${typeName}着色器编译失败:\n${info}`);
    }
    
    return shader;
  }
  
  linkProgram(vs, fs) {
    const gl = this.gl;
    const program = gl.createProgram();
    
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error(`程序链接失败:\n${info}`);
    }
    
    return program;
  }
  
  use() {
    this.gl.useProgram(this.program);
  }
  
  getUniformLocation(name) {
    if (!(name in this.uniformLocations)) {
      this.uniformLocations[name] = this.gl.getUniformLocation(this.program, name);
    }
    return this.uniformLocations[name];
  }
  
  getAttributeLocation(name) {
    if (!(name in this.attributeLocations)) {
      this.attributeLocations[name] = this.gl.getAttribLocation(this.program, name);
    }
    return this.attributeLocations[name];
  }
  
  // 设置 uniform 值
  setUniform1f(name, value) {
    this.gl.uniform1f(this.getUniformLocation(name), value);
  }
  
  setUniform3fv(name, value) {
    this.gl.uniform3fv(this.getUniformLocation(name), value);
  }
  
  setUniformMatrix4fv(name, value) {
    this.gl.uniformMatrix4fv(this.getUniformLocation(name), false, value);
  }
  
  dispose() {
    this.gl.deleteProgram(this.program);
  }
}
```

## 调试技巧

### 常见编译错误

| 错误类型 | 可能原因 |
|---------|---------|
| Syntax error | 语法错误，检查分号、括号 |
| Undeclared identifier | 变量未声明 |
| Type mismatch | 类型不匹配 |
| No default precision | 片元着色器未指定精度 |

### 调试输出

```glsl
// 使用颜色编码调试
fragColor = vec4(v_normal * 0.5 + 0.5, 1.0); // 显示法线

fragColor = vec4(v_texCoord, 0.0, 1.0); // 显示 UV

fragColor = vec4(gl_FragCoord.xy / u_resolution, 0.0, 1.0); // 显示坐标
```

## 本章小结

- 着色器是运行在 GPU 上的程序
- 顶点着色器处理每个顶点，片元着色器处理每个像素
- 数据通过 Attribute、Uniform、Varying 传递
- 着色器需要编译和链接才能使用
- 良好的封装能简化着色器管理

下一章，我们将学习 GLSL 语言的数据类型。
