# Performance Optimization Plan - Star Map Generator

## Priority: HIGH - Multi-Phase Implementation

---

## 🔴 **PHASE 1: IMMEDIATE WINS** (30 min - CRITICAL)

### 1.1 Debounce All Slider Inputs
**Impact**: 🔥🔥🔥 MASSIVE - Reduces re-renders by 90%+
- Add debouncing hook (150-300ms delay)
- Apply to ALL sliders: starScale, lineWeight, heartSize, shapeOffsetY, kerning, etc.
- Users can still see smooth slider movement, but rendering happens after they stop

**Files to modify**:
- `src/components/SidebarControls.tsx` - Wrap all slider onChange handlers
- Create `src/hooks/useDebounce.ts` utility

### 1.2 Memoize Heavy Calculations
**Impact**: 🔥🔥 HIGH - Prevents recalculation on every render
- Memoize: projection setup, path generators, magnitude scales
- Use `useMemo` for these expensive D3 operations
- Cache star feature filtering (bright vs faint)

**Files to modify**:
- `src/components/VectorStarMap.tsx`

### 1.3 Split useEffect Dependencies
**Impact**: 🔥 MEDIUM - Targeted re-renders only
- Currently: 1 massive effect with 50+ dependencies → re-renders EVERYTHING
- Split into:
  - Data loading effect (runs once)
  - Projection effect (lat, lng, date, time, mapRadius)
  - Visual styling effect (colors, opacity, border)
  - Text rendering effect (fonts, kerning, positions)
  - Frame effect (showFrame, frameInset, frameWidth)

**Files to modify**:
- `src/components/VectorStarMap.tsx`

---

## 🟡 **PHASE 2: RENDERING OPTIMIZATION** (1 hour)

### 2.1 Implement Smart Throttling
**Impact**: 🔥🔥 HIGH - Smooth 60fps updates
- Use `requestAnimationFrame` for render scheduling
- Batch multiple state changes into single render
- Add "updating" indicator during re-renders

**Files to modify**:
- `src/components/VectorStarMap.tsx`
- Create `src/hooks/useThrottledRender.ts`

### 2.2 Dynamic Star Count (LOD - Level of Detail)
**Impact**: 🔥🔥🔥 MASSIVE for large datasets
- **During interaction** (slider dragging): Show only bright stars (<2.5 mag) → ~500 stars
- **When idle**: Show all stars → ~9000 stars
- Detect interaction state using event listeners
- Transition smoothly between detail levels

**Files to modify**:
- `src/components/VectorStarMap.tsx`
- Add interaction detection

### 2.3 Optimize SVG Rendering
**Impact**: 🔥 MEDIUM - Better browser performance
- Use `will-change` CSS property on SVG
- Minimize DOM manipulations (batch append operations)
- Pre-generate reusable defs (filters, gradients)

**Files to modify**:
- `src/components/VectorStarMap.tsx`
- `src/index.css`

---

## 🟢 **PHASE 3: STATE MANAGEMENT** (45 min)

### 3.1 Separate Hot/Cold State
**Impact**: 🔥🔥 HIGH - Reduces unnecessary re-renders
- **Hot state** (changes frequently): sliders, positions, sizes → Store separately
- **Cold state** (rarely changes): fonts, colors, design style → Store separately
- Prevents typography changes from triggering expensive map re-renders

**Files to modify**:
- `src/store/useStore.ts` - Split into `useHotStore` and `useColdStore`
- All components - Update store usage

### 3.2 Batch State Updates
**Impact**: 🔥 MEDIUM - Fewer render cycles
- Group related setter calls (e.g., changing print size affects multiple values)
- Use Zustand's `setState` with multiple properties at once
- Add `startBatch()` and `endBatch()` helpers

**Files to modify**:
- `src/store/useStore.ts`
- Components that update multiple values

### 3.3 Add Visual Feedback During Updates
**Impact**: 🎨 UX - Users know system is responsive
- Show subtle "Updating..." indicator or pulse animation
- Disable interactions during heavy renders (prevent queue buildup)
- Add skeleton/placeholder during first load

**Files to modify**:
- `src/components/MainLayout.tsx`
- Add loading states

---

## 🔵 **PHASE 4: ADVANCED OPTIMIZATIONS** (2+ hours - Future)

### 4.1 Web Workers for Calculations
**Impact**: 🔥🔥 HIGH - Free up main thread
- Move star projection calculations to Web Worker
- Move constellation line calculations to Web Worker
- Main thread only handles rendering

**New files**:
- `src/workers/starProjection.worker.ts`
- `src/workers/pathCalculation.worker.ts`

### 4.2 Progressive/Lazy Rendering
**Impact**: 🔥 MEDIUM - Perceived performance boost
- Render in stages:
  1. Background + Grid (instant)
  2. Bright stars (fast)
  3. All stars (when idle)
  4. Constellations (optional)
  5. Text overlay (last)
- User sees something immediately, details load progressively

**Files to modify**:
- `src/components/VectorStarMap.tsx`

### 4.3 Canvas Fallback Option
**Impact**: 🔥🔥🔥 MASSIVE for very large datasets
- Offer Canvas rendering as alternative to SVG
- Canvas is faster for 1000+ elements
- Trade-off: Lose SVG export quality, but gain speed
- Add toggle in settings for power users

**New files**:
- `src/components/CanvasStarMap.tsx`

### 4.4 Virtual Rendering / Culling
**Impact**: 🔥 MEDIUM - Only render visible elements
- Calculate viewport bounds
- Only render stars/constellations within visible area
- Useful when zoomed in significantly

---

## 📊 **RECOMMENDED IMPLEMENTATION ORDER**

### **Sprint 1 - Quick Wins** (Do this NOW!)
1. ✅ Add debouncing to all sliders (Phase 1.1)
2. ✅ Memoize heavy calculations (Phase 1.2)
3. ✅ Add "updating" visual indicator (Phase 3.3)

### **Sprint 2 - Core Optimizations**
4. ✅ Implement LOD with dynamic star count (Phase 2.2)
5. ✅ Split useEffect dependencies (Phase 1.3)
6. ✅ Smart throttling with RAF (Phase 2.1)

### **Sprint 3 - State Management**
7. ✅ Separate hot/cold state (Phase 3.1)
8. ✅ Batch state updates (Phase 3.2)

### **Sprint 4 - Advanced** (Optional)
9. 🔄 Progressive rendering (Phase 4.2)
10. 🔄 Web Workers (Phase 4.1)

---

## 🎯 **EXPECTED PERFORMANCE GAINS**

| Optimization | Expected Improvement |
|--------------|---------------------|
| Slider debouncing | **5-10x faster** (800ms → 80ms) |
| Split useEffects | **2-3x faster** (targeted updates) |
| Memoization | **1.5-2x faster** (cached calculations) |
| Dynamic star count | **10-20x faster** during interaction |
| Smart throttling | **60fps** consistent (from laggy) |
| Hot/Cold state | **3-5x fewer** unnecessary re-renders |

**Combined: 20-50x performance improvement in interactive scenarios**

---

## 🛠️ **IMPLEMENTATION NOTES**

- Start with Phase 1 - these are the easiest wins
- Test after each phase - measure with Chrome DevTools Performance tab
- Each phase is independent - can implement in parallel if needed
- Focus on user-perceived performance (fast feedback) over raw speed

---

## 📝 **TESTING CHECKLIST**

After each phase, verify:
- [ ] Sliders feel smooth (no lag)
- [ ] UI remains responsive during updates
- [ ] No visual glitches or flashing
- [ ] All features still work correctly
- [ ] Typography changes apply correctly
- [ ] Frame toggle works instantly
- [ ] Export still produces high-quality output
