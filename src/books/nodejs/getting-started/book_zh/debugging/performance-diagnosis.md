# 性能问题初步诊断

当应用变慢时，需要系统地排查问题。

## 内存使用

### process.memoryUsage()

```javascript
const mem = process.memoryUsage();
console.log({
  rss: `${Math.round(mem.rss / 1024 / 1024)} MB`,        // 总内存
  heapTotal: `${Math.round(mem.heapTotal / 1024 / 1024)} MB`,  // 堆总量
  heapUsed: `${Math.round(mem.heapUsed / 1024 / 1024)} MB`,    // 堆使用
  external: `${Math.round(mem.external / 1024 / 1024)} MB`     // C++ 对象
});
```

### 定期监控

```javascript
setInterval(() => {
  const mem = process.memoryUsage();
  console.log(`内存: ${Math.round(mem.heapUsed / 1024 / 1024)} MB`);
}, 5000);
```

### 识别内存泄漏

```javascript
// 可疑的模式
const cache = {};

function process(id, data) {
  cache[id] = data;  // 只增不减
}

// 改进：限制缓存大小
const cache = new Map();
const MAX_SIZE = 1000;

function process(id, data) {
  if (cache.size >= MAX_SIZE) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
  cache.set(id, data);
}
```

## 时间测量

### console.time

```javascript
console.time('数据库查询');
const users = await db.query('SELECT * FROM users');
console.timeEnd('数据库查询');
// 数据库查询: 45.123ms
```

### 高精度计时

```javascript
const start = process.hrtime.bigint();
// 执行操作
const end = process.hrtime.bigint();
console.log(`耗时: ${(end - start) / 1000000n} ms`);
```

### Performance API

```javascript
const { performance } = require('perf_hooks');

const start = performance.now();
// 执行操作
const duration = performance.now() - start;
console.log(`耗时: ${duration.toFixed(2)} ms`);
```

## 事件循环阻塞

### 检测阻塞

```javascript
let lastCheck = Date.now();

setInterval(() => {
  const now = Date.now();
  const delay = now - lastCheck - 100;  // 100ms 间隔
  
  if (delay > 50) {  // 超过 50ms 延迟
    console.warn(`事件循环阻塞: ${delay}ms`);
  }
  
  lastCheck = now;
}, 100);
```

### 常见阻塞原因

```javascript
// 同步读取大文件
const content = fs.readFileSync('large-file.txt');  // 阻塞

// 改用异步
const content = await fs.promises.readFile('large-file.txt');

// 复杂计算
for (let i = 0; i < 10000000; i++) {
  // 大量计算阻塞事件循环
}

// 改用 setImmediate 分片
async function processLarge(items) {
  const CHUNK = 1000;
  for (let i = 0; i < items.length; i += CHUNK) {
    const chunk = items.slice(i, i + CHUNK);
    processChunk(chunk);
    await new Promise(r => setImmediate(r));  // 让出控制权
  }
}
```

## CPU 分析

### 使用 --prof

```bash
node --prof app.js
```

运行后生成 `isolate-xxx-v8.log`。

处理日志：

```bash
node --prof-process isolate-xxx-v8.log > profile.txt
```

### 分析结果

```
[Summary]:
   ticks  total  nonlib   name
    123   10.5%   12.3%  JavaScript
    800   68.2%   80.0%  C++
     50    4.3%    5.0%  GC
    200   17.1%          Shared libraries

[JavaScript]:
   ticks  total  nonlib   name
     50    4.3%    5.0%  processData
     30    2.6%    3.0%  parseJSON
```

重点关注高占比的函数。

## Clinic.js

可视化性能分析工具：

```bash
npm install -g clinic
```

### Doctor

```bash
clinic doctor -- node app.js
# 访问应用后 Ctrl+C
# 自动打开分析报告
```

### Flame

```bash
clinic flame -- node app.js
# 生成火焰图
```

## 常见性能问题

### 同步操作

```javascript
// 慢
const files = fs.readdirSync(dir);
for (const file of files) {
  const content = fs.readFileSync(path.join(dir, file));
}

// 快
const files = await fs.promises.readdir(dir);
await Promise.all(files.map(async (file) => {
  const content = await fs.promises.readFile(path.join(dir, file));
}));
```

### 重复计算

```javascript
// 慢：每次请求都解析
app.get('/config', (req, res) => {
  const config = JSON.parse(fs.readFileSync('config.json'));
  res.json(config);
});

// 快：启动时加载一次
const config = JSON.parse(fs.readFileSync('config.json'));
app.get('/config', (req, res) => {
  res.json(config);
});
```

### 无限制并发

```javascript
// 危险：可能耗尽资源
await Promise.all(urls.map(url => fetch(url)));

// 安全：限制并发
async function fetchWithLimit(urls, limit = 5) {
  const results = [];
  let index = 0;
  
  async function worker() {
    while (index < urls.length) {
      const i = index++;
      results[i] = await fetch(urls[i]);
    }
  }
  
  await Promise.all(Array(limit).fill().map(worker));
  return results;
}
```

## 快速诊断清单

1. **内存问题**
   - 检查 `process.memoryUsage()`
   - 内存是否持续增长？

2. **CPU 问题**
   - 使用 `--prof` 分析
   - 是否有同步阻塞操作？

3. **I/O 问题**
   - 测量数据库查询时间
   - 外部 API 响应时间

4. **并发问题**
   - 连接池是否耗尽？
   - 是否有资源竞争？

## 本章小结

- `process.memoryUsage()` 监控内存
- `console.time` 测量代码耗时
- 检测事件循环阻塞
- `--prof` 分析 CPU 使用
- 避免同步操作和无限并发
- 使用 Clinic.js 可视化分析

下一章我们将总结全书内容并展望后续学习路径。
