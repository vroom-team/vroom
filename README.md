<div align="center">
  <img src="client/assets/vroom_logo.png" alt="Vroom Logo" width="200" height="200"/>
</div>

<p align=center> 
# Vroom 

A comprehensive mobile application that combines real-time location tracking with social features, allowing users to record their journeys, share travel experiences, and connect with fellow travelers.

## Overview

Vroom is a full-stack application built with React Native and Next.js that provides users with the ability to track their trips in real-time, share posts about their travel experiences, and discover new destinations through AI-powered recommendations. The application features a modern, intuitive interface with robust backend support for user management, social interactions, and data persistence.

## Features

### Core Functionality

- **Real-time Trip Tracking**: GPS-based location tracking with live route recording
- **Social Feed**: Share and discover travel posts with photos and descriptions
- **AI-Powered Recommendations**: Get personalized travel suggestions based on preferences
- **User Profiles**: Comprehensive profile management with trip history
- **Social Interactions**: Follow users, like posts, and engage with comments
- **Wishlist Management**: Save and organize desired travel destinations

### Key Capabilities

- **Background Location Tracking**: Continuous GPS monitoring during trips
- **Interactive Maps**: Visual representation of recorded routes and locations
- **Trip Statistics**: Distance, duration, and speed tracking
- **Image Upload**: Cloudinary integration for media management
- **Secure Authentication**: JWT-based user authentication system
- **Cross-platform Support**: iOS and Android compatibility

## Technology Stack

### Frontend (Mobile App)

- **Framework**: React Native with Expo SDK 53
- **Navigation**: React Navigation v7
- **Maps**: React Native Maps with location services
- **State Management**: React Context API
- **Storage**: Expo SecureStore for sensitive data
- **Image Handling**: Expo ImagePicker

### Backend (API Server)

- **Framework**: Next.js 15 with TypeScript
- **Database**: MongoDB with Mongoloquent ODM
- **Authentication**: JWT with bcrypt password hashing
- **File Storage**: Cloudinary for image management
- **AI Integration**: Google Generative AI for recommendations
- **Validation**: Zod schema validation

## Project Structure

```
final-project/
├── client/                 # React Native mobile application
│   ├── src/
│   │   ├── contexts/       # React contexts for state management
│   │   ├── navigators/     # Navigation configuration
│   │   └── screens/        # Application screens
│   ├── android/           # Android-specific configurations
│   ├── ios/              # iOS-specific configurations
│   └── assets/           # Static assets and images
└── server/               # Next.js API server
    ├── src/
    │   ├── app/api/      # API route handlers
    │   ├── config/       # Configuration files
    │   ├── models/       # Data models
    │   └── server/       # Server utilities and helpers
    └── public/           # Static files
```

## Installation & Setup

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn package manager
- Expo CLI
- MongoDB database
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)

### Backend Setup

1. Navigate to the server directory:

```bash
cd server
```

2. Install dependencies:

```bash
npm install
```

3. Configure environment variables:
   Create a `.env.local` file with the following variables:

```
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
GOOGLE_AI_API_KEY=your_google_ai_api_key
```

4. Start the development server:

```bash
npm run dev
```

### Mobile App Setup

1. Navigate to the client directory:

```bash
cd client
```

2. Install dependencies:

```bash
npm install
```

3. Start the Expo development server:

```bash
npm start
```

4. Run on specific platforms:

```bash
# For Android
npm run android

# For iOS
npm run ios
```

## Development Challenges & Solutions

### Real-time Location Tracking Implementation

**Challenge**: Implementing reliable real-time location tracking presented several technical hurdles:

- Expo Maps being experimental made integration more complex than previous versions
- Core tracking features not functioning properly in iOS/Android simulators
- Required testing on physical devices for accurate GPS functionality

**Solution**:

- Built and deployed APK for Android testing to ensure real-world functionality
- Implemented background task management using Expo TaskManager
- Created robust location permission handling and fallback mechanisms
- Developed comprehensive error handling for location services

**Technical Implementation**:

- Utilized `expo-location` for GPS tracking with configurable accuracy settings
- Implemented `expo-background-task` for continuous tracking during app backgrounding
- Created custom location update intervals with optimized battery usage
- Built real-time coordinate streaming to backend API

## API Endpoints

### Authentication

- `POST /api/register` - User registration
- `POST /api/login` - User authentication

### Trip Management

- `GET /api/trips` - Retrieve user trips
- `POST /api/trips` - Create new trip
- `PUT /api/trips/:id` - Update trip details

### Social Features

- `GET /api/post` - Fetch posts feed
- `POST /api/post` - Create new post
- `POST /api/likes` - Like/unlike posts
- `POST /api/comments` - Add comments
- `POST /api/follow` - Follow/unfollow users

### AI Recommendations

- `POST /api/ai-recommendation` - Get AI-powered travel suggestions

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/new-feature`)
5. Create a Pull Request

## License

This project is developed as part of Hacktiv8 Final Project. All rights reserved.

## Contact

For questions or support regarding this project, please contact the vroom team.

---

**Note**: This application requires physical device testing for location-based features. Simulator testing is limited for GPS functionality.

---

Made with ❤️ by Vroom Team
