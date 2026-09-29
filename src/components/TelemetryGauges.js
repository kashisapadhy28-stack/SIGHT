/**
 * SIGHT TelemetryGauges Component
 * Renders LiDAR radial distance sector profiler and IMU slope pitch/roll attitude gauge.
 */

export class TelemetryGauges {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) throw new Error(`Container #${containerId} not found`);

    this.diagnostics = null;
    this.amrState = null;
    this.init();
  }

  init() {
    this.container.innerHTML = `
      <div class="telemetry-gauges-grid">
        
        <!-- LiDAR Sector Radar Profiler -->
        <div class="gauge-card">
          <div class="gauge-header">
            <span class="gauge-icon">📡</span>
            <h5>LiDAR PROXIMITY SECTORS</h5>
            <span class="badge-mini font-mono" id="lidar-rate-badge">10.0 Hz</span>
          </div>
          <div class="radar-sector-grid">
            <div class="sector-cell" id="sec-fl">
              <span class="sec-label">FRONT-L</span>
              <span class="sec-val font-mono">18.2m</span>
            </div>
            <div class="sector-cell sector-critical" id="sec-f">
              <span class="sec-label">FRONT</span>
              <span class="sec-val font-mono">12.4m</span>
            </div>
            <div class="sector-cell" id="sec-fr">
              <span class="sec-label">FRONT-R</span>
              <span class="sec-val font-mono">34.8m</span>
            </div>
            <div class="sector-cell" id="sec-l">
              <span class="sec-label">LEFT</span>
              <span class="sec-val font-mono">6.5m</span>
            </div>
            <div class="sector-cell sector-amr-center">
              <span class="sec-center-dot"></span>
            </div>
            <div class="sector-cell" id="sec-r">
              <span class="sec-label">RIGHT</span>
              <span class="sec-val font-mono">7.2m</span>
            </div>
            <div class="sector-cell" id="sec-rl">
              <span class="sec-label">REAR-L</span>
              <span class="sec-val font-mono">42.0m</span>
            </div>
            <div class="sector-cell" id="sec-rear">
              <span class="sec-label">REAR</span>
              <span class="sec-val font-mono">>50m</span>
            </div>
            <div class="sector-cell" id="sec-rr">
              <span class="sec-label">REAR-R</span>
              <span class="sec-val font-mono">>50m</span>
            </div>
          </div>
        </div>

        <!-- IMU Attitude & Slope Inclinometer -->
        <div class="gauge-card">
          <div class="gauge-header">
            <span class="gauge-icon">📐</span>
            <h5>IMU ROAD GRADIENT / ATTITUDE</h5>
            <span class="badge-mini text-emerald font-mono">CALIBRATED</span>
          </div>
          
          <div class="imu-display-container">
            <div class="incline-horizon-box">
              <div class="horizon-line" id="horizon-line"></div>
              <div class="horizon-target-center"></div>
            </div>
            <div class="incline-readouts">
              <div class="inc-item">
                <span class="inc-lbl">PITCH (SLOPE)</span>
                <span class="inc-val font-mono text-amber" id="imu-pitch">-3.4°</span>
              </div>
              <div class="inc-item">
                <span class="inc-lbl">ROLL (CAMBER)</span>
                <span class="inc-val font-mono" id="imu-roll">+1.1°</span>
              </div>
              <div class="inc-item">
                <span class="inc-lbl">GRADE PCT</span>
                <span class="inc-val font-mono text-amber" id="imu-grade">-5.9%</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    `;
  }

  update(amrState, diagnostics) {
    this.amrState = amrState;
    this.diagnostics = diagnostics;

    if (amrState?.gradient) {
      const { pitch_deg, roll_deg, slope_pct } = amrState.gradient;
      const elPitch = document.getElementById('imu-pitch');
      const elRoll = document.getElementById('imu-roll');
      const elGrade = document.getElementById('imu-grade');
      const horizonLine = document.getElementById('horizon-line');

      if (elPitch) elPitch.textContent = `${pitch_deg > 0 ? '+' : ''}${pitch_deg.toFixed(1)}°`;
      if (elRoll) elRoll.textContent = `${roll_deg > 0 ? '+' : ''}${roll_deg.toFixed(1)}°`;
      if (elGrade) elGrade.textContent = `${slope_pct > 0 ? '+' : ''}${slope_pct.toFixed(1)}%`;

      if (horizonLine) {
        horizonLine.style.transform = `translate(-50%, -50%) rotate(${-roll_deg * 3}deg) translateY(${pitch_deg * 2}px)`;
      }
    }
  }
}
