/**
 * SIGHT Automated Contract Validation & Test Suite
 * Validates scenario schemas, JSON structures, risk bounds, and metric invariants.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { RiskLevel, ObjectClass } from '../src/contracts/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`✅ PASS: ${message}`);
    passedTests++;
  }
}

function validateScenarioFile(filePath) {
  console.log(`\n🔍 Validating scenario: ${path.basename(filePath)}`);
  const content = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(content);

  // 1. Scenario info
  assert(data.scenario_info && data.scenario_info.name, 'Has valid scenario info name');
  assert(typeof data.scenario_info.visibility_m === 'number', 'Visibility is a numeric metric');

  // 2. Map structure
  assert(data.map && data.map.haul_road, 'Has haul road map data');
  assert(Array.isArray(data.map.haul_road.centerline), 'Centerline is an array of coordinates');

  // 3. AMR State
  assert(data.amr && typeof data.amr.position.x === 'number', 'AMR has valid numeric position X');
  assert(data.amr && typeof data.amr.position.y === 'number', 'AMR has valid numeric position Y');
  assert(typeof data.amr.heading_deg === 'number', 'AMR has valid heading degree');

  // 4. Detections
  assert(Array.isArray(data.detections), 'Detections is an array');
  data.detections.forEach((det, idx) => {
    assert(det.id, `Detection #${idx + 1} has an ID`);
    assert(ObjectClass[det.class] !== undefined, `Detection class '${det.class}' is a recognized ObjectClass`);
    assert(RiskLevel[det.risk] !== undefined, `Detection risk '${det.risk}' is a recognized RiskLevel`);
    assert(typeof det.distance_m === 'number' && det.distance_m > 0, `Distance ${det.distance_m}m is a positive number`);
    assert(det.bbox_cam && typeof det.bbox_cam.x === 'number', `Detection has valid bounding box`);
  });

  // 5. Diagnostics
  assert(data.diagnostics && data.diagnostics.sensors, 'Has sensor diagnostics object');
}

console.log('====================================================');
console.log(' SIGHT Test Suite — Data Contracts & Schema Audit');
console.log('====================================================');

const scenarios = [
  path.join(rootDir, 'src/data/presentation_scenario.json'),
  path.join(rootDir, 'src/data/scenario_approaching_dumper.json'),
  path.join(rootDir, 'src/data/scenario_clear_corridor.json')
];

scenarios.forEach(sc => validateScenarioFile(sc));

console.log('\n====================================================');
console.log(`🏁 Audit Results: ${passedTests}/${totalTests} Tests Passed.`);
console.log('====================================================');
