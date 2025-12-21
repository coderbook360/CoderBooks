# 事件循环可视化调试

生产环境中，调试和监控事件循环的运行状况对于发现性能问题至关重要。本章介绍各种事件循环调试和可视化技术。

## 为什么需要监控

### 事件循环阻塞的影响

```
正常情况：
┌────────────────────────────────────────────────────┐
│ 请求1 → 处理(5ms) → 响应                           │
│ 请求2 → 处理(5ms) → 响应                           │
│ 请求3 → 处理(5ms) → 响应                           │
│ 总时间：~15ms                                      │
└────────────────────────────────────────────────────┘

事件循环阻塞：
┌────────────────────────────────────────────────────┐
│ 请求1 → 阻塞处理(500ms) → 响应                     │
│ 请求2 → 等待(500ms) → 处理(5ms) → 响应             │
│ 请求3 → 等待(505ms) → 处理(5ms) → 响应             │
│ 总时间：>1000ms，用户体验严重下降                   │
└────────────────────────────────────────────────────┘
```

### 需要监控的指标

- **事件循环延迟**：一次迭代需要多长时间
- **活跃handles数**：打开的资源数量
- **活跃requests数**：进行中的异步操作
- **各阶段耗时**：找出瓶颈阶段

## monitorEventLoopDelay API

### 基本使用

```javascript
const { monitorEventLoopDelay } = require('perf_hooks');

// 创建直方图，resolution是采样间隔（毫秒）
const histogram = monitorEventLoopDelay({ resolution: 20 });

// 启用监控
histogram.enable();

// 一段时间后查看结果
setTimeout(() => {
  console.log('事件循环延迟统计：');
  console.log('最小值:', histogram.min / 1e6, 'ms');
  console.log('最大值:', histogram.max / 1e6, 'ms');
  console.log('平均值:', histogram.mean / 1e6, 'ms');
  console.log('标准差:', histogram.stddev / 1e6, 'ms');
  console.log('P50:', histogram.percentile(50) / 1e6, 'ms');
  console.log('P99:', histogram.percentile(99) / 1e6, 'ms');
  
  // 禁用监控
  histogram.disable();
}, 5000);
```

### 持续监控

```javascript
class EventLoopMonitor {
  constructor(options = {}) {
    this.resolution = options.resolution || 20;
    this.interval = options.interval || 5000;
    this.histogram = monitorEventLoopDelay({ 
      resolution: this.resolution 
    });
    this.timer = null;
  }
  
  start() {
    this.histogram.enable();
    
    this.timer = setInterval(() => {
      this.report();
      this.histogram.reset();  // 重置以获取下一周期数据
    }, this.interval);
    
    this.timer.unref();  // 不阻止进程退出
  }
  
  report() {
    const stats = {
      min: this.histogram.min / 1e6,
      max: this.histogram.max / 1e6,
      mean: this.histogram.mean / 1e6,
      p50: this.histogram.percentile(50) / 1e6,
      p99: this.histogram.percentile(99) / 1e6,
    };
    
    console.log('Event Loop Stats:', JSON.stringify(stats));
    
    // 发送到监控系统
    if (stats.p99 > 100) {
      console.warn('⚠️ 事件循环延迟过高！');
    }
  }
  
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.histogram.disable();
  }
}

const monitor = new EventLoopMonitor();
monitor.start();
```

## setInterval监控方法

### 简单实现

```javascript
// 利用setInterval的延迟检测事件循环阻塞
function simpleMonitor(interval = 1000) {
  let lastCheck = Date.now();
  
  setInterval(() => {
    const now = Date.now();
    const delay = now - lastCheck - interval;
    
    if (delay > 10) {  // 超过10ms视为延迟
      console.log(`事件循环延迟: ${delay}ms`);
    }
    
    lastCheck = now;
  }, interval);
}
```

### 更精确的实现

```javascript
class IntervalMonitor {
  constructor(interval = 100) {
    this.interval = interval;
    this.delays = [];
    this.maxSamples = 100;
  }
  
  start() {
    let expected = Date.now() + this.interval;
    
    const check = () => {
      const now = Date.now();
      const delay = now - expected;
      
      this.delays.push(delay);
      if (this.delays.length > this.maxSamples) {
        this.delays.shift();
      }
      
      expected = now + this.interval;
      setTimeout(check, this.interval);
    };
    
    setTimeout(check, this.interval);
  }
  
  getStats() {
    if (this.delays.length === 0) return null;
    
    const sorted = [...this.delays].sort((a, b) => a - b);
    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: this.delays.reduce((a, b) => a + b) / this.delays.length,
      p95: sorted[Math.floor(sorted.length * 0.95)],
    };
  }
}
```

## process._getActiveHandles/Requests

### 查看活跃资源

```javascript
// 获取活跃的handles
const handles = process._getActiveHandles();
console.log('活跃handles数:', handles.length);

handles.forEach(handle => {
  console.log('Handle类型:', handle.constructor.name);
});

// 获取活跃的requests
const requests = process._getActiveRequests();
console.log('活跃requests数:', requests.length);

requests.forEach(req => {
  console.log('Request类型:', req.constructor.name);
});
```

### 实用监控函数

```javascript
function getResourceUsage() {
  const handles = process._getActiveHandles();
  const requests = process._getActiveRequests();
  
  // 按类型分组
  const handleTypes = {};
  handles.forEach(h => {
    const type = h.constructor.name;
    handleTypes[type] = (handleTypes[type] || 0) + 1;
  });
  
  const requestTypes = {};
  requests.forEach(r => {
    const type = r.constructor.name;
    requestTypes[type] = (requestTypes[type] || 0) + 1;
  });
  
  return {
    handles: {
      total: handles.length,
      byType: handleTypes
    },
    requests: {
      total: requests.length,
      byType: requestTypes
    }
  };
}

// 定期打印
setInterval(() => {
  console.log(JSON.stringify(getResourceUsage(), null, 2));
}, 10000).unref();
```

## async_hooks监控

### 追踪异步操作

```javascript
const async_hooks = require('async_hooks');
const fs = require('fs');

// 同步写入，避免递归
const writeFd = fs.openSync('./async-trace.log', 'a');
function log(msg) {
  fs.writeSync(writeFd, msg + '\n');
}

const operations = new Map();

const hook = async_hooks.createHook({
  init(asyncId, type, triggerAsyncId) {
    operations.set(asyncId, {
      type,
      trigger: triggerAsyncId,
      start: Date.now()
    });
  },
  
  destroy(asyncId) {
    const op = operations.get(asyncId);
    if (op) {
      const duration = Date.now() - op.start;
      if (duration > 100) {  // 超过100ms
        log(`Long operation: ${op.type}, duration: ${duration}ms`);
      }
      operations.delete(asyncId);
    }
  }
});

hook.enable();
```

### 追踪特定类型

```javascript
const asyncTypes = {
  TCP: 0,
  FSReq: 0,
  Timeout: 0,
  Immediate: 0,
  Promise: 0
};

const hook = async_hooks.createHook({
  init(asyncId, type) {
    if (asyncTypes.hasOwnProperty(type)) {
      asyncTypes[type]++;
    }
  },
  destroy(asyncId) {
    // 需要追踪每个asyncId的类型才能准确减少
  }
});

hook.enable();

setInterval(() => {
  console.log('异步操作统计:', asyncTypes);
}, 5000).unref();
```

## Performance Observer

### 使用PerformanceObserver

```javascript
const { 
  PerformanceObserver, 
  performance 
} = require('perf_hooks');

// 观察Node.js内部指标
const obs = new PerformanceObserver((list) => {
  const entries = list.getEntries();
  entries.forEach(entry => {
    console.log(`${entry.name}: ${entry.duration}ms`);
  });
});

obs.observe({ 
  entryTypes: ['gc', 'function', 'measure'],
  buffered: true 
});

// 测量代码块
performance.mark('start');
// ... 执行代码 ...
performance.mark('end');
performance.measure('操作耗时', 'start', 'end');
```

### GC监控

```javascript
const { PerformanceObserver } = require('perf_hooks');

const obs = new PerformanceObserver((list) => {
  list.getEntries().forEach(entry => {
    console.log(`GC: ${entry.kind}, 耗时: ${entry.duration.toFixed(2)}ms`);
  });
});

obs.observe({ entryTypes: ['gc'] });

// entry.kind 类型：
// 1 = Minor GC (Scavenge)
// 2 = Major GC (Mark-Sweep)
// 4 = Incremental marking
// 8 = Weak callbacks
// 15 = All
```

## 自定义监控工具

### 完整监控类

```javascript
const { monitorEventLoopDelay, PerformanceObserver } = require('perf_hooks');

class NodeMonitor {
  constructor(options = {}) {
    this.options = {
      sampleInterval: options.sampleInterval || 5000,
      histogramResolution: options.histogramResolution || 20,
      gcMonitoring: options.gcMonitoring !== false,
      ...options
    };
    
    this.histogram = monitorEventLoopDelay({
      resolution: this.options.histogramResolution
    });
    
    this.gcStats = { count: 0, totalTime: 0 };
    this.observers = [];
    this.intervals = [];
  }
  
  start() {
    // 事件循环监控
    this.histogram.enable();
    
    // GC监控
    if (this.options.gcMonitoring) {
      const gcObs = new PerformanceObserver((list) => {
        list.getEntries().forEach(entry => {
          this.gcStats.count++;
          this.gcStats.totalTime += entry.duration;
        });
      });
      gcObs.observe({ entryTypes: ['gc'] });
      this.observers.push(gcObs);
    }
    
    // 定期报告
    const timer = setInterval(() => {
      this.report();
    }, this.options.sampleInterval);
    timer.unref();
    this.intervals.push(timer);
  }
  
  report() {
    const report = {
      timestamp: new Date().toISOString(),
      eventLoop: {
        min: this.histogram.min / 1e6,
        max: this.histogram.max / 1e6,
        mean: this.histogram.mean / 1e6,
        p99: this.histogram.percentile(99) / 1e6
      },
      gc: { ...this.gcStats },
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      handles: process._getActiveHandles().length,
      requests: process._getActiveRequests().length
    };
    
    // 重置
    this.histogram.reset();
    this.gcStats = { count: 0, totalTime: 0 };
    
    // 输出或发送
    console.log('Monitor Report:', JSON.stringify(report, null, 2));
    
    return report;
  }
  
  stop() {
    this.histogram.disable();
    this.observers.forEach(obs => obs.disconnect());
    this.intervals.forEach(timer => clearInterval(timer));
  }
}

// 使用
const monitor = new NodeMonitor({
  sampleInterval: 10000,
  gcMonitoring: true
});
monitor.start();
```

## 集成到监控系统

### 导出Prometheus指标

```javascript
const http = require('http');
const { monitorEventLoopDelay } = require('perf_hooks');

const histogram = monitorEventLoopDelay({ resolution: 20 });
histogram.enable();

// 创建指标服务器
http.createServer((req, res) => {
  if (req.url === '/metrics') {
    const metrics = `
# HELP nodejs_eventloop_lag_seconds Event loop lag in seconds
# TYPE nodejs_eventloop_lag_seconds histogram
nodejs_eventloop_lag_seconds{quantile="0.5"} ${histogram.percentile(50) / 1e9}
nodejs_eventloop_lag_seconds{quantile="0.9"} ${histogram.percentile(90) / 1e9}
nodejs_eventloop_lag_seconds{quantile="0.99"} ${histogram.percentile(99) / 1e9}
nodejs_eventloop_lag_seconds_sum ${histogram.mean * histogram.count / 1e9}
nodejs_eventloop_lag_seconds_count ${histogram.count}

# HELP nodejs_active_handles Number of active handles
# TYPE nodejs_active_handles gauge
nodejs_active_handles ${process._getActiveHandles().length}

# HELP nodejs_active_requests Number of active requests
# TYPE nodejs_active_requests gauge
nodejs_active_requests ${process._getActiveRequests().length}

# HELP nodejs_heap_size_bytes Node.js heap size
# TYPE nodejs_heap_size_bytes gauge
nodejs_heap_size_bytes{type="used"} ${process.memoryUsage().heapUsed}
nodejs_heap_size_bytes{type="total"} ${process.memoryUsage().heapTotal}
`;
    
    res.setHeader('Content-Type', 'text/plain');
    res.end(metrics);
  } else {
    res.end('Node.js Metrics Server');
  }
}).listen(9090);

console.log('Metrics available at http://localhost:9090/metrics');
```

### 发送到时序数据库

```javascript
const https = require('https');

class MetricsExporter {
  constructor(endpoint, apiKey) {
    this.endpoint = endpoint;
    this.apiKey = apiKey;
    this.buffer = [];
  }
  
  record(name, value, tags = {}) {
    this.buffer.push({
      metric: name,
      value,
      timestamp: Date.now(),
      tags: {
        host: process.env.HOSTNAME || 'unknown',
        ...tags
      }
    });
  }
  
  flush() {
    if (this.buffer.length === 0) return;
    
    const data = JSON.stringify(this.buffer);
    this.buffer = [];
    
    // 发送到监控服务（例如InfluxDB、Datadog等）
    const req = https.request(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      }
    });
    
    req.write(data);
    req.end();
  }
}

// 使用
const exporter = new MetricsExporter(
  'https://metrics.example.com/api/v1/write',
  process.env.METRICS_API_KEY
);

setInterval(() => {
  exporter.record('nodejs.eventloop.delay', histogram.percentile(99) / 1e6);
  exporter.record('nodejs.handles', process._getActiveHandles().length);
  exporter.flush();
}, 10000).unref();
```

## 监控告警

```javascript
class AlertManager {
  constructor() {
    this.rules = [];
    this.cooldowns = new Map();
  }
  
  addRule(name, check, cooldown = 60000) {
    this.rules.push({ name, check, cooldown });
  }
  
  evaluate(metrics) {
    const now = Date.now();
    
    for (const rule of this.rules) {
      const lastAlert = this.cooldowns.get(rule.name) || 0;
      
      if (now - lastAlert < rule.cooldown) continue;
      
      if (rule.check(metrics)) {
        this.alert(rule.name, metrics);
        this.cooldowns.set(rule.name, now);
      }
    }
  }
  
  alert(ruleName, metrics) {
    console.error(`🚨 ALERT: ${ruleName}`, metrics);
    // 发送告警：邮件、Slack、PagerDuty等
  }
}

const alertManager = new AlertManager();

// 添加规则
alertManager.addRule(
  'High Event Loop Delay',
  (m) => m.eventLoop.p99 > 100,
  60000
);

alertManager.addRule(
  'Too Many Handles',
  (m) => m.handles > 1000,
  300000
);

alertManager.addRule(
  'High Memory Usage',
  (m) => m.memory.heapUsed > 500 * 1024 * 1024,
  120000
);
```

## 本章小结

- `monitorEventLoopDelay`是官方推荐的事件循环监控API
- `process._getActiveHandles()`和`process._getActiveRequests()`可追踪资源
- `async_hooks`可以追踪每个异步操作
- `PerformanceObserver`可监控GC和自定义测量
- 建议将监控数据导出到专业监控系统
- 设置合理的告警阈值，及时发现问题

下一章，我们将介绍事件循环中的常见陷阱和问题。
