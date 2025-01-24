// /netlify/edge-functions/validate-signature.js

export default async (request) => {
    const url = new URL(request.url);
    const bookeoCustomerID = url.searchParams.get("bookeoCustomerID");
    const bookeoId = url.searchParams.get("bookeoId");
    const signatureKey = url.searchParams.get("signatureKey");
  
    if (!bookeoCustomerID || !bookeoId || !signatureKey) {
      return new Response("Missing required parameters", { status: 400 });
    }
  
    const apiKey = Netlify.env.get("BOOKEO_API_KEY");
    const secretKey = Netlify.env.get("BOOKEO_SECRET_KEY");

    const baseUrl = 'https://api.bookeo.com/v2/customers';
    let getUrl;
    let putUrl;
    if (bookeoCustomerID !== bookeoId) {
     getUrl = `${baseUrl}/${bookeoCustomerID}/linkedpeople/${bookeoId}?apiKey=${apiKey}&secretKey=${secretKey}`;
    } else {
     getUrl = `${baseUrl}/${bookeoCustomerID}?apiKey=${apiKey}&secretKey=${secretKey}`;
    }

    try {
      // Fetch data from Bookeo API
      const response = await fetch(getUrl);
      if (!response.ok) {
        return new Response("Failed to fetch data from Bookeo API", { status: response.status });
      }
  
      const bookeoData = await response.json();
      const bookeoWaiver = bookeoData.customFields.find(field => field.id === "RATUN9")
  
      // Check the condition
      if (bookeoWaiver.value === signatureKey) {
        // Redirect to the valid subpage
        return Response.redirect(new URL("/app/waiver/valid", request.url), 302);
      } else {
        // Redirect to the invalid subpage
        return Response.redirect(new URL("/app/waiver/invalid", request.url), 302);
      }
    } catch (error) {
      console.error("Error calling Bookeo API:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  };