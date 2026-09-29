# Bug Report

## Overview

I wrote unit tests for the service layer and integration tests for the Express API using Jest and Supertest. The tests exposed the following behavioral issues.

## Bug 1: Pagination off-by-one error

**Location:** `src/services/taskService.js`, `getPaginated()`

**Expected behavior:** With 1-based pagination, `page=1&limit=2` should return the first two tasks.

**Actual behavior:** The original implementation calculated:

```js
const offset = page * limit;
```

So `page=1` starts at index 2 and skips the first page.

**How discovered:** An integration test for `GET /tasks?page=1&limit=2` expected the first two tasks but received the second page.

**Fix:** Changed the calculation to:

```js
const offset = (page - 1) * limit;
```

This matches the API's documented example using `page=1`.

---

## Bug 2: Status filter performs partial matching

**Location:** `src/services/taskService.js`, `getByStatus()`

**Expected behavior:** A status filter should match the complete status value.

**Actual behavior:** The original implementation used:

```js
t.status.includes(status)
```

This means a query such as `status=progress` can match a task whose status is `in_progress`.

**How discovered:** A unit/integration test using a partial status value returned a task unexpectedly.

**Fix:** Changed the comparison to exact equality:

```js
t.status === status
```

---

## Bug 3: Completing a task changes its priority

**Location:** `src/services/taskService.js`, `completeTask()`

**Expected behavior:** Completing a task should change its completion state and timestamp, while preserving unrelated task properties such as priority.

**Actual behavior:** The original implementation explicitly set:

```js
priority: 'medium'
```

Therefore, completing a high-priority task silently changed it to medium priority.

**How discovered:** A unit test created a high-priority task, completed it, and asserted that the priority remained high.

**Fix:** Removed the hard-coded priority change. `completeTask()` now changes only `status` and `completedAt`.

---

## Additional observation: inconsistent service return values

The service uses different "not found" values: `findById()` returns `undefined`, `update()` returns `null`, and `remove()` returns `false`.

This does not currently break the HTTP API because each route handles its service method according to its return type, but it makes the service contract less consistent. I would standardize this before a larger production rollout.

---

# Feature: PATCH /tasks/:id/assign

## Design decisions

### Validation

The endpoint requires:

```json
{
  "assignee": "string"
}
```

The value must be present, a string, and non-empty after trimming. Invalid input returns HTTP 400.

### Missing task

If the task ID does not exist, the endpoint returns HTTP 404 with:

```json
{
  "error": "Task not found"
}
```

### Reassignment

I chose to allow reassignment. A task can be assigned to another user later, and the new assignee replaces the previous value. This keeps the endpoint useful for normal task handoff workflows without adding an extra endpoint.

### Data preservation

Assignment only adds/updates the `assignee` property. Existing task fields such as title, priority, status, and dates are preserved.

---

# What I would test next

If I had more time, I would add:

1. More validation tests for extremely long strings and unusual Unicode input.
2. Tests for malformed JSON and other Express-level error paths.
3. Tests for concurrent updates to the same task.
4. Performance tests with a much larger in-memory task collection.
5. Contract tests for pagination/filter combinations.

# Questions before production

1. Should task data remain in memory, or should it be persisted in a database?
2. Who is authorized to assign, update, and delete tasks?
3. Should completed tasks be editable?
4. What pagination contract should the API expose for invalid page/limit values?
5. Do we need API versioning, authentication, audit logging, and rate limiting?
