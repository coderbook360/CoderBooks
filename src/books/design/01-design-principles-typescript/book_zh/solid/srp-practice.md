# SRP 实战：组件与服务的职责划分

> 单一职责原则的真正价值，在于它迫使我们思考：这段代码到底应该为谁服务？

## 为什么 SRP 在实践中如此困难？

理论上理解 SRP 很简单：一个类/模块只做一件事。但在实际开发中，我们常常面临这样的困境：

**困境一**：什么算"一件事"？

```typescript
// 这个组件做了几件事？
function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchUser(userId).then(setUser).finally(() => setLoading(false));
  }, [userId]);
  
  const handleSave = async (data: UpdateUserData) => {
    await updateUser(userId, data);
    // 重新获取用户数据
    const updated = await fetchUser(userId);
    setUser(updated);
  };
  
  if (loading) return <Spinner />;
  if (!user) return <Error message="User not found" />;
  
  return (
    <Form defaultValues={user} onSubmit={handleSave}>
      <Input name="name" label="姓名" />
      <Input name="email" label="邮箱" />
      <Button type="submit">保存</Button>
    </Form>
  );
}
```

这个组件同时处理了：数据获取、加载状态、错误处理、表单渲染、提交逻辑。这是一件事还是五件事？

**困境二**：过度拆分导致代码碎片化

```typescript
// 过度拆分：每个功能一个文件
// useUserFetch.ts
// useUserUpdate.ts  
// UserLoadingState.tsx
// UserErrorState.tsx
// UserForm.tsx
// UserSubmitHandler.ts

// 结果：一个简单的用户编辑功能，需要在6个文件之间跳转
```

## SRP 的核心原则：变化的原因

Robert C. Martin 的原话是："一个类应该只有一个引起它变化的原因"。

**关键洞察**：不是按功能拆分，而是按**变化的来源**拆分。

```typescript
// 思考：什么会导致这段代码变化？

// 1. UI 设计变更（设计师的需求）
// 2. 业务逻辑变更（产品经理的需求）
// 3. 数据格式变更（后端的需求）
// 4. 状态管理方式变更（技术选型的需求）

// 这四种变化应该不相互影响
```

## 实战模式一：展示与逻辑分离

**原则**：将 UI 渲染（展示）和业务逻辑分开。

### 反模式：混合组件

```typescript
// ❌ 展示和逻辑混在一起
function ProductCard({ productId }: { productId: string }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [inCart, setInCart] = useState(false);
  const cart = useCart();
  
  useEffect(() => {
    api.getProduct(productId).then(setProduct);
  }, [productId]);
  
  useEffect(() => {
    setInCart(cart.items.some(item => item.productId === productId));
  }, [cart.items, productId]);
  
  const handleAddToCart = () => {
    if (product && !inCart) {
      cart.add({
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: 1
      });
    }
  };
  
  if (!product) return <Skeleton />;
  
  return (
    <div className="product-card">
      <img src={product.image} alt={product.name} />
      <h3>{product.name}</h3>
      <p className="price">${product.price}</p>
      <button onClick={handleAddToCart} disabled={inCart}>
        {inCart ? '已在购物车' : '加入购物车'}
      </button>
    </div>
  );
}
```

### 正确模式：分层组件

```typescript
// ✅ 逻辑层：处理数据和状态
function useProductCard(productId: string) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const cart = useCart();
  
  const inCart = useMemo(
    () => cart.items.some(item => item.productId === productId),
    [cart.items, productId]
  );
  
  useEffect(() => {
    setLoading(true);
    api.getProduct(productId)
      .then(setProduct)
      .finally(() => setLoading(false));
  }, [productId]);
  
  const addToCart = useCallback(() => {
    if (product && !inCart) {
      cart.add({
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: 1
      });
    }
  }, [product, inCart, cart]);
  
  return { product, loading, inCart, addToCart };
}

// ✅ 展示层：只负责渲染
interface ProductCardViewProps {
  product: Product;
  inCart: boolean;
  onAddToCart: () => void;
}

function ProductCardView({ product, inCart, onAddToCart }: ProductCardViewProps) {
  return (
    <div className="product-card">
      <img src={product.image} alt={product.name} />
      <h3>{product.name}</h3>
      <p className="price">${product.price}</p>
      <button onClick={onAddToCart} disabled={inCart}>
        {inCart ? '已在购物车' : '加入购物车'}
      </button>
    </div>
  );
}

// ✅ 容器层：组合逻辑和展示
function ProductCard({ productId }: { productId: string }) {
  const { product, loading, inCart, addToCart } = useProductCard(productId);
  
  if (loading) return <ProductCardSkeleton />;
  if (!product) return null;
  
  return (
    <ProductCardView 
      product={product} 
      inCart={inCart} 
      onAddToCart={addToCart} 
    />
  );
}
```

**收益**：
- UI 变更只影响 `ProductCardView`
- 业务逻辑变更只影响 `useProductCard`
- 两者可以独立测试

## 实战模式二：服务层职责划分

**原则**：每个服务只处理一类业务领域。

### 反模式：上帝服务

```typescript
// ❌ 什么都做的服务
class UserService {
  async register(data: RegisterData) { /* ... */ }
  async login(credentials: Credentials) { /* ... */ }
  async logout() { /* ... */ }
  async getProfile(userId: string) { /* ... */ }
  async updateProfile(userId: string, data: ProfileData) { /* ... */ }
  async getOrders(userId: string) { /* ... */ }
  async getNotifications(userId: string) { /* ... */ }
  async updateNotificationSettings(userId: string, settings: NotificationSettings) { /* ... */ }
  async changePassword(userId: string, passwords: PasswordChange) { /* ... */ }
  async requestPasswordReset(email: string) { /* ... */ }
  async deleteAccount(userId: string) { /* ... */ }
}
```

### 正确模式：领域划分

```typescript
// ✅ 认证服务：处理身份验证
class AuthService {
  async register(data: RegisterData): Promise<AuthResult> { /* ... */ }
  async login(credentials: Credentials): Promise<AuthResult> { /* ... */ }
  async logout(): Promise<void> { /* ... */ }
  async refreshToken(token: string): Promise<AuthResult> { /* ... */ }
}

// ✅ 用户资料服务：处理用户信息
class ProfileService {
  async getProfile(userId: string): Promise<UserProfile> { /* ... */ }
  async updateProfile(userId: string, data: ProfileData): Promise<UserProfile> { /* ... */ }
  async uploadAvatar(userId: string, file: File): Promise<string> { /* ... */ }
}

// ✅ 密码服务：处理密码相关操作
class PasswordService {
  async changePassword(userId: string, data: PasswordChange): Promise<void> { /* ... */ }
  async requestReset(email: string): Promise<void> { /* ... */ }
  async confirmReset(token: string, newPassword: string): Promise<void> { /* ... */ }
}

// ✅ 通知服务：处理通知设置
class NotificationService {
  async getSettings(userId: string): Promise<NotificationSettings> { /* ... */ }
  async updateSettings(userId: string, settings: NotificationSettings): Promise<void> { /* ... */ }
  async getNotifications(userId: string): Promise<Notification[]> { /* ... */ }
}
```

## 实战模式三：API 层与业务层分离

**原则**：数据获取和业务处理分开。

```typescript
// ✅ API 层：只负责 HTTP 通信
class OrderAPI {
  private client: HttpClient;
  
  constructor(client: HttpClient) {
    this.client = client;
  }
  
  async create(data: CreateOrderRequest): Promise<OrderResponse> {
    return this.client.post('/orders', data);
  }
  
  async getById(orderId: string): Promise<OrderResponse> {
    return this.client.get(`/orders/${orderId}`);
  }
  
  async updateStatus(orderId: string, status: OrderStatus): Promise<OrderResponse> {
    return this.client.patch(`/orders/${orderId}/status`, { status });
  }
}

// ✅ 业务层：负责业务逻辑和数据转换
class OrderService {
  constructor(
    private api: OrderAPI,
    private cartService: CartService,
    private paymentService: PaymentService
  ) {}
  
  async createFromCart(paymentMethod: PaymentMethod): Promise<Order> {
    // 1. 获取购物车数据
    const cart = await this.cartService.getCart();
    
    // 2. 验证库存（业务规则）
    await this.validateStock(cart.items);
    
    // 3. 计算价格（业务规则）
    const pricing = this.calculatePricing(cart);
    
    // 4. 创建订单
    const orderData = this.mapCartToOrder(cart, pricing, paymentMethod);
    const response = await this.api.create(orderData);
    
    // 5. 清空购物车
    await this.cartService.clear();
    
    // 6. 转换为领域模型
    return this.mapResponseToOrder(response);
  }
  
  private validateStock(items: CartItem[]): Promise<void> { /* ... */ }
  private calculatePricing(cart: Cart): Pricing { /* ... */ }
  private mapCartToOrder(cart: Cart, pricing: Pricing, method: PaymentMethod): CreateOrderRequest { /* ... */ }
  private mapResponseToOrder(response: OrderResponse): Order { /* ... */ }
}
```

## 判断职责是否单一的方法

### 方法一：描述测试

尝试用一句话描述这个类/函数的职责，如果句子中包含"和"、"或者"、"同时"，可能职责过多。

```typescript
// ❌ "这个组件负责获取用户数据、验证表单、提交数据并显示结果"
// ✅ "这个 Hook 负责管理用户数据的获取和更新"
// ✅ "这个组件负责渲染用户编辑表单"
```

### 方法二：变化来源测试

问自己：哪些人/原因会要求修改这段代码？

```typescript
// 如果答案是：
// - 设计师想修改 UI → 应该只影响展示组件
// - 产品经理想修改业务规则 → 应该只影响业务逻辑
// - 后端修改 API 格式 → 应该只影响 API 层

// 如果一个修改需要同时改动多处，说明职责没有分离好
```

### 方法三：测试难度测试

如果一个函数/类很难写单元测试，通常说明职责过多：

```typescript
// ❌ 难以测试：需要 mock 太多东西
test('UserProfile', () => {
  // 需要 mock: fetch, localStorage, router, toast...
});

// ✅ 容易测试：依赖少，职责单一
test('calculateTotalPrice', () => {
  const result = calculateTotalPrice(items, discount);
  expect(result).toBe(expectedPrice);
});
```

## 总结

SRP 实战的核心要点：

1. **按变化来源拆分**，而不是按功能拆分
2. **展示与逻辑分离**：UI 组件不应该包含业务逻辑
3. **服务按领域划分**：每个服务对应一个业务领域
4. **API 与业务分离**：数据获取和业务处理独立
5. **适度拆分**：避免过度拆分导致的代码碎片化

记住：**SRP 不是要把代码拆得越细越好，而是要让每个模块都有清晰的责任边界。**
