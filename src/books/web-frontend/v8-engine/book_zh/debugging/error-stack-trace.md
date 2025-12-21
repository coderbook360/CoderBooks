# Error 对象与堆栈跟踪：错误信息的生成

当JavaScript代码抛出错误时，控制台显示的堆栈跟踪信息从何而来？Error对象的stack属性是如何生成的？为什么有时候堆栈信息不完整或者难以理解？本章将揭示V8中错误处理和堆栈跟踪的底层实现机制。

## Error对象的结构

JavaScript中的Error对象：

```javascript
// Error对象结构
class ErrorObjectStructure {
  static demonstrate() {
    console.log('=== Error对象的属性 ===\n');
    
    const error = new Error('Something went wrong');
    
    console.log('标准属性：');
    console.log('  name:', error.name);
    console.log('  message:', error.message);
    console.log('');
    
    console.log('非标准但广泛支持的属性：');
    console.log('  stack:', error.stack ? '（有堆栈信息）' : '（无）');
    console.log('');
    
    console.log('Error的完整stack：');
    console.log(error.stack);
    console.log('');
  }
  
  static demonstrateErrorTypes() {
    console.log('=== 内置Error类型 ===\n');
    
    const errorTypes = [
      { name: 'Error', desc: '通用错误基类' },
      { name: 'SyntaxError', desc: '语法错误' },
      { name: 'TypeError', desc: '类型错误' },
      { name: 'ReferenceError', desc: '引用错误' },
      { name: 'RangeError', desc: '范围错误' },
      { name: 'URIError', desc: 'URI处理错误' },
      { name: 'EvalError', desc: 'eval()相关错误' },
      { name: 'AggregateError', desc: '多个错误的集合' }
    ];
    
    errorTypes.forEach(({ name, desc }) => {
      console.log(`  ${name}: ${desc}`);
    });
    console.log('');
  }
  
  static runAll() {
    this.demonstrate();
    this.demonstrateErrorTypes();
  }
}

ErrorObjectStructure.runAll();
```

## V8中Error对象的内部表示

V8如何存储Error对象：

```javascript
// V8 Error内部表示
class V8ErrorRepresentation {
  static demonstrate() {
    console.log('=== V8中的JSError对象 ===\n');
    
    console.log('Error对象的内部布局：');
    console.log(`
    JSError {
      // 继承自JSObject
      map: Map*,           // 隐藏类
      properties: Object,  // 属性存储
      elements: Object,    // 元素存储
      
      // Error特有字段
      stack_trace: Object, // 堆栈跟踪数据
      
      // JavaScript可见属性
      message: String,     // 错误消息
      // name通过原型链获取
    }
    `);
  }
  
  static demonstrateStackTraceStructure() {
    console.log('=== 堆栈跟踪数据结构 ===\n');
    
    console.log('V8内部的StackTrace结构：');
    console.log(`
    StackTrace {
      frames: Array<StackFrame>,
      
      StackFrame {
        function: Function,       // 函数对象
        receiver: Object,         // this值
        code: Code,               // 字节码或机器码
        offset: int,              // 代码偏移
        
        // 位置信息（惰性计算）
        script: Script,
        position: int,
        line: int,
        column: int
      }
    }
    `);
    
    console.log('关键点：');
    console.log('  • 堆栈帧信息在抛出时捕获');
    console.log('  • 位置信息惰性计算');
    console.log('  • stack字符串惰性生成\n');
  }
  
  static runAll() {
    this.demonstrate();
    this.demonstrateStackTraceStructure();
  }
}

V8ErrorRepresentation.runAll();
```

## 堆栈跟踪的捕获过程

Error创建时如何捕获堆栈：

```javascript
// 堆栈捕获过程
class StackCaptureProcess {
  static demonstrate() {
    console.log('=== 堆栈捕获时机 ===\n');
    
    console.log('堆栈在Error构造函数中捕获：');
    console.log(`
    function createError() {
      // 此时捕获堆栈
      return new Error('test');
    }
    
    function caller1() {
      return createError();
    }
    
    function caller2() {
      return caller1();
    }
    
    const err = caller2();
    console.log(err.stack);
    // Error: test
    //     at createError
    //     at caller1
    //     at caller2
    `);
  }
  
  static demonstrateCaptureStackTrace() {
    console.log('=== Error.captureStackTrace ===\n');
    
    console.log('V8特有的API：');
    console.log(`
    // 手动捕获堆栈到任意对象
    const obj = {};
    Error.captureStackTrace(obj);
    console.log(obj.stack);
    
    // 可以排除某些帧
    function MyError(message) {
      this.message = message;
      // 从堆栈中排除MyError函数本身
      Error.captureStackTrace(this, MyError);
    }
    `);
    
    // 演示
    function innerFunction() {
      const obj = {};
      Error.captureStackTrace(obj);
      return obj.stack;
    }
    
    function outerFunction() {
      return innerFunction();
    }
    
    console.log('实际捕获结果：');
    console.log(outerFunction());
    console.log('');
  }
  
  static runAll() {
    this.demonstrate();
    this.demonstrateCaptureStackTrace();
  }
}

StackCaptureProcess.runAll();
```

## Error.prepareStackTrace

自定义堆栈格式化：

```javascript
// prepareStackTrace
class PrepareStackTrace {
  static demonstrate() {
    console.log('=== Error.prepareStackTrace ===\n');
    
    console.log('可以自定义stack属性的格式：');
    console.log(`
    Error.prepareStackTrace = function(error, structuredStackTrace) {
      // error: Error对象
      // structuredStackTrace: CallSite对象数组
      
      return structuredStackTrace.map(site => {
        return {
          function: site.getFunctionName(),
          file: site.getFileName(),
          line: site.getLineNumber(),
          column: site.getColumnNumber()
        };
      });
    };
    `);
  }
  
  static demonstrateCallSiteMethods() {
    console.log('=== CallSite API ===\n');
    
    console.log('CallSite对象的方法：');
    const methods = [
      'getThis()',
      'getTypeName()',
      'getFunction()',
      'getFunctionName()',
      'getMethodName()',
      'getFileName()',
      'getLineNumber()',
      'getColumnNumber()',
      'getEvalOrigin()',
      'isToplevel()',
      'isEval()',
      'isNative()',
      'isConstructor()',
      'isAsync()',
      'isPromiseAll()',
      'getPromiseIndex()'
    ];
    
    methods.forEach(method => {
      console.log('  •', method);
    });
    console.log('');
  }
  
  static demonstrateCustomFormat() {
    console.log('=== 自定义格式示例 ===\n');
    
    // 保存原始prepareStackTrace
    const originalPrepare = Error.prepareStackTrace;
    
    // 自定义格式
    Error.prepareStackTrace = function(error, stack) {
      const lines = stack.map(site => {
        const fn = site.getFunctionName() || '<anonymous>';
        const file = site.getFileName() || '<unknown>';
        const line = site.getLineNumber();
        const col = site.getColumnNumber();
        return `  → ${fn} (${file}:${line}:${col})`;
      });
      return `${error.name}: ${error.message}\n${lines.join('\n')}`;
    };
    
    function testFunction() {
      return new Error('Custom formatted error');
    }
    
    const err = testFunction();
    console.log(err.stack);
    
    // 恢复原始
    Error.prepareStackTrace = originalPrepare;
    console.log('');
  }
  
  static runAll() {
    this.demonstrate();
    this.demonstrateCallSiteMethods();
    this.demonstrateCustomFormat();
  }
}

PrepareStackTrace.runAll();
```

## 堆栈跟踪深度限制

Error.stackTraceLimit：

```javascript
// 堆栈深度限制
class StackTraceLimit {
  static demonstrate() {
    console.log('=== Error.stackTraceLimit ===\n');
    
    console.log('默认值：10（V8默认）');
    console.log('当前值：', Error.stackTraceLimit);
    console.log('');
    
    console.log('修改限制：');
    console.log(`
    // 增加堆栈深度
    Error.stackTraceLimit = 50;
    
    // 无限深度（小心内存）
    Error.stackTraceLimit = Infinity;
    
    // 禁用堆栈跟踪
    Error.stackTraceLimit = 0;
    `);
  }
  
  static demonstrateDeepStack() {
    console.log('=== 深层调用栈演示 ===\n');
    
    // 保存原始值
    const originalLimit = Error.stackTraceLimit;
    
    // 递归函数
    function recursive(n) {
      if (n === 0) {
        return new Error('Bottom of stack');
      }
      return recursive(n - 1);
    }
    
    // 使用默认限制
    Error.stackTraceLimit = 10;
    const err1 = recursive(20);
    console.log('限制为10时的帧数:', err1.stack.split('\n').length - 1);
    
    // 增加限制
    Error.stackTraceLimit = 25;
    const err2 = recursive(20);
    console.log('限制为25时的帧数:', err2.stack.split('\n').length - 1);
    
    // 恢复
    Error.stackTraceLimit = originalLimit;
    console.log('');
  }
  
  static runAll() {
    this.demonstrate();
    this.demonstrateDeepStack();
  }
}

StackTraceLimit.runAll();
```

## 异步堆栈跟踪

异步代码中的堆栈处理：

```javascript
// 异步堆栈跟踪
class AsyncStackTrace {
  static demonstrate() {
    console.log('=== 异步堆栈跟踪的挑战 ===\n');
    
    console.log('问题：异步调用丢失调用者信息');
    console.log(`
    function caller() {
      setTimeout(() => {
        throw new Error('Async error');
        // 堆栈只显示setTimeout内部
        // 不显示caller函数
      }, 0);
    }
    `);
  }
  
  static demonstrateAsyncStackTraces() {
    console.log('=== V8的异步堆栈跟踪 ===\n');
    
    console.log('V8通过以下方式支持异步堆栈：');
    console.log('  • async/await自动保留调用链');
    console.log('  • Chrome DevTools可开启异步堆栈');
    console.log('  • Node.js有--async-stack-traces标志\n');
    
    console.log('async函数的堆栈：');
    console.log(`
    async function asyncCaller() {
      await asyncFunction();
    }
    
    async function asyncFunction() {
      throw new Error('Async error');
      // 堆栈会显示asyncCaller
    }
    `);
  }
  
  static demonstratePromiseStackTrace() {
    console.log('=== Promise错误的堆栈 ===\n');
    
    console.log('Promise中的错误处理：');
    console.log(`
    function promiseFunction() {
      return Promise.resolve()
        .then(() => {
          throw new Error('Promise error');
        })
        .catch(err => {
          console.log(err.stack);
          // 可能缺少上下文
        });
    }
    `);
    
    console.log('建议：使用async/await获得更好的堆栈\n');
  }
  
  static runAll() {
    this.demonstrate();
    this.demonstrateAsyncStackTraces();
    this.demonstratePromiseStackTrace();
  }
}

AsyncStackTrace.runAll();
```

## 性能影响

Error创建的性能考量：

```javascript
// 性能影响
class PerformanceImpact {
  static demonstrate() {
    console.log('=== Error创建的性能开销 ===\n');
    
    console.log('主要开销来源：');
    console.log('  • 遍历调用栈收集帧信息');
    console.log('  • 存储每一帧的元数据');
    console.log('  • 格式化stack字符串（惰性）\n');
    
    console.log('性能建议：');
    console.log('  • 避免在热路径创建Error');
    console.log('  • 考虑复用Error对象');
    console.log('  • 使用Error.stackTraceLimit = 0禁用\n');
  }
  
  static demonstrateBenchmark() {
    console.log('=== 性能对比 ===\n');
    
    const iterations = 10000;
    
    // 测试1：创建Error
    const start1 = performance.now();
    for (let i = 0; i < iterations; i++) {
      new Error('test');
    }
    const time1 = performance.now() - start1;
    
    // 测试2：禁用堆栈跟踪
    const originalLimit = Error.stackTraceLimit;
    Error.stackTraceLimit = 0;
    
    const start2 = performance.now();
    for (let i = 0; i < iterations; i++) {
      new Error('test');
    }
    const time2 = performance.now() - start2;
    
    Error.stackTraceLimit = originalLimit;
    
    console.log(`创建${iterations}个Error：`);
    console.log(`  带堆栈跟踪: ${time1.toFixed(2)}ms`);
    console.log(`  无堆栈跟踪: ${time2.toFixed(2)}ms`);
    console.log(`  性能提升: ${((time1 - time2) / time1 * 100).toFixed(1)}%\n`);
  }
  
  static demonstrateReusableError() {
    console.log('=== 复用Error对象 ===\n');
    
    console.log('在某些场景可以复用Error：');
    console.log(`
    // 用于控制流的Error可以复用
    const BREAK_ERROR = new Error('BREAK');
    
    function processItems(items) {
      try {
        items.forEach(item => {
          if (item === 'stop') {
            throw BREAK_ERROR;  // 复用，无新堆栈
          }
          process(item);
        });
      } catch (e) {
        if (e !== BREAK_ERROR) throw e;
      }
    }
    `);
    
    console.log('注意：这会丢失堆栈信息\n');
  }
  
  static runAll() {
    this.demonstrate();
    this.demonstrateBenchmark();
    this.demonstrateReusableError();
  }
}

PerformanceImpact.runAll();
```

## 自定义Error类

创建自定义错误类型：

```javascript
// 自定义Error类
class CustomErrorClasses {
  static demonstrate() {
    console.log('=== 创建自定义Error类 ===\n');
    
    // 基本的自定义Error
    class ValidationError extends Error {
      constructor(message) {
        super(message);
        this.name = 'ValidationError';
        
        // 确保堆栈跟踪正确
        if (Error.captureStackTrace) {
          Error.captureStackTrace(this, ValidationError);
        }
      }
    }
    
    // 带额外属性的Error
    class HttpError extends Error {
      constructor(statusCode, message) {
        super(message);
        this.name = 'HttpError';
        this.statusCode = statusCode;
        
        if (Error.captureStackTrace) {
          Error.captureStackTrace(this, HttpError);
        }
      }
    }
    
    // 测试
    try {
      throw new ValidationError('Invalid email format');
    } catch (e) {
      console.log('捕获:', e.name);
      console.log('消息:', e.message);
      console.log('是ValidationError:', e instanceof ValidationError);
      console.log('是Error:', e instanceof Error);
    }
    console.log('');
    
    try {
      throw new HttpError(404, 'Not Found');
    } catch (e) {
      console.log('捕获:', e.name);
      console.log('状态码:', e.statusCode);
    }
    console.log('');
  }
  
  static demonstrateBestPractices() {
    console.log('=== 自定义Error最佳实践 ===\n');
    
    console.log('1. 继承Error类');
    console.log('2. 设置正确的name属性');
    console.log('3. 使用captureStackTrace');
    console.log('4. 添加有意义的额外属性');
    console.log('5. 考虑toJSON方法（便于日志）\n');
    
    console.log('完整示例：');
    console.log(`
    class AppError extends Error {
      constructor(code, message, details = {}) {
        super(message);
        this.name = 'AppError';
        this.code = code;
        this.details = details;
        this.timestamp = new Date().toISOString();
        
        if (Error.captureStackTrace) {
          Error.captureStackTrace(this, AppError);
        }
      }
      
      toJSON() {
        return {
          name: this.name,
          code: this.code,
          message: this.message,
          details: this.details,
          timestamp: this.timestamp,
          stack: this.stack
        };
      }
    }
    `);
  }
  
  static runAll() {
    this.demonstrate();
    this.demonstrateBestPractices();
  }
}

CustomErrorClasses.runAll();
```

## 堆栈解析与格式化

解析和处理堆栈字符串：

```javascript
// 堆栈解析
class StackParsing {
  static demonstrate() {
    console.log('=== 解析堆栈字符串 ===\n');
    
    console.log('V8堆栈格式：');
    console.log(`
    Error: message
        at functionName (filename:line:column)
        at Object.method (filename:line:column)
        at new Constructor (filename:line:column)
        at async asyncFunction (filename:line:column)
    `);
    
    console.log('解析正则表达式：');
    console.log(`
    const V8_STACK_REGEX = /^\\s*at\\s+(?:(.+?)\\s+\\()?(.+?):(\\d+):(\\d+)\\)?$/;
    `);
  }
  
  static demonstrateParser() {
    console.log('=== 简单的堆栈解析器 ===\n');
    
    function parseStack(stack) {
      const lines = stack.split('\n');
      const frames = [];
      
      // 跳过第一行（错误消息）
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line.startsWith('at ')) continue;
        
        // 解析帧
        const match = line.match(/^at\s+(?:(.+?)\s+\()?(.+?):(\d+):(\d+)\)?$/);
        if (match) {
          frames.push({
            function: match[1] || '<anonymous>',
            file: match[2],
            line: parseInt(match[3]),
            column: parseInt(match[4])
          });
        }
      }
      
      return frames;
    }
    
    // 测试
    function testFunc() {
      return new Error('test');
    }
    
    const error = testFunc();
    const frames = parseStack(error.stack);
    
    console.log('解析结果：');
    frames.slice(0, 3).forEach((frame, i) => {
      console.log(`  ${i}: ${frame.function} @ ${frame.file}:${frame.line}`);
    });
    console.log('');
  }
  
  static runAll() {
    this.demonstrate();
    this.demonstrateParser();
  }
}

StackParsing.runAll();
```

## 本章小结

本章探讨了V8中Error对象和堆栈跟踪的实现机制。核心要点包括：

1. **Error对象结构**：包含name、message和stack属性，V8内部存储堆栈帧数组。

2. **堆栈捕获**：在Error构造函数中捕获当前调用栈，Error.captureStackTrace可手动捕获。

3. **prepareStackTrace**：V8特有API，允许自定义stack属性的格式，可访问CallSite对象获取详细信息。

4. **stackTraceLimit**：控制堆栈深度，默认10，可调整以获取更多或更少信息。

5. **异步堆栈**：传统回调丢失调用链，async/await保留完整异步堆栈。

6. **性能影响**：Error创建开销主要在堆栈收集，热路径应避免频繁创建Error。

7. **自定义Error**：继承Error类，设置name，使用captureStackTrace确保正确堆栈。

理解错误处理机制，能帮助你写出更好的错误处理代码，创建更有用的自定义错误类型。下一章我们将探讨try...catch的性能影响。
