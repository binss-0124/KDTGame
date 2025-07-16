import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.124/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.124/examples/jsm/loaders/GLTFLoader.js';
import { BoxHelper } from 'https://cdn.jsdelivr.net/npm/three@0.124/src/helpers/BoxHelper.js';

export class Ball {
  constructor(params, currentBallSpeedIncrease = 0) {
    this.scene_ = params.scene;
    this.position_ = params.position;
    this.mainBoundingBox_ = params.mainBoundingBox;
    this.ballNumber_ = params.ballNumber;

    // 초기 속도에 누적된 공 속도 증가량 적용
    this.initialSpeed_ = 5; // 공의 기본 속도
    this.velocity_ = new THREE.Vector3(
        (Math.random() * 2 - 1) * (this.initialSpeed_ + currentBallSpeedIncrease),
        0,
        (Math.random() * 2 - 1) * (this.initialSpeed_ + currentBallSpeedIncrease)
    );

    this.LoadModel_();
  }

  LoadModel_() {
    const loader = new GLTFLoader();
    loader.load(`./resources/Pool-table/ball/${this.ballNumber_}ball.glb`, (gltf) => {
      this.mesh_ = gltf.scene;
      this.mesh_.scale.set(40, 40, 40); // 크기 조정
      this.mesh_.position.copy(this.position_);
      this.mesh_.traverse(child => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          // Assign color based on ball number
          if (this.ballNumber_ === 8) {
            child.material = new THREE.MeshStandardMaterial({ color: 0x000000 }); // Black for ball 8
          } else {
            const randomColor = new THREE.Color(Math.random(), Math.random(), Math.random());
            child.material = new THREE.MeshStandardMaterial({ color: randomColor });
          }
        }
      });
      this.scene_.add(this.mesh_);

      // [추가] 공의 바운딩 박스 생성
      // 공의 3D 모델을 기반으로 정확한 바운딩 박스를 계산합니다.
      this.boundingBox_ = new THREE.Box3().setFromObject(this.mesh_);

      // BoxHelper 추가 (디버깅용)
      this.boxHelper_ = new THREE.BoxHelper(this.mesh_, 0xffff00);
      this.scene_.add(this.boxHelper_);

      console.log(`Ball ${this.ballNumber_} loaded successfully at position:`, this.mesh_.position);
    }, undefined, (error) => {
      console.error(`Error loading ball ${this.ballNumber_}ball.glb:`, error);
    });
  }

  Update(delta, currentBallSpeedIncrease = 0, allBalls = []) {
    if (!this.mesh_) {
      return;
    }

    // 공의 이동 속도에 누적된 증가량 적용
    this.position_.add(this.velocity_.clone().normalize().multiplyScalar((this.initialSpeed_ + currentBallSpeedIncrease) * delta));

    // [추가] 다른 공들과의 충돌 감지 및 반사
    for (const otherBall of allBalls) {
      if (otherBall === this) continue; // 자기 자신과의 충돌은 무시

      if (this.boundingBox_.intersectsBox(otherBall.boundingBox_)) {
        // 충돌 발생: 법선 벡터에 따라 속도 반사
        const normal = new THREE.Vector3().subVectors(this.position_, otherBall.position_).normalize();

        // 각 공의 속도를 법선에 대해 반사
        this.velocity_.reflect(normal);
        otherBall.velocity_.reflect(normal.clone().negate()); // 다른 공은 반대 법선으로 반사

        // 공들이 겹치는 것을 방지하기 위해 약간 밀어냄
        const overlapDirection = new THREE.Vector3().subVectors(this.position_, otherBall.position_).normalize();
        this.position_.add(overlapDirection.multiplyScalar(0.1)); // 약간 밀어내는 거리
        otherBall.position_.sub(overlapDirection.multiplyScalar(0.1));
      }
    }

    // BoxHelper 업데이트
    if (this.boxHelper_) {
      this.boxHelper_.update();
    }

    // 경계 체크 및 반사
    // 경계 체크 및 반사
    if (this.position_.x < this.mainBoundingBox_.min.x) {
      this.velocity_.reflect(new THREE.Vector3(1, 0, 0));
      this.position_.x = this.mainBoundingBox_.min.x;
    } else if (this.position_.x > this.mainBoundingBox_.max.x) {
      this.velocity_.reflect(new THREE.Vector3(-1, 0, 0));
      this.position_.x = this.mainBoundingBox_.max.x;
    }

    if (this.position_.z < this.mainBoundingBox_.min.z) {
      this.velocity_.reflect(new THREE.Vector3(0, 0, 1));
      this.position_.z = this.mainBoundingBox_.min.z;
    } else if (this.position_.z > this.mainBoundingBox_.max.z) {
      this.velocity_.reflect(new THREE.Vector3(0, 0, -1));
      this.position_.z = this.mainBoundingBox_.max.z;
    }

    this.mesh_.position.copy(this.position_);
    // [추가] 공의 바운딩 박스 업데이트
    // 공의 위치가 변경될 때마다 바운딩 박스도 함께 업데이트합니다.
    this.boundingBox_.setFromObject(this.mesh_);
    console.log(`Ball ${this.ballNumber_} updated position:`, this.position_);
}}