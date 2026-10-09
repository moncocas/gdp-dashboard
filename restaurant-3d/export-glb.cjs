// Exports the model to restaurant.glb for Blender, SketchUp, Windows 3D Viewer, etc.
// Usage: npm install three@0.128.0 && node export-glb.cjs
const fs = require('fs');
const path = require('path');
global.THREE = require('three');

// Minimal FileReader so GLTFExporter can run under Node
global.FileReader = class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(ab => { this.result = ab; this.onloadend && this.onloadend(); }); }
  readAsDataURL(blob) {
    blob.arrayBuffer().then(ab => {
      this.result = 'data:' + (blob.type || 'application/octet-stream') + ';base64,' + Buffer.from(ab).toString('base64');
      this.onloadend && this.onloadend();
    });
  }
};

global.window = global;
eval(fs.readFileSync(require.resolve('three/examples/js/exporters/GLTFExporter.js'), 'utf8'));
require('./building.js');

const scene = new THREE.Scene();
const { root } = globalThis.buildRestaurant(THREE);
root.getObjectByName('Site').remove(root.getObjectByName('Ground')); // drop the large lawn plane
scene.add(root);
scene.updateMatrixWorld(true);

new THREE.GLTFExporter().parse(scene, glb => {
  const out = path.join(__dirname, 'restaurant.glb');
  fs.writeFileSync(out, Buffer.from(glb));
  console.log('Wrote', out, (glb.byteLength / 1024).toFixed(0) + ' KB');
}, { binary: true });
