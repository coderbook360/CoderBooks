---
sidebar_position: 130
title: "增量输出与缓存"
---

# 增量输出与缓存

Webpack 5 引入了增量输出机制，只重新生成变化的资源。本章深入理解增量输出的实现原理。

## 增量输出原理

### 资源变化检测

```typescript
class IncrementalOutput {
  private previousAssets: Map<string, AssetSnapshot> = new Map();
  
  detectChanges(
    currentAssets: Map<string, Source>
  ): ChangeDetectionResult {
    const result: ChangeDetectionResult = {
      added: [],
      modified: [],
      unchanged: [],
      removed: [],
    };
    
    // 检查当前资源
    for (const [name, source] of currentAssets) {
      const previous = this.previousAssets.get(name);
      
      if (!previous) {
        result.added.push(name);
        continue;
      }
      
      // 比较内容 hash
      const currentHash = this.getSourceHash(source);
      
      if (currentHash !== previous.hash) {
        result.modified.push(name);
      } else {
        result.unchanged.push(name);
      }
    }
    
    // 检查删除的资源
    for (const name of this.previousAssets.keys()) {
      if (!currentAssets.has(name)) {
        result.removed.push(name);
      }
    }
    
    return result;
  }
  
  updateSnapshot(assets: Map<string, Source>): void {
    this.previousAssets.clear();
    
    for (const [name, source] of assets) {
      this.previousAssets.set(name, {
        hash: this.getSourceHash(source),
        size: source.size(),
      });
    }
  }
  
  private getSourceHash(source: Source): string {
    return crypto
      .createHash('md5')
      .update(source.buffer())
      .digest('hex');
  }
}

interface AssetSnapshot {
  hash: string;
  size: number;
}

interface ChangeDetectionResult {
  added: string[];
  modified: string[];
  unchanged: string[];
  removed: string[];
}
```

### 增量写入策略

```typescript
class IncrementalEmitter {
  private output: IncrementalOutput;
  private fs: OutputFileSystem;
  
  constructor(fs: OutputFileSystem) {
    this.output = new IncrementalOutput();
    this.fs = fs;
  }
  
  async emit(
    compilation: Compilation,
    outputPath: string
  ): Promise<EmitStats> {
    const assets = compilation.getAssets();
    const assetMap = new Map(
      assets.map(a => [a.name, a.source])
    );
    
    // 检测变化
    const changes = this.output.detectChanges(assetMap);
    
    const stats: EmitStats = {
      emittedCount: 0,
      skippedCount: 0,
      removedCount: 0,
      totalTime: 0,
    };
    
    const startTime = Date.now();
    
    // 只写入新增和修改的资源
    const toEmit = [...changes.added, ...changes.modified];
    
    for (const name of toEmit) {
      const source = assetMap.get(name)!;
      const targetPath = path.join(outputPath, name);
      
      await this.writeAsset(targetPath, source);
      stats.emittedCount++;
    }
    
    // 删除移除的资源
    for (const name of changes.removed) {
      const targetPath = path.join(outputPath, name);
      
      try {
        await this.fs.unlink(targetPath);
        stats.removedCount++;
      } catch {
        // 忽略删除错误
      }
    }
    
    stats.skippedCount = changes.unchanged.length;
    stats.totalTime = Date.now() - startTime;
    
    // 更新快照
    this.output.updateSnapshot(assetMap);
    
    return stats;
  }
  
  private async writeAsset(
    targetPath: string,
    source: Source
  ): Promise<void> {
    const dir = path.dirname(targetPath);
    await this.fs.mkdirp(dir);
    await this.fs.writeFile(targetPath, source.buffer());
  }
}

interface EmitStats {
  emittedCount: number;
  skippedCount: number;
  removedCount: number;
  totalTime: number;
}
```

## 缓存机制

### 持久化缓存

```typescript
class OutputCache {
  private cacheDir: string;
  private manifest: CacheManifest;
  
  constructor(cacheDir: string) {
    this.cacheDir = cacheDir;
    this.manifest = { assets: new Map() };
  }
  
  async load(): Promise<void> {
    const manifestPath = path.join(this.cacheDir, 'manifest.json');
    
    try {
      const content = await fs.promises.readFile(manifestPath, 'utf8');
      const data = JSON.parse(content);
      
      this.manifest = {
        assets: new Map(Object.entries(data.assets)),
      };
    } catch {
      // 缓存不存在，使用空 manifest
    }
  }
  
  async save(): Promise<void> {
    const manifestPath = path.join(this.cacheDir, 'manifest.json');
    
    const data = {
      assets: Object.fromEntries(this.manifest.assets),
    };
    
    await fs.promises.mkdir(this.cacheDir, { recursive: true });
    await fs.promises.writeFile(
      manifestPath,
      JSON.stringify(data, null, 2)
    );
  }
  
  // 检查资源是否在缓存中
  hasAsset(name: string, hash: string): boolean {
    const cached = this.manifest.assets.get(name);
    return cached?.hash === hash;
  }
  
  // 从缓存复制资源
  async copyFromCache(
    name: string,
    targetPath: string
  ): Promise<boolean> {
    const cached = this.manifest.assets.get(name);
    
    if (!cached) {
      return false;
    }
    
    const cachedPath = path.join(this.cacheDir, cached.cachePath);
    
    try {
      await fs.promises.copyFile(cachedPath, targetPath);
      return true;
    } catch {
      return false;
    }
  }
  
  // 添加资源到缓存
  async addToCache(
    name: string,
    hash: string,
    content: Buffer
  ): Promise<void> {
    const cachePath = `assets/${hash.slice(0, 2)}/${hash}`;
    const fullPath = path.join(this.cacheDir, cachePath);
    
    await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.promises.writeFile(fullPath, content);
    
    this.manifest.assets.set(name, {
      hash,
      cachePath,
      size: content.length,
    });
  }
  
  // 清理过期缓存
  async cleanup(maxAge: number): Promise<void> {
    const now = Date.now();
    const toRemove: string[] = [];
    
    for (const [name, info] of this.manifest.assets) {
      const cachePath = path.join(this.cacheDir, info.cachePath);
      
      try {
        const stats = await fs.promises.stat(cachePath);
        const age = now - stats.mtimeMs;
        
        if (age > maxAge) {
          toRemove.push(name);
        }
      } catch {
        toRemove.push(name);
      }
    }
    
    for (const name of toRemove) {
      const info = this.manifest.assets.get(name);
      
      if (info) {
        const cachePath = path.join(this.cacheDir, info.cachePath);
        
        try {
          await fs.promises.unlink(cachePath);
        } catch {
          // 忽略
        }
        
        this.manifest.assets.delete(name);
      }
    }
  }
}

interface CacheManifest {
  assets: Map<string, CacheEntry>;
}

interface CacheEntry {
  hash: string;
  cachePath: string;
  size: number;
}
```

### 内存缓存

```typescript
class MemoryOutputCache {
  private cache: Map<string, CachedAsset> = new Map();
  private maxSize: number;
  private currentSize: number = 0;
  
  constructor(maxSizeMB: number = 100) {
    this.maxSize = maxSizeMB * 1024 * 1024;
  }
  
  get(name: string, hash: string): Buffer | undefined {
    const cached = this.cache.get(name);
    
    if (!cached || cached.hash !== hash) {
      return undefined;
    }
    
    // 更新访问时间（LRU）
    cached.lastAccess = Date.now();
    
    return cached.content;
  }
  
  set(name: string, hash: string, content: Buffer): void {
    const size = content.length;
    
    // 检查是否需要清理
    while (this.currentSize + size > this.maxSize) {
      this.evictLRU();
    }
    
    // 更新或添加
    const existing = this.cache.get(name);
    
    if (existing) {
      this.currentSize -= existing.content.length;
    }
    
    this.cache.set(name, {
      hash,
      content,
      size,
      lastAccess: Date.now(),
    });
    
    this.currentSize += size;
  }
  
  private evictLRU(): void {
    let oldest: string | null = null;
    let oldestTime = Infinity;
    
    for (const [name, cached] of this.cache) {
      if (cached.lastAccess < oldestTime) {
        oldest = name;
        oldestTime = cached.lastAccess;
      }
    }
    
    if (oldest) {
      const cached = this.cache.get(oldest)!;
      this.currentSize -= cached.content.length;
      this.cache.delete(oldest);
    }
  }
  
  clear(): void {
    this.cache.clear();
    this.currentSize = 0;
  }
}

interface CachedAsset {
  hash: string;
  content: Buffer;
  size: number;
  lastAccess: number;
}
```

## Watch 模式优化

### Watch 增量输出

```typescript
class WatchIncrementalEmitter {
  private emitter: IncrementalEmitter;
  private pendingEmit: Map<string, Source> = new Map();
  private emitTimer: NodeJS.Timeout | null = null;
  private debounceMs: number;
  
  constructor(fs: OutputFileSystem, debounceMs: number = 100) {
    this.emitter = new IncrementalEmitter(fs);
    this.debounceMs = debounceMs;
  }
  
  scheduleEmit(compilation: Compilation): void {
    // 收集资源
    for (const asset of compilation.getAssets()) {
      this.pendingEmit.set(asset.name, asset.source);
    }
    
    // 防抖
    if (this.emitTimer) {
      clearTimeout(this.emitTimer);
    }
    
    this.emitTimer = setTimeout(() => {
      this.flushEmit(compilation.outputOptions.path);
    }, this.debounceMs);
  }
  
  private async flushEmit(outputPath: string): Promise<void> {
    const assets = new Map(this.pendingEmit);
    this.pendingEmit.clear();
    
    const changes = this.emitter.detectChanges(assets);
    
    console.log(`Incremental emit: ${changes.added.length} added, ` +
      `${changes.modified.length} modified, ` +
      `${changes.removed.length} removed`);
    
    // 执行增量写入
    for (const name of [...changes.added, ...changes.modified]) {
      const source = assets.get(name)!;
      const targetPath = path.join(outputPath, name);
      
      await this.writeAsset(targetPath, source);
    }
  }
}
```

### 并行增量输出

```typescript
class ParallelIncrementalEmitter {
  private workers: Worker[] = [];
  private taskQueue: EmitTask[] = [];
  
  constructor(workerCount: number = 4) {
    for (let i = 0; i < workerCount; i++) {
      this.workers.push(new Worker('./emit-worker.js'));
    }
  }
  
  async emitParallel(
    assets: Asset[],
    outputPath: string,
    changes: ChangeDetectionResult
  ): Promise<void> {
    const toEmit = [...changes.added, ...changes.modified];
    
    // 分配任务给 workers
    const chunks = this.distributeWork(toEmit, this.workers.length);
    
    const promises = chunks.map((chunk, index) => {
      return this.emitWithWorker(
        this.workers[index],
        chunk,
        assets,
        outputPath
      );
    });
    
    await Promise.all(promises);
  }
  
  private distributeWork(items: string[], count: number): string[][] {
    const chunks: string[][] = Array.from({ length: count }, () => []);
    
    items.forEach((item, index) => {
      chunks[index % count].push(item);
    });
    
    return chunks;
  }
  
  private emitWithWorker(
    worker: Worker,
    names: string[],
    assets: Asset[],
    outputPath: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const assetData = names.map(name => {
        const asset = assets.find(a => a.name === name)!;
        return {
          name,
          content: asset.source.buffer(),
          targetPath: path.join(outputPath, name),
        };
      });
      
      worker.postMessage({ type: 'emit', assets: assetData });
      
      worker.once('message', (msg) => {
        if (msg.type === 'complete') {
          resolve();
        } else if (msg.type === 'error') {
          reject(new Error(msg.error));
        }
      });
    });
  }
  
  terminate(): void {
    for (const worker of this.workers) {
      worker.terminate();
    }
  }
}
```

## 完整集成

### CachingCompiler

```typescript
class CachingCompiler extends Compiler {
  private outputCache: OutputCache;
  private memoryCache: MemoryOutputCache;
  private incrementalOutput: IncrementalOutput;
  
  constructor(context: string, cacheDir: string) {
    super(context);
    
    this.outputCache = new OutputCache(cacheDir);
    this.memoryCache = new MemoryOutputCache(100);
    this.incrementalOutput = new IncrementalOutput();
  }
  
  async run(callback: Callback): Promise<void> {
    // 加载缓存
    await this.outputCache.load();
    
    // 执行编译
    const compilation = await this.compile();
    
    // 增量输出
    await this.emitWithCache(compilation);
    
    // 保存缓存
    await this.outputCache.save();
    
    callback(null, compilation.getStats());
  }
  
  private async emitWithCache(compilation: Compilation): Promise<void> {
    const outputPath = compilation.outputOptions.path;
    const assets = compilation.getAssets();
    
    for (const asset of assets) {
      const hash = this.getAssetHash(asset.source);
      
      // 1. 检查内存缓存
      let content = this.memoryCache.get(asset.name, hash);
      
      if (content) {
        // 直接使用内存缓存
        await this.writeAsset(outputPath, asset.name, content);
        continue;
      }
      
      // 2. 检查磁盘缓存
      const targetPath = path.join(outputPath, asset.name);
      const copied = await this.outputCache.copyFromCache(
        asset.name,
        targetPath
      );
      
      if (copied) {
        continue;
      }
      
      // 3. 生成并缓存
      content = asset.source.buffer();
      
      await this.writeAsset(outputPath, asset.name, content);
      await this.outputCache.addToCache(asset.name, hash, content);
      this.memoryCache.set(asset.name, hash, content);
    }
  }
  
  private getAssetHash(source: Source): string {
    return crypto
      .createHash('md5')
      .update(source.buffer())
      .digest('hex');
  }
}
```

## 总结

增量输出与缓存的核心要点：

**变化检测**：
- 内容 hash 比较
- 快照机制
- 增删改分类

**增量写入**：
- 只写入变化的资源
- 删除移除的资源
- 跳过未变化的资源

**缓存机制**：
- 内存缓存（快速访问）
- 磁盘缓存（持久化）
- LRU 淘汰策略

**Watch 优化**：
- 防抖处理
- 并行写入
- 增量更新

**下一章**：我们将学习输出文件清理机制。
