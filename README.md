# Parent Portal

## Setup Instructions

1. **Firebase Configuration**
   - Edit `firebase-config.js` in this folder
   - Update with your Firebase project credentials:
   
   ```javascript
   // firebase-config.js
   export const firebaseConfig = {
       apiKey: "YOUR_API_KEY",
       authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
       projectId: "YOUR_PROJECT_ID",
       storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
       messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
       appId: "YOUR_APP_ID",
       measurementId: "G-XXXXXXXXXX"
   };

   // Google Analytics Measurement ID
   export const GA_MEASUREMENT_ID = "G-XXXXXXXXXX";

   // School Contact Information
   export const SCHOOL_CONTACT = {
       phone: "+91-1234567890",
       email: "admissions@yourschool.com",
       name: "Your School Name"
   };
   ```

2. **Get Firebase Config**
   - Go to: https://console.firebase.google.com
   - Select your project (same as teacher admin)
   - Click Settings (gear icon) > Project Settings
   - Scroll to "Your apps" section
   - Copy the firebaseConfig object
   - Paste into `firebase-config.js`

3. **Google Analytics Setup**
   - Create a Google Analytics 4 property at https://analytics.google.com
   - Copy your Measurement ID (G-XXXXXXXXXX)
   - Update `GA_MEASUREMENT_ID` in `firebase-config.js`

4. **Update School Contact**
   - Edit `SCHOOL_CONTACT` in `firebase-config.js`
   - Add your school's phone, email, and name
   - This will appear in the parent portal

5. **Firebase Setup**
   - Use the same Firebase project as Teacher Admin
   - Firestore is already configured
   - No authentication required (anonymous access)

6. **Usage**
   - Parents access via URL: `https://yoursite.com/?phone=9963556283`
   - Phone number parameter loads associated reports
   - Anonymous access - no login required

7. **Deploy**
   ```bash
   firebase init hosting
   firebase deploy
   ```

## Features
- Anonymous access via phone number URL parameter
- View all reports for student(s) with that phone number
- Dropdown to select student/class
- Detailed report with:
  - Percentile & Performance Band
  - Subject-wise Round 1 vs Round 2 comparison
  - Diagnostic insights
  - Admission eligibility message
  - Scholarship information
  - Clear next steps CTA
- Google Analytics event tracking
- Download digital certificate
