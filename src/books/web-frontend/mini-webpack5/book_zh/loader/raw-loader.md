---
sidebar_position: 67
title: "Raw Loader 与 Buffer 处理"
---

# Raw Loader 与 Buffer 处理

Raw Loader 接收原始 Buffer 而非字符串，用于处理二进制文件如图片、字体、音视频等。

## Raw 模式基础

### 声明 Raw Loader

```typescript
// 普通 Loader：接收 string
module.exports = function(source: string) {
  return transform(source);
};

// Raw Loader：接收 Buffer
module.exports = function(source: Buffer) {
  return transformBinary(source);
};

// 关键：设置 raw 标志
module.exports.raw = true;
```

### 执行流程

```
文件读取 → Buffer
           ↓
     检查 loader.raw
           ↓
    ┌──────┴──────┐
    ↓             ↓
 raw=true     raw=false
    ↓             ↓
  Buffer       String
    ↓             ↓
 Loader 执行   Loader 执行
```

## loader-runner 中的实现

### 类型转换逻辑

```typescript
function processResource(context: LoaderContext, callback: Callback): void {
  // 读取文件
  context.readResource(context.resource, (err, buffer) => {
    if (err) return callback(err);
    
    // 根据第一个 Loader 的 raw 标志转换
    const firstLoader = context.loaders[context.loaderIndex];
    const content = firstLoader.raw 
      ? buffer 
      : buffer.toString('utf-8');
    
    iterateNormalLoaders(context, content, callback);
  });
}

function iterateNormalLoaders(
  context: LoaderContext,
  content: Buffer | string,
  callback: Callback
): void {
  if (context.loaderIndex < 0) {
    return callback(null, content);
  }

  const currentLoader = context.loaders[context.loaderIndex];
  
  // 根据当前 Loader 的 raw 标志转换内容类型
  const processedContent = currentLoader.raw
    ? convertToBuffer(content)
    : convertToString(content);
  
  runSyncOrAsync(
    currentLoader.normal,
    context,
    [processedContent, sourceMap, meta],
    (err, ...args) => {
      if (err) return callback(err);
      context.loaderIndex--;
      iterateNormalLoaders(context, args[0], callback);
    }
  );
}

function convertToBuffer(content: Buffer | string): Buffer {
  if (Buffer.isBuffer(content)) return content;
  return Buffer.from(content, 'utf-8');
}

function convertToString(content: Buffer | string): string {
  if (typeof content === 'string') return content;
  return content.toString('utf-8');
}
```

## 实现常见 Raw Loader

### file-loader 实现

```typescript
import path from 'path';
import crypto from 'crypto';

interface FileLoaderOptions {
  name?: string;
  outputPath?: string;
  publicPath?: string;
  esModule?: boolean;
}

module.exports = function(source: Buffer): string {
  const options = this.getOptions() as FileLoaderOptions;
  
  const {
    name = '[contenthash].[ext]',
    outputPath = '',
    publicPath = '__webpack_public_path__',
    esModule = true,
  } = options;
  
  // 解析文件信息
  const ext = path.extname(this.resourcePath);
  const basename = path.basename(this.resourcePath, ext);
  
  // 计算内容哈希
  const hash = crypto
    .createHash('md4')
    .update(source)
    .digest('hex');
  
  // 替换文件名模板
  const filename = name
    .replace('[name]', basename)
    .replace('[ext]', ext.slice(1))
    .replace('[contenthash]', hash.slice(0, 8))
    .replace('[hash]', hash.slice(0, 8));
  
  const outputFilename = outputPath + filename;
  
  // 输出文件
  this.emitFile(outputFilename, source);
  
  // 生成导出代码
  const url = publicPath === '__webpack_public_path__'
    ? `__webpack_public_path__ + ${JSON.stringify(outputFilename)}`
    : JSON.stringify(publicPath + outputFilename);
  
  if (esModule) {
    return `export default ${url};`;
  } else {
    return `module.exports = ${url};`;
  }
};

module.exports.raw = true;
```

### url-loader 实现

```typescript
import path from 'path';
import mime from 'mime-types';

interface UrlLoaderOptions {
  limit?: number;
  fallback?: string;
  mimetype?: string;
  encoding?: 'base64' | 'utf8';
  esModule?: boolean;
}

module.exports = function(source: Buffer): string {
  const options = this.getOptions() as UrlLoaderOptions;
  
  const {
    limit = 8192,
    fallback = 'file-loader',
    mimetype,
    encoding = 'base64',
    esModule = true,
  } = options;
  
  // 超过限制使用 fallback
  if (limit !== false && source.length > limit) {
    const fallbackLoader = require(fallback);
    return fallbackLoader.call(this, source);
  }
  
  // 确定 MIME 类型
  const mimeType = mimetype || 
    mime.lookup(this.resourcePath) || 
    'application/octet-stream';
  
  // 编码为 Data URL
  const encoded = source.toString(encoding);
  const dataUrl = `data:${mimeType};${encoding},${encoded}`;
  
  if (esModule) {
    return `export default ${JSON.stringify(dataUrl)};`;
  } else {
    return `module.exports = ${JSON.stringify(dataUrl)};`;
  }
};

module.exports.raw = true;
```

### asset-loader 实现（Webpack 5 风格）

```typescript
interface AssetLoaderOptions {
  type: 'asset' | 'asset/resource' | 'asset/inline' | 'asset/source';
  maxSize?: number;
  filename?: string;
  publicPath?: string;
}

module.exports = function(source: Buffer): string {
  const options = this.getOptions() as AssetLoaderOptions;
  const { type = 'asset', maxSize = 8096 } = options;
  
  switch (type) {
    case 'asset/resource':
      return emitAsResource(this, source, options);
    
    case 'asset/inline':
      return emitAsInline(this, source);
    
    case 'asset/source':
      return emitAsSource(source);
    
    case 'asset':
    default:
      // 根据大小自动选择
      if (source.length < maxSize) {
        return emitAsInline(this, source);
      } else {
        return emitAsResource(this, source, options);
      }
  }
};

function emitAsResource(context, source: Buffer, options): string {
  const filename = generateFilename(context, source, options);
  context.emitFile(filename, source);
  return `export default __webpack_public_path__ + ${JSON.stringify(filename)};`;
}

function emitAsInline(context, source: Buffer): string {
  const mimeType = getMimeType(context.resourcePath);
  const base64 = source.toString('base64');
  return `export default ${JSON.stringify(`data:${mimeType};base64,${base64}`)};`;
}

function emitAsSource(source: Buffer): string {
  return `export default ${JSON.stringify(source.toString('utf-8'))};`;
}

module.exports.raw = true;
```

## 图片处理

### 图片压缩 Loader

```typescript
import imagemin from 'imagemin';
import imageminMozjpeg from 'imagemin-mozjpeg';
import imageminPngquant from 'imagemin-pngquant';
import imageminSvgo from 'imagemin-svgo';
import imageminGifsicle from 'imagemin-gifsicle';
import imageminWebp from 'imagemin-webp';

interface ImageMinLoaderOptions {
  quality?: number;
  progressive?: boolean;
  webp?: boolean;
}

module.exports = async function(source: Buffer): Promise<void> {
  const callback = this.async();
  const options = this.getOptions() as ImageMinLoaderOptions;
  const ext = this.resourcePath.split('.').pop().toLowerCase();
  
  try {
    const plugins = [];
    
    switch (ext) {
      case 'jpg':
      case 'jpeg':
        plugins.push(imageminMozjpeg({
          quality: options.quality || 80,
          progressive: options.progressive ?? true,
        }));
        break;
      
      case 'png':
        plugins.push(imageminPngquant({
          quality: [0.6, 0.8],
        }));
        break;
      
      case 'gif':
        plugins.push(imageminGifsicle({
          optimizationLevel: 3,
        }));
        break;
      
      case 'svg':
        plugins.push(imageminSvgo({
          plugins: [{ name: 'preset-default' }],
        }));
        break;
    }
    
    // 可选转换为 WebP
    if (options.webp && ['jpg', 'jpeg', 'png'].includes(ext)) {
      plugins.push(imageminWebp({ quality: options.quality || 80 }));
    }
    
    if (plugins.length === 0) {
      return callback(null, source);
    }
    
    const optimized = await imagemin.buffer(source, { plugins });
    
    this.getLogger('image-min').info(
      `${this.resourcePath}: ${source.length} → ${optimized.length} ` +
      `(${Math.round((1 - optimized.length / source.length) * 100)}% reduction)`
    );
    
    callback(null, optimized);
  } catch (err) {
    callback(err);
  }
};

module.exports.raw = true;
```

### 图片尺寸信息 Loader

```typescript
import sizeOf from 'image-size';

module.exports = function(source: Buffer): string {
  const dimensions = sizeOf(source);
  
  // 生成 base64
  const base64 = source.toString('base64');
  const mimeType = `image/${dimensions.type}`;
  
  return `
    export const width = ${dimensions.width};
    export const height = ${dimensions.height};
    export const type = ${JSON.stringify(dimensions.type)};
    export const aspectRatio = ${dimensions.width / dimensions.height};
    export const src = ${JSON.stringify(`data:${mimeType};base64,${base64}`)};
    export default {
      width: ${dimensions.width},
      height: ${dimensions.height},
      type: ${JSON.stringify(dimensions.type)},
      aspectRatio: ${dimensions.width / dimensions.height},
      src: ${JSON.stringify(`data:${mimeType};base64,${base64}`)}
    };
  `;
};

module.exports.raw = true;
```

## 字体处理

### 字体子集化 Loader

```typescript
import Fontmin from 'fontmin';

interface FontLoaderOptions {
  text?: string;
  format?: ('woff' | 'woff2' | 'ttf')[];
}

module.exports = async function(source: Buffer): Promise<void> {
  const callback = this.async();
  const options = this.getOptions() as FontLoaderOptions;
  
  try {
    const fontmin = new Fontmin()
      .src(source)
      .use(Fontmin.glyph({
        text: options.text || '',
        hinting: false,
      }));
    
    // 添加格式转换
    if (options.format?.includes('woff')) {
      fontmin.use(Fontmin.ttf2woff());
    }
    if (options.format?.includes('woff2')) {
      fontmin.use(Fontmin.ttf2woff2());
    }
    
    const files = await fontmin.runAsync();
    
    // 返回主文件
    callback(null, files[0].contents);
  } catch (err) {
    callback(err);
  }
};

module.exports.raw = true;
```

## 音视频处理

### 视频转码 Loader

```typescript
import ffmpeg from 'fluent-ffmpeg';
import { PassThrough } from 'stream';
import path from 'path';
import crypto from 'crypto';

interface VideoLoaderOptions {
  format?: string;
  quality?: number;
}

module.exports = async function(source: Buffer): Promise<void> {
  const callback = this.async();
  const options = this.getOptions() as VideoLoaderOptions;
  
  const { format = 'mp4', quality = 23 } = options;
  
  try {
    // 创建输入流
    const inputStream = new PassThrough();
    inputStream.end(source);
    
    // 收集输出
    const chunks: Buffer[] = [];
    const outputStream = new PassThrough();
    outputStream.on('data', chunk => chunks.push(chunk));
    
    await new Promise((resolve, reject) => {
      ffmpeg(inputStream)
        .format(format)
        .videoCodec('libx264')
        .addOption('-crf', String(quality))
        .pipe(outputStream)
        .on('end', resolve)
        .on('error', reject);
    });
    
    const output = Buffer.concat(chunks);
    
    // 生成文件名并输出
    const hash = crypto.createHash('md5').update(output).digest('hex').slice(0, 8);
    const filename = `videos/${path.basename(this.resourcePath, path.extname(this.resourcePath))}.${hash}.${format}`;
    
    this.emitFile(filename, output);
    
    callback(null, `export default __webpack_public_path__ + ${JSON.stringify(filename)};`);
  } catch (err) {
    callback(err);
  }
};

module.exports.raw = true;
```

## WASM 处理

### WASM Loader

```typescript
module.exports = function(source: Buffer): string {
  const hash = require('crypto')
    .createHash('md5')
    .update(source)
    .digest('hex')
    .slice(0, 8);
  
  const filename = `wasm/${hash}.wasm`;
  
  // 输出 WASM 文件
  this.emitFile(filename, source);
  
  // 生成异步加载代码
  return `
    const wasmUrl = __webpack_public_path__ + ${JSON.stringify(filename)};
    
    export default async function loadWasm(imports = {}) {
      const response = await fetch(wasmUrl);
      const buffer = await response.arrayBuffer();
      const { instance } = await WebAssembly.instantiate(buffer, imports);
      return instance.exports;
    }
  `;
};

module.exports.raw = true;
```

## Raw 与 Normal 混合

### 链式调用中的类型转换

```javascript
// webpack.config.js
module.exports = {
  module: {
    rules: [
      {
        test: /\.png$/,
        use: [
          'url-loader',        // raw: true
          'image-webpack-loader',  // raw: true
        ],
      },
    ],
  },
};
```

```
文件 → Buffer → image-webpack-loader(Buffer) → Buffer
                → url-loader(Buffer) → String (JS 代码)
```

## 总结

Raw Loader 的核心概念：

**声明方式**：
- 设置 `module.exports.raw = true`
- Loader 函数接收 Buffer 参数

**适用场景**：
- 图片处理（压缩、转换、获取尺寸）
- 字体处理（格式转换、子集化）
- 音视频处理
- WASM 模块
- 任何二进制文件

**类型转换**：
- loader-runner 自动处理 Buffer ↔ String 转换
- 链式调用中每个 Loader 按需转换

**最佳实践**：
- 二进制文件必须使用 raw 模式
- 输出使用 `emitFile()` 而非直接返回 Buffer
- 生成哈希文件名保证缓存

**下一章**：我们将学习 Loader 缓存与性能优化。
