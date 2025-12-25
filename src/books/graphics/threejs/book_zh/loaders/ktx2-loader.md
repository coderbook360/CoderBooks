# KTX2Loader 压缩纹理加载

> "压缩纹理是移动端和 Web 性能优化的关键。"

## KTX2 格式概述

KTX2（Khronos Texture 2.0）是跨平台的 GPU 压缩纹理容器格式。

```
KTX2 特点：

┌────────────────────────────────────┐
│           KTX2 Container           │
├────────────────────────────────────┤
│  ✓ 跨平台（Web, iOS, Android）    │
│  ✓ 多种压缩格式支持               │
│  ✓ Mipmap 支持                    │
│  ✓ 立方体贴图支持                 │
│  ✓ 运行时格式转码                 │
│  ✓ 超级压缩（Zstd/Zlib）         │
└────────────────────────────────────┘

支持的压缩格式：
- ETC1S  → 高压缩比，中等质量
- UASTC  → 高质量，中等压缩比
         
运行时转码目标：
- BC7/BC1-BC5  (桌面)
- ETC2/ETC1   (Android)
- ASTC        (现代移动设备)
- PVRTC       (旧 iOS)
```

## 基础使用

```typescript
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';

const ktx2Loader = new KTX2Loader();

// 设置转码器路径（必需）
ktx2Loader.setTranscoderPath('/libs/basis/');

// 检测 GPU 支持的格式
ktx2Loader.detectSupport(renderer);

// 加载纹理
ktx2Loader.load(
  'texture.ktx2',
  (texture) => {
    // 设置颜色空间（漫反射贴图）
    texture.colorSpace = SRGBColorSpace;
    
    material.map = texture;
    material.needsUpdate = true;
  },
  (progress) => {
    console.log(`Loading: ${(progress.loaded / progress.total * 100).toFixed(1)}%`);
  },
  (error) => {
    console.error('Error loading KTX2:', error);
  }
);

// Promise 方式
async function loadKTX2(url: string): Promise<CompressedTexture> {
  const texture = await ktx2Loader.loadAsync(url);
  return texture;
}

// 释放转码器（加载完成后）
ktx2Loader.dispose();
```

## 与 GLTFLoader 配合

```typescript
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';

// 设置 KTX2 加载器
const ktx2Loader = new KTX2Loader();
ktx2Loader.setTranscoderPath('/libs/basis/');
ktx2Loader.detectSupport(renderer);

// 配置 GLTF 加载器
const gltfLoader = new GLTFLoader();
gltfLoader.setKTX2Loader(ktx2Loader);

// 加载使用 KTX2 纹理的 glTF
async function loadModel(): Promise<Group> {
  const gltf = await gltfLoader.loadAsync('model.glb');
  return gltf.scene;
}

// 加载完成后清理
await loadModel();
ktx2Loader.dispose();
```

## 压缩纹理工作流

```
纹理压缩工作流：

源文件 (.png/.jpg)
      │
      ▼
┌─────────────────┐
│  basisu 编码器  │
│  或 toktx 工具  │
└────────┬────────┘
         │
    选择格式
    ┌────┴────┐
    ▼         ▼
  ETC1S     UASTC
  (小文件)   (高质量)
    │         │
    └────┬────┘
         ▼
   .ktx2 文件
         │
         ▼
┌─────────────────┐
│  KTX2Loader     │
│  运行时转码     │
└────────┬────────┘
         │
    目标格式
    ┌────┼────┐
    ▼    ▼    ▼
  BC7  ASTC  ETC2
  桌面  现代   Android
       移动
```

```bash
# 使用 basisu 编码纹理
# ETC1S 模式（高压缩）
basisu input.png -output_file output.ktx2 -ktx2

# UASTC 模式（高质量）
basisu input.png -output_file output.ktx2 -ktx2 -uastc

# 带 mipmap
basisu input.png -output_file output.ktx2 -ktx2 -mipmap

# 法线贴图（线性数据）
basisu normal.png -output_file normal.ktx2 -ktx2 -uastc -normal_map

# 使用 toktx（Khronos 官方工具）
toktx --t2 --encode uastc output.ktx2 input.png
```

## BasisTextureLoader

Basis Universal 格式加载器（KTX2 的前身）。

```typescript
import { BasisTextureLoader } from 'three/addons/loaders/BasisTextureLoader.js';

const basisLoader = new BasisTextureLoader();
basisLoader.setTranscoderPath('/libs/basis/');
basisLoader.detectSupport(renderer);

// 加载 .basis 文件
basisLoader.load(
  'texture.basis',
  (texture) => {
    material.map = texture;
  }
);
```

## 格式选择指南

```
压缩格式选择：

场景              推荐格式    原因
─────────────────────────────────────
漫反射贴图        ETC1S      文件小，质量够用
法线贴图          UASTC      需要高精度
HDR 贴图          UASTC      保留动态范围
UI 纹理           ETC1S      快速加载
高质量资产        UASTC      最佳质量

压缩比对比：

格式      压缩比    质量    解码速度
────────────────────────────────────
PNG       1:1      最高    快
JPEG      ~10:1    高      快
ETC1S     ~20:1    中      中
UASTC     ~4:1     高      快
DDS/BC    ~6:1     高      最快
```

## 完整加载管理

```typescript
class CompressedTextureManager {
  private ktx2Loader: KTX2Loader;
  private cache = new Map<string, CompressedTexture>();
  private loading = new Map<string, Promise<CompressedTexture>>();
  
  constructor(renderer: WebGLRenderer) {
    this.ktx2Loader = new KTX2Loader();
    this.ktx2Loader.setTranscoderPath('/libs/basis/');
    this.ktx2Loader.detectSupport(renderer);
  }
  
  async load(url: string, colorSpace?: ColorSpace): Promise<CompressedTexture> {
    // 检查缓存
    if (this.cache.has(url)) {
      return this.cache.get(url)!;
    }
    
    // 检查正在加载
    if (this.loading.has(url)) {
      return this.loading.get(url)!;
    }
    
    // 开始加载
    const promise = this.ktx2Loader.loadAsync(url).then(texture => {
      if (colorSpace) {
        texture.colorSpace = colorSpace;
      }
      this.cache.set(url, texture);
      this.loading.delete(url);
      return texture;
    });
    
    this.loading.set(url, promise);
    return promise;
  }
  
  async loadPBRTextures(basePath: string): Promise<{
    map?: CompressedTexture;
    normalMap?: CompressedTexture;
    roughnessMap?: CompressedTexture;
    metalnessMap?: CompressedTexture;
    aoMap?: CompressedTexture;
  }> {
    const [map, normalMap, roughnessMap, metalnessMap, aoMap] = await Promise.all([
      this.load(`${basePath}_diffuse.ktx2`, SRGBColorSpace).catch(() => undefined),
      this.load(`${basePath}_normal.ktx2`).catch(() => undefined),
      this.load(`${basePath}_roughness.ktx2`).catch(() => undefined),
      this.load(`${basePath}_metalness.ktx2`).catch(() => undefined),
      this.load(`${basePath}_ao.ktx2`).catch(() => undefined),
    ]);
    
    return { map, normalMap, roughnessMap, metalnessMap, aoMap };
  }
  
  dispose(url?: string): void {
    if (url) {
      const texture = this.cache.get(url);
      if (texture) {
        texture.dispose();
        this.cache.delete(url);
      }
    } else {
      // 释放所有
      for (const texture of this.cache.values()) {
        texture.dispose();
      }
      this.cache.clear();
      this.ktx2Loader.dispose();
    }
  }
}

// 使用
const textureManager = new CompressedTextureManager(renderer);

const textures = await textureManager.loadPBRTextures('textures/wood');
const material = new MeshStandardMaterial({
  ...textures,
});

// 清理
textureManager.dispose();
```

## 检测支持的格式

```typescript
// 检查设备支持的压缩格式
function checkCompressedTextureSupport(renderer: WebGLRenderer): void {
  const gl = renderer.getContext();
  const extensions = renderer.extensions;
  
  const formats: Record<string, boolean> = {
    's3tc': extensions.has('WEBGL_compressed_texture_s3tc'),
    's3tc_srgb': extensions.has('WEBGL_compressed_texture_s3tc_srgb'),
    'etc1': extensions.has('WEBGL_compressed_texture_etc1'),
    'etc2': extensions.has('WEBGL_compressed_texture_etc'),
    'pvrtc': extensions.has('WEBGL_compressed_texture_pvrtc'),
    'astc': extensions.has('WEBGL_compressed_texture_astc'),
    'bptc': extensions.has('EXT_texture_compression_bptc'),
  };
  
  console.log('Compressed texture support:');
  for (const [format, supported] of Object.entries(formats)) {
    console.log(`  ${format}: ${supported ? '✓' : '✗'}`);
  }
}

// 根据设备选择纹理
async function loadOptimalTexture(
  textureManager: CompressedTextureManager,
  baseName: string,
  renderer: WebGLRenderer
): Promise<Texture> {
  const extensions = renderer.extensions;
  
  // 优先级：ASTC > BC7 > ETC2 > S3TC > 回退到 JPEG
  if (extensions.has('WEBGL_compressed_texture_astc')) {
    return textureManager.load(`${baseName}_astc.ktx2`);
  } else if (extensions.has('EXT_texture_compression_bptc')) {
    return textureManager.load(`${baseName}_bc7.ktx2`);
  } else if (extensions.has('WEBGL_compressed_texture_etc')) {
    return textureManager.load(`${baseName}_etc2.ktx2`);
  } else if (extensions.has('WEBGL_compressed_texture_s3tc')) {
    return textureManager.load(`${baseName}_bc1.ktx2`);
  } else {
    // 回退到普通纹理
    return new TextureLoader().loadAsync(`${baseName}.jpg`);
  }
}
```

## 本章小结

- KTX2 是跨平台的压缩纹理容器格式
- 使用 Basis Universal 实现运行时转码
- ETC1S 适合高压缩，UASTC 适合高质量
- 必须设置转码器路径并检测 GPU 支持
- 与 GLTFLoader 配合加载压缩模型
- 加载完成后释放转码器资源

下一章，我们将进入高级渲染技术。
