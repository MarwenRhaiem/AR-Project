import * as THREE from "three";
import { ARButton } from "three/addons/webxr/ARButton.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { XREstimatedLight } from "three/addons/webxr/XREstimatedLight.js";

class ARFurnitureViewer {
  constructor() {
    this.isPresenting = false;
    this.initialize();
  }

  initialize() {
    // Scene setup
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.01,
      20
    );

    // Models configuration
    this.models = [
      "models/dylan_armchair_yolk_yellow.glb",
      "models/ivan_armchair_mineral_blue.glb",
      "models/marble_coffee_table.glb",
      "models/flippa_functional_coffee_table_w._storagewalnut.glb",
      "models/frame_armchairpetrol_velvet_with_gold_frame.glb",
      "models/elnaz_nesting_side_tables_brass__green_marble.glb",
    ];
    this.modelScaleFactor = [0.01, 0.01, 0.005, 0.01, 0.01, 0.01];
    this.items = [];
    this.itemSelectedIndex = 0;

    // XR variables
    this.hitTestSource = null;
    this.hitTestSourceRequested = false;

    this.setupRenderer();
    this.setupLights();
    this.setupXR();
    this.loadModels();
    this.setupEventListeners();
    this.animate();
  }

  setupRenderer() {
    const canvas = document.getElementById("canvas");
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.xr.enabled = true;
  }

  setupLights() {
    this.defaultLight = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
    this.defaultLight.position.set(0.5, 1, 0.25);
    this.scene.add(this.defaultLight);

    // Try to setup XR estimated light if supported
    try {
      this.xrLight = new XREstimatedLight(this.renderer);

      this.xrLight.addEventListener("estimationstart", () => {
        this.scene.add(this.xrLight);
        this.scene.remove(this.defaultLight);
        if (this.xrLight.environment) {
          this.scene.environment = this.xrLight.environment;
        }
      });

      this.xrLight.addEventListener("estimationend", () => {
        this.scene.add(this.defaultLight);
        this.scene.remove(this.xrLight);
      });
    } catch (error) {
      console.log("Light estimation not supported, using default lighting");
    }
  }

  setupXR() {
    // Modification des options XR pour rendre light-estimation vraiment optionnel
    const xrSessionInit = {
      requiredFeatures: ["hit-test"],
      optionalFeatures: ["dom-overlay"],
      domOverlay: { root: document.body },
    };

    // Ajout de light-estimation seulement si supporté
    if (this.xrLight) {
      xrSessionInit.optionalFeatures.push("light-estimation");
    }

    const arButton = ARButton.createButton(this.renderer, xrSessionInit);
    document.body.appendChild(arButton);

    // Gestion des événements de session XR
    this.renderer.xr.addEventListener("sessionstart", () => {
      this.isPresenting = true;
    });

    this.renderer.xr.addEventListener("sessionend", () => {
      this.isPresenting = false;
      // Redimensionner après la fin de la session
      this.onWindowResize();
    });

    this.controller = this.renderer.xr.getController(0);
    this.controller.addEventListener("select", this.onSelect.bind(this));
    this.scene.add(this.controller);

    this.reticle = new THREE.Mesh(
      new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial()
    );
    this.reticle.matrixAutoUpdate = false;
    this.reticle.visible = false;
    this.scene.add(this.reticle);
  }

  loadModels() {
    const loader = new GLTFLoader();
    this.models.forEach((modelPath, index) => {
      loader.load(modelPath, (gltf) => {
        this.items[index] = gltf.scene;
      });
    });
  }

  setupEventListeners() {
    // Modification de la gestion du redimensionnement
    window.addEventListener("resize", () => {
      if (!this.isPresenting) {
        this.onWindowResize();
      }
    });

    // Setup furniture selection
    for (let i = 0; i < this.models.length; i++) {
      const el = document.querySelector(`#item${i}`);
      el.addEventListener("beforexrselect", (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
      el.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.onFurnitureSelect(e, i);
      });
    }
  }

  onWindowResize() {
    if (!this.isPresenting) {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
  }

  onFurnitureSelect(event, index) {
    this.itemSelectedIndex = index;

    // Update selection UI
    document.querySelectorAll(".button-image").forEach((el) => {
      el.classList.remove("clicked");
    });
    event.target.classList.add("clicked");
  }

  onSelect() {
    if (this.reticle.visible) {
      const selectedModel = this.items[this.itemSelectedIndex]?.clone();
      if (selectedModel) {
        this.reticle.matrix.decompose(
          selectedModel.position,
          selectedModel.quaternion,
          selectedModel.scale
        );
        const scaleFactor = this.modelScaleFactor[this.itemSelectedIndex];
        selectedModel.scale.set(scaleFactor, scaleFactor, scaleFactor);
        this.scene.add(selectedModel);
      }
    }
  }

  animate() {
    this.renderer.setAnimationLoop(this.render.bind(this));
  }

  render(timestamp, frame) {
    if (frame) {
      const referenceSpace = this.renderer.xr.getReferenceSpace();
      const session = this.renderer.xr.getSession();

      if (!this.hitTestSourceRequested) {
        session.requestReferenceSpace("viewer").then((referenceSpace) => {
          session
            .requestHitTestSource({ space: referenceSpace })
            .then((source) => {
              this.hitTestSource = source;
            })
            .catch((error) => {
              console.warn("Hit test source request failed:", error);
            });
        });

        session.addEventListener("end", () => {
          this.hitTestSourceRequested = false;
          this.hitTestSource = null;
        });

        this.hitTestSourceRequested = true;
      }

      if (this.hitTestSource) {
        const hitTestResults = frame.getHitTestResults(this.hitTestSource);
        if (hitTestResults.length) {
          const hit = hitTestResults[0];
          this.reticle.visible = true;
          this.reticle.matrix.fromArray(
            hit.getPose(referenceSpace).transform.matrix
          );
        } else {
          this.reticle.visible = false;
        }
      }
    }

    this.renderer.render(this.scene, this.camera);
  }
}

// Register Service Worker for PWA
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js")
      .then((registration) => {
        console.log("ServiceWorker registration successful");
      })
      .catch((err) => {
        console.log("ServiceWorker registration failed: ", err);
      });
  });
}

// Initialize the application
window.addEventListener("DOMContentLoaded", () => {
  new ARFurnitureViewer();
});
