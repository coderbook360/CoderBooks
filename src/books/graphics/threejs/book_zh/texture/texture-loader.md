# TextureLoader 纹理加载器

> "高效的纹理加载是 3D 应用性能的关键。"

## 加载器概述

```
Three.js 纹理加载器：

TextureLoader          基础图像纹理
CubeTextureLoader      立方体贴图
HDRCubeTextureLoader   HDR 立方体贴图
RGBELoader             RGBE/HDR 格式
EXRLoader              OpenEXR 格式
KTX2Loader             KTX2 压缩纹理
CompressedTextureLoader 通用压缩纹理
ImageBitmapLoader      使用 ImageBitmap API
```

## TextureLoader 实现

```typescript
// src/loaders/TextureLoader.ts
import { Loader } from './Loader';
import { Texture } from '../textures/Texture';
import { ImageLoader } from './ImageLoader';

export class TextureLoader extends Loader {
  constructor(manager?: LoadingManager) {
    super(manager);
  }
  
  load(
    url: string,
    onLoad?: (texture: Texture) => void,
    onProgress?: (event: ProgressEvent) => void,
    onError?: (error: Error) => void
  ): Texture {
    const texture = new Texture();
    
    const loader = new ImageLoader(this.manager);
    loader.setCrossOrigin(this.crossOrigin);
    loader.setPath(this.path);
    
    loader.load(
      url,
      (image) => {
        texture.image = image;
        texture.needsUpdate = true;
        
        if (onLoad !== undefined) {
          onLoad(texture);
        }
      },
      onProgress,
      onError
    );
    
    return texture;
  }
  
  // Promise 版本
  loadAsync(
    url: string,
    onProgress?: (event: ProgressEvent) => void
  ): Promise<Texture> {
    return new Promise((resolve, reject) => {
      this.load(url, resolve, onProgress, reject);
    });
  }
}
```

## ImageLoader 实现

```typescript
// src/loaders/ImageLoader.ts
import { Loader } from './Loader';
import { Cache } from './Cache';

export class ImageLoader extends Loader {
  constructor(manager?: LoadingManager) {
    super(manager);
  }
  
  load(
    url: string,
    onLoad?: (image: HTMLImageElement) => void,
    onProgress?: (event: ProgressEvent) => void,
    onError?: (error: Error) => void
  ): HTMLImageElement {
    // 应用路径
    if (this.path !== undefined) {
      url = this.path + url;
    }
    
    // 解析相对 URL
    url = this.manager.resolveURL(url);
    
    // 检查缓存
    const cached = Cache.get(url);
    
    if (cached !== undefined) {
      this.manager.itemStart(url);
      
      setTimeout(() => {
        if (onLoad) onLoad(cached);
        this.manager.itemEnd(url);
      }, 0);
      
      return cached;
    }
    
    // 创建图像元素
    const image = document.createElement('img');
    
    function onImageLoad() {
      removeEventListeners();
      
      Cache.add(url, image);
      
      if (onLoad) onLoad(image);
      
      this.manager.itemEnd(url);
    }
    
    function onImageError(event: ErrorEvent) {
      removeEventListeners();
      
      if (onError) onError(new Error(`Failed to load ${url}`));
      
      this.manager.itemError(url);
      this.manager.itemEnd(url);
    }
    
    function removeEventListeners() {
      image.removeEventListener('load', onImageLoad, false);
      image.removeEventListener('error', onImageError, false);
    }
    
    image.addEventListener('load', onImageLoad.bind(this), false);
    image.addEventListener('error', onImageError.bind(this), false);
    
    // 设置跨域
    if (url.slice(0, 5) !== 'data:') {
      if (this.crossOrigin !== undefined) {
        image.crossOrigin = this.crossOrigin;
      }
    }
    
    this.manager.itemStart(url);
    
    image.src = url;
    
    return image;
  }
}
```

## LoadingManager 加载管理器

```typescript
// src/loaders/LoadingManager.ts
export class LoadingManager {
  isLoading = false;
  itemsLoaded = 0;
  itemsTotal = 0;
  
  urlModifier?: (url: string) => string;
  
  onStart?: (url: string, itemsLoaded: number, itemsTotal: number) => void;
  onLoad?: () => void;
  onProgress?: (url: string, itemsLoaded: number, itemsTotal: number) => void;
  onError?: (url: string) => void;
  
  constructor(
    onLoad?: () => void,
    onProgress?: (url: string, itemsLoaded: number, itemsTotal: number) => void,
    onError?: (url: string) => void
  ) {
    this.onLoad = onLoad;
    this.onProgress = onProgress;
    this.onError = onError;
  }
  
  itemStart(url: string): void {
    this.itemsTotal++;
    
    if (this.isLoading === false) {
      if (this.onStart !== undefined) {
        this.onStart(url, this.itemsLoaded, this.itemsTotal);
      }
    }
    
    this.isLoading = true;
  }
  
  itemEnd(url: string): void {
    this.itemsLoaded++;
    
    if (this.onProgress !== undefined) {
      this.onProgress(url, this.itemsLoaded, this.itemsTotal);
    }
    
    if (this.itemsLoaded === this.itemsTotal) {
      this.isLoading = false;
      
      if (this.onLoad !== undefined) {
        this.onLoad();
      }
    }
  }
  
  itemError(url: string): void {
    if (this.onError !== undefined) {
      this.onError(url);
    }
  }
  
  resolveURL(url: string): string {
    if (this.urlModifier) {
      return this.urlModifier(url);
    }
    return url;
  }
  
  setURLModifier(callback?: (url: string) => string): this {
    this.urlModifier = callback;
    return this;
  }
}

// 默认管理器
export const DefaultLoadingManager = new LoadingManager();
```

## CubeTextureLoader 实现

```typescript
// src/loaders/CubeTextureLoader.ts
import { Loader } from './Loader';
import { CubeTexture } from '../textures/CubeTexture';
import { ImageLoader } from './ImageLoader';

export class CubeTextureLoader extends Loader {
  constructor(manager?: LoadingManager) {
    super(manager);
  }
  
  load(
    urls: string[],  // 6 个 URL: [+X, -X, +Y, -Y, +Z, -Z]
    onLoad?: (texture: CubeTexture) => void,
    onProgress?: (event: ProgressEvent) => void,
    onError?: (error: Error) => void
  ): CubeTexture {
    const texture = new CubeTexture();
    
    const loader = new ImageLoader(this.manager);
    loader.setCrossOrigin(this.crossOrigin);
    loader.setPath(this.path);
    
    let loaded = 0;
    
    function loadTexture(i: number) {
      loader.load(
        urls[i],
        (image) => {
          texture.images[i] = image;
          loaded++;
          
          if (loaded === 6) {
            texture.needsUpdate = true;
            
            if (onLoad) onLoad(texture);
          }
        },
        undefined,
        onError
      );
    }
    
    for (let i = 0; i < urls.length; i++) {
      loadTexture(i);
    }
    
    return texture;
  }
}
```

## 使用示例

### 基础加载

```typescript
const textureLoader = new TextureLoader();

// 回调方式
textureLoader.load(
  'textures/diffuse.jpg',
  (texture) => {
    // 加载完成
    material.map = texture;
    material.needsUpdate = true;
  },
  (progress) => {
    console.log(`Loading: ${(progress.loaded / progress.total * 100).toFixed(2)}%`);
  },
  (error) => {
    console.error('Failed to load texture:', error);
  }
);

// Promise 方式
async function loadTextures() {
  const [diffuse, normal, roughness] = await Promise.all([
    textureLoader.loadAsync('textures/diffuse.jpg'),
    textureLoader.loadAsync('textures/normal.jpg'),
    textureLoader.loadAsync('textures/roughness.jpg'),
  ]);
  
  material.map = diffuse;
  material.normalMap = normal;
  material.roughnessMap = roughness;
}
```

### 使用加载管理器

```typescript
// 创建管理器跟踪加载进度
const manager = new LoadingManager(
  () => {
    console.log('All textures loaded');
    startScene();
  },
  (url, loaded, total) => {
    console.log(`Loading: ${url} (${loaded}/${total})`);
    updateProgressBar(loaded / total);
  },
  (url) => {
    console.error(`Failed to load: ${url}`);
  }
);

const textureLoader = new TextureLoader(manager);

// 加载多个纹理
const textures = [
  'diffuse.jpg',
  'normal.jpg',
  'roughness.jpg',
  'metalness.jpg',
  'ao.jpg',
].map(name => textureLoader.load(`textures/${name}`));
```

### 预加载和缓存

```typescript
// 纹理缓存
import { Cache } from 'three';

// 启用缓存
Cache.enabled = true;

// 预加载纹理
class TexturePreloader {
  private loader = new TextureLoader();
  private textures = new Map<string, Texture>();
  
  async preload(urls: string[]): Promise<void> {
    const promises = urls.map(url => 
      this.loader.loadAsync(url).then(texture => {
        this.textures.set(url, texture);
      })
    );
    
    await Promise.all(promises);
  }
  
  get(url: string): Texture | undefined {
    return this.textures.get(url);
  }
  
  dispose(): void {
    for (const texture of this.textures.values()) {
      texture.dispose();
    }
    this.textures.clear();
  }
}

// 使用
const preloader = new TexturePreloader();
await preloader.preload([
  'textures/wood.jpg',
  'textures/metal.jpg',
  'textures/fabric.jpg',
]);

// 立即获取（已缓存）
const woodTexture = preloader.get('textures/wood.jpg');
```

### 加载 HDR 环境贴图

```typescript
import { RGBELoader } from 'three/addons/loaders/RGBELoader';

const rgbeLoader = new RGBELoader();

rgbeLoader.load('environment.hdr', (texture) => {
  texture.mapping = EquirectangularReflectionMapping;
  
  scene.background = texture;
  scene.environment = texture;
  
  // 或者使用 PMREMGenerator 预滤波
  const pmremGenerator = new PMREMGenerator(renderer);
  const envMap = pmremGenerator.fromEquirectangular(texture).texture;
  
  scene.environment = envMap;
  
  texture.dispose();
  pmremGenerator.dispose();
});
```

### 加载压缩纹理

```typescript
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader';

const ktx2Loader = new KTX2Loader();
ktx2Loader.setTranscoderPath('libs/basis/');
ktx2Loader.detectSupport(renderer);

ktx2Loader.load('texture.ktx2', (texture) => {
  material.map = texture;
});

// Basis Universal
import { BasisTextureLoader } from 'three/addons/loaders/BasisTextureLoader';

const basisLoader = new BasisTextureLoader();
basisLoader.setTranscoderPath('libs/basis/');
basisLoader.detectSupport(renderer);

basisLoader.load('texture.basis', (texture) => {
  material.map = texture;
});
```

## 批量加载模式

```typescript
// 材质纹理批量加载器
class PBRTextureLoader {
  private textureLoader = new TextureLoader();
  
  async loadPBRTextures(basePath: string): Promise<{
    map?: Texture;
    normalMap?: Texture;
    roughnessMap?: Texture;
    metalnessMap?: Texture;
    aoMap?: Texture;
    emissiveMap?: Texture;
    displacementMap?: Texture;
  }> {
    const textureTypes = [
      { key: 'map', suffixes: ['diffuse', 'albedo', 'color', 'basecolor'] },
      { key: 'normalMap', suffixes: ['normal', 'norm'] },
      { key: 'roughnessMap', suffixes: ['roughness', 'rough'] },
      { key: 'metalnessMap', suffixes: ['metalness', 'metallic', 'metal'] },
      { key: 'aoMap', suffixes: ['ao', 'ambient', 'occlusion'] },
      { key: 'emissiveMap', suffixes: ['emissive', 'emission'] },
      { key: 'displacementMap', suffixes: ['displacement', 'height', 'disp'] },
    ];
    
    const result: Record<string, Texture | undefined> = {};
    
    const loadPromises = textureTypes.map(async ({ key, suffixes }) => {
      for (const suffix of suffixes) {
        const extensions = ['jpg', 'png', 'webp'];
        
        for (const ext of extensions) {
          const url = `${basePath}_${suffix}.${ext}`;
          
          try {
            const texture = await this.textureLoader.loadAsync(url);
            
            // 设置合适的颜色空间
            if (key === 'map' || key === 'emissiveMap') {
              texture.colorSpace = SRGBColorSpace;
            }
            
            result[key] = texture;
            return;
          } catch {
            // 尝试下一个
          }
        }
      }
    });
    
    await Promise.all(loadPromises);
    
    return result;
  }
}

// 使用
const pbrLoader = new PBRTextureLoader();
const textures = await pbrLoader.loadPBRTextures('textures/wood');

const material = new MeshStandardMaterial({
  ...textures,
});
```

## 纹理加载最佳实践

```
性能优化：

1. 使用合适的分辨率
   - 移动端: 512×512 ~ 1024×1024
   - 桌面端: 1024×1024 ~ 2048×2048
   - 尺寸应为 2 的幂次

2. 选择合适的格式
   - JPG: 照片、漫反射贴图
   - PNG: 需要透明通道
   - WebP: 更好的压缩（需检测支持）
   - KTX2/Basis: GPU 压缩格式

3. 启用缓存
   Cache.enabled = true;

4. 批量加载
   - 使用 Promise.all 并行加载
   - 显示加载进度

5. 延迟加载
   - 只加载当前需要的纹理
   - 滚动或切换时按需加载

6. 纹理图集
   - 合并小纹理减少请求
   - 使用 UV 偏移访问子纹理
```

## 本章小结

- TextureLoader 是基础纹理加载器
- LoadingManager 管理加载进度
- Cache 避免重复加载
- 使用 Promise 简化异步加载
- 选择合适的格式和分辨率优化性能

下一章，我们将学习加载器系统的理论基础。
