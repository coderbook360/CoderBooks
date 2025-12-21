# 欧拉角与万向节死锁

欧拉角是描述3D旋转最直观的方式，但存在严重的技术问题：**万向节死锁**。

## 欧拉角（Euler Angles）

用三个角度描述旋转：
- **Pitch**（俯仰角）：绕 X 轴旋转
- **Yaw**（偏航角）：绕 Y 轴旋转
- **Roll**（翻滚角）：绕 Z 轴旋转

$$
\mathbf{R}_{euler}(roll, pitch, yaw) = \mathbf{R}_z(roll) \times \mathbf{R}_x(pitch) \times \mathbf{R}_y(yaw)
$$

注意：旋转顺序很重要！不同的顺序产生不同的结果。

## 代码实现

```javascript
class Matrix4 {
  makeRotationFromEuler(x, y, z, order = 'XYZ') {
    const rx = new Matrix4().makeRotationX(x);
    const ry = new Matrix4().makeRotationY(y);
    const rz = new Matrix4().makeRotationZ(z);
    
    switch (order) {
      case 'XYZ': return rx.multiply(ry).multiply(rz);
      case 'ZYX': return rz.multiply(ry).multiply(rx);
      // ... 其他顺序
      default: return rx.multiply(ry).multiply(rz);
    }
  }
}
```

## 万向节死锁（Gimbal Lock）

当某个轴的旋转角度接近 ±90° 时，会丢失一个自由度。

**例子**：
1. Pitch = 90°（抬头看天）
2. 此时 Yaw 和 Roll 的效果相同（都是绕同一轴旋转）
3. 失去一个旋转自由度

这导致：
- 无法表示某些旋转
- 插值动画出现突变
- 相机控制不流畅

## 解决方案：四元数

四元数（Quaternion）是更好的旋转表示方式：
- 无万向节死锁
- 插值平滑（Slerp）
- 占用更少内存（4个数字 vs 9个数字）

这将在"四元数"章节详细讲解。

## 何时使用欧拉角

优点：
- 直观易懂
- 输入方便（如编辑器）

缺点：
- 万向节死锁
- 插值不平滑

**推荐**：
- 用户输入：欧拉角
- 内部计算：四元数或矩阵
- 最终应用：矩阵

## 小结

- 欧拉角：用三个角度描述旋转
- 万向节死锁：某些角度导致自由度丢失
- 解决方案：使用四元数或直接用矩阵
