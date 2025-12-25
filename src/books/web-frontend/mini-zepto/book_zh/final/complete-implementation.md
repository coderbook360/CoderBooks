# 完整实现

本章整合所有模块，形成完整的 Mini Zepto 实现。

## 项目结构

```
mini-zepto/
├── src/
│   ├── index.ts          # 入口
│   ├── core.ts           # 核心类
│   ├── selector.ts       # 选择器
│   ├── dom.ts            # DOM 操作
│   ├── events.ts         # 事件系统
│   ├── animation.ts      # 动画
│   ├── ajax.ts           # 网络请求
│   └── utils.ts          # 工具函数
├── tests/
│   └── *.test.ts
├── package.json
└── tsconfig.json
```

## 核心类实现

```typescript
// src/core.ts
export class Zepto {
  [index: number]: Element
  length: number = 0
  
  private _isZepto = true
  
  constructor(selector?: string | Element | Element[] | Zepto | Document | Window) {
    const elements = this.init(selector)
    
    elements.forEach((el, i) => {
      this[i] = el
    })
    
    this.length = elements.length
  }
  
  private init(selector: any): Element[] {
    if (!selector) return []
    
    // 字符串选择器
    if (typeof selector === 'string') {
      selector = selector.trim()
      
      // HTML 字符串
      if (selector[0] === '<') {
        return this.parseHTML(selector)
      }
      
      // CSS 选择器
      return Array.from(document.querySelectorAll(selector))
    }
    
    // Zepto 对象
    if (selector._isZepto) {
      return selector.toArray()
    }
    
    // 数组或类数组
    if (Array.isArray(selector) || 
        (selector.length !== undefined && typeof selector !== 'string')) {
      return Array.from(selector)
    }
    
    // 单个元素 / Document / Window
    return [selector]
  }
  
  private parseHTML(html: string): Element[] {
    const temp = document.createElement('div')
    temp.innerHTML = html.trim()
    return Array.from(temp.children)
  }
  
  // 遍历
  each(callback: (index: number, element: Element) => boolean | void): this {
    for (let i = 0; i < this.length; i++) {
      if (callback.call(this[i], i, this[i]) === false) break
    }
    return this
  }
  
  // 转数组
  toArray(): Element[] {
    return Array.from({ length: this.length }, (_, i) => this[i])
  }
  
  // 获取原生元素
  get(index?: number): Element | Element[] | undefined {
    if (index === undefined) return this.toArray()
    if (index < 0) index += this.length
    return this[index]
  }
  
  // 获取索引
  index(element?: Element | string): number {
    if (!element) {
      return this.parent().children().toArray().indexOf(this[0])
    }
    
    if (typeof element === 'string') {
      return $(element).toArray().indexOf(this[0])
    }
    
    return this.toArray().indexOf(element)
  }
  
  // 获取数量
  size(): number {
    return this.length
  }
}
```

## 选择器扩展

```typescript
// src/selector.ts
import { Zepto } from './core'

declare module './core' {
  interface Zepto {
    find(selector: string): Zepto
    filter(selector: string | ((index: number, element: Element) => boolean)): Zepto
    not(selector: string | Element | Zepto): Zepto
    eq(index: number): Zepto
    first(): Zepto
    last(): Zepto
    parent(selector?: string): Zepto
    parents(selector?: string): Zepto
    children(selector?: string): Zepto
    siblings(selector?: string): Zepto
    next(selector?: string): Zepto
    prev(selector?: string): Zepto
    closest(selector: string): Zepto
    add(selector: string | Element | Zepto): Zepto
    is(selector: string): boolean
    has(selector: string | Element): Zepto
  }
}

Zepto.prototype.find = function(selector: string): Zepto {
  const result: Element[] = []
  this.each((_, el) => {
    const found = el.querySelectorAll(selector)
    result.push(...Array.from(found))
  })
  return $(result)
}

Zepto.prototype.filter = function(
  selector: string | ((index: number, element: Element) => boolean)
): Zepto {
  const elements = this.toArray()
  const filtered = typeof selector === 'function'
    ? elements.filter((el, i) => selector.call(el, i, el))
    : elements.filter(el => el.matches(selector))
  return $(filtered)
}

// ... 其他选择器方法
```

## DOM 操作扩展

```typescript
// src/dom.ts
import { Zepto } from './core'

declare module './core' {
  interface Zepto {
    // 属性
    attr(name: string): string | undefined
    attr(name: string, value: string | null): this
    attr(attributes: Record<string, string>): this
    removeAttr(name: string): this
    prop(name: string): any
    prop(name: string, value: any): this
    data(key: string): any
    data(key: string, value: any): this
    
    // 类
    addClass(names: string): this
    removeClass(names?: string): this
    toggleClass(names: string, force?: boolean): this
    hasClass(name: string): boolean
    
    // 样式
    css(property: string): string
    css(property: string, value: string | number): this
    css(properties: Record<string, string | number>): this
    
    // 尺寸
    width(): number
    width(value: number | string): this
    height(): number
    height(value: number | string): this
    
    // 内容
    html(): string
    html(content: string): this
    text(): string
    text(content: string): this
    val(): string | string[]
    val(value: string | string[]): this
    
    // 节点操作
    append(content: string | Element | Zepto): this
    prepend(content: string | Element | Zepto): this
    after(content: string | Element | Zepto): this
    before(content: string | Element | Zepto): this
    remove(): this
    empty(): this
    clone(deep?: boolean): Zepto
    wrap(wrapper: string | Element): this
    unwrap(): this
    replaceWith(content: string | Element | Zepto): this
    
    // 显示隐藏
    show(): this
    hide(): this
    toggle(state?: boolean): this
  }
}

// 实现略，参考前面章节
```

## 事件系统扩展

```typescript
// src/events.ts
import { Zepto } from './core'

declare module './core' {
  interface Zepto {
    on(events: string, handler: EventListener): this
    on(events: string, selector: string, handler: EventListener): this
    on(events: string, selector: string, data: any, handler: EventListener): this
    off(events?: string, handler?: EventListener): this
    off(events: string, selector: string, handler?: EventListener): this
    one(events: string, handler: EventListener): this
    trigger(event: string | Event, data?: any): this
    triggerHandler(event: string, data?: any): any
    
    // 快捷方法
    click(handler?: EventListener): this
    focus(handler?: EventListener): this
    blur(handler?: EventListener): this
    submit(handler?: EventListener): this
    
    // 触摸事件
    tap(handler: EventListener): this
    swipe(handler: EventListener): this
    swipeLeft(handler: EventListener): this
    swipeRight(handler: EventListener): this
  }
}

// 实现略
```

## 动画扩展

```typescript
// src/animation.ts
import { Zepto } from './core'

declare module './core' {
  interface Zepto {
    fadeIn(duration?: number, callback?: () => void): this
    fadeOut(duration?: number, callback?: () => void): this
    fadeToggle(duration?: number, callback?: () => void): this
    fadeTo(duration: number, opacity: number, callback?: () => void): this
    
    slideDown(duration?: number, callback?: () => void): this
    slideUp(duration?: number, callback?: () => void): this
    slideToggle(duration?: number, callback?: () => void): this
    
    animate(properties: Record<string, any>, duration?: number, easing?: string, callback?: () => void): this
    animate(properties: Record<string, any>, options?: AnimateOptions): this
    
    stop(clearQueue?: boolean, jumpToEnd?: boolean): this
    delay(duration: number): this
    
    queue(fn: (next: () => void) => void): this
    dequeue(): this
  }
}

// 实现略
```

## AJAX 模块

```typescript
// src/ajax.ts
export interface AjaxSettings {
  url?: string
  type?: string
  data?: any
  dataType?: string
  contentType?: string | false
  headers?: Record<string, string>
  timeout?: number
  async?: boolean
  cache?: boolean
  
  beforeSend?: (xhr: XMLHttpRequest, settings: AjaxSettings) => boolean | void
  success?: (data: any, status: string, xhr: XMLHttpRequest) => void
  error?: (xhr: XMLHttpRequest, status: string, error: Error) => void
  complete?: (xhr: XMLHttpRequest, status: string) => void
}

export function ajax(options: AjaxSettings | string): XMLHttpRequest {
  // 实现略
}

export function get(url: string, data?: any, success?: Function, dataType?: string): XMLHttpRequest
export function post(url: string, data?: any, success?: Function, dataType?: string): XMLHttpRequest
export function getJSON(url: string, data?: any, success?: Function): XMLHttpRequest
```

## 工具函数

```typescript
// src/utils.ts
export function type(value: any): string
export function isArray(value: any): value is any[]
export function isFunction(value: any): value is Function
export function isPlainObject(value: any): value is object
export function isNumeric(value: any): boolean
export function isEmpty(value: any): boolean

export function each<T>(collection: T[] | Record<string, T>, callback: Function): T[] | Record<string, T>
export function map<T, R>(collection: T[], callback: (value: T, index: number) => R): R[]
export function grep<T>(array: T[], callback: (value: T, index: number) => boolean, invert?: boolean): T[]
export function inArray<T>(value: T, array: T[], fromIndex?: number): number
export function merge<T>(first: T[], second: T[]): T[]

export function extend(target: any, ...sources: any[]): any
export function extend(deep: boolean, target: any, ...sources: any[]): any
export function param(obj: any, traditional?: boolean): string
export function parseJSON(str: string): any
export function parseHTML(html: string): Node[]

export function camelCase(str: string): string
export function trim(str: string): string
export function now(): number
export const noop: () => void
```

## 入口文件

```typescript
// src/index.ts
import { Zepto } from './core'
import './selector'
import './dom'
import './events'
import './animation'
import { ajax, get, post, getJSON, getScript } from './ajax'
import * as utils from './utils'

function $(selector: any): Zepto {
  return new Zepto(selector)
}

// 挂载静态方法
Object.assign($, {
  // AJAX
  ajax,
  get,
  post,
  getJSON,
  getScript,
  
  // 工具函数
  ...utils,
  
  // DOM Ready
  ready(fn: () => void): void {
    if (document.readyState !== 'loading') {
      fn()
    } else {
      document.addEventListener('DOMContentLoaded', fn)
    }
  }
})

// 导出
export { $ }
export default $

// 全局变量（浏览器环境）
if (typeof window !== 'undefined') {
  (window as any).$ = $
  (window as any).Zepto = $
}
```

## 使用示例

```html
<!DOCTYPE html>
<html>
<head>
  <title>Mini Zepto Demo</title>
  <script src="mini-zepto.min.js"></script>
</head>
<body>
  <div id="app">
    <button id="btn">Click Me</button>
    <ul id="list">
      <li>Item 1</li>
      <li>Item 2</li>
    </ul>
  </div>
  
  <script>
    $(function() {
      // DOM 操作
      $('#btn').on('click', function() {
        $(this).text('Clicked!')
      })
      
      // 事件委托
      $('#list').on('click', 'li', function() {
        $(this).toggleClass('active')
      })
      
      // 动画
      $('#btn').on('mouseover', function() {
        $(this).animate({ opacity: 0.5 }, 200)
      })
      
      // AJAX
      $.getJSON('/api/data', function(data) {
        console.log(data)
      })
    })
  </script>
</body>
</html>
```

## 构建配置

```json
// package.json
{
  "name": "mini-zepto",
  "version": "1.0.0",
  "main": "dist/index.js",
  "module": "dist/index.esm.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "rollup -c",
    "test": "jest"
  }
}
```

```typescript
// rollup.config.js
import typescript from '@rollup/plugin-typescript'
import { terser } from 'rollup-plugin-terser'

export default {
  input: 'src/index.ts',
  output: [
    { file: 'dist/index.js', format: 'umd', name: '$' },
    { file: 'dist/index.esm.js', format: 'esm' },
    { file: 'dist/mini-zepto.min.js', format: 'umd', name: '$', plugins: [terser()] }
  ],
  plugins: [typescript()]
}
```

## 小结

本章整合了所有模块，形成完整的 Mini Zepto：

- **核心**：选择器引擎、类数组结构
- **DOM**：属性、类、样式、内容、节点操作
- **事件**：绑定、委托、触摸事件
- **动画**：淡入淡出、滑动、通用动画
- **AJAX**：网络请求
- **工具**：类型检测、数组/对象操作

总代码量约 2000 行，覆盖了 DOM 操作库的核心功能。
