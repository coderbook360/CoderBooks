# 适配器模式：接口转换与兼容

> 适配器模式让不兼容的接口能够协同工作——它是解决接口不匹配问题的桥梁。

## 从一个真实问题说起

假设你正在开发一个地图应用，最初使用的是 Google Maps API：

```typescript
// 现有代码深度依赖 Google Maps API
class LocationService {
  private map: GoogleMap;
  
  showLocation(lat: number, lng: number) {
    this.map.setCenter(new google.maps.LatLng(lat, lng));
    this.map.addMarker({
      position: { lat, lng },
      map: this.map
    });
  }
  
  calculateRoute(from: Coordinates, to: Coordinates) {
    const directionsService = new google.maps.DirectionsService();
    return directionsService.route({
      origin: from,
      destination: to,
      travelMode: google.maps.TravelMode.DRIVING
    });
  }
}
```

现在，由于成本或功能需求，需要支持切换到高德地图。问题来了：两个 API 的接口完全不同！

```typescript
// Google Maps
google.maps.LatLng(lat, lng)
map.setCenter(latLng)
map.addMarker({ position, map })

// 高德地图
new AMap.LngLat(lng, lat)  // 注意：参数顺序不同！
map.setCenter(lngLat)
new AMap.Marker({ position: lngLat, map })
```

**这就是适配器模式要解决的问题：如何在不修改现有代码的情况下，让两个不兼容的接口协同工作？**

## 适配器模式的核心思想

适配器模式的核心是：**创建一个中间层，将一个接口转换成另一个接口**。

就像生活中的电源适配器：你的笔记本需要 19V 电压，但插座提供的是 220V，适配器负责转换电压。

## 基础实现

### 步骤一：定义统一接口

首先，定义一个与具体地图服务无关的抽象接口：

```typescript
// 统一的地图接口
interface MapService {
  setCenter(lat: number, lng: number): void;
  addMarker(lat: number, lng: number, options?: MarkerOptions): Marker;
  removeMarker(marker: Marker): void;
  calculateRoute(from: Coordinates, to: Coordinates): Promise<Route>;
  getZoom(): number;
  setZoom(level: number): void;
}

interface Coordinates {
  lat: number;
  lng: number;
}

interface MarkerOptions {
  title?: string;
  icon?: string;
  draggable?: boolean;
}

interface Marker {
  id: string;
  position: Coordinates;
  remove(): void;
}

interface Route {
  distance: number;  // 米
  duration: number;  // 秒
  points: Coordinates[];
}
```

### 步骤二：创建 Google Maps 适配器

```typescript
class GoogleMapsAdapter implements MapService {
  private map: google.maps.Map;
  private markers: Map<string, google.maps.Marker> = new Map();
  
  constructor(container: HTMLElement, options?: MapOptions) {
    this.map = new google.maps.Map(container, {
      center: { lat: options?.center?.lat ?? 0, lng: options?.center?.lng ?? 0 },
      zoom: options?.zoom ?? 10
    });
  }
  
  setCenter(lat: number, lng: number): void {
    // 将统一接口转换为 Google Maps 特有的调用
    this.map.setCenter(new google.maps.LatLng(lat, lng));
  }
  
  addMarker(lat: number, lng: number, options?: MarkerOptions): Marker {
    const id = crypto.randomUUID();
    
    // 创建 Google Maps 原生 marker
    const googleMarker = new google.maps.Marker({
      position: { lat, lng },
      map: this.map,
      title: options?.title,
      icon: options?.icon,
      draggable: options?.draggable
    });
    
    this.markers.set(id, googleMarker);
    
    // 返回统一的 Marker 接口
    return {
      id,
      position: { lat, lng },
      remove: () => {
        googleMarker.setMap(null);
        this.markers.delete(id);
      }
    };
  }
  
  removeMarker(marker: Marker): void {
    const googleMarker = this.markers.get(marker.id);
    if (googleMarker) {
      googleMarker.setMap(null);
      this.markers.delete(marker.id);
    }
  }
  
  async calculateRoute(from: Coordinates, to: Coordinates): Promise<Route> {
    const directionsService = new google.maps.DirectionsService();
    
    const result = await directionsService.route({
      origin: from,
      destination: to,
      travelMode: google.maps.TravelMode.DRIVING
    });
    
    const route = result.routes[0];
    const leg = route.legs[0];
    
    // 将 Google Maps 格式转换为统一格式
    return {
      distance: leg.distance?.value ?? 0,
      duration: leg.duration?.value ?? 0,
      points: route.overview_path.map(point => ({
        lat: point.lat(),
        lng: point.lng()
      }))
    };
  }
  
  getZoom(): number {
    return this.map.getZoom() ?? 10;
  }
  
  setZoom(level: number): void {
    this.map.setZoom(level);
  }
}
```

### 步骤三：创建高德地图适配器

```typescript
class AMapAdapter implements MapService {
  private map: AMap.Map;
  private markers: Map<string, AMap.Marker> = new Map();
  
  constructor(container: HTMLElement, options?: MapOptions) {
    this.map = new AMap.Map(container, {
      center: options?.center 
        ? new AMap.LngLat(options.center.lng, options.center.lat)  // 注意顺序
        : undefined,
      zoom: options?.zoom ?? 10
    });
  }
  
  setCenter(lat: number, lng: number): void {
    // 高德地图使用 LngLat，参数顺序是 (lng, lat)
    this.map.setCenter(new AMap.LngLat(lng, lat));
  }
  
  addMarker(lat: number, lng: number, options?: MarkerOptions): Marker {
    const id = crypto.randomUUID();
    
    // 创建高德地图原生 marker
    const aMarker = new AMap.Marker({
      position: new AMap.LngLat(lng, lat),
      title: options?.title,
      icon: options?.icon,
      draggable: options?.draggable
    });
    
    aMarker.setMap(this.map);
    this.markers.set(id, aMarker);
    
    return {
      id,
      position: { lat, lng },
      remove: () => {
        aMarker.setMap(null);
        this.markers.delete(id);
      }
    };
  }
  
  removeMarker(marker: Marker): void {
    const aMarker = this.markers.get(marker.id);
    if (aMarker) {
      aMarker.setMap(null);
      this.markers.delete(marker.id);
    }
  }
  
  async calculateRoute(from: Coordinates, to: Coordinates): Promise<Route> {
    return new Promise((resolve, reject) => {
      const driving = new AMap.Driving({ map: this.map });
      
      driving.search(
        new AMap.LngLat(from.lng, from.lat),
        new AMap.LngLat(to.lng, to.lat),
        (status: string, result: any) => {
          if (status === 'complete') {
            const route = result.routes[0];
            resolve({
              distance: route.distance,
              duration: route.time,
              points: route.steps.flatMap((step: any) =>
                step.path.map((p: any) => ({
                  lat: p.getLat(),
                  lng: p.getLng()
                }))
              )
            });
          } else {
            reject(new Error('Route calculation failed'));
          }
        }
      );
    });
  }
  
  getZoom(): number {
    return this.map.getZoom();
  }
  
  setZoom(level: number): void {
    this.map.setZoom(level);
  }
}
```

### 步骤四：使用工厂创建适配器

```typescript
type MapProvider = 'google' | 'amap' | 'mapbox';

class MapServiceFactory {
  static create(
    provider: MapProvider, 
    container: HTMLElement, 
    options?: MapOptions
  ): MapService {
    switch (provider) {
      case 'google':
        return new GoogleMapsAdapter(container, options);
      case 'amap':
        return new AMapAdapter(container, options);
      case 'mapbox':
        return new MapboxAdapter(container, options);
      default:
        throw new Error(`Unsupported map provider: ${provider}`);
    }
  }
}

// 使用：业务代码完全不关心底层使用的是哪个地图服务
const mapService = MapServiceFactory.create(
  config.mapProvider,  // 从配置读取
  document.getElementById('map')!,
  { center: { lat: 39.9, lng: 116.4 }, zoom: 12 }
);

// 统一的调用方式
mapService.setCenter(39.9, 116.4);
mapService.addMarker(39.9, 116.4, { title: '北京' });
const route = await mapService.calculateRoute(
  { lat: 39.9, lng: 116.4 },
  { lat: 31.2, lng: 121.4 }
);
```

## 适配器模式的典型应用场景

### 场景一：第三方 SDK 封装

```typescript
// 不同的支付 SDK 有不同的接口
// 支付宝 SDK
alipay.tradePay({ orderStr: '...' });

// 微信支付 SDK
wx.chooseWXPay({
  timestamp: '',
  nonceStr: '',
  package: '',
  signType: 'MD5',
  paySign: ''
});

// 统一支付接口
interface PaymentService {
  pay(order: PaymentOrder): Promise<PaymentResult>;
}

class AlipayAdapter implements PaymentService {
  async pay(order: PaymentOrder): Promise<PaymentResult> {
    const orderStr = this.buildOrderString(order);
    const result = await alipay.tradePay({ orderStr });
    return this.mapResult(result);
  }
}

class WechatPayAdapter implements PaymentService {
  async pay(order: PaymentOrder): Promise<PaymentResult> {
    const config = await this.getWechatConfig(order);
    const result = await wx.chooseWXPay(config);
    return this.mapResult(result);
  }
}
```

### 场景二：数据格式转换

```typescript
// 后端返回的数据格式
interface APIUser {
  user_id: number;
  user_name: string;
  created_at: string;
  is_active: boolean;
}

// 前端期望的数据格式
interface User {
  id: string;
  name: string;
  createdAt: Date;
  isActive: boolean;
}

// 适配器函数
function adaptUser(apiUser: APIUser): User {
  return {
    id: String(apiUser.user_id),
    name: apiUser.user_name,
    createdAt: new Date(apiUser.created_at),
    isActive: apiUser.is_active
  };
}

// 批量适配
function adaptUsers(apiUsers: APIUser[]): User[] {
  return apiUsers.map(adaptUser);
}
```

### 场景三：旧系统迁移

```typescript
// 旧的事件系统（需要继续支持）
class LegacyEventBus {
  on(event: string, handler: Function) { /* ... */ }
  off(event: string, handler: Function) { /* ... */ }
  trigger(event: string, data: any) { /* ... */ }
}

// 新的类型安全事件系统
interface TypedEventEmitter<Events extends Record<string, any>> {
  on<K extends keyof Events>(event: K, handler: (data: Events[K]) => void): void;
  off<K extends keyof Events>(event: K, handler: (data: Events[K]) => void): void;
  emit<K extends keyof Events>(event: K, data: Events[K]): void;
}

// 适配器：让新系统可以使用旧的事件总线
class LegacyEventBusAdapter<Events extends Record<string, any>> 
  implements TypedEventEmitter<Events> {
  
  constructor(private legacy: LegacyEventBus) {}
  
  on<K extends keyof Events>(event: K, handler: (data: Events[K]) => void): void {
    this.legacy.on(event as string, handler);
  }
  
  off<K extends keyof Events>(event: K, handler: (data: Events[K]) => void): void {
    this.legacy.off(event as string, handler);
  }
  
  emit<K extends keyof Events>(event: K, data: Events[K]): void {
    this.legacy.trigger(event as string, data);
  }
}
```

## 对象适配器 vs 类适配器

### 对象适配器（推荐）

通过组合方式，持有被适配对象的引用：

```typescript
class ObjectAdapter implements Target {
  private adaptee: Adaptee;
  
  constructor(adaptee: Adaptee) {
    this.adaptee = adaptee;
  }
  
  request(): void {
    // 调用被适配对象的方法
    this.adaptee.specificRequest();
  }
}
```

**优点**：
- 更灵活，可以适配 Adaptee 的任何子类
- 符合组合优于继承原则
- 运行时可以替换被适配对象

### 类适配器

通过继承方式，同时继承目标接口和被适配类：

```typescript
// TypeScript 不支持多重继承，只能用 mixin 或 implements + extends
class ClassAdapter extends Adaptee implements Target {
  request(): void {
    // 直接调用继承的方法
    this.specificRequest();
  }
}
```

**缺点**：
- TypeScript/JavaScript 不支持多重继承
- 耦合度高，不够灵活

## 最佳实践

1. **优先使用对象适配器**：更灵活，耦合度低
2. **定义清晰的目标接口**：适配器的目的是统一接口
3. **适配器应该足够薄**：只做接口转换，不包含业务逻辑
4. **考虑使用工厂模式**：动态创建合适的适配器

## 适配器模式 vs 其他模式

| 模式 | 目的 | 区别 |
|------|------|------|
| 适配器 | 接口转换 | 让不兼容的接口协同工作 |
| 装饰器 | 功能增强 | 在不改变接口的情况下添加功能 |
| 代理 | 访问控制 | 控制对对象的访问 |
| 外观 | 简化接口 | 提供简化的统一接口 |

## 总结

适配器模式是解决接口不兼容问题的经典方案：

1. **核心思想**：创建中间层进行接口转换
2. **典型场景**：第三方 SDK 封装、数据格式转换、旧系统迁移
3. **实现要点**：定义目标接口、创建适配器类、使用组合而非继承
4. **注意事项**：适配器应该保持简单，只做转换不做业务逻辑

适配器模式让我们能够**复用现有代码**，**隔离外部依赖**，使系统更加灵活和可维护。
