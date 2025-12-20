# V8性能分析工具

代码写出来能跑是第一步，跑得快才是功力的体现。V8提供了丰富的性能分析工具，帮助我们找到性能瓶颈。本章将介绍最实用的分析工具和方法。

## 性能分析工具概览

```
┌─────────────────────────────────────────────────────────────┐
│                   V8 性能分析工具链                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  CPU 分析：                                                  │
│  ├── --prof / --prof-process                               │
│  ├── --cpu-prof                                            │
│  ├── Chrome DevTools Profiler                              │
│  └── 0x / clinic.js                                        │
│                                                             │
│  内存分析：                                                  │
│  ├── --heap-prof                                           │
│  ├── v8.writeHeapSnapshot()                                │
│  ├── Chrome DevTools Memory                                │
│  └── memwatch-next                                         │
│                                                             │
│  优化分析：                                                  │
│  ├── --trace-opt / --trace-deopt                          │
│  ├── --trace-ic                                            │
│  └── --print-opt-code                                      │
│                                                             │
│  GC 分析：                                                   │
│  ├── --trace-gc                                            │
│  └── perf_hooks (gc observer)                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## CPU性能分析

### --prof 生成分析文件

```bash
# 运行并生成分析文件
node --prof app.js

# 生成 isolate-*.log 文件
# 处理日志生成可读报告
node --prof-process isolate-0x*.log > profile.txt
```

分析报告示例：

```
Statistical profiling result from isolate-0x10480000-v8.log

 [JavaScript]:
   ticks  total  nonlib   name
   1234   56.7%   60.2%  LazyCompile: *processData /app.js:10:21
    567   26.1%   27.7%  LazyCompile: *parseJSON /app.js:25:17
    234   10.8%   11.4%  LazyCompile: ~formatResult /app.js:40:23

 [C++]:
   ticks  total  nonlib   name
     89    4.1%    4.1%  v8::internal::StringTable::LookupString

 [Summary]:
   JavaScript: 2035  93.7%
          C++:  137   6.3%
```

### --cpu-prof 生成.cpuprofile

```bash
# 生成 Chrome DevTools 兼容的格式
node --cpu-prof --cpu-prof-interval=100 app.js

# 生成 CPU.*.cpuprofile 文件
# 可以直接在 Chrome DevTools 中打开
```

### 使用Chrome DevTools

```javascript
// 方法1：通过 inspect 启动
// node --inspect app.js

// 方法2：在代码中触发
const inspector = require('inspector');
const fs = require('fs');

const session = new inspector.Session();
session.connect();

// 开始采集
session.post('Profiler.enable', () => {
  session.post('Profiler.start', () => {
    // 执行要分析的代码
    runBenchmark();
    
    // 停止采集
    session.post('Profiler.stop', (err, { profile }) => {
      fs.writeFileSync('profile.cpuprofile', JSON.stringify(profile));
      console.log('Profile saved!');
    });
  });
});
```

### 使用0x（火焰图）

0x是一个优秀的火焰图生成工具：

```bash
# 安装
npm install -g 0x

# 运行分析
0x app.js

# 自动打开火焰图
```

火焰图解读：

```
┌─────────────────────────────────────────────────────────────┐
│                        火焰图解读                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  █████████████████████████████████████████ main            │
│  ████████████████████████████ processData                  │
│  █████████████████ parseJSON                               │
│  ████████ JSON.parse                                       │
│                                                             │
│  宽度 = 函数占用的 CPU 时间比例                               │
│  高度 = 调用栈深度                                           │
│  颜色 = 分类（JS/Native/GC）                                 │
│                                                             │
│  寻找"平顶山"= 性能瓶颈                                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 使用Clinic.js

Clinic.js提供了一套完整的诊断工具：

```bash
# 安装
npm install -g clinic

# Doctor：自动诊断
clinic doctor -- node app.js

# Flame：火焰图
clinic flame -- node app.js

# Bubbleprof：异步分析
clinic bubbleprof -- node app.js

# HeapProfiler：堆分析
clinic heapprofiler -- node app.js
```

## 内存分析

### 堆快照

```javascript
const v8 = require('v8');
const fs = require('fs');

// 生成堆快照
function takeHeapSnapshot(filename) {
  const snapshotPath = filename || `heap-${Date.now()}.heapsnapshot`;
  v8.writeHeapSnapshot(snapshotPath);
  console.log(`Heap snapshot written to ${snapshotPath}`);
  return snapshotPath;
}

// 使用示例
setInterval(() => {
  const usage = process.memoryUsage();
  console.log(`Heap used: ${(usage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  
  // 内存超过阈值时生成快照
  if (usage.heapUsed > 500 * 1024 * 1024) {
    takeHeapSnapshot();
  }
}, 10000);
```

### 使用inspector模块

```javascript
const inspector = require('inspector');
const fs = require('fs');

async function takeHeapSnapshot() {
  const session = new inspector.Session();
  session.connect();
  
  return new Promise((resolve, reject) => {
    const chunks = [];
    
    session.on('HeapProfiler.addHeapSnapshotChunk', (m) => {
      chunks.push(m.params.chunk);
    });
    
    session.post('HeapProfiler.takeHeapSnapshot', null, (err, r) => {
      if (err) return reject(err);
      
      const snapshotPath = `heap-${Date.now()}.heapsnapshot`;
      fs.writeFileSync(snapshotPath, chunks.join(''));
      console.log(`Snapshot saved: ${snapshotPath}`);
      
      session.disconnect();
      resolve(snapshotPath);
    });
  });
}
```

### 分析堆快照

在Chrome DevTools中：
1. 打开DevTools（F12）
2. 切换到Memory标签
3. Load加载.heapsnapshot文件

关注指标：
- **Shallow Size**：对象自身占用的内存
- **Retained Size**：对象及其引用链占用的总内存
- **Distance**：到GC Root的距离

### 对比快照

```javascript
// 生成多个快照进行对比
const snapshots = [];

async function compareMemory() {
  // 快照1：初始状态
  snapshots.push(await takeHeapSnapshot());
  
  // 执行操作
  runOperation();
  
  // 快照2：操作后状态
  snapshots.push(await takeHeapSnapshot());
  
  console.log('Compare snapshots in Chrome DevTools:');
  console.log(snapshots);
  // 在 DevTools 中选择 "Comparison" 视图
}
```

### --heap-prof

```bash
# 生成堆分配分析
node --heap-prof app.js

# 生成 Heap.*.heapprofile 文件
# 在 Chrome DevTools Memory 标签中加载
```

## 优化状态分析

### --trace-opt / --trace-deopt

```bash
# 追踪优化和反优化
node --trace-opt --trace-deopt app.js

# 输出示例：
# [marking 0x... for optimized recompilation, reason: hot and stable]
# [completed optimizing 0x... (optimized with TurboFan)]
# [deoptimizing: begin ... reason: wrong map]
```

反优化原因分析：

```javascript
// 常见反优化原因
function problematic(obj) {
  // wrong map: 对象结构不一致
  return obj.x + obj.y;
}

problematic({ x: 1, y: 2 });
problematic({ y: 2, x: 1 });  // 属性顺序不同，不同的隐藏类

// not a Smi: 期望小整数，收到其他类型
function add(a, b) {
  return a + b;
}

add(1, 2);
add(1.5, 2.5);  // 浮点数触发反优化

// out of bounds: 数组越界
function getElement(arr, i) {
  return arr[i];
}

const arr = [1, 2, 3];
getElement(arr, 10);  // 越界访问
```

### --trace-ic

追踪内联缓存状态：

```bash
node --trace-ic app.js 2>&1 | head -100

# 输出示例：
# [StoreIC in ~add at app.js:5:8 (0->1) at ... ]
# [LoadIC in ~get at app.js:10:12 (1->P) at ... ]
```

IC状态含义：

```
0 = uninitialized (未初始化)
1 = monomorphic (单态)
P = polymorphic (多态)
M = megamorphic (超多态)

单态最快，超多态最慢
```

### --print-opt-code

```bash
# 打印优化后的代码（汇编）
node --print-opt-code app.js

# 通常与 --code-comments 一起使用
node --print-opt-code --code-comments app.js
```

## GC分析

### --trace-gc

```bash
node --trace-gc app.js

# 输出示例：
# [44897:0x...] 1234 ms: Scavenge 4.2 (5.0) -> 3.8 (6.0) MB, 1.2 / 0.0 ms
# [44897:0x...] 5678 ms: Mark-sweep 20.5 (22.0) -> 18.2 (22.0) MB, 45.3 / 0.0 ms
```

详细GC日志：

```bash
node --trace-gc --trace-gc-verbose app.js

# 输出更多细节：
# - 各代空间使用情况
# - 增量标记信息
# - 外部内存
```

### perf_hooks GC观察

```javascript
const { PerformanceObserver } = require('perf_hooks');

const gcStats = {
  scavenge: { count: 0, totalTime: 0 },
  markSweep: { count: 0, totalTime: 0 }
};

const obs = new PerformanceObserver((list) => {
  list.getEntries().forEach(entry => {
    const kind = entry.detail.kind;
    const stats = kind === 1 ? gcStats.scavenge : gcStats.markSweep;
    
    stats.count++;
    stats.totalTime += entry.duration;
  });
});

obs.observe({ entryTypes: ['gc'] });

// 定期报告
setInterval(() => {
  console.log('GC Stats:');
  console.log(`  Scavenge: ${gcStats.scavenge.count} times, ${gcStats.scavenge.totalTime.toFixed(2)}ms total`);
  console.log(`  Mark-Sweep: ${gcStats.markSweep.count} times, ${gcStats.markSweep.totalTime.toFixed(2)}ms total`);
}, 30000);
```

## 实战分析流程

### 步骤1：发现问题

```javascript
// 简单的性能监控
const monitor = {
  startTime: process.hrtime.bigint(),
  requests: 0,
  
  recordRequest(duration) {
    this.requests++;
    // 记录慢请求
    if (duration > 100) {
      console.warn(`Slow request: ${duration}ms`);
    }
  },
  
  report() {
    const uptime = Number(process.hrtime.bigint() - this.startTime) / 1e9;
    console.log(`Uptime: ${uptime.toFixed(2)}s, Requests: ${this.requests}`);
    console.log(`Memory: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB`);
  }
};

setInterval(() => monitor.report(), 10000);
```

### 步骤2：收集数据

```bash
# 1. 基准测试
autocannon -c 100 -d 30 http://localhost:3000

# 2. 同时收集性能数据
node --prof --trace-gc app.js

# 或使用 clinic
clinic doctor -- node app.js
```

### 步骤3：分析瓶颈

```bash
# 处理性能日志
node --prof-process isolate-*.log > analysis.txt

# 查找热点函数
grep "LazyCompile:" analysis.txt | sort -t'%' -k2 -rn | head -20
```

### 步骤4：定位代码

```javascript
// 在代码中添加计时
const { performance } = require('perf_hooks');

function measureSync(name, fn) {
  const start = performance.now();
  const result = fn();
  const duration = performance.now() - start;
  console.log(`${name}: ${duration.toFixed(2)}ms`);
  return result;
}

async function measureAsync(name, fn) {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;
  console.log(`${name}: ${duration.toFixed(2)}ms`);
  return result;
}

// 使用
const data = measureSync('parseData', () => parseData(input));
const result = await measureAsync('queryDB', () => db.query(sql));
```

### 步骤5：验证优化

```javascript
// 优化前后对比
const Benchmark = require('benchmark');

const suite = new Benchmark.Suite();

suite
  .add('原始实现', () => {
    originalFunction(testData);
  })
  .add('优化实现', () => {
    optimizedFunction(testData);
  })
  .on('cycle', (event) => {
    console.log(String(event.target));
  })
  .on('complete', function() {
    console.log('Fastest is ' + this.filter('fastest').map('name'));
  })
  .run({ async: true });
```

## 常用V8参数速查

```bash
# 性能分析
--prof                    # 生成分析日志
--prof-process           # 处理分析日志
--cpu-prof               # 生成 CPU 分析文件
--cpu-prof-interval=N    # 采样间隔（微秒）
--heap-prof              # 生成堆分析文件

# 优化追踪
--trace-opt              # 追踪优化
--trace-deopt            # 追踪反优化
--trace-ic               # 追踪内联缓存
--print-opt-code         # 打印优化代码

# GC 追踪
--trace-gc               # GC 日志
--trace-gc-verbose       # 详细 GC 日志
--expose-gc              # 暴露 global.gc()

# 内存配置
--max-old-space-size=N   # 老生代大小（MB）
--max-semi-space-size=N  # 新生代半区大小（MB）

# 调试
--inspect                # 启用检查器
--inspect-brk            # 启用检查器并在首行暂停

# 查看所有参数
node --v8-options
```

## 小结

V8性能分析的核心工具和方法：

| 工具 | 用途 | 输出 |
|-----|-----|-----|
| --prof | CPU分析 | 文本报告 |
| --cpu-prof | CPU分析 | .cpuprofile |
| 0x | 火焰图 | HTML可视化 |
| clinic | 综合诊断 | 多种可视化 |
| --heap-prof | 堆分析 | .heapprofile |
| v8.writeHeapSnapshot | 堆快照 | .heapsnapshot |
| --trace-opt/deopt | 优化追踪 | 控制台日志 |
| --trace-gc | GC追踪 | 控制台日志 |

分析流程：
1. 监控 → 发现问题
2. 收集 → 生成分析数据
3. 分析 → 定位瓶颈
4. 优化 → 改进代码
5. 验证 → 确认效果

下一章，我们将探讨Node.js中的V8优化技巧，学习如何写出对V8更友好的代码。
