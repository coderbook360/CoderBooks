# 性能指标体系：Core Web Vitals

> Core Web Vitals 是 Google 提出的核心网页性能指标，它从用户体验的角度定义了网页性能的关键维度，并直接影响搜索排名。

## 什么是 Core Web Vitals？

Core Web Vitals 是一组**以用户为中心**的性能指标，衡量网页的加载速度、交互响应和视觉稳定性：

```
Core Web Vitals
├── LCP (Largest Contentful Paint)   # 最大内容绘制 - 加载性能
├── INP (Interaction to Next Paint)  # 交互到下一次绘制 - 交互响应
└── CLS (Cumulative Layout Shift)    # 累积布局偏移 - 视觉稳定性
```

## 三大核心指标详解

### 1. LCP（Largest Contentful Paint）

**定义**：页面主要内容加载完成的时间

```
LCP 评分标准
├── 良好: ≤ 2.5秒
├── 需改进: 2.5秒 ~ 4秒
└── 差: > 4秒
```

**LCP 元素类型**：
- `<img>` 元素
- `<svg>` 中的 `<image>` 元素
- `<video>` 元素的封面图
- 通过 `url()` 加载背景图的元素
- 包含文本节点的块级元素

**优化 LCP 的策略**：

```typescript
// 1. 预加载关键资源
// 在 HTML <head> 中添加
<link rel="preload" href="/hero-image.jpg" as="image" />

// 2. 优化图片
// 使用现代格式 + 响应式图片
<picture>
  <source srcset="hero.avif" type="image/avif" />
  <source srcset="hero.webp" type="image/webp" />
  <img src="hero.jpg" alt="Hero" loading="eager" fetchpriority="high" />
</picture>

// 3. 服务端渲染 (SSR)
// 关键内容在服务器端生成，减少客户端渲染时间
export async function getServerSideProps() {
  const heroData = await fetchHeroContent();
  return { props: { heroData } };
}

// 4. 使用 CDN
// 将静态资源部署到离用户更近的边缘节点
const imageUrl = `https://cdn.example.com/images/${image}`;
```

### 2. INP（Interaction to Next Paint）

**定义**：用户交互到页面视觉响应的延迟时间

```
INP 评分标准
├── 良好: ≤ 200ms
├── 需改进: 200ms ~ 500ms
└── 差: > 500ms
```

**INP 衡量的交互类型**：
- 点击（click）
- 触摸（tap）
- 键盘输入（key press）

**优化 INP 的策略**：

```typescript
// 1. 避免长任务
// ❌ 长任务会阻塞主线程
function processData(items: Item[]) {
  items.forEach(item => {
    heavyComputation(item); // 阻塞主线程
  });
}

// ✅ 将长任务拆分为小块
async function processDataInChunks(items: Item[]) {
  const chunkSize = 50;
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    chunk.forEach(item => heavyComputation(item));
    
    // 让出主线程，允许处理用户交互
    await new Promise(resolve => setTimeout(resolve, 0));
  }
}

// 2. 使用 Web Worker 处理计算密集型任务
// worker.ts
self.onmessage = (e: MessageEvent) => {
  const result = heavyComputation(e.data);
  self.postMessage(result);
};

// main.ts
const worker = new Worker('worker.js');
worker.postMessage(data);
worker.onmessage = (e) => updateUI(e.data);

// 3. 使用 requestIdleCallback 处理低优先级任务
requestIdleCallback((deadline) => {
  while (deadline.timeRemaining() > 0 && tasks.length > 0) {
    performTask(tasks.pop());
  }
});

// 4. 优化事件处理器
// ❌ 在事件处理器中做太多工作
button.onclick = () => {
  heavyComputation();  // 阻塞
  updateDOM();
  sendAnalytics();
};

// ✅ 只做必要的 UI 更新
button.onclick = () => {
  updateDOM();  // 立即响应
  requestIdleCallback(() => sendAnalytics());
};
```

### 3. CLS（Cumulative Layout Shift）

**定义**：页面生命周期内所有意外布局偏移的累积分数

```
CLS 评分标准
├── 良好: ≤ 0.1
├── 需改进: 0.1 ~ 0.25
└── 差: > 0.25
```

**CLS 计算公式**：
```
CLS = 影响分数 × 距离分数
```

**常见 CLS 问题及解决方案**：

```tsx
// 1. 为图片和视频设置尺寸
// ❌ 没有尺寸，加载后会导致布局偏移
<img src="photo.jpg" alt="Photo" />

// ✅ 设置宽高或使用 aspect-ratio
<img src="photo.jpg" alt="Photo" width="800" height="600" />

// 或使用 CSS aspect-ratio
.image-container {
  aspect-ratio: 16 / 9;
  width: 100%;
}

// 2. 为动态内容预留空间
// ❌ 广告加载后撑开内容
<div className="ad-container">
  <Ad />  {/* 加载后撑开 */}
</div>

// ✅ 预留固定高度
.ad-container {
  min-height: 250px;  /* 预留广告位高度 */
}

// 3. 避免在现有内容上方插入内容
// ❌ 在顶部插入通知
function App() {
  const [notification, setNotification] = useState<string | null>(null);
  
  return (
    <div>
      {notification && <Banner>{notification}</Banner>}  {/* 会推动下方内容 */}
      <MainContent />
    </div>
  );
}

// ✅ 使用固定定位或 transform
.notification-banner {
  position: fixed;
  top: 0;
  transform: translateY(-100%);
  transition: transform 0.3s;
}

.notification-banner.visible {
  transform: translateY(0);
}

// 4. 字体加载优化
// ❌ 字体加载导致 FOUT (Flash of Unstyled Text)
@font-face {
  font-family: 'CustomFont';
  src: url('font.woff2') format('woff2');
}

// ✅ 使用 font-display 和预加载
@font-face {
  font-family: 'CustomFont';
  src: url('font.woff2') format('woff2');
  font-display: optional;  /* 或 swap */
}

<link rel="preload" href="font.woff2" as="font" type="font/woff2" crossorigin />
```

## 性能监控实践

### 使用 Web Vitals 库

```typescript
// 安装: npm install web-vitals

import { onLCP, onINP, onCLS } from 'web-vitals';

// 收集指标并上报
function sendToAnalytics(metric: Metric) {
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    id: metric.id,
    navigationType: metric.navigationType,
  });

  // 使用 sendBeacon 确保数据发送
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/analytics', body);
  } else {
    fetch('/analytics', { body, method: 'POST', keepalive: true });
  }
}

onLCP(sendToAnalytics);
onINP(sendToAnalytics);
onCLS(sendToAnalytics);
```

### 使用 PerformanceObserver

```typescript
// 监控 LCP
const lcpObserver = new PerformanceObserver((list) => {
  const entries = list.getEntries();
  const lastEntry = entries[entries.length - 1];
  console.log('LCP:', lastEntry.startTime, lastEntry.element);
});

lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

// 监控 Long Tasks
const longTaskObserver = new PerformanceObserver((list) => {
  list.getEntries().forEach(entry => {
    console.log('Long Task detected:', entry.duration, 'ms');
  });
});

longTaskObserver.observe({ type: 'longtask' });
```

## 性能预算

为 Core Web Vitals 设定预算并监控：

```typescript
// performance-budget.ts
interface PerformanceBudget {
  LCP: number;
  INP: number;
  CLS: number;
}

const budget: PerformanceBudget = {
  LCP: 2500,  // 2.5秒
  INP: 200,   // 200ms
  CLS: 0.1,   // 0.1
};

function checkBudget(metric: string, value: number) {
  if (value > budget[metric as keyof PerformanceBudget]) {
    console.warn(`⚠️ ${metric} exceeded budget: ${value} > ${budget[metric as keyof PerformanceBudget]}`);
    // 发送告警
    alertTeam({ metric, value, budget: budget[metric as keyof PerformanceBudget] });
  }
}
```

## 总结

Core Web Vitals 的三大指标：

| 指标 | 衡量维度 | 目标值 | 优化重点 |
|------|----------|--------|----------|
| LCP | 加载速度 | ≤ 2.5s | 优化关键资源加载 |
| INP | 交互响应 | ≤ 200ms | 优化 JavaScript 执行 |
| CLS | 视觉稳定 | ≤ 0.1 | 预留空间、避免布局偏移 |

优化核心原则：

1. **优先加载关键内容**：预加载、SSR、CDN
2. **保持主线程畅通**：拆分任务、Web Worker
3. **稳定的视觉布局**：设置尺寸、预留空间
4. **持续监控**：收集真实用户数据（RUM）
