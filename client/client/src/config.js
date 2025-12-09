// client/src/config.js
const config = {
  // If we are on localhost, use localhost. Otherwise, use the deployed URL.
  API_URL: window.location.hostname === 'localhost' 
    ? 'http://localhost:5000' 
    : 'https://your-backend-name.onrender.com' // We will get this URL in Phase 2
};

export default config;