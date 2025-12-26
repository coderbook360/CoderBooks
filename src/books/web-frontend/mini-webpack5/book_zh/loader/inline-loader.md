---
sidebar_position: 69
title: "Inline Loader 语法解析"
---

# Inline Loader 语法解析

Inline Loader 允许在 import 语句中直接指定 Loader，提供了细粒度的模块处理控制。

## Inline Loader 语法

### 基本格式

```javascript
// 单个 Loader
import content from 'raw-loader!./file.txt';

// 多个 Loader（从右到左执行）
import styles from 'style-loader!css-loader!./style.css';

// 带参数的 Loader
import data from 'json-loader?parse=true!./data.json';
```

### 请求解析

```typescript
// 请求字符串
"style-loader!css-loader?modules!./style.css"

// 解析结果
{
  loaders: [
    { loader: 'style-loader', options: {} },
    { loader: 'css-loader', options: { modules: true } },
  ],
  resource: './style.css'
}
```

## 前缀修饰符

### `!` 禁用 normal Loader

```javascript
// 配置中的 normal Loader 不会应用
import raw from '!raw-loader!./file.txt';
```

只保留：
- `pre` Loader（enforce: 'pre'）
- `post` Loader（enforce: 'post'）
- inline Loader

### `-!` 禁用 pre 和 normal Loader

```javascript
// 只保留 post Loader 和 inline Loader
import raw from '-!raw-loader!./file.txt';
```

### `!!` 禁用所有配置的 Loader

```javascript
// 只使用 inline 指定的 Loader
import raw from '!!raw-loader!./file.txt';
```

## 解析实现

### 请求解析器

```typescript
interface ParsedRequest {
  resource: string;
  loaders: LoaderSpec[];
  noPreAutoLoaders: boolean;  // -! 前缀
  noAutoLoaders: boolean;     // ! 前缀
  noPrePostAutoLoaders: boolean;  // !! 前缀
}

interface LoaderSpec {
  loader: string;
  options: any;
}

function parseRequest(request: string): ParsedRequest {
  let noPreAutoLoaders = false;
  let noAutoLoaders = false;
  let noPrePostAutoLoaders = false;
  
  // 解析前缀
  if (request.startsWith('!!')) {
    noPrePostAutoLoaders = true;
    request = request.slice(2);
  } else if (request.startsWith('-!')) {
    noPreAutoLoaders = true;
    request = request.slice(2);
  } else if (request.startsWith('!')) {
    noAutoLoaders = true;
    request = request.slice(1);
  }
  
  // 分割 Loader 和资源
  const parts = request.split('!');
  const resource = parts.pop()!;
  
  // 解析每个 Loader
  const loaders = parts.map(parseLoaderPart);
  
  return {
    resource,
    loaders,
    noPreAutoLoaders,
    noAutoLoaders,
    noPrePostAutoLoaders,
  };
}

function parseLoaderPart(part: string): LoaderSpec {
  const [loader, queryString] = part.split('?');
  
  return {
    loader,
    options: queryString ? parseQuery(queryString) : {},
  };
}

function parseQuery(queryString: string): any {
  // 处理 JSON 格式
  if (queryString.startsWith('{')) {
    return JSON.parse(decodeURIComponent(queryString));
  }
  
  // 处理 key=value 格式
  const params = new URLSearchParams(queryString);
  const result: Record<string, any> = {};
  
  for (const [key, value] of params) {
    // 类型转换
    if (value === 'true') {
      result[key] = true;
    } else if (value === 'false') {
      result[key] = false;
    } else if (/^\d+$/.test(value)) {
      result[key] = parseInt(value, 10);
    } else {
      result[key] = value;
    }
  }
  
  return result;
}
```

### Loader 合并逻辑

```typescript
function getLoaders(
  request: ParsedRequest,
  matchedRules: Rule[]
): LoaderObject[] {
  // 分类规则中的 Loader
  const preLoaders: LoaderObject[] = [];
  const normalLoaders: LoaderObject[] = [];
  const postLoaders: LoaderObject[] = [];
  
  for (const rule of matchedRules) {
    switch (rule.enforce) {
      case 'pre':
        preLoaders.push(...rule.use);
        break;
      case 'post':
        postLoaders.push(...rule.use);
        break;
      default:
        normalLoaders.push(...rule.use);
    }
  }
  
  // 根据前缀过滤
  let result: LoaderObject[] = [];
  
  if (request.noPrePostAutoLoaders) {
    // !! 只使用 inline Loader
    result = request.loaders.map(createLoaderObject);
  } else if (request.noPreAutoLoaders) {
    // -! 禁用 pre 和 normal
    result = [
      ...postLoaders,
      ...request.loaders.map(createLoaderObject),
    ];
  } else if (request.noAutoLoaders) {
    // ! 禁用 normal
    result = [
      ...postLoaders,
      ...request.loaders.map(createLoaderObject),
      ...preLoaders,
    ];
  } else {
    // 无前缀，使用全部
    result = [
      ...postLoaders,
      ...request.loaders.map(createLoaderObject),
      ...normalLoaders,
      ...preLoaders,
    ];
  }
  
  return result;
}
```

## 在 NormalModuleFactory 中的处理

```typescript
class NormalModuleFactory extends ModuleFactory {
  create(data: ModuleFactoryCreateData, callback: Callback): void {
    const { context, request } = data;
    
    // 解析 inline 请求
    const parsed = parseRequest(request);
    
    // 解析资源路径
    this.resolver.resolve(context, parsed.resource, (err, resourcePath) => {
      if (err) return callback(err);
      
      // 匹配规则
      const matchedRules = this.matchRules(resourcePath);
      
      // 合并 Loader
      const loaders = getLoaders(parsed, matchedRules);
      
      // 创建模块
      const module = new NormalModule({
        resource: resourcePath,
        loaders,
        // ...
      });
      
      callback(null, module);
    });
  }
}
```

## Loader 参数传递

### Query String 格式

```javascript
// 简单参数
import data from 'loader?key=value!./file';

// 多个参数
import data from 'loader?a=1&b=2&c=3!./file';

// 布尔值
import data from 'loader?enabled=true&disabled=false!./file';
```

### JSON 格式

```javascript
// URL 编码的 JSON
import data from 'loader?%7B%22key%22%3A%22value%22%7D!./file';

// 等价于 { "key": "value" }
```

### 实际示例

```javascript
// css-loader 启用 CSS Modules
import styles from 'css-loader?modules=true!./style.css';

// file-loader 指定输出路径
import url from 'file-loader?name=[hash].[ext]&outputPath=images/!./image.png';

// babel-loader 指定预设
import code from 'babel-loader?presets[]=@babel/preset-env!./script.js';
```

## 使用场景

### 绕过配置规则

```javascript
// webpack.config.js 配置了 css-loader + style-loader
// 但某些文件需要原始 CSS 字符串

import rawCss from '!!css-loader!./critical.css';
// 只使用 css-loader，不注入样式
```

### 动态选择 Loader

```javascript
// 根据条件选择不同的 Loader
const loader = isProduction ? 'minify-loader' : 'debug-loader';
const module = await import(`${loader}!./data.json`);
```

### 特殊处理某些模块

```javascript
// 大多数 SVG 使用配置的 Loader
import Icon from './icon.svg';

// 某个 SVG 需要原始内容
import rawSvg from '!!raw-loader!./special.svg';
```

### Worker 文件

```javascript
// 使用 worker-loader 处理
import Worker from 'worker-loader!./worker.js';

const worker = new Worker();
```

## 安全与最佳实践

### 避免滥用 Inline Loader

```javascript
// ❌ 不好：到处使用 inline loader
import a from 'loader-a!./a.js';
import b from 'loader-a!./b.js';
import c from 'loader-a!./c.js';

// ✅ 好：在配置中统一处理
// webpack.config.js
{
  test: /\.js$/,
  use: 'loader-a',
}
```

### 用于特例而非常规

```javascript
// ✅ 合理使用：某个文件需要特殊处理
import criticalCss from '!!raw-loader!./critical.css';

// ❌ 不合理：所有文件都用 inline
```

### 禁用 Inline Loader

```javascript
// webpack.config.js
module.exports = {
  module: {
    rules: [
      {
        // 禁止特定模块使用 inline loader
        test: /\.js$/,
        type: 'javascript/auto',
        resolve: {
          fullySpecified: false,
        },
      },
    ],
  },
};
```

## 与 Import 属性的关系

### Webpack 5 的 Import 属性

```javascript
// 现代替代方案
import data from './data.json' with { type: 'json' };

// 资源模块
import url from './image.png?url';
import source from './content.txt?raw';
```

### 对比

```javascript
// 旧方式（inline loader）
import raw from '!!raw-loader!./file.txt';

// 新方式（asset modules）
import raw from './file.txt?raw';
```

## 完整解析示例

```typescript
// 输入请求
const request = '-!style-loader!css-loader?modules=true!./style.css';

// 解析过程
const parsed = parseRequest(request);
// {
//   resource: './style.css',
//   loaders: [
//     { loader: 'style-loader', options: {} },
//     { loader: 'css-loader', options: { modules: true } },
//   ],
//   noPreAutoLoaders: true,
//   noAutoLoaders: false,
//   noPrePostAutoLoaders: false,
// }

// 假设配置中有：
// - pre: eslint-loader
// - normal: babel-loader
// - post: coverage-loader

// 最终 Loader 列表（-! 前缀禁用 pre 和 normal）：
// [coverage-loader, style-loader, css-loader]
// 执行顺序：css-loader → style-loader → coverage-loader
```

## 总结

Inline Loader 的核心概念：

**语法格式**：
- `loader!./file`：应用 Loader
- `loader?options!./file`：带参数
- 多个 Loader 用 `!` 分隔

**前缀修饰符**：
- `!`：禁用 normal Loader
- `-!`：禁用 pre 和 normal Loader
- `!!`：禁用所有配置的 Loader

**参数格式**：
- Query String：`?key=value&key2=value2`
- JSON：`?{"key":"value"}`

**使用建议**：
- 用于特例，不要滥用
- 考虑使用 Webpack 5 的资源模块替代
- 在配置中处理常规情况

**下一章**：我们将进入 Parser 语法解析器部分。
