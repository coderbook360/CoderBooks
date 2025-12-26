---
sidebar_position: 64
title: "Normal Loader 实现"
---

# Normal Loader 实现

Normal Loader 是 Webpack Loader 的核心形态，负责将源文件转换为 JavaScript 可执行代码。

## Normal Loader 基础

### 基本结构

```typescript
// 最简单的 Normal Loader
module.exports = function(source: string): string {
  // source: 文件内容或上一个 Loader 的输出
  // 返回: 转换后的内容
  return transformedSource;
};
```

### 同步与异步

**同步 Loader**：

```typescript
module.exports = function(source) {
  // 直接返回结果
  return source.replace(/foo/g, 'bar');
};
```

**异步 Loader**：

```typescript
module.exports = function(source) {
  const callback = this.async();
  
  someAsyncOperation(source)
    .then(result => callback(null, result))
    .catch(err => callback(err));
};
```

### callback 方法

```typescript
module.exports = function(source, sourceMap, meta) {
  // 使用 callback 可以传递多个结果
  this.callback(
    null,           // Error 或 null
    transformedSource,  // 转换后的内容
    newSourceMap,   // SourceMap（可选）
    newMeta         // 元数据（可选）
  );
  
  // 使用 callback 时必须返回 undefined
  return;
};
```

## 实现一个文本替换 Loader

### 基础版本

```typescript
// replace-loader.js
interface ReplaceLoaderOptions {
  search: string | RegExp;
  replace: string;
}

module.exports = function(source: string): string {
  const options = this.getOptions() as ReplaceLoaderOptions;
  
  const { search, replace } = options;
  
  return source.replace(search, replace);
};
```

### 增强版本

```typescript
// replace-loader.js
import { validate } from 'schema-utils';

const schema = {
  type: 'object',
  properties: {
    search: {
      anyOf: [{ type: 'string' }, { instanceof: 'RegExp' }],
    },
    replace: { type: 'string' },
    flags: { type: 'string' },
  },
  required: ['search', 'replace'],
  additionalProperties: false,
};

module.exports = function(source: string): string {
  const options = this.getOptions();
  
  // 验证配置
  validate(schema, options, {
    name: 'Replace Loader',
    baseDataPath: 'options',
  });
  
  const { search, replace, flags } = options;
  
  // 处理字符串转正则
  const pattern = typeof search === 'string'
    ? new RegExp(escapeRegExp(search), flags || 'g')
    : search;
  
  return source.replace(pattern, replace);
};

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
```

## 实现 JSON Loader

```typescript
// json-loader.js
module.exports = function(source: string): string {
  // 解析 JSON 验证格式
  const json = JSON.parse(source);
  
  // 转换为 ES Module
  return `export default ${JSON.stringify(json)};`;
};
```

### 支持命名导出

```typescript
// json-loader.js
module.exports = function(source: string): string {
  const json = JSON.parse(source);
  
  const exports: string[] = [];
  
  // 生成命名导出
  if (typeof json === 'object' && json !== null && !Array.isArray(json)) {
    for (const key of Object.keys(json)) {
      if (isValidIdentifier(key)) {
        exports.push(
          `export const ${key} = ${JSON.stringify(json[key])};`
        );
      }
    }
  }
  
  // 默认导出
  exports.push(`export default ${JSON.stringify(json)};`);
  
  return exports.join('\n');
};

function isValidIdentifier(name: string): boolean {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name);
}
```

## 实现 Markdown Loader

```typescript
// markdown-loader.js
import { marked } from 'marked';

interface MarkdownLoaderOptions {
  html?: boolean;
  highlight?: boolean;
}

module.exports = function(source: string): string {
  const options = this.getOptions() as MarkdownLoaderOptions;
  
  // 标记为可缓存
  this.cacheable(true);
  
  // 转换 Markdown 为 HTML
  const html = marked(source, {
    gfm: true,
    breaks: true,
    ...options,
  });
  
  // 返回 JS 模块
  return `export default ${JSON.stringify(html)};`;
};
```

### 支持 frontmatter

```typescript
// markdown-loader.js
import { marked } from 'marked';
import matter from 'gray-matter';

module.exports = function(source: string): string {
  this.cacheable(true);
  
  // 解析 frontmatter
  const { data: frontmatter, content } = matter(source);
  
  // 转换 Markdown
  const html = marked(content);
  
  // 导出 frontmatter 和 HTML
  return `
    export const frontmatter = ${JSON.stringify(frontmatter)};
    export const html = ${JSON.stringify(html)};
    export default { frontmatter, html };
  `;
};
```

## 实现 YAML Loader

```typescript
// yaml-loader.js
import yaml from 'js-yaml';

module.exports = function(source: string): string {
  this.cacheable(true);
  
  try {
    const data = yaml.load(source);
    return `export default ${JSON.stringify(data)};`;
  } catch (error) {
    this.emitError(new Error(`YAML parse error: ${error.message}`));
    return 'export default {};';
  }
};
```

## 实现 CSV Loader

```typescript
// csv-loader.js
interface CSVLoaderOptions {
  header?: boolean;
  delimiter?: string;
}

module.exports = function(source: string): string {
  const options = this.getOptions() as CSVLoaderOptions;
  const { header = true, delimiter = ',' } = options;
  
  this.cacheable(true);
  
  const lines = source.trim().split('\n');
  
  if (lines.length === 0) {
    return 'export default [];';
  }
  
  if (header) {
    const headers = parseLine(lines[0], delimiter);
    const rows = lines.slice(1).map(line => {
      const values = parseLine(line, delimiter);
      return headers.reduce((obj, key, i) => {
        obj[key] = values[i] || '';
        return obj;
      }, {} as Record<string, string>);
    });
    
    return `export default ${JSON.stringify(rows)};`;
  } else {
    const rows = lines.map(line => parseLine(line, delimiter));
    return `export default ${JSON.stringify(rows)};`;
  }
};

function parseLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}
```

## 处理二进制文件

### raw 模式

```typescript
// image-size-loader.js
import sizeOf from 'image-size';

// 声明需要原始 Buffer
module.exports = function(source: Buffer): string {
  const dimensions = sizeOf(source);
  
  return `
    export const width = ${dimensions.width};
    export const height = ${dimensions.height};
    export const type = ${JSON.stringify(dimensions.type)};
    export default { width: ${dimensions.width}, height: ${dimensions.height}, type: ${JSON.stringify(dimensions.type)} };
  `;
};

// 标记为 raw Loader
module.exports.raw = true;
```

### 处理字体文件

```typescript
// font-loader.js
module.exports = function(source: Buffer): string {
  const base64 = source.toString('base64');
  const ext = this.resourcePath.split('.').pop();
  
  const mimeTypes: Record<string, string> = {
    woff: 'font/woff',
    woff2: 'font/woff2',
    ttf: 'font/ttf',
    otf: 'font/otf',
    eot: 'application/vnd.ms-fontobject',
  };
  
  const mimeType = mimeTypes[ext] || 'application/octet-stream';
  const dataUrl = `data:${mimeType};base64,${base64}`;
  
  return `export default ${JSON.stringify(dataUrl)};`;
};

module.exports.raw = true;
```

## SourceMap 处理

### 生成 SourceMap

```typescript
// my-transform-loader.js
import { SourceMapGenerator } from 'source-map';

module.exports = function(source: string, inputSourceMap: any): void {
  const callback = this.async();
  
  const lines = source.split('\n');
  const transformed: string[] = [];
  const generator = new SourceMapGenerator({
    file: this.resourcePath,
  });
  
  lines.forEach((line, index) => {
    const newLine = transformLine(line);
    transformed.push(newLine);
    
    // 添加映射
    generator.addMapping({
      generated: { line: index + 1, column: 0 },
      original: { line: index + 1, column: 0 },
      source: this.resourcePath,
    });
  });
  
  generator.setSourceContent(this.resourcePath, source);
  
  callback(null, transformed.join('\n'), generator.toJSON());
};
```

### 合并 SourceMap

```typescript
// transform-loader.js
import { SourceMapConsumer, SourceMapGenerator } from 'source-map';

module.exports = async function(
  source: string,
  inputSourceMap: any
): Promise<void> {
  const callback = this.async();
  
  const { code, map: outputMap } = transform(source);
  
  if (inputSourceMap && outputMap) {
    // 合并 SourceMap
    const mergedMap = await mergeSourceMaps(inputSourceMap, outputMap);
    callback(null, code, mergedMap);
  } else {
    callback(null, code, outputMap || inputSourceMap);
  }
};

async function mergeSourceMaps(
  inputMap: any,
  outputMap: any
): Promise<any> {
  const inputConsumer = await new SourceMapConsumer(inputMap);
  const outputConsumer = await new SourceMapConsumer(outputMap);
  const generator = new SourceMapGenerator();
  
  outputConsumer.eachMapping((mapping) => {
    const original = inputConsumer.originalPositionFor({
      line: mapping.originalLine,
      column: mapping.originalColumn,
    });
    
    if (original.source) {
      generator.addMapping({
        generated: {
          line: mapping.generatedLine,
          column: mapping.generatedColumn,
        },
        original: {
          line: original.line,
          column: original.column,
        },
        source: original.source,
        name: original.name,
      });
    }
  });
  
  inputConsumer.destroy();
  outputConsumer.destroy();
  
  return generator.toJSON();
}
```

## 错误处理

### 友好的错误信息

```typescript
module.exports = function(source: string): string {
  try {
    return process(source);
  } catch (error) {
    // 创建带位置信息的错误
    const err = new Error(
      `Transform error in ${this.resourcePath}:\n${error.message}`
    );
    
    // 添加位置信息
    if (error.line && error.column) {
      err.message += `\n  at line ${error.line}, column ${error.column}`;
      
      // 显示出错的代码片段
      const lines = source.split('\n');
      const errorLine = lines[error.line - 1];
      if (errorLine) {
        err.message += `\n\n  ${errorLine}`;
        err.message += `\n  ${' '.repeat(error.column - 1)}^`;
      }
    }
    
    throw err;
  }
};
```

### 警告信息

```typescript
module.exports = function(source: string): string {
  // 发出警告
  if (source.includes('deprecated')) {
    this.emitWarning(
      new Error('This file contains deprecated syntax')
    );
  }
  
  return transform(source);
};
```

## 总结

Normal Loader 实现要点：

**基本模式**：
- 接收 source，返回转换结果
- 同步直接返回，异步使用 `this.async()`
- 使用 `this.callback()` 传递多个值

**最佳实践**：
- 使用 schema-utils 验证配置
- 调用 `this.cacheable(true)` 启用缓存
- 处理 SourceMap 保持调试体验
- 提供友好的错误信息

**二进制处理**：
- 设置 `module.exports.raw = true`
- 接收 Buffer 而非字符串

**下一章**：我们将探讨 Pitching Loader 的实现。
