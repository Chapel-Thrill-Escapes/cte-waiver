import crypto from 'node:crypto';
import { decode as b64decode } from "https://deno.land/std@0.149.0/encoding/base64.ts";

// netlify/edge-functions/submit-proxy.js
// An Edge Function that: 
//     1. signs a public key with DSA; and
//     2. updates a Bookeo booking via PUT; and 
//     3. forwards the received data via POST (x-www-form-urlencoded) to a Google Web App.
// Runs in Deno on Netlify's Edge network.

export default async (request, context) => {

 // Get the Origin header from the request
  const originHeader = request.headers.get("origin") || "";

  // If it doesn’t match the CTE domain, block the request as a security measure 
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
    // 1. Parse incoming data (assuming JSON in the request body)
    const data = await request.json();

    //  Loop over JSON and create variables (or store them in an object)
    const { publicKey, bookingNumber, customerId } = data;
    for (const [key, value] of Object.entries(data)) {
      console.log(`Key: ${key}, Value: ${value}`);
    }

    // 2. Sign the public key using DSA (with a private key from env var or secure storage)
    //
    const rawB64 = Netlify.env.get("RSA_PRIVATE_KEY");
    const privateKey = new TextDecoder().decode(b64decode(rawB64)); // This is now the full PEM with newlines

    const signer = crypto.createSign('RSA-SHA256'); 
    signer.update(publicKey || ''); 
    const signatureID = signer.sign(privateKey, 'base64');
    // console.log("Signed Key:", signatureID);

    // 3. Send a PUT request to Bookeo's API to update the submitting customer's waiver confirmation field
        // Make Bookeo request to bookings data
    const apiKey = Netlify.env.get("BOOKEO_API_KEY");
    const secretKey = Netlify.env.get("BOOKEO_SECRET_KEY");

    const url = `https://api.bookeo.com/v2/bookings/${bookingNumber}?apiKey=${apiKey}&secretKey=${secretKey}&expandParticipants=true`;    
    const getResponse = await fetch(url);
    if (!getResponse.ok) {
      throw new Error(`GET booking failed: ${getResponse.status} ${getResponse.statusText}`);
    }
    const bookingData = await getResponse.json();

    // 4. Find the participant with matching customerId
    const participants = bookingData?.participants?.details;
    if (!participants || !Array.isArray(participants)) {
      throw new Error('Participants details not found in booking data');
    }

    participants.forEach((participant) => {
      const pDetails = participant?.personDetails;
      if (pDetails && pDetails.customerId === customerId) {
        // 5. Update the custom field RATUN9
        if (Array.isArray(pDetails.customFields)) {
          pDetails.customFields.forEach((cf) => {
            if (cf.id === 'RATUN9') {
              cf.value = publicKey;
            }
          });
        }
      }
    });

    console.log(`Put Request Body: ${JSON.stringify(bookingData)}`)

    // 6. PUT the updated booking back to Bookeo
    const putResponse = await fetch(url, {
      method: 'PUT',
      // headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookingData)
    });

    if (!putResponse.ok) {
      throw new Error(`PUT booking failed: ${putResponse.status} ${putResponse.statusText}`);
    }

    const updatedBooking = await putResponse.json();

    // 7. Make a POST request (XHR-like) to a Google Form or Web App.  
    //    We’ll send the entire original body (including publicKey, bookingNumber, etc.)
    //    as application/x-www-form-urlencoded. 
    //
    //    The form data will be appended from your `body` object.
    //    Make sure your Google form/web app is expecting these fields.
    const googleWebAppUrl = Netlify.env.get("GOOGLE_WEBAPP_URL"); // e.g. https://script.google.com/macros/s/...
    const formData = new URLSearchParams();
    Object.entries(data).forEach(([key, value]) => {
      formData.append(key, String(value));
    });

    const googleResp = await fetch(googleWebAppUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString()
    });

    if (!googleResp.ok) {
      return new Response(
        JSON.stringify({ error: `Bookeo request failed: ${googleResp.statusText}` }),
        {
          status: googleResp.status,
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
    
    const googleResult = await googleResp.text();  // or json() if your web app returns JSON

    // Finally, return a response to the client. Include the signature
    // and any relevant data from Bookeo or Google if desired.
    const clientResponseBody = {
      success: true,
      signature,
      bookeoResult,
      googleResult
    };

    // Return with CORS headers
    return new Response(JSON.stringify(clientResponseBody), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': 'https://www.chapelthrillescapes.com',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (error) {
    console.error('Error in Netlify function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': 'https://www.chapelthrillescapes.com',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      },
    });
  }
};
