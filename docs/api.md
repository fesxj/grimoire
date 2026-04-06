# Grimoire API Reference

**Version:** 1.0.0

## Interactive docs

The live API is self-documented via OpenAPI. With the server running:

| URL | Description |
|-----|-------------|
| `http://localhost:9481/api/docs` | **Swagger UI** — interactive, try-it-out docs |
| `http://localhost:9481/api/redoc` | **ReDoc** — clean, readable reference |
| `http://localhost:9481/api/openapi.json` | Raw OpenAPI schema |

---

## Authentication

All endpoints except `/api/auth/status`, `/api/auth/setup`, and `/api/auth/login` require a JWT.

**Header** (preferred for API clients):
```
Authorization: Bearer <token>
```

**Query parameter** (required for browser-embedded images and file downloads):
```
?token=<token>
```

Tokens are returned by `/api/auth/login` and expire after **30 days**.

### Roles

| Role | Permissions |
|------|-------------|
| `admin` | Full access including user management and app settings |
| `gm` | Read + edit metadata, rescan library, manage campaigns |
| `player` | Read-only access |

---

## Endpoints

### Auth

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/auth/status` | GET | — | Check if server is initialised — returns `{"initialized": bool}` |
| `/api/auth/setup` | POST | — | First-run admin account creation. Body: `{username, password}`. Returns `{token, user}`. |
| `/api/auth/login` | POST | — | Authenticate. Body: `{username, password}`. Returns `{token, user}`. |
| `/api/auth/me` | GET | any | Current user: `{id, username, display_name, role, allow_explicit}` |

### Users *(admin only)*

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/users` | GET | List all users |
| `/api/users` | POST | Create a user. Body: `{username, password, role?}` (role defaults to `player`) |
| `/api/users/:id` | PATCH | Update role or password. Body: `{role?, password?}` |
| `/api/users/:id` | DELETE | Delete a user (cannot delete self or last admin) |
| `/api/users/me/preferences` | PATCH | Update own `display_name` or `allow_explicit` |
| `/api/users/me/password` | PATCH | Change own password. Body: `{current_password, new_password}` |
| `/api/users/me` | DELETE | Delete own account |

### Library

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/stats` | GET | JWT **or** `X-API-Key` header | Counts, page totals, library size, version |
| `/api/scan-status` | GET | any | Whether a rescan is currently running |
| `/api/rescan` | POST | gm/admin | Rescan directory and reindex PDFs |

**Stats response:**
```json
{
  "game_systems": 12,
  "books": 340,
  "maps": 1500,
  "tokens": 800,
  "indexed_books": 320,
  "total_pages": 45000,
  "total_size_mb": 18240.5,
  "version": "1.0.0"
}
```

### Game Systems

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/systems` | GET | any | List all systems with book counts |
| `/api/systems/:id` | GET | any | System detail + full book list |
| `/api/systems/:id` | PATCH | gm/admin | Update metadata: `name`, `slug`, `description`, `publishers`, `character_builder_url`, `cover_image`, `tags`, `genre` |

**Publishers format:** `[{"name": "Publisher Name", "url": "https://..."}]`

### Books

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/books` | GET | any | Paginated book list. Query: `system_id`, `category`, `limit` (max 500), `offset` |
| `/api/books/:id` | GET | any | Book detail with game system |
| `/api/books/:id` | PATCH | gm/admin | Update: `title`, `category`, `description`, `authors`, `publisher`, `publisher_url`, `year`, `is_explicit` |
| `/api/books/:id/file` | GET | any | Download/stream the file |
| `/api/books/:id/thumbnail` | GET | any | WebP cover thumbnail |
| `/api/books/:id/toc` | GET | any | PDF table of contents as `{title, page, level, children}[]` |
| `/api/books/:id/page/:num` | GET | any | Render PDF page as WebP. Query: `width` (default 1200, max 3000). Cached. |
| `/api/books/:id/page/:num/text` | GET | any | Plain text of a page (from FTS index or live extraction) |
| `/api/books/:id/page/:num/words` | GET | any | Word bounding boxes `{x0, y0, x1, y1, text}` for text overlay |

**Categories:** `core`, `supplement`, `adventure`, `character-sheet`, `map`, `handout`, `homebrew`, `starter-set`

### Maps

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/maps` | GET | any | Paginated map list. Query: `limit`, `offset`, `tag` |
| `/api/maps/:id` | GET | any | Map detail: pixel dimensions, DPI, detected grid size, tags |
| `/api/maps/:id` | PATCH | gm/admin | Update `description`, `tags`, `map_type`, `grid_size` |
| `/api/maps/:id/file` | GET | any | Download/stream the map image |
| `/api/maps/:id/thumbnail` | GET | any | WebP thumbnail |
| `/api/map-folders` | GET | any | List folder tag assignments |
| `/api/map-folders` | PATCH | gm/admin | Set tags on a folder path. Body: `{path, tags}` |

### Tokens

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/tokens` | GET | any | Paginated token list. Query: `limit`, `offset`, `tag` |
| `/api/tokens/:id` | GET | any | Token detail |
| `/api/tokens/:id` | PATCH | gm/admin | Update `description`, `tags`, `is_explicit` |
| `/api/tokens/:id/file` | GET | any | Download the token image |
| `/api/tokens/:id/thumbnail` | GET | any | WebP thumbnail |
| `/api/token-folders` | GET | any | List folder tag assignments |
| `/api/token-folders` | PATCH | gm/admin | Set tags on a folder path. Body: `{path, tags}` |

### Favorites

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/favorites` | GET | any | List current user's favorites with enriched detail |
| `/api/favorites` | POST | any | Add a favorite (idempotent). Body: `{item_type, item_id}` |
| `/api/favorites/:type/:id` | DELETE | any | Remove a favorite (silent if not found) |

Item types: `book`, `map`, `token`, `system`

### Bookmarks

Bookmarks are per-user — users cannot see or modify each other's bookmarks.

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/bookmarks?book_id=` | GET | any | List user's bookmarks for a book, sorted by page |
| `/api/bookmarks` | POST | any | Create a page or text-selection bookmark. Body: `{book_id, page_number, label?, notes?, selected_text?}` |
| `/api/bookmarks/:id` | PATCH | any | Update `label` or `notes` |
| `/api/bookmarks/:id` | DELETE | any | Delete a bookmark |

`selected_text` is `null` for page bookmarks; non-null for text-selection bookmarks.

### Search

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/search?q=` | GET | any | FTS5 full-text search. Required: `q`. Optional: `book_id`, `system_id`, `limit`. Global search also matches maps and tokens by filename. |

**Response:**
```json
{
  "results": [{"id": "uuid", "title": "...", "page_number": 42, "snippet": "...", "category": "core"}],
  "maps":    [{"id": "uuid", "filename": "...", "tags": [...]}],
  "tokens":  [{"id": "uuid", "filename": "...", "tags": [...]}]
}
```

`maps` and `tokens` are empty when `book_id` or `system_id` is provided.

### Campaigns

#### Campaign CRUD

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/campaigns` | GET | any | List own + invited campaigns |
| `/api/campaigns` | POST | any (gm/admin for `is_gm_campaign: true`) | Create campaign |
| `/api/campaigns/:id` | GET | owner or member | Campaign detail with members and resources |
| `/api/campaigns/:id` | PATCH | owner or admin | Update `name`, `description`, `gm_title`, `system_id`, `parent_campaign_id` |
| `/api/campaigns/:id` | DELETE | owner or admin | Delete campaign and all related data |

#### Members

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/campaigns/:id/invite` | POST | owner or admin | Invite a user. Body: `{user_id}` |
| `/api/campaigns/:id/members/:user_id` | PATCH | member (own) or owner | Accept/decline or set character name. Body: `{status?, character_name?}` |
| `/api/campaigns/:id/members/:user_id` | DELETE | owner, admin, or self | Remove member |
| `/api/campaigns/:id/eligible-members` | GET | owner or admin | Users eligible to be invited |

Member statuses: `invited` → `accepted` or `declined`

#### Resources

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/campaigns/resources/search` | GET | any | Search books/maps/tokens by name. Query: `q`, `resource_type?`, `limit?` |
| `/api/campaigns/:id/resources` | GET | member or owner | List linked resources (non-owners only see `shared: true`) |
| `/api/campaigns/:id/resources` | POST | owner or admin | Link a resource. Body: `{resource_type, resource_id, shared?}` |
| `/api/campaigns/:id/resources/:res_id` | PATCH | owner or admin | Toggle sharing. Body: `{shared}` |
| `/api/campaigns/:id/resources/:res_id` | DELETE | owner or admin | Unlink resource |

Resource types: `book`, `map`, `token`

#### Sessions

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/campaigns/:id/sessions` | GET | member or owner | List sessions sorted by date |
| `/api/campaigns/:id/sessions` | POST | member or owner | Create session. Body: `{session_date, title?}` (date: `YYYY-MM-DD`) |
| `/api/campaigns/:id/sessions/:sid` | GET | member or owner | Session detail with all notes. GM sees `internal_content`; members see only `external_content`. |
| `/api/campaigns/:id/sessions/:sid` | PATCH | owner or admin | Update `title` |
| `/api/campaigns/:id/sessions/:sid` | DELETE | owner or admin | Delete session and all notes |
| `/api/campaigns/:id/sessions/:sid/notes/player` | PUT | member or owner | Save own player note. Body: `{content}` |
| `/api/campaigns/:id/sessions/:sid/notes/gm` | PUT | owner or admin | Save GM notes. Body: `{internal_content?, external_content?}` |

#### Schedule

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/campaigns/:id/schedule` | GET | member or owner | Schedule definition + next 10 session dates |
| `/api/campaigns/:id/schedule` | PUT | owner or admin | Create or update schedule (GM campaigns only) |
| `/api/campaigns/:id/schedule` | DELETE | owner or admin | Remove schedule |

**Schedule body:**
```json
{
  "frequency": "weekly",
  "days": [5],
  "time_utc": "18:00",
  "biweekly_reference": "2026-01-03",
  "monthly_week": null,
  "custom_dates": null
}
```

Frequencies: `weekly`, `biweekly`, `monthly`, `custom`
`days`: weekday indices — `0` = Monday … `6` = Sunday

#### Availability

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/campaigns/:id/availability` | GET | member or owner | Availability chart for next 10 scheduled sessions |
| `/api/campaigns/:id/availability/:date` | PUT | member or owner | Set own availability. Body: `{status, is_cancelled?}` |
| `/api/campaigns/:id/availability/:date/cancel` | PUT | owner or admin | Toggle session cancellation for a date |

Availability statuses: `available`, `tentative`, `unavailable`

### Settings *(admin only)*

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/settings` | GET | Get all application settings |
| `/api/settings` | PATCH | Update application settings |
| `/api/settings/ui` | GET | UI visibility flags (any authenticated user) |
| `/api/settings/api-key/generate` | POST | Generate a stats API key |
| `/api/settings/api-key` | DELETE | Revoke the stats API key |

**Configurable settings:**

| Key | Type | Description |
|-----|------|-------------|
| `rescan_schedule_enabled` | bool | Enable automatic library rescans |
| `rescan_schedule_interval` | string | `hourly`, `daily`, or `weekly` |
| `rescan_schedule_hour` | int | UTC hour for daily/weekly rescans |
| `rescan_schedule_minute` | int | UTC minute for daily/weekly rescans |
| `rescan_schedule_weekday` | int | Weekday (0–6) for weekly rescans |
| `hide_maps` | bool | Hide the maps section in the UI |
| `hide_tokens` | bool | Hide the tokens section in the UI |
| `hide_campaigns` | bool | Hide the campaigns section in the UI |
| `show_stat_*` | bool | Toggle individual stat counters in the sidebar |

### Maintenance *(admin only)*

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/maintenance/cleanup-missing` | POST | Remove DB records for files no longer present on disk |

---

## Error responses

All errors follow FastAPI's standard format:

```json
{"detail": "Human-readable error message"}
```

| Status | Meaning |
|--------|---------|
| `400` | Bad request — validation failed or business rule violated |
| `401` | Not authenticated — missing or invalid token |
| `403` | Forbidden — insufficient role or not a campaign member |
| `404` | Resource not found |
| `409` | Conflict — duplicate (e.g. duplicate username, resource already linked) |
| `422` | Unprocessable entity — request body failed schema validation |

---

## Library directory structure

The scanner expects files organised as:

```
/library/
  books/
    {System Name}/
      core/            → category: core
      supplement/      → category: supplement
      adventure/       → category: adventure
      character-sheet/ → category: character-sheet
      map/             → category: map
      handout/         → category: handout
      homebrew/        → category: homebrew
  maps/
    {any folder structure}/
  tokens/
    {any folder structure}/
```

Game system records are created automatically from the folder names under `books/`.
