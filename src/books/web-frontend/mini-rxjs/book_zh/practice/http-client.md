# 实现 HTTP 请求封装

基于 RxJS 实现一个类似 Axios 的 HTTP 客户端。

## 基本设计

```typescript
class HttpClient {
  constructor(private baseURL: string = '') {}
  
  get<T>(url: string, config?: RequestConfig): Observable<T> {
    return this.request({ ...config, method: 'GET', url })
  }
  
  post<T>(url: string, data?: any, config?: RequestConfig): Observable<T> {
    return this.request({ ...config, method: 'POST', url, data })
  }
  
  put<T>(url: string, data?: any, config?: RequestConfig): Observable<T> {
    return this.request({ ...config, method: 'PUT', url, data })
  }
  
  delete<T>(url: string, config?: RequestConfig): Observable<T> {
    return this.request({ ...config, method: 'DELETE', url })
  }
  
  private request<T>(config: RequestConfig): Observable<T> {
    return new Observable<T>(subscriber => {
      // 实现请求逻辑
    })
  }
}
```

## 完整实现

```typescript
interface RequestConfig {
  method: string
  url: string
  data?: any
  headers?: Record<string, string>
  timeout?: number
}

class HttpClient {
  constructor(
    private baseURL: string = '',
    private defaultHeaders: Record<string, string> = {}
  ) {}
  
  request<T>(config: RequestConfig): Observable<T> {
    return new Observable<T>(subscriber => {
      const controller = new AbortController()
      
      const fullURL = this.baseURL + config.url
      
      const headers = {
        'Content-Type': 'application/json',
        ...this.defaultHeaders,
        ...config.headers
      }
      
      const fetchPromise = fetch(fullURL, {
        method: config.method,
        headers,
        body: config.data ? JSON.stringify(config.data) : undefined,
        signal: controller.signal
      })
      
      // 超时控制
      const timeoutId = config.timeout
        ? setTimeout(() => controller.abort(), config.timeout)
        : null
      
      fetchPromise
        .then(response => {
          if (timeoutId) clearTimeout(timeoutId)
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }
          
          return response.json()
        })
        .then(data => {
          subscriber.next(data)
          subscriber.complete()
        })
        .catch(error => {
          if (timeoutId) clearTimeout(timeoutId)
          subscriber.error(error)
        })
      
      // 取消请求
      return () => controller.abort()
    })
  }
  
  get<T>(url: string, config?: Partial<RequestConfig>): Observable<T> {
    return this.request({ ...config, method: 'GET', url } as RequestConfig)
  }
  
  post<T>(url: string, data?: any, config?: Partial<RequestConfig>): Observable<T> {
    return this.request({ ...config, method: 'POST', url, data } as RequestConfig)
  }
}
```

## 拦截器

```typescript
type Interceptor = (config: RequestConfig) => RequestConfig | Promise<RequestConfig>

class HttpClient {
  private interceptors: Interceptor[] = []
  
  addInterceptor(interceptor: Interceptor) {
    this.interceptors.push(interceptor)
  }
  
  private async applyInterceptors(config: RequestConfig): Promise<RequestConfig> {
    let result = config
    
    for (const interceptor of this.interceptors) {
      result = await interceptor(result)
    }
    
    return result
  }
  
  request<T>(config: RequestConfig): Observable<T> {
    return defer(async () => {
      const finalConfig = await this.applyInterceptors(config)
      return this.executeRequest<T>(finalConfig)
    }).pipe(
      switchMap(obs => obs)
    )
  }
}

// 使用
const client = new HttpClient()

client.addInterceptor(config => {
  // 添加认证 token
  config.headers = {
    ...config.headers,
    Authorization: `Bearer ${getToken()}`
  }
  return config
})
```

## 重试机制

```typescript
class HttpClient {
  get<T>(url: string, config?: RequestConfig): Observable<T> {
    return this.request({ ...config, method: 'GET', url }).pipe(
      retry({
        count: 3,
        delay: (error, retryCount) => {
          // 指数退避
          return timer(Math.pow(2, retryCount) * 1000)
        }
      })
    )
  }
}
```

## 缓存

```typescript
class HttpClient {
  private cache = new Map<string, any>()
  
  get<T>(url: string, config?: RequestConfig & { cache?: boolean }): Observable<T> {
    if (config?.cache && this.cache.has(url)) {
      return of(this.cache.get(url))
    }
    
    return this.request({ ...config, method: 'GET', url }).pipe(
      tap(data => {
        if (config?.cache) {
          this.cache.set(url, data)
        }
      })
    )
  }
}
```

## 使用示例

```typescript
const http = new HttpClient('https://api.example.com')

// GET 请求
http.get('/users').subscribe(users => {
  console.log(users)
})

// POST 请求
http.post('/users', { name: 'John' }).subscribe(user => {
  console.log('创建用户:', user)
})

// 带超时
http.get('/slow-api', { timeout: 5000 }).subscribe(
  data => console.log(data),
  error => console.error('超时或错误:', error)
)

// 取消请求
const sub = http.get('/data').subscribe()
setTimeout(() => sub.unsubscribe(), 1000) // 1秒后取消
```

## 总结

- 基于 RxJS 实现 HTTP 客户端
- 支持 GET、POST、PUT、DELETE
- 支持拦截器、重试、缓存
- 支持请求取消和超时
- Observable 天然支持取消和组合
