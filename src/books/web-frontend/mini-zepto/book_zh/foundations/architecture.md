# 架构设计

Zepto 的核心设计理念：**用最小的代码量提供最实用的 DOM 操作 API**。

## 设计目标

| 目标 | 说明 |
|------|------|
| 轻量 | 核心代码 < 10KB |
| 兼容 | jQuery API 兼容 |
| 链式 | 支持链式调用 |
| 移动优先 | 针对移动端优化 |

## 核心架构

```
┌─────────────────────────────────────┐
│            $ (工厂函数)              │
├─────────────────────────────────────┤
│            Zepto 类                  │
│  ┌─────────────────────────────────┐│
│  │  DOM 集合 (类数组)               ││
│  │  [element1, element2, ...]      ││
│  └─────────────────────────────────┘│
├─────────────────────────────────────┤
│  DOM 操作  │  事件  │  动画  │  AJAX │
└─────────────────────────────────────┘
```

## 类数组设计

Zepto 实例是一个**类数组对象**：

```typescript
class Zepto {
  [index: number]: Element
  length: number = 0
  
  constructor(elements: Element[]) {
    elements.forEach((el, i) => {
      this[i] = el
    })
    this.length = elements.length
  }
}

// 使用
$('div')[0]  // 第一个 div 元素
$('div').length  // div 元素数量
```

## 链式调用

每个方法返回 `this`：

```typescript
class Zepto {
  addClass(className: string): this {
    this.each(el => el.classList.add(className))
    return this
  }
  
  removeClass(className: string): this {
    this.each(el => el.classList.remove(className))
    return this
  }
}

// 链式使用
$('.item')
  .addClass('active')
  .removeClass('disabled')
  .css('color', 'red')
```

## 模块化设计

功能按模块拆分，通过原型扩展：

```typescript
// dom.ts - DOM 操作模块
export function extendDOM(ZeptoClass: typeof Zepto) {
  ZeptoClass.prototype.addClass = function(className: string) {
    // ...
  }
  
  ZeptoClass.prototype.removeClass = function(className: string) {
    // ...
  }
}

// events.ts - 事件模块
export function extendEvents(ZeptoClass: typeof Zepto) {
  ZeptoClass.prototype.on = function(event: string, handler: Function) {
    // ...
  }
}

// 组装
extendDOM(Zepto)
extendEvents(Zepto)
```

## 插件机制

通过 `$.fn` 扩展：

```typescript
interface ZeptoStatic {
  fn: typeof Zepto.prototype
}

const $: ZeptoStatic = function(selector: string) {
  return new Zepto(selector)
} as any

$.fn = Zepto.prototype

// 插件
$.fn.myPlugin = function() {
  return this.each(function() {
    // 插件逻辑
  })
}
```

## 与 jQuery 的差异

| 特性 | jQuery | Zepto |
|------|--------|-------|
| 体积 | ~90KB | ~10KB |
| 选择器 | Sizzle 引擎 | 原生 querySelectorAll |
| 动画 | JavaScript 动画 | CSS3 动画 |
| IE 支持 | IE 6+ | 不支持 IE |
| 移动优化 | 通用 | 触摸事件优化 |

## 类型定义

```typescript
// types.ts
export type Selector = string | Element | Element[] | NodeList | Zepto

export interface ZeptoInstance {
  [index: number]: Element
  length: number
  
  // DOM 操作
  addClass(className: string): this
  removeClass(className: string): this
  toggleClass(className: string): this
  
  // 事件
  on(event: string, handler: EventListener): this
  off(event: string, handler?: EventListener): this
  
  // 遍历
  each(callback: (index: number, element: Element) => void): this
  map<T>(callback: (index: number, element: Element) => T): T[]
}
```

## 小结

本章确立了 Zepto 的核心架构：

- **类数组结构**：存储 DOM 元素集合
- **链式调用**：每个方法返回 this
- **模块化扩展**：功能按模块组织
- **插件机制**：通过 $.fn 扩展

下一章我们将实现核心数据结构。
