/**
 * SIGHT MockLiveStreamer Service
 * Provides client-side fallback live streaming simulation for demonstration
 * when physical ROS 2 network bridge is in offline evaluation mode.
 */

export class MockLiveStreamer {
  constructor(onDataCallback) {
    this.onData = onDataCallback || (() => {});
    this.timer = null;
    this.isActive = false;
    this.time = 0;
  }

  start() {
    if (this.isActive) return;
    this.isActive = true;
    this.time = 0;

    this.timer = setInterval(() => {
      this.time += 0.1;
      
      // Dynamic AMR locomotion along haul curve
      const posX = 45.0 + Math.sin(this.time * 0.2) * 4.0;
      const posY = 40.5 + Math.cos(this.time * 0.2) * 1.5;
      const heading = 350.0 + Math.sin(this.time * 0.3) * 6.0;

      // Dynamic distance to boulder
      const boulderDist = Math.max(5.0, 12.4 - ((this.time * 0.8) % 10));
      const boulderRisk = boulderDist < 8.0 ? 'CRITICAL' : 'WARNING';

      const livePayload = {
        amr: {
          position: { x: posX, y: posY, z: 0.0 },
          heading_deg: heading,
          speed_mps: 2.4,
          gradient: {
            pitch_deg: -3.4 + Math.sin(this.time * 0.5) * 0.5,
            roll_deg: 1.1 + Math.cos(this.time * 0.4) * 0.3,
            slope_pct: -5.9
          }
        },
        detections: [
          {
            id: 'DET-LIVE-101',
            class: 'FALLEN_BOULDER',
            label: 'Fallen Hematite Boulder (0.9m)',
            confidence: 0.96,
            distance_m: Number(boulderDist.toFixed(1)),
            bearing_deg: -4.5,
            position: { x: 57.3, y: 39.5 },
            relative_velocity_mps: 0.0,
            risk: boulderRisk,
            action: boulderRisk === 'CRITICAL' ? 'EMERGENCY DECELERATION ENGAGED' : 'CLEARANCE BUFFER ACTIVE',
            bbox_cam: { x: 44, y: 58, w: 18, h: 22 }
          },
          {
            id: 'DET-LIVE-102',
            class: 'HEAVY_DUMPER',
            label: 'CAT 777 Haul Truck',
            confidence: 0.91,
            distance_m: Number((34.8 - ((this.time * 0.5) % 15)).toFixed(1)),
            bearing_deg: -12.0,
            position: { x: 78.5, y: 33.2 },
            relative_velocity_mps: -5.4,
            risk: 'CAUTION',
            action: 'TRACKING HAUL LANE CLEARANCE',
            bbox_cam: { x: 16, y: 32, w: 26, h: 36 }
          }
        ],
        diagnostics: {
          telemetry: {
            battery_soc_pct: Number((86.4 - this.time * 0.005).toFixed(1)),
            temp_internal_c: 36.6
          }
        }
      };

      this.onData(livePayload);
    }, 100);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isActive = false;
  }
}
