// netlify/functions/googleSubmit-background.js
import Busboy from 'busboy';

export async function handler(request, context) {
    try {
        // Create a new Busboy instance using the incoming request headers
        const busboy = new Busboy({ headers: request.headers });
        const payload = {};

        // Handle regular form fields
        busboy.on('field', (fieldname, val) => {
        payload[fieldname] = val;
        });
        console.log('Background function invoked');
    
        // 2) Perform your long-running or asynchronous tasks here
        await googlePost(payload);
    
        // 3) You can return a response. 
        //    The response doesn’t go back to the "caller" as a normal response, 
        //    but Netlify will log it and it can help with debugging.
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Background function completed successfully.' })
        };
        
    } catch (err) {
      // Error logging
      console.error('Error in background function:', err);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Background function encountered an error.' })
      };
    }
  }
  
  // Example "heavy lifting" function
  async function googlePost(payload) {

    const googleWebAppUrl = process.env.GOOGLE_WEBAPP_URL; // e.g., https://script.google.com/macros/s/...
    const googleResp = await fetch(googleWebAppUrl, {
      method: 'POST',
      body: payload
    });
    const googleResult = await googleResp.json();

    if (googleResult.result === "error") {
        console.log(`Waiver Submit: Form post failed; ${googleResult.error}`);
        return { 
            statusCode: 500,
            body: JSON.stringify({ error: `Form post failed: ${googleResp.error}` })
        };
    }
  }  