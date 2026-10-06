# CivicLens

CivicLens is a public infrastructure monitoring platform built for Indore. Citizens upload a photo of a road or street problem, a YOLO model detects it, and the system scores its priority and tracks it until it is fixed and verified.

## What it does

- Detects potholes, road cracks, garbage, drains and broken streetlights from a photo
- Gives each issue a priority score from 0 to 100 with a visible breakdown of why
- Merges reports of the same problem within 20 meters into one ticket with a report count
- Sets a repair deadline from the priority and flags overdue tickets
- Verifies a fix: staff upload an after photo and the model checks the problem is gone
- Allows reopening a ticket, and flags a new issue near a spot repaired in the last 90 days as a repeat repair
- Generates a complaint letter addressed to the correct department
- Shows issues on a map, in a filterable queue, and in an analytics page

## How the AI model works

The detector is a YOLO model (Ultralytics) trained on a Roboflow dataset for 50 epochs in Google Colab. The app calls it through one function, `detect(image_path)`, in `backend/app/services/detector.py`, so the model can be replaced without changing anything else.

- Classes used by the app: pothole, road cracks (and corrugation), garbage, drains and manholes, and streetlights that are off
- Classes ignored because they are not problems: closed manholes, non-garbage, working bulbs, and the streetlight pole
- Confidence threshold: 0.25
- Strongest on potholes, cracks and garbage. Weaker on drains because the dataset has fewer examples.
- Dataset and Results: Combined infrastructure-monitoring dataset collected from Roboflow Universe, consisting of pothole, road crack/damage, and drainage/overflow images. 4522 images and A mAP 50 score of 0.628

## Priority score

score = type weight x 0.35 + size in photo x 0.25 + detection confidence x 0.10 + location risk x 0.15 + report count x 0.15

The result is shown from 0 to 100. High is above 65, Medium above 40, otherwise Low. Location risk is a placeholder for now.

## Model weights

The trained file `best.pt` is stored in this repository. 

## Tech stack

- Backend: Python, FastAPI, SQLAlchemy, SQLite, Pydantic, Pillow
- AI: YOLO (Ultralytics), Roboflow, Google Colab
- Frontend: React (Vite), Tailwind CSS, React Router, Leaflet, Recharts, lucide-react
- Maps and addresses: OpenStreetMap, Nominatim

## How to run

Backend:

```
cd backend
pip install -r requirements.txt
python seed.py
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

Frontend, in a second terminal:

```
cd frontend
npm install
npm run dev
```

App: http://localhost:5173

## Demo data

`python seed.py` adds sample issues marked as demo data. Remove them with `python clear_demo.py`.

## Limits of this version

- Early model checkpoint, with weaker drain detection
- No login or user roles
- No spam protection or photo location check
- SQLite for the prototype. A larger deployment would use PostgreSQL with PostGIS, cloud image storage, and a background job queue.

## Team

Akshat Joshi: Web application
Aditi Sharma: Model training

## License

AGPL-3.0. See the LICENSE file.
