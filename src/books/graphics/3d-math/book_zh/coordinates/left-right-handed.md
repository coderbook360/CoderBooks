# 坐标系统对比（左手系 vs 右手系）

3D图形学中存在两种坐标系统：**左手系**和**右手系**。理解它们的区别对跨平台开发至关重要。

## 左手系 vs 右手系

### 右手坐标系

**判断方法**：伸出右手
- **拇指**指向 $+X$
- **食指**指向 $+Y$
- **中指**指向 $+Z$

特点：
- $+Z$ 指向"进入屏幕"
- 叉乘：$\mathbf{x} \times \mathbf{y} = \mathbf{z}$

**使用平台**：
- OpenGL / WebGL
- Three.js
- 数学和物理学标准

### 左手坐标系

**判断方法**：伸出左手
- **拇指**指向 $+X$
- **食指**指向 $+Y$
- **中指**指向 $+Z$

特点：
- $+Z$ 指向"远离屏幕"
- 叉乘：$\mathbf{x} \times \mathbf{y} = -\mathbf{z}$

**使用平台**：
- DirectX
- Unity（默认）
- Unreal Engine

## 主要区别

| 特性 | 右手系 | 左手系 |
|------|--------|--------|
| Z轴方向 | 进入屏幕 | 远离屏幕 |
| 相机朝向 | $-Z$ | $+Z$ |
| 叉乘结果 | $\mathbf{x} \times \mathbf{y} = \mathbf{z}$ | $\mathbf{x} \times \mathbf{y} = -\mathbf{z}$ |
| 旋转正方向 | 逆时针 | 顺时针 |

## 代码示例

### 右手系（OpenGL / WebGL）

```javascript
// 叉乘验证
const x = new Vector3(1, 0, 0);
const y = new Vector3(0, 1, 0);
const z = x.cross(y);
console.log(z.toString());  // Vector3(0, 0, 1) ✅

// 相机朝向 -Z
const viewMatrix = lookAt(
  new Vector3(0, 0, 10),  // 相机位置
  new Vector3(0, 0, 0),   // 看向原点（-Z方向）
  new Vector3(0, 1, 0)
);
```

### 左手系（DirectX）

```javascript
// 叉乘验证
const x = new Vector3(1, 0, 0);
const y = new Vector3(0, 1, 0);
const z = x.cross(y);
console.log(z.toString());  // Vector3(0, 0, -1) ❌ (如果用右手系叉乘)

// 需要翻转叉乘
function crossLeftHanded(a, b) {
  return b.cross(a);  // 参数顺序相反
}

// 相机朝向 +Z
const viewMatrix = lookAtLeftHanded(
  new Vector3(0, 0, -10),  // 相机位置（在-Z侧）
  new Vector3(0, 0, 0),    // 看向原点（+Z方向）
  new Vector3(0, 1, 0)
);
```

## 坐标系转换

从右手系转换到左手系（或反向）：

**方法1：翻转Z轴**

$$
\mathbf{p}_{left} = (x, y, -z)
$$

```javascript
function rightToLeftHanded(vec) {
  return new Vector3(vec.x, vec.y, -vec.z);
}
```

**方法2：转换矩阵**

$$
\mathbf{T} = \begin{bmatrix}
1 & 0 & 0 & 0 \\
0 & 1 & 0 & 0 \\
0 & 0 & -1 & 0 \\
0 & 0 & 0 & 1
\end{bmatrix}
$$

```javascript
const conversionMatrix = new Matrix4().makeScale(1, 1, -1);
const leftHandedPoint = conversionMatrix.transformPoint(rightHandedPoint);
```

## 投影矩阵的区别

### 右手系透视投影（OpenGL）

```javascript
function perspectiveRH(fov, aspect, near, far) {
  const f = 1 / Math.tan(fov / 2);
  return new Matrix4().set(
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, -(far + near) / (far - near), -2 * far * near / (far - near),
    0, 0, -1, 0
  );
}
```

### 左手系透视投影（DirectX）

```javascript
function perspectiveLH(fov, aspect, near, far) {
  const f = 1 / Math.tan(fov / 2);
  return new Matrix4().set(
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, far / (far - near), -near * far / (far - near),
    0, 0, 1, 0  // 注意：这里是 +1，不是 -1
  );
}
```

**关键区别**：投影矩阵最后一行的符号。

## 实践建议

1. **选择一个系统并坚持使用**
   - WebGL项目：使用右手系
   - Unity项目：使用左手系

2. **导入模型时注意**
   - 模型文件可能来自不同坐标系
   - 需要在导入时转换

3. **库的默认行为**
   - Three.js：右手系
   - Babylon.js：左手系
   - 使用库时遵循其约定

4. **文档和注释**
   - 在代码中明确标注使用的坐标系
   - 避免混用导致的混乱

## 小结

- **右手系**：OpenGL / WebGL / Three.js 标准
- **左手系**：DirectX / Unity 标准
- **主要区别**：Z轴方向、叉乘结果、旋转方向
- **转换方法**：翻转Z轴（$z \rightarrow -z$）
- **最佳实践**：选择一个系统并保持一致
