# WebGLState 完整实现

> "精确控制 WebGL 状态是高性能渲染的关键。"

## WebGLState 结构

```
WebGLState
├── 混合状态
│   ├── blending
│   ├── blendEquation
│   ├── blendSrc/blendDst
│   └── premultipliedAlpha
├── 深度状态
│   ├── depthTest
│   ├── depthWrite
│   └── depthFunc
├── 模板状态
│   ├── stencilTest
│   ├── stencilFunc
│   ├── stencilRef
│   └── stencilOp
├── 剔除状态
│   ├── cullFace
│   └── frontFace
├── 多边形偏移
│   ├── polygonOffset
│   ├── offsetFactor
│   └── offsetUnits
├── 颜色状态
│   ├── colorMask
│   └── clearColor
└── 视口/裁剪
    ├── viewport
    └── scissor
```

## 完整实现

```typescript
// src/renderers/webgl/WebGLState.ts
export class WebGLState {
  private _gl: WebGL2RenderingContext;
  
  // 当前状态缓存
  private _currentBlending: Blending | null = null;
  private _currentBlendEquation: BlendEquation | null = null;
  private _currentBlendSrc: BlendFactor | null = null;
  private _currentBlendDst: BlendFactor | null = null;
  private _currentBlendEquationAlpha: BlendEquation | null = null;
  private _currentBlendSrcAlpha: BlendFactor | null = null;
  private _currentBlendDstAlpha: BlendFactor | null = null;
  private _currentPremultipliedAlpha = false;
  
  private _currentDepthTest = false;
  private _currentDepthWrite = false;
  private _currentDepthFunc: DepthFunc | null = null;
  
  private _currentStencilTest = false;
  private _currentStencilFunc: StencilFunc | null = null;
  private _currentStencilRef = 0;
  private _currentStencilFuncMask = 0xff;
  private _currentStencilFail: StencilOp | null = null;
  private _currentStencilZFail: StencilOp | null = null;
  private _currentStencilZPass: StencilOp | null = null;
  private _currentStencilMask = 0xff;
  
  private _currentCullFace: CullFace | null = null;
  private _currentFrontFace: FrontFace | null = null;
  
  private _currentPolygonOffset = false;
  private _currentPolygonOffsetFactor = 0;
  private _currentPolygonOffsetUnits = 0;
  
  private _currentColorMask = [true, true, true, true];
  private _currentClearColor = new Vector4(0, 0, 0, 0);
  private _currentClearDepth = 1;
  private _currentClearStencil = 0;
  
  private _currentViewport = new Vector4();
  private _currentScissor = new Vector4();
  private _currentScissorTest = false;
  
  private _currentLineWidth = 1;
  
  // 当前程序
  private _currentProgram: WebGLProgram | null = null;
  
  // 纹理单元
  private _currentTextureSlot: number | null = null;
  private _currentBoundTextures = new Map<number, WebGLTexture | null>();
  
  // VAO
  private _currentBoundVAO: WebGLVertexArrayObject | null = null;
  
  // Buffer
  private _currentBoundBuffer = new Map<number, WebGLBuffer | null>();
  
  constructor(gl: WebGL2RenderingContext) {
    this._gl = gl;
  }
  
  // ==================== 混合状态 ====================
  
  setBlending(
    blending: Blending,
    blendEquation?: BlendEquation,
    blendSrc?: BlendFactor,
    blendDst?: BlendFactor,
    blendEquationAlpha?: BlendEquation,
    blendSrcAlpha?: BlendFactor,
    blendDstAlpha?: BlendFactor,
    premultipliedAlpha = false
  ): void {
    const gl = this._gl;
    
    if (blending === NoBlending) {
      if (this._currentBlending !== NoBlending) {
        gl.disable(gl.BLEND);
        this._currentBlending = NoBlending;
      }
      return;
    }
    
    // 启用混合
    if (this._currentBlending !== blending) {
      gl.enable(gl.BLEND);
    }
    
    if (blending === CustomBlending) {
      // 自定义混合
      const equationToGL = this._getEquationGL(blendEquation!);
      const srcToGL = this._getFactorGL(blendSrc!);
      const dstToGL = this._getFactorGL(blendDst!);
      
      if (
        blendEquation !== this._currentBlendEquation ||
        blendEquationAlpha !== this._currentBlendEquationAlpha
      ) {
        if (blendEquationAlpha !== undefined) {
          gl.blendEquationSeparate(
            equationToGL,
            this._getEquationGL(blendEquationAlpha)
          );
        } else {
          gl.blendEquation(equationToGL);
        }
        
        this._currentBlendEquation = blendEquation!;
        this._currentBlendEquationAlpha = blendEquationAlpha ?? null;
      }
      
      if (
        blendSrc !== this._currentBlendSrc ||
        blendDst !== this._currentBlendDst ||
        blendSrcAlpha !== this._currentBlendSrcAlpha ||
        blendDstAlpha !== this._currentBlendDstAlpha
      ) {
        if (blendSrcAlpha !== undefined && blendDstAlpha !== undefined) {
          gl.blendFuncSeparate(
            srcToGL,
            dstToGL,
            this._getFactorGL(blendSrcAlpha),
            this._getFactorGL(blendDstAlpha)
          );
        } else {
          gl.blendFunc(srcToGL, dstToGL);
        }
        
        this._currentBlendSrc = blendSrc!;
        this._currentBlendDst = blendDst!;
        this._currentBlendSrcAlpha = blendSrcAlpha ?? null;
        this._currentBlendDstAlpha = blendDstAlpha ?? null;
      }
    } else {
      // 预设混合模式
      if (
        blending !== this._currentBlending ||
        premultipliedAlpha !== this._currentPremultipliedAlpha
      ) {
        switch (blending) {
          case NormalBlending:
            if (premultipliedAlpha) {
              gl.blendEquationSeparate(gl.FUNC_ADD, gl.FUNC_ADD);
              gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
            } else {
              gl.blendEquationSeparate(gl.FUNC_ADD, gl.FUNC_ADD);
              gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
            }
            break;
            
          case AdditiveBlending:
            if (premultipliedAlpha) {
              gl.blendEquationSeparate(gl.FUNC_ADD, gl.FUNC_ADD);
              gl.blendFuncSeparate(gl.ONE, gl.ONE, gl.ONE, gl.ONE);
            } else {
              gl.blendEquation(gl.FUNC_ADD);
              gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
            }
            break;
            
          case SubtractiveBlending:
            if (premultipliedAlpha) {
              gl.blendEquationSeparate(gl.FUNC_ADD, gl.FUNC_ADD);
              gl.blendFuncSeparate(gl.ZERO, gl.ONE_MINUS_SRC_COLOR, gl.ZERO, gl.ONE);
            } else {
              gl.blendEquation(gl.FUNC_ADD);
              gl.blendFunc(gl.ZERO, gl.ONE_MINUS_SRC_COLOR);
            }
            break;
            
          case MultiplyBlending:
            if (premultipliedAlpha) {
              gl.blendEquationSeparate(gl.FUNC_ADD, gl.FUNC_ADD);
              gl.blendFuncSeparate(gl.ZERO, gl.SRC_COLOR, gl.ZERO, gl.SRC_ALPHA);
            } else {
              gl.blendEquation(gl.FUNC_ADD);
              gl.blendFunc(gl.ZERO, gl.SRC_COLOR);
            }
            break;
        }
      }
    }
    
    this._currentBlending = blending;
    this._currentPremultipliedAlpha = premultipliedAlpha;
  }
  
  private _getEquationGL(equation: BlendEquation): number {
    const gl = this._gl;
    
    switch (equation) {
      case AddEquation: return gl.FUNC_ADD;
      case SubtractEquation: return gl.FUNC_SUBTRACT;
      case ReverseSubtractEquation: return gl.FUNC_REVERSE_SUBTRACT;
      case MinEquation: return gl.MIN;
      case MaxEquation: return gl.MAX;
      default: return gl.FUNC_ADD;
    }
  }
  
  private _getFactorGL(factor: BlendFactor): number {
    const gl = this._gl;
    
    switch (factor) {
      case ZeroFactor: return gl.ZERO;
      case OneFactor: return gl.ONE;
      case SrcColorFactor: return gl.SRC_COLOR;
      case OneMinusSrcColorFactor: return gl.ONE_MINUS_SRC_COLOR;
      case SrcAlphaFactor: return gl.SRC_ALPHA;
      case OneMinusSrcAlphaFactor: return gl.ONE_MINUS_SRC_ALPHA;
      case DstAlphaFactor: return gl.DST_ALPHA;
      case OneMinusDstAlphaFactor: return gl.ONE_MINUS_DST_ALPHA;
      case DstColorFactor: return gl.DST_COLOR;
      case OneMinusDstColorFactor: return gl.ONE_MINUS_DST_COLOR;
      case SrcAlphaSaturateFactor: return gl.SRC_ALPHA_SATURATE;
      default: return gl.ONE;
    }
  }
  
  // ==================== 深度状态 ====================
  
  setDepthTest(depthTest: boolean): void {
    if (depthTest !== this._currentDepthTest) {
      const gl = this._gl;
      
      if (depthTest) {
        gl.enable(gl.DEPTH_TEST);
      } else {
        gl.disable(gl.DEPTH_TEST);
      }
      
      this._currentDepthTest = depthTest;
    }
  }
  
  setDepthWrite(depthWrite: boolean): void {
    if (depthWrite !== this._currentDepthWrite) {
      this._gl.depthMask(depthWrite);
      this._currentDepthWrite = depthWrite;
    }
  }
  
  setDepthFunc(depthFunc: DepthFunc): void {
    if (depthFunc !== this._currentDepthFunc) {
      const gl = this._gl;
      
      let glDepthFunc: number;
      
      switch (depthFunc) {
        case NeverDepth: glDepthFunc = gl.NEVER; break;
        case AlwaysDepth: glDepthFunc = gl.ALWAYS; break;
        case LessDepth: glDepthFunc = gl.LESS; break;
        case LessEqualDepth: glDepthFunc = gl.LEQUAL; break;
        case EqualDepth: glDepthFunc = gl.EQUAL; break;
        case GreaterEqualDepth: glDepthFunc = gl.GEQUAL; break;
        case GreaterDepth: glDepthFunc = gl.GREATER; break;
        case NotEqualDepth: glDepthFunc = gl.NOTEQUAL; break;
        default: glDepthFunc = gl.LEQUAL;
      }
      
      gl.depthFunc(glDepthFunc);
      this._currentDepthFunc = depthFunc;
    }
  }
  
  // ==================== 模板状态 ====================
  
  setStencilTest(stencilTest: boolean): void {
    if (stencilTest !== this._currentStencilTest) {
      const gl = this._gl;
      
      if (stencilTest) {
        gl.enable(gl.STENCIL_TEST);
      } else {
        gl.disable(gl.STENCIL_TEST);
      }
      
      this._currentStencilTest = stencilTest;
    }
  }
  
  setStencilFunc(func: StencilFunc, ref: number, mask: number): void {
    if (
      func !== this._currentStencilFunc ||
      ref !== this._currentStencilRef ||
      mask !== this._currentStencilFuncMask
    ) {
      const gl = this._gl;
      
      let glFunc: number;
      
      switch (func) {
        case NeverStencilFunc: glFunc = gl.NEVER; break;
        case AlwaysStencilFunc: glFunc = gl.ALWAYS; break;
        case LessStencilFunc: glFunc = gl.LESS; break;
        case LessEqualStencilFunc: glFunc = gl.LEQUAL; break;
        case EqualStencilFunc: glFunc = gl.EQUAL; break;
        case GreaterEqualStencilFunc: glFunc = gl.GEQUAL; break;
        case GreaterStencilFunc: glFunc = gl.GREATER; break;
        case NotEqualStencilFunc: glFunc = gl.NOTEQUAL; break;
        default: glFunc = gl.ALWAYS;
      }
      
      gl.stencilFunc(glFunc, ref, mask);
      
      this._currentStencilFunc = func;
      this._currentStencilRef = ref;
      this._currentStencilFuncMask = mask;
    }
  }
  
  setStencilOp(fail: StencilOp, zFail: StencilOp, zPass: StencilOp): void {
    if (
      fail !== this._currentStencilFail ||
      zFail !== this._currentStencilZFail ||
      zPass !== this._currentStencilZPass
    ) {
      const gl = this._gl;
      
      gl.stencilOp(
        this._getStencilOpGL(fail),
        this._getStencilOpGL(zFail),
        this._getStencilOpGL(zPass)
      );
      
      this._currentStencilFail = fail;
      this._currentStencilZFail = zFail;
      this._currentStencilZPass = zPass;
    }
  }
  
  private _getStencilOpGL(op: StencilOp): number {
    const gl = this._gl;
    
    switch (op) {
      case KeepStencilOp: return gl.KEEP;
      case ZeroStencilOp: return gl.ZERO;
      case ReplaceStencilOp: return gl.REPLACE;
      case IncrementStencilOp: return gl.INCR;
      case DecrementStencilOp: return gl.DECR;
      case IncrementWrapStencilOp: return gl.INCR_WRAP;
      case DecrementWrapStencilOp: return gl.DECR_WRAP;
      case InvertStencilOp: return gl.INVERT;
      default: return gl.KEEP;
    }
  }
  
  setStencilMask(mask: number): void {
    if (mask !== this._currentStencilMask) {
      this._gl.stencilMask(mask);
      this._currentStencilMask = mask;
    }
  }
  
  // ==================== 剔除状态 ====================
  
  setCullFace(cullFace: CullFace): void {
    const gl = this._gl;
    
    if (cullFace !== CullFaceNone) {
      gl.enable(gl.CULL_FACE);
      
      if (cullFace !== this._currentCullFace) {
        if (cullFace === CullFaceBack) {
          gl.cullFace(gl.BACK);
        } else if (cullFace === CullFaceFront) {
          gl.cullFace(gl.FRONT);
        } else {
          gl.cullFace(gl.FRONT_AND_BACK);
        }
      }
    } else {
      gl.disable(gl.CULL_FACE);
    }
    
    this._currentCullFace = cullFace;
  }
  
  setFrontFace(frontFace: FrontFace): void {
    if (frontFace !== this._currentFrontFace) {
      const gl = this._gl;
      
      if (frontFace === FrontFaceCW) {
        gl.frontFace(gl.CW);
      } else {
        gl.frontFace(gl.CCW);
      }
      
      this._currentFrontFace = frontFace;
    }
  }
  
  // ==================== 多边形偏移 ====================
  
  setPolygonOffset(
    polygonOffset: boolean,
    factor?: number,
    units?: number
  ): void {
    const gl = this._gl;
    
    if (polygonOffset) {
      gl.enable(gl.POLYGON_OFFSET_FILL);
      
      if (
        factor !== this._currentPolygonOffsetFactor ||
        units !== this._currentPolygonOffsetUnits
      ) {
        gl.polygonOffset(factor!, units!);
        this._currentPolygonOffsetFactor = factor!;
        this._currentPolygonOffsetUnits = units!;
      }
    } else {
      gl.disable(gl.POLYGON_OFFSET_FILL);
    }
    
    this._currentPolygonOffset = polygonOffset;
  }
  
  // ==================== 颜色状态 ====================
  
  setColorMask(r: boolean, g: boolean, b: boolean, a: boolean): void {
    const mask = this._currentColorMask;
    
    if (mask[0] !== r || mask[1] !== g || mask[2] !== b || mask[3] !== a) {
      this._gl.colorMask(r, g, b, a);
      mask[0] = r;
      mask[1] = g;
      mask[2] = b;
      mask[3] = a;
    }
  }
  
  setClearColor(r: number, g: number, b: number, a: number): void {
    const color = this._currentClearColor;
    
    if (color.x !== r || color.y !== g || color.z !== b || color.w !== a) {
      this._gl.clearColor(r, g, b, a);
      color.set(r, g, b, a);
    }
  }
  
  setClearDepth(depth: number): void {
    if (this._currentClearDepth !== depth) {
      this._gl.clearDepth(depth);
      this._currentClearDepth = depth;
    }
  }
  
  setClearStencil(stencil: number): void {
    if (this._currentClearStencil !== stencil) {
      this._gl.clearStencil(stencil);
      this._currentClearStencil = stencil;
    }
  }
  
  // ==================== 视口/裁剪 ====================
  
  setViewport(x: number, y: number, width: number, height: number): void {
    const viewport = this._currentViewport;
    
    if (viewport.x !== x || viewport.y !== y || viewport.z !== width || viewport.w !== height) {
      this._gl.viewport(x, y, width, height);
      viewport.set(x, y, width, height);
    }
  }
  
  setScissor(x: number, y: number, width: number, height: number): void {
    const scissor = this._currentScissor;
    
    if (scissor.x !== x || scissor.y !== y || scissor.z !== width || scissor.w !== height) {
      this._gl.scissor(x, y, width, height);
      scissor.set(x, y, width, height);
    }
  }
  
  setScissorTest(scissorTest: boolean): void {
    if (scissorTest !== this._currentScissorTest) {
      const gl = this._gl;
      
      if (scissorTest) {
        gl.enable(gl.SCISSOR_TEST);
      } else {
        gl.disable(gl.SCISSOR_TEST);
      }
      
      this._currentScissorTest = scissorTest;
    }
  }
  
  // ==================== 线宽 ====================
  
  setLineWidth(width: number): void {
    if (width !== this._currentLineWidth) {
      this._gl.lineWidth(width);
      this._currentLineWidth = width;
    }
  }
  
  // ==================== 程序 ====================
  
  useProgram(program: WebGLProgram): boolean {
    if (this._currentProgram !== program) {
      this._gl.useProgram(program);
      this._currentProgram = program;
      return true;
    }
    return false;
  }
  
  // ==================== 纹理 ====================
  
  activeTexture(slot?: number): void {
    const gl = this._gl;
    
    if (slot === undefined) {
      slot = gl.TEXTURE0 + this._getMaxTextures() - 1;
    }
    
    if (this._currentTextureSlot !== slot) {
      gl.activeTexture(slot);
      this._currentTextureSlot = slot;
    }
  }
  
  bindTexture(type: number, texture: WebGLTexture | null): void {
    if (this._currentTextureSlot === null) {
      this.activeTexture();
    }
    
    const boundTexture = this._currentBoundTextures.get(this._currentTextureSlot!);
    
    if (boundTexture !== texture) {
      this._gl.bindTexture(type, texture);
      this._currentBoundTextures.set(this._currentTextureSlot!, texture);
    }
  }
  
  unbindTexture(): void {
    const gl = this._gl;
    
    if (this._currentTextureSlot !== null) {
      this._currentBoundTextures.set(this._currentTextureSlot, null);
    }
  }
  
  private _getMaxTextures(): number {
    return this._gl.getParameter(this._gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS);
  }
  
  // ==================== VAO ====================
  
  bindVertexArray(vao: WebGLVertexArrayObject | null): void {
    if (this._currentBoundVAO !== vao) {
      this._gl.bindVertexArray(vao);
      this._currentBoundVAO = vao;
    }
  }
  
  // ==================== Buffer ====================
  
  bindBuffer(target: number, buffer: WebGLBuffer | null): void {
    const currentBuffer = this._currentBoundBuffer.get(target);
    
    if (currentBuffer !== buffer) {
      this._gl.bindBuffer(target, buffer);
      this._currentBoundBuffer.set(target, buffer);
    }
  }
  
  // ==================== 材质状态设置 ====================
  
  setMaterial(material: Material, frontFaceCW: boolean): void {
    // 双面渲染
    if (material.side === DoubleSide) {
      this.setCullFace(CullFaceNone);
    } else {
      this.setCullFace(CullFaceBack);
    }
    
    // 正面方向
    let flipSided = material.side === BackSide;
    if (frontFaceCW) flipSided = !flipSided;
    
    this.setFrontFace(flipSided ? FrontFaceCW : FrontFaceCCW);
    
    // 混合
    if (material.blending === NormalBlending && material.transparent === false) {
      this.setBlending(NoBlending);
    } else {
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
    }
    
    // 深度
    this.setDepthTest(material.depthTest);
    this.setDepthWrite(material.depthWrite);
    this.setDepthFunc(material.depthFunc);
    
    // 颜色写入
    this.setColorMask(
      material.colorWrite,
      material.colorWrite,
      material.colorWrite,
      material.colorWrite
    );
    
    // 多边形偏移
    this.setPolygonOffset(
      material.polygonOffset,
      material.polygonOffsetFactor,
      material.polygonOffsetUnits
    );
  }
  
  // ==================== 重置 ====================
  
  reset(): void {
    const gl = this._gl;
    
    // 重置程序
    this._currentProgram = null;
    gl.useProgram(null);
    
    // 重置混合
    this._currentBlending = null;
    gl.disable(gl.BLEND);
    
    // 重置深度
    this._currentDepthTest = false;
    this._currentDepthWrite = false;
    gl.disable(gl.DEPTH_TEST);
    gl.depthMask(false);
    
    // 重置剔除
    this._currentCullFace = null;
    gl.disable(gl.CULL_FACE);
    
    // 重置纹理
    this._currentTextureSlot = null;
    this._currentBoundTextures.clear();
    
    // 重置 VAO
    this._currentBoundVAO = null;
    gl.bindVertexArray(null);
    
    // 重置 Buffer
    this._currentBoundBuffer.clear();
  }
}
```

## 使用示例

```typescript
const state = new WebGLState(gl);

// 设置视口
state.setViewport(0, 0, canvas.width, canvas.height);

// 设置深度测试
state.setDepthTest(true);
state.setDepthWrite(true);
state.setDepthFunc(LessEqualDepth);

// 设置混合
state.setBlending(NormalBlending);

// 设置剔除
state.setCullFace(CullFaceBack);
state.setFrontFace(FrontFaceCCW);

// 清除颜色
state.setClearColor(0.1, 0.1, 0.1, 1.0);
gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

// 使用程序
state.useProgram(program);

// 绑定 VAO
state.bindVertexArray(vao);

// 绘制...

// 重置
state.reset();
```

## 本章小结

- WebGLState 缓存所有 WebGL 状态
- 只在状态变化时调用 GL 函数
- 支持混合、深度、模板、剔除状态
- setMaterial() 统一设置材质状态
- reset() 重置所有状态
- 显著减少冗余状态切换

下一章，我们将学习 WebGLTextures 纹理管理。
