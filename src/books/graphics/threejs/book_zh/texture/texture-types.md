# 纹理类型

> "不同的纹理类型满足不同的渲染需求——从静态图片到实时视频。"

## CanvasTexture

```typescript
// src/textures/CanvasTexture.ts
import { Texture } from './Texture';

export class CanvasTexture extends Texture {
  readonly isCanvasTexture = true;
  
  constructor(
    canvas: HTMLCanvasElement | OffscreenCanvas,
    mapping?: number,
    wrapS?: number,
    wrapT?: number,
    magFilter?: number,
    minFilter?: number,
    format?: number,
    type?: number,
    anisotropy?: number
  ) {
    super(canvas, mapping, wrapS, wrapT, magFilter, minFilter, format, type, anisotropy);
    
    // Canvas 默认不需要翻转
    this.flipY = false;
    
    this.needsUpdate = true;
  }
}
```

### 使用示例

```typescript
// 创建 Canvas 纹理
const canvas = document.createElement('canvas');
canvas.width = 512;
canvas.height = 512;

const ctx = canvas.getContext('2d')!;

// 绘制渐变背景
const gradient = ctx.createLinearGradient(0, 0, 512, 512);
gradient.addColorStop(0, '#ff0000');
gradient.addColorStop(1, '#0000ff');
ctx.fillStyle = gradient;
ctx.fillRect(0, 0, 512, 512);

// 绘制文字
ctx.fillStyle = 'white';
ctx.font = 'bold 48px Arial';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText('Hello Three.js', 256, 256);

// 创建纹理
const canvasTexture = new CanvasTexture(canvas);
canvasTexture.colorSpace = SRGBColorSpace;

const material = new MeshBasicMaterial({ map: canvasTexture });

// 动态更新
function updateCanvas() {
  ctx.clearRect(0, 0, 512, 512);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);
  
  const time = Date.now() * 0.001;
  ctx.fillStyle = 'white';
  ctx.fillText(`Time: ${time.toFixed(2)}`, 256, 256);
  
  canvasTexture.needsUpdate = true;
}
```

## VideoTexture

```typescript
// src/textures/VideoTexture.ts
import { Texture, LinearFilter, RGBAFormat } from './Texture';

export class VideoTexture extends Texture {
  readonly isVideoTexture = true;
  
  constructor(
    video: HTMLVideoElement,
    mapping?: number,
    wrapS?: number,
    wrapT?: number,
    magFilter?: number,
    minFilter?: number,
    format?: number,
    type?: number,
    anisotropy?: number
  ) {
    super(video, mapping, wrapS, wrapT, magFilter, minFilter, format, type, anisotropy);
    
    // 视频纹理默认设置
    this.minFilter = minFilter ?? LinearFilter;
    this.magFilter = magFilter ?? LinearFilter;
    this.format = format ?? RGBAFormat;
    this.generateMipmaps = false;
    
    // 用于检测视频更新
    (this as any)._currentSrc = video.currentSrc;
  }
  
  clone(): VideoTexture {
    return new VideoTexture(this.image as HTMLVideoElement).copy(this);
  }
  
  // 更新纹理
  update(): void {
    const video = this.image as HTMLVideoElement;
    const hasVideoFrameCallback = 'requestVideoFrameCallback' in video;
    
    if (hasVideoFrameCallback === false && 
        video.readyState >= video.HAVE_CURRENT_DATA) {
      this.needsUpdate = true;
    }
  }
}
```

### 视频纹理使用

```typescript
// 创建视频元素
const video = document.createElement('video');
video.src = 'video.mp4';
video.loop = true;
video.muted = true;
video.playsInline = true;

// 等待视频准备好
video.addEventListener('loadeddata', () => {
  video.play();
});

// 创建纹理
const videoTexture = new VideoTexture(video);
videoTexture.colorSpace = SRGBColorSpace;

const material = new MeshBasicMaterial({ map: videoTexture });

// 渲染循环中更新
function animate() {
  videoTexture.needsUpdate = true;
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
```

## DataTexture

```typescript
// src/textures/DataTexture.ts
import { Texture, NearestFilter, UnsignedByteType, RGBAFormat } from './Texture';

export class DataTexture extends Texture {
  readonly isDataTexture = true;
  
  constructor(
    data?: ArrayBufferView,
    width?: number,
    height?: number,
    format?: number,
    type?: number,
    mapping?: number,
    wrapS?: number,
    wrapT?: number,
    magFilter?: number,
    minFilter?: number,
    anisotropy?: number,
    colorSpace?: string
  ) {
    super(null, mapping, wrapS, wrapT, magFilter, minFilter, format, type, anisotropy, colorSpace);
    
    this.image = { data: data ?? null, width: width ?? 1, height: height ?? 1 };
    
    this.magFilter = magFilter ?? NearestFilter;
    this.minFilter = minFilter ?? NearestFilter;
    
    this.format = format ?? RGBAFormat;
    this.type = type ?? UnsignedByteType;
    
    // 数据纹理不生成 mipmap
    this.generateMipmaps = false;
    this.flipY = false;
    this.unpackAlignment = 1;
    
    this.needsUpdate = true;
  }
}
```

### 数据纹理使用

```typescript
// 创建程序化噪声纹理
function createNoiseTexture(width: number, height: number): DataTexture {
  const size = width * height;
  const data = new Uint8Array(4 * size);
  
  for (let i = 0; i < size; i++) {
    const stride = i * 4;
    const value = Math.random() * 255;
    
    data[stride] = value;      // R
    data[stride + 1] = value;  // G
    data[stride + 2] = value;  // B
    data[stride + 3] = 255;    // A
  }
  
  const texture = new DataTexture(data, width, height);
  texture.needsUpdate = true;
  
  return texture;
}

// Perlin 噪声纹理
function createPerlinNoiseTexture(
  width: number,
  height: number,
  scale: number
): DataTexture {
  const data = new Uint8Array(4 * width * height);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const value = perlinNoise(x / scale, y / scale) * 128 + 128;
      
      data[i] = value;
      data[i + 1] = value;
      data[i + 2] = value;
      data[i + 3] = 255;
    }
  }
  
  return new DataTexture(data, width, height);
}
```

## Data3DTexture

```typescript
// src/textures/Data3DTexture.ts
// 3D 体积纹理（用于体积渲染）
export class Data3DTexture extends Texture {
  readonly isData3DTexture = true;
  
  constructor(
    data?: ArrayBufferView,
    width?: number,
    height?: number,
    depth?: number
  ) {
    super(null);
    
    this.image = { 
      data: data ?? null, 
      width: width ?? 1, 
      height: height ?? 1, 
      depth: depth ?? 1 
    };
    
    this.magFilter = NearestFilter;
    this.minFilter = NearestFilter;
    
    // 3D 纹理有第三个环绕维度
    this.wrapR = ClampToEdgeWrapping;
    
    this.generateMipmaps = false;
    this.flipY = false;
    this.unpackAlignment = 1;
  }
}
```

### 体积纹理使用

```typescript
// 创建 3D 噪声体积
function create3DNoiseTexture(size: number): Data3DTexture {
  const data = new Uint8Array(size * size * size);
  
  for (let z = 0; z < size; z++) {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = x + y * size + z * size * size;
        data[i] = perlinNoise3D(x / 8, y / 8, z / 8) * 128 + 128;
      }
    }
  }
  
  return new Data3DTexture(data, size, size, size);
}

// 着色器中使用
const volumeShader = {
  uniforms: {
    volumeTexture: { value: create3DNoiseTexture(64) },
  },
  fragmentShader: /* glsl */`
    uniform sampler3D volumeTexture;
    
    void main() {
      vec3 uvw = vPosition * 0.5 + 0.5;
      float density = texture(volumeTexture, uvw).r;
      gl_FragColor = vec4(vec3(density), 1.0);
    }
  `,
};
```

## CubeTexture

```typescript
// src/textures/CubeTexture.ts
// 立方体贴图（用于环境映射、天空盒）
import { Texture, CubeReflectionMapping } from './Texture';

export class CubeTexture extends Texture {
  readonly isCubeTexture = true;
  
  // 六个面的图像
  images: any[];
  
  constructor(
    images?: any[],  // [+X, -X, +Y, -Y, +Z, -Z]
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
    super(undefined, mapping, wrapS, wrapT, magFilter, minFilter, format, type, anisotropy, colorSpace);
    
    this.images = images ?? [];
    this.mapping = mapping ?? CubeReflectionMapping;
    this.flipY = false;
  }
  
  get image(): any {
    return this.images;
  }
  set image(value: any) {
    this.images = value;
  }
}
```

### 立方体贴图使用

```typescript
// 加载立方体贴图
const loader = new CubeTextureLoader();

const cubeTexture = loader.load([
  'px.jpg', 'nx.jpg',  // +X, -X
  'py.jpg', 'ny.jpg',  // +Y, -Y
  'pz.jpg', 'nz.jpg',  // +Z, -Z
]);

// 设置为场景背景
scene.background = cubeTexture;

// 设置为环境贴图（反射）
const material = new MeshStandardMaterial({
  envMap: cubeTexture,
  metalness: 1,
  roughness: 0,
});
```

## CompressedTexture

```typescript
// src/textures/CompressedTexture.ts
// 压缩纹理（DDS, KTX, KTX2, Basis）
export class CompressedTexture extends Texture {
  readonly isCompressedTexture = true;
  
  constructor(
    mipmaps: any[],
    width: number,
    height: number,
    format?: number,
    type?: number,
    mapping?: number,
    wrapS?: number,
    wrapT?: number,
    magFilter?: number,
    minFilter?: number,
    anisotropy?: number,
    colorSpace?: string
  ) {
    super(null, mapping, wrapS, wrapT, magFilter, minFilter, format, type, anisotropy, colorSpace);
    
    this.image = { width, height };
    this.mipmaps = mipmaps;
    
    // 压缩纹理 mipmap 已预生成
    this.flipY = false;
    this.generateMipmaps = false;
  }
}
```

### 压缩纹理格式

```
常见压缩纹理格式：

格式        | 压缩比 | 支持平台      | 特点
-----------|--------|--------------|------------------
DXT/S3TC   | 4:1    | PC           | 广泛支持
PVRTC      | 4:1    | iOS          | Apple 设备
ETC1       | 4:1    | Android      | 不支持 Alpha
ETC2       | 4:1    | WebGL 2      | 支持 Alpha
ASTC       | 可变   | 现代移动设备   | 灵活的块大小
Basis      | 可变   | 跨平台        | 运行时转码
```

## DepthTexture

```typescript
// src/textures/DepthTexture.ts
// 深度纹理（用于阴影、后处理）
export class DepthTexture extends Texture {
  readonly isDepthTexture = true;
  
  constructor(
    width: number,
    height: number,
    type?: number,
    mapping?: number,
    wrapS?: number,
    wrapT?: number,
    magFilter?: number,
    minFilter?: number,
    anisotropy?: number,
    format?: number
  ) {
    super(null, mapping, wrapS, wrapT, magFilter, minFilter, format, type, anisotropy);
    
    this.image = { width, height };
    
    this.format = format ?? DepthFormat;
    this.type = type ?? UnsignedIntType;
    
    this.magFilter = magFilter ?? NearestFilter;
    this.minFilter = minFilter ?? NearestFilter;
    
    this.flipY = false;
    this.generateMipmaps = false;
    
    this.compareFunction = null;  // 用于 PCF 阴影
  }
}
```

### 深度纹理使用

```typescript
// 创建带深度纹理的渲染目标
const depthTexture = new DepthTexture(
  window.innerWidth,
  window.innerHeight,
  UnsignedIntType
);

const renderTarget = new WebGLRenderTarget(
  window.innerWidth,
  window.innerHeight,
  {
    depthTexture: depthTexture,
    depthBuffer: true,
  }
);

// 渲染到目标
renderer.setRenderTarget(renderTarget);
renderer.render(scene, camera);
renderer.setRenderTarget(null);

// 使用深度纹理
const depthMaterial = new ShaderMaterial({
  uniforms: {
    depthMap: { value: depthTexture },
    cameraNear: { value: camera.near },
    cameraFar: { value: camera.far },
  },
  fragmentShader: /* glsl */`
    uniform sampler2D depthMap;
    uniform float cameraNear;
    uniform float cameraFar;
    
    float linearizeDepth(float depth) {
      float z = depth * 2.0 - 1.0;
      return (2.0 * cameraNear * cameraFar) / (cameraFar + cameraNear - z * (cameraFar - cameraNear));
    }
    
    void main() {
      float depth = texture2D(depthMap, vUv).r;
      float linear = linearizeDepth(depth) / cameraFar;
      gl_FragColor = vec4(vec3(linear), 1.0);
    }
  `,
});
```

## FramebufferTexture

```typescript
// src/textures/FramebufferTexture.ts
// 帧缓冲纹理（直接从帧缓冲读取）
export class FramebufferTexture extends Texture {
  readonly isFramebufferTexture = true;
  
  constructor(
    width: number,
    height: number,
    format?: number
  ) {
    super({ width, height });
    
    this.format = format ?? RGBAFormat;
    this.magFilter = NearestFilter;
    this.minFilter = NearestFilter;
    this.generateMipmaps = false;
    
    this.needsUpdate = true;
  }
}
```

## 使用总结

| 纹理类型 | 用途 | 数据源 |
|---------|------|--------|
| Texture | 通用纹理 | Image, ImageBitmap |
| CanvasTexture | 动态 2D 绘制 | HTMLCanvasElement |
| VideoTexture | 视频播放 | HTMLVideoElement |
| DataTexture | 程序化生成 | TypedArray |
| Data3DTexture | 体积渲染 | TypedArray |
| CubeTexture | 环境映射 | 6 张图像 |
| CompressedTexture | GPU 压缩格式 | DDS, KTX, Basis |
| DepthTexture | 深度信息 | 渲染目标 |

## 本章小结

- CanvasTexture 适合动态 2D 内容
- VideoTexture 支持视频纹理
- DataTexture 用于程序化生成
- CubeTexture 用于环境映射
- 选择合适的纹理类型可优化性能

下一章，我们将学习纹理加载器。
