const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

// Serve static assets from project root
app.use(express.static(__dirname, {
  index: 'index.html'
}));

// Explicit fallback to index.html for root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`CAD QC Tools server running at http://0.0.0.0:${PORT}`);
});
