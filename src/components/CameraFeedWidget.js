/**
 * SIGHT CameraFeedWidget Component
 * Renders the AMR forward optical vision stream with monsoon fog atmosphere,
 * dynamic object detection bounding boxes, confidence tags, and metric distance labels.
 */

export class CameraFeedWidget {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) throw new Error(`Container #${containerId} not found`);

    this.canvas = null;
    this.ctx = null;
    this.detections = [];
    this.selectedDetectionId = null;
    this.animationFrameId = null;

    this.init();
  }

  init() {
    this.container.innerHTML = `
      <div class="camera-widget-card">
        <div class="widget-header">
          <div class="header-title">
            <span class="cam-live-indicator"></span>
            <h4>AMR FORWARD OPTICAL FEED</h4>
            <span class="cam-res-badge">1080p • 30 FPS</span>
          </div>
          <div class="cam-hud-tags">
            <span class="dewog-badge active">🌧️ De-Fog Active</span>
          </div>
        </div>

        <div class="cam-viewport-wrapper">
          <canvas id="camera-feed-canvas" width="400" height="225"></canvas>
          <div class="cam-hud-crosshair"></div>
          <div class="cam-telemetry-strip">
            <span id="cam-lens-status">LENS: 8% RAIN OBSTRUCTION</span>
            <span id="cam-exposure">EXP: AUTO (MONSOON HDR)</span>
          </div>
        </div>
      </div>
    `;

    this.canvas = document.getElementById('camera-feed-canvas');
    this.ctx = this.canvas.getContext('2d');

    this.startRenderLoop();
  }

  setDetections(detections, selectedId = null) {
    this.detections = detections || [];
    this.selectedDetectionId = selectedId;
  }

  startRenderLoop() {
    const render = () => {
      this.drawFeed();
      this.animationFrameId = requestAnimationFrame(render);
    };
    this.animationFrameId = requestAnimationFrame(render);
  }

  drawFeed() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // 1. Haul Road Horizon & Background (Atmospheric Dense Fog / Wet Mine Scene)
    ctx.clearRect(0, 0, w, h);

    // Sky & Fog Gradient (Misty Bailadila Mountain Pit)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.45);
    skyGrad.addColorStop(0, '#2d3748');
    skyGrad.addColorStop(1, '#4a5568');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h * 0.45);

    // Fog Bank Layer
    const fogGrad = ctx.createLinearGradient(0, h * 0.2, 0, h * 0.6);
    fogGrad.addColorStop(0, 'rgba(148, 163, 184, 0.4)');
    fogGrad.addColorStop(1, 'rgba(71, 85, 105, 0.9)');
    ctx.fillStyle = fogGrad;
    ctx.fillRect(0, h * 0.2, w, h * 0.4);

    // Wet Red Iron Ore Haul Road Perspective
    ctx.fillStyle = '#261b17';
    ctx.beginPath();
    ctx.moveTo(w * 0.38, h * 0.45); // road vanishing point left
    ctx.lineTo(w * 0.62, h * 0.45); // road vanishing point right
    ctx.lineTo(w * 1.1, h);         // road bottom right
    ctx.lineTo(-w * 0.1, h);        // road bottom left
    ctx.closePath();
    ctx.fill();

    // Road Texture & Centerline
    ctx.strokeStyle = 'rgba(217, 119, 6, 0.35)';
    ctx.lineWidth = 2;
    ctx.setLineDash([12, 10]);
    ctx.beginPath();
    ctx.moveTo(w * 0.5, h * 0.45);
    ctx.lineTo(w * 0.48, h);
    ctx.stroke();
    ctx.setLineDash([]);

    // Safety Berms (Left & Right Earth Embankments)
    ctx.fillStyle = '#451a03';
    // Left Berm
    ctx.beginPath();
    ctx.moveTo(0, h * 0.45);
    ctx.lineTo(w * 0.38, h * 0.45);
    ctx.lineTo(-w * 0.1, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();

    // Right Berm
    ctx.beginPath();
    ctx.moveTo(w, h * 0.45);
    ctx.lineTo(w * 0.62, h * 0.45);
    ctx.lineTo(w * 1.1, h);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();

    // 2. Simulated Obstacle Silhouettes in Fog
    this.detections.forEach(det => {
      const box = det.bbox_cam;
      if (!box) return;

      const bx = (box.x / 100) * w;
      const by = (box.y / 100) * h;
      const bw = (box.w / 100) * w;
      const bh = (box.h / 100) * h;

      // Draw silhouette depending on class
      ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
      if (det.class === 'FALLEN_BOULDER') {
        ctx.beginPath();
        ctx.ellipse(bx + bw / 2, by + bh * 0.7, bw * 0.45, bh * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (det.class === 'HEAVY_DUMPER') {
        ctx.fillRect(bx + bw * 0.1, by + bh * 0.1, bw * 0.8, bh * 0.8);
        // Headlights
        ctx.fillStyle = 'rgba(254, 240, 138, 0.8)';
        ctx.beginPath();
        ctx.arc(bx + bw * 0.25, by + bh * 0.6, 3, 0, Math.PI * 2);
        ctx.arc(bx + bw * 0.75, by + bh * 0.6, 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (det.class === 'MINE_CREW') {
        // Person with Hi-Vis jacket
        ctx.fillRect(bx + bw * 0.3, by + bh * 0.3, bw * 0.4, bh * 0.5);
        ctx.fillStyle = '#facc15'; // Hi-vis yellow
        ctx.fillRect(bx + bw * 0.3, by + bh * 0.4, bw * 0.4, bh * 0.2);
      } else {
        ctx.fillRect(bx + bw * 0.1, by + bh * 0.2, bw * 0.8, bh * 0.6);
      }

      // 3. Neural Detection Bounding Box Overlay
      let boxColor = '#10b981';
      if (det.risk === 'CRITICAL') boxColor = '#ef4444';
      else if (det.risk === 'WARNING') boxColor = '#f97316';
      else if (det.risk === 'CAUTION') boxColor = '#eab308';

      const isSelected = det.id === this.selectedDetectionId;

      ctx.save();
      ctx.strokeStyle = boxColor;
      ctx.lineWidth = isSelected ? 2.5 : 1.5;

      // Corner-accent box styling
      const cornerLen = 6;
      ctx.strokeRect(bx, by, bw, bh);

      // Label background header
      const label = `${det.class.replace('_', ' ')} [${(det.confidence * 100).toFixed(0)}%] • ${det.distance_m}m`;
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      const textWidth = ctx.measureText(label).width;

      ctx.fillStyle = isSelected ? boxColor : 'rgba(15, 23, 42, 0.88)';
      ctx.fillRect(bx, by - 14, textWidth + 8, 14);

      ctx.fillStyle = isSelected ? '#000000' : boxColor;
      ctx.fillText(label, bx + 4, by - 4);

      ctx.restore();
    });

    // 4. Rain & Fog Vignette Filter
    const vig = ctx.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.65);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(10, 15, 26, 0.5)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);
  }
}
