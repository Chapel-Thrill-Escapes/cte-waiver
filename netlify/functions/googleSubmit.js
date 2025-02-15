// netlify/functions/googleSubmit-background.js

export async function handler(event, context) {
    try {
        var payload = JSON.parse(event.body || '{}');
        if (!payload) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Background function encountered an error.' })
            };    
        }
        console.log("Background function invoked");

        // 2 Perform your long-running or asynchronous tasks here
        const formData = new FormData();
        for (let key in payload) {
            if (payload.hasOwnProperty(key)) {
                formData.append(key, payload[key]);
            }
        }
    
        const googleWebAppUrl = process.env.GOOGLE_WEBAPP_URL; // e.g., https://script.google.com/macros/s/...
        const googleResp = await fetch(googleWebAppUrl, {
          method: 'POST',
          body: formData
        });
        // const googleResult = await googleResp.json();
    
        // if (googleResult.result === "error") {
        //    console.log(`Waiver Submit: Form post failed; ${googleResult.error}`);
        //    return new Response(JSON.stringify({ error: `Form post failed: ${googleResp.error}` }), { status: 500 });
        //}
    
        // 3 You can return a response. 
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
