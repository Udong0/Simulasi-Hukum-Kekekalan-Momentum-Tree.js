let scene, camera, renderer, ball1, ball2, plane, controls;
let v1i, v2i, m1, m2;
let v1f, v2f;
let restitutionCoefficient = 1.0;
let isSimulating = false;
let hasCollided = false;
const radiusScale = 0.5;
const speedMultiplier = 3;

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

let lastTime = 0;

function calculateKineticEnergy(m1, v1, m2, v2) {
  return 0.5 * m1 * v1 * v1 + 0.5 * m2 * v2 * v2;
}

function calculateFinalVelocities(m1, v1i, m2, v2i, e) {
  const totalMomentum = m1 * v1i + m2 * v2i;
  const relativeVelocity = v1i - v2i;
  const totalMass = m1 + m2;

  const v1f = (totalMomentum - m2 * e * relativeVelocity) / totalMass;
  const v2f = (totalMomentum + m1 * e * relativeVelocity) / totalMass;

  return { v1f, v2f };
}

function updateMomentumDisplay() {
  const m1 = parseFloat(document.getElementById("m1").value);
  const v1i = parseFloat(document.getElementById("v1i").value);
  const m2 = parseFloat(document.getElementById("m2").value);
  const v2i = parseFloat(document.getElementById("v2i").value);
  const e = parseFloat(restitutionSlider.value);

  const initialMomentum = m1 * v1i + m2 * v2i;
  const initialKE = calculateKineticEnergy(m1, v1i, m2, v2i);
  const results = calculateFinalVelocities(m1, v1i, m2, v2i, e);
  const finalKE = calculateKineticEnergy(m1, results.v1f, m2, results.v2f);
  const finalMomentum = m1 * results.v1f + m2 * results.v2f;
  const energyLoss = initialKE - finalKE;

  initialMomentumDisplay.textContent = `${initialMomentum.toFixed(2)} kg.m/s`;
  finalMomentumDisplay.textContent = `${finalMomentum.toFixed(2)} kg.m/s`;
  energyLossDisplay.textContent = `${energyLoss.toFixed(2)} Joule`;
  v1fCalcDisplay.textContent = results.v1f.toFixed(2);
  v2fCalcDisplay.textContent = results.v2f.toFixed(2);

  if (energyLoss > 0.01) {
    energyLossDisplay.classList.remove("text-green-700");
    energyLossDisplay.classList.add("text-red-600");
  } else {
    energyLossDisplay.classList.remove("text-red-600");
    energyLossDisplay.classList.add("text-green-700");
  }
}

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x202025);

  camera = new THREE.PerspectiveCamera(
    45,
    wrapper.clientWidth / wrapper.clientHeight,
    0.1,
    1000
  );
  camera.position.set(0, 10, 25);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(wrapper.clientWidth, wrapper.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  canvasContainer.appendChild(renderer.domElement);

  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.maxPolarAngle = Math.PI / 2;

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(10, 20, 10);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  scene.add(directionalLight);

  const gridHelper = new THREE.GridHelper(100, 50, 0x888888, 0x444444);
  scene.add(gridHelper);

  const planeGeometry = new THREE.PlaneGeometry(100, 50);
  const planeMaterial = new THREE.ShadowMaterial({ opacity: 0.3 });
  plane = new THREE.Mesh(planeGeometry, planeMaterial);
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = -0.01;
  plane.receiveShadow = true;
  scene.add(plane);

  createBalls();
  window.addEventListener("resize", onWindowResize, false);
}

function createBalls() {
  m1 = parseFloat(document.getElementById("m1").value);
  m2 = parseFloat(document.getElementById("m2").value);

  if (ball1) scene.remove(ball1);
  if (ball2) scene.remove(ball2);

  const r1 = radiusScale * Math.cbrt(m1);
  const geometry1 = new THREE.SphereGeometry(r1, 32, 32);
  const material1 = new THREE.MeshStandardMaterial({
    color: 0xff4444,
    roughness: 0.4,
    metalness: 0.3,
  });
  ball1 = new THREE.Mesh(geometry1, material1);
  ball1.position.set(-10, r1, 0);
  ball1.userData = { mass: m1, initialRadius: r1 };
  ball1.castShadow = true;
  scene.add(ball1);

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

function onWindowResize() {
  const width = wrapper.clientWidth;
  const height = wrapper.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

function startSimulation() {
  isSimulating = false;
  hasCollided = false;
  statusMessage.classList.add("hidden");
  overlayText.textContent = "Simulasi Siap";
  overlayText.classList.remove("opacity-0");

  m1 = parseFloat(document.getElementById("m1").value);
  v1i = parseFloat(document.getElementById("v1i").value);
  m2 = parseFloat(document.getElementById("m2").value);
  v2i = parseFloat(document.getElementById("v2i").value);
  restitutionCoefficient = parseFloat(restitutionSlider.value);

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

  const results = calculateFinalVelocities(
    m1,
    v1i,
    m2,
    v2i,
    restitutionCoefficient
  );
  v1f = results.v1f;
  v2f = results.v2f;

  updateMomentumDisplay();
  finalMomentumDisplay.textContent = `Menunggu Tumbukan...`;

  createBalls();
  ball1.position.x = -10;
  ball2.position.x = 10;

  overlayText.textContent = "Tumbukan Dimulai...";
  startButton.disabled = true;
  startButton.textContent = "Simulasi Berjalan...";
  resetButton.disabled = false;

  isSimulating = true;
}

function animate(time) {
  requestAnimationFrame(animate);

  if (controls) controls.update();

  if (isSimulating) {
    const deltaTime = (time - lastTime) / 1000;
    const safeDelta = Math.min(deltaTime, 0.033);

    if (!hasCollided) {
      ball1.position.x += v1i * safeDelta * speedMultiplier;
      ball2.position.x += v2i * safeDelta * speedMultiplier;

      const r1 = ball1.userData.initialRadius;
      const r2 = ball2.userData.initialRadius;
      const distance = ball2.position.x - ball1.position.x;

      if (distance <= r1 + r2) {
        hasCollided = true;

        const momentumAkhirSimulasi = (m1 * v1f + m2 * v2f).toFixed(2);
        finalMomentumDisplay.textContent = `${momentumAkhirSimulasi} kg.m/s`;

        const overlap = r1 + r2 - distance;
        const totalMass = m1 + m2;
        ball1.position.x -= (overlap * m2) / totalMass;
        ball2.position.x += (overlap * m1) / totalMass;

        overlayText.textContent = `TUMBUKAN! Momentum Akhir: ${momentumAkhirSimulasi} kg.m/s`;
      }
    } else {
      ball1.position.x += v1f * safeDelta * speedMultiplier;
      ball2.position.x += v2f * safeDelta * speedMultiplier;

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

window.onload = function () {
  init();
  animate(0);

  startButton.addEventListener("click", startSimulation);
  resetButton.addEventListener("click", startSimulation);

  document.querySelectorAll('input[type="number"]').forEach((input) => {
    input.addEventListener("input", updateMomentumDisplay);
  });

  restitutionSlider.addEventListener("input", (e) => {
    restitutionValueDisplay.textContent = parseFloat(e.target.value).toFixed(2); // Update display angka slider
    updateMomentumDisplay();
  });

  updateMomentumDisplay();
  startSimulation();
};
