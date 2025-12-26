---
sidebar_position: 47
title: "Loader 匹配与应用"
---

# Loader 匹配与应用

Loader 是 Webpack 的核心特性之一，它让 Webpack 能够处理 JavaScript 以外的各种资源。本章深入理解 Loader 规则的匹配机制。

## Loader 规则配置

```javascript
// webpack.config.js
module.exports = {
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.scss$/,
        use: [
          'style-loader',
          { loader: 'css-loader', options: { modules: true } },
          'sass-loader',
        ],
      },
    ],
  },
};
```

## RuleSet 编译器

RuleSet 编译器将配置的规则编译成高效的匹配器：

```typescript
export interface Rule {
  // 匹配条件
  test?: RegExp | string | ((path: string) => boolean);
  include?: Condition;
  exclude?: Condition;
  resource?: Condition;
  resourceQuery?: Condition;
  resourceFragment?: Condition;
  issuer?: Condition;
  
  // Loader 配置
  use?: UseEntry | UseEntry[];
  loader?: string;
  options?: object;
  
  // 类型设置
  type?: string;
  
  // 执行阶段
  enforce?: 'pre' | 'post';
  
  // 嵌套规则
  rules?: Rule[];
  oneOf?: Rule[];
  
  // 其他
  sideEffects?: boolean;
  parser?: object;
  generator?: object;
}

type Condition = 
  | RegExp
  | string
  | ((value: string) => boolean)
  | Condition[]
  | { and?: Condition[]; or?: Condition[]; not?: Condition };

type UseEntry = string | { loader: string; options?: object };
```

### 编译规则

```typescript
export class RuleSetCompiler {
  private rules: CompiledRule[] = [];
  
  constructor(rules: Rule[]) {
    this.rules = this.compileRules(rules);
  }
  
  private compileRules(rules: Rule[]): CompiledRule[] {
    return rules.flatMap((rule) => this.compileRule(rule));
  }
  
  private compileRule(rule: Rule): CompiledRule[] {
    const result: CompiledRule[] = [];
    
    // 编译匹配条件
    const conditions = this.compileConditions(rule);
    
    // 处理 use 配置
    if (rule.use || rule.loader) {
      const useItems = this.normalizeUse(rule.use, rule.loader, rule.options);
      
      for (const useItem of useItems) {
        result.push({
          type: 'use',
          enforce: rule.enforce,
          conditions,
          value: useItem,
        });
      }
    }
    
    // 处理 type 配置
    if (rule.type) {
      result.push({
        type: 'type',
        conditions,
        value: rule.type,
      });
    }
    
    // 处理 sideEffects
    if (rule.sideEffects !== undefined) {
      result.push({
        type: 'sideEffects',
        conditions,
        value: rule.sideEffects,
      });
    }
    
    // 处理 parser
    if (rule.parser) {
      result.push({
        type: 'parser',
        conditions,
        value: rule.parser,
      });
    }
    
    // 处理 generator
    if (rule.generator) {
      result.push({
        type: 'generator',
        conditions,
        value: rule.generator,
      });
    }
    
    // 处理嵌套规则
    if (rule.rules) {
      const nestedRules = this.compileRules(rule.rules);
      for (const nested of nestedRules) {
        result.push({
          ...nested,
          conditions: [...conditions, ...nested.conditions],
        });
      }
    }
    
    // 处理 oneOf（只匹配第一个）
    if (rule.oneOf) {
      result.push({
        type: 'oneOf',
        conditions,
        rules: this.compileRules(rule.oneOf),
      });
    }
    
    return result;
  }
}
```

### 编译条件

```typescript
export class RuleSetCompiler {
  private compileConditions(rule: Rule): CompiledCondition[] {
    const conditions: CompiledCondition[] = [];
    
    if (rule.test) {
      conditions.push({
        property: 'resource',
        matcher: this.compileCondition(rule.test),
      });
    }
    
    if (rule.include) {
      conditions.push({
        property: 'resource',
        matcher: this.compileCondition(rule.include),
      });
    }
    
    if (rule.exclude) {
      conditions.push({
        property: 'resource',
        matcher: this.compileCondition(rule.exclude),
        negate: true,
      });
    }
    
    if (rule.resource) {
      conditions.push({
        property: 'resource',
        matcher: this.compileCondition(rule.resource),
      });
    }
    
    if (rule.resourceQuery) {
      conditions.push({
        property: 'resourceQuery',
        matcher: this.compileCondition(rule.resourceQuery),
      });
    }
    
    if (rule.resourceFragment) {
      conditions.push({
        property: 'resourceFragment',
        matcher: this.compileCondition(rule.resourceFragment),
      });
    }
    
    if (rule.issuer) {
      conditions.push({
        property: 'issuer',
        matcher: this.compileCondition(rule.issuer),
      });
    }
    
    return conditions;
  }
  
  private compileCondition(condition: Condition): Matcher {
    // 正则表达式
    if (condition instanceof RegExp) {
      return (value: string) => condition.test(value);
    }
    
    // 字符串
    if (typeof condition === 'string') {
      return (value: string) => value.startsWith(condition);
    }
    
    // 函数
    if (typeof condition === 'function') {
      return condition;
    }
    
    // 数组（OR 逻辑）
    if (Array.isArray(condition)) {
      const matchers = condition.map((c) => this.compileCondition(c));
      return (value: string) => matchers.some((m) => m(value));
    }
    
    // 对象条件
    if (typeof condition === 'object') {
      const matchers: Matcher[] = [];
      
      if (condition.and) {
        const andMatchers = condition.and.map((c) => this.compileCondition(c));
        matchers.push((v) => andMatchers.every((m) => m(v)));
      }
      
      if (condition.or) {
        const orMatchers = condition.or.map((c) => this.compileCondition(c));
        matchers.push((v) => orMatchers.some((m) => m(v)));
      }
      
      if (condition.not) {
        const notMatcher = this.compileCondition(condition.not);
        matchers.push((v) => !notMatcher(v));
      }
      
      return (v) => matchers.every((m) => m(v));
    }
    
    throw new Error(`Invalid condition: ${condition}`);
  }
}
```

### 标准化 use 配置

```typescript
export class RuleSetCompiler {
  private normalizeUse(
    use: UseEntry | UseEntry[] | undefined,
    loader: string | undefined,
    options: object | undefined
  ): LoaderItem[] {
    // 只有 loader 的简写形式
    if (loader) {
      return [{
        loader,
        options: options || {},
        ident: this.generateIdent(loader, options),
      }];
    }
    
    if (!use) return [];
    
    // 单个 use
    if (!Array.isArray(use)) {
      return [this.normalizeUseItem(use)];
    }
    
    // 数组 use
    return use.map((item) => this.normalizeUseItem(item));
  }
  
  private normalizeUseItem(item: UseEntry): LoaderItem {
    if (typeof item === 'string') {
      return {
        loader: item,
        options: {},
        ident: undefined,
      };
    }
    
    return {
      loader: item.loader,
      options: item.options || {},
      ident: this.generateIdent(item.loader, item.options),
    };
  }
  
  private generateIdent(loader: string, options?: object): string | undefined {
    if (!options) return undefined;
    return `${loader}|${JSON.stringify(options)}`;
  }
}
```

## 执行匹配

```typescript
export interface MatchContext {
  // 资源路径
  resource: string;
  
  // 真实资源路径（经过别名解析后）
  realResource: string;
  
  // 查询字符串
  resourceQuery: string;
  
  // 片段
  resourceFragment: string;
  
  // 发起者
  issuer: string;
  
  // 编译器名称
  compiler?: string;
}

export class RuleSetCompiler {
  /**
   * 执行规则匹配
   */
  exec(context: MatchContext): MatchedRule[] {
    const results: MatchedRule[] = [];
    
    for (const rule of this.rules) {
      this.matchRule(rule, context, results);
    }
    
    return results;
  }
  
  private matchRule(
    rule: CompiledRule,
    context: MatchContext,
    results: MatchedRule[]
  ): void {
    // 检查所有条件
    if (!this.checkConditions(rule.conditions, context)) {
      return;
    }
    
    // oneOf 特殊处理
    if (rule.type === 'oneOf') {
      for (const subRule of rule.rules!) {
        if (this.checkConditions(subRule.conditions, context)) {
          this.matchRule(subRule, context, results);
          return;  // oneOf 只匹配第一个
        }
      }
      return;
    }
    
    // 添加匹配结果
    results.push({
      type: rule.type,
      enforce: rule.enforce,
      value: rule.value,
    });
  }
  
  private checkConditions(
    conditions: CompiledCondition[],
    context: MatchContext
  ): boolean {
    for (const condition of conditions) {
      const value = context[condition.property as keyof MatchContext];
      
      if (typeof value !== 'string') {
        if (condition.negate) continue;
        return false;
      }
      
      const matched = condition.matcher(value);
      const result = condition.negate ? !matched : matched;
      
      if (!result) return false;
    }
    
    return true;
  }
}
```

## Loader 顺序

### 执行阶段

```
Pre Loaders (enforce: 'pre')
         ↓
Normal Loaders (无 enforce)
         ↓
Inline Loaders (请求字符串中的)
         ↓
Post Loaders (enforce: 'post')
```

但实际执行是**从右到左**、**从下到上**：

```javascript
// 配置
rules: [
  { test: /\.css$/, use: 'A', enforce: 'post' },
  { test: /\.css$/, use: ['B', 'C'] },
  { test: /\.css$/, use: 'D', enforce: 'pre' },
]

// 对于 style.css，Loader 顺序：
// 收集顺序：A(post), B, C, D(pre)
// 执行顺序：D → C → B → A
```

### 在 NormalModuleFactory 中组装

```typescript
export class NormalModuleFactory {
  private assembleLoaders(
    matchedRules: MatchedRule[],
    inlineLoaders: LoaderItem[]
  ): LoaderItem[] {
    const postLoaders: LoaderItem[] = [];
    const normalLoaders: LoaderItem[] = [];
    const preLoaders: LoaderItem[] = [];
    
    // 分类收集
    for (const rule of matchedRules) {
      if (rule.type !== 'use') continue;
      
      if (rule.enforce === 'post') {
        postLoaders.push(rule.value);
      } else if (rule.enforce === 'pre') {
        preLoaders.push(rule.value);
      } else {
        normalLoaders.push(rule.value);
      }
    }
    
    // 按顺序组装
    // 注意：执行时从右到左，所以先添加的后执行
    return [
      ...postLoaders,
      ...inlineLoaders,
      ...normalLoaders,
      ...preLoaders,
    ];
  }
}
```

## 内联 Loader

### 语法

```javascript
// 禁用所有配置的 Loader
import data from '!!raw-loader!./data.txt';

// 禁用 pre 和 normal Loader
import styles from '-!css-loader!./style.css';

// 禁用 normal Loader
import content from '!file-loader!./file.bin';
```

### 处理内联 Loader

```typescript
export class NormalModuleFactory {
  private parseInlineLoaders(request: string): {
    loaders: LoaderItem[];
    resource: string;
    noPreAutoLoaders: boolean;
    noAutoLoaders: boolean;
    noPrePostAutoLoaders: boolean;
  } {
    let noPreAutoLoaders = false;
    let noAutoLoaders = false;
    let noPrePostAutoLoaders = false;
    
    // 检查前缀
    if (request.startsWith('!!')) {
      noPrePostAutoLoaders = true;
      request = request.slice(2);
    } else if (request.startsWith('-!')) {
      noPreAutoLoaders = true;
      request = request.slice(2);
    } else if (request.startsWith('!')) {
      noAutoLoaders = true;
      request = request.slice(1);
    }
    
    // 分割
    const parts = request.split('!');
    const resource = parts.pop()!;
    
    // 解析每个内联 Loader
    const loaders = parts.map((part) => {
      const queryIndex = part.indexOf('?');
      if (queryIndex >= 0) {
        return {
          loader: part.slice(0, queryIndex),
          options: this.parseQuery(part.slice(queryIndex + 1)),
          ident: undefined,
        };
      }
      return {
        loader: part,
        options: {},
        ident: undefined,
      };
    });
    
    return {
      loaders,
      resource,
      noPreAutoLoaders,
      noAutoLoaders,
      noPrePostAutoLoaders,
    };
  }
}
```

## 完整的 Loader 匹配流程

```typescript
export class NormalModuleFactory {
  private matchLoaders(resolveData: ResolveData): void {
    const { resource, resourceQuery, resourceFragment, contextInfo } = resolveData;
    
    // 构建匹配上下文
    const context: MatchContext = {
      resource,
      realResource: resource,
      resourceQuery,
      resourceFragment,
      issuer: contextInfo.issuer,
      compiler: contextInfo.compiler,
    };
    
    // 执行规则匹配
    const matchedRules = this.ruleSet.exec(context);
    
    // 分类收集结果
    let type = 'javascript/auto';
    const settings: any = {};
    const postLoaders: LoaderItem[] = [];
    const normalLoaders: LoaderItem[] = [];
    const preLoaders: LoaderItem[] = [];
    
    for (const rule of matchedRules) {
      switch (rule.type) {
        case 'type':
          type = rule.value;
          break;
        case 'sideEffects':
          settings.sideEffects = rule.value;
          break;
        case 'parser':
          settings.parser = { ...settings.parser, ...rule.value };
          break;
        case 'generator':
          settings.generator = { ...settings.generator, ...rule.value };
          break;
        case 'use':
          if (rule.enforce === 'post') {
            postLoaders.push(rule.value);
          } else if (rule.enforce === 'pre') {
            preLoaders.push(rule.value);
          } else {
            normalLoaders.push(rule.value);
          }
          break;
      }
    }
    
    // 处理内联 Loader 标记
    let loaders: LoaderItem[] = [];
    
    if (!resolveData.noPrePostAutoLoaders) {
      loaders.push(...postLoaders);
    }
    
    // 内联 Loader
    loaders.push(...resolveData.inlineLoaders);
    
    if (!resolveData.noAutoLoaders && !resolveData.noPrePostAutoLoaders) {
      loaders.push(...normalLoaders);
    }
    
    if (!resolveData.noPreAutoLoaders && !resolveData.noPrePostAutoLoaders) {
      loaders.push(...preLoaders);
    }
    
    // 保存结果
    resolveData.loaders = loaders;
    resolveData.type = type;
    resolveData.settings = settings;
  }
}
```

## 实际示例

```javascript
// webpack.config.js
module.exports = {
  module: {
    rules: [
      // Pre-loader: ESLint
      {
        test: /\.js$/,
        enforce: 'pre',
        use: 'eslint-loader',
      },
      
      // Normal loaders: Babel
      {
        test: /\.js$/,
        use: 'babel-loader',
        exclude: /node_modules/,
      },
      
      // 多条件规则
      {
        test: /\.css$/,
        oneOf: [
          {
            resourceQuery: /modules/,
            use: [
              'style-loader',
              { loader: 'css-loader', options: { modules: true } },
            ],
          },
          {
            use: ['style-loader', 'css-loader'],
          },
        ],
      },
    ],
  },
};
```

对于 `import './styles.css?modules'`：
- 匹配第一个 oneOf 规则
- Loader 顺序：css-loader（modules: true）→ style-loader

对于 `import './styles.css'`：
- 匹配第二个 oneOf 规则
- Loader 顺序：css-loader → style-loader

## 总结

Loader 匹配是 Webpack 灵活性的基础：

**匹配条件**：
- `test`：正则匹配资源路径
- `include/exclude`：包含/排除路径
- `resourceQuery`：匹配查询字符串
- `issuer`：匹配发起者

**执行顺序**：
1. Pre Loader（enforce: 'pre'）
2. Normal Loader
3. Inline Loader
4. Post Loader（enforce: 'post'）

实际执行从右到左、从下到上。

**内联 Loader**：
- `!!`：禁用所有配置 Loader
- `-!`：禁用 pre 和 normal Loader
- `!`：禁用 normal Loader

下一章我们将实现 Parser 选择与创建。
