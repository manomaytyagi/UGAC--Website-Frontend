# UGAC Backend API Reference

**Base URL:** `https://ugac-backend-latest.onrender.com`

> All API endpoints are **public** (no auth required). Only the admin panel (`/admin`) needs a login.

**Quick checks:**
```bash
curl https://ugac-backend-latest.onrender.com/
curl https://ugac-backend-latest.onrender.com/health
```

**Admin panel:** `https://ugac-backend-latest.onrender.com/admin`

---

## Table of Contents

1. [Departments](#1-departments)
2. [Branches](#2-branches)
3. [Courses](#3-courses)
4. [Curricula](#4-curricula)
5. [Faculty](#5-faculty)
6. [Announcements](#6-announcements)
7. [Resources](#7-resources)
8. [Procedures](#8-procedures)
9. [Course Reviews](#9-course-reviews)
10. [Team](#10-team)
11. [Search](#11-search)
12. [File Storage](#12-file-storage)
13. [Redis Caching](#13-redis-caching)
14. [Error Handling](#14-error-handling)

---

## 1. Departments

### GET `/departments/` — List all departments

```bash
curl "https://ugac-backend-latest.onrender.com/departments/"
curl "https://ugac-backend-latest.onrender.com/departments/?skip=0&limit=10"
```

**Response:**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "code": "CSE",
    "name": "Computer Science & Engineering",
    "description": "Department of CSE",
    "created_at": "2026-06-10T00:00:00+00:00",
    "updated_at": "2026-06-10T00:00:00+00:00"
  }
]
```

### GET `/departments/{id}` — Get one department

```bash
curl "https://ugac-backend-latest.onrender.com/departments/550e8400-e29b-41d4-a716-446655440000"
```

**Response:** Same shape as a single item above. Returns `404` if not found.

### POST `/departments/` — Create department

```bash
curl -X POST "https://ugac-backend-latest.onrender.com/departments/" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "ECE",
    "name": "Electronics & Communication Engineering",
    "description": "Department of ECE"
  }'
```

**Body fields:**

| Field | Type | Required |
|---|---|---|
| `code` | string (max 20) | ✅ |
| `name` | string (max 200) | ✅ |
| `description` | string \| null | ❌ |

**Status codes:** `201` created, `409` if code already exists.

### PATCH `/departments/{id}` — Update department

```bash
curl -X PATCH "https://ugac-backend-latest.onrender.com/departments/550e8400-e29b-41d4-a716-446655440000" \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Department Name"}'
```

All fields optional. Returns `404` if not found.

### DELETE `/departments/{id}` — Delete department

```bash
curl -X DELETE "https://ugac-backend-latest.onrender.com/departments/550e8400-e29b-41d4-a716-446655440000"
```

Returns `204` (no body) on success, `404` if not found.

---

## 2. Branches

### GET `/branches/` — List branches

```bash
# All branches
curl "https://ugac-backend-latest.onrender.com/branches/"

# Filter by department
curl "https://ugac-backend-latest.onrender.com/branches/?department_id=550e8400-e29b-41d4-a716-446655440000"

# Paginated
curl "https://ugac-backend-latest.onrender.com/branches/?skip=0&limit=20"
```

**Response:**
```json
[
  {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "code": "CSE-BT",
    "name": "B.Tech in CSE",
    "department_id": "550e8400-e29b-41d4-a716-446655440000",
    "degree_type": "btech",
    "is_active": true,
    "created_at": "2026-06-10T00:00:00+00:00",
    "updated_at": "2026-06-10T00:00:00+00:00"
  }
]
```

### GET `/branches/{id}` — Get one branch

```bash
curl "https://ugac-backend-latest.onrender.com/branches/660e8400-e29b-41d4-a716-446655440001"
```

### POST `/branches/` — Create branch

```bash
curl -X POST "https://ugac-backend-latest.onrender.com/branches/" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "ECE-BT",
    "name": "B.Tech in ECE",
    "department_id": "550e8400-e29b-41d4-a716-446655440000",
    "degree_type": "btech",
    "is_active": true
  }'
```

**Body fields:**

| Field | Type | Required |
|---|---|---|
| `code` | string (max 20) | ✅ |
| `name` | string (max 200) | ✅ |
| `department_id` | UUID | ✅ |
| `degree_type` | string (max 20) | ✅ |
| `is_active` | bool | ❌ (default `true`) |

Returns `409` if code already exists.

### PATCH `/branches/{id}` / DELETE `/branches/{id}`

Same pattern as departments. All PATCH fields optional. DELETE returns `204`.

---

## 3. Courses

### GET `/courses/` — List courses

```bash
# All courses
curl "https://ugac-backend-latest.onrender.com/courses/"

# Filter by department
curl "https://ugac-backend-latest.onrender.com/courses/?department_id=550e8400-e29b-41d4-a716-446655440000"

# Search by code/name
curl "https://ugac-backend-latest.onrender.com/courses/?search=CS"

# Paginated
curl "https://ugac-backend-latest.onrender.com/courses/?skip=0&limit=50"
```

**Response:**
```json
[
  {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "code": "CS101",
    "name": "Introduction to Programming",
    "credits": 4,
    "lecture_hours": 3.0,
    "tutorial_hours": 1.0,
    "practical_hours": 0.0,
    "department_id": "550e8400-e29b-41d4-a716-446655440000",
    "syllabus_url": null,
    "extra_data": null,
    "created_at": "2026-06-10T00:00:00+00:00",
    "updated_at": "2026-06-10T00:00:00+00:00"
  }
]
```

### GET `/courses/lite` — Lightweight list (id, code, name, credits, hours only)

```bash
curl "https://ugac-backend-latest.onrender.com/courses/lite"
```

Useful for dropdowns. No pagination, no Redis caching — always fresh.

### GET `/courses/{id}` — Get one course

```bash
curl "https://ugac-backend-latest.onrender.com/courses/770e8400-e29b-41d4-a716-446655440002"
```

### POST `/courses/` — Create course

```bash
curl -X POST "https://ugac-backend-latest.onrender.com/courses/" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "CS101",
    "name": "Introduction to Programming",
    "credits": 4,
    "lecture_hours": 3.0,
    "tutorial_hours": 1.0,
    "practical_hours": 0.0,
    "department_id": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

**Body fields:**

| Field | Type | Required |
|---|---|---|
| `code` | string (max 20) | ✅ |
| `name` | string (max 300) | ✅ |
| `credits` | integer (0–30) | ✅ |
| `lecture_hours` | float | ❌ |
| `tutorial_hours` | float | ❌ |
| `practical_hours` | float | ❌ |
| `department_id` | UUID | ❌ |
| `syllabus_url` | string (max 500) | ❌ |
| `extra_data` | object | ❌ |

Returns `409` if course code exists, `400` if department_id doesn't exist.

### PATCH `/courses/{id}` / DELETE `/courses/{id}`

Same pattern.

### Prerequisites

**GET `/courses/{id}/prerequisites`** — List prerequisites

```bash
curl "https://ugac-backend-latest.onrender.com/courses/770e8400-e29b-41d4-a716-446655440002/prerequisites"
```

**Response:**
```json
[
  {
    "course_id": "770e8400-e29b-41d4-a716-446655440002",
    "prerequisite_id": "880e8400-e29b-41d4-a716-446655440003",
    "type": "hard"
  }
]
```

**POST `/courses/{id}/prerequisites`** — Set prerequisites (replaces ALL existing)

```bash
curl -X POST "https://ugac-backend-latest.onrender.com/courses/770e8400-e29b-41d4-a716-446655440002/prerequisites" \
  -H "Content-Type: application/json" \
  -d '[
    {"prerequisite_id": "880e8400-e29b-41d4-a716-446655440003", "type": "hard"},
    {"prerequisite_id": "990e8400-e29b-41d4-a716-446655440004", "type": "soft"}
  ]'
```

`type` must be one of: `"hard"`, `"soft"`, `"corequisite"`. Returns `201`.

---

## 4. Curricula

### GET `/curricula/` — List curricula

```bash
# All
curl "https://ugac-backend-latest.onrender.com/curricula/"

# Filter by branch
curl "https://ugac-backend-latest.onrender.com/curricula/?branch_id=660e8400-e29b-41d4-a716-446655440001"

# Filter by batch year
curl "https://ugac-backend-latest.onrender.com/curricula/?batch_year=2026"
```

**Response:**
```json
[
  {
    "id": "aa0e8400-e29b-41d4-a716-446655440005",
    "name": "B.Tech CSE 2026",
    "batch_year": 2026,
    "branch_id": "660e8400-e29b-41d4-a716-446655440001",
    "total_credits": 160,
    "ic_credits": 60,
    "icb_credits": 0,
    "dc_credits": 40,
    "de_credits": 20,
    "fe_credits": 20,
    "hss_iks_credits": 10,
    "mtp_credits": 6,
    "istp_credits": 4,
    "extra_data": null,
    "created_at": "2026-06-10T00:00:00+00:00",
    "updated_at": "2026-06-10T00:00:00+00:00"
  }
]
```

### POST `/curricula/` — Create curriculum

```bash
curl -X POST "https://ugac-backend-latest.onrender.com/curricula/" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "B.Tech CSE 2026",
    "batch_year": 2026,
    "branch_id": "660e8400-e29b-41d4-a716-446655440001",
    "total_credits": 160,
    "ic_credits": 60,
    "dc_credits": 40,
    "de_credits": 20,
    "fe_credits": 20,
    "hss_iks_credits": 10,
    "mtp_credits": 6,
    "istp_credits": 4
  }'
```

### Curriculum Courses

**GET `/curricula/{id}/courses?semester=1`** — List courses in a curriculum

```bash
curl "https://ugac-backend-latest.onrender.com/curricula/aa0e8400-e29b-41d4-a716-446655440005/courses"
# Filter by semester (1-12):
curl "https://ugac-backend-latest.onrender.com/curricula/aa0e8400-e29b-41d4-a716-446655440005/courses?semester=1"
```

**Response:**
```json
[
  {
    "id": "bb0e8400-e29b-41d4-a716-446655440006",
    "curriculum_id": "aa0e8400-e29b-41d4-a716-446655440005",
    "course_id": "770e8400-e29b-41d4-a716-446655440002",
    "semester": 1,
    "category": "IC",
    "is_optional": false,
    "basket_id": null,
    "created_at": "2026-06-10T00:00:00+00:00",
    "updated_at": "2026-06-10T00:00:00+00:00"
  }
]
```

**POST `/curricula/{id}/courses`** — Add a course

```bash
curl -X POST "https://ugac-backend-latest.onrender.com/curricula/aa0e8400-e29b-41d4-a716-446655440005/courses" \
  -H "Content-Type: application/json" \
  -d '{
    "course_id": "770e8400-e29b-41d4-a716-446655440002",
    "semester": 1,
    "category": "IC",
    "is_optional": false
  }'
```

`category` must be one of: `IC`, `DC`, `DE`, `FE`, `HSS`, `IKS`, `MTP`, `ISTP`

**DELETE `/curricula/{id}/courses/{cc_id}`** — Remove a course

```bash
curl -X DELETE "https://ugac-backend-latest.onrender.com/curricula/aa0e8400-e29b-41d4-a716-446655440005/courses/bb0e8400-e29b-41d4-a716-446655440006"
```

### Elective Baskets

**GET `/curricula/{id}/elective-baskets`** — List baskets

```bash
curl "https://ugac-backend-latest.onrender.com/curricula/aa0e8400-e29b-41d4-a716-446655440005/elective-baskets"
```

**POST `/curricula/{id}/elective-baskets`** — Create basket

```bash
curl -X POST "https://ugac-backend-latest.onrender.com/curricula/aa0e8400-e29b-41d4-a716-446655440005/elective-baskets" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Open Electives - Sem 5",
    "min_credits": 6,
    "max_credits": 12,
    "semester": 5
  }'
```

**PUT `/curricula/{id}/elective-baskets/{basket_id}`** — Update basket

```bash
curl -X PUT "https://ugac-backend-latest.onrender.com/curricula/aa0e8400-e29b-41d4-a716-446655440005/elective-baskets/bb0e8400-e29b-41d4-a716-446655440007" \
  -H "Content-Type: application/json" \
  -d '{"max_credits": 15}'
```

**DELETE `/curricula/{id}/elective-baskets/{basket_id}`**

---

## 5. Faculty

### GET `/faculty/` — List faculty

```bash
# All
curl "https://ugac-backend-latest.onrender.com/faculty/"

# By department
curl "https://ugac-backend-latest.onrender.com/faculty/?department_id=550e8400-e29b-41d4-a716-446655440000"

# Paginated
curl "https://ugac-backend-latest.onrender.com/faculty/?skip=0&limit=10"
```

**Response:**
```json
[
  {
    "id": "cc0e8400-e29b-41d4-a716-446655440008",
    "name": "Dr. John Doe",
    "email": "johndoe@iitmandi.ac.in",
    "designation": "Professor",
    "department_id": "550e8400-e29b-41d4-a716-446655440000",
    "photo_url": null,
    "office_location": "AC-101",
    "linkedin_url": null,
    "is_active": true,
    "created_at": "2026-06-10T00:00:00+00:00",
    "updated_at": "2026-06-10T00:00:00+00:00"
  }
]
```

### POST `/faculty/` — Create faculty

```bash
curl -X POST "https://ugac-backend-latest.onrender.com/faculty/" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dr. John Doe",
    "email": "johndoe@iitmandi.ac.in",
    "designation": "Professor",
    "department_id": "550e8400-e29b-41d4-a716-446655440000",
    "office_location": "AC-101",
    "is_active": true
  }'
```

PATCH/DELETE follow the same pattern as other resources.

---

## 6. Announcements

### GET `/announcements/` — List announcements

```bash
# All
curl "https://ugac-backend-latest.onrender.com/announcements/"

# By category
curl "https://ugac-backend-latest.onrender.com/announcements/?category=academic"

# Pinned only
curl "https://ugac-backend-latest.onrender.com/announcements/?pinned=true"

# Paginated
curl "https://ugac-backend-latest.onrender.com/announcements/?skip=0&limit=10"
```

**Response:**
```json
[
  {
    "id": "dd0e8400-e29b-41d4-a716-446655440009",
    "title": "Mid-sem Exam Schedule",
    "content": "The mid-semester exams will be held from...",
    "category": "academic",
    "attachment_url": null,
    "published_at": "2026-06-15T00:00:00+00:00",
    "is_pinned": true,
    "is_active": true,
    "created_at": "2026-06-15T00:00:00+00:00",
    "updated_at": "2026-06-15T00:00:00+00:00"
  }
]
```

### POST `/announcements/` — Create announcement

```bash
curl -X POST "https://ugac-backend-latest.onrender.com/announcements/" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Mid-sem Exam Schedule",
    "content": "The mid-semester exams will be held from...",
    "category": "academic",
    "is_pinned": true,
    "is_active": true
  }'
```

### PATCH `/announcements/{id}` / DELETE `/announcements/{id}`

---

## 7. Resources

### GET `/resources/` — List resources

```bash
# All
curl "https://ugac-backend-latest.onrender.com/resources/"

# By category
curl "https://ugac-backend-latest.onrender.com/resources/?category=syllabus"
```

**Response:**
```json
[
  {
    "id": "ee0e8400-e29b-41d4-a716-446655440010",
    "title": "CSE Syllabus 2026",
    "category": "syllabus",
    "file_url": "https://...",
    "academic_year": "2026-27",
    "is_active": true,
    "created_at": "2026-06-10T00:00:00+00:00",
    "updated_at": "2026-06-10T00:00:00+00:00"
  }
]
```

### POST `/resources/` — Create resource

```bash
curl -X POST "https://ugac-backend-latest.onrender.com/resources/" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "CSE Syllabus 2026",
    "category": "syllabus",
    "file_url": "https://example.com/syllabus.pdf",
    "academic_year": "2026-27"
  }'
```

---

## 8. Procedures

### GET `/procedures/` — List procedures

```bash
# Active only (default)
curl "https://ugac-backend-latest.onrender.com/procedures/"

# Include inactive
curl "https://ugac-backend-latest.onrender.com/procedures/?active_only=false"
```

**Response:**
```json
[
  {
    "id": "ff0e8400-e29b-41d4-a716-446655440011",
    "title": "Course Registration",
    "category": "academic",
    "steps": {"1": "Fill form", "2": "Get HOD approval", "3": "Submit to UGAC"},
    "flowchart_url": null,
    "is_active": true,
    "created_at": "2026-06-10T00:00:00+00:00",
    "updated_at": "2026-06-10T00:00:00+00:00"
  }
]
```

> `steps` is a JSON object (not an array). The structure is flexible — whatever makes sense for your frontend.

### GET `/procedures/category/{category}` — By category

```bash
curl "https://ugac-backend-latest.onrender.com/procedures/category/academic"
```

### POST `/procedures/` — Create

```bash
curl -X POST "https://ugac-backend-latest.onrender.com/procedures/" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Course Registration",
    "category": "academic",
    "steps": {"1": "Fill form", "2": "Get approval", "3": "Submit"}
  }'
```

---

## 9. Course Reviews

### GET `/reviews/` — List reviews

```bash
# All
curl "https://ugac-backend-latest.onrender.com/reviews/"

# Filter by status: pending, approved, rejected
curl "https://ugac-backend-latest.onrender.com/reviews/?status=approved"
```

### GET `/reviews/course/{course_id}` — Reviews for a course

```bash
curl "https://ugac-backend-latest.onrender.com/reviews/course/770e8400-e29b-41d4-a716-446655440002"
# Include rejected/pending reviews
curl "https://ugac-backend-latest.onrender.com/reviews/course/770e8400-e29b-41d4-a716-446655440002?approved_only=false"
```

**Response:**
```json
[
  {
    "id": "110e8400-e29b-41d4-a716-446655440012",
    "course_id": "770e8400-e29b-41d4-a716-446655440002",
    "student_name": "Jane Student",
    "student_id": null,
    "rating": 4,
    "review_text": "Great course, well-structured.",
    "semester_taken": "2025-26-I",
    "status": "approved",
    "moderated_by": "admin",
    "created_at": "2026-06-15T00:00:00+00:00",
    "updated_at": "2026-06-15T00:00:00+00:00"
  }
]
```

### POST `/reviews/` — Submit a review

```bash
curl -X POST "https://ugac-backend-latest.onrender.com/reviews/" \
  -H "Content-Type: application/json" \
  -d '{
    "course_id": "770e8400-e29b-41d4-a716-446655440002",
    "student_name": "Jane Student",
    "rating": 4,
    "review_text": "Great course, well-structured.",
    "semester_taken": "2025-26-I"
  }'
```

> Reviews are automatically created with `status: "pending"` and need moderation via the admin panel.

### PATCH `/reviews/{id}/moderate` — Moderate a review

> This is typically used via the admin panel. Frontend usually only needs POST + GET.

```bash
curl -X PATCH "https://ugac-backend-latest.onrender.com/reviews/110e8400-e29b-41d4-a716-446655440012/moderate" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "approved",
    "moderated_by": "admin"
  }'
```

### DELETE `/reviews/{id}`

---

## 10. Team

### GET `/team/` — List team members

```bash
# Active only (default)
curl "https://ugac-backend-latest.onrender.com/team/"

# Include inactive
curl "https://ugac-backend-latest.onrender.com/team/?active_only=false"
```

**Response:**
```json
[
  {
    "id": "220e8400-e29b-41d4-a716-446655440013",
    "name": "Alice Smith",
    "role": "UGAC Secretary",
    "type": "secretary",
    "email": "alice@iitmandi.ac.in",
    "photo_url": null,
    "bio": "Manages academic procedures",
    "linkedin_url": null,
    "portfolio": "Academic Affairs",
    "council_session": "2025-26",
    "term_start": "2025-07-01",
    "term_end": "2026-06-30",
    "order": 1,
    "is_active": true,
    "created_at": "2026-06-10T00:00:00+00:00",
    "updated_at": "2026-06-10T00:00:00+00:00"
  }
]
```

`type` is one of: `"council"`, `"faculty"`, `"secretary"`.

### POST `/team/` — Create member

```bash
curl -X POST "https://ugac-backend-latest.onrender.com/team/" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alice Smith",
    "role": "UGAC Secretary",
    "type": "secretary",
    "email": "alice@iitmandi.ac.in",
    "term_start": "2025-07-01",
    "term_end": "2026-06-30",
    "order": 1,
    "is_active": true
  }'
```

---

## 11. Search

### GET `/search/?q=...` — Global search

```bash
curl "https://ugac-backend-latest.onrender.com/search/?q=CS"
curl "https://ugac-backend-latest.onrender.com/search/?q=John&limit=10"
```

**Response:**
```json
[
  {"type": "course", "id": "770e...", "title": "CS101", "subtitle": "Introduction to Programming"},
  {"type": "department", "id": "550e...", "title": "CSE", "subtitle": "Computer Science & Engineering"},
  {"type": "branch", "id": "660e...", "title": "CSE-BT", "subtitle": "B.Tech in CSE"},
  {"type": "faculty", "id": "cc0e...", "title": "Dr. John Doe", "subtitle": "johndoe@iitmandi.ac.in"},
  {"type": "announcement", "id": "dd0e...", "title": "Mid-sem Exam Schedule", "subtitle": "academic"},
  {"type": "procedure", "id": "ff0e...", "title": "Course Registration", "subtitle": "academic"}
]
```

> Searches 6 entity types using `ILIKE %query%`. Results are collected per-entity up to `limit`. Results from different entity types aren't mixed/sorted — the order is: courses → departments → branches → faculty → announcements → procedures.

---

## 12. File Storage

### POST `/storage/upload` — Upload a file

```bash
curl -X POST "https://ugac-backend-latest.onrender.com/storage/upload" \
  -F "file=@/path/to/document.pdf"
```

**Response:**
```json
{
  "key": "uploads/550e8400-e29b-41d4-a716-446655440000.pdf",
  "url": "https://ugac-backend-latest.onrender.com/storage/file/uploads/550e8400-e29b-41d4-a716-446655440000.pdf",
  "filename": "document.pdf"
}
```

**Allowed file types (validated by magic bytes, NOT by extension):**
- JPEG, PNG, GIF, WebP, PDF

> The `url` in the response can be used directly in an `<img>` or `<a>` tag, or to download the file.

### GET `/storage/file/{key}` — Download/view a file

```bash
curl "https://ugac-backend-latest.onrender.com/storage/file/uploads/550e8400-e29b-41d4-a716-446655440000.pdf"
```

Returns the raw file bytes with the correct MIME type.

### DELETE `/storage/file/{key}` — Delete a file

```bash
curl -X DELETE "https://ugac-backend-latest.onrender.com/storage/file/uploads/550e8400-e29b-41d4-a716-446655440000.pdf"
```

---

## 13. Redis Caching

The following list endpoints are cached in Redis for 5 minutes (TTL 300s):

| Endpoint | Cache key | Cached when |
|---|---|---|
| `GET /courses/` | `courses:list` | skip=0, limit=100, no filters |
| `GET /branches/` | `branches:list` | skip=0, limit=100, no filters |
| `GET /departments/` | `departments:list` | skip=0, limit=100 |
| `GET /curricula/` | `curricula:list` | skip=0, limit=100, no filters |
| `GET /faculty/` | `faculty:list` | skip=0, limit=100, no filters |
| `GET /announcements/` | `announcements:list` | skip=0, limit=100, no filters |
| `GET /resources/` | `resources:list` | skip=0, limit=100, no filters |

**Cache is invalidated** on any create/update/delete of that entity.

> Redis is **optional**. If `REDIS_URL` is not configured, all requests go directly to the database and caching is silently skipped. The frontend does not need to handle cache headers or any cache-related behavior.

---

## 14. Error Handling

All endpoints return standard HTTP status codes:

| Status | Meaning |
|---|---|
| `200` | Success |
| `201` | Created (POST) |
| `204` | Deleted/No content (DELETE) |
| `400` | Bad request (validation error, invalid FK, check constraint violation) |
| `404` | Resource not found |
| `409` | Conflict (duplicate unique field like course code or dept code) |
| `422` | Validation error (missing required field, wrong type, constraint violation) |
| `429` | Too many requests (rate limited) |
| `500` | Internal server error |

**Validation error format (422):**
```json
{
  "detail": [
    {
      "loc": ["body", "credits"],
      "msg": "Input should be less than or equal to 30",
      "type": "less_than_equal"
    }
  ]
}
```

**Integrity error format (400):**
```json
{
  "detail": "Invalid department_id: department does not exist"
}
```

---

## Quick Reference — All Routes

| Method | Path | Description |
|---|---|---|
| GET | `/` | API info (name, version, docs link) |
| GET | `/health` | Health check `{"status": "ok"}` |
| GET | `/admin` | Admin panel (browser only) |
| GET | `/branches/` | List branches |
| POST | `/branches/` | Create branch |
| GET | `/branches/{id}` | Get branch |
| PATCH | `/branches/{id}` | Update branch |
| DELETE | `/branches/{id}` | Delete branch |
| GET | `/departments/` | List departments |
| POST | `/departments/` | Create department |
| GET | `/departments/{id}` | Get department |
| PATCH | `/departments/{id}` | Update department |
| DELETE | `/departments/{id}` | Delete department |
| GET | `/courses/` | List courses |
| GET | `/courses/lite` | List courses (lightweight) |
| POST | `/courses/` | Create course |
| GET | `/courses/{id}` | Get course |
| PATCH | `/courses/{id}` | Update course |
| DELETE | `/courses/{id}` | Delete course |
| GET | `/courses/{id}/prerequisites` | Get prerequisites |
| POST | `/courses/{id}/prerequisites` | Set prerequisites |
| GET | `/curricula/` | List curricula |
| POST | `/curricula/` | Create curriculum |
| GET | `/curricula/{id}` | Get curriculum |
| PATCH | `/curricula/{id}` | Update curriculum |
| DELETE | `/curricula/{id}` | Delete curriculum |
| GET | `/curricula/{id}/courses` | List curriculum courses |
| POST | `/curricula/{id}/courses` | Add course to curriculum |
| DELETE | `/curricula/{id}/courses/{cc_id}` | Remove course from curriculum |
| GET | `/curricula/{id}/elective-baskets` | List elective baskets |
| POST | `/curricula/{id}/elective-baskets` | Create elective basket |
| PUT | `/curricula/{id}/elective-baskets/{basket_id}` | Update elective basket |
| DELETE | `/curricula/{id}/elective-baskets/{basket_id}` | Delete elective basket |
| GET | `/faculty/` | List faculty |
| POST | `/faculty/` | Create faculty |
| GET | `/faculty/{id}` | Get faculty |
| PATCH | `/faculty/{id}` | Update faculty |
| DELETE | `/faculty/{id}` | Delete faculty |
| GET | `/announcements/` | List announcements |
| POST | `/announcements/` | Create announcement |
| GET | `/announcements/{id}` | Get announcement |
| PATCH | `/announcements/{id}` | Update announcement |
| DELETE | `/announcements/{id}` | Delete announcement |
| GET | `/resources/` | List resources |
| POST | `/resources/` | Create resource |
| GET | `/resources/{id}` | Get resource |
| PATCH | `/resources/{id}` | Update resource |
| DELETE | `/resources/{id}` | Delete resource |
| GET | `/procedures/` | List procedures |
| GET | `/procedures/category/{category}` | List by category |
| POST | `/procedures/` | Create procedure |
| GET | `/procedures/{id}` | Get procedure |
| PATCH | `/procedures/{id}` | Update procedure |
| DELETE | `/procedures/{id}` | Delete procedure |
| GET | `/reviews/` | List reviews |
| GET | `/reviews/course/{course_id}` | Reviews by course |
| POST | `/reviews/` | Submit review |
| GET | `/reviews/{id}` | Get review |
| PATCH | `/reviews/{id}/moderate` | Moderate review |
| DELETE | `/reviews/{id}` | Delete review |
| GET | `/team/` | List team |
| POST | `/team/` | Create team member |
| GET | `/team/{id}` | Get team member |
| PATCH | `/team/{id}` | Update team member |
| DELETE | `/team/{id}` | Delete team member |
| GET | `/search/` | Global search |
| POST | `/storage/upload` | Upload file |
| GET | `/storage/file/{key}` | Download file |
| DELETE | `/storage/file/{key}` | Delete file |
