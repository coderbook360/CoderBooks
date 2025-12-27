# 代码质量的度量与评估

**思考一个问题**：如何客观评价代码质量？

"这代码写得不好"——这种评价太主观。我们需要可量化、可追踪的指标。

## 为什么需要度量

### 度量的价值

> "如果你不能度量它，你就不能改进它。" — Peter Drucker

度量让我们能够：
- **识别问题区域**：找出需要重构的代码
- **追踪改进**：验证重构是否有效
- **建立标准**：为团队设定质量基准
- **预防劣化**：在问题恶化前发现

### 度量的陷阱

**警告**：度量是手段，不是目的。

```typescript
// ❌ 为了提高"覆盖率"指标而写的无意义测试
test('should have 100% coverage', () => {
  const result = complexFunction(1, 2, 3);
  expect(result).toBeDefined();  // 什么都没测
});
```

**古德哈特定律**：当一个指标成为目标时，它就不再是好的指标。

## 核心质量指标

### 1. 圈复杂度（Cyclomatic Complexity）

**定义**：代码中独立路径的数量。

每个 `if`、`else`、`for`、`while`、`case`、`&&`、`||` 都增加一条路径。

```typescript
// 圈复杂度 = 1（无分支）
function add(a: number, b: number): number {
  return a + b;
}

// 圈复杂度 = 4（3个分支点）
function calculateDiscount(user: User, order: Order): number {
  let discount = 0;
  
  if (user.isVip) {                    // +1
    discount += 10;
  }
  
  if (order.total > 100) {             // +1
    discount += 5;
  }
  
  if (order.items.length > 5) {        // +1
    discount += 3;
  }
  
  return discount;
}
```

**参考阈值**：
| 圈复杂度 | 风险级别 | 建议 |
|---------|---------|------|
| 1-10 | 低 | 简单，易维护 |
| 11-20 | 中 | 考虑拆分 |
| 21-50 | 高 | 需要重构 |
| > 50 | 极高 | 必须重构 |

### 2. 认知复杂度（Cognitive Complexity）

**定义**：SonarSource 提出的指标，衡量理解代码的难度。

与圈复杂度的区别：认知复杂度考虑了嵌套深度的影响。

```typescript
// 圈复杂度 = 4，认知复杂度 = 4
function example1(a: boolean, b: boolean, c: boolean, d: boolean) {
  if (a) { /* ... */ }
  if (b) { /* ... */ }
  if (c) { /* ... */ }
  if (d) { /* ... */ }
}

// 圈复杂度 = 4，认知复杂度 = 10（嵌套惩罚）
function example2(a: boolean, b: boolean, c: boolean, d: boolean) {
  if (a) {                    // +1
    if (b) {                  // +2（嵌套）
      if (c) {                // +3（嵌套）
        if (d) { /* ... */ }  // +4（嵌套）
      }
    }
  }
}
```

### 3. 代码行数（Lines of Code）

**最简单但最容易误解的指标**。

- **文件行数**：过长的文件往往承担了太多职责
- **函数行数**：过长的函数难以理解和测试
- **类行数**：过大的类可能违反单一职责

**参考阈值**：
| 单位 | 建议上限 |
|------|---------|
| 函数 | 30 行 |
| 类 | 300 行 |
| 文件 | 500 行 |

### 4. 耦合度指标

**传入耦合（Afferent Coupling, Ca）**：有多少其他模块依赖这个模块。

**传出耦合（Efferent Coupling, Ce）**：这个模块依赖多少其他模块。

```
            ┌─────────┐
            │ Module A │
            └────┬────┘
                 │ 依赖
        ┌────────┼────────┐
        ▼        ▼        ▼
   ┌────────┐ ┌────────┐ ┌────────┐
   │Module B│ │Module C│ │Module D│
   └────────┘ └────────┘ └────────┘

   Module A 的 Ce = 3（依赖3个模块）
   Module B 的 Ca = 1（被1个模块依赖）
```

**不稳定性（Instability）** = Ce / (Ca + Ce)
- 接近 0：稳定，被很多模块依赖
- 接近 1：不稳定，依赖很多模块

### 5. 代码覆盖率

**常见覆盖率类型**：

| 类型 | 定义 | 重要性 |
|------|------|--------|
| 行覆盖率 | 执行的代码行比例 | 基础 |
| 分支覆盖率 | 执行的分支比例 | 更重要 |
| 路径覆盖率 | 执行的路径比例 | 最严格 |

```typescript
function example(a: boolean, b: boolean): string {
  if (a) {
    if (b) {
      return 'both';
    }
    return 'only a';
  }
  return 'none';
}

// 100% 行覆盖率需要的测试
test('a=true, b=true', () => { example(true, true); });
test('a=true, b=false', () => { example(true, false); });
test('a=false', () => { example(false, false); });
```

**覆盖率目标**：
- 80% 是常见目标
- 100% 往往投入产出比不佳
- 关注关键路径的覆盖

## 自动化度量工具

### TypeScript/JavaScript 生态

| 工具 | 功能 |
|------|------|
| ESLint | 代码风格、复杂度检查 |
| SonarQube | 全面质量分析 |
| Istanbul/nyc | 覆盖率统计 |
| Madge | 依赖分析 |

### ESLint 复杂度规则示例

```javascript
// .eslintrc.js
module.exports = {
  rules: {
    'complexity': ['error', { max: 10 }],
    'max-depth': ['error', { max: 3 }],
    'max-lines-per-function': ['error', { max: 30 }],
    'max-params': ['error', { max: 3 }],
  }
};
```

## 度量的正确使用方式

### 作为趋势而非绝对值

不要执着于具体数字，关注变化趋势：

- 这个模块的复杂度是在上升还是下降？
- 技术债务是在积累还是偿还？
- 测试覆盖率是在提高还是降低？

### 结合代码审查

度量是辅助，不能替代人的判断：

```typescript
// 所有指标都很好，但设计有问题
class UserManager {
  createUser(name: string): User { /* 简单实现 */ }
  updateUser(id: string, name: string): User { /* 简单实现 */ }
  // ... 50 个类似的简单方法
  // 问题：这个类承担了太多职责
}
```

### 设置质量门禁

在 CI/CD 流程中设置检查：

```yaml
# GitHub Actions 示例
- name: Check code quality
  run: |
    npm run lint
    npm run test:coverage
    # 覆盖率低于80%则失败
    npx nyc check-coverage --lines 80
```

## 总结

- **度量是改进的基础**，但不是目的
- **核心指标**：圈复杂度、认知复杂度、代码行数、耦合度、覆盖率
- **使用自动化工具**：ESLint、SonarQube、Istanbul
- **关注趋势**：变化比绝对值更重要
- **结合人工判断**：度量无法替代代码审查

有了度量体系，我们就能客观评估代码质量，并追踪改进效果。接下来，我们将进入 SOLID 原则的学习——这是编写高质量代码的核心指导原则。
