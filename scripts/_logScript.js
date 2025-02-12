(function () {
  // Function to parse URL search parameters
  function getSearchParams(url) {
    let params = {};
    let parser = new URL(url);
    for (let [key, value] of parser.searchParams.entries()) {
      params[key] = value;
    }
    return params;
  }

  // Function to log page view
  function logPageView() {
    let url = window.location.href;
    let params = getSearchParams(url);
    let logData = {
      createdAt: Date.now(),
      level: 'info',
      environment: 'official-website',
      message: { url, params },
    };

    // Send log to your service API
    fetch('https://app.aident.ai/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(logData),
    }).catch((error) => console.error('Error logging:', error));
  }

  // Log page view when the script loads
  logPageView();
})();
