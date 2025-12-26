---
sidebar_position: 121
title: "Source Map 生成"
---

# Source Map 生成

Source Map 是将编译后的代码映射回源代码的关键技术，使开发者能够在浏览器中调试原始代码。

## Source Map 基础

### 文件结构

```json
{
  "version": 3,
  "file": "bundle.js",
  "sourceRoot": "",
  "sources": ["./src/index.js", "./src/utils.js"],
  "sourcesContent": ["const x = 1;", "export function add() {}"],
  "names": ["x", "add"],
  "mappings": "AAAA,MAAMA,CAAC,GAAG,CAAC;ACAX,SAAgBC,GAAG"
}
```

### 字段说明

```typescript
interface SourceMap {
  version: 3;              // Source Map 版本
  file: string;            // 生成的文件名
  sourceRoot: string;      // 源文件根目录
  sources: string[];       // 源文件列表
  sourcesContent: string[]; // 源文件内容
  names: string[];         // 标识符名称
  mappings: string;        // VLQ 编码的映射
}
```

## VLQ 编码

### 映射原理

```typescript
// mappings 字段编码：
// - 每行由 ; 分隔
// - 每个映射由 , 分隔
// - 每个映射包含 1、4 或 5 个 VLQ 编码的数字

// 5 个数字的含义：
// 1. 生成文件的列号（相对上一个）
// 2. 源文件索引（相对上一个）
// 3. 源文件行号（相对上一个）
// 4. 源文件列号（相对上一个）
// 5. names 索引（可选，相对上一个）
```

### VLQ 实现

```typescript
const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function encodeVLQ(value: number): string {
  let result = '';
  
  // 处理负数
  let signBit = 0;
  if (value < 0) {
    signBit = 1;
    value = -value;
  }
  
  // 第一个字节包含符号位
  let digit = (value & 0b1111) << 1 | signBit;
  value >>>= 4;
  
  // 后续字节
  while (value > 0) {
    digit |= 0b100000;  // 设置继续位
    result += BASE64_CHARS[digit];
    digit = value & 0b11111;
    value >>>= 5;
  }
  
  result += BASE64_CHARS[digit];
  return result;
}

function decodeVLQ(encoded: string): number[] {
  const values: number[] = [];
  let i = 0;
  
  while (i < encoded.length) {
    let value = 0;
    let shift = 0;
    let continuation = true;
    
    while (continuation && i < encoded.length) {
      const char = encoded[i++];
      const digit = BASE64_CHARS.indexOf(char);
      
      continuation = (digit & 0b100000) !== 0;
      value += (digit & 0b11111) << shift;
      shift += 5;
    }
    
    // 处理符号
    const signBit = value & 1;
    value >>>= 1;
    values.push(signBit ? -value : value);
  }
  
  return values;
}
```

## Webpack Source Map 配置

### devtool 选项

```javascript
module.exports = {
  // 不同的 devtool 配置
  devtool: 'source-map',           // 完整 Source Map
  devtool: 'inline-source-map',    // 内联 Source Map
  devtool: 'cheap-source-map',     // 只有行映射
  devtool: 'eval-source-map',      // eval 包装
  devtool: 'hidden-source-map',    // 不添加引用
  devtool: 'nosources-source-map', // 不包含源内容
};
```

### 配置对比

```
                       质量   速度   生产环境适用
source-map             高     慢     ✓（推荐）
inline-source-map      高     慢     ✗
cheap-source-map       中     中     ✓
cheap-module-source-map 高    中     ✓
eval-source-map        高     快     ✗
eval                   低     最快   ✗
```

## 实现原理

### SourceMapDevToolPlugin

```typescript
class SourceMapDevToolPlugin {
  private options: SourceMapOptions;
  
  constructor(options: SourceMapOptions = {}) {
    this.options = {
      filename: '[file].map[query]',
      append: true,
      moduleFilenameTemplate: 'webpack://[namespace]/[resourcePath]',
      ...options,
    };
  }
  
  apply(compiler: Compiler): void {
    compiler.hooks.compilation.tap(
      'SourceMapDevToolPlugin',
      (compilation) => {
        compilation.hooks.processAssets.tapAsync(
          {
            name: 'SourceMapDevToolPlugin',
            stage: Compilation.PROCESS_ASSETS_STAGE_DEV_TOOLING,
          },
          (assets, callback) => {
            this.processAssets(compilation, assets, callback);
          }
        );
      }
    );
  }
  
  async processAssets(
    compilation: Compilation,
    assets: Record<string, Source>,
    callback: () => void
  ): Promise<void> {
    const { filename, append, moduleFilenameTemplate } = this.options;
    
    for (const [name, asset] of Object.entries(assets)) {
      if (!name.endsWith('.js')) continue;
      
      // 获取 source map
      const sourceAndMap = asset.sourceAndMap();
      const { source, map } = sourceAndMap;
      
      if (!map) continue;
      
      // 处理 source map
      const processedMap = this.processSourceMap(map, compilation);
      
      // 生成 source map 文件名
      const mapFilename = filename.replace('[file]', name);
      
      // 添加 source map 资源
      compilation.emitAsset(
        mapFilename,
        new RawSource(JSON.stringify(processedMap))
      );
      
      // 添加 sourceMappingURL
      if (append) {
        const newSource = new ConcatSource(
          source,
          `\n//# sourceMappingURL=${mapFilename}`
        );
        compilation.updateAsset(name, newSource);
      }
    }
    
    callback();
  }
  
  processSourceMap(map: RawSourceMap, compilation: Compilation): RawSourceMap {
    const { moduleFilenameTemplate, namespace } = this.options;
    
    // 处理源文件路径
    const sources = map.sources.map((source, i) => {
      return this.getModuleFilename(source, compilation);
    });
    
    return {
      ...map,
      sources,
    };
  }
  
  getModuleFilename(source: string, compilation: Compilation): string {
    const { moduleFilenameTemplate, namespace } = this.options;
    
    return moduleFilenameTemplate
      .replace('[namespace]', namespace || '')
      .replace('[resourcePath]', source);
  }
}
```

## Source 类层次

### Source 接口

```typescript
interface Source {
  // 获取源代码
  source(): string;
  
  // 获取 buffer
  buffer(): Buffer;
  
  // 获取大小
  size(): number;
  
  // 获取 source map
  map(options?: MapOptions): RawSourceMap | null;
  
  // 同时获取源码和 map
  sourceAndMap(options?: MapOptions): SourceAndMapResult;
  
  // 更新 hash
  updateHash(hash: Hash): void;
}
```

### 常用 Source 类

```typescript
// RawSource：无映射的源码
class RawSource implements Source {
  private content: string;
  
  constructor(content: string) {
    this.content = content;
  }
  
  source(): string {
    return this.content;
  }
  
  map(): null {
    return null;  // 无映射
  }
}

// OriginalSource：有原始位置信息
class OriginalSource implements Source {
  constructor(
    private content: string,
    private name: string
  ) {}
  
  map(options?: MapOptions): RawSourceMap {
    // 生成简单的 1:1 映射
    return {
      version: 3,
      file: this.name,
      sources: [this.name],
      sourcesContent: [this.content],
      mappings: this.generateMappings(),
    };
  }
  
  generateMappings(): string {
    const lines = this.content.split('\n');
    return lines.map((line, i) => {
      if (i === 0) {
        return 'AAAA';  // 第一行
      }
      return 'AACA';  // 后续行
    }).join(';');
  }
}

// SourceMapSource：带 Source Map 的源码
class SourceMapSource implements Source {
  constructor(
    private content: string,
    private name: string,
    private originalMap: RawSourceMap
  ) {}
  
  map(): RawSourceMap {
    return this.originalMap;
  }
}

// ReplaceSource：支持替换操作
class ReplaceSource implements Source {
  private original: Source;
  private replacements: Replacement[] = [];
  
  constructor(source: Source) {
    this.original = source;
  }
  
  replace(start: number, end: number, content: string): void {
    this.replacements.push({ start, end, content });
  }
  
  source(): string {
    // 应用所有替换
    const original = this.original.source();
    let result = '';
    let pos = 0;
    
    // 按位置排序
    const sorted = [...this.replacements].sort((a, b) => a.start - b.start);
    
    for (const { start, end, content } of sorted) {
      result += original.slice(pos, start);
      result += content;
      pos = end + 1;
    }
    
    result += original.slice(pos);
    return result;
  }
  
  map(options?: MapOptions): RawSourceMap | null {
    // 生成考虑替换的 Source Map
    return this.generateMapWithReplacements(options);
  }
}

// ConcatSource：拼接多个源
class ConcatSource implements Source {
  private children: Source[] = [];
  
  add(source: Source | string): void {
    if (typeof source === 'string') {
      this.children.push(new RawSource(source));
    } else {
      this.children.push(source);
    }
  }
  
  source(): string {
    return this.children.map(c => c.source()).join('');
  }
  
  map(options?: MapOptions): RawSourceMap | null {
    // 合并所有子源的 Source Map
    return this.mergeSourceMaps(options);
  }
}
```

## Source Map 合并

### 多层转换处理

```typescript
class SourceMapMerger {
  merge(
    generatedMap: RawSourceMap,
    originalMap: RawSourceMap
  ): RawSourceMap {
    const { SourceMapConsumer, SourceMapGenerator } = require('source-map');
    
    const generatedConsumer = new SourceMapConsumer(generatedMap);
    const originalConsumer = new SourceMapConsumer(originalMap);
    const generator = new SourceMapGenerator();
    
    // 遍历生成的映射
    generatedConsumer.eachMapping((mapping: Mapping) => {
      // 查找原始位置
      const original = originalConsumer.originalPositionFor({
        line: mapping.originalLine,
        column: mapping.originalColumn,
      });
      
      if (original.source !== null) {
        generator.addMapping({
          generated: {
            line: mapping.generatedLine,
            column: mapping.generatedColumn,
          },
          original: {
            line: original.line,
            column: original.column,
          },
          source: original.source,
          name: original.name || mapping.name,
        });
      }
    });
    
    // 复制源内容
    originalConsumer.sources.forEach((source: string) => {
      const content = originalConsumer.sourceContentFor(source);
      if (content) {
        generator.setSourceContent(source, content);
      }
    });
    
    return generator.toJSON();
  }
}
```

## 性能优化

### 增量生成

```typescript
class IncrementalSourceMap {
  private cache: Map<string, RawSourceMap> = new Map();
  
  generate(
    module: Module,
    compilation: Compilation
  ): RawSourceMap | null {
    const cacheKey = this.getCacheKey(module);
    
    // 检查缓存
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }
    
    // 生成新的 Source Map
    const map = this.generateForModule(module, compilation);
    
    // 缓存结果
    if (map) {
      this.cache.set(cacheKey, map);
    }
    
    return map;
  }
  
  getCacheKey(module: Module): string {
    return `${module.identifier()}:${module.buildHash}`;
  }
}
```

### Cheap 模式

```typescript
// cheap-source-map：只记录行号
class CheapSourceMapGenerator {
  generate(source: string, name: string): RawSourceMap {
    const lines = source.split('\n');
    
    // 每行一个映射，不记录列号
    const mappings = lines.map((line, i) => {
      if (i === 0) return 'AAAA';
      return 'AACA';
    }).join(';');
    
    return {
      version: 3,
      file: name,
      sources: [name],
      mappings,
    };
  }
}
```

## 总结

Source Map 生成的核心要点：

**基础结构**：
- version、file、sources
- mappings（VLQ 编码）
- names、sourcesContent

**devtool 配置**：
- source-map：完整映射
- cheap-source-map：行级映射
- eval-source-map：快速重建

**Source 类**：
- RawSource
- OriginalSource
- SourceMapSource
- ReplaceSource
- ConcatSource

**合并策略**：
- 多层转换追踪
- 映射链合并

**性能优化**：
- 增量生成
- 缓存利用
- cheap 模式

**下一章**：我们将学习 Chunk 文件生成。
