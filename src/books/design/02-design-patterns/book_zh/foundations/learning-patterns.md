# 如何学习和选择设计模式

## 学习设计模式的误区

首先要问一个问题：**为什么很多人学完设计模式却不会用？**

常见的三大误区：

### 误区1：死记硬背定义

❌ **错误做法**："单例模式确保一个类只有一个实例..."（背概念）

✅ **正确做法**：遇到"需要全局唯一对象"的问题，自然想到单例模式。

### 误区2：为了用而用

❌ **错误做法**："这里我要展示一下工厂模式..."（炫技）

✅ **正确做法**：当对象创建逻辑复杂、需要集中管理时，才考虑工厂模式。

### 误区3：学习顺序错误

❌ **错误做法**：先学23种模式，再找应用场景

✅ **正确做法**：先遇到问题，再学习解决该问题的模式

## 正确的学习路径

### 第一步：理解问题

**不要直接学模式，先理解它要解决的问题。**

举例：策略模式

**问题场景**：
```typescript
// 电商系统计算运费
function calculateShipping(order: Order, method: string): number {
  if (method === 'standard') {
    return order.weight * 5;
  } else if (method === 'express') {
    return order.weight * 10;
  } else if (method === 'overnight') {
    return order.weight * 20;
  }
  // 每增加一种配送方式都要修改这里 ❌
  return 0;
}
```

**痛点**：
1. 每增加配送方式都要修改函数
2. 配送逻辑和计算逻辑耦合
3. 难以单独测试每种配送方式

**此时才引入策略模式**：
```typescript
interface ShippingStrategy {
  calculate(order: Order): number;
}

class StandardShipping implements ShippingStrategy {
  calculate(order: Order) {
    return order.weight * 5;
  }
}

class ExpressShipping implements ShippingStrategy {
  calculate(order: Order) {
    return order.weight * 10;
  }
}

// 新增配送方式无需修改现有代码 ✅
class OvernightShipping implements ShippingStrategy {
  calculate(order: Order) {
    return order.weight * 20;
  }
}

class ShippingCalculator {
  constructor(private strategy: ShippingStrategy) {}

  calculate(order: Order) {
    return this.strategy.calculate(order);
  }
}
```

### 第二步：看懂示例

理解模式的**核心结构**，而非死记细节。

策略模式的核心：
1. **策略接口**：定义算法的标准
2. **具体策略**：实现不同算法
3. **上下文类**：使用策略，可以动态切换

### 第三步：动手实现

**必须自己写一遍，才能真正掌握。**

练习建议：
1. 先按示例敲一遍代码
2. 改变场景重新实现（如把支付改成排序）
3. 尝试混合多个模式

### 第四步：识别应用场景

在实际项目中识别适用场景：

| 场景特征 | 适用模式 |
|---------|---------|
| 需要多种算法/策略 | 策略模式 |
| 动态增强对象功能 | 装饰器模式 |
| 全局唯一对象 | 单例模式 |
| 隐藏复杂子系统 | 外观模式 |
| 统一处理树形结构 | 组合模式 |

### 第五步：权衡取舍

**学会说"不"比学会用更重要。**

不该用设计模式的场景：
- 功能简单，不会变化
- 团队成员不熟悉
- 增加的复杂度 > 带来的好处

## 如何选择合适的设计模式？

### 决策流程图

```
遇到问题
  ↓
问题分类
  ├─ 对象创建问题 → 创建型模式
  │   ├─ 需要全局唯一？ → 单例模式
  │   ├─ 创建逻辑复杂？ → 工厂模式
  │   └─ 分步构建对象？ → 建造者模式
  │
  ├─ 对象结构问题 → 结构型模式
  │   ├─ 接口不兼容？ → 适配器模式
  │   ├─ 动态增强功能？ → 装饰器模式
  │   └─ 简化复杂系统？ → 外观模式
  │
  └─ 对象协作问题 → 行为型模式
      ├─ 算法需要切换？ → 策略模式
      ├─ 一对多依赖通知？ → 观察者模式
      └─ 请求链式处理？ → 责任链模式
```

### 实际案例：前端组件设计

**需求**：开发一个表单组件，支持多种验证规则。

**第一步：分析问题**
- 问题类型：算法切换（验证规则是算法）
- 变化点：验证规则可能频繁变化
- 要求：易于扩展新规则

**第二步：选择模式**
→ **策略模式**（算法封装与切换）

**第三步：实现**
```typescript
// 验证策略接口
interface ValidationStrategy {
  validate(value: string): boolean;
  errorMessage: string;
}

// 具体策略
class EmailValidator implements ValidationStrategy {
  errorMessage = '请输入有效的邮箱地址';
  
  validate(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }
}

class PhoneValidator implements ValidationStrategy {
  errorMessage = '请输入有效的手机号';
  
  validate(value: string) {
    return /^1[3-9]\d{9}$/.test(value);
  }
}

class MinLengthValidator implements ValidationStrategy {
  errorMessage = `至少输入 ${this.minLength} 个字符`;
  
  constructor(private minLength: number) {}
  
  validate(value: string) {
    return value.length >= this.minLength;
  }
}

// 上下文：表单字段
class FormField {
  private validators: ValidationStrategy[] = [];
  
  addValidator(validator: ValidationStrategy) {
    this.validators.push(validator);
    return this;
  }
  
  validate(value: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    for (const validator of this.validators) {
      if (!validator.validate(value)) {
        errors.push(validator.errorMessage);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// 使用
const emailField = new FormField()
  .addValidator(new EmailValidator())
  .addValidator(new MinLengthValidator(5));

const result = emailField.validate('test');
console.log(result);
// { valid: false, errors: ['请输入有效的邮箱地址', '至少输入 5 个字符'] }
```

## 常见场景与模式对照表

### 创建型模式选择

| 场景 | 模式 | 示例 |
|------|-----|-----|
| 全局唯一配置对象 | 单例模式 | Vuex Store, 日志管理器 |
| 根据条件创建不同对象 | 工厂模式 | 根据文件类型创建解析器 |
| 复杂对象分步构建 | 建造者模式 | SQL 查询构建器 |
| 通过克隆创建对象 | 原型模式 | 配置对象复用 |

### 结构型模式选择

| 场景 | 模式 | 示例 |
|------|-----|-----|
| 第三方库接口不兼容 | 适配器模式 | Axios 适配 Fetch API |
| 动态添加日志/缓存/权限 | 装饰器模式 | React HOC, Express 中间件 |
| 懒加载、虚拟代理、缓存 | 代理模式 | Vue 响应式, 图片懒加载 |
| 树形结构统一处理 | 组合模式 | 文件系统, 组件树 |
| 简化复杂 API | 外观模式 | SDK 封装 |

### 行为型模式选择

| 场景 | 模式 | 示例 |
|------|-----|-----|
| 事件系统、数据绑定 | 观察者模式 | Vue 响应式, EventEmitter |
| 算法/策略切换 | 策略模式 | 表单验证, 支付方式 |
| 操作撤销/重做 | 命令模式 | 编辑器撤销, 操作历史 |
| UI 状态管理 | 状态模式 | 流程状态, 订单状态 |
| 中间件、拦截器 | 责任链模式 | Express 中间件, Axios 拦截器 |

## 学习建议

### 1. 循序渐进

**第一阶段**：掌握 5 个最常用模式
- 单例模式
- 工厂模式
- 策略模式
- 观察者模式
- 装饰器模式

**第二阶段**：扩展到 10 个模式
- 代理模式
- 组合模式
- 外观模式
- 命令模式
- 状态模式

**第三阶段**：全面掌握 23 种模式

### 2. 项目驱动

在实际项目中应用：
1. **Code Review** 时识别可以改进的地方
2. **重构** 时引入设计模式优化代码
3. **新功能** 开发时提前考虑扩展性

### 3. 阅读优秀源码

学习开源项目如何使用设计模式：
- **Vue 3**：代理模式（响应式）、观察者模式（依赖追踪）
- **React**：组合模式（组件树）、高阶组件（装饰器）
- **Express**：责任链模式（中间件）
- **Webpack**：观察者模式（插件系统）

## 总结

学习和选择设计模式的关键：

1. **问题驱动**：先遇到问题，再学习模式
2. **动手实践**：必须自己写一遍代码
3. **场景识别**：在实际项目中识别适用场景
4. **权衡取舍**：学会判断何时不该用
5. **循序渐进**：从常用模式开始，逐步扩展

记住：**设计模式是工具，不是目的。目的是写出易维护、易扩展的代码。**
