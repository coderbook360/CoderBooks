# key 的作用与 Diff 性能优化

前几章我们深入分析了各种 Diff 算法。贯穿其中的一个核心概念就是 **key**——节点的身份标识。

**这一章非常实用！** 很多线上 bug 都是因为错误使用 key 导致的。本章将专门讨论 key 的作用、正确用法，以及错误使用导致的问题。

## key 的核心作用

首先要问一个问题：Diff 算法如何判断两个节点是"同一个"？

答案是通过 **type + key** 的组合：

```javascript
function isSameVNodeType(n1, n2) {
  return n1.type === n2.type && n1.key === n2.key
}
```

- **type 相同**：节点类型一致（都是 `div`、都是同一个组件）
- **key 相同**：身份标识一致

只有两者都相同，节点才被认为"可复用"——可以更新内容，而不是销毁重建。

```javascript
// 示例
const old = { type: 'li', key: 'item-1', props: { class: 'active' } }
const next = { type: 'li', key: 'item-1', props: { class: 'inactive' } }

isSameVNodeType(old, next)  // true
// → 复用节点，只更新 class

const old2 = { type: 'li', key: 'item-1' }
const next2 = { type: 'li', key: 'item-2' }

isSameVNodeType(old2, next2)  // false
// → 不能复用，销毁 old2，创建 next2
```

## 使用 index 作为 key 的陷阱

很多开发者习惯使用数组索引作为 key：

```vue
<template>
  <!-- ❌ 不推荐：使用 index 作为 key -->
  <li v-for="(item, index) in list" :key="index">
    <input type="checkbox" />
    {{ item.name }}
  </li>
</template>
```

这看起来简单方便，但会导致严重问题。让我们分析一个具体场景：

```javascript
// 初始列表
const list = [
  { id: 1, name: 'Apple' },
  { id: 2, name: 'Banana' },
  { id: 3, name: 'Cherry' }
]

// 用户勾选了 Apple 的 checkbox

// 现在删除第一个元素
list.shift()
// list = [{ id: 2, name: 'Banana' }, { id: 3, name: 'Cherry' }]
```

使用 index 作为 key 时，Diff 算法会这样处理：

```
删除前:
  index=0, key=0 → Apple  [checked]
  index=1, key=1 → Banana
  index=2, key=2 → Cherry

删除后（list 变化）:
  index=0, key=0 → Banana
  index=1, key=1 → Cherry

Diff 比较:
  key=0: 存在于新旧列表，"同一节点"
         patch(Apple, Banana) → 更新文本，但 checkbox 状态保留！
  key=1: 存在于新旧列表，"同一节点"
         patch(Banana, Cherry) → 更新文本
  key=2: 只存在于旧列表，删除

结果：
  Banana 显示为 [checked]，但用户明明没勾选它！
```

问题的根源：**index 不是稳定的身份标识**。当列表变化时，index 会变化，导致 Diff 算法错误地复用节点。

## 正确使用 key

正确的做法是使用**稳定的唯一标识**作为 key：

```vue
<template>
  <!-- ✓ 正确：使用稳定的唯一 ID -->
  <li v-for="item in list" :key="item.id">
    <input type="checkbox" />
    {{ item.name }}
  </li>
</template>
```

现在再看删除场景：

```
删除前:
  key=1 → Apple  [checked]
  key=2 → Banana
  key=3 → Cherry

删除后:
  key=2 → Banana
  key=3 → Cherry

Diff 比较:
  key=1: 只存在于旧列表，删除 Apple（连同其 checkbox 状态）
  key=2: 存在于新旧列表，复用 Banana（状态正确）
  key=3: 存在于新旧列表，复用 Cherry（状态正确）

结果：正确！
```

## key 对性能的影响

除了正确性，key 的使用方式还直接影响性能。让我们分析两个场景：

**场景一：列表首部插入**

```javascript
// 旧列表: [B, C, D]
// 新列表: [A, B, C, D]
```

使用稳定 id 作为 key：

```
Diff 识别:
  key=A: 新增
  key=B: 复用，不移动
  key=C: 复用，不移动
  key=D: 复用，不移动

操作: 1 次插入
```

使用 index 作为 key：

```
删除前:
  index=0 → B
  index=1 → C
  index=2 → D

插入后:
  index=0 → A
  index=1 → B
  index=2 → C
  index=3 → D

Diff 比较:
  key=0: patch(B, A) → 更新内容
  key=1: patch(C, B) → 更新内容
  key=2: patch(D, C) → 更新内容
  key=3: 新增 D

操作: 3 次更新 + 1 次新增
```

使用稳定 key 只需 1 次操作，index key 需要 4 次！

**场景二：列表逆序**

```javascript
// 旧列表: [A, B, C]
// 新列表: [C, B, A]
```

使用稳定 key：

```
Diff 识别节点身份，执行移动操作:
  C 移动到前面
  A 移动到后面
  B 不动

操作: 2 次移动
```

使用 index key：

```
Diff 认为"相同索引"是"同一节点":
  index=0: patch(A, C) → 更新 A 的内容为 C
  index=1: patch(B, B) → 不变
  index=2: patch(C, A) → 更新 C 的内容为 A

操作: 2 次更新（但内容全部重新渲染！）
```

看起来操作次数相近，但实际上 index key 导致了**不必要的内容更新**，如果节点包含复杂组件或表单状态，这些都会丢失。

## 无 key 场景的处理

如果完全不提供 key 会怎样？

```vue
<template>
  <!-- 无 key -->
  <li v-for="item in list">{{ item.name }}</li>
</template>
```

Vue 会使用一种简化的策略——**就地更新**（in-place patch）：

```javascript
// 无 key 时的 Diff 策略
function patchUnkeyedChildren(c1, c2, container) {
  const commonLength = Math.min(c1.length, c2.length)
  
  // 按索引依次更新
  for (let i = 0; i < commonLength; i++) {
    patch(c1[i], c2[i], container)
  }
  
  // 处理长度差异
  if (c2.length > c1.length) {
    // 新增
    for (let i = commonLength; i < c2.length; i++) {
      mount(c2[i], container)
    }
  } else {
    // 删除
    for (let i = commonLength; i < c1.length; i++) {
      unmount(c1[i])
    }
  }
}
```

这种策略：
- 不进行复用判断，直接按位置更新
- 不进行移动操作，只有新增/删除/更新
- 简单高效，但可能导致不必要的更新

**什么场景适合无 key？**

- 列表项只包含纯文本，没有状态
- 列表顺序不会改变，只有追加/截断
- 列表项没有 key 属性可用

## key 的最佳实践

总结一下使用 key 的最佳实践：

**1. 使用稳定的唯一标识**

```vue
<!-- ✓ 数据库 ID -->
<li v-for="user in users" :key="user.id">

<!-- ✓ UUID -->
<li v-for="item in items" :key="item.uuid">
```

**2. 避免使用 index**

```vue
<!-- ❌ 只在特定场景下使用 -->
<li v-for="(item, index) in list" :key="index">
```

index 只在以下场景可接受：
- 列表是静态的，不会排序、过滤、增删
- 列表项没有状态（无表单、无组件实例）

**3. 组合字段确保唯一性**

```vue
<!-- 当没有唯一 ID 时 -->
<div v-for="(row, rowIndex) in matrix" :key="`row-${rowIndex}`">
  <span v-for="cell in row" :key="`${rowIndex}-${cell.col}`">
    {{ cell.value }}
  </span>
</div>
```

**4. key 必须在兄弟节点中唯一**

```vue
<!-- key 只需要在同一 v-for 中唯一，不同列表可以重复 -->
<ul>
  <li v-for="item in listA" :key="item.id">...</li>
</ul>
<ul>
  <li v-for="item in listB" :key="item.id">...</li>
</ul>
```

## 强制重新渲染的技巧

有时候我们希望**强制销毁并重建**组件，而不是复用。可以利用 key 的变化：

```vue
<template>
  <!-- 当 userId 变化时，整个组件重新创建 -->
  <UserProfile :key="userId" :user-id="userId" />
</template>
```

这在以下场景很有用：
- 切换用户时重置所有组件状态
- 强制重新执行 `onMounted` 等生命周期钩子
- 清除表单组件的内部状态

## 本章小结

本章深入分析了 key 在 Diff 算法中的作用：

- **核心作用**：通过 type + key 判断节点是否可复用
- **index 陷阱**：索引不稳定，导致错误复用和状态混乱
- **正确用法**：使用稳定的唯一标识（ID、UUID）
- **性能影响**：正确的 key 能大幅减少 DOM 操作
- **无 key 策略**：就地更新，适用于纯静态列表
- **强制重建**：通过改变 key 强制销毁重建组件

记住：**key 是节点的身份证**。正确使用 key，不仅确保正确性，还能显著提升性能。

下一章，我们将进入 Vue 3 源码，看看真实的 Diff 实现细节。
