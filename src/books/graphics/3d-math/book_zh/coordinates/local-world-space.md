# 局部空间与世界空间

理解坐标空间是3D图形编程的基础。每个物体都在自己的"局部坐标系"中定义，最终要变换到"世界坐标系"。

## 什么是局部空间？

**局部空间**（Local Space / Object Space）：物体自身的坐标系。

例如，一个立方体模型：
- 中心在原点 $(0, 0, 0)$
- 8个顶点相对于中心定义

```javascript
const cubeVertices = [
  new Vector3(-1, -1, -1),  // 左下后
  new Vector3(1, -1, -1),   // 右下后
  new Vector3(1, 1, -1),    // 右上后
  new Vector3(-1, 1, -1),   // 左上后
  // ... 前面4个顶点
];
```

**优点**：
- 模型只需定义一次
- 可以复用同一模型创建多个实例

## 什么是世界空间？

**世界空间**（World Space）：场景的全局坐标系。

所有物体最终都在这个统一的坐标系中。

```javascript
// 场景中有两个立方体实例
const cube1Position = new Vector3(5, 0, 0);
const cube2Position = new Vector3(-3, 2, 4);
```

## 从局部到世界：模型矩阵

**模型矩阵** $\mathbf{M}$ 将局部坐标变换到世界坐标：

$$
\mathbf{p}_{world} = \mathbf{M} \times \mathbf{p}_{local}
$$

模型矩阵通常包含：
1. **缩放**（Scale）：改变大小
2. **旋转**（Rotation）：改变方向
3. **平移**（Translation）：改变位置

$$
\mathbf{M} = \mathbf{T} \times \mathbf{R} \times \mathbf{S}
$$

## 代码示例

```javascript
class GameObject {
  constructor(mesh) {
    this.mesh = mesh;  // 局部空间的顶点数据
    this.position = new Vector3();
    this.rotation = new Vector3();
    this.scale = new Vector3(1, 1, 1);
  }
  
  getModelMatrix() {
    const S = new Matrix4().makeScale(this.scale.x, this.scale.y, this.scale.z);
    const R = new Matrix4().makeRotationFromEuler(this.rotation.x, this.rotation.y, this.rotation.z);
    const T = new Matrix4().makeTranslation(this.position.x, this.position.y, this.position.z);
    return T.multiply(R).multiply(S);
  }
  
  getWorldVertices() {
    const M = this.getModelMatrix();
    return this.mesh.vertices.map(v => M.transformPoint(v));
  }
}

// 使用示例
const cube1 = new GameObject(cubeMesh);
cube1.position.set(5, 0, 0);
cube1.rotation.set(0, Math.PI / 4, 0);
cube1.scale.set(2, 2, 2);

const worldVertices = cube1.getWorldVertices();
```

## 实例化：一个模型，多个物体

```javascript
const sharedMesh = createCubeMesh();  // 只定义一次

const objects = [
  { position: new Vector3(0, 0, 0), scale: 1 },
  { position: new Vector3(5, 0, 0), scale: 2 },
  { position: new Vector3(-3, 2, 0), scale: 0.5 }
];

objects.forEach(obj => {
  const gameObject = new GameObject(sharedMesh);
  gameObject.position = obj.position;
  gameObject.scale.set(obj.scale, obj.scale, obj.scale);
  // ... 渲染
});
```

**好处**：
- 节省内存（共享顶点数据）
- 提高性能（减少数据传输）

## 坐标变换流程

```
局部空间 --(Model Matrix)--> 世界空间
```

后续章节会增加更多空间：

```
局部空间 --(M)--> 世界空间 --(V)--> 相机空间 --(P)--> 裁剪空间
```

其中：
- $\mathbf{M}$ = Model Matrix（模型矩阵）
- $\mathbf{V}$ = View Matrix（视图矩阵）
- $\mathbf{P}$ = Projection Matrix（投影矩阵）

## 小结

- **局部空间**：物体自身坐标系，便于建模和复用
- **世界空间**：场景全局坐标系，所有物体的统一空间
- **模型矩阵**：$\mathbf{M} = \mathbf{T} \times \mathbf{R} \times \mathbf{S}$
- **实例化**：一个模型，多个位置和变换
