---
sidebar_position: 82
title: "ModuleDependency 模块依赖"
---

# ModuleDependency 模块依赖

ModuleDependency 是所有需要解析模块的依赖的基类，它扩展了 Dependency 并添加了模块请求相关的属性。

## 设计定位

### 依赖层次结构

```
Dependency (抽象基类)
    ↓
ModuleDependency (模块依赖基类)
├── HarmonyImportDependency (ESM)
├── CommonJsRequireDependency (CJS)
├── ImportDependency (动态 import)
├── AMDRequireDependency (AMD)
└── URLDependency (URL 资源)
```

### 核心职责

- 存储模块请求路径
- 提供用户可读的请求描述
- 支持模块解析器配置
- 管理依赖范围信息

## ModuleDependency 实现

### 核心属性

```typescript
abstract class ModuleDependency extends Dependency {
  // 原始请求字符串（用户在代码中写的）
  request: string;
  
  // 用户可读的请求（用于错误消息）
  userRequest: string;
  
  // 依赖在源码中的位置
  range: [number, number];
  
  // 断言（import assertions）
  assertions?: ImportAssertions;
  
  constructor(request: string) {
    super();
    this.request = request;
    this.userRequest = request;
  }
  
  // 资源标识符，用于解析
  getResourceIdentifier(): string | null {
    return `module${this.request}`;
  }
}
```

### 请求属性说明

```typescript
// request vs userRequest 的区别
class ModuleDependency extends Dependency {
  // request: 实际用于解析的请求
  // 可能被处理过（添加 loader 前缀等）
  request: string;
  
  // userRequest: 用户在代码中写的原始请求
  // 用于错误消息，保持可读性
  userRequest: string;
}

// 示例
const dep = new HarmonyImportDependency('./utils');
dep.request = './utils';
dep.userRequest = './utils';

// 处理后
dep.request = '/absolute/path/to/utils.js';
dep.userRequest = './utils';  // 保持原样
```

## 解析器选项

### getResolveOptions 方法

```typescript
class ModuleDependency extends Dependency {
  // 返回自定义解析选项
  getResolveOptions(): ResolveOptions | null {
    return null;
  }
}

// 子类可以覆盖
class URLDependency extends ModuleDependency {
  getResolveOptions(): ResolveOptions {
    return {
      // URL 依赖需要完整路径
      fullySpecified: true,
    };
  }
}

class ImportDependency extends ModuleDependency {
  getResolveOptions(): ResolveOptions | null {
    // 动态导入可能有特殊解析选项
    if (this.assertions?.type === 'json') {
      return {
        // JSON 导入需要特定处理
        conditionNames: ['import', 'json'],
      };
    }
    return null;
  }
}
```

### 解析选项合并

```typescript
class NormalModuleFactory {
  _resolve(data: ResolveData, callback: Callback): void {
    const { dependency } = data;
    
    // 获取依赖的解析选项
    const dependencyResolveOptions = dependency.getResolveOptions?.();
    
    // 合并解析选项
    const resolveOptions = {
      ...this.resolveOptions,
      ...dependencyResolveOptions,
    };
    
    this.resolver.resolve(
      {},
      data.context,
      dependency.request,
      resolveOptions,
      callback
    );
  }
}
```

## Import Assertions 支持

### 断言语法

```javascript
// JSON 导入断言
import data from './data.json' assert { type: 'json' };

// CSS 导入断言
import styles from './styles.css' assert { type: 'css' };
```

### 断言存储

```typescript
interface ImportAssertions {
  type?: string;
  [key: string]: string | undefined;
}

class ModuleDependency extends Dependency {
  assertions?: ImportAssertions;
  
  setAssertions(assertions: ImportAssertions): void {
    this.assertions = assertions;
  }
  
  getAssertions(): ImportAssertions | undefined {
    return this.assertions;
  }
}

// 在解析时使用
class HarmonyImportDependencyParserPlugin {
  apply(parser: JavascriptParser): void {
    parser.hooks.importDeclaration.tap(
      'HarmonyImportDependencyParserPlugin',
      (statement) => {
        const dep = new HarmonyImportSideEffectDependency(
          statement.source.value
        );
        
        // 提取断言
        if (statement.assertions?.length) {
          const assertions: ImportAssertions = {};
          for (const assertion of statement.assertions) {
            const key = assertion.key.type === 'Identifier'
              ? assertion.key.name
              : assertion.key.value;
            const value = assertion.value.value;
            assertions[key] = value;
          }
          dep.setAssertions(assertions);
        }
        
        parser.state.module.addDependency(dep);
      }
    );
  }
}
```

## 模块工厂

### DependencyFactory 接口

```typescript
interface ModuleFactory {
  create(
    data: ModuleFactoryCreateData,
    callback: ModuleFactoryCallback
  ): void;
}

interface ModuleFactoryCreateData {
  context: string;
  dependencies: Dependency[];
  resolveOptions?: ResolveOptions;
}

type ModuleFactoryCallback = (
  err: Error | null,
  result?: ModuleFactoryResult
) => void;

interface ModuleFactoryResult {
  module: Module;
  fileDependencies?: Set<string>;
  contextDependencies?: Set<string>;
  missingDependencies?: Set<string>;
}
```

### 工厂注册

```typescript
class Compilation {
  dependencyFactories: Map<typeof Dependency, ModuleFactory>;
  
  constructor(compiler: Compiler) {
    this.dependencyFactories = new Map();
  }
}

// 插件注册工厂
class HarmonyModulesPlugin {
  apply(compiler: Compiler): void {
    compiler.hooks.compilation.tap(
      'HarmonyModulesPlugin',
      (compilation, { normalModuleFactory }) => {
        // 注册依赖工厂
        compilation.dependencyFactories.set(
          HarmonyImportSideEffectDependency,
          normalModuleFactory
        );
        compilation.dependencyFactories.set(
          HarmonyImportSpecifierDependency,
          normalModuleFactory
        );
        compilation.dependencyFactories.set(
          HarmonyExportExpressionDependency,
          normalModuleFactory
        );
      }
    );
  }
}
```

## 位置信息

### range 与 loc

```typescript
class ModuleDependency extends Dependency {
  // range: 字符偏移量 [start, end]
  range: [number, number];
  
  // loc: 行列位置
  loc?: SourceLocation;
}

interface SourceLocation {
  start: Position;
  end: Position;
}

interface Position {
  line: number;    // 1-based
  column: number;  // 0-based
}

// 使用示例
class JavascriptParser {
  walkImportDeclaration(statement: ImportDeclaration): void {
    const dep = new HarmonyImportSideEffectDependency(
      statement.source.value
    );
    
    // 设置位置信息
    dep.range = statement.source.range as [number, number];
    dep.loc = statement.loc;
    
    this.state.module.addDependency(dep);
  }
}
```

### 错误报告

```typescript
class ModuleDependency extends Dependency {
  // 生成错误位置描述
  formatLocation(): string {
    if (!this.loc) return '';
    
    const { start, end } = this.loc;
    if (start.line === end.line) {
      return `${start.line}:${start.column}-${end.column}`;
    }
    return `${start.line}:${start.column}-${end.line}:${end.column}`;
  }
}

// 错误消息示例
class ModuleNotFoundError extends Error {
  constructor(module: Module, dep: ModuleDependency) {
    const request = dep.userRequest;
    const loc = dep.formatLocation();
    
    super(`Module not found: Can't resolve '${request}' in '${module.context}' at ${loc}`);
  }
}
```

## 序列化

```typescript
class ModuleDependency extends Dependency {
  serialize(context: SerializeContext): void {
    const { write } = context;
    write(this.request);
    write(this.userRequest);
    write(this.range);
    write(this.assertions);
    super.serialize(context);
  }
  
  deserialize(context: DeserializeContext): void {
    const { read } = context;
    this.request = read();
    this.userRequest = read();
    this.range = read();
    this.assertions = read();
    super.deserialize(context);
  }
}
```

## 常见子类

### ESM 导入依赖

```typescript
class HarmonyImportSideEffectDependency extends ModuleDependency {
  sourceOrder: number;
  
  get type(): string {
    return 'harmony side effect evaluation';
  }
  
  get category(): string {
    return 'esm';
  }
  
  getReferencedExports(): string[][] {
    return Dependency.NO_EXPORTS_REFERENCED;
  }
}
```

### CJS 依赖

```typescript
class CommonJsRequireDependency extends ModuleDependency {
  get type(): string {
    return 'cjs require';
  }
  
  get category(): string {
    return 'commonjs';
  }
  
  getReferencedExports(): string[][] {
    // CommonJS 引用整个模块
    return Dependency.EXPORTS_OBJECT_REFERENCED;
  }
}
```

### 动态导入依赖

```typescript
class ImportDependency extends ModuleDependency {
  // chunk 相关选项
  referencedExports?: string[][];
  
  get type(): string {
    return 'import()';
  }
  
  get category(): string {
    return 'esm';
  }
  
  getReferencedExports(): string[][] {
    if (this.referencedExports) {
      return this.referencedExports;
    }
    return Dependency.EXPORTS_OBJECT_REFERENCED;
  }
}
```

## 使用模式

### 创建模块依赖

```typescript
class ImportParserPlugin {
  apply(parser: JavascriptParser): void {
    parser.hooks.importCall.tap('ImportParserPlugin', (expression) => {
      const source = expression.source;
      const evaluated = parser.evaluateExpression(source);
      
      if (evaluated.isString()) {
        // 静态导入路径
        const dep = new ImportDependency(
          evaluated.string!,
          expression.range
        );
        dep.loc = expression.loc;
        
        // 创建异步块
        const block = new AsyncDependenciesBlock(
          { name: null },
          expression.loc,
          evaluated.string!
        );
        block.addDependency(dep);
        
        parser.state.module.addBlock(block);
      }
      
      return true;
    });
  }
}
```

## 总结

ModuleDependency 设计的核心要点：

**核心属性**：
- request：解析用请求
- userRequest：用户可读请求
- range/loc：位置信息
- assertions：导入断言

**解析支持**：
- getResolveOptions 提供解析配置
- 与 NormalModuleFactory 集成
- 支持自定义解析行为

**工厂机制**：
- dependencyFactories 注册
- 统一的模块创建流程
- 类型安全的工厂匹配

**错误处理**：
- 位置信息用于错误定位
- userRequest 用于可读错误消息

**下一章**：我们将学习 HarmonyImportDependency ESM 导入依赖。
