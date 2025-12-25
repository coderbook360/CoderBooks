# 渲染到纹理

> "渲染到纹理是后处理效果的基础，让你的渲染结果成为下一次渲染的输入。"

## 基本概念

### 什么是渲染到纹理

渲染到纹理（Render to Texture，RTT）是将场景渲染到纹理而非屏幕的技术。

```
┌─────────────────────────────────────────────────────────┐
│                渲染到纹理流程                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   场景数据                                              │
│       ↓                                                 │
│   渲染到 FBO ─→ 颜色纹理                               │
│       ↓                                                 │
│   后处理着色器 ←─ 使用颜色纹理                         │
│       ↓                                                 │
│   输出到屏幕                                            │
│                                                         │
│   可级联多个处理阶段（效果链）                          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 基础实现

### 设置渲染目标

```javascript
class RenderTarget {
  constructor(gl, width, height) {
    this.gl = gl;
    this.width = width;
    this.height = height;
    
    // 创建帧缓冲
    this.framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    
    // 创建颜色纹理
    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.RGBA8,
      width, height, 0,
      gl.RGBA, gl.UNSIGNED_BYTE, null
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      this.texture, 0
    );
    
    // 创建深度渲染缓冲
    this.depthBuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.depthBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, width, height);
    gl.framebufferRenderbuffer(
      gl.FRAMEBUFFER,
      gl.DEPTH_ATTACHMENT,
      gl.RENDERBUFFER,
      this.depthBuffer
    );
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  
  bind() {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    gl.viewport(0, 0, this.width, this.height);
  }
  
  unbind() {
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
  }
}
```

### 全屏四边形

```javascript
class FullscreenQuad {
  constructor(gl) {
    this.gl = gl;
    
    // 顶点数据
    const vertices = new Float32Array([
      -1, -1,  0, 0,  // 左下
       1, -1,  1, 0,  // 右下
      -1,  1,  0, 1,  // 左上
       1,  1,  1, 1   // 右上
    ]);
    
    // 创建 VAO
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);
    
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    
    // 位置属性
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0);
    
    // 纹理坐标属性
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8);
    
    gl.bindVertexArray(null);
  }
  
  draw() {
    const gl = this.gl;
    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindVertexArray(null);
  }
}
```

### 基础后处理着色器

```glsl
// 顶点着色器
#version 300 es
layout(location = 0) in vec2 a_position;
layout(location = 1) in vec2 a_texCoord;

out vec2 v_texCoord;

void main() {
  v_texCoord = a_texCoord;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
```

```glsl
// 片元着色器 - 直通
#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_texture;

void main() {
  fragColor = texture(u_texture, v_texCoord);
}
```

## 后处理效果

### 灰度化

```glsl
#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_texture;

void main() {
  vec3 color = texture(u_texture, v_texCoord).rgb;
  
  // 亮度加权
  float gray = dot(color, vec3(0.299, 0.587, 0.114));
  
  fragColor = vec4(vec3(gray), 1.0);
}
```

### 反色

```glsl
#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_texture;

void main() {
  vec3 color = texture(u_texture, v_texCoord).rgb;
  fragColor = vec4(1.0 - color, 1.0);
}
```

### 色调分离

```glsl
#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_texture;
uniform float u_levels;  // 如 4.0

void main() {
  vec3 color = texture(u_texture, v_texCoord).rgb;
  color = floor(color * u_levels) / u_levels;
  fragColor = vec4(color, 1.0);
}
```

### 边缘检测（Sobel）

```glsl
#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_texture;
uniform vec2 u_texelSize;  // 1.0 / textureSize

void main() {
  // Sobel 核
  float kernelX[9];
  kernelX[0] = -1.0; kernelX[1] = 0.0; kernelX[2] = 1.0;
  kernelX[3] = -2.0; kernelX[4] = 0.0; kernelX[5] = 2.0;
  kernelX[6] = -1.0; kernelX[7] = 0.0; kernelX[8] = 1.0;
  
  float kernelY[9];
  kernelY[0] = -1.0; kernelY[1] = -2.0; kernelY[2] = -1.0;
  kernelY[3] =  0.0; kernelY[4] =  0.0; kernelY[5] =  0.0;
  kernelY[6] =  1.0; kernelY[7] =  2.0; kernelY[8] =  1.0;
  
  vec2 offsets[9];
  offsets[0] = vec2(-1, -1); offsets[1] = vec2(0, -1); offsets[2] = vec2(1, -1);
  offsets[3] = vec2(-1,  0); offsets[4] = vec2(0,  0); offsets[5] = vec2(1,  0);
  offsets[6] = vec2(-1,  1); offsets[7] = vec2(0,  1); offsets[8] = vec2(1,  1);
  
  float gx = 0.0;
  float gy = 0.0;
  
  for (int i = 0; i < 9; i++) {
    vec2 uv = v_texCoord + offsets[i] * u_texelSize;
    float lum = dot(texture(u_texture, uv).rgb, vec3(0.299, 0.587, 0.114));
    gx += lum * kernelX[i];
    gy += lum * kernelY[i];
  }
  
  float edge = sqrt(gx * gx + gy * gy);
  fragColor = vec4(vec3(edge), 1.0);
}
```

### 高斯模糊

```glsl
#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_texture;
uniform vec2 u_direction;  // (1, 0) 或 (0, 1)
uniform vec2 u_texelSize;

const float weights[5] = float[](0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216);

void main() {
  vec3 result = texture(u_texture, v_texCoord).rgb * weights[0];
  
  for (int i = 1; i < 5; i++) {
    vec2 offset = u_direction * u_texelSize * float(i);
    result += texture(u_texture, v_texCoord + offset).rgb * weights[i];
    result += texture(u_texture, v_texCoord - offset).rgb * weights[i];
  }
  
  fragColor = vec4(result, 1.0);
}
```

### 模糊实现（双通道）

```javascript
class BlurEffect {
  constructor(gl, width, height) {
    this.gl = gl;
    
    // 需要两个临时渲染目标
    this.tempRT = new RenderTarget(gl, width, height);
    
    // 模糊着色器
    this.blurProgram = createProgram(gl, vertexSource, blurFragSource);
    this.quad = new FullscreenQuad(gl);
  }
  
  apply(sourceTexture, destTarget) {
    const gl = this.gl;
    
    // 水平模糊
    this.tempRT.bind();
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    gl.useProgram(this.blurProgram);
    gl.uniform2f(gl.getUniformLocation(this.blurProgram, 'u_direction'), 1.0, 0.0);
    gl.uniform2f(
      gl.getUniformLocation(this.blurProgram, 'u_texelSize'),
      1.0 / this.tempRT.width,
      1.0 / this.tempRT.height
    );
    
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sourceTexture);
    this.quad.draw();
    
    // 垂直模糊
    destTarget.bind();
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    gl.uniform2f(gl.getUniformLocation(this.blurProgram, 'u_direction'), 0.0, 1.0);
    gl.bindTexture(gl.TEXTURE_2D, this.tempRT.texture);
    this.quad.draw();
    
    destTarget.unbind();
  }
}
```

## 效果链

### 后处理管线

```javascript
class PostProcessPipeline {
  constructor(gl, width, height) {
    this.gl = gl;
    this.width = width;
    this.height = height;
    
    // 双缓冲用于效果链
    this.pingPong = [
      new RenderTarget(gl, width, height),
      new RenderTarget(gl, width, height)
    ];
    this.currentTarget = 0;
    
    this.effects = [];
    this.quad = new FullscreenQuad(gl);
  }
  
  addEffect(effect) {
    this.effects.push(effect);
  }
  
  process(sourceTexture) {
    if (this.effects.length === 0) {
      return sourceTexture;
    }
    
    const gl = this.gl;
    let inputTexture = sourceTexture;
    
    // 应用每个效果
    for (let i = 0; i < this.effects.length; i++) {
      const effect = this.effects[i];
      const outputRT = this.pingPong[this.currentTarget];
      
      outputRT.bind();
      gl.clear(gl.COLOR_BUFFER_BIT);
      
      effect.apply(inputTexture, this.quad);
      
      outputRT.unbind();
      
      inputTexture = outputRT.texture;
      this.currentTarget = 1 - this.currentTarget;
    }
    
    return inputTexture;
  }
  
  resize(width, height) {
    this.width = width;
    this.height = height;
    
    this.pingPong.forEach(rt => {
      rt.dispose();
    });
    
    this.pingPong = [
      new RenderTarget(this.gl, width, height),
      new RenderTarget(this.gl, width, height)
    ];
  }
}
```

### 效果接口

```javascript
class BaseEffect {
  constructor(gl, fragmentSource) {
    this.gl = gl;
    this.program = createProgram(gl, quadVertexSource, fragmentSource);
    this.uniforms = {};
    
    // 获取 uniform 位置
    const numUniforms = gl.getProgramParameter(this.program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < numUniforms; i++) {
      const info = gl.getActiveUniform(this.program, i);
      this.uniforms[info.name] = gl.getUniformLocation(this.program, info.name);
    }
  }
  
  apply(inputTexture, quad) {
    const gl = this.gl;
    
    gl.useProgram(this.program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, inputTexture);
    gl.uniform1i(this.uniforms['u_texture'], 0);
    
    this.setUniforms();
    quad.draw();
  }
  
  setUniforms() {
    // 子类实现
  }
}

// 具体效果
class VignetteEffect extends BaseEffect {
  constructor(gl) {
    super(gl, `
      #version 300 es
      precision highp float;
      
      in vec2 v_texCoord;
      out vec4 fragColor;
      
      uniform sampler2D u_texture;
      uniform float u_intensity;
      
      void main() {
        vec3 color = texture(u_texture, v_texCoord).rgb;
        vec2 uv = v_texCoord * 2.0 - 1.0;
        float vignette = 1.0 - dot(uv, uv) * u_intensity;
        fragColor = vec4(color * vignette, 1.0);
      }
    `);
    
    this.intensity = 0.5;
  }
  
  setUniforms() {
    this.gl.uniform1f(this.uniforms['u_intensity'], this.intensity);
  }
}
```

## 泛光效果

### 实现步骤

```
┌─────────────────────────────────────────────────────────┐
│                    泛光效果流程                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   1. 渲染场景                                           │
│       ↓                                                 │
│   2. 提取亮区（亮度阈值）                               │
│       ↓                                                 │
│   3. 降采样模糊（多级）                                 │
│       ↓                                                 │
│   4. 升采样合并                                         │
│       ↓                                                 │
│   5. 叠加到原图                                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 亮度提取

```glsl
#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_texture;
uniform float u_threshold;

void main() {
  vec3 color = texture(u_texture, v_texCoord).rgb;
  float brightness = dot(color, vec3(0.2126, 0.7152, 0.0722));
  
  if (brightness > u_threshold) {
    fragColor = vec4(color, 1.0);
  } else {
    fragColor = vec4(0.0);
  }
}
```

### 泛光类

```javascript
class Bloom {
  constructor(gl, width, height) {
    this.gl = gl;
    this.levels = 5;
    
    // 创建降采样链
    this.downSamples = [];
    this.upSamples = [];
    
    let w = width / 2;
    let h = height / 2;
    
    for (let i = 0; i < this.levels; i++) {
      this.downSamples.push(new RenderTarget(gl, w, h));
      this.upSamples.push(new RenderTarget(gl, w, h));
      w = Math.max(1, w / 2);
      h = Math.max(1, h / 2);
    }
    
    // 着色器
    this.brightPassProgram = createProgram(gl, vertSource, brightPassFrag);
    this.blurProgram = createProgram(gl, vertSource, blurFrag);
    this.combineProgram = createProgram(gl, vertSource, combineFrag);
    
    this.quad = new FullscreenQuad(gl);
  }
  
  apply(sceneTexture, outputTarget) {
    const gl = this.gl;
    
    // 1. 亮度提取
    this.downSamples[0].bind();
    gl.useProgram(this.brightPassProgram);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sceneTexture);
    gl.uniform1f(gl.getUniformLocation(this.brightPassProgram, 'u_threshold'), 0.8);
    this.quad.draw();
    
    // 2. 降采样模糊
    for (let i = 0; i < this.levels - 1; i++) {
      this.downSamples[i + 1].bind();
      gl.useProgram(this.blurProgram);
      gl.bindTexture(gl.TEXTURE_2D, this.downSamples[i].texture);
      this.quad.draw();
    }
    
    // 3. 升采样合并
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    
    for (let i = this.levels - 1; i > 0; i--) {
      this.upSamples[i - 1].bind();
      gl.clear(gl.COLOR_BUFFER_BIT);
      
      gl.useProgram(this.blurProgram);
      gl.bindTexture(gl.TEXTURE_2D, this.downSamples[i].texture);
      this.quad.draw();
      
      // 叠加上一级
      if (i < this.levels - 1) {
        gl.bindTexture(gl.TEXTURE_2D, this.upSamples[i].texture);
        this.quad.draw();
      }
    }
    
    gl.disable(gl.BLEND);
    
    // 4. 与原场景合并
    outputTarget.bind();
    gl.useProgram(this.combineProgram);
    
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sceneTexture);
    gl.uniform1i(gl.getUniformLocation(this.combineProgram, 'u_scene'), 0);
    
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.upSamples[0].texture);
    gl.uniform1i(gl.getUniformLocation(this.combineProgram, 'u_bloom'), 1);
    
    gl.uniform1f(gl.getUniformLocation(this.combineProgram, 'u_intensity'), 0.5);
    
    this.quad.draw();
  }
}
```

### 合并着色器

```glsl
#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_scene;
uniform sampler2D u_bloom;
uniform float u_intensity;

void main() {
  vec3 sceneColor = texture(u_scene, v_texCoord).rgb;
  vec3 bloomColor = texture(u_bloom, v_texCoord).rgb;
  
  fragColor = vec4(sceneColor + bloomColor * u_intensity, 1.0);
}
```

## 色调映射

### HDR 渲染

```javascript
// 使用浮点纹理
const hdrTarget = new RenderTarget(gl, width, height, {
  internalFormat: gl.RGBA16F,
  format: gl.RGBA,
  type: gl.HALF_FLOAT
});
```

### Reinhard 色调映射

```glsl
#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_hdrTexture;
uniform float u_exposure;

vec3 reinhardToneMap(vec3 color) {
  return color / (color + vec3(1.0));
}

void main() {
  vec3 hdrColor = texture(u_hdrTexture, v_texCoord).rgb;
  
  // 曝光调整
  hdrColor *= u_exposure;
  
  // 色调映射
  vec3 mapped = reinhardToneMap(hdrColor);
  
  // Gamma 校正
  mapped = pow(mapped, vec3(1.0 / 2.2));
  
  fragColor = vec4(mapped, 1.0);
}
```

### ACES 色调映射

```glsl
vec3 ACESFilm(vec3 x) {
  float a = 2.51;
  float b = 0.03;
  float c = 2.43;
  float d = 0.59;
  float e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

void main() {
  vec3 hdrColor = texture(u_hdrTexture, v_texCoord).rgb * u_exposure;
  vec3 mapped = ACESFilm(hdrColor);
  mapped = pow(mapped, vec3(1.0 / 2.2));
  fragColor = vec4(mapped, 1.0);
}
```

## 完整渲染流程

```javascript
class Renderer {
  constructor(gl, canvas) {
    this.gl = gl;
    this.canvas = canvas;
    
    // 主渲染目标
    this.sceneTarget = new RenderTarget(gl, canvas.width, canvas.height);
    
    // 后处理
    this.bloom = new Bloom(gl, canvas.width, canvas.height);
    this.postProcess = new PostProcessPipeline(gl, canvas.width, canvas.height);
    
    this.quad = new FullscreenQuad(gl);
    this.finalProgram = createProgram(gl, vertSource, tonemapFrag);
  }
  
  render(scene, camera) {
    const gl = this.gl;
    
    // 1. 渲染场景到 FBO
    this.sceneTarget.bind();
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    
    scene.render(camera);
    
    // 2. 应用泛光
    this.bloom.apply(this.sceneTarget.texture, this.sceneTarget);
    
    // 3. 后处理链
    const processedTexture = this.postProcess.process(this.sceneTarget.texture);
    
    // 4. 最终输出到屏幕
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.disable(gl.DEPTH_TEST);
    
    gl.useProgram(this.finalProgram);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, processedTexture);
    
    this.quad.draw();
  }
  
  resize(width, height) {
    this.sceneTarget.resize(width, height);
    this.bloom.resize(width, height);
    this.postProcess.resize(width, height);
  }
}
```

## 本章小结

- 渲染到纹理是后处理的基础
- 全屏四边形用于应用后处理效果
- 双缓冲实现效果链
- 泛光需要提取-模糊-合并
- HDR 需要浮点纹理和色调映射

下一章，我们将学习多渲染目标（MRT）技术。
