---
sidebar_position: 127
title: "文件系统抽象层"
---

# 文件系统抽象层

Webpack 通过文件系统抽象层实现了对不同环境的支持，使得同一套代码可以在 Node.js、浏览器、内存等不同环境中运行。

## 抽象层设计

### 接口定义

```typescript
interface InputFileSystem {
  readFile(path: string, callback: Callback<Buffer>): void;
  readdir(path: string, callback: Callback<string[]>): void;
  stat(path: string, callback: Callback<Stats>): void;
  lstat?(path: string, callback: Callback<Stats>): void;
  readlink?(path: string, callback: Callback<string>): void;
  readJson?(path: string, callback: Callback<object>): void;
}

interface OutputFileSystem {
  writeFile(path: string, data: Buffer, callback: Callback): void;
  mkdir(path: string, callback: Callback): void;
  mkdirp?(path: string, callback: Callback): void;
  rmdir?(path: string, callback: Callback): void;
  unlink?(path: string, callback: Callback): void;
  stat?(path: string, callback: Callback<Stats>): void;
}

interface IntermediateFileSystem extends InputFileSystem, OutputFileSystem {
  rename(oldPath: string, newPath: string, callback: Callback): void;
}
```

### Compiler 中的文件系统

```typescript
class Compiler {
  // 输入文件系统（读取源文件）
  inputFileSystem: InputFileSystem;
  
  // 输出文件系统（写入构建产物）
  outputFileSystem: OutputFileSystem;
  
  // 中间文件系统（缓存等）
  intermediateFileSystem: IntermediateFileSystem;
  
  constructor(context: string) {
    // 默认使用 Node.js 文件系统
    this.inputFileSystem = new NodeJsInputFileSystem();
    this.outputFileSystem = new NodeJsOutputFileSystem();
    this.intermediateFileSystem = new NodeJsIntermediateFileSystem();
  }
}
```

## Node.js 实现

### NodeJsInputFileSystem

```typescript
class NodeJsInputFileSystem implements InputFileSystem {
  readFile(path: string, callback: Callback<Buffer>): void {
    fs.readFile(path, callback);
  }
  
  readdir(path: string, callback: Callback<string[]>): void {
    fs.readdir(path, callback);
  }
  
  stat(path: string, callback: Callback<Stats>): void {
    fs.stat(path, callback);
  }
  
  lstat(path: string, callback: Callback<Stats>): void {
    fs.lstat(path, callback);
  }
  
  readlink(path: string, callback: Callback<string>): void {
    fs.readlink(path, callback);
  }
  
  readJson(path: string, callback: Callback<object>): void {
    fs.readFile(path, 'utf8', (err, content) => {
      if (err) return callback(err);
      
      try {
        const json = JSON.parse(content);
        callback(null, json);
      } catch (parseError) {
        callback(parseError);
      }
    });
  }
}
```

### NodeJsOutputFileSystem

```typescript
class NodeJsOutputFileSystem implements OutputFileSystem {
  writeFile(path: string, data: Buffer, callback: Callback): void {
    fs.writeFile(path, data, callback);
  }
  
  mkdir(path: string, callback: Callback): void {
    fs.mkdir(path, callback);
  }
  
  mkdirp(path: string, callback: Callback): void {
    fs.mkdir(path, { recursive: true }, callback);
  }
  
  rmdir(path: string, callback: Callback): void {
    fs.rm(path, { recursive: true, force: true }, callback);
  }
  
  unlink(path: string, callback: Callback): void {
    fs.unlink(path, callback);
  }
  
  stat(path: string, callback: Callback<Stats>): void {
    fs.stat(path, callback);
  }
}
```

## 内存文件系统

### MemoryFileSystem

```typescript
class MemoryFileSystem implements InputFileSystem, OutputFileSystem {
  private data: Map<string, FileEntry> = new Map();
  
  writeFile(path: string, data: Buffer, callback: Callback): void {
    const normalized = this.normalize(path);
    
    this.data.set(normalized, {
      type: 'file',
      content: data,
      mtime: new Date(),
    });
    
    // 确保父目录存在
    this.ensureDir(dirname(normalized));
    
    callback();
  }
  
  readFile(path: string, callback: Callback<Buffer>): void {
    const normalized = this.normalize(path);
    const entry = this.data.get(normalized);
    
    if (!entry) {
      return callback(new Error(`ENOENT: no such file: ${path}`));
    }
    
    if (entry.type !== 'file') {
      return callback(new Error(`EISDIR: is a directory: ${path}`));
    }
    
    callback(null, entry.content);
  }
  
  readdir(path: string, callback: Callback<string[]>): void {
    const normalized = this.normalize(path);
    const prefix = normalized + '/';
    
    const entries: string[] = [];
    
    for (const [key, entry] of this.data) {
      if (key.startsWith(prefix)) {
        const rest = key.slice(prefix.length);
        const firstPart = rest.split('/')[0];
        
        if (!entries.includes(firstPart)) {
          entries.push(firstPart);
        }
      }
    }
    
    callback(null, entries);
  }
  
  stat(path: string, callback: Callback<Stats>): void {
    const normalized = this.normalize(path);
    const entry = this.data.get(normalized);
    
    if (!entry) {
      return callback(new Error(`ENOENT: no such file: ${path}`));
    }
    
    const stats: Stats = {
      isFile: () => entry.type === 'file',
      isDirectory: () => entry.type === 'directory',
      size: entry.content?.length || 0,
      mtime: entry.mtime,
    };
    
    callback(null, stats);
  }
  
  mkdir(path: string, callback: Callback): void {
    const normalized = this.normalize(path);
    
    this.data.set(normalized, {
      type: 'directory',
      mtime: new Date(),
    });
    
    callback();
  }
  
  mkdirp(path: string, callback: Callback): void {
    const normalized = this.normalize(path);
    const parts = normalized.split('/');
    
    let current = '';
    
    for (const part of parts) {
      current += '/' + part;
      
      if (!this.data.has(current)) {
        this.data.set(current, {
          type: 'directory',
          mtime: new Date(),
        });
      }
    }
    
    callback();
  }
  
  private normalize(path: string): string {
    return path.replace(/\\/g, '/').replace(/\/+/g, '/');
  }
  
  private ensureDir(path: string): void {
    const parts = path.split('/');
    let current = '';
    
    for (const part of parts) {
      if (!part) continue;
      current += '/' + part;
      
      if (!this.data.has(current)) {
        this.data.set(current, {
          type: 'directory',
          mtime: new Date(),
        });
      }
    }
  }
}

interface FileEntry {
  type: 'file' | 'directory';
  content?: Buffer;
  mtime: Date;
}
```

## 缓存文件系统

### CachedInputFileSystem

```typescript
class CachedInputFileSystem implements InputFileSystem {
  private fs: InputFileSystem;
  private cache: Map<string, CacheEntry> = new Map();
  private duration: number;
  
  constructor(fs: InputFileSystem, duration: number = 60000) {
    this.fs = fs;
    this.duration = duration;
  }
  
  readFile(path: string, callback: Callback<Buffer>): void {
    const cacheKey = `readFile:${path}`;
    const cached = this.getCache(cacheKey);
    
    if (cached !== undefined) {
      return process.nextTick(() => callback(null, cached));
    }
    
    this.fs.readFile(path, (err, result) => {
      if (!err) {
        this.setCache(cacheKey, result);
      }
      callback(err, result);
    });
  }
  
  stat(path: string, callback: Callback<Stats>): void {
    const cacheKey = `stat:${path}`;
    const cached = this.getCache(cacheKey);
    
    if (cached !== undefined) {
      return process.nextTick(() => callback(null, cached));
    }
    
    this.fs.stat(path, (err, result) => {
      if (!err) {
        this.setCache(cacheKey, result);
      }
      callback(err, result);
    });
  }
  
  readdir(path: string, callback: Callback<string[]>): void {
    const cacheKey = `readdir:${path}`;
    const cached = this.getCache(cacheKey);
    
    if (cached !== undefined) {
      return process.nextTick(() => callback(null, cached));
    }
    
    this.fs.readdir(path, (err, result) => {
      if (!err) {
        this.setCache(cacheKey, result);
      }
      callback(err, result);
    });
  }
  
  private getCache(key: string): any {
    const entry = this.cache.get(key);
    
    if (!entry) return undefined;
    
    if (Date.now() - entry.timestamp > this.duration) {
      this.cache.delete(key);
      return undefined;
    }
    
    return entry.value;
  }
  
  private setCache(key: string, value: any): void {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    });
  }
  
  // 手动清理缓存
  purge(): void {
    this.cache.clear();
  }
  
  // 清理过期缓存
  cleanExpired(): void {
    const now = Date.now();
    
    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > this.duration) {
        this.cache.delete(key);
      }
    }
  }
}

interface CacheEntry {
  value: any;
  timestamp: number;
}
```

## Watch 文件系统

### WatchFileSystem

```typescript
interface WatchFileSystem {
  watch(
    files: string[],
    directories: string[],
    missing: string[],
    startTime: number,
    options: WatchOptions,
    callback: WatchCallback,
    callbackUndelayed?: () => void
  ): Watcher;
}

interface Watcher {
  close(): void;
  pause(): void;
  getFileTimestamps(): Map<string, number>;
  getContextTimestamps(): Map<string, number>;
}

class NodeWatchFileSystem implements WatchFileSystem {
  private fs: InputFileSystem;
  
  constructor(fs: InputFileSystem) {
    this.fs = fs;
  }
  
  watch(
    files: string[],
    directories: string[],
    missing: string[],
    startTime: number,
    options: WatchOptions,
    callback: WatchCallback
  ): Watcher {
    const watcher = new Watcher(this.fs);
    
    // 监听文件
    for (const file of files) {
      fs.watch(file, (eventType, filename) => {
        if (eventType === 'change') {
          watcher.onFileChange(file);
        }
      });
    }
    
    // 监听目录
    for (const dir of directories) {
      fs.watch(dir, { recursive: true }, (eventType, filename) => {
        watcher.onDirectoryChange(dir, filename);
      });
    }
    
    // 监听缺失文件（创建时触发）
    for (const file of missing) {
      this.watchMissing(file, watcher);
    }
    
    return watcher;
  }
  
  private watchMissing(file: string, watcher: Watcher): void {
    const dir = dirname(file);
    const basename = path.basename(file);
    
    fs.watch(dir, (eventType, filename) => {
      if (filename === basename) {
        watcher.onFileCreated(file);
      }
    });
  }
}
```

## 文件系统切换

### 开发环境

```typescript
const webpack = require('webpack');
const MemoryFileSystem = require('memory-fs');

const compiler = webpack(config);

// 使用内存文件系统（开发服务器）
compiler.outputFileSystem = new MemoryFileSystem();

compiler.run((err, stats) => {
  // 资源在内存中，可直接提供给开发服务器
});
```

### 测试环境

```typescript
// 测试时使用内存文件系统
const memoryFs = new MemoryFileSystem();

// 预填充测试文件
memoryFs.writeFile('/src/index.js', Buffer.from('export default 1;'), () => {});

compiler.inputFileSystem = memoryFs;
compiler.outputFileSystem = memoryFs;

compiler.run((err, stats) => {
  // 检查输出
  memoryFs.readFile('/dist/main.js', 'utf8', (err, content) => {
    expect(content).toContain('export default 1');
  });
});
```

## 总结

文件系统抽象层的核心要点：

**接口设计**：
- InputFileSystem：读取操作
- OutputFileSystem：写入操作
- IntermediateFileSystem：中间操作

**实现类型**：
- NodeJs 文件系统
- 内存文件系统
- 缓存文件系统
- Watch 文件系统

**使用场景**：
- Node.js：默认文件系统
- 开发服务器：内存文件系统
- 测试：可控的模拟文件系统

**性能优化**：
- 缓存层包装
- 减少 I/O 操作

**下一章**：我们将学习输出文件路径计算。
