---
sidebar_position: 57
title: "exports 与 imports 字段支持"
---

# exports 与 imports 字段支持

Node.js 12+ 引入了 package.json 的 `exports` 和 `imports` 字段，提供了更精细的模块导出控制。Webpack 5 完整支持这些特性。

## exports 字段

### 基本语法

```json
{
  "name": "my-package",
  "exports": {
    ".": "./dist/index.js",
    "./utils": "./dist/utils.js",
    "./helpers/*": "./dist/helpers/*.js"
  }
}
```

```typescript
// 使用方式
import main from 'my-package';           // -> ./dist/index.js
import utils from 'my-package/utils';    // -> ./dist/utils.js
import foo from 'my-package/helpers/foo'; // -> ./dist/helpers/foo.js
```

### 条件导出

```json
{
  "name": "my-package",
  "exports": {
    ".": {
      "import": "./dist/esm/index.js",
      "require": "./dist/cjs/index.js",
      "types": "./dist/types/index.d.ts",
      "default": "./dist/cjs/index.js"
    }
  }
}
```

### 嵌套条件

```json
{
  "exports": {
    ".": {
      "node": {
        "import": "./dist/node-esm.js",
        "require": "./dist/node-cjs.js"
      },
      "browser": {
        "import": "./dist/browser-esm.js",
        "default": "./dist/browser.js"
      },
      "default": "./dist/index.js"
    }
  }
}
```

## 实现原理

### ExportsFieldPlugin

```typescript
export class ExportsFieldPlugin implements ResolverPlugin {
  constructor(
    private source: string,
    private conditionNames: string[],
    private field: string,
    private target: string
  ) {}
  
  apply(resolver: Resolver): void {
    const target = resolver.ensureHook(this.target);
    
    resolver.getHook(this.source).tapAsync(
      'ExportsFieldPlugin',
      (request, resolveContext, callback) => {
        // 需要描述文件信息
        if (!request.descriptionFileData) {
          return callback();
        }
        
        const exports = request.descriptionFileData[this.field];
        if (!exports) {
          return callback();
        }
        
        // 计算子路径
        const subpath = this.getSubpath(request);
        
        // 解析 exports
        try {
          const resolved = this.resolveExports(
            exports,
            subpath,
            this.conditionNames
          );
          
          if (!resolved) {
            return callback();
          }
          
          const fullPath = path.join(
            request.descriptionFileRoot || '',
            resolved
          );
          
          const obj: ResolveRequest = {
            ...request,
            path: fullPath,
            relativePath: resolved,
            request: undefined,
            fullySpecified: true,  // exports 结果已完全指定
          };
          
          resolver.doResolve(target, obj, null, resolveContext, callback);
        } catch (err) {
          callback(err as Error);
        }
      }
    );
  }
  
  private getSubpath(request: ResolveRequest): string {
    if (!request.relativePath || request.relativePath === '.') {
      return '.';
    }
    
    const subpath = request.relativePath;
    return subpath.startsWith('./') ? subpath : './' + subpath;
  }
  
  /**
   * 解析 exports 字段
   */
  private resolveExports(
    exports: ExportsField,
    subpath: string,
    conditions: string[]
  ): string | null {
    // 简单字符串
    if (typeof exports === 'string') {
      return subpath === '.' ? exports : null;
    }
    
    // 数组（fallback 列表）
    if (Array.isArray(exports)) {
      for (const item of exports) {
        const result = this.resolveExports(item, subpath, conditions);
        if (result) return result;
      }
      return null;
    }
    
    // 对象
    if (typeof exports === 'object' && exports !== null) {
      return this.resolveExportsObject(exports, subpath, conditions);
    }
    
    return null;
  }
  
  private resolveExportsObject(
    exports: Record<string, ExportsField>,
    subpath: string,
    conditions: string[]
  ): string | null {
    const keys = Object.keys(exports);
    
    // 判断是条件对象还是路径映射对象
    const isConditionalObject = keys.length > 0 && !keys[0].startsWith('.');
    
    if (isConditionalObject) {
      // 条件对象
      return this.resolveConditions(exports, conditions);
    }
    
    // 路径映射对象
    return this.resolvePathMapping(exports, subpath, conditions);
  }
  
  /**
   * 解析条件
   */
  private resolveConditions(
    conditions: Record<string, ExportsField>,
    activeConditions: string[]
  ): string | null {
    // 按条件优先级匹配
    for (const condition of activeConditions) {
      if (conditions[condition] !== undefined) {
        const result = this.resolveExports(
          conditions[condition],
          '.',
          activeConditions
        );
        if (result) return result;
      }
    }
    
    // default 条件
    if (conditions.default !== undefined) {
      return this.resolveExports(conditions.default, '.', activeConditions);
    }
    
    return null;
  }
  
  /**
   * 解析路径映射
   */
  private resolvePathMapping(
    mapping: Record<string, ExportsField>,
    subpath: string,
    conditions: string[]
  ): string | null {
    // 精确匹配
    if (mapping[subpath] !== undefined) {
      return this.resolveExports(mapping[subpath], '.', conditions);
    }
    
    // 通配符匹配
    for (const [pattern, target] of Object.entries(mapping)) {
      if (!pattern.includes('*')) continue;
      
      const matched = this.matchPattern(pattern, subpath);
      if (matched !== null) {
        const resolvedTarget = this.substitutePattern(target, matched);
        const result = this.resolveExports(resolvedTarget, '.', conditions);
        if (result) return result;
      }
    }
    
    // 目录匹配（已废弃，但仍支持）
    for (const [pattern, target] of Object.entries(mapping)) {
      if (!pattern.endsWith('/')) continue;
      
      if (subpath.startsWith(pattern)) {
        const rest = subpath.slice(pattern.length);
        const targetStr = this.resolveExports(target, '.', conditions);
        if (targetStr && typeof targetStr === 'string') {
          return targetStr + rest;
        }
      }
    }
    
    return null;
  }
  
  /**
   * 匹配通配符模式
   */
  private matchPattern(pattern: string, path: string): string | null {
    const starIndex = pattern.indexOf('*');
    if (starIndex === -1) return null;
    
    const prefix = pattern.slice(0, starIndex);
    const suffix = pattern.slice(starIndex + 1);
    
    if (!path.startsWith(prefix)) return null;
    if (suffix && !path.endsWith(suffix)) return null;
    
    return path.slice(prefix.length, path.length - (suffix.length || 0));
  }
  
  /**
   * 替换通配符
   */
  private substitutePattern(target: ExportsField, value: string): ExportsField {
    if (typeof target === 'string') {
      return target.replace(/\*/g, value);
    }
    
    if (Array.isArray(target)) {
      return target.map(t => this.substitutePattern(t, value));
    }
    
    if (typeof target === 'object' && target !== null) {
      const result: Record<string, ExportsField> = {};
      for (const [k, v] of Object.entries(target)) {
        result[k] = this.substitutePattern(v, value);
      }
      return result;
    }
    
    return target;
  }
}
```

## imports 字段

### 基本语法

```json
{
  "name": "my-package",
  "imports": {
    "#internal": "./src/internal/index.js",
    "#utils/*": "./src/utils/*.js"
  }
}
```

```typescript
// 包内部使用
import internal from '#internal';
import helper from '#utils/helper';
```

### 条件导入

```json
{
  "imports": {
    "#platform": {
      "node": "./src/platform/node.js",
      "browser": "./src/platform/browser.js",
      "default": "./src/platform/fallback.js"
    }
  }
}
```

## ImportsFieldPlugin

```typescript
export class ImportsFieldPlugin implements ResolverPlugin {
  constructor(
    private source: string,
    private conditionNames: string[],
    private field: string,
    private target: string
  ) {}
  
  apply(resolver: Resolver): void {
    const target = resolver.ensureHook(this.target);
    
    resolver.getHook(this.source).tapAsync(
      'ImportsFieldPlugin',
      (request, resolveContext, callback) => {
        // imports 只处理 # 开头的请求
        if (!request.request?.startsWith('#')) {
          return callback();
        }
        
        // 查找包含 imports 字段的描述文件
        const imports = this.findImports(request);
        if (!imports) {
          return callback();
        }
        
        try {
          const resolved = this.resolveImports(
            imports,
            request.request,
            this.conditionNames
          );
          
          if (!resolved) {
            return callback();
          }
          
          const fullPath = path.join(
            request.descriptionFileRoot || request.path,
            resolved
          );
          
          const obj: ResolveRequest = {
            ...request,
            path: fullPath,
            request: undefined,
            fullySpecified: true,
          };
          
          resolver.doResolve(target, obj, null, resolveContext, callback);
        } catch (err) {
          callback(err as Error);
        }
      }
    );
  }
  
  private findImports(request: ResolveRequest): ImportsField | null {
    const pkg = request.descriptionFileData;
    return pkg?.[this.field] || null;
  }
  
  private resolveImports(
    imports: ImportsField,
    request: string,
    conditions: string[]
  ): string | null {
    // 精确匹配
    if (imports[request] !== undefined) {
      return this.resolveTarget(imports[request], conditions);
    }
    
    // 通配符匹配
    for (const [pattern, target] of Object.entries(imports)) {
      if (!pattern.includes('*')) continue;
      
      const matched = this.matchPattern(pattern, request);
      if (matched !== null) {
        const substituted = this.substitutePattern(target, matched);
        return this.resolveTarget(substituted, conditions);
      }
    }
    
    return null;
  }
  
  private resolveTarget(target: ImportsField, conditions: string[]): string | null {
    if (typeof target === 'string') {
      return target;
    }
    
    if (Array.isArray(target)) {
      for (const item of target) {
        const result = this.resolveTarget(item, conditions);
        if (result) return result;
      }
      return null;
    }
    
    // 条件对象
    for (const condition of conditions) {
      if (target[condition] !== undefined) {
        const result = this.resolveTarget(target[condition], conditions);
        if (result) return result;
      }
    }
    
    if (target.default !== undefined) {
      return this.resolveTarget(target.default, conditions);
    }
    
    return null;
  }
}
```

## Webpack 配置

### conditionNames

```typescript
module.exports = {
  resolve: {
    conditionNames: ['webpack', 'import', 'require', 'browser'],
  },
};
```

**标准条件名**：
- `import`：ESM 导入
- `require`：CJS 导入
- `node`：Node.js 环境
- `browser`：浏览器环境
- `development`：开发模式
- `production`：生产模式
- `default`：默认（总是匹配）

**自定义条件**：
- `webpack`：Webpack 专用
- `worker`：Worker 环境
- `electron`：Electron 环境

### exportsFields 与 importsFields

```typescript
module.exports = {
  resolve: {
    // 自定义字段名（很少需要修改）
    exportsFields: ['exports'],
    importsFields: ['imports'],
  },
};
```

## 安全限制

exports 字段强制封装边界：

```json
{
  "exports": {
    ".": "./dist/index.js",
    "./public": "./dist/public/index.js"
  }
}
```

```typescript
// 只能导入声明的路径
import main from 'my-package';           // ✓
import pub from 'my-package/public';      // ✓
import internal from 'my-package/src/internal';  // ✗ 错误！
```

### 绕过封装

```typescript
// 不推荐，但可以直接访问文件
import internal from 'my-package/dist/internal.js';

// 或者使用特殊语法（Node.js 支持）
import internal from 'my-package?internal';
```

## 最佳实践

### 同时支持 CJS 和 ESM

```json
{
  "name": "my-package",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/esm/index.js",
      "require": "./dist/cjs/index.cjs"
    }
  }
}
```

### 子路径导出

```json
{
  "exports": {
    ".": "./dist/index.js",
    "./utils": "./dist/utils/index.js",
    "./utils/*": "./dist/utils/*.js",
    "./package.json": "./package.json"
  }
}
```

### 环境特定代码

```json
{
  "exports": {
    ".": {
      "browser": {
        "import": "./dist/browser.esm.js",
        "default": "./dist/browser.js"
      },
      "node": {
        "import": "./dist/node.mjs",
        "require": "./dist/node.cjs"
      }
    }
  }
}
```

## 调试技巧

### 查看解析过程

```typescript
class ExportsDebugPlugin {
  apply(resolver: Resolver): void {
    resolver.getHook('describedResolve').tapAsync(
      'ExportsDebugPlugin',
      (request, resolveContext, callback) => {
        const pkg = request.descriptionFileData;
        if (pkg?.exports) {
          console.log('Package exports:', JSON.stringify(pkg.exports, null, 2));
          console.log('Subpath:', request.relativePath);
        }
        callback();
      }
    );
  }
}
```

## 总结

exports 与 imports 的核心特性：

**exports 字段**：
- 定义公开的导出路径
- 支持条件导出
- 强制封装边界

**imports 字段**：
- 定义包内部导入映射
- 以 # 开头
- 简化内部引用

**条件系统**：
- 支持多环境
- 按优先级匹配
- default 作为回退

**下一章**：我们将深入 conditionNames 条件名称匹配。
