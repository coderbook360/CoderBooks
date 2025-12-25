# 内容操作

本章实现元素内容的读写操作。

## html - HTML 内容

```typescript
export class Zepto {
  html(): string
  html(content: string): this
  
  html(content?: string): string | this {
    // 读取
    if (content === undefined) {
      const el = this[0] as HTMLElement
      return el ? el.innerHTML : ''
    }
    
    // 设置
    return this.each((_, el) => {
      const htmlEl = el as HTMLElement
      
      // 清理事件监听器防止内存泄漏
      this.cleanData(htmlEl)
      
      htmlEl.innerHTML = content
    })
  }
  
  private cleanData(el: HTMLElement): void {
    // 移除所有子元素的事件监听器
    const descendants = el.getElementsByTagName('*')
    for (let i = 0; i < descendants.length; i++) {
      const desc = descendants[i] as any
      if (desc._events) {
        $(desc).off()
      }
    }
  }
}
```

## text - 纯文本内容

```typescript
export class Zepto {
  text(): string
  text(content: string): this
  
  text(content?: string): string | this {
    // 读取
    if (content === undefined) {
      // 合并所有元素的文本
      return this.toArray().map(el => 
        (el as HTMLElement).textContent || ''
      ).join('')
    }
    
    // 设置
    return this.each((_, el) => {
      (el as HTMLElement).textContent = content
    })
  }
}
```

## empty - 清空内容

```typescript
export class Zepto {
  empty(): this {
    return this.each((_, el) => {
      const htmlEl = el as HTMLElement
      
      // 清理事件
      this.cleanData(htmlEl)
      
      // 清空内容
      while (htmlEl.firstChild) {
        htmlEl.removeChild(htmlEl.firstChild)
      }
    })
  }
}
```

## clone - 克隆元素

```typescript
export class Zepto {
  clone(deep = true): Zepto {
    const clones = this.toArray().map(el => {
      const clone = el.cloneNode(deep) as Element
      
      // 注意：克隆不会复制事件监听器
      // 如需复制事件，需要额外处理
      
      return clone
    })
    
    return $(clones)
  }
}
```

如需克隆事件：

```typescript
export class Zepto {
  clone(deep = true, withEvents = false): Zepto {
    const clones = this.toArray().map(el => {
      const clone = el.cloneNode(deep) as Element
      
      if (withEvents) {
        this.cloneEvents(el, clone, deep)
      }
      
      return clone
    })
    
    return $(clones)
  }
  
  private cloneEvents(src: Element, dest: Element, deep: boolean): void {
    const srcEl = src as any
    const destEl = dest as any
    
    // 复制源元素事件
    if (srcEl._events) {
      destEl._events = {}
      Object.entries(srcEl._events).forEach(([type, handlers]) => {
        destEl._events[type] = [...handlers as any[]]
        ;(handlers as any[]).forEach(handler => {
          dest.addEventListener(type, handler)
        })
      })
    }
    
    // 递归复制子元素事件
    if (deep) {
      const srcChildren = src.children
      const destChildren = dest.children
      
      for (let i = 0; i < srcChildren.length; i++) {
        this.cloneEvents(srcChildren[i], destChildren[i], true)
      }
    }
  }
}
```

## 表单操作

### val - 表单值

```typescript
export class Zepto {
  val(): string | string[]
  val(value: string | string[]): this
  
  val(value?: string | string[]): string | string[] | this {
    const el = this[0] as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    
    // 读取
    if (value === undefined) {
      if (!el) return ''
      
      // select 多选
      if (el.tagName === 'SELECT' && (el as HTMLSelectElement).multiple) {
        const options = (el as HTMLSelectElement).options
        const values: string[] = []
        
        for (let i = 0; i < options.length; i++) {
          if (options[i].selected) {
            values.push(options[i].value)
          }
        }
        
        return values
      }
      
      return el.value
    }
    
    // 设置
    return this.each((_, element) => {
      const input = element as HTMLInputElement | HTMLSelectElement
      
      if (input.tagName === 'SELECT' && Array.isArray(value)) {
        const select = input as HTMLSelectElement
        const values = new Set(value)
        
        for (let i = 0; i < select.options.length; i++) {
          select.options[i].selected = values.has(select.options[i].value)
        }
      } else {
        input.value = value as string
      }
    })
  }
}
```

### serialize - 表单序列化

```typescript
export class Zepto {
  serialize(): string {
    const pairs: string[] = []
    
    this.find('input, select, textarea').each((_, el) => {
      const input = el as HTMLInputElement
      const name = input.name
      const type = input.type
      
      // 跳过无效元素
      if (!name || input.disabled) return
      if (type === 'submit' || type === 'reset' || type === 'button') return
      if (type === 'file') return
      if ((type === 'checkbox' || type === 'radio') && !input.checked) return
      
      // select 多选
      if (input.tagName === 'SELECT') {
        const select = el as HTMLSelectElement
        const options = select.options
        
        for (let i = 0; i < options.length; i++) {
          if (options[i].selected) {
            pairs.push(
              encodeURIComponent(name) + '=' + encodeURIComponent(options[i].value)
            )
          }
        }
      } else {
        pairs.push(
          encodeURIComponent(name) + '=' + encodeURIComponent(input.value)
        )
      }
    })
    
    return pairs.join('&')
  }
  
  serializeArray(): Array<{ name: string; value: string }> {
    const result: Array<{ name: string; value: string }> = []
    
    this.find('input, select, textarea').each((_, el) => {
      const input = el as HTMLInputElement
      const name = input.name
      const type = input.type
      
      if (!name || input.disabled) return
      if (type === 'submit' || type === 'reset' || type === 'button') return
      if (type === 'file') return
      if ((type === 'checkbox' || type === 'radio') && !input.checked) return
      
      if (input.tagName === 'SELECT') {
        const select = el as HTMLSelectElement
        for (let i = 0; i < select.options.length; i++) {
          if (select.options[i].selected) {
            result.push({ name, value: select.options[i].value })
          }
        }
      } else {
        result.push({ name, value: input.value })
      }
    })
    
    return result
  }
}
```

## 测试

```typescript
describe('内容操作', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="test">
        <span>Hello</span>
        <span>World</span>
      </div>
      <form id="form">
        <input name="username" value="john">
        <input name="remember" type="checkbox" checked>
        <select name="color" multiple>
          <option value="red" selected>Red</option>
          <option value="blue" selected>Blue</option>
        </select>
      </form>
    `
  })

  describe('html', () => {
    it('读取 HTML', () => {
      expect($('#test').html()).toContain('<span>Hello</span>')
    })

    it('设置 HTML', () => {
      $('#test').html('<p>New</p>')
      expect($('#test').html()).toBe('<p>New</p>')
    })
  })

  describe('text', () => {
    it('读取文本', () => {
      expect($('#test').text().replace(/\s+/g, ' ').trim()).toBe('Hello World')
    })

    it('设置文本', () => {
      $('#test').text('Plain text')
      expect($('#test').text()).toBe('Plain text')
      expect($('#test').html()).not.toContain('<')
    })
  })

  describe('empty', () => {
    it('清空内容', () => {
      $('#test').empty()
      expect($('#test').html()).toBe('')
    })
  })

  describe('clone', () => {
    it('克隆元素', () => {
      const clone = $('#test').clone()
      expect(clone.find('span').length).toBe(2)
    })
  })

  describe('val', () => {
    it('读取输入框值', () => {
      expect($('input[name="username"]').val()).toBe('john')
    })

    it('读取 select 多选', () => {
      expect($('select[name="color"]').val()).toEqual(['red', 'blue'])
    })

    it('设置值', () => {
      $('input[name="username"]').val('jane')
      expect($('input[name="username"]').val()).toBe('jane')
    })
  })

  describe('serialize', () => {
    it('序列化表单', () => {
      const data = $('#form').serialize()
      expect(data).toContain('username=john')
      expect(data).toContain('remember=on')
      expect(data).toContain('color=red')
      expect(data).toContain('color=blue')
    })

    it('serializeArray', () => {
      const arr = $('#form').serializeArray()
      expect(arr).toContainEqual({ name: 'username', value: 'john' })
    })
  })
})
```

## 小结

本章实现了内容操作方法：

- **html**：读写 HTML 内容
- **text**：读写纯文本
- **empty**：清空内容
- **clone**：克隆元素（可选克隆事件）
- **val**：读写表单值
- **serialize / serializeArray**：表单序列化

这些 API 覆盖了内容操作的常见场景。
