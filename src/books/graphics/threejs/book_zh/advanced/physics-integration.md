# 物理引擎集成

> "物理让虚拟世界有了真实的重量感。"

## 物理引擎选择

```
Three.js 常用物理引擎：

引擎          类型      特点
────────────────────────────────────────
Cannon.js    纯 JS     轻量、易用、适合中小项目
Cannon-es    纯 JS     Cannon.js 的 ES6 现代化版本
Ammo.js      WASM      Bullet 引擎移植、功能强大
Rapier       WASM      高性能、现代 API、Rust 编写
Oimo.js      纯 JS     轻量、快速、适合简单场景
```

## Cannon-es 集成

### 基础设置

```typescript
import * as CANNON from 'cannon-es';

// 创建物理世界
const world = new CANNON.World({
  gravity: new CANNON.Vec3(0, -9.82, 0), // 重力
});

// 物理参数
world.broadphase = new CANNON.SAPBroadphase(world); // 宽相检测
world.allowSleep = true;                             // 允许休眠
world.solver.iterations = 10;                        // 求解器迭代

// 更新循环
const timeStep = 1 / 60;
const clock = new THREE.Clock();

function animate() {
  const delta = clock.getDelta();
  
  // 更新物理
  world.step(timeStep, delta, 3);
  
  // 同步 Three.js 物体
  syncPhysics();
  
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
```

### 创建物理体

```typescript
// 创建地面
function createGround(): { mesh: THREE.Mesh; body: CANNON.Body } {
  // Three.js 网格
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100),
    new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  
  // Cannon 刚体
  const body = new CANNON.Body({
    type: CANNON.Body.STATIC,
    shape: new CANNON.Plane(),
  });
  body.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  
  world.addBody(body);
  scene.add(mesh);
  
  return { mesh, body };
}

// 创建动态盒子
function createBox(
  size: THREE.Vector3,
  position: THREE.Vector3,
  mass = 1
): { mesh: THREE.Mesh; body: CANNON.Body } {
  // Three.js 网格
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(size.x, size.y, size.z),
    new THREE.MeshStandardMaterial({ color: Math.random() * 0xffffff })
  );
  mesh.position.copy(position);
  mesh.castShadow = true;
  
  // Cannon 刚体
  const body = new CANNON.Body({
    mass,
    shape: new CANNON.Box(
      new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2)
    ),
    position: new CANNON.Vec3(position.x, position.y, position.z),
  });
  
  world.addBody(body);
  scene.add(mesh);
  
  return { mesh, body };
}

// 创建球体
function createSphere(
  radius: number,
  position: THREE.Vector3,
  mass = 1
): { mesh: THREE.Mesh; body: CANNON.Body } {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 32, 32),
    new THREE.MeshStandardMaterial({ color: Math.random() * 0xffffff })
  );
  mesh.position.copy(position);
  mesh.castShadow = true;
  
  const body = new CANNON.Body({
    mass,
    shape: new CANNON.Sphere(radius),
    position: new CANNON.Vec3(position.x, position.y, position.z),
  });
  
  world.addBody(body);
  scene.add(mesh);
  
  return { mesh, body };
}
```

### 同步物理与渲染

```typescript
// 物体数组
const physicsObjects: { mesh: THREE.Mesh; body: CANNON.Body }[] = [];

// 同步位置和旋转
function syncPhysics(): void {
  for (const obj of physicsObjects) {
    obj.mesh.position.set(
      obj.body.position.x,
      obj.body.position.y,
      obj.body.position.z
    );
    obj.mesh.quaternion.set(
      obj.body.quaternion.x,
      obj.body.quaternion.y,
      obj.body.quaternion.z,
      obj.body.quaternion.w
    );
  }
}

// 添加物体
const box = createBox(
  new THREE.Vector3(1, 1, 1),
  new THREE.Vector3(0, 5, 0)
);
physicsObjects.push(box);
```

## 材质和碰撞

```typescript
// 创建物理材质
const groundMaterial = new CANNON.Material('ground');
const objectMaterial = new CANNON.Material('object');

// 定义材质间的接触行为
const contactMaterial = new CANNON.ContactMaterial(
  groundMaterial,
  objectMaterial,
  {
    friction: 0.4,          // 摩擦系数
    restitution: 0.3,       // 弹性系数
    contactEquationStiffness: 1e8,
    contactEquationRelaxation: 3,
  }
);

world.addContactMaterial(contactMaterial);

// 应用材质
groundBody.material = groundMaterial;
boxBody.material = objectMaterial;

// 碰撞事件
boxBody.addEventListener('collide', (event: CANNON.ICollisionEvent) => {
  const impactVelocity = event.contact.getImpactVelocityAlongNormal();
  
  if (impactVelocity > 1) {
    // 播放碰撞音效
    playCollisionSound(impactVelocity);
  }
});
```

## 约束和关节

```typescript
// 点对点约束（类似球窝关节）
const pivotA = new CANNON.Vec3(0.5, 0, 0);
const pivotB = new CANNON.Vec3(-0.5, 0, 0);

const pointConstraint = new CANNON.PointToPointConstraint(
  bodyA,
  pivotA,
  bodyB,
  pivotB
);
world.addConstraint(pointConstraint);

// 铰链约束（类似门轴）
const hingeConstraint = new CANNON.HingeConstraint(
  bodyA,
  bodyB,
  {
    pivotA: new CANNON.Vec3(1, 0, 0),
    pivotB: new CANNON.Vec3(-1, 0, 0),
    axisA: new CANNON.Vec3(0, 1, 0),
    axisB: new CANNON.Vec3(0, 1, 0),
  }
);
world.addConstraint(hingeConstraint);

// 距离约束（保持固定距离）
const distanceConstraint = new CANNON.DistanceConstraint(
  bodyA,
  bodyB,
  5 // 距离
);
world.addConstraint(distanceConstraint);

// 弹簧约束
const spring = new CANNON.Spring(
  bodyA,
  bodyB,
  {
    localAnchorA: new CANNON.Vec3(0, 0, 0),
    localAnchorB: new CANNON.Vec3(0, 0, 0),
    restLength: 2,
    stiffness: 50,
    damping: 1,
  }
);

// 弹簧需要手动更新
function animate() {
  spring.applyForce();
  world.step(timeStep);
}
```

## Rapier 物理引擎

```typescript
import RAPIER from '@dimforge/rapier3d-compat';

// 初始化（需要等待 WASM 加载）
async function initRapier() {
  await RAPIER.init();
  
  // 创建物理世界
  const gravity = { x: 0.0, y: -9.81, z: 0.0 };
  const world = new RAPIER.World(gravity);
  
  return world;
}

// 创建地面
function createRapierGround(world: RAPIER.World): RAPIER.RigidBody {
  const groundDesc = RAPIER.RigidBodyDesc.fixed()
    .setTranslation(0, 0, 0);
  const groundBody = world.createRigidBody(groundDesc);
  
  const groundColliderDesc = RAPIER.ColliderDesc.cuboid(50, 0.1, 50);
  world.createCollider(groundColliderDesc, groundBody);
  
  return groundBody;
}

// 创建动态物体
function createRapierBox(
  world: RAPIER.World,
  position: THREE.Vector3,
  size: THREE.Vector3
): RAPIER.RigidBody {
  const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
    .setTranslation(position.x, position.y, position.z);
  const body = world.createRigidBody(bodyDesc);
  
  const colliderDesc = RAPIER.ColliderDesc.cuboid(
    size.x / 2,
    size.y / 2,
    size.z / 2
  );
  world.createCollider(colliderDesc, body);
  
  return body;
}

// 更新循环
function updateRapier(world: RAPIER.World, meshes: Map<number, THREE.Mesh>) {
  world.step();
  
  world.bodies.forEach((body) => {
    const mesh = meshes.get(body.handle);
    if (mesh) {
      const position = body.translation();
      const rotation = body.rotation();
      
      mesh.position.set(position.x, position.y, position.z);
      mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
    }
  });
}
```

## 物理管理器

```typescript
class PhysicsManager {
  world: CANNON.World;
  private objects: Map<number, {
    mesh: THREE.Object3D;
    body: CANNON.Body;
  }> = new Map();
  private nextId = 0;
  
  constructor() {
    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -9.82, 0),
    });
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    this.world.allowSleep = true;
  }
  
  addBox(
    mesh: THREE.Mesh,
    size: THREE.Vector3,
    mass: number
  ): number {
    const body = new CANNON.Body({
      mass,
      shape: new CANNON.Box(
        new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2)
      ),
      position: new CANNON.Vec3(
        mesh.position.x,
        mesh.position.y,
        mesh.position.z
      ),
    });
    
    this.world.addBody(body);
    
    const id = this.nextId++;
    this.objects.set(id, { mesh, body });
    
    return id;
  }
  
  addSphere(
    mesh: THREE.Mesh,
    radius: number,
    mass: number
  ): number {
    const body = new CANNON.Body({
      mass,
      shape: new CANNON.Sphere(radius),
      position: new CANNON.Vec3(
        mesh.position.x,
        mesh.position.y,
        mesh.position.z
      ),
    });
    
    this.world.addBody(body);
    
    const id = this.nextId++;
    this.objects.set(id, { mesh, body });
    
    return id;
  }
  
  addTrimesh(mesh: THREE.Mesh): number {
    const geometry = mesh.geometry as THREE.BufferGeometry;
    const positions = geometry.attributes.position.array as Float32Array;
    const indices = geometry.index?.array as Uint32Array | undefined;
    
    const shape = new CANNON.Trimesh(
      Array.from(positions),
      indices ? Array.from(indices) : undefined
    );
    
    const body = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape,
    });
    
    // 同步变换
    body.position.copy(mesh.position as unknown as CANNON.Vec3);
    body.quaternion.copy(mesh.quaternion as unknown as CANNON.Quaternion);
    
    this.world.addBody(body);
    
    const id = this.nextId++;
    this.objects.set(id, { mesh, body });
    
    return id;
  }
  
  applyForce(id: number, force: THREE.Vector3, point?: THREE.Vector3): void {
    const obj = this.objects.get(id);
    if (!obj) return;
    
    const cannonForce = new CANNON.Vec3(force.x, force.y, force.z);
    
    if (point) {
      const cannonPoint = new CANNON.Vec3(point.x, point.y, point.z);
      obj.body.applyForce(cannonForce, cannonPoint);
    } else {
      obj.body.applyForce(cannonForce);
    }
  }
  
  applyImpulse(id: number, impulse: THREE.Vector3): void {
    const obj = this.objects.get(id);
    if (!obj) return;
    
    obj.body.applyImpulse(
      new CANNON.Vec3(impulse.x, impulse.y, impulse.z)
    );
  }
  
  setVelocity(id: number, velocity: THREE.Vector3): void {
    const obj = this.objects.get(id);
    if (!obj) return;
    
    obj.body.velocity.set(velocity.x, velocity.y, velocity.z);
  }
  
  remove(id: number): void {
    const obj = this.objects.get(id);
    if (obj) {
      this.world.removeBody(obj.body);
      this.objects.delete(id);
    }
  }
  
  update(delta: number): void {
    this.world.step(1 / 60, delta, 3);
    
    for (const { mesh, body } of this.objects.values()) {
      mesh.position.set(
        body.position.x,
        body.position.y,
        body.position.z
      );
      mesh.quaternion.set(
        body.quaternion.x,
        body.quaternion.y,
        body.quaternion.z,
        body.quaternion.w
      );
    }
  }
}
```

## 射线检测

```typescript
// Cannon-es 射线检测
function raycast(
  world: CANNON.World,
  from: THREE.Vector3,
  to: THREE.Vector3
): CANNON.RaycastResult | null {
  const result = new CANNON.RaycastResult();
  
  world.raycastClosest(
    new CANNON.Vec3(from.x, from.y, from.z),
    new CANNON.Vec3(to.x, to.y, to.z),
    {},
    result
  );
  
  if (result.hasHit) {
    return result;
  }
  
  return null;
}

// 使用示例
const hit = raycast(world, camera.position, targetPosition);
if (hit) {
  console.log('Hit point:', hit.hitPointWorld);
  console.log('Hit normal:', hit.hitNormalWorld);
  console.log('Hit body:', hit.body);
}
```

## 角色控制器

```typescript
class CharacterController {
  body: CANNON.Body;
  private moveSpeed = 5;
  private jumpForce = 10;
  private canJump = true;
  
  constructor(world: CANNON.World, position: THREE.Vector3) {
    this.body = new CANNON.Body({
      mass: 80,
      shape: new CANNON.Sphere(0.5),
      position: new CANNON.Vec3(position.x, position.y, position.z),
      linearDamping: 0.9,
      angularDamping: 1,
    });
    
    // 禁止旋转
    this.body.fixedRotation = true;
    
    // 地面检测
    this.body.addEventListener('collide', (e: CANNON.ICollisionEvent) => {
      const contact = e.contact;
      const normal = contact.ni;
      
      // 检查是否踩在地面上（法线向上）
      if (normal.y > 0.5) {
        this.canJump = true;
      }
    });
    
    world.addBody(this.body);
  }
  
  move(direction: THREE.Vector3): void {
    const velocity = this.body.velocity;
    
    velocity.x = direction.x * this.moveSpeed;
    velocity.z = direction.z * this.moveSpeed;
  }
  
  jump(): void {
    if (this.canJump) {
      this.body.velocity.y = this.jumpForce;
      this.canJump = false;
    }
  }
  
  getPosition(): THREE.Vector3 {
    return new THREE.Vector3(
      this.body.position.x,
      this.body.position.y,
      this.body.position.z
    );
  }
}
```

## 本章小结

- Cannon-es 是轻量级纯 JS 物理引擎
- Rapier 提供高性能 WASM 物理引擎
- 需要同步物理体和渲染网格
- 材质定义摩擦和弹性
- 约束实现关节和连接
- 射线检测用于碰撞查询

下一章，我们将学习粒子系统。
