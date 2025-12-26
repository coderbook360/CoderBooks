---
sidebar_position: 58
title: "conditionNames 条件名称匹配"
---

# conditionNames 条件名称匹配

`conditionNames` 控制如何解析 package.json 中的条件导出（exports）和条件导入（imports）。本章深入分析条件匹配机制。

## 基本概念

### 什么是条件导出

```json
{
  "name": "my-package",
  "exports": {
    ".": {
      "import": "./dist/esm/index.js",
      "require": "./dist/cjs/index.js",
      "browser": "./dist/browser/index.js",
      "node": "./dist/node/index.js",
      "default": "./dist/index.js"
    }
  }
}
```

`conditionNames` 决定哪些条件被激活：

```typescript
// webpack.config.js
module.exports = {
  resolve: {
    conditionNames: ['import', 'browser'],  // 激活这些条件
  },
};

// 解析结果：./dist/esm/index.js（第一个匹配的条件）
```

## Webpack 默认条件

### 不同 target 的默认值

```typescript
// target: 'web'（默认）
conditionNames: ['webpack', 'development|production', 'browser', 'module', 'import']

// target: 'node'
conditionNames: ['webpack', 'development|production', 'node', 'module', 'import']

// target: 'webworker'
conditionNames: ['webpack', 'development|production', 'worker', 'module', 'import']

// target: 'electron-renderer'
conditionNames: ['webpack', 'development|production', 'electron', 'browser', 'module', 'import']
```

### 依赖类型的条件

```typescript
// ESM import
conditionNames: ['import', ...]

// CJS require
conditionNames: ['require', ...]
```

## 条件优先级

条件按数组顺序匹配，先匹配的优先：

```typescript
// 配置
conditionNames: ['browser', 'import', 'require']

// package.json
{
  "exports": {
    ".": {
      "require": "./cjs.js",   // 第3优先
      "import": "./esm.js",    // 第2优先
      "browser": "./browser.js" // 第1优先（最高）
    }
  }
}

// 结果：./browser.js
```

## 实现原理

### ConditionResolver

```typescript
export class ConditionResolver {
  constructor(private conditions: string[]) {}
  
  /**
   * 解析条件对象
   */
  resolve(conditionObject: Record<string, any>): any {
    // 按优先级遍历激活的条件
    for (const condition of this.conditions) {
      if (conditionObject[condition] !== undefined) {
        const value = conditionObject[condition];
        
        // 递归解析嵌套条件
        if (this.isConditionObject(value)) {
          const nested = this.resolve(value);
          if (nested !== undefined) {
            return nested;
          }
          continue;  // 嵌套条件无匹配，尝试下一个
        }
        
        return value;
      }
    }
    
    // 尝试 default
    if (conditionObject.default !== undefined) {
      const defaultValue = conditionObject.default;
      
      if (this.isConditionObject(defaultValue)) {
        return this.resolve(defaultValue);
      }
      
      return defaultValue;
    }
    
    return undefined;
  }
  
  /**
   * 判断是否是条件对象
   */
  private isConditionObject(value: any): boolean {
    if (typeof value !== 'object' || value === null) {
      return false;
    }
    
    if (Array.isArray(value)) {
      return false;
    }
    
    // 检查是否所有键都不以 . 开头（条件对象 vs 路径映射）
    const keys = Object.keys(value);
    return keys.length > 0 && !keys[0].startsWith('.');
  }
}
```

### 嵌套条件处理

```json
{
  "exports": {
    ".": {
      "node": {
        "import": "./node-esm.js",
        "require": "./node-cjs.js"
      },
      "browser": {
        "import": "./browser-esm.js",
        "default": "./browser.js"
      }
    }
  }
}
```

```typescript
export class NestedConditionResolver {
  resolve(
    exports: any,
    conditions: string[]
  ): string | null {
    if (typeof exports === 'string') {
      return exports;
    }
    
    if (Array.isArray(exports)) {
      for (const item of exports) {
        const result = this.resolve(item, conditions);
        if (result) return result;
      }
      return null;
    }
    
    if (typeof exports === 'object') {
      // 尝试每个激活的条件
      for (const condition of conditions) {
        if (exports[condition] !== undefined) {
          const result = this.resolve(exports[condition], conditions);
          if (result) return result;
        }
      }
      
      // 尝试 default
      if (exports.default !== undefined) {
        return this.resolve(exports.default, conditions);
      }
    }
    
    return null;
  }
}
```

## 标准条件名称

### Node.js 标准

```typescript
const standardConditions = {
  // 模块系统
  'import': 'ESM import 语句',
  'require': 'CJS require() 调用',
  
  // 环境
  'node': 'Node.js 运行时',
  'browser': '浏览器环境',
  'worker': 'Web Worker 环境',
  'deno': 'Deno 运行时',
  
  // 模式
  'development': '开发模式',
  'production': '生产模式',
  
  // 特殊
  'default': '默认回退（总是匹配）',
  'types': 'TypeScript 类型定义',
};
```

### Webpack 专用条件

```typescript
const webpackConditions = {
  'webpack': 'Webpack 打包器',
  'module': '支持 tree-shaking 的模块',
  'style': '样式入口',
  'sass': 'Sass 样式入口',
  'asset': '资源文件入口',
};
```

### 自定义条件

```typescript
module.exports = {
  resolve: {
    conditionNames: [
      'myapp',        // 自定义应用条件
      'electron',     // Electron 环境
      'import',
      'browser',
    ],
  },
};
```

```json
{
  "exports": {
    ".": {
      "myapp": "./dist/myapp-optimized.js",
      "electron": "./dist/electron.js",
      "browser": "./dist/browser.js",
      "default": "./dist/index.js"
    }
  }
}
```

## 条件组合

### 多环境支持

```typescript
// 开发环境 + 浏览器
conditionNames: ['development', 'browser', 'import']

// 生产环境 + Node.js
conditionNames: ['production', 'node', 'require']
```

### 动态条件

```typescript
module.exports = (env, argv) => ({
  resolve: {
    conditionNames: [
      'webpack',
      argv.mode === 'production' ? 'production' : 'development',
      'browser',
      'import',
    ],
  },
});
```

## 条件在 byDependency 中

```typescript
module.exports = {
  resolve: {
    byDependency: {
      esm: {
        conditionNames: ['import', 'module', 'browser'],
      },
      commonjs: {
        conditionNames: ['require', 'node'],
      },
      url: {
        conditionNames: ['asset', 'browser'],
      },
    },
  },
};
```

## 调试条件匹配

### 日志插件

```typescript
class ConditionDebugPlugin {
  apply(resolver: Resolver): void {
    resolver.getHook('parsedResolve').tapAsync(
      'ConditionDebugPlugin',
      (request, resolveContext, callback) => {
        const pkg = request.descriptionFileData;
        
        if (pkg?.exports) {
          console.log('=== Condition Matching ===');
          console.log('Package:', pkg.name);
          console.log('Active conditions:', resolver.options.conditionNames);
          console.log('Exports:', JSON.stringify(pkg.exports, null, 2));
        }
        
        callback();
      }
    );
    
    resolver.getHook('resolved').tapAsync(
      'ConditionDebugPlugin',
      (request, resolveContext, callback) => {
        console.log('Resolved to:', request.path);
        callback();
      }
    );
  }
}
```

### 解析模拟器

```typescript
class ConditionSimulator {
  simulate(
    exports: any,
    conditionSets: string[][]
  ): Record<string, string | null> {
    const results: Record<string, string | null> = {};
    
    for (const conditions of conditionSets) {
      const key = conditions.join(', ');
      const resolver = new NestedConditionResolver();
      results[key] = resolver.resolve(exports, conditions);
    }
    
    return results;
  }
}

// 使用
const simulator = new ConditionSimulator();
const results = simulator.simulate(packageExports, [
  ['import', 'browser'],
  ['require', 'node'],
  ['import', 'node'],
]);

console.table(results);
```

## 常见问题

### 条件不匹配

```typescript
// package.json 只有 require
{
  "exports": {
    ".": {
      "require": "./cjs.js"
    }
  }
}

// 配置只有 import
conditionNames: ['import']

// 结果：无法解析！

// 解决：添加 require 条件或确保包提供 import 入口
```

### 条件优先级冲突

```typescript
// 期望使用 ESM，但 browser 优先
conditionNames: ['browser', 'import', 'require']

{
  "exports": {
    ".": {
      "browser": "./browser-cjs.js",  // 这个会被选中
      "import": "./esm.js"
    }
  }
}

// 解决：调整条件顺序
conditionNames: ['import', 'browser', 'require']
```

## 最佳实践

### 包作者建议

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/esm/index.js",
      "require": "./dist/cjs/index.js",
      "default": "./dist/index.js"
    }
  }
}
```

**要点**：
- 始终提供 `default` 回退
- `types` 用于 TypeScript
- 同时支持 `import` 和 `require`

### 应用开发者建议

```typescript
module.exports = {
  resolve: {
    conditionNames: [
      'webpack',
      process.env.NODE_ENV === 'production' ? 'production' : 'development',
      'module',  // 优先 tree-shakable 版本
      'import',
      'browser',
    ],
  },
};
```

## 总结

conditionNames 的核心机制：

**优先级规则**：
- 数组顺序决定优先级
- 先匹配的条件优先
- default 作为最后回退

**标准条件**：
- import/require：模块系统
- node/browser：运行环境
- development/production：构建模式

**调试方法**：
- 日志插件查看匹配过程
- 模拟器测试不同条件组合
- 确保包和配置的条件对应

**下一章**：我们将探讨 fallback 回退与 Node.js Polyfill。
