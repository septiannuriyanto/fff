# Task: Integrate Shared Loader into ManpowerDetail

## Status
- [ ] Refactor `Loader.tsx` to support custom styling <!-- id: 0 -->
- [ ] Integrate `Loader` into `ManpowerDetail.tsx` <!-- id: 1 -->

## Context
The user requested using the shared `Loader` component (`src/common/Loader/Loader.tsx`). However, this loader currently forces a full-screen layout (`h-screen`) and background (`bg-white`). Using it directly in the `ManpowerDetail` modal breaks the layout. We need to refactor it to accept layout overrides via `className`, preserving existing behavior while enabling flexibility.

## Implementation Plan

### 1. Refactor `src/common/Loader/Loader.tsx`
**Current Code:**
```tsx
const Loader = (title:any) => {
  return (
    <div className="flex -col">
      <div className="flex h-screen items-center justify-center bg-white">
        {/* hardcoded spinner/logo */}
      </div>
    </div>
  );
};
```
**Goal Code:**
```tsx
const Loader = ({ className }: { className?: string }) => {
  const containerClass = className || "flex h-screen items-center justify-center bg-white";
  return (
    <div className="flex -col">
      <div className={containerClass}>
        {/* hardcoded spinner/logo */}
      </div>
    </div>
  );
};
```
This ensures usages without explicit `className` remain full-screen default.

### 2. Update `src/pages/Dashboard/Dashboard/ManpowerDetail.tsx`
- Replace the local `div` with `<Loader className="flex h-full w-full items-center justify-center bg-white/30 backdrop-blur-sm relative" />`.
- Ensure correct import path: `../../../common/Loader/Loader`.
- Verify `h-full` works within the `min-h-[400px]` container.

## Next Steps
- Implement refactor.
- Implement integration.
- Verify visual result.
