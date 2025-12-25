# Texture 纹理基类

> "纹理是 3D 图形的皮肤，赋予模型丰富的视觉细节。"

## 纹理系统概述

```
Three.js 纹理类型：

Texture                    基础纹理
├── CanvasTexture         Canvas 纹理
├── VideoTexture          视频纹理
├── DataTexture           数据纹理
├── Data3DTexture         3D 数据纹理
├── DataArrayTexture      数组纹理
├── CompressedTexture     压缩纹理
├── CubeTexture           立方体纹理
├── DepthTexture          深度纹理
└── FramebufferTexture    帧缓冲纹理
```

## Texture 基类实现

```typescript
// src/textures/Texture.ts
import { EventDispatcher } from '../core/EventDispatcher';
import { Matrix3 } from '../math/Matrix3';
import { Vector2 } from '../math/Vector2';
import { Source } from './Source';
import * as MathUtils from '../math/MathUtils';

// 纹理常量
export const UVMapping = 300;
export const CubeReflectionMapping = 301;
export const CubeRefractionMapping = 302;
export const EquirectangularReflectionMapping = 303;
export const EquirectangularRefractionMapping = 304;
export const CubeUVReflectionMapping = 305;

export const RepeatWrapping = 1000;
export const ClampToEdgeWrapping = 1001;
export const MirroredRepeatWrapping = 1002;

export const NearestFilter = 1003;
export const NearestMipmapNearestFilter = 1004;
export const NearestMipmapLinearFilter = 1005;
export const LinearFilter = 1006;
export const LinearMipmapNearestFilter = 1007;
export const LinearMipmapLinearFilter = 1008;

export class Texture extends EventDispatcher {
  readonly isTexture = true;
  
  uuid = MathUtils.generateUUID();
  name = '';
  
  // 纹理数据源
  source: Source;
  
  // 便捷访问器
  get image(): any {
    return this.source.data;
  }
  set image(value: any) {
    this.source.data = value;
  }
  
  // Mipmap 数据
  mipmaps: any[] = [];
  
  // 映射模式
  mapping: number = UVMapping;
  
  // 通道（R, G, B, A 或组合）
  channel = 0;
  
  // 环绕模式
  wrapS: number = ClampToEdgeWrapping;
  wrapT: number = ClampToEdgeWrapping;
  
  // 过滤模式
  magFilter: number = LinearFilter;
  minFilter: number = LinearMipmapLinearFilter;
  
  // 各向异性过滤
  anisotropy = 1;
  
  // 像素格式
  format: number = RGBAFormat;
  internalFormat: string | null = null;
  type: number = UnsignedByteType;
  
  // UV 变换
  offset = new Vector2(0, 0);
  repeat = new Vector2(1, 1);
  center = new Vector2(0, 0);
  rotation = 0;
  
  // UV 变换矩阵
  matrix = new Matrix3();
  matrixAutoUpdate = true;
  
  // 生成 Mipmap
  generateMipmaps = true;
  premultiplyAlpha = false;
  flipY = true;
  unpackAlignment = 4;
  
  // 颜色空间
  colorSpace: string = NoColorSpace;
  
  // 用户数据
  userData: Record<string, any> = {};
  
  // 版本（用于更新追踪）
  version = 0;
  
  onUpdate: (() => void) | null = null;
  
  constructor(
    image?: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement | ImageBitmap,
    mapping?: number,
    wrapS?: number,
    wrapT?: number,
    magFilter?: number,
    minFilter?: number,
    format?: number,
    type?: number,
    anisotropy?: number,
    colorSpace?: string
  ) {
    super();
    
    this.source = new Source(image);
    
    this.mapping = mapping ?? UVMapping;
    
    this.wrapS = wrapS ?? ClampToEdgeWrapping;
    this.wrapT = wrapT ?? ClampToEdgeWrapping;
    
    this.magFilter = magFilter ?? LinearFilter;
    this.minFilter = minFilter ?? LinearMipmapLinearFilter;
    
    this.anisotropy = anisotropy ?? 1;
    
    this.format = format ?? RGBAFormat;
    this.type = type ?? UnsignedByteType;
    
    this.colorSpace = colorSpace ?? NoColorSpace;
  }
  
  // 更新 UV 变换矩阵
  updateMatrix(): void {
    this.matrix.setUvTransform(
      this.offset.x,
      this.offset.y,
      this.repeat.x,
      this.repeat.y,
      this.rotation,
      this.center.x,
      this.center.y
    );
  }
  
  // 克隆
  clone(): Texture {
    return new Texture().copy(this);
  }
  
  // 复制
  copy(source: Texture): this {
    this.name = source.name;
    
    this.source = source.source;
    this.mipmaps = source.mipmaps.slice(0);
    
    this.mapping = source.mapping;
    this.channel = source.channel;
    
    this.wrapS = source.wrapS;
    this.wrapT = source.wrapT;
    
    this.magFilter = source.magFilter;
    this.minFilter = source.minFilter;
    
    this.anisotropy = source.anisotropy;
    
    this.format = source.format;
    this.internalFormat = source.internalFormat;
    this.type = source.type;
    
    this.offset.copy(source.offset);
    this.repeat.copy(source.repeat);
    this.center.copy(source.center);
    this.rotation = source.rotation;
    
    this.matrixAutoUpdate = source.matrixAutoUpdate;
    this.matrix.copy(source.matrix);
    
    this.generateMipmaps = source.generateMipmaps;
    this.premultiplyAlpha = source.premultiplyAlpha;
    this.flipY = source.flipY;
    this.unpackAlignment = source.unpackAlignment;
    this.colorSpace = source.colorSpace;
    
    this.userData = JSON.parse(JSON.stringify(source.userData));
    
    this.needsUpdate = true;
    
    return this;
  }
  
  // 标记需要更新
  get needsUpdate(): boolean {
    return false;
  }
  set needsUpdate(value: boolean) {
    if (value) {
      this.version++;
      this.source.needsUpdate = true;
    }
  }
  
  toJSON(meta?: any): any {
    const isRootObject = meta === undefined || typeof meta === 'string';
    
    if (!isRootObject && meta.textures[this.uuid] !== undefined) {
      return meta.textures[this.uuid];
    }
    
    const output: any = {
      metadata: {
        version: 4.5,
        type: 'Texture',
        generator: 'Texture.toJSON',
      },
      
      uuid: this.uuid,
      name: this.name,
      
      image: this.source.toJSON(meta).uuid,
      
      mapping: this.mapping,
      channel: this.channel,
      
      repeat: [this.repeat.x, this.repeat.y],
      offset: [this.offset.x, this.offset.y],
      center: [this.center.x, this.center.y],
      rotation: this.rotation,
      
      wrap: [this.wrapS, this.wrapT],
      
      format: this.format,
      internalFormat: this.internalFormat,
      type: this.type,
      colorSpace: this.colorSpace,
      
      minFilter: this.minFilter,
      magFilter: this.magFilter,
      anisotropy: this.anisotropy,
      
      flipY: this.flipY,
      
      generateMipmaps: this.generateMipmaps,
      premultiplyAlpha: this.premultiplyAlpha,
      unpackAlignment: this.unpackAlignment,
    };
    
    if (Object.keys(this.userData).length > 0) {
      output.userData = this.userData;
    }
    
    if (!isRootObject) {
      meta.textures[this.uuid] = output;
    }
    
    return output;
  }
  
  dispose(): void {
    this.dispatchEvent({ type: 'dispose' });
  }
  
  // 变换 UV 坐标
  transformUv(uv: Vector2): Vector2 {
    if (this.mapping !== UVMapping) return uv;
    
    uv.applyMatrix3(this.matrix);
    
    // 应用环绕模式
    if (uv.x < 0 || uv.x > 1) {
      switch (this.wrapS) {
        case RepeatWrapping:
          uv.x = uv.x - Math.floor(uv.x);
          break;
        case ClampToEdgeWrapping:
          uv.x = uv.x < 0 ? 0 : 1;
          break;
        case MirroredRepeatWrapping:
          if (Math.abs(Math.floor(uv.x) % 2) === 1) {
            uv.x = Math.ceil(uv.x) - uv.x;
          } else {
            uv.x = uv.x - Math.floor(uv.x);
          }
          break;
      }
    }
    
    if (uv.y < 0 || uv.y > 1) {
      switch (this.wrapT) {
        case RepeatWrapping:
          uv.y = uv.y - Math.floor(uv.y);
          break;
        case ClampToEdgeWrapping:
          uv.y = uv.y < 0 ? 0 : 1;
          break;
        case MirroredRepeatWrapping:
          if (Math.abs(Math.floor(uv.y) % 2) === 1) {
            uv.y = Math.ceil(uv.y) - uv.y;
          } else {
            uv.y = uv.y - Math.floor(uv.y);
          }
          break;
      }
    }
    
    if (this.flipY) {
      uv.y = 1 - uv.y;
    }
    
    return uv;
  }
}

// 像素格式常量
export const RGBAFormat = 1023;
export const RGBFormat = 1022;
export const RedFormat = 1028;
export const RGFormat = 1030;
export const DepthFormat = 1026;
export const DepthStencilFormat = 1027;

// 数据类型常量
export const UnsignedByteType = 1009;
export const FloatType = 1015;
export const HalfFloatType = 1016;
export const UnsignedIntType = 1014;
export const UnsignedShort4444Type = 1017;
export const UnsignedShort5551Type = 1018;

// 颜色空间
export const NoColorSpace = '';
export const SRGBColorSpace = 'srgb';
export const LinearSRGBColorSpace = 'srgb-linear';
```

## 纹理参数详解

```
环绕模式（Wrapping）：

RepeatWrapping:              ClampToEdgeWrapping:
┌───┬───┬───┐               ┌───────────────┐
│ A │ A │ A │               │■■■■■■■■■■■■■■■│
├───┼───┼───┤               │■             ■│
│ A │ A │ A │               │■     A       ■│
├───┼───┼───┤               │■             ■│
│ A │ A │ A │               │■■■■■■■■■■■■■■■│
└───┴───┴───┘               └───────────────┘
UV 超出范围时重复           UV 超出范围时钳制到边缘

MirroredRepeatWrapping:
┌───┬───┬───┐
│ A │ A │ A │
│   │ ↔ │   │ ← 镜像翻转
├───┼───┼───┤
│ A │ A │ A │
│ ↕ │   │ ↕ │
└───┴───┴───┘
```

## 过滤模式

```
采样过滤：

放大（Magnification）- 纹理比屏幕小：
┌─┬─┬─┐     ┌───────────┐
│A│B│ │     │  A  │  B  │
├─┼─┼─┤ →  ├─────┼─────┤
│C│D│ │     │  C  │  D  │
└─┴─┴─┘     └───────────┘

NearestFilter:  最近邻（像素化效果）
LinearFilter:   双线性插值（平滑）

缩小（Minification）- 纹理比屏幕大：
需要 Mipmap 避免走样（摩尔纹）

Mipmap 层级：
Level 0: 1024×1024
Level 1: 512×512
Level 2: 256×256
Level 3: 128×128
...

NearestMipmapNearest: 最近 mip，最近采样
NearestMipmapLinear:  线性 mip，最近采样
LinearMipmapNearest:  最近 mip，线性采样
LinearMipmapLinear:   线性 mip，线性采样（最佳质量）
```

## Source 纹理数据源

```typescript
// src/textures/Source.ts
import * as MathUtils from '../math/MathUtils';

export class Source {
  readonly isSource = true;
  
  uuid = MathUtils.generateUUID();
  data: any;
  
  // 版本（用于追踪更新）
  version = 0;
  
  constructor(data: any = null) {
    this.data = data;
  }
  
  set needsUpdate(value: boolean) {
    if (value) {
      this.version++;
    }
  }
  
  toJSON(meta?: any): any {
    const isRootObject = meta === undefined || typeof meta === 'string';
    
    if (!isRootObject && meta.images[this.uuid] !== undefined) {
      return meta.images[this.uuid];
    }
    
    const output: any = {
      uuid: this.uuid,
      url: '',
    };
    
    const data = this.data;
    
    if (data !== null) {
      let url: string;
      
      if (Array.isArray(data)) {
        // 立方体贴图
        url = [];
        for (let i = 0, l = data.length; i < l; i++) {
          url.push(getDataURL(data[i]));
        }
      } else {
        url = getDataURL(data);
      }
      
      output.url = url;
    }
    
    if (!isRootObject) {
      meta.images[this.uuid] = output;
    }
    
    return output;
  }
}

// 将图像数据转为 Data URL
function getDataURL(image: any): string {
  if (typeof HTMLCanvasElement !== 'undefined' && image instanceof HTMLCanvasElement) {
    return image.toDataURL('image/png');
  }
  
  if (typeof HTMLImageElement !== 'undefined' && image instanceof HTMLImageElement) {
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    
    const context = canvas.getContext('2d')!;
    context.drawImage(image, 0, 0);
    
    return canvas.toDataURL('image/png');
  }
  
  return '';
}
```

## 使用示例

### 基础纹理

```typescript
import { TextureLoader, RepeatWrapping } from 'three';

const loader = new TextureLoader();

const texture = loader.load('textures/wood.jpg', (texture) => {
  console.log('Texture loaded');
});

// 设置环绕
texture.wrapS = RepeatWrapping;
texture.wrapT = RepeatWrapping;
texture.repeat.set(4, 4);

// 设置过滤
texture.magFilter = LinearFilter;
texture.minFilter = LinearMipmapLinearFilter;

// 各向异性过滤（提高斜视角质量）
texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

// 颜色空间
texture.colorSpace = SRGBColorSpace;

const material = new MeshStandardMaterial({
  map: texture,
});
```

### UV 变换

```typescript
// 平铺
texture.repeat.set(4, 4);

// 偏移
texture.offset.set(0.5, 0.5);

// 旋转（围绕 center）
texture.center.set(0.5, 0.5);
texture.rotation = Math.PI / 4;

// 动画 UV
function animate() {
  texture.offset.x += 0.01;
  if (texture.offset.x > 1) texture.offset.x = 0;
  
  requestAnimationFrame(animate);
}
```

## 本章小结

- Texture 是所有纹理的基类
- Source 管理实际纹理数据
- 环绕模式控制 UV 超出范围的行为
- 过滤模式影响采样质量
- Mipmap 防止缩小时的走样

下一章，我们将学习各种纹理类型。
