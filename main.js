import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.124/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.124/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.124/examples/jsm/loaders/GLTFLoader.js';
import { player } from './player.js';
import { object } from './object.js';
import { math } from './math.js';
import { Ball } from './ball.js';

export class GameStage3 {
  constructor() {
    console.log('GameStage3 constructor called.');
    this.Initialize();
    // 게임 속도 관련 변수 초기화
    // 게임 속도 관련 변수 초기화
    this.gameSpeedMultiplier = 1; // 플레이어 속도 배율 (기존 유지)

    // [사용자 설정] 공 속도 증가 간격 (초 단위)
    // 이 값을 변경하여 공의 속도가 증가하는 주기를 조절할 수 있습니다.
    this.ballSpeedIncreaseInterval = 10; 

    // [사용자 설정] 공 속도 증가량 (단위: 게임 내 속도 단위)
    // 이 값을 변경하여 공의 속도가 한 번에 얼마나 증가할지 조절할 수 있습니다.
    this.ballSpeedIncrement = 2; 

    this.timeSinceLastBallSpeedIncrease = 0; // 마지막 공 속도 증가 이후 경과 시간 (내부 사용)
    this.currentBallSpeedIncrease = 0; // 현재까지 누적된 공 속도 증가량 (내부 사용)
    this.RAF();
  }

  Initialize() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.gammaFactor = 2.2;

    const container = document.getElementById('container');
    if (!container) {
      console.error('Container element with id "container" not found.');
      return;
    }
    container.appendChild(this.renderer.domElement);

    const fov = 60;
    const aspect = window.innerWidth / window.innerHeight;
    const near = 1.0;
    const far = 2000.0;
    this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    this.camera.position.set(-8, 6, 12);
    this.camera.lookAt(0, 2, 0);

    this.scene = new THREE.Scene();
    this.collidables_ = [];
    this.rimCollidables_ = [];
    this.holes_ = [];
    this.balls_ = [];
    this.isFalling = false;
    this.rimBoxHelpers_ = []; // BoxHelper 배열 초기화
    this.holeBoxHelpers_ = []; // BoxHelper 배열 초기화

    // [사용자 설정] 각 홀의 색상 (홀 번호를 키로 사용)
    this.holeColors_ = {
      1: 0xFFFFFF, // hole1: 빨강
      2: 0xFFFFFF, // hole2: 초록
      3: 0xFFFFFF, // hole3: 파랑
      4: 0xFFFFFF, // hole4: 노랑
      5: 0xFFFFFF, // hole5: 주황
      6: 0xFFFFFF  // hole6: 검정
    };
    // [사용자 설정] 홀의 Y축 위치 조정 (기본값: 0.3)
    this.holeHeightAdjustment_ = 0.45;

    // [사용자 설정] 각 공의 색상 (공 번호를 키로 사용)
    this.ballColors_ = {
      1: 0xfefe48, // 1번 공: 흰색 (큐볼)
      2: 0x39a8fe, // 2번 공: 파란색
      3: 0xFF0000, // 3번 공: 빨간색
      4: 0x020202, // 4번 공: 보라색
      5: 0xee6e06, // 5번 공: 주황색
      6: 0xa6fe48, // 6번 공: 초록색
     
    };

    // [사용자 설정] 홀 실린더 너비 배율 (기본값: 1.1, 1보다 큰 값으로 설정하여 너비 증가)
    this.holeCylinderWidthMultiplier_ = 1.1;

    // [사용자 설정] 박스 길이 배율 (기본값: 1.1, 1보다 큰 값으로 설정하여 길이 증가)
    this.boxLengthMultiplier_ = 1.1;

    // table0.glb의 경계 좌표 설정
    this.tableBoundaryMinX = -12.594456122070895;
    this.tableBoundaryMaxX = 12.811532052877915;
    this.tableBoundaryMinZ = -14.732399815742233;
    this.tableBoundaryMaxZ = 50.32672684244709;
    this.mapYPosition = -0.1; // map.png의 Y축 위치

    this.SetupLighting();
    this.SetupSkyAndFog();
    this.CreateGround();

    window.addEventListener('resize', () => this.OnWindowResize(), false);
  }

  SetupLighting() {
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(60, 100, 10);
    directionalLight.target.position.set(0, 0, 0);
    directionalLight.castShadow = true;
    directionalLight.shadow.bias = -0.0001;
    directionalLight.shadow.normalBias = 0.02;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 1.0;
    directionalLight.shadow.camera.far = 200.0;
    directionalLight.shadow.camera.left = -50;
    directionalLight.shadow.camera.right = 50;
    directionalLight.shadow.camera.top = 50;
    directionalLight.shadow.camera.bottom = -50;
    this.scene.add(directionalLight);
    this.scene.add(directionalLight.target);

    const hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0xf6f47f, 0.6);
    this.scene.add(hemisphereLight);
  }

  SetupSkyAndFog() {
    const skyUniforms = {
      topColor: { value: new THREE.Color(0x0077ff) },
      bottomColor: { value: new THREE.Color(0x89b2eb) },
      offset: { value: 33 },
      exponent: { value: 0.6 }
    };

    const skyGeometry = new THREE.SphereGeometry(1000, 32, 15);
    const skyMaterial = new THREE.ShaderMaterial({
      uniforms: skyUniforms,
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        }`,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize( vWorldPosition + offset ).y;
          gl_FragColor = vec4( mix( bottomColor, topColor, max( pow( max( h, 0.0), exponent ), 0.0 ) ), 1.0 );
        }`,
      side: THREE.BackSide,
    });

    const skyMesh = new THREE.Mesh(skyGeometry, skyMaterial);
    this.scene.add(skyMesh);
    this.scene.fog = new THREE.FogExp2(0x89b2eb, 0.002);
  }

  CreateGround() {
    // 이미지 맵 (바닥) 생성
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load('./resources/map.png', (texture) => {
      const groundGeometry = new THREE.PlaneGeometry(100, 100); // 이미지 맵의 크기 (조절 가능)
      const groundMaterial = new THREE.MeshStandardMaterial({ map: texture, side: THREE.DoubleSide });
      const groundPlane = new THREE.Mesh(groundGeometry, groundMaterial);
      groundPlane.rotation.x = -Math.PI / 2; // 바닥으로 눕히기
      groundPlane.position.y = -10.0; // table0.glb 아래에 위치하도록 약간 내림
      groundPlane.receiveShadow = true;
      this.scene.add(groundPlane);
    });

    // table0.glb 로드
    const loader = new GLTFLoader();
    loader.load(
      './resources/Pool-table/table0.glb',
      (gltf) => {
        this.ground = gltf.scene;
        const box = new THREE.Box3().setFromObject(this.ground);
        const minY = box.min.y;
        this.ground.position.y = -minY; // 모델의 바닥이 0이 되도록 조정

        const size = new THREE.Vector3();
        box.getSize(size);
        const scaleX = 25 / size.x;
        const scaleZ = 50 / size.z;
        this.ground.scale.set(scaleX, scaleX, scaleZ);
        this.ground.updateMatrixWorld(true);

        const mainObject = this.ground.getObjectByName('main');
        if (mainObject) {
          mainObject.updateMatrixWorld(true);
          const mainBox = new THREE.Box3().setFromObject(mainObject);
          this.mainTopY = mainBox.max.y;
          this.collidables_.push({ boundingBox: mainBox, object: mainObject });
          mainObject.visible = false;

          console.log('mainBox:', mainBox);
          console.log('mainTopY:', this.mainTopY);

          this.CreateBalls(mainBox, this.mainTopY);
        }

        let groundY = 0;
        if (this.ground) {
          const box = new THREE.Box3().setFromObject(this.ground);
          groundY = box.max.y;
        }
        // 플레이어 스폰 Y 위치 조정: table0.glb의 상단에 위치하도록
        this.playerSpawnY = this.mainTopY !== undefined ? this.mainTopY + 0.01 : groundY + 11;

        const desiredHeight = 2.296;
        const commonTargetMaxY = 6.191;

        for (let i = 1; i <= 16; i++) {
          const boxName = `box${i}`;
          const boxObject = this.ground.getObjectByName(boxName);
          if (!boxObject) continue;

          boxObject.updateWorldMatrix(true, true);
          const boxBox = new THREE.Box3().setFromObject(boxObject);
          const currentHeight = boxBox.max.y - boxBox.min.y;
          const scaleY = desiredHeight / currentHeight;
          boxObject.scale.y *= scaleY;
          boxObject.scale.x *= this.boxLengthMultiplier_; // X축 길이 조정
          boxObject.scale.z *= this.boxLengthMultiplier_; // Z축 길이 조정
          boxObject.updateMatrixWorld(true);

          const adjustedBox = new THREE.Box3().setFromObject(boxObject);
          const currentMaxY = adjustedBox.max.y;
          const offsetY = commonTargetMaxY - currentMaxY;
          boxObject.position.y += offsetY;
          boxObject.updateMatrixWorld(true);

          this.rimCollidables_.push({ boundingBox: adjustedBox, object: boxObject });
          boxObject.visible = false;

          // BoxHelper 추가 (테이블 가장자리)
          const rimBoxHelper = new THREE.BoxHelper(boxObject, 0x00ff00); // 초록색
          rimBoxHelper.visible = false; // 테이블 가장자리 바운딩 박스를 보이지 않게 설정
          this.scene.add(rimBoxHelper);
          this.rimBoxHelpers_.push(rimBoxHelper);
        }

        this.ground.traverse(child => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
              child.material.side = THREE.DoubleSide;
              child.material.needsUpdate = true;
            }

            if (child.name.includes('hole')) {
              const holeNumberMatch = child.name.match(/hole(\d+)/);
              let holeColor = this.holeColor_; // 기본 색상 (이전 설정 유지)
              if (holeNumberMatch && this.holeColors_[holeNumberMatch[1]]) {
                holeColor = this.holeColors_[holeNumberMatch[1]];
              }

              child.position.y += this.holeHeightAdjustment_; // Adjust this value as needed
              if (child.material) {
                child.material = new THREE.MeshStandardMaterial({ color: holeColor });
              }
              const box = new THREE.Box3().setFromObject(child);
              this.holes_.push({ object: child, boundingBox: box });

              // 실린더 형태의 바운딩 박스 시각화 (홀)
              const cylinderRadius = ((box.max.x - box.min.x) / 2) * this.holeCylinderWidthMultiplier_; // 바운딩 박스 너비의 절반을 반지름으로 사용
              const cylinderHeight = box.max.y - box.min.y; // 바운딩 박스 높이를 실린더 높이로 사용
              const cylinderGeometry = new THREE.CylinderGeometry(cylinderRadius, cylinderRadius, cylinderHeight, 32);
              const cylinderMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true, transparent: true, opacity: 0.5 }); // 빨간색, 와이어프레임, 투명
              const cylinderMesh = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
              cylinderMesh.visible = false; // 홀 바운딩 박스를 보이지 않게 설정

              // 실린더 위치 조정
              cylinderMesh.position.copy(box.getCenter(new THREE.Vector3()));
              cylinderMesh.position.y = box.min.y + cylinderHeight / 2; // 바운딩 박스 중앙 Y축에 맞춤

              this.scene.add(cylinderMesh);
              this.holeBoxHelpers_.push(cylinderMesh); // 실린더 메쉬를 헬퍼 배열에 추가
            }
          }
        });

        this.scene.add(this.ground);
        this.CreatePlayer(this.playerSpawnY);
      },
      undefined,
      (error) => {
        console.error('GLB 로드 실패:', error);
      }
    );
  }

  CreateBalls(mainBoundingBox, mainTopY) {
    for (let i = 1; i <= 6; i++) {
      const position = new THREE.Vector3(
          mainBoundingBox.min.x + Math.random() * (mainBoundingBox.max.x - mainBoundingBox.min.x),
          mainTopY + 0.2,
          mainBoundingBox.min.z + Math.random() * (mainBoundingBox.max.z - mainBoundingBox.min.z)
      );

      const ball = new Ball({
        scene: this.scene,
        position: position,
        mainBoundingBox: mainBoundingBox,
        ballNumber: i,
        ballColor: this.ballColors_[i] // 공 색상 전달
      }, this.currentBallSpeedIncrease);

      this.balls_.push(ball);
    }
  }

  CreatePlayer(playerY) {
    this.player_ = new player.Player({
      scene: this.scene,
      position: new THREE.Vector3(0, playerY, 0),
      mainTopY: this.mainTopY, // mainTopY 추가
      
    });



    this.cameraTargetOffset = new THREE.Vector3(0, 15, 10);
    this.rotationAngle = 4.715;
  }

  UpdateCamera() {
    if (!this.player_ || !this.player_.mesh_) return;

    const target = this.player_.mesh_.position.clone();
    const offset = this.cameraTargetOffset.clone();
    offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotationAngle);
    const cameraPos = target.clone().add(offset);
    this.camera.position.copy(cameraPos);

    const headOffset = new THREE.Vector3(0, 2, 0);
    const headPosition = target.clone().add(headOffset);
    this.camera.lookAt(headPosition);
  }

  OnWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  RAF(time) {
    requestAnimationFrame((t) => this.RAF(t));

    if (!this.prevTime) this.prevTime = time || performance.now();
    const delta = ((time || performance.now()) - this.prevTime) * 0.001;
    this.prevTime = time || performance.now();

    if (this.player_) {
      // 공 속도 증가 로직
      this.timeSinceLastBallSpeedIncrease += delta;
      if (this.timeSinceLastBallSpeedIncrease >= this.ballSpeedIncreaseInterval) {
        this.currentBallSpeedIncrease += this.ballSpeedIncrement; // 공 속도 증가
        this.timeSinceLastBallSpeedIncrease = 0; // 타이머 리셋
        console.log(`Ball speed increased to: ${this.currentBallSpeedIncrease.toFixed(2)}`);
      }

      const allCollidables = this.collidables_.concat(this.npc_ ? this.npc_.GetCollidables() : []).concat(this.holes_);
      this.player_.Update(delta, this.rotationAngle, allCollidables, this.rimCollidables_, this.gameSpeedMultiplier);
      this.UpdateCamera();

      // 플레이어 경계 검사
      if (this.player_.mesh_.position.x < this.tableBoundaryMinX || this.player_.mesh_.position.x > this.tableBoundaryMaxX ||
          this.player_.mesh_.position.z < this.tableBoundaryMinZ || this.player_.mesh_.position.z > this.tableBoundaryMaxZ) {
          this.player_.mesh_.position.y = this.mapYPosition;
      }
    }

    if (this.npc_) {
      this.npc_.Update(delta);
    }

    // [수정] 모든 공 인스턴스를 Ball.Update 메서드로 전달하여 공끼리 충돌 감지 가능하게 함
    for (const ball of this.balls_) {
      ball.Update(delta, this.currentBallSpeedIncrease, this.balls_, this.holes_, this.player_.boundingBox_);

      // 공 경계 검사
      if (ball.mesh_.position.x < this.tableBoundaryMinX || ball.mesh_.position.x > this.tableBoundaryMaxX ||
          ball.mesh_.position.z < this.tableBoundaryMinZ || ball.mesh_.position.z > this.tableBoundaryMaxZ) {
          ball.mesh_.position.y = this.mapYPosition;
      }
    }

    // BoxHelper 업데이트
    for (const helper of this.rimBoxHelpers_) {
      helper.update();
    }

    this.renderer.render(this.scene, this.camera);
  }
}