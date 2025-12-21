# 集成测试

集成测试验证多个模块协作是否正常。我们测试完整的请求流程。

## 本节目标

通过本节学习，你将掌握：

1. **使用 MSW 搭建 Mock 服务器**：无需真实后端
2. **测试完整请求流程**：从发起到响应的全链路
3. **测试拦截器集成**：请求/响应拦截器协作
4. **测试取消和错误场景**：边界情况验证
5. **测试实例隔离**：多实例互不影响

## 为什么需要集成测试？

单元测试验证每个模块独立工作，但模块之间的协作也可能出问题：

```typescript
// 单元测试：每个函数都正确 ✅
// 但组合起来可能出错 ❌

// 拦截器：添加 token
interceptors.request.use(config => {
  config.headers['Authorization'] = 'Bearer xxx';
  return config;
});

// Headers 处理：规范化 key
// 可能把 'Authorization' 改成 'authorization'
// 导致后端无法识别！
```

**集成测试的价值**：验证模块之间的"接缝"是否正确。

## 测试服务器搭建

使用 MSW (Mock Service Worker) 模拟 HTTP 服务，无需启动真实服务器：

```bash
npm install -D msw
```

```typescript
// test/mocks/handlers.ts

import { http, HttpResponse } from 'msw';

/**
 * MSW 请求处理器
 * 
 * 定义各种 API 端点的模拟响应
 * 可以根据请求参数返回不同结果
 */
export const handlers = [
  // ========== GET 请求 ==========
  http.get('/api/users', () => {
    return HttpResponse.json([
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]);
  }),

  // 带路径参数的 GET
  http.get('/api/users/:id', ({ params }) => {
    const { id } = params;
    return HttpResponse.json({ id: Number(id), name: 'User ' + id });
  }),

  // ========== POST 请求 ==========
  http.post('/api/users', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(
      { id: 3, ...body },
      { status: 201 }  // 返回 201 Created
    );
  }),

  // ========== 错误响应 ==========
  http.get('/api/error/404', () => {
    return new HttpResponse(null, { status: 404 });
  }),

  http.get('/api/error/500', () => {
    return new HttpResponse(null, { status: 500 });
  }),

  // ========== 超时模拟 ==========
  http.get('/api/slow', async () => {
    await new Promise(resolve => setTimeout(resolve, 5000));
    return HttpResponse.json({ message: 'slow response' });
  }),

  // ========== Echo 端点（用于测试） ==========
  // 返回请求的所有信息，便于验证请求是否正确
  http.all('/api/echo', async ({ request }) => {
    const url = new URL(request.url);
    const body = request.method !== 'GET' 
      ? await request.text() 
      : null;
    
    return HttpResponse.json({
      method: request.method,
      url: request.url,
      path: url.pathname,
      query: Object.fromEntries(url.searchParams),
      headers: Object.fromEntries(request.headers),
      body: body ? JSON.parse(body) : null,
    });
  }),
];
```
```

```typescript
// test/mocks/server.ts

import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

```typescript
// test/setup.ts

import { beforeAll, afterEach, afterAll } from 'vitest';
import { server } from './mocks/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

```typescript
// vitest.config.ts

export default defineConfig({
  test: {
    setupFiles: ['./test/setup.ts'],
    // ...
  },
});
```

## 基础请求测试

```typescript
// test/integration/request.test.ts

import { describe, it, expect } from 'vitest';
import axios from '../../src';

describe('Basic Requests', () => {
  it('should make GET request', async () => {
    const response = await axios.get('/api/users');
    
    expect(response.status).toBe(200);
    expect(response.data).toEqual([
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]);
  });

  it('should make GET request with params', async () => {
    const response = await axios.get('/api/echo', {
      params: { page: 1, limit: 10 },
    });
    
    expect(response.data.query).toEqual({
      page: '1',
      limit: '10',
    });
  });

  it('should make POST request with data', async () => {
    const response = await axios.post('/api/users', {
      name: 'Charlie',
      email: 'charlie@example.com',
    });
    
    expect(response.status).toBe(201);
    expect(response.data).toMatchObject({
      id: 3,
      name: 'Charlie',
    });
  });

  it('should make request with custom headers', async () => {
    const response = await axios.get('/api/echo', {
      headers: {
        'X-Custom-Header': 'custom-value',
        'Authorization': 'Bearer token123',
      },
    });
    
    expect(response.data.headers['x-custom-header']).toBe('custom-value');
    expect(response.data.headers['authorization']).toBe('Bearer token123');
  });
});
```

## 拦截器集成测试

```typescript
// test/integration/interceptors.test.ts

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from '../../src';

describe('Interceptors Integration', () => {
  let requestId: number;
  let responseId: number;

  afterEach(() => {
    axios.interceptors.request.eject(requestId);
    axios.interceptors.response.eject(responseId);
  });

  it('should modify request config', async () => {
    requestId = axios.interceptors.request.use((config) => {
      config.headers = config.headers || {};
      config.headers['X-Request-Id'] = 'test-123';
      return config;
    });

    const response = await axios.get('/api/echo');
    
    expect(response.data.headers['x-request-id']).toBe('test-123');
  });

  it('should transform response data', async () => {
    responseId = axios.interceptors.response.use((response) => {
      response.data = {
        ...response.data,
        intercepted: true,
      };
      return response;
    });

    const response = await axios.get('/api/users');
    
    expect(response.data.intercepted).toBe(true);
  });

  it('should handle request error', async () => {
    const onRejected = vi.fn((error) => {
      return Promise.reject(new Error('Request interceptor error'));
    });

    requestId = axios.interceptors.request.use(
      (config) => {
        throw new Error('Config error');
      },
      onRejected
    );

    await expect(axios.get('/api/users')).rejects.toThrow('Request interceptor error');
    expect(onRejected).toHaveBeenCalled();
  });

  it('should handle response error', async () => {
    responseId = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        error.handled = true;
        return Promise.reject(error);
      }
    );

    try {
      await axios.get('/api/error/404');
    } catch (error: any) {
      expect(error.handled).toBe(true);
    }
  });

  it('should execute multiple interceptors in order', async () => {
    const order: string[] = [];

    const id1 = axios.interceptors.request.use((config) => {
      order.push('request1');
      return config;
    });

    const id2 = axios.interceptors.request.use((config) => {
      order.push('request2');
      return config;
    });

    const id3 = axios.interceptors.response.use((response) => {
      order.push('response1');
      return response;
    });

    const id4 = axios.interceptors.response.use((response) => {
      order.push('response2');
      return response;
    });

    await axios.get('/api/users');

    expect(order).toEqual(['request2', 'request1', 'response1', 'response2']);

    // 清理
    axios.interceptors.request.eject(id1);
    axios.interceptors.request.eject(id2);
    axios.interceptors.response.eject(id3);
    axios.interceptors.response.eject(id4);
  });
});
```

## 取消请求集成测试

```typescript
// test/integration/cancel.test.ts

import { describe, it, expect, vi } from 'vitest';
import { server } from '../mocks/server';
import { http, HttpResponse, delay } from 'msw';
import axios from '../../src';
import CancelToken from '../../src/cancel/CancelToken';
import { isCancel } from '../../src/cancel/isCancel';

describe('Cancel Integration', () => {
  it('should cancel request with CancelToken', async () => {
    // 添加慢速响应处理器
    server.use(
      http.get('/api/cancellable', async () => {
        await delay(1000);
        return HttpResponse.json({ data: 'response' });
      })
    );

    const source = CancelToken.source();

    const promise = axios.get('/api/cancellable', {
      cancelToken: source.token,
    });

    // 立即取消
    source.cancel('User cancelled');

    await expect(promise).rejects.toMatchObject({
      message: 'User cancelled',
    });

    try {
      await promise;
    } catch (error) {
      expect(isCancel(error)).toBe(true);
    }
  });

  it('should cancel request with AbortController', async () => {
    server.use(
      http.get('/api/abortable', async () => {
        await delay(1000);
        return HttpResponse.json({ data: 'response' });
      })
    );

    const controller = new AbortController();

    const promise = axios.get('/api/abortable', {
      signal: controller.signal,
    });

    controller.abort();

    await expect(promise).rejects.toThrow();
  });

  it('should not cancel if not triggered', async () => {
    const source = CancelToken.source();

    const response = await axios.get('/api/users', {
      cancelToken: source.token,
    });

    expect(response.status).toBe(200);
  });
});
```

## 错误处理集成测试

```typescript
// test/integration/errors.test.ts

import { describe, it, expect } from 'vitest';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';
import axios from '../../src';
import { isAxiosError } from '../../src/core/AxiosError';

describe('Error Handling Integration', () => {
  it('should handle 404 error', async () => {
    try {
      await axios.get('/api/error/404');
      expect.fail('Should have thrown');
    } catch (error) {
      expect(isAxiosError(error)).toBe(true);
      if (isAxiosError(error)) {
        expect(error.response?.status).toBe(404);
      }
    }
  });

  it('should handle 500 error', async () => {
    try {
      await axios.get('/api/error/500');
      expect.fail('Should have thrown');
    } catch (error) {
      expect(isAxiosError(error)).toBe(true);
      if (isAxiosError(error)) {
        expect(error.response?.status).toBe(500);
      }
    }
  });

  it('should handle network error', async () => {
    server.use(
      http.get('/api/network-error', () => {
        return HttpResponse.error();
      })
    );

    try {
      await axios.get('/api/network-error');
      expect.fail('Should have thrown');
    } catch (error) {
      expect(isAxiosError(error)).toBe(true);
    }
  });

  it('should handle timeout', async () => {
    server.use(
      http.get('/api/timeout', async () => {
        await new Promise(resolve => setTimeout(resolve, 5000));
        return HttpResponse.json({});
      })
    );

    try {
      await axios.get('/api/timeout', { timeout: 100 });
      expect.fail('Should have thrown');
    } catch (error) {
      expect(isAxiosError(error)).toBe(true);
      if (isAxiosError(error)) {
        expect(error.code).toBe('ECONNABORTED');
      }
    }
  });

  it('should use custom validateStatus', async () => {
    // 404 不应该抛错
    const response = await axios.get('/api/error/404', {
      validateStatus: (status) => status < 500,
    });

    expect(response.status).toBe(404);

    // 500 应该抛错
    await expect(
      axios.get('/api/error/500', {
        validateStatus: (status) => status < 500,
      })
    ).rejects.toThrow();
  });
});
```

## 实例隔离测试

```typescript
// test/integration/instance.test.ts

import { describe, it, expect } from 'vitest';
import axios from '../../src';

describe('Axios Instance', () => {
  it('should create independent instance', async () => {
    const instance = axios.create({
      baseURL: '/api',
      timeout: 5000,
    });

    // 实例有独立配置
    expect(instance.defaults.baseURL).toBe('/api');
    expect(instance.defaults.timeout).toBe(5000);

    // 不影响全局实例
    expect(axios.defaults.baseURL).toBeUndefined();
  });

  it('should have independent interceptors', async () => {
    const instance = axios.create();
    const order: string[] = [];

    axios.interceptors.request.use((config) => {
      order.push('global');
      return config;
    });

    instance.interceptors.request.use((config) => {
      order.push('instance');
      return config;
    });

    await instance.get('/api/users');

    // 只有 instance 拦截器执行
    expect(order).toEqual(['instance']);

    // 清理全局拦截器
    axios.interceptors.request.clear();
  });

  it('should merge instance config with request config', async () => {
    const instance = axios.create({
      headers: {
        'X-Instance': 'true',
      },
    });

    const response = await instance.get('/api/echo', {
      headers: {
        'X-Request': 'true',
      },
    });

    expect(response.data.headers['x-instance']).toBe('true');
    expect(response.data.headers['x-request']).toBe('true');
  });
});
```

## 转换器集成测试

```typescript
// test/integration/transforms.test.ts

import { describe, it, expect } from 'vitest';
import axios from '../../src';

describe('Transforms Integration', () => {
  it('should transform request data', async () => {
    const response = await axios.post('/api/echo', {
      name: 'test',
    }, {
      transformRequest: [(data) => {
        return JSON.stringify({ ...data, transformed: true });
      }],
      headers: {
        'Content-Type': 'application/json',
      },
    });

    expect(response.data.body).toMatchObject({
      name: 'test',
      transformed: true,
    });
  });

  it('should transform response data', async () => {
    const response = await axios.get('/api/users', {
      transformResponse: [(data) => {
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        return {
          users: parsed,
          count: parsed.length,
        };
      }],
    });

    expect(response.data.count).toBe(2);
    expect(response.data.users).toHaveLength(2);
  });

  it('should chain multiple transforms', async () => {
    const response = await axios.get('/api/users', {
      transformResponse: [
        (data) => JSON.parse(data),
        (data) => data.map((u: any) => u.name),
        (names) => names.join(', '),
      ],
    });

    expect(response.data).toBe('Alice, Bob');
  });
});
```

## 运行集成测试

```bash
# 运行所有测试
npm test

# 只运行集成测试目录
npm test -- integration

# 查看覆盖率
npm run test:coverage
```

## 测试目录结构

推荐的目录组织方式：

```
test/
├── setup.ts                    # 全局测试配置（MSW 启动/关闭）
├── helpers.ts                  # 辅助函数
├── mocks/
│   ├── handlers.ts             # MSW 请求处理器定义
│   └── server.ts               # MSW 服务器实例
├── unit/                       # 单元测试
│   ├── helpers/
│   └── core/
└── integration/                # 集成测试
    ├── request.test.ts         # 基础请求测试
    ├── interceptors.test.ts    # 拦截器集成测试
    ├── cancel.test.ts          # 取消功能测试
    ├── errors.test.ts          # 错误处理测试
    ├── instance.test.ts        # 实例隔离测试
    └── transforms.test.ts      # 数据转换测试
```

## 常见问题解答

### Q: 为什么用 MSW 而不是真实服务器？

| 方式 | 优点 | 缺点 |
|-----|------|------|
| MSW | 无需启动服务、速度快、可控 | 不是真实网络 |
| 真实服务器 | 最真实的测试 | 需要维护、速度慢 |

推荐：单元测试和集成测试用 MSW，E2E 测试用真实服务。

### Q: 如何测试网络错误？

```typescript
import { http, HttpResponse } from 'msw';

server.use(
  http.get('/api/test', () => {
    return HttpResponse.error();  // 模拟网络错误
  })
);
```

### Q: 如何动态修改 Mock 响应？

```typescript
it('should handle different responses', async () => {
  // 临时覆盖 handler
  server.use(
    http.get('/api/users', () => {
      return HttpResponse.json({ special: 'response' });
    })
  );
  
  // 这个测试会使用临时响应
  const response = await axios.get('/api/users');
  expect(response.data.special).toBe('response');
});
// afterEach 中的 server.resetHandlers() 会恢复默认
```

## 小结

本节我们学习了如何编写集成测试验证模块协作：

```
集成测试体系
├── MSW 服务器
│   ├── handlers.ts（定义 Mock 响应）
│   ├── server.ts（创建服务器实例）
│   └── setup.ts（生命周期管理）
├── 测试分类
│   ├── 基础请求（GET/POST/PUT/DELETE）
│   ├── 拦截器集成（修改请求/响应）
│   ├── 取消功能（CancelToken/AbortController）
│   ├── 错误处理（HTTP 错误/网络错误）
│   ├── 实例隔离（多实例互不影响）
│   └── 数据转换（transformRequest/Response）
└── Echo 端点
    └── 返回请求信息，验证请求正确性
```

**核心要点**：

| 要点 | 说明 |
|------|------|
| 完整流程 | 测试从请求到响应的完整链路 |
| 模块协作 | 验证拦截器、转换器、适配器协作 |
| 边界情况 | 测试取消、超时、错误场景 |
| 隔离验证 | 确保多实例互不影响 |

**单元测试 vs 集成测试**：

| 维度 | 单元测试 | 集成测试 |
|-----|---------|---------|
| 范围 | 单个函数/类 | 多个模块协作 |
| 依赖 | 完全隔离（mock） | 使用 MSW 模拟网络 |
| 速度 | 非常快（毫秒） | 较快（秒级） |
| 价值 | 验证逻辑正确 | 验证协作正确 |

下一节，我们学习如何发布 npm 包。
