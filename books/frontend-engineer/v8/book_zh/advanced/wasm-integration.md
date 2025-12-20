# WebAssembly 集成：JS 与 WASM 的互操作

WebAssembly（WASM）为JavaScript带来了接近原生的执行性能。在V8中，WASM模块与JavaScript共享同一个运行时环境，两者可以无缝互操作。本章将探讨V8如何执行WASM代码，以及JavaScript与WASM之间的数据交换机制。

## WebAssembly的基本概念

`WebAssembly`是一种低级的二进制指令格式，设计用于在浏览器中高效执行：

```javascript
// 加载和实例化WASM模块
async function loadWasm() {
  // 方式1：从URL加载
  const response = await fetch('module.wasm');
  const buffer = await response.arrayBuffer();
  const module = await WebAssembly.compile(buffer);
  const instance = await WebAssembly.instantiate(module);
  
  // 方式2：一步完成
  const { instance: inst } = await WebAssembly.instantiateStreaming(
    fetch('module.wasm')
  );
  
  return instance;
}

// WASM函数调用
const instance = await loadWasm();
const result = instance.exports.add(1, 2);
console.log(result);  // 3
```

WASM模块结构：

```
┌─────────────────────────────────────┐
│          WASM Module                │
├─────────────────────────────────────┤
│  Types Section     │ 函数签名定义   │
├─────────────────────────────────────┤
│  Import Section    │ 导入声明       │
├─────────────────────────────────────┤
│  Function Section  │ 函数索引       │
├─────────────────────────────────────┤
│  Table Section     │ 间接调用表     │
├─────────────────────────────────────┤
│  Memory Section    │ 线性内存       │
├─────────────────────────────────────┤
│  Export Section    │ 导出声明       │
├─────────────────────────────────────┤
│  Code Section      │ 函数字节码     │
├─────────────────────────────────────┤
│  Data Section      │ 初始化数据     │
└─────────────────────────────────────┘
```

## V8中的WASM编译流程

V8使用两阶段编译策略处理WASM：

```
WASM字节码
    │
    ▼
┌─────────────────┐
│   Liftoff       │  基线编译器（快速生成代码）
└─────────────────┘
    │
    ▼
┌─────────────────┐
│  执行基线代码    │  立即可运行
└─────────────────┘
    │ (后台并行)
    ▼
┌─────────────────┐
│   TurboFan      │  优化编译器（生成高效代码）
└─────────────────┘
    │
    ▼
┌─────────────────┐
│  执行优化代码    │  替换基线代码
└─────────────────┘
```

### Liftoff基线编译器

Liftoff是V8的WASM基线编译器，特点是编译速度快：

```javascript
// Liftoff编译特点：
// 1. 单遍编译（One-pass compilation）
// 2. 简单的寄存器分配
// 3. 不做复杂优化
// 4. 启动时间短

// 模拟Liftoff的简单代码生成
class LiftoffCompiler {
  compile(wasmFunction) {
    const instructions = [];
    
    for (const op of wasmFunction.body) {
      switch (op.type) {
        case 'local.get':
          instructions.push(`load_local ${op.index}`);
          break;
        case 'i32.add':
          instructions.push('i32_add');
          break;
        case 'i32.const':
          instructions.push(`push_const ${op.value}`);
          break;
        // 直接映射，不做优化
      }
    }
    
    return instructions;
  }
}
```

### TurboFan优化编译

TurboFan在后台对热点WASM函数进行优化：

```javascript
// TurboFan优化WASM的策略
class TurboFanWasmOptimizer {
  optimize(wasmFunction) {
    // 1. 构建SSA形式的IR
    const ir = this.buildIR(wasmFunction);
    
    // 2. 应用优化
    this.inlineSmallFunctions(ir);
    this.eliminateDeadCode(ir);
    this.foldConstants(ir);
    this.optimizeLoops(ir);
    
    // 3. 寄存器分配
    this.allocateRegisters(ir);
    
    // 4. 生成机器码
    return this.generateMachineCode(ir);
  }
}
```

## JavaScript与WASM的数据交换

### 数值类型传递

WASM支持四种数值类型，与JavaScript的互操作：

```javascript
// WASM数值类型
// i32: 32位整数
// i64: 64位整数（JS中用BigInt）
// f32: 32位浮点数
// f64: 64位浮点数

// 假设WASM导出以下函数：
// (func (export "add_i32") (param i32 i32) (result i32) ...)
// (func (export "add_i64") (param i64 i64) (result i64) ...)
// (func (export "add_f64") (param f64 f64) (result f64) ...)

// JavaScript调用
const { add_i32, add_i64, add_f64 } = instance.exports;

// i32: JS数字自动转换
console.log(add_i32(1, 2));  // 3

// i64: 需要使用BigInt
console.log(add_i64(1n, 2n));  // 3n

// f64: JS数字直接传递
console.log(add_f64(1.5, 2.5));  // 4.0
```

### 线性内存共享

WASM使用线性内存（Linear Memory）存储复杂数据：

```javascript
// 创建共享内存
const memory = new WebAssembly.Memory({
  initial: 1,    // 初始1页（64KB）
  maximum: 10    // 最大10页
});

// JavaScript视图
const buffer = memory.buffer;
const uint8View = new Uint8Array(buffer);
const int32View = new Int32Array(buffer);
const float64View = new Float64Array(buffer);

// 传递字符串到WASM
function passStringToWasm(str, instance) {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  
  const memory = instance.exports.memory;
  const ptr = instance.exports.alloc(bytes.length + 1);
  
  const view = new Uint8Array(memory.buffer);
  view.set(bytes, ptr);
  view[ptr + bytes.length] = 0;  // null终止
  
  return ptr;
}

// 从WASM读取字符串
function readStringFromWasm(ptr, instance) {
  const memory = instance.exports.memory;
  const view = new Uint8Array(memory.buffer);
  
  let end = ptr;
  while (view[end] !== 0) end++;
  
  const bytes = view.slice(ptr, end);
  return new TextDecoder().decode(bytes);
}
```

### 数组传递

```javascript
// 传递数组到WASM
function passArrayToWasm(arr, instance) {
  const { memory, alloc } = instance.exports;
  
  // 分配内存
  const ptr = alloc(arr.length * 4);  // 假设i32数组
  
  // 复制数据
  const view = new Int32Array(memory.buffer, ptr, arr.length);
  view.set(arr);
  
  return { ptr, length: arr.length };
}

// 从WASM获取数组
function getArrayFromWasm(ptr, length, instance) {
  const { memory } = instance.exports;
  const view = new Int32Array(memory.buffer, ptr, length);
  return Array.from(view);
}

// 使用示例
const arr = [1, 2, 3, 4, 5];
const { ptr, length } = passArrayToWasm(arr, instance);

// WASM处理数组
instance.exports.processArray(ptr, length);

// 获取结果
const result = getArrayFromWasm(ptr, length, instance);
```

## JavaScript函数导入

WASM可以调用JavaScript函数：

```javascript
// 定义导入对象
const importObject = {
  env: {
    // WASM可以调用的JS函数
    consoleLog: (value) => console.log('WASM says:', value),
    
    getTime: () => Date.now(),
    
    // 回调函数
    callback: (result) => {
      // 处理WASM的计算结果
      console.log('Callback with:', result);
    }
  },
  
  // 内存导入
  js: {
    memory: new WebAssembly.Memory({ initial: 1 })
  }
};

// 实例化时传入导入对象
const instance = await WebAssembly.instantiate(module, importObject);

// WASM内部可以这样调用：
// (import "env" "consoleLog" (func $log (param i32)))
// (call $log (i32.const 42))
```

## 性能对比与优化

### JS vs WASM性能测试

```javascript
// 计算密集型任务对比
async function benchmarkFibonacci() {
  // JavaScript实现
  function jsFib(n) {
    if (n <= 1) return n;
    return jsFib(n - 1) + jsFib(n - 2);
  }
  
  // 加载WASM实现
  const wasmCode = new Uint8Array([
    0x00, 0x61, 0x73, 0x6d,  // WASM magic
    // ... WASM字节码
  ]);
  const wasmModule = await WebAssembly.compile(wasmCode);
  const wasmInstance = await WebAssembly.instantiate(wasmModule);
  const wasmFib = wasmInstance.exports.fib;
  
  const n = 35;
  
  // 测试JavaScript
  const jsStart = performance.now();
  const jsResult = jsFib(n);
  const jsTime = performance.now() - jsStart;
  
  // 测试WASM
  const wasmStart = performance.now();
  const wasmResult = wasmFib(n);
  const wasmTime = performance.now() - wasmStart;
  
  console.log(`JavaScript: ${jsResult} in ${jsTime.toFixed(2)}ms`);
  console.log(`WebAssembly: ${wasmResult} in ${wasmTime.toFixed(2)}ms`);
  console.log(`WASM speedup: ${(jsTime / wasmTime).toFixed(2)}x`);
}

// 典型结果：
// JavaScript: 9227465 in 150ms
// WebAssembly: 9227465 in 45ms
// WASM speedup: 3.33x
```

### 减少JS-WASM边界开销

```javascript
// 反模式：频繁跨边界调用
function badPattern(instance, data) {
  let sum = 0;
  for (const item of data) {
    sum += instance.exports.process(item);  // 每次迭代都跨边界
  }
  return sum;
}

// 推荐：批量处理
function goodPattern(instance, data) {
  const { memory, alloc, free, processBatch } = instance.exports;
  
  // 一次性传递所有数据
  const ptr = alloc(data.length * 4);
  const view = new Float32Array(memory.buffer, ptr, data.length);
  view.set(data);
  
  // 单次WASM调用处理所有数据
  const result = processBatch(ptr, data.length);
  
  free(ptr);
  return result;
}

// 性能对比
function benchmark() {
  const data = new Array(10000).fill(0).map(() => Math.random());
  
  console.time('bad');
  badPattern(instance, data);
  console.timeEnd('bad');   // ~100ms
  
  console.time('good');
  goodPattern(instance, data);
  console.timeEnd('good');  // ~5ms
}
```

### 内存管理优化

```javascript
// WASM内存池管理
class WasmMemoryPool {
  constructor(instance) {
    this.memory = instance.exports.memory;
    this.alloc = instance.exports.alloc;
    this.free = instance.exports.free;
    this.pool = [];
  }
  
  acquire(size) {
    // 查找合适的已释放块
    for (let i = 0; i < this.pool.length; i++) {
      if (this.pool[i].size >= size) {
        const block = this.pool.splice(i, 1)[0];
        return block.ptr;
      }
    }
    
    // 没有合适的，分配新块
    return this.alloc(size);
  }
  
  release(ptr, size) {
    // 放回池中而非立即释放
    this.pool.push({ ptr, size });
    
    // 池太大时清理
    if (this.pool.length > 100) {
      const oldest = this.pool.shift();
      this.free(oldest.ptr);
    }
  }
}
```

## WASM异常处理

WASM的异常处理与JavaScript的集成：

```javascript
// WASM异常传播到JS
try {
  instance.exports.mightThrow();
} catch (e) {
  if (e instanceof WebAssembly.Exception) {
    console.log('WASM exception:', e.getArg(exceptionTag, 0));
  } else {
    throw e;
  }
}

// 从JS抛出异常到WASM
const importObject = {
  env: {
    throwError: () => {
      throw new Error('Error from JavaScript');
    }
  }
};

// WASM中调用throwError会导致trap
// 需要在JS层捕获处理
```

## 实际应用场景

### 图像处理

```javascript
// 图像灰度化的WASM实现
async function grayscaleImage(imageData) {
  const { width, height, data } = imageData;
  const instance = await loadWasmModule();
  
  // 传递图像数据
  const ptr = instance.exports.alloc(data.length);
  const view = new Uint8ClampedArray(
    instance.exports.memory.buffer, 
    ptr, 
    data.length
  );
  view.set(data);
  
  // WASM处理
  instance.exports.grayscale(ptr, width, height);
  
  // 获取结果
  const result = new Uint8ClampedArray(data.length);
  result.set(view);
  
  instance.exports.free(ptr);
  
  return new ImageData(result, width, height);
}
```

### 加密计算

```javascript
// SHA-256哈希计算
async function sha256(data) {
  const instance = await loadCryptoWasm();
  
  // 传递数据
  const inputPtr = passDataToWasm(data, instance);
  const outputPtr = instance.exports.alloc(32);  // SHA-256输出32字节
  
  // 计算哈希
  instance.exports.sha256(inputPtr, data.length, outputPtr);
  
  // 读取结果
  const hashBytes = new Uint8Array(
    instance.exports.memory.buffer, 
    outputPtr, 
    32
  );
  
  return Array.from(hashBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
```

## 本章小结

WebAssembly为JavaScript带来了高性能的计算能力，V8通过Liftoff和TurboFan两阶段编译实现了启动速度与执行效率的平衡。

核心要点：

- **编译策略**：Liftoff快速生成基线代码，TurboFan后台优化热点函数
- **数据交换**：数值类型直接传递，复杂数据通过线性内存共享
- **边界开销**：JS-WASM跨边界调用有开销，应批量处理减少调用次数
- **内存管理**：WASM使用线性内存，需要手动管理分配和释放
- **适用场景**：计算密集型任务如图像处理、加密、物理模拟等

理解V8中WASM的实现机制，能帮助你在合适的场景利用WASM提升应用性能。下一章，我们将探索SharedArrayBuffer与Atomics，了解JavaScript中的多线程内存共享机制。
