# WebGL 渲染基础

> "理解 WebGL 是掌握 Three.js 渲染器的关键。"

## WebGL 概述

WebGL 是 OpenGL ES 2.0/3.0 的 JavaScript 绑定：

```
Three.js                    WebGL API
┌─────────────┐            ┌─────────────┐
│ Mesh        │ ──────────▶│ Draw Call   │
│ Material    │ ──────────▶│ Shader      │
│ Geometry    │ ──────────▶│ VBO/VAO     │
│ Texture     │ ──────────▶│ Texture     │
└─────────────┘            └─────────────┘
```

## 渲染管线

### 顶点处理

```
顶点数据 ──▶ 顶点着色器 ──▶ 图元装配 ──▶ 光栅化 ──▶ 片段着色器 ──▶ 帧缓冲
```

```typescript
// 顶点着色器示例
const vertexShader = `
  attribute vec3 position;
  attribute vec3 normal;
  attribute vec2 uv;
  
  uniform mat4 modelViewMatrix;
  uniform mat4 projectionMatrix;
  uniform mat3 normalMatrix;
  
  varying vec3 vNormal;
  varying vec2 vUv;
  
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// 片段着色器示例
const fragmentShader = `
  precision highp float;
  
  uniform vec3 diffuse;
  uniform sampler2D map;
  
  varying vec3 vNormal;
  varying vec2 vUv;
  
  void main() {
    vec3 normal = normalize(vNormal);
    vec3 light = normalize(vec3(1.0, 1.0, 1.0));
    float diff = max(dot(normal, light), 0.0);
    
    vec4 texColor = texture2D(map, vUv);
    gl_FragColor = vec4(diffuse * texColor.rgb * diff, 1.0);
  }
`;
```

## WebGL 上下文

### 获取上下文

```typescript
function getWebGLContext(canvas: HTMLCanvasElement): WebGL2RenderingContext {
  const contextAttributes: WebGLContextAttributes = {
    alpha: true,
    depth: true,
    stencil: false,
    antialias: true,
    premultipliedAlpha: true,
    preserveDrawingBuffer: false,
    powerPreference: 'high-performance',
    failIfMajorPerformanceCaveat: false,
  };
  
  let context = canvas.getContext('webgl2', contextAttributes);
  
  if (!context) {
    context = canvas.getContext('webgl', contextAttributes);
    
    if (!context) {
      throw new Error('WebGL not supported');
    }
  }
  
  return context;
}
```

### 扩展管理

```typescript
class WebGLExtensions {
  private gl: WebGL2RenderingContext;
  private extensions: Map<string, any> = new Map();
  
  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
  }
  
  has(name: string): boolean {
    return this.get(name) !== null;
  }
  
  get(name: string): any {
    if (this.extensions.has(name)) {
      return this.extensions.get(name);
    }
    
    const extension = this.gl.getExtension(name);
    this.extensions.set(name, extension);
    
    return extension;
  }
}

// 常用扩展
const EXTENSIONS = [
  'EXT_color_buffer_half_float',
  'EXT_float_blend',
  'EXT_texture_filter_anisotropic',
  'OES_texture_float_linear',
  'WEBGL_compressed_texture_s3tc',
  'WEBGL_compressed_texture_pvrtc',
  'WEBGL_compressed_texture_etc1',
  'WEBGL_compressed_texture_astc',
  'WEBGL_multisampled_render_to_texture',
];
```

## 缓冲区管理

### VBO (Vertex Buffer Object)

```typescript
class WebGLGeometries {
  private gl: WebGL2RenderingContext;
  private geometries: WeakMap<BufferGeometry, any> = new WeakMap();
  
  get(geometry: BufferGeometry): any {
    let cached = this.geometries.get(geometry);
    
    if (!cached) {
      cached = this.createGeometryBuffers(geometry);
      this.geometries.set(geometry, cached);
      
      geometry.addEventListener('dispose', this.onGeometryDispose);
    }
    
    return cached;
  }
  
  private createGeometryBuffers(geometry: BufferGeometry): any {
    const gl = this.gl;
    const buffers: any = { attributes: {} };
    
    // 索引缓冲
    if (geometry.index !== null) {
      buffers.index = this.createBuffer(
        gl.ELEMENT_ARRAY_BUFFER,
        geometry.index.array,
        gl.STATIC_DRAW
      );
    }
    
    // 顶点属性缓冲
    for (const name in geometry.attributes) {
      const attribute = geometry.attributes[name];
      
      buffers.attributes[name] = this.createBuffer(
        gl.ARRAY_BUFFER,
        attribute.array,
        this.getUsage(attribute.usage)
      );
    }
    
    return buffers;
  }
  
  private createBuffer(
    target: number,
    data: ArrayBufferView,
    usage: number
  ): WebGLBuffer {
    const gl = this.gl;
    const buffer = gl.createBuffer()!;
    
    gl.bindBuffer(target, buffer);
    gl.bufferData(target, data, usage);
    
    return buffer;
  }
  
  private getUsage(usage: number): number {
    const gl = this.gl;
    
    switch (usage) {
      case StaticDrawUsage:
        return gl.STATIC_DRAW;
      case DynamicDrawUsage:
        return gl.DYNAMIC_DRAW;
      case StreamDrawUsage:
        return gl.STREAM_DRAW;
      default:
        return gl.STATIC_DRAW;
    }
  }
  
  update(geometry: BufferGeometry): void {
    const cached = this.geometries.get(geometry);
    if (!cached) return;
    
    // 更新需要更新的属性
    for (const name in geometry.attributes) {
      const attribute = geometry.attributes[name];
      
      if (attribute.version > 0) {
        this.updateBuffer(
          cached.attributes[name],
          attribute
        );
      }
    }
  }
  
  private updateBuffer(
    buffer: WebGLBuffer,
    attribute: BufferAttribute
  ): void {
    const gl = this.gl;
    
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    
    if (attribute.updateRange.count === -1) {
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, attribute.array);
    } else {
      const { offset, count } = attribute.updateRange;
      const start = offset * attribute.itemSize;
      const length = count * attribute.itemSize;
      
      gl.bufferSubData(
        gl.ARRAY_BUFFER,
        start * attribute.array.BYTES_PER_ELEMENT,
        attribute.array.subarray(start, start + length)
      );
    }
  }
}
```

### VAO (Vertex Array Object)

```typescript
class WebGLBindingStates {
  private gl: WebGL2RenderingContext;
  private currentVAO: WebGLVertexArrayObject | null = null;
  private vaoCache: WeakMap<BufferGeometry, Map<number, WebGLVertexArrayObject>> = new WeakMap();
  
  getBindingState(
    geometry: BufferGeometry,
    program: WebGLProgram
  ): WebGLVertexArrayObject {
    let programMap = this.vaoCache.get(geometry);
    
    if (!programMap) {
      programMap = new Map();
      this.vaoCache.set(geometry, programMap);
    }
    
    const programId = program.id;
    let vao = programMap.get(programId);
    
    if (!vao) {
      vao = this.createBindingState(geometry, program);
      programMap.set(programId, vao);
    }
    
    return vao;
  }
  
  private createBindingState(
    geometry: BufferGeometry,
    program: WebGLProgram
  ): WebGLVertexArrayObject {
    const gl = this.gl;
    const vao = gl.createVertexArray()!;
    
    gl.bindVertexArray(vao);
    
    // 绑定属性
    const attributes = program.getAttributes();
    
    for (const name in attributes) {
      const location = attributes[name];
      const geometryAttribute = geometry.attributes[name];
      
      if (geometryAttribute) {
        this.setupAttribute(location, geometryAttribute);
      }
    }
    
    // 绑定索引
    if (geometry.index) {
      const indexBuffer = geometries.get(geometry).index;
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    }
    
    gl.bindVertexArray(null);
    
    return vao;
  }
  
  private setupAttribute(
    location: number,
    attribute: BufferAttribute
  ): void {
    const gl = this.gl;
    
    gl.enableVertexAttribArray(location);
    
    const buffer = geometries.get(attribute).buffer;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    
    gl.vertexAttribPointer(
      location,
      attribute.itemSize,
      gl.FLOAT,
      attribute.normalized,
      0,
      0
    );
  }
  
  bindVertexArrayObject(vao: WebGLVertexArrayObject | null): void {
    if (vao !== this.currentVAO) {
      this.gl.bindVertexArray(vao);
      this.currentVAO = vao;
    }
  }
}
```

## 着色器程序

### 程序管理

```typescript
class WebGLPrograms {
  private gl: WebGL2RenderingContext;
  private programs: Map<string, WebGLProgram> = new Map();
  
  getProgram(
    material: Material,
    parameters: any
  ): WebGLProgram {
    const key = this.getProgramCacheKey(material, parameters);
    
    let program = this.programs.get(key);
    
    if (!program) {
      program = this.createProgram(material, parameters);
      this.programs.set(key, program);
    }
    
    return program;
  }
  
  private createProgram(
    material: Material,
    parameters: any
  ): WebGLProgram {
    const gl = this.gl;
    
    // 获取着色器代码
    const vertexShader = this.getVertexShader(material, parameters);
    const fragmentShader = this.getFragmentShader(material, parameters);
    
    // 编译着色器
    const vs = this.compileShader(gl.VERTEX_SHADER, vertexShader);
    const fs = this.compileShader(gl.FRAGMENT_SHADER, fragmentShader);
    
    // 链接程序
    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program);
      throw new Error('Shader program link error: ' + info);
    }
    
    // 清理着色器
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    
    return program;
  }
  
  private compileShader(type: number, source: string): WebGLShader {
    const gl = this.gl;
    const shader = gl.createShader(type)!;
    
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      throw new Error('Shader compile error: ' + info);
    }
    
    return shader;
  }
}
```

### Uniform 管理

```typescript
class WebGLUniforms {
  private gl: WebGL2RenderingContext;
  private uniforms: Map<string, WebGLUniformLocation> = new Map();
  private textureUnit: number = 0;
  
  constructor(gl: WebGL2RenderingContext, program: WebGLProgram) {
    this.gl = gl;
    this.parseUniforms(program);
  }
  
  private parseUniforms(program: WebGLProgram): void {
    const gl = this.gl;
    const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    
    for (let i = 0; i < count; i++) {
      const info = gl.getActiveUniform(program, i)!;
      const location = gl.getUniformLocation(program, info.name)!;
      
      this.uniforms.set(info.name, location);
    }
  }
  
  setValue(name: string, value: any): void {
    const gl = this.gl;
    const location = this.uniforms.get(name);
    
    if (!location) return;
    
    if (typeof value === 'number') {
      gl.uniform1f(location, value);
    } else if (value.isVector2) {
      gl.uniform2f(location, value.x, value.y);
    } else if (value.isVector3) {
      gl.uniform3f(location, value.x, value.y, value.z);
    } else if (value.isVector4) {
      gl.uniform4f(location, value.x, value.y, value.z, value.w);
    } else if (value.isColor) {
      gl.uniform3f(location, value.r, value.g, value.b);
    } else if (value.isMatrix3) {
      gl.uniformMatrix3fv(location, false, value.elements);
    } else if (value.isMatrix4) {
      gl.uniformMatrix4fv(location, false, value.elements);
    } else if (value.isTexture) {
      const unit = this.textureUnit++;
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, value.glTexture);
      gl.uniform1i(location, unit);
    }
  }
  
  resetTextureUnits(): void {
    this.textureUnit = 0;
  }
}
```

## 纹理管理

```typescript
class WebGLTextures {
  private gl: WebGL2RenderingContext;
  private textureCache: WeakMap<Texture, WebGLTexture> = new WeakMap();
  
  get(texture: Texture): WebGLTexture {
    let glTexture = this.textureCache.get(texture);
    
    if (!glTexture) {
      glTexture = this.createTexture(texture);
      this.textureCache.set(texture, glTexture);
      
      texture.addEventListener('dispose', () => {
        this.dispose(texture);
      });
    }
    
    // 检查更新
    if (texture.version > 0) {
      this.updateTexture(texture, glTexture);
    }
    
    return glTexture;
  }
  
  private createTexture(texture: Texture): WebGLTexture {
    const gl = this.gl;
    const glTexture = gl.createTexture()!;
    
    gl.bindTexture(gl.TEXTURE_2D, glTexture);
    
    // 设置参数
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_WRAP_S,
      this.getWrapping(texture.wrapS)
    );
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_WRAP_T,
      this.getWrapping(texture.wrapT)
    );
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_MAG_FILTER,
      this.getFilter(texture.magFilter)
    );
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_MIN_FILTER,
      this.getFilter(texture.minFilter)
    );
    
    return glTexture;
  }
  
  private updateTexture(texture: Texture, glTexture: WebGLTexture): void {
    const gl = this.gl;
    
    gl.bindTexture(gl.TEXTURE_2D, glTexture);
    
    // 上传图像数据
    const image = texture.image;
    
    if (image) {
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        image
      );
      
      if (texture.generateMipmaps) {
        gl.generateMipmap(gl.TEXTURE_2D);
      }
    }
  }
  
  private getWrapping(wrap: number): number {
    const gl = this.gl;
    
    switch (wrap) {
      case RepeatWrapping:
        return gl.REPEAT;
      case ClampToEdgeWrapping:
        return gl.CLAMP_TO_EDGE;
      case MirroredRepeatWrapping:
        return gl.MIRRORED_REPEAT;
      default:
        return gl.REPEAT;
    }
  }
  
  private getFilter(filter: number): number {
    const gl = this.gl;
    
    switch (filter) {
      case NearestFilter:
        return gl.NEAREST;
      case NearestMipmapNearestFilter:
        return gl.NEAREST_MIPMAP_NEAREST;
      case NearestMipmapLinearFilter:
        return gl.NEAREST_MIPMAP_LINEAR;
      case LinearFilter:
        return gl.LINEAR;
      case LinearMipmapNearestFilter:
        return gl.LINEAR_MIPMAP_NEAREST;
      case LinearMipmapLinearFilter:
        return gl.LINEAR_MIPMAP_LINEAR;
      default:
        return gl.LINEAR;
    }
  }
  
  dispose(texture: Texture): void {
    const glTexture = this.textureCache.get(texture);
    
    if (glTexture) {
      this.gl.deleteTexture(glTexture);
      this.textureCache.delete(texture);
    }
  }
}
```

## 本章小结

- WebGL 是 Three.js 底层渲染 API
- 渲染管线: 顶点着色器 → 光栅化 → 片段着色器
- VBO 存储顶点数据，VAO 缓存绑定状态
- 着色器程序编译和链接
- Uniform 传递参数到 GPU
- 纹理管理和参数设置

下一章，我们将学习 Three.js 渲染管线。
