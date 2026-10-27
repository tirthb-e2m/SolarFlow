import { useFrame, useThree } from "@react-three/fiber";
/* eslint-disable react-hooks/immutability */
import { useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { CANAL_HALF, canalSamples } from "@/scene/city/canal";
import { BRIDGE, FOOTBRIDGE } from "@/scene/city/layout";
import type { StoryRuntime } from "@/scene/runtime";

const waterVertex = /* glsl */ `
  uniform float uTime;
  uniform float uMotion;
  varying vec3 vWorld;
  varying float vCrest;

  void main() {
    vec3 pos = position;
    float motion = uTime * uMotion;
    float crest = sin(pos.x * 0.42 + pos.z * 0.16 + motion * 1.15) * 0.016
      + sin(pos.z * 0.31 - pos.x * 0.18 - motion * 0.8) * 0.01
      + sin((pos.x + pos.z) * 1.15 + motion * 1.7) * 0.005;
    pos.y += crest;
    vec4 world = modelMatrix * vec4(pos, 1.0);
    vWorld = world.xyz;
    vCrest = crest;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const waterFragment = /* glsl */ `
  uniform sampler2D uReflection;
  uniform mat4 uReflectionMatrix;
  uniform vec3 uSunDirection;
  uniform float uSun;
  uniform float uDay;
  uniform float uReflect;
  varying vec3 vWorld;
  varying float vCrest;

  void main() {
    vec3 dx = dFdx(vWorld);
    vec3 dy = dFdy(vWorld);
    vec3 normal = normalize(cross(dx, dy));
    vec3 viewDir = normalize(cameraPosition - vWorld);
    float facing = pow(max(dot(normal, viewDir), 0.0), 0.55);
    float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.0);
    float mirror = mix(0.22, 0.48, uDay);
    vec3 deep = mix(vec3(0.03, 0.11, 0.15), vec3(0.04, 0.2, 0.26), uDay);
    vec3 shallow = mix(vec3(0.05, 0.2, 0.22), vec3(0.18, 0.46, 0.44), uDay);
    vec3 color = mix(deep, shallow, 0.62 + 0.3 * facing);
    vec4 projected = uReflectionMatrix * vec4(vWorld, 1.0);
    vec2 uv = projected.xy / projected.w * 0.5 + 0.5;
    vec3 reflected = texture2D(uReflection, clamp(uv, 0.0, 1.0)).rgb;
    float inFrame = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
    color = mix(color, reflected, fresnel * uReflect * inFrame * mirror);
    vec3 halfDir = normalize(uSunDirection + viewDir);
    float glint = pow(max(dot(normal, halfDir), 0.0), 80.0);
    color += vec3(1.0, 0.86, 0.62) * glint * uSun * 0.55;
    color += vec3(0.45, 0.72, 0.7) * fresnel * (0.08 + uDay * 0.18);
    color += vec3(0.2, 0.32, 0.28) * vCrest * 6.0 * uDay;
    gl_FragColor = vec4(color, 1.0);
  }
`;

type WaterProps = {
  runtime: RefObject<StoryRuntime | null>;
  quality: "high" | "low";
  reflectWater?: boolean;
};

function underCrossing(z: number) {
  return (
    Math.abs(z - BRIDGE.z) < BRIDGE.d / 2 + 0.45 || Math.abs(z - FOOTBRIDGE.z) < FOOTBRIDGE.d / 2 + 0.35
  );
}

function riverGeometry(step: number) {
  const samples = canalSamples(step, -78, 72);
  const half = CANAL_HALF - 0.55;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  samples.forEach((sample, index) => {
    positions.push(
      sample.x - sample.nx * half,
      0,
      sample.z - sample.nz * half,
      sample.x + sample.nx * half,
      0,
      sample.z + sample.nz * half,
    );
    const v = index / Math.max(1, samples.length - 1);
    uvs.push(0, v, 1, v);
    const next = samples[index + 1];
    if (!next || underCrossing((sample.z + next.z) / 2)) return;
    const a = index * 2;
    indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function Water({ runtime, quality, reflectWater }: WaterProps) {
  const mesh = useRef<THREE.Mesh>(null);
  const reflector = useMemo(() => new THREE.PerspectiveCamera(30, 1, 0.1, 800), []);
  const reflectionMatrix = useMemo(() => new THREE.Matrix4(), []);
  const allowReflect = reflectWater ?? quality === "high";
  const geometry = useMemo(
    () => riverGeometry(quality === "high" ? 1.6 : 2.8),
    [quality],
  );
  const target = useMemo(() => {
    const size = allowReflect ? (quality === "high" ? 512 : 256) : 16;
    const renderTarget = new THREE.WebGLRenderTarget(size, size);
    renderTarget.texture.colorSpace = THREE.SRGBColorSpace;
    return renderTarget;
  }, [allowReflect, quality]);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uMotion: { value: 1 },
        uReflection: { value: target.texture },
        uReflectionMatrix: { value: reflectionMatrix },
        uSunDirection: { value: new THREE.Vector3(0.4, 0.8, 0.3) },
        uSun: { value: 1.2 },
        uDay: { value: 1 },
        uReflect: { value: 0 },
      },
      vertexShader: waterVertex,
      fragmentShader: waterFragment,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
  }, [reflectionMatrix, target]);

  const { gl, scene, camera } = useThree();
  const clock = useRef(0);

  useEffect(() => {
    return () => {
      material.dispose();
      target.dispose();
      geometry.dispose();
    };
  }, [geometry, material, target]);

  useFrame((_, delta) => {
    const state = runtime.current;
    const surface = mesh.current;
    if (!state || !surface) return;

    if (!state.reduceMotion) clock.current += delta;
    material.uniforms.uTime.value = clock.current;
    material.uniforms.uMotion.value = state.reduceMotion ? 0 : 1;
    material.uniforms.uSun.value = state.sun;
    material.uniforms.uDay.value = state.day;
    material.uniforms.uSunDirection.value.copy(state.sunDirection);

    const reflect = allowReflect ? 1 : 0;
    material.uniforms.uReflect.value = reflect;
    if (!reflect) return;

    const waterY = surface.position.y;
    const mirrorY = waterY - (camera.position.y - waterY);
    reflector.position.set(camera.position.x, mirrorY, camera.position.z);
    reflector.up.set(0, -1, 0);
    const look = state.lookAt;
    reflector.lookAt(look.x, waterY - (look.y - waterY), look.z);
    reflector.fov = (camera as THREE.PerspectiveCamera).fov;
    reflector.aspect = (camera as THREE.PerspectiveCamera).aspect;
    reflector.updateProjectionMatrix();
    reflector.updateMatrixWorld();
    reflectionMatrix.multiplyMatrices(reflector.projectionMatrix, reflector.matrixWorldInverse);

    surface.visible = false;
    const previous = gl.getRenderTarget();
    const previousShadow = gl.shadowMap.enabled;
    gl.shadowMap.enabled = false;
    gl.setRenderTarget(target);
    gl.clear();
    gl.render(scene, reflector);
    gl.setRenderTarget(previous);
    gl.shadowMap.enabled = previousShadow;
    surface.visible = true;
  });

  return (
    <mesh
      ref={mesh}
      geometry={geometry}
      material={material}
      position={[0, 0.02, 0]}
      receiveShadow={false}
      castShadow={false}
    />
  );
}
