# Source Map：源码映射的原理

当你在浏览器开发者工具中调试代码时，即使实际运行的是压缩混淆后的JavaScript，你依然能看到原始的TypeScript或ES6+源码。断点能准确停在你期望的位置，堆栈跟踪也显示的是原始代码的行号。这一切是如何实现的？答案就是Source Map——一种建立编译产物与源码之间映射关系的技术。

## Source Map的基本结构

`Source Map`是一个JSON格式的文件，它记录了编译后代码与原始源码之间的位置对应关系。让我们从一个简单的例子开始：

```javascript
// 原始代码 (hello.ts)
function greet(name: string): string {
  return `Hello, ${name}!`;
}
console.log(greet("World"));

// 编译后代码 (hello.js)
function greet(name){return"Hello, "+name+"!"}console.log(greet("World"));
//# sourceMappingURL=hello.js.map
```

对应的Source Map文件：

```json
{
  "version": 3,
  "file": "hello.js",
  "sourceRoot": "",
  "sources": ["hello.ts"],
  "names": ["greet", "name", "console", "log"],
  "mappings": "AAAA,SAASA,MAAMA,CAACC,IAAY,GAAG,OAAO,SAAWA,EAAK,CAAC,CAACC,QAAQC,IAAIH,MAAM,OAAO,CAAC"
}
```

每个字段的含义：

- **version**：Source Map规范版本，目前为3
- **file**：生成的文件名
- **sourceRoot**：源文件的根路径
- **sources**：原始源文件列表
- **names**：代码中使用的标识符名称
- **mappings**：位置映射信息，使用VLQ编码

## VLQ编码：压缩映射数据

`mappings`字段是Source Map的核心，它使用VLQ（Variable-Length Quantity）编码来压缩位置信息。每个映射段记录了四到五个值：

```
[生成列, 源文件索引, 源码行, 源码列, 名称索引]
```

VLQ编码使用Base64字符集，每个字符表示6位数据：

```javascript
// VLQ编码实现
const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function encodeVLQ(value) {
  let encoded = '';
  // 负数转换：最低位存储符号
  let vlq = value < 0 ? ((-value) << 1) + 1 : value << 1;
  
  do {
    // 每次取6位
    let digit = vlq & 0x1F;  // 取低5位
    vlq >>>= 5;
    
    // 如果还有更多数据，设置继续位
    if (vlq > 0) {
      digit |= 0x20;
    }
    
    encoded += BASE64_CHARS[digit];
  } while (vlq > 0);
  
  return encoded;
}

function decodeVLQ(encoded) {
  const values = [];
  let shift = 0;
  let value = 0;
  
  for (const char of encoded) {
    const digit = BASE64_CHARS.indexOf(char);
    const hasContinuation = digit & 0x20;
    
    value += (digit & 0x1F) << shift;
    
    if (hasContinuation) {
      shift += 5;
    } else {
      // 解析符号位
      const negative = value & 1;
      value >>>= 1;
      values.push(negative ? -value : value);
      
      // 重置
      value = 0;
      shift = 0;
    }
  }
  
  return values;
}

// 测试
console.log(encodeVLQ(0));    // "A"
console.log(encodeVLQ(1));    // "C"
console.log(encodeVLQ(-1));   // "D"
console.log(encodeVLQ(16));   // "gB"
console.log(decodeVLQ('AAgBC'));  // [0, 0, 16, 1]
```

VLQ编码的优势在于：小数值用单个字符表示，而大数值可以扩展为多个字符。由于源码中的位置变化通常较小，VLQ编码能显著减小Source Map的体积。

## 映射解析的实现

理解了VLQ编码后，我们可以实现完整的映射解析：

```javascript
class SourceMapConsumer {
  constructor(sourceMap) {
    this.sourceMap = typeof sourceMap === 'string' 
      ? JSON.parse(sourceMap) 
      : sourceMap;
    this.mappings = this.parseMappings();
  }
  
  parseMappings() {
    const mappings = [];
    const { mappings: encoded, sources, names } = this.sourceMap;
    
    // 按行分割（;分隔）
    const lines = encoded.split(';');
    
    // 累积值（映射使用相对位置）
    let generatedLine = 0;
    let sourceIndex = 0;
    let sourceLine = 0;
    let sourceColumn = 0;
    let nameIndex = 0;
    
    for (const line of lines) {
      generatedLine++;
      let generatedColumn = 0;
      
      if (!line) continue;
      
      // 按段分割（,分隔）
      const segments = line.split(',');
      
      for (const segment of segments) {
        if (!segment) continue;
        
        const values = this.decodeVLQ(segment);
        
        // 生成列是相对于当前行的
        generatedColumn += values[0];
        
        const mapping = {
          generatedLine,
          generatedColumn
        };
        
        if (values.length >= 4) {
          sourceIndex += values[1];
          sourceLine += values[2];
          sourceColumn += values[3];
          
          mapping.source = sources[sourceIndex];
          mapping.sourceLine = sourceLine + 1;  // 转为1-based
          mapping.sourceColumn = sourceColumn;
        }
        
        if (values.length >= 5) {
          nameIndex += values[4];
          mapping.name = names[nameIndex];
        }
        
        mappings.push(mapping);
      }
    }
    
    return mappings;
  }
  
  decodeVLQ(segment) {
    const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const values = [];
    let shift = 0;
    let value = 0;
    
    for (const char of segment) {
      const digit = BASE64.indexOf(char);
      value += (digit & 0x1F) << shift;
      
      if (digit & 0x20) {
        shift += 5;
      } else {
        values.push(value & 1 ? -(value >>> 1) : value >>> 1);
        value = 0;
        shift = 0;
      }
    }
    
    return values;
  }
  
  // 根据生成位置查找源码位置
  originalPositionFor(line, column) {
    // 二分查找
    let left = 0;
    let right = this.mappings.length - 1;
    let result = null;
    
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const mapping = this.mappings[mid];
      
      const cmp = this.comparePositions(
        { line, column },
        { line: mapping.generatedLine, column: mapping.generatedColumn }
      );
      
      if (cmp === 0) {
        return mapping;
      } else if (cmp > 0) {
        result = mapping;  // 候选结果
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }
    
    return result;
  }
  
  comparePositions(a, b) {
    if (a.line !== b.line) return a.line - b.line;
    return a.column - b.column;
  }
}

// 使用示例
const map = new SourceMapConsumer({
  version: 3,
  sources: ['app.ts'],
  names: ['add', 'a', 'b'],
  mappings: 'AAAA,SAASA,IAAIC,EAAGC'
});

const original = map.originalPositionFor(1, 10);
console.log(original);
// { generatedLine: 1, generatedColumn: 10, source: 'app.ts', sourceLine: 1, sourceColumn: 10 }
```

## V8中的Source Map支持

V8引擎内置了Source Map解析能力，主要用于调试和错误堆栈的源码映射。

### Inspector协议集成

V8的Inspector模块负责处理Source Map：

```javascript
// V8 Inspector中Source Map的处理流程
class V8SourceMapHandler {
  constructor() {
    this.sourceMaps = new Map();  // scriptId -> SourceMap
    this.sourceContents = new Map();
  }
  
  // 脚本解析时检测Source Map
  onScriptParsed(script) {
    const sourceMapURL = this.extractSourceMapURL(script.source);
    
    if (sourceMapURL) {
      // 异步加载Source Map
      this.loadSourceMap(sourceMapURL).then(sourceMap => {
        this.sourceMaps.set(script.id, sourceMap);
        
        // 通知调试器Source Map已加载
        this.notifySourceMapLoaded(script.id, sourceMap);
      });
    }
  }
  
  extractSourceMapURL(source) {
    // 匹配 //# sourceMappingURL=...
    const match = source.match(/\/\/[#@]\s*sourceMappingURL=(.+?)(?:\s|$)/);
    return match ? match[1] : null;
  }
  
  async loadSourceMap(url) {
    // 支持内联Base64格式
    if (url.startsWith('data:')) {
      return this.parseInlineSourceMap(url);
    }
    
    // 从网络或文件系统加载
    const response = await fetch(url);
    return response.json();
  }
  
  parseInlineSourceMap(dataURL) {
    // data:application/json;base64,eyJ2ZXJza...
    const base64 = dataURL.split(',')[1];
    const json = atob(base64);
    return JSON.parse(json);
  }
  
  // 转换堆栈帧位置
  mapStackFrame(frame) {
    const sourceMap = this.sourceMaps.get(frame.scriptId);
    if (!sourceMap) return frame;
    
    const consumer = new SourceMapConsumer(sourceMap);
    const original = consumer.originalPositionFor(frame.line, frame.column);
    
    if (original && original.source) {
      return {
        ...frame,
        url: original.source,
        lineNumber: original.sourceLine,
        columnNumber: original.sourceColumn,
        functionName: original.name || frame.functionName
      };
    }
    
    return frame;
  }
}
```

### 错误堆栈映射

V8的`Error.prepareStackTrace`机制允许自定义堆栈格式化，配合Source Map可以实现源码级堆栈：

```javascript
// 启用Source Map堆栈支持
function enableSourceMapSupport(sourceMaps) {
  const originalPrepareStackTrace = Error.prepareStackTrace;
  
  Error.prepareStackTrace = function(error, stack) {
    const mappedStack = stack.map(frame => {
      const fileName = frame.getFileName();
      const lineNumber = frame.getLineNumber();
      const columnNumber = frame.getColumnNumber();
      
      // 查找对应的Source Map
      const sourceMap = findSourceMap(sourceMaps, fileName);
      
      if (sourceMap) {
        const consumer = new SourceMapConsumer(sourceMap);
        const original = consumer.originalPositionFor(lineNumber, columnNumber);
        
        if (original && original.source) {
          return {
            toString() {
              const name = original.name || frame.getFunctionName() || '<anonymous>';
              return `    at ${name} (${original.source}:${original.sourceLine}:${original.sourceColumn})`;
            }
          };
        }
      }
      
      return {
        toString() {
          return `    at ${frame.toString()}`;
        }
      };
    });
    
    return error.toString() + '\n' + mappedStack.join('\n');
  };
}

function findSourceMap(sourceMaps, fileName) {
  // 尝试直接匹配
  if (sourceMaps.has(fileName)) {
    return sourceMaps.get(fileName);
  }
  
  // 尝试添加.map后缀
  const mapFileName = fileName + '.map';
  if (sourceMaps.has(mapFileName)) {
    return sourceMaps.get(mapFileName);
  }
  
  return null;
}
```

## Source Map的性能考量

### 加载时机

Source Map的加载策略影响调试体验和性能：

```javascript
// 延迟加载策略
class LazySourceMapLoader {
  constructor() {
    this.pending = new Map();  // url -> Promise
    this.loaded = new Map();   // url -> SourceMap
  }
  
  // 只在需要时加载
  async getSourceMap(url) {
    // 已加载
    if (this.loaded.has(url)) {
      return this.loaded.get(url);
    }
    
    // 正在加载
    if (this.pending.has(url)) {
      return this.pending.get(url);
    }
    
    // 开始加载
    const promise = this.loadAndParse(url);
    this.pending.set(url, promise);
    
    try {
      const sourceMap = await promise;
      this.loaded.set(url, sourceMap);
      return sourceMap;
    } finally {
      this.pending.delete(url);
    }
  }
  
  async loadAndParse(url) {
    const response = await fetch(url);
    const text = await response.text();
    return JSON.parse(text);
  }
}
```

### 索引优化

对于大型Source Map，构建索引能加速位置查询：

```javascript
class IndexedSourceMap {
  constructor(sourceMap) {
    this.sourceMap = sourceMap;
    this.lineIndex = this.buildLineIndex();
  }
  
  buildLineIndex() {
    const mappings = this.parseMappings();
    const index = new Map();
    
    for (const mapping of mappings) {
      const line = mapping.generatedLine;
      if (!index.has(line)) {
        index.set(line, []);
      }
      index.get(line).push(mapping);
    }
    
    // 每行内按列排序
    for (const [line, segments] of index) {
      segments.sort((a, b) => a.generatedColumn - b.generatedColumn);
    }
    
    return index;
  }
  
  originalPositionFor(line, column) {
    const lineSegments = this.lineIndex.get(line);
    if (!lineSegments) return null;
    
    // 在当前行内二分查找
    let left = 0;
    let right = lineSegments.length - 1;
    let result = null;
    
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const segment = lineSegments[mid];
      
      if (segment.generatedColumn === column) {
        return segment;
      } else if (segment.generatedColumn < column) {
        result = segment;
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }
    
    return result;
  }
  
  parseMappings() {
    // 复用之前的解析逻辑
    // ...
  }
}
```

### Source Map文件大小

Source Map可能比源码还大，压缩策略很重要：

```javascript
// 生成优化的Source Map
function generateOptimizedSourceMap(options = {}) {
  return {
    // 移除sourceContent可以显著减小体积
    sourcesContent: options.includeContent ? undefined : null,
    
    // 使用相对路径
    sourceRoot: options.sourceRoot || '',
    
    // 压缩names数组（去重）
    names: [...new Set(options.names)],
    
    // 合并相邻的相同映射
    mappings: compressMappings(options.mappings)
  };
}

function compressMappings(mappings) {
  // 移除冗余映射
  return mappings.filter((mapping, index, arr) => {
    if (index === 0) return true;
    
    const prev = arr[index - 1];
    
    // 如果源位置没变，可以省略
    return mapping.sourceLine !== prev.sourceLine ||
           mapping.sourceColumn !== prev.sourceColumn;
  });
}
```

## 调试工具集成

### Chrome DevTools的处理流程

当DevTools打开时，V8会发送脚本解析事件，包含Source Map信息：

```javascript
// DevTools Protocol 消息示例
{
  "method": "Debugger.scriptParsed",
  "params": {
    "scriptId": "42",
    "url": "bundle.js",
    "sourceMapURL": "bundle.js.map",
    "startLine": 0,
    "startColumn": 0,
    "endLine": 1000,
    "endColumn": 0
  }
}

// DevTools收到后加载Source Map
// 然后在UI中显示原始源码
```

### 断点映射

设置断点时，DevTools需要将源码位置映射到实际执行位置：

```javascript
class BreakpointManager {
  setBreakpoint(sourceURL, line, column) {
    // 查找对应的编译产物
    const generatedPosition = this.mapToGenerated(sourceURL, line, column);
    
    if (!generatedPosition) {
      console.warn('Cannot map breakpoint to generated code');
      return null;
    }
    
    // 在V8中设置实际断点
    return this.v8SetBreakpoint(
      generatedPosition.scriptId,
      generatedPosition.line,
      generatedPosition.column
    );
  }
  
  mapToGenerated(sourceURL, line, column) {
    // 查找包含此源文件的Source Map
    for (const [scriptId, sourceMap] of this.sourceMaps) {
      const sourceIndex = sourceMap.sources.indexOf(sourceURL);
      if (sourceIndex === -1) continue;
      
      // 在mappings中查找对应位置
      const consumer = new SourceMapConsumer(sourceMap);
      const generated = consumer.generatedPositionFor({
        source: sourceURL,
        line,
        column
      });
      
      if (generated) {
        return { scriptId, ...generated };
      }
    }
    
    return null;
  }
}
```

## 本章小结

Source Map是现代JavaScript调试的基础设施，它通过精巧的VLQ编码在编译产物和源码之间建立映射。

核心要点：

- **数据格式**：Source Map使用JSON格式，mappings字段通过VLQ编码压缩位置信息
- **VLQ编码**：使用Base64字符集，小数值单字符表示，支持可变长度扩展
- **相对位置**：映射使用相对位置而非绝对位置，进一步减小数据体积
- **V8集成**：通过Inspector协议支持Source Map，实现断点和堆栈的源码映射
- **性能优化**：延迟加载、索引构建、映射压缩是常用的优化策略

理解Source Map的工作原理，不仅帮助你更好地使用调试工具，也为构建自己的编译工具链提供了技术基础。下一章，我们将探索Chrome DevTools与V8之间的调试协议，了解调试器如何与JavaScript引擎通信。
