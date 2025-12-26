---
sidebar_position: 131
title: "输出文件清理"
---

# 输出文件清理

Webpack 5 提供了输出目录清理功能，避免旧文件残留。本章深入理解清理机制的实现。

## 清理策略

### CleanPlugin

```typescript
class CleanPlugin {
  private options: CleanOptions;
  
  constructor(options: CleanOptions = {}) {
    this.options = {
      dry: false,           // 模拟清理
      keep: undefined,      // 保留规则
      ...options,
    };
  }
  
  apply(compiler: Compiler): void {
    const { output } = compiler.options;
    
    // 在 emit 阶段处理清理
    compiler.hooks.emit.tapAsync(
      'CleanPlugin',
      async (compilation, callback) => {
        try {
          await this.clean(compilation, output.path);
          callback();
        } catch (err) {
          callback(err as Error);
        }
      }
    );
  }
  
  private async clean(
    compilation: Compilation,
    outputPath: string
  ): Promise<void> {
    // 获取当前编译产物
    const currentAssets = new Set(
      compilation.getAssets().map(a => a.name)
    );
    
    // 获取输出目录中的文件
    const existingFiles = await this.getExistingFiles(outputPath);
    
    // 找出需要删除的文件
    const toDelete = existingFiles.filter(file => {
      // 当前编译产物，保留
      if (currentAssets.has(file)) {
        return false;
      }
      
      // 检查保留规则
      if (this.shouldKeep(file)) {
        return false;
      }
      
      return true;
    });
    
    // 执行删除
    for (const file of toDelete) {
      const filePath = path.join(outputPath, file);
      
      if (this.options.dry) {
        console.log(`[dry] Would delete: ${file}`);
      } else {
        await fs.promises.unlink(filePath);
      }
    }
  }
  
  private async getExistingFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    
    const walk = async (currentDir: string, prefix: string) => {
      let entries: string[];
      
      try {
        entries = await fs.promises.readdir(currentDir);
      } catch {
        return;
      }
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry);
        const relativePath = prefix ? `${prefix}/${entry}` : entry;
        
        const stats = await fs.promises.stat(fullPath);
        
        if (stats.isDirectory()) {
          await walk(fullPath, relativePath);
        } else {
          files.push(relativePath);
        }
      }
    };
    
    await walk(dir, '');
    
    return files;
  }
  
  private shouldKeep(file: string): boolean {
    const { keep } = this.options;
    
    if (!keep) {
      return false;
    }
    
    if (typeof keep === 'function') {
      return keep(file);
    }
    
    if (keep instanceof RegExp) {
      return keep.test(file);
    }
    
    if (Array.isArray(keep)) {
      return keep.some(pattern => {
        if (typeof pattern === 'string') {
          return minimatch(file, pattern);
        }
        if (pattern instanceof RegExp) {
          return pattern.test(file);
        }
        return false;
      });
    }
    
    return false;
  }
}

interface CleanOptions {
  dry?: boolean;
  keep?: RegExp | string[] | ((file: string) => boolean);
}
```

## 高级清理功能

### 智能清理

```typescript
class SmartCleanPlugin {
  private manifest: CleanManifest;
  private manifestPath: string;
  
  constructor(options: SmartCleanOptions) {
    this.manifestPath = options.manifestPath || '.clean-manifest.json';
    this.manifest = { files: new Map(), lastClean: 0 };
  }
  
  apply(compiler: Compiler): void {
    const outputPath = compiler.options.output.path;
    
    // 加载 manifest
    compiler.hooks.beforeRun.tapAsync(
      'SmartCleanPlugin',
      async (_, callback) => {
        await this.loadManifest(outputPath);
        callback();
      }
    );
    
    // 清理并更新 manifest
    compiler.hooks.afterEmit.tapAsync(
      'SmartCleanPlugin',
      async (compilation, callback) => {
        await this.smartClean(compilation, outputPath);
        callback();
      }
    );
  }
  
  private async loadManifest(outputPath: string): Promise<void> {
    const manifestPath = path.join(outputPath, this.manifestPath);
    
    try {
      const content = await fs.promises.readFile(manifestPath, 'utf8');
      const data = JSON.parse(content);
      
      this.manifest = {
        files: new Map(Object.entries(data.files)),
        lastClean: data.lastClean || 0,
      };
    } catch {
      // manifest 不存在
    }
  }
  
  private async saveManifest(outputPath: string): Promise<void> {
    const manifestPath = path.join(outputPath, this.manifestPath);
    
    const data = {
      files: Object.fromEntries(this.manifest.files),
      lastClean: Date.now(),
    };
    
    await fs.promises.writeFile(
      manifestPath,
      JSON.stringify(data, null, 2)
    );
  }
  
  private async smartClean(
    compilation: Compilation,
    outputPath: string
  ): Promise<void> {
    const currentAssets = new Set<string>();
    
    // 更新 manifest
    for (const asset of compilation.getAssets()) {
      currentAssets.add(asset.name);
      
      this.manifest.files.set(asset.name, {
        hash: this.getAssetHash(asset.source),
        lastEmit: Date.now(),
      });
    }
    
    // 清理不再使用的文件
    const toDelete: string[] = [];
    
    for (const [file] of this.manifest.files) {
      if (!currentAssets.has(file)) {
        toDelete.push(file);
      }
    }
    
    for (const file of toDelete) {
      const filePath = path.join(outputPath, file);
      
      try {
        await fs.promises.unlink(filePath);
        this.manifest.files.delete(file);
      } catch {
        // 文件可能已被删除
      }
    }
    
    // 清理空目录
    await this.cleanEmptyDirs(outputPath);
    
    // 保存 manifest
    await this.saveManifest(outputPath);
  }
  
  private async cleanEmptyDirs(dir: string): Promise<boolean> {
    const entries = await fs.promises.readdir(dir);
    
    let isEmpty = true;
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const stats = await fs.promises.stat(fullPath);
      
      if (stats.isDirectory()) {
        const subEmpty = await this.cleanEmptyDirs(fullPath);
        
        if (!subEmpty) {
          isEmpty = false;
        }
      } else {
        isEmpty = false;
      }
    }
    
    // 如果目录为空，删除它
    if (isEmpty && dir !== this.options.outputPath) {
      await fs.promises.rmdir(dir);
    }
    
    return isEmpty;
  }
  
  private getAssetHash(source: Source): string {
    return crypto
      .createHash('md5')
      .update(source.buffer())
      .digest('hex');
  }
}

interface CleanManifest {
  files: Map<string, FileInfo>;
  lastClean: number;
}

interface FileInfo {
  hash: string;
  lastEmit: number;
}
```

### 基于时间的清理

```typescript
class TimeBasedCleanPlugin {
  private options: TimeBasedCleanOptions;
  
  constructor(options: TimeBasedCleanOptions) {
    this.options = {
      maxAge: 24 * 60 * 60 * 1000, // 默认24小时
      ...options,
    };
  }
  
  apply(compiler: Compiler): void {
    compiler.hooks.done.tapAsync(
      'TimeBasedCleanPlugin',
      async (stats, callback) => {
        const outputPath = stats.compilation.outputOptions.path;
        await this.cleanOldFiles(outputPath);
        callback();
      }
    );
  }
  
  private async cleanOldFiles(outputPath: string): Promise<void> {
    const now = Date.now();
    const { maxAge } = this.options;
    
    const walk = async (dir: string) => {
      let entries: string[];
      
      try {
        entries = await fs.promises.readdir(dir);
      } catch {
        return;
      }
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        const stats = await fs.promises.stat(fullPath);
        
        if (stats.isDirectory()) {
          await walk(fullPath);
          
          // 检查目录是否为空
          const remaining = await fs.promises.readdir(fullPath);
          if (remaining.length === 0) {
            await fs.promises.rmdir(fullPath);
          }
        } else {
          const age = now - stats.mtimeMs;
          
          if (age > maxAge) {
            await fs.promises.unlink(fullPath);
          }
        }
      }
    };
    
    await walk(outputPath);
  }
}

interface TimeBasedCleanOptions {
  maxAge?: number;
}
```

## 安全清理

### 防误删机制

```typescript
class SafeCleanPlugin {
  private options: SafeCleanOptions;
  
  constructor(options: SafeCleanOptions = {}) {
    this.options = {
      protectedPatterns: [
        /\.git/,
        /node_modules/,
        /package\.json$/,
      ],
      maxDeleteCount: 1000,
      ...options,
    };
  }
  
  apply(compiler: Compiler): void {
    compiler.hooks.emit.tapAsync(
      'SafeCleanPlugin',
      async (compilation, callback) => {
        try {
          await this.safeClean(compilation);
          callback();
        } catch (err) {
          callback(err as Error);
        }
      }
    );
  }
  
  private async safeClean(compilation: Compilation): Promise<void> {
    const outputPath = compilation.outputOptions.path;
    
    // 安全检查 1：验证输出路径
    this.validateOutputPath(outputPath);
    
    // 获取要删除的文件
    const toDelete = await this.getFilesToDelete(
      compilation,
      outputPath
    );
    
    // 安全检查 2：数量限制
    if (toDelete.length > this.options.maxDeleteCount!) {
      throw new Error(
        `Too many files to delete (${toDelete.length}). ` +
        `This might be a misconfiguration.`
      );
    }
    
    // 安全检查 3：保护重要文件
    for (const file of toDelete) {
      if (this.isProtected(file)) {
        throw new Error(`Attempted to delete protected file: ${file}`);
      }
    }
    
    // 执行删除
    for (const file of toDelete) {
      const filePath = path.join(outputPath, file);
      await fs.promises.unlink(filePath);
    }
  }
  
  private validateOutputPath(outputPath: string): void {
    // 不允许是根目录
    if (outputPath === '/' || outputPath === 'C:\\') {
      throw new Error('Cannot clean root directory');
    }
    
    // 不允许是用户目录
    const homeDir = require('os').homedir();
    if (outputPath === homeDir) {
      throw new Error('Cannot clean home directory');
    }
    
    // 必须包含 dist、build 等关键词
    const safePaths = ['dist', 'build', 'output', 'out'];
    const hasSafePath = safePaths.some(p => 
      outputPath.includes(p)
    );
    
    if (!hasSafePath) {
      throw new Error(
        'Output path must contain "dist", "build", "output", or "out"'
      );
    }
  }
  
  private isProtected(file: string): boolean {
    return this.options.protectedPatterns!.some(pattern => 
      pattern.test(file)
    );
  }
  
  private async getFilesToDelete(
    compilation: Compilation,
    outputPath: string
  ): Promise<string[]> {
    const currentAssets = new Set(
      compilation.getAssets().map(a => a.name)
    );
    
    const existingFiles = await this.getExistingFiles(outputPath);
    
    return existingFiles.filter(file => !currentAssets.has(file));
  }
}

interface SafeCleanOptions {
  protectedPatterns?: RegExp[];
  maxDeleteCount?: number;
}
```

### 回收站机制

```typescript
class TrashCleanPlugin {
  private trashDir: string;
  
  constructor(options: TrashCleanOptions = {}) {
    this.trashDir = options.trashDir || '.webpack-trash';
  }
  
  apply(compiler: Compiler): void {
    compiler.hooks.emit.tapAsync(
      'TrashCleanPlugin',
      async (compilation, callback) => {
        await this.moveToTrash(compilation);
        callback();
      }
    );
    
    // 定期清理回收站
    compiler.hooks.done.tapAsync(
      'TrashCleanPlugin',
      async (_, callback) => {
        await this.cleanTrash();
        callback();
      }
    );
  }
  
  private async moveToTrash(compilation: Compilation): Promise<void> {
    const outputPath = compilation.outputOptions.path;
    const trashPath = path.join(outputPath, this.trashDir);
    
    // 确保回收站目录存在
    await fs.promises.mkdir(trashPath, { recursive: true });
    
    // 获取要移动的文件
    const currentAssets = new Set(
      compilation.getAssets().map(a => a.name)
    );
    
    const existingFiles = await this.getExistingFiles(outputPath);
    
    for (const file of existingFiles) {
      // 跳过当前资源和回收站
      if (currentAssets.has(file) || file.startsWith(this.trashDir)) {
        continue;
      }
      
      const srcPath = path.join(outputPath, file);
      const destPath = path.join(
        trashPath,
        `${Date.now()}_${file.replace(/\//g, '_')}`
      );
      
      await fs.promises.rename(srcPath, destPath);
    }
  }
  
  private async cleanTrash(): Promise<void> {
    const trashPath = this.trashDir;
    
    if (!await this.exists(trashPath)) {
      return;
    }
    
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7天
    const now = Date.now();
    
    const entries = await fs.promises.readdir(trashPath);
    
    for (const entry of entries) {
      const fullPath = path.join(trashPath, entry);
      const stats = await fs.promises.stat(fullPath);
      
      if (now - stats.mtimeMs > maxAge) {
        await fs.promises.unlink(fullPath);
      }
    }
  }
  
  // 恢复文件
  async restore(file: string): Promise<void> {
    const trashPath = path.join(this.trashDir);
    const entries = await fs.promises.readdir(trashPath);
    
    const match = entries.find(e => e.includes(file.replace(/\//g, '_')));
    
    if (match) {
      const srcPath = path.join(trashPath, match);
      const destPath = file;
      
      await fs.promises.rename(srcPath, destPath);
    }
  }
}

interface TrashCleanOptions {
  trashDir?: string;
}
```

## 配置示例

### Webpack 配置

```typescript
// webpack.config.js
module.exports = {
  output: {
    path: path.resolve(__dirname, 'dist'),
    clean: true, // 简单清理
  },
};

// 或使用详细配置
module.exports = {
  output: {
    path: path.resolve(__dirname, 'dist'),
    clean: {
      dry: true, // 模拟运行
      keep: /\.gitkeep$/, // 保留 .gitkeep 文件
    },
  },
};

// 使用函数
module.exports = {
  output: {
    clean: {
      keep(asset) {
        // 保留 index.html
        return asset.includes('index.html');
      },
    },
  },
};
```

## 总结

输出文件清理的核心要点：

**清理策略**：
- 基于资源比对
- 基于时间过期
- 基于 manifest

**安全机制**：
- 路径验证
- 保护规则
- 数量限制

**高级功能**：
- 空目录清理
- 回收站机制
- 文件恢复

**配置灵活性**：
- 简单开关
- 保留规则
- 自定义函数

**下一章**：我们将学习输出统计信息的收集与展示。
