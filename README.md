# tripz - Travel Visualization App

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

## Quick Start (Production with Docker)

### 1. Create environment file

```bash
cp sample.env .env
```

Edit `.env` with your production values:

```bash
# Generate a secure secret
openssl rand -base64 32

# Set in .env:
NEXTAUTH_SECRET="<your-generated-secret>"
NEXTAUTH_URL="https://your-domain.com"
GOOGLE_CLIENT_ID="<your-google-client-id>"
GOOGLE_CLIENT_SECRET="<your-google-client-secret>"
```

### 2. Build and run

```bash
docker compose build
docker compose up
```

The app will be available at `http://localhost/` (or `http://trips.local/` if deployed on a Raspberry Pi with mDNS configured).

### 3. Manage the container

```bash
# View logs
docker compose logs -f

# Stop
docker compose down

# Restart
docker compose restart
```

> **Note:** The SQLite database is persisted in a Docker volume (`tripz-data`). Your data will survive container restarts and rebuilds. See the [Data Persistence](#data-persistence) section below for details.

---

## Deploying on Raspberry Pi (Local Network Access)

Access your app at `http://trips.local/` from any device on your local network.

### Prerequisites

- Raspberry Pi (3, 4, or 5) with Raspberry Pi OS
- Docker and Docker Compose installed
- Devices on the same local network

### Step 1: Set Up Hostname

SSH into your Raspberry Pi:

```bash
# Set hostname to "trips"
sudo hostnamectl set-hostname trips

# Install mDNS daemon (enables .local resolution)
sudo apt-get update
sudo apt-get install -y avahi-daemon

# Restart to apply
sudo systemctl restart avahi-daemon
```

### Step 2: Configure Environment

```bash
cp sample.env .env
```

Edit `.env`:

```bash
NEXTAUTH_URL="http://trips.local"
NEXTAUTH_SECRET="<generate-with-openssl-rand-base64-32>"
GOOGLE_CLIENT_ID="<your-google-client-id>"
GOOGLE_CLIENT_SECRET="<your-google-client-secret>"
ADMIN_TEMP_EMAIL="<your-admin-email>"
ADMIN_TEMP_PASSWORD="<your-admin-password>"
```

### Step 3: Update Google OAuth

In the [Google Cloud Console](https://console.developers.google.com), add to your OAuth credentials:

- **Authorized JavaScript origins**: `http://trips.local`
- **Authorized redirect URIs**: `http://trips.local/api/auth/callback/google`

### Step 4: Build and Run

```bash
docker compose build
docker compose up -d
```

### Step 5: Access the App

From any device on your network:

```
http://trips.local/
```

### Troubleshooting

| Issue                       | Solution                                                                |
| --------------------------- | ----------------------------------------------------------------------- |
| Can't resolve `trips.local` | Ensure avahi-daemon is running: `sudo systemctl status avahi-daemon`    |
| Windows can't find `.local` | Install [Bonjour Print Services](https://support.apple.com/kb/DL999)    |
| Connection refused          | Check container is running: `docker compose ps`                         |
| Auth errors                 | Clear browser cookies and verify `NEXTAUTH_URL` matches the URL exactly |

---

## Development Setup

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

## Docker Configuration

### Environment Variables

| Variable               | Description                                                        | Required |
| ---------------------- | ------------------------------------------------------------------ | -------- |
| `NEXTAUTH_SECRET`      | Secret for signing tokens. Generate with `openssl rand -base64 32` | Yes      |
| `NEXTAUTH_URL`         | Your production URL (e.g., `https://your-domain.com`)              | Yes      |
| `GOOGLE_CLIENT_ID`     | Google OAuth client ID                                             | Yes      |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret                                         | Yes      |

### Customizing the Port

The default configuration serves on port 80. To use a different port, edit `docker-compose.yml`:

```yaml
ports:
  - '8080:3000' # Access on port 8080
```

## How the Docker Build Works

The Docker build process:

1. **Installs dependencies** - Runs `npm ci` to install all packages
2. **Generates Prisma client** - Creates the database client code
3. **Creates seed database** - Initializes SQLite database with schema and sample data
4. **Builds Next.js app** - Creates production build with standalone output

When the container starts:

1. **Fixes permissions** - Ensures the data volume is writable
2. **Copies seed database** - If no database exists in the volume, copies the pre-built seed database
3. **Starts the app** - Runs the Next.js server

This approach means:

- Fast container startup (no database initialization at runtime)
- Database schema is always correct (created during build)
- Sample data is available immediately on first run

## Data Persistence

### How Volumes Work

By default, each container has its own isolated filesystem. When a container is removed, all changes made to its filesystem are lost. **Docker volumes** solve this by providing persistent storage that survives container restarts and removals.

In this application:

- The SQLite database (`tripz.db`) is stored at `/app/data/tripz.db` inside the container
- This directory is mounted to a Docker volume named `tripz-data`
- A pre-seeded database is created during the Docker build process
- On first container start, the seed database is copied to the volume
- All subsequent changes are persisted to the volume
- Your data persists even when you stop, remove, or rebuild containers

> **Learn more:** See the [Docker documentation on persisting data](https://docs.docker.com/get-started/workshop/05_persisting_data/) for a detailed explanation of volumes.

### Verifying Data Persistence

You can verify that your data persists across container restarts:

1. Start the container and add some trips through the admin panel
2. Stop and remove the container: `docker compose down`
3. Start a new container: `docker compose up`
4. Your trips should still be there!

### Inspecting the Volume

To see where Docker stores your database data on disk:

```bash
# List all volumes
docker volume ls

# Inspect the tripz-data volume
docker volume inspect trip-visualization_tripz-data
```

The output shows the `Mountpoint` where the data is stored on disk. On most systems, you'll need root access to access this directory directly.

Example output:

```json
[
  {
    "CreatedAt": "2024-01-15T10:30:00Z",
    "Driver": "local",
    "Labels": {},
    "Mountpoint": "/var/lib/docker/volumes/trip-visualization_tripz-data/_data",
    "Name": "trip-visualization_tripz-data",
    "Options": {},
    "Scope": "local"
  }
]
```

### Backing Up the Database

```bash
# Method 1: Copy database from running container
docker cp tripz:/app/data/tripz.db ./backup.db

# Method 2: Using docker compose exec (if container is running)
docker compose exec app cp /app/data/tripz.db /tmp/backup.db
docker cp tripz:/tmp/backup.db ./backup.db

# Method 3: Access volume directly (requires root)
docker volume inspect trip-visualization_tripz-data
# Then copy from the Mountpoint path shown above
```

### Resetting the Database

To reset the database to its initial seeded state (created during build):

```bash
# Method 1: If container is running
docker compose restart

# Method 2: Stop, remove database, and restart
docker compose down
docker run --rm -v trip-visualization_tripz-data:/data alpine rm -f /data/tripz.db
docker compose up -d
```

> **Warning:** This will delete all your trip data. On the next container start, the seed database from the build will be copied to restore sample data.

### Removing the Volume (Complete Data Reset)

To completely remove all persisted data:

```bash
# Stop and remove containers
docker compose down

# Remove the volume (this deletes ALL data permanently)
docker volume rm tripz_tripz-data

# Start fresh
docker compose up
```

> **Warning:** This permanently deletes all your data. The volume will be recreated automatically when you start the container again.

### Fixing Volume Permissions

If you encounter permission errors (e.g., "Permission denied" when creating the database), the volume may have incorrect ownership. Fix it by:

```bash
# Stop the container
docker compose down

# Remove the volume to recreate it with correct permissions
docker volume rm tripz_tripz-data

# Start again - the volume will be recreated with proper permissions
docker compose up
```

The entrypoint script automatically fixes volume permissions on startup by running as root initially, then switching to the `nextjs` user (UID 1001) for running the application.

### Rebuilding After Code Changes

When you make code changes, rebuild the image:

```bash
docker compose build
docker compose up
```

Your database data will persist through rebuilds because it's stored in a volume separate from the container image.
