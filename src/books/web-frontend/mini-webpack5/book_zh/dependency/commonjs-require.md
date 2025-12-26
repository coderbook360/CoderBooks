---
sidebar_position: 85
title: "CommonJsRequireDependency CJS 依赖"
---

# CommonJsRequireDependency CJS 依赖

CommonJsRequireDependency 系列处理 CommonJS 模块语法，是 Node.js 风格模块的核心依赖类型。

## CommonJS 语法

### 基本形式

```javascript
// 1. require 导入
const foo = require('./foo');

// 2. require.resolve
const path = require.resolve('./foo');

// 3. module.exports 导出
module.exports = { foo: 1 };
module.exports.bar = 2;

// 4. exports 简写
exports.foo = 1;

// 5. 条件 require
if (condition) {
  const lazy = require('./lazy');
}

// 6. 动态 require
const mod = require(`./modules/${name}`);
```

### 对应的依赖类型

```
CommonJS 语句
├── CommonJsRequireDependency (require)
├── CommonJsRequireContextDependency (动态 require)
├── RequireResolveDependency (require.resolve)
├── CommonJsExportsDependency (module.exports)
└── CommonJsExportRequireDependency (module.exports = require)
```

## CommonJsRequireDependency

### 类实现

```typescript
class CommonJsRequireDependency extends ModuleDependency {
  range: [number, number];
  
  // 是否在 call 表达式中
  call: boolean;
  
  // 是否在对象解构中
  destructuring: boolean;
  
  constructor(request: string, range: [number, number]) {
    super(request);
    this.range = range;
    this.call = false;
    this.destructuring = false;
  }
  
  get type(): string {
    return 'cjs require';
  }
  
  get category(): string {
    return 'commonjs';
  }
  
  // CJS 导入整个模块对象
  getReferencedExports(moduleGraph: ModuleGraph): string[][] {
    return Dependency.EXPORTS_OBJECT_REFERENCED;
  }
}
```

### 解析插件

```typescript
class CommonJsRequireDependencyParserPlugin {
  apply(parser: JavascriptParser): void {
    // 处理 require 调用
    parser.hooks.call
      .for('require')
      .tap('CommonJsRequireDependencyParserPlugin', (expression) => {
        const arg = expression.arguments[0];
        if (!arg) return;
        
        const evaluated = parser.evaluateExpression(arg);
        
        if (evaluated.isString()) {
          // 静态 require
          const dep = new CommonJsRequireDependency(
            evaluated.string!,
            expression.range
          );
          dep.loc = expression.loc;
          dep.call = true;
          
          parser.state.module.addDependency(dep);
          
          return true;
        }
        
        // 动态 require
        if (evaluated.isTemplateString() || evaluated.isConditional()) {
          return this.handleDynamicRequire(parser, expression, evaluated);
        }
      });
  }
}
```

## CommonJsRequireContextDependency

### 动态 require 处理

```typescript
class CommonJsRequireContextDependency extends ContextDependency {
  // 正则匹配模式
  regExp: RegExp;
  
  // 请求模式
  request: string;
  
  constructor(
    options: ContextDependencyOptions,
    range: [number, number]
  ) {
    super(options);
    this.range = range;
  }
  
  get type(): string {
    return 'cjs require context';
  }
  
  get category(): string {
    return 'commonjs';
  }
}
```

### 解析动态 require

```typescript
class CommonJsRequireDependencyParserPlugin {
  handleDynamicRequire(
    parser: JavascriptParser,
    expression: CallExpression,
    evaluated: BasicEvaluatedExpression
  ): boolean {
    const { context, prefix, postfix, regExp } = 
      this.extractContextInfo(evaluated);
    
    const dep = new CommonJsRequireContextDependency(
      {
        request: context,
        regExp,
        recursive: true,
        mode: 'sync',
      },
      expression.range
    );
    dep.loc = expression.loc;
    
    parser.state.module.addDependency(dep);
    
    return true;
  }
  
  extractContextInfo(evaluated: BasicEvaluatedExpression) {
    // 分析模板字符串
    // `./modules/${name}` => context: './modules', regExp: /^.*$/
    
    if (evaluated.isTemplateString()) {
      const quasis = evaluated.quasis!;
      const prefix = quasis[0].string;
      const postfix = quasis[quasis.length - 1].string;
      
      const context = prefix.replace(/[^/]+$/, '');
      const regExp = new RegExp(
        `^${this.escapeRegExp(prefix.slice(context.length))}` +
        `.*` +
        `${this.escapeRegExp(postfix)}$`
      );
      
      return { context, prefix, postfix, regExp };
    }
    
    return {
      context: '.',
      prefix: '',
      postfix: '',
      regExp: /^.*$/,
    };
  }
}
```

## RequireResolveDependency

### require.resolve 处理

```typescript
class RequireResolveDependency extends ModuleDependency {
  range: [number, number];
  
  // 是否是弱依赖（不会导致错误）
  weak: boolean = false;
  
  constructor(request: string, range: [number, number]) {
    super(request);
    this.range = range;
  }
  
  get type(): string {
    return 'require.resolve';
  }
  
  get category(): string {
    return 'commonjs';
  }
  
  // require.resolve 不引用任何导出
  getReferencedExports(): string[][] {
    return Dependency.NO_EXPORTS_REFERENCED;
  }
}
```

### 代码生成

```typescript
class RequireResolveDependencyTemplate {
  apply(
    dep: RequireResolveDependency,
    source: ReplaceSource,
    runtime: RuntimeState
  ): void {
    const module = runtime.moduleGraph.getModule(dep);
    
    if (!module) {
      if (dep.weak) {
        // 弱依赖返回 false
        source.replace(dep.range[0], dep.range[1] - 1, 'false');
        return;
      }
      throw new Error(`Module not found: ${dep.request}`);
    }
    
    // 返回模块 ID
    const moduleId = runtime.chunkGraph.getModuleId(module);
    source.replace(
      dep.range[0],
      dep.range[1] - 1,
      JSON.stringify(moduleId)
    );
  }
}
```

## CommonJsExportsDependency

### exports 导出处理

```typescript
class CommonJsExportsDependency extends NullDependency {
  // 导出的名称
  name: string | null;  // null 表示 module.exports =
  
  // 范围
  range: [number, number];
  
  // 基础对象（module.exports 或 exports）
  base: 'module.exports' | 'exports';
  
  constructor(
    range: [number, number],
    valueRange: [number, number],
    base: 'module.exports' | 'exports',
    name: string | null
  ) {
    super();
    this.range = range;
    this.base = base;
    this.name = name;
  }
  
  get type(): string {
    return 'cjs exports';
  }
  
  // 返回提供的导出
  getExports(moduleGraph: ModuleGraph): ExportsSpec | null {
    if (this.name === null) {
      // module.exports = {...}
      // 无法静态分析
      return {
        exports: true,  // 表示导出整个对象
        dependencies: undefined,
      };
    }
    
    return {
      exports: [
        {
          name: this.name,
          canMangle: true,
        },
      ],
      dependencies: undefined,
    };
  }
}
```

### 解析 exports

```typescript
class CommonJsExportsParserPlugin {
  apply(parser: JavascriptParser): void {
    // module.exports = value
    parser.hooks.assignMemberChain
      .for('module')
      .tap('CommonJsExportsParserPlugin', (expression, members) => {
        if (members.length !== 1 || members[0] !== 'exports') return;
        
        const dep = new CommonJsExportsDependency(
          expression.range,
          expression.right.range,
          'module.exports',
          null
        );
        
        parser.state.module.addDependency(dep);
        
        return true;
      });
    
    // exports.foo = value 或 module.exports.foo = value
    parser.hooks.assignMemberChain
      .for('exports')
      .tap('CommonJsExportsParserPlugin', (expression, members) => {
        if (members.length === 0) return;
        
        const name = members[0];
        
        const dep = new CommonJsExportsDependency(
          expression.range,
          expression.right.range,
          'exports',
          name
        );
        
        parser.state.module.addDependency(dep);
        
        return true;
      });
  }
}
```

## CommonJsExportRequireDependency

### 重导出模式

```javascript
// 常见模式：CJS 重导出
module.exports = require('./other');

// 合并重导出
module.exports = {
  ...require('./a'),
  ...require('./b'),
};
```

```typescript
class CommonJsExportRequireDependency extends ModuleDependency {
  range: [number, number];
  
  // 导出的名称（数组表示多个）
  names: string[] | null;
  
  constructor(
    request: string,
    range: [number, number],
    names: string[] | null
  ) {
    super(request);
    this.range = range;
    this.names = names;
  }
  
  get type(): string {
    return 'cjs export require';
  }
  
  // 返回提供的导出（继承自被 require 的模块）
  getExports(moduleGraph: ModuleGraph): ExportsSpec | null {
    const connection = moduleGraph.getConnection(this);
    if (!connection) return null;
    
    const module = connection.module;
    if (!module) return null;
    
    const exportsInfo = moduleGraph.getExportsInfo(module);
    
    return {
      exports: Array.from(exportsInfo.orderedExports).map(info => ({
        name: info.name,
        canMangle: info.canMangleProvide,
      })),
      dependencies: [module],
    };
  }
}
```

## ESM 互操作

### __esModule 标记

```typescript
class CommonJsPlugin {
  apply(compiler: Compiler): void {
    compiler.hooks.compilation.tap(
      'CommonJsPlugin',
      (compilation) => {
        // 处理 ESM 导入 CJS 模块
        compilation.hooks.seal.tap('CommonJsPlugin', () => {
          for (const module of compilation.modules) {
            if (this.isCommonJsModule(module)) {
              // 添加 __esModule 检测
              this.addEsModuleInterop(module, compilation);
            }
          }
        });
      }
    );
  }
  
  addEsModuleInterop(module: Module, compilation: Compilation): void {
    const exportsInfo = compilation.moduleGraph.getExportsInfo(module);
    
    // 设置 __esModule 导出
    const esModuleExport = exportsInfo.getExportInfo('__esModule');
    esModuleExport.provided = true;
  }
}
```

### 运行时转换

```typescript
// __webpack_require__.n 函数
// 获取默认导出（ESM 互操作）
__webpack_require__.n = (module) => {
  var getter = module && module.__esModule
    ? () => module['default']
    : () => module;
  __webpack_require__.d(getter, { a: getter });
  return getter;
};

// 使用示例
// import foo from './cjs-module'
// 转换为
var _cjs_module__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__('./cjs-module.js');
var _cjs_module__WEBPACK_IMPORTED_MODULE_0___default = __webpack_require__.n(_cjs_module__WEBPACK_IMPORTED_MODULE_0__);
```

## 代码生成

### CommonJsRequireDependencyTemplate

```typescript
class CommonJsRequireDependencyTemplate {
  apply(
    dep: CommonJsRequireDependency,
    source: ReplaceSource,
    runtime: RuntimeState
  ): void {
    const module = runtime.moduleGraph.getModule(dep);
    
    if (!module) {
      // 模块未找到，替换为错误
      source.replace(
        dep.range[0],
        dep.range[1] - 1,
        `__webpack_require__.missing(${JSON.stringify(dep.request)})`
      );
      return;
    }
    
    // 生成 require 调用
    const moduleId = runtime.chunkGraph.getModuleId(module);
    
    source.replace(
      dep.range[0],
      dep.range[1] - 1,
      `__webpack_require__(${JSON.stringify(moduleId)})`
    );
  }
}
```

### 完整示例

```javascript
// 源代码
const foo = require('./foo');
const { bar } = require('./bar');
module.exports = { foo, bar };

// 生成代码
const foo = __webpack_require__("./foo.js");
const { bar } = __webpack_require__("./bar.js");
module.exports = { foo, bar };
```

## 总结

CommonJsRequireDependency 系列的核心要点：

**require 处理**：
- 静态 require 创建 CommonJsRequireDependency
- 动态 require 创建 ContextDependency
- require.resolve 返回模块 ID

**exports 处理**：
- module.exports 和 exports 别名
- 命名导出和整体导出
- 重导出模式

**ESM 互操作**：
- __esModule 标记检测
- __webpack_require__.n 默认导出处理
- 混合模块兼容

**代码生成**：
- require 转换为 __webpack_require__
- 保持 CJS 语义
- 模块 ID 替换

**下一章**：我们将学习 DependencyTemplate 模板系统。
