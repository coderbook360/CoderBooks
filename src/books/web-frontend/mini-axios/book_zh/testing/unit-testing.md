# 单元测试

单元测试确保每个模块独立工作正常。我们使用 Vitest 测试框架。

## 本节目标

通过本节学习，你将掌握：

1. **配置 Vitest 测试环境**：支持 TypeScript 和浏览器 API
2. **编写测试辅助工具**：模拟 XHR、创建 mock 数据
3. **测试核心工具函数**：URL 构建、Headers 处理、数据转换
4. **测试核心类**：Axios 类、拦截器管理器、错误类
5. **遵循测试最佳实践**：隔离、覆盖、可读性

## 为什么需要单元测试？

没有测试的代码就像没有保险的车——看起来能跑，但出问题时代价巨大：

```typescript
// ❌ 没有测试：修改代码时心惊胆战
function buildURL(url, params) {
  // 改了这里会不会影响其他地方？
}

// ✅ 有测试：放心重构
// 测试通过 = 功能正常
// 测试失败 = 立即发现问题
```

**单元测试的价值**：

| 价值 | 说明 |
|------|------|
| 回归保护 | 修改代码时立即发现破坏 |
| 设计反馈 | 难以测试的代码 = 设计有问题 |
| 活文档 | 测试用例就是使用示例 |
| 重构信心 | 有测试保护才敢大胆重构 |

## 测试环境配置

```typescript
// vitest.config.ts

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,              // 全局 describe/it/expect
    environment: 'jsdom',       // 模拟浏览器环境（支持 XMLHttpRequest）
    coverage: {
      provider: 'v8',           // 覆盖率引擎
      reporter: ['text', 'json', 'html'],  // 报告格式
      exclude: [
        'node_modules',
        'dist',
        '**/*.d.ts',
        '**/*.test.ts',
      ],
    },
  },
});
```

```json
// package.json
{
  "scripts": {
    "test": "vitest",              // 监听模式
    "test:run": "vitest run",       // 单次运行
    "test:coverage": "vitest run --coverage"  // 覆盖率报告
  }
}
```

## 测试辅助工具

在编写测试前，先准备好辅助工具函数：

```typescript
// test/helpers.ts

import { vi } from 'vitest';
import type { AxiosRequestConfig, AxiosResponse } from '../src/types';

/**
 * 创建模拟响应对象
 * 避免每个测试都重复写完整的响应结构
 */
export function createMockResponse<T>(
  data: T,
  options: Partial<AxiosResponse<T>> = {}
): AxiosResponse<T> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {} as AxiosRequestConfig,
    ...options,  // 允许覆盖默认值
  };
}

/**
 * 创建模拟请求配置
 */
export function createMockConfig(
  overrides: Partial<AxiosRequestConfig> = {}
): AxiosRequestConfig {
  return {
    url: '/test',
    method: 'GET',
    headers: {},
    ...overrides,
  };
}

/**
 * 模拟 XMLHttpRequest
 * 
 * 关键点：
 * 1. 提供所有需要的属性和方法
 * 2. 使用 vi.fn() 使方法可被断言
 * 3. 返回 mock 对象供后续操作
 */
export function mockXHR() {
  const xhrMock = {
    open: vi.fn(),
    send: vi.fn(),
    setRequestHeader: vi.fn(),
    getAllResponseHeaders: vi.fn(() => ''),
    readyState: 4,
    status: 200,
    statusText: 'OK',
    responseText: '{}',
    response: {},
    onreadystatechange: null as any,
    onerror: null as any,
    ontimeout: null as any,
    abort: vi.fn(),
  };

  // 替换全局 XMLHttpRequest
  vi.stubGlobal('XMLHttpRequest', vi.fn(() => xhrMock));

  return xhrMock;  // 返回以便测试中操作
}

/**
 * 触发 XHR 成功响应
 * 模拟 readyState 变化和回调触发
 */
export function triggerXHRSuccess(xhr: any, response: any) {
  xhr.response = response;
  xhr.responseText = JSON.stringify(response);
  xhr.readyState = 4;
  xhr.status = 200;
  xhr.onreadystatechange?.();  // 触发回调
}
```
```

## 测试 URL 构建

```typescript
// test/helpers/buildURL.test.ts

import { describe, it, expect } from 'vitest';
import { buildURL } from '../../src/helpers/buildURL';

describe('buildURL', () => {
  it('should return url when no params', () => {
    expect(buildURL('/api/users')).toBe('/api/users');
  });

  it('should append params to url', () => {
    const url = buildURL('/api/users', { id: 1, name: 'test' });
    expect(url).toBe('/api/users?id=1&name=test');
  });

  it('should handle existing query string', () => {
    const url = buildURL('/api/users?type=admin', { id: 1 });
    expect(url).toBe('/api/users?type=admin&id=1');
  });

  it('should ignore null and undefined values', () => {
    const url = buildURL('/api/users', { 
      id: 1, 
      name: null, 
      age: undefined 
    });
    expect(url).toBe('/api/users?id=1');
  });

  it('should serialize arrays', () => {
    const url = buildURL('/api/users', { ids: [1, 2, 3] });
    expect(url).toBe('/api/users?ids[]=1&ids[]=2&ids[]=3');
  });

  it('should serialize objects', () => {
    const url = buildURL('/api/users', { 
      filter: { status: 'active', role: 'admin' } 
    });
    expect(url).toContain('filter[status]=active');
    expect(url).toContain('filter[role]=admin');
  });

  it('should encode special characters', () => {
    const url = buildURL('/api/search', { q: 'hello world' });
    expect(url).toBe('/api/search?q=hello%20world');
  });

  it('should preserve safe characters', () => {
    const url = buildURL('/api/search', { q: '@:$' });
    expect(url).toBe('/api/search?q=@:$');
  });

  it('should use custom serializer', () => {
    const serializer = (params: any) => `custom=${params.value}`;
    const url = buildURL('/api', { value: 1 }, serializer);
    expect(url).toBe('/api?custom=1');
  });

  it('should strip hash from url', () => {
    const url = buildURL('/api/users#section', { id: 1 });
    expect(url).toBe('/api/users?id=1');
  });
});
```

## 测试 Headers 处理

```typescript
// test/helpers/headers.test.ts

import { describe, it, expect } from 'vitest';
import { 
  processHeaders, 
  parseHeaders, 
  normalizeHeaderName 
} from '../../src/helpers/headers';

describe('Headers', () => {
  describe('normalizeHeaderName', () => {
    it('should normalize content-type', () => {
      const headers = { 'content-type': 'application/json' };
      normalizeHeaderName(headers, 'Content-Type');
      expect(headers).toEqual({ 'Content-Type': 'application/json' });
    });
  });

  describe('processHeaders', () => {
    it('should set Content-Type for plain object', () => {
      const headers = processHeaders({}, { name: 'test' });
      expect(headers['Content-Type']).toBe('application/json;charset=utf-8');
    });

    it('should not override existing Content-Type', () => {
      const headers = processHeaders(
        { 'Content-Type': 'text/plain' },
        { name: 'test' }
      );
      expect(headers['Content-Type']).toBe('text/plain');
    });

    it('should not set Content-Type for FormData', () => {
      const formData = new FormData();
      const headers = processHeaders({}, formData);
      expect(headers['Content-Type']).toBeUndefined();
    });

    it('should not set Content-Type for null data', () => {
      const headers = processHeaders({}, null);
      expect(headers['Content-Type']).toBeUndefined();
    });
  });

  describe('parseHeaders', () => {
    it('should parse header string', () => {
      const headerStr = 'Content-Type: application/json\r\n' +
                        'Content-Length: 100\r\n';
      const headers = parseHeaders(headerStr);
      expect(headers['content-type']).toBe('application/json');
      expect(headers['content-length']).toBe('100');
    });

    it('should handle empty string', () => {
      expect(parseHeaders('')).toEqual({});
    });

    it('should handle malformed headers', () => {
      const headers = parseHeaders('invalid-header\r\n');
      expect(headers).toEqual({});
    });
  });
});
```

## 测试拦截器

```typescript
// test/core/InterceptorManager.test.ts

import { describe, it, expect, vi } from 'vitest';
import InterceptorManager from '../../src/core/InterceptorManager';

describe('InterceptorManager', () => {
  it('should add interceptor', () => {
    const manager = new InterceptorManager();
    const fulfilled = vi.fn();
    const id = manager.use(fulfilled);
    
    expect(id).toBe(0);
  });

  it('should remove interceptor', () => {
    const manager = new InterceptorManager();
    const fulfilled = vi.fn();
    const id = manager.use(fulfilled);
    
    manager.eject(id);
    
    let count = 0;
    manager.forEach(() => count++);
    expect(count).toBe(0);
  });

  it('should iterate interceptors', () => {
    const manager = new InterceptorManager();
    const fulfilled1 = vi.fn();
    const fulfilled2 = vi.fn();
    
    manager.use(fulfilled1);
    manager.use(fulfilled2);
    
    const interceptors: any[] = [];
    manager.forEach((interceptor) => {
      interceptors.push(interceptor);
    });
    
    expect(interceptors).toHaveLength(2);
    expect(interceptors[0].fulfilled).toBe(fulfilled1);
    expect(interceptors[1].fulfilled).toBe(fulfilled2);
  });

  it('should skip null interceptors', () => {
    const manager = new InterceptorManager();
    const fulfilled1 = vi.fn();
    const fulfilled2 = vi.fn();
    
    const id1 = manager.use(fulfilled1);
    manager.use(fulfilled2);
    manager.eject(id1);
    
    const interceptors: any[] = [];
    manager.forEach((interceptor) => {
      interceptors.push(interceptor);
    });
    
    expect(interceptors).toHaveLength(1);
    expect(interceptors[0].fulfilled).toBe(fulfilled2);
  });

  it('should clear all interceptors', () => {
    const manager = new InterceptorManager();
    manager.use(vi.fn());
    manager.use(vi.fn());
    
    manager.clear();
    
    let count = 0;
    manager.forEach(() => count++);
    expect(count).toBe(0);
  });
});
```

## 测试配置合并

```typescript
// test/core/mergeConfig.test.ts

import { describe, it, expect } from 'vitest';
import { mergeConfig } from '../../src/core/mergeConfig';
import type { AxiosRequestConfig } from '../../src/types';

describe('mergeConfig', () => {
  it('should merge simple values', () => {
    const config1: AxiosRequestConfig = { timeout: 1000 };
    const config2: AxiosRequestConfig = { timeout: 2000 };
    const result = mergeConfig(config1, config2);
    
    expect(result.timeout).toBe(2000);
  });

  it('should use config2 url/method/data', () => {
    const config1: AxiosRequestConfig = { 
      url: '/api/a', 
      method: 'GET',
      data: { old: true }
    };
    const config2: AxiosRequestConfig = { 
      url: '/api/b', 
      method: 'POST',
      data: { new: true }
    };
    const result = mergeConfig(config1, config2);
    
    expect(result.url).toBe('/api/b');
    expect(result.method).toBe('POST');
    expect(result.data).toEqual({ new: true });
  });

  it('should deep merge headers', () => {
    const config1: AxiosRequestConfig = {
      headers: {
        common: { 'X-Custom': 'value1' },
        get: { 'Accept': 'application/json' },
      },
    };
    const config2: AxiosRequestConfig = {
      headers: {
        common: { 'X-Another': 'value2' },
        post: { 'Content-Type': 'application/json' },
      },
    };
    const result = mergeConfig(config1, config2);
    
    expect(result.headers?.common).toEqual({
      'X-Custom': 'value1',
      'X-Another': 'value2',
    });
    expect(result.headers?.get).toEqual({ 'Accept': 'application/json' });
    expect(result.headers?.post).toEqual({ 'Content-Type': 'application/json' });
  });

  it('should merge params', () => {
    const config1: AxiosRequestConfig = {
      params: { page: 1 },
    };
    const config2: AxiosRequestConfig = {
      params: { limit: 10 },
    };
    const result = mergeConfig(config1, config2);
    
    expect(result.params).toEqual({ page: 1, limit: 10 });
  });

  it('should handle undefined config2', () => {
    const config1: AxiosRequestConfig = { timeout: 1000 };
    const result = mergeConfig(config1, undefined);
    
    expect(result.timeout).toBe(1000);
  });
});
```

## 测试 CancelToken

```typescript
// test/cancel/CancelToken.test.ts

import { describe, it, expect, vi } from 'vitest';
import CancelToken from '../../src/cancel/CancelToken';
import { isCancel } from '../../src/cancel/isCancel';

describe('CancelToken', () => {
  describe('constructor', () => {
    it('should call executor with cancel function', () => {
      let cancelFn: any;
      new CancelToken((c) => {
        cancelFn = c;
      });
      
      expect(typeof cancelFn).toBe('function');
    });

    it('should set reason when cancelled', async () => {
      let cancelFn: any;
      const token = new CancelToken((c) => {
        cancelFn = c;
      });
      
      cancelFn('Operation cancelled');
      
      await expect(token.promise).resolves.toMatchObject({
        message: 'Operation cancelled',
      });
      expect(token.reason?.message).toBe('Operation cancelled');
    });
  });

  describe('source', () => {
    it('should create token and cancel function', () => {
      const source = CancelToken.source();
      
      expect(source.token).toBeInstanceOf(CancelToken);
      expect(typeof source.cancel).toBe('function');
    });

    it('should cancel token via source', async () => {
      const source = CancelToken.source();
      source.cancel('Cancelled via source');
      
      await expect(source.token.promise).resolves.toMatchObject({
        message: 'Cancelled via source',
      });
    });
  });

  describe('throwIfRequested', () => {
    it('should not throw if not cancelled', () => {
      const token = new CancelToken(() => {});
      
      expect(() => token.throwIfRequested()).not.toThrow();
    });

    it('should throw if cancelled', () => {
      let cancelFn: any;
      const token = new CancelToken((c) => {
        cancelFn = c;
      });
      
      cancelFn('Cancelled');
      
      expect(() => token.throwIfRequested()).toThrow();
    });
  });
});

describe('isCancel', () => {
  it('should return true for Cancel object', () => {
    let cancelFn: any;
    const token = new CancelToken((c) => {
      cancelFn = c;
    });
    cancelFn('test');
    
    expect(isCancel(token.reason)).toBe(true);
  });

  it('should return false for regular error', () => {
    expect(isCancel(new Error('test'))).toBe(false);
  });

  it('should return false for null/undefined', () => {
    expect(isCancel(null)).toBe(false);
    expect(isCancel(undefined)).toBe(false);
  });
});
```

## 测试 AxiosError

```typescript
// test/core/AxiosError.test.ts

import { describe, it, expect } from 'vitest';
import { AxiosError, isAxiosError } from '../../src/core/AxiosError';
import { createMockConfig, createMockResponse } from '../helpers';

describe('AxiosError', () => {
  it('should create error with message', () => {
    const error = new AxiosError('Network Error');
    
    expect(error.message).toBe('Network Error');
    expect(error.isAxiosError).toBe(true);
  });

  it('should include config', () => {
    const config = createMockConfig({ url: '/test' });
    const error = new AxiosError('Error', 'ERR_NETWORK', config);
    
    expect(error.config).toBe(config);
    expect(error.code).toBe('ERR_NETWORK');
  });

  it('should include response', () => {
    const config = createMockConfig();
    const response = createMockResponse({ error: 'Not Found' }, { status: 404 });
    const error = new AxiosError(
      'Not Found',
      'ERR_BAD_REQUEST',
      config,
      null,
      response
    );
    
    expect(error.response).toBe(response);
    expect(error.status).toBe(404);
  });

  it('should serialize to JSON', () => {
    const error = new AxiosError(
      'Test Error',
      'TEST_CODE',
      createMockConfig()
    );
    const json = error.toJSON();
    
    expect(json.message).toBe('Test Error');
    expect(json.code).toBe('TEST_CODE');
  });
});

describe('isAxiosError', () => {
  it('should return true for AxiosError', () => {
    const error = new AxiosError('test');
    expect(isAxiosError(error)).toBe(true);
  });

  it('should return false for regular Error', () => {
    expect(isAxiosError(new Error('test'))).toBe(false);
  });

  it('should return false for null', () => {
    expect(isAxiosError(null)).toBe(false);
  });
});
```

## 运行测试

```bash
# 运行所有测试
npm test

# 运行特定文件（模糊匹配）
npm test -- buildURL

# 查看覆盖率报告
npm run test:coverage

# 监听模式（文件变化自动重跑）
npm test -- --watch
```

## 测试目录结构

组织测试文件的推荐方式：

```
test/
├── helpers.ts              # 测试辅助函数
├── helpers/                # 工具函数测试
│   ├── buildURL.test.ts
│   ├── headers.test.ts
│   └── data.test.ts
├── core/                   # 核心类测试
│   ├── Axios.test.ts
│   ├── InterceptorManager.test.ts
│   ├── mergeConfig.test.ts
│   └── AxiosError.test.ts
├── cancel/                 # 取消机制测试
│   └── CancelToken.test.ts
└── adapters/               # 适配器测试
    ├── xhr.test.ts
    └── http.test.ts
```

## 常见问题解答

### Q: 单元测试和集成测试的区别？

| 维度 | 单元测试 | 集成测试 |
|-----|---------|---------|
| 范围 | 单个函数/类 | 多个模块协作 |
| 速度 | 毫秒级 | 秒级 |
| 隔离 | 完全隔离 | 使用 Mock Server |
| 目的 | 验证逻辑正确 | 验证协作正确 |

### Q: 测试覆盖率多少算够？

一般建议：
- **核心逻辑**：90%+
- **工具函数**：100%
- **整体项目**：80%+

但覆盖率不是唯一指标，测试质量更重要。

### Q: 如何测试异步代码？

```typescript
// 使用 async/await
it('should handle async', async () => {
  const result = await asyncFunction();
  expect(result).toBe(expected);
});

// 使用 resolves/rejects
it('should resolve', () => {
  return expect(asyncFunction()).resolves.toBe(expected);
});
```

## 小结

本节我们学习了如何为 Mini-Axios 编写单元测试：

```
单元测试体系
├── 环境配置
│   ├── vitest.config.ts
│   └── jsdom 环境
├── 辅助工具
│   ├── createMockResponse
│   ├── createMockConfig
│   └── mockXHR
├── 测试分类
│   ├── 工具函数测试（buildURL、headers）
│   ├── 核心类测试（Axios、InterceptorManager）
│   ├── 取消机制测试（CancelToken）
│   └── 错误处理测试（AxiosError）
└── 运行方式
    ├── npm test（监听）
    ├── npm test:run（单次）
    └── npm test:coverage（覆盖率）
```

**核心要点**：

| 要点 | 说明 |
|------|------|
| 隔离性 | 每个测试独立运行，互不影响 |
| 完整性 | 覆盖正常和异常场景 |
| 可读性 | 测试描述清晰明了 |
| 快速性 | 单元测试要快（毫秒级） |

**测试优先级**：

1. URL 构建和参数序列化（使用频率高）
2. Headers 处理（容易出错）
3. 配置合并（逻辑复杂）
4. 拦截器管理（核心功能）
5. 取消机制（边界情况多）
6. 错误处理（用户体验关键）

下一节，我们学习集成测试。
