"""In-app character sheet handlers: read/write AcroForm fields and duplicate
a blank form-fillable sheet from the library or a campaign file.

These complement the upload/download/delete handlers in `uploads.py`. A member's
sheet lives at DATA_PATH/campaign_uploads/sheets/{member_id}.{ext}; for in-app
editing it must be a form-fillable PDF (AcroForm widgets).
"""

import os
import shutil
import tempfile

from fastapi import Body, Depends, HTTPException

from ...auth import CurrentUser, get_current_user
from ...config import SessionLocal
from ...models import Book, CampaignFile
from ._helpers import can_view, get_campaign_or_404
from .uploads import (
    _FILES_DIR,
    _MAX_SHEET_BYTES,
    _SHEET_DIR,
    _assert_can_edit_member,
    _get_member_or_404,
    _remove_existing,
)

# Map PyMuPDF widget field types to a small, frontend-friendly vocabulary.
_FIELD_TYPE_NAMES = {
    "text": "text",
    "checkbox": "checkbox",
    "radiobutton": "radio",
    "combobox": "combobox",
    "listbox": "listbox",
}


def _member_sheet_pdf_path(member) -> str:
    """Disk path of the member's sheet if it is a PDF, else raise 400/404."""
    if not member.character_sheet_path:
        raise HTTPException(404, "No sheet")
    if not member.character_sheet_path.lower().endswith(".pdf"):
        raise HTTPException(400, "Character sheet is not a PDF")
    path = os.path.join(_SHEET_DIR, member.character_sheet_path)
    if not os.path.isfile(path):
        raise HTTPException(404, "No sheet")
    return path


def _field_type(widget) -> str:
    """Normalize a widget's field type to our vocabulary (empty if unsupported)."""
    raw = (widget.field_type_string or "").lower()
    return _FIELD_TYPE_NAMES.get(raw, "")


def _read_fields(path: str) -> list:
    """Return the AcroForm fields of a PDF as a list of dicts (may be empty)."""
    import fitz  # PyMuPDF

    fields = []
    seen = set()
    doc = fitz.open(path)
    try:
        for page in doc:
            for w in page.widgets() or []:
                name = w.field_name
                if not name or name in seen:
                    continue
                ftype = _field_type(w)
                if not ftype:
                    continue
                seen.add(name)
                value = w.field_value
                if ftype == "checkbox":
                    value = bool(value) and str(value).lower() not in ("off", "no", "false", "0")
                field = {"name": name, "type": ftype, "value": value}
                if ftype in ("combobox", "listbox", "radio"):
                    opts = w.choice_values if ftype != "radio" else None
                    if opts:
                        # choice_values entries may be [export, display] pairs.
                        field["options"] = [
                            o[0] if isinstance(o, (list, tuple)) else o for o in opts
                        ]
                fields.append(field)
    finally:
        doc.close()
    return fields


def get_member_sheet_fields(
    campaign_id: str,
    member_id: str,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Return whether the member's sheet is a fillable PDF and its form fields."""
    db = SessionLocal()
    try:
        c = get_campaign_or_404(db, campaign_id)
        member = _get_member_or_404(db, campaign_id, member_id)
        _assert_can_edit_member(c, member, current_user)

        if not member.character_sheet_path or not member.character_sheet_path.lower().endswith(
            ".pdf"
        ):
            return {"fillable": False, "fields": []}
        path = os.path.join(_SHEET_DIR, member.character_sheet_path)
        if not os.path.isfile(path):
            return {"fillable": False, "fields": []}

        fields = _read_fields(path)
        return {"fillable": bool(fields), "fields": fields}
    finally:
        db.close()


def save_member_sheet_fields(
    campaign_id: str,
    member_id: str,
    fields: dict = Body(..., embed=True),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Write field values back into the member's PDF and return the new state."""
    import fitz  # PyMuPDF

    db = SessionLocal()
    try:
        c = get_campaign_or_404(db, campaign_id)
        member = _get_member_or_404(db, campaign_id, member_id)
        _assert_can_edit_member(c, member, current_user)
        path = _member_sheet_pdf_path(member)

        doc = fitz.open(path)
        try:
            changed = False
            for page in doc:
                for w in page.widgets() or []:
                    name = w.field_name
                    if name in fields:
                        value = fields[name]
                        if w.field_type_string and w.field_type_string.lower() == "checkbox":
                            # Checkboxes take their "on" state name or "Off".
                            states = (w.button_states() or {}).get("normal") or []
                            on_state = next((s for s in states if s != "Off"), "Yes")
                            w.field_value = on_state if value else "Off"
                        else:
                            w.field_value = "" if value is None else str(value)
                        w.update()
                        changed = True
            if changed:
                fd, tmp = tempfile.mkstemp(suffix=".pdf", dir=_SHEET_DIR)
                os.close(fd)
                doc.save(tmp, garbage=3, deflate=True)
                doc.close()
                os.replace(tmp, path)
            else:
                doc.close()
        except Exception:
            doc.close()
            raise

        return {"fillable": True, "fields": _read_fields(path)}
    finally:
        db.close()


def duplicate_member_sheet(
    campaign_id: str,
    member_id: str,
    source_type: str = Body(...),
    source_id: str = Body(...),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Copy a blank library book or campaign file PDF into the member's sheet slot."""
    db = SessionLocal()
    try:
        c = get_campaign_or_404(db, campaign_id)
        member = _get_member_or_404(db, campaign_id, member_id)
        _assert_can_edit_member(c, member, current_user)

        if source_type == "book":
            book = db.query(Book).filter_by(id=source_id).first()
            if not book:
                raise HTTPException(404, "Book not found")
            src_path = book.filepath
            src_name = book.filename or os.path.basename(book.relative_path)
        elif source_type == "file":
            cf = db.query(CampaignFile).filter_by(id=source_id, campaign_id=campaign_id).first()
            if not cf:
                raise HTTPException(404, "File not found")
            src_path = os.path.join(_FILES_DIR, cf.stored_path)
            src_name = cf.filename
        else:
            raise HTTPException(400, "Invalid source type")

        if not src_name.lower().endswith(".pdf"):
            raise HTTPException(400, "Source is not a PDF")
        if not os.path.isfile(src_path):
            raise HTTPException(404, "Source file not found")
        if os.path.getsize(src_path) > _MAX_SHEET_BYTES:
            raise HTTPException(413, "Source file is too large")

        _remove_existing(_SHEET_DIR, member_id)
        filename = f"{member_id}.pdf"
        shutil.copyfile(src_path, os.path.join(_SHEET_DIR, filename))

        member.character_sheet_path = filename
        member.character_sheet_filename = src_name
        member.character_sheet_url = None
        db.commit()
        return {
            "character_sheet_path": filename,
            "character_sheet_filename": src_name,
        }
    finally:
        db.close()


def list_sheet_sources(
    campaign_id: str, current_user: CurrentUser = Depends(get_current_user)
):
    """List blank sheets a member can duplicate: library character-sheet books +
    campaign PDF files."""
    db = SessionLocal()
    try:
        c = get_campaign_or_404(db, campaign_id)
        if not can_view(c, current_user, db):
            raise HTTPException(403, "Not a member of this campaign")

        q = db.query(Book).filter(Book.category == "character-sheet")
        if c.system_id:
            q = q.filter(Book.game_system_id == c.system_id)
        books = [
            {"id": b.id, "name": b.title or os.path.basename(b.relative_path)}
            for b in q.order_by(Book.title).all()
            if b.relative_path.lower().endswith(".pdf")
        ]

        files = [
            {"id": f.id, "name": f.filename}
            for f in db.query(CampaignFile)
            .filter_by(campaign_id=campaign_id)
            .order_by(CampaignFile.filename)
            .all()
            if (f.mime_type or "").lower() == "application/pdf"
            or f.filename.lower().endswith(".pdf")
        ]

        return {"books": books, "files": files}
    finally:
        db.close()
