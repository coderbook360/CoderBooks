---
sidebar_position: 56
title: "resolve 配置项完整解析"
---

# resolve 配置项完整解析

Webpack 的 resolve 配置控制模块解析行为。本章系统梳理所有配置项。

## 配置项总览

```typescript
interface ResolveOptions {
  // 路径与模块
  modules: string[];
  alias: Record<string, string | false>;
  aliasFields: string[];
  
  // 文件与扩展名
  extensions: string[];
  enforceExtension: boolean;
  mainFiles: string[];
  mainFields: (string | string[])[];
  
  // 描述文件
  descriptionFiles: string[];
  exportsFields: string[];
  importsFields: string[];
  
  // 条件与环境
  conditionNames: string[];
  fullySpecified: boolean;
  
  // 符号链接
  symlinks: boolean;
  
  // 缓存
  cache: boolean;
  cacheWithContext: boolean;
  
  // 限制与回退
  restrictions: (string | RegExp)[];
  fallback: Record<string, string | false>;
  
  // 根目录
  roots: string[];
  preferRelative: boolean;
  preferAbsolute: boolean;
  
  // 插件
  plugins: ResolverPlugin[];
  
  // 按依赖类型配置
  byDependency: Record<string, Partial<ResolveOptions>>;
}
```

## 路径与模块

### modules

```typescript
module.exports = {
  resolve: {
    // 模块查找目录
    modules: [
      'node_modules',                           // 相对路径（层级查找）
      path.resolve(__dirname, 'src'),           // 绝对路径（直接查找）
      path.resolve(__dirname, 'shared_modules'),
    ],
  },
};
```

**工作原理**：
- 相对路径：从上下文目录逐级向上查找
- 绝对路径：直接在该目录查找

```typescript
export class ModulesPlugin {
  generatePaths(context: string, modules: string[]): string[] {
    const paths: string[] = [];
    
    for (const modulePath of modules) {
      if (path.isAbsolute(modulePath)) {
        // 绝对路径只添加一次
        if (!paths.includes(modulePath)) {
          paths.push(modulePath);
        }
      } else {
        // 相对路径需要层级查找
        let current = context;
        while (true) {
          paths.push(path.join(current, modulePath));
          const parent = path.dirname(current);
          if (parent === current) break;
          current = parent;
        }
      }
    }
    
    return paths;
  }
}
```

### alias

```typescript
module.exports = {
  resolve: {
    alias: {
      // 精确匹配
      'vue$': 'vue/dist/vue.esm-bundler.js',
      
      // 前缀匹配
      '@': path.resolve(__dirname, 'src'),
      
      // 模块忽略
      'fs': false,
      
      // 多路径回退（数组）
      'jquery': [
        path.resolve(__dirname, 'vendor/jquery.custom.js'),
        'jquery',  // fallback 到 node_modules
      ],
    },
  },
};
```

### aliasFields

```typescript
module.exports = {
  resolve: {
    // 从 package.json 读取别名配置
    aliasFields: ['browser'],
  },
};
```

这允许包作者在 package.json 中定义替换：

```json
{
  "browser": {
    "./lib/node.js": "./lib/browser.js",
    "fs": false
  }
}
```

## 文件与扩展名

### extensions

```typescript
module.exports = {
  resolve: {
    extensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
  },
};
```

### enforceExtension

```typescript
module.exports = {
  resolve: {
    // 强制要求文件扩展名
    enforceExtension: true,
  },
};
```

### mainFiles

```typescript
module.exports = {
  resolve: {
    // 目录默认文件
    mainFiles: ['index', 'main'],
  },
};

// 解析 ./components/Button/
// 依次尝试：
// - ./components/Button/index.js
// - ./components/Button/main.js
```

### mainFields

```typescript
module.exports = {
  resolve: {
    // package.json 入口字段优先级
    mainFields: ['browser', 'module', 'main'],
  },
};
```

## 描述文件

### descriptionFiles

```typescript
module.exports = {
  resolve: {
    // 描述文件名
    descriptionFiles: ['package.json', 'bower.json'],
  },
};
```

### exportsFields

```typescript
module.exports = {
  resolve: {
    // exports 字段名
    exportsFields: ['exports'],
  },
};
```

支持 Node.js 12+ 的条件导出：

```json
{
  "exports": {
    ".": {
      "import": "./dist/esm/index.js",
      "require": "./dist/cjs/index.js"
    }
  }
}
```

### importsFields

```typescript
module.exports = {
  resolve: {
    // imports 字段名
    importsFields: ['imports'],
  },
};
```

支持包内部导入映射：

```json
{
  "imports": {
    "#internal": "./src/internal/index.js"
  }
}
```

## 条件与环境

### conditionNames

```typescript
module.exports = {
  resolve: {
    // 条件名称（用于 exports/imports 解析）
    conditionNames: ['import', 'require', 'node', 'browser'],
  },
};
```

常用条件名：
- `import`：ES Module 导入
- `require`：CommonJS 导入
- `node`：Node.js 环境
- `browser`：浏览器环境
- `development`：开发环境
- `production`：生产环境
- `default`：默认条件

### fullySpecified

```typescript
module.exports = {
  resolve: {
    // 要求完整指定（不自动补全扩展名）
    fullySpecified: true,
  },
};

// 必须写完整路径
import App from './App.js';  // ✓
import App from './App';     // ✗
```

这在 ESM 模式下默认开启。

## 符号链接

### symlinks

```typescript
module.exports = {
  resolve: {
    // 是否解析符号链接到真实路径
    symlinks: true,  // 默认 true
  },
};
```

**开启时**（默认）：
- 符号链接解析到实际文件位置
- 有利于去重和缓存

**关闭时**：
- 保留符号链接路径
- monorepo 中可能需要

```typescript
export class SymlinksPlugin {
  apply(resolver: Resolver): void {
    if (!this.options.symlinks) {
      return;  // 不处理符号链接
    }
    
    resolver.getHook('existingFile').tapAsync(
      'SymlinksPlugin',
      (request, resolveContext, callback) => {
        resolver.fileSystem.realpath(request.path, (err, realPath) => {
          if (err) return callback(err);
          
          if (realPath !== request.path) {
            request.path = realPath;
          }
          
          callback();
        });
      }
    );
  }
}
```

## 缓存

### cache

```typescript
module.exports = {
  resolve: {
    // 是否缓存解析结果
    cache: true,  // 默认
  },
};
```

### cacheWithContext

```typescript
module.exports = {
  resolve: {
    // 缓存键是否包含上下文
    cacheWithContext: true,
  },
};
```

**开启时**：不同目录下相同请求分别缓存
**关闭时**：相同请求共享缓存（可能导致问题）

```typescript
export class CachedResolver {
  getCacheKey(context: string, request: string): string {
    if (this.options.cacheWithContext) {
      return `${context}\0${request}`;
    }
    return request;
  }
}
```

## 限制与回退

### restrictions

```typescript
module.exports = {
  resolve: {
    // 限制解析结果必须在这些路径内
    restrictions: [
      path.resolve(__dirname, 'src'),
      /node_modules/,
    ],
  },
};
```

```typescript
export class RestrictionsPlugin {
  apply(resolver: Resolver): void {
    resolver.getHook('resolved').tapAsync(
      'RestrictionsPlugin',
      (request, resolveContext, callback) => {
        const resolvedPath = request.path;
        
        for (const restriction of this.restrictions) {
          const matches = typeof restriction === 'string'
            ? resolvedPath.startsWith(restriction)
            : restriction.test(resolvedPath);
          
          if (matches) {
            return callback();  // 通过
          }
        }
        
        callback(new Error(
          `Resolved path ${resolvedPath} is outside of restrictions`
        ));
      }
    );
  }
}
```

### fallback

```typescript
module.exports = {
  resolve: {
    // 回退解析（主解析失败时使用）
    fallback: {
      'path': require.resolve('path-browserify'),
      'stream': require.resolve('stream-browserify'),
      'crypto': require.resolve('crypto-browserify'),
      'fs': false,  // 忽略
    },
  },
};
```

这在 Webpack 5 中替代了 Webpack 4 的自动 polyfill。

## 根目录

### roots

```typescript
module.exports = {
  resolve: {
    // 解析以 / 开头的请求的根目录
    roots: [
      __dirname,
      path.resolve(__dirname, 'assets'),
    ],
  },
};
```

### preferRelative

```typescript
module.exports = {
  resolve: {
    // 优先使用相对路径解析
    preferRelative: true,
  },
};

// import 'utils' 会先尝试 ./utils 再尝试 node_modules/utils
```

### preferAbsolute

```typescript
module.exports = {
  resolve: {
    // 优先使用绝对路径解析
    preferAbsolute: true,
  },
};
```

## 插件

### plugins

```typescript
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

module.exports = {
  resolve: {
    plugins: [
      // TypeScript 路径映射
      new TsconfigPathsPlugin({
        configFile: './tsconfig.json',
      }),
      
      // 自定义插件
      {
        apply(resolver) {
          resolver.getHook('resolve').tapAsync(
            'MyPlugin',
            (request, resolveContext, callback) => {
              console.log('Resolving:', request.request);
              callback();
            }
          );
        },
      },
    ],
  },
};
```

## 按依赖类型配置

### byDependency

```typescript
module.exports = {
  resolve: {
    // 基础配置
    extensions: ['.js', '.json'],
    
    // 按依赖类型覆盖
    byDependency: {
      // ESM 导入
      esm: {
        fullySpecified: true,
      },
      
      // CommonJS require
      commonjs: {
        fullySpecified: false,
      },
      
      // CSS @import
      css: {
        extensions: ['.css', '.scss', '.less'],
        mainFields: ['style', 'main'],
      },
      
      // URL 资源
      url: {
        preferRelative: true,
      },
      
      // Worker 导入
      worker: {
        extensions: ['.js', '.mjs'],
      },
    },
  },
};
```

**支持的依赖类型**：
- `esm`：ES Module 导入
- `commonjs`：CommonJS require
- `amd`：AMD define
- `loader`：loader 导入
- `css`：CSS 导入
- `url`：URL 资源
- `worker`：Worker 导入
- `unknown`：未知类型

## resolveLoader 配置

```typescript
module.exports = {
  // Loader 专用解析配置
  resolveLoader: {
    modules: ['node_modules', path.resolve(__dirname, 'loaders')],
    extensions: ['.js', '.cjs'],
    mainFields: ['loader', 'main'],
  },
};
```

## 总结

resolve 配置的核心分类：

**路径控制**：
- modules、alias、aliasFields
- 控制模块查找位置

**文件解析**：
- extensions、mainFiles、mainFields
- 控制文件匹配逻辑

**现代特性**：
- exportsFields、importsFields、conditionNames
- 支持 Node.js 条件导出

**性能与安全**：
- cache、restrictions、symlinks
- 优化性能和限制访问

**下一章**：我们将深入 exports 与 imports 字段支持。
