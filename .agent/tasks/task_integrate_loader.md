# Task: Integrate Shared Loader into ManpowerDetail

## Status
- [ ] Refactor `Loader.tsx` to support custom styling <!-- id: 0 -->
- [ ] Integrate `Loader` into `ManpowerDetail.tsx` <!-- id: 1 -->

## Context
The user requested to use the shared loader component (`src/common/Loader.tsx`) for the attendance data fetch in `ManpowerDetail.tsx`. However, the shared loader currently has hardcoded styles (`h-screen`, `bg-white`) that are unsuitable for a modal component context (which needs to be `h-full` and potentially transparent/glass).

## Implementation Plan

### 1. Refactor `src/common/Loader/Loader.tsx`
- update the component signature to accept props, specifically `className`.
- Use the passed `className` if available; otherwise, fall back to the default `flex h-screen items-center justify-center bg-white`.
- This ensures existing usages (like in `AuthContext`) remain broken/unaffected (they use default), while allowing `ManpowerDetail` to pass a custom class.

### 2. Update `src/pages/Dashboard/Dashboard/ManpowerDetail.tsx`
- Import the `Loader` component.
- Replace the temporary local spinner with `<Loader className="flex h-full w-full items-center justify-center bg-white/30 backdrop-blur-sm" />`.
- Ensure the `isLoading` logic remains correct.

## Verification
- Verify that the loader visually fits within the `min-h-[400px]` container.
- Verify that the loader branding (Logo + "Fuel Feasibility...") appears correctly.
