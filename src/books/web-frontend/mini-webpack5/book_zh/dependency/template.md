---
sidebar_position: 86
title: "DependencyTemplate 模板系统"
---

# DependencyTemplate 模板系统

DependencyTemplate 负责将依赖转换为实际的代码，是代码生成阶段的核心组件。

## 模板系统概览

### 设计模式

```
Dependency (数据)
    ↓
DependencyTemplate (模板)
    ↓
ReplaceSource (源码替换)
    ↓
生成的代码
```

### 职责分离

- **Dependency**：存储依赖信息（位置、请求等）
- **DependencyTemplate**：定义如何生成代码
- **ReplaceSource**：执行源码替换操作

## DependencyTemplate 基类

### 接口定义

```typescript
abstract class DependencyTemplate {
  abstract apply(
    dependency: Dependency,
    source: ReplaceSource,
    templateContext: DependencyTemplateContext
  ): void;
}

interface DependencyTemplateContext {
  // 运行时信息
  runtimeTemplate: RuntimeTemplate;
  moduleGraph: ModuleGraph;
  chunkGraph: ChunkGraph;
  
  // 当前模块
  module: Module;
  
  // 运行时要求
  runtimeRequirements: Set<string>;
  
  // 初始化片段
  initFragments: InitFragment[];
  
  // 当前运行时
  runtime: RuntimeSpec;
}
```

### 模板注册

```typescript
class Compilation {
  // 依赖模板映射
  dependencyTemplates: DependencyTemplates;
  
  constructor() {
    this.dependencyTemplates = new DependencyTemplates();
  }
}

class DependencyTemplates {
  private _map: Map<typeof Dependency, DependencyTemplate>;
  private _hash: string;
  
  constructor() {
    this._map = new Map();
    this._hash = '';
  }
  
  set(DependencyClass: typeof Dependency, template: DependencyTemplate): void {
    this._map.set(DependencyClass, template);
    this._hash = '';  // 失效 hash
  }
  
  get(DependencyClass: typeof Dependency): DependencyTemplate | undefined {
    return this._map.get(DependencyClass);
  }
  
  // 获取模板集合的 hash（用于缓存）
  getHash(): string {
    if (this._hash) return this._hash;
    
    const hash = createHash('md5');
    for (const [key, value] of this._map) {
      hash.update(key.name);
      hash.update(value.constructor.name);
    }
    this._hash = hash.digest('hex').slice(0, 8);
    return this._hash;
  }
}
```

## ReplaceSource 替换源

### 核心实现

```typescript
class ReplaceSource {
  private _source: string;
  private _replacements: Replacement[];
  
  constructor(source: string | Source) {
    this._source = typeof source === 'string' ? source : source.source();
    this._replacements = [];
  }
  
  // 替换指定范围
  replace(start: number, end: number, content: string, priority = 0): void {
    this._replacements.push({
      start,
      end,
      content,
      priority,
    });
  }
  
  // 插入内容
  insert(pos: number, content: string, priority = 0): void {
    this._replacements.push({
      start: pos,
      end: pos - 1,
      content,
      priority,
    });
  }
  
  // 生成最终源码
  source(): string {
    // 按位置排序（考虑优先级）
    const replacements = this._replacements
      .slice()
      .sort((a, b) => {
        const diff = a.start - b.start;
        if (diff !== 0) return diff;
        return b.priority - a.priority;
      });
    
    let result = '';
    let pos = 0;
    
    for (const r of replacements) {
      // 添加替换前的内容
      if (r.start > pos) {
        result += this._source.slice(pos, r.start);
      }
      // 添加替换内容
      result += r.content;
      pos = r.end + 1;
    }
    
    // 添加剩余内容
    if (pos < this._source.length) {
      result += this._source.slice(pos);
    }
    
    return result;
  }
}

interface Replacement {
  start: number;
  end: number;
  content: string;
  priority: number;
}
```

### 使用示例

```typescript
const source = new ReplaceSource('import { foo } from "./bar"');

// 替换模块路径
source.replace(22, 28, '"./bar.js"');

// 替换整个语句
source.replace(0, 29, 'var foo = __webpack_require__("./bar.js")["foo"]');

console.log(source.source());
// => 'var foo = __webpack_require__("./bar.js")["foo"]'
```

## 常见模板实现

### NullDependencyTemplate

```typescript
class NullDependencyTemplate extends DependencyTemplate {
  apply(
    dependency: NullDependency,
    source: ReplaceSource,
    templateContext: DependencyTemplateContext
  ): void {
    // 不做任何替换
    // 用于只需要记录信息但不修改代码的依赖
  }
}
```

### ConstDependencyTemplate

```typescript
class ConstDependency extends NullDependency {
  expression: string;
  range: [number, number];
  
  constructor(expression: string, range: [number, number]) {
    super();
    this.expression = expression;
    this.range = range;
  }
}

class ConstDependencyTemplate extends DependencyTemplate {
  apply(
    dep: ConstDependency,
    source: ReplaceSource,
    templateContext: DependencyTemplateContext
  ): void {
    source.replace(
      dep.range[0],
      dep.range[1] - 1,
      dep.expression
    );
  }
}

// 使用示例
// process.env.NODE_ENV => "production"
const dep = new ConstDependency(
  JSON.stringify('production'),
  expression.range
);
```

### ModuleDependencyTemplate

```typescript
abstract class ModuleDependencyTemplate extends DependencyTemplate {
  apply(
    dep: ModuleDependency,
    source: ReplaceSource,
    context: DependencyTemplateContext
  ): void {
    const { moduleGraph, chunkGraph, runtimeRequirements } = context;
    
    // 获取目标模块
    const module = moduleGraph.getModule(dep);
    
    if (!module) {
      this.applyMissing(dep, source, context);
      return;
    }
    
    // 获取模块 ID
    const moduleId = chunkGraph.getModuleId(module);
    
    // 生成代码
    this.applyResolved(dep, source, context, module, moduleId);
  }
  
  protected applyMissing(
    dep: ModuleDependency,
    source: ReplaceSource,
    context: DependencyTemplateContext
  ): void {
    source.replace(
      dep.range[0],
      dep.range[1] - 1,
      `/* missing module */ undefined`
    );
  }
  
  protected abstract applyResolved(
    dep: ModuleDependency,
    source: ReplaceSource,
    context: DependencyTemplateContext,
    module: Module,
    moduleId: string | number
  ): void;
}
```

## InitFragment 初始化片段

### 设计目的

```typescript
// 问题：某些代码需要在模块顶部生成
// 例如：ESM 导出定义

// 源代码
export const foo = 1;

// 需要生成
__webpack_require__.d(__webpack_exports__, {
  "foo": () => foo  // 这部分需要在顶部
});
const foo = 1;
```

### 实现

```typescript
abstract class InitFragment {
  content: string;
  stage: number;
  position: number;
  key?: string;
  
  // 预定义阶段
  static STAGE_CONSTANTS = 0;
  static STAGE_ASYNC_BOUNDARY = 5;
  static STAGE_HARMONY_EXPORTS = 10;
  static STAGE_HARMONY_IMPORTS = 20;
  static STAGE_PROVIDES = 30;
  
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
  
  getContent(): string {
    return this.content;
  }
  
  // 合并相同 key 的片段
  merge?(other: InitFragment): InitFragment;
}
```

### 片段合并

```typescript
class HarmonyExportInitFragment extends InitFragment {
  exportMap: Map<string, string>;
  
  constructor(
    exportsArgument: string,
    exportMap: Map<string, string>
  ) {
    super(
      undefined,
      InitFragment.STAGE_HARMONY_EXPORTS,
      0,
      'harmony export'  // key 用于合并
    );
    this.exportsArgument = exportsArgument;
    this.exportMap = exportMap;
  }
  
  merge(other: HarmonyExportInitFragment): HarmonyExportInitFragment {
    // 合并导出映射
    const newMap = new Map([...this.exportMap, ...other.exportMap]);
    return new HarmonyExportInitFragment(this.exportsArgument, newMap);
  }
  
  getContent(): string {
    const entries = Array.from(this.exportMap.entries());
    const props = entries
      .map(([name, local]) => `${JSON.stringify(name)}: () => ${local}`)
      .join(',\n  ');
    
    return `__webpack_require__.d(${this.exportsArgument}, {\n  ${props}\n});\n`;
  }
}
```

### 使用流程

```typescript
class JavascriptGenerator {
  generate(module: Module, context: GenerateContext): Source {
    const initFragments: InitFragment[] = [];
    const source = new ReplaceSource(module.originalSource());
    
    // 应用所有依赖模板
    for (const dep of module.dependencies) {
      const template = this.dependencyTemplates.get(dep.constructor);
      if (template) {
        template.apply(dep, source, {
          ...context,
          initFragments,
        });
      }
    }
    
    // 合并初始化片段
    const mergedFragments = this.mergeInitFragments(initFragments);
    
    // 排序并生成
    mergedFragments.sort((a, b) => {
      const stageDiff = a.stage - b.stage;
      if (stageDiff !== 0) return stageDiff;
      return a.position - b.position;
    });
    
    // 组装最终源码
    let finalSource = '';
    for (const fragment of mergedFragments) {
      finalSource += fragment.getContent();
    }
    finalSource += source.source();
    
    return new RawSource(finalSource);
  }
  
  mergeInitFragments(fragments: InitFragment[]): InitFragment[] {
    const keyedFragments = new Map<string, InitFragment>();
    const unkeyedFragments: InitFragment[] = [];
    
    for (const fragment of fragments) {
      if (fragment.key) {
        const existing = keyedFragments.get(fragment.key);
        if (existing && existing.merge) {
          keyedFragments.set(fragment.key, existing.merge(fragment));
        } else {
          keyedFragments.set(fragment.key, fragment);
        }
      } else {
        unkeyedFragments.push(fragment);
      }
    }
    
    return [...keyedFragments.values(), ...unkeyedFragments];
  }
}
```

## RuntimeTemplate

### 运行时代码生成

```typescript
class RuntimeTemplate {
  compilation: Compilation;
  
  // 生成模块引用
  moduleRaw(module: Module, chunkGraph: ChunkGraph): string {
    const moduleId = chunkGraph.getModuleId(module);
    return `__webpack_require__(${JSON.stringify(moduleId)})`;
  }
  
  // 生成模块命名空间
  moduleNamespace(module: Module, chunkGraph: ChunkGraph): string {
    const raw = this.moduleRaw(module, chunkGraph);
    return `/*#__PURE__*/__webpack_require__.n(${raw})`;
  }
  
  // 生成导出访问
  exportFromImport(
    getModule: () => string,
    ids: string[],
    exportInfo: ExportInfo | null
  ): string {
    const module = getModule();
    
    if (ids.length === 0) {
      return module;
    }
    
    // 属性访问
    const access = ids
      .map(id => `[${JSON.stringify(id)}]`)
      .join('');
    
    return `${module}${access}`;
  }
  
  // 生成异步模块加载
  asyncModuleFactory(
    dependency: Dependency,
    block: AsyncDependenciesBlock
  ): string {
    const chunkIds = this.getChunkIds(block);
    
    return `
      __webpack_require__.e(${JSON.stringify(chunkIds)}).then(
        __webpack_require__.bind(__webpack_require__, ${this.getModuleId(dependency)})
      )
    `;
  }
}
```

## 完整示例

### ESM 转换

```javascript
// 源代码
import { foo } from './utils';
export const bar = foo + 1;

// 依赖分析
// 1. HarmonyImportSideEffectDependency('./utils')
// 2. HarmonyImportSpecifierDependency(foo)
// 3. HarmonyExportSpecifierDependency(bar)

// 模板应用
// HarmonyImportSideEffectDependencyTemplate: 无操作
// HarmonyImportSpecifierDependencyTemplate: 替换 foo 引用
// HarmonyExportSpecifierDependencyTemplate: 添加 InitFragment

// 生成代码
__webpack_require__.d(__webpack_exports__, {
  "bar": () => bar
});
var _utils__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./utils.js");

const bar = _utils__WEBPACK_IMPORTED_MODULE_0__["foo"] + 1;
```

### CJS 转换

```javascript
// 源代码
const utils = require('./utils');
module.exports = { result: utils.process() };

// 依赖分析
// 1. CommonJsRequireDependency('./utils')
// 2. CommonJsExportsDependency

// 生成代码
const utils = __webpack_require__("./utils.js");
module.exports = { result: utils.process() };
```

## 总结

DependencyTemplate 模板系统的核心要点：

**模板模式**：
- 依赖存储数据
- 模板定义转换
- 分离关注点

**ReplaceSource**：
- 范围替换
- 插入操作
- 优先级排序

**InitFragment**：
- 模块顶部代码
- 阶段排序
- 片段合并

**RuntimeTemplate**：
- 运行时代码生成
- 模块引用
- 异步加载

**下一章**：我们将学习 DependencyReference 引用追踪。
