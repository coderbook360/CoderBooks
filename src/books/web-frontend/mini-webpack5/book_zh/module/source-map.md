---
sidebar_position: 39
title: "Source 与 SourceMap 处理"
---

# Source 与 SourceMap 处理

Webpack 使用 `webpack-sources` 库处理源码和 SourceMap。本章深入理解 Source 对象的设计与 SourceMap 的生成机制。

## 为什么需要 Source 抽象？

在 Webpack 构建过程中，代码会经历多次转换：

```
原始代码 → Loader 转换 → Webpack 包装 → 压缩优化 → 最终输出
```

每次转换都可能改变代码内容和位置。为了保持调试能力，需要：

1. **追踪源码位置**：从输出代码定位回原始位置
2. **高效处理**：避免重复计算和内存浪费
3. **组合能力**：多个源码片段可以组合

**Source 抽象就是为了解决这些问题**。

## Source 类型

webpack-sources 提供多种 Source 类型：

### RawSource

最基础的 Source，不包含 SourceMap：

```typescript
import { RawSource } from 'webpack-sources';

// 从字符串创建
const source = new RawSource('console.log("hello");');

// 获取内容
source.source();  // 'console.log("hello");'
source.size();    // 21
source.map();     // null（无 SourceMap）
```

**使用场景**：
- 不需要 SourceMap 的内容
- JSON、资源文件等

### SourceMapSource

包含 SourceMap 的源码：

```typescript
import { SourceMapSource } from 'webpack-sources';

const source = new SourceMapSource(
  'var a = 1;',           // 转换后的代码
  'file.js',              // 原始文件名
  {                       // SourceMap
    version: 3,
    sources: ['original.js'],
    mappings: 'AAAA',
  },
  'const a = 1;',         // 原始代码（可选）
  {                       // 原始 SourceMap（可选）
    version: 3,
    sources: ['source.js'],
    mappings: 'AAAA',
  },
  true                    // 是否移除原始代码的 SourceMap
);
```

**使用场景**：
- Loader 转换后的代码
- 需要保持源码映射的场景

### OriginalSource

表示原始未转换的代码：

```typescript
import { OriginalSource } from 'webpack-sources';

const source = new OriginalSource(
  'const a = 1;',  // 原始代码
  'file.js'        // 文件名
);

// 自动生成 SourceMap
source.map();  // { version: 3, sources: ['file.js'], ... }
```

**使用场景**：
- 未经 Loader 处理的源文件
- 需要生成初始 SourceMap

### ConcatSource

连接多个 Source：

```typescript
import { ConcatSource, RawSource } from 'webpack-sources';

const source = new ConcatSource(
  new RawSource('// 头部注释\n'),
  new RawSource('const a = 1;\n'),
  new RawSource('const b = 2;\n')
);

source.source();  // '// 头部注释\nconst a = 1;\nconst b = 2;\n'
```

**使用场景**：
- 模块包装（添加 wrapper）
- 多个模块合并

### ReplaceSource

在源码中进行替换：

```typescript
import { ReplaceSource, OriginalSource } from 'webpack-sources';

const original = new OriginalSource(
  'import { foo } from "./foo";\nconsole.log(foo);',
  'file.js'
);

const replace = new ReplaceSource(original);

// 替换 import 语句
replace.replace(
  0,                        // 起始位置
  28,                       // 结束位置
  'var foo = __webpack_require__("./foo");'  // 替换内容
);

replace.source();
// 'var foo = __webpack_require__("./foo");\nconsole.log(foo);'
```

**使用场景**：
- 依赖语句替换
- 代码注入

### CachedSource

缓存包装器，避免重复计算：

```typescript
import { CachedSource, ConcatSource, RawSource } from 'webpack-sources';

const complexSource = new ConcatSource(
  // ... 复杂的源码组合
);

const cached = new CachedSource(complexSource);

// 第一次调用会计算
cached.source();

// 后续调用使用缓存
cached.source();  // 使用缓存
cached.map();     // 使用缓存
```

## Source 在模块中的应用

### 模块源码管理

```typescript
export class NormalModule extends Module {
  private _source: Source | null = null;
  
  /**
   * 设置模块源码
   */
  setSource(source: string, sourceMap?: any): void {
    if (sourceMap) {
      this._source = new SourceMapSource(
        source,
        this.resource,
        sourceMap
      );
    } else {
      this._source = new RawSource(source);
    }
  }
  
  /**
   * 获取原始源码
   */
  originalSource(): Source | null {
    return this._source;
  }
}
```

### 代码生成中的 Source

Generator 生成代码时使用 ReplaceSource：

```typescript
export class JavascriptGenerator {
  generate(
    module: NormalModule,
    context: GenerateContext
  ): Source {
    const originalSource = module.originalSource();
    if (!originalSource) {
      return new RawSource('');
    }
    
    // 创建替换源
    const source = new ReplaceSource(originalSource);
    
    // 处理每个依赖
    for (const dependency of module.dependencies) {
      const template = context.dependencyTemplates.get(
        dependency.constructor
      );
      
      if (template) {
        template.apply(dependency, source, context);
      }
    }
    
    return source;
  }
}
```

### 依赖模板替换

```typescript
export class HarmonyImportSpecifierDependency extends Dependency {
  // ...
}

export class HarmonyImportSpecifierDependencyTemplate {
  apply(
    dep: HarmonyImportSpecifierDependency,
    source: ReplaceSource,
    context: DependencyTemplateContext
  ): void {
    // 计算替换内容
    const exportExpr = context.runtimeTemplate.exportFromImport(
      dep.request,
      dep.name
    );
    
    // 执行替换
    source.replace(
      dep.range[0],
      dep.range[1] - 1,
      exportExpr
    );
  }
}
```

## SourceMap 生成

### SourceMap 结构

```typescript
interface SourceMap {
  version: 3;
  file?: string;
  sourceRoot?: string;
  sources: string[];
  sourcesContent?: (string | null)[];
  names: string[];
  mappings: string;  // VLQ 编码的映射
}
```

### mappings 编码

mappings 使用 VLQ（Variable-Length Quantity）编码：

```typescript
// 每个分号分隔一行
// 每个逗号分隔一个片段
// 每个片段包含 1/4/5 个数字：
// [生成列, 源文件索引, 源行, 源列, 名称索引]

// 示例
"AAAA,IACA,GACA;AACA"
// 第一行：3 个片段
// 第二行：1 个片段
```

### 生成 SourceMap

```typescript
export class SourceMapGenerator {
  private mappings: Mapping[] = [];
  private sources: string[] = [];
  private names: string[] = [];
  
  /**
   * 添加映射
   */
  addMapping(mapping: Mapping): void {
    this.mappings.push(mapping);
    
    // 注册源文件
    if (!this.sources.includes(mapping.source)) {
      this.sources.push(mapping.source);
    }
    
    // 注册名称
    if (mapping.name && !this.names.includes(mapping.name)) {
      this.names.push(mapping.name);
    }
  }
  
  /**
   * 生成 SourceMap
   */
  generate(): SourceMap {
    return {
      version: 3,
      sources: this.sources,
      names: this.names,
      mappings: this.encodeMappings(),
    };
  }
  
  /**
   * 编码映射
   */
  private encodeMappings(): string {
    // 按行分组
    const lines: Mapping[][] = [];
    for (const mapping of this.mappings) {
      while (lines.length <= mapping.generatedLine) {
        lines.push([]);
      }
      lines[mapping.generatedLine].push(mapping);
    }
    
    // 编码每行
    return lines.map(line => this.encodeLine(line)).join(';');
  }
  
  /**
   * VLQ 编码一行
   */
  private encodeLine(mappings: Mapping[]): string {
    // 排序并编码
    mappings.sort((a, b) => a.generatedColumn - b.generatedColumn);
    
    let prevColumn = 0;
    let prevSourceIndex = 0;
    let prevSourceLine = 0;
    let prevSourceColumn = 0;
    let prevNameIndex = 0;
    
    return mappings.map(m => {
      const result = [
        this.vlqEncode(m.generatedColumn - prevColumn),
        this.vlqEncode(this.sources.indexOf(m.source) - prevSourceIndex),
        this.vlqEncode(m.originalLine - prevSourceLine),
        this.vlqEncode(m.originalColumn - prevSourceColumn),
      ];
      
      if (m.name) {
        result.push(this.vlqEncode(
          this.names.indexOf(m.name) - prevNameIndex
        ));
        prevNameIndex = this.names.indexOf(m.name);
      }
      
      prevColumn = m.generatedColumn;
      prevSourceIndex = this.sources.indexOf(m.source);
      prevSourceLine = m.originalLine;
      prevSourceColumn = m.originalColumn;
      
      return result.join('');
    }).join(',');
  }
  
  /**
   * VLQ 编码数字
   */
  private vlqEncode(value: number): string {
    const base64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let encoded = '';
    
    let vlq = value < 0 ? ((-value) << 1) + 1 : value << 1;
    
    do {
      let digit = vlq & 0x1F;  // 取低 5 位
      vlq >>>= 5;
      if (vlq > 0) {
        digit |= 0x20;  // 设置继续位
      }
      encoded += base64[digit];
    } while (vlq > 0);
    
    return encoded;
  }
}
```

## SourceMap 合并

当代码经过多次转换时，需要合并 SourceMap：

```typescript
/**
 * 合并两个 SourceMap
 * @param firstMap 第一次转换的 SourceMap
 * @param secondMap 第二次转换的 SourceMap
 */
export function mergeSourceMaps(
  firstMap: SourceMap,
  secondMap: SourceMap
): SourceMap {
  const consumer1 = new SourceMapConsumer(firstMap);
  const consumer2 = new SourceMapConsumer(secondMap);
  const generator = new SourceMapGenerator();
  
  // 遍历第二个 SourceMap 的每个位置
  consumer2.eachMapping(mapping => {
    // 在第一个 SourceMap 中查找原始位置
    const original = consumer1.originalPositionFor({
      line: mapping.originalLine,
      column: mapping.originalColumn,
    });
    
    if (original.source) {
      generator.addMapping({
        generated: {
          line: mapping.generatedLine,
          column: mapping.generatedColumn,
        },
        source: original.source,
        original: {
          line: original.line,
          column: original.column,
        },
        name: original.name || mapping.name,
      });
    }
  });
  
  return generator.toJSON();
}
```

## devtool 配置

Webpack 提供多种 SourceMap 模式：

```javascript
// webpack.config.js
module.exports = {
  devtool: 'source-map',  // 多种选项
};
```

| devtool | 特点 | 适用场景 |
|---------|------|---------|
| `source-map` | 完整独立文件 | 生产环境调试 |
| `inline-source-map` | 内联到代码中 | 开发环境 |
| `eval-source-map` | eval 包装 | 快速开发 |
| `cheap-source-map` | 无列信息 | 平衡方案 |
| `nosources-source-map` | 无源码内容 | 生产环境 |

```typescript
function getSourceMapPlugin(devtool: string): Plugin {
  if (devtool.includes('eval')) {
    return new EvalSourceMapDevToolPlugin(options);
  } else {
    return new SourceMapDevToolPlugin(options);
  }
}
```

## 总结

Source 与 SourceMap 是 Webpack 调试支持的基础：

**Source 类型**：
- `RawSource`：无映射的原始内容
- `SourceMapSource`：带 SourceMap 的源码
- `ConcatSource`：连接多个源
- `ReplaceSource`：替换操作
- `CachedSource`：缓存优化

**SourceMap 机制**：
- 使用 VLQ 编码压缩映射数据
- 支持多次转换的 SourceMap 合并
- 多种 devtool 模式满足不同需求

**设计要点**：
- 延迟计算：只在需要时生成内容
- 缓存优化：避免重复计算
- 组合能力：支持复杂的代码组装

下一章我们将讨论模块缓存机制。
