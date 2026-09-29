/**
 * SIGHT MapVisualizer Component
 * High-performance 2D Canvas engine rendering SLAM occupancy grid, haul road geometry,
 * LiDAR sweeps, camera FOV cones, distance safety rings, and SIGHT AMR pose.
 */

export class MapVisualizer {
  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) throw new Error(`Canvas #${canvasId} not found`);
    this.ctx = this.canvas.getContext('2d');

    // Scenario and telemetry data
    this.scenarioData = null;
    this.amrState = {
      position: { x: 45.0, y: 40.5 },
      heading_deg: 350.0,
      speed_mps: 2.2,
      trajectory_history: []
    };
    this.detections = [];
    
    // LiDAR sweep animation angle
    this.lidarSweepAngle = 0;
    this.lastTimestamp = performance.now();

    // Viewport transform (World meters to screen pixels)
    this.scale = 14.0; // pixels per meter
    this.offsetX = 150; // pixel offset X
    this.offsetY = 150; // pixel offset Y

    // Interaction flags
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;

    // Layer toggle states
    this.layers = {
      lidar: true,
      cameraFov: true,
      safetyZones: true,
      grid: true,
      obstacles: true
    };

    this.initCanvasSize();
    this.bindEvents();
    this.startAnimationLoop();
  }

  initCanvasSize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.viewportWidth = rect.width;
    this.viewportHeight = rect.height;
  }

  setData(scenario) {
    this.scenarioData = scenario;
    if (scenario.amr) {
      this.amrState = {
        position: { ...scenario.amr.position },
        heading_deg: scenario.amr.heading_deg || 0,
        speed_mps: scenario.amr.speed_mps || 0,
        trajectory_history: scenario.amr.trajectory_history || []
      };
    }
    if (scenario.detections) {
      this.detections = scenario.detections;
    }
    this.centerOnAmr();
  }

  bindEvents() {
    window.addEventListener('resize', () => this.initCanvasSize());

    // Mouse Pan & Zoom
    this.canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.dragStartX = e.clientX - this.offsetX;
      this.dragStartY = e.clientY - this.offsetY;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      this.offsetX = e.clientX - this.dragStartX;
      this.offsetY = e.clientY - this.dragStartY;
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
      const mouseX = e.offsetX;
      const mouseY = e.offsetY;

      const newScale = Math.min(Math.max(this.scale * zoomFactor, 4), 60);
      
      // Zoom toward cursor
      this.offsetX = mouseX - (mouseX - this.offsetX) * (newScale / this.scale);
      this.offsetY = mouseY - (mouseY - this.offsetY) * (newScale / this.scale);
      this.scale = newScale;

      this.updateScaleBadge();
    }, { passive: false });

    // UI Buttons
    document.getElementById('btn-zoom-in')?.addEventListener('click', () => this.zoom(1.2));
    document.getElementById('btn-zoom-out')?.addEventListener('click', () => this.zoom(0.83));
    document.getElementById('btn-center-amr')?.addEventListener('click', () => this.centerOnAmr());
    document.getElementById('btn-reset-view')?.addEventListener('click', () => this.resetView());

    // Layer Toggles
    document.getElementById('toggle-lidar')?.addEventListener('change', (e) => {
      this.layers.lidar = e.target.checked;
    });
    document.getElementById('toggle-camera-fov')?.addEventListener('change', (e) => {
      this.layers.cameraFov = e.target.checked;
    });
    document.getElementById('toggle-safety-zones')?.addEventListener('change', (e) => {
      this.layers.safetyZones = e.target.checked;
    });
  }

  zoom(factor) {
    const centerX = this.viewportWidth / 2;
    const centerY = this.viewportHeight / 2;
    const newScale = Math.min(Math.max(this.scale * factor, 4), 60);
    this.offsetX = centerX - (centerX - this.offsetX) * (newScale / this.scale);
    this.offsetY = centerY - (centerY - this.offsetY) * (newScale / this.scale);
    this.scale = newScale;
    this.updateScaleBadge();
  }

  centerOnAmr() {
    if (!this.amrState.position) return;
    const screenX = this.worldToScreenX(this.amrState.position.x);
    const screenY = this.worldToScreenY(this.amrState.position.y);
    this.offsetX += (this.viewportWidth / 2) - screenX;
    this.offsetY += (this.viewportHeight / 2) - screenY;
  }

  resetView() {
    this.scale = 14.0;
    this.centerOnAmr();
    this.updateScaleBadge();
  }

  updateScaleBadge() {
    const badge = document.getElementById('map-scale-badge');
    if (badge) {
      const metersPer100px = (100 / this.scale).toFixed(1);
      badge.textContent = `Scale: 100px ≈ ${metersPer100px}m`;
    }
  }

  // Coordinate Conversion Helpers
  worldToScreenX(wx) {
    return this.offsetX + wx * this.scale;
  }

  worldToScreenY(wy) {
    // Invert Y axis so +Y goes upward like standard Cartesian / ROS SLAM
    return this.offsetY - wy * this.scale;
  }

  screenToWorldX(sx) {
    return (sx - this.offsetX) / this.scale;
  }

  screenToWorldY(sy) {
    return (this.offsetY - sy) / this.scale;
  }

  startAnimationLoop() {
    const loop = (timestamp) => {
      const dt = (timestamp - this.lastTimestamp) / 1000;
      this.lastTimestamp = timestamp;

      // Rotate LiDAR sweep beam (360 deg in ~2.5 seconds)
      this.lidarSweepAngle += dt * Math.PI * 0.8;
      if (this.lidarSweepAngle > Math.PI * 2) {
        this.lidarSweepAngle -= Math.PI * 2;
      }

      this.render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.viewportWidth, this.viewportHeight);

    // 1. Metric Background Grid
    this.renderGrid(ctx);

    // 2. NMDC Bailadila Haul Road & Topography
    if (this.scenarioData?.map) {
      this.renderHaulRoad(ctx, this.scenarioData.map);
    }

    // 3. AMR Past Trajectory Path
    this.renderTrajectory(ctx);

    // 4. Detected Obstacles & Distance Callouts
    if (this.layers.obstacles && this.detections.length > 0) {
      this.renderObstacles(ctx);
    }

    // 5. SIGHT AMR Body, Sensors, FOV & LiDAR
    this.renderAmr(ctx);
  }

  renderGrid(ctx) {
    const gridMajorMeters = 10.0;
    const gridMinorMeters = 2.0;

    const minX = this.screenToWorldX(0);
    const maxX = this.screenToWorldX(this.viewportWidth);
    const minY = this.screenToWorldY(this.viewportHeight);
    const maxY = this.screenToWorldY(0);

    const startX = Math.floor(minX / gridMinorMeters) * gridMinorMeters;
    const endX = Math.ceil(maxX / gridMinorMeters) * gridMinorMeters;
    const startY = Math.floor(minY / gridMinorMeters) * gridMinorMeters;
    const endY = Math.ceil(maxY / gridMinorMeters) * gridMinorMeters;

    ctx.save();

    // Minor Grid Lines
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.05)';
    ctx.beginPath();
    for (let x = startX; x <= endX; x += gridMinorMeters) {
      const sx = this.worldToScreenX(x);
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, this.viewportHeight);
    }
    for (let y = startY; y <= endY; y += gridMinorMeters) {
      const sy = this.worldToScreenY(y);
      ctx.moveTo(0, sy);
      ctx.lineTo(this.viewportWidth, sy);
    }
    ctx.stroke();

    // Major Grid Lines with Coordinate Labels
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
    ctx.fillStyle = 'rgba(148, 163, 184, 0.4)';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.beginPath();

    for (let x = Math.floor(minX / gridMajorMeters) * gridMajorMeters; x <= endX; x += gridMajorMeters) {
      const sx = this.worldToScreenX(x);
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, this.viewportHeight);
      ctx.fillText(`${x}m`, sx + 4, this.viewportHeight - 6);
    }
    for (let y = Math.floor(minY / gridMajorMeters) * gridMajorMeters; y <= endY; y += gridMajorMeters) {
      const sy = this.worldToScreenY(y);
      ctx.moveTo(0, sy);
      ctx.lineTo(this.viewportWidth, sy);
      ctx.fillText(`${y}m`, 6, sy - 4);
    }
    ctx.stroke();

    ctx.restore();
  }

  renderHaulRoad(ctx, mapData) {
    const road = mapData.haul_road;
    if (!road) return;

    ctx.save();

    // 1. Fill Road Surface Polygon
    if (road.left_berm && road.right_berm) {
      ctx.beginPath();
      // Left berm points
      road.left_berm.forEach((pt, idx) => {
        const sx = this.worldToScreenX(pt.x);
        const sy = this.worldToScreenY(pt.y);
        if (idx === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      });
      // Right berm points in reverse
      for (let i = road.right_berm.length - 1; i >= 0; i--) {
        const pt = road.right_berm[i];
        ctx.lineTo(this.worldToScreenX(pt.x), this.worldToScreenY(pt.y));
      }
      ctx.closePath();
      
      // Road surface styling (wet hematite dirt haul corridor)
      ctx.fillStyle = '#1c1714';
      ctx.fill();
      ctx.strokeStyle = '#3d2e26';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // 2. Road Centerline (Dashed Navigation Guideline)
    if (road.centerline) {
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(217, 119, 6, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([8, 6]);
      road.centerline.forEach((pt, idx) => {
        const sx = this.worldToScreenX(pt.x);
        const sy = this.worldToScreenY(pt.y);
        if (idx === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 3. Safety Berms / Embankment Rock Walls
    const drawBerm = (points, label) => {
      ctx.beginPath();
      ctx.strokeStyle = '#854d0e';
      ctx.lineWidth = 4;
      points.forEach((pt, idx) => {
        const sx = this.worldToScreenX(pt.x);
        const sy = this.worldToScreenY(pt.y);
        if (idx === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      });
      ctx.stroke();

      // Rock pattern hatches
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(202, 138, 4, 0.6)';
      points.forEach((pt) => {
        const sx = this.worldToScreenX(pt.x);
        const sy = this.worldToScreenY(pt.y);
        ctx.beginPath();
        ctx.arc(sx, sy, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#78350f';
        ctx.fill();
        ctx.stroke();
      });
    };

    if (road.left_berm) drawBerm(road.left_berm, 'Safety Berm');
    if (road.right_berm) drawBerm(road.right_berm, 'Pit Edge Embankment');

    ctx.restore();
  }

  renderTrajectory(ctx) {
    if (!this.amrState.trajectory_history || this.amrState.trajectory_history.length < 2) return;

    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);

    this.amrState.trajectory_history.forEach((pt, idx) => {
      const sx = this.worldToScreenX(pt.x);
      const sy = this.worldToScreenY(pt.y);
      if (idx === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    });

    ctx.stroke();
    ctx.setLineDash([]);

    // Waypoint dots
    this.amrState.trajectory_history.forEach((pt) => {
      const sx = this.worldToScreenX(pt.x);
      const sy = this.worldToScreenY(pt.y);
      ctx.beginPath();
      ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#38bdf8';
      ctx.fill();
    });

    ctx.restore();
  }

  renderObstacles(ctx) {
    const amrX = this.worldToScreenX(this.amrState.position.x);
    const amrY = this.worldToScreenY(this.amrState.position.y);

    ctx.save();

    this.detections.forEach((det) => {
      const ox = this.worldToScreenX(det.position.x);
      const oy = this.worldToScreenY(det.position.y);

      // Color mapping according to risk level
      let strokeColor = '#10b981';
      let fillColor = 'rgba(16, 185, 129, 0.2)';
      if (det.risk === 'CRITICAL') {
        strokeColor = '#ef4444';
        fillColor = 'rgba(239, 68, 68, 0.25)';
      } else if (det.risk === 'WARNING') {
        strokeColor = '#f97316';
        fillColor = 'rgba(249, 115, 22, 0.25)';
      } else if (det.risk === 'CAUTION') {
        strokeColor = '#eab308';
        fillColor = 'rgba(234, 179, 8, 0.25)';
      }

      // 1. Metric Distance Range Line from AMR
      ctx.beginPath();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.moveTo(amrX, amrY);
      ctx.lineTo(ox, oy);
      ctx.stroke();
      ctx.setLineDash([]);

      // Distance tag on the middle of the line
      const midX = (amrX + ox) / 2;
      const midY = (amrY + oy) / 2;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(midX - 22, midY - 9, 44, 16);
      ctx.strokeStyle = strokeColor;
      ctx.strokeRect(midX - 22, midY - 9, 44, 16);
      ctx.fillStyle = '#ffffff';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${det.distance_m}m`, midX, midY);

      // 2. Spatial Obstacle Geometry Marker
      ctx.beginPath();
      if (det.class === 'FALLEN_BOULDER') {
        // Jagged boulder shape
        ctx.arc(ox, oy, 9, 0, Math.PI * 2);
        ctx.fillStyle = fillColor;
        ctx.fill();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (det.class === 'HEAVY_DUMPER') {
        // Large vehicle footprint
        ctx.rect(ox - 14, oy - 18, 28, 36);
        ctx.fillStyle = fillColor;
        ctx.fill();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (det.class === 'MINE_CREW') {
        // Worker diamond
        ctx.moveTo(ox, oy - 10);
        ctx.lineTo(ox + 8, oy);
        ctx.lineTo(ox, oy + 10);
        ctx.lineTo(ox - 8, oy);
        ctx.closePath();
        ctx.fillStyle = fillColor;
        ctx.fill();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        // Default box
        ctx.rect(ox - 8, oy - 8, 16, 16);
        ctx.fillStyle = fillColor;
        ctx.fill();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // 3. Identification Label Badge
      ctx.fillStyle = 'rgba(17, 23, 34, 0.9)';
      ctx.fillRect(ox - 50, oy - 26, 100, 16);
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1;
      ctx.strokeRect(ox - 50, oy - 26, 100, 16);

      ctx.fillStyle = '#ffffff';
      ctx.font = '9px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const labelText = det.class.replace('_', ' ');
      ctx.fillText(labelText, ox, oy - 18);
    });

    ctx.restore();
  }

  renderAmr(ctx) {
    const amr = this.amrState;
    if (!amr.position) return;

    const sx = this.worldToScreenX(amr.position.x);
    const sy = this.worldToScreenY(amr.position.y);
    const headingRad = (amr.heading_deg * Math.PI) / 180;

    ctx.save();

    // 1. Safety & Braking Buffer Zones (Rings)
    if (this.layers.safetyZones) {
      // Critical Zone: 8.0 meters
      const rCrit = 8.0 * this.scale;
      ctx.beginPath();
      ctx.arc(sx, sy, rCrit, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.35)';
      ctx.fillStyle = 'rgba(239, 68, 68, 0.04)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.fill();
      ctx.stroke();

      // Warning Zone: 18.0 meters
      const rWarn = 18.0 * this.scale;
      ctx.beginPath();
      ctx.arc(sx, sy, rWarn, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(249, 115, 22, 0.25)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Sensor Horizon: 50.0 meters
      const rHorizon = 50.0 * this.scale;
      ctx.beginPath();
      ctx.arc(sx, sy, rHorizon, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 2. Camera Field of View (FOV) Cone (84 deg)
    if (this.layers.cameraFov) {
      const fovAngleRad = (84 * Math.PI) / 180;
      const fovRange = 35.0 * this.scale; // 35 meters visual range
      const leftAngle = headingRad - fovAngleRad / 2;
      const rightAngle = headingRad + fovAngleRad / 2;

      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.arc(sx, sy, fovRange, leftAngle, rightAngle);
      ctx.closePath();

      const fovGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, fovRange);
      fovGrad.addColorStop(0, 'rgba(56, 189, 248, 0.25)');
      fovGrad.addColorStop(0.7, 'rgba(56, 189, 248, 0.08)');
      fovGrad.addColorStop(1, 'rgba(56, 189, 248, 0.0)');
      ctx.fillStyle = fovGrad;
      ctx.fill();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // 3. LiDAR 360 Rotating Sweep Beam
    if (this.layers.lidar) {
      const sweepRange = 40.0 * this.scale;
      const sweepWidthRad = (25 * Math.PI) / 180;
      const sweepAngle = this.lidarSweepAngle;

      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.arc(sx, sy, sweepRange, sweepAngle - sweepWidthRad, sweepAngle);
      ctx.closePath();

      const sweepGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, sweepRange);
      sweepGrad.addColorStop(0, 'rgba(6, 182, 212, 0.3)');
      sweepGrad.addColorStop(1, 'rgba(6, 182, 212, 0.0)');
      ctx.fillStyle = sweepGrad;
      ctx.fill();

      // Lead sweep ray
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + Math.cos(sweepAngle) * sweepRange, sy + Math.sin(sweepAngle) * sweepRange);
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // 4. SIGHT AMR Physical Chassis & Heading Vector
    ctx.translate(sx, sy);
    ctx.rotate(headingRad);

    // Chassis footprint (Length: 1.4m, Width: 0.9m)
    const amrLengthPx = 1.4 * this.scale;
    const amrWidthPx = 0.9 * this.scale;

    // Outer Glow / Shadow
    ctx.shadowColor = 'rgba(56, 189, 248, 0.6)';
    ctx.shadowBlur = 10;

    // Body base
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-amrLengthPx / 2, -amrWidthPx / 2, amrLengthPx, amrWidthPx);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.strokeRect(-amrLengthPx / 2, -amrWidthPx / 2, amrLengthPx, amrWidthPx);

    ctx.shadowBlur = 0; // reset

    // Front Bumper Highlight (Direction Indicator)
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(amrLengthPx / 2 - 3, -amrWidthPx / 2, 3, amrWidthPx);

    // LiDAR Turret Circle at center
    ctx.beginPath();
    ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = '#0284c7';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Direction arrow
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(amrLengthPx * 0.9, 0);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();

    // Update compass needle rotation
    const compassNeedle = document.getElementById('compass-needle');
    if (compassNeedle) {
      compassNeedle.style.transform = `rotate(${-amr.heading_deg}deg)`;
    }
    const compassHeadingText = document.getElementById('compass-heading-text');
    if (compassHeadingText) {
      compassHeadingText.textContent = `${Math.round(amr.heading_deg)}°`;
    }
  }
}
