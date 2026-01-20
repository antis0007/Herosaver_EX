/* global Blob */

import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import { saveAs } from 'file-saver'
import { character, getName, process } from './utils'

// export full scene as JSON (for debugging)
window.saveJson = () =>
  saveAs(
    new Blob([JSON.stringify(window.CK.data.getJson())], { type: 'application/json;charset=utf-8' }),
    `${getName()}.json`
  )

// export character as STL file
window.saveStl = (subdivisions) => {
  const group = process(character, subdivisions, !!character.data.mirroredPose)
  const exporter = new STLExporter()
  saveAs(new Blob([exporter.parse(group)], { type: 'application/sla;charset=utf-8' }), `${getName()}.stl`)
}

/**
 * Export character as GLB (binary glTF) or GLTF (JSON).
 *
 * Notes:
 * - GLB is usually best: one file, includes buffers and (usually) images.
 * - Skeletons/skins and animations will export *if present* on the processed group.
 * - Texture embedding can be blocked by browser CORS/tainted-canvas rules if images
 *   are cross-origin without proper CORS headers.
 */
window.saveGltf = async (subdivisions, opts = {}) => {
  const group = process(character, subdivisions, !!character.data.mirroredPose)

  // Make sure transforms are current before exporting
  group.updateMatrixWorld(true)

  // Some exporters/material setups benefit from this normalization
  group.traverse((obj) => {
    if (obj.isSkinnedMesh && obj.normalizeSkinWeights) obj.normalizeSkinWeights()
  })

  const exporter = new GLTFExporter()

  // Default: export a single-file GLB (recommended)
  const options = {
    binary: true,              // true => GLB (ArrayBuffer), false => GLTF (JSON)
    onlyVisible: true,
    truncateDrawRange: true,
    // If the model already has textures, GLB generally keeps them embedded.
    // embedImages is primarily relevant for JSON .gltf; harmless to keep here.
    embedImages: true,

    // You can pass AnimationClips explicitly if needed:
    // animations: group.animations || [],

    // Merge/override via opts param
    ...opts
  }

  const result = await new Promise((resolve, reject) => {
    exporter.parse(
      group,
      (res) => resolve(res),
      (err) => reject(err),
      options
    )
  })

  const base = getName()
  if (result instanceof ArrayBuffer) {
    // GLB
    saveAs(new Blob([result], { type: 'model/gltf-binary' }), `${base}.glb`)
  } else {
    // GLTF (JSON). WARNING: this may reference external .bin / images unless fully embedded.
    const json = JSON.stringify(result, null, 2)
    saveAs(new Blob([json], { type: 'model/gltf+json;charset=utf-8' }), `${base}.gltf`)
  }
}

// Keep the old name so existing UI/buttons still work.
// (Old version was OBJ; now it exports GLB by default.)
window.saveObj = (subdivisions) => window.saveGltf(subdivisions, { binary: true })
