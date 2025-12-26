---
sidebar_position: 55
title: "extensions 与 mainFields 处理"
---

# extensions 与 mainFields 处理

`extensions` 和 `mainFields` 是两个核心解析配置，分别控制文件扩展名补全和包入口文件选择。

## extensions 配置

### 基本概念

```typescript
// webpack.config.js
module.exports = {
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
  },
};
```

```typescript
// 导入时可以省略扩展名
import App from './App';          // 尝试 ./App.js, ./App.jsx, ...
import utils from './utils';      // 尝试 ./utils.js, ...
import config from './config';    // 尝试 ./config.json, ...
```

### 默认值

Webpack 5 默认 extensions：
- `.js`
- `.json`
- `.wasm`

### 实现原理

```typescript
export class ExtensionsPlugin implements ResolverPlugin {
  constructor(
    private source: string,
    private extensions: string[],
    private target: string
  ) {}
  
  apply(resolver: Resolver): void {
    const target = resolver.ensureHook(this.target);
    
    resolver.getHook(this.source).tapAsync(
      'ExtensionsPlugin',
      (request, resolveContext, callback) => {
        // 如果已经完全指定，跳过
        if (request.fullySpecified) {
          return callback();
        }
        
        const basePath = request.path;
        
        // 首先尝试原始路径（可能已经有扩展名）
        resolver.fileSystem.stat(basePath, (err, stat) => {
          if (!err && stat?.isFile()) {
            return resolver.doResolve(
              target,
              request,
              'existing file',
              resolveContext,
              callback
            );
          }
          
          // 依次尝试各扩展名
          this.tryExtensions(
            resolver,
            basePath,
            0,
            request,
            resolveContext,
            target,
            callback
          );
        });
      }
    );
  }
  
  private tryExtensions(
    resolver: Resolver,
    basePath: string,
    index: number,
    request: ResolveRequest,
    resolveContext: ResolveContext,
    target: any,
    callback: ResolveCallback
  ): void {
    if (index >= this.extensions.length) {
      return callback();  // 所有扩展名都尝试过了
    }
    
    const ext = this.extensions[index];
    const fullPath = basePath + ext;
    
    resolver.fileSystem.stat(fullPath, (err, stat) => {
      if (!err && stat?.isFile()) {
        const obj: ResolveRequest = {
          ...request,
          path: fullPath,
          relativePath: request.relativePath 
            ? request.relativePath + ext 
            : undefined,
        };
        
        return resolver.doResolve(
          target,
          obj,
          `using extension: ${ext}`,
          resolveContext,
          callback
        );
      }
      
      // 尝试下一个扩展名
      this.tryExtensions(
        resolver,
        basePath,
        index + 1,
        request,
        resolveContext,
        target,
        callback
      );
    });
  }
}
```

### enforceExtension

```typescript
module.exports = {
  resolve: {
    // 强制要求指定扩展名
    enforceExtension: true,
  },
};

// 必须写完整扩展名
import App from './App.tsx';     // ✓
import App from './App';         // ✗ 报错
```

```typescript
export class EnforceExtensionPlugin implements ResolverPlugin {
  apply(resolver: Resolver): void {
    resolver.getHook('file').tapAsync(
      'EnforceExtensionPlugin',
      (request, resolveContext, callback) => {
        const filePath = request.path;
        
        // 检查是否有扩展名
        const ext = path.extname(filePath);
        if (!ext) {
          return callback(new Error(
            `Cannot resolve '${request.request}' without extension`
          ));
        }
        
        callback();
      }
    );
  }
}
```

## mainFields 配置

### 基本概念

```typescript
module.exports = {
  resolve: {
    // 按顺序查找 package.json 中的字段
    mainFields: ['browser', 'module', 'main'],
  },
};
```

常见的 mainFields：
- `browser`：浏览器环境入口
- `module`：ES Module 入口
- `main`：CommonJS 入口
- `jsnext:main`：早期 ES Module 约定
- `types`：TypeScript 类型定义

### 不同 target 的默认值

```typescript
// 浏览器环境（默认）
// target: 'web' | 'webworker'
mainFields: ['browser', 'module', 'main']

// Node.js 环境
// target: 'node'
mainFields: ['module', 'main']

// Electron 渲染进程
// target: 'electron-renderer'
mainFields: ['browser', 'module', 'main']
```

### 实现原理

```typescript
export class MainFieldPlugin implements ResolverPlugin {
  constructor(
    private source: string,
    private field: string,
    private target: string
  ) {}
  
  apply(resolver: Resolver): void {
    const target = resolver.ensureHook(this.target);
    
    resolver.getHook(this.source).tapAsync(
      'MainFieldPlugin',
      (request, resolveContext, callback) => {
        // 需要有描述文件信息
        if (!request.descriptionFileData) {
          return callback();
        }
        
        const pkg = request.descriptionFileData;
        const fieldValue = this.getFieldValue(pkg, this.field);
        
        if (!fieldValue) {
          return callback();
        }
        
        // 解析字段值
        const mainPath = path.join(
          request.descriptionFileRoot || request.path,
          fieldValue
        );
        
        const obj: ResolveRequest = {
          ...request,
          path: mainPath,
          relativePath: fieldValue,
          request: undefined,
        };
        
        resolver.doResolve(
          target,
          obj,
          `using ${this.field} from package.json`,
          resolveContext,
          callback
        );
      }
    );
  }
  
  private getFieldValue(pkg: any, field: string): string | null {
    const value = pkg[field];
    
    if (typeof value === 'string') {
      return value;
    }
    
    // browser 字段可能是对象形式
    if (field === 'browser' && typeof value === 'object') {
      // 对象形式用于模块替换，不作为入口
      return null;
    }
    
    return null;
  }
}
```

### 嵌套字段支持

```typescript
module.exports = {
  resolve: {
    // 支持嵌套数组形式
    mainFields: [
      ['browser', 'module'],  // 优先 browser.module
      'browser',              // 然后 browser
      'module',               // 然后 module
      'main',                 // 最后 main
    ],
  },
};
```

```typescript
export class NestedMainFieldPlugin implements ResolverPlugin {
  constructor(
    private source: string,
    private fields: (string | string[])[],
    private target: string
  ) {}
  
  apply(resolver: Resolver): void {
    for (const field of this.fields) {
      if (Array.isArray(field)) {
        // 嵌套字段
        new NestedFieldPlugin(
          this.source,
          field,
          this.target
        ).apply(resolver);
      } else {
        // 普通字段
        new MainFieldPlugin(
          this.source,
          field,
          this.target
        ).apply(resolver);
      }
    }
  }
}

class NestedFieldPlugin implements ResolverPlugin {
  constructor(
    private source: string,
    private fieldPath: string[],
    private target: string
  ) {}
  
  apply(resolver: Resolver): void {
    const target = resolver.ensureHook(this.target);
    
    resolver.getHook(this.source).tapAsync(
      'NestedFieldPlugin',
      (request, resolveContext, callback) => {
        if (!request.descriptionFileData) {
          return callback();
        }
        
        // 沿路径查找
        let value = request.descriptionFileData;
        for (const key of this.fieldPath) {
          value = value?.[key];
          if (value === undefined) {
            return callback();
          }
        }
        
        if (typeof value !== 'string') {
          return callback();
        }
        
        const mainPath = path.join(
          request.descriptionFileRoot || request.path,
          value
        );
        
        const obj: ResolveRequest = {
          ...request,
          path: mainPath,
          request: undefined,
        };
        
        resolver.doResolve(target, obj, null, resolveContext, callback);
      }
    );
  }
}
```

## mainFiles 配置

```typescript
module.exports = {
  resolve: {
    // 目录的默认文件名
    mainFiles: ['index'],
  },
};
```

```typescript
export class MainFilePlugin implements ResolverPlugin {
  constructor(
    private source: string,
    private mainFile: string,
    private target: string
  ) {}
  
  apply(resolver: Resolver): void {
    const target = resolver.ensureHook(this.target);
    
    resolver.getHook(this.source).tapAsync(
      'MainFilePlugin',
      (request, resolveContext, callback) => {
        // 拼接主文件名
        const mainPath = path.join(request.path, this.mainFile);
        
        const obj: ResolveRequest = {
          ...request,
          path: mainPath,
          relativePath: request.relativePath
            ? path.join(request.relativePath, this.mainFile)
            : this.mainFile,
        };
        
        resolver.doResolve(
          target,
          obj,
          `using main file: ${this.mainFile}`,
          resolveContext,
          callback
        );
      }
    );
  }
}
```

## browser 字段特殊处理

package.json 的 browser 字段有两种用法：

### 字符串形式（入口替换）

```json
{
  "name": "my-package",
  "main": "./lib/index.js",
  "browser": "./lib/browser.js"
}
```

### 对象形式（模块替换）

```json
{
  "name": "my-package",
  "main": "./lib/index.js",
  "browser": {
    "fs": false,
    "path": false,
    "./lib/node.js": "./lib/browser.js"
  }
}
```

```typescript
export class BrowserFieldPlugin implements ResolverPlugin {
  constructor(
    private source: string,
    private target: string
  ) {}
  
  apply(resolver: Resolver): void {
    const target = resolver.ensureHook(this.target);
    
    resolver.getHook(this.source).tapAsync(
      'BrowserFieldPlugin',
      (request, resolveContext, callback) => {
        const pkg = request.descriptionFileData;
        if (!pkg?.browser || typeof pkg.browser !== 'object') {
          return callback();
        }
        
        const browserMap = pkg.browser;
        const requestPath = request.relativePath || request.request;
        
        if (!requestPath) {
          return callback();
        }
        
        // 查找替换映射
        const replacement = this.findReplacement(browserMap, requestPath);
        
        if (replacement === undefined) {
          return callback();  // 无替换
        }
        
        if (replacement === false) {
          // 忽略模块
          return callback(null, {
            ...request,
            path: false as any,
          });
        }
        
        // 替换路径
        const newPath = path.join(
          request.descriptionFileRoot || '',
          replacement
        );
        
        const obj: ResolveRequest = {
          ...request,
          path: newPath,
          request: undefined,
        };
        
        resolver.doResolve(target, obj, null, resolveContext, callback);
      }
    );
  }
  
  private findReplacement(
    browserMap: Record<string, string | false>,
    requestPath: string
  ): string | false | undefined {
    // 精确匹配
    if (browserMap[requestPath] !== undefined) {
      return browserMap[requestPath];
    }
    
    // 带 ./ 前缀匹配
    const withPrefix = './' + requestPath;
    if (browserMap[withPrefix] !== undefined) {
      return browserMap[withPrefix];
    }
    
    return undefined;
  }
}
```

## 性能优化

### 减少扩展名数量

```typescript
// 推荐：只包含实际使用的扩展名
resolve: {
  extensions: ['.ts', '.tsx', '.js'],  // 精简列表
}

// 不推荐：过多扩展名
resolve: {
  extensions: ['.js', '.jsx', '.ts', '.tsx', '.json', '.mjs', '.cjs', '.vue'],
}
```

### 合理排序

```typescript
// 按使用频率排序，常用的放前面
resolve: {
  extensions: ['.tsx', '.ts', '.js'],  // React TypeScript 项目
  mainFields: ['module', 'main'],       // 优先 ES Module
}
```

## 总结

extensions 和 mainFields 的核心机制：

**extensions**：
- 按顺序尝试扩展名
- enforceExtension 强制要求
- fullySpecified 跳过补全

**mainFields**：
- 按顺序读取 package.json 字段
- 支持嵌套字段
- browser 字段的特殊处理

**最佳实践**：
- 精简扩展名列表
- 常用扩展名靠前
- 根据 target 选择 mainFields

**下一章**：我们将深入 resolve 配置项完整解析。
