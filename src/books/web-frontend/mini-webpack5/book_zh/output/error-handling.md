---
sidebar_position: 133
title: "错误处理与恢复"
---

# 错误处理与恢复

Webpack 在输出阶段需要处理各种错误情况，并提供恢复机制。本章深入理解错误处理的实现。

## 错误类型

### 输出错误分类

```typescript
// 基础错误类
class WebpackError extends Error {
  name: string = 'WebpackError';
  module?: Module;
  chunk?: Chunk;
  file?: string;
  loc?: SourceLocation;
  
  constructor(message: string) {
    super(message);
  }
}

// 文件系统错误
class FileSystemError extends WebpackError {
  name = 'FileSystemError';
  code: string;
  path: string;
  
  constructor(err: NodeJS.ErrnoException, path: string) {
    super(`${err.message} (${path})`);
    this.code = err.code || 'UNKNOWN';
    this.path = path;
  }
  
  static isRecoverable(code: string): boolean {
    // 可恢复的错误
    const recoverableCodes = ['EBUSY', 'ENOENT', 'EPERM'];
    return recoverableCodes.includes(code);
  }
}

// 资源错误
class AssetError extends WebpackError {
  name = 'AssetError';
  assetName: string;
  
  constructor(assetName: string, message: string) {
    super(`Asset "${assetName}": ${message}`);
    this.assetName = assetName;
  }
}

// 路径错误
class PathError extends WebpackError {
  name = 'PathError';
  
  constructor(message: string, public readonly invalidPath: string) {
    super(`${message}: ${invalidPath}`);
  }
}
```

### 错误收集器

```typescript
class ErrorCollector {
  private errors: WebpackError[] = [];
  private warnings: WebpackError[] = [];
  
  addError(error: WebpackError): void {
    this.errors.push(error);
  }
  
  addWarning(warning: WebpackError): void {
    this.warnings.push(warning);
  }
  
  hasErrors(): boolean {
    return this.errors.length > 0;
  }
  
  hasWarnings(): boolean {
    return this.warnings.length > 0;
  }
  
  getErrors(): WebpackError[] {
    return [...this.errors];
  }
  
  getWarnings(): WebpackError[] {
    return [...this.warnings];
  }
  
  clear(): void {
    this.errors = [];
    this.warnings = [];
  }
  
  merge(other: ErrorCollector): void {
    this.errors.push(...other.errors);
    this.warnings.push(...other.warnings);
  }
}
```

## 错误处理策略

### 重试机制

```typescript
class RetryableEmitter {
  private maxRetries: number;
  private retryDelay: number;
  
  constructor(options: RetryOptions = {}) {
    this.maxRetries = options.maxRetries ?? 3;
    this.retryDelay = options.retryDelay ?? 100;
  }
  
  async emitWithRetry(
    path: string,
    content: Buffer,
    fs: OutputFileSystem
  ): Promise<EmitResult> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        await this.emit(path, content, fs);
        
        return {
          success: true,
          attempts: attempt + 1,
        };
      } catch (err: any) {
        lastError = err;
        
        // 检查是否可重试
        if (!this.isRetryable(err)) {
          break;
        }
        
        // 等待后重试
        if (attempt < this.maxRetries - 1) {
          await this.delay(this.retryDelay * Math.pow(2, attempt));
        }
      }
    }
    
    return {
      success: false,
      error: lastError!,
      attempts: this.maxRetries,
    };
  }
  
  private async emit(
    path: string,
    content: Buffer,
    fs: OutputFileSystem
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      fs.writeFile(path, content, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
  
  private isRetryable(err: NodeJS.ErrnoException): boolean {
    const retryableCodes = [
      'EBUSY',    // 文件忙
      'EAGAIN',   // 资源暂时不可用
      'ENOENT',   // 目录不存在（可能正在创建）
    ];
    
    return retryableCodes.includes(err.code || '');
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
}

interface EmitResult {
  success: boolean;
  error?: Error;
  attempts: number;
}
```

### 回滚机制

```typescript
class TransactionalEmitter {
  private emittedFiles: Set<string> = new Set();
  private backups: Map<string, Buffer> = new Map();
  
  async emitTransaction(
    assets: Asset[],
    outputPath: string,
    fs: OutputFileSystem
  ): Promise<void> {
    try {
      // 备份现有文件
      await this.backup(assets, outputPath, fs);
      
      // 写入新文件
      for (const asset of assets) {
        const targetPath = path.join(outputPath, asset.name);
        await this.emitAsset(targetPath, asset.source, fs);
        this.emittedFiles.add(targetPath);
      }
      
      // 成功，清理备份
      this.clearBackups();
    } catch (err) {
      // 失败，回滚
      await this.rollback(fs);
      throw err;
    }
  }
  
  private async backup(
    assets: Asset[],
    outputPath: string,
    fs: OutputFileSystem
  ): Promise<void> {
    for (const asset of assets) {
      const targetPath = path.join(outputPath, asset.name);
      
      try {
        const content = await this.readFile(targetPath, fs);
        this.backups.set(targetPath, content);
      } catch {
        // 文件不存在，无需备份
      }
    }
  }
  
  private async rollback(fs: OutputFileSystem): Promise<void> {
    // 删除新写入的文件
    for (const file of this.emittedFiles) {
      try {
        await this.deleteFile(file, fs);
      } catch {
        // 忽略删除错误
      }
    }
    
    // 恢复备份
    for (const [file, content] of this.backups) {
      try {
        await this.writeFile(file, content, fs);
      } catch {
        console.error(`Failed to restore backup: ${file}`);
      }
    }
    
    this.emittedFiles.clear();
    this.backups.clear();
  }
  
  private clearBackups(): void {
    this.emittedFiles.clear();
    this.backups.clear();
  }
  
  private readFile(path: string, fs: OutputFileSystem): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      (fs as any).readFile(path, (err: Error, data: Buffer) => {
        if (err) reject(err);
        else resolve(data);
      });
    });
  }
  
  private writeFile(
    path: string,
    content: Buffer,
    fs: OutputFileSystem
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      fs.writeFile(path, content, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
  
  private deleteFile(path: string, fs: OutputFileSystem): Promise<void> {
    return new Promise((resolve, reject) => {
      (fs as any).unlink(path, (err: Error) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}
```

## 部分成功处理

### 部分输出

```typescript
class PartialEmitter {
  async emit(
    assets: Asset[],
    outputPath: string,
    fs: OutputFileSystem
  ): Promise<PartialEmitResult> {
    const result: PartialEmitResult = {
      successful: [],
      failed: [],
      skipped: [],
    };
    
    for (const asset of assets) {
      const targetPath = path.join(outputPath, asset.name);
      
      try {
        await this.emitAsset(targetPath, asset.source, fs);
        result.successful.push(asset.name);
      } catch (err: any) {
        const error = new AssetError(asset.name, err.message);
        
        // 决定是否继续
        if (this.isCritical(asset)) {
          result.failed.push({ name: asset.name, error });
          throw new CriticalAssetError(error);
        }
        
        result.failed.push({ name: asset.name, error });
      }
    }
    
    return result;
  }
  
  private isCritical(asset: Asset): boolean {
    // 入口文件是关键的
    if (asset.info.isEntry) {
      return true;
    }
    
    // runtime 是关键的
    if (asset.info.isRuntime) {
      return true;
    }
    
    return false;
  }
}

interface PartialEmitResult {
  successful: string[];
  failed: Array<{ name: string; error: AssetError }>;
  skipped: string[];
}
```

### 错误恢复

```typescript
class ErrorRecovery {
  private strategies: Map<string, RecoveryStrategy>;
  
  constructor() {
    this.strategies = new Map([
      ['ENOENT', this.handleNotFound.bind(this)],
      ['EACCES', this.handlePermission.bind(this)],
      ['ENOSPC', this.handleNoSpace.bind(this)],
      ['EBUSY', this.handleBusy.bind(this)],
    ]);
  }
  
  async recover(
    err: NodeJS.ErrnoException,
    context: RecoveryContext
  ): Promise<RecoveryResult> {
    const code = err.code || 'UNKNOWN';
    const strategy = this.strategies.get(code);
    
    if (!strategy) {
      return {
        recovered: false,
        error: err,
        suggestion: 'Unknown error, manual intervention required',
      };
    }
    
    return strategy(err, context);
  }
  
  private async handleNotFound(
    err: NodeJS.ErrnoException,
    context: RecoveryContext
  ): Promise<RecoveryResult> {
    // 尝试创建目录
    const dir = path.dirname(context.path);
    
    try {
      await fs.promises.mkdir(dir, { recursive: true });
      
      // 重试写入
      await fs.promises.writeFile(context.path, context.content);
      
      return { recovered: true };
    } catch (retryErr) {
      return {
        recovered: false,
        error: retryErr as Error,
        suggestion: 'Failed to create directory',
      };
    }
  }
  
  private async handlePermission(
    err: NodeJS.ErrnoException,
    context: RecoveryContext
  ): Promise<RecoveryResult> {
    return {
      recovered: false,
      error: err,
      suggestion: `No write permission for ${context.path}. ` +
        `Try changing file permissions or running as admin.`,
    };
  }
  
  private async handleNoSpace(
    err: NodeJS.ErrnoException,
    context: RecoveryContext
  ): Promise<RecoveryResult> {
    return {
      recovered: false,
      error: err,
      suggestion: 'Disk is full. Free up some space and try again.',
    };
  }
  
  private async handleBusy(
    err: NodeJS.ErrnoException,
    context: RecoveryContext
  ): Promise<RecoveryResult> {
    // 等待并重试
    await this.delay(100);
    
    try {
      await fs.promises.writeFile(context.path, context.content);
      return { recovered: true };
    } catch (retryErr) {
      return {
        recovered: false,
        error: retryErr as Error,
        suggestion: 'File is locked by another process',
      };
    }
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

interface RecoveryContext {
  path: string;
  content: Buffer;
  asset?: Asset;
}

interface RecoveryResult {
  recovered: boolean;
  error?: Error;
  suggestion?: string;
}

type RecoveryStrategy = (
  err: NodeJS.ErrnoException,
  context: RecoveryContext
) => Promise<RecoveryResult>;
```

## 错误报告

### 友好错误输出

```typescript
class FriendlyErrorReporter {
  report(errors: WebpackError[]): string {
    const output: string[] = [];
    
    output.push('\x1b[31m═══ Build Failed ═══\x1b[0m\n');
    
    for (const error of errors) {
      output.push(this.formatError(error));
    }
    
    output.push(this.getSuggestions(errors));
    
    return output.join('\n');
  }
  
  private formatError(error: WebpackError): string {
    const lines: string[] = [];
    
    // 错误类型图标
    const icon = this.getErrorIcon(error);
    lines.push(`${icon} \x1b[31m${error.name}\x1b[0m`);
    
    // 位置信息
    if (error.file) {
      lines.push(`   File: ${error.file}`);
    }
    
    if (error.loc) {
      lines.push(`   Location: Line ${error.loc.line}, Column ${error.loc.column}`);
    }
    
    // 错误消息
    lines.push(`   ${error.message}`);
    
    lines.push('');
    
    return lines.join('\n');
  }
  
  private getErrorIcon(error: WebpackError): string {
    if (error instanceof FileSystemError) {
      return '📁';
    }
    if (error instanceof AssetError) {
      return '📦';
    }
    if (error instanceof PathError) {
      return '🔗';
    }
    return '❌';
  }
  
  private getSuggestions(errors: WebpackError[]): string {
    const suggestions: string[] = ['\n\x1b[33mSuggestions:\x1b[0m'];
    
    const hasFileSystemError = errors.some(e => e instanceof FileSystemError);
    const hasPathError = errors.some(e => e instanceof PathError);
    
    if (hasFileSystemError) {
      suggestions.push('  • Check disk space and file permissions');
      suggestions.push('  • Ensure no other process is using the files');
    }
    
    if (hasPathError) {
      suggestions.push('  • Verify output.path configuration');
      suggestions.push('  • Check for invalid characters in filenames');
    }
    
    return suggestions.join('\n');
  }
}
```

### 错误日志

```typescript
class ErrorLogger {
  private logPath: string;
  
  constructor(logPath: string) {
    this.logPath = logPath;
  }
  
  async log(errors: WebpackError[]): Promise<void> {
    const logEntry: ErrorLogEntry = {
      timestamp: new Date().toISOString(),
      errors: errors.map(e => this.serializeError(e)),
      system: await this.getSystemInfo(),
    };
    
    await this.appendToLog(logEntry);
  }
  
  private serializeError(error: WebpackError): SerializedError {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      file: error.file,
      loc: error.loc,
      code: (error as any).code,
    };
  }
  
  private async getSystemInfo(): Promise<SystemInfo> {
    return {
      platform: process.platform,
      nodeVersion: process.version,
      memory: process.memoryUsage(),
      cwd: process.cwd(),
    };
  }
  
  private async appendToLog(entry: ErrorLogEntry): Promise<void> {
    const line = JSON.stringify(entry) + '\n';
    
    await fs.promises.appendFile(this.logPath, line);
  }
}

interface ErrorLogEntry {
  timestamp: string;
  errors: SerializedError[];
  system: SystemInfo;
}
```

## 完整示例

### Compiler 集成

```typescript
class ResilientCompiler extends Compiler {
  private retryEmitter: RetryableEmitter;
  private errorRecovery: ErrorRecovery;
  private errorReporter: FriendlyErrorReporter;
  
  constructor(context: string) {
    super(context);
    
    this.retryEmitter = new RetryableEmitter({ maxRetries: 3 });
    this.errorRecovery = new ErrorRecovery();
    this.errorReporter = new FriendlyErrorReporter();
  }
  
  async emitAssets(compilation: Compilation): Promise<void> {
    const outputPath = compilation.outputOptions.path;
    const assets = compilation.getAssets();
    const errors: WebpackError[] = [];
    
    for (const asset of assets) {
      const targetPath = path.join(outputPath, asset.name);
      const content = asset.source.buffer();
      
      // 带重试的写入
      const result = await this.retryEmitter.emitWithRetry(
        targetPath,
        content,
        this.outputFileSystem
      );
      
      if (!result.success) {
        // 尝试恢复
        const recovery = await this.errorRecovery.recover(
          result.error as NodeJS.ErrnoException,
          { path: targetPath, content, asset }
        );
        
        if (!recovery.recovered) {
          errors.push(new AssetError(
            asset.name,
            recovery.suggestion || result.error!.message
          ));
        }
      }
    }
    
    if (errors.length > 0) {
      // 报告错误
      console.error(this.errorReporter.report(errors));
      
      // 添加到 compilation
      for (const error of errors) {
        compilation.errors.push(error);
      }
    }
  }
}
```

## 总结

错误处理与恢复的核心要点：

**错误类型**：
- 文件系统错误
- 资源错误
- 路径错误

**处理策略**：
- 重试机制
- 回滚机制
- 部分成功

**恢复机制**：
- 按错误类型恢复
- 自动创建目录
- 等待并重试

**错误报告**：
- 友好格式化
- 建议提供
- 日志记录

**下一章**：我们将进入 Plugin 系统部分，学习插件架构设计。
