# Submission Notes

## What I tested

I added unit tests for the task service and integration tests for the Express routes. The tests cover happy paths, validation failures, missing resources, pagination, status filtering, completion, statistics, deletion, assignment, reassignment, and the application error handler.

## What surprised me

The codebase is intentionally small and easy to run, but several behaviors were implicit rather than documented in the implementation. In particular, pagination was effectively zero-based in the service even though the API examples use `page=1`, and completing a task changed its priority.

## Design decisions

For task assignment, I validate that `assignee` is a non-empty string after trimming. I return 400 for invalid input and 404 for a missing task. Reassignment is allowed because assigning a task can naturally represent a handoff from one user to another.

## What I would improve next

With more time, I would standardize service return values, add stronger validation and pagination parameter handling, add persistence and authentication/authorization, and test concurrent updates and larger datasets.
