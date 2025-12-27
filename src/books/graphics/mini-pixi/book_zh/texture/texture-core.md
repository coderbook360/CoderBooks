# Texture 核心设计

纹理（Texture）是 2D 渲染的核心概念。在 PixiJS 中，纹理系统经过精心设计，支持多种纹理源、自动 GPU 上传、纹理区域裁剪等功能。本章深入解析纹理系统的架构设计。

## 为什么需要抽象纹理？

直接使用 WebGL 纹理的问题：

1. **复杂的生命周期**：需要手动创建、上传、销毁 GPU 纹理
2. **多种数据源**：图片、Canvas、视频、动态生成的数据
3. **纹理区域**：精灵表（Sprite Sheet）需要从一张大图中提取区域
4. **资源共享**：多个 Sprite 共享同一纹理的不同区域

**解决方案**：分层抽象纹理系统。

## 纹理架构

PixiJS v8 将纹理分为三层：

```
┌─────────────────────────────────────────────┐
│                 Texture                      │
│         (纹理区域 + UV 映射)                  │
├─────────────────────────────────────────────┤
│              TextureSource                   │
│        (纹理数据源 + GPU 资源)                │
├─────────────────────────────────────────────┤
│             GPU Texture                      │
│     (WebGLTexture / GPUTexture)             │
└─────────────────────────────────────────────┘
```

## TextureSource（纹理源）

TextureSource 管理实际的纹理数据和 GPU 资源：

```typescript
// src/rendering/texture/TextureSource.ts

export type TextureSourceResource = 
  | HTMLImageElement 
  | HTMLCanvasElement 
  | HTMLVideoElement
  | ImageBitmap
  | Uint8Array
  | Float32Array;

export interface TextureSourceOptions {
  resource?: TextureSourceResource;
  width?: number;
  height?: number;
  resolution?: number;
  format?: 'rgba8unorm' | 'bgra8unorm' | 'rgba16float';
  alphaMode?: 'premultiply-alpha-on-upload' | 'premultiplied-alpha' | 'no-premultiply-alpha';
  antialias?: boolean;
  mipmap?: boolean;
}

export class TextureSource {
  // 唯一标识
  public readonly uid: number;
  
  // 数据源
  public resource: TextureSourceResource | null = null;
  
  // 尺寸（像素）
  private _width: number = 1;
  private _height: number = 1;
  
  // 分辨率（用于 Retina 显示）
  public resolution: number = 1;
  
  // 纹理格式
  public format: string = 'rgba8unorm';
  
  // Alpha 预乘模式
  public alphaMode: string = 'premultiply-alpha-on-upload';
  
  // GPU 纹理资源（由渲染器管理）
  public gpuTexture: WebGLTexture | GPUTexture | null = null;
  
  // 是否需要更新到 GPU
  private _dirty: boolean = true;
  
  // 更新版本号
  private _updateId: number = 0;
  
  constructor(options: TextureSourceOptions = {}) {
    this.uid = uid++;
    
    if (options.resource) {
      this.resource = options.resource;
      this.updateFromResource();
    } else {
      this._width = options.width ?? 1;
      this._height = options.height ?? 1;
    }
    
    this.resolution = options.resolution ?? 1;
    this.format = options.format ?? 'rgba8unorm';
    this.alphaMode = options.alphaMode ?? 'premultiply-alpha-on-upload';
  }
  
  /**
   * 纹理宽度（考虑分辨率）
   */
  get width(): number {
    return this._width;
  }
  
  /**
   * 纹理高度（考虑分辨率）
   */
  get height(): number {
    return this._height;
  }
  
  /**
   * 像素宽度
   */
  get pixelWidth(): number {
    return this._width * this.resolution;
  }
  
  /**
   * 像素高度
   */
  get pixelHeight(): number {
    return this._height * this.resolution;
  }
  
  /**
   * 从资源更新尺寸
   */
  private updateFromResource(): void {
    const resource = this.resource;
    
    if (!resource) return;
    
    if (resource instanceof HTMLImageElement) {
      this._width = resource.naturalWidth;
      this._height = resource.naturalHeight;
    } else if (resource instanceof HTMLVideoElement) {
      this._width = resource.videoWidth;
      this._height = resource.videoHeight;
    } else if ('width' in resource) {
      this._width = resource.width;
      this._height = resource.height;
    }
    
    this._dirty = true;
    this._updateId++;
  }
  
  /**
   * 标记纹理需要更新
   */
  public update(): void {
    this._dirty = true;
    this._updateId++;
  }
  
  /**
   * 销毁纹理源
   */
  public destroy(): void {
    this.resource = null;
    // GPU 资源由渲染器的纹理系统管理
    this.gpuTexture = null;
  }
}
```

## Texture（纹理）

Texture 表示 TextureSource 的一个区域：

```typescript
// src/rendering/texture/Texture.ts

export interface TextureOptions {
  source: TextureSource;
  frame?: Rectangle;   // 在源纹理中的区域
  orig?: Rectangle;    // 原始尺寸（用于被裁剪的纹理）
  trim?: Rectangle;    // 裁剪信息
  rotate?: number;     // 旋转（用于纹理打包器）
}

export class Texture {
  // 唯一标识
  public readonly uid: number;
  
  // 纹理源
  public source: TextureSource;
  
  // 在源纹理中的区域
  public frame: Rectangle;
  
  // 原始尺寸
  public orig: Rectangle;
  
  // 裁剪信息（透明边缘裁剪）
  public trim: Rectangle | null = null;
  
  // 旋转（0-7，对应 0°、90°、180°、270° 及其镜像）
  public rotate: number = 0;
  
  // UV 映射坐标（缓存）
  private _uvs: TextureUvs;
  private _uvsDirty: boolean = true;
  
  constructor(options: TextureOptions) {
    this.uid = uid++;
    this.source = options.source;
    
    // 默认使用整个纹理
    this.frame = options.frame ?? new Rectangle(
      0, 0,
      this.source.width,
      this.source.height
    );
    
    this.orig = options.orig ?? this.frame.clone();
    this.trim = options.trim ?? null;
    this.rotate = options.rotate ?? 0;
    
    this._uvs = new TextureUvs();
    this.updateUvs();
  }
  
  /**
   * 纹理宽度
   */
  get width(): number {
    return this.orig.width;
  }
  
  /**
   * 纹理高度
   */
  get height(): number {
    return this.orig.height;
  }
  
  /**
   * 更新 UV 坐标
   * UV 坐标将 frame 区域映射到 [0, 1] 范围
   */
  public updateUvs(): void {
    const { frame, source } = this;
    const tw = source.width;
    const th = source.height;
    
    // 计算归一化的 UV 坐标
    this._uvs.x0 = frame.x / tw;
    this._uvs.y0 = frame.y / th;
    this._uvs.x1 = (frame.x + frame.width) / tw;
    this._uvs.y1 = frame.y / th;
    this._uvs.x2 = (frame.x + frame.width) / tw;
    this._uvs.y2 = (frame.y + frame.height) / th;
    this._uvs.x3 = frame.x / tw;
    this._uvs.y3 = (frame.y + frame.height) / th;
    
    // 处理旋转
    if (this.rotate) {
      this._uvs.rotate(this.rotate);
    }
    
    this._uvsDirty = false;
  }
  
  /**
   * 获取 UV 坐标
   */
  get uvs(): TextureUvs {
    if (this._uvsDirty) {
      this.updateUvs();
    }
    return this._uvs;
  }
  
  /**
   * 销毁纹理
   * 注意：不会销毁 TextureSource，因为可能被其他 Texture 共享
   */
  public destroy(destroySource = false): void {
    if (destroySource) {
      this.source.destroy();
    }
    this.source = null!;
  }
  
  // 静态工厂方法
  
  /**
   * 创建空白纹理
   */
  public static EMPTY: Texture;
  
  /**
   * 创建白色 1x1 纹理
   */
  public static WHITE: Texture;
  
  /**
   * 从 URL 加载纹理
   */
  public static async from(url: string): Promise<Texture> {
    // 加载图片
    const image = new Image();
    image.src = url;
    await image.decode();
    
    // 创建纹理源
    const source = new TextureSource({ resource: image });
    
    // 创建纹理
    return new Texture({ source });
  }
}

/**
 * UV 坐标数据
 */
class TextureUvs {
  // 四个顶点的 UV 坐标
  public x0 = 0;
  public y0 = 0;
  public x1 = 1;
  public y1 = 0;
  public x2 = 1;
  public y2 = 1;
  public x3 = 0;
  public y3 = 1;
  
  /**
   * 旋转 UV 坐标
   */
  public rotate(rotation: number): void {
    // 根据旋转值交换 UV 坐标
    // rotation 使用 GroupD8 编码
    // ...
  }
}
```

## TextureStyle（纹理采样样式）

```typescript
// src/rendering/texture/TextureStyle.ts

export type WRAP_MODE = 'clamp-to-edge' | 'repeat' | 'mirrored-repeat';
export type SCALE_MODE = 'nearest' | 'linear';

export interface TextureStyleOptions {
  addressModeU?: WRAP_MODE;
  addressModeV?: WRAP_MODE;
  magFilter?: SCALE_MODE;
  minFilter?: SCALE_MODE;
  mipmapFilter?: SCALE_MODE;
  maxAnisotropy?: number;
}

export class TextureStyle {
  // 水平环绕模式
  public addressModeU: WRAP_MODE = 'clamp-to-edge';
  
  // 垂直环绕模式
  public addressModeV: WRAP_MODE = 'clamp-to-edge';
  
  // 放大滤波器
  public magFilter: SCALE_MODE = 'linear';
  
  // 缩小滤波器
  public minFilter: SCALE_MODE = 'linear';
  
  // Mipmap 滤波器
  public mipmapFilter: SCALE_MODE = 'linear';
  
  // 各向异性过滤级别
  public maxAnisotropy: number = 1;
  
  constructor(options: TextureStyleOptions = {}) {
    Object.assign(this, options);
  }
}
```

## 精灵表支持

精灵表（Sprite Sheet）是游戏开发的常用技术：

```typescript
/**
 * 从精灵表创建多个纹理
 * 
 * @param atlasData 精灵表数据（JSON）
 * @param source 纹理源
 */
export function parseAtlas(
  atlasData: AtlasData,
  source: TextureSource
): Map<string, Texture> {
  const textures = new Map<string, Texture>();
  
  for (const [name, frameData] of Object.entries(atlasData.frames)) {
    const frame = new Rectangle(
      frameData.frame.x,
      frameData.frame.y,
      frameData.frame.w,
      frameData.frame.h
    );
    
    const orig = new Rectangle(
      0, 0,
      frameData.sourceSize.w,
      frameData.sourceSize.h
    );
    
    const trim = frameData.trimmed ? new Rectangle(
      frameData.spriteSourceSize.x,
      frameData.spriteSourceSize.y,
      frameData.spriteSourceSize.w,
      frameData.spriteSourceSize.h
    ) : null;
    
    const texture = new Texture({
      source,
      frame,
      orig,
      trim,
      rotate: frameData.rotated ? 2 : 0,
    });
    
    textures.set(name, texture);
  }
  
  return textures;
}
```

## 使用示例

```typescript
// 从图片创建纹理
const texture = await Texture.from('character.png');

// 创建精灵
const sprite = new Sprite(texture);

// 使用精灵表
const atlas = await Assets.load('sprites.json');
const walkFrame1 = atlas.textures['walk_01.png'];
const walkFrame2 = atlas.textures['walk_02.png'];

// 创建动态纹理
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d')!;
canvas.width = 256;
canvas.height = 256;
ctx.fillStyle = 'red';
ctx.fillRect(0, 0, 256, 256);

const canvasTexture = new Texture({
  source: new TextureSource({ resource: canvas })
});

// 更新动态纹理
ctx.fillStyle = 'blue';
ctx.fillRect(50, 50, 100, 100);
canvasTexture.source.update(); // 标记需要重新上传到 GPU
```

## 小结

PixiJS 纹理系统的核心设计：

1. **TextureSource**：管理实际数据和 GPU 资源
2. **Texture**：表示纹理的一个区域，支持精灵表
3. **TextureStyle**：控制采样行为（滤波、环绕）
4. **UV 坐标**：自动计算并缓存

这种分层设计使得：
- 多个 Texture 可以共享同一个 TextureSource
- GPU 资源自动管理，无需手动上传/销毁
- 支持多种数据源（图片、Canvas、视频）
- 精灵表支持开箱即用
