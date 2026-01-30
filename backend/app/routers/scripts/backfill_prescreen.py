# backend/scripts/backfill_prescreen.py
from __future__ import annotations

import os
from typing import Optional

from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import Applicant

from app.ai.pdf_extract import extract_resume_text  # uses your existing pdf_extract.py
from app.ai.summarizer import summarize_prescreen
from app.ai.resume_score import score_resume_quality


def backfill_prescreen(
    *,
    limit: Optional[int] = None,
    dry_run: bool = False,
) -> None:
    db: Session = SessionLocal()
    updated = 0
    skipped = 0
    failed = 0

    try:
        q = (
            db.query(Applicant)
            .filter(
                (Applicant.ai_prescreening_summary == None)  # noqa: E711
            )
            .order_by(Applicant.id.asc())
        )

        if limit:
            q = q.limit(limit)

        applicants = q.all()
        print(f"Found {len(applicants)} applicants needing prescreen backfill...")

        for a in applicants:
            try:
                if not a.resume_path:
                    print(f"[SKIP] id={a.id} no resume_path")
                    skipped += 1
                    continue

                if not os.path.exists(a.resume_path):
                    print(f"[SKIP] id={a.id} resume file missing: {a.resume_path}")
                    skipped += 1
                    continue

                # 1) Extract resume focus text
                extracted = extract_resume_text(a.resume_path)  # returns dict
                resume_focus_text = (extracted.get("focus_text") or "").strip()

                if not resume_focus_text:
                    print(f"[SKIP] id={a.id} empty extracted focus_text")
                    skipped += 1
                    continue

                # 2) Resume-only score
                resume_score = score_resume_quality(resume_focus_text)

                # 3) Resume-only summary (no job matching required)
                prescreen_result = summarize_prescreen(
                    resume_focus_text=resume_focus_text,
                    job_title=a.applied_position,  # label only
                    match_result=None,             # IMPORTANT: resume-only mode
                )

                if dry_run:
                    print(f"[DRY RUN] id={a.id} would update summary + resume score")
                    continue

                # Save fields
                a.ai_prescreening_summary = prescreen_result.get("summary", "")
                a.ai_resume_score = resume_score.get("score")
                a.ai_resume_bucket = resume_score.get("bucket")
                a.ai_resume_score_json = resume_score  # if JSON column exists

                db.add(a)
                updated += 1

                # Commit in batches (every 25 updates)
                if updated % 25 == 0:
                    db.commit()
                    print(f"[COMMIT] updated={updated}")

            except Exception as e:
                failed += 1
                db.rollback()
                print(f"[FAIL] id={getattr(a, 'id', None)} error={e}")

        if not dry_run:
            db.commit()

        print(f"\nDONE ✅ updated={updated} skipped={skipped} failed={failed}")

    finally:
        db.close()


if __name__ == "__main__":
    # You can tweak these:
    backfill_prescreen(limit=None, dry_run=False)
