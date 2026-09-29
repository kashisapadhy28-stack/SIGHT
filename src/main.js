/**
 * SIGHT Main Application Controller (Phase 5 Presentation & Production Ready)
 * Orchestrates MapVisualizer, PerceptionPanel, CameraFeedWidget, TelemetryGauges,
 * RiskEngine, RosBridgeClient, ScenarioSwitcher, FPSCounter, DisconnectionModal, and Shortcuts.
 */

import { MapVisualizer } from './components/MapVisualizer.js';
import { CameraFeedWidget } from './components/CameraFeedWidget.js';
import { PerceptionPanel } from './components/PerceptionPanel.js';
import { TelemetryGauges } from './components/TelemetryGauges.js';
import { ProximityAlertBanner } from './components/ProximityAlertBanner.js';
import { RosBridgeClient } from './services/RosBridgeClient.js';
import { MockLiveStreamer } from './services/MockLiveStreamer.js';

class SightApp {
  constructor() {
    this.currentMode = 'PRESENTATION';
    this.scenarioData = null;
    this.activeScenarioFile = 'presentation_scenario.json';

    // UI Components
    this.visualizer = null;
    this.cameraFeed = null;
    this.perceptionPanel = null;
    this.telemetryGauges = null;
    this.riskBanner = null;

    // Services
    this.rosClient = null;
    this.mockStreamer = null;
    this.simLiveEnabled = false;

    // FPS Profiling
    this.fpsCounter = {
      frames: 0,
      lastTime: performance.now(),
      fps: 60
    };

    this.init();
  }

  async init() {
    console.log('Initializing SIGHT AMR Perception Dashboard...');

    try {
      // 1. Load Initial Environment Data
      await this.loadScenario(this.activeScenarioFile);

      // 2. Initialize Canvas Map Visualizer
      this.visualizer = new MapVisualizer('spatial-canvas');
      this.visualizer.setData(this.scenarioData);

      // 3. Initialize Sidebar Perception Widgets
      this.riskBanner = new ProximityAlertBanner('risk-banner-slot');
      this.riskBanner.evaluateRisk(this.scenarioData.detections);

      this.cameraFeed = new CameraFeedWidget('camera-feed-slot');
      this.cameraFeed.setDetections(this.scenarioData.detections);

      this.perceptionPanel = new PerceptionPanel('perception-list-slot', (selectedId) => {
        this.onSelectTarget(selectedId);
      });
      this.perceptionPanel.setDetections(this.scenarioData.detections);

      this.telemetryGauges = new TelemetryGauges('telemetry-gauges-slot');
      this.telemetryGauges.update(this.scenarioData.amr, this.scenarioData.diagnostics);

      // 4. Initialize ROS 2 WebSocket Client
      this.initRosBridge();

      // 5. Initialize In-Browser Live Simulation Fallback
      this.mockStreamer = new MockLiveStreamer((livePayload) => {
        this.handleLiveTelemetry(livePayload);
      });

      // 6. Update UI Stats & Bind Controls
      this.updateHeaderStats(this.scenarioData);
      this.bindModeSwitcher();
      this.bindScenarioSelector();
      this.bindSettingsModal();
      this.bindHelpModal();
      this.bindDisconnectedModal();
      this.bindKeyboardShortcuts();
      this.startFpsProfiler();

      console.log('SIGHT Dashboard operational.');
    } catch (err) {
      console.error('Failed to initialize SIGHT scenario:', err);
    }
  }

  async loadScenario(scenarioFileName) {
    try {
      const response = await fetch(`src/data/${scenarioFileName}`);
      this.scenarioData = await response.json();
      this.activeScenarioFile = scenarioFileName;

      if (this.visualizer) {
        this.visualizer.setData(this.scenarioData);
      }
      if (this.cameraFeed) {
        this.cameraFeed.setDetections(this.scenarioData.detections);
      }
      if (this.perceptionPanel) {
        this.perceptionPanel.setDetections(this.scenarioData.detections);
      }
      if (this.riskBanner) {
        this.riskBanner.evaluateRisk(this.scenarioData.detections);
      }
      if (this.telemetryGauges) {
        this.telemetryGauges.update(this.scenarioData.amr, this.scenarioData.diagnostics);
      }
      this.updateHeaderStats(this.scenarioData);

      const sel = document.getElementById('select-scenario');
      if (sel && sel.value !== scenarioFileName) {
        sel.value = scenarioFileName;
      }
    } catch (err) {
      console.error(`Error loading scenario ${scenarioFileName}:`, err);
    }
  }

  initRosBridge() {
    const rosUrlInput = document.getElementById('input-ros-url');
    const initialUrl = rosUrlInput?.value || 'ws://localhost:9090';

    this.rosClient = new RosBridgeClient({
      url: initialUrl,
      onStatusChange: (status) => this.onRosStatusChange(status),
      onError: (err) => console.warn('[ROS2 Bridge Error]', err)
    });

    this.rosClient.subscribe('/sight/amr/pose', 'geometry_msgs/msg/PoseWithCovarianceStamped', (msg) => {
      if (this.currentMode !== 'LIVE') return;
      this.handleRosPoseMessage(msg);
    });

    this.rosClient.subscribe('/sight/camera/detections', 'sight_msgs/msg/DetectionArray', (msg) => {
      if (this.currentMode !== 'LIVE') return;
      this.handleRosDetectionsMessage(msg);
    });

    this.rosClient.subscribe('/sight/amr/diagnostics', 'diagnostic_msgs/msg/DiagnosticArray', (msg) => {
      if (this.currentMode !== 'LIVE') return;
      this.handleRosDiagnosticsMessage(msg);
    });
  }

  onRosStatusChange({ connected, status, url }) {
    const modalConnStatus = document.getElementById('modal-conn-status');
    const footerBridgeStatus = document.getElementById('footer-bridge-status');
    const statusDot = document.querySelector('.status-indicator-dot');
    const statusText = document.getElementById('connection-status-text');
    const disconnModal = document.getElementById('live-disconnected-modal');
    const alertEndpoint = document.getElementById('alert-bridge-endpoint');
    const alertStatus = document.getElementById('alert-bridge-status');

    if (alertEndpoint) alertEndpoint.textContent = url || this.rosClient.url;
    if (alertStatus) {
      alertStatus.textContent = connected ? 'ONLINE (CONNECTED)' : (status === 'CONNECTING' ? 'CONNECTING...' : 'DISCONNECTED');
      alertStatus.className = connected ? 'sensor-stat text-emerald font-mono' : 'sensor-stat text-amber font-mono';
    }

    if (modalConnStatus) {
      modalConnStatus.textContent = status;
      modalConnStatus.className = connected ? 'text-emerald' : 'text-red';
    }

    if (footerBridgeStatus) {
      footerBridgeStatus.textContent = connected ? 'Connected (9090)' : 'Standby / Offline';
      footerBridgeStatus.className = connected ? 'text-emerald' : 'text-amber';
    }

    if (this.currentMode === 'LIVE') {
      if (connected) {
        if (disconnModal) disconnModal.style.display = 'none';
        if (statusDot) statusDot.className = 'status-indicator-dot dot-connected';
        if (statusText) {
          statusText.textContent = '🟢 SIGHT AMR CONNECTED — Streaming Live ROS 2 Telemetry';
          statusText.style.color = '#10b981';
        }
      } else if (!this.simLiveEnabled) {
        if (disconnModal) disconnModal.style.display = 'flex';
        if (statusDot) statusDot.className = 'status-indicator-dot dot-disconnected';
        if (statusText) {
          statusText.textContent = '🔴 SIGHT AMR NOT CONNECTED — Waiting for live sensor connection...';
          statusText.style.color = '#ef4444';
        }
      }
    }
  }

  handleRosPoseMessage(msg) {
    if (!msg || !msg.pose) return;
    const pos = msg.pose.position || { x: 45.0, y: 40.5 };
    const heading = msg.pose.heading_deg ?? 0;
    const speed = msg.velocity?.linear?.x ?? 0;

    const amrUpdate = {
      position: { x: pos.x, y: pos.y },
      heading_deg: heading,
      speed_mps: speed,
      gradient: msg.gradient || { pitch_deg: -3.4, roll_deg: 1.1, slope_pct: -5.9 }
    };

    if (this.visualizer) {
      this.visualizer.amrState.position = amrUpdate.position;
      this.visualizer.amrState.heading_deg = amrUpdate.heading_deg;
      this.visualizer.amrState.speed_mps = amrUpdate.speed_mps;
    }

    const elCoords = document.getElementById('hud-coords');
    if (elCoords) elCoords.textContent = `X: ${pos.x.toFixed(1)}m | Y: ${pos.y.toFixed(1)}m`;

    const elSpeed = document.getElementById('hdr-speed');
    if (elSpeed) elSpeed.textContent = `${speed.toFixed(1)} m/s`;
  }

  handleRosDetectionsMessage(msg) {
    if (!msg || !msg.detections) return;
    const detections = msg.detections;

    if (this.visualizer) this.visualizer.detections = detections;
    if (this.cameraFeed) this.cameraFeed.setDetections(detections);
    if (this.perceptionPanel) this.perceptionPanel.setDetections(detections);
    if (this.riskBanner) this.riskBanner.evaluateRisk(detections);
  }

  handleRosDiagnosticsMessage(msg) {
    if (!msg) return;
    if (this.telemetryGauges) {
      this.telemetryGauges.update(this.visualizer?.amrState, msg);
    }
    const elBat = document.getElementById('hdr-battery');
    if (elBat && msg.telemetry?.battery_soc_pct) {
      elBat.textContent = `${msg.telemetry.battery_soc_pct}%`;
    }
  }

  handleLiveTelemetry(livePayload) {
    if (this.currentMode !== 'LIVE') return;
    const { amr, detections, diagnostics } = livePayload;

    if (this.visualizer) {
      this.visualizer.amrState.position = amr.position;
      this.visualizer.amrState.heading_deg = amr.heading_deg;
      this.visualizer.amrState.speed_mps = amr.speed_mps;
      this.visualizer.detections = detections;
    }

    if (this.cameraFeed) this.cameraFeed.setDetections(detections);
    if (this.perceptionPanel) this.perceptionPanel.setDetections(detections);
    if (this.riskBanner) this.riskBanner.evaluateRisk(detections);
    if (this.telemetryGauges) this.telemetryGauges.update(amr, diagnostics);

    const elCoords = document.getElementById('hud-coords');
    if (elCoords) elCoords.textContent = `X: ${amr.position.x.toFixed(1)}m | Y: ${amr.position.y.toFixed(1)}m`;

    const elSpeed = document.getElementById('hdr-speed');
    if (elSpeed) elSpeed.textContent = `${amr.speed_mps} m/s`;

    const elBat = document.getElementById('hdr-battery');
    if (elBat && diagnostics?.telemetry) elBat.textContent = `${diagnostics.telemetry.battery_soc_pct}%`;
  }

  onSelectTarget(targetId) {
    const activeDetections = this.currentMode === 'LIVE' 
      ? this.visualizer.detections 
      : this.scenarioData.detections;

    this.cameraFeed.setDetections(activeDetections, targetId);

    const target = activeDetections.find(d => d.id === targetId);
    if (target && this.visualizer) {
      const amrPos = this.visualizer.amrState.position;
      const midX = (amrPos.x + target.position.x) / 2;
      const midY = (amrPos.y + target.position.y) / 2;
      
      const screenX = this.visualizer.worldToScreenX(midX);
      const screenY = this.visualizer.worldToScreenY(midY);
      this.visualizer.offsetX += (this.visualizer.viewportWidth / 2) - screenX;
      this.visualizer.offsetY += (this.visualizer.viewportHeight / 2) - screenY;
    }
  }

  updateHeaderStats(data) {
    if (!data) return;
    const { scenario_info, amr, diagnostics } = data;

    const elCond = document.getElementById('hdr-condition');
    if (elCond && scenario_info) elCond.textContent = scenario_info.condition || 'Monsoon Fog';

    const elVis = document.getElementById('hdr-visibility');
    if (elVis && scenario_info) elVis.textContent = `${scenario_info.visibility_m} m`;

    const elSpeed = document.getElementById('hdr-speed');
    if (elSpeed && amr) elSpeed.textContent = `${amr.speed_mps} m/s`;

    const elBat = document.getElementById('hdr-battery');
    if (elBat && diagnostics?.telemetry) elBat.textContent = `${diagnostics.telemetry.battery_soc_pct}%`;

    const elCoords = document.getElementById('hud-coords');
    if (elCoords && amr) {
      elCoords.textContent = `X: ${amr.position.x.toFixed(1)}m | Y: ${amr.position.y.toFixed(1)}m`;
    }

    const elGrad = document.getElementById('hud-gradient');
    if (elGrad && amr?.gradient) {
      elGrad.textContent = `Pitch: ${amr.gradient.pitch_deg}° (Slope: ${amr.gradient.slope_pct}%)`;
    }
  }

  bindModeSwitcher() {
    const btnPresentation = document.getElementById('btn-mode-presentation');
    const btnLive = document.getElementById('btn-mode-live');
    const statusDot = document.querySelector('.status-indicator-dot');
    const statusText = document.getElementById('connection-status-text');
    const disconnModal = document.getElementById('live-disconnected-modal');

    btnPresentation?.addEventListener('click', () => {
      this.currentMode = 'PRESENTATION';
      btnPresentation.classList.add('active');
      btnLive.classList.remove('active');
      
      if (disconnModal) disconnModal.style.display = 'none';
      this.mockStreamer.stop();
      this.loadScenario(this.activeScenarioFile);

      if (statusDot) statusDot.className = 'status-indicator-dot dot-scenario';
      if (statusText) {
        statusText.textContent = 'NMDC Bailadila Deposit 14 • Autonomous Perception Active';
        statusText.style.color = 'var(--text-muted)';
      }
    });

    btnLive?.addEventListener('click', () => {
      this.currentMode = 'LIVE';
      btnLive.classList.add('active');
      btnPresentation.classList.remove('active');

      if (this.simLiveEnabled) {
        this.mockStreamer.start();
        if (disconnModal) disconnModal.style.display = 'none';
        if (statusDot) statusDot.className = 'status-indicator-dot dot-connected';
        if (statusText) {
          statusText.textContent = '🟢 SIGHT AMR CONNECTED (Live Telemetry Stream Active)';
          statusText.style.color = '#10b981';
        }
      } else if (this.rosClient.isConnected) {
        if (disconnModal) disconnModal.style.display = 'none';
        if (statusDot) statusDot.className = 'status-indicator-dot dot-connected';
        if (statusText) {
          statusText.textContent = '🟢 SIGHT AMR CONNECTED — Streaming Live ROS 2 Telemetry';
          statusText.style.color = '#10b981';
        }
      } else {
        // Open center alert window and trigger connect attempt
        if (disconnModal) disconnModal.style.display = 'flex';
        this.rosClient.connect();
        if (statusDot) statusDot.className = 'status-indicator-dot dot-disconnected';
        if (statusText) {
          statusText.textContent = '🔴 SIGHT AMR NOT CONNECTED — Waiting for live sensor connection...';
          statusText.style.color = '#ef4444';
        }
      }
    });
  }

  bindDisconnectedModal() {
    const disconnModal = document.getElementById('live-disconnected-modal');
    const btnClose = document.getElementById('btn-close-disconnected');
    const btnBack = document.getElementById('btn-back-to-presentation');
    const btnRetry = document.getElementById('btn-retry-live-conn');
    const btnSimulate = document.getElementById('btn-simulate-live-conn');

    btnClose?.addEventListener('click', () => {
      if (disconnModal) disconnModal.style.display = 'none';
    });

    btnBack?.addEventListener('click', () => {
      document.getElementById('btn-mode-presentation')?.click();
    });

    btnRetry?.addEventListener('click', () => {
      this.rosClient.connect();
    });

    btnSimulate?.addEventListener('click', () => {
      this.simLiveEnabled = true;
      const checkSim = document.getElementById('check-sim-live');
      if (checkSim) checkSim.checked = true;

      if (disconnModal) disconnModal.style.display = 'none';
      this.mockStreamer.start();

      const statusDot = document.querySelector('.status-indicator-dot');
      const statusText = document.getElementById('connection-status-text');
      if (statusDot) statusDot.className = 'status-indicator-dot dot-connected';
      if (statusText) {
        statusText.textContent = '🟢 SIGHT AMR CONNECTED (Live Telemetry Stream Active)';
        statusText.style.color = '#10b981';
      }
    });
  }

  bindScenarioSelector() {
    const sel = document.getElementById('select-scenario');
    sel?.addEventListener('change', (e) => {
      if (this.currentMode === 'PRESENTATION') {
        this.loadScenario(e.target.value);
      }
    });
  }

  bindSettingsModal() {
    const btnOpen = document.getElementById('btn-open-settings');
    const modal = document.getElementById('ros-modal');
    const btnClose = document.getElementById('btn-close-modal');
    const btnCancel = document.getElementById('btn-modal-cancel');
    const btnConnect = document.getElementById('btn-modal-connect');
    const inputUrl = document.getElementById('input-ros-url');
    const checkSim = document.getElementById('check-sim-live');

    btnOpen?.addEventListener('click', () => {
      if (modal) modal.style.display = 'flex';
    });

    const closeModal = () => {
      if (modal) modal.style.display = 'none';
    };

    btnClose?.addEventListener('click', closeModal);
    btnCancel?.addEventListener('click', closeModal);

    btnConnect?.addEventListener('click', () => {
      const url = inputUrl?.value.trim() || 'ws://localhost:9090';
      this.rosClient.setUrl(url);
      closeModal();
    });

    checkSim?.addEventListener('change', (e) => {
      this.simLiveEnabled = e.target.checked;
      if (this.currentMode === 'LIVE') {
        const disconnModal = document.getElementById('live-disconnected-modal');
        if (this.simLiveEnabled) {
          if (disconnModal) disconnModal.style.display = 'none';
          this.mockStreamer.start();
          const statusDot = document.querySelector('.status-indicator-dot');
          const statusText = document.getElementById('connection-status-text');
          if (statusDot) statusDot.className = 'status-indicator-dot dot-connected';
          if (statusText) {
            statusText.textContent = '🟢 SIGHT AMR CONNECTED (Live Telemetry Stream Active)';
            statusText.style.color = '#10b981';
          }
        } else {
          this.mockStreamer.stop();
          this.onRosStatusChange({ connected: this.rosClient.isConnected, status: this.rosClient.isConnected ? 'CONNECTED' : 'DISCONNECTED' });
        }
      }
    });
  }

  bindHelpModal() {
    const btnOpen = document.getElementById('btn-open-help');
    const modal = document.getElementById('help-modal');
    const btnClose = document.getElementById('btn-close-help');
    const btnCloseFooter = document.getElementById('btn-close-help-footer');

    const toggleHelp = () => {
      if (!modal) return;
      modal.style.display = modal.style.display === 'none' ? 'flex' : 'none';
    };

    btnOpen?.addEventListener('click', toggleHelp);
    btnClose?.addEventListener('click', toggleHelp);
    btnCloseFooter?.addEventListener('click', toggleHelp);
  }

  bindKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

      if (e.key === '1') {
        this.loadScenario('presentation_scenario.json');
      } else if (e.key === '2') {
        this.loadScenario('scenario_approaching_dumper.json');
      } else if (e.key === '3') {
        this.loadScenario('scenario_clear_corridor.json');
      } else if (e.key === 'l' || e.key === 'L') {
        if (this.currentMode === 'PRESENTATION') {
          document.getElementById('btn-mode-live')?.click();
        } else {
          document.getElementById('btn-mode-presentation')?.click();
        }
      } else if (e.key === 'f' || e.key === 'F') {
        this.visualizer?.centerOnAmr();
      } else if (e.key === 'r' || e.key === 'R') {
        this.visualizer?.resetView();
      } else if (e.key === '?') {
        const modal = document.getElementById('help-modal');
        if (modal) modal.style.display = modal.style.display === 'none' ? 'flex' : 'none';
      }
    });
  }

  startFpsProfiler() {
    const fpsElem = document.getElementById('fps-counter');
    const loop = (timestamp) => {
      this.fpsCounter.frames++;
      if (timestamp >= this.fpsCounter.lastTime + 1000) {
        this.fpsCounter.fps = Math.round((this.fpsCounter.frames * 1000) / (timestamp - this.fpsCounter.lastTime));
        this.fpsCounter.frames = 0;
        this.fpsCounter.lastTime = timestamp;

        if (fpsElem) {
          fpsElem.textContent = `${this.fpsCounter.fps}.0 FPS`;
        }
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}

// Instantiate on DOM Load
window.addEventListener('DOMContentLoaded', () => {
  window.sightApp = new SightApp();
});
