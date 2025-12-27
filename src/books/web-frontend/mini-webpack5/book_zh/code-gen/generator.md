# Generator 基类设计

Generator 负责将 Module 转换为可执行代码，是代码生成的核心抽象。

## Generator 接口

```typescript
interface Generator {
  /**
   * 生成模块代码
   */
  generate(
    module: Module,
    generateContext: GenerateContext
  ): Source
  
  /**
   * 获取依赖模板
   */
  getDependencyTemplate(
    dependency: Dependency
  ): DependencyTemplate
  
  /**
   * 更新 Hash
   */
  updateHash(
    hash: Hash,
    context: UpdateHashContext
  ): void
}
```

## 基类实现

```typescript
class Generator {
  /**
   * 生成模块代码
   */
  generate(module, generateContext) {
    throw new Error('Generator.generate must be implemented')
  }
  
  /**
   * 获取依赖模板
   */
  getDependencyTemplate(dependency) {
    const constructor = dependency.constructor
    return this.dependencyTemplates.get(constructor)
  }
  
  /**
   * 更新 Hash
   */
  updateHash(hash, { module, chunkGraph, moduleGraph }) {
    // 默认实现
    hash.update(module.identifier())
  }
}
```

## GenerateContext

```typescript
interface GenerateContext {
  /**
   * 模块依赖图
   */
  moduleGraph: ModuleGraph
  
  /**
   * Chunk 依赖图
   */
  chunkGraph: ChunkGraph
  
  /**
   * 运行时模板
   */
  runtimeTemplate: RuntimeTemplate
  
  /**
   * 运行时需求
   */
  runtimeRequirements: Set<string>
  
  /**
   * 依赖模板
   */
  dependencyTemplates: DependencyTemplates
  
  /**
   * 代码生成结果
   */
  codeGenerationResults: CodeGenerationResults
  
  /**
   * 数据
   */
  getData(): any
  
  /**
   * Concatenation Scope
   */
  concatenationScope?: ConcatenationScope
}
```

## 内置 Generator

### JavascriptGenerator

处理 JavaScript 模块：

```typescript
class JavascriptGenerator extends Generator {
  generate(module, generateContext) {
    const { moduleGraph, runtimeTemplate, runtimeRequirements } = generateContext
    
    const source = new ReplaceSource(module.originalSource())
    
    // 处理依赖
    this.processDependencies(module, source, generateContext)
    
    // 处理块
    this.processBlocks(module, source, generateContext)
    
    return source
  }
  
  processDependencies(module, source, context) {
    const { dependencies } = module
    const { dependencyTemplates } = context
    
    for (const dependency of dependencies) {
      const template = dependencyTemplates.get(dependency.constructor)
      
      if (template) {
        template.apply(dependency, source, context)
      }
    }
  }
}
```

### AssetGenerator

处理资源模块：

```typescript
class AssetGenerator extends Generator {
  generate(module, generateContext) {
    const { runtimeTemplate, runtimeRequirements } = generateContext
    
    runtimeRequirements.add('module')
    
    return new RawSource(
      `module.exports = ${JSON.stringify(module.content)}`
    )
  }
}
```

### JsonGenerator

处理 JSON 模块：

```typescript
class JsonGenerator extends Generator {
  generate(module, generateContext) {
    const { moduleGraph, runtimeTemplate } = generateContext
    
    return new RawSource(
      `module.exports = ${module.content}`
    )
  }
}
```

## DependencyTemplates

依赖模板注册表：

```typescript
class DependencyTemplates {
  private templates = new Map()
  
  /**
   * 设置模板
   */
  set(dependencyClass, template) {
    this.templates.set(dependencyClass, template)
  }
  
  /**
   * 获取模板
   */
  get(dependencyClass) {
    return this.templates.get(dependencyClass)
  }
}
```

## 实战示例

### 创建 Generator

```typescript
class MyGenerator extends Generator {
  generate(module, generateContext) {
    const { runtimeTemplate, moduleGraph } = generateContext
    
    const source = new ReplaceSource(module.originalSource())
    
    // 处理特殊语法
    for (const dependency of module.dependencies) {
      if (dependency instanceof MyDependency) {
        const template = this.getDependencyTemplate(dependency)
        template.apply(dependency, source, generateContext)
      }
    }
    
    return source
  }
}
```

### 注册 Generator

```typescript
class NormalModuleFactory {
  createGenerator(type) {
    switch (type) {
      case 'javascript/auto':
      case 'javascript/esm':
      case 'javascript/dynamic':
        return new JavascriptGenerator()
      
      case 'asset':
      case 'asset/resource':
      case 'asset/inline':
        return new AssetGenerator()
      
      case 'json':
        return new JsonGenerator()
      
      default:
        throw new Error(`Unknown generator type: ${type}`)
    }
  }
}
```

### 使用 Generator

```typescript
class Module {
  codeGeneration(context) {
    const sources = new Map()
    const runtimeRequirements = new Set()
    
    const generateContext = {
      ...context,
      runtimeRequirements
    }
    
    // 创建 Generator
    const generator = context.moduleGraph
      .getModuleGraphModule(this)
      .generator
    
    // 生成代码
    const source = generator.generate(this, generateContext)
    
    sources.set('javascript', source)
    
    return {
      sources,
      runtimeRequirements
    }
  }
}
```

## 总结

- Generator 是代码生成的核心抽象
- 每种模块类型对应一个 Generator
- JavascriptGenerator 处理 JS 模块
- AssetGenerator 处理资源模块
- Generator 使用 DependencyTemplate 处理依赖
- 通过 GenerateContext 访问上下文信息
