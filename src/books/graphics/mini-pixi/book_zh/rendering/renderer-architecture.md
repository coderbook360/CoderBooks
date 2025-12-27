# 渲染器架构设计

PixiJS 的渲染器是整个引擎的核心。它需要支持 WebGL、WebGPU 两种图形 API，同时保持 API 统一。本章深入解析 PixiJS v8 的渲染器架构设计。

## 为什么需要抽象渲染器？

直接使用 WebGL/WebGPU 编写渲染代码的问题：

1. **API 差异大**：WebGL 和 WebGPU 的 API 完全不同
2. **代码重复**：每种图形 API 都需要重写渲染逻辑
3. **难以切换**：无法在运行时切换渲染后端

**解决方案**：抽象渲染器接口，将渲染逻辑与底层 API 解耦。

## 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Application                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                   Renderer                               │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐ │ │
│  │  │   Runners   │ │   Systems   │ │      Pipes          │ │ │
│  │  │  (生命周期)  │ │  (功能模块)  │ │    (渲染管道)       │ │ │
│  │  └─────────────┘ └─────────────┘ └─────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              GPU Backend (WebGL / WebGPU)                │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 核心概念

### 1. Renderer（渲染器）

渲染器是所有渲染功能的入口点：

```typescript
// src/rendering/Renderer.ts

export interface RendererOptions {
  width: number;
  height: number;
  backgroundColor: number;
  antialias: boolean;
  resolution: number;
  powerPreference?: 'default' | 'high-performance' | 'low-power';
}

export abstract class Renderer {
  // 画布尺寸
  public width: number = 800;
  public height: number = 600;
  public resolution: number = 1;
  
  // 视图（Canvas 元素）
  public view: HTMLCanvasElement;
  
  // 功能系统
  protected systems: Map<string, System> = new Map();
  
  // 渲染管道
  protected pipes: Map<string, RenderPipe> = new Map();
  
  // 生命周期运行器
  protected runners: {
    init: Runner;
    prerender: Runner;
    postrender: Runner;
    destroy: Runner;
    resize: Runner;
  };
  
  constructor(options: RendererOptions) {
    this.width = options.width;
    this.height = options.height;
    this.resolution = options.resolution;
  }
  
  /**
   * 渲染场景图
   */
  public abstract render(container: Container): void;
  
  /**
   * 调整渲染器尺寸
   */
  public resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    
    // 调整画布尺寸
    this.view.width = width * this.resolution;
    this.view.height = height * this.resolution;
    
    // 通知所有系统
    this.runners.resize.emit(width, height);
  }
  
  /**
   * 销毁渲染器
   */
  public destroy(): void {
    this.runners.destroy.emit();
    this.systems.clear();
    this.pipes.clear();
  }
}
```

### 2. System（系统）

系统是独立的功能模块，负责特定的渲染任务：

```typescript
// src/rendering/System.ts

/**
 * 系统接口
 * 每个系统负责渲染的一个方面（状态管理、纹理、着色器等）
 */
export interface System {
  /** 系统名称 */
  name: string;
  
  /** 初始化 */
  init?(): void;
  
  /** 渲染前准备 */
  prerender?(): void;
  
  /** 渲染后清理 */
  postrender?(): void;
  
  /** 销毁资源 */
  destroy?(): void;
  
  /** 尺寸变化 */
  resize?(width: number, height: number): void;
}

// 常见的系统类型
export interface SystemTypes {
  texture: TextureSystem;      // 纹理管理
  shader: ShaderSystem;        // 着色器管理
  state: StateSystem;          // 渲染状态管理
  buffer: BufferSystem;        // 缓冲区管理
  geometry: GeometrySystem;    // 几何数据管理
  batch: BatchSystem;          // 批处理管理
  filter: FilterSystem;        // 滤镜管理
  mask: MaskSystem;            // 遮罩管理
  stencil: StencilSystem;      // 模板管理
  renderTarget: RenderTargetSystem;  // 渲染目标管理
}
```

### 3. RenderPipe（渲染管道）

渲染管道处理特定类型对象的渲染：

```typescript
// src/rendering/RenderPipe.ts

/**
 * 渲染管道接口
 * 每种可渲染对象（Sprite、Graphics、Mesh等）有对应的管道
 */
export interface RenderPipe<T = any> {
  /** 管道名称 */
  name: string;
  
  /**
   * 检查是否可以处理此对象
   */
  validateRenderable?(renderable: T): boolean;
  
  /**
   * 添加可渲染对象到批次
   */
  addRenderable(renderable: T): void;
  
  /**
   * 执行渲染
   */
  execute(): void;
  
  /**
   * 重置状态
   */
  reset?(): void;
}
```

### 4. Runner（运行器）

运行器管理生命周期事件：

```typescript
// src/rendering/Runner.ts

/**
 * 运行器 - 发布/订阅模式的简单实现
 * 用于管理渲染生命周期中的各种事件
 */
export class Runner {
  private items: Set<any> = new Set();
  private name: string;
  
  constructor(name: string) {
    this.name = name;
  }
  
  /**
   * 添加监听器
   */
  public add(item: any): this {
    if (item[this.name]) {
      this.items.add(item);
    }
    return this;
  }
  
  /**
   * 移除监听器
   */
  public remove(item: any): this {
    this.items.delete(item);
    return this;
  }
  
  /**
   * 触发事件，调用所有监听器的对应方法
   */
  public emit(...args: any[]): void {
    for (const item of this.items) {
      item[this.name](...args);
    }
  }
}
```

## 渲染流程

### 渲染循环

```typescript
/**
 * 渲染一帧
 */
public render(container: Container): void {
  // 1. 渲染前准备
  this.runners.prerender.emit();
  
  // 2. 更新场景图变换
  container.updateTransform();
  
  // 3. 收集可渲染对象
  const renderables = this.collectRenderables(container);
  
  // 4. 批处理排序
  this.sortRenderables(renderables);
  
  // 5. 执行渲染
  for (const renderable of renderables) {
    const pipe = this.getPipe(renderable);
    pipe.addRenderable(renderable);
  }
  
  // 6. 刷新所有批次
  this.flushPipes();
  
  // 7. 渲染后清理
  this.runners.postrender.emit();
}
```

### 收集可渲染对象

```typescript
/**
 * 深度优先遍历场景图，收集所有可渲染对象
 */
private collectRenderables(container: Container): Renderable[] {
  const result: Renderable[] = [];
  
  const collect = (node: Container) => {
    // 不可见则跳过
    if (!node.visible || node.worldAlpha <= 0) return;
    
    // 如果是可渲染对象
    if (node.renderable) {
      result.push(node as Renderable);
    }
    
    // 递归处理子对象
    for (const child of node.children) {
      collect(child);
    }
  };
  
  collect(container);
  return result;
}
```

## WebGL 渲染器

```typescript
// src/rendering/WebGLRenderer.ts

export class WebGLRenderer extends Renderer {
  public gl: WebGL2RenderingContext;
  
  // WebGL 特有系统
  public texture: WebGLTextureSystem;
  public shader: WebGLShaderSystem;
  public geometry: WebGLGeometrySystem;
  public state: WebGLStateSystem;
  public buffer: WebGLBufferSystem;
  
  constructor(options: RendererOptions) {
    super(options);
    
    // 创建 WebGL 上下文
    this.view = document.createElement('canvas');
    this.gl = this.view.getContext('webgl2', {
      alpha: true,
      antialias: options.antialias,
      premultipliedAlpha: true,
      preserveDrawingBuffer: false,
      powerPreference: options.powerPreference,
    })!;
    
    // 初始化系统
    this.initSystems();
  }
  
  private initSystems(): void {
    this.texture = new WebGLTextureSystem(this);
    this.shader = new WebGLShaderSystem(this);
    this.geometry = new WebGLGeometrySystem(this);
    this.state = new WebGLStateSystem(this);
    this.buffer = new WebGLBufferSystem(this);
    
    // 注册到运行器
    this.runners.init.add(this.texture);
    this.runners.init.add(this.shader);
    // ...
  }
  
  public render(container: Container): void {
    const { gl } = this;
    
    // 清除画布
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    // 设置视口
    gl.viewport(0, 0, this.width * this.resolution, this.height * this.resolution);
    
    // 调用基类渲染逻辑
    super.render(container);
  }
}
```

## WebGPU 渲染器

```typescript
// src/rendering/WebGPURenderer.ts

export class WebGPURenderer extends Renderer {
  public device: GPUDevice;
  public context: GPUCanvasContext;
  
  // WebGPU 特有系统
  public texture: WebGPUTextureSystem;
  public shader: WebGPUShaderSystem;
  public pipeline: WebGPUPipelineSystem;
  
  constructor(options: RendererOptions) {
    super(options);
  }
  
  /**
   * WebGPU 需要异步初始化
   */
  public async init(): Promise<void> {
    // 请求 GPU 适配器
    const adapter = await navigator.gpu.requestAdapter({
      powerPreference: 'high-performance',
    });
    
    // 获取 GPU 设备
    this.device = await adapter!.requestDevice();
    
    // 配置 Canvas 上下文
    this.view = document.createElement('canvas');
    this.context = this.view.getContext('webgpu')!;
    this.context.configure({
      device: this.device,
      format: navigator.gpu.getPreferredCanvasFormat(),
      alphaMode: 'premultiplied',
    });
    
    // 初始化系统
    this.initSystems();
  }
  
  public render(container: Container): void {
    // 获取当前纹理视图
    const textureView = this.context.getCurrentTexture().createView();
    
    // 创建命令编码器
    const commandEncoder = this.device.createCommandEncoder();
    
    // 创建渲染通道
    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [{
        view: textureView,
        clearValue: { r: 0, g: 0, b: 0, a: 1 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
    });
    
    // 渲染场景
    // ...
    
    renderPass.end();
    
    // 提交命令
    this.device.queue.submit([commandEncoder.finish()]);
  }
}
```

## 自动检测

```typescript
// src/rendering/autoDetect.ts

/**
 * 自动检测最佳渲染器
 */
export async function autoDetectRenderer(
  options: RendererOptions
): Promise<Renderer> {
  // 优先尝试 WebGPU
  if (isWebGPUSupported()) {
    const renderer = new WebGPURenderer(options);
    await renderer.init();
    return renderer;
  }
  
  // 回退到 WebGL2
  if (isWebGL2Supported()) {
    return new WebGLRenderer(options);
  }
  
  throw new Error('Neither WebGPU nor WebGL2 is supported');
}

function isWebGPUSupported(): boolean {
  return 'gpu' in navigator;
}

function isWebGL2Supported(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!canvas.getContext('webgl2');
  } catch {
    return false;
  }
}
```

## 小结

PixiJS 渲染器架构的核心设计原则：

1. **抽象层分离**：通过 System 和 Pipe 抽象，隔离底层 API 差异
2. **生命周期管理**：Runner 统一管理初始化、渲染、销毁等生命周期
3. **可扩展性**：新增渲染类型只需添加对应的 Pipe
4. **后端无关**：上层代码无需关心是 WebGL 还是 WebGPU

这种架构使得 PixiJS 能够轻松支持多种渲染后端，同时保持 API 的一致性。
