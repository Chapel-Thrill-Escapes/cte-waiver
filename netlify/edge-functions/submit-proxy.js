import crypto from 'node:crypto';
import { decode as b64decode } from "https://deno.land/std@0.149.0/encoding/base64.ts";

// netlify/edge-functions/submit-proxy.js
// An Edge Function that: 
//     1. signs SVG signature data with DSA; and
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
    // Parse incoming data (assuming JSON in the request body)
    const client_data = await request.json();

    // First validate the handhsake with the expected hash:
    const handshake_secret = Netlify.env.get("RSA_PRIVATE_KEY");
    const expectedHash = crypto.createHmac('sha256', handshake_secret)
                      .update(client_data.sessionId)
                      .digest('hex');
    // Compare the client provided handshake to the expected hash
    const valid = (client_data.handshake === expectedHash);
    if (!valid) {
      throw new Error(`Handshake verification failed; Expected Hash: ${expectedHash}; Provided Hash: ${client_data.handshake}`);  
    }
   console.log('Verified handshake hash!')
  
    for (const [key, value] of Object.entries(client_data)) {
      console.log(`Key: ${key}, Value: ${value}`);     //  Loop over client's JSON body values and print for debugging purposes
    }
    // Declare constants from the client_data object that are used throughout; update this list if adding more data fields
    const publicKey = client_data.svgSignature;
    const customerID = client_data.bookeoCustomerID;
    const isParticipant = client_data.bookeoParticipant;
    const participantID = client_data.personId;

   
    // 1. Sign the signature SVG data using DSA (with a private key from Netlify secure environment values)
    //
    const rawB64 = Netlify.env.get("RSA_PRIVATE_KEY");
    const privateKey = new TextDecoder().decode(b64decode(rawB64)); // This is the full PEM with newlines using the raw private key from environment

    const signer = crypto.createSign('RSA-SHA256'); 
    signer.update(publicKey || ''); 
    const dsaSignature_private = signer.sign(privateKey, 'base64');
    const hash = crypto.createHash('MD5');
    hash.update(dsaSignature_private);
    const dsaSignature = hash.digest('hex').toString();
    const dsaSignature_trun = dsaSignature.slice(0, 6).toUpperCase();
    console.log("Signed Key:", dsaSignature_trun);

    // 2. Send requests to Bookeo's API to update the submitting customer's waiver confirmation field
    // Make GET request to our matched customer's Bookeo data via API - we'll use this to make our PUT request will all the current field values
    const apiKey = Netlify.env.get("BOOKEO_API_KEY");
    const secretKey = Netlify.env.get("BOOKEO_SECRET_KEY");

    const baseUrl = 'https://api.bookeo.com/v2/customers';
    let getUrl;
    let putUrl;
    if (isParticipant === 'true') {
     getUrl = `${baseUrl}/${customerID}/linkedpeople/${participantID}?apiKey=${apiKey}&secretKey=${secretKey}`;
     putUrl = `${baseUrl}/${customerID}/linkedpeople/${participantID}?apiKey=${apiKey}&secretKey=${secretKey}&mode=backend`;
    } else {
     getUrl = `${baseUrl}/${customerID}?apiKey=${apiKey}&secretKey=${secretKey}`;
     putUrl = `${baseUrl}/${customerID}?apiKey=${apiKey}&secretKey=${secretKey}&mode=backend`;
    }
    const getResponse = await fetch(getUrl);
    if (!getResponse.ok) {
      throw new Error(`GET customer failed: ${getResponse.status} ${getResponse.statusText}`);
    }
    const customerData = await getResponse.json();

    /// Build the JSON structure for PUT,
    const waiverField = customerData.customFields.find(field => field.id === "RATUN9");
    if (waiverField) {
    waiverField.value = dsaSignature;
    } else {
     customerData.customFields.push({
      id: "RATUN9",
      value: dsaSignature
     });
    }

    // Make PUT request to Booeko with the updated customer data (JSON format), waiver confirmation number by Bookeo custom field ID
    const putResponse = await fetch(putUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customerData),
    });

    let bookeoResult;
    if (!putResponse.ok) {
      throw new Error(`PUT booking failed: ${putResponse.status} ${putResponse.statusText} ${putResponse.message} `);
    } else {
      bookeoResult = 'success';
    }

    // 3. Make a POST request to the private Waiver Responses Google Sheets; this sheet stores all the waiver data
    //    as application/x-www-form-urlencoded. 
    //
    //    The form data will be appended from the `body` object.
    const googleWebAppUrl = Netlify.env.get("GOOGLE_WEBAPP_URL"); // e.g. https://script.google.com/macros/s/...
    const formData = new URLSearchParams();
    Object.entries(client_data).forEach(([key, value]) => {
      formData.append(key, String(value));
    });
    formData.append("dsaSignature_private", dsaSignature_private);
    formData.append("waiverConfirmationNumNotTrunc", dsaSignature);  
    formData.append("waiverConfirmationNum", dsaSignature_trun);  

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
            'Access-Control-Allow-Origin': allowedOrigin,
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        }
      );
    }
    
    const googleResult = await googleResp.text(); 

    // Return a response with the new signature data to the client.
    const clientResponseBody = {
      success: true,
      dsaSignature_trun,
      bookeoResult,
      googleResult
    };

    // Return with CORS headers
    return new Response(JSON.stringify(clientResponseBody), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': allowedOrigin,
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
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      },
    });
  }
};
