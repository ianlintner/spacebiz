// Start a simple check for portrait URLs
// Uses the built-in global fetch available in Node 22+
async function checkPortraitUrls() {
  const urls = [
    "http://localhost:5173/portraits/ceo/alexander_zheng.webp",
    "http://localhost:5173/portraits/ceo/alexander_zheng.png",
  ];

  for (const url of urls) {
    try {
      const response = await fetch(url);
      console.log(`${url}: ${response.status} ${response.statusText}`);
    } catch (err) {
      console.error(`${url}: ${err.message}`);
    }
  }
}

checkPortraitUrls();
