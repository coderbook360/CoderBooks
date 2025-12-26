---
sidebar_position: 60
title: "resolveLoader 配置"
---

# resolveLoader 配置

`resolveLoader` 是专门用于解析 Loader 的配置。它与 `resolve` 配置结构相同，但只作用于 Loader 的解析。

## 基本概念

```typescript
module.exports = {
  // 普通模块解析配置
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
    modules: ['node_modules'],
  },
  
  // Loader 解析配置
  resolveLoader: {
    extensions: ['.js', '.cjs'],
    modules: ['node_modules'],
    mainFields: ['loader', 'main'],
  },
};
```

## 默认值

```typescript
// Webpack 5 resolveLoader 默认配置
const defaultResolveLoader = {
  extensions: ['.js'],
  mainFields: ['loader', 'main'],
  mainFiles: ['index'],
  modules: ['node_modules'],
  conditionNames: ['loader', 'require', 'node'],
};
```

## 配置项

### modules

```typescript
module.exports = {
  resolveLoader: {
    // Loader 查找目录
    modules: [
      'node_modules',
      path.resolve(__dirname, 'loaders'),  // 自定义 Loader 目录
    ],
  },
};
```

这允许你创建本地 Loader：

```
project/
├── loaders/
│   ├── my-loader.js
│   └── custom-transform.js
└── src/
    └── index.js
```

```typescript
module.exports = {
  module: {
    rules: [
      {
        test: /\.txt$/,
        use: 'my-loader',  // 从 loaders/ 目录加载
      },
    ],
  },
};
```

### alias

```typescript
module.exports = {
  resolveLoader: {
    alias: {
      // 别名 Loader
      'my-babel': 'babel-loader',
      
      // 使用本地 Loader
      'custom': path.resolve(__dirname, 'loaders/custom.js'),
      
      // 替换现有 Loader
      'css-loader': path.resolve(__dirname, 'loaders/patched-css-loader.js'),
    },
  },
};
```

### extensions

```typescript
module.exports = {
  resolveLoader: {
    // Loader 文件扩展名
    extensions: ['.js', '.cjs', '.mjs', '.ts'],
  },
};
```

**注意**：TypeScript Loader 需要额外配置才能直接使用 `.ts` 扩展名。

### mainFields

```typescript
module.exports = {
  resolveLoader: {
    // package.json 入口字段优先级
    mainFields: ['loader', 'main'],
  },
};
```

Loader 包的 package.json：

```json
{
  "name": "my-loader",
  "main": "./dist/index.js",
  "loader": "./dist/loader.js"
}
```

## 实现原理

### LoaderResolver

```typescript
export class LoaderResolver {
  private resolverFactory: ResolverFactory;
  private loaderResolver: Resolver;
  
  constructor(options: ResolveLoaderOptions) {
    this.loaderResolver = ResolverFactory.createResolver({
      ...this.getDefaultOptions(),
      ...options,
    });
  }
  
  private getDefaultOptions(): Partial<ResolverOptions> {
    return {
      extensions: ['.js'],
      mainFields: ['loader', 'main'],
      mainFiles: ['index'],
      conditionNames: ['loader', 'require', 'node'],
    };
  }
  
  /**
   * 解析 Loader
   */
  resolve(
    context: string,
    loader: string,
    callback: ResolveCallback
  ): void {
    // 处理内联 Loader 前缀
    const { prefix, request } = this.parseLoaderRequest(loader);
    
    this.loaderResolver.resolve(
      {},
      context,
      request,
      {},
      (err, result) => {
        if (err) return callback(err);
        callback(null, result);
      }
    );
  }
  
  /**
   * 解析 Loader 请求
   */
  private parseLoaderRequest(loader: string): { prefix: string; request: string } {
    // 处理 -loader 后缀
    // babel -> babel-loader
    // style -> style-loader
    
    // 检查是否已经是完整名称
    if (loader.includes('/') || loader.endsWith('-loader')) {
      return { prefix: '', request: loader };
    }
    
    // 尝试添加 -loader 后缀
    return { prefix: '', request: `${loader}-loader` };
  }
}
```

### Loader 解析流程

```
1. 解析 Loader 字符串
   'babel-loader' -> 直接使用
   'babel' -> 尝试 'babel-loader'

2. 在 modules 目录查找
   node_modules/babel-loader
   custom-loaders/babel-loader

3. 读取 package.json
   优先使用 loader 字段
   回退到 main 字段

4. 返回 Loader 路径
   /project/node_modules/babel-loader/lib/index.js
```

## 高级配置

### 自定义 Loader 目录

```typescript
module.exports = {
  resolveLoader: {
    modules: [
      'node_modules',
      path.resolve(__dirname, 'build-tools/loaders'),
      path.resolve(__dirname, 'shared/loaders'),
    ],
  },
};
```

### Monorepo 配置

```typescript
// packages/app/webpack.config.js
module.exports = {
  resolveLoader: {
    modules: [
      'node_modules',
      // 从 monorepo 根目录查找
      path.resolve(__dirname, '../../node_modules'),
      // 共享 Loader 目录
      path.resolve(__dirname, '../../packages/build-tools/loaders'),
    ],
  },
};
```

### 条件名称

```typescript
module.exports = {
  resolveLoader: {
    conditionNames: ['loader', 'require', 'node'],
  },
};
```

支持 package.json exports：

```json
{
  "name": "my-loader",
  "exports": {
    ".": {
      "loader": "./dist/loader.js",
      "require": "./dist/index.js"
    }
  }
}
```

## 创建本地 Loader

### 目录结构

```
project/
├── loaders/
│   ├── markdown-loader/
│   │   ├── package.json
│   │   └── index.js
│   └── simple-loader.js
├── src/
└── webpack.config.js
```

### 简单 Loader

```javascript
// loaders/simple-loader.js
module.exports = function(source) {
  // 转换逻辑
  return source.replace(/foo/g, 'bar');
};
```

### 带 package.json 的 Loader

```json
// loaders/markdown-loader/package.json
{
  "name": "markdown-loader",
  "main": "./index.js",
  "loader": "./index.js"
}
```

```javascript
// loaders/markdown-loader/index.js
const marked = require('marked');

module.exports = function(source) {
  const html = marked.parse(source);
  return `export default ${JSON.stringify(html)};`;
};
```

### 使用本地 Loader

```typescript
module.exports = {
  resolveLoader: {
    modules: ['node_modules', path.resolve(__dirname, 'loaders')],
  },
  module: {
    rules: [
      {
        test: /\.md$/,
        use: 'markdown-loader',  // 从 loaders/ 加载
      },
      {
        test: /\.txt$/,
        use: 'simple-loader',
      },
    ],
  },
};
```

## 调试 Loader 解析

### 日志插件

```typescript
class LoaderResolveLogPlugin {
  apply(compiler: Compiler): void {
    compiler.hooks.afterResolvers.tap('LoaderResolveLogPlugin', () => {
      const loaderResolver = compiler.resolverFactory.get('loader');
      
      loaderResolver.hooks.resolve.tap(
        'LoaderResolveLogPlugin',
        (request) => {
          console.log(`[Loader] Resolving: ${request.request}`);
        }
      );
      
      loaderResolver.hooks.resolved.tap(
        'LoaderResolveLogPlugin',
        (request) => {
          console.log(`[Loader] Resolved: ${request.path}`);
        }
      );
    });
  }
}
```

### 解析失败排查

```
Error: Can't resolve 'my-loader' in '/project'
```

排查步骤：

1. **检查 Loader 名称**：
```typescript
// 确保名称正确
use: 'babel-loader'  // 不是 'babel'（虽然有时能工作）
```

2. **检查安装**：
```bash
npm list babel-loader
```

3. **检查 modules 配置**：
```typescript
resolveLoader: {
  modules: ['node_modules'],  // 确保包含正确目录
}
```

4. **使用绝对路径验证**：
```typescript
use: require.resolve('babel-loader'),  // 测试是否能找到
```

## 与 resolve 的区别

| 配置项 | resolve | resolveLoader |
|-------|---------|---------------|
| 用途 | 普通模块 | Loader |
| 默认 mainFields | ['browser', 'module', 'main'] | ['loader', 'main'] |
| 默认 conditionNames | ['import', 'require', 'browser'] | ['loader', 'require', 'node'] |
| 默认 extensions | ['.js', '.json', '.wasm'] | ['.js'] |

## 最佳实践

### 1. 保持简单

```typescript
// 大多数情况下不需要配置
resolveLoader: {
  // 使用默认值即可
}
```

### 2. 本地 Loader 使用专用目录

```typescript
resolveLoader: {
  modules: [
    'node_modules',
    path.resolve(__dirname, 'loaders'),
  ],
}
```

### 3. 使用别名替换 Loader

```typescript
resolveLoader: {
  alias: {
    // 用于开发调试
    'babel-loader': path.resolve(__dirname, 'debug-babel-loader.js'),
  },
}
```

## 总结

resolveLoader 的核心要点：

**专门用途**：
- 只用于 Loader 解析
- 与 resolve 配置结构相同
- 有不同的默认值

**常用配置**：
- modules：添加自定义 Loader 目录
- alias：别名 Loader
- mainFields：优先使用 loader 字段

**最佳实践**：
- 大多数情况使用默认值
- 本地 Loader 放在专用目录
- 使用 require.resolve 调试路径问题

本章完成了 Resolver 模块解析器部分的全部内容。下一部分将深入 Loader 系统的实现原理。
