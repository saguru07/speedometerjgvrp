/* =========================================================
   JGVRP Speedometer HUD
   API: setSpeed(m/s) setRPM(0-1) setFuel(0-1|0-100) setHealth(0-1|0-1000)
        setGear(n) setHeadlights(0|1|2) setSeatbelts(bool) setEngine(bool)
        setLeftIndicator(bool) setRightIndicator(bool) updateLockStatus(state)
        setOdometer(miles) playIntro()
        opsional: setHandbrake(bool) setBattery(bool) setCruise(bool)
   ========================================================= */
const MPS_TO_MPH = 2.236936;
const RPM_N = 20, RED_FROM = 17;   // jumlah pill RPM, pill mulai merah

const NOOP = document.createElement('div');
const $ = (id) => document.getElementById(id) || NOOP;
const hud = $('hud');
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const isTrue = (v) => v === true || v === 1 || v === '1' || v === 'true';
const isLocked = (v) => isTrue(v) || v === 2 || v === '2';

function makeSegs(box, n, redFrom) {
    box.innerHTML = Array.from({ length: n }, (_, i) => `<i class="${i >= redFrom ? 'rl' : ''}"></i>`).join('');
    return [...box.children];
}
const rpmSegs = makeSegs($('rpm-bar'), RPM_N, RED_FROM);

// warna ikon: lit('id', 'green' | 'blue' | 'red' | 'yellow' | 'green blink' | '')
function lit(id, c) {
    const e = $(id);
    e.classList.remove('green', 'blue', 'red', 'yellow', 'blink');
    if (c) e.classList.add(...c.split(' '));
}

const st = { rpm: 0, shown: 0, lit: -1, fuel: 1, belted: false, engine: false, mps: 0 };
let bootUntil = performance.now() + 1500;

// ---------- Loop animasi ----------
function frame(now) {
    let t = st.rpm;
    if (now < bootUntil) {                       // sweep naik-turun saat kontak ON
        const p = 1 - (bootUntil - now) / 1500;
        t = p < 0.5 ? p / 0.5 : 1 - (p - 0.5) / 0.5;
    } else hud.classList.remove('booting');

    st.shown += (t - st.shown) * 0.3;
    if (Math.abs(t - st.shown) < 0.002) st.shown = t;
    const n = Math.round(st.shown * RPM_N);
    if (n !== st.lit) {
        st.lit = n;
        rpmSegs.forEach((s, i) => s.classList.toggle('on', i < n));
        hud.classList.toggle('redline', st.shown >= RED_FROM / RPM_N);
    }
    requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// ---------- Setter ----------
function padDigits(n, len) {
    const s = String(Math.max(0, n)).padStart(len, '0');
    const f = s.search(/[1-9]/), cut = f === -1 ? len - 1 : f;
    return `<span class="dim">${s.slice(0, cut)}</span><span>${s.slice(cut)}</span>`;
}
window.setSpeed = (v) => {
    st.mps = Number(v || 0);
    $('speed-display').innerHTML = padDigits(Math.round(st.mps * MPS_TO_MPH), 3);
};
window.setRPM = (v) => { st.rpm = clamp01(Number(v || 0)); };
window.setFuel = (v) => {
    const x = Number(v || 0), p = clamp01(x > 1 ? x / 100 : x);
    st.fuel = p;
    $('fuel-val').textContent = Math.round(p * 100);
    $('fuel-stat').classList.toggle('low', p < 0.2);
};
window.setHealth = (v) => {                      // persen + ikon engine (kuning <=50%, merah <=30%)
    const x = Number(v || 0), p = clamp01(x > 1 ? x / 1000 : x);
    $('health-val').textContent = Math.round(p * 100);
    $('health-stat').classList.toggle('warn', p <= 0.5 && p > 0.3);
    $('health-stat').classList.toggle('low', p <= 0.3);
    lit('engine', p <= 0.3 ? 'red' : p <= 0.5 ? 'yellow' : '');
};
window.setGear = (g) => {
    let s = String(g);
    if (g == 0 || s.toUpperCase() === 'R') s = 'R';
    else if (g == null || s === '' || s.toUpperCase() === 'N') s = 'N';
    $('gear').textContent = s;
    $('gear').parentNode.classList.toggle('rev', s === 'R');
};
window.setHeadlights = (v) => {                  // 0 mati, 1 low (hijau), 2 high (biru)
    v = Number(v || 0);
    lit('hl-low', v === 1 ? 'green' : '');
    lit('hl-high', v === 2 ? 'blue' : '');
};
window.setLeftIndicator  = (on) => lit('ind-left',  isTrue(on) ? 'green blink' : '');
window.setRightIndicator = (on) => lit('ind-right', isTrue(on) ? 'green blink' : '');
window.updateLockStatus = (v) => {
    const l = isLocked(v);
    lit('door-lock', l ? 'yellow' : '');
    $('door-lock').classList.toggle('locked', l);
};
['setDoors', 'setDoorLock', 'setVehicleLocked', 'setLocked', 'setLock', 'toggleLock'].forEach((n) => (window[n] = window.updateLockStatus));
function beltIcon() { lit('seatbelts', st.belted ? 'green' : st.engine ? 'red' : ''); }
window.setSeatbelts = (v) => { st.belted = isTrue(v); beltIcon(); };
window.setEngine = (v) => { st.engine = isTrue(v); beltIcon(); };
window.setHandbrake = (on) => lit('handbrake', isTrue(on) ? 'red' : '');
window.setBattery = (on) => lit('battery', isTrue(on) ? 'red' : '');
window.setCruise = (on) => lit('cruise', isTrue(on) ? 'green' : '');
window.setOdometer = (d) => { $('odometer').textContent = Math.round(Number(d || 0)); };

// ---------- Intro ----------
let introTimer;
window.playIntro = () => {
    hud.classList.remove('intro-on');
    void hud.offsetWidth;
    hud.classList.add('intro-on');
    bootUntil = performance.now() + 1500;
    clearTimeout(introTimer);
    introTimer = setTimeout(() => hud.classList.remove('intro-on'), 2750);
};

// ---------- Suara (Web Audio). Matikan: ?nosound  | volume: ?volume=0.5 ----------
const SND = { enabled: true, volume: 0.3, beltEvery: 2000, minSpeed: 1, fuelBelow: 0.2, fuelEvery: 30000 };
try {
    const q = new URLSearchParams(location.search);
    if (['nosound', 'mute', 'silent'].some((k) => q.has(k))) SND.enabled = false;
    if (q.has('volume')) SND.volume = clamp01(parseFloat(q.get('volume')) || 0);
} catch (e) {}
let ac;
const audio = () => {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume().catch(() => {});
    return ac;
};
function tone(f, s, d, type, v) {
    const a = audio(), t0 = a.currentTime + s, o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, SND.volume * v), t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    o.connect(g).connect(a.destination);
    o.start(t0); o.stop(t0 + d + 0.03);
}
window.playHudSound = (k) => {
    if (!SND.enabled) return;
    try {
        if (k === 'seatbelt') { tone(1000, 0, 0.14, 'triangle', 1); tone(1000, 0.22, 0.14, 'triangle', 1); }
        else { tone(988, 0, 0.45, 'sine', 1); tone(740, 0.3, 0.7, 'sine', 1); }
    } catch (e) {}
};
window.setHudSound = (on, v) => { SND.enabled = !!on; if (v !== undefined) SND.volume = clamp01(Number(v)); };
['pointerdown', 'keydown'].forEach((e) => addEventListener(e, () => { try { audio(); } catch (x) {} }, { once: true }));

let lastBelt = -Infinity, lastFuel = -Infinity;
setInterval(() => {
    if (!SND.enabled || hud.classList.contains('intro-on')) return;
    const now = performance.now();
    if (!(st.engine && !st.belted && st.mps > SND.minSpeed)) lastBelt = -Infinity;
    else if (now - lastBelt >= SND.beltEvery) { lastBelt = now; playHudSound('seatbelt'); }
    if (!(st.engine && st.fuel < SND.fuelBelow)) lastFuel = -Infinity;
    else if (now - lastFuel >= SND.fuelEvery) { lastFuel = now; playHudSound('fuel'); }
}, 250);

// ---------- Pesan NUI: postMessage({ action: 'setSpeed', speed: 12 }) ----------
window.addEventListener('message', (e) => {
    const d = e.data;
    if (!d || typeof d !== 'object') return;
    const a = d.action || d.type;
    try {
        switch (a) {
            case 'setEngine': setEngine(d.state); break;
            case 'setSpeed': setSpeed(Number(d.speed) || 0); break;
            case 'setRPM': setRPM(Number(d.rpm) || 0); break;
            case 'setFuel': setFuel(Number(d.fuel) || 0); break;
            case 'setHealth': setHealth(Number(d.health) || 0); break;
            case 'setGear': setGear(d.gear !== undefined ? d.gear : 'N'); break;
            case 'setHeadlights': setHeadlights(Number(d.state) || 0); break;
            case 'setSeatbelts': setSeatbelts(d.state); break;
            case 'setLeftIndicator': setLeftIndicator(d.state); break;
            case 'setRightIndicator': setRightIndicator(d.state); break;
            case 'setOdometer': setOdometer(Number(d.distance) || 0); break;
            case 'setDoors': case 'lock': updateLockStatus(d.status !== undefined ? d.status : d.state); break;
            case 'playIntro': playIntro(); break;
            case 'muteSeatbelt': setHudSound(false); break;
            case 'unmuteSeatbelt': setHudSound(true); break;
        }
    } catch (x) {}
});

// ---------- Nilai awal ----------
setSpeed(0); setRPM(0); setFuel(100); setHealth(1000); setGear('N');
setHeadlights(0); setSeatbelts(false); setEngine(false); updateLockStatus(false); setOdometer(0);
playIntro();

// ---------- Demo (otomatis dengan ?demo, atau di netlify.app) ----------
const params = new URLSearchParams(location.search);
if (params.has('demo') || (/netlify\.app$/.test(location.hostname) && !params.has('nodemo'))) {
    document.body.classList.add('preview');
    const TOP = [0, 28, 48, 72, 98, 128, 165];
    let mps = 0, gear = 1, gas = true, odo = 18452.3, hp = 1000, fuel = 86, t = 0;
    setTimeout(() => {
        setEngine(true);
        setTimeout(() => setSeatbelts(true), 9000);
        setInterval(() => {
            t += 0.05;
            const mph = mps * MPS_TO_MPH;
            mps += gas ? 0.38 / gear : -0.55;
            if (mph > 150) gas = false;
            if (mps <= 0) { mps = 0; gas = true; }
            while (gear < 6 && mph > TOP[gear]) gear++;
            while (gear > 1 && mph < TOP[gear - 1] - 6) gear--;
            const rpm = 0.11 + clamp01((mph - TOP[gear - 1]) / (TOP[gear] - TOP[gear - 1])) * (gas ? 0.88 : 0.6);
            hp = hp <= 180 ? 1000 : hp - 0.9;
            fuel = fuel <= 4 ? 86 : fuel - 0.02;
            odo += (mph * 0.05) / 3600;
            setSpeed(mps); setRPM(rpm); setGear(gear); setHealth(hp); setFuel(fuel); setOdometer(odo);
            setLeftIndicator(Math.floor(t / 6) % 4 === 1);
            setRightIndicator(Math.floor(t / 6) % 4 === 3);
            setHeadlights(Math.floor(t / 9) % 3 === 2 ? 2 : 1);
            updateLockStatus(Math.floor(t / 7) % 2);
        }, 50);
    }, 3000);
}
