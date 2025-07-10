// main.js

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.124/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.124/examples/jsm/controls/OrbitControls.js';
import { player } from './player.js';
import { object } from './object.js';
import { Item } from './item.js';
import { math } from './math.js';
import { ui } from './ui.js';
import { hp } from './hp.js';
import * as map from './map.js'; // 낙사/경계 체크용

// 공격 타입 상수
const ATTACK_TYPE_MELEE = 'melee';
const ATTACK_TYPE_RANGED = 'ranged';

// 무기 데이터 (전체)
const WEAPON_DATA = {
  'Sword.fbx': { type: ATTACK_TYPE_MELEE, radius: 2.0, angle: Math.PI / 3, damage: 20, attackSpeedMultiplier: 1.0, attackType: 'single', specialEffect: null, icon: './resources/weapon/icons/sword.png' },
  'Axe_Double.fbx': { type: ATTACK_TYPE_MELEE, radius: 2.2, angle: Math.PI / 2.5, damage: 30, attackSpeedMultiplier: 0.8, attackType: 'aoe', specialEffect: 'knockback', icon: './resources/weapon/icons/axe_double.png' },
  'Bow_Wooden.fbx': { type: ATTACK_TYPE_RANGED, radius: 15.0, angle: Math.PI / 18, damage: 10, attackSpeedMultiplier: 1.0, attackType: 'ranged', specialEffect: null, icon: './resources/weapon/icons/bow_wooden.png' },
  'Dagger.fbx': { type: ATTACK_TYPE_MELEE, radius: 1.5, angle: Math.PI / 2, damage: 15, attackSpeedMultiplier: 1.5, attackType: 'single', specialEffect: 'critical_bleed', icon: './resources/weapon/icons/dagger.png' },
  'Hammer_Double.fbx': { type: ATTACK_TYPE_MELEE, radius: 2.5, angle: Math.PI / 2.2, damage: 40, attackSpeedMultiplier: 0.5, attackType: 'small_aoe', specialEffect: 'stun', icon: './resources/weapon/icons/hammer_double.png' },
  'AssaultRifle_1.fbx': { type: ATTACK_TYPE_RANGED, radius: 20.0, angle: Math.PI / 36, damage: 10, attackSpeedMultiplier: 1.0, attackType: 'ranged', specialEffect: null, icon: './resources/weapon/icons/assault_rifle.png' },
  'Pistol_1.fbx': { type: ATTACK_TYPE_RANGED, radius: 10.0, angle: Math.PI / 12, damage: 10, attackSpeedMultiplier: 1.0, attackType: 'ranged', specialEffect: null, icon: './resources/weapon/icons/pistol.png' },
  'Shotgun_1.fbx': { type: ATTACK_TYPE_RANGED, radius: 8.0, angle: Math.PI / 6, damage: 10, attackSpeedMultiplier: 1.0, attackType: 'ranged', specialEffect: null, icon: './resources/weapon/icons/shotgun.png' },
  'SniperRifle_1.fbx': { type: ATTACK_TYPE_RANGED, radius: 30.0, angle: Math.PI / 90, damage: 10, attackSpeedMultiplier: 1.0, attackType: 'ranged', specialEffect: null, icon: './resources/weapon/icons/sniper_rifle.png' },
  'SubmachineGun_1.fbx': { type: ATTACK_TYPE_RANGED, radius: 12.0, angle: Math.PI / 18, damage: 10, attackSpeedMultiplier: 1.0, attackType: 'ranged', specialEffect: null, icon: './resources/weapon/icons/submachine_gun.png' },
  'Axe_Double_Golden.fbx': { type: ATTACK_TYPE_MELEE, radius: 2.4, angle: Math.PI / 2.4, damage: 25, attackSpeedMultiplier: 1.0, attackType: 'single', specialEffect: null, icon: './resources/weapon/icons/axe_double_golden.png' },
  'Axe_small_Golden.fbx': { type: ATTACK_TYPE_MELEE, radius: 1.8, angle: Math.PI / 2.1, damage: 25, attackSpeedMultiplier: 1.0, attackType: 'single', specialEffect: null, icon: './resources/weapon/icons/axe_small_golden.png' },
  'Bow_Golden.fbx': { type: ATTACK_TYPE_RANGED, radius: 18.0, angle: Math.PI / 20, damage: 25, attackSpeedMultiplier: 1.0, attackType: 'ranged', specialEffect: null, icon: './resources/weapon/icons/bow_golden.png' },
  'Dagger_Golden.fbx': { type: ATTACK_TYPE_MELEE, radius: 1.7, angle: Math.PI / 1.9, damage: 25, attackSpeedMultiplier: 1.0, attackType: 'single', specialEffect: null, icon: './resources/weapon/icons/dagger_golden.png' },
  'Hammer_Double_Golden.fbx': { type: ATTACK_TYPE_MELEE, radius: 2.7, angle: Math.PI / 2.1, damage: 25, attackSpeedMultiplier: 1.0, attackType: 'single', specialEffect: null, icon: './resources/weapon/icons/hammer_double_golden.png' },
  'Sword_big_Golden.fbx': { type: ATTACK_TYPE_MELEE, radius: 2.8, angle: Math.PI / 3.2, damage: 25, attackSpeedMultiplier: 1.0, attackType: 'single', specialEffect: null, icon: './resources/weapon/icons/sword_big_golden.png' },
  'Sword_big.fbx': { type: ATTACK_TYPE_MELEE, radius: 2.6, angle: Math.PI / 3.1, damage: 20, attackSpeedMultiplier: 0.9, attackType: 'single', specialEffect: null, icon: './resources/weapon/icons/sword_big.png' },
  'Sword_Golden.fbx': { type: ATTACK_TYPE_MELEE, radius: 2.1, angle: Math.PI / 2.9, damage: 25, attackSpeedMultiplier: 1.0, attackType: 'single', specialEffect: null, icon: './resources/weapon/icons/sword_golden.png' }
};

// UI 인스턴스
const gameUI = new ui.GameUI();
const playerHpUI = new hp.HPUI();
playerHpUI.setGameUI(gameUI);
const npcHpUI = new hp.HPUI(true);

class GameStage3 {
  constructor() {
    this.playerHpUI = playerHpUI;
    this.npcHpUI = npcHpUI;
    this.Initialize();
    this.RAF();
  }

  Initialize() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.gammaFactor = 2.2;
    document.getElementById('container').appendChild(this.renderer.domElement);

    const fov = 60;
    const aspect = window.innerWidth / window.innerHeight;
    const near = 1.0;
    const far = 2000.0;
    this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    this.camera.position.set(0, 10, 20); // 카메라 위치 조정으로 지면 확인 용이
    this.camera.lookAt(0, 0, 0); // 지면 중앙을 바라보도록 설정

    this.scene = new THREE.Scene();

    this.SetupLighting();
    this.SetupSkyAndFog();
    this.CreateGround();
    this.CreateWeapons();
    this.CreatePlayer();
    this.CreateCoordinateDisplays();

    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyR') {
        if (this.npc_ && typeof this.npc_.startAttack === 'function') {
          this.npc_.startAttack();
        }
      }
    });

    window.addEventListener('resize', () => this.OnWindowResize(), false);
  }

  SetupLighting() {
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(60, 100, 10);
    directionalLight.target.position.set(0, 0, 0);
    directionalLight.castShadow = true;
    directionalLight.shadow.bias = -0.001;
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
    const textureLoader = new THREE.TextureLoader();
    const groundGeometry = new THREE.PlaneGeometry(80, 80, 10, 10);
    let groundMaterial;

    // 텍스처 로드 시도
    textureLoader.load(
      'resources/Map1.png',
      (texture) => {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(1, 1);
        groundMaterial = new THREE.MeshLambertMaterial({ map: texture });
        this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.position.y = 0;
        this.ground.receiveShadow = true;
        this.scene.add(this.ground);
        console.log('Ground texture loaded successfully');
      },
      undefined,
      (error) => {
        console.error('Failed to load ground texture:', error);
        // 대체 재질 (텍스처 로드 실패 시)
        groundMaterial = new THREE.MeshLambertMaterial({ color: 0x00ff00 }); // 초록색으로 디버깅 용이
        this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.position.y = 0;
        this.ground.receiveShadow = true;
        this.scene.add(this.ground);
        console.log('Using fallback ground material');
      }
    );
  }

  CreateWeapons() {
    this.weapons_ = [];
    const weaponNames = Object.keys(WEAPON_DATA);
    for (let i = 0; i < weaponNames.length; i++) {
      const weaponName = weaponNames[i];
      const pos = new THREE.Vector3(math.rand_int(-20, 20), 1, math.rand_int(-20, 20));
      const weaponData = WEAPON_DATA[weaponName];
      const weapon = new Item(this.scene, weaponName, pos, weaponData.type, weaponData.radius, weaponData.angle, weaponData.damage, weaponData.attackSpeedMultiplier, weaponData.attackType, weaponData.specialEffect);
      this.weapons_.push(weapon);
    }
  }

  CreatePlayer() {
    this.player_ = new player.Player({
      scene: this.scene,
      hpUI: this.playerHpUI,
      weapons: this.weapons_
    });
    // HPUI와 플레이어 연결
    this.playerHpUI.setTarget(this.player_);

    const npcPos = new THREE.Vector3(0, 0, -4);
    this.npc_ = new object.NPC(this.scene, npcPos);
    this.npcHpUI.setTarget(this.npc_);

    this.cameraTargetOffset = new THREE.Vector3(0, 15, 10);
    this.rotationAngle = 4.715;

    window.addEventListener('mousemove', (e) => this.OnMouseMove(e), false);

    const checkAndRenderFace = () => {
      if (this.player_ && this.player_.mesh_) {
        this.playerHpUI.renderCharacterFaceToProfile(this.player_.mesh_, this.scene, this.renderer);
      } else {
        setTimeout(checkAndRenderFace, 100);
      }
    };
    checkAndRenderFace();

    const checkAndRenderNPCFace = () => {
      if (this.npc_ && this.npc_.model_) {
        this.npcHpUI.renderCharacterFaceToProfile(this.npc_.model_, this.scene, this.renderer);
      } else {
        setTimeout(checkAndRenderNPCFace, 100);
      }
    };
    checkAndRenderNPCFace();
  }

  CreateCoordinateDisplays() {
    const style = {
      position: 'absolute',
      background: 'rgba(0, 0, 0, 0.6)',
      color: '#fff',
      padding: '5px 10px',
      borderRadius: '5px',
      fontFamily: 'monospace',
      fontSize: '12px',
      zIndex: '1000',
      pointerEvents: 'none',
      userSelect: 'none',
      transform: 'translate(-50%, -50%)'
    };

    this.playerCoordDisplay = document.createElement('div');
    Object.assign(this.playerCoordDisplay.style, style);
    document.body.appendChild(this.playerCoordDisplay);

    this.npcCoordDisplay = document.createElement('div');
    Object.assign(this.npcCoordDisplay.style, style);
    document.body.appendChild(this.npcCoordDisplay);
  }

  OnMouseMove(event) {
    if (event.buttons === 1) {
      const deltaX = event.movementX || 0;
      this.rotationAngle -= deltaX * 0.005;
    }
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

  // 낙사 체크 함수
  checkPlayerFall(delta) {
    if (!this.player_ || !this.player_.mesh_) return;
    map.handleFalling(this.player_, delta);
    // HPUI와 연결되어 있으면, TakeDamage로 HP가 0이 되면 자동으로 사망/부활 UI 실행
  }

  RAF(time) {
    requestAnimationFrame((t) => this.RAF(t));
    if (!this.prevTime) this.prevTime = time || performance.now();
    const delta = ((time || performance.now()) - this.prevTime) * 0.001;
    this.prevTime = time || performance.now();

    if (this.player_) {
      this.player_.Update(delta, this.rotationAngle);
      this.UpdateCamera();
      this.playerHpUI.updateHP(this.player_.hp_);
      this.checkPlayerFall(delta); // 낙사 체크
    }
    if (this.npc_) {
      this.npc_.Update(delta);
      this.npcHpUI.updateHP(this.npc_.health_);
    }

    this.UpdateCoordinateDisplays();
    this.renderer.render(this.scene, this.camera);
    this.UpdateCombat(delta);
    console.log('Rendering frame'); // 디버깅 로그
  }

  UpdateCombat(delta) {
    if (!this.player_ || !this.player_.mesh_ || !this.npc_ || !this.npc_.model_) {
      return;
    }

    const playerPos = new THREE.Vector2(this.player_.mesh_.position.x, this.player_.mesh_.position.z);
    const npcPos = new THREE.Vector2(this.npc_.model_.position.x, this.npc_.model_.position.z);
    const distance = playerPos.distanceTo(npcPos);

    if (distance <= this.player_.currentAttackRadius) {
      if (this.player_.isAttacking_ && this.player_.canDamage_) {
        const playerToNpc = this.npc_.model_.position.clone().sub(this.player_.mesh_.position);
        playerToNpc.y = 0;
        playerToNpc.normalize();

        const playerForward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.player_.mesh_.quaternion);
        playerForward.y = 0;
        playerForward.normalize();

        const angle = playerForward.angleTo(playerToNpc);

        if (angle <= this.player_.currentAttackAngle / 2) {
          this.npc_.TakeDamage(this.player_.currentAttackDamage);
          this.player_.canDamage_ = false;
        }
      }

      if (this.npc_.isAttacking_ && this.npc_.canDamage_) {
        const npcToPlayer = this.player_.mesh_.position.clone().sub(this.npc_.model_.position);
        npcToPlayer.y = 0;
        npcToPlayer.normalize();

        const npcForward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.npc_.model_.quaternion);
        npcForward.y = 0;
        npcForward.normalize();

        const angle = npcForward.angleTo(npcToPlayer);

        if (angle <= this.npc_.attackAngle_ / 2) {
          this.player_.TakeDamage(20);
          this.npc_.canDamage_ = false;
        }
      }
    }
  }

  UpdateCoordinateDisplays() {
    if (this.player_ && this.player_.mesh_) {
      this.UpdateCoordDisplay(this.playerCoordDisplay, this.player_.mesh_, this.player_.headBone, 2.0);
    }
    if (this.npc_ && this.npc_.model_) {
      this.UpdateCoordDisplay(this.npcCoordDisplay, this.npc_.model_, this.npc_.headBone, 2.0);
    }
  }

  UpdateCoordDisplay(element, model, headBone, heightOffset) {
    const pos = new THREE.Vector3();
    if (headBone) {
      headBone.getWorldPosition(pos);
    } else {
      pos.copy(model.position);
    }
    pos.y += heightOffset;

    pos.project(this.camera);

    const width = window.innerWidth, height = window.innerHeight;
    const widthHalf = width / 2, heightHalf = height / 2;

    pos.x = (pos.x * widthHalf) + widthHalf;
    pos.y = - (pos.y * heightHalf) + heightHalf;

    element.style.top = `${pos.y}px`;
    element.style.left = `${pos.x}px`;

    const worldPos = model.position;
    element.textContent = `X: ${worldPos.x.toFixed(1)}, Y: ${worldPos.y.toFixed(1)}, Z: ${worldPos.z.toFixed(1)}`;
  }
}

// ====== 멀티플레이어 동기화 코드 ======
const urlParams = new URLSearchParams(window.location.search);
const roomCode = urlParams.get('room');
if (!roomCode) {
  alert('방 코드가 없습니다. start.html로 이동합니다.');
  location.href = 'start.html';
}

const socket = io();

let myPlayerInfo = {
  x: 0, y: 0, z: 0,
  qx: 0, qy: 0, qz: 0, qw: 1,
  color: '#'+Math.floor(Math.random()*16777215).toString(16)
};

const otherPlayers = {};

socket.emit('joinRoom', { roomCode, player: myPlayerInfo });

setInterval(() => {
  if (game && game.player_ && game.player_.mesh_) {
    const mesh = game.player_.mesh_;
    myPlayerInfo.x = mesh.position.x;
    myPlayerInfo.y = mesh.position.y;
    myPlayerInfo.z = mesh.position.z;
    myPlayerInfo.qx = mesh.quaternion.x;
    myPlayerInfo.qy = mesh.quaternion.y;
    myPlayerInfo.qz = mesh.quaternion.z;
    myPlayerInfo.qw = mesh.quaternion.w;
    socket.emit('move', { roomCode, ...myPlayerInfo });
  }
}, 40);

socket.on('players', (players) => {
  for (const id in players) {
    if (id === socket.id) continue;
    if (!otherPlayers[id]) {
      const geometry = new THREE.SphereGeometry(1, 16, 16);
      const material = new THREE.MeshStandardMaterial({ color: players[id].color || 0x00ff00 });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      game.scene.add(mesh);
      otherPlayers[id] = { mesh, info: players[id] };
    }
    const mesh = otherPlayers[id].mesh;
    mesh.position.set(players[id].x, players[id].y, players[id].z);
    mesh.quaternion.set(players[id].qx, players[id].qy, players[id].qz, players[id].qw);
  }
  for (const id in otherPlayers) {
    if (!players[id]) {
      game.scene.remove(otherPlayers[id].mesh);
      delete otherPlayers[id];
    }
  }
});
// ====== 멀티플레이어 동기화 코드 끝 ======

let game = null;
window.addEventListener('DOMContentLoaded', () => {
  game = new GameStage3();
});