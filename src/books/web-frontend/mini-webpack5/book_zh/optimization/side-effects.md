---
sidebar_position: 112
title: "sideEffects 副作用处理"
---

# sideEffects 副作用处理

sideEffects 配置告诉 Webpack 哪些模块是"纯净"的——即导入它们不会产生副作用，可以安全地进行更激进的优化。

## 什么是副作用

### 副作用示例

```javascript
// ❌ 有副作用：修改全局状态
window.myLib = {};

// ❌ 有副作用：立即执行
console.log('Module loaded');

// ❌ 有副作用：修改原型
Array.prototype.last = function() {
  return this[this.length - 1];
};

// ❌ 有副作用：CSS 导入
import './styles.css';

// ✅ 无副作用：纯导出
export function add(a, b) {
  return a + b;
}

// ✅ 无副作用：纯类定义
export class Calculator {
  add(a, b) { return a + b; }
}
```

## 配置方式

### package.json 配置

```json
{
  "name": "my-library",
  "sideEffects": false
}
```

```json
{
  "name": "my-library",
  "sideEffects": [
    "*.css",
    "*.scss",
    "./src/polyfills.js",
    "./src/setup.js"
  ]
}
```

### webpack.config.js 配置

```javascript
module.exports = {
  module: {
    rules: [
      {
        test: /\.js$/,
        sideEffects: false,  // 标记所有 JS 无副作用
      },
      {
        test: /\.css$/,
        sideEffects: true,   // CSS 有副作用
      },
    ],
  },
  optimization: {
    sideEffects: true,  // 启用 sideEffects 优化
  },
};
```

## 实现原理

### SideEffectsFlagPlugin

```typescript
class SideEffectsFlagPlugin {
  apply(compiler: Compiler): void {
    compiler.hooks.compilation.tap(
      'SideEffectsFlagPlugin',
      (compilation, { normalModuleFactory }) => {
        // 解析模块时读取 sideEffects 配置
        normalModuleFactory.hooks.module.tap(
          'SideEffectsFlagPlugin',
          (module, createData, resolveData) => {
            const sideEffects = this.getSideEffects(
              createData,
              resolveData
            );
            
            if (sideEffects !== undefined) {
              module.factoryMeta = module.factoryMeta || {};
              module.factoryMeta.sideEffectFree = !sideEffects;
            }
            
            return module;
          }
        );
        
        // 优化阶段处理
        compilation.hooks.optimizeDependencies.tap(
          'SideEffectsFlagPlugin',
          (modules) => {
            this.optimizeDependencies(modules, compilation);
          }
        );
      }
    );
  }
  
  getSideEffects(createData: any, resolveData: any): boolean | undefined {
    // 优先检查 module.rules 配置
    if (createData.settings?.sideEffects !== undefined) {
      return createData.settings.sideEffects;
    }
    
    // 检查 package.json
    const packageJson = resolveData.descriptionFileData;
    if (!packageJson) return undefined;
    
    const sideEffects = packageJson.sideEffects;
    
    if (sideEffects === false) {
      return false;  // 整个包无副作用
    }
    
    if (Array.isArray(sideEffects)) {
      // 检查当前文件是否匹配
      const relativePath = resolveData.relativePath;
      return this.matchSideEffects(relativePath, sideEffects);
    }
    
    return undefined;  // 未指定，假设有副作用
  }
  
  matchSideEffects(path: string, patterns: string[]): boolean {
    for (const pattern of patterns) {
      if (this.matchPattern(path, pattern)) {
        return true;  // 匹配，有副作用
      }
    }
    return false;  // 不匹配，无副作用
  }
  
  matchPattern(path: string, pattern: string): boolean {
    // 支持通配符匹配
    if (pattern.includes('*')) {
      const regex = new RegExp(
        '^' + pattern
          .replace(/\./g, '\\.')
          .replace(/\*/g, '.*')
        + '$'
      );
      return regex.test(path);
    }
    
    return path === pattern || path.endsWith('/' + pattern);
  }
}
```

### 依赖优化

```typescript
class SideEffectsFlagPlugin {
  optimizeDependencies(modules: Module[], compilation: Compilation): void {
    const moduleGraph = compilation.moduleGraph;
    
    for (const module of modules) {
      if (!this.isSideEffectFree(module)) continue;
      
      // 获取指向该模块的连接
      const incomingConnections = moduleGraph.getIncomingConnections(module);
      
      for (const connection of incomingConnections) {
        this.processConnection(connection, module, compilation);
      }
    }
  }
  
  isSideEffectFree(module: Module): boolean {
    return module.factoryMeta?.sideEffectFree === true;
  }
  
  processConnection(
    connection: ModuleGraphConnection,
    module: Module,
    compilation: Compilation
  ): void {
    const dep = connection.dependency;
    
    // 只处理纯副作用导入
    if (!(dep instanceof HarmonyImportSideEffectDependency)) {
      return;
    }
    
    // 如果模块无副作用且没有使用任何导出，可以跳过
    if (this.canSkipModule(module, connection, compilation)) {
      connection.active = false;  // 标记连接为非活跃
    }
  }
  
  canSkipModule(
    module: Module,
    connection: ModuleGraphConnection,
    compilation: Compilation
  ): boolean {
    const moduleGraph = compilation.moduleGraph;
    const exportsInfo = moduleGraph.getExportsInfo(module);
    
    // 检查是否有任何导出被使用
    const usedExports = exportsInfo.getUsedExports();
    
    if (usedExports === false) {
      // 没有导出被使用，可以跳过
      return true;
    }
    
    return false;
  }
}
```

## 重导出优化

### 跳过中间模块

```typescript
// 场景：
// index.js: export { foo } from './utils';
// utils.js: export function foo() { }
// app.js: import { foo } from './index';

// 如果 utils.js 无副作用，可以直接连接 app.js 和 utils.js

class SideEffectsReexportOptimizer {
  optimize(compilation: Compilation): void {
    const moduleGraph = compilation.moduleGraph;
    
    for (const module of compilation.modules) {
      this.optimizeReexports(module, compilation);
    }
  }
  
  optimizeReexports(module: Module, compilation: Compilation): void {
    const moduleGraph = compilation.moduleGraph;
    
    for (const dep of module.dependencies) {
      if (!(dep instanceof HarmonyExportImportedSpecifierDependency)) {
        continue;
      }
      
      const targetModule = moduleGraph.getModule(dep);
      if (!targetModule) continue;
      
      // 检查目标模块是否无副作用
      if (!this.isSideEffectFree(targetModule)) continue;
      
      // 创建直接连接
      this.createDirectConnection(dep, targetModule, module, compilation);
    }
  }
  
  createDirectConnection(
    dep: HarmonyExportImportedSpecifierDependency,
    targetModule: Module,
    currentModule: Module,
    compilation: Compilation
  ): void {
    const moduleGraph = compilation.moduleGraph;
    const exportsInfo = moduleGraph.getExportsInfo(currentModule);
    
    const name = dep.name;
    if (!name) return;  // export * 情况较复杂
    
    const exportInfo = exportsInfo.getExportInfo(name);
    
    // 设置导出目标
    const targetExportsInfo = moduleGraph.getExportsInfo(targetModule);
    const targetExportInfo = targetExportsInfo.getExportInfo(dep.id || name);
    
    exportInfo.target = {
      module: targetModule,
      export: [targetExportInfo.name],
    };
  }
}
```

## 实际效果

### 优化前后对比

```javascript
// 库结构
// my-lib/
//   package.json: { "sideEffects": false }
//   index.js: export { a } from './a'; export { b } from './b';
//   a.js: export const a = 1;
//   b.js: export const b = 2;

// 应用代码
import { a } from 'my-lib';
console.log(a);

// 无 sideEffects 优化
// index.js 和 b.js 都会被包含（因为 index.js 可能有副作用）

// 有 sideEffects 优化
// 只包含 a.js，跳过 index.js 和 b.js
```

### 打包结果

```javascript
// 优化前（约 200 bytes）
/***/ "./node_modules/my-lib/index.js":
/***/ (function(module, exports, __webpack_require__) {
  __webpack_require__("./node_modules/my-lib/a.js");
  __webpack_require__("./node_modules/my-lib/b.js");
}),

/***/ "./node_modules/my-lib/a.js":
/***/ (function(module, exports) {
  const a = 1;
}),

/***/ "./node_modules/my-lib/b.js":
/***/ (function(module, exports) {
  const b = 2;
}),

// 优化后（约 50 bytes）
/***/ "./node_modules/my-lib/a.js":
/***/ (function(module, exports) {
  const a = 1;
}),
```

## 分析工具

### 查看优化决策

```javascript
module.exports = {
  stats: {
    optimizationBailout: true,  // 显示优化失败原因
  },
};

// 输出示例：
// ./src/utils.js
//   ModuleConcatenation bailout: Module is not an ECMAScript module
```

### 编程方式检查

```typescript
class SideEffectsAnalyzer {
  analyze(compilation: Compilation): SideEffectsReport {
    const report: SideEffectsReport = {
      modules: [],
    };
    
    for (const module of compilation.modules) {
      const sideEffectFree = module.factoryMeta?.sideEffectFree;
      const skipped = !compilation.moduleGraph
        .getIncomingConnections(module)
        .some(c => c.active);
      
      report.modules.push({
        id: module.identifier(),
        sideEffectFree,
        skipped,
      });
    }
    
    return report;
  }
}
```

## 注意事项

### 常见陷阱

```javascript
// ❌ 错误：顶层代码有副作用
// utils.js
export const API_URL = process.env.API_URL || 'default';  // ✅ 无副作用

let cache = {};  // ❓ 可能被认为有副作用
export function getCache() { return cache; }

// ❌ 类装饰器通常有副作用
@injectable()
export class MyService { }

// ❌ 属性赋值可能有副作用
class MyClass {
  static count = 0;  // 类初始化时执行
}
```

### 安全使用

```javascript
// 确保模块真的无副作用
// ✅ 纯函数导出
export function add(a, b) { return a + b; }

// ✅ 常量导出
export const PI = 3.14159;

// ✅ 类型导出（TypeScript）
export interface User { name: string; }
export type Status = 'active' | 'inactive';

// ✅ 惰性初始化
let _instance: MyClass | null = null;
export function getInstance() {
  if (!_instance) {
    _instance = new MyClass();
  }
  return _instance;
}
```

## 与其他优化配合

### Tree Shaking 协同

```typescript
// sideEffects + usedExports 组合效果
// 1. sideEffects: false 允许跳过未使用的模块
// 2. usedExports: true 标记未使用的导出
// 3. 压缩器移除未使用的代码

// webpack.config.js
module.exports = {
  optimization: {
    sideEffects: true,
    usedExports: true,
    minimize: true,
  },
};
```

## 总结

sideEffects 副作用处理的核心要点：

**配置方式**：
- package.json sideEffects 字段
- module.rules sideEffects 选项

**优化效果**：
- 跳过未使用的无副作用模块
- 简化重导出链

**实现原理**：
- SideEffectsFlagPlugin
- 模块连接活跃状态

**注意事项**：
- 确保模块真的无副作用
- CSS 导入通常有副作用
- 类装饰器通常有副作用

**调试方法**：
- stats.optimizationBailout
- 检查模块包含情况

**下一章**：我们将学习 Scope Hoisting 作用域提升。
