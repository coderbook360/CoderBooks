---
sidebar_position: 34
title: "Module 基类设计"
---

# Module 基类设计

在 Webpack 中，一切皆模块。无论是 JavaScript 文件、CSS 样式、图片资源，还是 JSON 数据，都被抽象为 `Module`。本章深入剖析 Module 基类的设计，理解模块系统的核心抽象。

## 为什么需要 Module 抽象？

首先要问一个问题：为什么需要统一的 Module 抽象？

考虑 Webpack 要处理的资源类型：

```javascript
// JavaScript 模块
import { add } from './math.js';

// CSS 模块
import './style.css';

// 图片资源
import logo from './logo.png';

// JSON 数据
import config from './config.json';

// 动态导入
const module = await import('./dynamic.js');
```

这些资源有完全不同的内容和处理方式，但它们都有共同的行为：

- 需要被**标识**（有唯一的 ID）
- 需要被**解析**（确定位置）
- 需要被**构建**（处理内容）
- 可以有**依赖**（引用其他模块）
- 需要被**输出**（生成代码）

**Module 基类就是这些共同行为的抽象**。

## Module 类设计

### 核心属性

```typescript
import type { Dependency } from './Dependency';
import type { DependencyBlock } from './DependencyBlock';
import type { Source } from 'webpack-sources';

export abstract class Module {
  // ========== 标识属性 ==========
  
  /**
   * 模块类型（如 'javascript/auto', 'css/global'）
   */
  type: string;
  
  /**
   * 模块层（用于模块联邦等高级特性）
   */
  layer: string | null = null;
  
  /**
   * 模块上下文（所在目录）
   */
  context: string | null = null;
  
  // ========== 构建状态 ==========
  
  /**
   * 是否需要构建
   */
  needBuild: boolean = true;
  
  /**
   * 构建时的元信息
   */
  buildMeta: Record<string, any> = {};
  
  /**
   * 构建产生的信息
   */
  buildInfo: BuildInfo = {
    strict: undefined,
    cacheable: true,
    parsed: false,
    hash: undefined,
    assets: undefined,
  };
  
  // ========== 依赖关系 ==========
  
  /**
   * 同步依赖列表
   */
  dependencies: Dependency[] = [];
  
  /**
   * 异步依赖块（动态导入等）
   */
  blocks: DependencyBlock[] = [];
  
  // ========== 输出信息 ==========
  
  /**
   * 原始源码
   */
  originalSource: Source | null = null;
  
  /**
   * 模块大小（用于优化决策）
   */
  size: number = 0;
  
  constructor(type: string, context: string | null = null) {
    this.type = type;
    this.context = context;
  }
}

interface BuildInfo {
  strict: boolean | undefined;
  cacheable: boolean;
  parsed: boolean;
  hash: string | undefined;
  assets: Record<string, any> | undefined;
}
```

### 为什么这样设计？

**1. type 字段**

```typescript
type: string;  // 'javascript/auto', 'javascript/esm', 'css/global', etc.
```

模块类型决定了如何处理这个模块：
- 使用哪个 Parser 解析
- 使用哪个 Generator 生成代码
- 如何识别依赖

**2. 分离 dependencies 和 blocks**

```typescript
dependencies: Dependency[];      // 同步依赖
blocks: DependencyBlock[];       // 异步依赖块
```

同步依赖（`import/require`）和异步依赖（`import()`）有本质区别：
- 同步依赖必须在当前 chunk 中
- 异步依赖会产生新的 chunk（代码分割）

**3. buildMeta 与 buildInfo**

```typescript
buildMeta: Record<string, any>;  // 模块本身的元信息
buildInfo: BuildInfo;            // 构建过程产生的信息
```

分离这两种信息便于缓存和增量构建。

## 核心方法

### 标识方法

```typescript
export abstract class Module {
  /**
   * 模块的唯一标识符
   * 用于去重、缓存等
   */
  abstract identifier(): string;
  
  /**
   * 人类可读的标识符
   * 用于日志、报错等
   */
  abstract readableIdentifier(requestShortener: RequestShortener): string;
  
  /**
   * 计算模块的 hash
   * 用于缓存失效判断
   */
  updateHash(hash: Hash, context: UpdateHashContext): void {
    hash.update(this.identifier());
    hash.update(String(this.buildInfo.hash || ''));
    
    // 子类可以添加更多哈希因素
  }
}
```

**为什么需要两种标识符？**

```typescript
// identifier() 返回的是精确标识
"/Users/xxx/project/src/index.js|javascript/auto"

// readableIdentifier() 返回的是简洁标识
"./src/index.js"
```

- `identifier()` 用于程序内部的比较和缓存
- `readableIdentifier()` 用于展示给开发者

### 构建方法

```typescript
export abstract class Module {
  /**
   * 检查模块是否需要重新构建
   */
  abstract needRebuild(
    fileTimestamps: Map<string, number>,
    contextTimestamps: Map<string, number>
  ): boolean;
  
  /**
   * 构建模块（解析、分析依赖）
   */
  abstract build(
    options: WebpackOptions,
    compilation: Compilation,
    resolver: Resolver,
    fs: InputFileSystem,
    callback: (err?: Error) => void
  ): void;
  
  /**
   * 添加依赖
   */
  addDependency(dependency: Dependency): void {
    this.dependencies.push(dependency);
  }
  
  /**
   * 添加异步依赖块
   */
  addBlock(block: DependencyBlock): void {
    this.blocks.push(block);
    block.parent = this;
  }
  
  /**
   * 清除依赖（重新构建前调用）
   */
  clearDependenciesAndBlocks(): void {
    this.dependencies.length = 0;
    this.blocks.length = 0;
  }
}
```

### 代码生成方法

```typescript
export abstract class Module {
  /**
   * 获取模块源码
   */
  abstract source(
    dependencyTemplates: DependencyTemplates,
    runtimeTemplate: RuntimeTemplate,
    type: string
  ): Source;
  
  /**
   * 获取模块大小（用于代码分割决策）
   */
  abstract size(type?: string): number;
  
  /**
   * 获取模块支持的源类型
   */
  getSourceTypes(): Set<string> {
    return new Set(['javascript']);
  }
}
```

## 模块类型层次

Webpack 中的模块类型继承关系：

```
                  Module (抽象基类)
                     ↓
     ┌───────────────┼───────────────┐
     ↓               ↓               ↓
NormalModule   ContextModule   ExternalModule
(普通模块)     (上下文模块)     (外部模块)
     ↓
RawModule
(原始模块)
```

**NormalModule**：最常见的模块类型，对应一个具体的文件。

**ContextModule**：目录模块，用于 `require.context()` 等场景。

**ExternalModule**：外部模块，不打包，运行时从外部获取。

## 实现 Module 基类

创建 `src/Module.ts`：

```typescript
import type { Hash } from './util/Hash';
import type { Compilation } from './Compilation';
import type { RequestShortener } from './RequestShortener';
import type { Resolver } from './Resolver';
import type { InputFileSystem } from './util/fs';
import type { Dependency } from './Dependency';
import type { DependencyBlock } from './DependencyBlock';
import type { Source } from 'webpack-sources';

export interface BuildInfo {
  strict: boolean | undefined;
  cacheable: boolean;
  parsed: boolean;
  hash: string | undefined;
  assets: Record<string, any> | undefined;
  fileDependencies?: Set<string>;
  contextDependencies?: Set<string>;
  missingDependencies?: Set<string>;
  buildDependencies?: Set<string>;
}

export interface UpdateHashContext {
  chunkGraph: ChunkGraph;
  runtime: RuntimeSpec;
}

export abstract class Module {
  // 模块类型
  type: string;
  
  // 模块层
  layer: string | null = null;
  
  // 模块上下文目录
  context: string | null = null;
  
  // 是否需要构建
  needBuild: boolean = true;
  
  // 构建元信息
  buildMeta: Record<string, any> = {};
  
  // 构建信息
  buildInfo: BuildInfo = {
    strict: undefined,
    cacheable: true,
    parsed: false,
    hash: undefined,
    assets: undefined,
    fileDependencies: undefined,
    contextDependencies: undefined,
    missingDependencies: undefined,
    buildDependencies: undefined,
  };
  
  // 同步依赖
  dependencies: Dependency[] = [];
  
  // 异步依赖块
  blocks: DependencyBlock[] = [];
  
  // 原始源码
  private _source: Source | null = null;
  
  // 缓存的大小
  private _cachedSize: number | undefined;
  
  constructor(type: string, context: string | null = null) {
    this.type = type;
    this.context = context;
  }
  
  // ========== 抽象方法 ==========
  
  /**
   * 模块唯一标识符
   */
  abstract identifier(): string;
  
  /**
   * 可读标识符
   */
  abstract readableIdentifier(requestShortener: RequestShortener): string;
  
  /**
   * 构建模块
   */
  abstract build(
    options: any,
    compilation: Compilation,
    resolver: Resolver,
    fs: InputFileSystem,
    callback: (err?: Error | null) => void
  ): void;
  
  /**
   * 检查是否需要重新构建
   */
  abstract needRebuild(
    fileTimestamps: Map<string, number>,
    contextTimestamps: Map<string, number>
  ): boolean;
  
  /**
   * 生成模块源码
   */
  abstract source(
    dependencyTemplates: Map<Function, any>,
    runtimeTemplate: any,
    type: string
  ): Source;
  
  /**
   * 获取模块大小
   */
  abstract size(type?: string): number;
  
  // ========== 依赖管理 ==========
  
  /**
   * 添加同步依赖
   */
  addDependency(dependency: Dependency): void {
    this.dependencies.push(dependency);
  }
  
  /**
   * 移除同步依赖
   */
  removeDependency(dependency: Dependency): void {
    const index = this.dependencies.indexOf(dependency);
    if (index !== -1) {
      this.dependencies.splice(index, 1);
    }
  }
  
  /**
   * 添加异步依赖块
   */
  addBlock(block: DependencyBlock): void {
    this.blocks.push(block);
    block.parent = this;
  }
  
  /**
   * 清除所有依赖
   */
  clearDependenciesAndBlocks(): void {
    this.dependencies.length = 0;
    this.blocks.length = 0;
  }
  
  // ========== 哈希计算 ==========
  
  /**
   * 更新哈希
   */
  updateHash(hash: Hash, context: UpdateHashContext): void {
    hash.update(this.type);
    hash.update(this.identifier());
    
    if (this.buildInfo.hash) {
      hash.update(this.buildInfo.hash);
    }
    
    // 子类可以覆盖添加更多因素
  }
  
  // ========== 工具方法 ==========
  
  /**
   * 获取模块支持的源类型
   */
  getSourceTypes(): Set<string> {
    return new Set(['javascript']);
  }
  
  /**
   * 是否是可选的（不会导致构建失败）
   */
  isOptional(): boolean {
    return false;
  }
  
  /**
   * 序列化（用于持久化缓存）
   */
  serialize(context: any): void {
    const { write } = context;
    
    write(this.type);
    write(this.layer);
    write(this.context);
    write(this.buildMeta);
    write(this.buildInfo);
    write(this.dependencies);
    write(this.blocks);
  }
  
  /**
   * 反序列化
   */
  deserialize(context: any): void {
    const { read } = context;
    
    this.type = read();
    this.layer = read();
    this.context = read();
    this.buildMeta = read();
    this.buildInfo = read();
    this.dependencies = read();
    this.blocks = read();
  }
}
```

## 与 ModuleGraph 的关系

Module 本身只存储模块的**内部信息**。模块之间的**关系**存储在 ModuleGraph 中：

```typescript
// Module 内部信息
module.type          // 模块类型
module.context       // 模块目录
module.dependencies  // 原始依赖列表

// ModuleGraph 中的关系信息
moduleGraph.getModule(dependency)      // 依赖解析到哪个模块
moduleGraph.getExportsInfo(module)     // 模块导出信息
moduleGraph.getConnection(dependency)  // 依赖连接关系
```

这种分离有什么好处？

1. **模块可复用**：同一个模块可以在不同的编译上下文中使用
2. **关系可变**：Tree Shaking 等优化可以修改连接关系
3. **内存高效**：模块信息可以序列化缓存

## 总结

Module 基类是 Webpack 模块系统的核心抽象：

**设计要点**：
1. **统一抽象**：不同类型的资源共享相同的接口
2. **关注分离**：模块内部信息与模块关系分开存储
3. **可扩展性**：通过继承支持不同类型的模块

**核心概念**：
- `identifier()`：唯一标识符，用于去重和缓存
- `build()`：构建流程，解析内容并提取依赖
- `source()`：代码生成，输出最终代码
- `dependencies/blocks`：同步/异步依赖

下一章，我们将实现最常用的模块类型——NormalModule。
