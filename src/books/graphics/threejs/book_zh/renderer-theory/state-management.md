# WebGL 状态管理

> "状态管理是 WebGL 性能优化的核心，减少冗余的状态切换。"

## 状态管理概述

WebGL 是状态机，状态切换有成本：

```
状态切换成本（相对值）:
┌─────────────────────┬───────┐
│ 切换类型            │ 成本  │
├─────────────────────┼───────┤
│ Shader Program      │ 100   │
│ Texture             │ 50    │
│ VBO/VAO             │ 30    │
│ Uniform             │ 5     │
│ Render State        │ 2     │
└─────────────────────┴───────┘
```

## WebGLState 实现

### 基础结构

```typescript
// src/renderers/webgl/WebGLState.ts
export class WebGLState {
  private gl: WebGL2RenderingContext;
  
  // 缓存状态
  private capabilities: Map<number, boolean> = new Map();
  
  // 混合状态
  private blending: number = NoBlending;
  private blendEquation: number = AddEquation;
  private blendSrc: number = OneFactor;
  private blendDst: number = ZeroFactor;
  private blendEquationAlpha: number | null = null;
  private blendSrcAlpha: number | null = null;
  private blendDstAlpha: number | null = null;
  
  // 深度状态
  private depthBuffer = true;
  private depthFunc: number = LessEqualDepth;
  private depthTest = true;
  private depthWrite = true;
  
  // 模板状态
  private stencilBuffer = false;
  private stencilTest = false;
  
  // 剔除状态
  private cullFace: number = CullFaceBack;
  private frontFace: number = FrontFaceDirectionCCW;
  
  // 多边形偏移
  private polygonOffset = false;
  private polygonOffsetFactor = 0;
  private polygonOffsetUnits = 0;
  
  // 颜色写入
  private colorMask = [true, true, true, true];
  
  // 清除值
  private clearColor = new Vector4(0, 0, 0, 0);
  private clearDepth = 1;
  private clearStencil = 0;
  
  // 视口
  private viewport = new Vector4();
  private scissor = new Vector4();
  private scissorTest = false;
  
  // 当前程序
  private currentProgram: WebGLProgram | null = null;
  
  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
  }
}
```

### 启用/禁用功能

```typescript
enable(capability: number): void {
  if (this.capabilities.get(capability) !== true) {
    this.gl.enable(capability);
    this.capabilities.set(capability, true);
  }
}

disable(capability: number): void {
  if (this.capabilities.get(capability) !== false) {
    this.gl.disable(capability);
    this.capabilities.set(capability, false);
  }
}

isEnabled(capability: number): boolean {
  return this.capabilities.get(capability) === true;
}
```

### 混合状态

```typescript
setBlending(
  blending: number,
  blendEquation?: number,
  blendSrc?: number,
  blendDst?: number,
  blendEquationAlpha?: number,
  blendSrcAlpha?: number,
  blendDstAlpha?: number,
  premultipliedAlpha = false
): void {
  const gl = this.gl;
  
  if (blending === NoBlending) {
    if (this.isEnabled(gl.BLEND)) {
      this.disable(gl.BLEND);
    }
    return;
  }
  
  if (!this.isEnabled(gl.BLEND)) {
    this.enable(gl.BLEND);
  }
  
  if (blending !== CustomBlending) {
    // 预设混合模式
    if (blending !== this.blending || premultipliedAlpha !== this.premultipliedAlpha) {
      if (this.blendEquationAlpha !== null || this.blendSrcAlpha !== null) {
        gl.blendEquation(gl.FUNC_ADD);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      }
      
      switch (blending) {
        case NormalBlending:
          if (premultipliedAlpha) {
            gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
          } else {
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
          }
          break;
          
        case AdditiveBlending:
          if (premultipliedAlpha) {
            gl.blendFunc(gl.ONE, gl.ONE);
          } else {
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
          }
          break;
          
        case SubtractiveBlending:
          gl.blendFuncSeparate(
            gl.ZERO, gl.ONE_MINUS_SRC_COLOR,
            gl.ZERO, gl.ONE
          );
          break;
          
        case MultiplyBlending:
          gl.blendFunc(gl.ZERO, gl.SRC_COLOR);
          break;
      }
      
      this.blending = blending;
      this.blendEquation = AddEquation;
      this.blendSrc = blending === NormalBlending ? SrcAlphaFactor : OneFactor;
      this.blendDst = OneMinusSrcAlphaFactor;
      this.blendEquationAlpha = null;
      this.blendSrcAlpha = null;
      this.blendDstAlpha = null;
      this.premultipliedAlpha = premultipliedAlpha;
    }
    
    return;
  }
  
  // 自定义混合
  blendEquation = blendEquation || AddEquation;
  blendSrc = blendSrc || OneFactor;
  blendDst = blendDst || ZeroFactor;
  
  if (
    blendEquation !== this.blendEquation ||
    blendEquationAlpha !== this.blendEquationAlpha
  ) {
    if (blendEquationAlpha === null) {
      gl.blendEquation(this.equationToGL(blendEquation));
    } else {
      gl.blendEquationSeparate(
        this.equationToGL(blendEquation),
        this.equationToGL(blendEquationAlpha)
      );
    }
    
    this.blendEquation = blendEquation;
    this.blendEquationAlpha = blendEquationAlpha;
  }
  
  if (
    blendSrc !== this.blendSrc ||
    blendDst !== this.blendDst ||
    blendSrcAlpha !== this.blendSrcAlpha ||
    blendDstAlpha !== this.blendDstAlpha
  ) {
    if (blendSrcAlpha === null || blendDstAlpha === null) {
      gl.blendFunc(
        this.factorToGL(blendSrc),
        this.factorToGL(blendDst)
      );
    } else {
      gl.blendFuncSeparate(
        this.factorToGL(blendSrc),
        this.factorToGL(blendDst),
        this.factorToGL(blendSrcAlpha),
        this.factorToGL(blendDstAlpha)
      );
    }
    
    this.blendSrc = blendSrc;
    this.blendDst = blendDst;
    this.blendSrcAlpha = blendSrcAlpha;
    this.blendDstAlpha = blendDstAlpha;
  }
  
  this.blending = blending;
}

private equationToGL(eq: number): number {
  const gl = this.gl;
  
  switch (eq) {
    case AddEquation:
      return gl.FUNC_ADD;
    case SubtractEquation:
      return gl.FUNC_SUBTRACT;
    case ReverseSubtractEquation:
      return gl.FUNC_REVERSE_SUBTRACT;
    case MinEquation:
      return gl.MIN;
    case MaxEquation:
      return gl.MAX;
    default:
      return gl.FUNC_ADD;
  }
}

private factorToGL(factor: number): number {
  const gl = this.gl;
  
  switch (factor) {
    case ZeroFactor:
      return gl.ZERO;
    case OneFactor:
      return gl.ONE;
    case SrcColorFactor:
      return gl.SRC_COLOR;
    case SrcAlphaFactor:
      return gl.SRC_ALPHA;
    case SrcAlphaSaturateFactor:
      return gl.SRC_ALPHA_SATURATE;
    case DstColorFactor:
      return gl.DST_COLOR;
    case DstAlphaFactor:
      return gl.DST_ALPHA;
    case OneMinusSrcColorFactor:
      return gl.ONE_MINUS_SRC_COLOR;
    case OneMinusSrcAlphaFactor:
      return gl.ONE_MINUS_SRC_ALPHA;
    case OneMinusDstColorFactor:
      return gl.ONE_MINUS_DST_COLOR;
    case OneMinusDstAlphaFactor:
      return gl.ONE_MINUS_DST_ALPHA;
    default:
      return gl.ONE;
  }
}
```

### 深度状态

```typescript
setDepthTest(depthTest: boolean): void {
  const gl = this.gl;
  
  if (depthTest !== this.depthTest) {
    if (depthTest) {
      this.enable(gl.DEPTH_TEST);
    } else {
      this.disable(gl.DEPTH_TEST);
    }
    this.depthTest = depthTest;
  }
}

setDepthWrite(depthWrite: boolean): void {
  if (depthWrite !== this.depthWrite) {
    this.gl.depthMask(depthWrite);
    this.depthWrite = depthWrite;
  }
}

setDepthFunc(depthFunc: number): void {
  if (depthFunc !== this.depthFunc) {
    const gl = this.gl;
    
    switch (depthFunc) {
      case NeverDepth:
        gl.depthFunc(gl.NEVER);
        break;
      case AlwaysDepth:
        gl.depthFunc(gl.ALWAYS);
        break;
      case LessDepth:
        gl.depthFunc(gl.LESS);
        break;
      case LessEqualDepth:
        gl.depthFunc(gl.LEQUAL);
        break;
      case EqualDepth:
        gl.depthFunc(gl.EQUAL);
        break;
      case GreaterEqualDepth:
        gl.depthFunc(gl.GEQUAL);
        break;
      case GreaterDepth:
        gl.depthFunc(gl.GREATER);
        break;
      case NotEqualDepth:
        gl.depthFunc(gl.NOTEQUAL);
        break;
      default:
        gl.depthFunc(gl.LEQUAL);
    }
    
    this.depthFunc = depthFunc;
  }
}
```

### 剔除状态

```typescript
setCullFace(cullFace: number): void {
  const gl = this.gl;
  
  if (cullFace !== CullFaceNone) {
    this.enable(gl.CULL_FACE);
    
    if (cullFace !== this.cullFace) {
      if (cullFace === CullFaceBack) {
        gl.cullFace(gl.BACK);
      } else if (cullFace === CullFaceFront) {
        gl.cullFace(gl.FRONT);
      } else {
        gl.cullFace(gl.FRONT_AND_BACK);
      }
    }
  } else {
    this.disable(gl.CULL_FACE);
  }
  
  this.cullFace = cullFace;
}

setFrontFace(frontFace: number): void {
  const gl = this.gl;
  
  if (frontFace !== this.frontFace) {
    if (frontFace === FrontFaceDirectionCW) {
      gl.frontFace(gl.CW);
    } else {
      gl.frontFace(gl.CCW);
    }
    
    this.frontFace = frontFace;
  }
}
```

### 颜色写入

```typescript
setColorMask(r: boolean, g: boolean, b: boolean, a: boolean): void {
  if (
    r !== this.colorMask[0] ||
    g !== this.colorMask[1] ||
    b !== this.colorMask[2] ||
    a !== this.colorMask[3]
  ) {
    this.gl.colorMask(r, g, b, a);
    this.colorMask[0] = r;
    this.colorMask[1] = g;
    this.colorMask[2] = b;
    this.colorMask[3] = a;
  }
}
```

### 视口与裁剪

```typescript
setViewport(x: number, y: number, width: number, height: number): void {
  if (
    this.viewport.x !== x ||
    this.viewport.y !== y ||
    this.viewport.z !== width ||
    this.viewport.w !== height
  ) {
    this.gl.viewport(x, y, width, height);
    this.viewport.set(x, y, width, height);
  }
}

setScissor(x: number, y: number, width: number, height: number): void {
  if (
    this.scissor.x !== x ||
    this.scissor.y !== y ||
    this.scissor.z !== width ||
    this.scissor.w !== height
  ) {
    this.gl.scissor(x, y, width, height);
    this.scissor.set(x, y, width, height);
  }
}

setScissorTest(scissorTest: boolean): void {
  const gl = this.gl;
  
  if (scissorTest !== this.scissorTest) {
    if (scissorTest) {
      this.enable(gl.SCISSOR_TEST);
    } else {
      this.disable(gl.SCISSOR_TEST);
    }
    this.scissorTest = scissorTest;
  }
}
```

### 程序状态

```typescript
useProgram(program: WebGLProgram | null): boolean {
  if (this.currentProgram !== program) {
    this.gl.useProgram(program);
    this.currentProgram = program;
    return true;
  }
  return false;
}
```

### 清除操作

```typescript
setClearColor(r: number, g: number, b: number, a: number): void {
  if (
    this.clearColor.x !== r ||
    this.clearColor.y !== g ||
    this.clearColor.z !== b ||
    this.clearColor.w !== a
  ) {
    this.gl.clearColor(r, g, b, a);
    this.clearColor.set(r, g, b, a);
  }
}

setClearDepth(depth: number): void {
  if (this.clearDepth !== depth) {
    this.gl.clearDepth(depth);
    this.clearDepth = depth;
  }
}

setClearStencil(stencil: number): void {
  if (this.clearStencil !== stencil) {
    this.gl.clearStencil(stencil);
    this.clearStencil = stencil;
  }
}
```

### 材质到状态

```typescript
setMaterial(material: Material, frontFaceCW = false): void {
  const gl = this.gl;
  
  // 剔除
  if (material.side === DoubleSide) {
    this.disable(gl.CULL_FACE);
  } else {
    this.enable(gl.CULL_FACE);
  }
  
  let flipSided = material.side === BackSide;
  if (frontFaceCW) flipSided = !flipSided;
  
  if (flipSided) {
    gl.cullFace(gl.FRONT);
  } else {
    gl.cullFace(gl.BACK);
  }
  
  // 混合
  this.setBlending(
    material.blending,
    material.blendEquation,
    material.blendSrc,
    material.blendDst,
    material.blendEquationAlpha,
    material.blendSrcAlpha,
    material.blendDstAlpha,
    material.premultipliedAlpha
  );
  
  // 深度
  this.setDepthFunc(material.depthFunc);
  this.setDepthTest(material.depthTest);
  this.setDepthWrite(material.depthWrite);
  
  // 颜色写入
  const colorWrite = material.colorWrite;
  this.setColorMask(colorWrite, colorWrite, colorWrite, colorWrite);
  
  // 模板
  const stencilWrite = material.stencilWrite;
  this.setStencilTest(stencilWrite);
  
  if (stencilWrite) {
    this.setStencilMask(material.stencilWriteMask);
    this.setStencilFunc(
      material.stencilFunc,
      material.stencilRef,
      material.stencilFuncMask
    );
    this.setStencilOp(
      material.stencilFail,
      material.stencilZFail,
      material.stencilZPass
    );
  }
  
  // 多边形偏移
  this.setPolygonOffset(
    material.polygonOffset,
    material.polygonOffsetFactor,
    material.polygonOffsetUnits
  );
  
  // Alpha 测试（透明度裁剪在着色器中处理）
}
```

### 重置状态

```typescript
reset(): void {
  const gl = this.gl;
  
  // 重置所有缓存
  this.capabilities.clear();
  
  this.blending = -1;
  this.blendEquation = -1;
  this.blendSrc = -1;
  this.blendDst = -1;
  
  this.depthTest = false;
  this.depthWrite = true;
  this.depthFunc = -1;
  
  this.colorMask = [true, true, true, true];
  
  this.cullFace = -1;
  this.frontFace = -1;
  
  this.currentProgram = null;
  
  // 重置 WebGL 状态
  gl.disable(gl.BLEND);
  gl.disable(gl.CULL_FACE);
  gl.disable(gl.DEPTH_TEST);
  gl.disable(gl.SCISSOR_TEST);
  gl.disable(gl.STENCIL_TEST);
  
  gl.blendEquation(gl.FUNC_ADD);
  gl.blendFunc(gl.ONE, gl.ZERO);
  
  gl.depthMask(true);
  gl.depthFunc(gl.LESS);
  
  gl.colorMask(true, true, true, true);
  
  gl.cullFace(gl.BACK);
  gl.frontFace(gl.CCW);
}
```

## 纹理单元管理

```typescript
class TextureSlotManager {
  private gl: WebGL2RenderingContext;
  private maxTextures: number;
  private currentTextureSlot: number = 0;
  private boundTextures: Map<number, WebGLTexture | null>[] = [];
  
  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.maxTextures = gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS);
    
    for (let i = 0; i < this.maxTextures; i++) {
      this.boundTextures.push(new Map());
    }
  }
  
  activeTexture(slot: number): void {
    if (this.currentTextureSlot !== slot) {
      this.gl.activeTexture(this.gl.TEXTURE0 + slot);
      this.currentTextureSlot = slot;
    }
  }
  
  bindTexture(target: number, texture: WebGLTexture | null): void {
    const gl = this.gl;
    
    if (this.currentTextureSlot === -1) {
      this.activeTexture(0);
    }
    
    const boundTexture = this.boundTextures[this.currentTextureSlot];
    
    if (boundTexture.get(target) !== texture) {
      gl.bindTexture(target, texture);
      boundTexture.set(target, texture);
    }
  }
  
  unbindTexture(target: number): void {
    const boundTexture = this.boundTextures[this.currentTextureSlot];
    
    if (boundTexture.has(target)) {
      this.gl.bindTexture(target, null);
      boundTexture.delete(target);
    }
  }
}
```

## 本章小结

- WebGLState 缓存所有 WebGL 状态
- 只在状态变化时调用 WebGL API
- 减少冗余调用提升性能
- 支持混合、深度、剔除、视口等状态
- setMaterial 统一设置材质相关状态
- reset 重置所有状态到初始值

下一章，我们将学习 WebGLRenderer 完整实现。
