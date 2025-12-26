---
sidebar_position: 65
title: "编写自定义 Loader"
---

# 编写自定义 Loader

掌握自定义 Loader 的编写是深入理解 Webpack 的重要一步。本章通过实例讲解 Loader 开发。

## 基础 Loader

### 最简单的 Loader

```typescript
// replace-loader.js
module.exports = function(source) {
  return source.replace(/foo/g, 'bar');
};
```

### 使用配置

```typescript
// webpack.config.js
module.exports = {
  module: {
    rules: [
      {
        test: /\.txt$/,
        use: {
          loader: path.resolve(__dirname, 'loaders/replace-loader.js'),
        },
      },
    ],
  },
};
```

## 完整 Loader 模板

```typescript
// my-loader.js
import { validate } from 'schema-utils';
import type { LoaderContext } from 'webpack';

// 选项 Schema
const schema = {
  type: 'object',
  properties: {
    option1: { type: 'string' },
    option2: { type: 'boolean' },
  },
  additionalProperties: false,
};

interface MyLoaderOptions {
  option1?: string;
  option2?: boolean;
}

export default function loader(
  this: LoaderContext<MyLoaderOptions>,
  source: string
): string {
  // 获取并验证选项
  const options = this.getOptions() as MyLoaderOptions;
  validate(schema, options, { name: 'my-loader' });
  
  // 标记为可缓存
  this.cacheable(true);
  
  // 处理逻辑
  const result = transform(source, options);
  
  return result;
}

function transform(source: string, options: MyLoaderOptions): string {
  // 实际转换逻辑
  return source;
}
```

## 实战示例

### Markdown Loader

```typescript
// markdown-loader.js
const marked = require('marked');
const hljs = require('highlight.js');

const schema = {
  type: 'object',
  properties: {
    html: { type: 'boolean', default: true },
    highlight: { type: 'boolean', default: true },
  },
};

module.exports = function(source) {
  const options = this.getOptions(schema);
  
  // 配置 marked
  marked.setOptions({
    highlight: options.highlight
      ? (code, lang) => {
          if (lang && hljs.getLanguage(lang)) {
            return hljs.highlight(code, { language: lang }).value;
          }
          return code;
        }
      : undefined,
  });
  
  // 转换 Markdown
  const html = marked.parse(source);
  
  // 根据选项返回不同格式
  if (options.html) {
    return `export default ${JSON.stringify(html)};`;
  }
  
  // 返回 React 组件
  return `
    import React from 'react';
    
    export default function MarkdownContent() {
      return (
        <div dangerouslySetInnerHTML={{ __html: ${JSON.stringify(html)} }} />
      );
    }
  `;
};
```

### 环境变量注入 Loader

```typescript
// env-loader.js
module.exports = function(source) {
  const callback = this.async();
  const options = this.getOptions();
  
  // 读取环境变量
  const envVars = options.variables || ['NODE_ENV'];
  const replacements = {};
  
  for (const key of envVars) {
    replacements[`process.env.${key}`] = JSON.stringify(process.env[key] || '');
  }
  
  // 替换
  let result = source;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(escapeRegExp(key), 'g'), value);
  }
  
  callback(null, result);
};

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
```

### SVG 组件 Loader

```typescript
// svg-loader.js
const svgr = require('@svgr/core').default;

const schema = {
  type: 'object',
  properties: {
    native: { type: 'boolean' },
    icon: { type: 'boolean' },
    dimensions: { type: 'boolean', default: true },
  },
};

module.exports = async function(source) {
  const callback = this.async();
  const options = this.getOptions(schema);
  
  try {
    const jsCode = await svgr(source, {
      plugins: ['@svgr/plugin-svgo', '@svgr/plugin-jsx'],
      native: options.native,
      icon: options.icon,
      dimensions: options.dimensions,
    });
    
    callback(null, jsCode);
  } catch (err) {
    callback(err);
  }
};
```

### 条件编译 Loader

```typescript
// conditional-loader.js
module.exports = function(source) {
  const options = this.getOptions();
  const defines = options.defines || {};
  
  // 处理 #if / #endif 指令
  const lines = source.split('\n');
  const result = [];
  let skipUntilEndif = false;
  
  for (const line of lines) {
    const ifMatch = line.match(/\/\/\s*#if\s+(\w+)/);
    const endifMatch = line.match(/\/\/\s*#endif/);
    
    if (ifMatch) {
      const condition = ifMatch[1];
      skipUntilEndif = !defines[condition];
      continue;
    }
    
    if (endifMatch) {
      skipUntilEndif = false;
      continue;
    }
    
    if (!skipUntilEndif) {
      result.push(line);
    }
  }
  
  return result.join('\n');
};

// 使用
// #if DEBUG
console.log('Debug mode');
// #endif
```

### 国际化 Loader

```typescript
// i18n-loader.js
const fs = require('fs');
const path = require('path');

module.exports = function(source) {
  const callback = this.async();
  const options = this.getOptions();
  const locale = options.locale || 'en';
  
  // 加载翻译文件
  const localeFile = path.resolve(
    this.context,
    `../locales/${locale}.json`
  );
  
  // 添加依赖
  this.addDependency(localeFile);
  
  fs.readFile(localeFile, 'utf-8', (err, content) => {
    if (err) {
      this.emitWarning(new Error(`Locale file not found: ${locale}`));
      return callback(null, source);
    }
    
    const translations = JSON.parse(content);
    
    // 替换 $t('key') 调用
    const result = source.replace(
      /\$t\(['"](.+?)['"]\)/g,
      (match, key) => {
        return JSON.stringify(translations[key] || key);
      }
    );
    
    callback(null, result);
  });
};
```

## 处理二进制数据

### Raw Loader

```typescript
// binary-loader.js
module.exports = function(source) {
  // source 是 Buffer
  const base64 = source.toString('base64');
  const size = source.length;
  
  return `
    export const base64 = "${base64}";
    export const size = ${size};
    export default base64;
  `;
};

// 标记为 raw
module.exports.raw = true;
```

### 图片优化 Loader

```typescript
// image-loader.js
const sharp = require('sharp');

module.exports = async function(source) {
  const callback = this.async();
  const options = this.getOptions();
  
  try {
    let image = sharp(source);
    
    // 调整大小
    if (options.maxWidth || options.maxHeight) {
      image = image.resize(options.maxWidth, options.maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }
    
    // 转换格式
    if (options.format) {
      image = image.toFormat(options.format, {
        quality: options.quality || 80,
      });
    }
    
    const optimizedBuffer = await image.toBuffer();
    const base64 = optimizedBuffer.toString('base64');
    const mimeType = options.format 
      ? `image/${options.format}` 
      : 'image/png';
    
    callback(null, `
      export default "data:${mimeType};base64,${base64}";
    `);
  } catch (err) {
    callback(err);
  }
};

module.exports.raw = true;
```

## 带 SourceMap 的 Loader

```typescript
// transform-loader.js
const { SourceMapGenerator } = require('source-map');

module.exports = function(source, inputSourceMap) {
  const callback = this.callback;
  const options = this.getOptions();
  
  // 生成新的 SourceMap
  const map = new SourceMapGenerator({
    file: this.resourcePath,
  });
  
  // 逐行处理，维护行号映射
  const lines = source.split('\n');
  const outputLines = [];
  
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    const transformed = transformLine(line);
    outputLines.push(transformed);
    
    // 添加映射
    map.addMapping({
      generated: { line: lineNum, column: 0 },
      original: { line: lineNum, column: 0 },
      source: this.resourcePath,
    });
  });
  
  const output = outputLines.join('\n');
  const outputSourceMap = map.toJSON();
  
  callback(null, output, outputSourceMap);
};

function transformLine(line) {
  // 转换逻辑
  return line;
}
```

## 测试 Loader

### 基本测试

```typescript
// __tests__/my-loader.test.js
const compiler = require('./compiler');

describe('my-loader', () => {
  it('should transform source', async () => {
    const stats = await compiler('example.txt', {
      // Loader 选项
    });
    
    const output = stats.toJson().modules[0].source;
    expect(output).toContain('expected content');
  });
});

// compiler.js
const path = require('path');
const webpack = require('webpack');
const { createFsFromVolume, Volume } = require('memfs');

module.exports = async (fixture, options = {}) => {
  const compiler = webpack({
    mode: 'development',
    context: __dirname,
    entry: `./${fixture}`,
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'bundle.js',
    },
    module: {
      rules: [
        {
          test: /\.txt$/,
          use: {
            loader: path.resolve(__dirname, '../src/my-loader.js'),
            options,
          },
        },
      ],
    },
  });
  
  compiler.outputFileSystem = createFsFromVolume(new Volume());
  
  return new Promise((resolve, reject) => {
    compiler.run((err, stats) => {
      if (err) reject(err);
      else resolve(stats);
    });
  });
};
```

## 发布 Loader

### package.json

```json
{
  "name": "my-awesome-loader",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist"],
  "keywords": ["webpack", "loader"],
  "peerDependencies": {
    "webpack": "^5.0.0"
  },
  "devDependencies": {
    "webpack": "^5.0.0",
    "schema-utils": "^4.0.0"
  }
}
```

## 总结

自定义 Loader 开发要点：

**基础结构**：
- 导出函数接收 source
- 使用 getOptions 获取配置
- 使用 callback 或 return 返回结果

**高级功能**：
- raw: true 处理二进制
- async() 支持异步操作
- SourceMap 支持

**最佳实践**：
- 使用 schema-utils 验证选项
- 添加依赖追踪
- 编写测试用例

**下一章**：我们将探讨常见 Loader 的实现分析。
