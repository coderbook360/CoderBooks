# 所有可能的菜谱

LeetCode 2115. Find All Possible Recipes from Given Supplies

## 题目描述

给定一个字符串数组 `recipes`（菜谱名）、一个二维字符串数组 `ingredients`（每个菜谱所需的原料）和一个字符串数组 `supplies`（你拥有的原料）。

返回所有可以做出的菜谱的列表。

## 示例

```
输入：
recipes = ["bread","sandwich"]
ingredients = [["yeast","flour"],["bread","meat"]]
supplies = ["yeast","flour","meat"]

输出：["bread","sandwich"]
解释：
- bread 需要 yeast 和 flour，都有 → 可以做
- sandwich 需要 bread 和 meat，bread 可以做出来，meat 有 → 可以做
```

## 思路分析

这是一个**依赖解析**问题：
- 菜谱可能依赖原料（supplies）
- 菜谱也可能依赖其他菜谱

使用拓扑排序：
1. 建图：如果菜谱 A 需要菜谱 B，则 B → A
2. 初始时，所有原料的"入度"为 0
3. 当一个菜谱的所有依赖都满足时，它可以被"做出来"

## 代码实现

```typescript
function findAllRecipes(
  recipes: string[], 
  ingredients: string[][], 
  supplies: string[]
): string[] {
  // 建图
  const graph = new Map<string, string[]>();  // 原料/菜谱 → 依赖它的菜谱
  const indegree = new Map<string, number>();  // 每个菜谱需要多少原料
  const recipeSet = new Set(recipes);
  
  for (let i = 0; i < recipes.length; i++) {
    const recipe = recipes[i];
    indegree.set(recipe, ingredients[i].length);
    
    for (const ing of ingredients[i]) {
      if (!graph.has(ing)) {
        graph.set(ing, []);
      }
      graph.get(ing)!.push(recipe);
    }
  }
  
  // BFS：从 supplies 开始
  const queue = [...supplies];
  const result: string[] = [];
  
  while (queue.length > 0) {
    const item = queue.shift()!;
    
    // 检查依赖于 item 的菜谱
    for (const recipe of graph.get(item) || []) {
      indegree.set(recipe, indegree.get(recipe)! - 1);
      
      if (indegree.get(recipe) === 0) {
        result.push(recipe);
        queue.push(recipe);  // 这个菜谱现在可以作为其他菜谱的原料
      }
    }
  }
  
  return result;
}
```

## 执行过程

```
recipes = ["bread","sandwich"]
ingredients = [["yeast","flour"],["bread","meat"]]
supplies = ["yeast","flour","meat"]

建图：
yeast → [bread]
flour → [bread]
bread → [sandwich]
meat → [sandwich]

入度：
bread: 2 (需要 yeast, flour)
sandwich: 2 (需要 bread, meat)

BFS：
queue = [yeast, flour, meat]

处理 yeast：bread 入度 2→1
处理 flour：bread 入度 1→0，加入 result 和 queue
处理 meat：sandwich 入度 2→1

queue = [bread]
处理 bread：sandwich 入度 1→0，加入 result

result = [bread, sandwich]
```

## DFS 方法

```typescript
function findAllRecipes(
  recipes: string[], 
  ingredients: string[][], 
  supplies: string[]
): string[] {
  const supplySet = new Set(supplies);
  const recipeIndex = new Map<string, number>();
  
  for (let i = 0; i < recipes.length; i++) {
    recipeIndex.set(recipes[i], i);
  }
  
  // 0: 未访问, 1: 访问中, 2: 可做, 3: 不可做
  const state = new Array(recipes.length).fill(0);
  
  function canMake(recipe: string): boolean {
    if (supplySet.has(recipe)) return true;
    
    const idx = recipeIndex.get(recipe);
    if (idx === undefined) return false;  // 不是菜谱也不是原料
    
    if (state[idx] === 2) return true;
    if (state[idx] === 1 || state[idx] === 3) return false;  // 有环或已确定不可做
    
    state[idx] = 1;  // 访问中
    
    for (const ing of ingredients[idx]) {
      if (!canMake(ing)) {
        state[idx] = 3;
        return false;
      }
    }
    
    state[idx] = 2;  // 可做
    return true;
  }
  
  const result: string[] = [];
  for (const recipe of recipes) {
    if (canMake(recipe)) {
      result.push(recipe);
    }
  }
  
  return result;
}
```

## 两种方法对比

| 方法 | 优点 | 缺点 |
|------|------|------|
| BFS | 直观，符合"逐步解锁"的思路 | 需要显式建图 |
| DFS | 不需要完整建图 | 需要处理环检测 |

## 边界情况

```typescript
// 循环依赖
recipes = ["a", "b"]
ingredients = [["b"], ["a"]]
supplies = []
// 返回 []（a 需要 b，b 需要 a，有环）

// 缺少原料
recipes = ["bread"]
ingredients = [["yeast", "flour"]]
supplies = ["yeast"]
// 返回 []（缺少 flour）
```

## 复杂度分析

设 n = recipes.length，m = 所有 ingredients 的总长度

- **时间复杂度**：O(n + m + |supplies|)
- **空间复杂度**：O(n + m)

## 相关题目

| 题号 | 题目 | 难度 |
|------|------|------|
| 2115 | 所有可能的菜谱 | 中等 |
| 207 | 课程表 | 中等 |
| 210 | 课程表 II | 中等 |
