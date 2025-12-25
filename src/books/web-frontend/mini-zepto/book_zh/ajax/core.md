# AJAX 核心实现

本章实现 Zepto 的 AJAX 模块核心功能。

## XMLHttpRequest 基础

现代 AJAX 基于 XMLHttpRequest：

```typescript
const xhr = new XMLHttpRequest()

// 打开连接
xhr.open('GET', '/api/users', true)

// 设置请求头
xhr.setRequestHeader('Content-Type', 'application/json')

// 监听状态变化
xhr.onreadystatechange = function() {
  if (xhr.readyState === 4) {
    if (xhr.status === 200) {
      console.log(xhr.responseText)
    }
  }
}

// 发送请求
xhr.send()
```

## $.ajax 核心设计

```typescript
interface AjaxSettings {
  url?: string
  type?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  data?: any
  dataType?: 'json' | 'text' | 'html' | 'xml' | 'script'
  contentType?: string | false
  headers?: Record<string, string>
  timeout?: number
  async?: boolean
  cache?: boolean
  
  // 回调
  beforeSend?: (xhr: XMLHttpRequest, settings: AjaxSettings) => boolean | void
  success?: (data: any, status: string, xhr: XMLHttpRequest) => void
  error?: (xhr: XMLHttpRequest, status: string, error: Error) => void
  complete?: (xhr: XMLHttpRequest, status: string) => void
  
  // 进度
  progress?: (event: ProgressEvent) => void
}

// 默认配置
const ajaxDefaults: AjaxSettings = {
  type: 'GET',
  async: true,
  contentType: 'application/x-www-form-urlencoded',
  cache: true,
  timeout: 0
}
```

## 实现 $.ajax

```typescript
export function ajax(options: AjaxSettings | string): XMLHttpRequest {
  // 支持简写 $.ajax('/api')
  if (typeof options === 'string') {
    options = { url: options }
  }
  
  const settings: AjaxSettings = { ...ajaxDefaults, ...options }
  
  const {
    url,
    type,
    data,
    dataType,
    contentType,
    headers,
    timeout,
    async,
    cache,
    beforeSend,
    success,
    error,
    complete,
    progress
  } = settings
  
  const xhr = new XMLHttpRequest()
  
  // 处理 URL
  let finalUrl = url!
  
  // GET 请求参数拼接到 URL
  if (type === 'GET' && data) {
    const params = serializeParams(data)
    finalUrl += (finalUrl.includes('?') ? '&' : '?') + params
  }
  
  // 禁用缓存
  if (!cache && type === 'GET') {
    finalUrl += (finalUrl.includes('?') ? '&' : '?') + '_=' + Date.now()
  }
  
  // 打开连接
  xhr.open(type!, finalUrl, async!)
  
  // 设置请求头
  if (contentType && type !== 'GET') {
    xhr.setRequestHeader('Content-Type', contentType)
  }
  
  if (headers) {
    Object.entries(headers).forEach(([key, value]) => {
      xhr.setRequestHeader(key, value)
    })
  }
  
  // 期望响应类型
  if (dataType === 'json') {
    xhr.setRequestHeader('Accept', 'application/json')
  }
  
  // 超时
  if (timeout) {
    xhr.timeout = timeout
  }
  
  // beforeSend 钩子
  if (beforeSend && beforeSend(xhr, settings) === false) {
    xhr.abort()
    return xhr
  }
  
  // 进度监听
  if (progress) {
    xhr.addEventListener('progress', progress)
  }
  
  // 状态处理
  xhr.onreadystatechange = function() {
    if (xhr.readyState !== 4) return
    
    const status = xhr.status
    const statusText = status >= 200 && status < 300 ? 'success' : 'error'
    
    if (status >= 200 && status < 300) {
      // 成功
      let responseData: any = xhr.responseText
      
      try {
        if (dataType === 'json') {
          responseData = JSON.parse(xhr.responseText)
        } else if (dataType === 'xml') {
          responseData = xhr.responseXML
        }
      } catch (e) {
        error?.(xhr, 'parsererror', e as Error)
        complete?.(xhr, 'parsererror')
        return
      }
      
      success?.(responseData, statusText, xhr)
    } else {
      // 失败
      error?.(xhr, statusText, new Error(xhr.statusText))
    }
    
    complete?.(xhr, statusText)
  }
  
  // 错误处理
  xhr.onerror = function() {
    error?.(xhr, 'error', new Error('Network Error'))
    complete?.(xhr, 'error')
  }
  
  xhr.ontimeout = function() {
    error?.(xhr, 'timeout', new Error('Request Timeout'))
    complete?.(xhr, 'timeout')
  }
  
  // 发送请求
  let body: string | FormData | null = null
  
  if (type !== 'GET' && data) {
    if (contentType === 'application/json') {
      body = JSON.stringify(data)
    } else if (contentType === 'application/x-www-form-urlencoded') {
      body = serializeParams(data)
    } else if (data instanceof FormData) {
      body = data
    } else {
      body = serializeParams(data)
    }
  }
  
  xhr.send(body)
  
  return xhr
}

// 参数序列化
function serializeParams(data: any): string {
  if (typeof data === 'string') {
    return data
  }
  
  const pairs: string[] = []
  
  Object.entries(data).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach(v => {
        pairs.push(`${encodeURIComponent(key)}[]=${encodeURIComponent(v)}`)
      })
    } else if (value !== null && value !== undefined) {
      pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    }
  })
  
  return pairs.join('&')
}
```

## Promise 版本

现代 API 风格：

```typescript
export function ajaxPromise(options: AjaxSettings | string): Promise<any> {
  return new Promise((resolve, reject) => {
    ajax({
      ...(typeof options === 'string' ? { url: options } : options),
      success: (data, status, xhr) => {
        resolve({ data, status, xhr })
      },
      error: (xhr, status, error) => {
        reject({ xhr, status, error })
      }
    })
  })
}

// 使用
ajaxPromise('/api/users')
  .then(({ data }) => console.log(data))
  .catch(({ error }) => console.error(error))
```

## 全局事件钩子

```typescript
const ajaxEvents = {
  start: new Set<() => void>(),
  stop: new Set<() => void>(),
  send: new Set<(xhr: XMLHttpRequest) => void>(),
  success: new Set<(data: any, xhr: XMLHttpRequest) => void>(),
  error: new Set<(xhr: XMLHttpRequest, error: Error) => void>(),
  complete: new Set<(xhr: XMLHttpRequest) => void>()
}

let activeRequests = 0

export const $ = {
  // 注册全局事件
  ajaxStart(handler: () => void): void {
    ajaxEvents.start.add(handler)
  },
  
  ajaxStop(handler: () => void): void {
    ajaxEvents.stop.add(handler)
  },
  
  ajaxSend(handler: (xhr: XMLHttpRequest) => void): void {
    ajaxEvents.send.add(handler)
  },
  
  ajaxSuccess(handler: (data: any, xhr: XMLHttpRequest) => void): void {
    ajaxEvents.success.add(handler)
  },
  
  ajaxError(handler: (xhr: XMLHttpRequest, error: Error) => void): void {
    ajaxEvents.error.add(handler)
  },
  
  ajaxComplete(handler: (xhr: XMLHttpRequest) => void): void {
    ajaxEvents.complete.add(handler)
  }
}

// 在 ajax 函数中触发
function triggerGlobalEvent(event: string, ...args: any[]): void {
  ajaxEvents[event]?.forEach(handler => handler(...args))
}

// 修改 ajax 函数
export function ajax(options: AjaxSettings): XMLHttpRequest {
  // ...
  
  // 请求开始
  activeRequests++
  if (activeRequests === 1) {
    triggerGlobalEvent('start')
  }
  triggerGlobalEvent('send', xhr)
  
  xhr.onreadystatechange = function() {
    if (xhr.readyState !== 4) return
    
    if (status >= 200 && status < 300) {
      triggerGlobalEvent('success', responseData, xhr)
    } else {
      triggerGlobalEvent('error', xhr, new Error(xhr.statusText))
    }
    
    triggerGlobalEvent('complete', xhr)
    
    // 请求结束
    activeRequests--
    if (activeRequests === 0) {
      triggerGlobalEvent('stop')
    }
  }
  
  // ...
}
```

使用全局事件：

```typescript
// 全局 loading
$.ajaxStart(() => {
  $('#loading').show()
})

$.ajaxStop(() => {
  $('#loading').hide()
})

// 全局错误处理
$.ajaxError((xhr, error) => {
  if (xhr.status === 401) {
    redirectToLogin()
  }
})
```

## 测试

```typescript
describe('AJAX', () => {
  beforeEach(() => {
    // Mock fetch/XHR
    global.XMLHttpRequest = jest.fn().mockImplementation(() => ({
      open: jest.fn(),
      send: jest.fn(),
      setRequestHeader: jest.fn(),
      readyState: 4,
      status: 200,
      responseText: '{"success": true}'
    }))
  })

  describe('$.ajax', () => {
    it('GET 请求', (done) => {
      $.ajax({
        url: '/api/test',
        type: 'GET',
        success: (data) => {
          expect(data).toBeDefined()
          done()
        }
      })
    })

    it('POST JSON', (done) => {
      $.ajax({
        url: '/api/test',
        type: 'POST',
        contentType: 'application/json',
        data: { name: 'test' },
        success: () => done()
      })
    })

    it('超时处理', (done) => {
      $.ajax({
        url: '/api/slow',
        timeout: 100,
        error: (xhr, status) => {
          expect(status).toBe('timeout')
          done()
        }
      })
    })
  })

  describe('全局事件', () => {
    it('ajaxStart / ajaxStop', () => {
      let started = false, stopped = false
      
      $.ajaxStart(() => { started = true })
      $.ajaxStop(() => { stopped = true })
      
      $.ajax({ url: '/api/test' })
      
      expect(started).toBe(true)
      // 等待完成后
      expect(stopped).toBe(true)
    })
  })
})
```

## 小结

本章实现了 AJAX 核心功能：

**核心方法**：
- `$.ajax()`：完整的 AJAX 请求
- Promise 版本：现代 API 风格

**请求配置**：
- 多种 HTTP 方法
- 请求头、超时、缓存控制
- 数据序列化

**回调系统**：
- beforeSend、success、error、complete
- 全局事件钩子

这是网络通信的基础设施。
