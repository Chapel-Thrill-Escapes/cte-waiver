"use client";
import { useState } from 'react';
import { QrCodeScanner } from 'components/qr-scanner';
// import background from 'public/images/netlify-logo.svg';

export default function Page() {
  const CORRECT_PASSWORD = process.env.NEXT_PUBLIC_PORTAL_PASSWORD; // Stored in environment to make updating the password as needed easier 

  const [enteredPassword, setEnteredPassword] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (enteredPassword === CORRECT_PASSWORD) {
      setIsAuthorized(true);
    } else {
      alert('Invalid password. Please try again.');
    }
  };

  if (!isAuthorized) {
    return (
      <div className= "bg-linear-to-r from-cyan-500 to-blue-500" style={{ textAlign: 'center', marginTop: '2rem' }}>
        <h1>This page is password protected</h1>
        <form onSubmit={handleSubmit} style={{ marginTop: '1rem' }}>
          <label htmlFor="password" style={{ display: 'block' }}>
            Enter Password:
          </label>
          <input
            type="password"
            name="password"
            id="password"
            placeholder="Password"
            value={enteredPassword}
            className="w-full p-2 border rounded"
            onChange={(e) => setEnteredPassword(e.target.value)}
            style={{ margin: '0.5rem 0' }}
          />
          <br />
          <button type="submit">Submit</button>
        </form>
      </div>
    );
  }

  // Once authorized, show actual content:
  return (
    <>
      <h1 className = "text-primary">QR Code Scanner</h1>
      <div className="flex w-full pt-12 justify-center">
        <QrCodeScanner />
      </div>
    </>
  );
}