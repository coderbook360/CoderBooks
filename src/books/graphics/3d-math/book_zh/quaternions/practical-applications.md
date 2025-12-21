# 四元数实战应用

四元数在游戏开发和3D图形中有大量实际应用场景。

## 应用1：FPS相机平滑旋转

第一人称相机需要平滑跟随鼠标旋转：

```javascript
class FPSCamera {
  constructor(position) {
    this.position = position.clone();
    this.rotation = new Quaternion();
    this.yaw = 0;
    this.pitch = 0;
    this.smoothFactor = 0.1;
  }
  
  handleMouseMove(deltaX, deltaY, sensitivity) {
    this.yaw += deltaX * sensitivity;
    this.pitch -= deltaY * sensitivity;
    
    // 限制pitch防止翻转
    this.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.pitch));
  }
  
  update() {
    // 目标旋转
    const targetRotation = Quaternion.fromEuler(this.pitch, this.yaw, 0);
    
    // 平滑插值
    this.rotation = Quaternion.slerp(this.rotation, targetRotation, this.smoothFactor);
  }
  
  getViewMatrix() {
    const forward = this.rotation.rotateVector(new Vector3(0, 0, -1));
    const target = this.position.add(forward);
    return lookAt(this.position, target, new Vector3(0, 1, 0));
  }
}

// 使用
const camera = new FPSCamera(new Vector3(0, 1.6, 0));

canvas.addEventListener('mousemove', (e) => {
  camera.handleMouseMove(e.movementX, e.movementY, 0.002);
});

function gameLoop() {
  camera.update();
  const viewMatrix = camera.getViewMatrix();
  render(viewMatrix);
  requestAnimationFrame(gameLoop);
}
```

## 应用2：物体跟随目标旋转

让物体平滑转向目标：

```javascript
class TrackingObject {
  constructor(position) {
    this.position = position.clone();
    this.rotation = new Quaternion();
    this.turnSpeed = 0.05;
  }
  
  lookAt(target) {
    // 计算目标方向
    const direction = target.sub(this.position).normalize();
    
    // 构建目标旋转（从默认方向 (0,0,-1) 到目标方向）
    const targetRotation = Quaternion.fromToRotation(
      new Vector3(0, 0, -1),
      direction
    );
    
    // 平滑插值
    this.rotation = Quaternion.slerp(this.rotation, targetRotation, this.turnSpeed);
  }
  
  update(targetPosition) {
    this.lookAt(targetPosition);
  }
}

// fromToRotation辅助函数
Quaternion.fromToRotation = function(from, to) {
  const axis = from.cross(to).normalize();
  const angle = Math.acos(from.dot(to));
  return Quaternion.fromAxisAngle(axis, angle);
};
```

## 应用3：骨骼动画混合

混合两个动画姿势：

```javascript
class Bone {
  constructor(name) {
    this.name = name;
    this.localRotation = new Quaternion();
  }
}

function blendAnimations(skeleton, anim1, anim2, blend) {
  skeleton.bones.forEach((bone, index) => {
    const rot1 = anim1.getBoneRotation(index);
    const rot2 = anim2.getBoneRotation(index);
    
    // Slerp混合两个姿势
    bone.localRotation = Quaternion.slerp(rot1, rot2, blend);
  });
}

// 使用：从走路动画过渡到跑步动画
function update(deltaTime) {
  const blendFactor = player.speed / player.maxSpeed;  // 0到1
  blendAnimations(skeleton, walkAnimation, runAnimation, blendFactor);
}
```

## 应用4：物理模拟（角速度）

旋转物体的物理模拟：

```javascript
class RigidBody {
  constructor() {
    this.rotation = new Quaternion();
    this.angularVelocity = new Vector3();  // 弧度/秒
    this.inertia = 1.0;
  }
  
  applyTorque(torque, deltaTime) {
    // 计算角加速度
    const angularAccel = torque.divideScalar(this.inertia);
    this.angularVelocity = this.angularVelocity.add(angularAccel.multiplyScalar(deltaTime));
  }
  
  update(deltaTime) {
    // 从角速度构建增量旋转
    const angle = this.angularVelocity.length() * deltaTime;
    
    if (angle > 0.0001) {
      const axis = this.angularVelocity.normalize();
      const deltaRotation = Quaternion.fromAxisAngle(axis, angle);
      
      // 应用旋转
      this.rotation = deltaRotation.multiply(this.rotation).normalize();
    }
    
    // 应用阻尼
    this.angularVelocity = this.angularVelocity.multiplyScalar(0.98);
  }
}

// 使用：飞碟旋转
const disc = new RigidBody();
disc.applyTorque(new Vector3(0, 10, 0), 0.016);  // 绕Y轴施加力矩

function physicsLoop(deltaTime) {
  disc.update(deltaTime);
  drawDisc(disc.rotation.toMatrix4());
}
```

## 应用5：相机环绕物体

轨道相机实现：

```javascript
class OrbitCamera {
  constructor(target, distance) {
    this.target = target.clone();
    this.distance = distance;
    this.rotation = new Quaternion();
  }
  
  rotate(deltaYaw, deltaPitch) {
    // 水平旋转
    const yawRot = Quaternion.fromAxisAngle(new Vector3(0, 1, 0), deltaYaw);
    
    // 垂直旋转（沿相机的右轴）
    const right = this.rotation.rotateVector(new Vector3(1, 0, 0));
    const pitchRot = Quaternion.fromAxisAngle(right, deltaPitch);
    
    // 组合旋转
    this.rotation = pitchRot.multiply(yawRot).multiply(this.rotation).normalize();
  }
  
  getViewMatrix() {
    // 相机偏移（相对于目标）
    const offset = this.rotation.rotateVector(new Vector3(0, 0, this.distance));
    const position = this.target.add(offset);
    
    return lookAt(position, this.target, new Vector3(0, 1, 0));
  }
  
  zoom(delta) {
    this.distance = Math.max(1, Math.min(100, this.distance + delta));
  }
}

// 使用
const orbitCam = new OrbitCamera(new Vector3(0, 0, 0), 10);

canvas.addEventListener('mousemove', (e) => {
  if (e.buttons === 1) {
    orbitCam.rotate(e.movementX * 0.01, e.movementY * 0.01);
  }
});

canvas.addEventListener('wheel', (e) => {
  orbitCam.zoom(e.deltaY * 0.01);
});
```

## 应用6：VR头盔追踪

处理VR设备的旋转数据：

```javascript
class VRHeadset {
  constructor() {
    this.orientation = new Quaternion();
    this.calibration = new Quaternion();
  }
  
  calibrate() {
    // 当前朝向作为"正前方"
    this.calibration = this.orientation.conjugate();
  }
  
  updateOrientation(sensorData) {
    // 从传感器数据构建四元数
    this.orientation = new Quaternion(
      sensorData.w,
      sensorData.x,
      sensorData.y,
      sensorData.z
    ).normalize();
  }
  
  getCalibratedOrientation() {
    // 应用校准
    return this.calibration.multiply(this.orientation);
  }
  
  getViewMatrix(position) {
    const rotation = this.getCalibratedOrientation();
    const forward = rotation.rotateVector(new Vector3(0, 0, -1));
    const target = position.add(forward);
    return lookAt(position, target, new Vector3(0, 1, 0));
  }
}
```

## 性能优化技巧

```javascript
class QuaternionCache {
  constructor() {
    this.cache = new Map();
  }
  
  getAxisAngle(axis, angle) {
    const key = `${axis.x},${axis.y},${axis.z},${angle}`;
    
    if (!this.cache.has(key)) {
      this.cache.set(key, Quaternion.fromAxisAngle(axis, angle));
    }
    
    return this.cache.get(key);
  }
  
  clear() {
    this.cache.clear();
  }
}

// 预计算常用旋转
const QuatCache = {
  Identity: new Quaternion(1, 0, 0, 0),
  RotX90: Quaternion.fromAxisAngle(new Vector3(1, 0, 0), Math.PI / 2),
  RotY90: Quaternion.fromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2),
  RotZ90: Quaternion.fromAxisAngle(new Vector3(0, 0, 1), Math.PI / 2)
};
```

## 小结

- **相机控制**：FPS、轨道相机、VR头盔追踪
- **动画混合**：姿势插值、动画过渡
- **物理模拟**：角速度、力矩、刚体旋转
- **AI导向**：物体跟随、朝向目标
- **性能优化**：缓存常用旋转、预计算
