# 类名操作

类名操作是 DOM 操作中最常用的功能之一。

## addClass - 添加类名

```typescript
export class Zepto {
  addClass(className: string | ((index: number, currentClass: string) => string)): this {
    return this.each((i, el) => {
      const classes = typeof className === 'function'
        ? className.call(el, i, el.className)
        : className
      
      if (!classes) return
      
      // 支持空格分隔的多个类名
      classes.split(/\s+/).forEach(cls => {
        if (cls) {
          el.classList.add(cls)
        }
      })
    })
  }
}

// 使用
$('.item').addClass('active')
$('.item').addClass('active highlight')
$('.item').addClass((i) => `item-${i}`)
```

## removeClass - 删除类名

```typescript
export class Zepto {
  removeClass(className?: string | ((index: number, currentClass: string) => string)): this {
    return this.each((i, el) => {
      // 不传参数删除所有类名
      if (className === undefined) {
        el.className = ''
        return
      }
      
      const classes = typeof className === 'function'
        ? className.call(el, i, el.className)
        : className
      
      if (!classes) return
      
      classes.split(/\s+/).forEach(cls => {
        if (cls) {
          el.classList.remove(cls)
        }
      })
    })
  }
}

// 使用
$('.item').removeClass('active')
$('.item').removeClass('active highlight')
$('.item').removeClass()  // 删除所有类名
```

## hasClass - 检查类名

```typescript
export class Zepto {
  hasClass(className: string): boolean {
    return this.toArray().some(el => el.classList.contains(className))
  }
}

// 使用
$('.item').hasClass('active')  // true/false
```

## toggleClass - 切换类名

```typescript
export class Zepto {
  toggleClass(
    className: string | ((index: number, currentClass: string, state?: boolean) => string),
    state?: boolean
  ): this {
    return this.each((i, el) => {
      const classes = typeof className === 'function'
        ? className.call(el, i, el.className, state)
        : className
      
      if (!classes) return
      
      classes.split(/\s+/).forEach(cls => {
        if (!cls) return
        
        if (state !== undefined) {
          // 明确指定状态
          el.classList.toggle(cls, state)
        } else {
          // 自动切换
          el.classList.toggle(cls)
        }
      })
    })
  }
}

// 使用
$('.item').toggleClass('active')       // 自动切换
$('.item').toggleClass('active', true) // 强制添加
$('.item').toggleClass('active', false) // 强制删除
$('.item').toggleClass('a b')          // 切换多个
```

## 原生 classList API

现代浏览器的 `classList` 提供了便捷的类名操作：

```javascript
element.classList.add('class')     // 添加
element.classList.remove('class')  // 删除
element.classList.toggle('class')  // 切换
element.classList.contains('class') // 检查
element.classList.replace('old', 'new') // 替换
```

## 兼容性处理

对于不支持 classList 的老浏览器：

```typescript
function addClass(el: Element, className: string): void {
  if (el.classList) {
    el.classList.add(className)
  } else {
    const classes = el.className.split(/\s+/)
    if (!classes.includes(className)) {
      classes.push(className)
      el.className = classes.join(' ')
    }
  }
}

function removeClass(el: Element, className: string): void {
  if (el.classList) {
    el.classList.remove(className)
  } else {
    const classes = el.className.split(/\s+/)
    el.className = classes.filter(c => c !== className).join(' ')
  }
}

function hasClass(el: Element, className: string): boolean {
  if (el.classList) {
    return el.classList.contains(className)
  }
  return el.className.split(/\s+/).includes(className)
}
```

## 实用场景

### 激活状态切换

```javascript
$('.tab').on('click', function() {
  $(this).addClass('active').siblings().removeClass('active')
})
```

### 条件类名

```javascript
$('.item').toggleClass('visible', isVisible)
$('.item').toggleClass('loading', isLoading)
```

### 动态类名

```javascript
$('.item').addClass((index) => {
  return index % 2 === 0 ? 'even' : 'odd'
})
```

### 批量操作

```javascript
$('.item')
  .removeClass('old-class')
  .addClass('new-class')
```

## 测试

```typescript
describe('Class Operations', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div class="item">1</div>
      <div class="item">2</div>
      <div class="item active">3</div>
    `
  })

  describe('addClass', () => {
    it('添加单个类名', () => {
      $('.item').first().addClass('new')
      expect($('.item')[0].classList.contains('new')).toBe(true)
    })

    it('添加多个类名', () => {
      $('.item').first().addClass('a b c')
      expect($('.item')[0].classList.contains('a')).toBe(true)
      expect($('.item')[0].classList.contains('b')).toBe(true)
      expect($('.item')[0].classList.contains('c')).toBe(true)
    })

    it('函数参数', () => {
      $('.item').addClass((i) => `item-${i}`)
      expect($('.item')[0].classList.contains('item-0')).toBe(true)
      expect($('.item')[1].classList.contains('item-1')).toBe(true)
    })
  })

  describe('removeClass', () => {
    it('删除单个类名', () => {
      $('.active').removeClass('active')
      expect($('.active').length).toBe(0)
    })

    it('删除所有类名', () => {
      $('.item').first().removeClass()
      expect($('.item')[0].className).toBe('')
    })
  })

  describe('hasClass', () => {
    it('检查类名存在', () => {
      expect($('.item').hasClass('active')).toBe(true)
    })

    it('检查类名不存在', () => {
      expect($('.item').hasClass('notexist')).toBe(false)
    })
  })

  describe('toggleClass', () => {
    it('自动切换', () => {
      const $first = $('.item').first()
      $first.toggleClass('active')
      expect($first.hasClass('active')).toBe(true)
      $first.toggleClass('active')
      expect($first.hasClass('active')).toBe(false)
    })

    it('强制状态', () => {
      const $first = $('.item').first()
      $first.toggleClass('active', true)
      expect($first.hasClass('active')).toBe(true)
      $first.toggleClass('active', true)
      expect($first.hasClass('active')).toBe(true)
    })
  })
})
```

## 小结

本章实现了类名操作方法：

- **addClass**：添加类名，支持多个和函数参数
- **removeClass**：删除类名，不传参删除全部
- **hasClass**：检查是否包含类名
- **toggleClass**：切换类名，支持强制状态

这是 DOM 操作中最常用的功能之一。
