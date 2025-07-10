import { weapons } from './item.js';
import { hpSystem } from './hp.js';

export const ui = (() => {
  class GameUI {
    constructor(playerName = 'You') {
      this.playerName = playerName;
      this.kills = 0;
      this.deaths = 0;
      this.hp = 100;
      this.selectedWeapon = null;
      this.weaponInventory = {}; // { weaponName: slotNumber }

      this.players = {};
      this.weaponSlotEls = {};
      this.weaponSlotsMax = 3;

      this.createPersonalKDUI();
      this.createScoreboardUI();
      this.createFPSUI();
      this.createPlayerHUD();
      this.startFPSCounter();
      this.setupKeyEvents();
      this.syncHPandKD();
    }

    // ====================== 개인 K/D UI ======================
    createPersonalKDUI() {
      this.kdContainer = document.createElement('div');
      Object.assign(this.kdContainer.style, {
        position: 'absolute',
        top: '30px',
        right: '30px',
        zIndex: '300',
        background: 'rgba(30,40,60,0.85)',
        borderRadius: '10px',
        padding: '10px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        minWidth: '120px',
        color: '#fff',
      });

      this.kdTitle = document.createElement('div');
      this.kdTitle.innerText = 'K / D';
      Object.assign(this.kdTitle.style, {
        fontWeight: 'bold',
        fontSize: '16px',
        marginBottom: '6px',
      });

      this.kdValue = document.createElement('div');
      Object.assign(this.kdValue.style, {
        fontSize: '28px',
        color: '#ffec70',
        textShadow: '0 1px 4px #0008',
      });

      this.kdContainer.appendChild(this.kdTitle);
      this.kdContainer.appendChild(this.kdValue);
      document.body.appendChild(this.kdContainer);
    }

    // ====================== 전체 Scoreboard ======================
    createScoreboardUI() {
      this.scoreboard = document.createElement('div');
      Object.assign(this.scoreboard.style, {
        position: 'absolute',
        top: '80px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: '301',
        background: 'rgba(20, 20, 30, 0.95)',
        padding: '20px 40px',
        borderRadius: '12px',
        color: '#fff',
        display: 'none',
        flexDirection: 'column',
        alignItems: 'center',
        minWidth: '300px',
        maxHeight: '80vh',
        overflowY: 'auto',
      });

      this.scoreboardTitle = document.createElement('div');
      this.scoreboardTitle.innerText = 'Scoreboard';
      Object.assign(this.scoreboardTitle.style, {
        fontSize: '20px',
        fontWeight: 'bold',
        marginBottom: '10px',
      });

      this.scoreList = document.createElement('div');

      this.scoreboard.appendChild(this.scoreboardTitle);
      this.scoreboard.appendChild(this.scoreList);
      document.body.appendChild(this.scoreboard);
    }

    refreshScoreList() {
      this.scoreList.innerHTML = '';
      for (const name in this.players) {
        const p = this.players[name];
        const row = document.createElement('div');
        Object.assign(row.style, {
          display: 'flex',
          justifyContent: 'space-between',
          padding: '6px 10px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          background: name === this.playerName ? 'rgba(255,255,255,0.1)' : 'transparent',
          fontWeight: name === this.playerName ? 'bold' : 'normal',
        });
        row.innerHTML = `<span>${name}</span><span>${p.kills} / ${p.deaths}</span>`;
        this.scoreList.appendChild(row);
      }
    }

    // ====================== FPS ======================
    createFPSUI() {
      this.fpsDisplay = document.createElement('div');
      Object.assign(this.fpsDisplay.style, {
        position: 'absolute',
        top: '10px',
        left: '50%',
        transform: 'translateX(-50%)',
        color: '#00ff95',
        fontSize: '16px',
        fontWeight: 'bold',
        textShadow: '0 0 4px #000',
        zIndex: '1000',
      });
      document.body.appendChild(this.fpsDisplay);
    }

    startFPSCounter() {
      let last = performance.now();
      let frames = 0;
      const loop = () => {
        const now = performance.now();
        frames++;
        if (now - last >= 1000) {
          this.fpsDisplay.innerText = `FPS: ${frames}`;
          frames = 0;
          last = now;
        }
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }

    // ====================== HUD (HP + 인벤토리) ======================
    createPlayerHUD() {
      this.hud = document.createElement('div');
      Object.assign(this.hud.style, {
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        color: '#fff',
        fontSize: '14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        zIndex: '100',
      });

      // 체력바
      this.healthBar = document.createElement('div');
      this.healthBar.style.width = '200px';
      this.healthBar.style.height = '18px';
      this.healthBar.style.background = '#444';

      this.healthFill = document.createElement('div');
      Object.assign(this.healthFill.style, {
        height: '100%',
        width: '100%',
        background: 'linear-gradient(to right, #ff4444, #ffdd33)',
      });

      this.healthBar.appendChild(this.healthFill);
      this.hud.appendChild(this.healthBar);

      // 무기 슬롯 영역
      this.weaponSlots = document.createElement('div');
      this.weaponSlots.style.display = 'flex';
      this.weaponSlots.style.gap = '8px';
      this.hud.appendChild(this.weaponSlots);

      document.body.appendChild(this.hud);
    }

    addWeaponToInventory(weaponName) {
      if (!weapons) return;
      if (Object.keys(this.weaponInventory).length >= this.weaponSlotsMax) return;
      if (this.weaponInventory[weaponName]) return; // 중복 방지

      const nextSlot = Object.keys(this.weaponInventory).length + 1;
      this.weaponInventory[weaponName] = nextSlot;

      const weaponData = Object.values(weapons).find(w => w.name.toLowerCase() === weaponName.toLowerCase());
      if (!weaponData) return;

      const slot = document.createElement('div');
      Object.assign(slot.style, {
        width: '44px',
        height: '44px',
        background: '#222',
        border: '2px solid #888',
        borderRadius: '6px',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
      });

      const img = document.createElement('img');
      img.src = weaponData.icon;
      img.alt = weaponData.name;
      img.style.width = '36px';
      img.style.height = '36px';

      slot.appendChild(img);
      this.weaponSlots.appendChild(slot);
      this.weaponSlotEls[nextSlot] = slot;

      // 클릭 시 선택
      slot.addEventListener('click', () => this.selectWeapon(nextSlot));
      if (this.selectedWeapon === null) {
        this.selectWeapon(nextSlot);
      }
    }

    selectWeapon(slotNum) {
      this.selectedWeapon = slotNum;
      for (let key in this.weaponSlotEls) {
        this.weaponSlotEls[key].style.border = (parseInt(key) === slotNum)
          ? '2px solid yellow'
          : '2px solid #888';
      }
    }

    // ====================== 상태 연동 ======================
    syncHPandKD() {
      setInterval(() => {
        const kills = hpSystem.getKills();
        const deaths = hpSystem.getDeaths();
        const hp = hpSystem.getHP?.() ?? this.hp;
        this.setKillsAndDeaths(kills, deaths);
        this.setHP(hp);
      }, 300);
    }

    setKillsAndDeaths(k, d) {
      this.kills = k;
      this.deaths = d;
      this.kdValue.innerText = `${k} / ${d}`;
      this.updatePlayerKD(this.playerName, k, d);
    }

    setHP(percent) {
      this.hp = percent;
      this.healthFill.style.width = `${percent}%`;
    }

    addPlayer(name) {
      if (!this.players[name]) {
        this.players[name] = { kills: 0, deaths: 0 };
        this.refreshScoreList();
      }
    }

    updatePlayerKD(name, kills, deaths) {
      if (!this.players[name]) {
        this.addPlayer(name);
      }
      this.players[name].kills = kills;
      this.players[name].deaths = deaths;
      this.refreshScoreList();
    }

    showScoreboard(show) {
      this.scoreboard.style.display = show ? 'flex' : 'none';
    }

    // ====================== 키보드 입력 ======================
    setupKeyEvents() {
      window.addEventListener('keydown', (e) => {
        if (e.code === 'Tab') {
          e.preventDefault();
          this.showScoreboard(true);
        }

        // 숫자키 1~3 -> 무기 선택
        const keyNum = parseInt(e.key);
        if (!isNaN(keyNum) && this.weaponSlotEls[keyNum]) {
          this.selectWeapon(keyNum);
        }
      });

      window.addEventListener('keyup', (e) => {
        if (e.code === 'Tab') {
          e.preventDefault();
          this.showScoreboard(false);
        }
      });
    }
  }

  return { GameUI };
})();

export const gameUI = new ui.GameUI();