// netlify/functions/googleSubmit-background.js

export async function handler(request, context) {
    try {
        const payload = JSON.parse(request.body || '{}');
        if (payload) {
            console.log("Background function invoked");
        }

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
        const googleResult = await googleResp.json();
    
        if (googleResult.result === "error") {
            console.log(`Waiver Submit: Form post failed; ${googleResult.error}`);
            return new Response(JSON.stringify({ error: `Form post failed: ${googleResp.error}` }), { status: 500 });
        }
    
        // 3 You can return a response. 
        //    The response doesn’t go back to the "caller" as a normal response, 
        //    but Netlify will log it and it can help with debugging.
        return new Response(JSON.stringify({ message: 'Background function completed successfully.' }), { status: 200 });
        
    } catch (err) {
      // Error logging
      console.error('Error in background function:', err);
      return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
  }
