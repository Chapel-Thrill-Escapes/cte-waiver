// pages/api/verify.js

export default async (request, context) => {
  // Extract any relevant info from the query or body
  // For example, if you wanted to parse ?code=XYZ
  const { searchParams } = new URL(request.url);

  // Placeholder: decide if it's verified or not
  // In real life, you might check a database or some other logic
  const isVerified = Math.random() > 0.5; // 50% chance

  if (isVerified) {
    return new Response(JSON.stringify('verified'), {
      status: 200,
    });
  } else {
    return new Response(JSON.stringify('not verified'), {
      status: 401,
    });
  }
}
