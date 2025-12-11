# 性能分析工具：Chrome DevTools 性能面板深度使用

Chrome DevTools的Performance面板是分析JavaScript性能问题的核心工具。它能记录页面运行时的详细活动，包括JavaScript执行、布局计算、绘制和内存使用。本章将深入讲解如何有效使用这些工具来定位和解决性能问题。

## 性能面板概览

Performance面板的主要区域：

```
┌─────────────────────────────────────────────────────────────┐
│  控制栏：Record / Stop / Clear / Import / Export            │
├─────────────────────────────────────────────────────────────┤
│  概览区：CPU使用率、FPS、Network、Screenshots               │
├─────────────────────────────────────────────────────────────┤
│  火焰图：Main Thread、GPU、Compositor等线程活动            │
├─────────────────────────────────────────────────────────────┤
│  详情区：Summary、Bottom-Up、Call Tree、Event Log          │
└─────────────────────────────────────────────────────────────┘
```

开始录制的方式：

```javascript
// 方式1：手动点击Record按钮

// 方式2：使用快捷键 Ctrl+Shift+E (Windows) / Cmd+Shift+E (Mac)

// 方式3：通过代码触发
console.profile('MyProfile');
// ... 要分析的代码 ...
console.profileEnd('MyProfile');

// 方式4：Performance API
performance.mark('start');
// ... 要分析的代码 ...
performance.mark('end');
performance.measure('MyMeasure', 'start', 'end');
```

## 分析火焰图

火焰图（Flame Chart）展示了JavaScript的调用栈随时间的变化：

```javascript
// 示例：会产生长任务的代码
function heavyComputation() {
  let result = 0;
  for (let i = 0; i < 10000000; i++) {
    result += Math.sqrt(i);
  }
  return result;
}

function processData(data) {
  return data.map(item => {
    return heavyComputation();  // 每次调用都很慢
  });
}

function main() {
  const data = new Array(10).fill(0);
  processData(data);
}

main();

// 在火焰图中会看到：
// main()
//   └── processData()
//         └── heavyComputation() × 10（每个都是长条）
```

火焰图中的颜色含义：

- **黄色**：JavaScript执行
- **紫色**：布局计算（Layout）
- **绿色**：绘制（Paint）
- **灰色**：系统调用、空闲时间
- **红色三角**：长任务警告（超过50ms）

## 识别性能问题

### 长任务（Long Tasks）

```javascript
// 长任务示例 - 阻塞主线程超过50ms
function longTask() {
  const start = performance.now();
  
  // 模拟CPU密集型操作
  while (performance.now() - start < 100) {
    Math.random();
  }
}

// Performance面板会显示红色三角标记
longTask();

// 解决方案：分解任务
function chunkedTask(items, processItem, chunkSize = 100) {
  let index = 0;
  
  function processChunk() {
    const end = Math.min(index + chunkSize, items.length);
    
    while (index < end) {
      processItem(items[index]);
      index++;
    }
    
    if (index < items.length) {
      // 让出主线程
      setTimeout(processChunk, 0);
    }
  }
  
  processChunk();
}
```

### 强制同步布局

```javascript
// 反模式：强制同步布局（Layout Thrashing）
function badLayout() {
  const elements = document.querySelectorAll('.item');
  
  elements.forEach(el => {
    // 读取布局属性
    const height = el.offsetHeight;  // 触发布局
    // 写入样式
    el.style.height = (height + 10) + 'px';  // 使布局失效
    // 下次循环又要读取，触发强制同步布局
  });
}

// Performance面板会显示紫色的Layout块，带有警告

// 推荐：批量读取，批量写入
function goodLayout() {
  const elements = document.querySelectorAll('.item');
  const heights = [];
  
  // 批量读取
  elements.forEach(el => {
    heights.push(el.offsetHeight);
  });
  
  // 批量写入
  elements.forEach((el, i) => {
    el.style.height = (heights[i] + 10) + 'px';
  });
}
```

### 频繁GC

```javascript
// 反模式：创建大量临时对象
function badMemory() {
  for (let i = 0; i < 10000; i++) {
    const temp = { x: i, y: i * 2 };  // 每次循环都创建新对象
    process(temp);
  }
}

// Performance面板会显示频繁的Minor GC（小型垃圾回收）

// 推荐：对象复用
function goodMemory() {
  const temp = { x: 0, y: 0 };  // 复用同一个对象
  
  for (let i = 0; i < 10000; i++) {
    temp.x = i;
    temp.y = i * 2;
    process(temp);
  }
}
```

## 使用Timing API

Performance API提供了程序化的性能测量：

```javascript
// User Timing API
class PerformanceTracker {
  constructor(name) {
    this.name = name;
  }
  
  start() {
    performance.mark(`${this.name}-start`);
  }
  
  end() {
    performance.mark(`${this.name}-end`);
    performance.measure(this.name, `${this.name}-start`, `${this.name}-end`);
    
    const measure = performance.getEntriesByName(this.name)[0];
    console.log(`${this.name}: ${measure.duration.toFixed(2)}ms`);
    
    // 清理
    performance.clearMarks(`${this.name}-start`);
    performance.clearMarks(`${this.name}-end`);
    performance.clearMeasures(this.name);
    
    return measure.duration;
  }
}

// 使用
const tracker = new PerformanceTracker('myOperation');
tracker.start();
// ... 执行操作 ...
tracker.end();
```

## Call Tree与Bottom-Up视图

### Call Tree（自上而下）

```javascript
// Call Tree显示调用层次结构
function parent() {
  child1();
  child2();
}

function child1() {
  grandchild();
}

function child2() {
  grandchild();
}

function grandchild() {
  // 实际工作
}

// Call Tree视图：
// parent (100ms)
//   ├── child1 (40ms)
//   │     └── grandchild (40ms)
//   └── child2 (60ms)
//         └── grandchild (60ms)
```

### Bottom-Up（自下而上）

```javascript
// Bottom-Up视图按照函数自身时间排序
// 便于找到最耗时的函数

// 示例输出：
// grandchild - Self Time: 100ms, Total Time: 100ms
//   └── child1 - 40ms
//   └── child2 - 60ms
// child1 - Self Time: 0ms, Total Time: 40ms
// child2 - Self Time: 0ms, Total Time: 60ms
// parent - Self Time: 0ms, Total Time: 100ms
```

## Memory面板配合使用

结合Memory面板进行内存分析：

```javascript
// 检测内存泄漏的步骤：
// 1. 打开Memory面板
// 2. 选择"Heap snapshot"
// 3. 执行可能导致泄漏的操作
// 4. 再次拍摄快照
// 5. 对比两个快照

// 常见的内存泄漏模式
class LeakyComponent {
  constructor() {
    this.data = new Array(10000).fill('leak');
    
    // 泄漏：全局事件监听器未移除
    window.addEventListener('resize', this.handleResize);
  }
  
  handleResize = () => {
    console.log(this.data.length);
  }
  
  // 缺少cleanup方法
}

// 修复版本
class FixedComponent {
  constructor() {
    this.data = new Array(10000).fill('data');
    this.boundHandleResize = this.handleResize.bind(this);
    window.addEventListener('resize', this.boundHandleResize);
  }
  
  handleResize() {
    console.log(this.data.length);
  }
  
  destroy() {
    window.removeEventListener('resize', this.boundHandleResize);
    this.data = null;
  }
}
```

## 网络请求与性能

Performance面板也记录网络请求：

```javascript
// 分析网络请求对性能的影响
async function analyzeNetworkImpact() {
  // 使用Performance API获取资源加载信息
  const resources = performance.getEntriesByType('resource');
  
  const analysis = resources.map(r => ({
    name: r.name.split('/').pop(),
    duration: r.duration.toFixed(2),
    size: r.transferSize,
    type: r.initiatorType
  }));
  
  // 按加载时间排序
  analysis.sort((a, b) => b.duration - a.duration);
  
  console.table(analysis.slice(0, 10));  // 前10个最慢的资源
}

// 优化建议
function optimizeNetworkRequests() {
  // 1. 预加载关键资源
  const preload = document.createElement('link');
  preload.rel = 'preload';
  preload.href = '/critical-script.js';
  preload.as = 'script';
  document.head.appendChild(preload);
  
  // 2. 预连接到第三方域
  const preconnect = document.createElement('link');
  preconnect.rel = 'preconnect';
  preconnect.href = 'https://api.example.com';
  document.head.appendChild(preconnect);
  
  // 3. 使用资源提示
  const prefetch = document.createElement('link');
  prefetch.rel = 'prefetch';
  prefetch.href = '/next-page-data.json';
  document.head.appendChild(prefetch);
}
```

## 自动化性能测试

使用Puppeteer进行自动化性能测试：

```javascript
// 使用Puppeteer自动收集性能数据
const puppeteer = require('puppeteer');

async function collectPerformanceMetrics(url) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // 启用性能跟踪
  await page.tracing.start({ path: 'trace.json' });
  
  await page.goto(url, { waitUntil: 'networkidle0' });
  
  // 收集性能指标
  const metrics = await page.metrics();
  
  // 收集Core Web Vitals
  const performanceMetrics = await page.evaluate(() => {
    return new Promise(resolve => {
      new PerformanceObserver(list => {
        const entries = list.getEntries();
        const lcpEntry = entries.find(e => e.entryType === 'largest-contentful-paint');
        resolve({
          lcp: lcpEntry ? lcpEntry.startTime : null,
          fid: performance.getEntriesByType('first-input')[0]?.processingStart,
          cls: performance.getEntriesByType('layout-shift')
                .reduce((sum, e) => sum + e.value, 0)
        });
      }).observe({ type: 'largest-contentful-paint', buffered: true });
      
      setTimeout(resolve, 5000);  // 超时
    });
  });
  
  await page.tracing.stop();
  await browser.close();
  
  return { metrics, performanceMetrics };
}
```

## 性能预算

设置和监控性能预算：

```javascript
// 性能预算配置
const performanceBudget = {
  // 时间预算
  time: {
    firstContentfulPaint: 1500,    // 1.5秒
    largestContentfulPaint: 2500,  // 2.5秒
    timeToInteractive: 3500,       // 3.5秒
    totalBlockingTime: 300         // 300ms
  },
  
  // 资源预算
  resources: {
    totalSize: 500 * 1024,     // 500KB
    scriptSize: 200 * 1024,    // 200KB
    styleSize: 50 * 1024,      // 50KB
    imageSize: 200 * 1024,     // 200KB
    fontSize: 50 * 1024        // 50KB
  },
  
  // 请求数预算
  requests: {
    total: 50,
    scripts: 10,
    styles: 5,
    images: 20
  }
};

// 检查是否超出预算
function checkPerformanceBudget() {
  const resources = performance.getEntriesByType('resource');
  
  const scriptSize = resources
    .filter(r => r.initiatorType === 'script')
    .reduce((sum, r) => sum + r.transferSize, 0);
  
  if (scriptSize > performanceBudget.resources.scriptSize) {
    console.warn(`Script size (${scriptSize}) exceeds budget (${performanceBudget.resources.scriptSize})`);
  }
  
  // 检查其他指标...
}
```

## 本章小结

Chrome DevTools的Performance面板是定位JavaScript性能问题的核心工具。掌握其使用方法对于优化应用性能至关重要。

核心要点：

- **火焰图分析**：理解调用栈的时间分布，识别热点函数
- **长任务检测**：关注超过50ms的任务，考虑任务分解
- **布局抖动**：避免强制同步布局，批量读写DOM
- **内存监控**：结合Memory面板检测内存泄漏
- **自动化测试**：使用Puppeteer等工具进行持续性能监控

熟练使用这些工具，你就能快速定位性能瓶颈并做出有效优化。下一章，我们将学习V8的命令行工具d8，了解如何在底层调试JavaScript代码。
