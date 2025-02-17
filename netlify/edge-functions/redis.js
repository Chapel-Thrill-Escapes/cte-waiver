// netlify/edge-functions/redis.js
// An Edge Function that checks the Upstash Redis DB for proper match
// Runs in Deno on Netlify's Edge network.

import { createHmac } from 'crypto';
import { Redis } from "https://esm.sh/@upstash/redis";

const redis = new Redis({
    url: Netlify.env.get("UPSTASH_REDIS_REST_URL"),
    token: Netlify.env.get("UPSTASH_REDIS_REST_TOKEN"),
  });

export default async (request, context) => {
  
  const allowedOrigins = Netlify.env.get("ALLOWED_ORIGINS")?.split(",") || [];
  const origin = request.headers.get("origin");
  if (allowedOrigins.length > 0 && !allowedOrigins.includes(origin)) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
    status: 401,
    headers: { "Content-Type": "application/json" }
    });
  }
  
  // If the origin is allowed, declare CORS response headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };

  if (request.method === "OPTIONS") { // Handle OPTIONS (the preflight check)
    return new Response(null, { status: 200, headers: corsHeaders }); 
  }
    
  try {

    const { searchParams } = new URL(request.url);  
    const publicKey = searchParams.get("sessionId"); // Parse client Session Id URL param
    if (!publicKey) {
        return new Response("Improper request", { status: 401, headers: corsHeaders }); // Return response as invalid if missing
    }

    const authHeader = request.headers.get("Authorization") || "";  // Parse client auth header
    if (!authHeader) {
      return new Response("Missing authorization", { status: 401, headers: corsHeaders }); // Return response as invalid if missing
    }
    const handshake = authHeader.replace(/^Bearer\s+/i, "");

    // 1. Validate if the handshake is still in the Redis DB; TTL value set exp at 10 minutes 
    const redisData = await redis.hgetall(`session:${handshake}`);
    if (!redisData) {
      return new Response("Expired authorization", { status: 401, headers: corsHeaders });  // Return response as invalid if expired or missing
    }
    const redisKey = redisData.handshake;

    // 2. Validate the handshake with the expected hash
    const expectedHash = createHmac('MD5', Netlify.env.get("RSA_PRIVATE_KEY")).update(publicKey).digest('hex');
    const valid = (handshake === expectedHash);
    if (!valid) {
        return new Response("Invalid authorization", { status: 401, headers: corsHeaders });  // Return response as invalid if client hash incorrect
    }

    if (redisKey && valid) {  // Assume success after checks; return redis data for rendering client-side
        return new Response(JSON.stringify(redisData), { status: 200, headers: corsHeaders }); 
    }

  } catch (error) {   // Catch any runtime errors     
    return new Response(JSON.stringify({ error: error.message }), {  status: 500, headers: corsHeaders }); // Return 500 - server error if runtime error
  }

};