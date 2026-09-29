# SIGHT ROS 2 Topic & Interface Specification

This document defines the formal ROS 2 topic schemas and JSON payloads utilized by the **SIGHT AMR** and consumed by the **SIGHT Dashboard**.

---

## 1. Topic Summary

| Topic Name | ROS 2 Message Type | Purpose | Frequency |
|---|---|---|---|
| `/sight/amr/pose` | `geometry_msgs/msg/PoseWithCovarianceStamped` or `nav_msgs/msg/Odometry` | SIGHT AMR metric pose, velocity & orientation | 20 Hz |
| `/sight/scan` | `sensor_msgs/msg/LaserScan` | 2D/3D LiDAR radial distance ranges and intensities | 10 Hz |
| `/sight/camera/detections` | `sight_msgs/msg/DetectionArray` (or JSON) | Neural vision bounding boxes, classes, 3D world coordinates | 15 Hz |
| `/sight/map` | `nav_msgs/msg/OccupancyGrid` | SLAM generated 2D grid map with resolution & origin | 1 Hz / On Change |
| `/sight/amr/imu` | `sensor_msgs/msg/Imu` | Accelerometer & Gyroscope data for road gradient/tilt | 50 Hz |
| `/sight/amr/diagnostics` | `diagnostic_msgs/msg/DiagnosticArray` | Hardware health (LiDAR, Camera, IMU, Battery, Comms) | 2 Hz |
| `/sight/safety/proximity_alert` | `sight_msgs/msg/ProximityAlert` | Computed collision risk vector and closest obstacle | 20 Hz |

---

## 2. Topic Payload Specifications

### 2.1 `/sight/amr/pose`
Represents the robot's real-time position in the mine frame ($x, y$ in meters) and heading ($\theta$ in radians/degrees).

```json
{
  "timestamp": 1727592400.125,
  "frame_id": "map",
  "pose": {
    "position": { "x": 142.50, "y": 88.20, "z": 4.10 },
    "orientation": { "x": 0.0, "y": 0.0, "z": 0.3826834, "w": 0.9238795 },
    "heading_deg": 45.0
  },
  "velocity": {
    "linear": { "x": 2.4, "y": 0.0, "z": 0.0 },
    "angular": { "z": 0.02 }
  },
  "gradient": {
    "pitch_deg": -3.8,
    "roll_deg": 1.2,
    "slope_grade_pct": -6.6
  }
}
```

---

### 2.2 `/sight/camera/detections`
Represents vision-based object detections correlated with LiDAR depth.

```json
{
  "timestamp": 1727592400.150,
  "frame_id": "camera_optical_frame",
  "detections": [
    {
      "id": "det_001",
      "class_name": "FALLEN_BOULDER",
      "confidence": 0.94,
      "distance_m": 12.4,
      "bearing_deg": 6.5,
      "relative_velocity_mps": 0.0,
      "bounding_box_2d": { "x_min": 0.42, "y_min": 0.58, "x_max": 0.61, "y_max": 0.79 },
      "world_position": { "x": 154.8, "y": 89.6, "z": 0.4 },
      "risk_level": "CRITICAL",
      "action_required": "EMERGENCY_STOP_BUFFER"
    },
    {
      "id": "det_002",
      "class_name": "HEAVY_DUMPER_CAT777",
      "confidence": 0.89,
      "distance_m": 34.2,
      "bearing_deg": -14.2,
      "relative_velocity_mps": -5.2,
      "bounding_box_2d": { "x_min": 0.15, "y_min": 0.32, "x_max": 0.38, "y_max": 0.65 },
      "world_position": { "x": 175.6, "y": 79.8, "z": 2.1 },
      "risk_level": "CAUTION",
      "action_required": "YIELD_BERM_LANE"
    },
    {
      "id": "det_003",
      "class_name": "MINE_CREW",
      "confidence": 0.96,
      "distance_m": 18.0,
      "bearing_deg": 22.0,
      "relative_velocity_mps": 0.5,
      "bounding_box_2d": { "x_min": 0.72, "y_min": 0.45, "x_max": 0.81, "y_max": 0.72 },
      "world_position": { "x": 159.1, "y": 94.9, "z": 0.0 },
      "risk_level": "WARNING",
      "action_required": "DECELERATE_HORN"
    }
  ]
}
```

---

### 2.3 `/sight/scan`
Represents 2D LiDAR range measurements across 360 degrees.

```json
{
  "timestamp": 1727592400.130,
  "frame_id": "laser_frame",
  "angle_min": -3.14159265,
  "angle_max": 3.14159265,
  "angle_increment": 0.00872665,
  "range_min": 0.15,
  "range_max": 50.0,
  "ranges": [12.4, 12.3, 12.5, "...", 34.1, 34.0],
  "intensities": [210, 215, 208, "...", 180, 190]
}
```

---

### 2.4 `/sight/amr/diagnostics`
Hardware component health and environmental sensor statuses.

```json
{
  "timestamp": 1727592400.200,
  "connected": true,
  "system_status": "OPERATIONAL",
  "hardware": {
    "lidar": { "status": "OK", "fps": 10.0, "temperature_c": 38.2 },
    "camera": { "status": "OK", "fps": 28.5, "exposure_auto": true, "lens_rain_obstruction_pct": 8.0 },
    "imu": { "status": "OK", "calibrated": true },
    "slam": { "status": "TRACKING_NOMINAL", "confidence": 0.98, "loop_closures": 14 }
  },
  "power": {
    "battery_soc_pct": 86.4,
    "voltage_v": 48.2,
    "current_draw_a": 14.8,
    "est_remaining_minutes": 215
  },
  "environment": {
    "visibility_condition": "DENSE_MONSOON_FOG",
    "est_visibility_meters": 15.0,
    "haul_road_traction": "WET_SLIPPERY_CLAY"
  }
}
```
