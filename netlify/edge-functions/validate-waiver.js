// pages/api/verify.js

export default function handler(req, res) {
  // Extract any relevant info from the query or body
  // For example, if you wanted to parse ?code=XYZ
  const { code } = req.query;

  // Placeholder: decide if it's verified or not
  // In real life, you might check a database or some other logic
  const isVerified = Math.random() > 0.5; // 50% chance

  if (isVerified) {
    return res.status(200).json({ status: 'verified' });
  } else {
    return res.status(401).json({ status: 'not verified' });
  }
}
