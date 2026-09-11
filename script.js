import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { MeshoptDecoder }
  from "three/addons/libs/meshopt_decoder.module.js";
/* =========================================================
   V2 VISUAL LOOK — RESTORED
========================================================= */

const LOOK = {
  metalness: 0.44,
  roughness: 0.31,

  environmentIntensity: 0.78,

  exposure: 0.82,

  keyIntensity: 5.2,
  fillIntensity: 0.32,
  rimIntensity: 2.8
};


/* =========================================================
   DOM
========================================================= */

const root =
  document.documentElement;

const hero =
  document.querySelector("#hero");

const stage =
  document.querySelector(".model-stage");

const canvas =
  document.querySelector("#three-canvas");

const loading =
  document.querySelector("#loading");


/* =========================================================
   RENDERER
========================================================= */

const renderer =
  new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance"
  });

renderer.setPixelRatio(
  Math.min(
    window.devicePixelRatio,
    2
  )
);

renderer.setSize(
  window.innerWidth,
  window.innerHeight,
  false
);

renderer.outputColorSpace =
  THREE.SRGBColorSpace;

renderer.toneMapping =
  THREE.ACESFilmicToneMapping;

renderer.toneMappingExposure =
  LOOK.exposure;


/* =========================================================
   SCENE / CAMERA
========================================================= */

const scene =
  new THREE.Scene();

scene.background = null;

const camera =
  new THREE.PerspectiveCamera(
    34,
    window.innerWidth / window.innerHeight,
    0.01,
    1000
  );


/* =========================================================
   CONTROLS
========================================================= */

const controls =
  new OrbitControls(
    camera,
    renderer.domElement
  );

controls.enableDamping = true;
controls.dampingFactor = 0.065;

controls.enablePan = false;

/*
  Keep wheel scrolling for the page.
  Users can still freely orbit by dragging.
*/
controls.enableZoom = false;

controls.enableRotate = true;

controls.rotateSpeed = 0.50;

controls.target.set(0, 0, 0);

/*
  MOBILE SCROLL FIX

  OrbitControls writes `touch-action: none` onto its canvas.
  That can trap the user inside the 3D model on phones.

  Restoring `pan-y` here lets vertical swipes scroll the page,
  while horizontal gestures can still rotate the model.
*/
renderer.domElement.style.touchAction = "pan-y";


/* =========================================================
   CURSOR-FOLLOW MOTION
========================================================= */

/*
  The spacecraft has a base presentation angle.
  Cursor motion adds only a subtle amount on top of it.
*/
const baseRotation = {
  x: THREE.MathUtils.degToRad(-5),
  y: THREE.MathUtils.degToRad(-14),
  z: THREE.MathUtils.degToRad(-3)
};

const pointer = {
  x: 0,
  y: 0
};

const smoothPointer = {
  x: 0,
  y: 0
};

let pointerInside = false;
let isDragging = false;


/*
  Track the cursor over the full model stage.
  The normalized range is -1 ... +1.
*/
stage.addEventListener(
  "pointermove",
  (event) => {

    /*
      Cursor-follow is desktop-only.
      Touch input should remain available for scrolling.
    */
    if (event.pointerType === "touch") {
      return;
    }

    const rect =
      stage.getBoundingClientRect();

    pointer.x =
      THREE.MathUtils.clamp(
        ((event.clientX - rect.left) /
        rect.width) * 2 - 1,
        -1,
        1
      );

    pointer.y =
      THREE.MathUtils.clamp(
        ((event.clientY - rect.top) /
        rect.height) * 2 - 1,
        -1,
        1
      );

    pointerInside = true;

  }
);

stage.addEventListener(
  "pointerleave",
  () => {
    pointerInside = false;
    pointer.x = 0;
    pointer.y = 0;
  }
);

canvas.addEventListener(
  "pointerdown",
  (event) => {

    /*
      Do not manually capture touch pointers.
      This allows the browser to turn vertical finger movement
      into normal page scrolling.
    */
    if (event.pointerType === "touch") {
      isDragging = false;
      return;
    }

    isDragging = true;

    canvas.setPointerCapture?.(
      event.pointerId
    );

  }
);

window.addEventListener(
  "pointerup",
  () => {
    isDragging = false;
  }
);


/* =========================================================
   LIGHTS
========================================================= */

const keyLight =
  new THREE.DirectionalLight(
    0xffffff,
    LOOK.keyIntensity
  );

scene.add(keyLight);


const fillLight =
  new THREE.DirectionalLight(
    0xdde7ff,
    LOOK.fillIntensity
  );

scene.add(fillLight);


const rimLight =
  new THREE.DirectionalLight(
    0xeaf3ff,
    LOOK.rimIntensity
  );

scene.add(rimLight);


/* =========================================================
   HDR
========================================================= */

const pmrem =
  new THREE.PMREMGenerator(renderer);

pmrem.compileEquirectangularShader();

new RGBELoader()
  .load(
    "studio-1k.hdr",

    (hdrTexture) => {

      const envMap =
        pmrem
          .fromEquirectangular(hdrTexture)
          .texture;

      scene.environment = envMap;

      if (scene.environmentRotation) {
        scene.environmentRotation.y =
          -0.50;
      }

      hdrTexture.dispose();
      pmrem.dispose();

    },

    undefined,

    (error) => {
      console.warn(
        "Could not load studio.hdr:",
        error
      );
    }
  );


/* =========================================================
   MODEL
========================================================= */

const loader =
  new GLTFLoader();

loader.setMeshoptDecoder(
  MeshoptDecoder
);

let spacecraft = null;
let modelRadius = 1;

loader.load(
  "model-web.glb",

  (gltf) => {

    spacecraft =
      gltf.scene;


    /* -----------------------------------------
       Center
    ----------------------------------------- */

    const initialBox =
      new THREE.Box3()
        .setFromObject(spacecraft);

    const initialCenter =
      initialBox.getCenter(
        new THREE.Vector3()
      );

    spacecraft.position.sub(
      initialCenter
    );


    /* -----------------------------------------
       Starting hero angle
    ----------------------------------------- */

    spacecraft.rotation.set(
      baseRotation.x,
      baseRotation.y,
      baseRotation.z
    );

    scene.add(spacecraft);


    /* -----------------------------------------
       Bounds
    ----------------------------------------- */

    const box =
      new THREE.Box3()
        .setFromObject(spacecraft);

    const sphere =
      box.getBoundingSphere(
        new THREE.Sphere()
      );

    modelRadius =
      Math.max(
        sphere.radius,
        0.001
      );


    /* -----------------------------------------
       V2 material treatment restored
    ----------------------------------------- */

    spacecraft.traverse(
      (object) => {

        if (!object.isMesh) return;

        const materials =
          Array.isArray(object.material)
            ? object.material
            : [object.material];

        materials.forEach(
          (material) => {

            if (!material) return;

            if (
              material.isMeshStandardMaterial ||
              material.isMeshPhysicalMaterial
            ) {

              material.metalness =
                LOOK.metalness;

              material.roughness =
                LOOK.roughness;

              material.envMapIntensity =
                LOOK.environmentIntensity;

              if (
                "specularIntensity" in material
              ) {
                material.specularIntensity =
                  0.55;
              }

              if (
                "ior" in material
              ) {
                material.ior = 1.45;
              }

              if (material.map) {
                material.map.anisotropy =
                  Math.min(
                    8,
                    renderer.capabilities
                      .getMaxAnisotropy()
                  );
              }

              material.needsUpdate = true;
            }

          }
        );

      }
    );


    /* -----------------------------------------
       Camera — V2 close hero framing
    ----------------------------------------- */

    const fov =
      THREE.MathUtils.degToRad(
        camera.fov
      );

    const distance =
      modelRadius /
      Math.sin(fov / 2);

    camera.position.set(
      distance * 0.68,
      distance * 0.20,
      distance * 0.76
    );

    camera.near =
      Math.max(
        modelRadius / 100,
        0.001
      );

    camera.far =
      modelRadius * 50;

    camera.updateProjectionMatrix();

    controls.target.set(0, 0, 0);
    controls.update();


    /* -----------------------------------------
       V2 lighting
    ----------------------------------------- */

    keyLight.position.set(
      -modelRadius * 2.4,
       modelRadius * 3.0,
       modelRadius * 3.2
    );

    fillLight.position.set(
       modelRadius * 2.2,
      -modelRadius * 0.25,
       modelRadius * 1.8
    );

    rimLight.position.set(
       modelRadius * 2.5,
       modelRadius * 1.9,
      -modelRadius * 3.0
    );


    loading.classList.add(
      "hidden"
    );

  },

  (progress) => {

    if (
      progress.total &&
      Number.isFinite(progress.total)
    ) {

      const percent =
        Math.round(
          progress.loaded /
          progress.total *
          100
        );

      loading.textContent =
        `LOADING OBJECT ${percent}%`;
    }

  },

  (error) => {

    console.error(
      "Could not load model.glb:",
      error
    );

    loading.textContent =
      "MODEL COULD NOT LOAD";

  }
);


/* =========================================================
   HERO SCROLL PROGRESS
========================================================= */

function clamp(
  value,
  min = 0,
  max = 1
) {

  return Math.min(
    max,
    Math.max(min, value)
  );

}

function updateScroll() {

  /*
    Important:
    Progress is based only on the sticky hero section.
    The project summary below does NOT affect the animation.
  */
  const heroStart =
    hero.offsetTop;

  const heroScrollableDistance =
    hero.offsetHeight -
    window.innerHeight;

  const heroProgress =
    heroScrollableDistance > 0
      ? clamp(
          (
            window.scrollY -
            heroStart
          ) /
          heroScrollableDistance
        )
      : 0;

  root.style.setProperty(
    "--scroll",
    heroProgress.toFixed(4)
  );


  /*
    Model appears late in the hero sequence.
  */
  const modelStart = 0.70;
  const modelEnd = 0.90;

  const modelProgress =
    clamp(
      (heroProgress - modelStart) /
      (modelEnd - modelStart)
    );

  root.style.setProperty(
    "--model",
    modelProgress.toFixed(4)
  );


  /*
    Interaction switches on before the hero finishes,
    giving the user time to play with the object.
  */
  const interactive =
    modelProgress > 0.72;

  stage.classList.toggle(
    "interactive",
    interactive
  );

  controls.enabled =
    interactive;

}


/* =========================================================
   RESIZE
========================================================= */

function resize() {

  const width =
    window.innerWidth;

  const height =
    window.innerHeight;

  camera.aspect =
    width / height;

  camera.updateProjectionMatrix();

  renderer.setSize(
    width,
    height,
    false
  );

}


/* =========================================================
   RENDER LOOP
========================================================= */

function render() {

  requestAnimationFrame(render);


  /*
    Smooth cursor movement.
  */
  const desiredX =
    pointerInside
      ? pointer.x
      : 0;

  const desiredY =
    pointerInside
      ? pointer.y
      : 0;

  smoothPointer.x +=
    (desiredX - smoothPointer.x) *
    0.045;

  smoothPointer.y +=
    (desiredY - smoothPointer.y) *
    0.045;


  /*
    Cursor-follow rotation only while the user is NOT dragging.

    Horizontal cursor movement:
      +/- 8 degrees yaw

    Vertical cursor movement:
      +/- 4 degrees pitch

    A tiny roll adds depth without feeling game-like.
  */
  if (
    spacecraft &&
    !isDragging
  ) {

    const targetX =
      baseRotation.x +
      smoothPointer.y *
      THREE.MathUtils.degToRad(4);

    const targetY =
      baseRotation.y +
      smoothPointer.x *
      THREE.MathUtils.degToRad(8);

    const targetZ =
      baseRotation.z -
      smoothPointer.x *
      THREE.MathUtils.degToRad(1.5);

    spacecraft.rotation.x =
      THREE.MathUtils.lerp(
        spacecraft.rotation.x,
        targetX,
        0.045
      );

    spacecraft.rotation.y =
      THREE.MathUtils.lerp(
        spacecraft.rotation.y,
        targetY,
        0.045
      );

    spacecraft.rotation.z =
      THREE.MathUtils.lerp(
        spacecraft.rotation.z,
        targetZ,
        0.045
      );

  }


  /*
    OrbitControls handles click-drag exploration.
  */
  controls.update();

  renderer.render(
    scene,
    camera
  );

}


/* =========================================================
   START
========================================================= */

updateScroll();
resize();
render();

window.addEventListener(
  "scroll",
  updateScroll,
  { passive: true }
);

window.addEventListener(
  "resize",
  resize
);


/* =========================================================
   B-ROLL LAZY LOADING
   ---------------------------------------------------------
   The 2 MB video starts downloading only when the section is
   about one viewport away. This keeps the initial 3D experience
   from competing with the video for bandwidth.
========================================================= */

const brollSection =
  document.querySelector("#broll");

const brollVideo =
  document.querySelector("#broll-video");

let brollRequested = false;

function loadBroll() {

  if (
    !brollSection ||
    !brollVideo ||
    brollRequested
  ) {
    return;
  }

  brollRequested = true;

  brollVideo.src =
    "video/broll.mp4";

  brollVideo.load();

  const markReady = () => {
    brollSection.classList.add(
      "is-ready"
    );
  };

  brollVideo.addEventListener(
    "canplay",
    markReady,
    { once: true }
  );

}


/*
  Begin downloading when the B-roll section is roughly
  one viewport away from view.
*/
if (
  brollSection &&
  brollVideo &&
  "IntersectionObserver" in window
) {

  const brollLoadObserver =
    new IntersectionObserver(
      (entries, observer) => {

        entries.forEach(
          (entry) => {

            if (entry.isIntersecting) {
              loadBroll();
              observer.disconnect();
            }

          }
        );

      },
      {
        root: null,
        rootMargin: "100% 0px",
        threshold: 0
      }
    );

  brollLoadObserver.observe(
    brollSection
  );

} else {

  /*
    Older-browser fallback.
  */
  window.addEventListener(
    "load",
    () => {
      setTimeout(
        loadBroll,
        1200
      );
    },
    { once: true }
  );

}


/*
  Play only when the video section is visible.
  Pause when it leaves the viewport.
*/
if (
  brollSection &&
  brollVideo &&
  "IntersectionObserver" in window
) {

  const brollPlayObserver =
    new IntersectionObserver(
      (entries) => {

        entries.forEach(
          (entry) => {

            if (
              entry.isIntersecting &&
              entry.intersectionRatio > 0.18
            ) {

              loadBroll();

              brollVideo
                .play()
                .catch(() => {});

            } else {

              brollVideo.pause();

            }

          }
        );

      },
      {
        threshold: [
          0,
          0.18,
          0.5,
          1
        ]
      }
    );

  brollPlayObserver.observe(
    brollSection
  );

}


/*
  Fade the video in once enough data is available.
*/
if (brollVideo) {

  brollVideo.addEventListener(
    "playing",
    () => {

      if (brollSection) {
        brollSection.classList.add(
          "is-ready"
        );
      }

    }
  );

}
