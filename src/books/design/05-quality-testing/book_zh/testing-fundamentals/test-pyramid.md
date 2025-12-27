# 测试金字塔与测试钻石

> 测试金字塔告诉我们不同类型测试的比例关系——底层单元测试多，顶层端到端测试少。

## 测试金字塔

Mike Cohn 在 2009 年提出了测试金字塔的概念：

```
                    ▲
                   /│\           端到端测试 (E2E)
                  / │ \          - 数量最少
                 /  │  \         - 执行最慢
                /   │   \        - 成本最高
               ─────┼─────
              /     │     \      集成测试
             /      │      \     - 数量适中
            /       │       \    - 验证组件交互
           ─────────┼─────────
          /         │         \  单元测试
         /          │          \ - 数量最多
        /           │           \- 执行最快
       ──────────────────────────- 成本最低
```

### 为什么是金字塔形状？

| 层级 | 数量 | 速度 | 成本 | 稳定性 | 反馈速度 |
|------|------|------|------|--------|----------|
| E2E 测试 | 少 | 慢 | 高 | 脆弱 | 慢 |
| 集成测试 | 中 | 中 | 中 | 中等 | 中 |
| 单元测试 | 多 | 快 | 低 | 稳定 | 快 |

### 各层测试的职责

#### 1. 单元测试（Unit Tests）

测试最小的可测试单元（函数、类、组件）：

```typescript
// 被测函数
function calculateDiscount(price: number, discountPercent: number): number {
  if (discountPercent < 0 || discountPercent > 100) {
    throw new Error('Invalid discount percentage');
  }
  return price * (1 - discountPercent / 100);
}

// 单元测试
describe('calculateDiscount', () => {
  it('应该正确计算10%折扣', () => {
    expect(calculateDiscount(100, 10)).toBe(90);
  });

  it('应该正确计算50%折扣', () => {
    expect(calculateDiscount(200, 50)).toBe(100);
  });

  it('折扣为0时应返回原价', () => {
    expect(calculateDiscount(100, 0)).toBe(100);
  });

  it('折扣为100时应返回0', () => {
    expect(calculateDiscount(100, 100)).toBe(0);
  });

  it('折扣超出范围时应抛出错误', () => {
    expect(() => calculateDiscount(100, -10)).toThrow();
    expect(() => calculateDiscount(100, 110)).toThrow();
  });
});
```

**特点**：
- 速度快：毫秒级
- 隔离性好：不依赖外部系统
- 便于定位问题：失败时直接指向问题代码

#### 2. 集成测试（Integration Tests）

测试多个模块/组件之间的交互：

```typescript
// 测试服务层与数据层的集成
describe('UserService + UserRepository', () => {
  let userService: UserService;
  let database: TestDatabase;

  beforeEach(async () => {
    database = await TestDatabase.create();
    const userRepository = new UserRepository(database);
    userService = new UserService(userRepository);
  });

  afterEach(async () => {
    await database.cleanup();
  });

  it('应该能创建并查询用户', async () => {
    // 创建用户
    const created = await userService.createUser({
      name: 'Alice',
      email: 'alice@example.com'
    });

    // 查询用户
    const found = await userService.getUserById(created.id);

    expect(found).toEqual({
      id: created.id,
      name: 'Alice',
      email: 'alice@example.com'
    });
  });

  it('邮箱重复时应抛出错误', async () => {
    await userService.createUser({
      name: 'Alice',
      email: 'alice@example.com'
    });

    await expect(
      userService.createUser({
        name: 'Bob',
        email: 'alice@example.com'
      })
    ).rejects.toThrow('Email already exists');
  });
});
```

**特点**：
- 验证组件协作是否正确
- 需要一定的环境准备
- 比单元测试慢，但比 E2E 快

#### 3. 端到端测试（E2E Tests）

从用户角度测试整个系统：

```typescript
// 使用 Playwright 进行 E2E 测试
import { test, expect } from '@playwright/test';

test.describe('用户登录流程', () => {
  test('成功登录', async ({ page }) => {
    // 访问登录页
    await page.goto('/login');

    // 填写表单
    await page.fill('[name="email"]', 'alice@example.com');
    await page.fill('[name="password"]', 'password123');

    // 点击登录按钮
    await page.click('button[type="submit"]');

    // 验证跳转到首页
    await expect(page).toHaveURL('/dashboard');

    // 验证用户名显示
    await expect(page.locator('.user-name')).toHaveText('Alice');
  });

  test('登录失败显示错误信息', async ({ page }) => {
    await page.goto('/login');

    await page.fill('[name="email"]', 'wrong@example.com');
    await page.fill('[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    await expect(page.locator('.error-message')).toHaveText(
      '邮箱或密码错误'
    );
  });
});
```

**特点**：
- 最接近真实用户场景
- 执行慢、成本高
- 容易出现 flaky tests（不稳定测试）

## 测试钻石

随着前端组件化的普及，"测试钻石"模型更适合现代前端应用：

```
           ▲
          /│\          E2E 测试
         / │ \         - 核心用户流程
        /  │  \
       ────┼────
      /    │    \
     /     │     \     集成测试 / 组件测试
    /      │      \    - 数量最多
   /       │       \   - 组件 + Hook
   ─────────────────
      \    │    /
       \   │   /       单元测试
        \  │  /        - 纯逻辑函数
         \ │ /
          \│/
           ▼
```

### 为什么是钻石形？

在前端领域：

1. **单元测试覆盖范围有限**：UI 组件很难纯粹用单元测试验证
2. **组件测试更有价值**：测试组件的渲染和交互行为
3. **E2E 仍然保持精简**：只覆盖核心用户流程

### 组件测试的崛起

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { Counter } from './Counter';

describe('Counter 组件', () => {
  it('应该显示初始值', () => {
    render(<Counter initialValue={5} />);
    expect(screen.getByText('Count: 5')).toBeInTheDocument();
  });

  it('点击增加按钮应该增加计数', async () => {
    render(<Counter initialValue={0} />);
    
    const button = screen.getByRole('button', { name: '增加' });
    await fireEvent.click(button);
    
    expect(screen.getByText('Count: 1')).toBeInTheDocument();
  });

  it('点击减少按钮应该减少计数', async () => {
    render(<Counter initialValue={5} />);
    
    const button = screen.getByRole('button', { name: '减少' });
    await fireEvent.click(button);
    
    expect(screen.getByText('Count: 4')).toBeInTheDocument();
  });

  it('计数为0时减少按钮应该禁用', () => {
    render(<Counter initialValue={0} />);
    
    const button = screen.getByRole('button', { name: '减少' });
    expect(button).toBeDisabled();
  });
});
```

## 测试策略选择

### 什么时候用单元测试？

- 纯函数（计算、转换、验证）
- 工具函数
- 业务逻辑（不涉及 UI）
- 算法实现

```typescript
// 适合单元测试的代码
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency
  }).format(amount);
}
```

### 什么时候用集成/组件测试？

- React/Vue 组件
- 自定义 Hooks
- 带状态的模块
- API 调用逻辑

```typescript
// 适合集成测试的代码
function useUserProfile(userId: string) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetchUser(userId)
      .then(setUser)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [userId]);

  return { user, loading, error };
}
```

### 什么时候用 E2E 测试？

- 核心用户流程（注册、登录、下单）
- 关键业务路径
- 跨页面的交互流程
- 第三方集成

```typescript
// 适合 E2E 测试的场景
test('完整的购买流程', async ({ page }) => {
  // 登录
  await page.goto('/login');
  await page.fill('[name="email"]', 'user@example.com');
  await page.fill('[name="password"]', 'password');
  await page.click('button[type="submit"]');

  // 浏览商品
  await page.goto('/products');
  await page.click('[data-product-id="123"]');

  // 加入购物车
  await page.click('button:has-text("加入购物车")');

  // 结算
  await page.goto('/cart');
  await page.click('button:has-text("去结算")');

  // 支付
  await page.fill('[name="cardNumber"]', '4242424242424242');
  await page.click('button:has-text("支付")');

  // 验证
  await expect(page.locator('.order-success')).toBeVisible();
});
```

## 测试比例建议

### 传统后端应用

```
70% 单元测试
20% 集成测试
10% E2E 测试
```

### 现代前端应用

```
20% 单元测试（纯逻辑）
60% 组件/集成测试
20% E2E 测试（核心流程）
```

### 关键原则

1. **测试行为，不测试实现**
2. **优先测试关键路径**
3. **保持测试金字塔/钻石的形状**
4. **不稳定的测试比没有测试更糟糕**

## 总结

测试策略的核心要点：

1. **测试金字塔**：单元测试多，E2E 测试少
2. **测试钻石**：前端应用以组件测试为主
3. **选择合适的测试类型**：
   - 纯逻辑 → 单元测试
   - 组件交互 → 组件测试
   - 用户流程 → E2E 测试
4. **ROI 思维**：用最小成本获得最大测试价值

记住：**测试的目的是提高代码质量和开发信心，而不是追求 100% 覆盖率。**
