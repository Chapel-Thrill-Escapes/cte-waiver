
export default async (request, context) => {

  function bookeoRequest(customerID, participantID) {
    const apiKey = Netlify.env.get("BOOKEO_API_KEY");
    const secretKey = Netlify.env.get("BOOKEO_SECRET_KEY");

    const baseUrl = 'https://api.bookeo.com/v2/customers';
    let getUrl;
    if (customerID !== participantID) {
      getUrl = `${baseUrl}/${customerID}/linkedpeople/${participantID}?apiKey=${apiKey}&secretKey=${secretKey}`;
    } else {
      getUrl = `${baseUrl}/${customerID}?apiKey=${apiKey}&secretKey=${secretKey}`;
    }

    const getResponse = await fetch(getUrl);
    if (!getResponse.ok) {
      throw new Error(`GET customer failed: ${getResponse.status} ${getResponse.statusText}`);
    }
    const customerData = await getResponse.json();

    /// Return Waiver field value from Bookeo GET request
    const waiverField = customerData.customFields.find(field => field.id === "RATUN9").value;
    console.log(waiverField);
    return waiverField;
  }

  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customerId");
    const ID = searchParams.get("ID");
    const waiverConfirm = searchParams.get("waiverConfirm");

    // Basic validation
    if (!code) {
      return new Response(
        JSON.stringify({ success: false, message: "No code provided" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Check bookeo databased
    response = bookeoRequest(customerId, ID)
    if (response === waiverConfirm) {
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
    console.error("Scan route error:", error);
    return new Response(
      JSON.stringify({ success: false, message: "Unexpected server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}