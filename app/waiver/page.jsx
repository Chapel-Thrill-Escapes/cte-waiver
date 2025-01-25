"use client";
import { useState } from 'react';
import { QrCodeScanner } from 'components/qr-scanner';

export default async function Page() {
  const CORRECT_PASSWORD = 'test';

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
      <div style={{ textAlign: 'center', marginTop: '2rem' }}>
        <h1>This page is password protected</h1>
        <form onSubmit={handleSubmit} style={{ marginTop: '1rem' }}>
          <label htmlFor="password" style={{ display: 'block' }}>
            Enter Password:
          </label>
          <input
            type="password"
            id="password"
            value={enteredPassword}
            onChange={(e) => setEnteredPassword(e.target.value)}
            style={{ margin: '0.5rem 0' }}
          />
          <br />
          <button type="submit">Submit</button>
        </form>
      </div>
    );
  }

  // Once authorized, show your actual content:
  return (
    <>
      <h1>QR Code Scanner</h1>
      <div className="flex w-full pt-12 justify-center">
        <QrCodeScanner />
      </div>
    </>
  );
}