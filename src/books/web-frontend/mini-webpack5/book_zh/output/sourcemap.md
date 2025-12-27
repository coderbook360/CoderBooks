# SourceMap 生成策略

SourceMap 用于将压缩/转换后的代码映射回原始源码，方便调试。

## devtool 配置

```javascript
module.exports = {
  devtool: 'source-map'
}
```

### 常用选项

| 选项 | 质量 | 速度 | 生产环境 | 说明 |
|------|------|------|----------|------|
| `eval` | 低 | 快 | ❌ | 使用 eval 包裹 |
| `source-map` | 高 | 慢 | ✅ | 独立文件 |
| `hidden-source-map` | 高 | 慢 | ✅ | 不添加引用 |
| `inline-source-map` | 高 | 慢 | ❌ | 内联到文件 |
| `eval-source-map` | 高 | 中 | ❌ | eval + SourceMap |
| `cheap-source-map` | 中 | 快 | ✅ | 无列信息 |
| `cheap-module-source-map` | 中 | 快 | ✅ | 含 Loader SourceMap |

## SourceMap 生成

### EvalDevToolModulePlugin

```typescript
class EvalDevToolModulePlugin {
  apply(compiler) {
    compiler.hooks.compilation.tap('EvalDevToolModulePlugin', compilation => {
      compilation.hooks.renderModuleContent.tap(
        'EvalDevToolModulePlugin',
        (source, module) => {
          const content = source.source()
          const sourceUrl = `//# sourceURL=${module.resource}`
          
          return new RawSource(
            `eval(${JSON.stringify(content + '\n' + sourceUrl)});`
          )
        }
      )
    })
  }
}
```

### SourceMapDevToolPlugin

```typescript
class SourceMapDevToolPlugin {
  apply(compiler) {
    compiler.hooks.compilation.tap('SourceMapDevToolPlugin', compilation => {
      compilation.hooks.processAssets.tap(
        {
          name: 'SourceMapDevToolPlugin',
          stage: Compilation.PROCESS_ASSETS_STAGE_DEV_TOOLING
        },
        assets => {
          for (const filename in assets) {
            if (!this.test.test(filename)) continue
            
            const source = assets[filename]
            
            // 生成 SourceMap
            const map = source.map({
              columns: this.options.columns !== false
            })
            
            if (!map) continue
            
            // 处理 SourceMap
            const sourceMapFilename = `${filename}.map`
            const sourceMapContent = JSON.stringify(map)
            
            // 添加 SourceMap 资源
            assets[sourceMapFilename] = new RawSource(sourceMapContent)
            
            // 添加引用
            assets[filename] = new ConcatSource(
              source,
              `\n//# sourceMappingURL=${sourceMapFilename}`
            )
          }
        }
      )
    })
  }
}
```

## SourceMap 格式

```json
{
  "version": 3,
  "sources": ["webpack://myapp/./src/index.js"],
  "sourcesContent": ["console.log('hello')"],
  "names": ["console", "log"],
  "mappings": "AAAAA,OAAOC,IAAI,CAAC,OAAO",
  "file": "main.js"
}
```

### 字段说明

- `version`: SourceMap 版本（通常是 3）
- `sources`: 原始文件路径数组
- `sourcesContent`: 原始文件内容数组
- `names`: 变量/函数名数组
- `mappings`: Base64 VLQ 编码的映射
- `file`: 生成的文件名

## Mappings 编码

### Base64 VLQ

```typescript
function encodeVLQ(value) {
  let encoded = ''
  
  // 符号位
  if (value < 0) {
    value = (-value << 1) | 1
  } else {
    value = value << 1
  }
  
  // 编码
  do {
    let digit = value & 0x1f
    value >>>= 5
    
    if (value > 0) {
      digit |= 0x20
    }
    
    encoded += BASE64_CHARS[digit]
  } while (value > 0)
  
  return encoded
}
```

### Mappings 解析

每个映射包含 5 个值：
1. 生成列
2. 源文件索引
3. 源行
4. 源列
5. 名称索引（可选）

## Source Map Chain

Loader 链的 SourceMap 合并：

```typescript
function mergeSourceMaps(loaderSourceMaps) {
  const generator = new SourceMapGenerator()
  
  for (let i = loaderSourceMaps.length - 1; i >= 0; i--) {
    const map = loaderSourceMaps[i]
    const consumer = new SourceMapConsumer(map)
    
    consumer.eachMapping(mapping => {
      // 查找原始位置
      let original = mapping
      
      for (let j = i - 1; j >= 0; j--) {
        const prevConsumer = new SourceMapConsumer(loaderSourceMaps[j])
        original = prevConsumer.originalPositionFor({
          line: original.originalLine,
          column: original.originalColumn
        })
      }
      
      // 添加映射
      generator.addMapping({
        source: original.source,
        original: {
          line: original.line,
          column: original.column
        },
        generated: {
          line: mapping.generatedLine,
          column: mapping.generatedColumn
        },
        name: mapping.name
      })
    })
  }
  
  return generator.toJSON()
}
```

## 配置选项

### 文件名模板

```javascript
new SourceMapDevToolPlugin({
  filename: '[file].map[query]',
  publicPath: 'https://cdn.example.com/'
})
```

### 排除文件

```javascript
new SourceMapDevToolPlugin({
  test: /\.js$/,
  exclude: /vendor/
})
```

### 列信息

```javascript
new SourceMapDevToolPlugin({
  columns: false  // 禁用列映射
})
```

### Module 映射

```javascript
new SourceMapDevToolPlugin({
  module: true  // 包含 Loader SourceMap
})
```

## 生产环境配置

### Hidden SourceMap

```javascript
module.exports = {
  devtool: 'hidden-source-map'
}
```

生成 SourceMap 但不添加引用注释，可上传到错误监控平台。

### 外部 SourceMap

```javascript
new SourceMapDevToolPlugin({
  append: false,  // 不添加引用
  filename: '[file].map'
})
```

### 压缩后的 SourceMap

```javascript
optimization: {
  minimize: true,
  minimizer: [
    new TerserPlugin({
      sourceMap: true
    })
  ]
}
```

## 调试技巧

### Chrome DevTools

```javascript
// 添加 sourceURL
//# sourceURL=webpack://myapp/./src/index.js

// 添加 sourceMappingURL
//# sourceMappingURL=main.js.map
```

### VSCode 调试

```json
{
  "version": "0.2.0",
  "configurations": [{
    "type": "node",
    "request": "launch",
    "name": "Launch Program",
    "program": "${workspaceFolder}/dist/main.js",
    "outFiles": ["${workspaceFolder}/dist/**/*.js"],
    "sourceMaps": true
  }]
}
```

## 性能优化

### 开发环境

```javascript
devtool: 'eval-cheap-module-source-map'
```

最快的高质量选项。

### 生产环境

```javascript
devtool: 'source-map'
```

或 `hidden-source-map`。

## 总结

- devtool 控制 SourceMap 生成策略
- `source-map` 生成独立文件
- `eval` 使用 eval 包裹
- `inline` 内联到文件
- `hidden` 不添加引用
- `cheap` 不包含列信息
- Loader 链需要合并 SourceMap
- 生产环境推荐 `hidden-source-map`
