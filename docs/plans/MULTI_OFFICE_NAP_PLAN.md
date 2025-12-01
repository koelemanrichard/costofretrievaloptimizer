# Multi-Office NAP Support Plan

## Overview
Enable businesses to manage multiple office locations across different countries, with proper structured data (Schema.org) support for local SEO.

## Current State
```typescript
interface NAPData {
  company_name: string;
  address: string;
  phone: string;
  email: string;
}
```

## Proposed Schema

### TypeScript Types
```typescript
interface NAPData {
  company_name: string;
  primary_email?: string;           // General company email
  website?: string;                 // Company website
  locations: OfficeLocation[];      // 1 to many locations
}

interface OfficeLocation {
  id: string;                       // UUID
  name: string;                     // e.g., "Headquarters", "Amsterdam Office"
  is_headquarters: boolean;         // Primary location flag

  // Address fields (structured for Schema.org)
  street_address: string;           // Street and number
  address_line_2?: string;          // Suite, floor, etc.
  city: string;
  state_province?: string;          // State/Province/Region
  postal_code: string;
  country: string;                  // ISO 3166-1 alpha-2 (e.g., "NL", "US", "DE")
  country_name: string;             // Full name (e.g., "Netherlands")

  // Contact details per location
  phone: string;                    // With country code
  fax?: string;
  email?: string;                   // Location-specific email

  // Business hours (for LocalBusiness schema)
  business_hours?: BusinessHours[];

  // Geo coordinates (for maps/schema)
  latitude?: number;
  longitude?: number;

  // Additional metadata
  location_type?: 'headquarters' | 'branch' | 'sales_office' | 'support_center' | 'warehouse';
  services_offered?: string[];      // Services available at this location
  languages_spoken?: string[];      // e.g., ["nl", "en", "de"]
}

interface BusinessHours {
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  open: string;                     // "09:00"
  close: string;                    // "17:30"
  is_closed?: boolean;              // For holidays/closed days
}
```

### Database Schema (Supabase)
```sql
-- Add new table for office locations
CREATE TABLE office_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  map_id UUID REFERENCES topical_maps(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  is_headquarters BOOLEAN DEFAULT false,

  street_address TEXT NOT NULL,
  address_line_2 TEXT,
  city TEXT NOT NULL,
  state_province TEXT,
  postal_code TEXT NOT NULL,
  country TEXT NOT NULL,           -- ISO code
  country_name TEXT NOT NULL,

  phone TEXT,
  fax TEXT,
  email TEXT,

  business_hours JSONB,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),

  location_type TEXT,
  services_offered TEXT[],
  languages_spoken TEXT[],

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX idx_office_locations_map_id ON office_locations(map_id);

-- RLS Policies
ALTER TABLE office_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own office locations"
  ON office_locations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own office locations"
  ON office_locations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own office locations"
  ON office_locations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own office locations"
  ON office_locations FOR DELETE
  USING (auth.uid() = user_id);
```

## UI Components Needed

### 1. OfficeLocationForm
- Add/edit individual office location
- Country dropdown with flag icons
- Phone input with country code auto-detection
- Business hours editor (expandable)
- Map integration for address validation (optional)

### 2. OfficeLocationsPanel
- List view of all offices
- Drag-and-drop reordering
- Set headquarters toggle
- Quick actions: Edit, Delete, Duplicate

### 3. Blueprint Wizard Integration
- Step in wizard to add office locations
- Import from existing data (if available)
- Minimum 1 location required

## Schema.org Output

### LocalBusiness Schema (per location)
```json
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": "https://example.com/#amsterdam-office",
  "name": "NFIR - Amsterdam Office",
  "image": "https://example.com/logo.png",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Keizersgracht 123",
    "addressLocality": "Amsterdam",
    "postalCode": "1015 CJ",
    "addressCountry": "NL"
  },
  "telephone": "+31 20 123 4567",
  "email": "amsterdam@nfir.nl",
  "openingHoursSpecification": [
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      "opens": "09:00",
      "closes": "17:30"
    }
  ],
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 52.3676,
    "longitude": 4.9041
  },
  "parentOrganization": {
    "@type": "Organization",
    "@id": "https://example.com/#organization"
  }
}
```

### Organization Schema (company level)
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://example.com/#organization",
  "name": "NFIR",
  "url": "https://nfir.nl",
  "logo": "https://nfir.nl/logo.png",
  "location": [
    { "@id": "https://example.com/#amsterdam-office" },
    { "@id": "https://example.com/#rotterdam-office" }
  ]
}
```

## Implementation Phases

### Phase 1: Schema & Backend
- [ ] Create database migration
- [ ] Update TypeScript types
- [ ] Create CRUD API for office locations
- [ ] Update state management

### Phase 2: UI Components
- [ ] OfficeLocationForm component
- [ ] OfficeLocationsPanel component
- [ ] Country/phone input components
- [ ] Business hours editor

### Phase 3: Blueprint Wizard Integration
- [ ] Add office locations step to wizard
- [ ] Update NAP data flow
- [ ] Migrate existing single-office data

### Phase 4: Schema.org Integration
- [ ] Generate LocalBusiness schema per location
- [ ] Update Organization schema
- [ ] Add schema to contact page template
- [ ] Add location pages generation (optional)

## Migration Strategy
1. Existing `NAPData` converted to single `OfficeLocation`
2. `is_headquarters: true` for migrated data
3. Backward compatible - old format still works
4. UI prompts to add more locations

## Notes
- Country codes use ISO 3166-1 alpha-2 standard
- Phone numbers stored with country code prefix
- Business hours support timezone awareness (future)
- Integration with Google My Business API possible (future)
