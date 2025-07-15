import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.124/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.124/examples/jsm/loaders/GLTFLoader.js';
import { BoxHelper } from 'https://cdn.jsdelivr.net/npm/three@0.124/src/helpers/BoxHelper.js';

export class Ball {
  constructor(params) {
    this.scene_ = params.scene;
    this.position_ = params.position;
    this.mainBoundingBox_ = params.mainBoundingBox;
    this.ballNumber_ = params.ballNumber;

    this.velocity_ = new THREE.Vector3(
        (Math.random() * 2 - 1) * 2,
        0,
        (Math.random() * 2 - 1) * 2
    );

    this.LoadModel_();
  }

  LoadModel_() {
    const loader = new GLTFLoader();
    loader.load(`./resources/Pool-table/ball/${this.ballNumber_}ball.glb`, (gltf) => {
      this.mesh_ = gltf.scene;
      this.mesh_.scale.set(40, 40, 40); // 크기를 대폭 키움
      this.mesh_.position.copy(this.position_);
      this.mesh_.traverse(child => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      this.scene_.add(this.mesh_);

      // BoxHelper 추가
      this.boxHelper_ = new THREE.BoxHelper(this.mesh_, 0xffff00);
      this.scene_.add(this.boxHelper_);

      console.log(`Ball ${this.ballNumber_} loaded successfully at position:`, this.mesh_.position);
    }, undefined, (error) => {
      console.error(`Error loading ball ${this.ballNumber_}ball.glb:`, error);
    });
  }

  Update(delta) {
    if (!this.mesh_) {
      return;
    }

    this.position_.add(this.velocity_.clone().multiplyScalar(delta));

    // BoxHelper 업데이트
    if (this.boxHelper_) {
      this.boxHelper_.update();
    }

    // 경계 체크 및 반사
    if (this.position_.x < this.mainBoundingBox_.min.x || this.position_.x > this.mainBoundingBox_.max.x) {
      this.velocity_.x *= -1;
      this.position_.x = Math.max(this.mainBoundingBox_.min.x, Math.min(this.mainBoundingBox_.max.x, this.position_.x));
    }
    if (this.position_.z < this.mainBoundingBox_.min.z || this.position_.z > this.mainBoundingBox_.max.z) {
      this.velocity_.z *= -1;
      this.position_.z = Math.max(this.mainBoundingBox_.min.z, Math.min(this.mainBoundingBox_.max.z, this.position_.z));
    }

    this.mesh_.position.copy(this.position_);
    console.log(`Ball ${this.ballNumber_} updated position:`, this.position_);
}}