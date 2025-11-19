// ====================================================================
// 1. DEKLARASI VARIABEL GLOBAL
// ====================================================================
let scene, camera, renderer, ball1, ball2, plane, controls;
let v1i, v2i, m1, m2;
let v1f, v2f;
let restitutionCoefficient = 1.0;
let isSimulating = false;
let hasCollided = false;
const radiusScale = 0.5;
const speedMultiplier = 3; // Faktor skala visual untuk kecepatan

// ====================================================================
// 2. DEKLARASI ELEMEN DOM
// ====================================================================
const startButton = document.getElementById("start-button");
const resetButton = document.getElementById("reset-button");
const canvasContainer = document.getElementById("three-canvas");
const wrapper = document.getElementById("canvas-wrapper");
const initialMomentumDisplay = document.getElementById("initial-momentum");
const finalMomentumDisplay = document.getElementById("final-momentum");
const v1fCalcDisplay = document.getElementById("v1f-calc");
const v2fCalcDisplay = document.getElementById("v2f-calc");
const statusMessage = document.getElementById("status-message");
const overlayText = document.getElementById("overlay-text");
const restitutionSlider = document.getElementById("restitution-coefficient");
const restitutionValueDisplay = document.getElementById("e-value");
const energyLossDisplay = document.getElementById("energy-loss");

// Variabel waktu untuk animasi
let lastTime = 0;

// ====================================================================
// 3. FUNGSI UTILITAS FISIKA
// ====================================================================

/**
 * Menghitung Energi Kinetik total sistem.
 * @param {number} m1 Massa objek 1
 * @param {number} v1 Kecepatan objek 1
 * @param {number} m2 Massa objek 2
 * @param {number} v2 Kecepatan objek 2
 * @returns {number} Energi kinetik total
 */
function calculateKineticEnergy(m1, v1, m2, v2) {
  return 0.5 * m1 * v1 * v1 + 0.5 * m2 * v2 * v2;
}

/**
 * Menghitung kecepatan akhir setelah tumbukan 1D dengan koefisien restitusi (e).
 * @param {number} m1 Massa objek 1
 * @param {number} v1i Kecepatan awal objek 1
 * @param {number} m2 Massa objek 2
 * @param {number} v2i Kecepatan awal objek 2
 * @param {number} e Koefisien restitusi (0 <= e <= 1)
 * @returns {{v1f: number, v2f: number}} Kecepatan akhir kedua objek
 */
function calculateFinalVelocities(m1, v1i, m2, v2i, e) {
  const v1f =
    (v1i * (m1 - m2) + 2 * m2 * v2i - m2 * e * (v1i - v2i)) / (m1 + m2);
  const v2f =
    (v2i * (m2 - m1) + 2 * m1 * v1i + m1 * e * (v1i - v2i)) / (m1 + m2);
  return { v1f, v2f };
}

/**
 * Memperbarui tampilan hasil perhitungan momentum dan KE loss.
 */
function updateMomentumDisplay() {
  // Ambil nilai terbaru dari input
  const m1 = parseFloat(document.getElementById("m1").value);
  const v1i = parseFloat(document.getElementById("v1i").value);
  const m2 = parseFloat(document.getElementById("m2").value);
  const v2i = parseFloat(document.getElementById("v2i").value);
  const e = parseFloat(restitutionSlider.value);

  // Hitung Momentum dan KE
  const initialMomentum = m1 * v1i + m2 * v2i;
  const initialKE = calculateKineticEnergy(m1, v1i, m2, v2i);
  const results = calculateFinalVelocities(m1, v1i, m2, v2i, e);
  const finalKE = calculateKineticEnergy(m1, results.v1f, m2, results.v2f);
  const finalMomentum = m1 * results.v1f + m2 * results.v2f;
  const energyLoss = initialKE - finalKE;

  // Update UI
  initialMomentumDisplay.textContent = `${initialMomentum.toFixed(2)} kg.m/s`;
  finalMomentumDisplay.textContent = `${finalMomentum.toFixed(2)} kg.m/s`;
  energyLossDisplay.textContent = `${energyLoss.toFixed(2)} Joule`;
  v1fCalcDisplay.textContent = results.v1f.toFixed(2);
  v2fCalcDisplay.textContent = results.v2f.toFixed(2);

  // Ganti warna teks untuk KE Loss
  if (parseFloat(energyLoss) > 0.01) {
    energyLossDisplay.classList.remove("text-green-700");
    energyLossDisplay.classList.add("text-red-600");
  } else {
    energyLossDisplay.classList.remove("text-red-600");
    energyLossDisplay.classList.add("text-green-700");
  }
}

// ====================================================================
// 4. FUNGSI UTAMA THREE.JS DAN SIMULASI
// ====================================================================

/**
 * Menginisialisasi Scene, Camera, Renderer, dan Controls Three.js.
 */
function init() {
  // Scene Setup
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x202025);

  // Camera Setup
  camera = new THREE.PerspectiveCamera(
    45,
    wrapper.clientWidth / wrapper.clientHeight,
    0.1,
    1000
  );
  camera.position.set(0, 10, 25);
  camera.lookAt(0, 0, 0);

  // Renderer Setup
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(wrapper.clientWidth, wrapper.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  canvasContainer.appendChild(renderer.domElement);

  // Controls Setup
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.maxPolarAngle = Math.PI / 2; // Batasi kamera tidak bisa melihat dari bawah

  // Lighting Setup
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(10, 20, 10);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  scene.add(directionalLight);

  // Environment Setup
  const gridHelper = new THREE.GridHelper(100, 50, 0x888888, 0x444444);
  scene.add(gridHelper);

  const planeGeometry = new THREE.PlaneGeometry(100, 50);
  const planeMaterial = new THREE.ShadowMaterial({ opacity: 0.3 });
  plane = new THREE.Mesh(planeGeometry, planeMaterial);
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = -0.01;
  plane.receiveShadow = true;
  scene.add(plane);

  // Buat bola awal dan pasang event listener resize
  createBalls();
  window.addEventListener("resize", onWindowResize, false);
}

/**
 * Membuat atau memperbarui objek bola berdasarkan input massa.
 */
function createBalls() {
  m1 = parseFloat(document.getElementById("m1").value);
  m2 = parseFloat(document.getElementById("m2").value);

  // Hapus objek lama
  if (ball1) scene.remove(ball1);
  if (ball2) scene.remove(ball2);

  // Objek 1 (Merah)
  const r1 = radiusScale * Math.cbrt(m1);
  const geometry1 = new THREE.SphereGeometry(r1, 32, 32);
  const material1 = new THREE.MeshStandardMaterial({
    color: 0xff4444,
    roughness: 0.4,
    metalness: 0.3,
  });
  ball1 = new THREE.Mesh(geometry1, material1);
  ball1.position.set(-10, r1, 0); // Posisi y = jari-jari agar tepat di atas bidang
  ball1.userData = { mass: m1, initialRadius: r1 };
  ball1.castShadow = true;
  scene.add(ball1);

  // Objek 2 (Hijau)
  const r2 = radiusScale * Math.cbrt(m2);
  const geometry2 = new THREE.SphereGeometry(r2, 32, 32);
  const material2 = new THREE.MeshStandardMaterial({
    color: 0x44ff44,
    roughness: 0.4,
    metalness: 0.3,
  });
  ball2 = new THREE.Mesh(geometry2, material2);
  ball2.position.set(10, r2, 0);
  ball2.userData = { mass: m2, initialRadius: r2 };
  ball2.castShadow = true;
  scene.add(ball2);
}

/**
 * Menangani perubahan ukuran window untuk merender ulang canvas yang proporsional.
 */
function onWindowResize() {
  const width = wrapper.clientWidth;
  const height = wrapper.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

/**
 * Memulai simulasi tumbukan.
 */
function startSimulation() {
  // Reset status simulasi
  isSimulating = false;
  hasCollided = false;
  statusMessage.classList.add("hidden");
  overlayText.textContent = "Simulasi Siap";
  overlayText.classList.remove("opacity-0");

  // Ambil input
  m1 = parseFloat(document.getElementById("m1").value);
  v1i = parseFloat(document.getElementById("v1i").value);
  m2 = parseFloat(document.getElementById("m2").value);
  v2i = parseFloat(document.getElementById("v2i").value);
  restitutionCoefficient = parseFloat(restitutionSlider.value);

  // Validasi Input
  if (m1 <= 0 || m2 <= 0) {
    statusMessage.textContent = "Massa harus lebih besar dari 0!";
    statusMessage.classList.remove("hidden");
    return;
  }
  if (v1i === v2i) {
    statusMessage.textContent = "Kecepatan awal tidak boleh sama!";
    statusMessage.classList.remove("hidden");
    return;
  }
  if (v1i < v2i) {
    statusMessage.textContent =
      "Objek 1 harus lebih cepat dari Objek 2 agar bertabrakan!";
    statusMessage.classList.remove("hidden");
    return;
  }

  // Hitung kecepatan akhir
  const results = calculateFinalVelocities(
    m1,
    v1i,
    m2,
    v2i,
    restitutionCoefficient
  );
  v1f = results.v1f;
  v2f = results.v2f;

  // Perbarui UI hasil
  updateMomentumDisplay();
  finalMomentumDisplay.textContent = `Menunggu Tumbukan...`;

  // Reset posisi bola di 3D
  createBalls();
  ball1.position.x = -10;
  ball2.position.x = 10;

  // Atur status kontrol
  overlayText.textContent = "Tumbukan Dimulai...";
  startButton.disabled = true;
  startButton.textContent = "Simulasi Berjalan...";
  resetButton.disabled = false;

  isSimulating = true;
}

/**
 * Loop utama animasi (game loop).
 * @param {number} time Waktu saat ini (millidetik)
 */
function animate(time) {
  requestAnimationFrame(animate);

  // Perbarui kontrol kamera
  if (controls) controls.update();

  if (isSimulating) {
    // Perhitungan waktu delta
    const deltaTime = (time - lastTime) / 1000;
    // Batasi delta time untuk stabilitas (max 30 FPS step)
    const safeDelta = Math.min(deltaTime, 0.033);

    if (!hasCollided) {
      // Tahap 1: Pergerakan sebelum tumbukan
      ball1.position.x += v1i * safeDelta * speedMultiplier;
      ball2.position.x += v2i * safeDelta * speedMultiplier;

      const r1 = ball1.userData.initialRadius;
      const r2 = ball2.userData.initialRadius;
      const distance = ball2.position.x - ball1.position.x;

      // Deteksi Tumbukan
      if (distance <= r1 + r2) {
        hasCollided = true;

        const momentumAkhirSimulasi = (m1 * v1f + m2 * v2f).toFixed(2);
        finalMomentumDisplay.textContent = `${momentumAkhirSimulasi} kg.m/s`;

        // Koreksi posisi untuk un-overlap
        const overlap = r1 + r2 - distance;
        const totalMass = m1 + m2;
        ball1.position.x -= (overlap * m2) / totalMass;
        ball2.position.x += (overlap * m1) / totalMass;

        overlayText.textContent = `TUMBUKAN! Momentum Akhir: ${momentumAkhirSimulasi} kg.m/s`;
      }
    } else {
      // Tahap 2: Pergerakan setelah tumbukan (menggunakan kecepatan akhir)
      ball1.position.x += v1f * safeDelta * speedMultiplier;
      ball2.position.x += v2f * safeDelta * speedMultiplier;

      // Deteksi Batas Akhir Simulasi
      if (Math.abs(ball1.position.x) > 25 || Math.abs(ball2.position.x) > 25) {
        isSimulating = false;
        startButton.disabled = false;
        startButton.textContent = "Mulai Simulasi";
        overlayText.textContent = "Simulasi Selesai.";
      }
    }
  }
  lastTime = time;
  renderer.render(scene, camera);
}

// ====================================================================
// 5. INITIALIZATION & LISTENERS
// ====================================================================
window.onload = function () {
  init();
  // Panggil animate(0) untuk inisialisasi waktu delta
  animate(0);

  // Pasang event listeners untuk kontrol
  startButton.addEventListener("click", startSimulation);
  resetButton.addEventListener("click", startSimulation);

  // Listener untuk input (massa/kecepatan)
  document.querySelectorAll('input[type="number"]').forEach((input) => {
    input.addEventListener("input", updateMomentumDisplay);
  });

  // Listener untuk slider restitusi
  restitutionSlider.addEventListener("input", updateMomentumDisplay);

  // Inisialisasi tampilan awal
  updateMomentumDisplay();
  startSimulation();
};
