import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

let xrSession = null;
let gl = null;
let xrRefSpace = null;
let track = null;

document.addEventListener("DOMContentLoaded", () => {
  var xrButton = document.getElementById("xr-button");
  xrButton.addEventListener("click", onButtonClicked);
});

function onButtonClicked() {
  if (!xrSession) {
    // Check if WebXR is supported
    if (!navigator.xr) {
      console.log("WebXR not supported on this browser.");
      return;
    }
    navigator.xr.isSessionSupported("immersive-ar").then((supported) => {
      if (supported) {
        navigator.xr
          .requestSession("immersive-ar", { requiredFeatures: ["hit-test"] })
          .then(async (session) => {
            xrSession = session;
            const stream = await navigator.mediaDevices.getUserMedia({
              audio: false,
              video: true,
            });
            const videoTracks = stream.getVideoTracks();
            track = videoTracks[0];
            document.getElementById("viewer-camera").srcObject = stream;
            onSessionStarted();
          });
      }
    });
  } else {
    // activateButton est un Toggle Button
    xrSession.end().then(() => {
      xrSession = null;
      document.getElementById("xr-button").innerText = "Enter AR";
    });
  }
}

async function onSessionStarted() {
  try {
    xrSession.addEventListener("end", onSessionEnded);
    // Initialize a WebGL context that is compatible with WebXR
    const canvas = document.createElement("canvas");
    document.body.appendChild(canvas);
    const gl = canvas.getContext("webgl2", { xrCompatible: true });

    if (!gl) {
      console.error(
        "WebGL 2 is not supported. Please ensure your browser and device support it."
      );
      return;
    } else {
      console.log("WebGL 2 is supported");
    }

    // Set up Three.js scene
    const scene = new THREE.Scene();
    const video = document.getElementById("viewer-camera");
    const background_texture = new THREE.VideoTexture(video);
    scene.background = background_texture;

    // Load the Bed model
    const loader = new GLTFLoader();
    let bedModel;

    loader.load(
      "models/Bed.glb",
      function (gltf) {
        bedModel = gltf.scene;
        bedModel.scale.set(0.5, 0.5, 0.5); // Adjust scale as needed
        bedModel.position.set(0, 0, -1); // Set initial position
        scene.add(bedModel);
      },
      undefined,
      function (error) {
        console.error("Error loading model: ", error);
      }
    );

    // Start Load Flower
    let flower;
    loader.load(
      "https://immersive-web.github.io/webxr-samples/media/gltf/sunflower/sunflower.gltf",
      function (gltf) {
        flower = gltf.scene;
      }
    );

    // Set up the WebGLRenderer, which handles rendering to the session's base layer
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      preserveDrawingBuffer: true,
      canvas: canvas,
      context: gl,
    });
    renderer.autoClear = false;

    // Create a Three.js perspective camera
    const camera = new THREE.PerspectiveCamera();
    camera.matrixAutoUpdate = false;

    // Request an AR session
    xrSession.updateRenderState({
      baseLayer: new XRWebGLLayer(xrSession, gl),
    });

    // Request a 'local' reference space for the session
    xrRefSpace = await xrSession.requestReferenceSpace("local");

    // Rendering loop for AR
    const onXRFrame = async (time, frame) => {
      xrSession.requestAnimationFrame(onXRFrame);

      // Bind the graphics framebuffer to the baseLayer's framebuffer
      gl.bindFramebuffer(
        gl.FRAMEBUFFER,
        xrSession.renderState.baseLayer.framebuffer
      );

      // Retrieve the pose of the device
      const pose = frame.getViewerPose(xrRefSpace);

      // Create another XRReferenceSpace that has the viewer as the origin.
      const viewerSpace = await xrSession.requestReferenceSpace("viewer");
      // Perform hit testing using the viewer as origin.
      const hitTestSource = await xrSession.requestHitTestSource({
        space: viewerSpace,
      });

      if (pose) {
        // Use the first view (the only view in AR)
        const view = pose.views[0];
        const viewport = xrSession.renderState.baseLayer.getViewport(view);
        renderer.setSize(viewport.width, viewport.height);

        // Update the camera matrices with the current view
        camera.matrix.fromArray(view.transform.matrix);
        camera.projectionMatrix.fromArray(view.projectionMatrix);
        camera.updateMatrixWorld(true);

        const hitTestResults = frame.getHitTestResults(hitTestSource);
        if (hitTestResults.length > 0 && bedModel) {
          const hitPose = hitTestResults[0].getPose(viewerSpace);
          bedModel.visible = true;
          bedModel.position.set(
            hitPose.transform.position.x,
            hitPose.transform.position.y,
            hitPose.transform.position.z
          );
          bedModel.updateMatrixWorld(true);
        }

        // Added light for hit test
        //const directionalLight = new THREE.DirectionalLight(0xffffff, 0.3);
        //directionalLight.position.set(10, 15, 10);
        //scene.add(directionalLight);

        //render
        renderer.xr.enabled = true;

        // XRSession receives select events when the user performs a primary action.
        xrSession.addEventListener("select", (event) => {
          if (bedModel) {
            const clone = bedModel.clone();
            clone.position.copy(bedModel.position); // Use the current position of the bed model
            scene.add(clone);
          }
        });

        // Render the scene with Three.js
        renderer.render(scene, camera);
      }
    };

    // Start rendering loop
    xrSession.requestAnimationFrame(onXRFrame);

    // Update the UI to show that the session has started
    document.getElementById("xr-button").innerText = "Exit AR";
  } catch (err) {
    console.error("Error while trying to activate AR session:", err);
  }
}

async function onSessionEnded() {
  xrSession = null;
  document.getElementById("xr-button").innerText = "Start AR";
  track.stop();
}

window.onload = () => {
  "use strict";
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("./sw.js")
      .then(function (registration) {
        // Service worker registered correctly.
        console.log(
          "ServiceWorker registration successful with scope: ",
          registration.scope
        );
      })
      .catch(function (err) {
        // Troubles in registering the service worker. :(
        console.log("ServiceWorker registration failed: ", err);
      });
  }
};
