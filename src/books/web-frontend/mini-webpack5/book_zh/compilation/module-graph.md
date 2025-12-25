---
sidebar_position: 28
title: "ModuleGraph 模块依赖图"
---

# ModuleGraph 模块依赖图

ModuleGraph 是 Webpack 5 引入的核心数据结构，用于管理模块之间的依赖关系。它回答的核心问题是：**模块 A 依赖了谁？谁依赖了模块 A？导入导出了什么？**

## 为什么需要 ModuleGraph？

在 Webpack 4 中，依赖关系信息分散存储在各处：

```typescript
// Webpack 4 的问题
module.dependencies;      // 这个模块的依赖
module.reasons;           // 谁依赖了这个模块
dependency.module;        // 依赖指向的模块（可变）
```

这种设计有几个问题：

1. **数据分散**：依赖信息散落在 Module、Dependency 等多个对象上
2. **可变性**：dependency.module 会在构建过程中被修改
3. **难以优化**：Tree Shaking 需要分析导入导出关系，信息不够集中
4. **缓存困难**：持久化缓存需要序列化依赖关系，分散的数据难以处理

Webpack 5 用 ModuleGraph 解决了这些问题——**一个集中管理所有依赖关系的数据结构**。

## ModuleGraph 的核心职责

```
                    ┌─────────────────────────────────┐
                    │         ModuleGraph             │
                    │                                 │
   Module A ────────│  记录: A 依赖 B（通过 import x） │
                    │  记录: B 导出 x, y, z            │
   Module B ────────│  记录: 谁使用了 B 的哪些导出      │
                    │                                 │
   Module C ────────│  支持查询、遍历、分析            │
                    │                                 │
                    └─────────────────────────────────┘
```

ModuleGraph 负责：

1. **模块 → 依赖 → 模块** 的映射关系
2. **导出信息**：模块导出了哪些符号
3. **使用信息**：哪些导出被实际使用（用于 Tree Shaking）
4. **连接信息**：模块之间的连接状态

## 核心数据结构

### 三层结构

ModuleGraph 由三层数据结构组成：

```
┌─────────────────────────────────────────────────────┐
│                   ModuleGraph                        │
│  ┌───────────────────────────────────────────────┐  │
│  │  ModuleGraphModule（模块级信息）                │  │
│  │  - 模块的所有出边（outgoing connections）      │  │
│  │  - 模块的所有入边（incoming connections）      │  │
│  │  - 导出信息（exports info）                    │  │
│  └───────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────┐  │
│  │  ModuleGraphConnection（连接信息）             │  │
│  │  - 源模块（originModule）                      │  │
│  │  - 目标模块（module）                          │  │
│  │  - 依赖对象（dependency）                      │  │
│  │  - 连接状态（active/inactive）                 │  │
│  └───────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────┐  │
│  │  ModuleGraphDependency（依赖级信息）           │  │
│  │  - 依赖 → 连接的映射                           │  │
│  │  - 依赖 → 父模块的映射                         │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### TypeScript 定义

```typescript
/**
 * 模块级别的图信息
 */
export interface ModuleGraphModule {
  /** 入边：谁依赖了这个模块 */
  incomingConnections: Set<ModuleGraphConnection>;
  
  /** 出边：这个模块依赖了谁 */
  outgoingConnections: Map<Dependency, ModuleGraphConnection>;
  
  /** 导出信息 */
  exports: ExportsInfo;
  
  /** 预排序索引（用于优化） */
  preOrderIndex: number | null;
  
  /** 后排序索引 */
  postOrderIndex: number | null;
  
  /** 模块深度 */
  depth: number | null;
  
  /** 是否被异步引用 */
  async: boolean;
}

/**
 * 模块之间的连接
 */
export interface ModuleGraphConnection {
  /** 源模块（发起依赖的模块） */
  originModule: Module | null;
  
  /** 目标模块（被依赖的模块） */
  module: Module;
  
  /** 依赖对象 */
  dependency: Dependency;
  
  /** 连接说明 */
  explanation?: string;
  
  /** 是否激活（用于条件连接） */
  conditional: boolean;
  
  /** 获取激活状态 */
  getActiveState(runtime: RuntimeSpec): ConnectionState;
  
  /** 设置激活状态 */
  setActive(value: boolean): void;
}

/**
 * 依赖级别的图信息
 */
export interface ModuleGraphDependency {
  /** 依赖对应的连接 */
  connection?: ModuleGraphConnection;
  
  /** 依赖所属的父模块 */
  parentModule?: Module;
  
  /** 父区块（用于异步依赖） */
  parentBlock?: DependenciesBlock;
}

/**
 * 连接状态
 */
export const enum ConnectionState {
  /** 未连接 */
  UNCONNECTED = 0,
  /** 已连接 */
  CONNECTED = 1,
  /** 过渡中 */
  TRANSITIVE = 2,
}
```

## ModuleGraph 类实现

```typescript
export class ModuleGraph {
  /** 模块 → ModuleGraphModule 的映射 */
  private _moduleMap: WeakMap<Module, ModuleGraphModule> = new WeakMap();
  
  /** 依赖 → ModuleGraphDependency 的映射 */
  private _dependencyMap: WeakMap<Dependency, ModuleGraphDependency> = new WeakMap();
  
  /** 缓存的 ModuleGraphModule 对象 */
  private _cache: Map<Module, ModuleGraphModule> = new Map();
  
  constructor() {}
  
  // =================== 模块级操作 ===================
  
  /**
   * 获取或创建模块的图信息
   */
  private _getModuleGraphModule(module: Module): ModuleGraphModule {
    let mgm = this._moduleMap.get(module);
    
    if (!mgm) {
      mgm = {
        incomingConnections: new Set(),
        outgoingConnections: new Map(),
        exports: new ExportsInfo(),
        preOrderIndex: null,
        postOrderIndex: null,
        depth: null,
        async: false,
      };
      this._moduleMap.set(module, mgm);
    }
    
    return mgm;
  }
  
  /**
   * 获取模块的图信息（只读）
   */
  getModuleGraphModule(module: Module): ModuleGraphModule | undefined {
    return this._moduleMap.get(module);
  }
  
  // =================== 依赖级操作 ===================
  
  /**
   * 获取或创建依赖的图信息
   */
  private _getModuleGraphDependency(dependency: Dependency): ModuleGraphDependency {
    let mgd = this._dependencyMap.get(dependency);
    
    if (!mgd) {
      mgd = {};
      this._dependencyMap.set(dependency, mgd);
    }
    
    return mgd;
  }
  
  /**
   * 设置依赖的父模块
   */
  setParents(
    dependency: Dependency,
    parentModule: Module | null,
    parentBlock?: DependenciesBlock
  ): void {
    const mgd = this._getModuleGraphDependency(dependency);
    mgd.parentModule = parentModule ?? undefined;
    mgd.parentBlock = parentBlock;
  }
  
  /**
   * 获取依赖的父模块
   */
  getParentModule(dependency: Dependency): Module | undefined {
    const mgd = this._dependencyMap.get(dependency);
    return mgd?.parentModule;
  }
  
  // =================== 连接操作 ===================
  
  /**
   * 设置依赖解析结果（建立连接）
   */
  setResolvedModule(
    originModule: Module | null,
    dependency: Dependency,
    module: Module
  ): void {
    const connection = new ModuleGraphConnection(
      originModule,
      module,
      dependency
    );
    
    // 设置依赖的连接
    const mgd = this._getModuleGraphDependency(dependency);
    mgd.connection = connection;
    
    // 添加到源模块的出边
    if (originModule) {
      const originMgm = this._getModuleGraphModule(originModule);
      originMgm.outgoingConnections.set(dependency, connection);
    }
    
    // 添加到目标模块的入边
    const targetMgm = this._getModuleGraphModule(module);
    targetMgm.incomingConnections.add(connection);
  }
  
  /**
   * 获取依赖对应的模块
   */
  getModule(dependency: Dependency): Module | null {
    const mgd = this._dependencyMap.get(dependency);
    return mgd?.connection?.module ?? null;
  }
  
  /**
   * 获取依赖对应的连接
   */
  getConnection(dependency: Dependency): ModuleGraphConnection | undefined {
    const mgd = this._dependencyMap.get(dependency);
    return mgd?.connection;
  }
  
  // =================== 遍历操作 ===================
  
  /**
   * 获取模块的所有依赖模块
   */
  getOutgoingConnections(module: Module): Iterable<ModuleGraphConnection> {
    const mgm = this._moduleMap.get(module);
    return mgm ? mgm.outgoingConnections.values() : [];
  }
  
  /**
   * 获取依赖该模块的所有连接
   */
  getIncomingConnections(module: Module): Set<ModuleGraphConnection> {
    const mgm = this._moduleMap.get(module);
    return mgm?.incomingConnections ?? new Set();
  }
  
  /**
   * 获取依赖该模块的所有模块
   */
  getIncomingModules(module: Module): Module[] {
    const connections = this.getIncomingConnections(module);
    const modules: Module[] = [];
    
    for (const connection of connections) {
      if (connection.originModule) {
        modules.push(connection.originModule);
      }
    }
    
    return modules;
  }
  
  /**
   * 获取模块依赖的所有模块
   */
  getOutgoingModules(module: Module): Module[] {
    const mgm = this._moduleMap.get(module);
    if (!mgm) return [];
    
    const modules: Module[] = [];
    for (const connection of mgm.outgoingConnections.values()) {
      modules.push(connection.module);
    }
    
    return modules;
  }
  
  // =================== 导出信息 ===================
  
  /**
   * 获取模块的导出信息
   */
  getExportsInfo(module: Module): ExportsInfo {
    const mgm = this._getModuleGraphModule(module);
    return mgm.exports;
  }
  
  /**
   * 获取特定导出的信息
   */
  getExportInfo(module: Module, exportName: string): ExportInfo {
    return this.getExportsInfo(module).getExportInfo(exportName);
  }
  
  /**
   * 获取模块的 used exports
   */
  getUsedExports(
    module: Module,
    runtime: RuntimeSpec
  ): UsedExports {
    const exportsInfo = this.getExportsInfo(module);
    return exportsInfo.getUsedExports(runtime);
  }
  
  // =================== 深度与排序 ===================
  
  /**
   * 设置模块深度
   */
  setDepth(module: Module, depth: number): void {
    const mgm = this._getModuleGraphModule(module);
    mgm.depth = depth;
  }
  
  /**
   * 获取模块深度
   */
  getDepth(module: Module): number | null {
    const mgm = this._moduleMap.get(module);
    return mgm?.depth ?? null;
  }
  
  /**
   * 设置前序遍历索引
   */
  setPreOrderIndex(module: Module, index: number): void {
    const mgm = this._getModuleGraphModule(module);
    mgm.preOrderIndex = index;
  }
  
  /**
   * 设置后序遍历索引
   */
  setPostOrderIndex(module: Module, index: number): void {
    const mgm = this._getModuleGraphModule(module);
    mgm.postOrderIndex = index;
  }
}
```

## ModuleGraphConnection 实现

```typescript
export class ModuleGraphConnection {
  originModule: Module | null;
  module: Module;
  dependency: Dependency;
  explanation?: string;
  
  private _active: boolean = true;
  private _conditionalActive?: (
    module: Module,
    runtime: RuntimeSpec
  ) => ConnectionState;
  
  constructor(
    originModule: Module | null,
    module: Module,
    dependency: Dependency,
    explanation?: string
  ) {
    this.originModule = originModule;
    this.module = module;
    this.dependency = dependency;
    this.explanation = explanation;
  }
  
  /**
   * 是否是条件性连接
   */
  get conditional(): boolean {
    return this._conditionalActive !== undefined;
  }
  
  /**
   * 获取连接的激活状态
   */
  getActiveState(runtime: RuntimeSpec): ConnectionState {
    if (!this._active) return ConnectionState.UNCONNECTED;
    if (this._conditionalActive) {
      return this._conditionalActive(this.module, runtime);
    }
    return ConnectionState.CONNECTED;
  }
  
  /**
   * 检查连接是否激活
   */
  isActive(runtime: RuntimeSpec): boolean {
    return this.getActiveState(runtime) !== ConnectionState.UNCONNECTED;
  }
  
  /**
   * 检查连接是否目标匹配
   */
  isTargetActive(runtime: RuntimeSpec): boolean {
    const state = this.getActiveState(runtime);
    return state !== ConnectionState.UNCONNECTED;
  }
  
  /**
   * 设置激活状态
   */
  setActive(value: boolean): void {
    this._active = value;
  }
  
  /**
   * 设置条件性激活函数
   */
  setCondition(
    condition: (module: Module, runtime: RuntimeSpec) => ConnectionState
  ): void {
    this._conditionalActive = condition;
  }
  
  /**
   * 添加解释说明
   */
  addExplanation(explanation: string): void {
    if (this.explanation) {
      this.explanation += '\n' + explanation;
    } else {
      this.explanation = explanation;
    }
  }
}
```

## ExportsInfo：导出信息管理

ExportsInfo 是 Tree Shaking 的核心数据结构：

```typescript
export type UsedExports = boolean | Set<string> | null;

export class ExportsInfo {
  /** 各导出的信息 */
  private _exports: Map<string, ExportInfo> = new Map();
  
  /** 其他导出（export *）的信息 */
  private _otherExportsInfo: ExportInfo;
  
  /** 副作用标记 */
  private _sideEffectsOnly: boolean = false;
  
  constructor() {
    this._otherExportsInfo = new ExportInfo('*');
  }
  
  /**
   * 获取或创建导出信息
   */
  getExportInfo(name: string): ExportInfo {
    let info = this._exports.get(name);
    if (!info) {
      info = new ExportInfo(name);
      this._exports.set(name, info);
    }
    return info;
  }
  
  /**
   * 获取导出（只读）
   */
  getReadOnlyExportInfo(name: string): ExportInfo | undefined {
    return this._exports.get(name) ?? this._otherExportsInfo;
  }
  
  /**
   * 设置导出已使用
   */
  setUsedInUnknownWay(runtime: RuntimeSpec): boolean {
    let changed = false;
    
    for (const [, info] of this._exports) {
      if (info.setUsed(UsageState.Used, runtime)) {
        changed = true;
      }
    }
    
    if (this._otherExportsInfo.setUsed(UsageState.Used, runtime)) {
      changed = true;
    }
    
    return changed;
  }
  
  /**
   * 获取使用的导出
   */
  getUsedExports(runtime: RuntimeSpec): UsedExports {
    // 检查是否有任何导出被标记
    let hasUsed = false;
    let hasUnused = false;
    const usedExports = new Set<string>();
    
    for (const [name, info] of this._exports) {
      const used = info.getUsed(runtime);
      if (used === UsageState.Used) {
        hasUsed = true;
        usedExports.add(name);
      } else if (used === UsageState.Unused) {
        hasUnused = true;
      }
    }
    
    // 检查 otherExportsInfo
    const otherUsed = this._otherExportsInfo.getUsed(runtime);
    if (otherUsed === UsageState.Used) {
      // 全部使用
      return true;
    }
    
    if (!hasUsed && !hasUnused) {
      return null; // 未知
    }
    
    if (hasUsed) {
      return usedExports;
    }
    
    return false; // 全部未使用
  }
  
  /**
   * 获取提供的导出
   */
  getProvidedExports(): string[] | true | null {
    const exports: string[] = [];
    
    for (const [name, info] of this._exports) {
      if (info.provided === true) {
        exports.push(name);
      } else if (info.provided === null) {
        return null; // 未知
      }
    }
    
    // 如果有 * 导出
    if (this._otherExportsInfo.provided === true) {
      return true; // 无法确定
    }
    
    return exports;
  }
}

export const enum UsageState {
  Unused = 0,
  OnlyPropertiesUsed = 1,
  NoInfo = 2,
  Unknown = 3,
  Used = 4,
}

export class ExportInfo {
  name: string;
  
  /** 是否被提供（源码中有这个导出） */
  provided: boolean | null = null;
  
  /** 使用状态 */
  private _usedInRuntime: Map<string, UsageState> = new Map();
  
  /** 重导出目标 */
  private _target: Map<Dependency, { module: Module; export: string[] }> = new Map();
  
  constructor(name: string) {
    this.name = name;
  }
  
  /**
   * 设置使用状态
   */
  setUsed(newValue: UsageState, runtime: RuntimeSpec): boolean {
    const key = runtime?.toString() ?? '*';
    const oldValue = this._usedInRuntime.get(key) ?? UsageState.Unused;
    
    if (oldValue !== newValue) {
      this._usedInRuntime.set(key, newValue);
      return true;
    }
    
    return false;
  }
  
  /**
   * 获取使用状态
   */
  getUsed(runtime: RuntimeSpec): UsageState {
    const key = runtime?.toString() ?? '*';
    return this._usedInRuntime.get(key) ?? UsageState.NoInfo;
  }
  
  /**
   * 设置重导出目标
   */
  setTarget(
    dependency: Dependency,
    module: Module,
    exportName: string[]
  ): void {
    this._target.set(dependency, { module, export: exportName });
  }
  
  /**
   * 获取重导出目标
   */
  getTarget(): { module: Module; export: string[] } | undefined {
    // 简化：返回第一个目标
    for (const target of this._target.values()) {
      return target;
    }
    return undefined;
  }
}
```

## 实际使用场景

### 场景一：构建依赖图

```typescript
// 在 Compilation 中构建 ModuleGraph
class Compilation {
  processModuleDependencies(module: Module, callback: Callback) {
    // 遍历模块的所有依赖
    for (const dependency of module.dependencies) {
      // 设置依赖的父模块
      this.moduleGraph.setParents(dependency, module, module);
      
      // 解析依赖
      this.handleModuleCreation(dependency, (err, resolvedModule) => {
        if (resolvedModule) {
          // 建立连接
          this.moduleGraph.setResolvedModule(
            module,
            dependency,
            resolvedModule
          );
        }
      });
    }
  }
}
```

### 场景二：Tree Shaking 分析

```typescript
// 分析 unused exports
class UsedExportsPlugin {
  apply(compiler: Compiler) {
    compiler.hooks.compilation.tap('UsedExportsPlugin', (compilation) => {
      compilation.hooks.optimizeTree.tapAsync('UsedExportsPlugin', 
        (chunks, modules, callback) => {
          const { moduleGraph } = compilation;
          
          // 从入口开始，标记使用的导出
          for (const entryModule of compilation.getEntryModules()) {
            this.walkModule(entryModule, moduleGraph);
          }
          
          callback();
        }
      );
    });
  }
  
  walkModule(module: Module, moduleGraph: ModuleGraph) {
    // 获取所有出边连接
    for (const connection of moduleGraph.getOutgoingConnections(module)) {
      const dep = connection.dependency;
      
      // 如果是导入依赖，标记使用的导出
      if (dep instanceof HarmonyImportDependency) {
        const importedModule = connection.module;
        const exportName = dep.name; // 导入的名称
        
        const exportsInfo = moduleGraph.getExportsInfo(importedModule);
        exportsInfo.getExportInfo(exportName).setUsed(UsageState.Used, null);
      }
    }
  }
}
```

### 场景三：模块遍历

```typescript
// 从入口遍历所有模块
function traverseModules(
  entryModule: Module,
  moduleGraph: ModuleGraph,
  callback: (module: Module, depth: number) => void
) {
  const visited = new Set<Module>();
  const queue: Array<{ module: Module; depth: number }> = [
    { module: entryModule, depth: 0 }
  ];
  
  while (queue.length > 0) {
    const { module, depth } = queue.shift()!;
    
    if (visited.has(module)) continue;
    visited.add(module);
    
    callback(module, depth);
    
    // 获取所有依赖的模块
    for (const depModule of moduleGraph.getOutgoingModules(module)) {
      if (!visited.has(depModule)) {
        queue.push({ module: depModule, depth: depth + 1 });
      }
    }
  }
}
```

## 与 Webpack 4 的对比

| 特性 | Webpack 4 | Webpack 5 ModuleGraph |
|------|-----------|----------------------|
| 数据位置 | 分散在 Module/Dependency | 集中在 ModuleGraph |
| dependency.module | 可变 | 不可变（通过 getModule 查询） |
| module.reasons | 存储在模块上 | getIncomingConnections |
| 导出分析 | 分散实现 | 统一的 ExportsInfo |
| 缓存友好 | 困难 | 结构清晰，易于序列化 |

## 小结

ModuleGraph 是 Webpack 5 的核心创新之一，它将模块依赖关系的管理从"分散"变为"集中"。

关键要点：

1. **三层结构**：ModuleGraphModule、ModuleGraphConnection、ModuleGraphDependency
2. **双向连接**：入边（incomingConnections）和出边（outgoingConnections）
3. **导出信息**：ExportsInfo 支撑 Tree Shaking
4. **不可变查询**：通过方法查询，而非直接访问属性

下一节，我们将学习 ChunkGraph——模块如何被分组到代码块中。
