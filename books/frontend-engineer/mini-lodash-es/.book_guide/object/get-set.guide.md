# 章节写作指导：路径属性访问

## 1. 章节信息
- **章节标题**: 路径属性访问：get、set、has、unset
- **文件名**: object/get-set.md
- **所属部分**: 第五部分 - 对象方法
- **章节序号**: 30
- **预计阅读时间**: 25分钟
- **难度等级**: 中级

## 2. 学习目标

### 知识目标
- 理解路径属性访问的设计理念
- 掌握 get 的安全取值机制
- 了解 set 的自动创建路径特性

### 技能目标
- 能够使用路径语法安全地访问嵌套属性
- 理解 baseGet 和 baseSet 的实现原理

## 3. 内容要点

### 核心函数

#### get
```javascript
function get(object, path, defaultValue) {
  const result = object == null ? undefined : baseGet(object, path)
  return result === undefined ? defaultValue : result
}

// baseGet - 按路径获取值
function baseGet(object, path) {
  path = castPath(path, object)
  
  let index = 0
  const length = path.length
  
  while (object != null && index < length) {
    object = object[toKey(path[index++])]
  }
  return (index && index === length) ? object : undefined
}
```

#### set
```javascript
function set(object, path, value) {
  return object == null ? object : baseSet(object, path, value)
}

// baseSet - 按路径设置值
function baseSet(object, path, value, customizer) {
  if (!isObject(object)) {
    return object
  }
  path = castPath(path, object)
  
  const length = path.length
  const lastIndex = length - 1
  
  let index = -1
  let nested = object
  
  while (nested != null && ++index < length) {
    const key = toKey(path[index])
    let newValue = value
    
    if (index !== lastIndex) {
      const objValue = nested[key]
      newValue = customizer ? customizer(objValue, key, nested) : undefined
      if (newValue === undefined) {
        newValue = isObject(objValue)
          ? objValue
          : (isIndex(path[index + 1]) ? [] : {})
      }
    }
    assignValue(nested, key, newValue)
    nested = nested[key]
  }
  return object
}
```

#### has / hasIn
```javascript
// has - 检查自身属性路径是否存在
function has(object, path) {
  return object != null && hasPath(object, path, baseHas)
}

// hasIn - 检查路径是否存在（包括继承）
function hasIn(object, path) {
  return object != null && hasPath(object, path, baseHasIn)
}

// hasPath - 路径检查
function hasPath(object, path, hasFunc) {
  path = castPath(path, object)
  
  let index = -1
  let { length } = path
  let result = false
  let key
  
  while (++index < length) {
    key = toKey(path[index])
    if (!(result = object != null && hasFunc(object, key))) {
      break
    }
    object = object[key]
  }
  
  if (result || ++index !== length) {
    return result
  }
  length = object == null ? 0 : object.length
  return !!length && isLength(length) && isIndex(key, length)
}
```

#### unset
```javascript
function unset(object, path) {
  return object == null ? true : baseUnset(object, path)
}

// baseUnset
function baseUnset(object, path) {
  path = castPath(path, object)
  object = parent(object, path)
  return object == null || delete object[toKey(last(path))]
}
```

### 使用示例
```javascript
const obj = { a: { b: { c: 1 } } }

// get - 安全取值
_.get(obj, 'a.b.c')
// => 1

_.get(obj, ['a', 'b', 'c'])
// => 1

_.get(obj, 'a.b.d', 'default')
// => 'default'

// set - 设置值（会创建路径）
_.set(obj, 'a.b.d', 2)
// => { a: { b: { c: 1, d: 2 } } }

_.set({}, 'a[0].b.c', 4)
// => { a: [{ b: { c: 4 } }] }

// has - 检查路径
_.has(obj, 'a.b.c')
// => true

_.has(obj, 'a.b.d')
// => false

// unset - 删除路径
_.unset(obj, 'a.b.c')
// => true (obj 变为 { a: { b: {} } })
```

## 4. 写作要求

### 开篇方式
从 "obj?.a?.b?.c" 这种可选链的需求引入

### 结构组织
```
1. 路径访问概述（300字）
   - 解决的问题
   - 路径语法支持
   
2. get 源码解析（500字）
   - baseGet 实现
   - 路径解析过程
   - 默认值处理
   
3. set 源码解析（600字）
   - baseSet 实现
   - 自动创建路径
   - 数组/对象判断
   
4. has/hasIn 源码解析（400字）
   - hasPath 实现
   - 自身 vs 继承
   
5. unset 源码解析（300字）
   - baseUnset 实现
   - parent 方法
   
6. 小结
```

### 代码示例
- 各方法基本用法
- 复杂路径示例
- 自动创建路径演示

### 图表需求
- 路径解析过程图
- get/set 对比图

## 5. 技术细节

### 源码参考
- `get.js`, `set.js`
- `has.js`, `hasIn.js`
- `unset.js`
- `.internal/baseGet.js`, `.internal/baseSet.js`
- `.internal/castPath.js`

### 实现要点
- 路径支持字符串（'a.b[0].c'）和数组（['a', 'b', 0, 'c']）
- set 自动判断创建数组还是对象（根据下一个键是否为索引）
- has 只检查自身属性，hasIn 包括原型链
- unset 返回 true 表示成功

### 常见问题
- Q: get 和可选链 ?. 有什么区别？
- A: get 支持动态路径，?. 只能静态路径

- Q: set 会修改原对象吗？
- A: 会，返回的是原对象的引用

## 6. 风格指导

### 语气语调
实用导向，强调安全访问

### 类比方向
- 将路径比作"文件路径"
- 将 get 比作"安全地打开文件夹"

## 7. 章节检查清单
- [ ] 目标明确：本章输入/输出是否清晰
- [ ] 术语统一：是否给出标准引用与定义
- [ ] 最小实现：示例是否能运行且递进清晰
- [ ] 边界处理：异常/失败/限制是否覆盖
- [ ] 性能与权衡：优化思路与取舍是否明确
- [ ] 替代方案：对比与适用场景是否给出
- [ ] 图示与代码：是否一一对应
- [ ] 总结与练习：是否提供复盘与实操
