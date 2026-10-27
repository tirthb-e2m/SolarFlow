import * as THREE from "three";

export function updateWorld(object: THREE.Object3D) {
  object.updateMatrixWorld(true);
}

export function measure(object: THREE.Object3D) {
  updateWorld(object);
  const bounds = new THREE.Box3().setFromObject(object);
  return { box: bounds, size: bounds.getSize(new THREE.Vector3()) };
}

export function standOnGround(object: THREE.Object3D) {
  const { box: bounds } = measure(object);
  object.position.y -= bounds.min.y;
  updateWorld(object);
}

export function fitHeight(object: THREE.Object3D, height: number) {
  const { size } = measure(object);
  const current = Math.max(size.y, 0.001);
  object.scale.multiplyScalar(height / current);
  standOnGround(object);
}

export function fitHorizontal(object: THREE.Object3D, length: number) {
  const { size } = measure(object);
  const current = Math.max(size.x, size.z, 0.001);
  object.scale.multiplyScalar(length / current);
  standOnGround(object);
}

export function enableShadows(object: THREE.Object3D, cast = true) {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = cast;
      child.receiveShadow = true;
    }
  });
}

export function cloneModel(source: THREE.Object3D) {
  return source.clone(true);
}

export function cloneWithOwnMaterials(source: THREE.Object3D) {
  const clone = source.clone(true);
  clone.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.castShadow = true;
    child.receiveShadow = true;
    child.material = Array.isArray(child.material)
      ? child.material.map((material) => material.clone())
      : child.material.clone();
  });
  return clone;
}
