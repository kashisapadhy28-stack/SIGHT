/**
 * SIGHT ProximityAlertBanner Component
 * Top priority safety banner calculating highest collision risk tier
 * and directing immediate automated safety & deceleration actions.
 */

export class ProximityAlertBanner {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) throw new Error(`Container #${containerId} not found`);

    this.init();
  }

  init() {
    this.container.innerHTML = `
      <div class="safety-risk-banner risk-banner-critical" id="risk-banner">
        <div class="banner-status-col">
          <div class="status-pulse-ring"></div>
          <div class="status-text-group">
            <span class="banner-sub-lbl">PROXIMITY RISK LEVEL</span>
            <h3 class="banner-main-title" id="banner-risk-title">CRITICAL COLLISION BUFFER</h3>
          </div>
        </div>
        <div class="banner-details-col">
          <span class="banner-detail-tag" id="banner-obstacle-tag">Closest: Fallen Boulder @ 12.4m</span>
          <span class="banner-action-msg" id="banner-action-msg">Engaging Automatic Deceleration & Safe Lane Margin</span>
        </div>
      </div>
    `;
  }

  evaluateRisk(detections) {
    const banner = document.getElementById('risk-banner');
    const title = document.getElementById('banner-risk-title');
    const tag = document.getElementById('banner-obstacle-tag');
    const msg = document.getElementById('banner-action-msg');
    if (!banner || !title) return;

    if (!detections || detections.length === 0) {
      banner.className = 'safety-risk-banner risk-banner-safe';
      title.textContent = 'HAUL ROAD NOMINAL';
      tag.textContent = 'No Immediate Obstacles in Stopping Envelope';
      msg.textContent = 'Cruising at Target 2.5 m/s Autonomous Velocity';
      return;
    }

    // Find highest risk
    const critical = detections.find(d => d.risk === 'CRITICAL');
    const warning = detections.find(d => d.risk === 'WARNING');
    const caution = detections.find(d => d.risk === 'CAUTION');

    if (critical) {
      banner.className = 'safety-risk-banner risk-banner-critical';
      title.textContent = 'CRITICAL COLLISION BUFFER';
      tag.textContent = `Immediate Hazard: ${critical.label || critical.class} @ ${critical.distance_m}m`;
      msg.textContent = critical.action || 'Emergency deceleration engaged - Stop distance assured.';
    } else if (warning) {
      banner.className = 'safety-risk-banner risk-banner-warning';
      title.textContent = 'HAZARD PROXIMITY WARNING';
      tag.textContent = `Caution Target: ${warning.label || warning.class} @ ${warning.distance_m}m`;
      msg.textContent = warning.action || 'Decelerating speed to 1.5 m/s & sounding audible alert.';
    } else if (caution) {
      banner.className = 'safety-risk-banner risk-banner-caution';
      title.textContent = 'ADVISORY MONITORING';
      tag.textContent = `Approaching Target: ${caution.label || caution.class} @ ${caution.distance_m}m`;
      msg.textContent = caution.action || 'Tracking vehicle trajectory on haul lane curve.';
    } else {
      banner.className = 'safety-risk-banner risk-banner-safe';
      title.textContent = 'HAUL ROAD NOMINAL';
      tag.textContent = 'All Targets Outside Braking Buffer';
      msg.textContent = 'Path Clear - Safe Operating Distance Maintained.';
    }
  }
}
