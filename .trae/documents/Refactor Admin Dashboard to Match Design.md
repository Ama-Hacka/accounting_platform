## Overview
Refactor the admin area to match the provided design precisely. Remove the public site navbar within /admin, add a left sidebar with user info and navigation, a header with “Add New Client”, a search+filters card, and a clients table showing the requested columns. Keep strong role/domain checks and render only admin UI.

## Layout & Navigation
- Create a dedicated nested layout for /admin that does NOT render the global site navbar
- Left sidebar (fixed, full-height):
  - Top: user avatar + full name + “ADMIN PANEL” label
  - Nav items: Dashboard, Clients (active style), Settings
  - Bottom: current user name, role badge (Owner/Staff), Sign out button
- Main content area: header row and content sections

## Routing & Guards
- On /admin routes, check Supabase auth and profiles.role ∈ {owner, staff} AND email ends with @icmultiservices.com
- Redirect non-admins to /

## Header (Main Content)
- Title: Client Directory + subtitle (“Manage client profiles, tax documents, and statuses.”)
- Right-side action: primary button “+ Add New Client”

## Search & Filters Card
- Large rounded card below header with:
  - Search input: “Search by client name, email, or ID…”, debounced
  - Filter chips: All Docs, W2, 1099, 1040 (toggle classes)
  - Year dropdown: current year and previous 7 years, plus “All Years” option
  - Optional filter icon button placeholder

## Clients Table
- Rounded, bordered, shadow card with table-like grid
- Columns:
  - Client Name: initials avatar + bold name + client ID below
  - Company Name (Entity): profiles.entity if present
  - Contact Info: profiles.email (if stored) on first line, phone on second line
  - Docs Required Status: colored badges for needed doc types; if more than two, show “+N” overflow badge
  - Year: most relevant year (based on filters or latest doc/return year)
- Row styling and hover effects consistent with the image
- Footer: “Showing 1 to 5 of X results” and pagination controls 〈 1 2 3 … 8 〉

## Data Sources & Queries
- profiles: id, first_name, last_name, phone_number, entity, email
- user_documents: doctype, year (client uploads)
- tax_returns: form_type, year, status (admin uploads)
- Fetch clients (role=client) + aggregate docs and returns by client
- Compute:
  - Last active from latest tax_return.created_at or profiles.updated_at
  - Docs badges from user_documents.doctype
  - Status from latest tax_returns.status (default “Needs Review”)
  - Year from filter value or latest doc/return year
- Use SWR/React Query with key on query/filter state; only list re-renders on changes

## State & UX
- Keep search, docType filter, and year filter in client state
- Debounce search (300ms) and show loading shimmer when querying
- Preserve active chip styles per design

## Security & Access
- Enforce domain + role in client-side guard and server-side checks when feasible
- Private buckets with short-lived signed URLs (unchanged)

## Implementation Steps
1. Update /admin layout to be standalone (no global Navbar)
2. Build sidebar (top user info, nav items, bottom user and signout)
3. Implement header with title and “Add New Client” button
4. Implement search+filters card with chips and year dropdown
5. Implement clients table grid with row rendering and footer pagination
6. Integrate data queries and aggregation for docs/returns per client
7. Apply styles to match the image (spacings, typography, colors, badges)
8. Add small helper components: AvatarInitials, Badge, StatusDot, Pagination

## DB Migrations (if needed)
- profiles: add entity text, email text if not already present
- Ensure indexes: profiles(role), tax_returns(user_id, year)

## What I Need From You
- Confirm whether profiles already store entity and email; if not, I’ll add those columns and populate from auth or admin input
- Provide the exact list of “Docs Needed” rules (e.g., required types by client or by year) if we should compute missing docs; otherwise we’ll show existing doc types and mark status via latest tax return
- Confirm whether we need real pagination (server-side) or mock paging is sufficient for now

If this plan looks good, I will implement the sidebar, header, search+filters, and clients table exactly as described and wire it to Supabase.