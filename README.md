# SIGHT — Intelligent Mining Safety & Autonomous Haulage System
### NMDC Bailadila Sector | Monsoon & Dense-Fog Navigation AMR

---

## 1. Core Architectural Hierarchy
```
 SIGHT AMR (Hardware)
   │
   ▼
 SENSORS (LiDAR + Camera + IMU)
   │
   ▼
 PERCEPTION / SLAM (Obstacle Detection + Occupancy Grid + Pose)
   │
   ▼
 ROS 2 LAYER (Topic Publication & ROSBridge WebSocket)
   │
   ▼
 SIGHT DASHBOARD (What SIGHT sees, understands, and calculates risk for)
```

---

## 2. The Primary Job of the SIGHT Dashboard
The dashboard is the direct sensory and situational intelligence interface for SIGHT. Its primary job is:
1. **WHAT SIGHT SEES**: Visual object detection class (e.g. Fallen Boulder, Mining Crew, Heavy Dumper, Light Vehicle).
2. **WHERE IT SEES IT**: Exact 2D metric coordinate placement on the SLAM haul-road map with bearing angle ($\theta$).
3. **HOW FAR IT IS**: High-precision LiDAR range & optical distance estimation ($d$ in meters).
4. **WHAT LEVEL OF RISK IT REPRESENTS**: Proximity Risk Engine classification (**NORMAL / CAUTION / CRITICAL COLLISION HAZARD**).

---

## 3. Operational Modes

### 🔹 Mode 1: Presentation Scenario (Default)
- **Preloaded, clearly non-live data**.
- Realistic NMDC Bailadila haul road environment (wet terrain, monsoon fog conditions, safety berms, active obstacles).
- Demonstrates full perception capabilities, dynamic telemetry, risk calculations, and map projection smoothly for presentations and jury review.

### 🔹 Mode 2: LIVE Mode (ROS 2 Hardware Link)
- Connected directly to the physical SIGHT AMR via ROS 2 (`rosbridge_websocket`).
- **If Not Connected**:
  🔴 `SIGHT AMR NOT CONNECTED — Waiting for live sensor connection...`
- **If Connected**:
  🟢 `SIGHT AMR CONNECTED`
  Seamlessly transitions to live LiDAR point cloud (`/scan`), live camera detection boxes (`/camera/detections`), live pose (`/amr/pose`), and live SLAM map (`/map`).

---

## 4. Hardware & Sensor Suite (SIGHT AMR)
- **LiDAR**: 360° point cloud range scanning & spatial barrier detection.
- **Camera**: Forward optical sensor with neural detection model.
- **IMU**: 6/9-axis attitude, slope gradient & roll/pitch telemetry on mine ramps.
- **SLAM**: Real-time 2D occupancy mapping & local trajectory planning.
- **ROS 2**: Native robot communication layer.

---

## 5. Design Directives
- **Clean, realistic industrial aesthetic**: Tailored for NMDC Bailadila heavy industrial mining environments.
- **Zero unnecessary fluff**: No fake 38 dumpers, no fake production dashboards, no neon sci-fi holograms.
- **Focus**: High clarity, low cognitive load for safety operators.
