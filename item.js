import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.124/build/three.module.js';
import { FBXLoader } from 'https://cdn.jsdelivr.net/npm/three@0.124/examples/jsm/loaders/FBXLoader.js';

// 무기 정보 (이름, 아이콘)
export const weapons = {
  'Sword.fbx': { name: 'Sword', icon: './resources/weapon/icons/sword.png' },
  'Axe_Double.fbx': { name: 'Double Axe', icon: './resources/weapon/icons/axe_double.png' },
  'Bow_Wooden.fbx': { name: 'Wooden Bow', icon: './resources/weapon/icons/bow_wooden.png' },
  'Dagger.fbx': { name: 'Dagger', icon: './resources/weapon/icons/dagger.png' },
  'Hammer_Double.fbx': { name: 'Double Hammer', icon: './resources/weapon/icons/hammer_double.png' },
  'AssaultRifle_1.fbx': { name: 'Assault Rifle', icon: './resources/weapon/icons/assault_rifle.png' },
  'Pistol_1.fbx': { name: 'Pistol', icon: './resources/weapon/icons/pistol.png' },
  'Shotgun_1.fbx': { name: 'Shotgun', icon: './resources/weapon/icons/shotgun.png' },
  'SniperRifle_1.fbx': { name: 'Sniper Rifle', icon: './resources/weapon/icons/sniper_rifle.png' },
  'SubmachineGun_1.fbx': { name: 'Submachine Gun', icon: './resources/weapon/icons/submachine_gun.png' },
  'Axe_Double_Golden.fbx': { name: 'Golden Double Axe', icon: './resources/weapon/icons/axe_double_golden.png' },
  'Axe_small_Golden.fbx': { name: 'Golden Small Axe', icon: './resources/weapon/icons/axe_small_golden.png' },
  'Bow_Golden.fbx': { name: 'Golden Bow', icon: './resources/weapon/icons/bow_golden.png' },
  'Dagger_Golden.fbx': { name: 'Golden Dagger', icon: './resources/weapon/icons/dagger_golden.png' },
  'Hammer_Double_Golden.fbx': { name: 'Golden Double Hammer', icon: './resources/weapon/icons/hammer_double_golden.png' },
  'Sword_big_Golden.fbx': { name: 'Big Golden Sword', icon: './resources/weapon/icons/sword_big_golden.png' },
  'Sword_big.fbx': { name: 'Big Sword', icon: './resources/weapon/icons/sword_big.png' },
  'Sword_Golden.fbx': { name: 'Golden Sword', icon: './resources/weapon/icons/sword_golden.png' }
};

export class Item {
  constructor(
    scene,
    itemName,
    position = new THREE.Vector3(0, 0, 0),
    type = 'melee',
    attackRadius = 1.0,
    attackAngle = Math.PI / 2,
    damage = 10,
    attackSpeedMultiplier = 1.0,
    attackType = 'single',
    specialEffect = null
  ) {
    this.itemName = itemName;
    this.scene_ = scene;
    this.model_ = null;
    this.rangeIndicator_ = null;
    this.type = type;
    this.attackRadius = attackRadius;
    this.attackAngle = attackAngle;
    this.damage = damage;
    this.attackSpeedMultiplier = attackSpeedMultiplier;
    this.attackType = attackType;
    this.specialEffect = specialEffect;
    this.LoadModel_(itemName, position);
    this.CreateRangeIndicator_();
  }

  LoadModel_(itemName, position) {
    const loader = new FBXLoader();
    loader.setPath('./resources/weapon/FBX/');
    loader.load(itemName, (fbx) => {
      const model = fbx;
      model.scale.setScalar(0.01);
      model.position.copy(position);
      model.traverse((c) => {
        if (c.isMesh) {
          c.castShadow = true;
          c.receiveShadow = true;
        }
      });
      this.scene_.add(model);
      this.model_ = model;
    });
  }

  CreateRangeIndicator_() {
    const geometry = new THREE.RingGeometry(1.8, 2, 32);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    this.rangeIndicator_ = new THREE.Mesh(geometry, material);
    this.rangeIndicator_.rotation.x = -Math.PI / 2;
    this.rangeIndicator_.visible = false;
    this.scene_.add(this.rangeIndicator_);
  }

  ShowRangeIndicator() {
    if (this.model_ && this.rangeIndicator_) {
      this.rangeIndicator_.position.copy(this.model_.position);
      this.rangeIndicator_.visible = true;
    }
  }

  HideRangeIndicator() {
    if (this.rangeIndicator_) {
      this.rangeIndicator_.visible = false;
    }
  }

  use(player) {
    console.log(`${this.itemName} used by ${player.name}`);
    // 도구별 사용 로직 추가 가능
  }
}
