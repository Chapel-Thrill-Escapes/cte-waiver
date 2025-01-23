import { createHmac } from 'crypto';
// netlify/edge-functions/bookeo-proxy.js
// An Edge Function that fetches data from Bookeo and returns it to the client.
// Runs in Deno on Netlify's Edge network.

export default async (request, context) => {

  // Get the Origin header from the request
  const originHeader = request.headers.get("origin") || "";

  // If it doesn’t match the CTE domain, block the request
  //const allowedOrigin = "https://www.chapelthrillescapes.com";
  const allowedOrigin = "https://www.chapelthrillescapes.com";
  if (originHeader !== allowedOrigin) {
    return new Response("Forbidden", { status: 403 });
  }

  // If the origin is allowed, add CORS response headers
  //    so the browser knows you allow that origin:
  const corsHeaders = {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };

  // Handle OPTIONS (the preflight) if relevant
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }
  
  try {

    // Make Bookeo request to bookings data
    const { searchParams } = new URL(request.url);
    const bookingDateStr = searchParams.get("bookingDate");
    const sessionId = searchParams.get("sessionId");
    const startDate = new Date(bookingDateStr);
    startDate.setDate(startDate.getDate() - 5); // Adding buffer of 5 days
    const endDate = new Date(bookingDateStr);
    endDate.setDate(endDate.getDate() + 5); // Adding buffer of 5 days
    const startTime = startDate.toISOString();
    const endTime = endDate.toISOString();

    const apiKey = Netlify.env.get("BOOKEO_API_KEY");
    const secretKey = Netlify.env.get("BOOKEO_SECRET_KEY");

    const url = `https://api.bookeo.com/v2/bookings?apiKey=${apiKey}&secretKey=${secretKey}&expandParticipants=true&startTime=${startTime}&endTime=${endTime}`;
    const response = await fetch(url);

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: `Bookeo request failed: ${response.statusText}` }),
        {
          status: response.status,
          headers: {
            'Content-Type': 'application/json',
            // Important: set CORS headers even for error responses
            'Access-Control-Allow-Origin': allowedOrigin,
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        }
      );
    }

    // If successful, return data and hash of sessionId to verify in later steps on client-side
    const data = await response.json();
    const json_data = JSON.stringify(data);
    
    const secret = Netlify.env.get("RSA_PRIVATE_KEY");
    const hash = createHmac('sha256', secret)
              .update(sessionId)
              .digest('hex');
    json_data.handshake = hash;
    
    return new Response(json_data, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (error) {
    // Catch any runtime errors and set CORS headers
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }
};
