# getSequence LIS 实现

`getSequence` 计算最长递增子序列（LIS），用于优化节点移动。

## 函数签名

```typescript
function getSequence(arr: number[]): number[]
```

输入是 `newIndexToOldIndexMap`，输出是 LIS 元素的索引数组。

## 实现

```typescript
function getSequence(arr: number[]): number[] {
  const p = arr.slice()  // 前驱数组
  const result = [0]     // 结果数组（存储索引）
  let i, j, u, v, c
  const len = arr.length
  
  for (i = 0; i < len; i++) {
    const arrI = arr[i]
    // 跳过 0（0 表示新增节点）
    if (arrI !== 0) {
      j = result[result.length - 1]
      // 当前值大于结果末尾，直接追加
      if (arr[j] < arrI) {
        p[i] = j
        result.push(i)
        continue
      }
      // 二分查找插入位置
      u = 0
      v = result.length - 1
      while (u < v) {
        c = (u + v) >> 1
        if (arr[result[c]] < arrI) {
          u = c + 1
        } else {
          v = c
        }
      }
      // 替换
      if (arrI < arr[result[u]]) {
        if (u > 0) {
          p[i] = result[u - 1]
        }
        result[u] = i
      }
    }
  }
  
  // 回溯构建最终序列
  u = result.length
  v = result[u - 1]
  while (u-- > 0) {
    result[u] = v
    v = p[v]
  }
  
  return result
}
```

## 算法解析

### 核心思想

使用贪心 + 二分查找：
1. 维护一个递增序列（result）
2. 新元素比末尾大就追加
3. 否则二分找到替换位置
4. 用前驱数组记录路径
5. 最后回溯得到真正的 LIS

### 示例运行

```typescript
// 输入
arr = [2, 3, 1, 5, 6, 8, 7, 9, 4]
// 对应关系：新索引 -> 旧索引

// 过程
i=0: arr[0]=2, result=[0]
i=1: arr[1]=3 > arr[0]=2, result=[0,1], p[1]=0
i=2: arr[2]=1 < arr[0]=2, 二分找到 u=0, result=[2,1]
i=3: arr[3]=5 > arr[1]=3, result=[2,1,3], p[3]=1
i=4: arr[4]=6 > arr[3]=5, result=[2,1,3,4], p[4]=3
i=5: arr[5]=8 > arr[4]=6, result=[2,1,3,4,5], p[5]=4
i=6: arr[6]=7, 二分找 u=4, result=[2,1,3,4,6], p[6]=4
i=7: arr[7]=9 > arr[6]=7, result=[2,1,3,4,6,7], p[7]=6
i=8: arr[8]=4, 二分找 u=2, result=[2,1,8,4,6,7], p[8]=1

// 回溯
v = result[5] = 7
result = [?, ?, ?, ?, ?, 7]
v = p[7] = 6
result = [?, ?, ?, ?, 6, 7]
v = p[6] = 4
result = [?, ?, ?, 4, 6, 7]
v = p[4] = 3
result = [?, ?, 3, 4, 6, 7]
v = p[3] = 1
result = [?, 1, 3, 4, 6, 7]
v = p[1] = 0
result = [0, 1, 3, 4, 6, 7]

// 输出索引
[0, 1, 3, 4, 6, 7]
// 对应值
[2, 3, 5, 6, 7, 9]
```

### 跳过 0

```typescript
if (arrI !== 0) {
  // 处理
}
```

0 表示新增节点，不在旧列表中，不参与 LIS 计算。

## 在 diff 中的应用

### newIndexToOldIndexMap

```typescript
// 旧: [A, B, C, D, E]  索引: 0,1,2,3,4
// 新: [E, A, C, B, D]  索引: 0,1,2,3,4

// 映射：新索引 -> 旧索引 + 1
newIndexToOldIndexMap = [5, 1, 3, 2, 4]
// E 在旧索引 4 -> 5
// A 在旧索引 0 -> 1
// C 在旧索引 2 -> 3
// B 在旧索引 1 -> 2
// D 在旧索引 3 -> 4
```

### 计算 LIS

```typescript
const lis = getSequence(newIndexToOldIndexMap)
// [5, 1, 3, 2, 4] 的 LIS
// 值递增序列: 1, 2, 4 (索引 1, 3, 4)
// 或: 1, 3, 4 (索引 1, 2, 4)

lis = [1, 2, 4]  // A, C, D 不需要移动
```

### 移动判断

```typescript
for (i = toBePatched - 1; i >= 0; i--) {
  if (newIndexToOldIndexMap[i] === 0) {
    // 新增
    patch(null, nextChild, container, anchor, ...)
  } else if (moved) {
    if (j < 0 || i !== increasingNewIndexSequence[j]) {
      // 不在 LIS 中，需要移动
      move(nextChild, container, anchor, MoveType.REORDER)
    } else {
      j--
    }
  }
}
```

## 时间复杂度

- 遍历数组：O(n)
- 每次二分查找：O(log n)
- 回溯：O(n)

总体：O(n log n)

## 空间复杂度

- p 数组：O(n)
- result 数组：O(n)

总体：O(n)

## 为什么需要 LIS

### 最少移动

LIS 中的元素相对顺序已经正确，不需要移动：

```typescript
// 旧: [A, B, C, D, E]
// 新: [E, A, B, D, C]

// 不用 LIS：移动 4 次
// 用 LIS：只移动 E 和 C，2 次

// LIS = [A, B, D]，这三个相对顺序正确
// 只需移动 E 到开头，C 到末尾
```

### 移动开销

DOM 操作是昂贵的，最小化移动次数能显著提升性能。

## 边界情况

### 空数组

```typescript
getSequence([])  // []
```

### 全递增

```typescript
getSequence([1, 2, 3, 4])  // [0, 1, 2, 3]
```

### 全递减

```typescript
getSequence([4, 3, 2, 1])  // [3]（最后一个）
```

### 包含 0

```typescript
getSequence([0, 2, 0, 3])  // [1, 3]
// 0 被跳过
```

## 小结

`getSequence` 实现 O(n log n) 的 LIS 算法，是 Vue 3 快速 diff 的核心优化。通过找出不需要移动的最长序列，最小化 DOM 移动操作。贪心 + 二分 + 回溯的组合实现了高效且正确的 LIS 计算。
