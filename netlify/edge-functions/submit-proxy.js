import crypto from 'node:crypto';

/**
 * An example Netlify Edge Function that:
 * 1. Signs a public key with DSA.
 * 2. Updates a Bookeo booking via PUT.
 * 3. Forwards the received data via POST (x-www-form-urlencoded) to a Google Web App.
 *
 * NOTE: Adjust for your actual Netlify Edge runtime and environment.
 */
export default async (request, context) => {
  try {
    // 1. Parse incoming data (assuming JSON in the request body)
    const body = await request.json();

    // Example of extracting variables from the passed-in array/object
    // (Adjust to match how you actually send them from client-side)
    const {
      publicKey,      // Public key string that we need to sign
      bookingNumber,  // The booking number for Bookeo
      customerId,     // Customer's ID associated with the booking
      ...rest         // Any other variables you want to forward to Google
    } = body;

    // 2. Sign the public key using DSA (with a private key from env var or secure storage)
    //
    const signer = crypto.createSign('sha256');
    signer.update(publicKey);
    const signature = signer.sign(Netlify.env.get("DSA_PRIVATE_KEY"), 'base64');

    // 3. Send a PUT request to Bookeo's API to update a booking's custom field.
    //    You likely need your Bookeo apiKey and secretKey in the query string or headers.
    //    For example: https://api.bookeo.com/v2/bookings/{bookingNumber}?apiKey=XXXX&secretKey=YYYY
    //
    //    The exact field updates depend on your Bookeo configuration.
    //    Below is a simplistic example, including a “strong value” in a custom field.
    const bookeoUrl = `https://api.bookeo.com/v2/bookings/${bookingNumber}?apiKey=${process.env.BOOKEO_API_KEY}&secretKey=${process.env.BOOKEO_SECRET_KEY}`;

    const bookeoResponse = await fetch(bookeoUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        customer: {
          id: customerId
        },
        // Example of custom fields. Adjust as needed per your Bookeo config.
        customFields: {
          customStrongValue: "myStrongValue"
        }
      })
    });

    const bookeoData = await bookeoResponse.json();

    // 4. Make a POST request (XHR-like) to a Google Form or Web App.  
    //    We’ll send the entire original body (including publicKey, bookingNumber, etc.)
    //    as application/x-www-form-urlencoded. 
    //
    //    The form data will be appended from your `body` object.
    //    Make sure your Google form/web app is expecting these fields.
    const googleWebAppUrl = process.env.GOOGLE_WEBAPP_URL; // e.g. "https://script.google.com/macros/s/..."
    
    // Build URL-encoded form data
    const formData = new URLSearchParams();
    Object.entries(body).forEach(([key, value]) => {
      formData.append(key, String(value));
    });

    const googleResponse = await fetch(googleWebAppUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData
    });

    const googleData = await googleResponse.text();  // or json() if your web app returns JSON

    // Finally, return a response to the client. Include the signature
    // and any relevant data from Bookeo or Google if desired.
    const responseBody = {
      success: true,
      signature,         // The newly created DSA signature
      bookeoResult: bookeoData,
      googleResult: googleData
    };

    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in Edge Function:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
