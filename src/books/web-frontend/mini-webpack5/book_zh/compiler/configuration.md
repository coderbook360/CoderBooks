---
sidebar_position: 19
title: "配置解析与标准化"
---

# 配置解析与标准化

Webpack 的配置系统灵活而复杂，支持多种格式和简写方式。本章深入分析配置解析与标准化的实现原理。

## 配置的多样性

用户可以用多种方式配置 Webpack：

```javascript
// 1. 最简配置
module.exports = {
  entry: './src/index.js'
}

// 2. 字符串简写
module.exports = './src/index.js'

// 3. 数组形式
module.exports = ['./src/a.js', './src/b.js']

// 4. 函数形式（动态配置）
module.exports = (env, argv) => ({
  entry: env.production ? './src/prod.js' : './src/dev.js'
})

// 5. Promise 形式（异步配置）
module.exports = async () => {
  const config = await loadConfig()
  return config
}

// 6. 多配置（数组）
module.exports = [
  { entry: './src/app.js', output: { filename: 'app.js' } },
  { entry: './src/admin.js', output: { filename: 'admin.js' } }
]
```

## 配置处理流程

```
用户配置
    ↓
┌─────────────────┐
│  配置加载       │ ← webpack.config.js / CLI / API
└─────────────────┘
    ↓
┌─────────────────┐
│  格式统一       │ ← 函数求值、Promise 解析、数组展开
└─────────────────┘
    ↓
┌─────────────────┐
│  Schema 验证    │ ← 类型检查、必填检查
└─────────────────┘
    ↓
┌─────────────────┐
│  默认值填充     │ ← 补全缺省配置
└─────────────────┘
    ↓
┌─────────────────┐
│  标准化处理     │ ← 简写展开、路径解析
└─────────────────┘
    ↓
标准化配置对象
```

## 配置加载

### 从 CLI 加载

```typescript
// webpack-cli 加载配置文件
async function loadConfigFile(configPath: string): Promise<WebpackOptions> {
  const ext = path.extname(configPath)
  
  // 支持多种格式
  if (ext === '.ts') {
    // TypeScript 配置
    require('ts-node/register')
  } else if (ext === '.mjs') {
    // ESM 配置
    const { default: config } = await import(configPath)
    return config
  }
  
  // CommonJS 配置
  const config = require(configPath)
  return config
}
```

### 处理函数和 Promise

```typescript
async function resolveConfig(
  config: WebpackOptionsNormalized | ConfigFunction | Promise<WebpackOptionsNormalized>,
  env: Record<string, string>,
  argv: Record<string, any>
): Promise<WebpackOptionsNormalized | WebpackOptionsNormalized[]> {
  // 处理函数形式
  if (typeof config === 'function') {
    config = config(env, argv)
  }
  
  // 处理 Promise
  if (config instanceof Promise) {
    config = await config
  }
  
  // 处理数组（多配置）
  if (Array.isArray(config)) {
    return Promise.all(config.map(c => resolveConfig(c, env, argv)))
  }
  
  return config
}
```

## Schema 验证

Webpack 使用 JSON Schema 验证配置：

```typescript
import Ajv from 'ajv'
import webpackOptionsSchema from '../schemas/WebpackOptions.json'

const ajv = new Ajv({
  strict: false,
  allErrors: true,
  verbose: true
})

function validateOptions(options: unknown): WebpackOptions {
  const validate = ajv.compile(webpackOptionsSchema)
  const valid = validate(options)
  
  if (!valid) {
    const errors = validate.errors!.map(error => {
      return `Configuration error: ${error.instancePath} ${error.message}`
    })
    throw new Error(errors.join('\n'))
  }
  
  return options as WebpackOptions
}
```

### Schema 示例

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "WebpackOptions",
  "type": "object",
  "properties": {
    "entry": {
      "oneOf": [
        { "type": "string" },
        { "type": "array", "items": { "type": "string" } },
        { "type": "object", "additionalProperties": { "type": "string" } }
      ]
    },
    "output": {
      "type": "object",
      "properties": {
        "path": { "type": "string" },
        "filename": { "type": "string" },
        "publicPath": { "type": "string" }
      }
    },
    "mode": {
      "enum": ["development", "production", "none"]
    }
  }
}
```

## 默认值填充

### 核心默认值逻辑

```typescript
function applyWebpackOptionsDefaults(options: WebpackOptions): void {
  // 1. mode 默认值
  options.mode = options.mode || 'production'
  
  // 2. context 默认值
  options.context = options.context || process.cwd()
  
  // 3. entry 默认值
  if (!options.entry) {
    options.entry = { main: './src/index.js' }
  }
  
  // 4. output 默认值
  applyOutputDefaults(options.output, options)
  
  // 5. module 默认值
  applyModuleDefaults(options.module)
  
  // 6. resolve 默认值
  applyResolveDefaults(options.resolve)
  
  // 7. 根据 mode 调整默认值
  applyModeDefaults(options)
}

function applyOutputDefaults(
  output: WebpackOptions['output'],
  options: WebpackOptions
): void {
  output = output || {}
  
  // 输出路径
  output.path = output.path || path.resolve(options.context!, 'dist')
  
  // 文件名
  output.filename = output.filename || '[name].js'
  
  // Chunk 文件名
  output.chunkFilename = output.chunkFilename || '[name].js'
  
  // 公共路径
  output.publicPath = output.publicPath || 'auto'
  
  // 模块类型
  output.module = output.module ?? false
  
  // 全局对象
  output.globalObject = output.globalObject || 'self'
}
```

### Mode 相关默认值

```typescript
function applyModeDefaults(options: WebpackOptions): void {
  const { mode } = options
  
  if (mode === 'development') {
    // 开发模式默认值
    options.devtool = options.devtool ?? 'eval'
    options.cache = options.cache ?? { type: 'memory' }
    options.optimization = options.optimization || {}
    options.optimization.minimize = options.optimization.minimize ?? false
    
    // 更友好的模块命名
    options.optimization.moduleIds = options.optimization.moduleIds ?? 'named'
    options.optimization.chunkIds = options.optimization.chunkIds ?? 'named'
  }
  
  if (mode === 'production') {
    // 生产模式默认值
    options.devtool = options.devtool ?? false
    options.cache = options.cache ?? { type: 'filesystem' }
    options.optimization = options.optimization || {}
    options.optimization.minimize = options.optimization.minimize ?? true
    
    // 更小的模块 ID
    options.optimization.moduleIds = options.optimization.moduleIds ?? 'deterministic'
    options.optimization.chunkIds = options.optimization.chunkIds ?? 'deterministic'
  }
}
```

## 配置标准化

### Entry 标准化

```typescript
// 用户可能的输入
entry: './src/index.js'
entry: ['./src/a.js', './src/b.js']
entry: { main: './src/index.js', vendor: './src/vendor.js' }
entry: () => './src/index.js'
entry: () => Promise.resolve('./src/index.js')

// 标准化为统一格式
interface NormalizedEntry {
  [name: string]: {
    import: string[]
    filename?: string
    dependOn?: string[]
    library?: LibraryOptions
    runtime?: string | false
  }
}

function normalizeEntry(entry: EntryOption): NormalizedEntry {
  // 字符串 -> 对象
  if (typeof entry === 'string') {
    return { main: { import: [entry] } }
  }
  
  // 数组 -> 对象
  if (Array.isArray(entry)) {
    return { main: { import: entry } }
  }
  
  // 对象 -> 标准化
  const result: NormalizedEntry = {}
  for (const [name, value] of Object.entries(entry)) {
    if (typeof value === 'string') {
      result[name] = { import: [value] }
    } else if (Array.isArray(value)) {
      result[name] = { import: value }
    } else {
      result[name] = {
        import: Array.isArray(value.import) ? value.import : [value.import],
        ...value
      }
    }
  }
  return result
}
```

### Output 标准化

```typescript
function normalizeOutput(output: OutputOptions): NormalizedOutputOptions {
  return {
    path: path.resolve(output.path || 'dist'),
    filename: output.filename || '[name].js',
    chunkFilename: output.chunkFilename || '[id].js',
    assetModuleFilename: output.assetModuleFilename || '[hash][ext][query]',
    publicPath: output.publicPath || 'auto',
    library: normalizeLibrary(output.library),
    globalObject: output.globalObject || 'self',
    // ...
  }
}

function normalizeLibrary(library: LibraryOptions | undefined): NormalizedLibrary {
  if (!library) return undefined
  
  if (typeof library === 'string') {
    return { name: library, type: 'var' }
  }
  
  return {
    name: library.name,
    type: library.type || 'var',
    export: library.export,
    umdNamedDefine: library.umdNamedDefine
  }
}
```

### Module Rules 标准化

```typescript
// 用户配置
module: {
  rules: [
    { test: /\.css$/, use: 'css-loader' },
    { test: /\.ts$/, use: ['ts-loader'], exclude: /node_modules/ }
  ]
}

// 标准化格式
interface NormalizedRule {
  test?: RegExp | ((path: string) => boolean)
  include?: Condition
  exclude?: Condition
  use: NormalizedUseItem[]
  type?: string
  parser?: ParserOptions
  generator?: GeneratorOptions
}

function normalizeRules(rules: RuleSetRule[]): NormalizedRule[] {
  return rules.map(rule => normalizeRule(rule))
}

function normalizeRule(rule: RuleSetRule): NormalizedRule {
  const normalized: NormalizedRule = {
    test: rule.test,
    include: rule.include,
    exclude: rule.exclude,
    use: normalizeUse(rule.use || rule.loader),
    type: rule.type,
    parser: rule.parser,
    generator: rule.generator
  }
  
  return normalized
}

function normalizeUse(use: UseOption): NormalizedUseItem[] {
  if (!use) return []
  
  // 字符串 -> 数组
  if (typeof use === 'string') {
    return [{ loader: use, options: {} }]
  }
  
  // 对象 -> 数组
  if (!Array.isArray(use)) {
    return [{ loader: use.loader!, options: use.options || {} }]
  }
  
  // 数组标准化
  return use.map(item => {
    if (typeof item === 'string') {
      return { loader: item, options: {} }
    }
    return { loader: item.loader!, options: item.options || {} }
  })
}
```

## Mini-Webpack 配置处理

```typescript
// src/config/normalize.ts

interface MiniWebpackOptions {
  context?: string
  entry: string | string[] | Record<string, string>
  output?: {
    path?: string
    filename?: string
  }
  module?: {
    rules?: RuleSetRule[]
  }
  resolve?: {
    extensions?: string[]
    alias?: Record<string, string>
  }
  plugins?: Plugin[]
  mode?: 'development' | 'production' | 'none'
}

interface NormalizedOptions {
  context: string
  entry: Record<string, { import: string[] }>
  output: {
    path: string
    filename: string
  }
  module: {
    rules: NormalizedRule[]
  }
  resolve: {
    extensions: string[]
    alias: Record<string, string>
  }
  plugins: Plugin[]
  mode: 'development' | 'production' | 'none'
}

export function normalizeOptions(
  options: MiniWebpackOptions
): NormalizedOptions {
  const context = options.context || process.cwd()
  const mode = options.mode || 'production'
  
  return {
    context,
    mode,
    entry: normalizeEntry(options.entry),
    output: {
      path: options.output?.path 
        ? path.resolve(context, options.output.path)
        : path.resolve(context, 'dist'),
      filename: options.output?.filename || '[name].js'
    },
    module: {
      rules: normalizeRules(options.module?.rules || [])
    },
    resolve: {
      extensions: options.resolve?.extensions || ['.js', '.json'],
      alias: options.resolve?.alias || {}
    },
    plugins: options.plugins || []
  }
}

function normalizeEntry(
  entry: string | string[] | Record<string, string>
): Record<string, { import: string[] }> {
  if (typeof entry === 'string') {
    return { main: { import: [entry] } }
  }
  
  if (Array.isArray(entry)) {
    return { main: { import: entry } }
  }
  
  const result: Record<string, { import: string[] }> = {}
  for (const [name, value] of Object.entries(entry)) {
    result[name] = { import: [value] }
  }
  return result
}
```

## 配置合并

多配置场景需要合并能力：

```typescript
// webpack-merge 简化实现
function merge<T extends object>(...configs: Partial<T>[]): T {
  return configs.reduce((result, config) => {
    for (const [key, value] of Object.entries(config)) {
      const existing = result[key as keyof T]
      
      if (Array.isArray(existing) && Array.isArray(value)) {
        // 数组合并
        (result as any)[key] = [...existing, ...value]
      } else if (isObject(existing) && isObject(value)) {
        // 对象递归合并
        (result as any)[key] = merge(existing, value)
      } else {
        // 直接覆盖
        (result as any)[key] = value
      }
    }
    return result
  }, {} as T)
}

// 使用示例
const baseConfig = {
  entry: './src/index.js',
  output: { path: 'dist' }
}

const devConfig = merge(baseConfig, {
  mode: 'development',
  devtool: 'source-map'
})
```

## 本章小结

- 配置支持**多种格式**：字符串、数组、对象、函数、Promise
- 配置处理流程：加载 → 验证 → 默认值 → 标准化
- **Schema 验证**确保配置正确性
- **标准化**将多种格式统一为内部格式
- mode 影响很多**默认值**的选择

下一章我们学习 Compiler Hooks 体系。
