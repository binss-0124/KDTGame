import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.124/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.124/examples/jsm/loaders/GLTFLoader.js';

export const player = (() => {
  class Player {
    constructor(params) {
      this.position_ = new THREE.Vector3(0, 0, 0);
      this.velocity_ = new THREE.Vector3(0, 0, 0);
      this.speed_ = 5;
      this.params_ = params;
      if (this.params_.position) {
        this.position_.copy(this.params_.position);
      }
      this.mainTopY_ = params.mainTopY; // mainTopY 저장
      this.tableBoundingBox_ = params.tableBoundingBox; // 추가: 당구대 전체 바운딩 박스
      this.mesh_ = null;
      this.mixer_ = null;
      this.animations_ = {};
      this.currentAction_ = null;
      this.keys_ = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        shift: false,
        debug: false,
      };
      this.jumpPower_ = 15;
      this.gravity_ = -30;
      this.isJumping_ = false;
      this.velocityY_ = 0;
      this.jumpSpeed_ = 0.5;
      this.maxStepHeight_ = 0.5;
      this.boundingBox_ = new THREE.Box3();
      this.boundingBoxHelper_ = null;
      this.isRolling_ = false;
      this.rollDuration_ = 0.5;
      this.rollTimer_ = 0;
      this.rollSpeed_ = 18;
      this.rollDirection_ = new THREE.Vector3(0, 0, 0);
      this.rollCooldown_ = 1.0;
      this.rollCooldownTimer_ = 0;
      this.isFalling_ = false; // 추가: 떨어지는 상태 플래그

      this.LoadModel_();
      this.InitInput_();
    }

    InitInput_() {
      window.addEventListener('keydown', (e) => this.OnKeyDown_(e), false);
      window.addEventListener('keyup', (e) => this.OnKeyUp_(e), false);
    }

    OnKeyDown_(event) {
      switch (event.code) {
        case 'KeyW': this.keys_.forward = true; break;
        case 'KeyS': this.keys_.backward = true; break;
        case 'KeyA': this.keys_.left = true; break;
        case 'KeyD': this.keys_.right = true; break;
        case 'ShiftLeft':
        case 'ShiftRight': this.keys_.shift = true; break;
        case 'KeyK':
          if (!this.isJumping_ && !this.isRolling_) {
            this.isJumping_ = true;
            this.velocityY_ = this.jumpPower_;
            this.SetAnimation_('Jump');
          }
          break;
        case 'KeyL':
          if (
            !this.isJumping_ &&
            !this.isRolling_ &&
            this.animations_['Roll'] &&
            this.rollCooldownTimer_ <= 0
          ) {
            this.isRolling_ = true;
            this.rollTimer_ = this.rollDuration_;
            const moveDir = new THREE.Vector3();
            if (this.keys_.forward) moveDir.z -= 1;
            if (this.keys_.backward) moveDir.z += 1;
            if (this.keys_.left) moveDir.x -= 1;
            if (this.keys_.right) moveDir.x += 1;
            if (moveDir.lengthSq() === 0) {
              this.mesh_.getWorldDirection(moveDir);
              moveDir.y = 0;
              moveDir.normalize();
            } else {
              moveDir.normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), this.lastRotationAngle_ || 0);
            }
            this.rollDirection_.copy(moveDir);
            this.SetAnimation_('Roll');
            this.rollCooldownTimer_ = this.rollCooldown_;
          }
          break;
          case 'KeyB':
          this.keys_.debug = !this.keys_.debug;
          this.UpdateDebugVisuals();
          break;
      }
    }

    OnKeyUp_(event) {
      switch (event.code) {
        case 'KeyW': this.keys_.forward = false; break;
        case 'KeyS': this.keys_.backward = false; break;
        case 'KeyA': this.keys_.left = false; break;
        case 'KeyD': this.keys_.right = false; break;
        case 'ShiftLeft':
        case 'ShiftRight': this.keys_.shift = false; break;
      }
    }

    LoadModel_() {
      const loader = new GLTFLoader();
      loader.setPath('./resources/Ultimate Animated Character Pack - Nov 2019/glTF/');
      loader.load('Knight_Male.gltf', (gltf) => {
        const model = gltf.scene;
        model.scale.setScalar(1);
        model.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
        this.mesh_ = model;
        this.params_.scene.add(model);

        model.traverse((c) => {
          if (c.isMesh) {
            c.castShadow = true;
            c.receiveShadow = true;
            if (c.material) {
              c.material.color.offsetHSL(0, 0, 0.25);
            }
          }
        });

        const halfWidth = 0.65;
        const halfHeight = 3.2;
        const halfDepth = 0.65;
        this.boundingBox_.set(
          new THREE.Vector3(-halfWidth, 0, -halfDepth),
          new THREE.Vector3(halfWidth, halfHeight, halfDepth)
        );
        this.boundingBox_.translate(this.position_);
        this.boundingBoxHelper_ = new THREE.Box3Helper(this.boundingBox_, 0xff0000);
        this.boundingBoxHelper_.visible = false;
        this.params_.scene.add(this.boundingBoxHelper_);

        this.mixer_ = new THREE.AnimationMixer(model);
        for (const clip of gltf.animations) {
          this.animations_[clip.name] = this.mixer_.clipAction(clip);
        }
        this.SetAnimation_('Idle');
      });
    }

    SetAnimation_(name) {
      if (!this.animations_[name]) {
        console.warn(`Animation "${name}" not found!`);
        return;
      }
      if (this.currentAction_ === this.animations_[name]) return;
      if (this.currentAction_) {
        this.currentAction_.fadeOut(0.3);
      }
      this.currentAction_ = this.animations_[name];
      if (this.currentAction_) {
        this.currentAction_.reset().fadeIn(0.3).play();
        if (name === 'Jump') {
          this.currentAction_.setLoop(THREE.LoopOnce);
          this.currentAction_.clampWhenFinished = true;
          this.currentAction_.time = 0.25;
          this.currentAction_.timeScale = this.jumpSpeed_;
        } else {
          this.currentAction_.timeScale = 1.0;
        }
      }
    }

    UpdateDebugVisuals() {
      if (this.boundingBoxHelper_) {
        this.boundingBoxHelper_.visible = this.keys_.debug;
      }
      if (this.params_.onDebugToggle) {
        this.params_.onDebugToggle(this.keys_.debug);
      }
    }

    ResolveCollisions_(newPosition, collidables, rimCollidables) {
      const tempBox = this.boundingBox_.clone();
      const size = tempBox.getSize(new THREE.Vector3());
      tempBox.setFromCenterAndSize(newPosition.clone().add(new THREE.Vector3(0, size.y / 2, 0)), size);

      let isOnTop = false;
      let topY = 0;

      for (const collidable of collidables.concat(rimCollidables)) {
        if (tempBox.intersectsBox(collidable.boundingBox)) {
          const playerWasAbove = this.boundingBox_.min.y >= collidable.boundingBox.max.y - 0.1;

          if (this.velocityY_ <= 0 && playerWasAbove) {
            isOnTop = true;
            topY = Math.max(topY, collidable.boundingBox.max.y);
            newPosition.y = topY;
            this.velocityY_ = 0;
            this.isJumping_ = false;
          } else {
            const center = tempBox.getCenter(new THREE.Vector3());
            const collidableCenter = collidable.boundingBox.getCenter(new THREE.Vector3());
            const overlap = tempBox.clone().intersect(collidable.boundingBox);
            const overlapSize = overlap.getSize(new THREE.Vector3());

            if (overlapSize.x < overlapSize.z) {
              const sign = Math.sign(center.x - collidableCenter.x);
              newPosition.x += overlapSize.x * sign;
            } else {
              const sign = Math.sign(center.z - collidableCenter.z);
              newPosition.z += overlapSize.z * sign;
            }
            tempBox.setFromCenterAndSize(newPosition.clone().add(new THREE.Vector3(0, size.y / 2, 0)), size);
          }
        }
      }
      return { newPosition, isOnTop };
    }

    Update(timeElapsed, rotationAngle = 0, collidables = [], rimCollidables = []) {
      if (!this.mesh_) return;

      this.lastRotationAngle_ = rotationAngle;

      if (this.rollCooldownTimer_ > 0) {
        this.rollCooldownTimer_ -= timeElapsed;
      }

      let velocity = new THREE.Vector3();
      let newPosition = this.position_.clone();
      let isOnTop = false;

      if (this.isRolling_) {
        this.rollTimer_ -= timeElapsed;
        velocity = this.rollDirection_.clone().multiplyScalar(this.rollSpeed_ * timeElapsed);
      } else {
        const isMoving = this.keys_.forward || this.keys_.backward || this.keys_.left || this.keys_.right;
        if (isMoving) {
          if (this.keys_.forward) velocity.z -= 1;
          if (this.keys_.backward) velocity.z += 1;
          if (this.keys_.left) velocity.x -= 1;
          if (this.keys_.right) velocity.x += 1;
          velocity.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotationAngle);
          velocity.normalize();

          const isRunning = this.keys_.shift;
          const moveSpeed = isRunning ? this.speed_ * 2 : this.speed_;
          velocity.multiplyScalar(moveSpeed * timeElapsed);
        }
      }
      
      newPosition.add(velocity);

      // Apply gravity
      this.velocityY_ += this.gravity_ * timeElapsed;
      newPosition.y += this.velocityY_ * timeElapsed;

      const collisionResult = this.ResolveCollisions_(newPosition, collidables, rimCollidables);
      newPosition = collisionResult.newPosition;
      isOnTop = collisionResult.isOnTop;

      // 당구대 범위 벗어남 감지 및 Y축 하강 로직 추가
      if (this.tableBoundingBox_) {
        const playerX = newPosition.x;
        const playerZ = newPosition.z;
        const tableMinX = this.tableBoundingBox_.min.x;
        const tableMaxX = this.tableBoundingBox_.max.x;
        const tableMinZ = this.tableBoundingBox_.min.z;
        const tableMaxZ = this.tableBoundingBox_.max.z;

        // 플레이어가 당구대 X 또는 Z 범위를 벗어났는지 확인
        if (playerX < tableMinX || playerX > tableMaxX || playerZ < tableMinZ || playerZ > tableMaxZ) {
          
          this.isFalling_ = true; // 떨어지는 상태를 나타내는 플래그
        newPosition.y -= 15; // Y축으로 15픽셀 하강
        } else {
          this.isFalling_ = false;
        }
      }

      this.position_.copy(newPosition);

      // Ground check
      if (this.position_.y <= this.mainTopY_ && !isOnTop && !this.isFalling_) { // isFalling_ 조건 추가
        this.position_.y = this.mainTopY_;
        this.velocityY_ = 0;
        if (this.isJumping_) {
            this.isJumping_ = false;
            const isMoving = this.keys_.forward || this.keys_.backward || this.keys_.left || this.keys_.right;
            this.SetAnimation_(isMoving ? 'Walk' : 'Idle');
        }
      }

      // Rotation update
      if (velocity.length() > 0.01) {
        const angle = Math.atan2(velocity.x, velocity.z);
        const targetQuaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
        this.mesh_.quaternion.slerp(targetQuaternion, 0.3);
      }

      // Animation update
      if (this.isRolling_) {
        if (this.rollTimer_ <= 0) {
          this.isRolling_ = false;
          this.rollCooldownTimer_ = this.rollCooldown_;
          const isMoving = this.keys_.forward || this.keys_.backward || this.keys_.left || this.keys_.right;
          this.SetAnimation_(isMoving ? 'Walk' : 'Idle');
        }
      } else {
        if (this.isJumping_) {
          this.SetAnimation_('Jump');
        } else {
          const isMoving = this.keys_.forward || this.keys_.backward || this.keys_.left || this.keys_.right;
          const isRunning = isMoving && this.keys_.shift;
          if (isMoving) {
            this.SetAnimation_(isRunning ? 'Run' : 'Walk');
          } else {
            this.SetAnimation_('Idle');
          }
        }
      }

      this.mesh_.position.copy(this.position_);
      const boxSize = this.boundingBox_.getSize(new THREE.Vector3());
      this.boundingBox_.setFromCenterAndSize(this.position_.clone().add(new THREE.Vector3(0, boxSize.y / 2, 0)), boxSize);
      
      if (this.boundingBoxHelper_) {
        this.boundingBoxHelper_.box.copy(this.boundingBox_);
      }

      if (this.mixer_) {
        this.mixer_.update(timeElapsed);
      }
    }
  }

  return {
    Player: Player,
  };
})();

export function getPlayerBoundingBox(playerInstance) {
  return playerInstance.boundingBox_;
}
