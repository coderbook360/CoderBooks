# 请求配置

本章详解 AJAX 请求的各种配置选项。

## 完整配置项

```typescript
interface AjaxSettings {
  // 基础
  url: string                    // 请求地址
  type: string                   // 请求方法 GET/POST/PUT/DELETE
  data: any                      // 请求数据
  
  // 数据格式
  dataType: string               // 期望返回类型 json/text/html/xml/script
  contentType: string | false    // 请求体类型
  processData: boolean           // 是否自动序列化 data
  
  // 请求头
  headers: Record<string, string>
  
  // 超时与缓存
  timeout: number
  cache: boolean
  
  // 异步
  async: boolean
  
  // 认证
  username: string
  password: string
  
  // 跨域
  crossDomain: boolean
  xhrFields: Record<string, any>
  
  // 回调
  beforeSend: (xhr: XMLHttpRequest, settings: AjaxSettings) => boolean | void
  success: (data: any, status: string, xhr: XMLHttpRequest) => void
  error: (xhr: XMLHttpRequest, status: string, error: Error) => void
  complete: (xhr: XMLHttpRequest, status: string) => void
  
  // 进度
  progress: (event: ProgressEvent) => void
  uploadProgress: (event: ProgressEvent) => void
  
  // 上下文
  context: any
}
```

## dataType 详解

### json

```typescript
$.ajax({
  url: '/api/users',
  dataType: 'json',
  success: (data) => {
    // data 已是 JS 对象
    console.log(data.name)
  }
})
```

内部处理：

```typescript
if (dataType === 'json') {
  xhr.setRequestHeader('Accept', 'application/json')
  responseData = JSON.parse(xhr.responseText)
}
```

### jsonp（跨域）

```typescript
export function jsonp(
  url: string,
  callback: string,
  success: (data: any) => void
): void {
  const callbackName = `jsonp_${Date.now()}`
  
  // 注册全局回调
  ;(window as any)[callbackName] = (data: any) => {
    success(data)
    delete (window as any)[callbackName]
    script.remove()
  }
  
  // 创建 script 标签
  const script = document.createElement('script')
  script.src = `${url}${url.includes('?') ? '&' : '?'}${callback}=${callbackName}`
  document.body.appendChild(script)
}

// 使用
$.jsonp('https://api.example.com/data', 'callback', (data) => {
  console.log(data)
})
```

### script

动态加载并执行 JS：

```typescript
if (dataType === 'script') {
  const script = document.createElement('script')
  script.text = xhr.responseText
  document.head.appendChild(script).parentNode!.removeChild(script)
  success(xhr.responseText)
}
```

### xml

```typescript
if (dataType === 'xml') {
  responseData = xhr.responseXML
}
```

## contentType 详解

### application/x-www-form-urlencoded（默认）

```typescript
$.ajax({
  url: '/api/login',
  type: 'POST',
  data: { username: 'john', password: '123' }
  // 发送: username=john&password=123
})
```

### application/json

```typescript
$.ajax({
  url: '/api/users',
  type: 'POST',
  contentType: 'application/json',
  data: { name: 'John', age: 30 }
  // 发送: {"name":"John","age":30}
})
```

内部处理：

```typescript
if (contentType === 'application/json') {
  body = JSON.stringify(data)
}
```

### multipart/form-data（文件上传）

```typescript
const formData = new FormData()
formData.append('file', fileInput.files[0])
formData.append('name', 'avatar')

$.ajax({
  url: '/api/upload',
  type: 'POST',
  contentType: false,  // 让浏览器自动设置
  processData: false,  // 不序列化
  data: formData
})
```

### false（不设置）

```typescript
contentType: false  // 不设置 Content-Type
```

## 跨域配置

### withCredentials

```typescript
$.ajax({
  url: 'https://other-domain.com/api',
  xhrFields: {
    withCredentials: true  // 发送 cookies
  }
})
```

内部实现：

```typescript
if (xhrFields) {
  Object.entries(xhrFields).forEach(([key, value]) => {
    (xhr as any)[key] = value
  })
}
```

### 跨域检测

```typescript
function isCrossDomain(url: string): boolean {
  const anchor = document.createElement('a')
  anchor.href = url
  
  return anchor.host !== window.location.host
}

// 使用
const settings = {
  crossDomain: options.crossDomain ?? isCrossDomain(url)
}
```

## 超时与重试

### 超时配置

```typescript
$.ajax({
  url: '/api/slow',
  timeout: 5000,  // 5秒超时
  error: (xhr, status) => {
    if (status === 'timeout') {
      console.log('请求超时')
    }
  }
})
```

### 自动重试

```typescript
function ajaxWithRetry(
  options: AjaxSettings,
  maxRetries = 3,
  delay = 1000
): Promise<any> {
  let attempts = 0
  
  function attempt(): Promise<any> {
    return new Promise((resolve, reject) => {
      $.ajax({
        ...options,
        success: resolve,
        error: (xhr, status, error) => {
          attempts++
          
          // 可重试的错误
          const retryable = ['timeout', 'error'].includes(status) ||
                            xhr.status >= 500
          
          if (retryable && attempts < maxRetries) {
            setTimeout(() => {
              attempt().then(resolve).catch(reject)
            }, delay * attempts)  // 递增延迟
          } else {
            reject({ xhr, status, error })
          }
        }
      })
    })
  }
  
  return attempt()
}

// 使用
ajaxWithRetry({ url: '/api/unstable' }, 3, 1000)
  .then(data => console.log(data))
  .catch(err => console.error('所有重试都失败'))
```

## 请求拦截器

```typescript
const interceptors = {
  request: [] as Array<(settings: AjaxSettings) => AjaxSettings | void>,
  response: [] as Array<(data: any, xhr: XMLHttpRequest) => any>
}

$.ajaxInterceptors = {
  request: {
    use(handler: (settings: AjaxSettings) => AjaxSettings | void): number {
      return interceptors.request.push(handler) - 1
    },
    eject(id: number): void {
      interceptors.request.splice(id, 1)
    }
  },
  response: {
    use(handler: (data: any, xhr: XMLHttpRequest) => any): number {
      return interceptors.response.push(handler) - 1
    },
    eject(id: number): void {
      interceptors.response.splice(id, 1)
    }
  }
}

// 修改 ajax 函数
function ajax(options: AjaxSettings): XMLHttpRequest {
  // 应用请求拦截器
  let settings = { ...ajaxDefaults, ...options }
  
  for (const interceptor of interceptors.request) {
    const result = interceptor(settings)
    if (result) settings = result
  }
  
  // ... 发送请求
  
  // 应用响应拦截器
  xhr.onreadystatechange = function() {
    if (xhr.readyState !== 4) return
    
    let data = parseResponse(xhr, settings.dataType)
    
    for (const interceptor of interceptors.response) {
      data = interceptor(data, xhr) ?? data
    }
    
    settings.success?.(data, 'success', xhr)
  }
}

// 使用
// 添加 token
$.ajaxInterceptors.request.use(settings => {
  settings.headers = settings.headers || {}
  settings.headers['Authorization'] = `Bearer ${getToken()}`
  return settings
})

// 统一错误处理
$.ajaxInterceptors.response.use((data, xhr) => {
  if (data.code !== 0) {
    throw new Error(data.message)
  }
  return data.data
})
```

## 全局默认配置

```typescript
$.ajaxSetup = function(options: Partial<AjaxSettings>): void {
  Object.assign(ajaxDefaults, options)
}

// 使用
$.ajaxSetup({
  timeout: 10000,
  headers: {
    'X-Requested-With': 'XMLHttpRequest'
  }
})
```

## 测试

```typescript
describe('请求配置', () => {
  describe('dataType', () => {
    it('json 自动解析', (done) => {
      mockXHR({ responseText: '{"name":"test"}' })
      
      $.ajax({
        url: '/api',
        dataType: 'json',
        success: (data) => {
          expect(data.name).toBe('test')
          done()
        }
      })
    })
  })

  describe('contentType', () => {
    it('发送 JSON', () => {
      const xhr = $.ajax({
        url: '/api',
        type: 'POST',
        contentType: 'application/json',
        data: { test: 1 }
      })
      
      expect(xhr.setRequestHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/json'
      )
    })
  })

  describe('timeout', () => {
    it('超时触发 error', (done) => {
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

  describe('拦截器', () => {
    it('请求拦截', () => {
      $.ajaxInterceptors.request.use(settings => {
        settings.headers = { 'X-Test': '1' }
        return settings
      })
      
      const xhr = $.ajax({ url: '/api' })
      
      expect(xhr.setRequestHeader).toHaveBeenCalledWith('X-Test', '1')
    })
  })
})
```

## 小结

本章详解了 AJAX 配置选项：

**数据格式**：
- `dataType`：json、text、html、xml、script、jsonp
- `contentType`：表单编码、JSON、FormData

**网络控制**：
- 超时与重试
- 跨域配置

**扩展机制**：
- 拦截器
- 全局默认配置

这些配置使 AJAX 能够适应各种场景。
