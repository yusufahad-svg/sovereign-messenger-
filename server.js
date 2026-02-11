const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 8080;

// Serve static files from the tip-jar-pwa/dist directory
app.use(express.static(path.join(__dirname, 'tip-jar-pwa/dist')));

// Handle SPA routing: serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'tip-jar-pwa/dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
