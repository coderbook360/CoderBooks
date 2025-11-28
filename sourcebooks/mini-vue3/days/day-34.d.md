# Day 34: 终极试炼 - 响应式系统集成测试

你好，我是你的技术导师。

我们已经完成了响应式系统的所有核心功能。
单元测试（Unit Test）我们写了不少，但它们通常只测试某个 API 的单一功能。
今天，我们要写一个**集成测试（Integration Test）**。
我们要模拟一个真实的业务场景，把 `reactive`, `ref`, `computed`, `effect` 全部用上，看看它们能不能协同工作。

## 1. 测试场景：Todo List

我们要实现一个简单的 Todo List 逻辑核心：
1.  有一个任务列表 `todos`。
2.  可以添加任务。
3.  可以切换任务状态（完成/未完成）。
4.  有一个计算属性 `remaining` 显示剩余未完成数量。
5.  有一个计算属性 `completed` 显示已完成数量。

## 2. 编写测试代码

创建 `test/reactivity/integration.spec.ts`。

```typescript
import { reactive } from '../../src/reactivity/reactive'
import { ref } from '../../src/reactivity/ref'
import { computed } from '../../src/reactivity/computed'
import { effect } from '../../src/reactivity/effect'

describe('Reactivity System Integration', () => {
  it('should work with a complex Todo List scenario', () => {
    // 1. 定义状态
    const todos = reactive([
      { text: 'Learn Vue', done: false }
    ])
    const filter = ref('all')

    // 2. 定义计算属性
    const remaining = computed(() => {
      return todos.filter(t => !t.done).length
    })

    const completed = computed(() => {
      return todos.filter(t => t.done).length
    })

    const filteredTodos = computed(() => {
      if (filter.value === 'done') {
        return todos.filter(t => t.done)
      } else if (filter.value === 'active') {
        return todos.filter(t => !t.done)
      }
      return todos
    })

    // 3. 验证初始状态
    expect(remaining.value).toBe(1)
    expect(completed.value).toBe(0)
    expect(filteredTodos.value.length).toBe(1)

    // 4. 添加任务
    todos.push({ text: 'Write Code', done: false })
    expect(remaining.value).toBe(2)
    expect(completed.value).toBe(0)

    // 5. 切换状态
    todos[0].done = true
    expect(remaining.value).toBe(1)
    expect(completed.value).toBe(1)

    // 6. 切换筛选
    filter.value = 'active'
    expect(filteredTodos.value.length).toBe(1)
    expect(filteredTodos.value[0].text).toBe('Write Code')

    filter.value = 'done'
    expect(filteredTodos.value.length).toBe(1)
    expect(filteredTodos.value[0].text).toBe('Learn Vue')
    
    // 7. 验证副作用
    let dummy
    effect(() => {
      dummy = remaining.value
    })
    expect(dummy).toBe(1)
    
    todos.pop() // 删除 'Write Code'
    expect(remaining.value).toBe(0)
    expect(dummy).toBe(0) // effect 应该被触发
  })
})
```

## 3. 运行测试

运行 `npm test` (或者 `vitest`)。
如果这个测试通过了，说明你的响应式系统已经非常健壮了。
它证明了：
-   `reactive` 能正确代理数组。
-   `computed` 能正确依赖 `reactive` 和 `ref`。
-   `computed` 依赖 `computed` 也能正常工作（链式计算）。
-   `effect` 能正确响应 `computed` 的变化。

## 4. 总结

集成测试是检验系统的试金石。
很多时候，单元测试都过了，但集成在一起就崩了。
通过这个测试，我们可以放心地宣布：**Mini-Vue3 的响应式引擎已经准备就绪！**

明天，我们将进行最后一周的总结，并对代码进行一次 Code Review。
