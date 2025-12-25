# 属性操作

本章实现 DOM 元素的属性读写操作。

## attr - 属性读写

```typescript
export class Zepto {
  // 读取属性
  attr(name: string): string | undefined
  // 设置单个属性
  attr(name: string, value: string | number | null): this
  // 设置多个属性
  attr(attrs: Record<string, string | number | null>): this
  
  attr(
    name: string | Record<string, string | number | null>,
    value?: string | number | null
  ): string | undefined | this {
    // 读取
    if (typeof name === 'string' && value === undefined) {
      const el = this[0]
      return el ? el.getAttribute(name) || undefined : undefined
    }
    
    // 设置对象
    if (typeof name === 'object') {
      Object.entries(name).forEach(([key, val]) => {
        this.attr(key, val)
      })
      return this
    }
    
    // 设置单个
    return this.each((_, el) => {
      if (value === null) {
        el.removeAttribute(name)
      } else {
        el.setAttribute(name, String(value))
      }
    })
  }
}
```

## removeAttr - 删除属性

```typescript
export class Zepto {
  removeAttr(name: string): this {
    const names = name.split(/\s+/)
    
    return this.each((_, el) => {
      names.forEach(n => el.removeAttribute(n))
    })
  }
}

// 使用
$('.item').removeAttr('disabled readonly')  // 删除多个属性
```

## prop - 属性值（布尔）

HTML 属性和 DOM 属性的区别：

```javascript
// HTML 属性
<input type="checkbox" checked="checked">

// DOM 属性
input.checked  // true/false (布尔值)
input.getAttribute('checked')  // "checked" (字符串)
```

```typescript
export class Zepto {
  prop(name: string): unknown
  prop(name: string, value: unknown): this
  prop(props: Record<string, unknown>): this
  
  prop(
    name: string | Record<string, unknown>,
    value?: unknown
  ): unknown | this {
    // 读取
    if (typeof name === 'string' && value === undefined) {
      const el = this[0] as any
      return el ? el[name] : undefined
    }
    
    // 设置对象
    if (typeof name === 'object') {
      Object.entries(name).forEach(([key, val]) => {
        this.prop(key, val)
      })
      return this
    }
    
    // 设置单个
    return this.each((_, el) => {
      (el as any)[name] = value
    })
  }
}
```

## removeProp - 删除 DOM 属性

```typescript
export class Zepto {
  removeProp(name: string): this {
    return this.each((_, el) => {
      try {
        delete (el as any)[name]
      } catch (e) {
        // 某些属性不可删除
      }
    })
  }
}
```

## data - 数据属性

```typescript
export class Zepto {
  private static dataStore = new WeakMap<Element, Record<string, unknown>>()
  
  data(name: string): unknown
  data(name: string, value: unknown): this
  data(data: Record<string, unknown>): this
  data(): Record<string, unknown>
  
  data(
    name?: string | Record<string, unknown>,
    value?: unknown
  ): unknown | this {
    // 读取所有
    if (name === undefined) {
      const el = this[0]
      if (!el) return {}
      return this.getAllData(el)
    }
    
    // 读取单个
    if (typeof name === 'string' && value === undefined) {
      const el = this[0]
      if (!el) return undefined
      return this.getData(el, name)
    }
    
    // 设置对象
    if (typeof name === 'object') {
      return this.each((_, el) => {
        Object.entries(name).forEach(([key, val]) => {
          this.setData(el, key, val)
        })
      })
    }
    
    // 设置单个
    return this.each((_, el) => {
      this.setData(el, name as string, value)
    })
  }
  
  private getData(el: Element, name: string): unknown {
    const store = Zepto.dataStore.get(el)
    
    // 先从 store 查找
    if (store && name in store) {
      return store[name]
    }
    
    // 再从 data-* 属性查找
    const attrValue = el.getAttribute(`data-${this.kebabCase(name)}`)
    if (attrValue !== null) {
      return this.parseDataValue(attrValue)
    }
    
    return undefined
  }
  
  private setData(el: Element, name: string, value: unknown): void {
    let store = Zepto.dataStore.get(el)
    if (!store) {
      store = {}
      Zepto.dataStore.set(el, store)
    }
    store[name] = value
  }
  
  private getAllData(el: Element): Record<string, unknown> {
    const result: Record<string, unknown> = {}
    
    // 从 data-* 属性获取
    Array.from(el.attributes).forEach(attr => {
      if (attr.name.startsWith('data-')) {
        const key = this.camelCase(attr.name.slice(5))
        result[key] = this.parseDataValue(attr.value)
      }
    })
    
    // 从 store 获取（覆盖）
    const store = Zepto.dataStore.get(el)
    if (store) {
      Object.assign(result, store)
    }
    
    return result
  }
  
  private parseDataValue(value: string): unknown {
    // 尝试解析为 JSON
    try {
      return JSON.parse(value)
    } catch {
      return value
    }
  }
  
  private camelCase(str: string): string {
    return str.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
  }
  
  private kebabCase(str: string): string {
    return str.replace(/([A-Z])/g, '-$1').toLowerCase()
  }
}
```

## removeData - 删除数据

```typescript
export class Zepto {
  removeData(names?: string | string[]): this {
    if (names === undefined) {
      return this.each((_, el) => {
        Zepto.dataStore.delete(el)
      })
    }
    
    const keys = typeof names === 'string' ? names.split(/\s+/) : names
    
    return this.each((_, el) => {
      const store = Zepto.dataStore.get(el)
      if (store) {
        keys.forEach(key => delete store[key])
      }
    })
  }
}
```

## val - 表单值

```typescript
export class Zepto {
  val(): string | string[] | undefined
  val(value: string | string[]): this
  
  val(value?: string | string[]): string | string[] | undefined | this {
    // 读取
    if (value === undefined) {
      const el = this[0] as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      if (!el) return undefined
      
      // 多选 select
      if (el.tagName === 'SELECT' && (el as HTMLSelectElement).multiple) {
        const options = (el as HTMLSelectElement).selectedOptions
        return Array.from(options).map(opt => opt.value)
      }
      
      return el.value
    }
    
    // 设置
    return this.each((_, el) => {
      const input = el as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      
      // 多选 select
      if (input.tagName === 'SELECT' && Array.isArray(value)) {
        const select = input as HTMLSelectElement
        Array.from(select.options).forEach(opt => {
          opt.selected = value.includes(opt.value)
        })
        return
      }
      
      input.value = String(value)
    })
  }
}
```

## 测试

```typescript
describe('Attributes', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="test" class="item" data-id="123" data-user='{"name":"test"}'>
        <input type="checkbox" checked>
        <input type="text" value="hello">
        <select multiple>
          <option value="a" selected>A</option>
          <option value="b" selected>B</option>
        </select>
      </div>
    `
  })

  describe('attr', () => {
    it('读取属性', () => {
      expect($('#test').attr('id')).toBe('test')
    })

    it('设置属性', () => {
      $('#test').attr('title', 'Hello')
      expect($('#test').attr('title')).toBe('Hello')
    })

    it('删除属性', () => {
      $('#test').attr('title', null)
      expect($('#test').attr('title')).toBeUndefined()
    })
  })

  describe('prop', () => {
    it('读取布尔属性', () => {
      expect($('input[type="checkbox"]').prop('checked')).toBe(true)
    })

    it('设置布尔属性', () => {
      $('input[type="checkbox"]').prop('checked', false)
      expect($('input[type="checkbox"]').prop('checked')).toBe(false)
    })
  })

  describe('data', () => {
    it('读取 data-* 属性', () => {
      expect($('#test').data('id')).toBe(123)  // 自动解析为数字
    })

    it('读取 JSON data', () => {
      expect($('#test').data('user')).toEqual({ name: 'test' })
    })

    it('设置 data', () => {
      $('#test').data('custom', { a: 1 })
      expect($('#test').data('custom')).toEqual({ a: 1 })
    })
  })

  describe('val', () => {
    it('读取输入值', () => {
      expect($('input[type="text"]').val()).toBe('hello')
    })

    it('设置输入值', () => {
      $('input[type="text"]').val('world')
      expect($('input[type="text"]').val()).toBe('world')
    })

    it('多选 select', () => {
      expect($('select').val()).toEqual(['a', 'b'])
    })
  })
})
```

## 小结

本章实现了属性操作方法：

- **attr/removeAttr**：HTML 属性操作
- **prop/removeProp**：DOM 属性操作
- **data/removeData**：数据属性操作
- **val**：表单值操作

这些方法是 DOM 操作的基础。
