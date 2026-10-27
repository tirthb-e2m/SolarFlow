import type { Pose, RoadLoop } from "@/scene/city/lanes";
import { sampleLoop } from "@/scene/city/lanes";
import {
  restingGap,
  VEHICLE_METRICS,
  type VehicleKind,
} from "@/scene/city/vehicleMetrics";

export type TrafficVehicle = {
  kind: VehicleKind;
  loop: number;
  cruise: number;
};

export type TrafficPaint = TrafficVehicle & {
  distance: number;
  color: string;
};

/**
 * Shared routes. Distances are meters along each loop.
 * Loop 0 = boulevard; 1..6 = avenues at -78, -44, -14, 8.5, 64, 88.
 * Spawns keep large along-lane gaps so the IDM / separator stay clear.
 */
export const TRAFFIC_PLAN: TrafficPaint[] = [
  { kind: "car", loop: 0, distance: 8, cruise: 8.2, color: "#e7eaee" },
  { kind: "car", loop: 0, distance: 52, cruise: 7.4, color: "#1d4068" },
  { kind: "van", loop: 0, distance: 102, cruise: 5.9, color: "#d7d0c4" },
  { kind: "car", loop: 0, distance: 158, cruise: 7.9, color: "#6d2e2c" },
  { kind: "truck", loop: 0, distance: 220, cruise: 4.5, color: "#f3f5f7" },
  { kind: "car", loop: 0, distance: 290, cruise: 7.2, color: "#2b3138" },
  { kind: "van", loop: 1, distance: 18, cruise: 5.8, color: "#ece8e1" },
  { kind: "car", loop: 1, distance: 96, cruise: 7.8, color: "#3c4a38" },
  { kind: "car", loop: 2, distance: 24, cruise: 7.9, color: "#23486f" },
  { kind: "truck", loop: 2, distance: 118, cruise: 4.7, color: "#c4b8a4" },
  { kind: "van", loop: 3, distance: 30, cruise: 6.1, color: "#d5dbe1" },
  { kind: "car", loop: 3, distance: 110, cruise: 8.1, color: "#7a342c" },
  { kind: "car", loop: 4, distance: 28, cruise: 7.7, color: "#f4f1ea" },
  { kind: "van", loop: 4, distance: 108, cruise: 6, color: "#4a5560" },
  { kind: "car", loop: 5, distance: 36, cruise: 7.5, color: "#8d322c" },
  { kind: "truck", loop: 5, distance: 130, cruise: 4.6, color: "#d5dae0" },
  { kind: "car", loop: 6, distance: 42, cruise: 7.6, color: "#1f6b4a" },
  { kind: "van", loop: 6, distance: 124, cruise: 5.9, color: "#c45c28" },
];

/** Boulevard crossings. Radius covers both lane pairs so bodies cannot enter together. */
export const TRAFFIC_CROSSINGS = [
  { x: -78, z: 0, radius: 6 },
  { x: -44, z: 0, radius: 6 },
  { x: -14, z: 0, radius: 6.1 },
  { x: 8.5, z: 0, radius: 6.3 },
  { x: 64, z: 0, radius: 6.1 },
  { x: 88, z: 0, radius: 6 },
] as const;

const ACCEL = 2.5;
const BRAKE = 4.8;
const HEADWAY = 1.25;
const CLEARANCE = 0.65;

export type TrafficSim = {
  distance: Float64Array;
  speed: Float64Array;
  yaw: Float64Array;
  prevDistance: Float64Array;
  prevSpeed: Float64Array;
  px: Float64Array;
  pz: Float64Array;
  pyaw: Float64Array;
};

export type TrafficReport = {
  minBumper: number;
  minClearance: number;
  overlaps: number;
};

const poseA: Pose = { x: 0, z: 0, yaw: 0 };

function wrap(value: number, span: number) {
  if (span <= 0) return 0;
  let next = value % span;
  if (next < 0) next += span;
  return next;
}

function forwardCenter(from: number, to: number, total: number) {
  return wrap(to - from, total);
}

function place(loop: RoadLoop, distance: number, out: Pose) {
  sampleLoop(loop, distance, out);
  return out;
}

export function orientedClearance(
  ax: number,
  az: number,
  ayaw: number,
  aKind: VehicleKind,
  bx: number,
  bz: number,
  byaw: number,
  bKind: VehicleKind,
) {
  const a = VEHICLE_METRICS[aKind];
  const b = VEHICLE_METRICS[bKind];
  const aHalf = (a.nose + a.tail) / 2;
  const bHalf = (b.nose + b.tail) / 2;
  const aMid = (a.nose - a.tail) / 2;
  const bMid = (b.nose - b.tail) / 2;
  const as = Math.sin(ayaw);
  const ac = Math.cos(ayaw);
  const bs = Math.sin(byaw);
  const bc = Math.cos(byaw);
  const dx = bx + bs * bMid - (ax + as * aMid);
  const dz = bz + bc * bMid - (az + ac * aMid);
  const axes: ReadonlyArray<readonly [number, number]> = [
    [as, ac],
    [ac, -as],
    [bs, bc],
    [bc, -bs],
  ];
  let best = -Infinity;
  for (const [x, z] of axes) {
    const len = Math.hypot(x, z) || 1;
    const nx = x / len;
    const nz = z / len;
    const dist = Math.abs(dx * nx + dz * nz);
    const ra = aHalf * Math.abs(as * nx + ac * nz) + a.halfWidth * Math.abs(ac * nx - as * nz);
    const rb = bHalf * Math.abs(bs * nx + bc * nz) + b.halfWidth * Math.abs(bc * nx - bs * nz);
    best = Math.max(best, dist - ra - rb);
  }
  return best;
}

function findLeader(index: number, vehicles: TrafficVehicle[], distance: ArrayLike<number>, loops: RoadLoop[]) {
  const mine = vehicles[index];
  const total = loops[mine.loop]?.total ?? 0;
  if (total <= 0) return null;
  let bestGap = Infinity;
  let best = -1;
  for (let other = 0; other < vehicles.length; other += 1) {
    if (other === index || vehicles[other].loop !== mine.loop) continue;
    const gap = forwardCenter(distance[index], distance[other], total);
    if (gap < 0.0001 && other > index) continue;
    if (gap < bestGap) {
      bestGap = gap;
      best = other;
    }
  }
  if (best < 0) return null;
  const bumper = bestGap - VEHICLE_METRICS[mine.kind].nose - VEHICLE_METRICS[vehicles[best].kind].tail;
  return { index: best, bumper };
}

function metersUntil(loop: RoadLoop, distance: number, x: number, z: number, radius: number, horizon: number) {
  place(loop, distance, poseA);
  const r2 = radius * radius;
  if ((poseA.x - x) ** 2 + (poseA.z - z) ** 2 <= r2) return 0;
  const step = 0.7;
  for (let traveled = step; traveled <= horizon; traveled += step) {
    place(loop, distance + traveled, poseA);
    if ((poseA.x - x) ** 2 + (poseA.z - z) ** 2 <= r2) return traveled;
  }
  return Number.POSITIVE_INFINITY;
}

function idm(speed: number, cruise: number, bumper: number | null, leaderSpeed: number, gap0: number) {
  const free = 1 - (Math.max(speed, 0) / Math.max(cruise, 0.1)) ** 4;
  if (bumper === null) return ACCEL * free;
  const closing = speed - leaderSpeed;
  const desired = gap0 + Math.max(speed, 0) * HEADWAY + (speed * closing) / (2 * Math.sqrt(ACCEL * BRAKE));
  const gap = Math.max(0.35, bumper);
  return ACCEL * (free - (desired / gap) ** 2);
}

function crossingAccel(index: number, vehicles: TrafficVehicle[], distance: ArrayLike<number>, speed: ArrayLike<number>, loops: RoadLoop[]) {
  const mine = vehicles[index];
  const metrics = VEHICLE_METRICS[mine.kind];
  const velocity = speed[index];
  const horizon = metrics.nose + (velocity * velocity) / (2 * BRAKE) + 8;
  let cap = ACCEL;
  for (const cross of TRAFFIC_CROSSINGS) {
    const entry = metersUntil(loops[mine.loop], distance[index], cross.x, cross.z, cross.radius, horizon);
    if (!Number.isFinite(entry) || entry === 0) continue;
    let yieldNow = false;
    for (let other = 0; other < vehicles.length; other += 1) {
      if (other === index || vehicles[other].loop === mine.loop) continue;
      const otherMetrics = VEHICLE_METRICS[vehicles[other].kind];
      const otherSpeed = speed[other];
      const otherHorizon = otherMetrics.nose + (otherSpeed * otherSpeed) / (2 * BRAKE) + 8;
      const otherEntry = metersUntil(
        loops[vehicles[other].loop],
        distance[other],
        cross.x,
        cross.z,
        cross.radius,
        otherHorizon,
      );
      if (!Number.isFinite(otherEntry)) continue;
      const otherInside = otherEntry === 0;
      if (otherInside || otherEntry + 0.3 < entry || (Math.abs(otherEntry - entry) <= 0.3 && other < index)) {
        yieldNow = true;
        break;
      }
    }
    if (!yieldNow) continue;
    const room = Math.max(0.25, entry - metrics.nose - 0.9);
    const needed = velocity < 0.08 ? -BRAKE : -(velocity * velocity) / (2 * room);
    cap = Math.min(cap, room < 0.6 ? -BRAKE : Math.max(-BRAKE, needed));
  }
  return cap;
}

function separate(sim: TrafficSim, vehicles: TrafficVehicle[], loops: RoadLoop[], passes: number) {
  for (let pass = 0; pass < passes; pass += 1) {
    const snapshot = sim.distance.slice();
    for (let index = 0; index < vehicles.length; index += 1) {
      const leader = findLeader(index, vehicles, snapshot, loops);
      if (!leader) continue;
      const gap0 = restingGap(vehicles[index].kind, vehicles[leader.index].kind);
      if (leader.bumper >= gap0) continue;
      sim.distance[index] = snapshot[index] - (gap0 - leader.bumper);
    }
  }
}

function committed(x: number, z: number) {
  return TRAFFIC_CROSSINGS.some((cross) => (x - cross.x) ** 2 + (z - cross.z) ** 2 <= (cross.radius - 1.1) ** 2);
}

function pickYielder(i: number, j: number, sim: TrafficSim, vehicles: TrafficVehicle[], loops: RoadLoop[]) {
  if (vehicles[i].loop === vehicles[j].loop) {
    const total = loops[vehicles[i].loop].total;
    const ahead = forwardCenter(sim.distance[i], sim.distance[j], total);
    const behind = forwardCenter(sim.distance[j], sim.distance[i], total);
    return ahead <= behind ? i : j;
  }
  const iIn = committed(sim.px[i], sim.pz[i]);
  const jIn = committed(sim.px[j], sim.pz[j]);
  if (iIn !== jIn) return iIn ? j : i;
  return j < i ? i : j;
}

function sampleAll(sim: TrafficSim, vehicles: TrafficVehicle[], loops: RoadLoop[]) {
  for (let index = 0; index < vehicles.length; index += 1) {
    place(loops[vehicles[index].loop], sim.distance[index], poseA);
    sim.px[index] = poseA.x;
    sim.pz[index] = poseA.z;
    sim.pyaw[index] = poseA.yaw;
    sim.yaw[index] = poseA.yaw;
  }
}

function pairClearance(sim: TrafficSim, vehicles: TrafficVehicle[], i: number, j: number) {
  return orientedClearance(
    sim.px[i],
    sim.pz[i],
    sim.pyaw[i],
    vehicles[i].kind,
    sim.px[j],
    sim.pz[j],
    sim.pyaw[j],
    vehicles[j].kind,
  );
}

function moveVehicle(sim: TrafficSim, vehicles: TrafficVehicle[], loops: RoadLoop[], index: number, delta: number) {
  sim.distance[index] += delta;
  place(loops[vehicles[index].loop], sim.distance[index], poseA);
  sim.px[index] = poseA.x;
  sim.pz[index] = poseA.z;
  sim.pyaw[index] = poseA.yaw;
}

function resolveBodies(sim: TrafficSim, vehicles: TrafficVehicle[], loops: RoadLoop[]) {
  const count = vehicles.length;
  for (let pass = 0; pass < 5; pass += 1) {
    sampleAll(sim, vehicles, loops);
    let hit = false;
    for (let i = 0; i < count; i += 1) {
      for (let j = i + 1; j < count; j += 1) {
        let gap = pairClearance(sim, vehicles, i, j);
        if (gap >= CLEARANCE) continue;
        hit = true;
        const first = pickYielder(i, j, sim, vehicles, loops);
        const order = [first, first === i ? j : i];
        for (const vehicle of order) {
          if (gap >= CLEARANCE) break;
          for (const direction of [-1, 1]) {
            if (gap >= CLEARANCE) break;
            for (let step = 0; step < 18 && gap < CLEARANCE; step += 1) {
              const before = gap;
              moveVehicle(sim, vehicles, loops, vehicle, direction * 0.4);
              gap = pairClearance(sim, vehicles, i, j);
              if (gap + 0.004 < before) {
                moveVehicle(sim, vehicles, loops, vehicle, -direction * 0.4);
                gap = before;
                break;
              }
            }
          }
        }
      }
    }
    if (!hit) break;
  }
}

function publish(sim: TrafficSim, vehicles: TrafficVehicle[], loops: RoadLoop[]): TrafficReport {
  for (let index = 0; index < vehicles.length; index += 1) {
    const total = loops[vehicles[index].loop].total;
    sim.distance[index] = wrap(sim.distance[index], total);
  }
  sampleAll(sim, vehicles, loops);
  let minBumper = Infinity;
  let minClearance = Infinity;
  let overlaps = 0;
  for (let index = 0; index < vehicles.length; index += 1) {
    const leader = findLeader(index, vehicles, sim.distance, loops);
    if (leader) minBumper = Math.min(minBumper, leader.bumper);
  }
  for (let i = 0; i < vehicles.length; i += 1) {
    for (let j = i + 1; j < vehicles.length; j += 1) {
      const gap = orientedClearance(
        sim.px[i],
        sim.pz[i],
        sim.pyaw[i],
        vehicles[i].kind,
        sim.px[j],
        sim.pz[j],
        sim.pyaw[j],
        vehicles[j].kind,
      );
      minClearance = Math.min(minClearance, gap);
      if (gap < 0) overlaps += 1;
    }
  }
  return { minBumper, minClearance, overlaps };
}

export function createTrafficSim(vehicles: TrafficVehicle[], seed: ArrayLike<number>, loops: RoadLoop[]) {
  const count = vehicles.length;
  const sim: TrafficSim = {
    distance: Float64Array.from(seed),
    speed: Float64Array.from(vehicles, (vehicle) => vehicle.cruise),
    yaw: new Float64Array(count),
    prevDistance: new Float64Array(count),
    prevSpeed: new Float64Array(count),
    px: new Float64Array(count),
    pz: new Float64Array(count),
    pyaw: new Float64Array(count),
  };
  separate(sim, vehicles, loops, count + 2);
  resolveBodies(sim, vehicles, loops);
  separate(sim, vehicles, loops, 3);
  resolveBodies(sim, vehicles, loops);
  publish(sim, vehicles, loops);
  return sim;
}

/**
 * Advance every vehicle along its loop.
 * Same-route pairs keep a bumper gap from the intelligent-driver model, then a hard gap correction.
 * Crossing routes reserve the intersection for the vehicle already inside or closest to it.
 * Any remaining body overlap pushes the yielding vehicle backward along its own route.
 */
export function stepTraffic(sim: TrafficSim, vehicles: TrafficVehicle[], loops: RoadLoop[], dt: number) {
  const step = Math.min(Math.max(dt, 0), 0.05);
  if (step <= 0) return publish(sim, vehicles, loops);
  sim.prevDistance.set(sim.distance);
  sim.prevSpeed.set(sim.speed);
  for (let index = 0; index < vehicles.length; index += 1) {
    const leader = findLeader(index, vehicles, sim.distance, loops);
    const cruise = vehicles[index].cruise;
    let accel = idm(
      sim.speed[index],
      cruise,
      leader ? leader.bumper : null,
      leader ? sim.speed[leader.index] : cruise,
      leader ? restingGap(vehicles[index].kind, vehicles[leader.index].kind) : 0,
    );
    if (leader && leader.bumper < restingGap(vehicles[index].kind, vehicles[leader.index].kind)) {
      accel = Math.min(accel, -BRAKE);
    }
    accel = Math.min(accel, crossingAccel(index, vehicles, sim.distance, sim.speed, loops));
    accel = Math.max(-BRAKE, Math.min(ACCEL, accel));
    sim.speed[index] = Math.min(cruise, Math.max(0, sim.speed[index] + accel * step));
    sim.distance[index] += sim.speed[index] * step;
  }
  separate(sim, vehicles, loops, vehicles.length + 1);
  resolveBodies(sim, vehicles, loops);
  separate(sim, vehicles, loops, 2);
  resolveBodies(sim, vehicles, loops);
  return publish(sim, vehicles, loops);
}

export function distanceBeforeCrossing(loop: RoadLoop, x: number, z: number, radius: number, lead: number) {
  let best = 0;
  let score = Infinity;
  for (let distance = 0; distance < loop.total; distance += 0.45) {
    const entry = metersUntil(loop, distance, x, z, radius, lead + 4);
    const error = Math.abs(entry - lead);
    if (error < score) {
      score = error;
      best = distance;
    }
  }
  return best;
}
