# CI/CD Pipelines

Grimoire uses three GitHub Actions workflows. Docker images are published to the
GitHub Container Registry (GHCR) at `ghcr.io/<your-username>/grimoire`.

---

## Workflows at a glance

| Workflow | Trigger | Produces |
|---|---|---|
| **CI** | Push to any branch except `master`, or PR targeting `master` | Build validation (no image published) |
| **Prerelease** | Push to `master` | `:dev` + `:dev-<sha>` Docker image |
| **Release** | Manual (`workflow_dispatch`) | `:<version>` + `:latest` Docker image + GitHub Release |

---

## CI (`ci.yml`)

Runs on every feature branch push and on pull requests before they can merge.
Validates that nothing is broken without publishing anything.

**What it checks:**
- Frontend: `npm ci` + `npm run build` (catches TypeScript/JSX errors and broken imports)
- Backend: `pip install` + a quick import check (catches missing dependencies and syntax errors)

**You don't need to do anything** — this runs automatically. If it's red, the branch
has a build problem that should be fixed before merging.

---

## Prerelease (`prerelease.yml`)

Runs automatically every time you push to `master`.

**What it produces:**
- `ghcr.io/<you>/grimoire:dev` — always points to the latest master build
- `ghcr.io/<you>/grimoire:dev-<full-sha>` — pinned to the exact commit, useful for rollbacks

**To pull and run the latest dev build:**
```bash
docker pull ghcr.io/<you>/grimoire:dev
docker run -p 9481:9481 \
  -v ./library:/library:ro \
  -v grimoire_data:/data \
  ghcr.io/<you>/grimoire:dev
```

> The image is stored in GHCR, which is private by default. See
> [Making packages public](https://docs.github.com/en/packages/learn-github-packages/configuring-a-packages-access-control-and-visibility)
> if you want anyone to be able to pull without authentication.

---

## Release (`release.yml`)

A **manual** workflow. Run it when you're ready to cut a stable release.

### How to trigger a release

1. Go to **Actions → Release** in the GitHub UI.
2. Click **Run workflow**.
3. Fill in the inputs:
   - **Version** — semver without the `v` prefix (e.g. `0.0.2`). Must match `X.Y.Z`.
   - **Notes** *(optional)* — markdown release notes. GitHub will also auto-generate
     a changelog from merged PRs and commits since the last release.
4. Click **Run workflow**.

### What it does

1. Validates the version string format.
2. Creates and pushes a git tag `v<version>` on the current `master` HEAD.
3. Builds the Docker image using the multi-stage Dockerfile.
4. Pushes two tags to GHCR:
   - `ghcr.io/<you>/grimoire:<version>` (e.g. `:0.0.2`) — pinned, never changes
   - `ghcr.io/<you>/grimoire:latest` — always points to the newest release
5. Creates a GitHub Release with the tag, your notes, and auto-generated changelog.

### To pull a specific release

```bash
docker pull ghcr.io/<you>/grimoire:0.0.1
```

### docker-compose (production)

```yaml
services:
  grimoire:
    image: ghcr.io/<you>/grimoire:latest   # or pin to a version
    restart: unless-stopped
    ports:
      - "9481:9481"
    volumes:
      - ./library:/library:ro
      - grimoire_data:/data
    environment:
      - LIBRARY_PATH=/library
      - DATA_PATH=/data

volumes:
  grimoire_data:
```

---

## Version history

| Version | Notes |
|---|---|
| 0.0.1 | Initial release — self-hosted TTRPG library with PDF reader, full-text search, and map gallery |

---

## Versioning convention

Grimoire follows [Semantic Versioning](https://semver.org/):

- **PATCH** (`0.0.x`) — bug fixes, dependency bumps, small tweaks
- **MINOR** (`0.x.0`) — new features, backwards-compatible
- **MAJOR** (`x.0.0`) — breaking changes (config format, API, data migration required)

While the project is `0.x`, minor bumps may include breaking changes — treat every
release as potentially requiring a data migration or config review until `1.0.0`.
