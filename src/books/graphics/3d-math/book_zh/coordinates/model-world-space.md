# 模型空间与世界空间

当你在 3D 建模软件中创建一个立方体，它的顶点坐标可能是：

```javascript
const vertices = [
  [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
  [-1, -1,  1], [1, -1,  1], [1, 1,  1], [-1, 1,  1]
];
```

这个立方体的中心在原点 (0, 0, 0)，边长为 2。

但在游戏场景中，你可能需要将这个立方体放在位置 (5, 0, 10)，并旋转 45°。这时顶点坐标显然不再是 (-1, -1, -1) 了。

这就是**坐标空间变换**的问题。

## 什么是模型空间

首先要问一个问题：为什么要定义多个坐标空间？

**模型空间**（Model Space，也叫**对象空间** Object Space 或**局部空间** Local Space）是建模时使用的坐标系统。

特点：
- 原点通常在模型的**几何中心**或**底部中心**
- 坐标值相对简单（例如立方体顶点是 ±1）
- **与模型定义绑定**，不随场景中的位置改变

示例：
- 一个人物模型：原点在脚底，身高 1.8（从 y=0 到 y=1.8）
- 一个球体：原点在球心，半径 1
- 一个飞机：原点在机身中心，机头朝向 +z 方向

## 什么是世界空间

**世界空间**（World Space）是场景中的**全局坐标系统**。

特点：
- 原点在场景的**固定位置**（通常是 (0, 0, 0)）
- 所有对象的位置都相对于这个统一坐标系
- **与相机、光源共用**同一个坐标系

示例：
- 模型A在世界空间位置 (5, 0, 10)
- 模型B在世界空间位置 (-3, 0, 8)
- 相机在世界空间位置 (0, 2, -10)

## 为什么需要两个空间

想象一下如果只有世界空间会怎样：

### 问题1：重复使用模型

你有一个树的模型，需要在场景中放置 100 棵树。如果没有模型空间：

```javascript
// 每棵树都要存储不同的顶点坐标
const tree1Vertices = [/* 位置(5,0,10)的顶点 */];
const tree2Vertices = [/* 位置(8,0,12)的顶点 */];
// ... 100 份顶点数据
```

这太浪费了！

有了模型空间：

```javascript
// 只存储一份模型
const treeModel = [/* 模型空间顶点 */];

// 用变换矩阵指定位置
const tree1Matrix = translate(5, 0, 10);
const tree2Matrix = translate(8, 0, 12);
// ... 100 个变换矩阵
```

### 问题2：动画和变形

如果手臂模型直接存储世界坐标，身体旋转时，手臂的每个顶点都要重新计算。

使用模型空间：手臂顶点不变，只改变变换矩阵。

## 从模型空间到世界空间

转换过程：应用**世界变换矩阵**（World Matrix，也叫**模型矩阵** Model Matrix）。

$$
\mathbf{v}_{\text{world}} = \mathbf{M}_{\text{world}} \cdot \mathbf{v}_{\text{model}}
$$

世界矩阵通常是三种基本变换的组合：

$$
\mathbf{M}_{\text{world}} = \mathbf{T} \cdot \mathbf{R} \cdot \mathbf{S}
$$

- $\mathbf{T}$：平移矩阵（Translation）
- $\mathbf{R}$：旋转矩阵（Rotation）
- $\mathbf{S}$：缩放矩阵（Scale）

### 代码示例：最简版本

```javascript
class Transform {
  constructor() {
    this.position = { x: 0, y: 0, z: 0 };
    this.rotation = { x: 0, y: 0, z: 0 }; // 欧拉角
    this.scale = { x: 1, y: 1, z: 1 };
  }

  // 生成世界矩阵
  getWorldMatrix() {
    const T = createTranslation(this.position);
    const R = createRotation(this.rotation);
    const S = createScale(this.scale);
    
    // 注意顺序：先缩放，再旋转，最后平移
    return multiply(T, multiply(R, S));
  }
}
```

### 变换顺序的重要性

顺序不同，结果完全不同！

**正确顺序：S → R → T**

```javascript
// 先缩放2倍，再绕Y轴旋转45°，最后平移到(5,0,10)
const M = multiply(T, multiply(R, S));
```

为什么？
- **缩放**：在模型空间中缩放，相对于模型原点
- **旋转**：在模型空间中旋转，相对于模型原点
- **平移**：移动到世界空间中的目标位置

如果先平移再旋转：

```javascript
// 错误：先平移到(5,0,10)，再旋转
const MWrong = multiply(R, T);
```

结果：模型会绕世界原点旋转，而不是绕自身旋转！

### 完整代码示例

```javascript
// 创建变换矩阵的辅助函数
function createTranslation(x, y, z) {
  return [
    1, 0, 0, x,
    0, 1, 0, y,
    0, 0, 1, z,
    0, 0, 0, 1
  ];
}

function createScale(sx, sy, sz) {
  return [
    sx, 0,  0,  0,
    0,  sy, 0,  0,
    0,  0,  sz, 0,
    0,  0,  0,  1
  ];
}

function createRotationY(angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [
     c, 0, s, 0,
     0, 1, 0, 0,
    -s, 0, c, 0,
     0, 0, 0, 1
  ];
}

// 变换立方体顶点
const cubeModel = [
  [-1, -1, -1, 1],
  [ 1, -1, -1, 1],
  [ 1,  1, -1, 1],
  [-1,  1, -1, 1]
];

// 世界变换：位置(5,0,10)，旋转45°，缩放2倍
const S = createScale(2, 2, 2);
const R = createRotationY(Math.PI / 4);
const T = createTranslation(5, 0, 10);
const worldMatrix = multiply(T, multiply(R, S));

// 变换所有顶点
const worldVertices = cubeModel.map(v => 
  multiplyMatrixVector(worldMatrix, v)
);

console.log(worldVertices[0]); 
// 原本 (-1, -1, -1)
// 缩放 → (-2, -2, -2)
// 旋转45° → 约 (-2.83, -2, 0)
// 平移 → 约 (2.17, -2, 10)
```

## 实际应用场景

### 场景1：实例化渲染

渲染 1000 个相同的树：

```javascript
const treeModel = loadModel('tree.obj'); // 模型空间顶点

const positions = [
  { x: 5, y: 0, z: 10 },
  { x: 8, y: 0, z: 12 },
  // ... 1000个位置
];

positions.forEach(pos => {
  const worldMatrix = createTranslation(pos.x, pos.y, pos.z);
  drawModel(treeModel, worldMatrix);
});
```

GPU 可以使用**实例化绘制**（Instanced Rendering）优化这个过程，传递 1000 个矩阵但只传递 1 份顶点数据。

### 场景2：层级变换

父子对象的嵌套变换：

```javascript
// 人物身体
const body = new Transform();
body.position = { x: 0, y: 0, z: 0 };

// 手臂（相对于身体）
const arm = new Transform();
arm.position = { x: 1, y: 0.5, z: 0 }; // 相对身体偏移

// 手臂的世界矩阵 = 身体世界矩阵 × 手臂局部矩阵
const armWorldMatrix = multiply(
  body.getWorldMatrix(), 
  arm.getWorldMatrix()
);
```

当身体旋转时，手臂自动跟随旋转，因为手臂的世界矩阵依赖于身体。

### 场景3：物理模拟

物体的碰撞检测通常在世界空间进行：

```javascript
// 检测两个立方体是否碰撞
function checkCollision(cubeA, cubeB) {
  // 计算世界空间包围盒
  const boundsA = calculateWorldBounds(
    cubeA.vertices, 
    cubeA.worldMatrix
  );
  const boundsB = calculateWorldBounds(
    cubeB.vertices, 
    cubeB.worldMatrix
  );
  
  // 在世界空间中检测相交
  return intersects(boundsA, boundsB);
}
```

## 常见陷阱与注意事项

### 陷阱1：变换顺序错误

```javascript
// 错误：先平移再旋转
const M1 = multiply(R, T); // ❌

// 正确：先旋转再平移
const M2 = multiply(T, R); // ✅
```

记住口诀：**"缩放-旋转-平移"（SRT）**。

### 陷阱2：误用模型空间坐标

```javascript
// 错误：直接比较模型空间距离
const distanceWrong = distance(modelA.vertices[0], modelB.vertices[0]); // ❌

// 正确：转换到世界空间后比较
const posA = transformToWorld(modelA.vertices[0], modelA.worldMatrix);
const posB = transformToWorld(modelB.vertices[0], modelB.worldMatrix);
const distanceCorrect = distance(posA, posB); // ✅
```

### 陷阱3：法线变换

顶点用世界矩阵变换，但**法线不能直接用世界矩阵**！

```javascript
// 错误：法线直接用世界矩阵
const normalWorldWrong = multiplyMatrixVector(worldMatrix, normal); // ❌

// 正确：法线用逆转置矩阵
const normalMatrix = transpose(inverse(worldMatrix));
const normalWorld = multiplyMatrixVector(normalMatrix, normal); // ✅
```

原因：非均匀缩放会导致法线方向错误。（详见"法线变换与逆转置矩阵"一章）

## 总结

模型空间与世界空间的关系：

| 概念 | 模型空间 | 世界空间 |
|------|---------|---------|
| **定义** | 建模时的局部坐标系 | 场景中的全局坐标系 |
| **原点** | 模型中心 | 场景固定点 |
| **用途** | 定义模型几何形状 | 确定模型在场景中的位置 |
| **转换** | - | 应用世界矩阵 |

关键要点：
- 模型空间顶点是**只读数据**，不应修改
- 世界矩阵是**可变状态**，每帧可能改变
- 变换顺序必须是 **S → R → T**
- 法线变换需要**逆转置矩阵**
- 父子对象通过**矩阵链式乘法**实现层级变换

在渲染管线中，模型空间是第一步，接下来还会经历观察空间、裁剪空间等变换，最终投影到屏幕上。

理解模型空间与世界空间的转换，是掌握整个渲染管线的基础。
