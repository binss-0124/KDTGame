import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.124/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.124/examples/jsm/loaders/GLTFLoader.js';
import { BoxHelper } from 'https://cdn.jsdelivr.net/npm/three@0.124/src/helpers/BoxHelper.js';

export class Ball {
  constructor(params, currentBallSpeedIncrease = 0) {
    this.scene_ = params.scene;
    this.position_ = params.position;
    this.mainBoundingBox_ = params.mainBoundingBox;
    this.ballNumber_ = params.ballNumber;
    this.ballColor_ = params.ballColor; // 추가: 공의 색상
    this.ballColor_ = params.ballColor; // 추가: 공의 색상

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
          // Assign color based on ball number or provided color
          if (this.ballColor_ !== undefined) {
            child.material = new THREE.MeshStandardMaterial({ color: this.ballColor_ });
          } else if (this.ballNumber_ === 8) {
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
      this.boxHelper_.visible = false; // 공의 바운딩 박스를 보이지 않게 설정
      this.scene_.add(this.boxHelper_);

      console.log(`Ball ${this.ballNumber_} loaded successfully at position:`, this.mesh_.position);
    }, undefined, (error) => {
      console.error(`Error loading ball ${this.ballNumber_}ball.glb:`, error);
    });
  }

  Update(delta, currentBallSpeedIncrease = 0, allBalls = [], allHoles = [], playerBoundingBox = null) {
    if (!this.mesh_) {
      return;
    }

    // 공의 이동 속도에 누적된 증가량 적용
    this.position_.add(this.velocity_.clone().normalize().multiplyScalar((this.initialSpeed_ + currentBallSpeedIncrease) * delta));

    // [추가] 홀과의 충돌 감지 및 반사
    for (const hole of allHoles) {
      if (this.boundingBox_.intersectsBox(hole.boundingBox)) {
        console.log(`Ball ${this.ballNumber_} collided with a hole!`);

        const ballCenter = this.boundingBox_.getCenter(new THREE.Vector3());
        const holeCenter = hole.boundingBox.getCenter(new THREE.Vector3());

        const ballMin = this.boundingBox_.min;
        const ballMax = this.boundingBox_.max;
        const holeMin = hole.boundingBox.min;
        const holeMax = hole.boundingBox.max;

        // 각 축에서의 겹침 정도 계산
        const xOverlap = Math.min(ballMax.x, holeMax.x) - Math.max(ballMin.x, holeMin.x);
        const zOverlap = Math.min(ballMax.z, holeMax.z) - Math.max(ballMin.z, holeMin.z);

        let normal = new THREE.Vector3();

        // 가장 적게 겹친 축을 기준으로 법선 결정 및 반사
        if (xOverlap < zOverlap) {
          // X축 충돌
          if (ballCenter.x < holeCenter.x) { // 공이 홀 중심의 왼쪽에 있음
            normal.set(-1, 0, 0);
            this.position_.x = holeMin.x - (ballMax.x - ballMin.x) / 2; // 공을 왼쪽으로 밀어냄
          } else { // 공이 홀 중심의 오른쪽에 있음
            normal.set(1, 0, 0);
            this.position_.x = holeMax.x + (ballMax.x - ballMin.x) / 2; // 공을 오른쪽으로 밀어냄
          }
        } else {
          // Z축 충돌
          if (ballCenter.z < holeCenter.z) { // 공이 홀 중심의 앞에 있음
            normal.set(0, 0, -1);
            this.position_.z = holeMin.z - (ballMax.z - ballMin.z) / 2; // 공을 앞으로 밀어냄
          } else { // 공이 홀 중심의 뒤에 있음
            normal.set(0, 0, 1);
            this.position_.z = holeMax.z + (ballMax.z - ballMin.z) / 2; // 공을 뒤로 밀어냄
          }
        }

        this.velocity_.reflect(normal);

        const epsilon = 0.001; // 공을 바운딩 박스 밖으로 밀어낼 작은 값

        // 반사 및 위치 조정 후 메쉬 위치와 바운딩 박스 업데이트
        if (xOverlap < zOverlap) {
          if (ballCenter.x < holeCenter.x) { // 공이 홀 중심의 왼쪽에 있음
            this.position_.x = holeMin.x - (ballMax.x - ballMin.x) / 2 - epsilon; // 공을 왼쪽으로 밀어냄
          } else { // 공이 홀 중심의 오른쪽에 있음
            this.position_.x = holeMax.x + (ballMax.x - ballMin.x) / 2 + epsilon; // 공을 오른쪽으로 밀어냄
          }
        } else {
          if (ballCenter.z < holeCenter.z) { // 공이 홀 중심의 앞에 있음
            this.position_.z = holeMin.z - (ballMax.z - ballMin.z) / 2 - epsilon; // 공을 앞으로 밀어냄
          } else { // 공이 홀 중심의 뒤에 있음
            this.position_.z = holeMax.z + (ballMax.z - ballMin.z) / 2 + epsilon; // 공을 뒤로 밀어냄
          }
        }

        this.mesh_.position.copy(this.position_);
        this.boundingBox_.setFromObject(this.mesh_);

        break; // 한 프레임에 하나의 홀 충돌만 처리 (단순화를 위해)
      }
    }

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

    // [추가] 플레이어 바운딩 박스와의 충돌 감지 및 반사 (홀 충돌 로직과 동일하게)
    if (playerBoundingBox && this.boundingBox_.intersectsBox(playerBoundingBox)) {
      console.log(`Ball ${this.ballNumber_} collided with player!`);

      const ballCenter = this.boundingBox_.getCenter(new THREE.Vector3());
      const playerCenter = playerBoundingBox.getCenter(new THREE.Vector3());

      const ballMin = this.boundingBox_.min;
      const ballMax = this.boundingBox_.max;
      const playerMin = playerBoundingBox.min;
      const playerMax = playerBoundingBox.max;

      // 각 축에서의 겹침 정도 계산
      const xOverlap = Math.min(ballMax.x, playerMax.x) - Math.max(ballMin.x, playerMin.x);
      const zOverlap = Math.min(ballMax.z, playerMax.z) - Math.max(ballMin.z, playerMin.z);

      let normal = new THREE.Vector3();
      const epsilon = 0.001; // 공을 바운딩 박스 밖으로 밀어낼 작은 값

      // 가장 적게 겹친 축을 기준으로 법선 결정 및 반사
      if (xOverlap < zOverlap) {
        // X축 충돌
        if (ballCenter.x < playerCenter.x) { // 공이 플레이어 중심의 왼쪽에 있음
          normal.set(-1, 0, 0);
          this.position_.x = playerMin.x - (ballMax.x - ballMin.x) / 2 - epsilon; // 공을 왼쪽으로 밀어냄
        } else { // 공이 플레이어 중심의 오른쪽에 있음
          normal.set(1, 0, 0);
          this.position_.x = playerMax.x + (ballMax.x - ballMin.x) / 2 + epsilon; // 공을 오른쪽으로 밀어냄
        }
      } else {
        // Z축 충돌
        if (ballCenter.z < playerCenter.z) { // 공이 플레이어 중심의 앞에 있음
          normal.set(0, 0, -1);
          this.position_.z = playerMin.z - (ballMax.z - ballMin.z) / 2 - epsilon; // 공을 앞으로 밀어냄
        } else {
          normal.set(0, 0, 1);
          this.position_.z = playerMax.z + (ballMax.z - ballMin.z) / 2 + epsilon; // 공을 뒤로 밀어냄
        }
      }
      this.velocity_.reflect(normal);
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
    // [추가] 공의 Y축 위치를 바닥에 고정하는 로직
    // mainBoundingBox_의 상단 Y 좌표를 바닥으로 간주합니다.
    const groundY = this.mainBoundingBox_.max.y;
    // 공의 반지름을 계산합니다. (바운딩 박스 높이의 절반)
    // 이 값은 공 모델의 실제 크기와 스케일에 따라 달라집니다.
    const ballRadius = (this.boundingBox_.max.y - this.boundingBox_.min.y) / 2;

    // 공의 중심 Y 좌표를 바닥 위에 놓이도록 강제 설정합니다.
    // 이렇게 하면 공이 항상 테이블 표면에 붙어 있게 됩니다.
    this.position_.y = groundY + ballRadius;
    // Y축 속도를 0으로 설정하여 수직 움직임을 방지합니다.
    this.velocity_.y = 0;
    // [추가] 공의 바운딩 박스 업데이트
    // 공의 위치가 변경될 때마다 바운딩 박스도 함께 업데이트합니다.
    this.boundingBox_.setFromObject(this.mesh_);
    console.log(`Ball ${this.ballNumber_} updated position:`, this.position_);
  }
}