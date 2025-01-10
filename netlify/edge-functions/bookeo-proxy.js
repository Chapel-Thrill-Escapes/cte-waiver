// netlify/edge-functions/bookeo-proxy.js
// An Edge Function that fetches data from Bookeo and returns it to the client.
// Runs in Deno on Netlify's Edge network.

export default async (request, context) => {
  try {
    // 1. Parse the incoming request URL to extract any query parameters.
    //    For example: https://<your-site>/bookeo-proxy?apiKey=XXX&secretKey=YYY
    const { searchParams } = new URL(request.url);
    const apiKey = searchParams.get("apiKey") || context.env.BOOKEO_API_KEY;
    const secretKey = searchParams.get("secretKey") || context.env.BOOKEO_SECRET_KEY;

    // 2. Construct the Bookeo API URL using the keys
    const bookeoUrl = `https://api.bookeo.com/v2/customers?apiKey=${apiKey}&secretKey=${secretKey}`;

    // 3. Make the request to Bookeo
    const response = await fetch(bookeoUrl);
    if (!response.ok) {
      // If Bookeo responds with a non-2xx status, forward that status/code
      return new Response(
        JSON.stringify({ error: `Bookeo request failed: ${response.statusText}` }),
        {
          status: response.status,
          headers: { 'content-type': 'application/json' }
        }
      );
    }

    // 4. Parse the JSON data from Bookeo
    const data = await response.json();

    // 5. Return the data as JSON
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  } catch (error) {
    // Catch any runtime or network errors
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'content-type': 'application/json' }
    });
  }
};
