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
    // Get the Origin header from the request
    const originHeader = request.headers.get("origin") || "";
  
    // If the Origin doesn’t match the CTE domain, block the request
    const allowedOrigin = "https://www.chapelthrillescapes.com";
    if (originHeader !== allowedOrigin) {
      return new Response("Unauthorized", { status: 401 });
    }
  
    // If the origin is allowed, add CORS response headers so the browser knows you allow that origin:
    const corsHeaders = {
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    };
  
    // Handle OPTIONS (the preflight check)
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: corsHeaders
      });
    }
    
    try {
        // Parse incoming URI component of the Session Id
        const { searchParams } = new URL(request.url);
        if (!searchParams.get("sessionId")) {
            return new Response("Improper request", { status: 401, headers: corsHeaders }); // Return response as invalid if missing
        }
        const sessionId = searchParams.get("sessionId");

        // Parse auth header provided by client
        const authHeader = request.headers.get("Authorization") || "";
        const publicKey = authHeader.replace(/^Bearer\s+/i, "");
        if (!publicKey) {
            return new Response("Missing authorization", { status: 401, headers: corsHeaders }); // Return response as invalid if missing
        }

        // 1. Validate if the handshake is still in the Redis DB; TTL value with set exp at 10 minutes 
        const redisKey = await redis.get(`session:${publicKey}`);
        if (!redisKey) {
            return new Response("Expired authorization", { status: 401, headers: corsHeaders });  // Return response as invalid if expired or missing
        }

        // 2. Validate the handshake with the expected hash:
        const secretKey = Netlify.env.get("RSA_PRIVATE_KEY");
        const expectedHash = crypto.createHmac('MD5', secretKey)
                            .update(publicKey)
                            .digest('hex');
        const valid = (publicKey === expectedHash);
        if (!valid) {
            return new Response("Invalid authorization", { status: 401, headers: corsHeaders });  // Return response as invalid if client hash incorrect
        }

        if (redisKey && valid) {
            return new Response("Successful authorization", { status: 200, headers: corsHeaders }); // Assume success after checks
        }
    } catch (error) {
      // Catch any runtime errors
      return new Response(JSON.stringify({ error: error.message }), {  // Return 500 - server error if runtime error
        status: 500,
        headers: corsHeaders
      });
    }
  };