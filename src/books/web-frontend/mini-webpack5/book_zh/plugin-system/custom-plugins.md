---
sidebar_position: 140
title: "自定义插件开发"
---

# 自定义插件开发

掌握了 Webpack 钩子机制后，我们可以开发自定义插件来扩展构建功能。本章学习插件开发的完整流程。

## 插件开发基础

### 插件结构

```typescript
// 最基本的插件结构
class MyPlugin {
  // 可选：接收配置
  constructor(options?: MyPluginOptions) {
    this.options = options || {};
  }
  
  // 必须：apply 方法
  apply(compiler: Compiler): void {
    // 在这里注册钩子
  }
}

interface MyPluginOptions {
  // 配置项定义
}
```

### 插件命名规范

```typescript
// 使用有意义的名称
const PLUGIN_NAME = 'MyCustomPlugin';

class MyCustomPlugin {
  apply(compiler: Compiler): void {
    // 使用常量作为插件名
    compiler.hooks.done.tap(PLUGIN_NAME, (stats) => {
      // ...
    });
  }
}
```

## 实用插件示例

### 构建通知插件

```typescript
class BuildNotifierPlugin {
  private options: BuildNotifierOptions;
  
  constructor(options: BuildNotifierOptions = {}) {
    this.options = {
      title: 'Webpack',
      successSound: true,
      errorSound: true,
      ...options,
    };
  }
  
  apply(compiler: Compiler): void {
    const { title } = this.options;
    
    compiler.hooks.done.tap('BuildNotifierPlugin', (stats) => {
      const time = stats.endTime - stats.startTime;
      
      if (stats.hasErrors()) {
        this.notify({
          title: `${title} - Error`,
          message: `Build failed in ${time}ms`,
          type: 'error',
        });
      } else if (stats.hasWarnings()) {
        this.notify({
          title: `${title} - Warning`,
          message: `Build completed with warnings in ${time}ms`,
          type: 'warning',
        });
      } else {
        this.notify({
          title: `${title} - Success`,
          message: `Build completed in ${time}ms`,
          type: 'success',
        });
      }
    });
  }
  
  private notify(options: NotifyOptions): void {
    // 实现系统通知
    console.log(`[${options.type}] ${options.title}: ${options.message}`);
    
    // 可以使用 node-notifier 等库
    // notifier.notify(options);
  }
}

interface BuildNotifierOptions {
  title?: string;
  successSound?: boolean;
  errorSound?: boolean;
}
```

### 文件大小分析插件

```typescript
class FileSizeAnalyzerPlugin {
  private options: FileSizeAnalyzerOptions;
  
  constructor(options: FileSizeAnalyzerOptions = {}) {
    this.options = {
      outputFile: 'file-sizes.json',
      warnThreshold: 250 * 1024,  // 250KB
      errorThreshold: 500 * 1024, // 500KB
      ...options,
    };
  }
  
  apply(compiler: Compiler): void {
    compiler.hooks.compilation.tap('FileSizeAnalyzer', (compilation) => {
      compilation.hooks.processAssets.tap(
        {
          name: 'FileSizeAnalyzer',
          stage: Compilation.PROCESS_ASSETS_STAGE_REPORT,
        },
        (assets) => {
          const analysis = this.analyzeAssets(assets);
          
          // 输出分析报告
          this.reportToConsole(analysis);
          
          // 生成 JSON 报告
          this.generateJsonReport(compilation, analysis);
          
          // 添加警告/错误
          this.checkThresholds(compilation, analysis);
        }
      );
    });
  }
  
  private analyzeAssets(assets: Record<string, Source>): AssetAnalysis[] {
    return Object.entries(assets).map(([name, source]) => ({
      name,
      size: source.size(),
      gzipSize: this.estimateGzipSize(source),
      type: this.getAssetType(name),
    }));
  }
  
  private estimateGzipSize(source: Source): number {
    // 简化实现，实际应使用 zlib
    return Math.round(source.size() * 0.3);
  }
  
  private getAssetType(name: string): string {
    if (name.endsWith('.js')) return 'javascript';
    if (name.endsWith('.css')) return 'stylesheet';
    if (/\.(png|jpg|gif|svg)$/.test(name)) return 'image';
    return 'other';
  }
  
  private reportToConsole(analysis: AssetAnalysis[]): void {
    console.log('\n📦 Asset Size Analysis:\n');
    
    const sorted = [...analysis].sort((a, b) => b.size - a.size);
    
    for (const asset of sorted) {
      const icon = this.getSizeIcon(asset.size);
      const size = this.formatSize(asset.size);
      const gzip = this.formatSize(asset.gzipSize);
      
      console.log(`  ${icon} ${asset.name}`);
      console.log(`     Size: ${size} (gzip: ${gzip})\n`);
    }
  }
  
  private getSizeIcon(size: number): string {
    if (size > this.options.errorThreshold!) return '🔴';
    if (size > this.options.warnThreshold!) return '🟡';
    return '🟢';
  }
  
  private formatSize(bytes: number): string {
    const units = ['B', 'KB', 'MB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }
  
  private generateJsonReport(
    compilation: Compilation,
    analysis: AssetAnalysis[]
  ): void {
    const report = {
      timestamp: new Date().toISOString(),
      hash: compilation.hash,
      assets: analysis,
      summary: {
        totalSize: analysis.reduce((sum, a) => sum + a.size, 0),
        totalGzipSize: analysis.reduce((sum, a) => sum + a.gzipSize, 0),
        count: analysis.length,
      },
    };
    
    compilation.emitAsset(
      this.options.outputFile!,
      new RawSource(JSON.stringify(report, null, 2))
    );
  }
  
  private checkThresholds(
    compilation: Compilation,
    analysis: AssetAnalysis[]
  ): void {
    for (const asset of analysis) {
      if (asset.size > this.options.errorThreshold!) {
        compilation.errors.push(
          new WebpackError(
            `Asset "${asset.name}" exceeds error threshold ` +
            `(${this.formatSize(asset.size)} > ${this.formatSize(this.options.errorThreshold!)})`
          )
        );
      } else if (asset.size > this.options.warnThreshold!) {
        compilation.warnings.push(
          new WebpackError(
            `Asset "${asset.name}" exceeds warning threshold ` +
            `(${this.formatSize(asset.size)} > ${this.formatSize(this.options.warnThreshold!)})`
          )
        );
      }
    }
  }
}

interface FileSizeAnalyzerOptions {
  outputFile?: string;
  warnThreshold?: number;
  errorThreshold?: number;
}

interface AssetAnalysis {
  name: string;
  size: number;
  gzipSize: number;
  type: string;
}
```

### 环境变量注入插件

```typescript
class EnvInjectorPlugin {
  private prefix: string;
  private definitions: Record<string, string>;
  
  constructor(options: EnvInjectorOptions = {}) {
    this.prefix = options.prefix || 'APP_';
    this.definitions = this.collectEnvVars();
  }
  
  apply(compiler: Compiler): void {
    // 使用 DefinePlugin 的方式注入
    compiler.hooks.compilation.tap(
      'EnvInjectorPlugin',
      (compilation, { normalModuleFactory }) => {
        const handler = (parser: JavascriptParser) => {
          for (const [key, value] of Object.entries(this.definitions)) {
            const fullKey = `process.env.${key}`;
            
            parser.hooks.expression.for(fullKey).tap(
              'EnvInjectorPlugin',
              (expr) => {
                const dep = new ConstDependency(
                  JSON.stringify(value),
                  expr.range
                );
                parser.state.current.addDependency(dep);
                return true;
              }
            );
          }
        };
        
        normalModuleFactory.hooks.parser
          .for('javascript/auto')
          .tap('EnvInjectorPlugin', handler);
        
        normalModuleFactory.hooks.parser
          .for('javascript/esm')
          .tap('EnvInjectorPlugin', handler);
      }
    );
  }
  
  private collectEnvVars(): Record<string, string> {
    const result: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith(this.prefix) && value !== undefined) {
        result[key] = value;
      }
    }
    
    return result;
  }
}

interface EnvInjectorOptions {
  prefix?: string;
}
```

### 模块联邦检查插件

```typescript
class ModuleFederationCheckerPlugin {
  apply(compiler: Compiler): void {
    compiler.hooks.compilation.tap(
      'ModuleFederationChecker',
      (compilation) => {
        compilation.hooks.afterOptimizeChunks.tap(
          'ModuleFederationChecker',
          (chunks) => {
            // 检查共享模块
            this.checkSharedModules(compilation);
            
            // 检查远程模块
            this.checkRemoteModules(compilation);
          }
        );
      }
    );
  }
  
  private checkSharedModules(compilation: Compilation): void {
    const sharedModules = new Set<string>();
    
    for (const module of compilation.modules) {
      if (module.type === 'share-module') {
        sharedModules.add(module.identifier());
      }
    }
    
    if (sharedModules.size > 0) {
      console.log('\n📤 Shared Modules:');
      for (const mod of sharedModules) {
        console.log(`  - ${mod}`);
      }
    }
  }
  
  private checkRemoteModules(compilation: Compilation): void {
    const remoteModules = new Set<string>();
    
    for (const module of compilation.modules) {
      if (module.type === 'remote-module') {
        remoteModules.add(module.identifier());
      }
    }
    
    if (remoteModules.size > 0) {
      console.log('\n📥 Remote Modules:');
      for (const mod of remoteModules) {
        console.log(`  - ${mod}`);
      }
    }
  }
}
```

### 构建时间追踪插件

```typescript
class BuildTimeTrackerPlugin {
  private timings: Map<string, { start: number; end?: number }> = new Map();
  
  apply(compiler: Compiler): void {
    // 追踪各阶段时间
    this.trackPhase(compiler, 'beforeRun', 'run');
    this.trackPhase(compiler, 'compile', 'make');
    this.trackPhase(compiler, 'make', 'seal');
    this.trackPhase(compiler, 'emit', 'afterEmit');
    
    // 输出报告
    compiler.hooks.done.tap('BuildTimeTracker', (stats) => {
      this.printReport(stats);
    });
  }
  
  private trackPhase(
    compiler: Compiler,
    startHook: string,
    endHook: string
  ): void {
    const phaseName = `${startHook} -> ${endHook}`;
    
    (compiler.hooks as any)[startHook].tap('BuildTimeTracker', () => {
      this.timings.set(phaseName, { start: Date.now() });
    });
    
    (compiler.hooks as any)[endHook].tap('BuildTimeTracker', () => {
      const timing = this.timings.get(phaseName);
      if (timing) {
        timing.end = Date.now();
      }
    });
  }
  
  private printReport(stats: Stats): void {
    console.log('\n⏱️  Build Time Breakdown:\n');
    
    const total = stats.endTime - stats.startTime;
    
    for (const [phase, timing] of this.timings) {
      if (timing.end) {
        const duration = timing.end - timing.start;
        const percentage = ((duration / total) * 100).toFixed(1);
        const bar = this.createBar(duration, total);
        
        console.log(`  ${phase}`);
        console.log(`  ${bar} ${duration}ms (${percentage}%)\n`);
      }
    }
    
    console.log(`  Total: ${total}ms\n`);
  }
  
  private createBar(value: number, total: number): string {
    const width = 30;
    const filled = Math.round((value / total) * width);
    const empty = width - filled;
    
    return '█'.repeat(filled) + '░'.repeat(empty);
  }
}
```

## 插件测试

### 单元测试

```typescript
import webpack from 'webpack';

describe('MyPlugin', () => {
  it('should add banner to assets', (done) => {
    const compiler = webpack({
      entry: './test/fixtures/entry.js',
      output: {
        path: '/dist',
        filename: 'bundle.js',
      },
      plugins: [
        new BannerPlugin({ banner: 'Test Banner' }),
      ],
    });
    
    // 使用内存文件系统
    compiler.outputFileSystem = new MemoryFileSystem();
    
    compiler.run((err, stats) => {
      expect(err).toBeNull();
      expect(stats?.hasErrors()).toBe(false);
      
      const output = compiler.outputFileSystem.readFileSync(
        '/dist/bundle.js',
        'utf8'
      );
      
      expect(output).toContain('Test Banner');
      done();
    });
  });
});
```

### 集成测试

```typescript
describe('FileSizeAnalyzerPlugin', () => {
  it('should generate size report', async () => {
    const plugin = new FileSizeAnalyzerPlugin({
      outputFile: 'report.json',
      warnThreshold: 100,
    });
    
    const stats = await runWebpack({
      plugins: [plugin],
    });
    
    const report = JSON.parse(
      stats.compilation.assets['report.json'].source()
    );
    
    expect(report.assets).toBeArray();
    expect(report.summary.count).toBeGreaterThan(0);
  });
});
```

## 发布插件

### package.json

```json
{
  "name": "webpack-plugin-example",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "peerDependencies": {
    "webpack": "^5.0.0"
  },
  "keywords": [
    "webpack",
    "plugin"
  ]
}
```

### 导出

```typescript
// src/index.ts
export { MyPlugin } from './MyPlugin';
export type { MyPluginOptions } from './types';
```

## 总结

自定义插件开发的要点：

**结构规范**：
- apply 方法入口
- 使用常量命名
- 参数验证

**常见模式**：
- 资源处理
- 构建分析
- 环境注入

**测试方法**：
- 单元测试
- 集成测试
- 内存文件系统

**发布准备**：
- 类型定义
- 文档完善
- 版本兼容

**下一章**：我们将学习插件间的通信机制。
