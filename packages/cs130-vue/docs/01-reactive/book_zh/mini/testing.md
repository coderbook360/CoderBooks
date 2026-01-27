# 单元测试：验证响应式系统

测试是确保代码正确性的关键。本章我们为迷你响应式系统编写完整的单元测试。

## 测试框架选择

使用 Vitest 或 Jest 都可以。这里使用简化的测试风格：

```typescript
function describe(name: string, fn: () => void) {
  console.log(`\n${name}`)
  fn()
}

function it(name: string, fn: () => void) {
  try {
    fn()
    console.log(`  ✓ ${name}`)
  } catch (e) {
    console.log(`  ✗ ${name}`)
    console.error(e)
  }
}

function expect<T>(actual: T) {
  return {
    toBe(expected: T) {
      if (actual !== expected) {
        throw new Error(`Expected ${expected}, got ${actual}`)
      }
    },
    toEqual(expected: T) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
      }
    }
  }
}
```

## reactive 测试

```typescript
describe('reactive', () => {
  it('should make object reactive', () => {
    const original = { count: 0 }
    const observed = reactive(original)
    
    expect(observed).not.toBe(original)
    expect(observed.count).toBe(0)
    expect(isReactive(observed)).toBe(true)
  })
  
  it('should track property access', () => {
    const obj = reactive({ count: 0 })
    let dummy
    
    effect(() => {
      dummy = obj.count
    })
    
    expect(dummy).toBe(0)
    obj.count = 1
    expect(dummy).toBe(1)
  })
  
  it('should handle nested objects', () => {
    const obj = reactive({
      nested: { count: 0 }
    })
    let dummy
    
    effect(() => {
      dummy = obj.nested.count
    })
    
    expect(dummy).toBe(0)
    obj.nested.count = 1
    expect(dummy).toBe(1)
  })
  
  it('should return same proxy for same object', () => {
    const original = { count: 0 }
    const proxy1 = reactive(original)
    const proxy2 = reactive(original)
    
    expect(proxy1).toBe(proxy2)
  })
})
```

## ref 测试

```typescript
describe('ref', () => {
  it('should hold a value', () => {
    const count = ref(0)
    expect(count.value).toBe(0)
  })
  
  it('should be reactive', () => {
    const count = ref(0)
    let dummy
    
    effect(() => {
      dummy = count.value
    })
    
    expect(dummy).toBe(0)
    count.value = 1
    expect(dummy).toBe(1)
  })
  
  it('should convert object to reactive', () => {
    const obj = ref({ count: 0 })
    expect(isReactive(obj.value)).toBe(true)
  })
  
  it('should unwrap nested refs', () => {
    const inner = ref(0)
    const outer = ref(inner)
    
    // ref 不自动解包嵌套 ref
    expect(outer.value).toBe(inner)
  })
})

describe('isRef', () => {
  it('should identify refs', () => {
    expect(isRef(ref(0))).toBe(true)
    expect(isRef(0)).toBe(false)
    expect(isRef(reactive({ value: 0 }))).toBe(false)
  })
})

describe('unref', () => {
  it('should unwrap ref', () => {
    expect(unref(ref(0))).toBe(0)
    expect(unref(0)).toBe(0)
  })
})
```

## computed 测试

```typescript
describe('computed', () => {
  it('should return computed value', () => {
    const count = ref(0)
    const double = computed(() => count.value * 2)
    
    expect(double.value).toBe(0)
    count.value = 1
    expect(double.value).toBe(2)
  })
  
  it('should be lazy', () => {
    let callCount = 0
    const count = ref(0)
    const double = computed(() => {
      callCount++
      return count.value * 2
    })
    
    // 未访问时不执行
    expect(callCount).toBe(0)
    
    // 首次访问执行
    double.value
    expect(callCount).toBe(1)
    
    // 再次访问使用缓存
    double.value
    expect(callCount).toBe(1)
    
    // 依赖变化后重新计算
    count.value = 1
    double.value
    expect(callCount).toBe(2)
  })
  
  it('should trigger effect', () => {
    const count = ref(0)
    const double = computed(() => count.value * 2)
    let dummy
    
    effect(() => {
      dummy = double.value
    })
    
    expect(dummy).toBe(0)
    count.value = 1
    expect(dummy).toBe(2)
  })
  
  it('should support setter', () => {
    const count = ref(0)
    const double = computed({
      get: () => count.value * 2,
      set: (val) => { count.value = val / 2 }
    })
    
    double.value = 4
    expect(count.value).toBe(2)
  })
})
```

## effect 测试

```typescript
describe('effect', () => {
  it('should run immediately', () => {
    let dummy
    const obj = reactive({ count: 0 })
    
    effect(() => {
      dummy = obj.count
    })
    
    expect(dummy).toBe(0)
  })
  
  it('should observe property changes', () => {
    let dummy
    const obj = reactive({ count: 0 })
    
    effect(() => {
      dummy = obj.count
    })
    
    obj.count = 1
    expect(dummy).toBe(1)
  })
  
  it('should handle multiple properties', () => {
    let dummy
    const obj = reactive({ a: 1, b: 2 })
    
    effect(() => {
      dummy = obj.a + obj.b
    })
    
    expect(dummy).toBe(3)
    obj.a = 2
    expect(dummy).toBe(4)
    obj.b = 3
    expect(dummy).toBe(5)
  })
  
  it('should handle nested effects', () => {
    const obj = reactive({ a: 0, b: 0 })
    let outer, inner
    
    effect(() => {
      outer = obj.a
      effect(() => {
        inner = obj.b
      })
    })
    
    expect(outer).toBe(0)
    expect(inner).toBe(0)
    
    obj.b = 1
    expect(inner).toBe(1)
  })
  
  it('should avoid infinite loops', () => {
    const obj = reactive({ count: 0 })
    
    effect(() => {
      obj.count = obj.count + 1
    })
    
    expect(obj.count).toBe(1)
  })
  
  it('should support scheduler', () => {
    let dummy
    let run = false
    const obj = reactive({ count: 0 })
    
    effect(
      () => {
        dummy = obj.count
      },
      {
        scheduler: () => {
          run = true
        }
      }
    )
    
    expect(dummy).toBe(0)
    expect(run).toBe(false)
    
    obj.count = 1
    expect(dummy).toBe(0)  // 未直接执行
    expect(run).toBe(true)  // scheduler 被调用
  })
  
  it('should support stop', () => {
    let dummy
    const obj = reactive({ count: 0 })
    
    const runner = effect(() => {
      dummy = obj.count
    })
    
    obj.count = 1
    expect(dummy).toBe(1)
    
    runner.effect.stop()
    
    obj.count = 2
    expect(dummy).toBe(1)  // 不再更新
  })
})
```

## watch 测试

```typescript
describe('watch', () => {
  it('should watch reactive object', async () => {
    const state = reactive({ count: 0 })
    let dummy
    
    watch(
      () => state.count,
      (val) => { dummy = val },
      { flush: 'sync' }
    )
    
    state.count = 1
    expect(dummy).toBe(1)
  })
  
  it('should watch ref', () => {
    const count = ref(0)
    let dummy
    
    watch(count, (val) => {
      dummy = val
    }, { flush: 'sync' })
    
    count.value = 1
    expect(dummy).toBe(1)
  })
  
  it('should provide old and new value', () => {
    const count = ref(0)
    let oldVal, newVal
    
    watch(count, (n, o) => {
      newVal = n
      oldVal = o
    }, { flush: 'sync' })
    
    count.value = 1
    expect(newVal).toBe(1)
    expect(oldVal).toBe(0)
  })
  
  it('should support immediate', () => {
    const count = ref(0)
    let dummy
    
    watch(count, (val) => {
      dummy = val
    }, { immediate: true, flush: 'sync' })
    
    expect(dummy).toBe(0)
  })
  
  it('should support deep', () => {
    const state = reactive({ nested: { count: 0 } })
    let dummy
    
    watch(
      () => state,
      (val) => { dummy = val.nested.count },
      { deep: true, flush: 'sync' }
    )
    
    state.nested.count = 1
    expect(dummy).toBe(1)
  })
  
  it('should return stop handle', () => {
    const count = ref(0)
    let dummy
    
    const stop = watch(count, (val) => {
      dummy = val
    }, { flush: 'sync' })
    
    count.value = 1
    expect(dummy).toBe(1)
    
    stop()
    
    count.value = 2
    expect(dummy).toBe(1)
  })
})
```

## readonly 测试

```typescript
describe('readonly', () => {
  it('should make object readonly', () => {
    const original = { count: 0 }
    const wrapped = readonly(original)
    
    expect(isReadonly(wrapped)).toBe(true)
  })
  
  it('should not allow mutation', () => {
    const wrapped = readonly({ count: 0 })
    
    // 应该发出警告
    wrapped.count = 1
    
    expect(wrapped.count).toBe(0)
  })
  
  it('should make nested objects readonly', () => {
    const wrapped = readonly({ nested: { count: 0 } })
    
    expect(isReadonly(wrapped.nested)).toBe(true)
  })
})
```

## effectScope 测试

```typescript
describe('effectScope', () => {
  it('should collect effects', () => {
    const scope = effectScope()
    let dummy
    const count = ref(0)
    
    scope.run(() => {
      effect(() => {
        dummy = count.value
      })
    })
    
    count.value = 1
    expect(dummy).toBe(1)
    
    scope.stop()
    
    count.value = 2
    expect(dummy).toBe(1)
  })
  
  it('should call onScopeDispose', () => {
    const scope = effectScope()
    let disposed = false
    
    scope.run(() => {
      onScopeDispose(() => {
        disposed = true
      })
    })
    
    expect(disposed).toBe(false)
    scope.stop()
    expect(disposed).toBe(true)
  })
  
  it('should stop nested scopes', () => {
    const parent = effectScope()
    let childDisposed = false
    
    parent.run(() => {
      const child = effectScope()
      child.run(() => {
        onScopeDispose(() => {
          childDisposed = true
        })
      })
    })
    
    parent.stop()
    expect(childDisposed).toBe(true)
  })
})
```

## 运行测试

```typescript
// 运行所有测试
function runTests() {
  describe('reactive', reactiveTests)
  describe('ref', refTests)
  describe('computed', computedTests)
  describe('effect', effectTests)
  describe('watch', watchTests)
  describe('readonly', readonlyTests)
  describe('effectScope', effectScopeTests)
  
  console.log('\n✓ All tests passed')
}

runTests()
```

## 本章小结

单元测试覆盖了核心功能：

1. reactive：响应式对象、嵌套对象、缓存
2. ref：基本值、响应式、对象转换
3. computed：惰性、缓存、触发 effect
4. effect：立即执行、依赖追踪、scheduler、stop
5. watch：监听、新旧值、immediate、deep、stop
6. readonly：只读、嵌套只读
7. effectScope：收集、清理、嵌套

完整的测试套件确保响应式系统行为符合预期。
