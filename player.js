import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.124/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.124/examples/jsm/loaders/GLTFLoader.js';
import * as map from './map.js';


// player.js: 충돌 처리, 점프, 구르기, 바운딩박스, HP, 사망/부활, 무기 줍기 등 모든 기능 포함
export const player = (() => {
  class Player {
    constructor(params) {
      this.position_ = new THREE.Vector3(0, 0, 0);
      this.velocity_ = new THREE.Vector3(0, 0, 0);
      this.speed_ = 5;
      this.params_ = params;
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
        e_key: false,
        ctrl_key: false,
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

      // HP, 사망, 부활, 공격, 무기/아이템
      this.hp_ = 100;
      this.isDead_ = false;
      this.deathTimer_ = 0;
      this.isAttacking_ = false;
      this.canDamage_ = false;
      this.swordSlashCooldown_ = 0.5;
      this.swordSlashCooldownTimer_ = 0;
      this.swordSlashDuration_ = 0.5;
      this.swordSlashTimer_ = 0;
      this.swordSlashSpeed_ = 18;
      this.swordSlashDirection_ = new THREE.Vector3(0, 0, 0);

      this.inventory_ = [];
      this.equippedWeapon_ = null;
      this.bareHandAttackRadius = 1.5;
      this.bareHandAttackAngle = Math.PI / 2;
      this.currentAttackRadius = this.bareHandAttackRadius;
      this.currentAttackAngle = this.bareHandAttackAngle;
      this.currentAttackDamage = 10;

      this.headBone = null;
      this.hpUI = params.hpUI || null;

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
        case 'KeyE': this.keys_.e_key = true; this.PickupWeapon_(); break;
        case 'ControlLeft':
        case 'ControlRight': this.keys_.ctrl_key = true; break;
        case 'KeyK':
          if (!this.isJumping_ && !this.isRolling_ && !this.isAttacking_) {
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
            this.rollCooldownTimer_ <= 0 &&
            !this.isAttacking_
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
        case 'KeyJ':
          if (
            !this.isJumping_ &&
            !this.isRolling_ &&
            this.animations_['SwordSlash'] &&
            this.swordSlashCooldownTimer_ <= 0 &&
            !this.isAttacking_
          ) {
            this.isAttacking_ = true;
            this.canDamage_ = true;
            this.swordSlashTimer_ = this.swordSlashDuration_;
            this.swordSlashDirection_.set(0, 0, -1);
            this.SetAnimation_('SwordSlash');
            if (this.equippedWeapon_) {
              this.currentAttackRadius = this.equippedWeapon_.attackRadius;
              this.currentAttackAngle = this.equippedWeapon_.attackAngle;
              this.currentAttackDamage = this.equippedWeapon_.damage;
              this.swordSlashCooldown_ = 0.5 / this.equippedWeapon_.attackSpeedMultiplier;
            } else {
              this.currentAttackRadius = this.bareHandAttackRadius;
              this.currentAttackAngle = this.bareHandAttackAngle;
              this.currentAttackDamage = 10;
              this.swordSlashCooldown_ = 0.5;
            }
            this.swordSlashCooldownTimer_ = this.swordSlashCooldown_;
          }
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
        case 'KeyE': this.keys_.e_key = false; break;
        case 'ControlLeft':
        case 'ControlRight': this.keys_.ctrl_key = false; break;
      }
    }

    TakeDamage(amount) {
      if (this.isDead_) return;
      this.hp_ -= amount;
      if (this.hp_ <= 0) {
        this.hp_ = 0;
        if (this.hpUI && typeof this.hpUI.forceDeath === 'function') {
          this.hpUI.forceDeath();
        }
        this.isDead_ = true;
        this.deathTimer_ = 5.0;
        this.SetAnimation_('Death');
      }
    }


    Revive() {
      this.Respawn_();
    }

     Respawn_() {
      this.hp_ = 100;
      this.isDead_ = false;
      this.deathTimer_ = 0;
      let minX = 0, maxX = 0, minZ = 0, maxZ = 0, minY = 0;
      if (map && map.MAP_BOUNDS) {
        minX = map.MAP_BOUNDS.minX;
        maxX = map.MAP_BOUNDS.maxX;
        minZ = map.MAP_BOUNDS.minZ;
        maxZ = map.MAP_BOUNDS.maxZ;
        minY = map.MAP_BOUNDS.minY;
      }
      const randomX = Math.random() * (maxX - minX) + minX;
      const randomZ = Math.random() * (maxZ - minZ) + minZ;
      this.position_.set(randomX, minY + 10, randomZ);
      this.velocity_.set(0, 0, 0);
      this.velocityY_ = 0;
      this.isJumping_ = false;
      this.isRolling_ = false;
      this.rollCooldownTimer_ = 0;
      this.SetAnimation_('Idle');
    }

    PickupWeapon_() {
      if (!this.params_.weapons) return;
      let closestWeapon = null;
      let minDistance = Infinity;
      this.params_.weapons.forEach(weapon => {
        if (weapon.model_) {
          const distance = this.mesh_.position.distanceTo(weapon.model_.position);
          if (distance < 2 && distance < minDistance) {
            minDistance = distance;
            closestWeapon = weapon;
          }
        }
      });
      if (closestWeapon) {
        this.params_.scene.remove(closestWeapon.model_);
        if (typeof closestWeapon.HideRangeIndicator === 'function') {
          closestWeapon.HideRangeIndicator();
        }
        const index = this.params_.weapons.indexOf(closestWeapon);
        if (index > -1) {
          this.params_.weapons.splice(index, 1);
        }
        this.EquipItem(closestWeapon);
      }
    }

    EquipItem(item) {
      if (this.equippedWeapon_) {
        if (this.equippedWeapon_.model_ && this.equippedWeapon_.model_.parent) {
          this.equippedWeapon_.model_.parent.remove(this.equippedWeapon_.model_);
        }
      }
      const handBone = this.mesh_.getObjectByName('FistR') || this.mesh_.getObjectByName('HandR');
      if (handBone && item.model_) {
        handBone.add(item.model_);
        item.model_.position.set(0, 0, 0.1);
        item.model_.rotation.set(Math.PI / 2, Math.PI / 2, Math.PI * 1.5);
        item.model_.position.x = -0.01;
        item.model_.position.y = 0.09;
        this.equippedWeapon_ = item;
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
          if (c.isBone && c.name === 'Head') {
            this.headBone = c;
          }
        });

        const halfWidth = 0.65, halfHeight = 3.2, halfDepth = 0.65;
        this.boundingBox_.set(
          new THREE.Vector3(-halfWidth, 0, -halfDepth),
          new THREE.Vector3(halfWidth, halfHeight, halfDepth)
        );
        this.boundingBox_.translate(this.position_);
        this.boundingBoxHelper_ = new THREE.Box3Helper(this.boundingBox_, 0xff0000);
        this.boundingBoxHelper_.visible = false;
        this.params_.scene.add(this.boundingBoxHelper_);

        this.mixer_ = new THREE.AnimationMixer(model);

        this.mixer_.addEventListener('finished', (e) => {
          if (e.action.getClip().name === 'SwordSlash') {
            this.isAttacking_ = false;
            this.canDamage_ = false;
            const isMoving = this.keys_.forward || this.keys_.backward || this.keys_.left || this.keys_.right;
            const isRunning = isMoving && this.keys_.shift;
            if (isMoving) {
              this.SetAnimation_(isRunning ? 'Run' : 'Walk');
            } else {
              this.SetAnimation_('Idle');
            }
          }
        });

        for (const clip of gltf.animations) {
          this.animations_[clip.name] = this.mixer_.clipAction(clip);
        }
        this.SetAnimation_('Idle');
      });
    }

    SetAnimation_(name) {
      if (this.currentAction_ === this.animations_[name]) return;
      if (!this.animations_[name]) return;
      if (this.currentAction_) {
        this.currentAction_.fadeOut(0.3);
      }
      this.currentAction_ = this.animations_[name];
      this.currentAction_.reset().fadeIn(0.3).play();

      // 무기 자세 제어
      if (this.equippedWeapon_ && this.equippedWeapon_.model_) {
        const weapon = this.equippedWeapon_.model_;
        switch (name) {
          case 'SwordSlash':
            weapon.position.set(-0.05, 0.05, -0.1);
            weapon.rotation.set(Math.PI / 2, Math.PI / 2, 0);
            break;
          case 'Idle':
          case 'Walk':
          case 'Run':
            weapon.position.set(-0.01, 0.09, 0.1);
            weapon.rotation.set(Math.PI / 2, Math.PI / 2, 0);
            break;
          default:
            weapon.position.set(-0.01, 0.09, 0.1);
            weapon.rotation.set(Math.PI / 2, Math.PI / 2, 0);
            break;
        }
      }

      if (name === 'Jump') {
        this.currentAction_.setLoop(THREE.LoopOnce);
        this.currentAction_.clampWhenFinished = true;
        this.currentAction_.time = 0.25;
        this.currentAction_.timeScale = this.jumpSpeed_;
      } else if (name === 'Roll') {
        this.currentAction_.setLoop(THREE.LoopOnce);
        this.currentAction_.clampWhenFinished = true;
        this.currentAction_.time = 0.0;
        this.currentAction_.timeScale = 1.2;
      } else if (name === 'Death') {
        this.currentAction_.setLoop(THREE.LoopOnce);
        this.currentAction_.clampWhenFinished = true;
        this.currentAction_.time = 0.0;
        this.currentAction_.timeScale = 1.0;
      } else if (name === 'SwordSlash') {
        this.currentAction_.setLoop(THREE.LoopOnce);
        this.currentAction_.clampWhenFinished = true;
        this.currentAction_.time = 0;
        this.currentAction_.timeScale = 1.2;
      } else {
        this.currentAction_.timeScale = 1.0;
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

    Update(timeElapsed, rotationAngle = 0, collidables = []) {
      if (!this.mesh_) return;

      this.lastRotationAngle_ = rotationAngle;

      // 쿨타임 관리
      if (this.rollCooldownTimer_ > 0) {
        this.rollCooldownTimer_ -= timeElapsed;
        if (this.rollCooldownTimer_ < 0) this.rollCooldownTimer_ = 0;
      }
      if (this.swordSlashCooldownTimer_ > 0) {
        this.swordSlashCooldownTimer_ -= timeElapsed;
        if (this.swordSlashCooldownTimer_ < 0) this.swordSlashCooldownTimer_ = 0;
      }

      // 사망 상태 처리
      if (this.isDead_) {
        if (this.deathTimer_ > 0) {
          this.deathTimer_ -= timeElapsed;
          if (this.deathTimer_ <= 0) {
            this.deathTimer_ = 0;
            this.Revive();
          }
        }
        if (this.mixer_) {
          this.mixer_.update(timeElapsed);
        }
        return;
      }

      // SwordSlash 이동
      if (this.isAttacking_) {
        this.swordSlashTimer_ -= timeElapsed;
        const slashMove = this.swordSlashDirection_.clone().multiplyScalar(this.swordSlashSpeed_ * timeElapsed);
        this.position_.add(slashMove);
        if (this.swordSlashTimer_ <= 0) {
          this.isAttacking_ = false;
        }
      }

      // 구르기 이동
      if (this.isRolling_) {
        this.rollTimer_ -= timeElapsed;
        const rollMove = this.rollDirection_.clone().multiplyScalar(this.rollSpeed_ * timeElapsed);
        this.position_.add(rollMove);
        if (this.rollTimer_ <= 0) {
          this.isRolling_ = false;
        }
      }

      // 일반 이동/점프/충돌
      let currentSpeed = 0;
      if (!this.isRolling_ && !this.isAttacking_) {
        const velocity = new THREE.Vector3();
        const forward = new THREE.Vector3(0, 0, -1);
        const right = new THREE.Vector3(1, 0, 0);
        if (this.keys_.forward) velocity.add(forward);
        if (this.keys_.backward) velocity.sub(forward);
        if (this.keys_.left) velocity.sub(right);
        if (this.keys_.right) velocity.add(right);
        velocity.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotationAngle);

        const isMoving = this.keys_.forward || this.keys_.backward || this.keys_.left || this.keys_.right;
        const isRunning = isMoving && this.keys_.shift;
        currentSpeed = isRunning ? this.speed_ * 2 : this.speed_;

        velocity.normalize().multiplyScalar(currentSpeed * timeElapsed);
        this.position_.add(velocity);

        this.velocityY_ += this.gravity_ * timeElapsed;
        this.position_.y += this.velocityY_ * timeElapsed;

        if (this.position_.y <= 0) {
          this.position_.y = 0;
          this.velocityY_ = 0;
          this.isJumping_ = false;
        }

        if (this.position_.y > 0 && this.isJumping_) {
          this.SetAnimation_('Jump');
        }

        if (velocity.length() > 0.01) {
          const angle = Math.atan2(velocity.x, velocity.z);
          const targetQuaternion = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 1, 0), angle
          );
          this.mesh_.quaternion.slerp(targetQuaternion, 0.3);
        }
      }

      // 애니메이션 선택
      if (this.isDead_) {
        this.SetAnimation_('Death');
      } else if (this.isRolling_) {
        this.SetAnimation_('Roll');
      } else if (this.isJumping_) {
        this.SetAnimation_('Jump');
      } else if (!this.isAttacking_) {
        const isMoving = this.keys_.forward || this.keys_.backward || this.keys_.left || this.keys_.right;
        const isRunning = isMoving && this.keys_.shift;
        if (isMoving) {
          this.SetAnimation_(isRunning ? 'Run' : 'Walk');
        } else {
          this.SetAnimation_('Idle');
        }
      }

      this.mesh_.position.copy(this.position_);

      if (this.mixer_) {
        this.mixer_.update(timeElapsed);
      }
    }
  }

  return {
    Player: Player,
  };
})();
