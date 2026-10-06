# infra-monitor

AI-Powered Public Infrastructure Monitoring System with FastAPI backend and Vite + React + Tailwind frontend.

## Project Architecture & Tech Stack
- **Backend**: Python 3.10+, FastAPI, SQLAlchemy, SQLite, Pydantic v2, Uvicorn
- **Frontend**: React, Vite, React Router DOM, Tailwind CSS, Leaflet / React-Leaflet, Recharts, Lucide Icons, Axios

---

## Directory Structure
```
infra-monitor/
├── PROJECT_SPEC.md
├── README.md
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── database.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── routers/
│   │   │   ├── reports.py
│   │   │   ├── issues.py
│   │   │   └── stats.py
│   │   └── services/
│   │       ├── detector.py       # Standardized detector contract [detect(image_path)]
│   │       ├── scoring.py        # Explainable priority calculation engine
│   │       ├── duplicates.py     # Geospatial duplicate issue aggregator
│   │       ├── complaint.py      # Municipal complaint text generator
│   │       └── verification.py   # AI verification service
│   ├── uploads/                  # Static file storage
│   ├── seed.py                   # DB Seed script
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── api.js
    │   ├── App.jsx
    │   ├── index.css
    │   └── components/
    │       ├── Navbar.jsx
    │       ├── Overview.jsx
    │       ├── CitizenReport.jsx
    │       ├── IssueMap.jsx
    │       ├── IssueQueue.jsx
    │       └── Analytics.jsx
    ├── package.json
    ├── tailwind.config.js
    └── vite.config.js
```

---

## AI Detector Contract
Located at `backend/app/services/detector.py`:
```python
def detect(image_path: str) -> list[dict]:
    """
    Contract: returns list[{"type": str, "confidence": float, "bbox": [x1, y1, x2, y2]}]
    """
```
Currently implemented as a stub returning fake pothole detections, ready to be replaced with a YOLO / PyTorch model.

---

## How to Run

Both backend and frontend can be started with **one command each**:

### 1. Start the Backend API Server
In a terminal, navigate to the `backend` directory:
```bash
cd backend
pip install -r requirements.txt
python seed.py
uvicorn app.main:app --reload --port 8000
```
- API Docs will be available at: [http://localhost:8000/docs](http://localhost:8000/docs)
- Static files served under `/uploads`

### 2. Start the Frontend App
In a separate terminal, navigate to the `frontend` directory:
```bash
cd frontend
npm install
npm run dev
```
- Frontend application will be live at: [http://localhost:5173](http://localhost:5173)

---

## Verification & Features
1. **Citizen Incident Reporting**: Upload photos of potholes, road damage, garbage, or broken streetlights with GPS coords.
2. **Explainable Priority Scoring**: Dynamic 0-100 score with full textual breakdown.
3. **Geospatial Leaflet Mapping**: View issues as markers or intensity radius circles.
4. **Authority Queue & Complaint Generator**: Update issue status (Open, In Progress, Resolved) and generate municipal complaints.
5. **Recharts Analytics Dashboard**: Category and status breakdowns.
