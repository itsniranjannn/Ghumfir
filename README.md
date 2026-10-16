# Ghumfir (घुमफिर): Nepal Travel Planner

Final-year project (CACS452, Project III). A full-stack web app that plans a Nepal trip around **real road
times**, **real costs in rupees** and **your budget**, and explains how it reached the plan.

- **Frontend:** React 18 + Vite, React Router, Framer Motion (animation), Leaflet (maps), Lucide (icons)
- **Backend:** Node.js + Express REST API, JWT auth, bcrypt password hashing
- **Database:** MySQL 8 (10 tables)
- **Algorithms (written from scratch, see `server/src/algorithms/`):**

| Problem | Algorithm | File |
|---|---|---|
| Distance between places | Haversine great-circle formula + road-link graph | `geo.js` |
| Visiting order | Travelling Salesman: Nearest Neighbour + 2-opt improvement | `tsp.js` |
| Sights that fit the hours | 0/1 Knapsack (dynamic programming) | `knapsack.js` |
| Hotels + sights that fit the budget | Multiple-choice Knapsack (dynamic programming) | `knapsack.js` |
| Destination recommendations | Hybrid: tag cosine similarity, Bayesian average rating, season fit, item-item co-occurrence (collaborative filtering) | `recommender.js` |
| Search | BM25 ranking with field boosts + Levenshtein typo tolerance | `search.js` |
| Putting it together | Day allocation (greedy), first-fit day packing | `planner.js` |

---

## 1. Requirements

- Node.js 18 or newer
- MySQL 8 (or MariaDB 10.5+). On Windows, XAMPP or the MySQL Installer both work.

**On this PC** a portable MySQL 8.4 is already set up in `.mysql/` (root user, empty password, port 3306).
Double-click `start-mysql.cmd` (or run it in a terminal) and leave that window open, then start the API and client
as below. The database has already been created and seeded.

## 2. Setup

```bash
# 1) backend
cd server
copy .env.example .env        # macOS/Linux: cp .env.example .env
# edit .env: DB_USER / DB_PASSWORD for your MySQL, and set a long random JWT_SECRET
npm install
npm run db:init               # creates the "ghumfir" database, tables and demo data
npm run dev                   # API on http://localhost:5000

# 2) frontend (new terminal)
cd client
npm install
npm run dev                   # app on http://localhost:5173
```

`npm run db:init` **drops and recreates** the `ghumfir` database each time.

**Demo logins**

| Role | Email | Password |
|---|---|---|
| Admin | admin@ghumfir.test | admin123 (or `ADMIN_PASSWORD` in `.env`) |
| Traveller | demo@ghumfir.test | demo123 |

**Tests**
- `cd server && npm test`: 11 unit tests for the algorithms, including an auto-pick regression test. No database is needed.
- `cd server && npm run test:api`: 20 end-to-end API tests covering the guest plan, register/login, save, share, permissions, reviews, wishlist, admin upload, CRUD and deactivation. The API must be running.

## 2a. How the system works (workflow)

```
Traveller (browser, React)                     Server (Express)                         MySQL
───────────────────────────                    ────────────────                         ─────
1  Explore / search ───── GET /destinations ─▶ BM25 search + recommender ───────────▶ destinations, reviews
2  Planner wizard (4 steps, works as guest)
3  "Build my itinerary" ─ POST /trips/plan ──▶ planner pipeline (in memory, ~20 ms):
                                                 recommend → road legs → TSP (NN + 2-opt)
                                                 → fit days → 0/1 knapsack (sights)
                                                 → multiple-choice knapsack (hotels+budget)
                                                 → day-by-day schedule
   ◀──────────────────────────── itinerary JSON (days, costs, legs, trace)
4  Draft kept in localStorage
5  "Save" → log in / sign up ─ POST /trips ──▶ re-runs the planner (never trusts the client)
                                                 → trips + trip_destinations ──────────▶ trips, trip_destinations
6  My trips: rename / re-plan / share / print / delete
7  Saved trips feed "travellers also visited" (collaborative filtering) for everyone.

Admin: /admin → stats, add/edit/delete destinations, attractions, hotels (with photo upload),
       deactivate users, moderate reviews. Every change refreshes the planner's catalogue cache.
```

## 2b. Adding a new place (with a photo)

1. Log in as admin and open **Admin → Destinations → Add**.
2. Fill in the name, slug (used in the URL, e.g. `tilicho`), province, description, latitude/longitude (right-click the
   spot in Google Maps or OpenStreetMap to copy them), altitude, tags, best months, min/ideal days, food cost and permit fee.
3. **Photo:** drag a JPEG/PNG/WebP (max 6 MB) onto the photo box, or click it to choose a file, or paste an image URL.
   Uploads are checked by their file signature (not just their name) and stored in `server/uploads/`.
   Add the credit, e.g. `Own photo` or `Author · CC BY-SA 4.0 · link`.
4. Optionally add its **attractions** (Admin → Attractions) and **hotels** (Admin → Hotels, also with photos), and a
   **road link** (km and hours from a nearby city) in `server/db/seed-data.js` if you know the real road time.
   Without one, the planner estimates road time from the straight-line distance.
5. Save. The place appears immediately in Explore, search, recommendations and the planner.

## 3. Features

**Travellers (guests too)**
- Plan a trip in four steps: start city and dates, places (or "let Ghumfir choose"), budget/travellers/style, pace/interests
- Day-by-day itinerary with times, travel legs, check-ins, permits and a cost line per day
- Route map (Leaflet + OpenStreetMap), altitude profile, cost breakdown, budget meter
- "Why this plan" tab: TSP hours before/after 2-opt, the budget waterfall, sights left out and why
- Bus / jeep / flight compared for every leg; monsoon delay allowance; weather-risk flags for mountain flights
- Guests can plan without an account; the draft is kept in the browser and saved after sign-up
- Explore 18 destinations: typo-tolerant search, interest filters, season strip, map view
- Destination pages: sights, sample hotels by tier, reviews with rating distribution, similar places, "travellers also went to"

**Registered users**
- Save, rename, re-plan, delete and print trips; share a public read-only link
- Wishlist, reviews, personalised recommendations, profile with interests and home city

**Admin**
- Dashboard: KPIs, trips per month, most-planned destinations, style split, budget bands (hand-made SVG charts)
- CRUD for destinations, attractions and hotels; activate/deactivate users; moderate reviews

## 4. Project structure

```
ghumfir/
├── server/
│   ├── db/            schema.sql, seed data, images (Wikimedia credits), init script
│   └── src/
│       ├── algorithms/   geo, tsp, knapsack, recommender, search, planner (+ tests)
│       ├── routes/       auth, destinations, trips, admin
│       ├── middleware/   JWT auth
│       ├── catalog.js    in-memory cache of catalog data for the planner
│       └── index.js      Express app
└── client/
    └── src/
        ├── styles/       tokens.css (design system), base, components, layout, pages
        ├── components/   Itinerary, NepalMap, Contours, RouteMap, Charts, PlaceCard…
        ├── pages/        Home, Explore, Place, Planner, Trips, TripView, Admin…
        └── lib/          api client, auth context, hooks, formatting
```

## 5. Database (MySQL)

`users`, `destinations`, `attractions`, `hotels`, `road_links`, `reviews`, `wishlist`, `trips`,
`trip_destinations` (normalised trip stops, used for collaborative filtering). See `server/db/schema.sql`.

## 6. REST API

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | /api/auth/register, /api/auth/login | – | Create account / log in (JWT) |
| GET/PUT | /api/auth/me | user | Profile |
| GET | /api/destinations | optional | Search, filter, rank (BM25 + recommender) |
| GET | /api/destinations/meta | – | Start cities, interests, provinces |
| GET | /api/destinations/recommendations | optional | Personalised picks with reasons |
| GET | /api/destinations/:slug | optional | Detail, sights, hotels, reviews, similar |
| POST | /api/destinations/:id/reviews, /wishlist | user | Review (upsert) / toggle wishlist |
| POST | /api/trips/plan | – | **Run the planner** (guests allowed) |
| GET/POST | /api/trips | user | List / save (plan is re-computed on the server) |
| GET/PUT/DELETE | /api/trips/:id | owner | View / re-plan or rename / delete |
| PATCH | /api/trips/:id/share | owner | Make public or private |
| GET | /api/trips/shared/:code | – | Public shared trip |
| GET | /api/me/wishlist | user | Wishlist |
| * | /api/admin/... | admin | Stats, CRUD, users, reviews |

## 7. Design notes

The design came from a review of Wanderlog, TripIt, Roadtrippers, Tripadvisor, Stippl, Mindtrip, Layla, Wonderplan and
the Nepal Tourism Board site, plus Trustpilot and app-store complaints about them. The most common complaints were:
being forced to sign up before seeing any value, losing guest work, no cost visibility, over-packed days that ignore
travel time, opaque AI picks, and core features behind paywalls. Ghumfir responds with:
- guest planning with work kept locally
- a rupee ledger for every day
- real road hours with a monsoon allowance and travel days
- explained recommendations and an algorithm trace
- printing and sharing for free

Visual direction: a **surveyor's field notebook** in place of the usual stock-photo hero with a centred search bar,
purple "AI" gradients or a chatbot.
- **Palette:** warm paper, ink, Newar-brick terracotta, slate, moss and marigold. Light and dark themes.
- **Type:** Bricolage Grotesque for display, Instrument Sans for UI, IBM Plex Mono for numbers, Tiro Devanagari Hindi for Nepali.
- **Motifs:** procedurally generated contour lines, a survey-style Nepal plot drawn from real coordinates,
  boarding-pass itinerary headers with station codes, and a torn-receipt cost estimate.
- **Motion:** route lines that ink in, count-up totals, staggered reveals and shared-layout tab underlines.
  All of it respects `prefers-reduced-motion`.

## 8. Credits

Photos: Wikimedia Commons (CC BY / CC BY-SA). Authors are listed on the in-app Credits page and on each photo.
Map data © OpenStreetMap contributors; tiles © CARTO. Fonts: Google Fonts (OFL). Icons: Lucide (ISC).
Hotel names and prices are **sample data**. Fees and road times are approximate.
