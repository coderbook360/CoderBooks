# 帧缓冲对象

> "帧缓冲对象是离屏渲染的核心，打开通向无限特效的大门。"

## 什么是帧缓冲对象

### 概念

帧缓冲对象（Framebuffer Object，FBO）是一组可渲染目标的集合，允许渲染到纹理而非屏幕。

```
┌─────────────────────────────────────────────────────────┐
│                    帧缓冲结构                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   帧缓冲对象 (FBO)                                      │
│   ┌─────────────────────────────────────────┐          │
│   │  颜色附件 0  ─→ 纹理/渲染缓冲           │          │
│   │  颜色附件 1  ─→ 纹理/渲染缓冲           │          │
│   │  ...                                    │          │
│   │  深度附件    ─→ 纹理/渲染缓冲           │          │
│   │  模板附件    ─→ 纹理/渲染缓冲           │          │
│   │  深度模板    ─→ 纹理/渲染缓冲           │          │
│   └─────────────────────────────────────────┘          │
│                                                         │
│   默认帧缓冲 = 屏幕                                     │
│   自定义帧缓冲 = 离屏渲染                               │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 创建帧缓冲

### 基础步骤

```javascript
// 1. 创建帧缓冲对象
const framebuffer = gl.createFramebuffer();
gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

// 2. 创建并附加颜色纹理
const colorTexture = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, colorTexture);
gl.texImage2D(
  gl.TEXTURE_2D, 0, gl.RGBA8,
  width, height, 0,
  gl.RGBA, gl.UNSIGNED_BYTE, null
);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

gl.framebufferTexture2D(
  gl.FRAMEBUFFER,
  gl.COLOR_ATTACHMENT0,
  gl.TEXTURE_2D,
  colorTexture, 0
);

// 3. 创建并附加深度缓冲
const depthBuffer = gl.createRenderbuffer();
gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, width, height);
gl.framebufferRenderbuffer(
  gl.FRAMEBUFFER,
  gl.DEPTH_ATTACHMENT,
  gl.RENDERBUFFER,
  depthBuffer
);

// 4. 检查完整性
const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
if (status !== gl.FRAMEBUFFER_COMPLETE) {
  console.error('Framebuffer incomplete:', status);
}

// 5. 解绑
gl.bindFramebuffer(gl.FRAMEBUFFER, null);
```

### 完整性状态

| 状态 | 说明 |
|------|------|
| `FRAMEBUFFER_COMPLETE` | 帧缓冲完整可用 |
| `FRAMEBUFFER_INCOMPLETE_ATTACHMENT` | 附件不完整 |
| `FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT` | 没有附件 |
| `FRAMEBUFFER_INCOMPLETE_DIMENSIONS` | 附件尺寸不一致 |
| `FRAMEBUFFER_UNSUPPORTED` | 格式组合不支持 |

## 附件类型

### 纹理附件

```javascript
// 颜色纹理
gl.framebufferTexture2D(
  gl.FRAMEBUFFER,
  gl.COLOR_ATTACHMENT0,
  gl.TEXTURE_2D,
  texture, 0  // mipmap 级别
);

// 深度纹理
const depthTexture = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, depthTexture);
gl.texImage2D(
  gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24,
  width, height, 0,
  gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null
);
gl.framebufferTexture2D(
  gl.FRAMEBUFFER,
  gl.DEPTH_ATTACHMENT,
  gl.TEXTURE_2D,
  depthTexture, 0
);

// 深度模板纹理
const depthStencilTexture = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, depthStencilTexture);
gl.texImage2D(
  gl.TEXTURE_2D, 0, gl.DEPTH24_STENCIL8,
  width, height, 0,
  gl.DEPTH_STENCIL, gl.UNSIGNED_INT_24_8, null
);
gl.framebufferTexture2D(
  gl.FRAMEBUFFER,
  gl.DEPTH_STENCIL_ATTACHMENT,
  gl.TEXTURE_2D,
  depthStencilTexture, 0
);
```

### 渲染缓冲附件

```javascript
// 颜色渲染缓冲（不需要采样时使用）
const colorBuffer = gl.createRenderbuffer();
gl.bindRenderbuffer(gl.RENDERBUFFER, colorBuffer);
gl.renderbufferStorage(gl.RENDERBUFFER, gl.RGBA8, width, height);
gl.framebufferRenderbuffer(
  gl.FRAMEBUFFER,
  gl.COLOR_ATTACHMENT0,
  gl.RENDERBUFFER,
  colorBuffer
);

// 多重采样渲染缓冲
gl.renderbufferStorageMultisample(
  gl.RENDERBUFFER,
  4,  // 采样数
  gl.RGBA8,
  width, height
);
```

## 使用帧缓冲

### 渲染流程

```javascript
function renderToFramebuffer() {
  // 绑定自定义帧缓冲
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.viewport(0, 0, fboWidth, fboHeight);
  
  // 清除缓冲
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
  // 渲染场景
  renderScene();
  
  // 切换回默认帧缓冲（屏幕）
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, canvas.width, canvas.height);
}
```

### 使用渲染结果

```javascript
function render() {
  // 第一遍：渲染到帧缓冲
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.viewport(0, 0, fboWidth, fboHeight);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  renderScene();
  
  // 第二遍：使用帧缓冲纹理渲染到屏幕
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT);
  
  gl.useProgram(postProcessProgram);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, colorTexture);
  gl.uniform1i(u_texture, 0);
  
  drawFullscreenQuad();
}
```

## 多渲染目标（MRT）

### 概念

```
┌─────────────────────────────────────────────────────────┐
│                多渲染目标 (MRT)                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   片元着色器同时输出多个颜色                            │
│                                                         │
│   layout(location = 0) out vec4 color0;  ─→ 附件0      │
│   layout(location = 1) out vec4 color1;  ─→ 附件1      │
│   layout(location = 2) out vec4 color2;  ─→ 附件2      │
│                                                         │
│   用途: G-Buffer, 延迟渲染                              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 设置

```javascript
// 创建多个颜色附件
const textures = [];
for (let i = 0; i < 3; i++) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, width, height, 0, gl.RGBA, gl.HALF_FLOAT, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0 + i,
    gl.TEXTURE_2D,
    texture, 0
  );
  
  textures.push(texture);
}

// 指定绘制缓冲
gl.drawBuffers([
  gl.COLOR_ATTACHMENT0,
  gl.COLOR_ATTACHMENT1,
  gl.COLOR_ATTACHMENT2
]);
```

### 着色器

```glsl
#version 300 es
precision highp float;

layout(location = 0) out vec4 gPosition;
layout(location = 1) out vec4 gNormal;
layout(location = 2) out vec4 gAlbedo;

in vec3 v_worldPos;
in vec3 v_normal;
in vec2 v_texCoord;

uniform sampler2D u_diffuseMap;

void main() {
  gPosition = vec4(v_worldPos, 1.0);
  gNormal = vec4(normalize(v_normal), 0.0);
  gAlbedo = texture(u_diffuseMap, v_texCoord);
}
```

## 帧缓冲封装

### FBO 类

```javascript
class Framebuffer {
  constructor(gl, width, height, options = {}) {
    this.gl = gl;
    this.width = width;
    this.height = height;
    
    this.framebuffer = gl.createFramebuffer();
    this.colorTextures = [];
    this.depthTexture = null;
    this.depthBuffer = null;
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    
    // 创建颜色附件
    const numColorAttachments = options.colorAttachments || 1;
    const colorFormat = options.colorFormat || gl.RGBA8;
    const drawBuffers = [];
    
    for (let i = 0; i < numColorAttachments; i++) {
      const texture = this.createColorTexture(colorFormat);
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0 + i,
        gl.TEXTURE_2D,
        texture, 0
      );
      this.colorTextures.push(texture);
      drawBuffers.push(gl.COLOR_ATTACHMENT0 + i);
    }
    
    if (numColorAttachments > 1) {
      gl.drawBuffers(drawBuffers);
    }
    
    // 创建深度附件
    if (options.depth) {
      if (options.depthTexture) {
        this.depthTexture = this.createDepthTexture();
        gl.framebufferTexture2D(
          gl.FRAMEBUFFER,
          gl.DEPTH_ATTACHMENT,
          gl.TEXTURE_2D,
          this.depthTexture, 0
        );
      } else {
        this.depthBuffer = gl.createRenderbuffer();
        gl.bindRenderbuffer(gl.RENDERBUFFER, this.depthBuffer);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, width, height);
        gl.framebufferRenderbuffer(
          gl.FRAMEBUFFER,
          gl.DEPTH_ATTACHMENT,
          gl.RENDERBUFFER,
          this.depthBuffer
        );
      }
    }
    
    // 检查完整性
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      throw new Error(`Framebuffer incomplete: ${status}`);
    }
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  
  createColorTexture(format) {
    const gl = this.gl;
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    
    let type = gl.UNSIGNED_BYTE;
    let internalFormat = format;
    let texFormat = gl.RGBA;
    
    if (format === gl.RGBA16F || format === gl.RGBA32F) {
      type = format === gl.RGBA16F ? gl.HALF_FLOAT : gl.FLOAT;
    }
    
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, this.width, this.height, 0, texFormat, type, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    
    return texture;
  }
  
  createDepthTexture() {
    const gl = this.gl;
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24,
      this.width, this.height, 0,
      gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    
    return texture;
  }
  
  bind() {
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);
    this.gl.viewport(0, 0, this.width, this.height);
  }
  
  unbind() {
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
  }
  
  getColorTexture(index = 0) {
    return this.colorTextures[index];
  }
  
  getDepthTexture() {
    return this.depthTexture;
  }
  
  resize(width, height) {
    // 重新创建所有附件...
    this.width = width;
    this.height = height;
    // ...
  }
  
  dispose() {
    const gl = this.gl;
    gl.deleteFramebuffer(this.framebuffer);
    this.colorTextures.forEach(t => gl.deleteTexture(t));
    if (this.depthTexture) gl.deleteTexture(this.depthTexture);
    if (this.depthBuffer) gl.deleteRenderbuffer(this.depthBuffer);
  }
}
```

### 使用示例

```javascript
// 创建帧缓冲
const fbo = new Framebuffer(gl, 1024, 1024, {
  colorAttachments: 1,
  colorFormat: gl.RGBA16F,
  depth: true,
  depthTexture: true
});

// 渲染到帧缓冲
fbo.bind();
gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
renderScene();
fbo.unbind();

// 使用结果
gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, fbo.getColorTexture());
```

## 帧缓冲拷贝

### blitFramebuffer

```javascript
// 从一个帧缓冲拷贝到另一个
gl.bindFramebuffer(gl.READ_FRAMEBUFFER, sourceFBO);
gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, destFBO);

gl.blitFramebuffer(
  0, 0, srcWidth, srcHeight,     // 源矩形
  0, 0, dstWidth, dstHeight,     // 目标矩形
  gl.COLOR_BUFFER_BIT,           // 拷贝内容
  gl.LINEAR                      // 过滤模式
);

// 拷贝深度（必须使用 NEAREST）
gl.blitFramebuffer(
  0, 0, srcWidth, srcHeight,
  0, 0, dstWidth, dstHeight,
  gl.DEPTH_BUFFER_BIT,
  gl.NEAREST
);
```

### MSAA 解析

```javascript
// 创建多重采样帧缓冲
const msaaFBO = gl.createFramebuffer();
gl.bindFramebuffer(gl.FRAMEBUFFER, msaaFBO);

const msaaColor = gl.createRenderbuffer();
gl.bindRenderbuffer(gl.RENDERBUFFER, msaaColor);
gl.renderbufferStorageMultisample(gl.RENDERBUFFER, 4, gl.RGBA8, width, height);
gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, msaaColor);

const msaaDepth = gl.createRenderbuffer();
gl.bindRenderbuffer(gl.RENDERBUFFER, msaaDepth);
gl.renderbufferStorageMultisample(gl.RENDERBUFFER, 4, gl.DEPTH_COMPONENT24, width, height);
gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, msaaDepth);

// 渲染到 MSAA 帧缓冲
gl.bindFramebuffer(gl.FRAMEBUFFER, msaaFBO);
renderScene();

// 解析到普通帧缓冲
gl.bindFramebuffer(gl.READ_FRAMEBUFFER, msaaFBO);
gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, resolveFBO);
gl.blitFramebuffer(
  0, 0, width, height,
  0, 0, width, height,
  gl.COLOR_BUFFER_BIT,
  gl.NEAREST  // MSAA 解析必须使用 NEAREST
);
```

## 读取像素

### readPixels

```javascript
// 读取帧缓冲内容
gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

const pixels = new Uint8Array(width * height * 4);
gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

// 注意：WebGL 坐标系 Y 轴向上，需要翻转
function flipY(pixels, width, height) {
  const rowSize = width * 4;
  const temp = new Uint8Array(rowSize);
  
  for (let y = 0; y < height / 2; y++) {
    const topOffset = y * rowSize;
    const bottomOffset = (height - y - 1) * rowSize;
    
    temp.set(pixels.subarray(topOffset, topOffset + rowSize));
    pixels.copyWithin(topOffset, bottomOffset, bottomOffset + rowSize);
    pixels.set(temp, bottomOffset);
  }
}
```

### 异步读取

```javascript
// 使用像素缓冲对象异步读取
const pbo = gl.createBuffer();
gl.bindBuffer(gl.PIXEL_PACK_BUFFER, pbo);
gl.bufferData(gl.PIXEL_PACK_BUFFER, width * height * 4, gl.STREAM_READ);

// 开始异步读取
gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, 0);

// 稍后获取结果
const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);

function checkResult() {
  const status = gl.clientWaitSync(sync, 0, 0);
  
  if (status === gl.CONDITION_SATISFIED || status === gl.ALREADY_SIGNALED) {
    gl.deleteSync(sync);
    
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, pbo);
    const pixels = new Uint8Array(width * height * 4);
    gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, pixels);
    
    processPixels(pixels);
  } else {
    requestAnimationFrame(checkResult);
  }
}

requestAnimationFrame(checkResult);
```

## 本章小结

- 帧缓冲对象允许渲染到纹理
- 附件包括颜色、深度、模板
- 纹理附件可后续采样，渲染缓冲不行
- MRT 支持同时输出多个颜色
- blitFramebuffer 可拷贝帧缓冲内容
- MSAA 需要解析到普通帧缓冲
- 异步读取可避免 GPU 停顿

下一章，我们将学习渲染到纹理的应用。
