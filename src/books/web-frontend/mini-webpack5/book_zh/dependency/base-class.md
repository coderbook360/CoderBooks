---
sidebar_position: 81
title: "Dependency 基类设计"
---

# Dependency 基类设计

Dependency 是 Webpack 依赖系统的核心抽象，表示模块之间的引用关系。

## 依赖的作用

### 在构建流程中的位置

```
源代码解析
    ↓
Parser 遍历 AST
    ↓
识别 import/require
    ↓
创建 Dependency 对象    ← 我们在这里
    ↓
添加到 Module.dependencies
    ↓
递归处理依赖模块
```

### 依赖类型概览

```
Dependency (基类)
├── ModuleDependency (模块依赖)
│   ├── HarmonyImportDependency (ESM import)
│   ├── HarmonyExportDependency (ESM export)
│   ├── CommonJsRequireDependency (CJS require)
│   └── ImportDependency (动态 import)
├── NullDependency (无模块依赖)
│   ├── HarmonyCompatibilityDependency
│   └── ConstDependency
└── ContextDependency (上下文依赖)
    └── ImportContextDependency
```

## Dependency 基类实现

### 核心属性

```typescript
abstract class Dependency {
  // 唯一标识
  private _id: number = -1;
  
  // 位置信息
  loc?: SourceLocation;
  range?: [number, number];
  
  // 弱依赖标记
  weak: boolean = false;
  
  // 可选依赖标记
  optional: boolean = false;
  
  // 所属模块（由 ModuleGraph 管理）
  // 注意：不直接存储，通过 moduleGraph 访问
  
  get id(): number {
    return this._id;
  }
  
  set id(value: number) {
    this._id = value;
  }
  
  // 获取依赖类型
  get type(): string {
    return 'unknown';
  }
  
  // 获取依赖类别
  get category(): string {
    return 'unknown';
  }
}
```

### 类型与类别

```typescript
class Dependency {
  // type 表示具体的依赖类型
  // 用于调试和日志
  get type(): string {
    return 'unknown';
  }
  
  // category 表示依赖的大类
  // 用于分类处理
  get category(): string {
    return 'unknown';
  }
}

// 示例
class HarmonyImportSideEffectDependency extends Dependency {
  get type(): string {
    return 'harmony import side effect';
  }
  
  get category(): string {
    return 'esm';
  }
}

class CommonJsRequireDependency extends Dependency {
  get type(): string {
    return 'cjs require';
  }
  
  get category(): string {
    return 'commonjs';
  }
}
```

## ModuleGraph 集成

### 依赖与模块的关系

```typescript
class ModuleGraph {
  // 依赖 -> 模块 的映射
  private _dependencyMap: Map<Dependency, ModuleGraphModule>;
  
  // 依赖 -> 连接 的映射
  private _connectionMap: Map<Dependency, ModuleGraphConnection>;
  
  // 获取依赖指向的模块
  getModule(dependency: Dependency): Module | null {
    const connection = this._connectionMap.get(dependency);
    return connection ? connection.module : null;
  }
  
  // 获取依赖所属的模块
  getParentModule(dependency: Dependency): Module | null {
    const mgm = this._dependencyMap.get(dependency);
    return mgm ? mgm.module : null;
  }
  
  // 获取依赖的连接
  getConnection(dependency: Dependency): ModuleGraphConnection | null {
    return this._connectionMap.get(dependency) || null;
  }
  
  // 设置依赖的解析结果
  setResolvedModule(
    originModule: Module | null,
    dependency: Dependency,
    module: Module
  ): void {
    const connection = new ModuleGraphConnection(
      originModule,
      dependency,
      module,
      undefined,
      dependency.weak,
      dependency.getCondition(this)
    );
    
    this._connectionMap.set(dependency, connection);
  }
}
```

### ModuleGraphConnection

```typescript
class ModuleGraphConnection {
  originModule: Module | null;
  dependency: Dependency;
  module: Module;
  weak: boolean;
  conditional: boolean;
  condition: ConnectionCondition | null;
  
  constructor(
    originModule: Module | null,
    dependency: Dependency,
    module: Module,
    explanation?: string,
    weak: boolean = false,
    condition?: ConnectionCondition
  ) {
    this.originModule = originModule;
    this.dependency = dependency;
    this.module = module;
    this.weak = weak;
    this.conditional = !!condition;
    this.condition = condition || null;
  }
  
  // 连接是否活跃
  isActive(runtime: RuntimeSpec): boolean {
    if (!this.conditional) return true;
    if (!this.condition) return true;
    return this.condition(this, runtime);
  }
  
  // 获取活跃状态
  getActiveState(runtime: RuntimeSpec): ConnectionState {
    if (!this.conditional) {
      return ConnectionState.ACTIVE;
    }
    if (!this.condition) {
      return ConnectionState.ACTIVE;
    }
    return this.condition(this, runtime);
  }
}

enum ConnectionState {
  INACTIVE = 0,
  ACTIVE = 1,
  CONDITIONAL = 2,
}
```

## 引用导出追踪

### getReferencedExports 方法

```typescript
abstract class Dependency {
  // 获取此依赖引用的导出
  // 返回格式：string[][] 表示导出路径数组
  getReferencedExports(
    moduleGraph: ModuleGraph,
    runtime: RuntimeSpec
  ): (string[] | ReferencedExport)[] {
    // 默认引用所有导出
    return Dependency.EXPORTS_OBJECT_REFERENCED;
  }
  
  // 常用常量
  static EXPORTS_OBJECT_REFERENCED: string[][] = [[]];
  static NO_EXPORTS_REFERENCED: string[][] = [];
}

// 示例
class HarmonyImportSpecifierDependency extends Dependency {
  ids: string[];  // 导入的标识符路径
  
  getReferencedExports(moduleGraph: ModuleGraph): string[][] {
    // 返回具体引用的导出
    // import { foo } from './mod' => [['foo']]
    // import { foo: { bar } } from './mod' => [['foo', 'bar']]
    return [this.ids];
  }
}

// 命名空间导入
class HarmonyImportSideEffectDependency extends Dependency {
  getReferencedExports(): string[][] {
    // import * as ns from './mod'
    // 引用整个导出对象
    return Dependency.EXPORTS_OBJECT_REFERENCED;
  }
}
```

### 条件引用

```typescript
class Dependency {
  // 返回条件函数，用于判断连接是否活跃
  getCondition(moduleGraph: ModuleGraph): ConnectionCondition | null {
    return null;
  }
}

type ConnectionCondition = (
  connection: ModuleGraphConnection,
  runtime: RuntimeSpec
) => ConnectionState;

// 示例：条件导出
class HarmonyExportImportedSpecifierDependency extends Dependency {
  getCondition(moduleGraph: ModuleGraph): ConnectionCondition | null {
    return (connection, runtime) => {
      // 检查导出是否被使用
      const exportsInfo = moduleGraph.getExportsInfo(
        connection.originModule!
      );
      
      const exportInfo = exportsInfo.getExportInfo(this.name);
      if (exportInfo.getUsed(runtime) === UsageState.Unused) {
        return ConnectionState.INACTIVE;
      }
      
      return ConnectionState.ACTIVE;
    };
  }
}
```

## 序列化支持

### Serializable 接口

```typescript
interface Serializable {
  serialize(context: SerializeContext): void;
  deserialize(context: DeserializeContext): void;
}

class Dependency implements Serializable {
  serialize(context: SerializeContext): void {
    const { write } = context;
    write(this.weak);
    write(this.optional);
    write(this.loc);
  }
  
  deserialize(context: DeserializeContext): void {
    const { read } = context;
    this.weak = read();
    this.optional = read();
    this.loc = read();
  }
}

// 注册序列化器
Dependency.prototype.serialize = function(context) {
  const { write } = context;
  write(this.weak);
  write(this.optional);
  write(this.loc);
};

Dependency.deserialize = function(context) {
  const { read } = context;
  const dep = new this();
  dep.weak = read();
  dep.optional = read();
  dep.loc = read();
  return dep;
};
```

### 序列化注册

```typescript
const serializer = require('./serialization/ObjectMiddleware');

// 注册依赖类
serializer.register(Dependency, 'webpack/lib/Dependency', null, {
  serialize(obj: Dependency, context: SerializeContext) {
    obj.serialize(context);
  },
  deserialize(context: DeserializeContext) {
    return Dependency.deserialize(context);
  },
});
```

## 使用示例

### 创建依赖

```typescript
class JavascriptParser {
  walkImportDeclaration(statement: ImportDeclaration): void {
    const source = statement.source.value;
    const range = statement.range;
    
    // 创建副作用依赖
    const sideEffectDep = new HarmonyImportSideEffectDependency(
      source,
      range
    );
    sideEffectDep.loc = statement.loc;
    this.state.module.addDependency(sideEffectDep);
    
    // 为每个导入说明符创建依赖
    for (const specifier of statement.specifiers) {
      if (specifier.type === 'ImportSpecifier') {
        const dep = new HarmonyImportSpecifierDependency(
          source,
          specifier.imported.name,
          specifier.local.name,
          specifier.range
        );
        dep.loc = specifier.loc;
        this.state.module.addDependency(dep);
      }
    }
  }
}
```

### 处理依赖

```typescript
class Compilation {
  processModuleDependencies(module: Module, callback: Callback): void {
    const dependencies: Dependency[] = [];
    
    // 收集依赖
    for (const dep of module.dependencies) {
      if (dep instanceof ModuleDependency) {
        dependencies.push(dep);
      }
    }
    
    // 异步处理每个依赖
    asyncLib.forEach(
      dependencies,
      (dep, done) => {
        this.handleModuleDependency(module, dep, done);
      },
      callback
    );
  }
  
  handleModuleDependency(
    originModule: Module,
    dependency: Dependency,
    callback: Callback
  ): void {
    // 获取模块工厂
    const factory = this.dependencyFactories.get(dependency.constructor);
    if (!factory) {
      return callback();
    }
    
    // 创建模块
    factory.create({ dependency }, (err, result) => {
      if (err) return callback(err);
      
      const module = result.module;
      
      // 设置解析结果
      this.moduleGraph.setResolvedModule(
        originModule,
        dependency,
        module
      );
      
      // 递归处理
      this.buildModule(module, callback);
    });
  }
}
```

## 总结

Dependency 基类设计的核心要点：

**核心属性**：
- type/category：依赖分类
- loc/range：位置信息
- weak/optional：依赖强度

**ModuleGraph 集成**：
- 通过 ModuleGraph 管理依赖关系
- ModuleGraphConnection 表示连接
- 支持条件依赖

**引用追踪**：
- getReferencedExports 返回引用的导出
- 支持 Tree Shaking 优化
- 条件引用支持

**序列化**：
- 支持缓存持久化
- 注册序列化器

**下一章**：我们将学习 ModuleDependency 模块依赖。
