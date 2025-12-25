# 骨骼动画与 IK

> "骨骼系统让角色动起来，IK 让它们与世界互动。"

## 骨骼系统概述

```
骨骼动画结构：

                    Root
                     │
              ┌──────┼──────┐
              │             │
            Spine         Pelvis
              │             │
         ┌────┴────┐    ┌───┴───┐
         │         │    │       │
       Chest    Neck  L_Hip   R_Hip
         │       │      │       │
    ┌────┴────┐  │   L_Knee  R_Knee
    │         │  │      │       │
  L_Shoulder R_Shoulder L_Ankle R_Ankle
    │         │
  L_Elbow   R_Elbow
    │         │
  L_Wrist   R_Wrist

每个骨骼（Bone）：
- 相对父骨骼的位置、旋转、缩放
- 影响周围的蒙皮顶点
```

## Bone 和 Skeleton

```typescript
import {
  Bone,
  Skeleton,
  SkinnedMesh,
  SkeletonHelper,
  BufferGeometry,
  Float32BufferAttribute,
  Uint16BufferAttribute,
} from 'three';

// 创建骨骼链
function createBoneChain(length: number): { bones: Bone[]; root: Bone } {
  const bones: Bone[] = [];
  let prevBone: Bone | null = null;
  
  for (let i = 0; i < length; i++) {
    const bone = new Bone();
    bone.name = `bone_${i}`;
    bone.position.y = i === 0 ? 0 : 1; // 骨骼长度
    
    if (prevBone) {
      prevBone.add(bone);
    }
    
    bones.push(bone);
    prevBone = bone;
  }
  
  return { bones, root: bones[0] };
}

// 创建骨架
function createSkeleton(bones: Bone[]): Skeleton {
  // 计算每个骨骼的逆绑定矩阵
  bones[0].updateMatrixWorld(true);
  
  const skeleton = new Skeleton(bones);
  return skeleton;
}

// 创建蒙皮网格
function createSkinnedCylinder(
  skeleton: Skeleton,
  segmentHeight: number,
  segments: number
): SkinnedMesh {
  const geometry = new BufferGeometry();
  
  // 顶点位置
  const positions: number[] = [];
  const skinIndices: number[] = [];
  const skinWeights: number[] = [];
  
  const radius = 0.5;
  const radialSegments = 8;
  
  for (let j = 0; j <= segments; j++) {
    const y = j * segmentHeight;
    
    for (let i = 0; i <= radialSegments; i++) {
      const theta = (i / radialSegments) * Math.PI * 2;
      const x = Math.cos(theta) * radius;
      const z = Math.sin(theta) * radius;
      
      positions.push(x, y, z);
      
      // 计算蒙皮权重
      const boneIndex = Math.min(j, skeleton.bones.length - 1);
      const nextBone = Math.min(boneIndex + 1, skeleton.bones.length - 1);
      const weight = (j % 1);
      
      skinIndices.push(boneIndex, nextBone, 0, 0);
      skinWeights.push(1 - weight, weight, 0, 0);
    }
  }
  
  // 索引
  const indices: number[] = [];
  for (let j = 0; j < segments; j++) {
    for (let i = 0; i < radialSegments; i++) {
      const a = j * (radialSegments + 1) + i;
      const b = a + 1;
      const c = a + radialSegments + 1;
      const d = c + 1;
      
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }
  
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('skinIndex', new Uint16BufferAttribute(skinIndices, 4));
  geometry.setAttribute('skinWeight', new Float32BufferAttribute(skinWeights, 4));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  
  const material = new MeshStandardMaterial({
    skinning: true,
    color: 0x88aaff,
  });
  
  const mesh = new SkinnedMesh(geometry, material);
  mesh.add(skeleton.bones[0]); // 添加根骨骼
  mesh.bind(skeleton);
  
  return mesh;
}

// 使用
const { bones, root } = createBoneChain(5);
const skeleton = createSkeleton(bones);
const skinnedMesh = createSkinnedCylinder(skeleton, 1, 4);

scene.add(skinnedMesh);

// 添加骨骼可视化
const helper = new SkeletonHelper(skinnedMesh);
scene.add(helper);
```

## SkinnedMesh 详解

```typescript
// SkinnedMesh 属性
interface SkinnedMeshProperties {
  skeleton: Skeleton;         // 绑定的骨架
  bindMatrix: Matrix4;        // 绑定矩阵
  bindMatrixInverse: Matrix4; // 绑定逆矩阵
  bindMode: 'attached' | 'detached';
}

// 访问骨骼
function manipulateBones(mesh: SkinnedMesh): void {
  const skeleton = mesh.skeleton;
  
  // 通过名称查找骨骼
  const spine = skeleton.getBoneByName('Spine');
  if (spine) {
    spine.rotation.x = Math.PI / 6; // 弯腰
  }
  
  // 通过索引访问
  skeleton.bones.forEach((bone, index) => {
    console.log(`Bone ${index}: ${bone.name}`);
  });
}

// 更新骨架
function updateSkeleton(mesh: SkinnedMesh): void {
  // 手动更新（通常由动画系统处理）
  mesh.skeleton.update();
}

// 获取骨骼世界位置
function getBoneWorldPosition(
  skeleton: Skeleton,
  boneName: string
): Vector3 | null {
  const bone = skeleton.getBoneByName(boneName);
  if (!bone) return null;
  
  const position = new Vector3();
  bone.getWorldPosition(position);
  return position;
}
```

## 逆向运动学（IK）基础

```
正向运动学 (FK) vs 逆向运动学 (IK)：

FK: 从根部到末端
Root → Shoulder → Elbow → Wrist → Hand
  已知各关节角度，计算末端位置

IK: 从末端到根部
Hand (目标位置) → 反推各关节角度
  已知目标位置，反算关节旋转
```

## CCD IK 实现

```typescript
// Cyclic Coordinate Descent (CCD) IK
class CCDIKSolver {
  private chain: Bone[];
  private target: Vector3;
  private iterations: number;
  private tolerance: number;
  
  constructor(
    chain: Bone[],
    iterations = 10,
    tolerance = 0.01
  ) {
    this.chain = chain;
    this.target = new Vector3();
    this.iterations = iterations;
    this.tolerance = tolerance;
  }
  
  solve(targetPosition: Vector3): void {
    this.target.copy(targetPosition);
    
    const endEffector = this.chain[this.chain.length - 1];
    
    for (let i = 0; i < this.iterations; i++) {
      // 从末端向根部遍历
      for (let j = this.chain.length - 2; j >= 0; j--) {
        const bone = this.chain[j];
        
        // 获取末端位置
        const endPos = new Vector3();
        endEffector.getWorldPosition(endPos);
        
        // 获取当前骨骼位置
        const bonePos = new Vector3();
        bone.getWorldPosition(bonePos);
        
        // 计算到末端和目标的方向
        const toEnd = endPos.clone().sub(bonePos).normalize();
        const toTarget = this.target.clone().sub(bonePos).normalize();
        
        // 计算旋转
        const dot = toEnd.dot(toTarget);
        if (dot < 0.9999) {
          const axis = new Vector3().crossVectors(toEnd, toTarget).normalize();
          const angle = Math.acos(Math.min(1, Math.max(-1, dot)));
          
          // 应用旋转
          const quaternion = new Quaternion().setFromAxisAngle(axis, angle);
          
          // 转换到本地空间
          const parentWorldQuat = new Quaternion();
          if (bone.parent) {
            bone.parent.getWorldQuaternion(parentWorldQuat);
          }
          parentWorldQuat.invert();
          
          const localRotation = quaternion.premultiply(parentWorldQuat);
          bone.quaternion.premultiply(localRotation);
          
          // 更新矩阵
          bone.updateMatrixWorld(true);
        }
        
        // 检查是否达到目标
        endEffector.getWorldPosition(endPos);
        if (endPos.distanceTo(this.target) < this.tolerance) {
          return;
        }
      }
    }
  }
}
```

## FABRIK 算法

```typescript
// Forward And Backward Reaching Inverse Kinematics
class FABRIKSolver {
  private positions: Vector3[];
  private lengths: number[];
  private iterations: number;
  private tolerance: number;
  
  constructor(
    bones: Bone[],
    iterations = 10,
    tolerance = 0.01
  ) {
    this.iterations = iterations;
    this.tolerance = tolerance;
    
    // 提取位置和长度
    this.positions = bones.map(bone => {
      const pos = new Vector3();
      bone.getWorldPosition(pos);
      return pos;
    });
    
    this.lengths = [];
    for (let i = 0; i < this.positions.length - 1; i++) {
      this.lengths.push(
        this.positions[i].distanceTo(this.positions[i + 1])
      );
    }
  }
  
  solve(target: Vector3): Vector3[] {
    const n = this.positions.length;
    const rootPos = this.positions[0].clone();
    
    // 检查是否可达
    const totalLength = this.lengths.reduce((a, b) => a + b, 0);
    const distance = rootPos.distanceTo(target);
    
    if (distance > totalLength) {
      // 不可达，伸直指向目标
      const direction = target.clone().sub(rootPos).normalize();
      for (let i = 1; i < n; i++) {
        this.positions[i].copy(
          this.positions[i - 1].clone().add(
            direction.clone().multiplyScalar(this.lengths[i - 1])
          )
        );
      }
      return this.positions;
    }
    
    for (let iter = 0; iter < this.iterations; iter++) {
      // 向后阶段（从末端到根部）
      this.positions[n - 1].copy(target);
      for (let i = n - 2; i >= 0; i--) {
        const direction = this.positions[i].clone()
          .sub(this.positions[i + 1]).normalize();
        this.positions[i].copy(
          this.positions[i + 1].clone().add(
            direction.multiplyScalar(this.lengths[i])
          )
        );
      }
      
      // 向前阶段（从根部到末端）
      this.positions[0].copy(rootPos);
      for (let i = 1; i < n; i++) {
        const direction = this.positions[i].clone()
          .sub(this.positions[i - 1]).normalize();
        this.positions[i].copy(
          this.positions[i - 1].clone().add(
            direction.multiplyScalar(this.lengths[i - 1])
          )
        );
      }
      
      // 检查收敛
      if (this.positions[n - 1].distanceTo(target) < this.tolerance) {
        break;
      }
    }
    
    return this.positions;
  }
  
  // 将结果应用到骨骼
  applyToBones(bones: Bone[]): void {
    for (let i = 0; i < bones.length - 1; i++) {
      const bone = bones[i];
      const currentPos = new Vector3();
      bone.getWorldPosition(currentPos);
      
      const targetDirection = this.positions[i + 1].clone()
        .sub(this.positions[i]).normalize();
      
      // 计算原始方向
      const originalDirection = new Vector3(0, 1, 0); // 假设骨骼沿 Y 轴
      
      // 计算旋转
      const quaternion = new Quaternion().setFromUnitVectors(
        originalDirection,
        targetDirection
      );
      
      // 转换到本地空间并应用
      const parentWorldQuat = new Quaternion();
      if (bone.parent) {
        bone.parent.getWorldQuaternion(parentWorldQuat);
      }
      parentWorldQuat.invert();
      
      bone.quaternion.copy(quaternion.premultiply(parentWorldQuat));
      bone.updateMatrixWorld(true);
    }
  }
}
```

## 实用 IK 应用

```typescript
// 脚部 IK - 地面适应
class FootIK {
  private leftLeg: Bone[];
  private rightLeg: Bone[];
  private solver: CCDIKSolver;
  
  constructor(skeleton: Skeleton) {
    // 获取腿部骨骼链
    this.leftLeg = [
      skeleton.getBoneByName('LeftUpLeg')!,
      skeleton.getBoneByName('LeftLeg')!,
      skeleton.getBoneByName('LeftFoot')!,
    ];
    
    this.rightLeg = [
      skeleton.getBoneByName('RightUpLeg')!,
      skeleton.getBoneByName('RightLeg')!,
      skeleton.getBoneByName('RightFoot')!,
    ];
    
    this.solver = new CCDIKSolver(this.leftLeg);
  }
  
  update(leftTarget: Vector3, rightTarget: Vector3): void {
    // 左脚 IK
    this.solver = new CCDIKSolver(this.leftLeg);
    this.solver.solve(leftTarget);
    
    // 右脚 IK
    this.solver = new CCDIKSolver(this.rightLeg);
    this.solver.solve(rightTarget);
  }
}

// 视线 IK - 头部跟踪
class LookAtIK {
  private headBone: Bone;
  private maxRotation = Math.PI / 4; // 最大旋转角度
  
  constructor(skeleton: Skeleton) {
    this.headBone = skeleton.getBoneByName('Head')!;
  }
  
  lookAt(target: Vector3): void {
    const headPos = new Vector3();
    this.headBone.getWorldPosition(headPos);
    
    // 计算目标方向
    const direction = target.clone().sub(headPos).normalize();
    
    // 创建旋转
    const quaternion = new Quaternion();
    const forward = new Vector3(0, 0, 1);
    quaternion.setFromUnitVectors(forward, direction);
    
    // 限制旋转范围
    const euler = new Euler().setFromQuaternion(quaternion);
    euler.x = MathUtils.clamp(euler.x, -this.maxRotation, this.maxRotation);
    euler.y = MathUtils.clamp(euler.y, -this.maxRotation, this.maxRotation);
    quaternion.setFromEuler(euler);
    
    // 平滑插值
    this.headBone.quaternion.slerp(quaternion, 0.1);
  }
}

// 手部 IK - 抓取物体
class GrabIK {
  private armBones: Bone[];
  private solver: FABRIKSolver;
  
  constructor(skeleton: Skeleton, side: 'left' | 'right') {
    const prefix = side === 'left' ? 'Left' : 'Right';
    
    this.armBones = [
      skeleton.getBoneByName(`${prefix}Arm`)!,
      skeleton.getBoneByName(`${prefix}ForeArm`)!,
      skeleton.getBoneByName(`${prefix}Hand`)!,
    ];
    
    this.solver = new FABRIKSolver(this.armBones);
  }
  
  reachFor(target: Vector3): void {
    const positions = this.solver.solve(target);
    this.solver.applyToBones(this.armBones);
  }
}
```

## 约束系统

```typescript
// 关节约束
interface JointConstraint {
  minAngle: number;
  maxAngle: number;
  axis: Vector3;
}

class ConstrainedBone {
  bone: Bone;
  constraint: JointConstraint;
  
  constructor(bone: Bone, constraint: JointConstraint) {
    this.bone = bone;
    this.constraint = constraint;
  }
  
  applyConstraint(): void {
    const euler = new Euler().setFromQuaternion(this.bone.quaternion);
    
    // 根据约束轴应用限制
    if (this.constraint.axis.x === 1) {
      euler.x = MathUtils.clamp(
        euler.x,
        this.constraint.minAngle,
        this.constraint.maxAngle
      );
    }
    if (this.constraint.axis.y === 1) {
      euler.y = MathUtils.clamp(
        euler.y,
        this.constraint.minAngle,
        this.constraint.maxAngle
      );
    }
    if (this.constraint.axis.z === 1) {
      euler.z = MathUtils.clamp(
        euler.z,
        this.constraint.minAngle,
        this.constraint.maxAngle
      );
    }
    
    this.bone.quaternion.setFromEuler(euler);
  }
}

// 膝盖约束示例
const kneeConstraint = new ConstrainedBone(kneeBone, {
  minAngle: 0,
  maxAngle: Math.PI * 0.8, // 膝盖只能向一个方向弯曲
  axis: new Vector3(1, 0, 0),
});
```

## 本章小结

- Bone 和 Skeleton 构成骨骼系统基础
- SkinnedMesh 将几何体绑定到骨架
- IK 根据目标位置反算关节角度
- CCD 和 FABRIK 是常用的 IK 算法
- 约束系统限制关节运动范围
- IK 常用于脚步适应、视线跟踪、手部抓取

下一章，我们将学习后处理效果系统。
