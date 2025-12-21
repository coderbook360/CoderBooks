# 父子空间层级变换

在复杂场景中，物体之间存在父子关系。理解层级变换对构建场景图（Scene Graph）至关重要。

## 什么是父子关系？

**例子**：太阳系模型
- 太阳（父）
  - 地球（子）
    - 月球（孙）

当地球绕太阳公转时，月球随之移动；当地球自转时，月球也跟着转。

## 局部变换 vs 世界变换

- **局部变换**：相对于父物体的变换
- **世界变换**：相对于世界原点的变换

$$
\mathbf{M}_{world} = \mathbf{M}_{parent} \times \mathbf{M}_{local}
$$

对于多层级：

$$
\mathbf{M}_{world} = \mathbf{M}_{grandparent} \times \mathbf{M}_{parent} \times \mathbf{M}_{local}
$$

## 代码实现

```javascript
class SceneNode {
  constructor(name) {
    this.name = name;
    this.parent = null;
    this.children = [];
    
    this.position = new Vector3();
    this.rotation = new Vector3();
    this.scale = new Vector3(1, 1, 1);
    
    this.localMatrix = new Matrix4();
    this.worldMatrix = new Matrix4();
    this.dirty = true;
  }
  
  addChild(child) {
    child.parent = this;
    this.children.push(child);
    child.markDirty();
  }
  
  getLocalMatrix() {
    if (this.dirty) {
      const S = new Matrix4().makeScale(this.scale.x, this.scale.y, this.scale.z);
      const R = new Matrix4().makeRotationFromEuler(this.rotation.x, this.rotation.y, this.rotation.z);
      const T = new Matrix4().makeTranslation(this.position.x, this.position.y, this.position.z);
      this.localMatrix = T.multiply(R).multiply(S);
    }
    return this.localMatrix;
  }
  
  getWorldMatrix() {
    const local = this.getLocalMatrix();
    
    if (this.parent) {
      const parentWorld = this.parent.getWorldMatrix();
      this.worldMatrix = parentWorld.multiply(local);
    } else {
      this.worldMatrix = local.clone();
    }
    
    return this.worldMatrix;
  }
  
  markDirty() {
    this.dirty = true;
    this.children.forEach(child => child.markDirty());
  }
  
  setPosition(x, y, z) {
    this.position.set(x, y, z);
    this.markDirty();
  }
}
```

## 太阳系示例

```javascript
// 创建场景图
const sun = new SceneNode('Sun');
sun.scale.set(3, 3, 3);

const earth = new SceneNode('Earth');
earth.position.set(10, 0, 0);  // 距离太阳10单位
earth.scale.set(1, 1, 1);
sun.addChild(earth);

const moon = new SceneNode('Moon');
moon.position.set(2, 0, 0);  // 距离地球2单位
moon.scale.set(0.3, 0.3, 0.3);
earth.addChild(moon);

// 动画更新
function update(time) {
  // 太阳自转
  sun.rotation.y = time * 0.1;
  
  // 地球公转
  earth.rotation.y = time * 0.5;
  
  // 月球公转
  moon.rotation.y = time * 2;
  
  // 获取世界矩阵
  console.log('Sun world matrix:', sun.getWorldMatrix());
  console.log('Earth world matrix:', earth.getWorldMatrix());
  console.log('Moon world matrix:', moon.getWorldMatrix());
}
```

## 矩阵链计算

月球的世界矩阵：

$$
\mathbf{M}_{moon}^{world} = \mathbf{M}_{sun} \times \mathbf{M}_{earth} \times \mathbf{M}_{moon}^{local}
$$

展开：

$$
\mathbf{M}_{moon}^{world} = \mathbf{T}_{sun} \mathbf{R}_{sun} \mathbf{S}_{sun} \times \mathbf{T}_{earth} \mathbf{R}_{earth} \mathbf{S}_{earth} \times \mathbf{T}_{moon} \mathbf{R}_{moon} \mathbf{S}_{moon}
$$

## 性能优化：脏标记

当父节点变换时，所有子节点的世界矩阵都需要更新。使用**脏标记**避免不必要的计算：

```javascript
class SceneNode {
  markDirty() {
    this.dirty = true;
    this.worldMatrixDirty = true;
    // 递归标记所有子节点
    this.children.forEach(child => child.markDirty());
  }
  
  getWorldMatrix() {
    if (!this.worldMatrixDirty) {
      return this.worldMatrix;  // 使用缓存
    }
    
    // 重新计算
    const local = this.getLocalMatrix();
    if (this.parent) {
      this.worldMatrix = this.parent.getWorldMatrix().multiply(local);
    } else {
      this.worldMatrix = local.clone();
    }
    
    this.worldMatrixDirty = false;
    return this.worldMatrix;
  }
}
```

## 应用：骨骼动画

骨骼动画使用相同的层级变换原理：

```javascript
const skeleton = new SceneNode('Root');
const upperArm = new SceneNode('UpperArm');
const lowerArm = new SceneNode('LowerArm');
const hand = new SceneNode('Hand');

skeleton.addChild(upperArm);
upperArm.addChild(lowerArm);
lowerArm.addChild(hand);

// 弯曲手臂
upperArm.rotation.z = Math.PI / 4;
lowerArm.rotation.z = Math.PI / 3;

// 手的世界位置自动计算
const handWorldMatrix = hand.getWorldMatrix();
```

## 小结

- **父子关系**：子节点变换相对于父节点
- **世界矩阵**：$\mathbf{M}_{world} = \mathbf{M}_{parent} \times \mathbf{M}_{local}$
- **场景图**：树形结构管理物体层级
- **脏标记**：优化矩阵计算性能
- **应用**：太阳系、骨骼动画、机械臂等
