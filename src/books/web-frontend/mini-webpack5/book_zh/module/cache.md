---
sidebar_position: 40
title: "模块缓存机制"
---

# 模块缓存机制

缓存是 Webpack 性能优化的关键。Webpack 5 引入了持久化缓存，可以将编译结果缓存到文件系统，大幅提升二次构建速度。本章深入理解模块缓存的设计与实现。

## 缓存的必要性

考虑一个典型的项目：

```
src/
├── index.js
├── components/     # 100+ 组件
├── utils/          # 50+ 工具函数
└── styles/         # 样式文件
node_modules/       # 1000+ 依赖
```

首次构建可能需要 30 秒，但如果只修改了一个文件，重新构建全部模块是极大的浪费。

**缓存的目标**：只重新构建发生变化的模块。

## 缓存层次

Webpack 的缓存分为多个层次：

```
┌─────────────────────────────┐
│     持久化缓存（磁盘）      │  ← Webpack 5 新增
├─────────────────────────────┤
│     内存缓存（Compilation）  │
├─────────────────────────────┤
│     解析缓存（Resolver）     │
└─────────────────────────────┘
```

## 内存缓存

### 模块缓存

Compilation 维护模块缓存：

```typescript
export class Compilation {
  /**
   * 模块缓存：identifier -> Module
   */
  private moduleCache = new Map<string, Module>();
  
  /**
   * 获取或创建模块
   */
  getModule(identifier: string): Module | undefined {
    return this.moduleCache.get(identifier);
  }
  
  /**
   * 缓存模块
   */
  cacheModule(module: Module): void {
    const identifier = module.identifier();
    this.moduleCache.set(identifier, module);
  }
  
  /**
   * 检查模块是否可以复用
   */
  canReuseModule(
    module: Module,
    fileTimestamps: Map<string, number>
  ): boolean {
    // 如果模块不可缓存，不能复用
    if (!module.buildInfo.cacheable) {
      return false;
    }
    
    // 检查文件依赖是否变化
    for (const file of module.buildInfo.fileDependencies || []) {
      const timestamp = fileTimestamps.get(file);
      if (!timestamp) return false;
      if (timestamp > module.buildInfo.buildTimestamp!) return false;
    }
    
    return true;
  }
}
```

### 解析结果缓存

```typescript
export class ResolverFactory {
  /**
   * 解析结果缓存
   */
  private resolveCache = new Map<string, ResolveResult>();
  
  getCacheKey(context: string, request: string, options: any): string {
    return `${context}|${request}|${JSON.stringify(options)}`;
  }
  
  getCached(key: string): ResolveResult | undefined {
    return this.resolveCache.get(key);
  }
  
  cache(key: string, result: ResolveResult): void {
    this.resolveCache.set(key, result);
  }
}
```

## Webpack 5 持久化缓存

### 配置方式

```javascript
// webpack.config.js
module.exports = {
  cache: {
    // 启用文件系统缓存
    type: 'filesystem',
    
    // 缓存目录
    cacheDirectory: path.resolve(__dirname, '.webpack-cache'),
    
    // 缓存版本（配置变化时需要更新）
    version: '1.0',
    
    // 构建依赖（这些文件变化时缓存失效）
    buildDependencies: {
      config: [__filename],
      tsconfig: [path.resolve(__dirname, 'tsconfig.json')],
    },
    
    // 缓存名称
    name: process.env.NODE_ENV || 'development',
  },
};
```

### 缓存内容

持久化缓存存储：

- **模块信息**：源码、AST、依赖列表
- **解析结果**：模块路径解析
- **代码生成结果**：生成的运行时代码
- **资产信息**：文件 hash、大小等

### 缓存结构实现

```typescript
export interface CacheEntry {
  // 模块标识符
  identifier: string;
  
  // 构建时间戳
  buildTimestamp: number;
  
  // 文件依赖
  fileDependencies: string[];
  
  // 模块序列化数据
  data: Buffer;
  
  // 验证 hash
  hash: string;
}

export class FileCachePlugin {
  private cacheDirectory: string;
  
  constructor(options: FileCacheOptions) {
    this.cacheDirectory = options.cacheDirectory;
  }
  
  apply(compiler: Compiler): void {
    // 编译开始时加载缓存
    compiler.hooks.beforeCompile.tapAsync(
      'FileCachePlugin',
      (params, callback) => {
        this.loadCache()
          .then(() => callback())
          .catch(callback);
      }
    );
    
    // 编译结束后保存缓存
    compiler.hooks.afterCompile.tapAsync(
      'FileCachePlugin',
      (compilation, callback) => {
        this.saveCache(compilation)
          .then(() => callback())
          .catch(callback);
      }
    );
  }
  
  /**
   * 加载缓存
   */
  private async loadCache(): Promise<void> {
    const cachePath = path.join(this.cacheDirectory, 'cache.json');
    
    if (!await fs.exists(cachePath)) {
      return;
    }
    
    const data = await fs.readFile(cachePath, 'utf-8');
    const entries: CacheEntry[] = JSON.parse(data);
    
    for (const entry of entries) {
      this.cacheMap.set(entry.identifier, entry);
    }
  }
  
  /**
   * 保存缓存
   */
  private async saveCache(compilation: Compilation): Promise<void> {
    const entries: CacheEntry[] = [];
    
    for (const module of compilation.modules) {
      if (!module.buildInfo.cacheable) continue;
      
      const entry: CacheEntry = {
        identifier: module.identifier(),
        buildTimestamp: module.buildInfo.buildTimestamp!,
        fileDependencies: [...(module.buildInfo.fileDependencies || [])],
        data: this.serializeModule(module),
        hash: this.computeHash(module),
      };
      
      entries.push(entry);
    }
    
    await fs.mkdir(this.cacheDirectory, { recursive: true });
    await fs.writeFile(
      path.join(this.cacheDirectory, 'cache.json'),
      JSON.stringify(entries)
    );
  }
}
```

## 缓存验证

### 依赖追踪

模块在构建时记录所有依赖：

```typescript
export class NormalModule extends Module {
  build(/* ... */): void {
    // 初始化依赖集合
    this.buildInfo.fileDependencies = new Set();
    this.buildInfo.contextDependencies = new Set();
    this.buildInfo.missingDependencies = new Set();
    this.buildInfo.buildDependencies = new Set();
    
    // Loader 执行时会添加依赖
    runLoaders(/* ... */, (err, result) => {
      // loader-runner 返回的依赖
      for (const file of result.fileDependencies) {
        this.buildInfo.fileDependencies.add(file);
      }
      // ...
    });
  }
}
```

### 时间戳比较

```typescript
export class Compilation {
  /**
   * 验证模块缓存是否有效
   */
  validateModuleCache(
    module: Module,
    fileTimestamps: Map<string, number>
  ): boolean {
    const buildTimestamp = module.buildInfo.buildTimestamp;
    if (!buildTimestamp) return false;
    
    // 检查所有文件依赖
    for (const file of module.buildInfo.fileDependencies || []) {
      const fileTimestamp = fileTimestamps.get(file);
      
      // 文件不存在或已更新
      if (!fileTimestamp || fileTimestamp > buildTimestamp) {
        return false;
      }
    }
    
    // 检查目录依赖
    for (const context of module.buildInfo.contextDependencies || []) {
      const contextTimestamp = fileTimestamps.get(context);
      if (!contextTimestamp || contextTimestamp > buildTimestamp) {
        return false;
      }
    }
    
    // 检查缺失依赖是否仍然缺失
    for (const missing of module.buildInfo.missingDependencies || []) {
      if (fs.existsSync(missing)) {
        return false;  // 之前不存在的文件现在存在了
      }
    }
    
    return true;
  }
}
```

### 内容 Hash 验证

```typescript
export class CacheValidator {
  /**
   * 计算文件内容 hash
   */
  private async computeFileHash(filePath: string): Promise<string> {
    const content = await fs.readFile(filePath);
    return crypto.createHash('md5').update(content).digest('hex');
  }
  
  /**
   * 验证缓存条目
   */
  async validate(entry: CacheEntry): Promise<boolean> {
    // 验证所有依赖文件的 hash
    for (const [file, expectedHash] of entry.dependencyHashes) {
      try {
        const actualHash = await this.computeFileHash(file);
        if (actualHash !== expectedHash) {
          return false;
        }
      } catch {
        return false;  // 文件不存在
      }
    }
    
    return true;
  }
}
```

## 模块序列化

### 序列化接口

```typescript
export interface Serializer {
  serialize(value: any, context: SerializeContext): void;
  deserialize(context: DeserializeContext): any;
}

export interface SerializeContext {
  write(value: any): void;
  writeLazy(value: any): void;
}

export interface DeserializeContext {
  read(): any;
  readLazy(): Promise<any>;
}
```

### 模块序列化实现

```typescript
export class NormalModule extends Module {
  /**
   * 序列化模块
   */
  serialize(context: SerializeContext): void {
    const { write } = context;
    
    // 基本属性
    write(this.type);
    write(this.layer);
    write(this.context);
    write(this.request);
    write(this.userRequest);
    write(this.rawRequest);
    write(this.resource);
    write(this.resourceQuery);
    write(this.resourceFragment);
    
    // Loader 配置
    write(this.loaders);
    
    // 构建信息
    write(this.buildMeta);
    write(this.buildInfo);
    
    // 依赖
    write(this.dependencies);
    write(this.blocks);
    
    // 源码（惰性写入，大对象）
    context.writeLazy(this._source);
    context.writeLazy(this._ast);
  }
  
  /**
   * 反序列化模块
   */
  deserialize(context: DeserializeContext): void {
    const { read } = context;
    
    this.type = read();
    this.layer = read();
    this.context = read();
    this.request = read();
    this.userRequest = read();
    this.rawRequest = read();
    this.resource = read();
    this.resourceQuery = read();
    this.resourceFragment = read();
    
    this.loaders = read();
    this.buildMeta = read();
    this.buildInfo = read();
    this.dependencies = read();
    this.blocks = read();
    
    // 惰性读取
    this._source = context.readLazy();
    this._ast = context.readLazy();
  }
}
```

## 缓存策略

### 分层缓存

```typescript
export class LayeredCache {
  private memoryCache = new Map<string, any>();
  private diskCache: FileCachePlugin;
  
  async get(key: string): Promise<any> {
    // 先查内存
    if (this.memoryCache.has(key)) {
      return this.memoryCache.get(key);
    }
    
    // 再查磁盘
    const diskValue = await this.diskCache.get(key);
    if (diskValue) {
      // 填充内存缓存
      this.memoryCache.set(key, diskValue);
      return diskValue;
    }
    
    return undefined;
  }
  
  async set(key: string, value: any): Promise<void> {
    // 写入两层
    this.memoryCache.set(key, value);
    await this.diskCache.set(key, value);
  }
}
```

### 缓存清理

```typescript
export class CacheManager {
  private maxAge: number;
  private maxSize: number;
  
  /**
   * 清理过期缓存
   */
  async cleanup(): Promise<void> {
    const now = Date.now();
    const entries = await this.listEntries();
    
    // 按时间排序
    entries.sort((a, b) => a.timestamp - b.timestamp);
    
    let totalSize = 0;
    const toDelete: string[] = [];
    
    for (const entry of entries) {
      // 过期的
      if (now - entry.timestamp > this.maxAge) {
        toDelete.push(entry.path);
        continue;
      }
      
      // 超过大小限制的
      totalSize += entry.size;
      if (totalSize > this.maxSize) {
        toDelete.push(entry.path);
      }
    }
    
    // 删除
    await Promise.all(toDelete.map(p => fs.unlink(p)));
  }
}
```

## Watch 模式缓存

Watch 模式下的增量构建：

```typescript
export class Compiler {
  /**
   * 监听模式
   */
  watch(watchOptions: WatchOptions, callback: WatchCallback): Watching {
    const watching = new Watching(this, watchOptions, callback);
    
    this.hooks.watchRun.callAsync(this, (err) => {
      if (err) return callback(err);
      
      // 获取文件时间戳
      const timestamps = watching.getTimestamps();
      
      // 创建新的 Compilation
      this.compile((err, compilation) => {
        if (err) return callback(err);
        
        // 只重建变化的模块
        for (const module of this.lastCompilation?.modules || []) {
          if (this.shouldRebuild(module, timestamps)) {
            compilation.rebuildModule(module);
          } else {
            // 复用缓存的模块
            compilation.reuseModule(module);
          }
        }
      });
    });
    
    return watching;
  }
}
```

## 总结

模块缓存是 Webpack 性能优化的核心：

**缓存层次**：
1. **内存缓存**：单次构建内的复用
2. **持久化缓存**：跨构建的复用
3. **解析缓存**：路径解析结果

**缓存验证**：
- 时间戳比较：快速但可能不精确
- 内容 Hash：精确但计算成本高
- 依赖追踪：文件、目录、缺失依赖

**设计要点**：
- 细粒度缓存：模块级别
- 惰性加载：大对象延迟反序列化
- 分层策略：内存 + 磁盘
- 自动清理：大小和时间限制

**最佳实践**：
```javascript
// 开发环境
cache: { type: 'memory' }

// 生产环境
cache: {
  type: 'filesystem',
  buildDependencies: {
    config: [__filename],
  },
}
```

下一章我们将实现 ContextModule（上下文模块）。
