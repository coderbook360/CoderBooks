# emitAssets 资源写入

emitAssets 方法将内存中的资源写入磁盘文件系统。

## 实现

```typescript
class Compiler {
  emitAssets(compilation, callback) {
    const outputPath = compilation.outputOptions.path
    
    // 清理输出目录（如果配置）
    if (compilation.outputOptions.clean) {
      this.outputFileSystem.rm(outputPath, { recursive: true }, () => {
        this.writeAssets(compilation, outputPath, callback)
      })
    } else {
      this.writeAssets(compilation, outputPath, callback)
    }
  }
  
  writeAssets(compilation, outputPath, callback) {
    const { assets, assetsInfo } = compilation
    
    asyncLib.forEach(
      Object.keys(assets),
      (filename, callback) => {
        const targetPath = path.join(outputPath, filename)
        const source = assets[filename]
        const content = source.buffer()
        
        // 创建目录
        const dir = path.dirname(targetPath)
        this.outputFileSystem.mkdirp(dir, err => {
          if (err) return callback(err)
          
          // 写入文件
          this.outputFileSystem.writeFile(targetPath, content, callback)
        })
      },
      callback
    )
  }
}
```

## Source Buffer

获取 Source 的二进制内容：

```typescript
class Source {
  source() {
    // 返回字符串
    return this._source
  }
  
  buffer() {
    // 返回 Buffer
    return Buffer.from(this.source(), 'utf-8')
  }
}
```

## 输出文件系统

```typescript
class Compiler {
  constructor() {
    // 默认使用 Node.js fs
    this.outputFileSystem = require('fs')
    
    // 也可以使用内存文件系统
    // this.outputFileSystem = new MemoryFileSystem()
  }
}
```

## emit 钩子

输出前处理：

```typescript
compiler.hooks.emit.tapAsync('MyPlugin', (compilation, callback) => {
  // 修改资源
  compilation.assets['extra-file.txt'] = new RawSource('Extra content')
  
  // 删除资源
  delete compilation.assets['unwanted-file.js']
  
  callback()
})
```

## afterEmit 钩子

输出后处理：

```typescript
compiler.hooks.afterEmit.tapAsync('MyPlugin', (compilation, callback) => {
  // 输出完成后的操作
  console.log('Assets written to disk')
  
  callback()
})
```

## 增量输出

只写入变化的文件：

```typescript
class Compiler {
  emitAssets(compilation, callback) {
    const { assets } = compilation
    const { recordsPath } = this.options
    
    // 加载上次的资源记录
    const previousAssets = this.records?.assets || {}
    
    const assetsToWrite = Object.keys(assets).filter(filename => {
      const source = assets[filename]
      const previousSource = previousAssets[filename]
      
      // 比较内容
      if (!previousSource) return true
      if (source.source() !== previousSource.source()) return true
      
      return false
    })
    
    // 只写入变化的资源
    asyncLib.forEach(assetsToWrite, (filename, callback) => {
      this.writeAsset(filename, assets[filename], callback)
    }, callback)
    
    // 更新记录
    this.records.assets = assets
  }
}
```

## 输出统计

```typescript
class Compiler {
  emitAssets(compilation, callback) {
    const startTime = Date.now()
    let filesWritten = 0
    let totalSize = 0
    
    asyncLib.forEach(
      Object.keys(compilation.assets),
      (filename, callback) => {
        const source = compilation.assets[filename]
        const size = source.size()
        
        this.writeAsset(filename, source, err => {
          if (!err) {
            filesWritten++
            totalSize += size
          }
          callback(err)
        })
      },
      err => {
        if (!err) {
          const duration = Date.now() - startTime
          console.log(`Written ${filesWritten} files (${totalSize} bytes) in ${duration}ms`)
        }
        callback(err)
      }
    )
  }
}
```

## 自定义输出文件系统

### 内存文件系统

```typescript
import { createFsFromVolume, Volume } from 'memfs'

const compiler = webpack(config)
compiler.outputFileSystem = createFsFromVolume(new Volume())

compiler.run((err, stats) => {
  // 从内存读取输出
  const content = compiler.outputFileSystem.readFileSync('/dist/main.js', 'utf-8')
})
```

### 自定义文件系统

```typescript
class CustomFileSystem {
  mkdirp(path, callback) {
    // 自定义实现
  }
  
  writeFile(path, content, callback) {
    // 自定义实现
  }
  
  readFile(path, callback) {
    // 自定义实现
  }
}

compiler.outputFileSystem = new CustomFileSystem()
```

## 输出路径处理

```typescript
class Compilation {
  getPath(filename, data) {
    // 规范化路径
    filename = filename.replace(/\\/g, '/')
    
    // 替换占位符
    return this.mainTemplate.getAssetPath(filename, data)
  }
}

class MainTemplate {
  getAssetPath(filename, data) {
    return filename
      .replace('[name]', data.chunk?.name || data.filename || '')
      .replace('[id]', data.chunk?.id || '')
      .replace('[contenthash]', data.contenthash || '')
      .replace('[ext]', data.ext || '')
      .replace('[query]', data.query || '')
  }
}
```

## Watch 模式输出

```typescript
class Compiler {
  watch(watchOptions, handler) {
    const watching = new Watching(this, watchOptions, handler)
    
    watching.on('change', (filePath) => {
      console.log(`File changed: ${filePath}`)
    })
    
    return watching
  }
}

class Watching {
  invalidate() {
    // 触发重新编译
    this.compiler.compile(compilation => {
      this.compiler.emitAssets(compilation, () => {
        // 输出完成
      })
    })
  }
}
```

## 总结

- emitAssets 将资源写入磁盘
- 支持自定义输出文件系统
- emit 钩子可修改输出资源
- 支持增量输出优化
- Watch 模式自动重新输出
- 提供输出统计和日志
