


Deployment Instructions:

🚀 Frontend Deployment (Firebase Hosting)
Build the React app:
npm run build

Deploy to Firebase Hosting:
firebase deploy --only hosting


⚙️ Backend Deployment
Ensure the following changes are made:

✅ Update the port number in server.js(uncomment).

✅ Update relevant values in your constants/config file.

Deploy the latest commit in render.



Run Local :


cd .\it_ticketing_tool\it_ticketing_frontend 
npm start

cd .\it_ticketing_tool\ticketing_tool_backend
node server.js