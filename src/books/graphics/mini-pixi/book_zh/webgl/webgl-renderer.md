# WebGLRenderer 核心实现

WebGLRenderer 是 PixiJS 中 WebGL 渲染后端的核心。它管理 WebGL 上下文、各种渲染系统，并协调整个渲染流程。

## 为什么 WebGL 渲染器如此复杂？

WebGL 是一个低层 API，需要手动管理很多事情：

1. **上下文管理**：创建、配置、恢复 WebGL 上下文
2. **资源管理**：纹理、缓冲区、着色器的创建和销毁
3. **状态管理**：混合模式、裁剪、深度测试等
4. **批处理**：合并绘制调用以提升性能

WebGLRenderer 将这些复杂性封装起来，提供简洁的渲染 API。

## 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        WebGLRenderer                             │
├─────────────────────────────────────────────────────────────────┤
│  Canvas / Context                                                │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  HTMLCanvasElement        WebGL2RenderingContext          │  │
│  └───────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  Core Systems (核心系统)                                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────┐ │
│  │  Texture    │ │   Shader    │ │   State     │ │  Buffer   │ │
│  │  System     │ │   System    │ │   System    │ │  System   │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └───────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  Render Systems (渲染系统)                                       │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────┐ │
│  │   Batch     │ │  Graphics   │ │   Mesh      │ │  Filter   │ │
│  │   System    │ │   System    │ │   System    │ │  System   │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └───────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## WebGLRenderer 实现

```typescript
// src/rendering/WebGLRenderer.ts

export interface WebGLRendererOptions {
  width?: number;
  height?: number;
  backgroundColor?: number;
  backgroundAlpha?: number;
  antialias?: boolean;
  resolution?: number;
  powerPreference?: 'default' | 'high-performance' | 'low-power';
  preserveDrawingBuffer?: boolean;
  premultipliedAlpha?: boolean;
}

export class WebGLRenderer {
  // 画布和上下文
  public readonly view: HTMLCanvasElement;
  public readonly gl: WebGL2RenderingContext;
  
  // 渲染尺寸
  public width: number;
  public height: number;
  public resolution: number;
  
  // 背景色
  public backgroundColor: number;
  public backgroundAlpha: number;
  
  // 核心系统
  public readonly texture: TextureSystem;
  public readonly shader: ShaderSystem;
  public readonly state: StateSystem;
  public readonly buffer: BufferSystem;
  public readonly geometry: GeometrySystem;
  
  // 渲染系统
  public readonly batch: BatchSystem;
  public readonly renderTarget: RenderTargetSystem;
  
  // 上下文属性
  private _contextOptions: WebGLContextAttributes;
  
  // 帧计数
  private _frameCount: number = 0;
  
  constructor(options: WebGLRendererOptions = {}) {
    // 默认值
    this.width = options.width ?? 800;
    this.height = options.height ?? 600;
    this.resolution = options.resolution ?? 1;
    this.backgroundColor = options.backgroundColor ?? 0x000000;
    this.backgroundAlpha = options.backgroundAlpha ?? 1;
    
    // 创建画布
    this.view = document.createElement('canvas');
    this.view.width = this.width * this.resolution;
    this.view.height = this.height * this.resolution;
    
    // 配置上下文选项
    this._contextOptions = {
      alpha: true,
      antialias: options.antialias ?? false,
      depth: false,                    // 2D 渲染不需要深度缓冲
      stencil: true,                   // 遮罩需要模板缓冲
      premultipliedAlpha: options.premultipliedAlpha ?? true,
      preserveDrawingBuffer: options.preserveDrawingBuffer ?? false,
      powerPreference: options.powerPreference ?? 'default',
    };
    
    // 获取 WebGL2 上下文
    this.gl = this.view.getContext('webgl2', this._contextOptions)!;
    
    if (!this.gl) {
      throw new Error('WebGL2 is not supported');
    }
    
    // 初始化系统
    this.initSystems();
    
    // 设置初始状态
    this.initState();
  }
  
  /**
   * 初始化各个系统
   */
  private initSystems(): void {
    const gl = this.gl;
    
    // 核心系统
    this.texture = new TextureSystem(this);
    this.shader = new ShaderSystem(gl);
    this.state = new StateSystem(gl);
    this.buffer = new BufferSystem(gl);
    this.geometry = new GeometrySystem(gl);
    
    // 渲染系统
    this.batch = new BatchSystem(this);
    this.renderTarget = new RenderTargetSystem(this);
  }
  
  /**
   * 设置初始渲染状态
   */
  private initState(): void {
    const gl = this.gl;
    
    // 启用混合
    gl.enable(gl.BLEND);
    
    // 默认混合模式：预乘 alpha
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    
    // 设置视口
    gl.viewport(0, 0, this.view.width, this.view.height);
    
    // 禁用不需要的功能
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
  }
  
  /**
   * 渲染场景
   */
  public render(container: Container): void {
    // 1. 准备渲染
    this.beginFrame();
    
    // 2. 更新场景变换
    container.updateTransform();
    
    // 3. 收集并渲染
    this.renderContainer(container);
    
    // 4. 刷新批处理
    this.batch.flush();
    
    // 5. 结束渲染
    this.endFrame();
  }
  
  /**
   * 开始新帧
   */
  private beginFrame(): void {
    const gl = this.gl;
    
    // 清除画布
    const r = ((this.backgroundColor >> 16) & 0xFF) / 255;
    const g = ((this.backgroundColor >> 8) & 0xFF) / 255;
    const b = (this.backgroundColor & 0xFF) / 255;
    
    gl.clearColor(r, g, b, this.backgroundAlpha);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    // 重置状态
    this.state.reset();
    this.batch.reset();
  }
  
  /**
   * 结束帧
   */
  private endFrame(): void {
    this._frameCount++;
  }
  
  /**
   * 递归渲染容器
   */
  private renderContainer(container: Container): void {
    // 不可见则跳过
    if (!container.visible || container.worldAlpha <= 0) {
      return;
    }
    
    // 渲染自身
    if (container.renderable) {
      this.renderObject(container);
    }
    
    // 渲染子对象
    for (const child of container.children) {
      this.renderContainer(child);
    }
  }
  
  /**
   * 渲染单个对象
   */
  private renderObject(object: Container): void {
    // 根据对象类型分发到不同的渲染器
    if (object instanceof Sprite) {
      this.batch.addSprite(object);
    } else if (object instanceof Graphics) {
      // 刷新批处理，因为 Graphics 可能有不同的状态
      this.batch.flush();
      this.renderGraphics(object);
    }
    // ... 其他类型
  }
  
  /**
   * 调整渲染器尺寸
   */
  public resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    
    this.view.width = width * this.resolution;
    this.view.height = height * this.resolution;
    
    this.gl.viewport(0, 0, this.view.width, this.view.height);
    
    // 更新投影矩阵
    this.updateProjection();
  }
  
  /**
   * 更新投影矩阵
   */
  private updateProjection(): void {
    // 创建正交投影矩阵
    // 将像素坐标映射到 [-1, 1] 的 NDC 空间
    const projection = new Matrix();
    
    // 缩放：将 [0, width] 映射到 [-1, 1]
    projection.a = 2 / this.width;
    projection.d = -2 / this.height;  // Y 轴翻转
    
    // 平移：将中心从 (width/2, height/2) 移到 (0, 0)
    projection.tx = -1;
    projection.ty = 1;
    
    this._projectionMatrix = projection;
  }
  
  /**
   * 销毁渲染器
   */
  public destroy(): void {
    // 销毁所有系统
    this.texture.destroy();
    this.shader.destroy();
    this.state.destroy();
    this.buffer.destroy();
    this.geometry.destroy();
    this.batch.destroy();
    this.renderTarget.destroy();
    
    // 获取扩展来丢失上下文
    const ext = this.gl.getExtension('WEBGL_lose_context');
    ext?.loseContext();
  }
}
```

## 投影矩阵

将像素坐标转换为 WebGL 的 NDC（归一化设备坐标）：

```
像素坐标系：                    NDC 坐标系：
(0,0) ──────► X               (-1,1) ──────► X (+1,1)
  │                               │
  │                               │
  ▼ Y                             ▼ Y
(width, height)               (-1,-1)        (+1,-1)
```

投影矩阵的推导：

$$
\begin{aligned}
x_{ndc} &= \frac{2x_{pixel}}{width} - 1 \\
y_{ndc} &= 1 - \frac{2y_{pixel}}{height}
\end{aligned}
$$

矩阵形式：

$$
\begin{bmatrix} x_{ndc} \\ y_{ndc} \\ 1 \end{bmatrix} = 
\begin{bmatrix} 
\frac{2}{width} & 0 & -1 \\
0 & -\frac{2}{height} & 1 \\
0 & 0 & 1
\end{bmatrix}
\begin{bmatrix} x_{pixel} \\ y_{pixel} \\ 1 \end{bmatrix}
$$

## 上下文丢失处理

WebGL 上下文可能在某些情况下丢失（如 GPU 驱动重置）：

```typescript
// 监听上下文丢失事件
this.view.addEventListener('webglcontextlost', (event) => {
  event.preventDefault();
  console.log('WebGL context lost');
  
  // 标记所有资源为无效
  this.texture.invalidateAll();
  this.shader.invalidateAll();
  // ...
});

// 监听上下文恢复事件
this.view.addEventListener('webglcontextrestored', () => {
  console.log('WebGL context restored');
  
  // 重新初始化
  this.initState();
  
  // 资源会在下次使用时重新创建
});
```

## 使用示例

```typescript
// 创建渲染器
const renderer = new WebGLRenderer({
  width: 800,
  height: 600,
  backgroundColor: 0x1099bb,
  antialias: true,
});

// 添加到页面
document.body.appendChild(renderer.view);

// 创建场景
const stage = new Container();

// 创建精灵
const sprite = new Sprite(texture);
sprite.position.set(400, 300);
stage.addChild(sprite);

// 渲染循环
function animate() {
  requestAnimationFrame(animate);
  
  sprite.rotation += 0.01;
  renderer.render(stage);
}

animate();

// 响应窗口大小变化
window.addEventListener('resize', () => {
  renderer.resize(window.innerWidth, window.innerHeight);
});
```

## 小结

WebGLRenderer 的核心职责：

1. **上下文管理**：创建和配置 WebGL2 上下文
2. **系统协调**：管理纹理、着色器、状态等子系统
3. **渲染流程**：清除、遍历场景、批处理、绘制
4. **投影变换**：像素坐标到 NDC 的转换

理解渲染器架构是深入学习图形编程的基础。
