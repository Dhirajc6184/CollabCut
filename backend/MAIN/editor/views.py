# FILE PATH: backend/MAIN/editor/views.py
#
# All editor-side API endpoints:
#   POST   /api/editor/upload/                          → upload video for editing
#   POST   /api/editor/process/                         → run FFmpeg pipeline
#   GET    /api/editor/files/<filename>/                → serve upload/output files
#   GET    /api/editor/comments/<project_id>/           → list comments
#   POST   /api/editor/comments/<project_id>/           → post comment (viewers only)
#   DELETE /api/editor/comments/<project_id>/<id>/      → delete comment
#   POST   /api/editor/scene-extract/                   → start OpenCV scene job
#   GET    /api/editor/scene-extract/<job_id>/          → poll job status
#   GET    /api/editor/health/                          → server health

import os
import uuid
import subprocess
import json
import threading
from pathlib import Path

import numpy as np
import cv2

from django.conf import settings
from django.http import FileResponse, Http404
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status, serializers as drf_serializers

from .authentication import JWTAuthentication
from .models import VideoComment


# ── FFmpeg pipeline builder ────────────────────────────────────────────────────

def build_ffmpeg_command(input_path: str, output_path: str, operations: list):
    cmd = ["ffmpeg", "-y"]

    # Seek flags must come before -i for fast seeking
    for op in operations:
        if op["id"] == "trim":
            if op["vals"].get("start"):
                cmd += ["-ss", op["vals"]["start"]]
            if op["vals"].get("end"):
                cmd += ["-to", op["vals"]["end"]]

    cmd += ["-i", input_path]

    vfilters, afilters, extra = [], [], []
    has_audio = True

    for op in operations:
        op_id = op["id"]
        vals  = op.get("vals", {})

        if op_id == "trim":
            pass  # handled above
        elif op_id == "resize":
            vfilters.append(f"scale={vals.get('width', 1280)}:{vals.get('height', -1)}")
        elif op_id == "crop":
            vfilters.append(
                f"crop={vals.get('w', 720)}:{vals.get('h', 1280)}"
                f":{vals.get('x', 0)}:{vals.get('y', 0)}"
            )
        elif op_id == "text":
            vfilters.append(
                f"drawtext=text='{vals.get('text', 'Hello')}'"
                f":x={vals.get('x', 50)}:y={vals.get('y', 50)}"
                f":fontsize={vals.get('size', 40)}:fontcolor={vals.get('color', 'white')}"
            )
        elif op_id == "speed":
            factor = float(vals.get("factor", 2.0))
            vfilters.append(f"setpts={round(1 / factor, 4)}*PTS")
            afilters.append(f"atempo={factor}")
        elif op_id == "grayscale":
            vfilters.append("hue=s=0")
        elif op_id == "blur":
            vfilters.append(f"boxblur={vals.get('amount', 10)}")
        elif op_id == "brightness":
            vfilters.append(
                f"eq=brightness={vals.get('brightness', 0.1)}"
                f":contrast={vals.get('contrast', 1.2)}"
            )
        elif op_id == "rotate":
            deg_map = {"90": "1", "180": "2,transpose=2", "270": "2"}
            vfilters.append(f"transpose={deg_map.get(str(vals.get('degrees', '90')), '1')}")
        elif op_id == "audio":
            has_audio = False
        elif op_id == "volume":
            afilters.append(f"volume={vals.get('level', 2.0)}")
        elif op_id == "compress":
            extra += ["-vcodec", "libx264", "-crf", str(vals.get("crf", 28)), "-preset", "fast"]

    if vfilters:
        cmd += ["-vf", ",".join(vfilters)]
    if afilters and has_audio:
        cmd += ["-af", ",".join(afilters)]
    if not has_audio:
        cmd += ["-an"]
    cmd += extra
    cmd.append(output_path)
    return cmd


# ── Video Upload ───────────────────────────────────────────────────────────────

@api_view(["POST"])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def upload_video(request):
    """
    Upload a video file into the editor's UPLOAD_DIR.
    Only editors may upload (viewers uploaded the project video at creation time).
    Returns filename + metadata for the frontend.
    """
    if request.user.role != "editor":
        return Response(
            {"detail": "Only editors can upload to the editor."},
            status=status.HTTP_403_FORBIDDEN,
        )

    file = request.FILES.get("file")
    if not file:
        return Response({"detail": "No file provided"}, status=status.HTTP_400_BAD_REQUEST)

    ext = Path(file.name).suffix.lower()
    if ext not in [".mp4", ".mov", ".avi", ".mkv", ".webm", ".m4v"]:
        return Response({"detail": "Unsupported file type"}, status=status.HTTP_400_BAD_REQUEST)

    safe_name = f"{uuid.uuid4().hex}{ext}"
    dest      = settings.UPLOAD_DIR / safe_name

    with open(dest, "wb") as f:
        for chunk in file.chunks():
            f.write(chunk)

    # Probe metadata with ffprobe
    probe = subprocess.run(
        ["ffprobe", "-v", "quiet", "-print_format", "json",
         "-show_streams", "-show_format", str(dest)],
        capture_output=True, text=True,
    )
    duration = width = height = None
    size_mb  = round(dest.stat().st_size / (1024 * 1024), 2)

    if probe.returncode == 0:
        info = json.loads(probe.stdout)
        duration = round(float(info.get("format", {}).get("duration", 0)), 2)
        for s in info.get("streams", []):
            if s.get("codec_type") == "video":
                width, height = s.get("width"), s.get("height")
                break

    return Response({
        "filename":      safe_name,
        "original_name": file.name,
        "duration":      duration,
        "width":         width,
        "height":        height,
        "size_mb":       size_mb,
    })


# ── Video Process ──────────────────────────────────────────────────────────────

@api_view(["POST"])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def process_video(request):
    """Run the FFmpeg pipeline on a previously-uploaded video."""
    if request.user.role != "editor":
        return Response(
            {"detail": "Only editors can process videos."},
            status=status.HTTP_403_FORBIDDEN,
        )

    input_filename  = request.data.get("input_filename")
    output_filename = request.data.get("output_filename")
    operations      = request.data.get("operations", [])

    if not input_filename:
        return Response({"detail": "input_filename is required"}, status=status.HTTP_400_BAD_REQUEST)

    input_path = settings.UPLOAD_DIR / input_filename
    if not input_path.exists():
        return Response({"detail": "Input file not found"}, status=status.HTTP_404_NOT_FOUND)

    out_name = output_filename or f"output_{uuid.uuid4().hex[:8]}.mp4"
    if not out_name.endswith(".mp4"):
        out_name += ".mp4"
    output_path = settings.OUTPUT_DIR / out_name

    cmd    = build_ffmpeg_command(str(input_path), str(output_path), operations)
    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode != 0:
        return Response(
            {"detail": f"FFmpeg error: {result.stderr[-800:]}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return Response({
        "output_filename": out_name,
        "output_url":      f"/outputs/{out_name}",
        "size_mb":         round(output_path.stat().st_size / (1024 * 1024), 2),
    })


# ── Serve Files ────────────────────────────────────────────────────────────────

@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def serve_file(request, filename):
    """Serve files from UPLOAD_DIR or OUTPUT_DIR (dev-mode only)."""
    for base_dir in [settings.UPLOAD_DIR, settings.OUTPUT_DIR]:
        path = base_dir / filename
        if path.exists():
            response = FileResponse(open(path, "rb"))
            response["Access-Control-Allow-Origin"] = "*"
            return response
    raise Http404


# ── Comments ───────────────────────────────────────────────────────────────────

class _CommentInSerializer(drf_serializers.Serializer):
    timestamp_sec = drf_serializers.FloatField(min_value=0)
    text          = drf_serializers.CharField(min_length=1, max_length=2000)


def _comment_to_dict(c):
    return {
        "id":            c.id,
        "project_id":    c.project_id,
        "author":        c.author_name,
        "author_role":   c.author_role,
        "timestamp_sec": c.timestamp_sec,
        "text":          c.text,
        "created_at":    c.created_at.isoformat(),
    }


@api_view(["GET", "POST"])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def comments(request, project_id):
    """
    GET  → return all comments for the project (editors and viewers can read)
    POST → post a new comment (viewers only)
    """
    if request.method == "GET":
        qs = VideoComment.objects.filter(project_id=project_id)
        return Response([_comment_to_dict(c) for c in qs])

    # POST
    if request.user.role != "viewer":
        return Response(
            {"detail": "Only viewers can post comments."},
            status=status.HTTP_403_FORBIDDEN,
        )

    ser = _CommentInSerializer(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

    # Look up the display name from AppUser (so we store the real name)
    from app.models import AppUser
    try:
        app_user    = AppUser.objects.get(id=request.user.id)
        author_name = app_user.name
    except AppUser.DoesNotExist:
        author_name = f"user_{request.user.id}"

    comment = VideoComment.objects.create(
        project_id     = project_id,
        author_user_id = request.user.id,
        author_name    = author_name,
        author_role    = request.user.role,
        timestamp_sec  = ser.validated_data["timestamp_sec"],
        text           = ser.validated_data["text"],
    )
    return Response(_comment_to_dict(comment), status=status.HTTP_201_CREATED)


@api_view(["DELETE"])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def comment_detail(request, project_id, comment_id):
    """
    DELETE → editors can remove any comment; viewers can only remove their own.
    """
    try:
        comment = VideoComment.objects.get(id=comment_id, project_id=project_id)
    except VideoComment.DoesNotExist:
        return Response({"detail": "Comment not found"}, status=status.HTTP_404_NOT_FOUND)

    if request.user.role == "editor" or comment.author_user_id == request.user.id:
        comment.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    return Response(
        {"detail": "Viewers can only delete their own comments."},
        status=status.HTTP_403_FORBIDDEN,
    )


# ── Scene Extraction ───────────────────────────────────────────────────────────

SCENE_JOBS = {}      # in-memory job store; fine for a hackathon
NUM_SCENES = 3
MAX_PCT    = 50      # extract at most 50% of video duration


def _fmt_time(seconds):
    seconds = int(round(seconds))
    m, s    = divmod(seconds, 60)
    return f"{m}m {s:02d}s" if m else f"{s}s"


def _analyse_video(job_id, filepath):
    """Background thread: runs OpenCV frame analysis and stores result in SCENE_JOBS."""
    try:
        SCENE_JOBS[job_id]["status"] = "opening"
        cap = cv2.VideoCapture(filepath)
        if not cap.isOpened():
            SCENE_JOBS[job_id] = {"status": "error", "message": "Could not open video."}
            return

        fps          = cap.get(cv2.CAP_PROP_FPS) or 25
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration     = total_frames / fps
        max_secs     = duration * MAX_PCT / 100

        SCENE_JOBS[job_id].update({"status": "scanning", "duration": round(duration, 2)})

        step      = max(1, int(fps * 0.5), total_frames // 800)
        prev_gray = None
        raw_scores = []

        for fi in range(0, total_frames, step):
            cap.set(cv2.CAP_PROP_POS_FRAMES, fi)
            ret, frame = cap.read()
            if not ret:
                break
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            gray = cv2.resize(gray, (160, 90))
            if prev_gray is not None:
                motion   = float(np.mean(cv2.absdiff(gray, prev_gray)))
                edges    = cv2.Canny(gray, 50, 150)
                edge_den = float(np.mean(edges)) / 255.0 * 30
                bvar     = float(np.std(gray)) / 128.0 * 20
                raw_scores.append((fi, motion * 0.5 + edge_den + bvar))
            prev_gray = gray

        cap.release()

        if not raw_scores:
            SCENE_JOBS[job_id] = {"status": "error", "message": "No frames analysed."}
            return

        SCENE_JOBS[job_id]["status"] = "selecting"

        win      = max(1, len(raw_scores) // 30)
        smoothed = []
        for i, (fi, sc) in enumerate(raw_scores):
            lo = max(0, i - win)
            hi = min(len(raw_scores), i + win + 1)
            smoothed.append((fi, float(np.mean([s[1] for s in raw_scores[lo:hi]]))))

        vals = [s[1] for s in smoothed]
        mn, mx = min(vals), max(vals)
        if mx == mn:
            mx = mn + 1
        normed = [(fi, (sc - mn) / (mx - mn)) for fi, sc in smoothed]

        min_gap     = max(3, int(fps * max(4, duration / (NUM_SCENES * 2))))
        gap_samples = max(1, min_gap // step)

        all_peaks = []
        for i, (fi, sc) in enumerate(normed):
            lo   = max(0, i - gap_samples)
            hi   = min(len(normed), i + gap_samples + 1)
            best = max(normed[lo:hi], key=lambda x: x[1])
            if best[0] == fi and sc > 0.1:
                all_peaks.append((fi, sc))

        all_peaks.sort(key=lambda x: -x[1])
        top_peaks = all_peaks[:NUM_SCENES]

        while len(top_peaks) < NUM_SCENES:
            existing = [p[0] for p in top_peaks]
            for i in range(NUM_SCENES):
                candidate = int((i + 0.5) / NUM_SCENES * total_frames)
                if not any(abs(candidate - e) < min_gap for e in existing):
                    top_peaks.append((candidate, 0.5))
                    existing.append(candidate)
                    break

        top_peaks.sort(key=lambda x: x[0])

        per_budget = max_secs / NUM_SCENES
        scenes     = []
        for fi, sc in top_peaks:
            ts    = fi / fps
            ideal = max(4.0, min(per_budget * 1.3, 45.0))
            start = round(max(0.0,      ts - ideal / 2), 2)
            end   = round(min(duration, ts + ideal / 2), 2)
            scenes.append({
                "start":     start,
                "end":       end,
                "duration":  round(end - start, 2),
                "peak_time": round(ts, 2),
                "score":     round(sc * 10, 1),
            })

        for i in range(1, len(scenes)):
            if scenes[i]["start"] < scenes[i - 1]["end"] + 0.5:
                scenes[i]["start"] = round(scenes[i - 1]["end"] + 0.5, 2)
                scenes[i]["end"]   = round(scenes[i]["start"] + scenes[i]["duration"], 2)

        total = sum(s["duration"] for s in scenes)
        if total > max_secs:
            ratio = max_secs / total
            for s in scenes:
                s["duration"] = round(s["duration"] * ratio, 2)
                s["end"]      = round(s["start"] + s["duration"], 2)

        total_extracted = round(sum(s["duration"] for s in scenes), 2)
        pct_used        = round(total_extracted / duration * 100, 1)

        score_order = sorted(range(NUM_SCENES), key=lambda i: -scenes[i]["score"])
        ranks = ["🥇 Best Scene", "🥈 2nd Best", "🥉 3rd Best"]
        for rank_pos, scene_idx in enumerate(score_order):
            scenes[scene_idx]["rank"] = ranks[rank_pos]

        SCENE_JOBS[job_id] = {
            "status":              "done",
            "duration":            round(duration, 2),
            "duration_fmt":        _fmt_time(duration),
            "fps":                 round(fps, 1),
            "scenes":              scenes,
            "total_extracted":     total_extracted,
            "total_extracted_fmt": _fmt_time(total_extracted),
            "pct_used":            pct_used,
        }

    except Exception as e:
        SCENE_JOBS[job_id] = {"status": "error", "message": str(e)}


@api_view(["POST"])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def scene_extract(request):
    if request.user.role != "editor":
        return Response(
            {"detail": "Only editors can run scene extraction."},
            status=status.HTTP_403_FORBIDDEN,
        )

    filename = request.data.get("filename")
    if not filename:
        return Response({"detail": "filename is required"}, status=status.HTTP_400_BAD_REQUEST)

    filepath = settings.UPLOAD_DIR / filename
    if not filepath.exists():
        return Response(
            {"detail": "File not found. Upload the video first."},
            status=status.HTTP_404_NOT_FOUND,
        )

    job_id = str(uuid.uuid4())
    SCENE_JOBS[job_id] = {"status": "queued"}
    threading.Thread(
        target=_analyse_video, args=(job_id, str(filepath)), daemon=True
    ).start()
    return Response({"job_id": job_id}, status=status.HTTP_202_ACCEPTED)


@api_view(["GET"])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def scene_extract_status(request, job_id):
    job = SCENE_JOBS.get(job_id)
    if job is None:
        return Response({"detail": "Job not found"}, status=status.HTTP_404_NOT_FOUND)
    return Response(job)


# ── Health ─────────────────────────────────────────────────────────────────────

@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def health(request):
    import shutil
    return Response({
        "status": "ok",
        "ffmpeg": shutil.which("ffmpeg") is not None,
    })