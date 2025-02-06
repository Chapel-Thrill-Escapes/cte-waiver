// netlify/edge-functions/waiver-submit.js
// An Edge Function that: 
//     1. forwards the received client data via POST (x-www-form-urlencoded) to a Google Web App.
// Runs in Deno on Netlify's Edge network.

import { createHmac } from 'crypto';
import { Redis } from "https://esm.sh/@upstash/redis";

const redis = new Redis({
  url: Netlify.env.get("UPSTASH_REDIS_REST_URL"),
  token: Netlify.env.get("UPSTASH_REDIS_REST_TOKEN"),
});

export default async (request, context) => {

  const originHeader = request.headers.get("origin") || ""; // Get the Origin header from the request

  const allowedOrigin = "https://www.chapelthrillescapes.com";
  if (originHeader !== allowedOrigin) { 
      return new Response("Unauthorized", { status: 401 }); // If the Origin doesn’t match the allowed domain, block the request
  }
  
  const corsHeaders = { // If the origin is allowed, set CORS response headers for server responses
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };

  if (request.method === "OPTIONS") { // Handle OPTIONS (the preflight check)
      return new Response(null, { status: 200, headers: corsHeaders });
  }

  try { 

    const { searchParams } = new URL(request.url); // Parse incoming URI component of the Session Id; return response with an error if missing
    const publicKey = searchParams.get("sessionId");
    if (!publicKey) {
        return new Response("Missing valid request params", { status: 401, headers: corsHeaders });
    }
    
    const clientData = await request.json(); // Parse incoming JSON data; return response with an error if missing
    if (!clientData) {
      return new Response("Missing request body", { status: 401, headers: corsHeaders });
    }

    const authHeader = request.headers.get("Authorization") || "";  // Parse client auth header; return response with an error if missing
    const handshake = authHeader.replace(/^Bearer\s+/i, "");
    if (!handshake) {
        return new Response("Missing authorization", { status: 401, headers: corsHeaders });
    }

    /// Two-step authorization  -----------------------------------------------------------------------------------------------
    //  1. Validate if the handshake is still in the Redis DB; TTL value set exp at 10 minutes 
    const redisData = await redis.hgetall(`session:${handshake}`);
    const redisKey = redisData.handshake;
    if (!redisKey) {
        return new Response("Expired authorization", { status: 401, headers: corsHeaders });  // Return response as invalid if expired or missing
    }
    // 2. Validate the handshake with the expected hash
    const expectedHash = createHmac('MD5', Netlify.env.get("RSA_PRIVATE_KEY")).update(publicKey).digest('hex');
    const valid = (handshake === expectedHash);
    if (!valid) {
        return new Response("Invalid authorization", { status: 401, headers: corsHeaders });  // Return response as invalid if client hash incorrect
    }
    /// -----------------------------------------------------------------------------------------------------------------------

    // 1. Make POST (x-www-form-urlencoded) call to custom Google Script for recording all the waiver data on a Google sheets for long-term storage
    const googleData = new URLSearchParams();
    Object.entries(redisData).forEach(([key, value]) => {
      googleData.append(key, String(value));
    });
    googleData.append("base64String", clientData);

    const googleWebAppUrl = Netlify.env.get("GOOGLE_WEBAPP_URL"); // e.g. https://script.google.com/macros/s/...
    const googleResp = await fetch(googleWebAppUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: googleData.toString()
    });

    if (!googleResp.ok) {
      return new Response(JSON.stringify({ error: `Form post failed: ${googleResp.statusText}` }), { status: googleResp.status, headers: corsHeaders });
    }

    // Delete Redis DB session as it is no longer needed; this will also prevent resubmits by the same session
    // redis.delete(`session:${handshake}`);
    
    const googleResult = await googleResp.text(); 
    // Return with CORS headers
    console.log(`Waiver Submit Success; Response data: ${googleResult}`);
    return new Response(JSON.stringify(googleResult), { status: 200, headers: corsHeaders });

  } catch (error) { // Catch any runtime errors and return error message with CORS headers
    console.error('Error in function:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }

};