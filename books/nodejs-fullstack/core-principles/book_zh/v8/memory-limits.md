# V8内存限制与配置

V8堆内存不是无限的。默认情况下，Node.js的可用堆内存被限制在一定范围内。理解这些限制的来源和如何调整它们，是处理大数据量应用的关键。

## 默认内存限制

V8的默认堆内存限制取决于系统：

```
┌─────────────────────────────────────────────────────────────┐
│                    V8 默认堆内存限制                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   64位系统：约 4GB（新版本可能更高）                           │
│   32位系统：约 1GB                                           │
│                                                             │
│   注：这是堆内存限制，不包括：                                  │
│   - 代码区                                                   │
│   - ArrayBuffer / Buffer（堆外内存）                         │
│   - C++ 对象                                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 查看当前限制

```javascript
const v8 = require('v8');

const stats = v8.getHeapStatistics();

console.log('堆内存限制:', (stats.heap_size_limit / 1024 / 1024).toFixed(2), 'MB');
console.log('已用堆内存:', (stats.used_heap_size / 1024 / 1024).toFixed(2), 'MB');
console.log('已提交堆内存:', (stats.total_heap_size / 1024 / 1024).toFixed(2), 'MB');
console.log('物理内存大小:', (stats.total_physical_size / 1024 / 1024).toFixed(2), 'MB');
```

输出示例：

```
堆内存限制: 4144.00 MB
已用堆内存: 5.23 MB
已提交堆内存: 6.34 MB
物理内存大小: 5.89 MB
```

## 为什么有内存限制？

### 历史原因

V8最初为浏览器设计，考虑到：

1. **GC暂停时间**：堆越大，GC暂停越长
2. **浏览器场景**：网页通常不需要GB级内存
3. **32位兼容**：地址空间限制

### GC与堆大小的关系

```
堆大小 vs GC暂停时间（理论估算）：

堆大小      | Mark阶段  | Sweep阶段 | 总暂停
-----------|----------|----------|-------
100 MB     | ~10ms    | ~5ms     | ~15ms
500 MB     | ~50ms    | ~25ms    | ~75ms
1 GB       | ~100ms   | ~50ms    | ~150ms
2 GB       | ~200ms   | ~100ms   | ~300ms

注：实际时间取决于存活对象数量和对象图复杂度
```

虽然V8有增量/并发GC，但极大的堆仍会带来挑战：
- 更多的对象需要扫描
- 更长的标记周期
- 更大的内存碎片风险

## 调整内存限制

### --max-old-space-size

控制老生代最大大小（最常用）：

```bash
# 设置老生代最大为 8GB
node --max-old-space-size=8192 app.js

# 设置为 16GB
node --max-old-space-size=16384 app.js
```

```javascript
// 验证设置是否生效
const v8 = require('v8');
console.log('限制:', v8.getHeapStatistics().heap_size_limit / 1024 / 1024, 'MB');
```

### --max-semi-space-size

控制新生代半区大小：

```bash
# 设置新生代半区为 64MB（总新生代 = 128MB）
node --max-semi-space-size=64 app.js
```

增大新生代的场景：
- 高分配率应用
- 大量短命对象
- 减少Scavenge频率

### --max-heap-size

控制整个堆的大小限制（Node.js 12+）：

```bash
# 设置总堆限制为 8GB
node --max-heap-size=8192 app.js
```

### 完整的内存配置示例

```bash
# 高性能服务器配置
node \
  --max-old-space-size=8192 \
  --max-semi-space-size=64 \
  server.js

# 数据处理任务配置
node \
  --max-old-space-size=16384 \
  --expose-gc \
  processor.js
```

## 内存空间详解

### v8.getHeapSpaceStatistics()

查看各个内存空间的详细信息：

```javascript
const v8 = require('v8');

v8.getHeapSpaceStatistics().forEach(space => {
  console.log(`${space.space_name}:`);
  console.log(`  大小: ${(space.space_size / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  已用: ${(space.space_used_size / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  可用: ${(space.space_available_size / 1024 / 1024).toFixed(2)} MB`);
});
```

输出示例：

```
new_space:
  大小: 2.00 MB
  已用: 0.42 MB
  可用: 0.58 MB
old_space:
  大小: 3.23 MB
  已用: 2.95 MB
  可用: 0.12 MB
code_space:
  大小: 0.69 MB
  已用: 0.42 MB
  可用: 0.00 MB
map_space:
  大小: 0.53 MB
  已用: 0.16 MB
  可用: 0.00 MB
large_object_space:
  大小: 0.13 MB
  已用: 0.13 MB
  可用: 0.00 MB
```

### 各空间用途

```
┌─────────────────────────────────────────────────────────────┐
│                    V8 内存空间                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  new_space (新生代)                                         │
│  ├── 存放新创建的小对象                                      │
│  ├── 分为 From/To 两个半区                                  │
│  └── 使用 Scavenge 算法回收                                 │
│                                                             │
│  old_space (老生代)                                         │
│  ├── old_pointer_space: 含指针的对象                        │
│  └── old_data_space: 纯数据对象（如字符串）                  │
│                                                             │
│  code_space (代码区)                                        │
│  └── 存放编译后的机器码                                      │
│                                                             │
│  map_space (隐藏类区)                                       │
│  └── 存放对象的隐藏类（结构信息）                             │
│                                                             │
│  large_object_space (大对象区)                              │
│  └── 存放超过阈值的大对象                                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 堆外内存

不是所有内存都在V8堆中：

### Buffer 和 ArrayBuffer

```javascript
const v8 = require('v8');

// 堆内存对象
const obj = { data: new Array(1000000).fill(0) };

// 堆外内存（不计入 heap_used）
const buffer = Buffer.alloc(100 * 1024 * 1024);  // 100MB

console.log('堆已用:', v8.getHeapStatistics().used_heap_size / 1024 / 1024, 'MB');
console.log('外部内存:', v8.getHeapStatistics().external_memory / 1024 / 1024, 'MB');
```

### process.memoryUsage()

完整的内存使用视图：

```javascript
const usage = process.memoryUsage();

console.log({
  rss: (usage.rss / 1024 / 1024).toFixed(2) + ' MB',        // 常驻内存
  heapTotal: (usage.heapTotal / 1024 / 1024).toFixed(2) + ' MB',  // 堆总大小
  heapUsed: (usage.heapUsed / 1024 / 1024).toFixed(2) + ' MB',    // 堆已用
  external: (usage.external / 1024 / 1024).toFixed(2) + ' MB',    // 外部内存
  arrayBuffers: (usage.arrayBuffers / 1024 / 1024).toFixed(2) + ' MB'  // ArrayBuffer
});
```

各指标含义：

```
┌─────────────────────────────────────────────────────────────┐
│                    内存指标解读                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  rss (Resident Set Size)                                    │
│  └── 进程占用的实际物理内存                                   │
│      包含：代码段、堆、栈、共享库等                            │
│                                                             │
│  heapTotal                                                  │
│  └── V8 堆的总大小（已提交但可能未全部使用）                   │
│                                                             │
│  heapUsed                                                   │
│  └── V8 堆中实际使用的内存                                   │
│                                                             │
│  external                                                   │
│  └── C++ 对象绑定到 JS 对象的内存                            │
│      主要是 Buffer                                          │
│                                                             │
│  arrayBuffers                                               │
│  └── ArrayBuffer 和 SharedArrayBuffer 的内存                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 内存限制与容器环境

在Docker或Kubernetes中运行时需要特别注意：

### 问题：内存检测

Node.js可能无法正确检测容器内存限制：

```bash
# 容器限制 1GB，但 Node.js 可能看到宿主机内存（如 64GB）
docker run -m 1g node:18 node -e "console.log(require('os').totalmem() / 1024 / 1024 / 1024)"
# 可能输出 64，而不是 1
```

### 解决方案

```bash
# 显式设置内存限制
docker run -m 1g node:18 node --max-old-space-size=768 app.js

# 预留空间给：
# - Node.js 运行时本身
# - 堆外内存（Buffer等）
# - 系统开销
```

### 容器内存配置建议

```
容器内存限制    建议 --max-old-space-size
-----------------------------------------
512 MB         350 MB
1 GB           768 MB
2 GB           1536 MB
4 GB           3072 MB
8 GB           6144 MB
```

```javascript
// 根据容器限制自动配置
const os = require('os');

function getOptimalHeapSize() {
  const totalMem = os.totalmem();
  // 使用 75% 的可用内存
  return Math.floor(totalMem * 0.75 / 1024 / 1024);
}

// 在启动脚本中
// node --max-old-space-size=${getOptimalHeapSize()} app.js
```

## 内存不足处理

### FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed

当堆内存耗尽时，Node.js会崩溃：

```
FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed - JavaScript heap out of memory

<--- Last few GCs --->
[12345:0x...]    12345 ms: Mark-sweep 2048.0 (2050.0) -> 2047.9 (2050.0) MB, ...
[12345:0x...]    12456 ms: Mark-sweep 2048.0 (2050.0) -> 2047.8 (2050.0) MB, ...

<--- JS stacktrace --->
FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed
```

### 预防措施

```javascript
// 1. 监控内存使用
setInterval(() => {
  const usage = process.memoryUsage();
  const heapUsedMB = usage.heapUsed / 1024 / 1024;
  const heapTotalMB = usage.heapTotal / 1024 / 1024;
  const ratio = heapUsedMB / heapTotalMB;
  
  if (ratio > 0.9) {
    console.warn(`内存警告: 使用率 ${(ratio * 100).toFixed(1)}%`);
    // 可以触发清理或告警
  }
}, 10000);

// 2. 设置内存限制告警
const v8 = require('v8');

v8.setFlagsFromString('--max-old-space-size=4096');

function checkMemory() {
  const stats = v8.getHeapStatistics();
  if (stats.used_heap_size / stats.heap_size_limit > 0.85) {
    // 接近限制，采取行动
    clearCaches();
    global.gc && global.gc();
  }
}
```

### 优雅降级

```javascript
class MemoryAwareCache {
  constructor(maxItems = 10000) {
    this.cache = new Map();
    this.maxItems = maxItems;
    this.startMemoryCheck();
  }
  
  set(key, value) {
    // 内存压力时限制缓存
    if (this.isUnderMemoryPressure()) {
      if (this.cache.size >= this.maxItems / 2) {
        this.evictOldest();
      }
    } else if (this.cache.size >= this.maxItems) {
      this.evictOldest();
    }
    
    this.cache.set(key, { value, time: Date.now() });
  }
  
  isUnderMemoryPressure() {
    const usage = process.memoryUsage();
    return usage.heapUsed / usage.heapTotal > 0.8;
  }
  
  evictOldest() {
    // 删除最旧的 10%
    const entries = [...this.cache.entries()]
      .sort((a, b) => a[1].time - b[1].time);
    
    const toRemove = Math.ceil(entries.length * 0.1);
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i][0]);
    }
  }
  
  startMemoryCheck() {
    setInterval(() => {
      if (this.isUnderMemoryPressure()) {
        this.evictOldest();
      }
    }, 30000);
  }
}
```

## 调试内存配置

### 启动参数一览

```bash
# 查看所有 V8 内存相关参数
node --v8-options | grep -i "space\|heap\|gc"

# 常用参数：
--max-old-space-size=<MB>      # 老生代最大大小
--max-semi-space-size=<MB>     # 新生代半区大小
--max-heap-size=<MB>           # 总堆大小限制
--initial-heap-size=<MB>       # 初始堆大小
--trace-gc                     # 打印 GC 日志
--expose-gc                    # 暴露 global.gc()
```

### 实验：找到最佳配置

```javascript
// 内存使用基准测试
const v8 = require('v8');

function benchmark(label, fn) {
  const before = process.memoryUsage();
  const startTime = Date.now();
  
  fn();
  
  const after = process.memoryUsage();
  const duration = Date.now() - startTime;
  
  console.log(`${label}:`);
  console.log(`  耗时: ${duration}ms`);
  console.log(`  堆增长: ${((after.heapUsed - before.heapUsed) / 1024 / 1024).toFixed(2)}MB`);
  console.log(`  GC 次数: 需要 --trace-gc 查看`);
}

// 测试不同配置下的表现
// node --max-old-space-size=512 --trace-gc benchmark.js
// node --max-old-space-size=1024 --trace-gc benchmark.js
// node --max-old-space-size=2048 --trace-gc benchmark.js
```

## 小结

V8内存限制配置的核心要点：

| 参数 | 用途 | 建议值 |
|-----|-----|-------|
| `--max-old-space-size` | 老生代大小 | 系统内存的50-75% |
| `--max-semi-space-size` | 新生代半区 | 高分配率时增大到64-128MB |
| `--max-heap-size` | 总堆限制 | 与old-space-size二选一 |

关键实践：
- 容器环境必须显式设置内存限制
- 预留内存给堆外存储（Buffer等）
- 监控内存使用，设置告警阈值
- 实现优雅降级策略

下一章，我们将探讨V8的快照启动机制，了解如何加速Node.js应用的启动时间。
