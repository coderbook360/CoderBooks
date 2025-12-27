# 文件名模板与占位符

Webpack 支持灵活的文件名模板，通过占位符动态生成文件名。

## 基本占位符

### [name]

Chunk 名称：

```javascript
output: {
  filename: '[name].js'
}

// entry: { main: './src/index.js' }
// 输出: main.js
```

### [id]

Chunk ID：

```javascript
output: {
  filename: '[id].js'
}

// 输出: 0.js, 1.js, 2.js
```

### [fullhash]

构建 hash：

```javascript
output: {
  filename: '[name].[fullhash].js'
}

// 输出: main.abc123def456.js
```

### [chunkhash]

Chunk hash：

```javascript
output: {
  filename: '[name].[chunkhash].js'
}

// 输出: main.abc123.js
```

### [contenthash]

内容 hash：

```javascript
output: {
  filename: '[name].[contenthash].js'
}

// 输出: main.a1b2c3.js
```

### [ext]

文件扩展名：

```javascript
assetModuleFilename: '[name].[hash][ext]'

// 输出: logo.abc123.png
```

### [query]

查询字符串：

```javascript
assetModuleFilename: '[name][ext][query]'

// import './image.png?size=200'
// 输出: image.png?size=200
```

### [file]

文件路径和名称：

```javascript
// 内部使用
```

## Hash 长度

```javascript
output: {
  filename: '[name].[contenthash:8].js'
}

// 输出: main.a1b2c3d4.js (8位)
```

## 模板实现

```typescript
class TemplatedPathPlugin {
  apply(compiler) {
    compiler.hooks.compilation.tap('TemplatedPathPlugin', compilation => {
      compilation.hooks.assetPath.tap('TemplatedPathPlugin', (path, data, assetInfo) => {
        return this.replacePathVariables(path, data, assetInfo)
      })
    })
  }
  
  replacePathVariables(path, data, assetInfo) {
    const { chunk, filename, contenthash, chunkhash, fullhash } = data
    
    // [name]
    path = path.replace(/\[name\]/g, () => {
      return chunk?.name || chunk?.id || filename || ''
    })
    
    // [id]
    path = path.replace(/\[id\]/g, () => {
      return chunk?.id || ''
    })
    
    // [contenthash]
    path = path.replace(/\[contenthash(?::(\d+))?\]/g, (match, length) => {
      const hash = contenthash || ''
      return length ? hash.slice(0, parseInt(length)) : hash
    })
    
    // [chunkhash]
    path = path.replace(/\[chunkhash(?::(\d+))?\]/g, (match, length) => {
      const hash = chunkhash || chunk?.renderedHash || ''
      return length ? hash.slice(0, parseInt(length)) : hash
    })
    
    // [fullhash]
    path = path.replace(/\[fullhash(?::(\d+))?\]/g, (match, length) => {
      const hash = fullhash || compilation.hash || ''
      return length ? hash.slice(0, parseInt(length)) : hash
    })
    
    // [ext]
    path = path.replace(/\[ext\]/g, () => {
      const ext = /\.[^.]+$/.exec(filename || '')
      return ext ? ext[0] : ''
    })
    
    // [query]
    path = path.replace(/\[query\]/g, () => {
      const query = /\?.*$/.exec(filename || '')
      return query ? query[0] : ''
    })
    
    return path
  }
}
```

## 配置示例

### 基本配置

```javascript
module.exports = {
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].[contenthash:8].js',
    chunkFilename: '[name].[chunkhash:8].chunk.js',
    assetModuleFilename: 'assets/[name].[hash:8][ext]'
  }
}
```

### 分离资源

```javascript
module.exports = {
  output: {
    filename: 'js/[name].[contenthash:8].js',
    chunkFilename: 'js/[name].[chunkhash:8].chunk.js',
    assetModuleFilename: (pathData) => {
      const type = pathData.filename.split('.').pop()
      return `${type}/[name].[hash:8][ext]`
    }
  }
}
```

### 开发/生产环境

```javascript
module.exports = (env, argv) => ({
  output: {
    filename: argv.mode === 'production'
      ? '[name].[contenthash:8].js'
      : '[name].js',
    chunkFilename: argv.mode === 'production'
      ? '[name].[chunkhash:8].chunk.js'
      : '[name].chunk.js'
  }
})
```

## 自定义占位符

```typescript
class CustomHashPlugin {
  apply(compiler) {
    compiler.hooks.compilation.tap('CustomHashPlugin', compilation => {
      compilation.hooks.assetPath.tap('CustomHashPlugin', (path, data) => {
        // 自定义占位符 [timestamp]
        path = path.replace(/\[timestamp\]/g, () => {
          return Date.now().toString()
        })
        
        // 自定义占位符 [version]
        path = path.replace(/\[version\]/g, () => {
          return require('./package.json').version
        })
        
        return path
      })
    })
  }
}
```

使用：

```javascript
output: {
  filename: '[name].[version].[timestamp].js'
}
```

## 函数模板

```javascript
output: {
  filename: (pathData) => {
    // pathData: { chunk, filename, contenthash, ... }
    if (pathData.chunk.name === 'main') {
      return 'bundle.js'
    }
    return '[name].[contenthash:8].js'
  },
  
  assetModuleFilename: (pathData) => {
    const ext = path.extname(pathData.filename)
    if (['.png', '.jpg', '.jpeg', '.gif'].includes(ext)) {
      return 'images/[name].[hash:8][ext]'
    }
    return 'assets/[name].[hash:8][ext]'
  }
}
```

## 路径规范化

```typescript
function normalizePath(path) {
  // 替换反斜杠为正斜杠
  path = path.replace(/\\/g, '/')
  
  // 移除重复的斜杠
  path = path.replace(/\/+/g, '/')
  
  // 移除开头的斜杠
  path = path.replace(/^\//, '')
  
  return path
}
```

## 实战技巧

### 长期缓存

```javascript
output: {
  filename: '[name].[contenthash:8].js',
  chunkFilename: '[name].[contenthash:8].chunk.js'
}

optimization: {
  runtimeChunk: 'single',
  moduleIds: 'deterministic'
}
```

### CDN 部署

```javascript
output: {
  publicPath: 'https://cdn.example.com/',
  filename: 'js/[name].[contenthash:8].js',
  assetModuleFilename: 'assets/[hash:8][ext]'
}
```

### 子目录组织

```javascript
output: {
  filename: (pathData) => {
    const { chunk } = pathData
    if (chunk.name?.startsWith('vendor')) {
      return 'vendors/[name].[contenthash:8].js'
    }
    return 'app/[name].[contenthash:8].js'
  }
}
```

## 总结

- 占位符提供灵活的文件命名
- `[name]` 使用 Chunk 名称
- `[contenthash]` 基于内容生成 hash
- 支持 hash 长度控制
- 可使用函数动态生成文件名
- 支持自定义占位符
- 适合长期缓存和 CDN 部署
