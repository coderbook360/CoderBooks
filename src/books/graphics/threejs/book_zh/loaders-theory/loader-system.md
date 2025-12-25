# 资源加载系统

> "高效的资源管理是大型 3D 应用的基石。"

## 加载器架构概述

```
Three.js 加载器架构：

                    ┌─────────────────┐
                    │ LoadingManager  │
                    │   (加载管理器)    │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
       ┌──────▼──────┐ ┌─────▼─────┐ ┌──────▼──────┐
       │   Loader    │ │   Cache   │ │ FileLoader  │
       │  (基类)      │ │  (缓存)   │ │ (文件加载)  │
       └──────┬──────┘ └───────────┘ └─────────────┘
              │
    ┌─────────┼─────────┬─────────┬─────────┐
    │         │         │         │         │
┌───▼───┐ ┌───▼───┐ ┌───▼───┐ ┌───▼───┐ ┌───▼───┐
│Texture│ │ GLTF  │ │Object │ │Geometry│ │Material│
│Loader │ │Loader │ │Loader │ │Loader  │ │Loader  │
└───────┘ └───────┘ └───────┘ └────────┘ └────────┘
```

## Loader 基类实现

```typescript
// src/loaders/Loader.ts
import { LoadingManager, DefaultLoadingManager } from './LoadingManager';

export abstract class Loader<T = unknown, U = string> {
  manager: LoadingManager;
  crossOrigin = 'anonymous';
  withCredentials = false;
  path = '';
  resourcePath = '';
  requestHeader: Record<string, string> = {};
  
  constructor(manager?: LoadingManager) {
    this.manager = manager ?? DefaultLoadingManager;
  }
  
  // 抽象加载方法
  abstract load(
    url: U,
    onLoad?: (data: T) => void,
    onProgress?: (event: ProgressEvent) => void,
    onError?: (error: Error) => void
  ): T | void;
  
  // Promise 版本
  loadAsync(url: U, onProgress?: (event: ProgressEvent) => void): Promise<T> {
    return new Promise((resolve, reject) => {
      this.load(url, resolve, onProgress, reject);
    });
  }
  
  // 设置跨域
  setCrossOrigin(crossOrigin: string): this {
    this.crossOrigin = crossOrigin;
    return this;
  }
  
  // 设置凭证
  setWithCredentials(value: boolean): this {
    this.withCredentials = value;
    return this;
  }
  
  // 设置基础路径
  setPath(path: string): this {
    this.path = path;
    return this;
  }
  
  // 设置资源路径
  setResourcePath(resourcePath: string): this {
    this.resourcePath = resourcePath;
    return this;
  }
  
  // 设置请求头
  setRequestHeader(requestHeader: Record<string, string>): this {
    this.requestHeader = requestHeader;
    return this;
  }
}
```

## 资源缓存系统

```typescript
// src/loaders/Cache.ts
export const Cache = {
  enabled: false,
  
  files: {} as Record<string, unknown>,
  
  add(key: string, file: unknown): void {
    if (this.enabled === false) return;
    
    this.files[key] = file;
  },
  
  get(key: string): unknown | undefined {
    if (this.enabled === false) return undefined;
    
    return this.files[key];
  },
  
  remove(key: string): void {
    delete this.files[key];
  },
  
  clear(): void {
    this.files = {};
  },
};
```

## FileLoader 实现

```typescript
// src/loaders/FileLoader.ts
import { Loader } from './Loader';
import { Cache } from './Cache';

export class FileLoader extends Loader<string | ArrayBuffer> {
  mimeType?: string;
  responseType: '' | 'arraybuffer' | 'blob' | 'document' | 'json' | 'text' = '';
  
  constructor(manager?: LoadingManager) {
    super(manager);
  }
  
  load(
    url: string,
    onLoad?: (data: string | ArrayBuffer) => void,
    onProgress?: (event: ProgressEvent) => void,
    onError?: (error: Error) => void
  ): void {
    // 应用路径
    if (url === undefined) url = '';
    if (this.path !== undefined) url = this.path + url;
    
    // 解析 URL
    url = this.manager.resolveURL(url);
    
    // 检查缓存
    const cached = Cache.get(url);
    
    if (cached !== undefined) {
      this.manager.itemStart(url);
      
      setTimeout(() => {
        if (onLoad) onLoad(cached as string | ArrayBuffer);
        this.manager.itemEnd(url);
      }, 0);
      
      return;
    }
    
    // 使用 fetch API
    const fetchOptions: RequestInit = {
      method: 'GET',
      credentials: this.withCredentials ? 'include' : 'same-origin',
      headers: new Headers(this.requestHeader),
    };
    
    // MIME 类型
    if (this.mimeType !== undefined && fetchOptions.headers instanceof Headers) {
      fetchOptions.headers.set('Accept', this.mimeType);
    }
    
    this.manager.itemStart(url);
    
    fetch(url, fetchOptions)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status} - ${response.statusText}`);
        }
        
        return response;
      })
      .then(response => {
        switch (this.responseType) {
          case 'arraybuffer':
            return response.arrayBuffer();
          case 'blob':
            return response.blob();
          case 'document':
            return response.text().then(text => {
              const parser = new DOMParser();
              return parser.parseFromString(text, this.mimeType as DOMParserSupportedType);
            });
          case 'json':
            return response.json();
          default:
            return response.text();
        }
      })
      .then(data => {
        // 添加到缓存
        Cache.add(url, data);
        
        if (onLoad) onLoad(data);
        
        this.manager.itemEnd(url);
      })
      .catch(error => {
        if (onError) onError(error);
        
        this.manager.itemError(url);
        this.manager.itemEnd(url);
      });
  }
  
  setResponseType(type: typeof this.responseType): this {
    this.responseType = type;
    return this;
  }
  
  setMimeType(mimeType: string): this {
    this.mimeType = mimeType;
    return this;
  }
}
```

## 资源类型与加载器映射

```
文件格式      加载器              用途
────────────────────────────────────────────────
纹理文件：
.jpg/.png    TextureLoader       2D 纹理
.hdr         RGBELoader          HDR 环境贴图
.exr         EXRLoader           高动态范围纹理
.ktx2        KTX2Loader          压缩纹理
.dds         DDSLoader           DDS 压缩纹理

模型文件：
.gltf/.glb   GLTFLoader          标准 3D 模型
.obj         OBJLoader           波前 OBJ 模型
.fbx         FBXLoader           Autodesk FBX
.3ds         TDSLoader           3DS Max 文件
.dae         ColladaLoader       Collada 格式
.stl         STLLoader           3D 打印模型
.ply         PLYLoader           点云/网格
.pcd         PCDLoader           点云数据

动画文件：
.bvh         BVHLoader           骨骼动画
.md2         MD2Loader           MD2 动画模型

其他格式：
.svg         SVGLoader           2D 矢量图形
.pdb         PDBLoader           分子结构
.ttf         FontLoader          3D 文字字体
```

## 加载器生命周期

```
加载流程：

  1. 请求阶段
  ┌─────────────┐
  │ load(url)   │
  └──────┬──────┘
         │
  2. 检查缓存
  ┌──────▼──────┐    命中
  │ Cache.get() │─────────► 返回缓存
  └──────┬──────┘
         │ 未命中
  3. 网络请求
  ┌──────▼──────┐
  │   fetch()   │
  └──────┬──────┘
         │
  4. 解析数据
  ┌──────▼──────┐
  │   parse()   │
  └──────┬──────┘
         │
  5. 完成回调
  ┌──────▼──────┐
  │  onLoad()   │
  └─────────────┘
```

## 加载进度跟踪

```typescript
// 进度跟踪系统
class LoadingTracker {
  private manager: LoadingManager;
  private totalBytes = 0;
  private loadedBytes = 0;
  private itemProgress = new Map<string, { loaded: number; total: number }>();
  
  constructor() {
    this.manager = new LoadingManager();
    this.setupCallbacks();
  }
  
  private setupCallbacks(): void {
    this.manager.onStart = (url, loaded, total) => {
      console.log(`开始加载: ${url}`);
      console.log(`已加载/总数: ${loaded}/${total}`);
    };
    
    this.manager.onProgress = (url, loaded, total) => {
      const progress = (loaded / total * 100).toFixed(1);
      console.log(`进度: ${progress}% (${loaded}/${total})`);
    };
    
    this.manager.onLoad = () => {
      console.log('所有资源加载完成');
    };
    
    this.manager.onError = (url) => {
      console.error(`加载失败: ${url}`);
    };
  }
  
  // 跟踪单个文件的字节进度
  trackFileProgress(url: string, event: ProgressEvent): void {
    if (event.lengthComputable) {
      this.itemProgress.set(url, {
        loaded: event.loaded,
        total: event.total,
      });
      
      this.updateTotalProgress();
    }
  }
  
  private updateTotalProgress(): void {
    let loaded = 0;
    let total = 0;
    
    for (const progress of this.itemProgress.values()) {
      loaded += progress.loaded;
      total += progress.total;
    }
    
    this.loadedBytes = loaded;
    this.totalBytes = total;
    
    const percent = (loaded / total * 100).toFixed(1);
    console.log(`总字节进度: ${percent}%`);
  }
  
  getManager(): LoadingManager {
    return this.manager;
  }
}
```

## 资源依赖处理

```
依赖关系处理：

GLTF 文件加载时的依赖：

      gltf.json
          │
    ┌─────┼─────┬─────────┐
    │     │     │         │
  .bin  .jpg  .png     .ktx2
  缓冲   漫反射  法线      压缩纹理
    │     │     │         │
    └─────┴─────┴─────────┘
              │
        完整场景对象
```

```typescript
// 依赖解析示例
class DependencyResolver {
  private loadedResources = new Map<string, unknown>();
  private pendingLoads = new Map<string, Promise<unknown>>();
  
  async loadWithDependencies(
    mainUrl: string,
    dependencies: string[]
  ): Promise<Map<string, unknown>> {
    // 并行加载所有依赖
    const loadPromises = dependencies.map(async (url) => {
      if (this.loadedResources.has(url)) {
        return [url, this.loadedResources.get(url)];
      }
      
      if (this.pendingLoads.has(url)) {
        const result = await this.pendingLoads.get(url);
        return [url, result];
      }
      
      const promise = this.loadResource(url);
      this.pendingLoads.set(url, promise);
      
      const result = await promise;
      this.loadedResources.set(url, result);
      this.pendingLoads.delete(url);
      
      return [url, result];
    });
    
    const results = await Promise.all(loadPromises);
    return new Map(results as [string, unknown][]);
  }
  
  private async loadResource(url: string): Promise<unknown> {
    // 根据扩展名选择加载器
    const ext = url.split('.').pop()?.toLowerCase();
    
    switch (ext) {
      case 'jpg':
      case 'png':
        return new TextureLoader().loadAsync(url);
      case 'bin':
        return new FileLoader()
          .setResponseType('arraybuffer')
          .loadAsync(url);
      case 'json':
        return new FileLoader()
          .setResponseType('json')
          .loadAsync(url);
      default:
        throw new Error(`未知文件类型: ${ext}`);
    }
  }
}
```

## 错误处理策略

```typescript
// 加载错误处理
class RobustLoader {
  private retryCount = 3;
  private retryDelay = 1000;
  
  async loadWithRetry<T>(
    loader: { loadAsync(url: string): Promise<T> },
    url: string
  ): Promise<T> {
    let lastError: Error | undefined;
    
    for (let attempt = 0; attempt < this.retryCount; attempt++) {
      try {
        return await loader.loadAsync(url);
      } catch (error) {
        lastError = error as Error;
        
        console.warn(
          `加载失败 (尝试 ${attempt + 1}/${this.retryCount}): ${url}`,
          error
        );
        
        if (attempt < this.retryCount - 1) {
          await this.delay(this.retryDelay * (attempt + 1));
        }
      }
    }
    
    throw new Error(
      `加载失败: ${url} - ${lastError?.message}`
    );
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // 使用备用 URL
  async loadWithFallback<T>(
    loader: { loadAsync(url: string): Promise<T> },
    urls: string[]
  ): Promise<T> {
    for (const url of urls) {
      try {
        return await loader.loadAsync(url);
      } catch (error) {
        console.warn(`备用 URL 失败: ${url}`);
      }
    }
    
    throw new Error('所有 URL 加载失败');
  }
}
```

## 本章小结

- Loader 基类定义统一的加载接口
- LoadingManager 管理多个加载器的进度
- Cache 避免重复网络请求
- FileLoader 处理底层文件读取
- 不同文件格式对应专用加载器

下一章，我们将详细学习各种模型和资源加载器。
