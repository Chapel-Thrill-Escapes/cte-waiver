// netlify/edge-functions/bookings.js

export default async (request, context) => {
    // Security checks
    const authToken = request.headers.get('x-internal-token');
    const expectedToken = Netlify.env.get("INTERNAL_API_TOKEN");
  
    if (!authToken || authToken !== expectedToken) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Verify origin
    const allowedOrigins = Netlify.env.get("ALLOWED_ORIGINS")?.split(",") || [];
    const origin = request.headers.get("origin");
    
    if (allowedOrigins.length > 0 && !allowedOrigins.includes(origin)) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
        });
    }
  
    // Validate date parameters
    const url = new URL(request.url);
    const startTime = url.searchParams.get('startTime');
    const endTime = url.searchParams.get('endTime');
  
    if (!startTime || !endTime) {
      return new Response(JSON.stringify({ error: "Missing date parameters" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
  
    try {
      const params = new URLSearchParams({
        secretKey: Netlify.env.get("BOOKEO_SECRET_KEY") || "",
        apiKey: Netlify.env.get("BOOKEO_API_KEY") || "",
        startTime,
        endTime,
        itemsPerPage: "100",
        includeCanceled: "true" // Include canceled bookings in the API response
      });
  
      const apiResponse = await fetch(`https://api.bookeo.com/v2/bookings?${params}`);
      
      if (!apiResponse.ok) throw new Error("Bookeo API request failed");
      
      const data = await apiResponse.json();

      // Process bookings data
      const bookings = data.data.map(booking => ({
        id: booking.eventId,
        creationDate: booking.creationTime,
        amount: booking.price.totalNet.amount,
        isCanceled: booking.canceled === 'true'
      }));
  
      return new Response(JSON.stringify(bookings), {
        headers: { 
          "Content-Type": "application/json",
          "Cache-Control": "s-maxage=60, stale-while-revalidate=30"
        }
      });
  
    } catch (error) {
      console.error('Edge Function Error:', error);
      return new Response(JSON.stringify({ error: "Failed to fetch bookings" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  };