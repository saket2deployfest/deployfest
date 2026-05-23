# Crowd Monitoring API 🚦👥

A FastAPI-based CCTV Crowd Monitoring System that uses YOLOv8 (Ultralytics) for real-time person detection and provides REST APIs for analytics, alerts, predictions, and heatmaps.  
It can stream video, capture snapshots, analyze congestion, and export reports.

---

## ✨ Features

- 🔍 **Person Detection** using YOLOv8 (with OpenCV fallback detector)
- 📹 **CCTV Feed Management** – multiple feed sources (URLs or local files)
- 📊 **Analytics & Reports** – density, congestion, trends, predictions
- 🚨 **Alerts** – configurable congestion and alert thresholds
- 🔄 **Live Updates** – SSE-based feed updates (`/api/stream/updates`)
- 🌍 **Heatmap & Geo Data** – visualize crowd intensity at different locations
- 📑 **CSV Export** – download historical crowd analytics

---

## 📂 Project Structure

```
.
├── app.py              # Main FastAPI application
├── requirements.txt    # Python dependencies
└── README.md          # Documentation
```

---

## ⚙️ Requirements

- Python **3.9+**
- FastAPI
- Uvicorn
- OpenCV
- Ultralytics YOLOv8

Install dependencies:

```bash
pip install -r requirements.txt
```

Example `requirements.txt`:

```txt
fastapi
uvicorn
opencv-python
pandas
numpy
torch
ultralytics
requests
```

---

## 🚀 Running the Application

Start the API server:

```bash
uvicorn app:app --host 0.0.0.0 --port 5000 --reload
```

The API will be available at:
👉 http://localhost:5000

Swagger UI docs:
👉 http://localhost:5000/docs

---

## 🎥 CCTV Feed Configuration

Feeds are defined inside `CCTV_FEEDS` in `app.py`:

```python
CCTV_FEEDS = {
    "feed_1": {
        "name": "Main Entrance",
        "url": "https://example.com/video.mp4",
        "location": {"lat": 28.6139, "lng": 77.2090},
        "area": "entrance",
        "max_capacity": 50
    },
    # ... add more feeds
}
```

You can add or replace feeds with RTSP, HTTP, or local video file paths.

---

## 📡 API Endpoints

### 🔎 Health & Config

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Check API & active feeds |
| `GET` | `/api/video/health/{feed_id}` | Check if a feed is accessible |
| `GET` | `/api/config/thresholds` | Get thresholds |
| `POST` | `/api/config/thresholds` | Update thresholds |

### 📹 Video & Feeds

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/feeds` | Get all feeds summary |
| `GET` | `/api/feeds/{feed_id}` | Feed details + analytics |
| `GET` | `/api/video/stream/{feed_id}` | Live video stream |
| `GET` | `/api/video/snapshot/{feed_id}` | Capture snapshot |
| `GET` | `/api/video/info` | Video metadata |

### 📊 Analytics & Reports

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/analytics/summary` | Overall analytics & trends |
| `GET` | `/api/alerts` | Alerts (all feeds) |
| `GET` | `/api/heatmap` | Heatmap-ready data |
| `GET` | `/api/predictions` | 15-min & 30-min crowd forecasts |
| `GET` | `/api/export/csv` | Download CSV report |

### ⚡ Monitoring Controls

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/controls/start` | Start monitoring feeds |
| `POST` | `/api/controls/stop` | Stop monitoring feeds |

### 🔄 Streaming Updates

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/stream/updates` | Server-Sent Events (SSE) with live feed updates |

---

## 📊 Example API Response

**GET** `/api/feeds`

```json
{
  "feeds": {
    "feed_1": {
      "name": "Main Entrance",
      "current_count": 12,
      "max_capacity": 50,
      "density_percentage": 24.0,
      "alert_level": "normal",
      "last_updated": "2025-09-17T12:00:00",
      "location": {"lat": 28.6139, "lng": 77.2090},
      "area": "entrance"
    }
  },
  "total_count": 12,
  "timestamp": "2025-09-17T12:00:00"
}
```

---

## 🛠️ Notes

- If YOLO fails to load, a lightweight OpenCV fallback detector is used
- Videos can be looped or live-streamed
- Thresholds (`alert_threshold`, `congestion_threshold`) can be tuned via API

---

## 📌 Roadmap

- ✅ Real-time crowd counting
- ✅ Predictions for 15 & 30 mins
- ⏳ Add database storage for long-term analytics
- ⏳ Add dashboard UI (heatmap + charts)
- ⏳ Deploy on Docker + Cloud

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---
