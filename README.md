# trip-visualization - Travel Visualization App

A beautiful, production-ready web application for visualizing personal travel data with interactive maps, fancy animations, and comprehensive trip management.

## Features

- **Interactive Map** - Full-screen OpenStreetMap with color-coded routes by transportation type
- **Rich Trip Cards** - Hover over destinations to see detailed info with city images
- **Advanced Filtering** - Filter by date, transportation, companions, country, and expenses
- **Trip Details** - Editorial-style pages with route maps, timelines, and expense breakdowns
- **Admin Panel** - Protected CRUD operations with Google authentication
- **JSON Import** - Easily import trips from JSON files

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Auth**: NextAuth.js with Google provider
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui
- **Maps**: Leaflet with OpenStreetMap tiles
- **Database**: SQLite with Prisma ORM
- **Animations**: Framer Motion

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

```bash
cp sample.env .env
```

### 3. Initialize the database

```bash
npx prisma generate
npx prisma db push
```

### 4. Seed the database (optional)

Populate the database with sample trip data:

```bash
npx prisma db seed
```

### 5. Run the development server

```bash
npm run dev
```

## Importing Trips

1. Sign in to the admin panel at `/admin`
2. Click "Import JSON"
3. Upload a JSON file with the following format:

```json
[
  {
    "id": "trip-1",
    "name": "Trip Name",
    "description": "Optional description",
    "startDate": "2024-01-01",
    "endDate": "2024-01-05",
    "destinations": [
      {
        "city": "Berlin",
        "country": "Germany",
        "latitude": 52.52,
        "longitude": 13.405,
        "transportationType": null
      },
      {
        "city": "Paris",
        "country": "France",
        "latitude": 48.8566,
        "longitude": 2.3522,
        "transportationType": "plane"
      }
    ],
    "companions": ["Friend1", "Friend2"],
    "expenses": {
      "hotel": 500,
      "food": 200,
      "transportation": 300,
      "entryFees": 50,
      "other": 100
    }
  }
]
```

### Transportation Types

Supported values: `plane`, `train`, `car`, `bus`, `boat`, or `null` for the starting point.

## Project Structure

```
├── app/
│   ├── page.tsx              # Main map view
│   ├── trips/[id]/page.tsx   # Trip details page
│   ├── admin/
│   │   ├── page.tsx          # Admin dashboard
│   │   ├── login/page.tsx    # Login page
│   │   └── actions.ts        # Server actions
│   └── api/auth/             # NextAuth API routes
├── components/
│   ├── map/                  # Map components
│   ├── sidebar/              # Sidebar components
│   ├── filters/              # Filter bar components
│   ├── trip-detail/          # Trip detail components
│   └── admin/                # Admin components
├── lib/
│   ├── auth.ts               # Auth configuration
│   ├── db.ts                 # Prisma client
│   ├── trips.ts              # Trip service functions
│   └── types.ts              # TypeScript types
└── prisma/
    └── schema.prisma         # Database schema
```

## License

MIT
