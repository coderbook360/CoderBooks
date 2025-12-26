---
sidebar_position: 132
title: "输出统计信息"
---

# 输出统计信息

Webpack 的 Stats 系统提供了详尽的编译统计信息，用于分析和调试。本章深入理解 Stats 的实现。

## Stats 结构

### 核心类定义

```typescript
class Stats {
  private compilation: Compilation;
  
  constructor(compilation: Compilation) {
    this.compilation = compilation;
  }
  
  // 是否有错误
  hasErrors(): boolean {
    return this.compilation.errors.length > 0;
  }
  
  // 是否有警告
  hasWarnings(): boolean {
    return this.compilation.warnings.length > 0;
  }
  
  // 获取 hash
  get hash(): string | undefined {
    return this.compilation.hash;
  }
  
  // 生成 JSON 格式
  toJson(options?: StatsOptions): StatsJson {
    const normalizedOptions = this.normalizeOptions(options);
    return new StatsJsonGenerator(this.compilation).generate(normalizedOptions);
  }
  
  // 生成字符串格式
  toString(options?: StatsOptions): string {
    const normalizedOptions = this.normalizeOptions(options);
    const json = this.toJson(normalizedOptions);
    return new StatsStringGenerator().generate(json, normalizedOptions);
  }
  
  private normalizeOptions(options?: StatsOptions): NormalizedStatsOptions {
    if (typeof options === 'string') {
      return STATS_PRESETS[options] || STATS_PRESETS.normal;
    }
    
    return {
      ...STATS_PRESETS.normal,
      ...options,
    };
  }
}
```

### 预设配置

```typescript
const STATS_PRESETS: Record<string, NormalizedStatsOptions> = {
  none: {
    all: false,
  },
  
  errors: {
    all: false,
    errors: true,
    errorsCount: true,
  },
  
  'errors-warnings': {
    all: false,
    errors: true,
    warnings: true,
    errorsCount: true,
    warningsCount: true,
  },
  
  minimal: {
    all: false,
    modules: true,
    assets: true,
    errors: true,
    warnings: true,
  },
  
  normal: {
    all: false,
    hash: true,
    version: true,
    timings: true,
    builtAt: true,
    assets: true,
    entrypoints: true,
    chunks: true,
    modules: true,
    errors: true,
    warnings: true,
  },
  
  detailed: {
    all: true,
    chunkModules: true,
    chunkOrigins: true,
    depth: true,
    reasons: true,
  },
  
  verbose: {
    all: true,
    chunkModules: true,
    chunkOrigins: true,
    depth: true,
    reasons: true,
    source: true,
  },
};
```

## JSON 生成器

### StatsJsonGenerator

```typescript
class StatsJsonGenerator {
  private compilation: Compilation;
  
  constructor(compilation: Compilation) {
    this.compilation = compilation;
  }
  
  generate(options: NormalizedStatsOptions): StatsJson {
    const json: StatsJson = {};
    
    if (options.hash) {
      json.hash = this.compilation.hash;
    }
    
    if (options.version) {
      json.version = '5.0.0';
    }
    
    if (options.timings) {
      json.time = this.compilation.endTime - this.compilation.startTime;
    }
    
    if (options.builtAt) {
      json.builtAt = this.compilation.endTime;
    }
    
    if (options.assets) {
      json.assets = this.generateAssets(options);
    }
    
    if (options.chunks) {
      json.chunks = this.generateChunks(options);
    }
    
    if (options.modules) {
      json.modules = this.generateModules(options);
    }
    
    if (options.entrypoints) {
      json.entrypoints = this.generateEntrypoints(options);
    }
    
    if (options.errors) {
      json.errors = this.generateErrors();
    }
    
    if (options.warnings) {
      json.warnings = this.generateWarnings();
    }
    
    json.errorsCount = this.compilation.errors.length;
    json.warningsCount = this.compilation.warnings.length;
    
    return json;
  }
  
  private generateAssets(options: NormalizedStatsOptions): AssetStats[] {
    return this.compilation.getAssets().map(asset => ({
      name: asset.name,
      size: asset.source.size(),
      chunks: asset.info.chunks || [],
      chunkNames: asset.info.chunkNames || [],
      emitted: asset.info.emitted ?? true,
      comparedForEmit: asset.info.comparedForEmit ?? false,
      isOverSizeLimit: asset.info.isOverSizeLimit ?? false,
    }));
  }
  
  private generateChunks(options: NormalizedStatsOptions): ChunkStats[] {
    return Array.from(this.compilation.chunks).map(chunk => {
      const stats: ChunkStats = {
        id: chunk.id,
        names: chunk.name ? [chunk.name] : [],
        files: Array.from(chunk.files),
        size: this.getChunkSize(chunk),
        entry: chunk.hasRuntime(),
        initial: chunk.canBeInitial(),
        rendered: true,
      };
      
      if (options.chunkModules) {
        stats.modules = this.getChunkModules(chunk, options);
      }
      
      if (options.chunkOrigins) {
        stats.origins = this.getChunkOrigins(chunk);
      }
      
      return stats;
    });
  }
  
  private generateModules(options: NormalizedStatsOptions): ModuleStats[] {
    return Array.from(this.compilation.modules).map(module => {
      const stats: ModuleStats = {
        id: module.id,
        identifier: module.identifier(),
        name: module.readableIdentifier(this.compilation.requestShortener),
        size: module.size(),
        built: module.buildInfo?.built ?? false,
        cacheable: module.buildInfo?.cacheable ?? true,
      };
      
      if (options.reasons) {
        stats.reasons = this.getModuleReasons(module);
      }
      
      if (options.source && module.originalSource) {
        stats.source = module.originalSource().source();
      }
      
      if (options.depth) {
        stats.depth = module.depth;
      }
      
      return stats;
    });
  }
  
  private generateEntrypoints(options: NormalizedStatsOptions): Record<string, EntrypointStats> {
    const entrypoints: Record<string, EntrypointStats> = {};
    
    for (const [name, entrypoint] of this.compilation.entrypoints) {
      const assets = this.getEntrypointAssets(entrypoint);
      
      entrypoints[name] = {
        name,
        chunks: entrypoint.chunks.map(c => c.id),
        assets: assets.map(a => ({ name: a })),
        assetsSize: this.getAssetsSize(assets),
      };
    }
    
    return entrypoints;
  }
  
  private generateErrors(): StatsError[] {
    return this.compilation.errors.map(err => ({
      message: err.message,
      stack: err.stack,
      moduleId: err.module?.id,
      moduleName: err.module?.readableIdentifier(
        this.compilation.requestShortener
      ),
      loc: err.loc,
    }));
  }
  
  private generateWarnings(): StatsWarning[] {
    return this.compilation.warnings.map(warn => ({
      message: warn.message,
      moduleId: warn.module?.id,
      moduleName: warn.module?.readableIdentifier(
        this.compilation.requestShortener
      ),
      loc: warn.loc,
    }));
  }
  
  private getChunkSize(chunk: Chunk): number {
    let size = 0;
    
    for (const module of this.compilation.chunkGraph.getChunkModules(chunk)) {
      size += module.size();
    }
    
    return size;
  }
  
  private getChunkModules(
    chunk: Chunk,
    options: NormalizedStatsOptions
  ): ModuleStats[] {
    const modules = this.compilation.chunkGraph.getChunkModules(chunk);
    return modules.map(m => this.generateModuleStats(m, options));
  }
}
```

## 字符串格式化

### StatsStringGenerator

```typescript
class StatsStringGenerator {
  generate(json: StatsJson, options: NormalizedStatsOptions): string {
    const output: string[] = [];
    
    // 头部信息
    if (json.hash || json.version || json.time) {
      output.push(this.formatHeader(json));
    }
    
    // 资源列表
    if (json.assets && json.assets.length > 0) {
      output.push(this.formatAssets(json.assets, options));
    }
    
    // 入口点
    if (json.entrypoints) {
      output.push(this.formatEntrypoints(json.entrypoints));
    }
    
    // 模块列表
    if (json.modules && options.modules) {
      output.push(this.formatModules(json.modules, options));
    }
    
    // 警告
    if (json.warnings && json.warnings.length > 0) {
      output.push(this.formatWarnings(json.warnings));
    }
    
    // 错误
    if (json.errors && json.errors.length > 0) {
      output.push(this.formatErrors(json.errors));
    }
    
    return output.join('\n\n');
  }
  
  private formatHeader(json: StatsJson): string {
    const parts: string[] = [];
    
    if (json.hash) {
      parts.push(`Hash: ${json.hash}`);
    }
    
    if (json.version) {
      parts.push(`Version: webpack ${json.version}`);
    }
    
    if (json.time !== undefined) {
      parts.push(`Time: ${json.time}ms`);
    }
    
    if (json.builtAt) {
      parts.push(`Built at: ${new Date(json.builtAt).toLocaleString()}`);
    }
    
    return parts.join('\n');
  }
  
  private formatAssets(
    assets: AssetStats[],
    options: NormalizedStatsOptions
  ): string {
    const lines: string[] = ['Assets:'];
    
    // 按大小排序
    const sorted = [...assets].sort((a, b) => b.size - a.size);
    
    // 表头
    lines.push(this.formatRow(['Asset', 'Size', 'Chunks', 'Names']));
    lines.push('-'.repeat(60));
    
    for (const asset of sorted) {
      lines.push(this.formatRow([
        asset.name,
        this.formatSize(asset.size),
        asset.chunks.join(', '),
        asset.chunkNames.join(', '),
      ]));
    }
    
    return lines.join('\n');
  }
  
  private formatEntrypoints(
    entrypoints: Record<string, EntrypointStats>
  ): string {
    const lines: string[] = ['Entrypoints:'];
    
    for (const [name, ep] of Object.entries(entrypoints)) {
      const assets = ep.assets.map(a => a.name).join(', ');
      lines.push(`  ${name} (${this.formatSize(ep.assetsSize)}) = ${assets}`);
    }
    
    return lines.join('\n');
  }
  
  private formatModules(
    modules: ModuleStats[],
    options: NormalizedStatsOptions
  ): string {
    const lines: string[] = [`Modules (${modules.length}):`];
    
    // 限制显示数量
    const limit = options.modulesSpace ?? 50;
    const displayed = modules.slice(0, limit);
    
    for (const mod of displayed) {
      const prefix = mod.built ? '[built]' : '';
      lines.push(`  ${prefix} ${mod.name} (${this.formatSize(mod.size)})`);
      
      if (options.reasons && mod.reasons) {
        for (const reason of mod.reasons) {
          lines.push(`    + ${reason.type}: ${reason.moduleName}`);
        }
      }
    }
    
    if (modules.length > limit) {
      lines.push(`  ... ${modules.length - limit} more modules`);
    }
    
    return lines.join('\n');
  }
  
  private formatWarnings(warnings: StatsWarning[]): string {
    const lines: string[] = [
      `\x1b[33mWarnings: ${warnings.length}\x1b[0m`
    ];
    
    for (const warn of warnings) {
      lines.push('');
      if (warn.moduleName) {
        lines.push(`Module: ${warn.moduleName}`);
      }
      lines.push(warn.message);
    }
    
    return lines.join('\n');
  }
  
  private formatErrors(errors: StatsError[]): string {
    const lines: string[] = [
      `\x1b[31mErrors: ${errors.length}\x1b[0m`
    ];
    
    for (const err of errors) {
      lines.push('');
      if (err.moduleName) {
        lines.push(`Module: ${err.moduleName}`);
      }
      lines.push(err.message);
      if (err.stack) {
        lines.push(err.stack);
      }
    }
    
    return lines.join('\n');
  }
  
  private formatSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }
  
  private formatRow(columns: string[]): string {
    const widths = [40, 12, 12, 20];
    
    return columns.map((col, i) => 
      col.padEnd(widths[i] || 10)
    ).join(' ');
  }
}
```

## 高级功能

### 性能提示

```typescript
class PerformanceHints {
  static analyze(stats: StatsJson): PerformanceHint[] {
    const hints: PerformanceHint[] = [];
    
    // 检查大资源
    if (stats.assets) {
      for (const asset of stats.assets) {
        if (asset.size > 250 * 1024) { // 250KB
          hints.push({
            type: 'warning',
            message: `Asset "${asset.name}" exceeds recommended size (${
              this.formatSize(asset.size)
            })`,
            asset: asset.name,
          });
        }
      }
    }
    
    // 检查入口点大小
    if (stats.entrypoints) {
      for (const [name, ep] of Object.entries(stats.entrypoints)) {
        if (ep.assetsSize > 250 * 1024) {
          hints.push({
            type: 'warning',
            message: `Entrypoint "${name}" exceeds recommended size (${
              this.formatSize(ep.assetsSize)
            })`,
            entrypoint: name,
          });
        }
      }
    }
    
    // 检查重复模块
    if (stats.modules) {
      const duplicates = this.findDuplicateModules(stats.modules);
      
      for (const [name, count] of duplicates) {
        hints.push({
          type: 'info',
          message: `Module "${name}" is duplicated ${count} times`,
          module: name,
        });
      }
    }
    
    return hints;
  }
  
  private static findDuplicateModules(
    modules: ModuleStats[]
  ): Map<string, number> {
    const counts = new Map<string, number>();
    
    for (const mod of modules) {
      const name = mod.name;
      counts.set(name, (counts.get(name) || 0) + 1);
    }
    
    return new Map(
      Array.from(counts).filter(([_, count]) => count > 1)
    );
  }
}

interface PerformanceHint {
  type: 'warning' | 'info' | 'error';
  message: string;
  asset?: string;
  entrypoint?: string;
  module?: string;
}
```

### Bundle 分析

```typescript
class BundleAnalyzer {
  static analyze(stats: StatsJson): BundleAnalysis {
    const analysis: BundleAnalysis = {
      totalSize: 0,
      totalModules: 0,
      chunkAnalysis: [],
      modulesByType: new Map(),
    };
    
    // 计算总大小
    if (stats.assets) {
      analysis.totalSize = stats.assets.reduce(
        (sum, a) => sum + a.size,
        0
      );
    }
    
    // 统计模块
    if (stats.modules) {
      analysis.totalModules = stats.modules.length;
      
      for (const mod of stats.modules) {
        const type = this.getModuleType(mod.name);
        const current = analysis.modulesByType.get(type) || {
          count: 0,
          size: 0,
        };
        
        current.count++;
        current.size += mod.size;
        analysis.modulesByType.set(type, current);
      }
    }
    
    // 分析 chunks
    if (stats.chunks) {
      analysis.chunkAnalysis = stats.chunks.map(chunk => ({
        id: chunk.id,
        name: chunk.names[0],
        size: chunk.size,
        moduleCount: chunk.modules?.length || 0,
        isEntry: chunk.entry,
      }));
    }
    
    return analysis;
  }
  
  private static getModuleType(name: string): string {
    if (name.includes('node_modules')) {
      return 'vendor';
    }
    if (name.endsWith('.css') || name.endsWith('.scss')) {
      return 'styles';
    }
    if (name.endsWith('.json')) {
      return 'json';
    }
    return 'source';
  }
}

interface BundleAnalysis {
  totalSize: number;
  totalModules: number;
  chunkAnalysis: ChunkAnalysis[];
  modulesByType: Map<string, { count: number; size: number }>;
}
```

## 使用示例

### API 调用

```typescript
const webpack = require('webpack');

webpack(config, (err, stats) => {
  if (err) {
    console.error(err);
    return;
  }
  
  // 字符串输出
  console.log(stats.toString({
    colors: true,
    modules: false,
    children: false,
  }));
  
  // JSON 输出
  const json = stats.toJson({
    assets: true,
    chunks: true,
    modules: true,
  });
  
  // 写入文件
  fs.writeFileSync(
    'stats.json',
    JSON.stringify(json, null, 2)
  );
});
```

## 总结

输出统计信息的核心要点：

**Stats 结构**：
- 编译元数据
- 资源信息
- Chunk 信息
- 模块信息

**预设配置**：
- none：无输出
- minimal：最小信息
- normal：常规信息
- detailed：详细信息

**格式化输出**：
- JSON 格式
- 字符串格式
- 自定义格式

**高级分析**：
- 性能提示
- Bundle 分析
- 重复检测

**下一章**：我们将学习输出错误处理与恢复机制。
