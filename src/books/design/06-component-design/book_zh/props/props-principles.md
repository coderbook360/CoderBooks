# Props 设计原则概述

> Props 是组件的公共 API，好的 Props 设计让组件易于理解、使用和维护。本文介绍 Props 设计的核心原则和最佳实践。

## Props 的本质

Props（Properties）是父组件向子组件传递数据和行为的方式：

```tsx
// Props 定义了组件的"接口"
interface ButtonProps {
  children: React.ReactNode;     // 必需：按钮内容
  onClick?: () => void;          // 可选：点击回调
  variant?: 'primary' | 'secondary'; // 可选：样式变体
  disabled?: boolean;            // 可选：禁用状态
}

function Button({ 
  children, 
  onClick, 
  variant = 'primary',  // 默认值
  disabled = false 
}: ButtonProps) {
  return (
    <button 
      className={`btn btn--${variant}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
```

## 核心设计原则

### 1. 最小化原则

只暴露必要的 Props：

```tsx
// ❌ 过多的 Props
interface BadButtonProps {
  text: string;
  onClick: () => void;
  backgroundColor: string;
  textColor: string;
  borderRadius: number;
  padding: string;
  fontFamily: string;
  fontSize: number;
  hoverBackgroundColor: string;
  // ... 更多样式属性
}

// ✅ 精简的 Props
interface GoodButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
}

// 样式通过 variant 和 size 抽象，而非直接暴露
```

**原则**：如果一个 prop 只在特殊情况下使用，考虑是否真的需要它。

### 2. 合理的默认值

```tsx
interface InputProps {
  type?: 'text' | 'email' | 'password' | 'number';
  placeholder?: string;
  autoComplete?: 'on' | 'off';
  disabled?: boolean;
}

function Input({
  type = 'text',           // 最常用的类型
  placeholder = '',        // 空字符串
  autoComplete = 'off',    // 安全的默认值
  disabled = false,        // 默认启用
}: InputProps) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      autoComplete={autoComplete}
      disabled={disabled}
    />
  );
}

// 使用时可以省略大部分 props
<Input />  // 等于 <Input type="text" autoComplete="off" disabled={false} />
```

### 3. 一致的命名

```tsx
// ❌ 不一致的命名
interface BadProps {
  onPress: () => void;      // 有的叫 onPress
  handleClick: () => void;  // 有的叫 handleClick
  clickCallback: () => void; // 有的叫 callback
  isVisible: boolean;       // 有的用 is 前缀
  show: boolean;            // 有的不用
}

// ✅ 一致的命名约定
interface GoodProps {
  onClick: () => void;      // 事件：on + 动词
  onSubmit: () => void;
  onClose: () => void;
  isDisabled: boolean;      // 布尔：is/has/can 前缀
  isLoading: boolean;
  hasError: boolean;
}
```

**命名约定**：

| 类型 | 约定 | 示例 |
|------|------|------|
| 事件 | on + 动词 | onClick, onSubmit |
| 布尔 | is/has/can | isDisabled, hasIcon |
| 数据 | 名词 | items, value, data |
| 渲染 | render + 名词 | renderItem, renderHeader |

### 4. 单一职责

每个 Prop 只做一件事：

```tsx
// ❌ 一个 prop 控制多个行为
interface BadModalProps {
  mode: 'confirm' | 'alert' | 'prompt';  // 控制标题、按钮、输入框
}

// ✅ 分离职责
interface GoodModalProps {
  title: string;
  showConfirmButton?: boolean;
  showCancelButton?: boolean;
  showInput?: boolean;
}

// 或使用组合
<Modal title="确认删除">
  <Modal.Body>确定要删除吗？</Modal.Body>
  <Modal.Footer>
    <Button onClick={onCancel}>取消</Button>
    <Button onClick={onConfirm}>确认</Button>
  </Modal.Footer>
</Modal>
```

### 5. 类型安全

利用 TypeScript 提供类型安全：

```tsx
// 使用字面量类型而非 string
interface ButtonProps {
  // ❌ 任意字符串
  variant?: string;
  
  // ✅ 限定选项
  variant?: 'primary' | 'secondary' | 'danger';
}

// 使用联合类型处理互斥属性
type AlertProps = 
  | { type: 'success'; onConfirm: () => void }
  | { type: 'error'; onRetry: () => void };

// 使用泛型保持类型一致性
interface SelectProps<T> {
  options: T[];
  value: T;
  onChange: (value: T) => void;
  getLabel: (option: T) => string;
}

function Select<T>({ options, value, onChange, getLabel }: SelectProps<T>) {
  // value 和 options 的类型自动保持一致
}
```

## 常见模式

### 受控与非受控

```tsx
// 受控组件：状态由外部控制
interface ControlledInputProps {
  value: string;
  onChange: (value: string) => void;
}

// 非受控组件：内部管理状态
interface UncontrolledInputProps {
  defaultValue?: string;
  onBlur?: (value: string) => void;
}

// 支持两种模式
interface FlexibleInputProps {
  value?: string;           // 受控时使用
  defaultValue?: string;    // 非受控时使用
  onChange?: (value: string) => void;
}
```

### Children 模式

```tsx
// 简单 children
interface CardProps {
  children: React.ReactNode;
}

// Render Props
interface ListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
}

// 复合组件
interface TabsProps {
  children: React.ReactElement<TabProps>[];
  activeKey: string;
  onChange: (key: string) => void;
}
```

## 总结

Props 设计原则：

1. **最小化**：只暴露必要的 props
2. **合理默认值**：常见场景开箱即用
3. **一致命名**：遵循团队约定
4. **单一职责**：每个 prop 做一件事
5. **类型安全**：利用 TypeScript 约束

好的 Props 设计让组件：
- 易于理解和使用
- 难以误用
- 易于维护和扩展