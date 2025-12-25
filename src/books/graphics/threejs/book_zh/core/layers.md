# Layers 图层系统

> "Layers 通过位掩码实现高效的对象过滤和选择性渲染。"

## Layers 概述

Layers 使用 32 位掩码管理对象可见性：

```
Layer 0:  00000000 00000000 00000000 00000001
Layer 1:  00000000 00000000 00000000 00000010
Layer 2:  00000000 00000000 00000000 00000100
Layer 31: 10000000 00000000 00000000 00000000
```

## 完整实现

```typescript
// src/core/Layers.ts
export class Layers {
  mask: number;
  
  constructor() {
    this.mask = 1; // 默认在图层 0
  }
  
  set(channel: number): void {
    this.mask = (1 << channel) >>> 0;
  }
  
  enable(channel: number): void {
    this.mask |= (1 << channel) >>> 0;
  }
  
  enableAll(): void {
    this.mask = 0xffffffff;
  }
  
  toggle(channel: number): void {
    this.mask ^= (1 << channel) >>> 0;
  }
  
  disable(channel: number): void {
    this.mask &= ~((1 << channel) >>> 0);
  }
  
  disableAll(): void {
    this.mask = 0;
  }
  
  test(layers: Layers): boolean {
    return (this.mask & layers.mask) !== 0;
  }
  
  isEnabled(channel: number): boolean {
    return (this.mask & ((1 << channel) >>> 0)) !== 0;
  }
}
```

## 位运算说明

### set - 设置单一图层

```typescript
set(channel: number): void {
  this.mask = (1 << channel) >>> 0;
}

// 示例
layers.set(2);
// 1 << 2 = 00000100
// mask = 4
```

### enable - 启用图层

```typescript
enable(channel: number): void {
  this.mask |= (1 << channel) >>> 0;
}

// 示例
// mask = 00000001 (图层 0)
layers.enable(2);
// 1 << 2 = 00000100
// 00000001 | 00000100 = 00000101
// mask = 5 (图层 0 和 2)
```

### disable - 禁用图层

```typescript
disable(channel: number): void {
  this.mask &= ~((1 << channel) >>> 0);
}

// 示例
// mask = 00000101 (图层 0 和 2)
layers.disable(2);
// 1 << 2 = 00000100
// ~00000100 = 11111011
// 00000101 & 11111011 = 00000001
// mask = 1 (仅图层 0)
```

### toggle - 切换图层

```typescript
toggle(channel: number): void {
  this.mask ^= (1 << channel) >>> 0;
}

// 示例
// mask = 00000101
layers.toggle(2);
// 00000101 ^ 00000100 = 00000001

// 再次调用
layers.toggle(2);
// 00000001 ^ 00000100 = 00000101
```

### test - 测试重叠

```typescript
test(layers: Layers): boolean {
  return (this.mask & layers.mask) !== 0;
}

// 示例
const camera = new Layers();
camera.mask = 0b00000101; // 图层 0 和 2

const object = new Layers();
object.mask = 0b00000010; // 图层 1

camera.test(object); // false (无重叠)

object.enable(2);
// object.mask = 0b00000110

camera.test(object); // true (图层 2 重叠)
```

## 使用场景

### 选择性渲染

```typescript
// 设置相机图层
camera.layers.set(0); // 只看图层 0
camera.layers.enable(1); // 也看图层 1

// 设置对象图层
const ui = new Mesh(uiGeometry, uiMaterial);
ui.layers.set(1); // UI 在图层 1

const world = new Mesh(worldGeometry, worldMaterial);
world.layers.set(0); // 世界在图层 0

const debug = new Mesh(debugGeometry, debugMaterial);
debug.layers.set(2); // 调试在图层 2

// 相机只渲染图层 0 和 1
// debug 对象不会被渲染
```

### 射线检测过滤

```typescript
const raycaster = new Raycaster();

// 只检测图层 0 的对象
raycaster.layers.set(0);

// 检测图层 0 和图层 2
raycaster.layers.enable(2);

// 射线检测会忽略不在这些图层的对象
const intersects = raycaster.intersectObjects(scene.children);
```

### 多相机渲染

```typescript
// 主相机 - 渲染游戏世界
const mainCamera = new PerspectiveCamera(75, aspect, 0.1, 1000);
mainCamera.layers.set(0);

// UI 相机 - 渲染 UI
const uiCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 10);
uiCamera.layers.set(1);

// 调试相机 - 渲染调试信息
const debugCamera = new PerspectiveCamera(75, aspect, 0.1, 1000);
debugCamera.layers.set(2);

// 渲染
function render() {
  // 清除一次
  renderer.clear();
  
  // 主场景
  renderer.render(scene, mainCamera);
  
  // UI（不清除深度）
  renderer.clearDepth();
  renderer.render(scene, uiCamera);
  
  // 调试（如果启用）
  if (showDebug) {
    renderer.clearDepth();
    renderer.render(scene, debugCamera);
  }
}
```

### 阴影过滤

```typescript
// 设置光源图层
const light = new DirectionalLight(0xffffff, 1);
light.layers.enable(0);
light.layers.enable(1);

// 不投射阴影的对象
const particle = new Mesh(particleGeometry, particleMaterial);
particle.layers.set(2);
particle.castShadow = false;
```

## 图层管理器

```typescript
class LayerManager {
  private static LAYER_NAMES: string[] = [];
  
  static registerLayer(index: number, name: string): void {
    if (index < 0 || index > 31) {
      throw new Error('Layer index must be between 0 and 31');
    }
    this.LAYER_NAMES[index] = name;
  }
  
  static getLayerIndex(name: string): number {
    return this.LAYER_NAMES.indexOf(name);
  }
  
  static getLayerName(index: number): string {
    return this.LAYER_NAMES[index] || `Layer ${index}`;
  }
}

// 定义图层
const LAYERS = {
  DEFAULT: 0,
  UI: 1,
  DEBUG: 2,
  PLAYER: 3,
  ENEMIES: 4,
  TERRAIN: 5,
  PARTICLES: 6,
  INVISIBLE: 31,
} as const;

// 注册名称
LayerManager.registerLayer(LAYERS.DEFAULT, 'Default');
LayerManager.registerLayer(LAYERS.UI, 'UI');
LayerManager.registerLayer(LAYERS.DEBUG, 'Debug');
LayerManager.registerLayer(LAYERS.PLAYER, 'Player');
LayerManager.registerLayer(LAYERS.ENEMIES, 'Enemies');
LayerManager.registerLayer(LAYERS.TERRAIN, 'Terrain');
LayerManager.registerLayer(LAYERS.PARTICLES, 'Particles');
LayerManager.registerLayer(LAYERS.INVISIBLE, 'Invisible');

// 使用
player.layers.set(LAYERS.PLAYER);
enemy.layers.set(LAYERS.ENEMIES);

// 敌人只能看到玩家
enemyRaycaster.layers.set(LAYERS.PLAYER);
```

## 图层工具函数

```typescript
class LayerUtils {
  // 获取所有启用的图层
  static getEnabledLayers(layers: Layers): number[] {
    const enabled: number[] = [];
    
    for (let i = 0; i < 32; i++) {
      if (layers.isEnabled(i)) {
        enabled.push(i);
      }
    }
    
    return enabled;
  }
  
  // 从图层数组创建掩码
  static fromArray(channels: number[]): Layers {
    const layers = new Layers();
    layers.mask = 0;
    
    for (const channel of channels) {
      layers.enable(channel);
    }
    
    return layers;
  }
  
  // 合并多个图层
  static merge(...layersList: Layers[]): Layers {
    const result = new Layers();
    result.mask = 0;
    
    for (const layers of layersList) {
      result.mask |= layers.mask;
    }
    
    return result;
  }
  
  // 获取图层交集
  static intersect(...layersList: Layers[]): Layers {
    const result = new Layers();
    result.mask = 0xffffffff;
    
    for (const layers of layersList) {
      result.mask &= layers.mask;
    }
    
    return result;
  }
  
  // 掩码转字符串
  static toString(layers: Layers): string {
    return layers.mask.toString(2).padStart(32, '0');
  }
}
```

## 渲染器中的图层检查

```typescript
// WebGLRenderer 简化版
class WebGLRenderer {
  render(scene: Scene, camera: Camera): void {
    // 遍历场景
    scene.traverseVisible((object) => {
      // 图层测试
      if (!object.layers.test(camera.layers)) {
        return; // 跳过不在相机图层的对象
      }
      
      // 渲染对象
      this.renderObject(object, camera);
    });
  }
}

// Raycaster 简化版
class Raycaster {
  intersectObject(
    object: Object3D,
    recursive: boolean,
    intersects: Intersection[]
  ): void {
    // 图层测试
    if (!object.layers.test(this.layers)) {
      return;
    }
    
    object.raycast(this, intersects);
    
    if (recursive) {
      const children = object.children;
      
      for (const child of children) {
        this.intersectObject(child, true, intersects);
      }
    }
  }
}
```

## 性能优势

```typescript
// 位运算比数组操作更快

// 不好 - 使用数组
class SlowLayers {
  channels: number[] = [0];
  
  test(other: SlowLayers): boolean {
    for (const channel of this.channels) {
      if (other.channels.includes(channel)) {
        return true;
      }
    }
    return false;
  }
}

// 好 - 使用位掩码
class FastLayers {
  mask = 1;
  
  test(other: FastLayers): boolean {
    return (this.mask & other.mask) !== 0;
  }
}

// 位运算是 O(1)，数组查找是 O(n)
```

## 本章小结

- Layers 使用 32 位掩码管理图层
- 支持 32 个图层（0-31）
- 位运算实现高效的启用/禁用/测试
- 用于选择性渲染和射线检测过滤
- 多相机可以有不同的图层配置
- O(1) 时间复杂度的图层测试

下一章，我们将学习 WebGL 渲染基础。
