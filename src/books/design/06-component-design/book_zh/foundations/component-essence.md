# 组件的本质：封装、复用与组合

> 组件是前端开发的基本构建单元——它将 UI、逻辑和样式封装在一起，实现高内聚低耦合的代码组织。

## 什么是组件？

组件是一个**自包含的、可复用的 UI 单元**，它封装了：

- **结构（HTML/JSX）**：组件的 DOM 结构
- **样式（CSS）**：组件的视觉表现
- **行为（JavaScript）**：组件的交互逻辑
- **状态（State）**：组件的内部数据

```tsx
// 一个完整的组件
function Button({ children, onClick, variant = 'primary' }: ButtonProps) {
  // 状态
  const [isPressed, setIsPressed] = useState(false);

  // 行为
  const handleClick = (e: MouseEvent) => {
    setIsPressed(true);
    onClick?.(e);
    setTimeout(() => setIsPressed(false), 150);
  };

  // 结构 + 样式
  return (
    <button
      className={`btn btn--${variant} ${isPressed ? 'btn--pressed' : ''}`}
      onClick={handleClick}
    >
      {children}
    </button>
  );
}
```

## 组件的三大特性

### 1. 封装（Encapsulation）

组件隐藏内部实现细节，只暴露必要的接口：

```tsx
// ❌ 暴露内部实现
function BadDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const optionsRef = useRef<HTMLDivElement>(null);
  
  // 使用者需要了解内部状态才能使用
  return { isOpen, setIsOpen, selectedIndex, setSelectedIndex, optionsRef };
}

// ✅ 良好的封装
function Dropdown({ options, value, onChange }: DropdownProps) {
  // 内部状态和实现完全隐藏
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  
  // 只通过 props 与外部通信
  return (
    <div className="dropdown">
      <button onClick={() => setIsOpen(!isOpen)}>
        {value || 'Select...'}
      </button>
      {isOpen && (
        <ul>
          {options.map((option, index) => (
            <li
              key={option.value}
              className={index === highlightedIndex ? 'highlighted' : ''}
              onClick={() => {
                onChange(option);
                setIsOpen(false);
              }}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

**封装的好处**：
- 使用简单：不需要了解内部实现
- 易于修改：内部实现变化不影响使用者
- 减少错误：避免外部直接操作内部状态

### 2. 复用（Reusability）

组件可以在不同地方重复使用：

```tsx
// 可复用的 Avatar 组件
interface AvatarProps {
  src: string;
  alt: string;
  size?: 'sm' | 'md' | 'lg';
  shape?: 'circle' | 'square';
  fallback?: string;
}

function Avatar({ 
  src, 
  alt, 
  size = 'md', 
  shape = 'circle',
  fallback 
}: AvatarProps) {
  const [error, setError] = useState(false);
  
  const sizeMap = { sm: 24, md: 40, lg: 64 };
  const dimension = sizeMap[size];
  
  return (
    <div
      className={`avatar avatar--${size} avatar--${shape}`}
      style={{ width: dimension, height: dimension }}
    >
      {error || !src ? (
        <span className="avatar__fallback">{fallback || alt[0]}</span>
      ) : (
        <img 
          src={src} 
          alt={alt} 
          onError={() => setError(true)}
        />
      )}
    </div>
  );
}

// 在不同场景复用
<Avatar src={user.avatar} alt={user.name} size="sm" />          // 导航栏
<Avatar src={user.avatar} alt={user.name} size="lg" />          // 个人中心
<Avatar src={user.avatar} alt={user.name} shape="square" />     // 企业logo
```

**复用的关键**：
- **合理的 props 设计**：提供足够的配置项
- **合理的默认值**：常见场景开箱即用
- **无业务耦合**：组件不依赖特定业务逻辑

### 3. 组合（Composition）

小组件可以组合成更复杂的组件：

```tsx
// 基础组件
function Card({ children, className }: CardProps) {
  return <div className={`card ${className || ''}`}>{children}</div>;
}

function CardHeader({ children }: { children: ReactNode }) {
  return <div className="card__header">{children}</div>;
}

function CardBody({ children }: { children: ReactNode }) {
  return <div className="card__body">{children}</div>;
}

function CardFooter({ children }: { children: ReactNode }) {
  return <div className="card__footer">{children}</div>;
}

// 组合使用
function UserCard({ user }: { user: User }) {
  return (
    <Card>
      <CardHeader>
        <Avatar src={user.avatar} alt={user.name} />
        <h3>{user.name}</h3>
      </CardHeader>
      <CardBody>
        <p>{user.bio}</p>
      </CardBody>
      <CardFooter>
        <Button variant="primary">关注</Button>
        <Button variant="secondary">发消息</Button>
      </CardFooter>
    </Card>
  );
}

// 另一种组合方式
function ProductCard({ product }: { product: Product }) {
  return (
    <Card>
      <CardBody>
        <img src={product.image} alt={product.name} />
        <h3>{product.name}</h3>
        <p className="price">{product.price}</p>
      </CardBody>
      <CardFooter>
        <Button>加入购物车</Button>
      </CardFooter>
    </Card>
  );
}
```

**组合的优势**：
- **灵活性**：可以自由组合不同的结构
- **可扩展性**：新增功能不需要修改基础组件
- **关注点分离**：每个组件只负责一件事

## 组件设计原则

### 单一职责

每个组件只做一件事：

```tsx
// ❌ 职责过多
function UserDashboard() {
  // 处理用户数据、订单数据、通知数据、统计数据...
  // 渲染头像、信息卡、订单列表、图表...
}

// ✅ 职责单一
function UserDashboard() {
  return (
    <div className="dashboard">
      <UserProfile />      {/* 只负责用户信息 */}
      <OrderList />        {/* 只负责订单列表 */}
      <NotificationPanel />{/* 只负责通知 */}
      <StatsChart />       {/* 只负责统计图表 */}
    </div>
  );
}
```

### 高内聚

相关的代码放在一起：

```
// ✅ 高内聚的组件目录结构
Button/
├── Button.tsx          # 组件逻辑
├── Button.module.css   # 组件样式
├── Button.test.tsx     # 组件测试
├── Button.stories.tsx  # 组件文档
└── index.ts            # 导出
```

### 低耦合

组件之间通过清晰的接口通信：

```tsx
// ❌ 高耦合：子组件直接修改父组件状态
function Parent() {
  const state = useParentState();
  return <Child parentState={state} />;
}

function Child({ parentState }) {
  // 直接修改父组件状态
  parentState.setItems([...]);
}

// ✅ 低耦合：通过回调通信
function Parent() {
  const [items, setItems] = useState([]);
  
  const handleItemAdd = (item: Item) => {
    setItems(prev => [...prev, item]);
  };
  
  return <Child onItemAdd={handleItemAdd} />;
}

function Child({ onItemAdd }: { onItemAdd: (item: Item) => void }) {
  // 通过回调通知父组件
  const handleClick = () => {
    onItemAdd({ id: 1, name: 'New Item' });
  };
  
  return <button onClick={handleClick}>Add</button>;
}
```

## 组件分类

### 按功能分类

| 类型 | 职责 | 示例 |
|------|------|------|
| 展示组件 | 只负责渲染 UI | Button, Card, Avatar |
| 容器组件 | 处理数据和逻辑 | UserContainer, CartPage |
| 布局组件 | 控制子组件排列 | Grid, Stack, Sidebar |
| 功能组件 | 提供特定功能 | Modal, Toast, Tooltip |

### 按复杂度分类

```
原子组件（Atoms）
├── Button
├── Input
├── Icon
└── Avatar

分子组件（Molecules）
├── SearchInput (Input + Button + Icon)
├── UserBadge (Avatar + Text)
└── MenuItem (Icon + Text)

有机体组件（Organisms）
├── Header (Logo + Nav + SearchInput + UserMenu)
├── ProductCard (Image + Title + Price + Button)
└── CommentSection (Comments + Form)

模板/页面（Templates/Pages）
├── HomePage
├── ProductPage
└── CheckoutPage
```

## 总结

组件的本质是**封装、复用和组合**：

1. **封装**：隐藏实现细节，暴露清晰接口
2. **复用**：同一组件在不同场景使用
3. **组合**：小组件组合成大组件

组件设计的核心原则：

1. **单一职责**：每个组件只做一件事
2. **高内聚**：相关代码放在一起
3. **低耦合**：通过 props 和回调通信
4. **可组合**：支持灵活的组合方式

好的组件设计让代码更易于理解、维护和扩展。
