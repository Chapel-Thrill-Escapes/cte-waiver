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

// Utility function to convert a Blob to a Base64 string.
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      // reader.result will be something like "data:application/pdf;base64,JVBERi0xLjQKJ..."
      // We remove the prefix to extract only the Base64 code.
      const base64String = reader.result.split(',')[1];
      resolve(base64String);
    };
    reader.onerror = error => reject(error);
    reader.readAsDataURL(blob);
  });
}

export default async (request, context) => {

  const originHeader = request.headers.get("origin") || ""; // Get the Origin header from the request

  const allowedOrigin = "https://www.chapelthrillescapes.com";
  if (originHeader !== allowedOrigin) { 
    console.log("Waiver Submit: Unauthorized domain");
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
      console.log("Waiver Submit: Missing valid request params");
      return new Response("Missing valid request params", { status: 401, headers: corsHeaders });
    }
    
    const clientBlob = await request.blob(); // Parse incoming PDF blob; return response with an error if missing
    if (!clientBlob) {
      console.log("Waiver Submit: Missing request body");
      return new Response("Missing request body", { status: 401, headers: corsHeaders });
    }

    const authHeader = request.headers.get("Authorization") || "";  // Parse client auth header; return response with an error if missing
    const handshake = authHeader.replace(/^Bearer\s+/i, "");
    if (!handshake) {
      console.log("Waiver Submit: Missing authorization");
      return new Response("Missing authorization", { status: 401, headers: corsHeaders });
    }

    /// Two-step authorization  -----------------------------------------------------------------------------------------------
    //  1. Validate if the handshake is still in the Redis DB; TTL value set exp at 10 minutes 
    const redisData = await redis.hgetall(`session:${handshake}`);
    const redisKey = redisData.handshake;
    if (!redisKey) {
      console.log("Waiver Submit: Expired authorization");
      return new Response("Expired authorization", { status: 401, headers: corsHeaders });  // Return response as invalid if expired or missing
    }
    // 2. Validate the handshake with the expected hash
    const expectedHash = createHmac('MD5', Netlify.env.get("RSA_PRIVATE_KEY")).update(publicKey).digest('hex');
    const valid = (handshake === expectedHash);
    if (!valid) {
      console.log("Waiver Submit: Invalid authorization");
      return new Response("Invalid authorization", { status: 401, headers: corsHeaders });  // Return response as invalid if client hash incorrect
    }
    /// -----------------------------------------------------------------------------------------------------------------------

    // 1. Make POST call to background function app; this allows to respond to the client faster
    const base64String = await blobToBase64(clientBlob);
    if (!base64String) {
      console.log("Did not create PDF string ");
      return new Response("Invalid Google POST request", { status: 500, headers: corsHeaders });  // Return response as invalid if base64 fail
    }
    const GOOGLE_AUTH_TOKEN = Netlify.env.get("GOOGLE_AUTH_TOKEN");
    redisData.authToken = GOOGLE_AUTH_TOKEN;
    redisData.filename = `ChapelThrillEscapesWaiver-${redisData.dsaSignature_trun}.pdf`;
    redisData.pdfString = base64String;

    fetch('https://cte-waiver.netlify.app/.netlify/functions/googleSubmit', {
      method: 'POST',
      body: JSON.stringify(redisData),
    });

    // Delete Redis DB session as it is no longer needed; this will also prevent resubmits by the same session
    redis.del(`session:${handshake}`);
    
    // Return with CORS headers
    console.log(`Waiver Submit Success`);
    return new Response(JSON.stringify("Success"), { status: 200, headers: corsHeaders });

  } catch (error) { // Catch any runtime errors and return error message with CORS headers
    console.error('Error in function:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }

};