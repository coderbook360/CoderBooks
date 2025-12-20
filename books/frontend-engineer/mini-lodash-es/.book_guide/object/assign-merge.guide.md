# 章节写作指导：对象合并

## 1. 章节信息
- **章节标题**: 对象合并：assign、merge、defaults
- **文件名**: object/assign-merge.md
- **所属部分**: 第五部分 - 对象方法
- **章节序号**: 32
- **预计阅读时间**: 25分钟
- **难度等级**: 中级

## 2. 学习目标

### 知识目标
- 理解 assign、merge、defaults 的区别
- 掌握浅合并与深合并的差异
- 了解合并策略和覆盖规则

### 技能目标
- 能够根据场景选择合适的合并方法
- 理解 assignIn 和 mergeWith 的扩展用法

## 3. 内容要点

### 核心函数

#### assign / assignIn
```javascript
// assign - 浅拷贝自身可枚举属性
function assign(object, ...sources) {
  return Object.assign(object, ...sources)
}

// assignIn - 包括继承属性
function assignIn(object, ...sources) {
  return copyObject(object, getAllKeysIn(sources), sources)
}

// 更底层的实现（早期版本）
function baseAssign(object, source) {
  return object && copyObject(source, keys(source), object)
}
```

#### merge
```javascript
// merge - 深合并
function merge(object, ...sources) {
  return baseMerge(object, sources)
}

// baseMerge - 核心实现
function baseMerge(object, source, srcIndex, customizer, stack) {
  if (object === source) {
    return
  }
  baseFor(source, (srcValue, key) => {
    if (isObject(srcValue)) {
      stack || (stack = new Stack())
      baseMergeDeep(object, source, key, srcIndex, baseMerge, customizer, stack)
    } else {
      let newValue = customizer
        ? customizer(object[key], srcValue, key, object, source, stack)
        : undefined
      if (newValue === undefined) {
        newValue = srcValue
      }
      assignMergeValue(object, key, newValue)
    }
  }, keysIn)
}

// baseMergeDeep - 深度合并逻辑
function baseMergeDeep(object, source, key, srcIndex, mergeFunc, customizer, stack) {
  const objValue = object[key]
  const srcValue = source[key]
  
  // 检测循环引用
  const stacked = stack.get(srcValue)
  if (stacked) {
    assignMergeValue(object, key, stacked)
    return
  }
  
  // 处理数组
  if (isArray(srcValue)) {
    if (isArray(objValue)) {
      // 递归合并数组元素
    }
  }
  
  // 处理对象
  if (isPlainObject(srcValue) || isArguments(srcValue)) {
    if (isPlainObject(objValue)) {
      mergeFunc(objValue, srcValue, srcIndex, customizer, stack)
    } else {
      assignMergeValue(object, key, baseMerge(srcValue))
    }
  }
}
```

#### defaults / defaultsDeep
```javascript
// defaults - 填充未定义属性（浅）
function defaults(object, ...sources) {
  object = Object(object)
  sources.forEach(source => {
    if (source != null) {
      source = Object(source)
      for (const key in source) {
        const value = object[key]
        if (value === undefined || 
            (eq(value, objectProto[key]) && !hasOwnProperty.call(object, key))) {
          object[key] = source[key]
        }
      }
    }
  })
  return object
}

// defaultsDeep - 填充未定义属性（深）
function defaultsDeep(...args) {
  return baseMerge(args[0], args.slice(1), undefined, (objValue, srcValue) => {
    if (objValue === undefined) {
      return srcValue
    }
    if (isObject(objValue) && isObject(srcValue)) {
      return undefined // 继续深度合并
    }
    return objValue // 保留已有值
  })
}
```

### 使用示例
```javascript
// assign - 浅合并，后面覆盖前面
const obj1 = { a: 1, b: { x: 1 } }
const obj2 = { b: { y: 2 }, c: 3 }
_.assign({}, obj1, obj2)
// => { a: 1, b: { y: 2 }, c: 3 }  // b 被完全覆盖

// merge - 深合并
_.merge({}, obj1, obj2)
// => { a: 1, b: { x: 1, y: 2 }, c: 3 }  // b 被深度合并

// defaults - 只填充 undefined
_.defaults({ a: 1 }, { a: 2, b: 3 })
// => { a: 1, b: 3 }  // a 保持原值

// defaultsDeep - 深度填充
const target = { a: { x: 1 } }
const source = { a: { x: 2, y: 3 } }
_.defaultsDeep(target, source)
// => { a: { x: 1, y: 3 } }
```

### 方法对比
| 特性 | assign | merge | defaults |
|------|--------|-------|----------|
| 深度 | 浅 | 深 | 浅 |
| 覆盖规则 | 后覆盖前 | 深度合并 | 只填充 undefined |
| 数组处理 | 覆盖 | 按索引合并 | 覆盖 |
| 修改原对象 | 是 | 是 | 是 |

## 4. 写作要求

### 开篇方式
从"如何合并多个对象"这个常见需求引入

### 结构组织
```
1. 对象合并概述（400字）
   - 三种方法的核心区别
   - 使用场景
   
2. assign 源码解析（400字）
   - 与 Object.assign 的关系
   - assignIn 的差异
   
3. merge 源码解析（600字）
   - baseMerge 实现
   - baseMergeDeep 实现
   - 循环引用处理
   
4. defaults 源码解析（400字）
   - 填充策略
   - defaultsDeep 实现
   
5. 选型指南（300字）

6. 小结
```

### 代码示例
- 三种方法的对比
- 深浅合并的差异
- 数组处理的差异

### 图表需求
- 三种合并方法对比表
- 深合并过程示意图

## 5. 技术细节

### 源码参考
- `assign.js`, `assignIn.js`
- `merge.js`, `mergeWith.js`
- `defaults.js`, `defaultsDeep.js`
- `.internal/baseMerge.js`
- `.internal/baseMergeDeep.js`

### 实现要点
- assign 现在直接使用 Object.assign
- merge 使用 Stack 检测循环引用
- merge 对数组按索引递归合并
- defaults 只覆盖 undefined，不覆盖 null

### 常见问题
- Q: merge 如何处理数组？
- A: 按索引递归合并，不是追加

- Q: defaults 会覆盖 null 吗？
- A: 不会，只覆盖 undefined

## 6. 风格指导

### 语气语调
对比分析，强调选型

### 类比方向
- 将 assign 比作"覆盖粘贴"
- 将 merge 比作"融合"
- 将 defaults 比作"补缺"

## 7. 章节检查清单
- [ ] 目标明确：本章输入/输出是否清晰
- [ ] 术语统一：是否给出标准引用与定义
- [ ] 最小实现：示例是否能运行且递进清晰
- [ ] 边界处理：异常/失败/限制是否覆盖
- [ ] 性能与权衡：优化思路与取舍是否明确
- [ ] 替代方案：对比与适用场景是否给出
- [ ] 图示与代码：是否一一对应
- [ ] 总结与练习：是否提供复盘与实操
