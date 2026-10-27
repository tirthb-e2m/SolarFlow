import assert from "node:assert/strict";
import { test } from "node:test";
import { roadLoops, sampleLoop } from "@/scene/city/lanes";
import {
  createTrafficSim,
  distanceBeforeCrossing,
  orientedClearance,
  stepTraffic,
  TRAFFIC_CROSSINGS,
  TRAFFIC_PLAN,
} from "@/scene/city/trafficSim";
import { restingGap } from "@/scene/city/vehicleMetrics";

const DT = 1 / 30;

function angleDelta(from: number, to: number) {
  let delta = to - from;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return delta;
}

test("oriented boxes overlap only when they occupy the same space", () => {
  const piled = orientedClearance(0, 0, 0, "car", 0, 0, 0, "car");
  assert.ok(piled < -1, `expected an overlap, got ${piled}`);
  const ahead = orientedClearance(0, 0, 0, "car", 0, 12, 0, "car");
  assert.ok(ahead > 4, `expected a forward gap, got ${ahead}`);
  const beside = orientedClearance(0, 0, 0, "car", 3, 0, 0, "car");
  assert.ok(beside > 0.8, `expected a side gap, got ${beside}`);
});

test("spawn pushes vehicles apart until the resting gap is clear", () => {
  const vehicles = [
    { kind: "car" as const, loop: 0, cruise: 8 },
    { kind: "truck" as const, loop: 0, cruise: 5 },
  ];
  const sim = createTrafficSim(vehicles, [40, 40.04], roadLoops);
  const report = stepTraffic(sim, vehicles, roadLoops, 0);
  assert.ok(report.minBumper >= restingGap("car", "truck") - 0.05, `bumper ${report.minBumper}`);
  assert.equal(report.overlaps, 0);
  assert.ok(report.minClearance >= 0.12, `clearance ${report.minClearance}`);
});

test("a faster car slows behind a truck without entering its bumper gap", () => {
  const vehicles = [
    { kind: "truck" as const, loop: 0, cruise: 4.6 },
    { kind: "car" as const, loop: 0, cruise: 9 },
  ];
  const sim = createTrafficSim(vehicles, [100, 82], roadLoops);
  let minBumper = Infinity;
  let maxDrop = 0;
  let previous = sim.speed[1];
  for (let frame = 0; frame < 30 * 14; frame += 1) {
    const before = stepTraffic(sim, vehicles, roadLoops, 0).minBumper;
    const report = stepTraffic(sim, vehicles, roadLoops, DT);
    minBumper = Math.min(minBumper, report.minBumper);
    if (before > restingGap("car", "truck") + 1) {
      maxDrop = Math.max(maxDrop, previous - sim.speed[1]);
    }
    previous = sim.speed[1];
    assert.equal(report.overlaps, 0, `frame ${frame}`);
  }
  assert.ok(minBumper >= restingGap("car", "truck") - 0.08, `bumper ${minBumper}`);
  assert.ok(sim.speed[1] < 6.5, `car speed ${sim.speed[1]}`);
  assert.ok(maxDrop <= 4.6 * DT + 0.04, `speed drop ${maxDrop}`);
});

test("crossing vehicles reserve the intersection instead of overlapping", () => {
  const cross = TRAFFIC_CROSSINGS[0];
  const boulevard = distanceBeforeCrossing(roadLoops[0], cross.x, cross.z, cross.radius, 9);
  const avenue = distanceBeforeCrossing(roadLoops[1], cross.x, cross.z, cross.radius, 9);
  const vehicles = [
    { kind: "car" as const, loop: 0, cruise: 7.6 },
    { kind: "van" as const, loop: 1, cruise: 7.1 },
  ];
  const sim = createTrafficSim(vehicles, [boulevard, avenue], roadLoops);
  let minClearance = Infinity;
  for (let frame = 0; frame < 30 * 16; frame += 1) {
    const report = stepTraffic(sim, vehicles, roadLoops, DT);
    minClearance = Math.min(minClearance, report.minClearance);
    assert.equal(report.overlaps, 0, `frame ${frame} clearance ${report.minClearance}`);
  }
  assert.ok(minClearance >= 0.35, `clearance ${minClearance}`);
});

test("the scheduled fleet keeps its gaps while turning and changing speed", () => {
  const sim = createTrafficSim(
    TRAFFIC_PLAN,
    TRAFFIC_PLAN.map((vehicle) => vehicle.distance),
    roadLoops,
  );
  let minBumper = Infinity;
  let minClearance = Infinity;
  for (let frame = 0; frame < 30 * 18; frame += 1) {
    const report = stepTraffic(sim, TRAFFIC_PLAN, roadLoops, DT);
    minBumper = Math.min(minBumper, report.minBumper);
    minClearance = Math.min(minClearance, report.minClearance);
    assert.equal(report.overlaps, 0, `frame ${frame} clearance ${report.minClearance.toFixed(3)}`);
    for (let index = 0; index < TRAFFIC_PLAN.length; index += 1) {
      assert.ok(sim.speed[index] >= -0.001 && sim.speed[index] <= TRAFFIC_PLAN[index].cruise + 0.001);
    }
  }
  assert.ok(minBumper >= 3.2, `bumper ${minBumper}`);
  assert.ok(minClearance >= 0.35, `clearance ${minClearance}`);
});

test("vehicle heading matches the route tangent through turns", () => {
  const sim = createTrafficSim(
    TRAFFIC_PLAN,
    TRAFFIC_PLAN.map((vehicle) => vehicle.distance),
    roadLoops,
  );
  for (let frame = 0; frame < 30 * 6; frame += 1) stepTraffic(sim, TRAFFIC_PLAN, roadLoops, DT);
  const pose = { x: 0, z: 0, yaw: 0 };
  TRAFFIC_PLAN.forEach((vehicle, index) => {
    sampleLoop(roadLoops[vehicle.loop], sim.distance[index], pose);
    const delta = Math.abs(angleDelta(pose.yaw, sim.yaw[index]));
    assert.ok(delta < 0.02, `vehicle ${index} heading error ${delta}`);
  });
});
