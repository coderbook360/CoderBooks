---
sidebar_position: 128
title: "输出路径解析"
---

# 输出路径解析

Webpack 的输出路径解析涉及模板字符串处理、文件名生成和路径计算。本章深入理解路径解析机制。

## 路径配置

### 基础配置

```typescript
interface OutputOptions {
  // 输出目录（绝对路径）
  path: string;
  
  // 文件名模板
  filename: string;
  
  // 非入口 chunk 文件名
  chunkFilename: string;
  
  // 资源文件名
  assetModuleFilename: string;
  
  // 公共路径
  publicPath: string | 'auto';
  
  // 唯一名称
  uniqueName: string;
}
```

### 模板占位符

```typescript
const TEMPLATE_PLACEHOLDERS = {
  // 基础占位符
  '[name]': 'chunk 名称',
  '[id]': 'chunk ID',
  '[file]': '完整文件名',
  '[base]': '带扩展名的文件名',
  '[path]': '相对路径',
  '[ext]': '扩展名',
  
  // Hash 占位符
  '[hash]': '编译 hash',
  '[chunkhash]': 'chunk 内容 hash',
  '[contenthash]': '文件内容 hash',
  '[fullhash]': '完整编译 hash',
  
  // 长度控制
  '[hash:8]': '8位 hash',
  '[contenthash:10]': '10位内容 hash',
};
```

## 模板解析器

### TemplatedPathPlugin

```typescript
class TemplatedPathPlugin {
  apply(compiler: Compiler): void {
    compiler.hooks.compilation.tap('TemplatedPathPlugin', (compilation) => {
      compilation.hooks.assetPath.tap(
        'TemplatedPathPlugin',
        (path, data, assetInfo) => {
          return this.replacePathVariables(path, data, assetInfo);
        }
      );
    });
  }
  
  replacePathVariables(
    template: string,
    data: PathData,
    assetInfo?: AssetInfo
  ): string {
    let result = template;
    
    // 替换 [name]
    if (data.chunk) {
      result = result.replace(/\[name\]/g, data.chunk.name || data.chunk.id);
    }
    
    // 替换 [id]
    if (data.chunk) {
      result = result.replace(/\[id\]/g, String(data.chunk.id));
    }
    
    // 替换 hash 相关
    result = this.replaceHashPlaceholders(result, data);
    
    // 替换模块相关
    if (data.module) {
      result = this.replaceModulePlaceholders(result, data);
    }
    
    return result;
  }
  
  private replaceHashPlaceholders(template: string, data: PathData): string {
    let result = template;
    
    // [hash] 或 [fullhash]
    result = result.replace(
      /\[(?:full)?hash(?::(\d+))?\]/g,
      (match, length) => {
        const hash = data.hash || '';
        return length ? hash.slice(0, parseInt(length)) : hash;
      }
    );
    
    // [chunkhash]
    result = result.replace(
      /\[chunkhash(?::(\d+))?\]/g,
      (match, length) => {
        const hash = data.chunk?.hash || '';
        return length ? hash.slice(0, parseInt(length)) : hash;
      }
    );
    
    // [contenthash]
    result = result.replace(
      /\[contenthash(?::(\d+))?\]/g,
      (match, length) => {
        const hash = data.contentHash?.[data.contentHashType || 'javascript'] || '';
        return length ? hash.slice(0, parseInt(length)) : hash;
      }
    );
    
    return result;
  }
  
  private replaceModulePlaceholders(template: string, data: PathData): string {
    let result = template;
    const module = data.module;
    
    // [file] - 模块文件名
    if (module.resourcePath) {
      const parsed = path.parse(module.resourcePath);
      
      result = result.replace(/\[file\]/g, module.resourcePath);
      result = result.replace(/\[base\]/g, parsed.base);
      result = result.replace(/\[name\]/g, parsed.name);
      result = result.replace(/\[path\]/g, parsed.dir);
      result = result.replace(/\[ext\]/g, parsed.ext);
    }
    
    return result;
  }
}

interface PathData {
  hash?: string;
  chunk?: Chunk;
  module?: Module;
  filename?: string;
  contentHash?: Record<string, string>;
  contentHashType?: string;
}
```

## 路径计算

### 输出路径计算

```typescript
class Compilation {
  getPath(filename: string, data: PathData): string {
    // 调用 assetPath hook 进行模板替换
    return this.hooks.assetPath.call(filename, data, undefined);
  }
  
  getPathWithInfo(
    filename: string,
    data: PathData
  ): { path: string; info: AssetInfo } {
    const info: AssetInfo = {};
    
    const path = this.hooks.assetPath.call(filename, data, info);
    
    return { path, info };
  }
  
  getAssetPath(filename: string, data: PathData): string {
    return this.getPath(filename, data);
  }
  
  getAssetPathWithInfo(
    filename: string,
    data: PathData
  ): { path: string; info: AssetInfo } {
    return this.getPathWithInfo(filename, data);
  }
}
```

### Chunk 文件名计算

```typescript
class Compilation {
  getChunkFilename(chunk: Chunk): string {
    const template = chunk.hasRuntime() 
      ? this.outputOptions.filename
      : this.outputOptions.chunkFilename;
    
    const data: PathData = {
      hash: this.hash,
      chunk,
      contentHash: chunk.contentHash,
      contentHashType: 'javascript',
    };
    
    return this.getPath(template, data);
  }
  
  getChunkFilenameWithInfo(chunk: Chunk): {
    path: string;
    info: AssetInfo;
  } {
    const template = chunk.hasRuntime()
      ? this.outputOptions.filename
      : this.outputOptions.chunkFilename;
    
    const data: PathData = {
      hash: this.hash,
      chunk,
      contentHash: chunk.contentHash,
      contentHashType: 'javascript',
    };
    
    return this.getPathWithInfo(template, data);
  }
}
```

### 资源文件名计算

```typescript
class AssetGenerator {
  getFilename(
    module: Module,
    compilation: Compilation
  ): string {
    // 使用模块配置或全局配置
    const template = module.generator?.filename 
      || compilation.outputOptions.assetModuleFilename;
    
    const data: PathData = {
      hash: compilation.hash,
      module,
      contentHash: {
        asset: module.buildInfo.contentHash,
      },
      contentHashType: 'asset',
    };
    
    return compilation.getPath(template, data);
  }
}
```

## 公共路径处理

### publicPath 解析

```typescript
class Compilation {
  getPublicPath(): string {
    const { publicPath } = this.outputOptions;
    
    if (publicPath === 'auto') {
      // 运行时自动计算
      return '';
    }
    
    if (typeof publicPath === 'function') {
      return publicPath({ hash: this.hash });
    }
    
    return publicPath;
  }
  
  getAssetUrl(assetPath: string): string {
    const publicPath = this.getPublicPath();
    
    // 处理绝对路径
    if (assetPath.startsWith('/')) {
      return assetPath;
    }
    
    // 处理协议路径
    if (/^https?:\/\//.test(assetPath)) {
      return assetPath;
    }
    
    // 拼接公共路径
    return publicPath + assetPath;
  }
}
```

### 运行时 publicPath

```typescript
// 运行时模块：计算 auto publicPath
class AutoPublicPathRuntimeModule extends RuntimeModule {
  generate(): string {
    return `
      __webpack_require__.p = (function() {
        // 从当前脚本 URL 推断公共路径
        var script = document.currentScript;
        if (script && script.src) {
          var src = script.src;
          var lastSlash = src.lastIndexOf('/');
          return src.slice(0, lastSlash + 1);
        }
        return '/';
      })();
    `;
  }
}
```

## 路径辅助函数

### 路径工具

```typescript
class PathUtils {
  // 获取相对路径
  static getRelativePath(from: string, to: string): string {
    const relativePath = path.relative(path.dirname(from), to);
    
    // 确保以 ./ 开头
    if (!relativePath.startsWith('.')) {
      return './' + relativePath;
    }
    
    return relativePath;
  }
  
  // 规范化路径
  static normalize(p: string): string {
    return p.replace(/\\/g, '/');
  }
  
  // 获取输出文件完整路径
  static getOutputPath(
    outputPath: string,
    filename: string
  ): string {
    return path.join(outputPath, filename);
  }
  
  // 计算资源相对于 chunk 的路径
  static getAssetRelativePath(
    chunkPath: string,
    assetPath: string
  ): string {
    const chunkDir = path.dirname(chunkPath);
    const assetDir = path.dirname(assetPath);
    
    if (chunkDir === assetDir) {
      return path.basename(assetPath);
    }
    
    return this.getRelativePath(chunkPath, assetPath);
  }
}
```

### 文件名安全处理

```typescript
class FilenameUtils {
  // 生成安全的文件名
  static sanitize(filename: string): string {
    return filename
      .replace(/[<>:"/\\|?*]/g, '_')  // 替换非法字符
      .replace(/\s+/g, '_')            // 替换空白
      .replace(/_+/g, '_')             // 合并下划线
      .toLowerCase();
  }
  
  // 生成唯一文件名
  static makeUnique(
    filename: string,
    existing: Set<string>
  ): string {
    if (!existing.has(filename)) {
      return filename;
    }
    
    const ext = path.extname(filename);
    const base = path.basename(filename, ext);
    let counter = 1;
    let newFilename: string;
    
    do {
      newFilename = `${base}_${counter}${ext}`;
      counter++;
    } while (existing.has(newFilename));
    
    return newFilename;
  }
  
  // 验证文件名模板
  static validateTemplate(template: string): string[] {
    const errors: string[] = [];
    
    // 检查未闭合的占位符
    const openBrackets = (template.match(/\[/g) || []).length;
    const closeBrackets = (template.match(/\]/g) || []).length;
    
    if (openBrackets !== closeBrackets) {
      errors.push('Unmatched brackets in filename template');
    }
    
    // 检查无效占位符
    const placeholders = template.match(/\[([^\]]+)\]/g) || [];
    const validPlaceholders = [
      'name', 'id', 'hash', 'chunkhash', 'contenthash',
      'fullhash', 'file', 'base', 'path', 'ext'
    ];
    
    for (const placeholder of placeholders) {
      const name = placeholder.slice(1, -1).split(':')[0];
      if (!validPlaceholders.includes(name)) {
        errors.push(`Unknown placeholder: ${placeholder}`);
      }
    }
    
    return errors;
  }
}
```

## 实际示例

### 多入口配置

```typescript
// webpack.config.js
module.exports = {
  entry: {
    main: './src/main.js',
    admin: './src/admin.js',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].[contenthash:8].js',
    chunkFilename: 'chunks/[name].[contenthash:8].js',
    assetModuleFilename: 'assets/[name].[contenthash:8][ext]',
    publicPath: '/static/',
  },
};

// 输出结果：
// dist/main.a1b2c3d4.js
// dist/admin.e5f6g7h8.js
// dist/chunks/shared.i9j0k1l2.js
// dist/assets/logo.m3n4o5p6.png
```

### 动态 publicPath

```typescript
module.exports = {
  output: {
    publicPath: (pathData, assetInfo) => {
      // 根据环境返回不同路径
      if (process.env.CDN_URL) {
        return process.env.CDN_URL;
      }
      return '/';
    },
  },
};
```

## 总结

输出路径解析的核心要点：

**模板系统**：
- 占位符替换机制
- Hash 长度控制
- 模块信息插入

**路径计算**：
- Chunk 文件名
- 资源文件名
- 公共路径

**工具函数**：
- 路径规范化
- 文件名安全化
- 唯一性保证

**使用场景**：
- 多入口输出
- CDN 部署
- 缓存策略

**下一章**：我们将学习文件写入与目录创建。
