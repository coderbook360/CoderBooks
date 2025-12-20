# 章节写作指导：实现迷你 Lodash

## 1. 章节信息
- **章节标题**: 动手实现：迷你 Lodash 核心
- **文件名**: practice/mini-lodash.md
- **所属部分**: 第十一部分 - 实战与进阶
- **章节序号**: 61
- **预计阅读时间**: 30分钟
- **难度等级**: 高级

## 2. 学习目标

### 知识目标
- 理解如何从零构建工具库
- 掌握核心方法的简化实现
- 了解模块化组织的最佳实践

### 技能目标
- 能够独立实现常用工具方法
- 能够编写规范的测试用例

## 3. 内容要点

### 核心实现

#### 项目初始化
```bash
# 创建项目
mkdir mini-lodash
cd mini-lodash
npm init -y

# 配置 package.json
{
  "name": "mini-lodash",
  "version": "1.0.0",
  "type": "module",
  "main": "src/index.js",
  "exports": {
    ".": "./src/index.js",
    "./*": "./src/*"
  }
}
```

#### 内部工具实现
```javascript
// src/_internal/getTag.js
export function getTag(value) {
  return Object.prototype.toString.call(value)
}

// src/_internal/baseIteratee.js
import { isFunction } from '../lang/isFunction.js'
import { property } from '../util/property.js'
import { matches } from '../util/matches.js'
import { matchesProperty } from '../util/matchesProperty.js'

export function baseIteratee(value) {
  if (value == null) {
    return identity
  }
  if (isFunction(value)) {
    return value
  }
  if (typeof value === 'string') {
    return property(value)
  }
  if (Array.isArray(value)) {
    return matchesProperty(value[0], value[1])
  }
  if (typeof value === 'object') {
    return matches(value)
  }
  return identity
}

function identity(value) {
  return value
}
```

#### 类型检测实现
```javascript
// src/lang/isArray.js
export const isArray = Array.isArray

// src/lang/isObject.js
export function isObject(value) {
  const type = typeof value
  return value != null && (type === 'object' || type === 'function')
}

// src/lang/isFunction.js
export function isFunction(value) {
  return typeof value === 'function'
}

// src/lang/isNil.js
export function isNil(value) {
  return value == null
}
```

#### 数组方法实现
```javascript
// src/array/chunk.js
export function chunk(array, size = 1) {
  if (!Array.isArray(array) || size < 1) {
    return []
  }
  
  const length = array.length
  const result = []
  let index = 0
  
  while (index < length) {
    result.push(array.slice(index, index + size))
    index += size
  }
  
  return result
}

// src/array/flatten.js
export function flatten(array) {
  return Array.isArray(array) ? array.flat(1) : []
}

export function flattenDeep(array) {
  return Array.isArray(array) ? array.flat(Infinity) : []
}

// src/array/uniq.js
export function uniq(array) {
  return Array.isArray(array) ? [...new Set(array)] : []
}
```

#### 集合方法实现
```javascript
// src/collection/map.js
import { baseIteratee } from '../_internal/baseIteratee.js'

export function map(collection, iteratee) {
  const func = baseIteratee(iteratee)
  
  if (Array.isArray(collection)) {
    return collection.map(func)
  }
  
  if (collection && typeof collection === 'object') {
    return Object.keys(collection).map(key => func(collection[key], key, collection))
  }
  
  return []
}

// src/collection/filter.js
import { baseIteratee } from '../_internal/baseIteratee.js'

export function filter(collection, predicate) {
  const func = baseIteratee(predicate)
  
  if (Array.isArray(collection)) {
    return collection.filter(func)
  }
  
  if (collection && typeof collection === 'object') {
    return Object.keys(collection)
      .filter(key => func(collection[key], key, collection))
      .map(key => collection[key])
  }
  
  return []
}
```

#### 对象方法实现
```javascript
// src/object/get.js
export function get(object, path, defaultValue) {
  if (object == null) {
    return defaultValue
  }
  
  const keys = Array.isArray(path) ? path : parsePath(path)
  let result = object
  
  for (const key of keys) {
    if (result == null) {
      return defaultValue
    }
    result = result[key]
  }
  
  return result === undefined ? defaultValue : result
}

function parsePath(path) {
  return path.replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean)
}

// src/object/set.js
export function set(object, path, value) {
  if (object == null) {
    return object
  }
  
  const keys = Array.isArray(path) ? path : parsePath(path)
  let current = object
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]
    if (current[key] == null) {
      current[key] = isNaN(Number(keys[i + 1])) ? {} : []
    }
    current = current[key]
  }
  
  current[keys[keys.length - 1]] = value
  return object
}
```

#### 函数方法实现
```javascript
// src/function/debounce.js
export function debounce(func, wait, options = {}) {
  let timerId
  let lastArgs
  let lastThis
  
  const leading = !!options.leading
  const trailing = options.trailing !== false
  
  function invokeFunc() {
    const args = lastArgs
    const thisArg = lastThis
    lastArgs = lastThis = undefined
    func.apply(thisArg, args)
  }
  
  function debounced(...args) {
    lastArgs = args
    lastThis = this
    
    if (leading && !timerId) {
      invokeFunc()
    }
    
    clearTimeout(timerId)
    timerId = setTimeout(() => {
      if (trailing) {
        invokeFunc()
      }
      timerId = undefined
    }, wait)
  }
  
  debounced.cancel = function() {
    clearTimeout(timerId)
    timerId = undefined
  }
  
  return debounced
}

// src/function/throttle.js
export function throttle(func, wait, options = {}) {
  return debounce(func, wait, {
    leading: options.leading !== false,
    trailing: options.trailing !== false,
    maxWait: wait
  })
}
```

#### 入口文件
```javascript
// src/index.js
// Lang
export { isArray } from './lang/isArray.js'
export { isObject } from './lang/isObject.js'
export { isFunction } from './lang/isFunction.js'
export { isNil } from './lang/isNil.js'

// Array
export { chunk } from './array/chunk.js'
export { flatten, flattenDeep } from './array/flatten.js'
export { uniq } from './array/uniq.js'

// Collection
export { map } from './collection/map.js'
export { filter } from './collection/filter.js'
export { reduce } from './collection/reduce.js'

// Object
export { get } from './object/get.js'
export { set } from './object/set.js'
export { pick } from './object/pick.js'
export { omit } from './object/omit.js'

// Function
export { debounce } from './function/debounce.js'
export { throttle } from './function/throttle.js'
export { memoize } from './function/memoize.js'

// Util
export { identity } from './util/identity.js'
export { times } from './util/times.js'
export { range } from './util/range.js'
```

## 4. 写作要求

### 开篇方式
从"动手是最好的学习"引入

### 结构组织
```
1. 项目初始化（300字）
   - 目录结构
   - package.json 配置
   
2. 内部工具实现（500字）
   - getTag
   - baseIteratee
   
3. 类型检测实现（400字）
   - isArray, isObject 等
   
4. 数组方法实现（500字）
   - chunk, flatten, uniq
   
5. 集合方法实现（500字）
   - map, filter, reduce
   
6. 对象方法实现（400字）
   - get, set
   
7. 函数方法实现（500字）
   - debounce, throttle
   
8. 小结
```

### 代码示例
- 完整可运行的实现代码
- 每个方法的测试用例

### 图表需求
- 模块依赖关系图

## 5. 技术细节

### 源码参考
- 对应 Lodash 源码

### 实现要点
- 简化实现，突出核心逻辑
- 保持 API 兼容性
- 处理边界情况
- 提供清晰的代码注释

### 常见问题
- Q: 简化版和完整版有什么区别？
- A: 简化版省略了部分边界处理和性能优化

- Q: 如何测试实现是否正确？
- A: 使用 Lodash 官方测试用例作为参考

## 6. 风格指导

### 语气语调
实战指导，步骤清晰

### 类比方向
- 将实现过程比作"搭积木"
- 将测试比作"质量检验"

## 7. 章节检查清单
- [ ] 目标明确：本章输入/输出是否清晰
- [ ] 术语统一：是否给出标准引用与定义
- [ ] 最小实现：示例是否能运行且递进清晰
- [ ] 边界处理：异常/失败/限制是否覆盖
- [ ] 性能与权衡：优化思路与取舍是否明确
- [ ] 替代方案：对比与适用场景是否给出
- [ ] 图示与代码：是否一一对应
- [ ] 总结与练习：是否提供复盘与实操
