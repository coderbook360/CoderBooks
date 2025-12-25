# 便捷方法

本章实现 AJAX 的快捷调用方式。

## $.get

```typescript
export function get(
  url: string,
  data?: any,
  success?: (data: any, status: string, xhr: XMLHttpRequest) => void,
  dataType?: string
): XMLHttpRequest {
  // 参数归一化
  if (typeof data === 'function') {
    dataType = success as any
    success = data
    data = undefined
  }
  
  return ajax({
    url,
    type: 'GET',
    data,
    success,
    dataType
  })
}

// 使用
$.get('/api/users', { page: 1 }, (data) => {
  console.log(data)
}, 'json')

// 简化
$.get('/api/users', (data) => {
  console.log(data)
})
```

## $.post

```typescript
export function post(
  url: string,
  data?: any,
  success?: (data: any, status: string, xhr: XMLHttpRequest) => void,
  dataType?: string
): XMLHttpRequest {
  if (typeof data === 'function') {
    dataType = success as any
    success = data
    data = undefined
  }
  
  return ajax({
    url,
    type: 'POST',
    data,
    success,
    dataType
  })
}

// 使用
$.post('/api/users', { name: 'John' }, (data) => {
  console.log('创建成功:', data)
})
```

## $.getJSON

专门获取 JSON 数据：

```typescript
export function getJSON(
  url: string,
  data?: any,
  success?: (data: any, status: string, xhr: XMLHttpRequest) => void
): XMLHttpRequest {
  if (typeof data === 'function') {
    success = data
    data = undefined
  }
  
  return ajax({
    url,
    type: 'GET',
    data,
    success,
    dataType: 'json'
  })
}

// 使用
$.getJSON('/api/config', (config) => {
  console.log(config.version)
})
```

## $.getScript

动态加载 JS 脚本：

```typescript
export function getScript(
  url: string,
  success?: () => void
): XMLHttpRequest | void {
  // 方式一：使用 XHR
  return ajax({
    url,
    type: 'GET',
    dataType: 'script',
    success
  })
}

// 方式二：直接创建 script 标签（支持跨域）
export function getScriptTag(
  url: string,
  success?: () => void
): HTMLScriptElement {
  const script = document.createElement('script')
  script.src = url
  script.async = true
  
  script.onload = () => {
    success?.()
    script.remove()
  }
  
  script.onerror = () => {
    console.error('Script load failed:', url)
    script.remove()
  }
  
  document.head.appendChild(script)
  return script
}

// 使用
$.getScript('https://cdn.example.com/lib.js', () => {
  console.log('Script loaded')
})
```

## load

加载 HTML 片段到元素：

```typescript
export class Zepto {
  load(
    url: string,
    data?: any,
    complete?: (responseText: string, status: string, xhr: XMLHttpRequest) => void
  ): this {
    if (typeof data === 'function') {
      complete = data
      data = undefined
    }
    
    // 解析 URL 中的选择器
    // 格式: url selector
    // 例如: '/page.html #content'
    let selector = ''
    const spaceIndex = url.indexOf(' ')
    
    if (spaceIndex > -1) {
      selector = url.slice(spaceIndex + 1).trim()
      url = url.slice(0, spaceIndex)
    }
    
    ajax({
      url,
      type: data ? 'POST' : 'GET',
      data,
      dataType: 'html',
      success: (html, status, xhr) => {
        // 提取选择器内容
        if (selector) {
          const temp = document.createElement('div')
          temp.innerHTML = html
          const selected = temp.querySelectorAll(selector)
          html = Array.from(selected).map(el => el.innerHTML).join('')
        }
        
        // 设置内容
        this.html(html)
        
        complete?.(html, status, xhr)
      },
      error: (xhr, status) => {
        this.html('')
        complete?.('', status, xhr)
      }
    })
    
    return this
  }
}

// 使用
$('#content').load('/page.html')
$('#content').load('/page.html #main')
$('#content').load('/page.html', { id: 1 }, () => {
  console.log('Loaded')
})
```

## REST 方法

```typescript
export function put(
  url: string,
  data?: any,
  success?: (data: any) => void,
  dataType?: string
): XMLHttpRequest {
  return ajax({
    url,
    type: 'PUT',
    data,
    success,
    dataType: dataType || 'json',
    contentType: 'application/json'
  })
}

export function patch(
  url: string,
  data?: any,
  success?: (data: any) => void,
  dataType?: string
): XMLHttpRequest {
  return ajax({
    url,
    type: 'PATCH',
    data,
    success,
    dataType: dataType || 'json',
    contentType: 'application/json'
  })
}

export function del(
  url: string,
  data?: any,
  success?: (data: any) => void
): XMLHttpRequest {
  return ajax({
    url,
    type: 'DELETE',
    data,
    success,
    dataType: 'json'
  })
}

// 使用
$.put('/api/users/1', { name: 'Updated' })
$.patch('/api/users/1', { status: 'active' })
$.delete('/api/users/1')
```

## 表单提交

```typescript
export class Zepto {
  submit(
    url: string,
    success?: (data: any) => void,
    error?: (xhr: XMLHttpRequest) => void
  ): this {
    const form = this[0] as HTMLFormElement
    if (!form || form.tagName !== 'FORM') {
      return this
    }
    
    const method = (form.method || 'GET').toUpperCase()
    const formData = new FormData(form)
    
    // 检查是否有文件
    const hasFile = Array.from(formData.entries()).some(
      ([_, value]) => value instanceof File
    )
    
    if (hasFile) {
      // 文件上传
      ajax({
        url: url || form.action,
        type: 'POST',
        data: formData,
        contentType: false,
        processData: false,
        success,
        error
      })
    } else {
      // 普通表单
      const data: Record<string, any> = {}
      formData.forEach((value, key) => {
        if (data[key]) {
          // 多个同名字段
          if (!Array.isArray(data[key])) {
            data[key] = [data[key]]
          }
          data[key].push(value)
        } else {
          data[key] = value
        }
      })
      
      ajax({
        url: url || form.action,
        type: method as any,
        data,
        success,
        error
      })
    }
    
    return this
  }
}

// 使用
$('#loginForm').submit('/api/login', (result) => {
  if (result.success) {
    redirect('/dashboard')
  }
})
```

## Promise 快捷方法

```typescript
export const $p = {
  get(url: string, data?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      $.get(url, data, resolve, 'json')
    })
  },
  
  post(url: string, data?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      $.ajax({
        url,
        type: 'POST',
        data,
        dataType: 'json',
        contentType: 'application/json',
        success: resolve,
        error: (_, __, error) => reject(error)
      })
    })
  },
  
  put(url: string, data?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      $.put(url, data, resolve)
    })
  },
  
  delete(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
      $.delete(url, undefined, resolve)
    })
  }
}

// 使用
async function fetchUsers() {
  const users = await $p.get('/api/users')
  console.log(users)
}

async function createUser(user: any) {
  const result = await $p.post('/api/users', user)
  return result
}
```

## 测试

```typescript
describe('便捷方法', () => {
  describe('$.get', () => {
    it('GET 请求', (done) => {
      mockXHR({ status: 200, responseText: '{"id":1}' })
      
      $.get('/api/test', (data) => {
        expect(data).toBeDefined()
        done()
      })
    })

    it('带参数', () => {
      const xhr = $.get('/api/test', { page: 1 })
      expect(xhr.open).toHaveBeenCalledWith(
        'GET',
        expect.stringContaining('page=1'),
        true
      )
    })
  })

  describe('$.post', () => {
    it('POST 请求', () => {
      const xhr = $.post('/api/test', { name: 'test' })
      expect(xhr.open).toHaveBeenCalledWith('POST', '/api/test', true)
    })
  })

  describe('$.getJSON', () => {
    it('自动解析 JSON', (done) => {
      mockXHR({ responseText: '{"name":"test"}' })
      
      $.getJSON('/api/test', (data) => {
        expect(data.name).toBe('test')
        done()
      })
    })
  })

  describe('load', () => {
    it('加载 HTML', (done) => {
      mockXHR({ responseText: '<p>Content</p>' })
      
      document.body.innerHTML = '<div id="target"></div>'
      
      $('#target').load('/page.html', () => {
        expect($('#target').html()).toBe('<p>Content</p>')
        done()
      })
    })

    it('选择器过滤', (done) => {
      mockXHR({ 
        responseText: '<div id="a">A</div><div id="b">B</div>' 
      })
      
      document.body.innerHTML = '<div id="target"></div>'
      
      $('#target').load('/page.html #b', () => {
        expect($('#target').html()).toBe('B')
        done()
      })
    })
  })
})
```

## 小结

本章实现了 AJAX 便捷方法：

**基础快捷**：
- `$.get` / `$.post`：常用请求
- `$.getJSON`：获取 JSON
- `$.getScript`：加载脚本

**REST 方法**：
- `$.put` / `$.patch` / `$.delete`

**DOM 集成**：
- `load`：加载 HTML 到元素
- `submit`：表单提交

**Promise 版本**：
- `$p.get/post/put/delete`

这些方法简化了常见的网络请求操作。
