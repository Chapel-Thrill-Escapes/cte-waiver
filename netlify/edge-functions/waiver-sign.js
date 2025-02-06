// netlify/edge-functions/waiver-sign.js
// An Edge Function that: 
//     1. signs SVG signature data with DSA; and
//     2. updates a customer's Bookeo data with their waiver confirmation num.
// Runs in Deno on Netlify's Edge network.

import crypto from 'node:crypto';
import { decode as b64decode } from "https://deno.land/std@0.149.0/encoding/base64.ts";
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
    const expectedHash = crypto.createHmac('MD5', Netlify.env.get("RSA_PRIVATE_KEY")).update(publicKey).digest('hex');
    const valid = (handshake === expectedHash);
    if (!valid) {
        return new Response("Invalid authorization", { status: 401, headers: corsHeaders });  // Return response as invalid if client hash incorrect
    }
    /// -----------------------------------------------------------------------------------------------------------------------

    // 1. Sign the signature SVG data using DSA (with a private key from Netlify secure environment values)
    const rawB64 = Netlify.env.get("RSA_PRIVATE_KEY");
    const privateKey = new TextDecoder().decode(b64decode(rawB64)); // This is the full PEM with newlines using the raw private key from environment
    const signer = crypto.createSign('RSA-SHA256'); 
    signer.update(clientData.svgSignature || ''); 
    const dsaSignature_private = signer.sign(privateKey, 'base64');
    const hash = crypto.createHash('MD5');
    hash.update(dsaSignature_private);
    const dsaSignature = hash.digest('hex').toString();
    const dsaSignature_trun = dsaSignature.slice(0, 6).toUpperCase();
    // console.log("Signed Key:", dsaSignature_trun);

    // 2. Send requests to Bookeo's API to update the submitting customer's waiver confirmation field
    const apiKey = Netlify.env.get("BOOKEO_API_KEY");
    const secretKey = Netlify.env.get("BOOKEO_SECRET_KEY");
    const baseUrl = 'https://api.bookeo.com/v2/customers';
    let getUrl;
    let putUrl;
    if (redisData.isParticipant === 'true') {
     getUrl = `${baseUrl}/${redisData.customerId}/linkedpeople/${redisData.personId}?apiKey=${apiKey}&secretKey=${secretKey}`;
     putUrl = `${baseUrl}/${redisData.customerId}/linkedpeople/${redisData.personId}?apiKey=${apiKey}&secretKey=${secretKey}&mode=backend`;
    } else {
     getUrl = `${baseUrl}/${redisData.customerId}?apiKey=${apiKey}&secretKey=${secretKey}`;
     putUrl = `${baseUrl}/${redisData.customerId}?apiKey=${apiKey}&secretKey=${secretKey}&mode=backend`;
    }

    // Make GET request to our matched customer's Bookeo data via API - we'll use this to make our PUT request will all the current field values
    const getResponse = await fetch(getUrl);
    if (!getResponse.ok) {
      return new Response(JSON.stringify({ error: `GET customer failed: ${getResponse.statusText}` }), { status: getResponse.status, headers: corsHeaders });
    }

    // Build the JSON structure for PUT request to Bookeo
    const customerData = await getResponse.json();
    const waiverField = customerData.customFields.find(field => field.id === "RATUN9");
    if (waiverField) {
     waiverField.value = dsaSignature_trun;
    } else {
     customerData.customFields.push({
      id: "RATUN9",
      value: dsaSignature_trun
     });
    }

    // Make PUT request to Bookeo with the updated customer data (JSON format), waiver confirmation number by Bookeo custom field ID
    const putResponse = await fetch(putUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customerData),
    });
    if (!putResponse.ok) {
      return new Response(JSON.stringify({ error: `PUT customer failed: ${putResponse.statusText}` }), { status: putResponse.status, headers: corsHeaders });
    }

    const newRedisData = { // Update Redis DB with client data and signature values
        ...clientData,
        dsaSignature: dsaSignature,
        dsaSignature_trun: dsaSignature_trun,
        dsaSignature_private: dsaSignature_private
      };
    await redis.hset(`session:${handshake}`, newRedisData);

    const qrCode = `p1=${redisData.customerId}&p2=${redisData.personId}&p3=${dsaSignature_trun}&p4=${handshake}&p5=${publicKey}`;
    const responseData = { // Build client response data that will be needed for the next step    
        ...redisData,
        dsaSignature_trun: dsaSignature_trun,
        qrCode: qrCode
        };

    // Return with CORS headers
    console.log(`Waiver Sign Success; Response data: ${responseData}`);
    return new Response(JSON.stringify(responseData), { status: 200, headers: corsHeaders });

  } catch (error) { // Catch any runtime errors and return error message with CORS headers
    console.error('Error in function:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
};