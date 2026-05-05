# E-Pharmacy

A dynamic web application built with Next.js (React) for the frontend and MongoDB for the backend. This platform allows patients to upload prescriptions, and pharmacists can view and fulfill them from nearby medical stores. Features an advanced pharmacy finder with Google Maps integration and intelligent ranking system.

## Features

- **Patient Upload**: Patients can upload prescription images along with their details.
- **Pharmacist Dashboard**: Pharmacists can view pending prescriptions in their area and assign them for fulfillment.
- **Advanced Pharmacy Finder**: Interactive Google Maps integration with location-based search and intelligent ranking.
- **Service Partner Ranking**: Pharmacies using our e-pharmacy service are ranked higher in search results.
- **Prescription Upload Support**: Clear tagging shows which pharmacies support prescription uploads.
- **Location-based Matching**: Prescriptions are filtered by location to connect patients with nearby pharmacists.
- **Geospatial Search**: Find pharmacies within a specified radius using GPS coordinates.

## Tech Stack

- **Frontend**: Next.js, React, Tailwind CSS, Google Maps JavaScript API
- **Backend**: Next.js API Routes, MongoDB with Mongoose
- **Database**: MongoDB with geospatial indexing
- **Maps**: Google Maps Platform

## Getting Started

### Prerequisites

- Node.js (v18 or later)
- MongoDB (local or MongoDB Atlas)
- Google Maps API Key

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd e-pharmacy
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env.local` file in the root directory and add your configuration:
   ```
   # MongoDB Atlas connection strings for separate databases
   PATIENT_MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/patients
   PHARMACIST_MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/pharmacists
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/epharmacy

   # JWT Secret for authentication
   JWT_SECRET=your-super-secret-jwt-key-here-make-it-long-and-random

   # Google Maps API Key (get from Google Cloud Console)
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-api-key-here
   ```

4. Seed sample pharmacy data:
   ```bash
   curl -X POST http://localhost:3000/api/pharmacies/seed
   ```

5. Run the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

- **Home Page**: Navigate to upload prescriptions or access the pharmacist dashboard.
- **Upload Prescription**: Fill in patient details and upload a prescription image.
- **Pharmacist Dashboard**: Enter your location to view pending prescriptions and assign them.
- **Pharmacy Finder**: Use the interactive map to find nearby pharmacies. Service partners are marked with stars and ranked higher. Pharmacies supporting prescription uploads are clearly tagged.

## API Endpoints

### Prescriptions
- `POST /api/prescriptions` - Upload a new prescription
- `GET /api/prescriptions` - Fetch prescriptions (with optional location and status filters)
- `PUT /api/prescriptions/[id]` - Update prescription status

### Users
- `POST /api/users` - Create a new user (patient or pharmacist)
- `GET /api/users` - Fetch users by role

### Pharmacies
- `GET /api/pharmacies` - Search pharmacies with geospatial queries and ranking
  - Query parameters: `lat`, `lng`, `radius`, `q` (search query)
- `POST /api/pharmacies` - Register a new pharmacy
- `POST /api/pharmacies/seed` - Seed database with sample pharmacy data

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/logout` - User logout

## Pharmacy Ranking System

Pharmacies are intelligently ranked based on multiple criteria:

1. **Service Partners**: Pharmacies using our e-pharmacy service (★ Service Partner) are ranked highest
2. **Subscription Tier**: Premium > Yearly > Monthly > Free
3. **Rating**: Higher rated pharmacies appear first
4. **Prescription Upload Support**: Tagged pharmacies (📄 Upload Support) support digital prescription uploads

## Google Maps Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Maps JavaScript API
4. Create credentials (API Key)
5. Add your API key to `.env.local` as `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
6. Optionally restrict the API key to your domain for security

## Build and Deploy

To build the project for production:

```bash
npm run build
```

To start the production server:

```bash
npm start
```

Deploy on platforms like Vercel, Netlify, or any Node.js hosting service.

### Deploying to Netlify

This repository includes a `netlify.toml` configuration for the Netlify Next.js plugin.

1. In your Netlify site settings, add these environment variables:
   - `MONGODB_URI`
   - `PATIENT_MONGODB_URI`
   - `PHARMACIST_MONGODB_URI`
   - `JWT_SECRET`
   - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

2. For MongoDB Atlas, allow Netlify to connect by adding a network access entry:
   - `0.0.0.0/0` (required for serverless deployments)

3. Do not store your MongoDB credentials in frontend code.

4. If your build logs show a MongoDB connection error, verify the exact env variable names in Netlify and that the Atlas cluster allows connections from serverless IP ranges.

> Netlify is frontend hosting plus serverless functions. Your backend is running inside Next.js API routes, so MongoDB must be reachable from those functions at runtime.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

This project is licensed under the MIT License.
