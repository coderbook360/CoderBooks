---
sidebar_position: 33
title: "processModuleDependencies 方法：依赖处理"
---

# processModuleDependencies 方法：依赖处理

模块构建完成后，我们得到了它的依赖列表。但这些依赖本身也是模块，也需要被解析、构建。`processModuleDependencies` 负责递归处理这些依赖，直到整个依赖树被完全遍历。

## 依赖处理的核心问题

思考这样的代码结构：

```javascript
// index.js
import { add } from './math';
import { log } from './utils';

// math.js
import { isNumber } from './validate';
export const add = (a, b) => a + b;

// utils.js
import { format } from './format';
export const log = console.log;

// validate.js
export const isNumber = (n) => typeof n === 'number';

// format.js
export const format = (str) => str.trim();
```

依赖关系是一棵树：

```
                 index.js
                /        \
           math.js      utils.js
              |            |
         validate.js   format.js
```

`processModuleDependencies` 需要：

1. 遍历当前模块的所有依赖
2. 对每个依赖执行 `factorize → build` 流程
3. 递归处理新模块的依赖
4. 处理循环依赖

## 基本实现

```typescript
export class Compilation {
  /**
   * 处理模块的依赖
   */
  processModuleDependencies(
    module: Module,
    callback: (err?: Error) => void
  ): void {
    // 收集所有需要处理的依赖
    const dependencies: Array<{
      factory: ModuleFactory;
      dependencies: Dependency[];
      originModule: Module;
    }> = [];
    
    // 从 dependencies 收集
    for (const dependency of module.dependencies) {
      this.collectDependency(module, dependency, dependencies);
    }
    
    // 从 blocks（异步依赖块）收集
    for (const block of module.blocks) {
      for (const dependency of block.dependencies) {
        this.collectDependency(module, dependency, dependencies);
      }
      // 递归处理嵌套块
      this.processBlocks(module, block, dependencies);
    }
    
    // 如果没有依赖，直接返回
    if (dependencies.length === 0) {
      return callback();
    }
    
    // 并行处理所有依赖
    this.processDependencies(dependencies, callback);
  }
  
  /**
   * 收集单个依赖
   */
  private collectDependency(
    module: Module,
    dependency: Dependency,
    result: Array<{
      factory: ModuleFactory;
      dependencies: Dependency[];
      originModule: Module;
    }>
  ): void {
    // 获取依赖对应的模块工厂
    const Dep = dependency.constructor as typeof Dependency;
    const factory = this.dependencyFactories.get(Dep);
    
    if (!factory) {
      // 某些依赖不需要创建模块（如 ConstDependency）
      return;
    }
    
    // 检查依赖是否有模块请求
    if (!dependency.request) {
      return;
    }
    
    // 设置依赖的父模块
    this.moduleGraph.setParents(dependency, module, module);
    
    // 添加到待处理列表
    result.push({
      factory,
      dependencies: [dependency],
      originModule: module,
    });
  }
  
  /**
   * 处理依赖块
   */
  private processBlocks(
    module: Module,
    block: DependenciesBlock,
    result: Array<{
      factory: ModuleFactory;
      dependencies: Dependency[];
      originModule: Module;
    }>
  ): void {
    // 处理嵌套块
    for (const childBlock of block.blocks || []) {
      for (const dependency of childBlock.dependencies) {
        this.collectDependency(module, dependency, result);
      }
      this.processBlocks(module, childBlock, result);
    }
  }
}
```

## 并行处理依赖

依赖之间通常是独立的，可以并行处理：

```typescript
export class Compilation {
  /**
   * 并行处理依赖列表
   */
  private processDependencies(
    dependencies: Array<{
      factory: ModuleFactory;
      dependencies: Dependency[];
      originModule: Module;
    }>,
    callback: (err?: Error) => void
  ): void {
    let remaining = dependencies.length;
    let hasError = false;
    
    const onComplete = (err?: Error) => {
      if (hasError) return;
      
      if (err) {
        hasError = true;
        return callback(err);
      }
      
      remaining--;
      if (remaining === 0) {
        callback();
      }
    };
    
    for (const item of dependencies) {
      this.handleModuleCreation(
        {
          factory: item.factory,
          dependencies: item.dependencies,
          context: item.originModule.context,
          originModule: item.originModule,
        },
        onComplete
      );
    }
  }
}
```

## 使用队列优化

实际上，Webpack 使用队列来控制并行度：

```typescript
export class Compilation {
  private processDependenciesQueue: AsyncQueue<ProcessDependenciesJob, void>;
  
  constructor(compiler: Compiler, params: CompilationParams) {
    this.processDependenciesQueue = new AsyncQueue({
      name: 'processDependencies',
      parallelism: 100,
      processor: this._processModuleDependencies.bind(this),
    });
  }
  
  processModuleDependencies(
    module: Module,
    callback: (err?: Error) => void
  ): void {
    this.processDependenciesQueue.add({ module }, callback);
  }
  
  private _processModuleDependencies(
    job: { module: Module },
    callback: (err?: Error) => void
  ): void {
    const { module } = job;
    
    // 收集依赖
    const dependencies = this.collectModuleDependencies(module);
    
    if (dependencies.length === 0) {
      return callback();
    }
    
    // 使用队列处理
    asyncLib.forEach(
      dependencies,
      (item, cb) => {
        this.handleModuleCreation(
          {
            factory: item.factory,
            dependencies: item.dependencies,
            context: module.context,
            originModule: module,
          },
          cb
        );
      },
      callback
    );
  }
  
  private collectModuleDependencies(module: Module): DependencyItem[] {
    const result: DependencyItem[] = [];
    
    // 收集普通依赖
    for (const dep of module.dependencies) {
      const factory = this.getFactory(dep);
      if (factory && dep.request) {
        result.push({ factory, dependencies: [dep] });
      }
    }
    
    // 收集异步块中的依赖
    const queue = [...module.blocks];
    while (queue.length > 0) {
      const block = queue.shift()!;
      
      for (const dep of block.dependencies) {
        const factory = this.getFactory(dep);
        if (factory && dep.request) {
          result.push({ factory, dependencies: [dep] });
        }
      }
      
      if (block.blocks) {
        queue.push(...block.blocks);
      }
    }
    
    return result;
  }
}
```

## 依赖分组

同一模块可能被多处依赖，需要合并处理：

```typescript
export class Compilation {
  /**
   * 按模块请求分组依赖
   */
  private groupDependenciesByRequest(
    dependencies: DependencyItem[]
  ): Map<string, DependencyItem> {
    const grouped = new Map<string, DependencyItem>();
    
    for (const item of dependencies) {
      const dep = item.dependencies[0];
      const key = `${item.factory.constructor.name}|${dep.request}`;
      
      const existing = grouped.get(key);
      if (existing) {
        // 合并依赖
        existing.dependencies.push(...item.dependencies);
      } else {
        grouped.set(key, {
          factory: item.factory,
          dependencies: [...item.dependencies],
        });
      }
    }
    
    return grouped;
  }
  
  private _processModuleDependencies(
    job: { module: Module },
    callback: (err?: Error) => void
  ): void {
    const { module } = job;
    
    // 收集依赖
    const allDependencies = this.collectModuleDependencies(module);
    
    // 按请求分组
    const groupedDependencies = this.groupDependenciesByRequest(allDependencies);
    
    if (groupedDependencies.size === 0) {
      return callback();
    }
    
    // 处理分组后的依赖
    const items = [...groupedDependencies.values()];
    let remaining = items.length;
    
    for (const item of items) {
      this.handleModuleCreation(
        {
          factory: item.factory,
          dependencies: item.dependencies,
          context: module.context,
          originModule: module,
        },
        (err) => {
          if (err && this.bail) {
            return callback(err);
          }
          
          remaining--;
          if (remaining === 0) {
            callback();
          }
        }
      );
    }
  }
}
```

## 循环依赖处理

循环依赖是常见场景：

```javascript
// a.js
import { b } from './b';
export const a = 'a';

// b.js
import { a } from './a';
export const b = 'b';
```

Webpack 如何避免无限循环？

```typescript
export class Compilation {
  /**
   * 处理模块创建（带循环检测）
   */
  handleModuleCreation(
    options: HandleModuleCreationOptions,
    callback: Callback
  ): void {
    const { factory, dependencies, context, originModule } = options;
    
    this.factorizeModule(
      { factory, dependencies, context, originModule },
      (err, factoryResult) => {
        if (err) return callback(err);
        if (!factoryResult) return callback();
        
        const newModule = factoryResult.module;
        
        // 添加模块（会自动去重）
        this.addModule(newModule, (err, module) => {
          if (err) return callback(err);
          
          // 检查是否是新模块
          const isNewModule = module === newModule;
          
          // 建立依赖关系（不管是否新模块）
          for (const dep of dependencies) {
            this.moduleGraph.setResolvedModule(originModule, dep, module!);
          }
          
          if (isNewModule) {
            // 新模块：需要构建和处理依赖
            this.buildModule(module!, (err) => {
              if (err) return callback(err);
              
              // 递归处理依赖
              this.processModuleDependencies(module!, callback);
            });
          } else {
            // 已存在的模块：直接完成（避免循环）
            callback();
          }
        });
      }
    );
  }
}
```

关键点：`addModule` 返回的可能是已存在的模块。如果模块已存在，说明：
1. 要么是循环依赖
2. 要么是多处引用同一模块

两种情况都不需要重新构建，直接返回即可。

## 异步依赖块

动态 import 创建异步依赖块：

```javascript
// 动态导入
const module = await import('./lazy');
```

异步块需要特殊处理：

```typescript
export class AsyncDependenciesBlock extends DependenciesBlock {
  /** 块名称（用于生成 chunk 名） */
  name?: string;
  
  /** 位置信息 */
  loc: DependencyLocation;
  
  /** 预取/预加载 */
  groupOptions?: {
    preloadOrder?: number;
    prefetchOrder?: number;
  };
  
  constructor(name?: string, loc?: DependencyLocation) {
    super();
    this.name = name;
    this.loc = loc ?? { start: { line: 0, column: 0 } };
  }
}

export class Compilation {
  /**
   * 收集模块依赖（包括异步块）
   */
  private collectModuleDependencies(module: Module): DependencyItem[] {
    const result: DependencyItem[] = [];
    
    // 普通依赖
    for (const dep of module.dependencies) {
      this.addDependencyItem(dep, module, result);
    }
    
    // 异步块
    const blockQueue = [...module.blocks];
    while (blockQueue.length > 0) {
      const block = blockQueue.shift()!;
      
      // 块的依赖
      for (const dep of block.dependencies) {
        // 设置块作为父级
        this.moduleGraph.setParents(dep, module, block);
        this.addDependencyItem(dep, module, result);
      }
      
      // 嵌套块
      if (block.blocks) {
        blockQueue.push(...block.blocks);
      }
    }
    
    return result;
  }
  
  private addDependencyItem(
    dep: Dependency,
    module: Module,
    result: DependencyItem[]
  ): void {
    const factory = this.getFactory(dep);
    if (factory && (dep as ModuleDependency).request) {
      result.push({
        factory,
        dependencies: [dep],
      });
    }
  }
}
```

## 依赖排序

依赖的处理顺序会影响模块 ID：

```typescript
export class Compilation {
  /**
   * 按深度优先顺序处理依赖
   */
  private processModuleDependenciesDepthFirst(
    module: Module,
    callback: (err?: Error) => void
  ): void {
    const dependencies = this.collectModuleDependencies(module);
    
    // 按依赖在源码中的位置排序
    dependencies.sort((a, b) => {
      const locA = a.dependencies[0].loc?.start ?? { line: 0, column: 0 };
      const locB = b.dependencies[0].loc?.start ?? { line: 0, column: 0 };
      
      return locA.line - locB.line || locA.column - locB.column;
    });
    
    // 串行处理（保证顺序）
    let index = 0;
    
    const processNext = () => {
      if (index >= dependencies.length) {
        return callback();
      }
      
      const item = dependencies[index++];
      
      this.handleModuleCreation(
        {
          factory: item.factory,
          dependencies: item.dependencies,
          context: module.context,
          originModule: module,
        },
        (err) => {
          if (err && this.bail) {
            return callback(err);
          }
          
          processNext();
        }
      );
    };
    
    processNext();
  }
}
```

## 错误处理

依赖处理中的错误需要妥善处理：

```typescript
export class Compilation {
  private _processModuleDependencies(
    job: { module: Module },
    callback: (err?: Error) => void
  ): void {
    const { module } = job;
    const dependencies = this.collectModuleDependencies(module);
    
    if (dependencies.length === 0) {
      return callback();
    }
    
    const errors: Error[] = [];
    let remaining = dependencies.length;
    
    const onComplete = (err?: Error) => {
      if (err) {
        errors.push(err);
        
        if (this.bail) {
          // bail 模式：第一个错误就停止
          remaining = 0;
          return callback(err);
        }
      }
      
      remaining--;
      
      if (remaining === 0) {
        if (errors.length > 0 && !this.bail) {
          // 非 bail 模式：记录错误但继续
          // 错误已经被添加到 this.errors
        }
        callback();
      }
    };
    
    for (const item of dependencies) {
      this.handleModuleCreation(
        {
          factory: item.factory,
          dependencies: item.dependencies,
          context: module.context,
          originModule: module,
        },
        onComplete
      );
    }
  }
}
```

## 完整流程图

```
              buildModule 完成
              module.dependencies 已填充
                      │
                      ▼
    ┌─────────────────────────────────────┐
    │     processModuleDependencies       │
    │                                     │
    │  1. 收集 module.dependencies        │
    │  2. 收集 module.blocks 中的依赖     │
    │  3. 按请求分组                      │
    │  4. 并行处理                        │
    └─────────────────┬───────────────────┘
                      │
                      ▼
    ┌─────────────────────────────────────┐
    │        handleModuleCreation         │
    │                                     │
    │  factorizeModule()                  │
    │       ↓                             │
    │  addModule() ───┬─▶ 新模块          │
    │                 │                   │
    │                 └─▶ 已存在 ─▶ 返回  │
    │       ↓                             │
    │  buildModule()                      │
    │       ↓                             │
    │  processModuleDependencies() ←──────┤ 递归
    │                                     │
    └─────────────────────────────────────┘
```

## 性能考量

依赖处理是 Make 阶段最耗时的部分：

```typescript
export class Compilation {
  // 控制并行度
  private factorizeQueue = new AsyncQueue({
    parallelism: 100, // 最多 100 个并行工厂化
  });
  
  private buildQueue = new AsyncQueue({
    parallelism: 100, // 最多 100 个并行构建
  });
  
  private processDependenciesQueue = new AsyncQueue({
    parallelism: 100, // 最多 100 个并行依赖处理
  });
}

// 性能监控
class ProgressPlugin {
  apply(compiler: Compiler) {
    compiler.hooks.compilation.tap('ProgressPlugin', (compilation) => {
      let modulesCount = 0;
      let processedCount = 0;
      
      compilation.hooks.buildModule.tap('ProgressPlugin', () => {
        modulesCount++;
        this.updateProgress(processedCount, modulesCount);
      });
      
      compilation.hooks.succeedModule.tap('ProgressPlugin', () => {
        processedCount++;
        this.updateProgress(processedCount, modulesCount);
      });
    });
  }
}
```

## 小结

`processModuleDependencies` 是 Webpack Make 阶段的引擎，驱动整个依赖树的遍历。

关键要点：

1. **递归处理**：每个模块的依赖都会触发新一轮的 factorize → build → processModuleDependencies
2. **并行优化**：使用队列控制并行度
3. **循环检测**：通过模块去重避免无限循环
4. **异步块**：动态 import 创建独立的依赖块
5. **分组合并**：同一模块的多个依赖合并处理

至此，我们完成了 Compilation 核心的学习。从 addEntry 到 processModuleDependencies，这就是 Webpack Make 阶段的完整流程。下一部分，我们将深入模块系统——Module 类的设计与实现。
