# CivicLens: Project Specification

## 1. Overview
CivicLens is a public infrastructure monitoring platform. Citizens upload photos of potholes, road cracks, drains, garbage and broken streetlights. Automatic detection identifies the issue, a transparent scoring formula sets the priority, and municipal staff manage each issue on a dashboard until it is fixed and verified.

The project focuses on follow-through: repair deadlines, photo verification of fixes, reopening, and repeat-repair tracking.

The site name is "CivicLens". Use this name in the header, page title and README. Do not use "infra-monitor" or "InfraMonitor" in any visible text.

## 2. Architecture and Tech Stack
- Monorepo with two folders:
  - backend: FastAPI, SQLAlchemy, SQLite, Pydantic, Uvicorn
  - frontend: React (Vite), React Router DOM, Tailwind CSS, lucide-react, react-leaflet, leaflet, leaflet.heat, recharts, axios, jspdf
- Detector contract (do not change):
  - Module: backend/app/services/detector.py
  - Function: detect(image_path: str) -> list[dict]
  - Output: [{"type": str, "confidence": float, "bbox": [x1, y1, x2, y2]}]
  - Allowed types: pothole, crack, drain, garbage, streetlight
  - Current state: a stub that returns one fake pothole. A teammate will replace the function body with YOLO inference. No other code may depend on how detection works internally.
- Backend serves /uploads as static files and allows CORS from http://localhost:5173.
- Frontend reads the API address from the VITE_API_URL environment variable.

## 3. Data Model
Use a single table "issues". Do not create a separate reports table.

Fields:
- id: integer primary key
- type: string (pothole, crack, drain, garbage, streetlight)
- confidence: float
- bbox: JSON list [x1, y1, x2, y2]
- image_width, image_height: integers (needed to scale boxes on the frontend)
- lat: float
- lng: float
- image_path: string
- annotated_path: string, nullable
- score: float (0 to 100)
- priority: string (High, Medium, Low)
- score_breakdown: JSON object (per factor: raw value, weight, contribution)
- status: string (Reported, In progress, Resolved, Rejected)
- duplicate_count: integer, default 1
- extra_images: JSON list of strings, default empty
- department: string
- description: text, nullable
- created_at: datetime
- resolved_at: datetime, nullable
- resolved_image_path: string, nullable
- reopened_count: integer, default 0
- due_at: datetime
- repeat_issue: boolean, default false
- linked_parent_id: integer, nullable, foreign key to issues.id

## 4. Scoring Engine
Formula:
score = type_weight * 0.35 + size_ratio * 0.25 + confidence * 0.10 + location_risk * 0.15 + duplicates * 0.15
The result is between 0 and 1 and is multiplied by 100 for display.

Type weights:
- drain: 1.0
- pothole: 0.9
- streetlight: 0.7
- garbage: 0.6
- crack: 0.5

Factor definitions:
- size_ratio = min((bbox area / image area) * 3, 1)
- duplicates = min(duplicate_count / 5, 1)
- location_risk = a function returning 0.0 for now, with a TODO to check nearby schools and hospitals through the OpenStreetMap Overpass API, with a simple in-memory cache
- All factor values are between 0 and 1 before weighting.
- Do not add factors that have no real data source (no traffic, population or age factors).

Priority thresholds:
- High: score above 65
- Medium: score above 40
- Low: score 40 or below

The scoring function returns the score, the priority, and a breakdown listing each factor with its raw value, weight and contribution. The breakdown is stored in score_breakdown.

## 5. Features
1. Report page: photo upload or camera capture, location by GPS with a manual map pin as fallback, detection result with bounding boxes, score breakdown, and a banner when the report was merged into an existing issue.
2. Duplicate merging: if a new report has the same type within 20 meters (haversine distance) of an existing unresolved issue, do not create a new row. Append the photo to extra_images, increment duplicate_count, recompute score and priority, and return the existing issue with merged set to true. If no detection is found, return detected set to false and save nothing.
3. Dashboard: map with priority-colored markers, a Markers/Heatmap toggle, filterable issue table, slide-over issue drawer, stat cards, and automatic refresh every 15 seconds.
4. Complaint letter: formal letter with date, department, subject, issue description, address (reverse geocoded through Nominatim with a User-Agent header, falling back to coordinates), map link, priority with reasons from the score breakdown, number of citizen reports, and ticket ID. If an LLM key exists in the environment, the letter may be polished with it, otherwise the plain template is used. The frontend offers preview, copy, download as PDF, and a mailto link, opened from the issue drawer.
5. Before and after verification: to resolve an issue, an after photo is required and is processed with detect(). The issue is marked Resolved only if no detection of the same type with confidence above 0.4 remains. Otherwise the status becomes In progress and the response says the issue still appears present. Citizens or staff can reopen a resolved issue, which increments reopened_count. The drawer shows a before and after comparison.
6. Accountability clock: due_at is set from priority when the issue is created or reprioritized (High: 3 days, Medium: 7 days, Low: 14 days). Unresolved issues past due_at show as Overdue with the number of days late. Area metrics (average fix time, overdue count) are calculated from the database.
7. Repeat-repair flag: if a new issue of the same type is created within 20 meters of an issue resolved in the last 90 days, set repeat_issue to true, set linked_parent_id to the earlier ticket, and show "Repeat issue" in the interface.
8. Analytics page: issues by type, issues by priority, issues over time, average resolution time, overdue count, and top hotspot areas from grid-cell grouping.
9. Seed data: backend/seed.py inserts about 40 realistic issues around the demo city with mixed types, priorities, statuses, duplicate counts and timestamps over the last 30 days, with clusters for the heatmap, and a --reset flag.

## 6. API Specification (prefix /api)
- POST /api/report (multipart: image, lat, lng, optional description)
- GET /api/issues (filters: type, priority, status)
- GET /api/issues/{id}
- PATCH /api/issues/{id} (updates status, department, description)
- POST /api/issues/{id}/complaint
- POST /api/issues/{id}/resolve (multipart: after_image)
- POST /api/issues/{id}/reopen
- GET /api/stats (totals, open, resolved, overdue, counts by type, priority and status)
- GET /api/stats/areas (per area: issue count, average fix time, overdue count)

Complaint department mapping:
- pothole and crack: Roads and Infrastructure Department
- streetlight: Electricity and Street Lighting Department
- drain: Drainage and Sewerage Department
- garbage: Solid Waste Management Department

## 7. Design Rules (mandatory for all frontend work)
- Product style: a clean, practical government or utility service, not a startup landing page.
- Light theme only. Do not build a dark mode or use dark backgrounds (no bg-slate-900, no navy).
- Colors: warm off-white background (#FAF8F5), dark slate text (#1E293B), one accent color, deep teal (#0F766E). Red, amber and green are used only for priority and status. No purple, no gradients, no glow, no glassmorphism, no colored shadows.
- Typography: one font family (Public Sans or IBM Plex Sans), normal weights. Page titles no larger than text-2xl. No oversized hero text.
- Components: buttons, inputs, badges and cards use rounded-md at most. No pill shapes (no rounded-full except circular map markers). Cards use a 1px border-slate-200 and no heavy shadows.
- Icons: lucide-react only. No emoji anywhere.
- Copy: plain, direct, written like a government service page. Do not write "AI-driven", "AI-powered", "AI Vision", "autonomous" or similar in the interface. Use "automatic detection". No taglines, no marketing phrases, no badges or status pills such as "System Active". No em dashes anywhere in UI text, code comments or README.
- Data: no fake testimonials, reviews, user counts or invented metrics. Every number shown comes from the database. Stat cards always show a number, with 0 when there is no data. No trend arrows or percentage changes unless computed from data. Seeded data gets a small "Demo data" label in the footer.
- Motion: no scroll animations, no parallax, no fade-in on scroll. Only hover and focus states and loading indicators.
- Layout: compact and information-dense. Minimal scrolling on the report page. No hero banner, no full-screen sections, no decorative, stock or generated images. Real uploaded photos only.
- Accessibility: responsive from 375px width, visible keyboard focus, sufficient contrast.

## 8. Pages and Navigation
Navigation is a top bar of plain text links with a teal underline on the active page:
- Overview (/)
- Report a problem (/report)
- Map (/map)
- Issues (/issues)
- Analytics (/analytics)
Do not rename these or invent other pages. The header shows the plain text wordmark "CivicLens" with no icon badge.

Overview: page title, one sentence describing the page, two buttons ("Report a problem" in solid teal, "View map" outlined), four stat cards (Total issues, Open, Resolved, Overdue) with values from /api/stats, then a table of the five highest-priority open issues.

Report a problem: short form (photo, location, optional description), then a result card with detected type, confidence, priority badge, ticket ID, score breakdown, and the merge banner when applicable.

Map: map with priority-colored markers and a Markers/Heatmap toggle, with a filter bar above it.

Issues: filterable table and the issue drawer (image with boxes, score breakdown, status controls, complaint letter, mark as fixed with after photo, reopen).

Analytics: the charts listed in feature 8.

Footer: shows "Demo data" only when seeded rows exist.

## 9. Working Rules for the Agent
- Read this file fully before every task and follow it exactly.
- Do not change the detector contract.
- Use the /api paths and the single issues table as written here.