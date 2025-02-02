// netlify/edge-functions/bookeo-proxy.js
// An Edge Function that fetches Booking data from Bookeo, validates if the user is found, and then returns a handshake auth
// Runs in Deno on Next.js on Netlify's Edge network.

import { createHmac } from 'crypto';
import { Redis } from "https://esm.sh/@upstash/redis";

const redis = new Redis({
  url: Netlify.env.get("UPSTASH_REDIS_REST_URL"),
  token: Netlify.env.get("UPSTASH_REDIS_REST_TOKEN"),
});

function formatBookingDate(startDateString,endDateString) {
  const startDate = new Date(startDateString)
    .toLocaleString('default', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'EST'
    }).replace(',', '');

  const endDate = new Date(endDateString)
    .toLocaleString('default', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'EST'
    }).replace(',', '');

  return startDate + ' - ' + endDate
}

function checkBookingData(bookeoData, targetFirst, targetLast) {
  const bookings = bookeoData?.data || [];
  // Loop over each booking found in the search
  for (const booking of bookings) {   
    const details = booking?.participants?.details || []; // booking.participants.details[] holds each participant's details
    for (const detail of details) {
      const person = detail?.personDetails;
      if (!person) continue;
      // Check if firstName and lastName match
      if (person.firstName.toLowerCase() === targetFirst.toLowerCase() && person.lastName.toLowerCase() === targetLast.toLowerCase()) {  // Normalizing cases
        // We found the matched person; now create return JSON object
        const isParticipant = person.id !== person.customerId ? "true" : "false";
        const bookingDate = formatBookingDate(booking.startTime, booking.endTime); // More precise time-date that what was searched via API
        let return_data = {
          match: 'true',
          customerId: person.customerId,
          personId: person.id,
          isParticipant: isParticipant,
          bookingNumber: booking.bookingNumber,
          bookingDate: bookingDate,
          productName: booking.productName
        };
        // Look up the RATUN9 field in their customFields array
        //const waiverConfirm = person.customFields?.find(
        //  (field) => field.id === "RATUN9"
        //) || null;
        return return_data
      }
    }
  }
  return {match: 'false'};  // If no match found, return false
}

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

    const { searchParams } = new URL(request.url); // Parse incoming URI component of the Session Id; throw an error if not provided
    const publicKey = searchParams.get("sessionId");
    if (!publicKey) {
      throw new Error('Client did not provide valid request data');
    }
    
    const clientData = await request.json(); // Parse incoming JSON data; throw an error if not provided
    if (!clientData) {
      throw new Error('Client did not provide valid request data');
    }

    // Modify the Booking Date string for use in the Bookeo API call
    const startTime = new Date(clientData.bookingDate);
    startTime.setDate(startTime.getDate() - 5).toISOString(); // Adding buffer range of -5 days
    const endTime = new Date(clientData.bookingDate);
    endTime.setDate(endTime.getDate() + 5).toISOString(); // Adding buffer range of +5 days

    // Make the GET request to the bookings data
    const baseUrl = 'https://api.bookeo.com/v2/bookings';
    const getUrl = `${baseUrl}?apiKey=${Netlify.env.get("BOOKEO_API_KEY")}&secretKey=${Netlify.env.get("BOOKEO_SECRET_KEY")}&startTime=${startTime}&endTime=${endTime}&expandParticipants=true`;
    const response = await fetch(getUrl);

    if (!response.ok) { // Throw an error if unexpected Bookeo API request fail
      throw new Error(`Bookeo request failed: ${response.statusText}`);
    }

    // If successful, parse the Bookeo data for a match with the Client data
    const bookeoData = await response.json();
    let bookeoResult;
    bookeoResult = checkBookingData(bookeoData, clientData.fname, clientData.lname);
    if (bookeoResult.match === 'false' && clientData.minorChecked === 'true') { // Try with minor data in case user booked with their child's info instead of their's
      bookeoResult = checkBookingData(bookeoData, clientData.mfname, clientData.mlname);
    }

    // Store results in Upstash Redis DB if successful Bookeo validation:
    if (bookeoResult.match === 'true') {
      const handshake = createHmac('MD5', Netlify.env.get("RSA_PRIVATE_KEY")).update(publicKey).digest('hex'); // Create HMAC handshake (with public and private keys)
      const redisData = { // Create JSON object for the Redis DB
        ...clientData,         
        ...bookeoResult,       
        handshake: handshake
      };
      
      /// Store the object in Upstash Redis; this DB will be used in all subsequent API calls by the client/edge-functions 
      //  CTE client <--> Netlify edge-functions <--> Upstash Redis Database 
      //  The reasoning behind this is that it is more secure than storing all the waiver data on the client side
      //  There is a two-step verification process for subsequent calls: (1) TTL sessionId hasn't expired, and (2) valid handshake HMAC hash
      console.log(redisData);
      await redis.hset(`session:${handshake}`, redisData);
      await redis.expire(`session:${handshake}`, 600);
      
      return new Response(JSON.stringify(handshake), { status: 200, headers: corsHeaders }); // Return the handshake value to the client if validation successfull 

    } else {
      return new Response( // Return auth fail if validation unsuccessful
        JSON.stringify(`Bookeo request failed: ${bookeoResult.match}`), { status: 403, headers: corsHeaders });
    }

  } catch (error) { // Catch any runtime errors and return error message with CORS headers
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
};