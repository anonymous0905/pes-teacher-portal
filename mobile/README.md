# PES Teacher Mobile

This directory contains a basic React Native app built with Expo. The app mirrors the existing web portal's login flow and styling. It uses the same Supabase backend so credentials and environment variables remain consistent.

## Setup

1. Install dependencies from the `mobile` folder:

   ```bash
   cd mobile
   npm install
   ```

2. Define `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in a `.env` file or through your environment.

3. Start the development server:

   ```bash
   npm start
   ```

This opens the Expo DevTools where you can run the app on an emulator or a physical device.
