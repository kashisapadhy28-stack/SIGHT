/**
 * SIGHT PerceptionPanel Component
 * Displays the real-time list of identified obstacles, metric coordinates,
 * bearing, distance, risk categorization, and safety actions.
 */

export class PerceptionPanel {
  constructor(containerId, onSelectCallback) {
    this.container = document.getElementById(containerId);
    if (!this.container) throw new Error(`Container #${containerId} not found`);

    this.onSelect = onSelectCallback || (() => {});
    this.detections = [];
    this.selectedId = null;

    this.init();
  }

  init() {
    this.container.innerHTML = `
      <div class="perception-card">
        <div class="perception-header">
          <div class="title-with-badge">
            <span class="panel-icon">🎯</span>
            <h4>ACTIVE OBSTACLE TRACKER</h4>
            <span class="badge-count" id="det-count-badge">0 Tracked</span>
          </div>
          <span class="hud-refresh-time" id="hud-last-sync">Sync: 15Hz</span>
        </div>

        <div class="perception-list-container" id="perception-list">
          <!-- Dynamic Obstacle Cards -->
        </div>
      </div>
    `;
  }

  setDetections(detections) {
    this.detections = detections || [];
    this.render();
  }

  select(id) {
    this.selectedId = id;
    this.render();
    this.onSelect(id);
  }

  render() {
    const listContainer = document.getElementById('perception-list');
    const countBadge = document.getElementById('det-count-badge');
    if (!listContainer) return;

    if (countBadge) {
      countBadge.textContent = `${this.detections.length} Target${this.detections.length === 1 ? '' : 's'}`;
    }

    if (this.detections.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-perception-state">
          <span>🛡️</span>
          <p>Haul Road Corridor Clear. No Obstacles Detected.</p>
        </div>
      `;
      return;
    }

    // Sort by risk priority (CRITICAL -> WARNING -> CAUTION -> SAFE)
    const riskPriority = { CRITICAL: 0, WARNING: 1, CAUTION: 2, SAFE: 3 };
    const sorted = [...this.detections].sort((a, b) => {
      return (riskPriority[a.risk] ?? 9) - (riskPriority[b.risk] ?? 9) || a.distance_m - b.distance_m;
    });

    listContainer.innerHTML = sorted.map(det => {
      const isSelected = det.id === this.selectedId;
      const riskClass = `risk-${det.risk.toLowerCase()}`;
      
      let icon = '⚠️';
      if (det.class === 'FALLEN_BOULDER') icon = '🪨';
      else if (det.class === 'HEAVY_DUMPER') icon = '🚛';
      else if (det.class === 'MINE_CREW') icon = '👷';
      else if (det.class === 'LIGHT_VEHICLE') icon = '🚙';

      return `
        <div class="obstacle-item-card ${riskClass} ${isSelected ? 'selected' : ''}" data-id="${det.id}">
          <div class="obs-card-top">
            <div class="obs-identity">
              <span class="obs-icon">${icon}</span>
              <div class="obs-name-group">
                <span class="obs-title">${det.label || det.class.replace('_', ' ')}</span>
                <span class="obs-id-code font-mono">${det.id} • Conf: ${(det.confidence * 100).toFixed(0)}%</span>
              </div>
            </div>
            <span class="risk-badge ${riskClass}">${det.risk}</span>
          </div>

          <div class="obs-metrics-grid">
            <div class="metric-cell">
              <span class="metric-lbl">DISTANCE</span>
              <span class="metric-val font-mono">${det.distance_m.toFixed(1)} m</span>
            </div>
            <div class="metric-cell">
              <span class="metric-lbl">BEARING</span>
              <span class="metric-val font-mono">${det.bearing_deg > 0 ? '+' : ''}${det.bearing_deg.toFixed(1)}°</span>
            </div>
            <div class="metric-cell">
              <span class="metric-lbl">REL VELOCITY</span>
              <span class="metric-val font-mono">${det.relative_velocity_mps > 0 ? '+' : ''}${det.relative_velocity_mps.toFixed(1)} m/s</span>
            </div>
            <div class="metric-cell">
              <span class="metric-lbl">WORLD POS</span>
              <span class="metric-val font-mono">X:${det.position.x.toFixed(0)} Y:${det.position.y.toFixed(0)}</span>
            </div>
          </div>

          <div class="obs-action-strip">
            <span class="action-tag">ACTION:</span>
            <span class="action-desc">${det.action || 'MONITORING'}</span>
          </div>
        </div>
      `;
    }).join('');

    // Attach click listeners for card selection
    listContainer.querySelectorAll('.obstacle-item-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.id;
        this.select(id);
      });
    });
  }
}
