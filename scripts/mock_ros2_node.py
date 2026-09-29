#!/usr/bin/env python3
"""
SIGHT AMR Mock ROS 2 Bridge Publisher
Simulates real-time ROS 2 topic publication over rosbridge WebSocket JSON protocol (Port 9090).
Run this script to test live hardware streaming into the SIGHT Dashboard without physical AMR.
"""

import asyncio
import json
import math
import time
import sys

# Ensure websockets package is available or provide fallback instructions
try:
    import websockets
except ImportError:
    print("[SIGHT Mock ROS2] 'websockets' package not found. Install via: pip install websockets")
    sys.exit(1)

PORT = 9090
HOST = "0.0.0.0"

connected_clients = set()

# AMR Dynamic Simulation State
state = {
    "x": 45.0,
    "y": 40.5,
    "heading_deg": 350.0,
    "speed": 2.2,
    "time_elapsed": 0.0
}

def generate_pose():
    # Simulate gentle forward locomotion on the curved haul road
    return {
        "op": "publish",
        "topic": "/sight/amr/pose",
        "msg": {
            "timestamp": time.time(),
            "frame_id": "map",
            "pose": {
                "position": { "x": round(state["x"], 2), "y": round(state["y"], 2), "z": 0.0 },
                "heading_deg": round(state["heading_deg"], 1)
            },
            "velocity": { "linear": { "x": state["speed"], "y": 0.0, "z": 0.0 } },
            "gradient": { "pitch_deg": -3.4, "roll_deg": 1.1, "slope_pct": -5.9 }
        }
    }

def generate_detections():
    # Simulate dynamic distance estimation to fallen boulder and haul truck
    dist_boulder = max(4.0, 12.4 - (state["time_elapsed"] % 15) * 0.4)
    risk_boulder = "CRITICAL" if dist_boulder <= 8.0 else "WARNING"

    return {
        "op": "publish",
        "topic": "/sight/camera/detections",
        "msg": {
            "timestamp": time.time(),
            "detections": [
                {
                    "id": "DET-LIVE-01",
                    "class": "FALLEN_BOULDER",
                    "label": "Fallen Hematite Boulder (0.9m)",
                    "confidence": 0.95,
                    "distance_m": round(dist_boulder, 1),
                    "bearing_deg": -4.2,
                    "position": { "x": 57.3, "y": 39.5 },
                    "relative_velocity_mps": 0.0,
                    "risk": risk_boulder,
                    "action": "EMERGENCY STOP BUFFER ENGAGED" if risk_boulder == "CRITICAL" else "DECELERATING FOR CLEARANCE",
                    "bbox_cam": { "x": 44, "y": 58, "w": 18, "h": 22 }
                },
                {
                    "id": "DET-LIVE-02",
                    "class": "HEAVY_DUMPER",
                    "label": "CAT 777 Haul Truck (Approaching)",
                    "confidence": 0.92,
                    "distance_m": round(34.8 - (state["time_elapsed"] % 10) * 0.8, 1),
                    "bearing_deg": -12.5,
                    "position": { "x": 78.5, "y": 33.2 },
                    "relative_velocity_mps": -5.2,
                    "risk": "CAUTION",
                    "action": "TRACKING HAUL LANE CLEARANCE",
                    "bbox_cam": { "x": 16, "y": 32, "w": 26, "h": 36 }
                }
            ]
        }
    }

def generate_diagnostics():
    return {
        "op": "publish",
        "topic": "/sight/amr/diagnostics",
        "msg": {
            "timestamp": time.time(),
            "connected": True,
            "hardware": {
                "lidar": { "status": "OK", "fps": 10.0 },
                "camera": { "status": "OK", "fps": 30.0 },
                "imu": { "status": "OK", "calibrated": True }
            },
            "telemetry": {
                "battery_soc_pct": round(86.4 - (state["time_elapsed"] * 0.01), 1),
                "temp_internal_c": 36.8
            }
        }
    }

async def publisher_loop():
    while True:
        await asyncio.sleep(0.1) # 10 Hz telemetry loop
        state["time_elapsed"] += 0.1

        if not connected_clients:
            continue

        msg_pose = json.dumps(generate_pose())
        msg_det = json.dumps(generate_detections())
        msg_diag = json.dumps(generate_diagnostics())

        for client in list(connected_clients):
            try:
                await client.send(msg_pose)
                await client.send(msg_det)
                await client.send(msg_diag)
            except websockets.exceptions.ConnectionClosed:
                connected_clients.discard(client)

async def handle_client(websocket):
    print(f"[SIGHT Mock ROS2] Client connected from {websocket.remote_address}")
    connected_clients.add(websocket)
    try:
        async for message in websocket:
            data = json.loads(message)
            if data.get("op") == "subscribe":
                print(f"[SIGHT Mock ROS2] Subscribed to topic: {data.get('topic')}")
    except websockets.exceptions.ConnectionClosed:
        pass
    finally:
        connected_clients.discard(websocket)
        print("[SIGHT Mock ROS2] Client disconnected")

async def main():
    print(f"==================================================")
    print(f" SIGHT AMR ROS 2 Mock Publisher Server Running")
    print(f" Listening on ws://localhost:{PORT}")
    print(f"==================================================")
    server = await websockets.serve(handle_client, HOST, PORT)
    await asyncio.gather(server.wait_closed(), publisher_loop())

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[SIGHT Mock ROS2] Server terminated.")
