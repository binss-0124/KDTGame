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
      this.jumpPower_ = 12;
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
          /*
        case 'KeyB':
          this.keys_.debug = !this.keys_.debug;
          this.UpdateDebugVisuals();
          break;*/
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

        // 고정된 크기의 바운딩 박스 초기화
        const halfWidth = 0.65; // 너비: 1.0
        const halfHeight = 3.2; // 높이: 2.5
        const halfDepth = 0.65; // 깊이: 1.0
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

    Update(timeElapsed, rotationAngle = 0, collidables = [], rimCollidables = []) {
      if (!this.mesh_) return;

      this.lastRotationAngle_ = rotationAngle;

      if (this.rollCooldownTimer_ > 0) {
        this.rollCooldownTimer_ -= timeElapsed;
        if (this.rollCooldownTimer_ < 0) this.rollCooldownTimer_ = 0;
      }

      let newPosition = this.position_.clone();
      let velocity = new THREE.Vector3();
      const forward = new THREE.Vector3(0, 0, -1);
      const right = new THREE.Vector3(1, 0, 0);

      // 입력에 따른 방향 계산
      if (this.keys_.forward) velocity.z -= 1;
      if (this.keys_.backward) velocity.z += 1;
      if (this.keys_.left) velocity.x -= 1;
      if (this.keys_.right) velocity.x += 1;
      velocity.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotationAngle);

      // 회전 업데이트 (충돌과 무관하게 항상 처리)
      if (velocity.length() > 0.01) {
        const angle = Math.atan2(velocity.x, velocity.z);
        const targetQuaternion = new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(0, 1, 0), angle
        );
        this.mesh_.quaternion.slerp(targetQuaternion, 0.3);
      }

      if (this.isRolling_) {
        this.rollTimer_ -= timeElapsed;
        const rollMove = this.rollDirection_.clone().multiplyScalar(this.rollSpeed_ * timeElapsed);
        newPosition.add(rollMove);

        // 중력 적용
        this.velocityY_ += this.gravity_ * timeElapsed;
        newPosition.y += this.velocityY_ * timeElapsed;

        // 구르기 중 충돌 체크 및 슬라이딩 처리
        const tempBox = this.boundingBox_.clone();
        tempBox.translate(rollMove);
        tempBox.translate(new THREE.Vector3(0, this.velocityY_ * timeElapsed, 0));

        let canMove = true;
        let adjustedRollMove = rollMove.clone();
        let isOnTop = false;
        let topY = 0;

        for (const collidable of collidables.concat(rimCollidables)) {
          if (tempBox.intersectsBox(collidable.boundingBox)) {
            // 플레이어가 오브젝트 위에 있는지 확인
            const playerBottom = this.boundingBox_.min.y + this.velocityY_ * timeElapsed;
            const collidableTop = collidable.boundingBox.max.y;
            if (playerBottom >= collidableTop - 0.1 && this.position_.y >= collidableTop - 0.1) {
              isOnTop = true;
              topY = Math.max(topY, collidableTop);
              // X/Z 이동은 허용하되, 바운딩 박스 경계 체크
              const newTempBox = this.boundingBox_.clone();
              newTempBox.translate(rollMove);
              if (
                newTempBox.min.x > collidable.boundingBox.max.x ||
                newTempBox.max.x < collidable.boundingBox.min.x ||
                newTempBox.min.z > collidable.boundingBox.max.z ||
                newTempBox.max.z < collidable.boundingBox.min.z
              ) {
                isOnTop = false; // 경계를 벗어나면 떨어져야 함
              }
              if (isOnTop) continue; // 오브젝트 위에 있으면 X/Z 이동 허용
            }

            canMove = false;
            // X와 Z 방향을 개별적으로 테스트
            let canMoveX = true;
            let canMoveZ = true;

            // X 방향 테스트
            const tempBoxX = this.boundingBox_.clone();
            tempBoxX.translate(new THREE.Vector3(rollMove.x, this.velocityY_ * timeElapsed, 0));
            if (tempBoxX.intersectsBox(collidable.boundingBox)) {
              canMoveX = false;
            }

            // Z 방향 테스트
            const tempBoxZ = this.boundingBox_.clone();
            tempBoxZ.translate(new THREE.Vector3(0, this.velocityY_ * timeElapsed, rollMove.z));
            if (tempBoxZ.intersectsBox(collidable.boundingBox)) {
              canMoveZ = false;
            }

            // 슬라이딩: 충돌하지 않는 방향으로만 이동
            if (!canMoveX && canMoveZ) {
              adjustedRollMove.x = 0; // X 방향 이동 차단
            } else if (canMoveX && !canMoveZ) {
              adjustedRollMove.z = 0; // Z 방향 이동 차단
            } else {
              adjustedRollMove.set(0, 0, 0); // 둘 다 충돌 시 이동 차단
            }
            break; // 첫 번째 충돌 처리 후 종료
          }
        }

        if (canMove || adjustedRollMove.length() > 0) {
          this.position_.add(adjustedRollMove);
          if (isOnTop) {
            this.position_.y = topY; // 오브젝트 위에 고정
            this.velocityY_ = 0;
            this.isJumping_ = false;
          } else {
            this.position_.y = newPosition.y; // 중력에 따라 Y 이동
          }
        } else {
          this.position_.y = newPosition.y; // Y 이동은 허용
        }

        // 바닥 체크
        if (this.position_.y <= this.mainTopY_ && !isOnTop) {
          this.position_.y = this.mainTopY_;
          this.velocityY_ = 0;
          this.isJumping_ = false;
        }

        if (this.rollTimer_ <= 0) {
          this.isRolling_ = false;
          const isMoving = this.keys_.forward || this.keys_.backward || this.keys_.left || this.keys_.right;
          const isRunning = isMoving && this.keys_.shift;
          this.SetAnimation_(isMoving ? (isRunning ? 'Run' : 'Walk') : 'Idle');
        }
      } else {
        const isMoving = this.keys_.forward || this.keys_.backward || this.keys_.left || this.keys_.right;
        const isRunning = isMoving && this.keys_.shift;
        const moveSpeed = isRunning ? this.speed_ * 2 : this.speed_;

        velocity.normalize().multiplyScalar(moveSpeed * timeElapsed);
        newPosition.add(velocity);

        // 중력 적용
        this.velocityY_ += this.gravity_ * timeElapsed;
        newPosition.y += this.velocityY_ * timeElapsed;

        // 충돌 감지 및 슬라이딩 처리
        const tempBox = this.boundingBox_.clone();
        tempBox.translate(velocity);
        tempBox.translate(new THREE.Vector3(0, this.velocityY_ * timeElapsed, 0));

        let canMove = true;
        let stepUpHeight = 0;
        let adjustedVelocity = velocity.clone();
        let isOnTop = false;
        let topY = 0;

        for (const collidable of collidables.concat(rimCollidables)) {
          if (tempBox.intersectsBox(collidable.boundingBox)) {
            // 플레이어가 오브젝트 위에 있는지 확인
            const playerBottom = this.boundingBox_.min.y + this.velocityY_ * timeElapsed;
            const collidableTop = collidable.boundingBox.max.y;
            if (playerBottom >= collidableTop - 0.1 && this.position_.y >= collidableTop - 0.1) {
              isOnTop = true;
              topY = Math.max(topY, collidableTop);
              // X/Z 이동은 허용하되, 바운딩 박스 경계 체크
              const newTempBox = this.boundingBox_.clone();
              newTempBox.translate(velocity);
              if (
                newTempBox.min.x > collidable.boundingBox.max.x ||
                newTempBox.max.x < collidable.boundingBox.min.x ||
                newTempBox.min.z > collidable.boundingBox.max.z ||
                newTempBox.max.z < collidable.boundingBox.min.z
              ) {
                isOnTop = false; // 경계를 벗어나면 떨어져야 함
              }
              if (isOnTop) continue; // 오브젝트 위에 있으면 X/Z 이동 허용
            }

            const boxMaxY = collidable.boundingBox.max.y;
            if (boxMaxY <= this.position_.y + this.maxStepHeight_ && boxMaxY > this.position_.y) {
              stepUpHeight = Math.max(stepUpHeight, boxMaxY - this.position_.y);
            } else {
              canMove = false;
              // X와 Z 방향을 개별적으로 테스트
              let canMoveX = true;
              let canMoveZ = true;

              // X 방향 테스트
              const tempBoxX = this.boundingBox_.clone();
              tempBoxX.translate(new THREE.Vector3(velocity.x, this.velocityY_ * timeElapsed, 0));
              if (tempBoxX.intersectsBox(collidable.boundingBox)) {
                canMoveX = false;
              }

              // Z 방향 테스트
              const tempBoxZ = this.boundingBox_.clone();
              tempBoxZ.translate(new THREE.Vector3(0, this.velocityY_ * timeElapsed, velocity.z));
              if (tempBoxZ.intersectsBox(collidable.boundingBox)) {
                canMoveZ = false;
              }

              // 슬라이딩: 충돌하지 않는 방향으로만 이동
              if (!canMoveX && canMoveZ) {
                adjustedVelocity.x = 0; // X 방향 이동 차단
              } else if (canMoveX && !canMoveZ) {
                adjustedVelocity.z = 0; // Z 방향 이동 차단
              } else {
                adjustedVelocity.set(0, 0, 0); // 둘 다 충돌 시 이동 차단
              }
              break;
            }
          }
        }

        if (canMove || adjustedVelocity.length() > 0) {
          this.position_.add(adjustedVelocity);
          if (stepUpHeight > 0) {
            this.position_.y = newPosition.y + stepUpHeight;
            this.velocityY_ = 0;
            this.isJumping_ = false;
          } else if (isOnTop) {
            this.position_.y = topY; // 오브젝트 위에 고정
            this.velocityY_ = 0;
            this.isJumping_ = false;
          } else {
            this.position_.y = newPosition.y; // 중력에 따라 Y 이동
          }
        } else {
          this.position_.y = newPosition.y; // Y 이동은 허용
        }

        // 바닥 체크
        if (this.position_.y <= this.mainTopY_ && !isOnTop) {
          this.position_.y = this.mainTopY_;
          this.velocityY_ = 0;
          this.isJumping_ = false;
        }

        // 애니메이션 업데이트
        if (this.position_.y > this.mainTopY_ && this.isJumping_) {
          this.SetAnimation_('Jump');
        } else if (isMoving) {
          this.SetAnimation_(isRunning ? 'Run' : 'Walk');
        } else {
          this.SetAnimation_('Idle');
        }
      }

      this.mesh_.position.copy(this.position_);
      // 바운딩 박스 위치를 플레이어에 맞춰 업데이트
      const halfWidth = 0.65; // 너비: 1.0
      const halfHeight = 3.2; // 높이: 2.5
      const halfDepth = 0.65; // 깊이: 1.0  
      this.boundingBox_.set(
        new THREE.Vector3(this.position_.x - halfWidth, this.position_.y, this.position_.z - halfDepth),
        new THREE.Vector3(this.position_.x + halfWidth, this.position_.y + halfHeight, this.position_.z + halfDepth)
      );

      if (this.mixer_) {
        this.mixer_.update(timeElapsed);
      }
    }
  }

  return {
    Player: Player,
  };
})();