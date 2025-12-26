---
sidebar_position: 59
title: "fallback 回退与 Node.js Polyfill"
---

# fallback 回退与 Node.js Polyfill

Webpack 5 移除了 Node.js 核心模块的自动 polyfill。本章介绍如何使用 `fallback` 配置处理这种情况。

## Webpack 4 vs Webpack 5

### Webpack 4 行为

Webpack 4 自动为 Node.js 核心模块提供浏览器 polyfill：

```typescript
// Webpack 4 内置 polyfill
{
  'buffer': 'buffer/',
  'crypto': 'crypto-browserify',
  'stream': 'stream-browserify',
  'path': 'path-browserify',
  'fs': 'empty',
  // ...更多
}
```

### Webpack 5 变化

Webpack 5 默认不再提供这些 polyfill：

```typescript
// Webpack 5 默认
{
  // 无自动 polyfill
}

// 直接使用 Node.js 模块会报错
import path from 'path';  // Error: Module not found
```

**原因**：
- 减小打包体积
- 大多数前端代码不需要这些模块
- 让开发者明确选择是否需要 polyfill

## fallback 配置

### 基本用法

```typescript
module.exports = {
  resolve: {
    fallback: {
      'path': require.resolve('path-browserify'),
      'stream': require.resolve('stream-browserify'),
      'buffer': require.resolve('buffer/'),
      'crypto': require.resolve('crypto-browserify'),
      'fs': false,  // 忽略
    },
  },
};
```

### 工作原理

```typescript
export class FallbackPlugin implements ResolverPlugin {
  constructor(
    private fallback: Record<string, string | false>
  ) {}
  
  apply(resolver: Resolver): void {
    // 在主解析失败后触发
    resolver.getHook('resolve').tapAsync(
      { name: 'FallbackPlugin', stage: 100 },  // 低优先级
      (request, resolveContext, callback) => {
        const innerRequest = request.request;
        if (!innerRequest) {
          return callback();
        }
        
        // 检查是否有 fallback 配置
        const fallbackValue = this.fallback[innerRequest];
        
        if (fallbackValue === undefined) {
          return callback();  // 无配置，继续
        }
        
        if (fallbackValue === false) {
          // 返回空模块
          return callback(null, {
            ...request,
            path: false as any,
          });
        }
        
        // 使用 fallback 路径重新解析
        const obj: ResolveRequest = {
          ...request,
          request: fallbackValue,
        };
        
        resolver.doResolve(
          resolver.hooks.resolve,
          obj,
          `fallback to ${fallbackValue}`,
          resolveContext,
          callback
        );
      }
    );
  }
}
```

## 常用 Polyfill 包

### 完整列表

```typescript
module.exports = {
  resolve: {
    fallback: {
      // 核心模块
      'assert': require.resolve('assert/'),
      'buffer': require.resolve('buffer/'),
      'console': require.resolve('console-browserify'),
      'constants': require.resolve('constants-browserify'),
      'crypto': require.resolve('crypto-browserify'),
      'domain': require.resolve('domain-browser'),
      'events': require.resolve('events/'),
      'http': require.resolve('stream-http'),
      'https': require.resolve('https-browserify'),
      'os': require.resolve('os-browserify/browser'),
      'path': require.resolve('path-browserify'),
      'punycode': require.resolve('punycode/'),
      'process': require.resolve('process/browser'),
      'querystring': require.resolve('querystring-es3'),
      'stream': require.resolve('stream-browserify'),
      'string_decoder': require.resolve('string_decoder/'),
      'sys': require.resolve('util/'),
      'timers': require.resolve('timers-browserify'),
      'tty': require.resolve('tty-browserify'),
      'url': require.resolve('url/'),
      'util': require.resolve('util/'),
      'vm': require.resolve('vm-browserify'),
      'zlib': require.resolve('browserify-zlib'),
      
      // 无法 polyfill，设为 false
      'child_process': false,
      'cluster': false,
      'dgram': false,
      'dns': false,
      'fs': false,
      'module': false,
      'net': false,
      'readline': false,
      'repl': false,
      'tls': false,
    },
  },
};
```

### 安装依赖

```bash
npm install --save-dev \
  assert buffer console-browserify constants-browserify \
  crypto-browserify domain-browser events stream-http \
  https-browserify os-browserify path-browserify punycode \
  process querystring-es3 stream-browserify string_decoder \
  timers-browserify tty-browserify url util vm-browserify \
  browserify-zlib
```

## 按需配置

### 只处理需要的模块

```typescript
// 只配置实际使用的模块
module.exports = {
  resolve: {
    fallback: {
      'path': require.resolve('path-browserify'),
      // 其他不需要
    },
  },
};
```

### 条件配置

```typescript
const nodePolyfills = require('node-polyfill-webpack-plugin');

// 使用插件自动配置
module.exports = {
  plugins: [
    new nodePolyfills(),
  ],
};
```

## 全局变量注入

某些 polyfill 需要全局变量：

```typescript
const webpack = require('webpack');

module.exports = {
  resolve: {
    fallback: {
      'buffer': require.resolve('buffer/'),
      'process': require.resolve('process/browser'),
    },
  },
  plugins: [
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: 'process/browser',
    }),
  ],
};
```

### ProvidePlugin 原理

```typescript
export class ProvidePlugin {
  constructor(private definitions: Record<string, string | string[]>) {}
  
  apply(compiler: Compiler): void {
    compiler.hooks.compilation.tap('ProvidePlugin', (compilation) => {
      compilation.hooks.buildModule.tap('ProvidePlugin', (module) => {
        // 分析模块中使用的全局变量
        // 如果发现使用了 Buffer，自动注入 import
      });
    });
  }
}

// 效果：
// 原始代码：
const buf = Buffer.from('hello');

// 转换后：
import { Buffer } from 'buffer';
const buf = Buffer.from('hello');
```

## 完整配置示例

### React 应用

```typescript
const webpack = require('webpack');

module.exports = {
  resolve: {
    fallback: {
      // React 常用
      'path': require.resolve('path-browserify'),
      'stream': require.resolve('stream-browserify'),
      'buffer': require.resolve('buffer/'),
      
      // 不需要的设为 false
      'fs': false,
      'net': false,
      'tls': false,
    },
  },
  plugins: [
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: 'process/browser',
    }),
  ],
};
```

### 使用第三方 Node.js 库

```typescript
// 某些库依赖 Node.js API
module.exports = {
  resolve: {
    fallback: {
      'crypto': require.resolve('crypto-browserify'),
      'stream': require.resolve('stream-browserify'),
      'buffer': require.resolve('buffer/'),
      'util': require.resolve('util/'),
      'assert': require.resolve('assert/'),
    },
  },
  plugins: [
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: 'process/browser',
    }),
  ],
};
```

## 替代方案

### 使用浏览器原生 API

```typescript
// 不推荐：使用 Node.js polyfill
import { parse } from 'url';
const parsed = parse('https://example.com/path');

// 推荐：使用浏览器原生 API
const parsed = new URL('https://example.com/path');
```

### 使用现代替代库

```typescript
// 不推荐：crypto polyfill（体积大）
import { randomBytes } from 'crypto';

// 推荐：使用 Web Crypto API
const bytes = crypto.getRandomValues(new Uint8Array(16));
```

### 条件导入

```typescript
// 根据环境使用不同实现
const fs = typeof window === 'undefined'
  ? require('fs')
  : {
      readFileSync: () => { throw new Error('Not in Node.js'); },
    };
```

## 错误处理

### 常见错误

```
Module not found: Error: Can't resolve 'fs' in '/project/node_modules/some-package'
```

### 排查步骤

1. **确认是否真正需要**：
```typescript
// 检查使用该模块的代码是否会在浏览器执行
// 可能是仅在 Node.js 环境执行的代码
```

2. **配置 fallback**：
```typescript
resolve: {
  fallback: {
    'fs': false,  // 如果不需要
    // 或
    'fs': require.resolve('browserify-fs'),  // 如果需要
  },
}
```

3. **使用别名替换**：
```typescript
resolve: {
  alias: {
    'fs': path.resolve(__dirname, 'src/mocks/fs.js'),
  },
}
```

### 自定义 mock

```typescript
// src/mocks/fs.js
export const readFileSync = () => {
  throw new Error('fs.readFileSync is not available in browser');
};

export const writeFileSync = () => {
  throw new Error('fs.writeFileSync is not available in browser');
};

export default {
  readFileSync,
  writeFileSync,
};
```

## 性能考虑

### Polyfill 体积

```
crypto-browserify:  ~500KB
buffer:             ~50KB
stream-browserify:  ~100KB
path-browserify:    ~5KB
```

### 优化建议

```typescript
// 1. 只引入需要的功能
import { join } from 'path-browserify';  // 而不是 import path from 'path-browserify'

// 2. 使用更轻量的替代
// 不推荐：完整的 crypto polyfill
// 推荐：只引入需要的哈希函数
import sha256 from 'crypto-js/sha256';

// 3. 动态导入
const crypto = await import('crypto-browserify');
```

## 总结

fallback 配置的核心要点：

**Webpack 5 变化**：
- 不再自动 polyfill Node.js 模块
- 需要手动配置 fallback
- 减小默认打包体积

**配置方式**：
- `false`：忽略模块
- 路径字符串：使用替代包
- 配合 ProvidePlugin 注入全局变量

**最佳实践**：
- 优先使用浏览器原生 API
- 按需配置，避免不必要的 polyfill
- 注意 polyfill 包的体积

**下一章**：我们将探讨 resolveLoader 配置。
