// netlify/edge-functions/bookeo-proxy.js
// An Edge Function that fetches data from Bookeo and returns it to the client.
// Runs in Deno on Netlify's Edge network.

import { createHmac } from 'crypto';
//import { Redis } from "@upstash/redis/with-fetch";
import { Redis } from "https://deno.land/x/upstash_redis/mod.ts";

const redis = new Redis({
  url: Netlify.env.get("UPSTASH_REDIS_REST_TOKEN"),
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
  // Loop over each booking
  for (const booking of bookings) {   
    // booking.participants.details[] holds each participant's details
    const details = booking?.participants?.details || [];
    for (const detail of details) {
      const person = detail?.personDetails;
      if (!person) continue;
      // Check if firstName and lastName match
      if (person.firstName.toLowerCase() === targetFirst.toLowerCase() && person.lastName.toLowerCase() === targetLast.toLowerCase()) {
        // We found our matched person; now store the data
        const isParticipant = person.id !== person.customerId ? "true" : "false";
        const bookingDate = formatBookingDate(booking.startTime, booking.endTime);
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
  // If no match found, return false
  return {match: 'false'};
}

export default async (request, context) => {

  // Get the Origin header from the request
  const originHeader = request.headers.get("origin") || "";

  // If the Origin doesn’t match the CTE domain, block the request
  const allowedOrigin = "https://www.chapelthrillescapes.com";
  if (originHeader !== allowedOrigin) {
    return new Response("Unauthorized", { status: 401 });
  }

  // If the origin is allowed, add CORS response headers so the browser knows you allow that origin:
  const corsHeaders = {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
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
    // Parse incoming URI component of the Session Id; throw an error if not provided
    const { searchParams } = new URL(request.url);
    if (!searchParams.get("sessionId")) {
      throw new Error('Client did not provide valid request data');
    }
    const publicKey = searchParams.get("sessionId");

    // Parse incoming JSON data; throw an error if not provided
    const client_data = await request.json();
    if (!client_data) {
      throw new Error('Client did not provide valid request data');
    }

    // Modify the Booking Date string for use in the Bookeo API call
    const startDate = new Date(client_data.bookingDate);
    startDate.setDate(startDate.getDate() - 5); // Adding buffer range of -5 days
    const endDate = new Date(client_data.bookingDate);
    endDate.setDate(endDate.getDate() + 5); // Adding buffer range of +5 days
    const startTime = startDate.toISOString();
    const endTime = endDate.toISOString();

    // Make the GET request to the bookings data
    const baseUrl = 'https://api.bookeo.com/v2/bookings';
    const getUrl = `${baseUrl}?apiKey=${Netlify.env.get("BOOKEO_API_KEY")}&secretKey=${Netlify.env.get("BOOKEO_SECRET_KEY")}&expandParticipants=true&startTime=${startTime}&endTime=${endTime}`;
    const response = await fetch(getUrl);

    // Throw an error if the Bookeo API request fails for some reason (ex. server fail)
    if (!response.ok) {
      throw new Error(`Bookeo request failed: ${response.statusText}`);
    }

    // If successful, parse the Bookeo data for a match with the Client data
    const bookeo_data = await response.json();
    let bookeo_result;
    bookeo_result = checkBookingData(bookeo_data, client_data.fname, client_data.lname);
    // Try with minor data in case user booked with their child's info instead of their's
    if (bookeo_result.match === 'false' && client_data.minorChecked=='true') {
      bookeo_result = checkBookingData(bookeo_data, client_data.mfname, client_data.mlname);
    }

    // Take some actions based off our validation results:
    if (bookeo_result.match === 'true') {
      const redisData = new URLSearchParams();
      // Store HMAC handshake (with public and private keys) in Redis data
      const handshake = createHmac('MD5', Netlify.env.get("RSA_PRIVATE_KEY")).update(publicKey).digest('hex');
      // Store all of the clients data in Redis data
      Object.entries(client_data).forEach(([key, value]) => {
        redisData.append(key, String(value));
      });
      redisData.append("handshake", handshake);
      
      /// Store the object in Upstash Redis; this DB will be used in all subsequent API calls by the client/edge-functions 
      //  CTE client <--> Netlify edge-functions <--> Upstash Redis Database 
      //  The reasoning behind this is that it is more secure than storing all the waiver data on the client side
      //  There is a two-step verification process for subsequent calls: (1) TTL sessionId hasn't expired, and (2) valid handshake HMAC hash
      await redis.set(`session:${publicKey}`, redisData.toString(), { ex: 600 }); // NOTE: this is a TTL value and is set to expire in 10 minutes

      // Finally return the handshake value to the client if validation successfull 
      return new Response(redisData.handshake.toString(), {
        status: 200,
        headers: corsHeaders
      });

    } else {
      return new Response(
        JSON.stringify(`Bookeo request failed: ${bookeo_result.match}`),
        {
          status: 403,
          headers: corsHeaders
        }
      );
    }
  } catch (error) {
    // Catch any runtime errors and set CORS headers
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders
    });
  }
};