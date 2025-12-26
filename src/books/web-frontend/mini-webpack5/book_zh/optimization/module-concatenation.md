---
sidebar_position: 114
title: "Module Concatenation 模块合并"
---

# Module Concatenation 模块合并

Module Concatenation 是 Scope Hoisting 的具体实现机制，深入了解其工作原理有助于编写更易优化的代码。

## 合并算法

### 依赖图分析

```typescript
class ConcatenationAnalyzer {
  analyze(modules: Module[], moduleGraph: ModuleGraph): ConcatenationResult {
    // 构建模块依赖图
    const graph = this.buildGraph(modules, moduleGraph);
    
    // 找出可合并的组
    const groups = this.findConcatenableGroups(graph);
    
    // 验证组的有效性
    const validGroups = this.validateGroups(groups, moduleGraph);
    
    return { groups: validGroups };
  }
  
  buildGraph(modules: Module[], moduleGraph: ModuleGraph): DependencyGraph {
    const graph: DependencyGraph = {
      nodes: new Map(),
      edges: [],
    };
    
    for (const module of modules) {
      const node: GraphNode = {
        module,
        incoming: [],
        outgoing: [],
        isEsm: this.isEsmModule(module),
      };
      
      graph.nodes.set(module, node);
    }
    
    // 建立边
    for (const module of modules) {
      const node = graph.nodes.get(module)!;
      
      for (const connection of moduleGraph.getOutgoingConnections(module)) {
        const targetModule = connection.module;
        if (!targetModule) continue;
        
        const targetNode = graph.nodes.get(targetModule);
        if (!targetNode) continue;
        
        const edge: GraphEdge = {
          from: node,
          to: targetNode,
          dependency: connection.dependency,
          isHarmony: this.isHarmonyDependency(connection.dependency),
        };
        
        node.outgoing.push(edge);
        targetNode.incoming.push(edge);
        graph.edges.push(edge);
      }
    }
    
    return graph;
  }
  
  isEsmModule(module: Module): boolean {
    return module.buildMeta?.exportsType === 'namespace';
  }
  
  isHarmonyDependency(dep: Dependency): boolean {
    return (
      dep instanceof HarmonyImportSpecifierDependency ||
      dep instanceof HarmonyExportSpecifierDependency ||
      dep instanceof HarmonyImportSideEffectDependency
    );
  }
}
```

### 组构建策略

```typescript
class ConcatenationAnalyzer {
  findConcatenableGroups(graph: DependencyGraph): ConcatenationGroup[] {
    const groups: ConcatenationGroup[] = [];
    const visited = new Set<Module>();
    
    // 从叶子模块开始（被依赖最多的）
    const sortedModules = this.sortByDependencyCount(graph);
    
    for (const module of sortedModules) {
      if (visited.has(module)) continue;
      
      const node = graph.nodes.get(module)!;
      if (!node.isEsm) continue;
      
      // 尝试以此模块为根构建组
      const group = this.buildGroup(node, graph, visited);
      
      if (group.modules.length > 1) {
        groups.push(group);
      }
    }
    
    return groups;
  }
  
  buildGroup(
    rootNode: GraphNode,
    graph: DependencyGraph,
    visited: Set<Module>
  ): ConcatenationGroup {
    const group: ConcatenationGroup = {
      root: rootNode.module,
      modules: [rootNode.module],
    };
    
    const queue = [...rootNode.outgoing];
    
    while (queue.length > 0) {
      const edge = queue.shift()!;
      const targetNode = edge.to;
      
      // 检查是否可以合并
      if (!this.canIncludeInGroup(targetNode, group, graph)) {
        continue;
      }
      
      group.modules.push(targetNode.module);
      visited.add(targetNode.module);
      
      // 继续探索目标模块的依赖
      queue.push(...targetNode.outgoing);
    }
    
    return group;
  }
  
  canIncludeInGroup(
    node: GraphNode,
    group: ConcatenationGroup,
    graph: DependencyGraph
  ): boolean {
    // 必须是 ESM
    if (!node.isEsm) return false;
    
    // 检查所有入边是否来自组内
    for (const edge of node.incoming) {
      if (!edge.isHarmony) return false;
      
      if (!group.modules.includes(edge.from.module)) {
        // 有来自组外的依赖
        return false;
      }
    }
    
    return true;
  }
}
```

## 内部结构

### InnerGraph 分析

```typescript
class InnerGraphAnalyzer {
  // 分析模块内部的变量使用关系
  analyze(module: Module, parser: JavascriptParser): InnerGraph {
    const graph: InnerGraph = {
      exports: new Map(),
      variables: new Map(),
      usages: [],
    };
    
    // 收集导出
    for (const dep of module.dependencies) {
      if (dep instanceof HarmonyExportSpecifierDependency) {
        graph.exports.set(dep.name, {
          name: dep.name,
          localBinding: dep.id,
          usedBy: [],
        });
      }
    }
    
    // 分析变量使用
    const ast = parser.state.current;
    this.walkAst(ast, graph);
    
    return graph;
  }
  
  walkAst(ast: ESTree.Node, graph: InnerGraph): void {
    // 遍历 AST 收集变量使用关系
    walk(ast, {
      enter(node, parent) {
        if (node.type === 'Identifier') {
          const usage: VariableUsage = {
            name: node.name,
            context: parent,
          };
          graph.usages.push(usage);
        }
      },
    });
  }
}
```

### 导出追踪

```typescript
class ExportTracker {
  track(module: Module, moduleGraph: ModuleGraph): ExportTracking {
    const tracking: ExportTracking = {
      directExports: [],
      reexports: [],
      namespaceExports: [],
    };
    
    for (const dep of module.dependencies) {
      if (dep instanceof HarmonyExportSpecifierDependency) {
        // export { foo }
        tracking.directExports.push({
          name: dep.name,
          localBinding: dep.id,
        });
      }
      
      if (dep instanceof HarmonyExportImportedSpecifierDependency) {
        const targetModule = moduleGraph.getModule(dep);
        
        if (dep.name) {
          // export { foo } from './module'
          tracking.reexports.push({
            name: dep.name,
            from: targetModule,
            originalName: dep.id,
          });
        } else {
          // export * from './module'
          tracking.namespaceExports.push({
            from: targetModule,
          });
        }
      }
    }
    
    return tracking;
  }
}
```

## 代码转换

### 导入转换

```typescript
class ImportTransformer {
  transform(
    module: Module,
    group: ConcatenationGroup,
    context: TransformContext
  ): TransformResult {
    const source = new ReplaceSource(module.originalSource());
    
    for (const dep of module.dependencies) {
      if (dep instanceof HarmonyImportSpecifierDependency) {
        this.transformImport(dep, source, group, context);
      }
    }
    
    return { source };
  }
  
  transformImport(
    dep: HarmonyImportSpecifierDependency,
    source: ReplaceSource,
    group: ConcatenationGroup,
    context: TransformContext
  ): void {
    const targetModule = context.moduleGraph.getModule(dep);
    
    if (group.modules.includes(targetModule)) {
      // 目标模块在同一组内，直接使用变量
      const localName = this.getLocalName(dep.name, targetModule, context);
      
      // 替换 import 使用
      source.replace(
        dep.range[0],
        dep.range[1] - 1,
        localName
      );
    } else {
      // 目标模块在组外，保持 require 调用
      const externalName = this.getExternalName(targetModule, dep.name, context);
      
      source.replace(
        dep.range[0],
        dep.range[1] - 1,
        externalName
      );
    }
  }
  
  getLocalName(
    name: string,
    module: Module,
    context: TransformContext
  ): string {
    // 获取模块内的变量名，处理重命名
    const prefix = this.getModulePrefix(module, context);
    return `${prefix}_${name}`;
  }
  
  getModulePrefix(module: Module, context: TransformContext): string {
    // 为每个模块生成唯一前缀
    const index = context.group.modules.indexOf(module);
    return `__WEBPACK_MODULE_${index}__`;
  }
}
```

### 导出转换

```typescript
class ExportTransformer {
  transform(
    module: Module,
    group: ConcatenationGroup,
    context: TransformContext
  ): TransformResult {
    const source = new ReplaceSource(module.originalSource());
    
    // 只有根模块需要导出
    if (module !== group.root) {
      // 移除 export 关键字，保留声明
      this.removeExportKeywords(module, source);
    } else {
      // 根模块保持导出
      this.transformRootExports(module, source, group, context);
    }
    
    return { source };
  }
  
  removeExportKeywords(module: Module, source: ReplaceSource): void {
    for (const dep of module.dependencies) {
      if (dep instanceof HarmonyExportSpecifierDependency) {
        // 移除 export 声明
        if (dep.range) {
          source.replace(dep.range[0], dep.range[1] - 1, '');
        }
      }
    }
  }
  
  transformRootExports(
    module: Module,
    source: ReplaceSource,
    group: ConcatenationGroup,
    context: TransformContext
  ): void {
    // 收集所有需要导出的内容
    const exports: ExportItem[] = [];
    
    for (const m of group.modules) {
      const exportsInfo = context.moduleGraph.getExportsInfo(m);
      
      for (const [name, info] of exportsInfo.exports) {
        if (info.provided && info.used) {
          exports.push({
            name,
            from: m,
            localBinding: info.name,
          });
        }
      }
    }
    
    // 生成导出代码
    const exportCode = this.generateExportCode(exports, context);
    source.add('\n' + exportCode);
  }
  
  generateExportCode(exports: ExportItem[], context: TransformContext): string {
    const lines: string[] = [];
    
    for (const exp of exports) {
      const localName = this.getLocalName(exp.from, exp.localBinding, context);
      lines.push(
        `__webpack_require__.d(__webpack_exports__, ${JSON.stringify(exp.name)}, ` +
        `function() { return ${localName}; });`
      );
    }
    
    return lines.join('\n');
  }
}
```

## 运行时处理

### 外部模块引用

```typescript
class ExternalReferenceHandler {
  handle(
    group: ConcatenationGroup,
    compilation: Compilation
  ): ExternalReferences {
    const refs: ExternalReferences = {
      imports: [],
      reexports: [],
    };
    
    for (const module of group.modules) {
      for (const dep of module.dependencies) {
        const targetModule = compilation.moduleGraph.getModule(dep);
        
        if (!targetModule) continue;
        if (group.modules.includes(targetModule)) continue;
        
        // 外部依赖
        if (dep instanceof HarmonyImportSpecifierDependency) {
          refs.imports.push({
            module: targetModule,
            name: dep.name,
            usedIn: module,
          });
        }
      }
    }
    
    return refs;
  }
  
  generateExternalAccess(refs: ExternalReferences): string {
    const lines: string[] = [];
    
    // 生成外部模块的 require
    const moduleIds = new Set<Module>();
    for (const ref of refs.imports) {
      moduleIds.add(ref.module);
    }
    
    for (const module of moduleIds) {
      const varName = this.getModuleVarName(module);
      const moduleId = this.getModuleId(module);
      lines.push(`var ${varName} = __webpack_require__(${JSON.stringify(moduleId)});`);
    }
    
    return lines.join('\n');
  }
}
```

## 优化效果分析

### 体积对比

```javascript
// 示例：5 个小模块
// a.js: export const a = 1;
// b.js: export const b = 2;
// c.js: import { a } from './a'; import { b } from './b'; export const c = a + b;
// d.js: import { c } from './c'; export const d = c * 2;
// e.js: import { d } from './d'; console.log(d);

// 无 Concatenation（约 2KB）
var __webpack_modules__ = {
  './a.js': (m, e) => { e.a = 1; },
  './b.js': (m, e) => { e.b = 2; },
  './c.js': (m, e, r) => { 
    var a = r('./a.js'); var b = r('./b.js'); 
    e.c = a.a + b.b; 
  },
  './d.js': (m, e, r) => { var c = r('./c.js'); e.d = c.c * 2; },
  './e.js': (m, e, r) => { var d = r('./d.js'); console.log(d.d); },
};

// 有 Concatenation（约 0.5KB）
(function() {
  const a = 1;
  const b = 2;
  const c = a + b;
  const d = c * 2;
  console.log(d);
})();
```

### 性能对比

```javascript
// 运行时对比
// 无 Concatenation：
// - 5 次函数创建
// - 4 次 __webpack_require__ 调用
// - 多层作用域链查找

// 有 Concatenation：
// - 1 次函数创建
// - 0 次 require 调用
// - 单层作用域
```

## 调试与分析

### 查看合并结果

```javascript
module.exports = {
  stats: {
    optimizationBailout: true,
    nestedModules: true,  // 显示合并的模块
  },
};

// 输出示例：
// ./src/index.js + 4 modules 1.2 KiB
//   └── ./src/a.js
//   └── ./src/b.js
//   └── ./src/c.js
//   └── ./src/d.js
```

### 编程分析

```typescript
class ConcatenationReporter {
  report(compilation: Compilation): void {
    for (const module of compilation.modules) {
      if (module instanceof ConcatenatedModule) {
        console.log(`Concatenated: ${module.identifier()}`);
        console.log(`  Root: ${module.rootModule.identifier()}`);
        console.log(`  Modules: ${module.modules.length}`);
        
        for (const m of module.modules) {
          console.log(`    - ${m.identifier()}`);
        }
      }
    }
  }
}
```

## 总结

Module Concatenation 模块合并的核心要点：

**合并算法**：
- 依赖图分析
- 组构建策略
- 有效性验证

**代码转换**：
- 导入转换为直接引用
- 导出转换为变量声明
- 变量重命名避免冲突

**限制条件**：
- 必须是 ESM
- 单一入边约束
- 无 eval 和顶层 this

**优化效果**：
- 减少代码体积
- 消除运行时开销
- 简化作用域链

**调试方法**：
- nestedModules 显示合并模块
- optimizationBailout 显示失败原因

**下一章**：我们将学习 TerserPlugin 与代码压缩集成。
