import crypto from 'node:crypto';

// netlify/edge-functions/submit-proxy.js
// An Edge Function that: 
//     1. signs a public key with DSA; and
//     2. updates a Bookeo booking via PUT; and 
//     3. forwards the received data via POST (x-www-form-urlencoded) to a Google Web App.
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
    
    // 1. Parse incoming data (assuming JSON in the request body)
    const data = await request.json();

    //  Loop over JSON and create variables (or store them in an object)
    const { publicKey, bookingNumber, customerId } = data;
    for (const [key, value] of Object.entries(data)) {
      console.log(`Key: ${key}, Value: ${value}`);
    }

    // 2. Sign the public key using DSA (with a private key from env var or secure storage)
    //
    const signer = crypto.createSign('sha256');
    signer.update(publicKey || '');
    const signatureID = signer.sign(Netlify.env.get("DSA_PRIVATE_KEY"), 'base64');

    // 3. Send a PUT request to Bookeo's API to update the submitting customer's waiver confirmation field
    const bookeoUrl = `https://api.bookeo.com/v2/bookings/${bookingNumber}?apiKey=${Netlify.env.get("BOOKEO_API_KEY")}&secretKey=${Netlify.env.get("BOOKEO_SECRET_KEY")}`;
    const bookeoPayload = {
      customer: {
        id: customerId
      },
        customFields: {
          "id": "RATUN9",
          "name": "Waiver Confirmation Number",
          "value": signatureID,
      }
    };
    
    const bookeoResp = await fetch(bookeoUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookeoPayload)
    });

    if (!bookeoResp.ok) {
      return new Response(
        JSON.stringify({ error: `Bookeo request failed: ${bookeoResp.statusText}` }),
        {
          status: bookeoResp.status,
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
    
    const bookeoResult = await bookeoResp.json();

    // 4. Make a POST request (XHR-like) to a Google Form or Web App.  
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
