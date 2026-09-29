/**
 * SIGHT Core Contract Definitions & Type Schemas
 * Standardized data interfaces matching ROS 2 topics and dashboard state.
 */

/**
 * Risk Assessment Levels
 * @readonly
 * @enum {string}
 */
export const RiskLevel = {
  SAFE: 'SAFE',
  CAUTION: 'CAUTION',
  WARNING: 'WARNING',
  CRITICAL: 'CRITICAL'
};

/**
 * Detected Object Classes in NMDC Bailadila Mining Sector
 * @readonly
 * @enum {string}
 */
export const ObjectClass = {
  FALLEN_BOULDER: 'FALLEN_BOULDER',
  HEAVY_DUMPER: 'HEAVY_DUMPER',
  MINE_CREW: 'MINE_CREW',
  LIGHT_VEHICLE: 'LIGHT_VEHICLE',
  HAUL_ROAD_BERM: 'HAUL_ROAD_BERM',
  WATER_PUDDLE_SLIP_HAZARD: 'WATER_PUDDLE_SLIP_HAZARD'
};

/**
 * Sensor and System Health Status
 * @readonly
 * @enum {string}
 */
export const HardwareHealth = {
  OK: 'OK',
  DEGRADED: 'DEGRADED',
  FAILED: 'FAILED',
  OFFLINE: 'OFFLINE'
};

/**
 * Dashboard Operational Modes
 * @readonly
 * @enum {string}
 */
export const OperationalMode = {
  PRESENTATION: 'PRESENTATION',
  LIVE: 'LIVE'
};

/**
 * Helper to compute risk level based on obstacle distance and class
 * @param {number} distanceMeters 
 * @param {string} objectClass 
 * @param {number} relativeSpeed 
 * @returns {string}
 */
export function calculateRisk(distanceMeters, objectClass, relativeSpeed = 0) {
  if (distanceMeters <= 8.0) return RiskLevel.CRITICAL;
  if (distanceMeters <= 18.0) {
    if (objectClass === ObjectClass.MINE_CREW || objectClass === ObjectClass.FALLEN_BOULDER) {
      return RiskLevel.CRITICAL;
    }
    return RiskLevel.WARNING;
  }
  if (distanceMeters <= 35.0) return RiskLevel.CAUTION;
  return RiskLevel.SAFE;
}
