# 数学库设计哲学

> "数学是 3D 图形的基础，优秀的数学库让复杂计算变得简单。"

## 数学库概览

### 核心类

```
math/
├── Vector2.js      # 二维向量
├── Vector3.js      # 三维向量
├── Vector4.js      # 四维向量
├── Matrix3.js      # 3x3 矩阵
├── Matrix4.js      # 4x4 矩阵
├── Quaternion.js   # 四元数
├── Euler.js        # 欧拉角
├── Color.js        # 颜色
├── Box2.js         # 2D 包围盒
├── Box3.js         # 3D 包围盒
├── Sphere.js       # 包围球
├── Ray.js          # 射线
├── Plane.js        # 平面
├── Frustum.js      # 视锥体
├── Line3.js        # 线段
├── Triangle.js     # 三角形
└── MathUtils.js    # 数学工具
```

## 设计原则

### 可变性

```javascript
// Three.js 的数学对象是可变的
const v = new THREE.Vector3(1, 2, 3);
v.add(new THREE.Vector3(1, 1, 1));  // 修改 v 本身
console.log(v);  // (2, 3, 4)

// 对比不可变设计（如 glMatrix）
// const result = vec3.add(vec3.create(), v1, v2);
```

### 链式调用

```javascript
// 所有修改方法返回 this，支持链式调用
const result = new THREE.Vector3()
  .copy(a)
  .add(b)
  .multiplyScalar(2)
  .normalize();

// 矩阵操作
const matrix = new THREE.Matrix4()
  .makeRotationX(Math.PI / 4)
  .multiply(new THREE.Matrix4().makeTranslation(1, 0, 0))
  .multiply(new THREE.Matrix4().makeScale(2, 2, 2));
```

### 输出参数

```javascript
// 可选的 target 参数，复用对象
const target = new THREE.Vector3();

mesh.getWorldPosition(target);  // 结果存入 target
console.log(target);

// 如果不提供，创建新对象
const position = mesh.getWorldPosition();  // 创建新的 Vector3
```

### 静态临时变量

```javascript
// Three.js 内部大量使用静态临时变量
const _v0 = new Vector3();
const _v1 = new Vector3();
const _matrix = new Matrix4();

class Geometry {
  computeBoundingSphere() {
    // 使用静态变量，避免每次调用创建对象
    _v0.set(0, 0, 0);
    
    for (const vertex of this.vertices) {
      _v0.add(vertex);
    }
    
    _v0.divideScalar(this.vertices.length);
    // ...
  }
}
```

## Vector3 深入

### 类结构

```javascript
class Vector3 {
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
  
  // 属性别名
  get width() { return this.x; }
  set width(value) { this.x = value; }
  
  get height() { return this.y; }
  set height(value) { this.y = value; }
  
  get depth() { return this.z; }
  set depth(value) { this.z = value; }
}
```

### 基础操作

```javascript
// 设置值
v.set(1, 2, 3);
v.setX(1);
v.setY(2);
v.setZ(3);
v.setComponent(0, 1);  // 按索引

// 复制
v.copy(source);
v.clone();

// 数组转换
v.fromArray([1, 2, 3]);
v.fromArray([1, 2, 3, 4, 5], 2);  // 从索引 2 开始
v.toArray();
v.toArray([], 1);  // 写入数组偏移
```

### 算术运算

```javascript
// 加法
v.add(w);           // v += w
v.addVectors(a, b); // v = a + b
v.addScalar(s);     // v.x += s, v.y += s, v.z += s
v.addScaledVector(w, s);  // v += w * s

// 减法
v.sub(w);           // v -= w
v.subVectors(a, b); // v = a - b
v.subScalar(s);

// 乘法（分量相乘）
v.multiply(w);      // v.x *= w.x, ...
v.multiplyScalar(s);
v.multiplyVectors(a, b);

// 除法
v.divide(w);
v.divideScalar(s);
```

### 向量运算

```javascript
// 点积
const dot = v.dot(w);  // v · w = |v||w|cos(θ)

// 叉积
v.cross(w);           // v = v × w
v.crossVectors(a, b); // v = a × b

// 长度
const length = v.length();
const lengthSq = v.lengthSq();  // 避免开方

// 归一化
v.normalize();

// 距离
const dist = v.distanceTo(w);
const distSq = v.distanceToSquared(w);

// 角度
const angle = v.angleTo(w);  // 弧度
```

### 插值

```javascript
// 线性插值
v.lerp(target, t);           // v = v + (target - v) * t
v.lerpVectors(a, b, t);      // v = a + (b - a) * t

// 球面线性插值（用于方向）
v.slerp(target, t);
```

### 变换

```javascript
// 矩阵变换
v.applyMatrix3(m);    // v = m * v (3x3)
v.applyMatrix4(m);    // v = m * v (齐次除法)
v.applyNormalMatrix(m);  // 用于法线

// 四元数旋转
v.applyQuaternion(q);

// 欧拉角旋转
v.applyEuler(euler);

// 投影
v.project(camera);      // 世界坐标 → NDC
v.unproject(camera);    // NDC → 世界坐标

// 反射
v.reflect(normal);      // 沿法线反射
```

## Matrix4 深入

### 矩阵布局

```javascript
// Three.js 使用列主序
// elements 数组布局：
// [m00, m10, m20, m30,  // 第一列
//  m01, m11, m21, m31,  // 第二列
//  m02, m12, m22, m32,  // 第三列
//  m03, m13, m23, m33]  // 第四列

// 访问元素
const m = new THREE.Matrix4();
m.elements[0] = m00;  // 第0列第0行
m.elements[4] = m01;  // 第1列第0行
m.elements[12] = tx;  // 第3列第0行（平移x）
m.elements[13] = ty;  // 第3列第1行（平移y）
m.elements[14] = tz;  // 第3列第2行（平移z）
```

### 变换矩阵构造

```javascript
// 单位矩阵
m.identity();

// 平移
m.makeTranslation(x, y, z);
// 或传入 Vector3
m.makeTranslation(v);

// 旋转
m.makeRotationX(theta);
m.makeRotationY(theta);
m.makeRotationZ(theta);
m.makeRotationAxis(axis, angle);  // 任意轴

// 缩放
m.makeScale(x, y, z);

// 组合变换
m.compose(position, quaternion, scale);
m.decompose(position, quaternion, scale);  // 分解
```

### 矩阵运算

```javascript
// 乘法
m.multiply(n);           // m = m * n (右乘)
m.premultiply(n);        // m = n * m (左乘)
m.multiplyMatrices(a, b); // m = a * b

// 逆矩阵
m.invert();

// 转置
m.transpose();

// 行列式
const det = m.determinant();
```

### 特殊矩阵

```javascript
// 视图矩阵
m.lookAt(eye, target, up);

// 透视投影矩阵
m.makePerspective(left, right, top, bottom, near, far);

// 正交投影矩阵
m.makeOrthographic(left, right, top, bottom, near, far);

// 法线矩阵（3x3）
const normalMatrix = new THREE.Matrix3();
normalMatrix.getNormalMatrix(modelMatrix);
```

## Quaternion 深入

### 四元数表示

```javascript
// q = w + xi + yj + zk
// 单位四元数表示旋转
class Quaternion {
  constructor(x = 0, y = 0, z = 0, w = 1) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
  }
}
```

### 旋转设置

```javascript
// 从欧拉角
q.setFromEuler(euler);

// 从轴-角
q.setFromAxisAngle(axis, angle);

// 从旋转矩阵
q.setFromRotationMatrix(m);

// 从两个向量
q.setFromUnitVectors(vFrom, vTo);
```

### 四元数运算

```javascript
// 乘法（组合旋转）
q.multiply(r);           // q = q * r
q.premultiply(r);        // q = r * q
q.multiplyQuaternions(a, b);

// 共轭
q.conjugate();  // (x, y, z, w) → (-x, -y, -z, w)

// 逆
q.invert();

// 归一化
q.normalize();

// 点积
const dot = q.dot(r);

// 球面插值
q.slerp(r, t);
q.slerpQuaternions(a, b, t);
```

### 四元数 vs 欧拉角

```javascript
// 欧拉角：万向节锁问题
const euler = new THREE.Euler(Math.PI / 2, Math.PI / 2, 0, 'XYZ');
// 当 Y 轴旋转 90° 时，X 和 Z 轴对齐，丢失一个自由度

// 四元数：没有万向节锁
const q = new THREE.Quaternion();
q.setFromEuler(euler);
// 总是正确表示任意旋转
```

## Euler 深入

### 旋转顺序

```javascript
// 欧拉角由三个角度和旋转顺序定义
class Euler {
  constructor(x = 0, y = 0, z = 0, order = 'XYZ') {
    this.x = x;      // 绕 X 轴旋转（俯仰 pitch）
    this.y = y;      // 绕 Y 轴旋转（偏航 yaw）
    this.z = z;      // 绕 Z 轴旋转（滚转 roll）
    this.order = order;
  }
}

// 常用顺序
// 'XYZ' - 默认
// 'YXZ' - 相机、FPS 控制
// 'ZXY' - 某些角色控制
```

### 转换

```javascript
// 欧拉角 ↔ 四元数
euler.setFromQuaternion(q, order);
q.setFromEuler(euler);

// 欧拉角 ↔ 矩阵
euler.setFromRotationMatrix(m, order);

// 欧拉角 ↔ Vector3
euler.setFromVector3(v, order);
euler.toVector3();
```

## Color 深入

### 颜色表示

```javascript
class Color {
  constructor(r, g, b) {
    // r, g, b 范围 [0, 1]
    this.r = r;
    this.g = g;
    this.b = b;
  }
}

// 构造方式
new THREE.Color(0xff0000);          // 十六进制
new THREE.Color(1, 0, 0);           // RGB
new THREE.Color('red');             // CSS 颜色名
new THREE.Color('rgb(255, 0, 0)');  // CSS RGB
new THREE.Color('hsl(0, 100%, 50%)'); // CSS HSL
```

### 颜色空间

```javascript
// 线性 RGB（物理正确）
color.setRGB(r, g, b);

// sRGB（伽马校正）
color.setRGB(r, g, b, THREE.SRGBColorSpace);

// HSL
color.setHSL(h, s, l);  // h: 0-1, s: 0-1, l: 0-1

// 转换
const hsl = { h: 0, s: 0, l: 0 };
color.getHSL(hsl);
```

### 颜色运算

```javascript
// 加法
color.add(c);
color.addScalar(s);

// 乘法
color.multiply(c);
color.multiplyScalar(s);

// 插值
color.lerp(c, t);
color.lerpColors(a, b, t);
color.lerpHSL(c, t);  // HSL 空间插值
```

## 几何工具类

### Box3 包围盒

```javascript
const box = new THREE.Box3();

// 从对象计算
box.setFromObject(mesh);

// 从点集计算
box.setFromPoints(points);

// 操作
box.expandByPoint(point);
box.expandByScalar(scalar);
box.union(other);
box.intersect(other);

// 查询
box.containsPoint(point);
box.intersectsBox(other);
box.getCenter(target);
box.getSize(target);
```

### Sphere 包围球

```javascript
const sphere = new THREE.Sphere(center, radius);

// 从包围盒计算
sphere.setFromPoints(points);

// 查询
sphere.containsPoint(point);
sphere.intersectsSphere(other);
sphere.intersectsBox(box);
sphere.distanceToPoint(point);
```

### Ray 射线

```javascript
const ray = new THREE.Ray(origin, direction);

// 相交测试
ray.intersectBox(box, target);
ray.intersectSphere(sphere, target);
ray.intersectTriangle(a, b, c, backfaceCulling, target);
ray.intersectPlane(plane, target);

// 查询
ray.distanceToPoint(point);
ray.distanceSqToPoint(point);
ray.closestPointToPoint(point, target);
```

### Plane 平面

```javascript
// 平面方程：n · p + d = 0
const plane = new THREE.Plane(normal, constant);

// 从点和法线
plane.setFromNormalAndCoplanarPoint(normal, point);

// 从三点
plane.setFromCoplanarPoints(a, b, c);

// 查询
plane.distanceToPoint(point);
plane.projectPoint(point, target);  // 投影到平面
```

## MathUtils

### 常用函数

```javascript
const { MathUtils } = THREE;

// 角度转换
MathUtils.degToRad(degrees);  // 角度 → 弧度
MathUtils.radToDeg(radians);  // 弧度 → 角度

// 限制范围
MathUtils.clamp(x, min, max);

// 插值
MathUtils.lerp(a, b, t);
MathUtils.inverseLerp(a, b, x);  // 反向插值
MathUtils.mapLinear(x, a1, a2, b1, b2);  // 重映射

// 平滑插值
MathUtils.smoothstep(x, min, max);
MathUtils.smootherstep(x, min, max);

// 随机
MathUtils.randFloat(low, high);
MathUtils.randInt(low, high);
MathUtils.randFloatSpread(range);  // -range/2 到 range/2

// 判断
MathUtils.isPowerOfTwo(n);
MathUtils.ceilPowerOfTwo(n);
MathUtils.floorPowerOfTwo(n);

// UUID
MathUtils.generateUUID();
```

## 性能优化

### 避免临时对象

```javascript
// ❌ 不好：每次调用创建新对象
function update() {
  const direction = new THREE.Vector3(0, 0, 1);
  direction.applyQuaternion(object.quaternion);
  return direction;
}

// ✅ 好：复用对象
const _direction = new THREE.Vector3();
function update() {
  _direction.set(0, 0, 1);
  _direction.applyQuaternion(object.quaternion);
  return _direction;
}
```

### 使用平方距离

```javascript
// ❌ 慢：需要开方
if (v.distanceTo(target) < range) { ... }

// ✅ 快：避免开方
const rangeSq = range * range;
if (v.distanceToSquared(target) < rangeSq) { ... }
```

### 批量操作

```javascript
// ❌ 慢：多次方法调用
v.set(a.x + b.x, a.y + b.y, a.z + b.z);
v.multiplyScalar(0.5);
v.normalize();

// ✅ 快：链式调用
v.addVectors(a, b).multiplyScalar(0.5).normalize();
```

## 本章小结

- 数学对象可变，支持链式调用
- Vector3 提供完整的向量运算
- Matrix4 采用列主序，支持各种变换
- Quaternion 避免万向节锁
- Color 支持多种颜色空间
- 几何工具类简化碰撞检测
- 复用对象，避免 GC 压力

下一章，我们将进入基础篇，学习项目配置与初始化。
