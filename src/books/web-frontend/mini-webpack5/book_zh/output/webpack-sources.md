# webpack-sources 库解析

webpack-sources 是 Webpack 用于处理源码的核心库，提供了多种 Source 类型。

## 核心 Source 类型

### RawSource

原始源码：

```typescript
import { RawSource } from 'webpack-sources'

const source = new RawSource('console.log("hello")')

console.log(source.source())  // 'console.log("hello")'
console.log(source.size())    // 22
console.log(source.buffer())  // <Buffer ...>
```

### ReplaceSource

替换源码：

```typescript
import { ReplaceSource, RawSource } from 'webpack-sources'

const original = new RawSource('console.log("hello")')
const replace = new ReplaceSource(original)

// 替换指定范围
replace.replace(0, 7, 'alert')

console.log(replace.source())  // 'alert("hello")'
```

### ConcatSource

合并源码：

```typescript
import { ConcatSource, RawSource } from 'webpack-sources'

const source = new ConcatSource(
  new RawSource('"use strict";\n'),
  new RawSource('console.log("hello");\n'),
  new RawSource('console.log("world");')
)

console.log(source.source())
// "use strict";
// console.log("hello");
// console.log("world");
```

### SourceMapSource

带 SourceMap 的源码：

```typescript
import { SourceMapSource } from 'webpack-sources'

const source = new SourceMapSource(
  'console.log("hello")',      // 代码
  'input.js',                  // 文件名
  sourceMapObject              // SourceMap 对象
)

console.log(source.source())  // 代码
console.log(source.map())     // SourceMap
```

### OriginalSource

原始源文件：

```typescript
import { OriginalSource } from 'webpack-sources'

const source = new OriginalSource(
  'console.log("hello")',
  'input.js'
)

// 自动生成 SourceMap
const map = source.map()
```

### PrefixSource

添加前缀：

```typescript
import { PrefixSource, RawSource } from 'webpack-sources'

const source = new PrefixSource(
  '// Comment\n',
  new RawSource('console.log("hello")')
)

console.log(source.source())
// // Comment
// console.log("hello")
```

### CachedSource

缓存源码：

```typescript
import { CachedSource } from 'webpack-sources'

const cached = new CachedSource(expensiveSource)

// 第一次调用会执行
const content1 = cached.source()

// 后续调用使用缓存
const content2 = cached.source()  // 从缓存读取
```

## Source 接口

```typescript
interface Source {
  /**
   * 获取源码字符串
   */
  source(): string | Buffer
  
  /**
   * 获取源码大小
   */
  size(): number
  
  /**
   * 获取 Buffer
   */
  buffer(): Buffer
  
  /**
   * 获取 SourceMap
   */
  map(options?: MapOptions): Object
  
  /**
   * 获取源和 SourceMap
   */
  sourceAndMap(options?: MapOptions): {
    source: string | Buffer
    map: Object
  }
  
  /**
   * 更新 Hash
   */
  updateHash(hash: Hash): void
}
```

## 实战应用

### 代码生成

```typescript
class JavascriptGenerator {
  generate(module, context) {
    const source = new ReplaceSource(
      module.originalSource()
    )
    
    // 处理依赖
    for (const dependency of module.dependencies) {
      const template = this.getDependencyTemplate(dependency)
      template.apply(dependency, source, context)
    }
    
    return source
  }
}
```

### 模块包装

```typescript
function wrapModule(moduleSource, moduleId) {
  return new ConcatSource(
    `"${moduleId}": function(module, exports, __webpack_require__) {\n`,
    moduleSource,
    '\n}'
  )
}
```

### 添加 Banner

```typescript
class BannerPlugin {
  apply(compiler) {
    compiler.hooks.compilation.tap('BannerPlugin', compilation => {
      compilation.hooks.processAssets.tap('BannerPlugin', assets => {
        for (const filename in assets) {
          assets[filename] = new ConcatSource(
            `/*! ${this.options.banner} */\n`,
            assets[filename]
          )
        }
      })
    })
  }
}
```

### 代码替换

```typescript
compilation.hooks.processAssets.tap('ReplacePlugin', assets => {
  for (const filename in assets) {
    const source = assets[filename]
    const replace = new ReplaceSource(source)
    
    // 查找并替换
    const content = source.source().toString()
    const matches = content.matchAll(/OLD_VALUE/g)
    
    for (const match of matches) {
      replace.replace(
        match.index,
        match.index + match[0].length - 1,
        'NEW_VALUE'
      )
    }
    
    assets[filename] = replace
  }
})
```

## SourceMap 处理

### 生成 SourceMap

```typescript
const source = new SourceMapSource(
  generatedCode,
  originalFile,
  {
    version: 3,
    sources: [originalFile],
    sourcesContent: [originalContent],
    mappings: '...',
    names: []
  }
)
```

### 合并 SourceMap

```typescript
function concatWithMap(sources) {
  const concat = new ConcatSource()
  
  for (const source of sources) {
    if (source instanceof SourceMapSource) {
      concat.add(source)
    } else {
      concat.add(new OriginalSource(source.source(), 'unknown'))
    }
  }
  
  return concat
}
```

## 性能优化

### 使用 CachedSource

```typescript
class Module {
  codeGeneration(context) {
    if (this._cachedSource) {
      return this._cachedSource
    }
    
    const source = this.generator.generate(this, context)
    
    this._cachedSource = new CachedSource(source)
    
    return this._cachedSource
  }
}
```

### 延迟生成

```typescript
class LazySource extends Source {
  constructor(generateFn) {
    super()
    this._generate = generateFn
    this._source = null
  }
  
  source() {
    if (!this._source) {
      this._source = this._generate()
    }
    return this._source
  }
}
```

## 总结

- webpack-sources 提供多种 Source 类型
- RawSource 用于原始源码
- ReplaceSource 用于替换
- ConcatSource 用于合并
- SourceMapSource 处理 SourceMap
- CachedSource 提供缓存优化
- Source 是 Webpack 源码处理的核心抽象
