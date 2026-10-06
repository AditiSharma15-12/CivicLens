from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.database import engine, Base
from app.routers import reports, issues, stats

# Create DB tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Infrastructure Monitoring System API",
    description="AI-powered public infrastructure monitoring system backend",
    version="1.0.0"
)

# Configure CORS for http://localhost:5173
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve /uploads as static files
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Include Routers
app.include_router(reports.router)
app.include_router(issues.router)
app.include_router(stats.router)

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Infrastructure Monitoring API is running"}
