# 迭代器模式：集合的统一遍历

## 问题的起源

假设你正在开发一个社交应用，需要遍历用户的好友列表。好友可能存储在不同的数据结构中：

```typescript
// 数组存储
const friendsArray = ['Alice', 'Bob', 'Charlie'];

// 链表存储
class FriendNode {
  name: string;
  next: FriendNode | null;
}

// 树形存储（好友分组）
class FriendGroup {
  name: string;
  friends: string[];
  subGroups: FriendGroup[];
}
```

如果直接遍历这些结构，代码会非常不统一：

```typescript
// 遍历数组
for (let i = 0; i < friendsArray.length; i++) {
  console.log(friendsArray[i]);
}

// 遍历链表
let node = friendList.head;
while (node) {
  console.log(node.name);
  node = node.next;
}

// 遍历树
function traverseGroup(group: FriendGroup) {
  for (const friend of group.friends) {
    console.log(friend);
  }
  for (const subGroup of group.subGroups) {
    traverseGroup(subGroup);
  }
}
```

**问题**：不同数据结构的遍历方式完全不同，调用方需要了解每种结构的内部实现。

## 迭代器模式的核心思想

迭代器模式的核心思想是：**提供一种方法顺序访问集合中的元素，而不暴露集合的内部表示**。

迭代器将遍历逻辑从集合中分离出来，使得集合和遍历算法可以独立变化。

## JavaScript 的迭代器协议

JavaScript 原生支持迭代器，通过 `Symbol.iterator` 实现：

```typescript
interface Iterator<T> {
  next(): { value: T; done: false } | { value: undefined; done: true };
}

interface Iterable<T> {
  [Symbol.iterator](): Iterator<T>;
}
```

任何实现了 `Symbol.iterator` 方法的对象都是可迭代的：

```typescript
class FriendList implements Iterable<string> {
  private friends: string[] = [];

  add(friend: string): void {
    this.friends.push(friend);
  }

  [Symbol.iterator](): Iterator<string> {
    let index = 0;
    const friends = this.friends;

    return {
      next(): IteratorResult<string> {
        if (index < friends.length) {
          return { value: friends[index++], done: false };
        }
        return { value: undefined, done: true };
      },
    };
  }
}

// 使用
const list = new FriendList();
list.add('Alice');
list.add('Bob');

// 可以使用 for...of
for (const friend of list) {
  console.log(friend);
}

// 可以展开
const allFriends = [...list];
```

## 链表的迭代器

为链表实现迭代器：

```typescript
class LinkedListNode<T> {
  constructor(
    public value: T,
    public next: LinkedListNode<T> | null = null
  ) {}
}

class LinkedList<T> implements Iterable<T> {
  private head: LinkedListNode<T> | null = null;
  private tail: LinkedListNode<T> | null = null;

  append(value: T): void {
    const node = new LinkedListNode(value);
    if (!this.tail) {
      this.head = this.tail = node;
    } else {
      this.tail.next = node;
      this.tail = node;
    }
  }

  *[Symbol.iterator](): Iterator<T> {
    let current = this.head;
    while (current) {
      yield current.value;
      current = current.next;
    }
  }
}

// 使用
const linkedList = new LinkedList<number>();
linkedList.append(1);
linkedList.append(2);
linkedList.append(3);

for (const value of linkedList) {
  console.log(value); // 1, 2, 3
}
```

## 树的迭代器

树结构可以有多种遍历方式：

```typescript
class TreeNode<T> {
  constructor(
    public value: T,
    public children: TreeNode<T>[] = []
  ) {}
}

class Tree<T> implements Iterable<T> {
  constructor(private root: TreeNode<T> | null = null) {}

  // 默认深度优先遍历
  *[Symbol.iterator](): Iterator<T> {
    if (this.root) {
      yield* this.dfs(this.root);
    }
  }

  // 深度优先遍历
  private *dfs(node: TreeNode<T>): Generator<T> {
    yield node.value;
    for (const child of node.children) {
      yield* this.dfs(child);
    }
  }

  // 广度优先遍历
  *bfs(): Generator<T> {
    if (!this.root) return;

    const queue: TreeNode<T>[] = [this.root];

    while (queue.length > 0) {
      const node = queue.shift()!;
      yield node.value;
      queue.push(...node.children);
    }
  }
}

// 使用
const tree = new Tree(
  new TreeNode('A', [
    new TreeNode('B', [new TreeNode('D'), new TreeNode('E')]),
    new TreeNode('C', [new TreeNode('F')]),
  ])
);

console.log([...tree]); // ['A', 'B', 'D', 'E', 'C', 'F'] (DFS)
console.log([...tree.bfs()]); // ['A', 'B', 'C', 'D', 'E', 'F'] (BFS)
```

## 惰性迭代器

迭代器是惰性求值的，这意味着元素只在需要时才计算：

```typescript
// 无限序列
function* naturalNumbers(): Generator<number> {
  let n = 1;
  while (true) {
    yield n++;
  }
}

// 惰性转换
function* map<T, U>(
  iterable: Iterable<T>,
  fn: (item: T) => U
): Generator<U> {
  for (const item of iterable) {
    yield fn(item);
  }
}

function* filter<T>(
  iterable: Iterable<T>,
  predicate: (item: T) => boolean
): Generator<T> {
  for (const item of iterable) {
    if (predicate(item)) {
      yield item;
    }
  }
}

function* take<T>(iterable: Iterable<T>, count: number): Generator<T> {
  let taken = 0;
  for (const item of iterable) {
    if (taken >= count) break;
    yield item;
    taken++;
  }
}

// 组合使用
const result = take(
  filter(
    map(naturalNumbers(), (n) => n * 2),
    (n) => n % 3 === 0
  ),
  5
);

console.log([...result]); // [6, 12, 18, 24, 30]
```

## 迭代器工具函数

常用的迭代器工具：

```typescript
// 范围迭代器
function* range(start: number, end: number, step = 1): Generator<number> {
  for (let i = start; i < end; i += step) {
    yield i;
  }
}

// 枚举迭代器
function* enumerate<T>(
  iterable: Iterable<T>
): Generator<[number, T]> {
  let index = 0;
  for (const item of iterable) {
    yield [index++, item];
  }
}

// 压缩迭代器
function* zip<T, U>(
  iter1: Iterable<T>,
  iter2: Iterable<U>
): Generator<[T, U]> {
  const it1 = iter1[Symbol.iterator]();
  const it2 = iter2[Symbol.iterator]();

  while (true) {
    const r1 = it1.next();
    const r2 = it2.next();
    if (r1.done || r2.done) break;
    yield [r1.value, r2.value];
  }
}

// 使用
console.log([...range(0, 5)]); // [0, 1, 2, 3, 4]
console.log([...enumerate(['a', 'b', 'c'])]); // [[0, 'a'], [1, 'b'], [2, 'c']]
console.log([...zip([1, 2, 3], ['a', 'b', 'c'])]); // [[1, 'a'], [2, 'b'], [3, 'c']]
```

## 迭代器模式的优缺点

**优点**：
- **统一接口**：不同集合使用相同的遍历方式
- **封装内部结构**：调用方不需要知道集合的实现细节
- **惰性求值**：按需生成元素，节省内存
- **支持多种遍历**：同一集合可以有多个迭代器

**缺点**：
- **单向遍历**：标准迭代器只能向前，不能后退
- **一次性使用**：迭代器用完后需要重新创建

## 应用场景

1. **数据结构遍历**：链表、树、图的遍历
2. **分页加载**：按需加载数据
3. **流式处理**：处理大文件或数据流
4. **无限序列**：斐波那契数列、自然数等

## 总结

迭代器模式通过统一的接口来访问集合元素，使得调用方不需要关心集合的内部结构。JavaScript 原生支持迭代器协议，使用 Generator 可以轻松实现自定义迭代器。

关键要点：
1. 实现 `Symbol.iterator` 方法使对象可迭代
2. Generator 是实现迭代器的便捷方式
3. 迭代器是惰性求值的
4. 可以为同一集合实现多种遍历方式
