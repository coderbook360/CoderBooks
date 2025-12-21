# 视锥体裁剪算法

视锥体裁剪（Frustum Culling）是3D图形学中最重要的优化技术之一，可以大幅减少渲染的物体数量。

## 什么是视锥体裁剪？

**目的**：只渲染视锥体内的物体，跳过视锥体外的物体。

**收益**：
- 减少CPU顶点变换计算
- 减少GPU像素绘制
- 大幅提升性能（特别是大场景）

## 视锥体的六个平面

视锥体由6个平面围成：
1. **近平面**（Near）
2. **远平面**（Far）
3. **左平面**（Left）
4. **右平面**（Right）
5. **上平面**（Top）
6. **下平面**（Bottom）

## 平面方程

3D平面可以用方程表示：

$$
ax + by + cz + d = 0
$$

其中 $(a, b, c)$ 是平面法向量。

点到平面的**有符号距离**：

$$
distance = ax + by + cz + d
$$

- $distance > 0$：点在平面正面（法向量指向的一侧）
- $distance = 0$：点在平面上
- $distance < 0$：点在平面背面

## 从投影矩阵提取平面

标准方法（Gribb & Hartmann）：

```javascript
function extractFrustumPlanes(mvpMatrix) {
  const m = mvpMatrix.elements;
  const planes = [];
  
  // 左平面: m[3] + m[0]
  planes.push({
    normal: new Vector3(m[3] + m[0], m[7] + m[4], m[11] + m[8]),
    distance: m[15] + m[12]
  });
  
  // 右平面: m[3] - m[0]
  planes.push({
    normal: new Vector3(m[3] - m[0], m[7] - m[4], m[11] - m[8]),
    distance: m[15] - m[12]
  });
  
  // 下平面: m[3] + m[1]
  planes.push({
    normal: new Vector3(m[3] + m[1], m[7] + m[5], m[11] + m[9]),
    distance: m[15] + m[13]
  });
  
  // 上平面: m[3] - m[1]
  planes.push({
    normal: new Vector3(m[3] - m[1], m[7] - m[5], m[11] - m[9]),
    distance: m[15] - m[13]
  });
  
  // 近平面: m[3] + m[2]
  planes.push({
    normal: new Vector3(m[3] + m[2], m[7] + m[6], m[11] + m[10]),
    distance: m[15] + m[14]
  });
  
  // 远平面: m[3] - m[2]
  planes.push({
    normal: new Vector3(m[3] - m[2], m[7] - m[6], m[11] - m[10]),
    distance: m[15] - m[14]
  });
  
  // 归一化平面方程
  planes.forEach(plane => {
    const len = plane.normal.length();
    plane.normal = plane.normal.divideScalar(len);
    plane.distance /= len;
  });
  
  return planes;
}
```

## 包围体测试

### 点测试（最简单）

```javascript
function isPointInFrustum(point, planes) {
  for (const plane of planes) {
    const distance = plane.normal.dot(point) + plane.distance;
    if (distance < 0) {
      return false;  // 点在某个平面外侧
    }
  }
  return true;  // 点在所有平面内侧
}
```

### 球体测试（常用）

```javascript
function isSphereInFrustum(center, radius, planes) {
  for (const plane of planes) {
    const distance = plane.normal.dot(center) + plane.distance;
    if (distance < -radius) {
      return false;  // 球体完全在平面外侧
    }
  }
  return true;  // 球体至少部分在视锥体内
}
```

### AABB测试（轴对齐包围盒）

```javascript
function isAABBInFrustum(min, max, planes) {
  for (const plane of planes) {
    // 找到AABB距离平面最远的顶点（p-vertex）
    const px = plane.normal.x > 0 ? max.x : min.x;
    const py = plane.normal.y > 0 ? max.y : min.y;
    const pz = plane.normal.z > 0 ? max.z : min.z;
    
    const distance = plane.normal.x * px + 
                     plane.normal.y * py + 
                     plane.normal.z * pz + 
                     plane.distance;
    
    if (distance < 0) {
      return false;  // AABB完全在平面外侧
    }
  }
  return true;
}
```

## 完整的场景裁剪系统

```javascript
class FrustumCuller {
  constructor() {
    this.planes = [];
  }
  
  update(camera, projectionMatrix) {
    const viewMatrix = camera.getViewMatrix();
    const mvpMatrix = projectionMatrix.multiply(viewMatrix);
    this.planes = extractFrustumPlanes(mvpMatrix);
  }
  
  testObject(object) {
    // 计算物体的世界空间包围球
    const worldCenter = object.getWorldPosition();
    const worldRadius = object.getBoundingRadius() * object.getMaxScale();
    
    return isSphereInFrustum(worldCenter, worldRadius, this.planes);
  }
  
  cullScene(scene) {
    const visibleObjects = [];
    
    scene.traverse(object => {
      if (this.testObject(object)) {
        visibleObjects.push(object);
      }
    });
    
    return visibleObjects;
  }
}

// 使用示例
const culler = new FrustumCuller();

function render() {
  // 更新视锥体平面
  culler.update(camera, projectionMatrix);
  
  // 裁剪场景
  const visibleObjects = culler.cullScene(scene);
  
  console.log(`Rendering ${visibleObjects.length} / ${scene.totalObjects} objects`);
  
  // 只渲染可见物体
  visibleObjects.forEach(obj => {
    drawObject(obj);
  });
}
```

## 性能优化

### 层次包围体

```javascript
class SceneGraph {
  constructor() {
    this.root = new Node();
  }
  
  cull(frustum) {
    const visibleObjects = [];
    this.cullNode(this.root, frustum, visibleObjects);
    return visibleObjects;
  }
  
  cullNode(node, frustum, visibleObjects) {
    // 测试节点包围体
    if (!frustum.testBoundingSphere(node.boundingSphere)) {
      return;  // 整个子树被裁剪
    }
    
    // 如果是叶子节点，加入可见列表
    if (node.isLeaf) {
      visibleObjects.push(node.object);
    } else {
      // 递归测试子节点
      node.children.forEach(child => {
        this.cullNode(child, frustum, visibleObjects);
      });
    }
  }
}
```

## 小结

- **视锥体裁剪**：跳过不可见物体，提升性能
- **六个平面**：近、远、左、右、上、下
- **平面提取**：从MVP矩阵直接计算
- **包围体测试**：点、球体、AABB
- **优化技巧**：层次包围体、空间分区
