---
sidebar_position: 76
title: "Dependency 依赖对象创建"
---

# Dependency 依赖对象创建

Dependency 是连接 Parser 和模块系统的桥梁，每个依赖代表一个模块引用关系。

## Dependency 的角色

### 在构建流程中的位置

```
Parser 解析
    ↓
创建 Dependency
    ↓
Module.addDependency()
    ↓
processModuleDependencies
    ↓
解析依赖模块
    ↓
构建依赖模块
```

### Dependency 的职责

```typescript
abstract class Dependency {
  // 1. 描述依赖关系
  abstract getReference(): DependencyReference | null;
  
  // 2. 更新模块代码
  abstract getTemplate(): DependencyTemplate;
  
  // 3. 影响缓存
  abstract updateHash(hash: Hash): void;
  
  // 4. 序列化支持
  abstract serialize(context: ObjectSerializerContext): void;
  abstract deserialize(context: ObjectDeserializerContext): void;
}
```

## 创建 Dependency

### 在 Parser Plugin 中创建

```typescript
class CommonJsImportsParserPlugin {
  apply(parser: JavascriptParser): void {
    parser.hooks.call.for('require').tap(
      'CommonJsImportsParserPlugin',
      (expression) => {
        const arg = expression.arguments[0];
        const result = parser.evaluateExpression(arg);
        
        if (!result.isString()) return;
        
        // 创建依赖
        const dep = new CommonJsRequireDependency(
          result.string!,
          expression.range
        );
        
        // 设置位置信息
        dep.loc = expression.loc;
        
        // 添加到模块
        parser.state.module.addDependency(dep);
        
        return true;
      }
    );
  }
}
```

### Dependency 构造

```typescript
class CommonJsRequireDependency extends ModuleDependency {
  constructor(request: string, range: [number, number]) {
    super(request);
    this.range = range;
  }
  
  get type(): string {
    return 'cjs require';
  }
  
  get category(): string {
    return 'commonjs';
  }
}
```

## Dependency 类型

### ModuleDependency

```typescript
// 引用其他模块的依赖
abstract class ModuleDependency extends Dependency {
  // 请求字符串
  request: string;
  
  // 用户请求（显示用）
  userRequest: string;
  
  // 请求范围
  range: [number, number];
  
  // 是否可选
  optional: boolean;
  
  constructor(request: string) {
    super();
    this.request = request;
    this.userRequest = request;
  }
  
  getResourceIdentifier(): string {
    return `module${this.request}`;
  }
}
```

### NullDependency

```typescript
// 不引用其他模块的依赖
// 仅用于代码转换
class NullDependency extends Dependency {
  get type(): string {
    return 'null';
  }
  
  getReference(): null {
    return null;
  }
}

// 示例：HarmonyExportHeaderDependency
// 用于移除 export 关键字
class HarmonyExportHeaderDependency extends NullDependency {
  range: [number, number];
  rangeStatement: [number, number];
  
  constructor(range: [number, number], rangeStatement: [number, number]) {
    super();
    this.range = range;
    this.rangeStatement = rangeStatement;
  }
}
```

### ContextDependency

```typescript
// 动态依赖，需要运行时解析
abstract class ContextDependency extends Dependency {
  // 目录请求
  request: string;
  
  // 是否递归
  recursive: boolean;
  
  // 过滤正则
  regExp: RegExp | null;
  
  // 包含模式
  include: RegExp | null;
  
  // 排除模式
  exclude: RegExp | null;
  
  // 加载模式
  mode: 'sync' | 'lazy' | 'eager' | 'weak' | 'lazy-once';
  
  constructor(options: ContextDependencyOptions) {
    super();
    this.request = options.request;
    this.recursive = options.recursive ?? true;
    this.regExp = options.regExp ?? null;
    this.include = options.include ?? null;
    this.exclude = options.exclude ?? null;
    this.mode = options.mode ?? 'sync';
  }
}
```

## 常见 Dependency 类型

### ESM 相关

```typescript
// import 副作用
class HarmonyImportSideEffectDependency extends ModuleDependency {
  sourceOrder: number;
  
  constructor(request: string, sourceOrder: number) {
    super(request);
    this.sourceOrder = sourceOrder;
  }
}

// import 说明符
class HarmonyImportSpecifierDependency extends Dependency {
  request: string;
  sourceOrder: number;
  ids: string[];
  name: string;
  range: [number, number];
  
  constructor(
    request: string,
    sourceOrder: number,
    ids: string[],
    name: string,
    range: [number, number]
  ) {
    super();
    this.request = request;
    this.sourceOrder = sourceOrder;
    this.ids = ids;
    this.name = name;
    this.range = range;
  }
}

// export 说明符
class HarmonyExportSpecifierDependency extends NullDependency {
  name: string;
  id: string;
  
  constructor(id: string, name: string) {
    super();
    this.id = id;
    this.name = name;
  }
}
```

### CommonJS 相关

```typescript
// require()
class CommonJsRequireDependency extends ModuleDependency {
  // 继承自 ModuleDependency
}

// require.resolve()
class RequireResolveDependency extends ModuleDependency {
  weak: boolean;
  
  constructor(request: string, range: [number, number], weak: boolean = false) {
    super(request);
    this.range = range;
    this.weak = weak;
  }
}

// module.exports
class CommonJsExportsDependency extends NullDependency {
  range: [number, number];
  
  constructor(range: [number, number]) {
    super();
    this.range = range;
  }
}
```

### 动态导入相关

```typescript
// import()
class ImportDependency extends ModuleDependency {
  range: [number, number];
  chunkName: string | null;
  prefetch: boolean | number;
  preload: boolean | number;
  
  constructor(
    request: string,
    range: [number, number],
    options: ImportOptions
  ) {
    super(request);
    this.range = range;
    this.chunkName = options.chunkName || null;
    this.prefetch = options.prefetch || false;
    this.preload = options.preload || false;
  }
}

// 动态 import() 上下文
class ImportContextDependency extends ContextDependency {
  chunkName: string | null;
  
  constructor(options: ContextDependencyOptions & { chunkName?: string }) {
    super(options);
    this.chunkName = options.chunkName || null;
  }
}
```

## Dependency 与 Module 关联

### 添加依赖

```typescript
class NormalModule extends Module {
  dependencies: Dependency[] = [];
  blocks: AsyncDependenciesBlock[] = [];
  
  addDependency(dependency: Dependency): void {
    this.dependencies.push(dependency);
  }
  
  addBlock(block: AsyncDependenciesBlock): void {
    this.blocks.push(block);
    block.parent = this;
  }
}
```

### 异步依赖块

```typescript
class AsyncDependenciesBlock extends DependenciesBlock {
  groupOptions: GroupOptions;
  loc: SourceLocation;
  
  constructor(groupOptions: GroupOptions, loc: SourceLocation) {
    super();
    this.groupOptions = groupOptions;
    this.loc = loc;
  }
}

// 使用示例 - import() 创建异步块
class ImportParserPlugin {
  processStaticImport(
    parser: JavascriptParser,
    expression: ImportExpression,
    request: string,
    options: ImportOptions
  ): boolean {
    // 创建异步依赖块
    const block = new AsyncDependenciesBlock(
      {
        name: options.chunkName,
        preloadOrder: options.preload,
        prefetchOrder: options.prefetch,
      },
      expression.loc
    );
    
    // 创建依赖并添加到块
    const dep = new ImportDependency(request, expression.range, options);
    block.addDependency(dep);
    
    // 将块添加到模块
    parser.state.module.addBlock(block);
    
    return true;
  }
}
```

## DependencyReference

### 描述依赖关系

```typescript
class DependencyReference {
  // 获取被引用的模块
  getModule: () => Module | null;
  
  // 使用的导出
  importedNames: string[] | true;  // true 表示使用全部
  
  // 是否是弱引用
  weak: boolean;
  
  constructor(
    moduleCallback: () => Module | null,
    importedNames: string[] | true,
    weak: boolean = false
  ) {
    this.getModule = moduleCallback;
    this.importedNames = importedNames;
    this.weak = weak;
  }
}

// Dependency 实现
class HarmonyImportSpecifierDependency extends Dependency {
  getReference(): DependencyReference | null {
    if (!this._module) return null;
    
    return new DependencyReference(
      () => this._module,
      this.ids,
      false
    );
  }
}
```

### Tree Shaking 使用

```typescript
class Compilation {
  getDependencyReferencedExports(
    dependency: Dependency
  ): string[][] {
    const ref = dependency.getReference();
    if (!ref) return [];
    
    const importedNames = ref.importedNames;
    
    if (importedNames === true) {
      // 使用全部导出
      return [[]];  // 空数组表示使用整个模块
    }
    
    // 返回使用的导出路径
    return [importedNames];
  }
}
```

## 序列化支持

### 持久化缓存

```typescript
class CommonJsRequireDependency extends ModuleDependency {
  serialize(context: ObjectSerializerContext): void {
    const { write } = context;
    write(this.request);
    write(this.range);
    write(this.optional);
    super.serialize(context);
  }
  
  deserialize(context: ObjectDeserializerContext): void {
    const { read } = context;
    this.request = read();
    this.range = read();
    this.optional = read();
    super.deserialize(context);
  }
}

// 注册序列化器
makeSerializable(
  CommonJsRequireDependency,
  'webpack/lib/dependencies/CommonJsRequireDependency'
);
```

## 总结

Dependency 创建的核心要点：

**创建时机**：
- 在 Parser Hooks 回调中
- 解析到模块引用语法时

**主要类型**：
- ModuleDependency：引用其他模块
- NullDependency：仅用于代码转换
- ContextDependency：动态路径依赖

**关键属性**：
- request：模块请求路径
- range：代码位置
- loc：源码位置信息

**关联机制**：
- module.addDependency()：同步依赖
- module.addBlock()：异步依赖

**DependencyReference**：
- 描述使用了哪些导出
- 支持 Tree Shaking

**下一章**：我们将学习作用域分析与变量追踪。
