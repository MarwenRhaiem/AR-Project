import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

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
