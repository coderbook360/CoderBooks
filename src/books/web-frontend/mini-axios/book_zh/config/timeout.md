# 超时处理与 timeout 配置

网络请求不能无限等待，合理的超时设置对用户体验和系统健壮性至关重要。本节实现超时机制。

## 本节目标

通过本节学习，你将：

1. 理解超时的重要性和应用场景
2. 在 XHR 和 Node.js 中实现超时
3. 处理超时错误和重试策略
4. 掌握不同类型的超时配置

## 为什么需要超时？

```
┌─────────────────────────────────────────────────────┐
│ 没有超时的风险：                                      │
│                                                     │
│  用户点击 ──> 请求发送 ──> 服务器无响应 ──> 永久等待   │
│                                          ↓          │
│                                    用户界面卡死      │
│                                    资源无法释放      │
│                                    连接池耗尽        │
└─────────────────────────────────────────────────────┘
```

合理的超时设置可以：

- **提升用户体验**：及时告知用户请求失败
- **释放资源**：关闭无效连接
- **启用重试**：在超时后尝试其他策略
- **保护系统**：防止资源耗尽

## 配置类型定义

```typescript
// src/types/index.ts

export interface AxiosRequestConfig {
  // 基础配置
  url?: string;
  method?: string;
  baseURL?: string;
  
  // 超时配置（毫秒）
  timeout?: number;
  
  // 其他配置...
}
```

## 默认超时配置

```typescript
// src/defaults.ts

export const defaults: AxiosRequestConfig = {
  timeout: 0, // 0 表示无超时限制
  
  // 可以根据环境设置不同默认值
  // timeout: process.env.NODE_ENV === 'production' ? 10000 : 0,
};
```

## XHR 超时实现

### 基本实现

```typescript
// src/adapters/xhr.ts

export function xhrAdapter(config: AxiosRequestConfig): Promise<AxiosResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    // 设置超时
    if (config.timeout) {
      xhr.timeout = config.timeout;
    }
    
    // 超时事件处理
    xhr.ontimeout = function handleTimeout() {
      reject(createError(
        `Timeout of ${config.timeout}ms exceeded`,
        config,
        'ECONNABORTED',
        xhr
      ));
    };
    
    // ... 其他配置
    
    xhr.open(config.method!.toUpperCase(), url, true);
    xhr.send(config.data);
  });
}
```

### 详细错误信息

```typescript
function handleTimeout(xhr: XMLHttpRequest, config: AxiosRequestConfig): AxiosError {
  const timeoutErrorMessage = config.timeoutErrorMessage
    ? config.timeoutErrorMessage
    : `timeout of ${config.timeout}ms exceeded`;
  
  return createError(
    timeoutErrorMessage,
    config,
    'ECONNABORTED',  // 错误代码
    xhr,
    undefined        // 没有响应
  );
}
```

## Node.js 超时实现

### HTTP 适配器

```typescript
// src/adapters/http.ts

import http from 'http';
import https from 'https';

export function httpAdapter(config: AxiosRequestConfig): Promise<AxiosResponse> {
  return new Promise((resolve, reject) => {
    const transport = config.url!.startsWith('https') ? https : http;
    
    const req = transport.request(options, (res) => {
      // 处理响应...
    });
    
    // 设置超时
    if (config.timeout) {
      // 方式1：设置 socket 超时
      req.setTimeout(config.timeout, () => {
        req.destroy();
        reject(createError(
          `Timeout of ${config.timeout}ms exceeded`,
          config,
          'ECONNABORTED',
          req
        ));
      });
    }
    
    req.on('error', (error) => {
      reject(createError(
        error.message,
        config,
        error.code,
        req
      ));
    });
    
    req.end(config.data);
  });
}
```

### 不同阶段的超时

```typescript
interface TimeoutConfig {
  /** 连接超时（建立 TCP 连接） */
  connectTimeout?: number;
  
  /** 响应超时（等待第一个字节） */
  responseTimeout?: number;
  
  /** 读取超时（接收完整响应） */
  readTimeout?: number;
  
  /** 总超时（整个请求周期） */
  timeout?: number;
}

// 实现多阶段超时
function httpAdapterWithDetailedTimeout(
  config: AxiosRequestConfig
): Promise<AxiosResponse> {
  return new Promise((resolve, reject) => {
    let connectionEstablished = false;
    let firstByteReceived = false;
    
    const req = transport.request(options, (res) => {
      firstByteReceived = true;
      
      // 清除响应超时，设置读取超时
      if (config.readTimeout) {
        res.setTimeout(config.readTimeout, () => {
          req.destroy();
          reject(createError(
            'Read timeout exceeded',
            config,
            'ETIMEDOUT'
          ));
        });
      }
      
      // 处理响应...
    });
    
    // 连接超时
    if (config.connectTimeout) {
      req.setTimeout(config.connectTimeout, () => {
        if (!connectionEstablished) {
          req.destroy();
          reject(createError(
            'Connect timeout exceeded',
            config,
            'ECONNABORTED'
          ));
        }
      });
    }
    
    // Socket 连接成功
    req.on('socket', (socket) => {
      socket.on('connect', () => {
        connectionEstablished = true;
        
        // 清除连接超时，设置响应超时
        if (config.responseTimeout) {
          req.setTimeout(config.responseTimeout, () => {
            if (!firstByteReceived) {
              req.destroy();
              reject(createError(
                'Response timeout exceeded',
                config,
                'ETIMEDOUT'
              ));
            }
          });
        }
      });
    });
    
    req.end(config.data);
  });
}
```

## 超时与取消的区别

```
超时 (Timeout)                    取消 (Cancel)
────────────────────            ────────────────────
自动触发                         手动触发
基于时间                         基于逻辑
系统行为                         用户行为
不可重入                         可随时取消

适用场景：                        适用场景：
- 防止无限等待                    - 用户取消操作
- 服务器响应慢                    - 组件卸载
- 网络不稳定                      - 条件变化
```

## 超时重试策略

```typescript
// 超时后自动重试
async function requestWithRetry(
  config: AxiosRequestConfig,
  maxRetries = 3
): Promise<AxiosResponse> {
  let lastError: AxiosError | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await axios.request(config);
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        // 超时错误，可以重试
        lastError = error;
        
        // 可选：增加超时时间
        config.timeout = (config.timeout || 5000) * 1.5;
        
        console.log(`Attempt ${attempt + 1} timed out, retrying...`);
        continue;
      }
      
      // 其他错误，不重试
      throw error;
    }
  }
  
  throw lastError;
}
```

## 动态超时

```typescript
// 根据请求类型设置不同超时
function getDynamicTimeout(config: AxiosRequestConfig): number {
  // 上传请求：更长超时
  if (config.data instanceof FormData) {
    return 60000; // 60 秒
  }
  
  // 下载大文件
  if (config.responseType === 'blob' || config.responseType === 'arraybuffer') {
    return 120000; // 2 分钟
  }
  
  // 普通 API 请求
  if (config.method === 'GET') {
    return 10000; // 10 秒
  }
  
  // POST/PUT 等写操作
  return 30000; // 30 秒
}

// 在请求拦截器中应用
axios.interceptors.request.use(config => {
  if (!config.timeout) {
    config.timeout = getDynamicTimeout(config);
  }
  return config;
});
```

## 超时监控

```typescript
// 记录超时统计
const timeoutStats = {
  total: 0,
  byEndpoint: new Map<string, number>()
};

axios.interceptors.response.use(
  response => response,
  error => {
    if (error.code === 'ECONNABORTED') {
      timeoutStats.total++;
      
      const endpoint = error.config?.url || 'unknown';
      const current = timeoutStats.byEndpoint.get(endpoint) || 0;
      timeoutStats.byEndpoint.set(endpoint, current + 1);
      
      // 报告到监控系统
      reportTimeout({
        url: endpoint,
        timeout: error.config?.timeout,
        timestamp: Date.now()
      });
    }
    
    return Promise.reject(error);
  }
);

// 获取超时统计
function getTimeoutStats() {
  return {
    total: timeoutStats.total,
    byEndpoint: Object.fromEntries(timeoutStats.byEndpoint)
  };
}
```

## 用户体验处理

```typescript
// React 组件示例
function DataLoader() {
  const [state, setState] = useState({
    data: null,
    loading: false,
    error: null,
    timedOut: false
  });
  
  async function loadData() {
    setState({ ...state, loading: true, error: null, timedOut: false });
    
    try {
      const response = await axios.get('/api/data', { timeout: 5000 });
      setState({ data: response.data, loading: false, error: null, timedOut: false });
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        setState({
          ...state,
          loading: false,
          timedOut: true,
          error: '请求超时，请检查网络后重试'
        });
      } else {
        setState({
          ...state,
          loading: false,
          error: error.message
        });
      }
    }
  }
  
  return (
    <div>
      {state.loading && <Spinner />}
      
      {state.timedOut && (
        <div className="timeout-message">
          <p>请求超时</p>
          <button onClick={loadData}>重试</button>
        </div>
      )}
      
      {state.error && !state.timedOut && (
        <div className="error">{state.error}</div>
      )}
      
      {state.data && <DataView data={state.data} />}
    </div>
  );
}
```

## 测试超时

```typescript
describe('Timeout', () => {
  it('should timeout after specified time', async () => {
    // 模拟慢响应
    mock.onGet('/slow').reply(() => {
      return new Promise(resolve => {
        setTimeout(() => resolve([200, {}]), 5000);
      });
    });
    
    const start = Date.now();
    
    await expect(
      axios.get('/slow', { timeout: 1000 })
    ).rejects.toMatchObject({
      code: 'ECONNABORTED',
      message: expect.stringContaining('timeout')
    });
    
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(1500); // 应该在超时后很快失败
  });
  
  it('should not timeout if response is fast', async () => {
    mock.onGet('/fast').reply(200, { success: true });
    
    const response = await axios.get('/fast', { timeout: 1000 });
    
    expect(response.data.success).toBe(true);
  });
});
```

## 小结

本节我们实现了完整的超时机制：

1. **基础超时**：XHR 和 Node.js 的超时设置
2. **分阶段超时**：连接、响应、读取
3. **错误处理**：统一的超时错误格式
4. **重试策略**：超时后自动重试
5. **动态超时**：根据请求类型调整
6. **监控统计**：记录超时情况

合理的超时设置是健壮网络应用的基础，下一节我们将学习跨域凭据处理。
