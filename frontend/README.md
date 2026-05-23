# Drishti AI: Event Guardian 🛡️

**Drishti AI: Event Guardian** is an AI-powered situational awareness platform designed for proactive crowd safety management during large-scale events. It provides a real-time, intelligent command center for security teams to monitor, analyze, and respond to incidents, ensuring a safer environment for everyone.

![Drishti AI](https://res.cloudinary.com/dams0r5uk/image/upload/v1753526208/Picture1_wlf2zp.jpg)

---

## 📸 Screenshots

### Admin Dashboard
![Drishti AI Dashboard](https://res.cloudinary.com/dams0r5uk/image/upload/v1755239920/e0596e3ca77b7bdadbf4e6a58e4f4b4221dbe2807421542949fae856a4d157f8_z2rcvo.png)

### Camera Feed Page
![Drishti AI Cam Feed Page](https://res.cloudinary.com/dams0r5uk/image/upload/v1755241466/cf22522010502412d556b0e81cca94e7561f01df0d76c2da2fdb069e78466251_a63gvu.png)

### Map View Page
![Drishti AI Map-view Page](https://res.cloudinary.com/dams0r5uk/image/upload/v1755241475/4c08102057ea1a595d956b83eb21ccf4680d4dee0a2a2906fbca86cdac6c4edb_jzvefm.png)

### Grievance Management
![Drishti AI Grievance Page](https://res.cloudinary.com/dams0r5uk/image/upload/v1755241443/a0806a643b0b8c0b319efe925fa3bce46206f5597101ffb48e1d33ad47c57d1e_iu7uyj.png)

### User Dashboard
![Drishti AI User Dashboard](https://res.cloudinary.com/dams0r5uk/image/upload/v1755241455/2974e53bf8a571b18c20c4b02cd01bed833a3963c79495a7c07800af1cbd8c93_xeaukf.png)

---

## ✨ Key Features

### Admin Features
- **Real-time Admin Dashboard:** Central hub displaying key metrics like active guards, live alerts, and open grievances with dynamic, animated counters
- **AI-Powered Summaries:** On-demand, Genkit-powered summaries of the entire event status for quick situational awareness
- **Live Video Feeds:** Monitor multiple camera streams in real-time with automatic reconnection and status indicators
- **Interactive Map View:** Visualize crowd density and points of interest on a live map using MapTiler
- **Automated Alert System:** Intelligent alert system identifying and prioritizing potential issues like high crowd density
- **Grievance Management:** Dedicated interface for managing and resolving user-submitted grievances

### User Features
- **User-Friendly Portal:** Separate dashboard for event attendees to report issues and get assistance
- **AI Chatbot Assistant:** Empathetic chatbot powered by Genkit to guide users and answer questions
- **Report Forms:** Easy-to-use forms for submitting medical emergencies and missing person reports with photo uploads
- **Secure Authentication:** Role-based login system for both Admins and Users

---

## 🚀 Tech Stack

### Frontend
- **Framework:** [Next.js](https://nextjs.org/) (with App Router)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **UI Components:** [ShadCN UI](https://ui.shadcn.com/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Mapping:** [MapTiler SDK](https://maptiler.com/sdk/)

### Backend & Database
- **Database:** [Firebase Firestore](https://firebase.google.com/docs/firestore)
- **Authentication:** [Firebase](https://firebase.google.com/)
- **AI Integration:** [Google Genkit](https://firebase.google.com/docs/genkit) with Gemini Models

### External Services
- **Video Processing & Alerts API:** Backend service running on `localhost:5000` for live feed data

---

## 📦 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/en) (v20 or later recommended)
- `npm` or compatible package manager
- [Firebase](https://firebase.google.com/) project
- [MapTiler](https://maptiler.com/) API key

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd <repository-directory>
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file in the root directory:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=1:...:web:...

# MapTiler API Key
NEXT_PUBLIC_MAPTILER_API_KEY=your_maptiler_api_key

# Google AI (for Genkit)
GEMINI_API_KEY=your_gemini_api_key
```

### 4. Database Setup

#### Seed Initial Data
```bash
# Seed medical staff data
npm run db:seed

# Seed ambulance data
npm run db:seed:ambulances
```

#### Manual Collection Setup
Add the following collections to your Firestore database:
- `admin` - Admin user documents
- `users` - Regular user documents

### 5. Running the Application

The application requires three concurrent processes:

#### Terminal 1: Backend API
Ensure your Python-based video processing API is running:
```bash
# Your backend API should be accessible at:
http://127.0.0.1:5000
```

#### Terminal 2: Genkit AI Server
```bash
npm run genkit:watch
```

#### Terminal 3: Next.js Frontend
```bash
npm run dev
```

🌐 **Access the application at:** `http://localhost:9002`

---

## 📝 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build production application |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run genkit:watch` | Start Genkit development server |
| `npm run db:seed` | Seed medical staff data |
| `npm run db:seed:ambulances` | Seed ambulance data |

---

## 🔧 Configuration

### Firebase Setup
1. Create a new Firebase project
2. Enable Firestore database
3. Set up Authentication (Email/Password)
4. Add your web app configuration to `.env`

### MapTiler Setup
1. Sign up for a MapTiler account
2. Generate an API key
3. Add the key to your `.env` file

### Genkit Setup
1. Obtain a Gemini API key from Google AI Studio
2. Add the key to your `.env` file

---

## 🏗️ Project Structure

```
.
├── app/                    # Next.js app directory
├── components/            # Reusable React components
├── lib/                   # Utility functions and configurations
├── public/                # Static assets
├── genkit/                # AI flows and functions
├── .env                   # Environment variables
├── package.json          # Dependencies and scripts
└── README.md            # Project documentation
```

---

## 🔐 Authentication & Security

- **Role-based Access Control:** Separate dashboards for admins and users
- **Firebase Authentication:** Secure login/logout functionality
- **Protected Routes:** Automatic redirection based on user roles
- **Data Privacy:** Secure handling of sensitive user information

---

