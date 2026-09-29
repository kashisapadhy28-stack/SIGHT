# SIGHT Evaluation & Jury Presentation Guide
### NMDC Bailadila Mining Sector | Autonomous Haulage & Safety System

---

## 1. Quick Start Guide
To launch the SIGHT Perception Dashboard:
1. Double click **`run_dashboard.bat`** (or execute `python -m http.server 8080` in the directory).
2. Open your browser to **`http://localhost:8080`**.

---

## 2. Key Talking Points for Judges & Evaluators

### 🎯 The Core Concept
- **"What SIGHT Sees and Understands"**: This is not a fleet-management or production-dispatch system. It is the real-time perceptual intelligence interface of the SIGHT AMR.
- **Extreme Weather Focus**: Tailored specifically for the **NMDC Bailadila iron ore sector** during dense monsoon fog, zero visibility, wet clay/hematite haul road conditions, and steep ramp inclines.

---

## 3. Demonstration Flow (Recommended 3-Minute Walkthrough)

### Step 1: Presentation Mode (Default Open)
- **Top Header**: Highlight the environmental parameters (*Monsoon Fog*, *Visibility 16.5m*, *Wet Haul Road Surface*).
- **Spatial SLAM Visualizer**:
  - Point out the NMDC Bailadila Deposit 14 curved haul corridor with safety rock berms and centerline.
  - Demonstrate the SIGHT AMR avatar: 360° LiDAR sweep, 84° optical camera FOV cone, heading vector, and braking buffer rings (Critical 8m, Warning 18m, Horizon 50m).
  - Use **Mouse Drag** to pan and **Mouse Wheel** to zoom. Click **Focus AMR** or press `F`.
- **Perception HUD (Sidebar)**:
  - **Risk Banner**: Explain the automatic risk calculation (*CRITICAL COLLISION BUFFER* triggered by fallen boulder).
  - **Camera Feed**: Point out the forward optical view simulating dense monsoon fog with neural bounding boxes and de-fog filter.
  - **Active Obstacle Tracker**: Click on **Fallen Hematite Boulder** or **CAT 777 Haul Truck** to show instant bidirectional visual sync with the map.
  - **Telemetry Gauges**: Show the LiDAR 8-sector radar distances and the IMU slope pitch (-3.4°) / roll (+1.1°) inclinometer.

### Step 2: Interactive Scenario Injection (Phase 5 Feature)
- Switch between preloaded test scenarios using the top scenario dropdown or keyboard shortcuts (`1`, `2`, `3`):
  - **Scenario 1**: *Fallen Boulder Hazard (Monsoon Fog)* — Critical risk trigger.
  - **Scenario 2**: *CAT 777 Haul Truck Approach (Blind Curve)* — Caution/yield advisory.
  - **Scenario 3**: *Corridor Clear (Autonomous Cruise)* — Green nominal safety state.

### Step 3: LIVE Mode Demonstration
- Click the **LIVE ROS 2** mode button.
- **Hardware Disconnected State**: Observe the clear alert:
  `🔴 SIGHT AMR NOT CONNECTED — Waiting for live sensor connection...`
- **Testing Live Stream**:
  - Open Settings (⚙️) and check **"Enable In-Browser Live Telemetry Simulation"** (or run `python scripts/mock_ros2_node.py` in a terminal).
  - Status immediately flips to:
    `🟢 SIGHT AMR CONNECTED`
  - Show how live robot coordinates, moving obstacle distances, and telemetry stream in real-time.

---

## 4. Keyboard Shortcuts Reference

| Key | Action |
|---|---|
| `1` | Load Scenario 1 (Fallen Boulder Hazard) |
| `2` | Load Scenario 2 (Approaching Haul Dumper) |
| `3` | Load Scenario 3 (Nominal Clear Haulage) |
| `L` | Toggle between Presentation and LIVE Mode |
| `F` | Focus / Center on SIGHT AMR |
| `R` | Reset Default View Zoom & Pan |
| `?` | Toggle Interactive Presentation Help HUD |
