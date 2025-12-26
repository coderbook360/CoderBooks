---
sidebar_position: 49
title: "Generator 选择与创建"
---

# Generator 选择与创建

Generator（生成器）负责将模块转换为最终的输出代码。本章实现 Generator 的选择和创建机制，理解模块如何生成可执行的运行时代码。

## Generator 的职责

```
Module + Dependencies → Generator → 输出代码 + SourceMap
```

Generator 需要：

1. **生成代码**：将模块内容转换为目标格式
2. **处理依赖**：将依赖语句替换为运行时调用
3. **生成 SourceMap**：保持源码映射
4. **声明运行时需求**：告知需要哪些运行时辅助函数

## Generator 接口

```typescript
export interface Generator {
  /**
   * 生成代码
   */
  generate(
    module: Module,
    context: GenerateContext
  ): Source;
  
  /**
   * 获取生成代码的大小
   */
  getSize(module: Module, type: string): number;
  
  /**
   * 获取并发标识（用于确定是否可以并行生成）
   */
  getConcatenationBailoutReason?(
    module: Module,
    context: ConcatenationContext
  ): string | undefined;
}

export interface GenerateContext {
  // 运行时模板
  runtimeTemplate: RuntimeTemplate;
  
  // 模块图
  moduleGraph: ModuleGraph;
  
  // Chunk 图
  chunkGraph: ChunkGraph;
  
  // 运行时需求
  runtimeRequirements: Set<string>;
  
  // 依赖模板
  dependencyTemplates: Map<Function, DependencyTemplate>;
  
  // 代码生成结果
  type: string;
  
  // 数据
  getData(): Map<string, any>;
}
```

## 模块类型与 Generator

| 模块类型 | Generator | 输出 |
|---------|-----------|------|
| javascript/auto | JavascriptGenerator | JavaScript 代码 |
| javascript/esm | JavascriptGenerator | ESM 代码 |
| json | JsonGenerator | JSON 导出 |
| asset | AssetGenerator | 资源路径/内联数据 |
| asset/source | AssetSourceGenerator | 源码字符串 |
| asset/resource | AssetResourceGenerator | 文件路径 |
| asset/inline | AssetInlineGenerator | Base64 数据 |
| webassembly | WebAssemblyGenerator | WASM 代码 |

## NormalModuleFactory 中的 Generator 选择

```typescript
export class NormalModuleFactory {
  // Generator 缓存
  private generatorCache = new Map<string, Generator>();
  
  /**
   * 获取或创建 Generator
   */
  getGenerator(type: string, generatorOptions: GeneratorOptions = {}): Generator {
    // 生成缓存键
    const cacheKey = `${type}|${JSON.stringify(generatorOptions)}`;
    
    // 检查缓存
    let generator = this.generatorCache.get(cacheKey);
    if (generator) {
      return generator;
    }
    
    // 调用 createGenerator 钩子
    generator = this.hooks.createGenerator.for(type).call(generatorOptions);
    
    if (!generator) {
      throw new Error(`No generator registered for module type: ${type}`);
    }
    
    // 调用 generator 钩子进行配置
    this.hooks.generator.for(type).call(generator, generatorOptions);
    
    // 缓存
    this.generatorCache.set(cacheKey, generator);
    
    return generator;
  }
}
```

## JavascriptModulesPlugin 注册 Generator

```typescript
export class JavascriptModulesPlugin {
  apply(compiler: Compiler): void {
    compiler.hooks.compile.tap('JavascriptModulesPlugin', (params) => {
      const normalModuleFactory = params.normalModuleFactory;
      
      // 注册 JavaScript Generator
      const types = [
        'javascript/auto',
        'javascript/dynamic',
        'javascript/esm',
      ];
      
      for (const type of types) {
        normalModuleFactory.hooks.createGenerator
          .for(type)
          .tap('JavascriptModulesPlugin', (generatorOptions) => {
            return new JavascriptGenerator(generatorOptions);
          });
      }
    });
  }
}
```

## JavascriptGenerator 实现

```typescript
import { ConcatSource, ReplaceSource } from 'webpack-sources';

export class JavascriptGenerator implements Generator {
  private options: GeneratorOptions;
  
  constructor(options: GeneratorOptions = {}) {
    this.options = options;
  }
  
  /**
   * 生成模块代码
   */
  generate(module: NormalModule, context: GenerateContext): Source {
    const { runtimeTemplate, moduleGraph, chunkGraph, dependencyTemplates } = context;
    const runtimeRequirements = context.runtimeRequirements;
    
    // 获取原始源码
    const originalSource = module.originalSource();
    if (!originalSource) {
      return new RawSource('throw new Error("No source available")');
    }
    
    // 创建可替换源
    const source = new ReplaceSource(originalSource);
    
    // 初始化代码（变量声明等）
    const initFragments: InitFragment[] = [];
    
    // 遍历依赖，生成代码替换
    for (const dependency of module.dependencies) {
      const template = dependencyTemplates.get(dependency.constructor);
      
      if (template) {
        template.apply(dependency, source, {
          runtimeTemplate,
          moduleGraph,
          chunkGraph,
          module,
          initFragments,
          runtimeRequirements,
          dependencyTemplates,
          runtime: context.runtime,
        });
      }
    }
    
    // 应用初始化片段
    return this.applyInitFragments(initFragments, source, context);
  }
  
  /**
   * 应用初始化片段
   */
  private applyInitFragments(
    fragments: InitFragment[],
    source: Source,
    context: GenerateContext
  ): Source {
    if (fragments.length === 0) {
      return source;
    }
    
    // 排序初始化片段
    fragments.sort((a, b) => a.stage - b.stage);
    
    // 合并同类片段
    const mergedFragments = this.mergeFragments(fragments);
    
    // 生成初始化代码
    const concatSource = new ConcatSource();
    
    for (const fragment of mergedFragments) {
      concatSource.add(fragment.getContent(context));
      concatSource.add('\n');
    }
    
    concatSource.add(source);
    
    return concatSource;
  }
  
  /**
   * 获取模块大小
   */
  getSize(module: NormalModule, type: string): number {
    const source = module.originalSource();
    if (!source) return 0;
    return source.size();
  }
}
```

## DependencyTemplate

每种依赖都有对应的模板来生成代码：

```typescript
export interface DependencyTemplate {
  apply(
    dependency: Dependency,
    source: ReplaceSource,
    context: DependencyTemplateContext
  ): void;
}

export interface DependencyTemplateContext {
  runtimeTemplate: RuntimeTemplate;
  moduleGraph: ModuleGraph;
  chunkGraph: ChunkGraph;
  module: Module;
  initFragments: InitFragment[];
  runtimeRequirements: Set<string>;
  dependencyTemplates: Map<Function, DependencyTemplate>;
  runtime: string | undefined;
}
```

### HarmonyImportDependencyTemplate

```typescript
export class HarmonyImportDependencyTemplate implements DependencyTemplate {
  apply(
    dependency: HarmonyImportDependency,
    source: ReplaceSource,
    context: DependencyTemplateContext
  ): void {
    const { runtimeTemplate, moduleGraph, chunkGraph, initFragments, runtimeRequirements } = context;
    
    // 获取被引用的模块
    const refModule = moduleGraph.getModule(dependency);
    if (!refModule) return;
    
    // 获取模块 ID
    const moduleId = chunkGraph.getModuleId(refModule);
    
    // 添加运行时需求
    runtimeRequirements.add(RuntimeGlobals.require);
    
    // 生成 require 调用
    const requireCall = runtimeTemplate.moduleRaw({
      module: refModule,
      chunkGraph,
      request: dependency.request,
      runtimeRequirements,
    });
    
    // 添加初始化片段
    initFragments.push(
      new InitFragment(
        `var ${dependency.name} = ${requireCall};\n`,
        InitFragment.STAGE_HARMONY_IMPORTS,
        dependency.sourceOrder
      )
    );
    
    // 移除原始 import 语句
    source.replace(
      dependency.range[0],
      dependency.range[1] - 1,
      ''
    );
  }
}
```

## JsonGenerator 实现

```typescript
export class JsonGenerator implements Generator {
  generate(module: NormalModule, context: GenerateContext): Source {
    const { runtimeRequirements } = context;
    
    // 获取 JSON 数据
    const data = module.buildInfo.jsonData;
    
    // 添加运行时需求
    runtimeRequirements.add(RuntimeGlobals.module);
    
    // 生成代码
    const json = JSON.stringify(data);
    
    // 导出 JSON 数据
    const code = `module.exports = ${json};`;
    
    return new RawSource(code);
  }
  
  getSize(module: NormalModule): number {
    const data = module.buildInfo.jsonData;
    return data ? JSON.stringify(data).length + 20 : 0;
  }
}
```

## AssetGenerator 实现

```typescript
export class AssetGenerator implements Generator {
  private dataUrlOptions: DataUrlOptions;
  private filename: string | ((pathData: any) => string);
  private publicPath: string | ((pathData: any) => string);
  
  constructor(options: AssetGeneratorOptions) {
    this.dataUrlOptions = options.dataUrl || {};
    this.filename = options.filename || '[hash][ext]';
    this.publicPath = options.publicPath || '';
  }
  
  generate(module: NormalModule, context: GenerateContext): Source {
    const { runtimeRequirements, chunkGraph } = context;
    
    const content = module.buildInfo.content;
    const isInline = module.buildInfo.dataUrl;
    
    if (isInline) {
      // 内联模式：生成 data URL
      return this.generateInline(module, content, context);
    } else {
      // 文件模式：生成文件路径
      return this.generateFile(module, content, context);
    }
  }
  
  private generateInline(
    module: NormalModule,
    content: Buffer | string,
    context: GenerateContext
  ): Source {
    const { runtimeRequirements } = context;
    
    // 确定 MIME 类型
    const mimeType = this.getMimeType(module.resource);
    
    // 编码
    let encodedContent: string;
    let encoding: string;
    
    if (this.dataUrlOptions.encoding === 'base64') {
      encodedContent = Buffer.from(content).toString('base64');
      encoding = 'base64';
    } else {
      encodedContent = encodeURIComponent(content.toString());
      encoding = '';
    }
    
    const dataUrl = `data:${mimeType}${encoding ? `;${encoding}` : ''},${encodedContent}`;
    
    runtimeRequirements.add(RuntimeGlobals.module);
    
    return new RawSource(`module.exports = ${JSON.stringify(dataUrl)};`);
  }
  
  private generateFile(
    module: NormalModule,
    content: Buffer | string,
    context: GenerateContext
  ): Source {
    const { runtimeRequirements, chunkGraph } = context;
    
    // 计算文件名
    const filename = this.getFilename(module, content);
    
    // 保存资产信息
    module.buildInfo.filename = filename;
    module.buildInfo.assetInfo = {
      sourceFilename: module.resource,
    };
    
    runtimeRequirements.add(RuntimeGlobals.publicPath);
    runtimeRequirements.add(RuntimeGlobals.module);
    
    // 生成路径表达式
    const publicPath = this.getPublicPath(module, context);
    
    return new RawSource(
      `module.exports = ${publicPath} + ${JSON.stringify(filename)};`
    );
  }
  
  private getFilename(module: NormalModule, content: Buffer | string): string {
    const hash = createHash('md4')
      .update(content)
      .digest('hex')
      .slice(0, 8);
    
    const ext = path.extname(module.resource);
    const name = path.basename(module.resource, ext);
    
    let filename = this.filename;
    if (typeof filename === 'function') {
      filename = filename({ module, hash });
    }
    
    return filename
      .replace('[hash]', hash)
      .replace('[contenthash]', hash)
      .replace('[name]', name)
      .replace('[ext]', ext);
  }
  
  getSize(module: NormalModule): number {
    const content = module.buildInfo.content;
    if (!content) return 0;
    return Buffer.isBuffer(content) ? content.length : content.length;
  }
}
```

## AssetSourceGenerator

```typescript
export class AssetSourceGenerator implements Generator {
  generate(module: NormalModule, context: GenerateContext): Source {
    const { runtimeRequirements } = context;
    
    const content = module.buildInfo.content;
    const sourceStr = typeof content === 'string'
      ? content
      : content.toString('utf-8');
    
    runtimeRequirements.add(RuntimeGlobals.module);
    
    return new RawSource(`module.exports = ${JSON.stringify(sourceStr)};`);
  }
  
  getSize(module: NormalModule): number {
    const content = module.buildInfo.content;
    if (!content) return 0;
    return content.length + 10;  // 考虑 module.exports 开销
  }
}
```

## 初始化片段

```typescript
export class InitFragment {
  static STAGE_CONSTANTS = 0;
  static STAGE_HARMONY_IMPORTS = 10;
  static STAGE_HARMONY_EXPORTS = 20;
  static STAGE_PROVIDES = 30;
  
  private content: string;
  readonly stage: number;
  readonly position: number;
  private key?: string;
  
  constructor(
    content: string,
    stage: number,
    position: number,
    key?: string
  ) {
    this.content = content;
    this.stage = stage;
    this.position = position;
    this.key = key;
  }
  
  getContent(context: GenerateContext): string {
    return this.content;
  }
  
  /**
   * 合并相同 key 的片段
   */
  merge(other: InitFragment): InitFragment {
    // 同 key 只保留一个
    return this;
  }
}
```

## RuntimeTemplate

生成运行时代码的辅助类：

```typescript
export class RuntimeTemplate {
  private outputOptions: OutputOptions;
  
  constructor(outputOptions: OutputOptions) {
    this.outputOptions = outputOptions;
  }
  
  /**
   * 生成模块引用
   */
  moduleRaw(options: {
    module: Module;
    chunkGraph: ChunkGraph;
    request: string;
    runtimeRequirements: Set<string>;
  }): string {
    const { module, chunkGraph, runtimeRequirements } = options;
    
    runtimeRequirements.add(RuntimeGlobals.require);
    
    const moduleId = chunkGraph.getModuleId(module);
    return `__webpack_require__(${JSON.stringify(moduleId)})`;
  }
  
  /**
   * 生成模块命名空间引用
   */
  moduleNamespace(options: {
    module: Module;
    chunkGraph: ChunkGraph;
    request: string;
    strict?: boolean;
    runtimeRequirements: Set<string>;
  }): string {
    const { module, chunkGraph, strict, runtimeRequirements } = options;
    
    runtimeRequirements.add(RuntimeGlobals.require);
    
    const moduleId = chunkGraph.getModuleId(module);
    
    if (strict) {
      return `__webpack_require__(${JSON.stringify(moduleId)})`;
    }
    
    // 非严格模式需要转换
    runtimeRequirements.add(RuntimeGlobals.createFakeNamespaceObject);
    return `__webpack_require__.t(${JSON.stringify(moduleId)}, 2)`;
  }
  
  /**
   * 生成导出表达式
   */
  exportFromImport(options: {
    module: Module;
    request: string;
    importVar: string;
    exportName: string;
    runtimeRequirements: Set<string>;
  }): string {
    const { importVar, exportName, runtimeRequirements } = options;
    
    if (exportName === 'default') {
      return `${importVar}.default`;
    }
    
    if (exportName === '*') {
      return importVar;
    }
    
    return `${importVar}[${JSON.stringify(exportName)}]`;
  }
}
```

## Generator 选项合并

```typescript
export class NormalModuleFactory {
  /**
   * 获取 Generator 选项
   */
  private getGeneratorOptions(
    type: string,
    ruleSettings: any
  ): GeneratorOptions {
    // 默认选项
    const defaultOptions = this.getDefaultGeneratorOptions(type);
    
    // 全局配置
    const globalOptions = this.options.generator?.[type] || {};
    
    // 规则配置
    const ruleOptions = ruleSettings?.generator || {};
    
    // 合并
    return {
      ...defaultOptions,
      ...globalOptions,
      ...ruleOptions,
    };
  }
  
  private getDefaultGeneratorOptions(type: string): GeneratorOptions {
    switch (type) {
      case 'asset':
      case 'asset/resource':
        return {
          filename: '[hash][ext]',
        };
        
      case 'asset/inline':
        return {
          dataUrl: { encoding: 'base64' },
        };
        
      default:
        return {};
    }
  }
}
```

## 总结

Generator 是代码生成的核心：

**Generator 类型**：
- **JavascriptGenerator**：JavaScript 代码
- **JsonGenerator**：JSON 导出
- **AssetGenerator**：资源处理
- **AssetSourceGenerator**：源码资源

**生成流程**：
1. 获取模块原始源码
2. 遍历依赖，应用模板
3. 替换依赖语句
4. 添加初始化片段
5. 合并生成最终代码

**关键组件**：
- **DependencyTemplate**：依赖代码生成
- **InitFragment**：初始化代码
- **RuntimeTemplate**：运行时代码生成
- **ReplaceSource**：源码替换

**本章完成了第六部分的全部内容**。下一部分我们将深入 Resolver 模块解析器的实现。
