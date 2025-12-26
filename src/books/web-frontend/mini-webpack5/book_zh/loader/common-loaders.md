---
sidebar_position: 66
title: "常见 Loader 实现分析"
---

# 常见 Loader 实现分析

分析常见 Loader 的实现原理，学习优秀的设计模式。

## babel-loader

### 核心实现

```typescript
import * as babel from '@babel/core';
import { validate } from 'schema-utils';

export default function babelLoader(source, inputSourceMap) {
  const callback = this.async();
  const options = this.getOptions();
  
  // 合并选项
  const babelOptions = {
    ...options,
    filename: this.resourcePath,
    inputSourceMap: inputSourceMap || undefined,
    sourceMaps: this.sourceMap,
    sourceFileName: this.resourcePath,
  };
  
  // 执行转换
  babel.transform(source, babelOptions, (err, result) => {
    if (err) {
      return callback(err);
    }
    
    const { code, map, metadata } = result;
    
    callback(null, code, map, metadata);
  });
}
```

### 缓存机制

```typescript
import { getCacheKey, cache } from './cache';

export default async function babelLoader(source) {
  const callback = this.async();
  const options = this.getOptions();
  
  // 生成缓存键
  const cacheKey = getCacheKey(source, this.resourcePath, options);
  
  // 检查缓存
  const cached = await cache.get(cacheKey);
  if (cached) {
    return callback(null, cached.code, cached.map);
  }
  
  // 执行转换
  const result = await babel.transformAsync(source, {
    ...options,
    filename: this.resourcePath,
  });
  
  // 存入缓存
  await cache.set(cacheKey, result);
  
  callback(null, result.code, result.map);
}
```

## css-loader

### 核心功能

css-loader 主要处理 CSS 中的 `@import` 和 `url()`：

```typescript
import postcss from 'postcss';
import postcssImport from 'postcss-import';
import postcssUrl from 'postcss-url';

export default async function cssLoader(source) {
  const callback = this.async();
  const options = this.getOptions();
  
  // 收集依赖
  const imports = [];
  const urls = [];
  
  // PostCSS 处理
  const result = await postcss([
    // 处理 @import
    {
      postcssPlugin: 'css-loader-import',
      AtRule: {
        import: (atRule) => {
          const url = extractUrl(atRule.params);
          imports.push(url);
          atRule.remove();
        },
      },
    },
    // 处理 url()
    {
      postcssPlugin: 'css-loader-url',
      Declaration: (decl) => {
        decl.value = decl.value.replace(
          /url\((.+?)\)/g,
          (match, url) => {
            const cleanUrl = url.replace(/["']/g, '');
            urls.push(cleanUrl);
            return `url(___CSS_LOADER_URL_${urls.length - 1}___)`;
          }
        );
      },
    },
  ]).process(source, { from: this.resourcePath });
  
  // 生成 JavaScript 模块
  const output = generateOutput(result.css, imports, urls);
  
  callback(null, output);
}

function generateOutput(css, imports, urls) {
  let code = '';
  
  // 导入语句
  imports.forEach((url, i) => {
    code += `import ___CSS_LOADER_IMPORT_${i}___ from ${JSON.stringify(url)};\n`;
  });
  
  urls.forEach((url, i) => {
    code += `import ___CSS_LOADER_URL_${i}___ from ${JSON.stringify(url)};\n`;
  });
  
  // 导出 CSS
  code += `
    var ___CSS_LOADER_EXPORT___ = [];
    
    // 添加导入的 CSS
    ${imports.map((_, i) => `___CSS_LOADER_EXPORT___.push(...___CSS_LOADER_IMPORT_${i}___);`).join('\n')}
    
    // 添加当前 CSS
    ___CSS_LOADER_EXPORT___.push([module.id, ${JSON.stringify(css)
      .replace(/___CSS_LOADER_URL_(\d+)___/g, '" + ___CSS_LOADER_URL_$1___ + "')}]);
    
    export default ___CSS_LOADER_EXPORT___;
  `;
  
  return code;
}
```

## style-loader

### Pitch 实现

style-loader 使用 pitch 注入 CSS：

```typescript
export function pitch(remainingRequest) {
  const options = this.getOptions();
  
  // 生成运行时代码
  return `
    import api from '${require.resolve('./runtime/injectStylesIntoStyleTag')}';
    import content from ${JSON.stringify('!!' + remainingRequest)};
    
    var options = ${JSON.stringify(options)};
    
    // 注入样式
    var update = api(content, options);
    
    // HMR 支持
    if (module.hot) {
      if (!content.locals) {
        module.hot.accept(${JSON.stringify('!!' + remainingRequest)}, function() {
          var newContent = require(${JSON.stringify('!!' + remainingRequest)});
          update(newContent);
        });
      }
      
      module.hot.dispose(function() {
        update();
      });
    }
    
    export default content.locals || {};
  `;
}
```

### 运行时

```typescript
// runtime/injectStylesIntoStyleTag.js
export default function injectStylesIntoStyleTag(content, options) {
  const styleElements = [];
  
  // 创建 style 元素
  for (const item of content) {
    const [id, css, media, sourceMap] = item;
    
    const style = document.createElement('style');
    style.setAttribute('data-webpack', id);
    
    if (media) {
      style.setAttribute('media', media);
    }
    
    style.textContent = css;
    document.head.appendChild(style);
    styleElements.push(style);
  }
  
  // 返回更新函数
  return function update(newContent) {
    if (newContent) {
      // 更新样式
      newContent.forEach((item, i) => {
        if (styleElements[i]) {
          styleElements[i].textContent = item[1];
        }
      });
    } else {
      // 移除样式
      styleElements.forEach(el => el.remove());
    }
  };
}
```

## file-loader / asset modules

Webpack 5 内置了 Asset Modules，这是 file-loader 的原理：

```typescript
export default function fileLoader(source) {
  const options = this.getOptions();
  
  // 生成文件名
  const filename = interpolateName(
    this,
    options.name || '[contenthash].[ext]',
    { content: source }
  );
  
  // 发射文件
  this.emitFile(filename, source);
  
  // 返回公共路径
  const publicPath = options.publicPath || '__webpack_public_path__';
  
  return `
    export default ${publicPath} + ${JSON.stringify(filename)};
  `;
}

fileLoader.raw = true;

// 文件名模板处理
function interpolateName(loaderContext, name, options) {
  const { resourcePath } = loaderContext;
  const ext = path.extname(resourcePath).slice(1);
  const basename = path.basename(resourcePath, '.' + ext);
  const hash = createHash('md5')
    .update(options.content)
    .digest('hex')
    .slice(0, 8);
  
  return name
    .replace('[name]', basename)
    .replace('[ext]', ext)
    .replace('[hash]', hash)
    .replace('[contenthash]', hash);
}
```

## ts-loader

### 简化实现

```typescript
import * as ts from 'typescript';

const tsConfigCache = new Map();

export default function tsLoader(source) {
  const callback = this.async();
  
  // 获取 TypeScript 配置
  const configPath = ts.findConfigFile(
    this.context,
    ts.sys.fileExists,
    'tsconfig.json'
  );
  
  let config = tsConfigCache.get(configPath);
  if (!config) {
    const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
    config = ts.parseJsonConfigFileContent(
      configFile.config,
      ts.sys,
      path.dirname(configPath)
    );
    tsConfigCache.set(configPath, config);
  }
  
  // 编译
  const result = ts.transpileModule(source, {
    compilerOptions: config.options,
    fileName: this.resourcePath,
    reportDiagnostics: true,
  });
  
  // 报告诊断信息
  if (result.diagnostics && result.diagnostics.length > 0) {
    for (const diagnostic of result.diagnostics) {
      const message = ts.flattenDiagnosticMessageText(
        diagnostic.messageText,
        '\n'
      );
      
      if (diagnostic.category === ts.DiagnosticCategory.Error) {
        this.emitError(new Error(message));
      } else {
        this.emitWarning(new Error(message));
      }
    }
  }
  
  callback(null, result.outputText, result.sourceMapText);
}
```

## raw-loader

最简单的 Loader 之一：

```typescript
export default function rawLoader(source) {
  const json = JSON.stringify(source);
  return `export default ${json};`;
}
```

## url-loader

结合了 file-loader 和内联功能：

```typescript
export default function urlLoader(source) {
  const options = this.getOptions();
  const limit = options.limit || 8192;
  
  // 超过限制使用 file-loader
  if (source.length > limit) {
    const fileLoader = require('file-loader');
    return fileLoader.call(this, source);
  }
  
  // 内联为 base64
  const mimeType = options.mimetype || getMimeType(this.resourcePath);
  const base64 = source.toString('base64');
  
  return `export default "data:${mimeType};base64,${base64}";`;
}

urlLoader.raw = true;

function getMimeType(filepath) {
  const ext = path.extname(filepath).slice(1);
  const mimeTypes = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    woff: 'font/woff',
    woff2: 'font/woff2',
    ttf: 'font/ttf',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}
```

## vue-loader

### 核心设计

```typescript
// vue-loader 主要处理 .vue 文件的解析
import { parse } from '@vue/compiler-sfc';

export default function vueLoader(source) {
  const { descriptor, errors } = parse(source, {
    filename: this.resourcePath,
  });
  
  if (errors.length) {
    errors.forEach(e => this.emitError(e));
  }
  
  // 生成代码引用各个块
  let code = '';
  
  // Script
  if (descriptor.script || descriptor.scriptSetup) {
    code += `
      import script from ${stringifyRequest(this, 
        `${this.resourcePath}?vue&type=script`
      )};
    `;
  }
  
  // Template
  if (descriptor.template) {
    code += `
      import { render } from ${stringifyRequest(this,
        `${this.resourcePath}?vue&type=template`
      )};
      script.render = render;
    `;
  }
  
  // Styles
  descriptor.styles.forEach((style, i) => {
    code += `
      import ${stringifyRequest(this,
        `${this.resourcePath}?vue&type=style&index=${i}${style.scoped ? '&scoped' : ''}`
      )};
    `;
  });
  
  code += `
    export default script;
  `;
  
  return code;
}

// 通过 pitch 处理特定块
vueLoader.pitch = function(remainingRequest) {
  const query = parseQuery(this.resourceQuery);
  
  if (!query.vue) return;
  
  // 根据 type 返回特定块的内容
  // 这里省略具体实现
};
```

## 总结

常见 Loader 的设计模式：

**babel-loader**：
- 利用 @babel/core API
- 实现缓存优化
- 传递 SourceMap

**css-loader**：
- 解析 CSS 依赖
- 生成 JavaScript 模块
- 处理 url() 引用

**style-loader**：
- 使用 pitch 阶段
- 运行时注入样式
- 支持 HMR

**file-loader**：
- 处理二进制（raw: true）
- 发射文件
- 返回公共路径

**vue-loader**：
- 解析单文件组件
- 通过查询参数分块处理
- 组合多个 Loader

**下一章**：我们将探讨 Loader 缓存策略。
