from __future__ import annotations

import hashlib
import json
import os
import secrets
import sqlite3
import struct
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, ConfigDict, Field


BACKEND_DIR = Path(__file__).resolve().parent
DATA_DIR = Path(os.environ.get("LUMEN_DATA_DIR", BACKEND_DIR / ".data"))
ASSET_DIR = DATA_DIR / "assets"
DB_PATH = DATA_DIR / "lumen.sqlite3"
MAX_IFC_BYTES = 300 * 1024 * 1024
MAX_IMAGE_BYTES = 25 * 1024 * 1024
CHUNK_SIZE = 1024 * 1024


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def connect_db() -> sqlite3.Connection:
    connection = sqlite3.connect(DB_PATH, timeout=10)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def init_db() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    with connect_db() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS assets (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                kind TEXT NOT NULL CHECK (kind IN ('ifc', 'reference', 'render')),
                filename TEXT NOT NULL,
                content_type TEXT NOT NULL,
                size_bytes INTEGER NOT NULL,
                sha256 TEXT NOT NULL,
                storage_name TEXT NOT NULL UNIQUE,
                created_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS assets_project_idx ON assets(project_id);

            CREATE TABLE IF NOT EXISTS render_jobs (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                model_asset_id TEXT NOT NULL REFERENCES assets(id),
                reference_asset_id TEXT NOT NULL REFERENCES assets(id),
                model_sha256 TEXT NOT NULL,
                reference_sha256 TEXT NOT NULL,
                prompt TEXT NOT NULL,
                presentation_json TEXT NOT NULL,
                status TEXT NOT NULL CHECK (status IN ('queued', 'rendering', 'complete', 'failed')),
                result_asset_id TEXT REFERENCES assets(id),
                error TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS jobs_project_idx ON render_jobs(project_id);
            """
        )


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(title="Lumen / Field Local API", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


def asset_dict(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "project_id": row["project_id"],
        "kind": row["kind"],
        "filename": row["filename"],
        "content_type": row["content_type"],
        "size_bytes": row["size_bytes"],
        "sha256": row["sha256"],
        "url": f"/api/assets/{row['id']}/content",
        "created_at": row["created_at"],
    }


def job_dict(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "project_id": row["project_id"],
        "model_asset_id": row["model_asset_id"],
        "reference_asset_id": row["reference_asset_id"],
        "model_sha256": row["model_sha256"],
        "prompt": row["prompt"],
        "presentation": json.loads(row["presentation_json"]),
        "geometry_policy": "immutable",
        "status": row["status"],
        "result_asset_id": row["result_asset_id"],
        "result_url": f"/api/assets/{row['result_asset_id']}/content" if row["result_asset_id"] else None,
        "error": row["error"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def lookup_asset(asset_id: str) -> sqlite3.Row:
    with connect_db() as connection:
        row = connection.execute("SELECT * FROM assets WHERE id = ?", (asset_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Asset not found")
    return row


def verify_asset(row: sqlite3.Row) -> Path:
    path = ASSET_DIR / row["storage_name"]
    if not path.is_file():
        raise HTTPException(status_code=410, detail="Stored asset is missing")
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(CHUNK_SIZE), b""):
            digest.update(chunk)
    if digest.hexdigest() != row["sha256"]:
        raise HTTPException(status_code=409, detail="Asset integrity check failed")
    return path


async def store_upload(project_id: str, kind: str, upload: UploadFile) -> sqlite3.Row:
    filename = Path(upload.filename or "upload").name
    suffix = Path(filename).suffix.lower()
    if kind == "ifc" and suffix != ".ifc":
        raise HTTPException(status_code=415, detail="IFC STEP files (.ifc) are supported")
    if kind == "reference" and suffix not in {".jpg", ".jpeg", ".png", ".webp"}:
        raise HTTPException(status_code=415, detail="Use a JPG, PNG, or WebP reference image")
    if kind == "render" and suffix != ".png":
        raise HTTPException(status_code=415, detail="Render output must be a PNG")

    asset_id = secrets.token_urlsafe(18)
    storage_name = f"{asset_id}{suffix}"
    destination = ASSET_DIR / storage_name
    digest = hashlib.sha256()
    size = 0
    prefix = bytearray()
    tail = b""
    max_bytes = MAX_IFC_BYTES if kind == "ifc" else MAX_IMAGE_BYTES
    try:
        with destination.open("xb") as target:
            while chunk := await upload.read(CHUNK_SIZE):
                size += len(chunk)
                if size > max_bytes:
                    raise HTTPException(status_code=413, detail="Upload exceeds the allowed file size")
                digest.update(chunk)
                if len(prefix) < 128:
                    prefix.extend(chunk[: 128 - len(prefix)])
                tail = (tail + chunk)[-256:]
                target.write(chunk)
        if size == 0:
            raise HTTPException(status_code=400, detail="Uploaded file is empty")
        content_type = "application/x-step" if kind == "ifc" else upload.content_type or "application/octet-stream"
        if kind == "ifc" and (b"ISO-10303-21" not in prefix or b"END-ISO-10303-21" not in tail):
            raise HTTPException(status_code=422, detail="The file does not have a valid IFC STEP header and terminator")
        if kind in {"reference", "render"}:
            signature_ok = (
                (suffix in {".jpg", ".jpeg"} and prefix.startswith(b"\xff\xd8\xff"))
                or (suffix == ".png" and prefix.startswith(b"\x89PNG\r\n\x1a\n"))
                or (suffix == ".webp" and prefix.startswith(b"RIFF") and prefix[8:12] == b"WEBP")
            )
            if not signature_ok:
                raise HTTPException(status_code=415, detail="Image content does not match its file extension")
            if kind == "render" and not prefix.startswith(b"\x89PNG\r\n\x1a\n"):
                raise HTTPException(status_code=415, detail="Render output must be a valid PNG")
        os.chmod(destination, 0o444)
        created_at = now()
        with connect_db() as connection:
            connection.execute(
                """INSERT INTO assets (id, project_id, kind, filename, content_type, size_bytes, sha256, storage_name, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (asset_id, project_id, kind, filename, content_type, size, digest.hexdigest(), storage_name, created_at),
            )
            row = connection.execute("SELECT * FROM assets WHERE id = ?", (asset_id,)).fetchone()
        return row
    except Exception:
        if destination.exists():
            os.chmod(destination, 0o600)
            destination.unlink(missing_ok=True)
        raise
    finally:
        await upload.close()


class ContextObjectSettings(BaseModel):
    model_config = ConfigDict(extra="forbid")
    trees: bool = True
    shrubs: bool = True
    cars: bool = False
    grass: bool = True


class PresentationSettings(BaseModel):
    model_config = ConfigDict(extra="forbid")
    camera: Literal["isometric", "eye-level", "top"] = "isometric"
    lighting: Literal["daylight", "overcast", "golden", "blue"] = "daylight"
    material_style: Literal["source", "reference", "warm", "timber", "concrete"] = "reference"
    reference_palette: list[str] = Field(default_factory=list, max_length=8)
    environment: Literal["clear", "overcast", "golden", "blue"] = "clear"
    ground: Literal["grass", "gravel", "paving"] = "grass"
    context_objects: ContextObjectSettings = Field(default_factory=ContextObjectSettings)


class CreateRenderJob(BaseModel):
    model_config = ConfigDict(extra="forbid")
    project_id: str = Field(min_length=1, max_length=100)
    model_asset_id: str = Field(min_length=1, max_length=100)
    reference_asset_id: str = Field(min_length=1, max_length=100)
    prompt: str = Field(min_length=1, max_length=1200)
    presentation: PresentationSettings = Field(default_factory=PresentationSettings)


class CompleteRenderJob(BaseModel):
    model_config = ConfigDict(extra="forbid")
    model_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    width: int = Field(ge=1, le=8192)
    height: int = Field(ge=1, le=8192)


class FailRenderJob(BaseModel):
    model_config = ConfigDict(extra="forbid")
    error: str = Field(min_length=1, max_length=500)


@app.get("/api/health")
def health() -> dict:
    return {"ok": True, "service": "lumen-local-api", "geometry_policy": "immutable"}


@app.post("/api/projects/{project_id}/assets/model", status_code=201)
async def upload_model(project_id: str, file: UploadFile = File(...)) -> dict:
    row = await store_upload(project_id, "ifc", file)
    return asset_dict(row)


@app.post("/api/projects/{project_id}/assets/reference", status_code=201)
async def upload_reference(project_id: str, file: UploadFile = File(...)) -> dict:
    row = await store_upload(project_id, "reference", file)
    return asset_dict(row)


@app.get("/api/assets/{asset_id}")
def get_asset(asset_id: str) -> dict:
    return asset_dict(lookup_asset(asset_id))


@app.get("/api/assets/{asset_id}/content")
def get_asset_content(asset_id: str) -> FileResponse:
    row = lookup_asset(asset_id)
    path = verify_asset(row)
    return FileResponse(path, media_type=row["content_type"], filename=row["filename"] if row["kind"] != "reference" else None)


@app.post("/api/render-jobs", status_code=201)
def create_render_job(request: CreateRenderJob) -> dict:
    model = lookup_asset(request.model_asset_id)
    reference = lookup_asset(request.reference_asset_id)
    if model["kind"] != "ifc":
        raise HTTPException(status_code=415, detail="Render jobs require an IFC source model")
    if reference["kind"] != "reference":
        raise HTTPException(status_code=415, detail="Render jobs require a reference image asset")
    if model["project_id"] != request.project_id or reference["project_id"] != request.project_id:
        raise HTTPException(status_code=409, detail="Assets must belong to the requested project")
    verify_asset(model)
    verify_asset(reference)
    job_id = secrets.token_urlsafe(18)
    created_at = now()
    with connect_db() as connection:
        connection.execute(
            """INSERT INTO render_jobs
               (id, project_id, model_asset_id, reference_asset_id, model_sha256, reference_sha256,
                prompt, presentation_json, status, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'queued', ?, ?)""",
            (job_id, request.project_id, model["id"], reference["id"], model["sha256"], reference["sha256"],
             request.prompt, request.presentation.model_dump_json(), created_at, created_at),
        )
        row = connection.execute("SELECT * FROM render_jobs WHERE id = ?", (job_id,)).fetchone()
    return job_dict(row)


@app.get("/api/render-jobs/{job_id}")
def get_render_job(job_id: str) -> dict:
    with connect_db() as connection:
        row = connection.execute("SELECT * FROM render_jobs WHERE id = ?", (job_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Render job not found")
    return job_dict(row)


@app.post("/api/render-jobs/{job_id}/start")
def start_render_job(job_id: str) -> dict:
    with connect_db() as connection:
        row = connection.execute("SELECT * FROM render_jobs WHERE id = ?", (job_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Render job not found")
    if row["status"] != "queued":
        raise HTTPException(status_code=409, detail="Render job is not queued")
    model = lookup_asset(row["model_asset_id"])
    verify_asset(model)
    if model["sha256"] != row["model_sha256"]:
        raise HTTPException(status_code=409, detail="Source IFC integrity changed; job rejected")
    with connect_db() as connection:
        connection.execute("UPDATE render_jobs SET status = 'rendering', updated_at = ? WHERE id = ?", (now(), job_id))
        started_job = connection.execute("SELECT * FROM render_jobs WHERE id = ?", (job_id,)).fetchone()
    return job_dict(started_job)


@app.post("/api/render-jobs/{job_id}/fail")
def fail_render_job(job_id: str, request: FailRenderJob) -> dict:
    with connect_db() as connection:
        row = connection.execute("SELECT * FROM render_jobs WHERE id = ?", (job_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Render job not found")
    if row["status"] not in {"queued", "rendering"}:
        raise HTTPException(status_code=409, detail="Render job is not active")
    with connect_db() as connection:
        connection.execute(
            "UPDATE render_jobs SET status = 'failed', error = ?, updated_at = ? WHERE id = ?",
            (request.error, now(), job_id),
        )
        failed_job = connection.execute("SELECT * FROM render_jobs WHERE id = ?", (job_id,)).fetchone()
    return job_dict(failed_job)


@app.post("/api/render-jobs/{job_id}/complete", status_code=201)
async def complete_render_job(job_id: str, metadata: str = Form(...), image: UploadFile = File(...)) -> dict:
    try:
        complete = CompleteRenderJob.model_validate_json(metadata)
    except Exception as error:
        raise HTTPException(status_code=422, detail="Invalid render completion metadata") from error
    with connect_db() as connection:
        job = connection.execute("SELECT * FROM render_jobs WHERE id = ?", (job_id,)).fetchone()
    if job is None:
        raise HTTPException(status_code=404, detail="Render job not found")
    if job["status"] not in {"queued", "rendering"}:
        raise HTTPException(status_code=409, detail="Render job is not awaiting a result")
    source = lookup_asset(job["model_asset_id"])
    verify_asset(source)
    if complete.model_sha256 != job["model_sha256"] or complete.model_sha256 != source["sha256"]:
        raise HTTPException(status_code=409, detail="Source IFC integrity changed; result rejected")
    if Path(image.filename or "render.png").suffix.lower() != ".png":
        raise HTTPException(status_code=415, detail="Render output must be a PNG")
    row = await store_upload(job["project_id"], "render", image)
    if row["content_type"] not in {"image/png", "application/octet-stream"}:
        raise HTTPException(status_code=415, detail="Render output must be a PNG")
    output_path = verify_asset(row)
    with output_path.open("rb") as result_file:
        png_header = result_file.read(24)
        if len(png_header) != 24 or not png_header.startswith(b"\x89PNG\r\n\x1a\n") or png_header[12:16] != b"IHDR":
            raise HTTPException(status_code=415, detail="Render output is not a valid PNG")
        width, height = struct.unpack(">II", png_header[16:24])
        if (width, height) != (complete.width, complete.height):
            raise HTTPException(status_code=422, detail="PNG dimensions do not match completion metadata")
    updated_at = now()
    with connect_db() as connection:
        connection.execute(
            "UPDATE render_jobs SET status = 'complete', result_asset_id = ?, updated_at = ? WHERE id = ?",
            (row["id"], updated_at, job_id),
        )
        completed_job = connection.execute("SELECT * FROM render_jobs WHERE id = ?", (job_id,)).fetchone()
    return job_dict(completed_job)


@app.get("/api/projects/{project_id}/render-jobs")
def list_project_jobs(project_id: str) -> list[dict]:
    with connect_db() as connection:
        rows = connection.execute(
            "SELECT * FROM render_jobs WHERE project_id = ? ORDER BY created_at DESC", (project_id,)
        ).fetchall()
    return [job_dict(row) for row in rows]