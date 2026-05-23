import torch

# ─────────────────────────────────────────────────────────────
# FIX: PyTorch 2.6+ changed weights_only=True by default,
# which breaks YOLO model loading. We patch torch.load to
# default to weights_only=False (safe since we use official
# yolov8n.pt from Ultralytics).
# ─────────────────────────────────────────────────────────────
_orig_torch_load = torch.load
def _patched_torch_load(f, *args, **kwargs):
    kwargs.setdefault('weights_only', False)
    return _orig_torch_load(f, *args, **kwargs)
torch.load = _patched_torch_load

from fastapi import FastAPI, Request, Body
from fastapi.responses import JSONResponse, StreamingResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import cv2
import pandas as pd
from datetime import datetime, timedelta
import threading
import time
import numpy as np
import json
from collections import defaultdict, deque
from typing import Dict
import io
import os
import warnings
import gc

warnings.filterwarnings("ignore", category=FutureWarning)
warnings.filterwarnings("ignore", category=DeprecationWarning)

# ─────────────────────────────────────────────────────────────
# YOLO Model Loading — uses local yolov8n.pt file
# Place yolov8n.pt in the same folder as app.py
# Download once with: python -c "from ultralytics import YOLO; YOLO('yolov8n.pt')"
# ─────────────────────────────────────────────────────────────
MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "yolov8n.pt")
model = None

try:
    from ultralytics import YOLO

    if not os.path.exists(MODEL_PATH):
        print(f"⚠️  yolov8n.pt not found at {MODEL_PATH}")
        print("📥 Downloading yolov8n.pt for the first time...")
        model = YOLO("yolov8n.pt")  # Downloads and caches
    else:
        print(f"📦 Loading local YOLO model from: {MODEL_PATH}")
        model = YOLO(MODEL_PATH)

    # Warm up the model with a dummy frame
    dummy = np.zeros((240, 320, 3), dtype=np.uint8)
    model(dummy, classes=[0], verbose=False, device='cpu')
    print("✅ YOLO model loaded and warmed up successfully")

except Exception as e:
    print(f"❌ YOLO failed to load: {e}")
    print("⚠️  Will use OpenCV fallback detection method")
    model = None


# ─────────────────────────────────────────────────────────────
# Fallback Detection (OpenCV contour-based)
# ─────────────────────────────────────────────────────────────
def detect_persons_fallback(frame):
    """Lightweight fallback person detection using OpenCV"""
    try:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (21, 21), 0)
        edges = cv2.Canny(blurred, 30, 80)
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        person_count = 0
        for contour in contours:
            area = cv2.contourArea(contour)
            if 800 < area < 8000:
                x, y, w, h = cv2.boundingRect(contour)
                aspect_ratio = h / w if w > 0 else 0
                if 1.2 < aspect_ratio < 4.0:
                    person_count += 1

        return min(person_count, 30)
    except Exception as e:
        print(f"Fallback detection error: {e}")
        return 5


# ─────────────────────────────────────────────────────────────
# Global State
# ─────────────────────────────────────────────────────────────
feeds_data = {}
analytics_data = defaultdict(lambda: deque(maxlen=50))
alert_threshold = 20
congestion_threshold = 15

# ─────────────────────────────────────────────────────────────
# CCTV Feed Configuration
# ─────────────────────────────────────────────────────────────
CCTV_FEEDS = {
    "feed_1": {
        "name": "Main Entrance",
        "url": "https://res.cloudinary.com/djhw7tzod/video/upload/v1779513385/mall_stair_pgmkqu.mp4",
        "location": {"lat": 12.979452785667108, "lng": 77.719926928982},
        "area": "entrance",
        "max_capacity": 50
    },
    "feed_2": {
        "name": "Mall Stage",
        "url": "https://res.cloudinary.com/djhw7tzod/video/upload/v1779513900/Main_Stage_olgn9z.mp4",
        "location": {"lat": 12.97947604346141, "lng": 77.71969869509633},
        "area": "stage",
        "max_capacity": 100
    },
    "feed_3": {
        "name": "Red Street Road",
        "url": "https://res.cloudinary.com/djhw7tzod/video/upload/v1779513373/red_street_wygdnu.mp4",
        "location": {"lat": 12.979876811228333, "lng": 77.71900686661412},
        "area": "front_street",
        "max_capacity": 30
    },
    "feed_4": {
        "name": "Exit Gate",
        "url": "https://res.cloudinary.com/djhw7tzod/video/upload/v1779513900/Exit_Gate_rwazcn.mp4",
        "location": {"lat": 12.979869862552484, "lng": 77.71948285262408},
        "area": "exit_a",
        "max_capacity": 25
    },
    "feed_5": {
        "name": "Subway",
        "url": "https://res.cloudinary.com/djhw7tzod/video/upload/v1779513375/subway_pvgegu.mp4",
        "location": {"lat": 12.979517216997738, "lng": 77.71922792378729},
        "area": "exit_b",
        "max_capacity": 30
    },
    "feed_6": {
        "name": "Market",
        "url": "https://res.cloudinary.com/djhw7tzod/video/upload/v1779516788/Market_Street_udcxf2.mp4",
        "location": {"lat": 12.979468576192303, "lng": 77.71913343967294},
        "area": "back_street",
        "max_capacity": 60
    },
    "feed_7": {
        "name": "Cross Road",
        "url": "https://res.cloudinary.com/djhw7tzod/video/upload/v1779516777/Cross_Road_shgvdg.mp4",
        "location": {"lat": 12.98013912359981, "lng": 77.71894803688257},
        "area": "crossroad",
        "max_capacity": 80
    },
     "feed_8": {
        "name": "Lobby",
        "url": "https://res.cloudinary.com/djhw7tzod/video/upload/v1779516806/Mall_z9mkga.mp4",
        "location": {"lat": 12.979699619933339, "lng": 77.71896586407394},
        "area": "lobby",
        "max_capacity": 80
    },

}


# ─────────────────────────────────────────────────────────────
# Video Validation
# ─────────────────────────────────────────────────────────────
def validate_video_files():
    import requests
    missing_files = []
    valid_files = []

    for feed_id, config in CCTV_FEEDS.items():
        video_url = config['url']
        try:
            if video_url.startswith(('http://', 'https://')):
                response = requests.head(video_url, timeout=10)
                if response.status_code == 200:
                    cap = cv2.VideoCapture(video_url)
                    if cap.isOpened():
                        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
                        fps = cap.get(cv2.CAP_PROP_FPS)
                        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                        valid_files.append({
                            "feed_id": feed_id,
                            "url": video_url,
                            "frame_count": frame_count,
                            "fps": fps,
                            "resolution": f"{width}x{height}"
                        })
                        cap.release()
                    else:
                        missing_files.append(f"{feed_id}: Cannot open video stream {video_url}")
                else:
                    missing_files.append(f"{feed_id}: HTTP {response.status_code} for {video_url}")
            else:
                if os.path.exists(video_url):
                    cap = cv2.VideoCapture(video_url)
                    if cap.isOpened():
                        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
                        fps = cap.get(cv2.CAP_PROP_FPS)
                        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                        valid_files.append({
                            "feed_id": feed_id,
                            "path": video_url,
                            "frame_count": frame_count,
                            "fps": fps,
                            "resolution": f"{width}x{height}"
                        })
                        cap.release()
                    else:
                        missing_files.append(f"{feed_id}: Cannot open {video_url}")
                else:
                    missing_files.append(f"{feed_id}: File not found {video_url}")
        except Exception as e:
            missing_files.append(f"{feed_id}: Error checking {video_url} - {str(e)}")

    return valid_files, missing_files


def check_video_setup():
    print("Validating video files...")
    valid_files, missing_files = validate_video_files()

    if missing_files:
        print("❌ Missing or invalid video files:")
        for missing in missing_files:
            print(f"   {missing}")

    if valid_files:
        print("✅ Valid video files found:")
        for valid in valid_files:
            print(f"   {valid['feed_id']}: {valid['resolution']} @ {valid['fps']:.1f}fps ({valid['frame_count']} frames)")

    return len(valid_files), len(missing_files)


# ─────────────────────────────────────────────────────────────
# Feed Processor
# ─────────────────────────────────────────────────────────────
class FeedProcessor:
    def __init__(self, feed_id, feed_config):
        self.feed_id = feed_id
        self.config = feed_config
        self.cap = None
        self.running = False
        self.current_count = 0
        self.last_logged = time.time()
        self.log_interval = 10
        self.retry_count = 0
        self.max_retries = 3
        self.frame_skip = 3

    def start_processing(self):
        self.running = True
        thread = threading.Thread(target=self._process_feed)
        thread.daemon = True
        thread.start()

    def _process_feed(self):
        try:
            self.cap = cv2.VideoCapture(self.config['url'])
            self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            self.cap.set(cv2.CAP_PROP_FPS, 10)

            if not self.cap.isOpened():
                print(f"Failed to open video stream for {self.feed_id}")
                return

            frame_count = 0
            while self.running:
                ret, frame = self.cap.read()

                if not ret:
                    print(f"Video ended for {self.feed_id}, restarting...")
                    if self.cap:
                        self.cap.release()
                    time.sleep(2)
                    self.cap = cv2.VideoCapture(self.config['url'])
                    self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

                    if not self.cap.isOpened():
                        self.retry_count += 1
                        if self.retry_count >= self.max_retries:
                            print(f"Max retries reached for {self.feed_id}")
                            break
                        time.sleep(5)
                        continue
                    else:
                        self.retry_count = 0
                        frame_count = 0
                        continue

                frame_count += 1
                if frame_count % self.frame_skip != 0:
                    continue

                self.retry_count = 0
                frame = cv2.resize(frame, (320, 240))

                try:
                    if model is not None:
                        results = model(frame, classes=[0], verbose=False, device='cpu')
                        detections = results[0].boxes
                        person_count = len(detections) if detections is not None else 0

                        if hasattr(torch, 'cuda') and torch.cuda.is_available():
                            torch.cuda.empty_cache()
                    else:
                        person_count = detect_persons_fallback(frame)
                except Exception as e:
                    print(f"Detection error for {self.feed_id}: {e}")
                    person_count = detect_persons_fallback(frame)

                self.current_count = person_count

                if time.time() - self.last_logged >= self.log_interval:
                    self._log_data(person_count, frame)
                    self.last_logged = time.time()
                    gc.collect()

                time.sleep(0.5)

        except Exception as e:
            print(f"Error processing {self.feed_id}: {e}")
        finally:
            if self.cap:
                self.cap.release()
            gc.collect()

    def _log_data(self, count, frame):
        timestamp = datetime.now()
        density_percentage = (count / self.config['max_capacity']) * 100

        alert_level = "normal"
        if count >= alert_threshold:
            alert_level = "critical"
        elif count >= congestion_threshold:
            alert_level = "warning"

        data_point = {
            "timestamp": timestamp.isoformat(),
            "count": count,
            "density_percentage": round(density_percentage, 2),
            "alert_level": alert_level,
            "location": self.config['location'],
            "area": self.config['area']
        }
        analytics_data[self.feed_id].append(data_point)

        feeds_data[self.feed_id] = {
            "name": self.config['name'],
            "current_count": count,
            "max_capacity": self.config['max_capacity'],
            "density_percentage": round(density_percentage, 2),
            "alert_level": alert_level,
            "last_updated": timestamp.isoformat(),
            "location": self.config['location'],
            "area": self.config['area']
        }

    def stop_processing(self):
        self.running = False
        if self.cap:
            self.cap.release()


# ─────────────────────────────────────────────────────────────
# Initialize Feed Processors
# ─────────────────────────────────────────────────────────────
feed_processors = {}
for feed_id, config in CCTV_FEEDS.items():
    feed_processors[feed_id] = FeedProcessor(feed_id, config)


# ─────────────────────────────────────────────────────────────
# Lifespan (replaces deprecated @app.on_event)
# ─────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ──
    print("🚀 Starting Crowd Monitoring API...")
    print("📹 Initializing video feeds...")
    check_video_setup()
    print("🔄 Starting feed processors...")
    for processor in feed_processors.values():
        processor.start_processing()
    print("✅ API startup completed!")
    print("📊 Available endpoints:")
    print("   - Health Check:  GET /api/health")
    print("   - All Feeds:     GET /api/feeds")
    print("   - Video Stream:  GET /api/video/stream/{feed_id}")
    print("   - Analytics:     GET /api/analytics/summary")
    port = os.environ.get("PORT", "5000")
    print(f"   - Swagger UI:    http://localhost:{port}/docs")


    yield  # App runs here

    # ── Shutdown ──
    print("🛑 Shutting down feed processors...")
    for processor in feed_processors.values():
        processor.stop_processing()
    print("✅ Shutdown complete.")


# ─────────────────────────────────────────────────────────────
# FastAPI App
# ─────────────────────────────────────────────────────────────
app = FastAPI(title="Crowd Monitoring API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────────────────────
# Helper
# ─────────────────────────────────────────────────────────────
def create_error_frame(message):
    frame = np.zeros((480, 640, 3), dtype=np.uint8)
    frame.fill(50)
    try:
        cv2.putText(frame, message, (50, 240), cv2.FONT_HERSHEY_SIMPLEX,
                    1, (255, 255, 255), 2, cv2.LINE_AA)
        cv2.putText(frame, "Reconnecting...", (50, 280), cv2.FONT_HERSHEY_SIMPLEX,
                    0.7, (200, 200, 200), 1, cv2.LINE_AA)
    except Exception:
        pass
    return frame


# ─────────────────────────────────────────────────────────────
# API Routes
# ─────────────────────────────────────────────────────────────

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "model": "yolo" if model is not None else "fallback",
        "timestamp": datetime.now().isoformat(),
        "active_feeds": len([f for f in feed_processors.values() if f.running])
    }


@app.get("/api/feeds")
async def get_all_feeds():
    return {
        "feeds": feeds_data,
        "total_count": sum(feed.get("current_count", 0) for feed in feeds_data.values()),
        "timestamp": datetime.now().isoformat()
    }


@app.get("/api/feeds/{feed_id}")
async def get_feed_details(feed_id: str):
    if feed_id not in feeds_data:
        return JSONResponse(status_code=404, content={"error": "Feed not found"})
    return {
        "feed": feeds_data[feed_id],
        "recent_analytics": list(analytics_data[feed_id])[-10:],
        "timestamp": datetime.now().isoformat()
    }


@app.get("/api/video/health/{feed_id}")
async def check_feed_health(feed_id: str):
    if feed_id not in CCTV_FEEDS:
        return JSONResponse(status_code=404, content={"error": "Feed not found"})
    try:
        cap = cv2.VideoCapture(CCTV_FEEDS[feed_id]['url'])
        is_opened = cap.isOpened()
        if is_opened:
            ret, frame = cap.read()
            cap.release()
            return {
                "feed_id": feed_id,
                "status": "healthy" if ret else "unhealthy",
                "accessible": True,
                "can_read_frame": ret,
                "timestamp": datetime.now().isoformat()
            }
        else:
            cap.release()
            return {
                "feed_id": feed_id,
                "status": "unhealthy",
                "accessible": False,
                "can_read_frame": False,
                "timestamp": datetime.now().isoformat()
            }
    except Exception as e:
        return {
            "feed_id": feed_id,
            "status": "error",
            "accessible": False,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }


@app.get("/api/video/stream/{feed_id}")
async def get_video_stream(feed_id: str):
    if feed_id not in CCTV_FEEDS:
        return JSONResponse(status_code=404, content={"error": "Feed not found"})

    def generate_video_stream():
        cap = None
        reconnect_attempts = 0
        max_reconnect_attempts = 5

        try:
            while reconnect_attempts < max_reconnect_attempts:
                try:
                    cap = cv2.VideoCapture(CCTV_FEEDS[feed_id]['url'])
                    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                    cap.set(cv2.CAP_PROP_FPS, 15)

                    if not cap.isOpened():
                        reconnect_attempts += 1
                        time.sleep(2)
                        continue

                    reconnect_attempts = 0
                    consecutive_failures = 0
                    max_consecutive_failures = 10

                    while consecutive_failures < max_consecutive_failures:
                        ret, frame = cap.read()

                        if not ret:
                            consecutive_failures += 1
                            if consecutive_failures >= max_consecutive_failures:
                                break
                            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                            time.sleep(0.1)
                            continue

                        consecutive_failures = 0

                        try:
                            frame = cv2.resize(frame, (640, 480))
                            encode_param = [
                                int(cv2.IMWRITE_JPEG_QUALITY), 75,
                                int(cv2.IMWRITE_JPEG_OPTIMIZE), 1
                            ]
                            ret_encode, buffer = cv2.imencode('.jpg', frame, encode_param)

                            if not ret_encode:
                                continue

                            frame_bytes = buffer.tobytes()
                            yield (b'--frame\r\n'
                                   b'Content-Type: image/jpeg\r\n'
                                   b'Content-Length: ' + str(len(frame_bytes)).encode() + b'\r\n\r\n'
                                   + frame_bytes + b'\r\n')

                            time.sleep(0.066)

                        except Exception as frame_error:
                            consecutive_failures += 1
                            continue

                    if cap:
                        cap.release()
                        cap = None

                    reconnect_attempts += 1
                    time.sleep(3)

                except Exception as e:
                    if cap:
                        cap.release()
                        cap = None
                    reconnect_attempts += 1
                    time.sleep(2)

            error_frame = create_error_frame(f"Feed {feed_id} Unavailable")
            ret_encode, buffer = cv2.imencode('.jpg', error_frame)
            if ret_encode:
                frame_bytes = buffer.tobytes()
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

        except Exception as e:
            print(f"Critical error in video stream for {feed_id}: {e}")
        finally:
            if cap is not None:
                cap.release()

    return StreamingResponse(
        generate_video_stream(),
        media_type="multipart/x-mixed-replace; boundary=frame",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
            "Connection": "keep-alive",
        }
    )


@app.get("/api/video/snapshot/{feed_id}")
async def get_video_snapshot(feed_id: str):
    if feed_id not in CCTV_FEEDS:
        return JSONResponse(status_code=404, content={"error": "Feed not found"})
    try:
        cap = cv2.VideoCapture(CCTV_FEEDS[feed_id]['url'])
        ret, frame = cap.read()
        cap.release()

        if not ret:
            return JSONResponse(status_code=500, content={"error": "Could not capture frame"})

        frame = cv2.resize(frame, (320, 240))
        ret, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])

        if not ret:
            return JSONResponse(status_code=500, content={"error": "Could not encode frame"})

        return Response(content=buffer.tobytes(), media_type="image/jpeg")

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"Snapshot error: {str(e)}"})


@app.get("/api/video/info")
async def get_video_info():
    video_info = {}
    for feed_id, config in CCTV_FEEDS.items():
        try:
            cap = cv2.VideoCapture(config['url'])
            if cap.isOpened():
                fps = cap.get(cv2.CAP_PROP_FPS)
                width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
                video_info[feed_id] = {
                    "name": config['name'],
                    "resolution": f"{width}x{height}",
                    "fps": fps,
                    "duration_seconds": frame_count / fps if fps > 0 else 0,
                    "total_frames": frame_count,
                    "status": "active"
                }
            else:
                video_info[feed_id] = {
                    "name": config['name'],
                    "status": "inactive",
                    "error": "Cannot open video source"
                }
            cap.release()
        except Exception as e:
            video_info[feed_id] = {
                "name": config['name'],
                "status": "error",
                "error": str(e)
            }
    return {"video_info": video_info}


@app.get("/api/analytics/summary")
async def get_analytics_summary():
    total_current = sum(feed.get("current_count", 0) for feed in feeds_data.values())
    total_capacity = sum(CCTV_FEEDS[feed_id]["max_capacity"] for feed_id in CCTV_FEEDS)
    alert_counts = {"critical": 0, "warning": 0, "normal": 0}

    for feed in feeds_data.values():
        alert_counts[feed.get("alert_level", "normal")] += 1

    one_hour_ago = datetime.now() - timedelta(hours=1)
    trend_data = []
    for feed_id, data_points in analytics_data.items():
        for point in data_points:
            if datetime.fromisoformat(point["timestamp"]) >= one_hour_ago:
                trend_data.append({
                    "feed_id": feed_id,
                    "feed_name": CCTV_FEEDS[feed_id]["name"],
                    **point
                })

    return {
        "summary": {
            "total_current_count": total_current,
            "total_capacity": total_capacity,
            "overall_density": round((total_current / total_capacity) * 100, 2) if total_capacity else 0,
            "alert_distribution": alert_counts,
            "active_feeds": len([f for f in feed_processors.values() if f.running])
        },
        "trend_data": trend_data,
        "timestamp": datetime.now().isoformat()
    }


@app.get("/api/alerts")
async def get_current_alerts():
    alerts = [
        {
            "feed_id": fid,
            "feed_name": data["name"],
            "alert_level": data["alert_level"],
            "current_count": data["current_count"],
            "density_percentage": data["density_percentage"],
            "location": data["location"],
            "area": data["area"],
            "timestamp": data["last_updated"]
        }
        for fid, data in feeds_data.items()
    ]
    return {"alerts": alerts, "count": len(alerts), "timestamp": datetime.now().isoformat()}


@app.get("/api/heatmap")
async def get_heatmap_data():
    heatmap_data = [
        {
            "location": data["location"],
            "intensity": data.get("density_percentage", 0),
            "count": data.get("current_count", 0),
            "area": data["area"],
            "name": data["name"],
            "alert_level": data.get("alert_level", "normal")
        }
        for data in feeds_data.values()
    ]
    return {"heatmap": heatmap_data, "timestamp": datetime.now().isoformat()}


@app.get("/api/predictions")
async def get_crowd_predictions():
    predictions = {}
    for feed_id, data_points in analytics_data.items():
        if len(data_points) >= 5:
            recent_counts = [point["count"] for point in list(data_points)[-10:]]
            avg_trend = np.mean(np.diff(recent_counts)) if len(recent_counts) > 1 else 0
            current = recent_counts[-1]
            pred_15 = max(0, int(current + avg_trend * 3))
            pred_30 = max(0, int(current + avg_trend * 6))
            risk = "high" if pred_15 >= alert_threshold else "medium" if pred_15 >= congestion_threshold else "low"

            predictions[feed_id] = {
                "feed_name": CCTV_FEEDS[feed_id]["name"],
                "current": current,
                "trend": round(float(avg_trend), 2),
                "predictions": {"15_min": pred_15, "30_min": pred_30},
                "risk_level": risk
            }
    return {"predictions": predictions, "timestamp": datetime.now().isoformat()}


@app.get("/api/export/csv")
async def export_data_csv():
    try:
        all_data = []
        for feed_id, data_points in analytics_data.items():
            for point in data_points:
                all_data.append({
                    "feed_id": feed_id,
                    "feed_name": CCTV_FEEDS[feed_id]["name"],
                    **point
                })
        df = pd.DataFrame(all_data)
        buffer = io.StringIO()
        df.to_csv(buffer, index=False)
        buffer.seek(0)
        return Response(
            content=buffer.read(),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=crowd_analytics_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
            }
        )
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.post("/api/controls/start")
async def start_monitoring():
    try:
        for processor in feed_processors.values():
            if not processor.running:
                processor.start_processing()
        return {"message": "Monitoring started", "timestamp": datetime.now().isoformat()}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.post("/api/controls/stop")
async def stop_monitoring():
    try:
        for processor in feed_processors.values():
            processor.stop_processing()
        return {"message": "Monitoring stopped", "timestamp": datetime.now().isoformat()}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.get("/api/config/thresholds")
async def get_thresholds():
    return {
        "alert_threshold": alert_threshold,
        "congestion_threshold": congestion_threshold
    }


@app.post("/api/config/thresholds")
async def update_thresholds(body: Dict[str, int] = Body(...)):
    global alert_threshold, congestion_threshold
    if "alert_threshold" in body:
        alert_threshold = int(body["alert_threshold"])
    if "congestion_threshold" in body:
        congestion_threshold = int(body["congestion_threshold"])
    return {
        "message": "Thresholds updated",
        "alert_threshold": alert_threshold,
        "congestion_threshold": congestion_threshold
    }


@app.get("/api/stream/updates")
async def stream_updates():
    def event_stream():
        while True:
            data = {
                "feeds": feeds_data,
                "timestamp": datetime.now().isoformat()
            }
            yield f"data: {json.dumps(data)}\n\n"
            time.sleep(2)
    return StreamingResponse(event_stream(), media_type="text/event-stream")


# ─────────────────────────────────────────────────────────────
# Entry Point
# ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.environ.get("PORT", 8080))
    # Disable reload in production to reduce container overhead
    reload = os.environ.get("ENV") != "production"
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=reload)