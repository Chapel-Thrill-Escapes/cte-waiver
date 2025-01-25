
export default async (request, context) => {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");

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

    // 2 Place your custom logic here (e.g. verify the code in a database, etc.)
    // For this example, we’ll assume code === "1234" is valid; otherwise invalid.
    if (code === "1234") {
      return new Response(
        JSON.stringify({ success: true, message: "Valid code!" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // If it doesn't match, return an error
    return new Response(
      JSON.stringify({ success: false, message: "Invalid code" }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Scan route error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Unexpected server error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}