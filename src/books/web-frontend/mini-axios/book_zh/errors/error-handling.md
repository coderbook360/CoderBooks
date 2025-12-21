# 统一错误处理策略

这一节我们设计一套完整的错误处理策略，包括全局处理、业务错误映射、用户提示等。

## 本节目标

通过本节学习，你将掌握：

1. **理解错误分层架构**：网络层、HTTP 层、业务层的职责划分
2. **实现全局错误拦截器**：集中处理通用错误，减少重复代码
3. **设计业务错误体系**：自定义错误类型与错误码映射
4. **构建用户友好的错误提示**：错误消息国际化与分类展示
5. **实现错误监控上报**：生产环境错误追踪与分析

## 为什么需要统一错误处理？

在实际项目中，错误处理往往是最容易被忽视的部分。常见的问题包括：

```typescript
// ❌ 问题一：每个请求都重复处理错误
async function getUser() {
  try {
    const { data } = await axios.get('/api/user');
    return data;
  } catch (error) {
    if (error.response?.status === 401) {
      router.push('/login');  // 重复的 401 处理
    } else if (error.response?.status === 500) {
      message.error('服务器错误');  // 重复的提示
    }
    throw error;
  }
}

// ❌ 问题二：每个请求都写一遍相同的错误处理
async function getOrders() {
  try {
    const { data } = await axios.get('/api/orders');
    return data;
  } catch (error) {
    if (error.response?.status === 401) {  // 又来一遍
      router.push('/login');
    }
    // ...
  }
}
```

统一错误处理的目标是：**让业务代码专注于业务逻辑，通用错误由全局拦截器处理**。

## 错误处理的层次

下图展示了错误处理的分层架构，每一层都有明确的职责：

```
┌─────────────────────────────────────────────────┐
│                用户界面层                         │
│        显示错误提示、处理用户交互                   │
│        职责：友好提示、重试按钮、错误页面           │
├─────────────────────────────────────────────────┤
│                业务逻辑层                         │
│        业务状态码处理、数据校验                    │
│        职责：业务错误码映射、特定业务处理           │
├─────────────────────────────────────────────────┤
│                HTTP 客户端层                      │
│        网络错误、HTTP 状态码、超时                 │
│        职责：统一拦截、分类错误、上报监控           │
└─────────────────────────────────────────────────┘
```

**分层的好处**：

| 层次 | 处理内容 | 示例 |
|------|---------|------|
| 用户界面层 | 展示错误、用户交互 | Toast 提示、错误页面 |
| 业务逻辑层 | 业务状态码、特殊处理 | 余额不足跳转充值页 |
| HTTP 客户端层 | 网络、超时、HTTP 状态 | 401 跳转登录页 |

## 全局错误拦截器

创建一个完整的错误处理拦截器，这是统一错误处理的核心：

```typescript
// src/plugins/errorHandler.ts

import axios, { AxiosError, AxiosInstance, isAxiosError } from 'axios';

/**
 * 错误处理器配置选项
 * 
 * 设计思路：
 * 1. 通过配置而非硬编码，使错误处理器可复用于不同项目
 * 2. 提供钩子函数让业务层可以自定义特定错误的处理
 * 3. 字段名可配置，适应不同后端 API 规范
 */
export interface ErrorHandlerOptions {
  /** 业务错误码字段，如 'code'、'errCode' */
  codeField?: string;
  /** 业务错误信息字段，如 'message'、'msg'、'errMsg' */
  messageField?: string;
  /** 成功的业务码，如 0、200、'SUCCESS' */
  successCode?: number | string;
  /** 401 处理器：未登录或登录过期 */
  on401?: () => void;
  /** 403 处理器：无权限 */
  on403?: () => void;
  /** 网络错误处理器：断网或服务不可达 */
  onNetworkError?: () => void;
  /** 显示错误信息的函数，通常对接 UI 组件库 */
  showError?: (message: string) => void;
}

export function setupErrorHandler(
  instance: AxiosInstance,
  options: ErrorHandlerOptions = {}
) {
  // 解构配置项，提供合理的默认值
  const {
    codeField = 'code',           // 默认使用 'code' 字段
    messageField = 'message',     // 默认使用 'message' 字段
    successCode = 0,              // 默认 0 表示成功
    on401 = () => window.location.href = '/login',  // 默认跳转登录页
    on403 = () => console.warn('权限不足'),          // 默认仅警告
    onNetworkError = () => console.error('网络错误'),
    showError = (msg) => console.error(msg),         // 默认控制台输出
  } = options;

  /**
   * 响应拦截器 - 错误处理核心
   * 
   * 处理流程：
   * 1. 成功响应 → 检查业务错误码
   * 2. 失败响应 → 分类处理 HTTP/网络错误
   */
  instance.interceptors.response.use(
    (response) => {
      // ========== 第一步：处理业务层错误 ==========
      // HTTP 200 但业务逻辑失败的情况
      const data = response.data;
      
      // 检查是否包含业务错误码字段
      if (data && data[codeField] !== undefined) {
        if (data[codeField] !== successCode) {
          // 业务错误：构造统一的错误对象
          const error = new Error(data[messageField] || '业务错误') as any;
          error.code = data[codeField];      // 业务错误码
          error.response = response;          // 保留原始响应
          error.isBusinessError = true;       // 标记为业务错误
          return Promise.reject(error);       // 转为 rejected 状态
        }
      }
      
      return response;
    },
    (error: AxiosError) => {
      // ========== 第二步：处理 HTTP 层错误 ==========
      
      // 非 Axios 错误直接抛出
      if (!isAxiosError(error)) {
        return Promise.reject(error);
      }

      const { response, code } = error;

      // ---------- 2.1 网络层错误 ----------
      // 特点：没有 response，网络不可达
      if (code === 'ERR_NETWORK') {
        onNetworkError();
        showError('网络连接失败，请检查网络');
        return Promise.reject(error);
      }

      // ---------- 2.2 超时错误 ----------
      // 特点：请求发出但未在规定时间内收到响应
      if (code === 'ECONNABORTED') {
        showError('请求超时，请稍后重试');
        return Promise.reject(error);
      }

      // ---------- 2.3 请求取消 ----------
      // 特点：主动取消，通常不需要提示用户
      if (axios.isCancel(error)) {
        // 取消的请求静默处理，不显示错误
        return Promise.reject(error);
      }

      // ---------- 2.4 HTTP 状态码错误 ----------
      // 特点：收到响应但状态码表示错误
      if (response) {
        const { status, data } = response;
        
        // 根据状态码分类处理
        switch (status) {
          case 400:
            // 客户端错误：参数不合法
            showError(data?.message || '请求参数错误');
            break;
          case 401:
            // 认证失败：未登录或 token 过期
            showError('登录已过期');
            on401();  // 触发登录逻辑
            break;
          case 403:
            // 授权失败：已登录但无权限
            showError('没有权限访问');
            on403();  // 触发权限处理
            break;
          case 404:
            // 资源不存在
            showError('请求的资源不存在');
            break;
          case 500:
            // 服务器内部错误
            showError('服务器错误');
            break;
          case 502:
            // 网关错误：通常是后端服务挂了
            showError('网关错误');
            break;
          case 503:
            // 服务不可用：通常是服务器过载
            showError('服务不可用');
            break;
          default:
            // 其他未知状态码
            showError(`请求失败: ${status}`);
        }
      }

      return Promise.reject(error);
    }
  );
}
```

### 错误分类速查表

| 错误类型 | 识别方式 | 处理策略 |
|---------|---------|---------|
| 网络错误 | `code === 'ERR_NETWORK'` | 提示检查网络，可重试 |
| 超时错误 | `code === 'ECONNABORTED'` | 提示稍后重试 |
| 请求取消 | `axios.isCancel(error)` | 静默处理 |
| 401 未授权 | `status === 401` | 跳转登录页 |
| 403 无权限 | `status === 403` | 提示权限不足 |
| 业务错误 | `error.isBusinessError` | 显示业务错误信息 |

## 业务错误类

定义业务错误类型，将业务层错误与 HTTP 层错误区分开：

```typescript
// src/errors/BusinessError.ts

/**
 * 业务错误类
 * 
 * 用于封装 HTTP 200 但业务逻辑失败的情况
 * 例如：余额不足、订单已取消、验证码错误等
 */
export class BusinessError extends Error {
  /** 业务错误码，如 10001, 'INSUFFICIENT_BALANCE' */
  code: string | number;
  /** 附加数据，如错误详情、建议操作等 */
  data?: any;
  /** 标记为业务错误，便于类型判断 */
  isBusinessError = true;

  constructor(code: string | number, message: string, data?: any) {
    super(message);
    this.name = 'BusinessError';
    this.code = code;
    this.data = data;
  }
}

export function isBusinessError(error: any): error is BusinessError {
  return error?.isBusinessError === true;
}
```

## 错误映射表

将错误码映射为用户友好的消息。这是实现错误消息国际化的基础：

```typescript
// src/errors/errorMessages.ts

/**
 * HTTP 状态码错误消息映射
 * 
 * 设计原则：
 * 1. 消息要用户友好，避免技术术语
 * 2. 提供可操作的建议（如"请稍后重试"）
 * 3. 为国际化预留扩展空间
 */
export const httpErrorMessages: Record<number, string> = {
  // 4xx 客户端错误
  400: '请求参数错误',
  401: '登录已过期，请重新登录',
  403: '没有权限执行此操作',
  404: '请求的资源不存在',
  405: '请求方法不支持',
  408: '请求超时',
  413: '上传文件过大',
  414: 'URL 过长',
  429: '请求过于频繁，请稍后重试',
  
  // 5xx 服务端错误
  500: '服务器内部错误',
  502: '网关错误',
  503: '服务暂时不可用',
  504: '网关超时',
};

/**
 * 业务错误码消息映射
 * 
 * 建议按模块分段：
 * - 1xxxx: 用户模块
 * - 2xxxx: 商品模块
 * - 3xxxx: 订单模块
 */
export const businessErrorMessages: Record<string | number, string> = {
  // 用户模块 1xxxx
  10001: '用户不存在',
  10002: '密码错误',
  10003: 'Token 过期',
  10004: '权限不足',
  
  // 商品模块 2xxxx
  20001: '商品已下架',
  20002: '库存不足',
  // ...
};

/**
 * 获取用户友好的错误消息
 * 
 * 优先级：业务错误 > HTTP 错误 > 网络错误 > 默认消息
 */
export function getErrorMessage(error: any): string {
  // 业务错误：使用业务错误码映射
  if (isBusinessError(error)) {
    return businessErrorMessages[error.code] || error.message || '业务处理失败';
  }

  // HTTP 错误
  if (isAxiosError(error) && error.response) {
    return httpErrorMessages[error.response.status] || '请求失败';
  }

  // 网络错误
  if (error?.code === 'ERR_NETWORK') {
    return '网络连接失败';
  }

  // 超时
  if (error?.code === 'ECONNABORTED') {
    return '请求超时';
  }

  // 取消
  if (axios.isCancel(error)) {
    return '请求已取消';
  }

  return error?.message || '未知错误';
}
```

## 错误边界组件（React）

```typescript
// components/ErrorBoundary.tsx

import React, { Component, ReactNode } from 'react';
import { getErrorMessage, isBusinessError } from '../errors';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, retry: () => void) => ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    
    // 上报错误
    this.reportError(error, errorInfo);
  }

  reportError(error: Error, errorInfo: React.ErrorInfo) {
    // 发送到错误监控服务
    // 发送到 Sentry：sendToSentry(error, errorInfo);
  }

  retry = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    const { children, fallback } = this.props;

    if (error) {
      if (fallback) {
        return fallback(error, this.retry);
      }
      
      return (
        <div className="error-container">
          <h2>出错了</h2>
          <p>{getErrorMessage(error)}</p>
          <button onClick={this.retry}>重试</button>
        </div>
      );
    }

    return children;
  }
}
```

## 错误监控上报

在生产环境中，错误监控至关重要。以下是一个完整的错误上报实现：

```typescript
// src/errors/reporter.ts

export interface ErrorReport {
  type: 'network' | 'http' | 'business' | 'unknown';
  message: string;
  code?: string | number;
  url?: string;
  method?: string;
  status?: number;
  timestamp: number;
  userAgent: string;
  stack?: string;
  // 用户与会话信息
  userId?: string;
  sessionId?: string;
  // 环境信息
  environment?: string;
  version?: string;
}

/**
 * 上报错误到监控服务
 * 
 * 生产环境建议对接：
 * - Sentry (https://sentry.io)
 * - LogRocket (https://logrocket.com)
 * - 自建 ELK Stack
 */
export function reportError(error: any, context?: Record<string, any>) {
  const report: ErrorReport = {
    type: getErrorType(error),
    message: error.message || 'Unknown error',
    timestamp: Date.now(),
    userAgent: navigator.userAgent,
    environment: import.meta.env.MODE,
    version: import.meta.env.VITE_APP_VERSION,
  };

  // 填充详细信息
  if (isAxiosError(error)) {
    report.url = error.config?.url;
    report.method = error.config?.method;
    report.status = error.response?.status;
    report.code = error.code;
  }

  if (error.stack) {
    report.stack = error.stack;
  }

  // 发送到监控服务
  sendToMonitor(report, context);
}

function getErrorType(error: any): ErrorReport['type'] {
  if (isBusinessError(error)) return 'business';
  if (isAxiosError(error)) {
    if (error.code === 'ERR_NETWORK') return 'network';
    return 'http';
  }
  return 'unknown';
}

function sendToMonitor(report: ErrorReport, context?: Record<string, any>) {
  // 使用 beacon API 确保页面卸载时也能发送
  const data = JSON.stringify({ ...report, ...context });
  
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/errors', data);
  } else {
    fetch('/api/errors', {
      method: 'POST',
      body: data,
      keepalive: true,
    });
  }
}
```

> **提示**：生产环境推荐使用专业的错误监控服务如 Sentry，可以提供错误聚合、报警、趋势分析等功能。

## 完整使用示例

```typescript
// api/index.ts

import axios from 'axios';
import { setupErrorHandler } from './plugins/errorHandler';
import { reportError } from './errors/reporter';
import { message } from 'antd';  // 或其他 UI 库

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

// 设置错误处理
setupErrorHandler(api, {
  codeField: 'code',
  messageField: 'msg',
  successCode: 0,
  on401: () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  },
  on403: () => {
    message.error('您没有权限执行此操作');
  },
  onNetworkError: () => {
    message.error('网络连接失败，请检查网络设置');
  },
  showError: (msg) => message.error(msg),
});

// 全局错误上报
api.interceptors.response.use(
  response => response,
  error => {
    reportError(error);
    return Promise.reject(error);
  }
);

export { api };

// 使用
async function fetchUsers() {
  try {
    const { data } = await api.get('/users');
    return data;
  } catch (error) {
    // 大多数情况下不需要处理，全局拦截器已处理
    // 只处理需要特殊逻辑的情况
    if (error.code === 10001) {
      // 特殊业务逻辑
    }
    throw error;
  }
}
```

## 测试

```typescript
import { describe, it, expect, vi } from 'vitest';
import axios from 'axios';
import { setupErrorHandler } from '../src/plugins/errorHandler';

describe('Error Handler', () => {
  it('should call on401 for 401 response', async () => {
    // 准备：创建 401 处理器的 mock
    const on401 = vi.fn();
    const instance = axios.create();
    
    // 安装错误处理器
    setupErrorHandler(instance, { on401 });

    // 模拟 401 响应
    instance.interceptors.request.use((config) => {
      return Promise.reject({
        isAxiosError: true,
        response: { status: 401 },
      });
    });

    // 执行请求（会触发 401）
    try {
      await instance.get('/test');
    } catch {}

    // 验证：on401 被调用
    expect(on401).toHaveBeenCalled();
  });

  it('should reject business error', async () => {
    // 准备：创建实例并设置成功码
    const instance = axios.create();
    setupErrorHandler(instance, { successCode: 0 });

    // 模拟业务错误响应（HTTP 200 但 code !== 0）
    instance.interceptors.request.use((config) => {
      return Promise.resolve({
        data: { code: 10001, message: '用户不存在' },
        status: 200,
      });
    });

    // 验证：Promise 被 reject，且错误是业务错误
    await expect(instance.get('/test')).rejects.toMatchObject({
      message: '用户不存在',
      isBusinessError: true,
    });
  });
});
```

## 常见问题解答

### Q: 业务错误和 HTTP 错误有什么区别？

| 类型 | HTTP 状态码 | 来源 | 示例 |
|------|------------|------|------|
| HTTP 错误 | 4xx/5xx | 服务器/网络 | 401、500、网络断开 |
| 业务错误 | 200 | 后端业务逻辑 | 余额不足、验证码错误 |

### Q: 什么时候需要在业务代码中 catch 错误？

大多数情况下不需要，全局拦截器会处理。只在这些情况需要单独 catch：

```typescript
// 情况一：需要执行特定的业务逻辑
try {
  await api.pay(orderId);
} catch (error) {
  if (error.code === 20002) {  // 余额不足
    router.push('/recharge');  // 跳转充值页
    return;
  }
  throw error;  // 其他错误仍由全局处理
}

// 情况二：需要忽略某些错误
try {
  await api.checkUpdate();
} catch {
  // 检查更新失败静默忽略
}
```

### Q: 如何实现错误消息国际化？

```typescript
// 方案：使用 i18n 库
import { t } from 'i18next';

export const httpErrorMessages: Record<number, () => string> = {
  401: () => t('error.unauthorized'),
  403: () => t('error.forbidden'),
  // ...
};
```

## 小结

本节我们构建了一套完整的统一错误处理策略：

```
错误处理架构
├── HTTP 客户端层
│   ├── 网络错误（ERR_NETWORK）
│   ├── 超时错误（ECONNABORTED）
│   ├── HTTP 状态码错误（4xx/5xx）
│   └── 请求取消（静默处理）
├── 业务逻辑层
│   ├── 业务错误码映射
│   └── 特殊业务逻辑处理
└── 用户界面层
    ├── 错误提示组件
    └── 错误边界（React）
```

**核心要点**：

| 要点 | 说明 |
|------|------|
| 分层处理 | HTTP 层、业务层、UI 层各司其职 |
| 错误分类 | 网络错误、HTTP 错误、业务错误区分处理 |
| 用户友好 | 错误消息映射为用户可理解的文字 |
| 可追踪 | 生产环境错误上报与监控 |

**最佳实践**：

1. 全局拦截器处理通用错误，避免重复代码
2. 业务代码只处理特殊情况
3. 错误消息支持国际化
4. 重要错误上报监控平台
5. 提供错误重试机制

至此，错误处理章节完成。下一章我们进入高级功能。
