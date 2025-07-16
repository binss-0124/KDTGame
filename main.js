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
    this.ballSpeedIncreaseInterval = 3; 

    // [사용자 설정] 공 속도 증가량 (단위: 게임 내 속도 단위)
    // 이 값을 변경하여 공의 속도가 한 번에 얼마나 증가할지 조절할 수 있습니다.
    this.ballSpeedIncrement = 10; 

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
    const loader = new GLTFLoader();
    loader.load(
      './resources/Pool-table/table31.glb',
      (gltf) => {
        this.ground = gltf.scene;
        const box = new THREE.Box3().setFromObject(this.ground);
        const minY = box.min.y;
        this.ground.position.y = -minY;

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
          boxObject.updateMatrixWorld(true);

          const adjustedBox = new THREE.Box3().setFromObject(boxObject);
          const currentMaxY = adjustedBox.max.y;
          const offsetY = commonTargetMaxY - currentMaxY;
          boxObject.position.y += offsetY;
          boxObject.updateMatrixWorld(true);

          this.rimCollidables_.push({ boundingBox: adjustedBox, object: boxObject });
          boxObject.visible = false;
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
              child.position.y += 0.3; // Adjust this value as needed
              if (child.material) {
                child.material = new THREE.MeshStandardMaterial({ color: 0xffffff }); // Set color to black
              }
              const box = new THREE.Box3().setFromObject(child);
              this.holes_.push({ object: child, boundingBox: box });
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
          mainTopY + 0.1,
          mainBoundingBox.min.z + Math.random() * (mainBoundingBox.max.z - mainBoundingBox.min.z)
      );

      const ball = new Ball({
        scene: this.scene,
        position: position,
        mainBoundingBox: mainBoundingBox,
        ballNumber: i
      }, this.currentBallSpeedIncrease);

      this.balls_.push(ball);
    }
  }

  CreatePlayer(playerY) {
    this.player_ = new player.Player({
      scene: this.scene,
      position: new THREE.Vector3(0, playerY, 0),
      mainTopY: this.mainTopY, // mainTopY 추가
      onDebugToggle: (visible) => this.npc_.ToggleDebugVisuals(visible),
    });

    const npcPos = new THREE.Vector3(0, playerY, -4);
    this.npc_ = new object.NPC(this.scene, npcPos);

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

      const allCollidables = this.collidables_.concat(this.npc_ ? this.npc_.GetCollidables() : []);
      this.player_.Update(delta, this.rotationAngle, allCollidables, this.rimCollidables_, this.gameSpeedMultiplier);
      this.UpdateCamera();
    }

    if (this.npc_) {
      this.npc_.Update(delta);
    }

    for (const ball of this.balls_) {
      ball.Update(delta, this.currentBallSpeedIncrease);
    }

    this.renderer.render(this.scene, this.camera);
  }
}