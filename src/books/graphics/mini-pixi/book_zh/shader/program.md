# Shader 程序管理

Shader（着色器）是 GPU 渲染的核心。它决定了顶点如何变换、像素如何着色。本章解析 PixiJS 中 Shader 程序的管理和使用。

## 为什么需要 Shader 管理？

直接使用 WebGL shader API 的问题：

1. **编译开销**：每次创建 shader 都需要编译
2. **资源管理**：需要手动销毁 shader 和 program
3. **状态追踪**：需要知道当前绑定的是哪个 program
4. **uniform 管理**：设置 uniform 需要获取 location

**解决方案**：封装 Shader 类，统一管理编译、缓存、绑定。

## Shader 程序结构

一个完整的 shader 程序包含：

```
┌─────────────────────────────────────────────────────────┐
│                    GlProgram                             │
│  ┌─────────────────┐      ┌─────────────────┐           │
│  │  Vertex Shader  │      │ Fragment Shader │           │
│  │  (顶点着色器)    │      │  (片元着色器)    │           │
│  └─────────────────┘      └─────────────────┘           │
│                    ↓                                     │
│  ┌───────────────────────────────────────────┐          │
│  │            Linked Program                  │          │
│  │  • Attribute Locations                     │          │
│  │  • Uniform Locations                       │          │
│  │  • Uniform Block Indices                   │          │
│  └───────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────┘
```

## GlProgram 实现

```typescript
// src/rendering/shader/GlProgram.ts

export interface GlProgramOptions {
  vertex: string;     // 顶点着色器源码
  fragment: string;   // 片元着色器源码
  name?: string;      // 程序名称（调试用）
}

export class GlProgram {
  // 着色器源码
  public readonly vertex: string;
  public readonly fragment: string;
  
  // 程序名称
  public readonly name: string;
  
  // WebGL 程序对象（懒创建）
  private _glProgram: WebGLProgram | null = null;
  
  // Attribute 位置缓存
  private _attributeLocations: Map<string, number> = new Map();
  
  // Uniform 位置缓存
  private _uniformLocations: Map<string, WebGLUniformLocation> = new Map();
  
  // 关联的 GL 上下文
  private _gl: WebGL2RenderingContext | null = null;
  
  constructor(options: GlProgramOptions) {
    this.vertex = options.vertex;
    this.fragment = options.fragment;
    this.name = options.name ?? 'unnamed';
  }
  
  /**
   * 获取 WebGL 程序（编译并链接）
   */
  public getProgram(gl: WebGL2RenderingContext): WebGLProgram {
    // 如果已编译，直接返回
    if (this._glProgram && this._gl === gl) {
      return this._glProgram;
    }
    
    // 编译着色器
    const vertexShader = this.compileShader(gl, gl.VERTEX_SHADER, this.vertex);
    const fragmentShader = this.compileShader(gl, gl.FRAGMENT_SHADER, this.fragment);
    
    // 创建并链接程序
    const program = gl.createProgram()!;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    // 检查链接状态
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const error = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      throw new Error(`Shader link error: ${error}`);
    }
    
    // 着色器已链接，可以删除
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    
    this._glProgram = program;
    this._gl = gl;
    
    // 清空缓存
    this._attributeLocations.clear();
    this._uniformLocations.clear();
    
    return program;
  }
  
  /**
   * 编译单个着色器
   */
  private compileShader(
    gl: WebGL2RenderingContext,
    type: number,
    source: string
  ): WebGLShader {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const error = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      
      const shaderType = type === gl.VERTEX_SHADER ? 'vertex' : 'fragment';
      throw new Error(`${shaderType} shader compile error: ${error}`);
    }
    
    return shader;
  }
  
  /**
   * 获取 Attribute 位置
   */
  public getAttributeLocation(gl: WebGL2RenderingContext, name: string): number {
    let location = this._attributeLocations.get(name);
    
    if (location === undefined) {
      const program = this.getProgram(gl);
      location = gl.getAttribLocation(program, name);
      this._attributeLocations.set(name, location);
    }
    
    return location;
  }
  
  /**
   * 获取 Uniform 位置
   */
  public getUniformLocation(
    gl: WebGL2RenderingContext,
    name: string
  ): WebGLUniformLocation | null {
    let location = this._uniformLocations.get(name);
    
    if (location === undefined) {
      const program = this.getProgram(gl);
      location = gl.getUniformLocation(program, name)!;
      this._uniformLocations.set(name, location);
    }
    
    return location;
  }
  
  /**
   * 销毁程序
   */
  public destroy(): void {
    if (this._glProgram && this._gl) {
      this._gl.deleteProgram(this._glProgram);
    }
    
    this._glProgram = null;
    this._gl = null;
    this._attributeLocations.clear();
    this._uniformLocations.clear();
  }
}
```

## Shader 系统

Shader 系统管理程序的绑定和 uniform 设置：

```typescript
// src/rendering/shader/ShaderSystem.ts

export class ShaderSystem {
  private _gl: WebGL2RenderingContext;
  
  // 当前绑定的程序
  private _currentProgram: GlProgram | null = null;
  
  // 程序缓存
  private _programCache: Map<string, GlProgram> = new Map();
  
  constructor(gl: WebGL2RenderingContext) {
    this._gl = gl;
  }
  
  /**
   * 绑定着色器程序
   */
  public bind(program: GlProgram): void {
    if (this._currentProgram === program) {
      return;  // 已绑定，跳过
    }
    
    const glProgram = program.getProgram(this._gl);
    this._gl.useProgram(glProgram);
    this._currentProgram = program;
  }
  
  /**
   * 设置 uniform 值
   */
  public setUniforms(program: GlProgram, uniforms: Record<string, any>): void {
    const gl = this._gl;
    
    for (const [name, value] of Object.entries(uniforms)) {
      const location = program.getUniformLocation(gl, name);
      
      if (location === null) continue;
      
      // 根据值类型选择设置方法
      this.setUniformValue(location, value);
    }
  }
  
  /**
   * 设置单个 uniform
   */
  private setUniformValue(location: WebGLUniformLocation, value: any): void {
    const gl = this._gl;
    
    if (typeof value === 'number') {
      gl.uniform1f(location, value);
    } else if (value instanceof Float32Array) {
      switch (value.length) {
        case 2:
          gl.uniform2fv(location, value);
          break;
        case 3:
          gl.uniform3fv(location, value);
          break;
        case 4:
          gl.uniform4fv(location, value);
          break;
        case 9:
          gl.uniformMatrix3fv(location, false, value);
          break;
        case 16:
          gl.uniformMatrix4fv(location, false, value);
          break;
      }
    } else if (Array.isArray(value)) {
      // 纹理数组
      gl.uniform1iv(location, value);
    }
  }
  
  /**
   * 解绑当前程序
   */
  public unbind(): void {
    this._gl.useProgram(null);
    this._currentProgram = null;
  }
}
```

## Uniform 数据结构

```typescript
// src/rendering/shader/UniformGroup.ts

/**
 * Uniform 组
 * 将相关的 uniform 组织在一起
 */
export class UniformGroup {
  // uniform 数据
  public uniforms: Record<string, any>;
  
  // 是否需要更新
  private _dirty: boolean = true;
  
  // 是否静态（很少变化）
  public readonly isStatic: boolean;
  
  constructor(uniforms: Record<string, any>, isStatic = false) {
    this.uniforms = uniforms;
    this.isStatic = isStatic;
  }
  
  /**
   * 更新 uniform 值
   */
  public update(): void {
    this._dirty = true;
  }
  
  /**
   * 检查是否需要上传
   */
  public get dirty(): boolean {
    return this._dirty;
  }
  
  /**
   * 标记已上传
   */
  public clear(): void {
    this._dirty = false;
  }
}
```

## 常用 Shader

### 批处理 Shader

```typescript
// 批处理顶点着色器
const batchVertexShader = `#version 300 es
precision highp float;

in vec2 aPosition;
in vec2 aUv;
in vec4 aColor;
in float aTextureId;

uniform mat3 uProjectionMatrix;

out vec2 vUv;
out vec4 vColor;
out float vTextureId;

void main() {
  // 应用投影矩阵
  vec3 position = uProjectionMatrix * vec3(aPosition, 1.0);
  gl_Position = vec4(position.xy, 0.0, 1.0);
  
  // 传递给片元着色器
  vUv = aUv;
  vColor = aColor;
  vTextureId = aTextureId;
}
`;

// 批处理片元着色器
const batchFragmentShader = `#version 300 es
precision highp float;

in vec2 vUv;
in vec4 vColor;
in float vTextureId;

uniform sampler2D uTextures[16];

out vec4 fragColor;

void main() {
  vec4 color;
  
  // 根据纹理 ID 采样
  int textureId = int(vTextureId + 0.5);
  
  if (textureId == 0) color = texture(uTextures[0], vUv);
  else if (textureId == 1) color = texture(uTextures[1], vUv);
  else if (textureId == 2) color = texture(uTextures[2], vUv);
  // ... 更多纹理
  else color = texture(uTextures[0], vUv);
  
  // 应用顶点颜色
  fragColor = color * vColor;
}
`;
```

### 为什么片元着色器需要分支？

在 WebGL/WebGPU 中，纹理采样的索引必须是常量表达式（编译时确定）。不能直接使用变量索引：

```glsl
// 这是错误的！不能用变量索引纹理数组
color = texture(uTextures[textureId], vUv);  // 编译错误
```

所以需要使用 if-else 分支。现代 GPU 会优化这种模式。

## 程序缓存

相同源码的 shader 不需要重复编译：

```typescript
// 使用源码作为缓存键
function getOrCreateProgram(
  vertex: string,
  fragment: string
): GlProgram {
  const key = vertex + fragment;
  
  let program = programCache.get(key);
  
  if (!program) {
    program = new GlProgram({ vertex, fragment });
    programCache.set(key, program);
  }
  
  return program;
}
```

## 使用示例

```typescript
// 创建自定义 shader
const customProgram = new GlProgram({
  vertex: `
    precision highp float;
    attribute vec2 aPosition;
    uniform mat3 uProjectionMatrix;
    
    void main() {
      vec3 pos = uProjectionMatrix * vec3(aPosition, 1.0);
      gl_Position = vec4(pos.xy, 0.0, 1.0);
    }
  `,
  fragment: `
    precision highp float;
    uniform vec4 uColor;
    
    void main() {
      gl_FragColor = uColor;
    }
  `,
  name: 'solid-color',
});

// 使用 shader
shaderSystem.bind(customProgram);
shaderSystem.setUniforms(customProgram, {
  uProjectionMatrix: projectionMatrix,
  uColor: new Float32Array([1, 0, 0, 1]),  // 红色
});

// 绘制...
```

## 小结

Shader 程序管理的核心要点：

1. **编译和链接**：顶点/片元着色器编译后链接成程序
2. **位置缓存**：attribute 和 uniform 位置只需查询一次
3. **状态追踪**：避免不必要的程序切换
4. **程序缓存**：相同源码的程序复用

理解 shader 管理对于实现高效的 GPU 渲染至关重要。
