# 事件循环性能调优

掌握事件循环调优技术可以显著提升Node.js应用的性能和吞吐量。本章介绍各种调优策略和最佳实践。

## 调优目标

### 关键性能指标

```
1. 事件循环延迟（Event Loop Lag）
   - 目标：P99 < 10ms
   - 良好：P99 < 50ms
   - 差：P99 > 100ms

2. 吞吐量（Throughput）
   - 每秒处理的请求数
   - 取决于业务复杂度

3. 响应时间（Latency）
   - 目标：尽可能低且稳定
   - 避免长尾延迟

4. CPU使用率
   - 目标：60-80%（留有余量）
   - 避免100%（无法处理突发）
```

### 基准测试

```javascript
const http = require('http');
const { monitorEventLoopDelay } = require('perf_hooks');

const histogram = monitorEventLoopDelay({ resolution: 20 });
histogram.enable();

const server = http.createServer((req, res) => {
  // 模拟处理
  const start = Date.now();
  while (Date.now() - start < 1) {}  // 1ms处理时间
  res.end('OK');
});

server.listen(3000);

// 定期输出性能指标
setInterval(() => {
  console.log({
    'Event Loop Delay P99': (histogram.percentile(99) / 1e6).toFixed(2) + 'ms',
    'Heap Used': (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2) + 'MB'
  });
  histogram.reset();
}, 5000).unref();
```

## 线程池调优

### UV_THREADPOOL_SIZE

libuv的线程池用于处理文件系统操作、DNS查询和加密操作。

```bash
# 默认4个线程
# 可设置为1-1024

# 设置环境变量
UV_THREADPOOL_SIZE=16 node app.js

# 或在代码最开始设置
process.env.UV_THREADPOOL_SIZE = '16';
```

### 何时增加线程池

```
适合增加的场景：
┌─────────────────────────────────────────────────────┐
│ - 大量文件I/O操作                                    │
│ - 频繁的DNS查询                                     │
│ - 大量加密操作（如HTTPS）                            │
│ - 压缩/解压缩操作                                   │
└─────────────────────────────────────────────────────┘

不建议过度增加：
┌─────────────────────────────────────────────────────┐
│ - 线程过多会增加上下文切换开销                        │
│ - 内存占用增加                                      │
│ - 建议：CPU核心数的2-4倍                            │
└─────────────────────────────────────────────────────┘
```

### 监控线程池使用

```javascript
const { Worker } = require('worker_threads');

// 检测线程池瓶颈
const fs = require('fs');
const start = Date.now();

// 并发读取多个文件
const promises = [];
for (let i = 0; i < 100; i++) {
  promises.push(fs.promises.readFile('test.txt'));
}

Promise.all(promises).then(() => {
  console.log(`100个文件读取耗时: ${Date.now() - start}ms`);
  // 如果耗时过长，可能需要增加线程池大小
});
```

## 多进程调优

### Cluster模式

```javascript
const cluster = require('cluster');
const http = require('http');
const numCPUs = require('os').cpus().length;

if (cluster.isPrimary) {
  console.log(`主进程 ${process.pid} 正在运行`);
  
  // 创建工作进程
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  
  cluster.on('exit', (worker, code, signal) => {
    console.log(`工作进程 ${worker.process.pid} 退出`);
    // 重启工作进程
    cluster.fork();
  });
  
} else {
  http.createServer((req, res) => {
    res.end('Hello');
  }).listen(3000);
  
  console.log(`工作进程 ${process.pid} 已启动`);
}
```

### 负载均衡策略

```javascript
const cluster = require('cluster');

// 设置调度策略
cluster.schedulingPolicy = cluster.SCHED_RR;  // 轮询

// 策略选项：
// cluster.SCHED_NONE - 操作系统调度（默认在Windows）
// cluster.SCHED_RR - 轮询（默认在其他系统）

// 或通过环境变量设置
// NODE_CLUSTER_SCHED_POLICY=rr
```

### 进程间通信优化

```javascript
// 主进程
if (cluster.isPrimary) {
  const workers = [];
  
  for (let i = 0; i < numCPUs; i++) {
    const worker = cluster.fork();
    workers.push(worker);
    
    worker.on('message', (msg) => {
      // 处理工作进程消息
      if (msg.type === 'stats') {
        console.log(`Worker ${worker.id} stats:`, msg.data);
      }
    });
  }
  
  // 广播消息给所有工作进程
  function broadcast(msg) {
    workers.forEach(w => w.send(msg));
  }
}

// 工作进程
if (cluster.isWorker) {
  // 定期发送统计信息
  setInterval(() => {
    process.send({
      type: 'stats',
      data: {
        memory: process.memoryUsage(),
        uptime: process.uptime()
      }
    });
  }, 10000);
  
  // 接收主进程消息
  process.on('message', (msg) => {
    if (msg.type === 'shutdown') {
      gracefulShutdown();
    }
  });
}
```

## 内存调优

### V8堆内存设置

```bash
# 设置最大堆内存（MB）
node --max-old-space-size=4096 app.js

# 设置初始堆内存
node --min-semi-space-size=64 app.js

# 查看当前限制
node -e "console.log(v8.getHeapStatistics())"
```

### 内存使用监控

```javascript
const v8 = require('v8');

function getMemoryStats() {
  const heapStats = v8.getHeapStatistics();
  const memUsage = process.memoryUsage();
  
  return {
    heapTotal: (heapStats.total_heap_size / 1024 / 1024).toFixed(2) + 'MB',
    heapUsed: (heapStats.used_heap_size / 1024 / 1024).toFixed(2) + 'MB',
    heapLimit: (heapStats.heap_size_limit / 1024 / 1024).toFixed(2) + 'MB',
    external: (memUsage.external / 1024 / 1024).toFixed(2) + 'MB',
    rss: (memUsage.rss / 1024 / 1024).toFixed(2) + 'MB'
  };
}

setInterval(() => {
  console.log('Memory:', getMemoryStats());
}, 10000).unref();
```

### 减少内存压力

```javascript
// 1. 使用流处理大文件
const fs = require('fs');
const { Transform } = require('stream');

// 错误：一次性读入内存
// const data = fs.readFileSync('huge-file.json');

// 正确：流式处理
fs.createReadStream('huge-file.json')
  .pipe(new Transform({
    transform(chunk, encoding, callback) {
      // 处理数据块
      callback(null, processChunk(chunk));
    }
  }))
  .pipe(fs.createWriteStream('output.json'));

// 2. 避免大数组
// 错误
const allData = await db.query('SELECT * FROM huge_table');

// 正确：分页或游标
async function* fetchData() {
  let offset = 0;
  const limit = 1000;
  
  while (true) {
    const batch = await db.query(
      `SELECT * FROM huge_table LIMIT ${limit} OFFSET ${offset}`
    );
    if (batch.length === 0) break;
    
    for (const item of batch) {
      yield item;
    }
    
    offset += limit;
  }
}

for await (const item of fetchData()) {
  process(item);
}
```

## 网络调优

### TCP选项

```javascript
const net = require('net');

const server = net.createServer({
  // 允许半开连接
  allowHalfOpen: false,
  // 暂停入站连接（手动accept）
  pauseOnConnect: false
});

server.on('connection', (socket) => {
  // TCP_NODELAY - 禁用Nagle算法
  socket.setNoDelay(true);
  
  // 设置Keep-Alive
  socket.setKeepAlive(true, 60000);
  
  // 设置超时
  socket.setTimeout(30000);
});

// 调整backlog（等待连接队列长度）
server.listen(3000, '0.0.0.0', 511);  // 默认511
```

### HTTP Keep-Alive

```javascript
const http = require('http');

// 服务端
const server = http.createServer((req, res) => {
  res.end('OK');
});

server.keepAliveTimeout = 60000;  // 60秒
server.headersTimeout = 61000;    // 略大于keepAliveTimeout

// 客户端
const agent = new http.Agent({
  keepAlive: true,
  keepAliveMsecs: 60000,
  maxSockets: 100,
  maxFreeSockets: 10
});

http.get('http://example.com', { agent }, (res) => {
  // ...
});
```

### 连接池

```javascript
// 数据库连接池示例
const { Pool } = require('pg');

const pool = new Pool({
  max: 20,              // 最大连接数
  min: 5,               // 最小连接数
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// HTTP客户端连接池
const http = require('http');
const https = require('https');

const httpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 60000
});

const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 60000
});
```

## 定时器优化

### 合并定时器

```javascript
// 错误：每个任务独立定时器
tasks.forEach(task => {
  setTimeout(() => processTask(task), 1000);
});

// 正确：单个定时器批量处理
const pendingTasks = [...tasks];
setTimeout(() => {
  pendingTasks.forEach(processTask);
}, 1000);
```

### 使用unref

```javascript
// 后台任务不阻止进程退出
const cleanupTimer = setInterval(() => {
  cleanup();
}, 60000);
cleanupTimer.unref();

// 定期刷新缓存
const refreshTimer = setInterval(() => {
  refreshCache();
}, 300000);
refreshTimer.unref();
```

### 避免短间隔定时器

```javascript
// 差：1ms间隔
setInterval(check, 1);  // 频繁唤醒，CPU开销大

// 好：合理间隔
setInterval(check, 100);

// 更好：根据负载自适应
class AdaptiveTimer {
  constructor(fn, minInterval = 100, maxInterval = 5000) {
    this.fn = fn;
    this.minInterval = minInterval;
    this.maxInterval = maxInterval;
    this.currentInterval = minInterval;
  }
  
  start() {
    const run = async () => {
      const start = Date.now();
      const hadWork = await this.fn();
      const elapsed = Date.now() - start;
      
      // 有工作则缩短间隔，无工作则增加间隔
      if (hadWork) {
        this.currentInterval = Math.max(
          this.minInterval,
          this.currentInterval / 2
        );
      } else {
        this.currentInterval = Math.min(
          this.maxInterval,
          this.currentInterval * 2
        );
      }
      
      setTimeout(run, this.currentInterval);
    };
    
    run();
  }
}
```

## 异步操作优化

### 批量操作

```javascript
// 差：单个操作
for (const item of items) {
  await db.insert(item);
}

// 好：批量操作
await db.insertMany(items);

// 或分批处理
async function batchProcess(items, batchSize = 100) {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await db.insertMany(batch);
  }
}
```

### 并发控制

```javascript
// 差：无限并发
await Promise.all(urls.map(url => fetch(url)));

// 好：限制并发
async function parallelLimit(tasks, limit) {
  const results = [];
  const executing = new Set();
  
  for (const task of tasks) {
    const promise = task().then(result => {
      executing.delete(promise);
      return result;
    });
    
    executing.add(promise);
    results.push(promise);
    
    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }
  
  return Promise.all(results);
}

// 使用p-limit库
const pLimit = require('p-limit');
const limit = pLimit(10);  // 最多10个并发

const results = await Promise.all(
  urls.map(url => limit(() => fetch(url)))
);
```

## 垃圾回收调优

### 监控GC

```javascript
const { PerformanceObserver } = require('perf_hooks');

const obs = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log(`GC ${entry.kind}: ${entry.duration.toFixed(2)}ms`);
  }
});

obs.observe({ entryTypes: ['gc'] });
```

### 减少GC压力

```javascript
// 1. 对象池
class ObjectPool {
  constructor(factory, initialSize = 10) {
    this.factory = factory;
    this.pool = [];
    
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(factory());
    }
  }
  
  acquire() {
    return this.pool.pop() || this.factory();
  }
  
  release(obj) {
    // 重置对象状态
    this.pool.push(obj);
  }
}

// 2. 避免临时对象
// 差
function process(data) {
  return data.map(item => ({ ...item, processed: true }));
}

// 好：原地修改（如果可以）
function process(data) {
  for (const item of data) {
    item.processed = true;
  }
  return data;
}

// 3. 使用TypedArray处理大量数值
// 差
const values = new Array(1000000).fill(0);

// 好
const values = new Float64Array(1000000);
```

## 性能分析工具

### 内置分析器

```bash
# CPU分析
node --prof app.js
node --prof-process isolate-*.log > processed.txt

# 堆分析
node --inspect app.js
# 然后在Chrome DevTools中分析
```

### 使用clinic.js

```bash
# 安装
npm install -g clinic

# 诊断
clinic doctor -- node app.js
clinic flame -- node app.js
clinic bubbleprof -- node app.js
```

## 调优检查清单

```markdown
## 事件循环
- [ ] 事件循环延迟P99 < 50ms
- [ ] 无长时间同步操作
- [ ] CPU密集任务使用Worker

## 内存
- [ ] 堆内存使用稳定
- [ ] 无内存泄漏
- [ ] 大文件使用流处理

## I/O
- [ ] 使用异步I/O
- [ ] 合理的线程池大小
- [ ] 连接池配置正确

## 网络
- [ ] 启用Keep-Alive
- [ ] 合理的超时设置
- [ ] 连接数限制

## 进程
- [ ] 多进程充分利用CPU
- [ ] 优雅关闭处理
- [ ] 进程监控和自动重启
```

## 本章小结

- 线程池大小影响文件I/O和加密操作性能
- Cluster模式可充分利用多核CPU
- 内存调优关注堆大小和GC
- 网络调优包括Keep-Alive、连接池和超时设置
- 定时器应合理使用，避免过多和过频繁
- 并发操作需要限制以避免资源耗尽
- 使用专业工具进行性能分析

至此，事件循环部分已经完结。下一部分，我们将深入V8引擎的内部机制。
