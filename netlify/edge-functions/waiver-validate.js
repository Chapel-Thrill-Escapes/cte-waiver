import { createHmac } from 'node:crypto';

export default async (request, context) => {

  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customerId");
    const participantId = searchParams.get("participantId");
    const userWaiverValue = searchParams.get("waiverConfirm");
    const userHash = searchParams.get("userHash");
    const sessionId = searchParams.get("sessionId");

    // Basic validation
    if (!searchParams) {
      return new Response(
        JSON.stringify({ success: false, message: "No code provided" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    /// Two step validation procedure that is cryptographically secure and unique to each generated QR code, 
    //      even preventing manual entry of waiver confirmation codes into Bookeo
    //
    //  1. Check Bookeo database against provided Waiver Confirmation code
    const apiKey = Netlify.env.get("BOOKEO_API_KEY");
    const secretKey = Netlify.env.get("BOOKEO_SECRET_KEY");

    const baseUrl = 'https://api.bookeo.com/v2/customers';
    let getUrl;
    if (customerId !== participantId) {
      getUrl = `${baseUrl}/${customerId}/linkedpeople/${participantId}?apiKey=${apiKey}&secretKey=${secretKey}`;
    } else {
      getUrl = `${baseUrl}/${customerId}?apiKey=${apiKey}&secretKey=${secretKey}`;
    }
    // Make GET request to Bookeo API - customer data
    const getResponse = await fetch(getUrl);
    // Return Waiver field value from Bookeo GET request
    const customerData = await getResponse.json();
    const actualWaiverValue = customerData.customFields.find(field => field.id === "RATUN9").value;
    const waiver_valid = (userWaiverValue === actualWaiverValue);
    
    //  2. Check provided handshake and sessionID to see if they match the expected hash using the RSA private key
    const handshake_secret = Netlify.env.get("RSA_PRIVATE_KEY");
    const expectedHash = createHmac('MD5', handshake_secret)
                      .update(sessionId)
                      .digest('hex');
    // Compare the client provided handshake to the expected hash
    const handshake_valid = (userHash === expectedHash);

    if (waiver_valid && handshake_valid) {
      return new Response(
        JSON.stringify({ success: true, message: "Valid code!" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } else {
      // If it doesn't match, return an error
      return new Response(
        JSON.stringify({ success: false, message: "Invalid code" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    console.log("Scan route error:", error);
    return new Response(
      JSON.stringify({ success: false, message: "Unexpected server error" }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}