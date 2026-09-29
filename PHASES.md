# SIGHT Development Phases & Milestones

---

## 📌 Phase 1: Specifications, Architecture & Contract Definition *(Completed ✅)*
- [x] Project structure initialization at `C:\Users\admin\OneDrive\Documents\sight`
- [x] Requirements & Architecture Documentation (`README.md`)
- [x] ROS 2 topic & data payload schema definitions (`docs/ROS2_INTERFACE_SPEC.md`)
- [x] Core contract types, risk classification logic (`src/contracts/types.js`)
- [x] Preloaded presentation scenario dataset (`src/data/presentation_scenario.json`)

---

## 📌 Phase 2: Design System & Spatial Mining Visualizer *(Completed ✅)*
- [x] Dark industrial design tokens & typography (`src/styles/main.css`)
- [x] High-performance 2D Canvas engine (`src/components/MapVisualizer.js`)
- [x] Top header telemetry HUD with dual-mode selector (`Presentation Scenario` vs `LIVE ROS 2`)
- [x] Live connection state handling (`🔴 SIGHT AMR NOT CONNECTED` / `🟢 SIGHT AMR CONNECTED`)

---

## 📌 Phase 3: Sensor HUD & Perception Pipeline *(Completed ✅)*
- [x] **Proximity Collision Risk Assessment Banner** (`src/components/ProximityAlertBanner.js`)
- [x] **AMR Forward Optical Vision Widget** (`src/components/CameraFeedWidget.js`)
- [x] **Active Obstacle Tracker List** (`src/components/PerceptionPanel.js`)
- [x] **Telemetry & Diagnostics Gauges** (`src/components/TelemetryGauges.js`)

---

## 📌 Phase 4: Dual-Mode Switch & ROS 2 Live Bridge *(Completed ✅)*
- [x] **ROSBridge WebSocket Client** (`src/services/RosBridgeClient.js`):
  - Auto-reconnect and error recovery
  - Subscribes to `/sight/amr/pose`, `/sight/camera/detections`, `/sight/scan`, `/sight/amr/diagnostics`
- [x] **Connection Settings Modal** (Endpoint configuration `ws://<ip>:9090` and live latency diagnostic)
- [x] **Mock ROS 2 Publisher Node** (`scripts/mock_ros2_node.py`)
- [x] **In-Browser Fallback Streamer** (`src/services/MockLiveStreamer.js`) for instant offline demonstration

---

## 📌 Phase 5: Verification, Benchmarking & Presentation Readiness *(Completed ✅)*
- [x] Standalone one-click runner (`run_dashboard.bat`)
- [x] 60 FPS Canvas rendering loop optimization
- [x] Zero-clutter, clean industrial UI review verified
- [x] Responsive layout across desktop and laptop displays
