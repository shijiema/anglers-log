# Angler's Log - Feature Documentation

> Last updated: 2026-01-23

A Progressive Web App (PWA) for logging and tracking fishing catches. Built with React 19, Vite, and Tailwind CSS.

## Core Features

### 1. Dashboard

The home screen displays an overview of your fishing activity:

- **Total Catches** - Count of all logged catches
- **Unique Spots** - Number of distinct fishing locations
- **Recent Activity** - Scrollable list of recent catches with "Load More" pagination
- **Manage List** - Multi-select mode for bulk operations

### 2. Catch Logging

Create detailed records for each catch with the following fields:

| Field | Description |
|-------|-------------|
| Photos | Up to 4 photos per catch (auto-compressed to 800x800px JPEG at 60% quality) |
| Species | Type of fish caught (required) |
| Weight | Weight in pounds |
| Date & Time | When the catch occurred |
| Location | Name of the fishing spot |
| GPS Coordinates | Auto-detect current location or manually tag |
| Bait/Lure | What was used to catch the fish |
| Temperature | Air temperature in Fahrenheit |
| Wind | Wind speed in MPH |
| Notes | Additional details about the catch |

### 3. Sharing

Generate shareable image cards from your catches with two privacy modes:

#### Public Mode
- Compact card format (1400px height)
- Includes: photo, species, weight, date/time, weather, notes
- **Excludes**: location and map
- Ideal for posting on social media

#### Friend Mode
- Full card format (1920px height)
- Includes: all catch details plus location map with pin
- Shows GPS coordinates if available
- For sharing with trusted friends

Both modes support:
- Native sharing on mobile devices
- Download as PNG on desktop
- App branding watermark

### 4. Analysis & Reports

Statistical view of your fishing data:

- **Species Distribution** - Doughnut chart showing catch breakdown by species
- **Catch Timeline** - Bar chart showing catches over time
- **Filters** - Filter by location and date range
- **Paginated Results** - Browse through filtered catches

### 5. Data Management

#### Export Options
- **Export JSON** - Full backup of all data including photos
- **Export CSV** - Spreadsheet-compatible format for analysis

#### Import Options
- **Restore JSON** - Import previously exported backup

#### Bulk Operations
- Multi-select catches for bulk deletion
- Confirmation dialogs for destructive actions

### 6. Offline Support

Full PWA functionality:
- Service Worker caches static assets
- Works without internet connection
- Installable on home screen (mobile/desktop)
- All data stored locally in IndexedDB

### 7. Internationalization

Multi-language support with auto-detection:

| Language | Code |
|----------|------|
| English | en |
| Chinese (Simplified) | zh-CN |

Language preference is saved in localStorage.

---

## Technical Details

### Data Storage

- **Database**: IndexedDB (`AnglersLogDB`)
- **Object Store**: `catches` with auto-incrementing IDs
- **Persistence**: All data stored locally on device

### Image Handling

- Maximum 4 photos per catch
- Auto-compression: 800x800px max dimensions
- JPEG format at 60% quality
- Base64 encoded for storage

### Browser APIs Used

- Geolocation API (GPS coordinates)
- Web Share API (native sharing)
- IndexedDB (local storage)
- Canvas API (share card generation)
- Service Worker API (offline support)

---

## Changelog

### 2026-01-23
- Added share mode selection (Public/Friend)
- Public mode excludes location and map for privacy
- Compact card layout for public sharing
- Extended notes display in public mode
