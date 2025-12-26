---
sidebar_position: 48
title: "Parser 选择与创建"
---

# Parser 选择与创建

Parser（解析器）负责分析模块源码，提取依赖关系。不同类型的模块需要不同的 Parser。本章实现 Parser 的选择和创建机制。

## Parser 的职责

```
源代码 → Parser → 依赖列表 + AST
```

Parser 需要：

1. **解析源码**：生成 AST（抽象语法树）
2. **提取依赖**：找出 import/require/动态导入
3. **分析作用域**：追踪变量引用
4. **创建依赖对象**：为每个依赖创建 Dependency

## 模块类型与 Parser

| 模块类型 | Parser | 说明 |
|---------|--------|------|
| javascript/auto | JavascriptParser | 自动检测 CJS/ESM |
| javascript/esm | JavascriptParser | 强制 ESM |
| javascript/dynamic | JavascriptParser | 动态模块 |
| json | JsonParser | JSON 文件 |
| webassembly/sync | WebAssemblyParser | 同步 WASM |
| webassembly/async | WebAssemblyParser | 异步 WASM |
| asset | AssetParser | 资源文件 |
| asset/source | AssetParser | 源码资源 |
| asset/resource | AssetParser | 文件资源 |
| asset/inline | AssetParser | 内联资源 |

## Parser 接口

```typescript
export interface Parser {
  /**
   * 解析源码
   */
  parse(
    source: string | Buffer,
    state: ParserState
  ): ParserState;
}

export interface ParserState {
  // 当前模块
  module: Module;
  
  // Compilation 引用
  compilation: Compilation;
  
  // 解析选项
  options: ParserOptions;
  
  // 当前作用域
  scope: Scope;
  
  // 收集的依赖
  dependencies: Dependency[];
  
  // 异步块
  blocks: AsyncDependenciesBlock[];
}

export interface ParserOptions {
  // 是否严格模式
  strict?: boolean;
  
  // 是否解析动态 import
  dynamicImport?: boolean;
  
  // 是否支持顶层 await
  topLevelAwait?: boolean;
  
  // require 解析
  requireContext?: boolean;
  requireEnsure?: boolean;
  requireResolve?: boolean;
  
  // import 解析
  importMeta?: boolean;
  importDynamic?: boolean;
  
  // 其他
  commonjs?: boolean;
  harmony?: boolean;
  node?: boolean;
}
```

## NormalModuleFactory 中的 Parser 选择

```typescript
export class NormalModuleFactory {
  // Parser 缓存
  private parserCache = new Map<string, Parser>();
  
  /**
   * 获取或创建 Parser
   */
  getParser(type: string, parserOptions: ParserOptions = {}): Parser {
    // 生成缓存键
    const cacheKey = `${type}|${JSON.stringify(parserOptions)}`;
    
    // 检查缓存
    let parser = this.parserCache.get(cacheKey);
    if (parser) {
      return parser;
    }
    
    // 调用 createParser 钩子
    parser = this.hooks.createParser.for(type).call(parserOptions);
    
    if (!parser) {
      throw new Error(`No parser registered for module type: ${type}`);
    }
    
    // 调用 parser 钩子进行配置
    this.hooks.parser.for(type).call(parser, parserOptions);
    
    // 缓存
    this.parserCache.set(cacheKey, parser);
    
    return parser;
  }
}
```

## JavascriptModulesPlugin 注册

```typescript
export class JavascriptModulesPlugin {
  apply(compiler: Compiler): void {
    compiler.hooks.compile.tap('JavascriptModulesPlugin', (params) => {
      const normalModuleFactory = params.normalModuleFactory;
      
      // 注册各种 JavaScript 类型的 Parser 创建器
      const parserTypes = [
        'javascript/auto',
        'javascript/dynamic',
        'javascript/esm',
      ];
      
      for (const type of parserTypes) {
        normalModuleFactory.hooks.createParser
          .for(type)
          .tap('JavascriptModulesPlugin', (parserOptions) => {
            return new JavascriptParser(parserOptions, type);
          });
      }
      
      // 注册 Parser 配置钩子
      for (const type of parserTypes) {
        normalModuleFactory.hooks.parser
          .for(type)
          .tap('JavascriptModulesPlugin', (parser, parserOptions) => {
            // 根据选项配置 Parser
            this.configureParser(parser, parserOptions);
          });
      }
    });
  }
  
  private configureParser(parser: JavascriptParser, options: ParserOptions): void {
    // 配置 require 解析
    if (options.commonjs !== false) {
      parser.hooks.call
        .for('require')
        .tap('CommonJsPlugin', this.handleRequire);
    }
    
    // 配置 import 解析
    if (options.harmony !== false) {
      parser.hooks.importCall
        .tap('HarmonyModulesPlugin', this.handleImport);
    }
    
    // 配置动态 import
    if (options.importDynamic !== false) {
      parser.hooks.importCall
        .tap('ImportPlugin', this.handleDynamicImport);
    }
  }
}
```

## JavascriptParser 骨架

```typescript
import { parse } from 'acorn';
import * as ESTree from 'estree';

export class JavascriptParser implements Parser {
  hooks = {
    // 程序钩子
    program: new SyncBailHook<[ESTree.Program, any[]]>(['ast', 'comments']),
    
    // 语句钩子
    statement: new SyncBailHook<[ESTree.Statement]>(['statement']),
    
    // 表达式钩子
    expression: new HookMap(() => new SyncBailHook<[ESTree.Expression]>(['expression'])),
    
    // 调用钩子
    call: new HookMap(() => new SyncBailHook<[ESTree.CallExpression]>(['expression'])),
    
    // 成员访问钩子
    callMemberChain: new HookMap(
      () => new SyncBailHook<[ESTree.CallExpression, string[]]>(['expression', 'members'])
    ),
    
    // import 钩子
    import: new SyncBailHook<[ESTree.ImportDeclaration, string]>(['statement', 'source']),
    importSpecifier: new SyncBailHook<
      [ESTree.ImportDeclaration, string, string, string]
    >(['statement', 'source', 'exportName', 'identifierName']),
    
    // export 钩子
    export: new SyncBailHook<[ESTree.ExportDeclaration]>(['statement']),
    exportImport: new SyncBailHook<
      [ESTree.ExportDeclaration, string]
    >(['statement', 'source']),
    
    // 动态 import 钩子
    importCall: new SyncBailHook<[ESTree.CallExpression]>(['expression']),
    
    // 变量钩子
    varDeclaration: new HookMap(
      () => new SyncBailHook<[ESTree.VariableDeclaration]>(['declaration'])
    ),
    
    // 赋值钩子
    assign: new SyncBailHook<[ESTree.AssignmentExpression]>(['expression']),
    
    // 标识符钩子
    evaluate: new HookMap(() => new SyncBailHook<[ESTree.Expression]>(['expression'])),
  };
  
  private options: ParserOptions;
  private sourceType: 'auto' | 'module' | 'script';
  private scope!: Scope;
  private state!: ParserState;
  
  constructor(options: ParserOptions, type: string) {
    this.options = options;
    this.sourceType = type === 'javascript/esm' ? 'module' : 'auto';
  }
  
  parse(source: string | Buffer, state: ParserState): ParserState {
    const sourceString = typeof source === 'string'
      ? source
      : source.toString('utf-8');
    
    // 保存状态
    this.state = state;
    
    // 初始化作用域
    this.scope = new Scope();
    
    // 解析 AST
    const ast = this.parseSource(sourceString);
    
    // 遍历 AST
    if (ast) {
      this.walkProgram(ast);
    }
    
    return state;
  }
}
```

## 解析源码

```typescript
export class JavascriptParser {
  private parseSource(source: string): ESTree.Program | null {
    let ast: ESTree.Program | null = null;
    const comments: any[] = [];
    
    const parserOptions: any = {
      ecmaVersion: 'latest',
      sourceType: this.sourceType === 'module' ? 'module' : 'script',
      locations: true,
      ranges: true,
      allowReturnOutsideFunction: true,
      allowAwaitOutsideFunction: this.options.topLevelAwait !== false,
      onComment: comments,
    };
    
    try {
      if (this.sourceType === 'auto') {
        // 自动检测：先尝试 module，失败则尝试 script
        try {
          ast = parse(source, { ...parserOptions, sourceType: 'module' }) as ESTree.Program;
        } catch {
          ast = parse(source, { ...parserOptions, sourceType: 'script' }) as ESTree.Program;
        }
      } else {
        ast = parse(source, parserOptions) as ESTree.Program;
      }
    } catch (err) {
      // 解析错误
      this.state.module.addError(
        new ModuleParseError(source, err as Error)
      );
      return null;
    }
    
    // 调用 program 钩子
    const result = this.hooks.program.call(ast, comments);
    if (result === true) {
      return null;  // 插件处理了
    }
    
    return ast;
  }
}
```

## 遍历 AST

```typescript
export class JavascriptParser {
  private walkProgram(ast: ESTree.Program): void {
    // 预处理：收集变量声明
    this.preWalkStatements(ast.body);
    
    // 正式遍历
    this.walkStatements(ast.body);
  }
  
  private walkStatements(statements: ESTree.Statement[]): void {
    for (const statement of statements) {
      this.walkStatement(statement);
    }
  }
  
  private walkStatement(statement: ESTree.Statement): void {
    // 调用 statement 钩子
    const result = this.hooks.statement.call(statement);
    if (result === true) return;
    
    switch (statement.type) {
      case 'ImportDeclaration':
        this.walkImportDeclaration(statement);
        break;
        
      case 'ExportDefaultDeclaration':
      case 'ExportNamedDeclaration':
      case 'ExportAllDeclaration':
        this.walkExportDeclaration(statement);
        break;
        
      case 'VariableDeclaration':
        this.walkVariableDeclaration(statement);
        break;
        
      case 'FunctionDeclaration':
        this.walkFunctionDeclaration(statement);
        break;
        
      case 'ClassDeclaration':
        this.walkClassDeclaration(statement);
        break;
        
      case 'ExpressionStatement':
        this.walkExpressionStatement(statement);
        break;
        
      case 'BlockStatement':
        this.walkBlockStatement(statement);
        break;
        
      case 'IfStatement':
        this.walkIfStatement(statement);
        break;
        
      // ... 其他语句类型
    }
  }
}
```

## 处理 Import 语句

```typescript
export class JavascriptParser {
  private walkImportDeclaration(statement: ESTree.ImportDeclaration): void {
    const source = statement.source.value as string;
    
    // 调用 import 钩子
    const result = this.hooks.import.call(statement, source);
    if (result === true) return;
    
    // 处理各种导入形式
    for (const specifier of statement.specifiers) {
      let exportName: string;
      let identifierName: string;
      
      switch (specifier.type) {
        case 'ImportDefaultSpecifier':
          exportName = 'default';
          identifierName = specifier.local.name;
          break;
          
        case 'ImportSpecifier':
          exportName = specifier.imported.type === 'Identifier'
            ? specifier.imported.name
            : specifier.imported.value;
          identifierName = specifier.local.name;
          break;
          
        case 'ImportNamespaceSpecifier':
          exportName = '*';
          identifierName = specifier.local.name;
          break;
          
        default:
          continue;
      }
      
      // 调用 importSpecifier 钩子
      this.hooks.importSpecifier.call(
        statement,
        source,
        exportName,
        identifierName
      );
      
      // 记录到作用域
      this.scope.defineVariable(identifierName);
    }
  }
}
```

## JsonParser 实现

```typescript
export class JsonParser implements Parser {
  parse(source: string | Buffer, state: ParserState): ParserState {
    const sourceString = typeof source === 'string'
      ? source
      : source.toString('utf-8');
    
    let data: any;
    
    try {
      data = JSON.parse(sourceString);
    } catch (err) {
      // JSON 解析错误
      state.module.addError(
        new ModuleParseError(sourceString, err as Error)
      );
      return state;
    }
    
    // 添加 JSON 导出依赖
    state.module.buildInfo.jsonData = data;
    state.module.buildMeta.exportsType = 'default';
    
    // JSON 模块导出整个对象
    const dep = new JsonExportsDependency(data);
    state.module.addDependency(dep);
    
    return state;
  }
}
```

## AssetParser 实现

```typescript
export class AssetParser implements Parser {
  private dataUrlCondition: any;
  
  constructor(options: AssetParserOptions) {
    this.dataUrlCondition = options.dataUrlCondition;
  }
  
  parse(source: string | Buffer, state: ParserState): ParserState {
    const module = state.module;
    
    // 确定资源处理方式
    if (module.type === 'asset') {
      // 自动判断
      const size = Buffer.isBuffer(source) ? source.length : source.length;
      const useInline = this.shouldInline(size);
      
      module.buildInfo.dataUrl = useInline;
    } else if (module.type === 'asset/inline') {
      module.buildInfo.dataUrl = true;
    } else if (module.type === 'asset/resource') {
      module.buildInfo.dataUrl = false;
    } else if (module.type === 'asset/source') {
      module.buildInfo.dataUrl = undefined;
    }
    
    // 保存资源数据
    module.buildInfo.content = source;
    
    return state;
  }
  
  private shouldInline(size: number): boolean {
    if (typeof this.dataUrlCondition === 'function') {
      return this.dataUrlCondition({ size });
    }
    
    const maxSize = this.dataUrlCondition?.maxSize ?? 8096;
    return size < maxSize;
  }
}
```

## Parser 选项合并

```typescript
export class NormalModuleFactory {
  /**
   * 获取 Parser 选项
   */
  private getParserOptions(
    type: string,
    ruleSettings: any
  ): ParserOptions {
    // 默认选项
    const defaultOptions = this.getDefaultParserOptions(type);
    
    // 全局配置
    const globalOptions = this.options.parser?.[type] || {};
    
    // 规则配置
    const ruleOptions = ruleSettings?.parser || {};
    
    // 合并
    return {
      ...defaultOptions,
      ...globalOptions,
      ...ruleOptions,
    };
  }
  
  private getDefaultParserOptions(type: string): ParserOptions {
    switch (type) {
      case 'javascript/auto':
        return {
          commonjs: true,
          harmony: true,
          requireContext: true,
          dynamicImport: true,
        };
        
      case 'javascript/esm':
        return {
          commonjs: false,
          harmony: true,
          dynamicImport: true,
          topLevelAwait: true,
        };
        
      case 'javascript/dynamic':
        return {
          commonjs: true,
          harmony: false,
          dynamicImport: true,
        };
        
      default:
        return {};
    }
  }
}
```

## 总结

Parser 选择与创建是模块处理的关键：

**Parser 类型**：
- **JavascriptParser**：JavaScript 模块
- **JsonParser**：JSON 文件
- **AssetParser**：资源文件
- **WebAssemblyParser**：WASM 模块

**选择机制**：
1. 根据模块类型（由规则 `type` 决定）
2. 合并 Parser 选项
3. 通过 `createParser` 钩子创建
4. 通过 `parser` 钩子配置
5. 缓存复用

**关键点**：
- HookMap 按类型分发
- 缓存避免重复创建
- 选项合并支持灵活配置
- 钩子系统支持插件扩展

下一章我们将实现 Generator 选择与创建。
