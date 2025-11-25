# Initial Refactoring & Stabilization Plan

## 1. Purpose

This document outlines the initial plan that was created to address the application's early-stage instability and "context amnesia" issues. Its primary goal was to make the codebase stable, manageable, and ready for future development.

While this plan has been superseded by the more comprehensive `HOLISTIC_PLAN.md`, its guiding principles are still followed in all development work.

## 2. Guiding Principles

-   **One Task at a Time:** Every change will be a small, isolated, and testable unit of work.
-   **Plan and Document First:** Before any code is changed, a plan and a granular task list will be created and saved to the project.
-   **Testable Tasks:** Each task must have a clear, verifiable outcome.

## 3. The Refactoring Strategy

The root cause of the initial instability was the monolithic nature of the codebase. The strategy was to:

1.  **Stabilize the Application (Immediate Priority):** Fix the critical, application-crashing bugs to create a stable base for further work.
2.  **Aggressively Componentize:** Break down large, complex components (`App.tsx`, `TopicalMapDisplay.tsx`) into smaller, single-responsibility components.
3.  **Isolate State Management:** Refactor the global `appState.ts` to improve separation of concerns.

## 4. Status

This initial plan was successful. The application is now stable, and the core principles have been integrated into the new strategic direction outlined in `HOLISTIC_PLAN.md`.