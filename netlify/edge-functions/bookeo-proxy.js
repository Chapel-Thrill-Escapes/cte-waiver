// netlify/edge-functions/bookeo-proxy.js
// An Edge Function that fetches data from Bookeo and returns it to the client.
// Runs in Deno on Netlify's Edge network.

export default async (request, context) => {
  try {
    // 1. Handle OPTIONS request (the "preflight" check):
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': 'https://www.chapelthrillescapes.com',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    // 2. Make your Bookeo request
    const apiKey = Netlify.env.get("BOOKEO_API_KEY");
    const secretKey = Netlify.env.get("BOOKEO_SECRET_KEY");

    const url = `https://api.bookeo.com/v2/customers?apiKey=${apiKey}&secretKey=${secretKey}`;
    const response = await fetch(url);

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: `Bookeo request failed: ${response.statusText}` }),
        {
          status: response.status,
          headers: {
            'Content-Type': 'application/json',
            // Important: set CORS headers even for error responses
            'Access-Control-Allow-Origin': 'https://www.chapelthrillescapes.com',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        }
      );
    }

    // 3. If successful, return data with CORS headers
    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': 'https://www.chapelthrillescapes.com',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (error) {
    // 4. Catch any runtime errors and set CORS headers
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': 'https://www.chapelthrillescapes.com',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }
};
