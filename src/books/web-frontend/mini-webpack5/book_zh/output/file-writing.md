---
sidebar_position: 129
title: "文件写入与目录创建"
---

# 文件写入与目录创建

Webpack 的文件写入涉及目录创建、原子写入和并发控制。本章深入理解文件输出的实现机制。

## 目录创建

### 递归创建目录

```typescript
class OutputFileSystem {
  async mkdirp(dir: string): Promise<void> {
    const parts = dir.split(path.sep);
    let current = '';
    
    for (const part of parts) {
      current = current ? path.join(current, part) : part;
      
      try {
        await this.mkdir(current);
      } catch (err: any) {
        // 目录已存在，继续
        if (err.code !== 'EEXIST') {
          throw err;
        }
      }
    }
  }
  
  // 同步版本
  mkdirpSync(dir: string): void {
    const parts = dir.split(path.sep);
    let current = '';
    
    for (const part of parts) {
      current = current ? path.join(current, part) : part;
      
      if (!fs.existsSync(current)) {
        fs.mkdirSync(current);
      }
    }
  }
}
```

### 智能目录创建

```typescript
class SmartOutputFileSystem {
  private createdDirs: Set<string> = new Set();
  
  async ensureDir(filePath: string): Promise<void> {
    const dir = path.dirname(filePath);
    
    // 已创建过，跳过
    if (this.createdDirs.has(dir)) {
      return;
    }
    
    // 检查父目录链
    const dirsToCreate: string[] = [];
    let current = dir;
    
    while (current && !this.createdDirs.has(current)) {
      const exists = await this.exists(current);
      
      if (exists) {
        break;
      }
      
      dirsToCreate.unshift(current);
      current = path.dirname(current);
    }
    
    // 创建目录链
    for (const d of dirsToCreate) {
      await this.mkdir(d);
      this.createdDirs.add(d);
    }
    
    this.createdDirs.add(dir);
  }
  
  reset(): void {
    this.createdDirs.clear();
  }
}
```

## 文件写入

### 基础写入

```typescript
class FileWriter {
  async writeFile(
    filePath: string,
    content: Buffer | string,
    options?: WriteOptions
  ): Promise<void> {
    // 确保目录存在
    await this.ensureDir(filePath);
    
    // 写入文件
    await fs.promises.writeFile(filePath, content, options);
  }
  
  writeFileSync(
    filePath: string,
    content: Buffer | string,
    options?: WriteOptions
  ): void {
    const dir = path.dirname(filePath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(filePath, content, options);
  }
}
```

### 原子写入

```typescript
class AtomicFileWriter {
  async writeFileAtomic(
    filePath: string,
    content: Buffer | string
  ): Promise<void> {
    // 写入临时文件
    const tempPath = filePath + '.tmp.' + process.pid;
    
    try {
      // 确保目录存在
      await this.ensureDir(filePath);
      
      // 写入临时文件
      await fs.promises.writeFile(tempPath, content);
      
      // 原子重命名
      await fs.promises.rename(tempPath, filePath);
    } catch (err) {
      // 清理临时文件
      try {
        await fs.promises.unlink(tempPath);
      } catch {
        // 忽略清理错误
      }
      throw err;
    }
  }
  
  // 带备份的写入
  async writeFileWithBackup(
    filePath: string,
    content: Buffer | string
  ): Promise<void> {
    const backupPath = filePath + '.bak';
    
    // 如果文件存在，先备份
    if (await this.exists(filePath)) {
      await fs.promises.copyFile(filePath, backupPath);
    }
    
    try {
      await this.writeFileAtomic(filePath, content);
      
      // 成功后删除备份
      if (await this.exists(backupPath)) {
        await fs.promises.unlink(backupPath);
      }
    } catch (err) {
      // 恢复备份
      if (await this.exists(backupPath)) {
        await fs.promises.rename(backupPath, filePath);
      }
      throw err;
    }
  }
}
```

## 并发控制

### 写入队列

```typescript
class ConcurrentFileWriter {
  private queue: WriteTask[] = [];
  private running: number = 0;
  private maxConcurrency: number;
  
  constructor(maxConcurrency: number = 10) {
    this.maxConcurrency = maxConcurrency;
  }
  
  async write(
    filePath: string,
    content: Buffer | string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        filePath,
        content,
        resolve,
        reject,
      });
      
      this.processQueue();
    });
  }
  
  private async processQueue(): Promise<void> {
    if (this.running >= this.maxConcurrency) {
      return;
    }
    
    const task = this.queue.shift();
    
    if (!task) {
      return;
    }
    
    this.running++;
    
    try {
      await this.writeFile(task.filePath, task.content);
      task.resolve();
    } catch (err) {
      task.reject(err);
    } finally {
      this.running--;
      this.processQueue();
    }
  }
  
  private async writeFile(
    filePath: string,
    content: Buffer | string
  ): Promise<void> {
    const dir = path.dirname(filePath);
    
    await fs.promises.mkdir(dir, { recursive: true });
    await fs.promises.writeFile(filePath, content);
  }
}

interface WriteTask {
  filePath: string;
  content: Buffer | string;
  resolve: () => void;
  reject: (err: Error) => void;
}
```

### 批量写入

```typescript
class BatchFileWriter {
  async writeAll(
    files: Map<string, Buffer | string>,
    options?: BatchWriteOptions
  ): Promise<WriteResult> {
    const { concurrency = 10, stopOnError = false } = options || {};
    
    const result: WriteResult = {
      success: [],
      failed: [],
    };
    
    // 按目录分组
    const byDir = this.groupByDirectory(files);
    
    // 先创建所有目录
    await this.createDirectories(byDir.keys());
    
    // 并发写入文件
    const chunks = this.chunk(Array.from(files.entries()), concurrency);
    
    for (const batch of chunks) {
      const promises = batch.map(async ([filePath, content]) => {
        try {
          await fs.promises.writeFile(filePath, content);
          result.success.push(filePath);
        } catch (err: any) {
          if (stopOnError) {
            throw err;
          }
          result.failed.push({ path: filePath, error: err });
        }
      });
      
      await Promise.all(promises);
    }
    
    return result;
  }
  
  private groupByDirectory(
    files: Map<string, Buffer | string>
  ): Map<string, string[]> {
    const byDir = new Map<string, string[]>();
    
    for (const filePath of files.keys()) {
      const dir = path.dirname(filePath);
      
      if (!byDir.has(dir)) {
        byDir.set(dir, []);
      }
      
      byDir.get(dir)!.push(filePath);
    }
    
    return byDir;
  }
  
  private async createDirectories(
    dirs: IterableIterator<string>
  ): Promise<void> {
    const uniqueDirs = new Set<string>();
    
    for (const dir of dirs) {
      // 添加所有父目录
      let current = dir;
      while (current) {
        uniqueDirs.add(current);
        const parent = path.dirname(current);
        if (parent === current) break;
        current = parent;
      }
    }
    
    // 按深度排序，先创建浅层目录
    const sorted = Array.from(uniqueDirs).sort(
      (a, b) => a.split(path.sep).length - b.split(path.sep).length
    );
    
    for (const dir of sorted) {
      try {
        await fs.promises.mkdir(dir);
      } catch (err: any) {
        if (err.code !== 'EEXIST') {
          throw err;
        }
      }
    }
  }
  
  private chunk<T>(arr: T[], size: number): T[][] {
    const result: T[][] = [];
    
    for (let i = 0; i < arr.length; i += size) {
      result.push(arr.slice(i, i + size));
    }
    
    return result;
  }
}

interface WriteResult {
  success: string[];
  failed: Array<{ path: string; error: Error }>;
}
```

## Webpack 集成

### emitAssets 实现

```typescript
class Compiler {
  async emitAssets(
    compilation: Compilation,
    callback: Callback
  ): Promise<void> {
    const outputPath = compilation.getPath(
      this.outputPath,
      { hash: compilation.hash }
    );
    
    // 创建输出目录
    await this.outputFileSystem.mkdirp(outputPath);
    
    // 获取所有资源
    const assets = compilation.getAssets();
    
    // 并发写入
    const concurrency = 10;
    const chunks = this.chunk(assets, concurrency);
    
    for (const batch of chunks) {
      await Promise.all(
        batch.map((asset) => this.emitAsset(outputPath, asset))
      );
    }
    
    callback();
  }
  
  private async emitAsset(
    outputPath: string,
    asset: Asset
  ): Promise<void> {
    const targetPath = path.join(outputPath, asset.name);
    
    // 确保目录存在
    const dir = path.dirname(targetPath);
    await this.outputFileSystem.mkdirp(dir);
    
    // 获取资源内容
    const source = asset.source;
    const content = source.buffer();
    
    // 写入文件
    await new Promise<void>((resolve, reject) => {
      this.outputFileSystem.writeFile(targetPath, content, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    // 触发 assetEmitted hook
    this.hooks.assetEmitted.call(asset.name, {
      content,
      source,
      outputPath,
      targetPath,
      compilation,
    });
  }
}
```

### 增量写入

```typescript
class IncrementalEmitter {
  private lastEmittedAssets: Map<string, string> = new Map();
  
  async emitChanged(
    compilation: Compilation,
    outputPath: string
  ): Promise<EmitResult> {
    const result: EmitResult = {
      emitted: [],
      skipped: [],
      deleted: [],
    };
    
    const currentAssets = new Map<string, string>();
    
    for (const asset of compilation.getAssets()) {
      const source = asset.source;
      const hash = this.getContentHash(source);
      
      currentAssets.set(asset.name, hash);
      
      // 检查是否需要写入
      const lastHash = this.lastEmittedAssets.get(asset.name);
      
      if (lastHash === hash) {
        result.skipped.push(asset.name);
        continue;
      }
      
      // 写入文件
      const targetPath = path.join(outputPath, asset.name);
      await this.writeAsset(targetPath, source);
      
      result.emitted.push(asset.name);
    }
    
    // 删除不再存在的资源
    for (const [name] of this.lastEmittedAssets) {
      if (!currentAssets.has(name)) {
        const targetPath = path.join(outputPath, name);
        
        try {
          await fs.promises.unlink(targetPath);
          result.deleted.push(name);
        } catch {
          // 文件可能已被手动删除
        }
      }
    }
    
    // 更新缓存
    this.lastEmittedAssets = currentAssets;
    
    return result;
  }
  
  private getContentHash(source: Source): string {
    const content = source.buffer();
    return crypto.createHash('md5').update(content).digest('hex');
  }
}

interface EmitResult {
  emitted: string[];
  skipped: string[];
  deleted: string[];
}
```

## 错误处理

### 写入错误处理

```typescript
class SafeFileWriter {
  async write(
    filePath: string,
    content: Buffer | string
  ): Promise<WriteStatus> {
    try {
      // 检查磁盘空间
      await this.checkDiskSpace(filePath, content);
      
      // 检查写入权限
      await this.checkWritePermission(filePath);
      
      // 执行写入
      await fs.promises.writeFile(filePath, content);
      
      return { success: true };
    } catch (err: any) {
      return this.handleError(err, filePath);
    }
  }
  
  private async checkDiskSpace(
    filePath: string,
    content: Buffer | string
  ): Promise<void> {
    // 简化实现，实际需要系统调用
    const size = Buffer.isBuffer(content) 
      ? content.length 
      : Buffer.byteLength(content);
    
    if (size > 100 * 1024 * 1024) {
      console.warn(`Large file: ${filePath} (${size} bytes)`);
    }
  }
  
  private async checkWritePermission(filePath: string): Promise<void> {
    const dir = path.dirname(filePath);
    
    try {
      await fs.promises.access(dir, fs.constants.W_OK);
    } catch {
      throw new Error(`No write permission for directory: ${dir}`);
    }
  }
  
  private handleError(err: Error & { code?: string }, filePath: string): WriteStatus {
    const code = err.code;
    
    switch (code) {
      case 'ENOENT':
        return {
          success: false,
          error: `Directory does not exist: ${path.dirname(filePath)}`,
          recoverable: true,
        };
        
      case 'EACCES':
        return {
          success: false,
          error: `Permission denied: ${filePath}`,
          recoverable: false,
        };
        
      case 'ENOSPC':
        return {
          success: false,
          error: 'Disk full',
          recoverable: false,
        };
        
      default:
        return {
          success: false,
          error: err.message,
          recoverable: false,
        };
    }
  }
}

interface WriteStatus {
  success: boolean;
  error?: string;
  recoverable?: boolean;
}
```

## 总结

文件写入与目录创建的核心要点：

**目录创建**：
- 递归创建父目录
- 缓存已创建目录
- 处理并发创建

**文件写入**：
- 原子写入保证一致性
- 备份机制防止数据丢失
- 增量写入优化性能

**并发控制**：
- 限制并发数
- 批量写入优化
- 队列管理

**错误处理**：
- 权限检查
- 磁盘空间检查
- 错误恢复策略

**下一章**：我们将学习增量输出与缓存机制。
