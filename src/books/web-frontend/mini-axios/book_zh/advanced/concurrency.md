# 并发请求控制

浏览器对同一域名的并发连接数有限制（HTTP/1.1 通常是 6 个，HTTP/2 可达 100+）。当应用同时发起大量请求时，可能导致排队、超时甚至页面卡顿。合理控制并发数是高性能应用的关键。

## 本节目标

通过本节学习，你将掌握：

1. **理解并发限制**：浏览器为什么限制并发，以及对应用的影响
2. **实现请求队列**：使用队列管理请求的发送时机
3. **集成到 Axios**：通过拦截器/适配器无缝集成并发控制
4. **高级功能**：优先级队列、超时控制、按域名限制

## 并发问题

### 为什么需要限制并发？

```
浏览器并发限制（HTTP/1.1 同域名）：通常 6 个

        ┌─────────────────────────────────────┐
正在处理: │ req1 │ req2 │ req3 │ req4 │ req5 │ req6 │
        └─────────────────────────────────────┘
        ┌─────────────────────────────────────────────┐
等待队列: │ req7 │ req8 │ req9 │ ... │ req100 │ 😰    │
        └─────────────────────────────────────────────┘
                      等待中...可能超时！
```

```typescript
// ❌ 糟糕的做法：100 个请求同时发出
const promises = urls.map(url => axios.get(url));
await Promise.all(promises);
// 结果：
// - 前 6 个请求正常发出
// - 后 94 个在浏览器内部排队
// - 排在后面的请求可能因等待时间过长而超时
// - 用户界面可能卡顿（大量状态更新）
```

## 简单并发限制

实现一个请求队列来控制并发数。核心思想是：维护一个"活跃请求计数器"，只有计数器低于限制时才发送新请求：

```typescript
/**
 * 限制并发数的请求队列
 * 
 * 工作原理：
 * 1. 所有请求先进入队列
 * 2. 只有活跃请求数 < 并发限制时才从队列取出执行
 * 3. 请求完成后，活跃计数减 1，触发下一个请求
 */
class RequestQueue {
  // 待执行的请求队列
  private queue: Array<() => Promise<any>> = [];
  // 当前正在执行的请求数
  private activeCount = 0;
  // 最大并发数
  private concurrency: number;

  constructor(concurrency = 5) {
    this.concurrency = concurrency;
  }

  /**
   * 添加请求到队列
   * @param fn - 返回 Promise 的函数（延迟执行）
   * @returns Promise，在请求实际完成时 resolve
   */
  add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      // 将请求包装后加入队列
      // 注意：这里不是立即执行，而是将"执行函数"加入队列
      this.queue.push(() => fn().then(resolve).catch(reject));
      // 尝试处理队列
      this.process();
    });
  }

  /**
   * 处理队列：在并发限制内执行请求
   */
  private process() {
    // 循环执行，直到达到并发限制或队列为空
    while (this.activeCount < this.concurrency && this.queue.length > 0) {
      // 从队列头部取出请求
      const fn = this.queue.shift()!;
      // 增加活跃计数
      this.activeCount++;
      
      // 执行请求，完成后触发下一个
      fn().finally(() => {
        // 减少活跃计数
        this.activeCount--;
        // 递归处理下一个请求
        this.process();
      });
    }
  }
}

// ========== 使用示例 ==========
const queue = new RequestQueue(5);  // 最多 5 个并发

// 100 个请求，但同时只有 5 个在执行
const results = await Promise.all(
  urls.map(url => queue.add(() => axios.get(url)))
);
```

## 集成到 Axios

将并发控制集成到 Axios 实例中，对使用者透明：

```typescript
// src/plugins/concurrency.ts

import { AxiosInstance, AxiosRequestConfig } from 'axios';

interface QueueItem {
  config: AxiosRequestConfig;
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

/**
 * 为 Axios 实例设置并发限制
 * 
 * 实现方式：替换适配器
 * - 原始适配器负责实际发送请求
 * - 新适配器负责控制何时调用原始适配器
 * 
 * @param instance - Axios 实例
 * @param limit - 最大并发数
 * @returns 控制对象，可查询状态或恢复
 */
export function setupConcurrencyLimit(
  instance: AxiosInstance,
  limit = 5
) {
  // 请求队列
  const queue: QueueItem[] = [];
  // 当前活跃请求数
  let activeCount = 0;

  /**
   * 处理队列中的请求
   */
  const processQueue = () => {
    // 在并发限制内，从队列取出请求执行
    while (activeCount < limit && queue.length > 0) {
      const item = queue.shift()!;
      activeCount++;
      
      // 使用原始适配器发送请求
      const adapter = instance.defaults.adapter!;
      
      adapter(item.config)
        .then(item.resolve)
        .catch(item.reject)
        .finally(() => {
          // 请求完成，减少活跃计数，处理下一个
          activeCount--;
          processQueue();
        });
    }
  };

  // ========== 核心：替换适配器 ==========
  
  // 保存原始适配器
  const originalAdapter = instance.defaults.adapter;
  
  // 新适配器：将请求加入队列而不是立即执行
  instance.defaults.adapter = (config) => {
    return new Promise((resolve, reject) => {
      // 加入队列
      queue.push({ config, resolve, reject });
      // 尝试处理
      processQueue();
    });
  };

  // ========== 返回控制接口 ==========
  return {
    /** 获取当前活跃请求数 */
    getActiveCount: () => activeCount,
    /** 获取队列中等待的请求数 */
    getQueueLength: () => queue.length,
    /** 动态调整并发限制 */
    setLimit: (newLimit: number) => {
      limit = newLimit;
      processQueue();  // 可能可以执行更多请求
    },
    /** 恢复原始适配器，移除并发限制 */
    restore: () => {
      instance.defaults.adapter = originalAdapter;
    },
  };
}
```

## 更高级的并发控制

实际项目中可能需要更多功能：优先级队列、等待超时、动态调整等：

```typescript
// src/plugins/advancedConcurrency.ts

interface ConcurrencyOptions {
  /** 最大并发数 */
  limit: number;
  /** 每个请求的最大等待时间（毫秒），超时则 reject */
  maxWaitTime?: number;
  /** 优先级字段名，用于从 config 中读取优先级 */
  priorityField?: string;
}

interface QueueItem {
  config: AxiosRequestConfig;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  /** 优先级，数字越大越优先 */
  priority: number;
  /** 加入队列的时间戳，用于超时检测 */
  addedAt: number;
}

/**
 * 创建高级并发控制器
 * 
 * 特性：
 * - 优先级队列：高优先级请求先执行
 * - 超时控制：等待过长的请求自动 reject
 * - 状态查询：实时查看队列状态
 * - 队列清空：紧急情况下清空所有等待的请求
 */
export function createConcurrencyController(options: ConcurrencyOptions) {
  const { limit, maxWaitTime = 30000, priorityField = '__priority' } = options;
  
  const queue: QueueItem[] = [];
  let activeCount = 0;

  /**
   * 按优先级排序队列
   * 高优先级在前，优先执行
   */
  const sortQueue = () => {
    queue.sort((a, b) => b.priority - a.priority);
  };

  /**
   * 检查并移除超时的请求
   * 等待过长的请求直接 reject，避免无限等待
   */
  const checkTimeout = () => {
    const now = Date.now();
    
    // 找出所有超时的请求
    const timedOut = queue.filter(item => now - item.addedAt > maxWaitTime);
    
    // 从队列中移除并 reject
    timedOut.forEach(item => {
      const index = queue.indexOf(item);
      if (index > -1) {
        queue.splice(index, 1);
        item.reject(new Error(`Request queued for too long (${maxWaitTime}ms)`));
      }
    });
  };

  /**
   * 处理队列
   */
  const processQueue = () => {
    // 先检查超时
    checkTimeout();
    // 按优先级排序
    sortQueue();

    // 在并发限制内执行请求
    while (activeCount < limit && queue.length > 0) {
      const item = queue.shift()!;
      activeCount++;

      executeRequest(item.config)
        .then(item.resolve)
        .catch(item.reject)
        .finally(() => {
          activeCount--;
          processQueue();
        });
    }
  };

  /**
   * 执行实际请求
   */
  const executeRequest = async (config: AxiosRequestConfig) => {
    // 调用实际的适配器发送请求
    const adapter = config.adapter || xhrAdapter;
    return adapter(config);
  };

  // ========== 返回控制器接口 ==========
  return {
    /**
     * 添加请求到队列
     * @param config - 请求配置，可包含优先级字段
     */
    enqueue(config: AxiosRequestConfig): Promise<AxiosResponse> {
      return new Promise((resolve, reject) => {
        // 从 config 中读取优先级，默认为 0
        const priority = (config as any)[priorityField] || 0;
        
        queue.push({
          config,
          resolve,
          reject,
          priority,
          addedAt: Date.now(),
        });

        processQueue();
      });
    },

    /**
     * 获取队列状态
     * 用于监控和调试
     */
    getStatus() {
      return {
        active: activeCount,   // 正在执行的请求数
        queued: queue.length,  // 等待中的请求数
        limit,                 // 并发限制
      };
    },

    /**
     * 清空队列
     * 紧急情况下使用，所有等待的请求都会被 reject
     */
    clear() {
      queue.forEach(item => {
        item.reject(new Error('Queue cleared'));
      });
      queue.length = 0;
    },
  };
}

// ========== 使用示例 ==========
const controller = createConcurrencyController({ limit: 5 });

// 高优先级请求（优先执行）
const critical = await controller.enqueue({
  url: '/api/critical',
  __priority: 10,  // 高优先级
});

// 普通请求
const normal = await controller.enqueue({
  url: '/api/data',
  __priority: 0,   // 默认优先级
});

// 查看队列状态
console.log(controller.getStatus());  // { active: 2, queued: 0, limit: 5 }
```

## 按域名限制

不同域名可能需要不同的并发限制（例如，自己的 API 可以 6 个并发，第三方 API 只允许 2 个）：

```typescript
// src/plugins/domainConcurrency.ts

/**
 * 按域名管理并发限制
 * 每个域名有独立的并发控制器
 */
class DomainConcurrencyManager {
  // 域名 -> 控制器的映射
  private controllers: Map<string, ReturnType<typeof createConcurrencyController>> = new Map();
  private defaultLimit: number;

  constructor(defaultLimit = 5) {
    this.defaultLimit = defaultLimit;
  }

  /**
   * 为特定域名设置并发限制
   * @param domain - 域名（如 'api.example.com'）
   * @param limit - 该域名的最大并发数
   */
  setLimit(domain: string, limit: number) {
    if (!this.controllers.has(domain)) {
      this.controllers.set(domain, createConcurrencyController({ limit }));
    }
  }

  /**
   * 发送请求（自动根据域名应用并发限制）
   */
  async request(config: AxiosRequestConfig): Promise<AxiosResponse> {
    // 解析域名
    const url = new URL(config.url!, config.baseURL);
    const domain = url.hostname;

    // 获取或创建该域名的控制器
    if (!this.controllers.has(domain)) {
      this.controllers.set(domain, createConcurrencyController({ 
        limit: this.defaultLimit 
      }));
    }

    // 使用对应的控制器发送请求
    const controller = this.controllers.get(domain)!;
    return controller.enqueue(config);
  }

  /**
   * 获取所有域名的队列状态
   * 用于监控和调试
   */
  getStatus(): Record<string, { active: number; queued: number }> {
    const status: Record<string, any> = {};
    
    this.controllers.forEach((controller, domain) => {
      status[domain] = controller.getStatus();
    });
    
    return status;
  }
}

// ========== 使用示例 ==========
const manager = new DomainConcurrencyManager(6);  // 默认 6 并发

// 为慢速 API 设置更低的限制
manager.setLimit('slow-api.example.com', 2);

// 请求会根据域名自动应用不同的限制
await manager.request({ url: 'https://fast-api.example.com/data' });  // 限制 6
await manager.request({ url: 'https://slow-api.example.com/data' });  // 限制 2

// 查看所有域名的状态
console.log(manager.getStatus());
// {
//   'fast-api.example.com': { active: 1, queued: 0, limit: 6 },
//   'slow-api.example.com': { active: 2, queued: 5, limit: 2 }
// }
```

## 批量请求工具

对于需要批量获取数据的场景，提供一个高级封装：

```typescript
// src/utils/batch.ts

interface BatchOptions {
  /** 每批数量（每批内并发执行） */
  batchSize?: number;
  /** 批次间延迟（毫秒），用于降低服务器压力 */
  delayBetweenBatches?: number;
  /** 失败时是否继续处理后续请求 */
  continueOnError?: boolean;
}

/**
 * 批量请求工具
 * 将大量请求分批执行，每批内并发，批次间可设置延迟
 * 
 * @param items - 需要处理的数据数组
 * @param requestFn - 将单个数据转换为请求 Promise 的函数
 * @param options - 批量选项
 * @returns 成功结果和失败记录
 */
export async function batchRequest<T, R>(
  items: T[],
  requestFn: (item: T) => Promise<R>,
  options: BatchOptions = {}
): Promise<{ results: R[]; errors: Array<{ item: T; error: any }> }> {
  const { 
    batchSize = 5, 
    delayBetweenBatches = 100, 
    continueOnError = true 
  } = options;

  const results: R[] = [];
  const errors: Array<{ item: T; error: any }> = [];

  // ========== 步骤 1: 将数据分批 ==========
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }

  // ========== 步骤 2: 逐批执行 ==========
  for (const batch of batches) {
    // 批内并发执行
    const batchPromises = batch.map(async (item) => {
      try {
        const result = await requestFn(item);
        results.push(result);
      } catch (error) {
        errors.push({ item, error });
        if (!continueOnError) {
          throw error;  // 中断执行
        }
      }
    });

    await Promise.all(batchPromises);

    // 批次间延迟（最后一批不需要）
    if (delayBetweenBatches > 0 && batches.indexOf(batch) < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }
  }

  return { results, errors };
}

// ========== 使用示例 ==========
const userIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const { results, errors } = await batchRequest(
  userIds,
  (id) => axios.get(`/users/${id}`),
  { 
    batchSize: 3,           // 每批 3 个
    delayBetweenBatches: 200 // 批次间隔 200ms
  }
);

console.log(`成功: ${results.length}, 失败: ${errors.length}`);

// 处理失败的请求
errors.forEach(({ item, error }) => {
  console.error(`用户 ${item} 获取失败:`, error.message);
});
```

## 测试

为并发控制编写完整的测试：

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupConcurrencyLimit } from '../src/plugins/concurrency';
import axios from 'axios';

describe('Concurrency Limit', () => {
  // ========== 核心功能测试：并发数限制 ==========
  
  it('should limit concurrent requests to specified number', async () => {
    const instance = axios.create();
    let activeCount = 0;    // 当前活跃请求数
    let maxActive = 0;      // 记录峰值

    // 创建一个慢速的 mock 适配器
    instance.defaults.adapter = async () => {
      activeCount++;
      maxActive = Math.max(maxActive, activeCount);
      // 模拟请求耗时
      await new Promise(resolve => setTimeout(resolve, 50));
      activeCount--;
      return { data: 'ok', status: 200, statusText: 'OK', headers: {}, config: {} };
    };

    // 设置并发限制为 3
    const control = setupConcurrencyLimit(instance, 3);

    // 发送 10 个并发请求
    const promises = Array(10).fill(null).map(() => instance.get('/test'));
    await Promise.all(promises);

    // 验证：峰值并发数不超过限制
    expect(maxActive).toBeLessThanOrEqual(3);
    
    // 清理
    control.restore();
  });

  // ========== 状态查询测试 ==========
  
  it('should correctly report queue status', async () => {
    const instance = axios.create();
    
    // 慢速适配器
    instance.defaults.adapter = async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      return { data: 'ok', status: 200, statusText: 'OK', headers: {}, config: {} };
    };

    const control = setupConcurrencyLimit(instance, 2);

    // 发送 5 个请求
    const promises = Array(5).fill(null).map(() => instance.get('/test'));

    // 稍等片刻让请求开始处理
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // 验证状态：2 个活跃，3 个等待
    expect(control.getActiveCount()).toBe(2);
    expect(control.getQueueLength()).toBe(3);

    await Promise.all(promises);
    control.restore();
  });

  // ========== 动态调整限制测试 ==========
  
  it('should allow dynamic limit adjustment', async () => {
    const instance = axios.create();
    const control = setupConcurrencyLimit(instance, 2);
    
    // 动态调整为 5
    control.setLimit(5);
    
    // 验证新限制生效（通过状态检查）
    // ... 具体测试逻辑
    
    control.restore();
  });
});
```

## 常见问题解答

### Q1: 并发限制设为多少比较合适？

取决于场景：

| 场景 | 推荐限制 | 原因 |
|------|----------|------|
| 浏览器 HTTP/1.1 | 4-6 | 浏览器对同域名限制约 6 个 |
| 浏览器 HTTP/2 | 10-20 | HTTP/2 多路复用，限制更宽松 |
| Node.js 服务器 | 50-100 | 无浏览器限制，取决于服务器承载 |
| 第三方限流 API | 按 API 限制 | 如 GitHub API 限制每秒 10 个 |

### Q2: 请求在队列中等待过长怎么办？

使用 `maxWaitTime` 选项，超时的请求会自动 reject：

```typescript
const controller = createConcurrencyController({ 
  limit: 5, 
  maxWaitTime: 5000  // 等待超过 5 秒就放弃
});
```

### Q3: 如何给某些请求更高优先级？

在请求配置中添加优先级字段：

```typescript
// 紧急请求
axios.get('/api/critical', { __priority: 100 });

// 普通请求
axios.get('/api/normal', { __priority: 0 });
```

### Q4: 为什么用适配器替换而不是拦截器？

拦截器在请求发送前执行，无法真正"阻止"请求。适配器是实际发送请求的地方，替换它才能真正控制发送时机。

## 小结

并发控制是高性能应用的关键能力：

**核心知识点**：

| 主题 | 说明 |
|------|------|
| 浏览器限制 | 同域名 HTTP/1.1 约 6 个并发 |
| 请求队列 | 维护活跃计数，限制内才发送 |
| 优先级队列 | 高优先级请求先执行 |
| 超时控制 | 等待过长的请求自动 reject |
| 按域名隔离 | 不同域名可设置不同限制 |

**使用场景对照**：

```
批量数据获取    → batchRequest 工具
文件批量上传    → RequestQueue + 较大 limit
第三方 API      → 按文档设置 limit + 延迟
资源密集型操作  → 低 limit + 高 maxWaitTime
```

下一节我们实现进度监控。
