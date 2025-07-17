// object.js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.124/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.124/examples/jsm/loaders/GLTFLoader.js';

export const object = (() => {
  class NPC {
    constructor(scene, position) {
      this.scene_ = scene;
      this.position_ = position;
      this.mesh_ = null;
      this.boundingBox_ = new THREE.Box3();
      this.boundingBoxHelper_ = null;
      this.collidables_ = [];

      this.LoadModel_();
    }

    LoadModel_() {
      const loader = new GLTFLoader();
      loader.load('./resources/fixed.glb', (gltf) => {
        this.mesh_ = gltf.scene;
        this.mesh_.scale.set(10, 10, 10); // 적절한 크기로 조정
        this.mesh_.position.copy(this.position_);
        this.scene_.add(this.mesh_);

        this.mesh_.traverse(child => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        // NPC의 바운딩 박스 생성 및 헬퍼 추가
        this.boundingBox_.setFromObject(this.mesh_);
        // this.boundingBoxHelper_ = new THREE.Box3Helper(this.mesh_, 0x0000ff); // 파란색
        // this.boundingBoxHelper_.visible = true; // 기본적으로 보이도록 설정
        // this.scene_.add(this.boundingBoxHelper_);

        this.collidables_.push({ boundingBox: this.boundingBox_, object: this.mesh_ });

        console.log('NPC loaded successfully at position:', this.mesh_.position);
      }, undefined, (error) => {
        console.error('Error loading NPC model:', error);
      });
    }

    Update(timeElapsed) {
      if (!this.mesh_) {
        return;
      }
      // NPC의 위치가 변경될 경우 바운딩 박스 업데이트
      this.boundingBox_.setFromObject(this.mesh_);
      if (this.boundingBoxHelper_) {
        // this.boundingBoxHelper_.update();
      }
    }

    ToggleDebugVisuals(visible) {
      // if (this.boundingBoxHelper_) {
      //   this.boundingBoxHelper_.visible = visible;
      // }
    }

    GetCollidables() {
      return this.collidables_;
    }
  }

  return {
    NPC: NPC,
  };
})();