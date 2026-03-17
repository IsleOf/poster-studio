# Star Map Generator - Fixes & Features Needed

## Current Status
The application has syntax errors in `SidebarControls.tsx` that prevent template switching.

## Required Fixes & Features

### 1. Fix SidebarControls.tsx Syntax Errors
- **Issue**: Template cards don't switch - only shows template 1
- **Cause**: Malformed JSX from previous incomplete edit
- **Solution**: Restore working template rendering code

### 2. Fix Heart Outline (VectorStarMap.tsx)
- **Issue**: Heart in Modern White template shows only single outline (appears on top of each other)
- **Expected**: Double offset outline like circles have
- **Current Implementation**: Removed offset scaling due to misalignment
- **Solution**: Implement proper double outline for hearts without scaling issues

### 3. Add New Fonts
- **Brittany Signature**: To be added to all font dropdowns, set as Modern White default title font
- **Southland**: To be added to all font dropdowns
- **Sacramento**: Already added ✓
- **Montserrat**: Already exists ✓

### 4. Update index.css
Add Google Font imports for:
- Brittany Signature
- Southland

### 5. Template Milky Way Background
- **Location**: `public/milky.avif` (already copied ✓)
- **Templates using it**:
  - Love Dark: `/milky.avif`
  - Modern White: `/milky.avif`

### 6. Save Template Defaults Feature
- **Store methods**: `saveTemplateDefaults`, `loadTemplateDefaults` already added to useStore.ts ✓
- **UI**: Add "💾 Save as Default" button under each template card
- **Behavior**: Saves current settings to localStorage for future use

## Implementation Priority
1. **CRITICAL**: Fix SidebarControls.tsx syntax → templates can switch
2. **HIGH**: Add Brittany Signature & Southland fonts
3. **HIGH**: Fix heart double outline 
4. **MEDIUM**: Implement save template defaults UI

## Files to Edit
1. `src/components/SidebarControls.tsx` - Fix syntax, add fonts, add save buttons
2. `src/components/VectorStarMap.tsx` - Fix heart double outline
3. `src/index.css` - Add Brittany Signature and Southland font imports
