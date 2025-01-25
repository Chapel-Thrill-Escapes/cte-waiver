"use client";

import React, { useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';

// Dynamically load react-qr-reader on the client side only
const QrReader = dynamic(() => import('react-qr-reader'), { ssr: false });

export default function Home() {
  const [scanResult, setScanResult] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  
  const isProcessingRef = useRef(false);

  const handleScan = useCallback(async (data) => {
    if (!data) return;
    if (isProcessingRef.current) return;

    isProcessingRef.current = true;

    try {
      // `data` is the string read from the QR code.
      // If it’s a direct URL to an endpoint, we can just fetch it:
      const response = await fetch(data);
      const json = await response.json();
      
      // Set the status message based on server response
      if (json.status === 'verified') {
        setStatusMessage('Verified!');
      } else {
        setStatusMessage('Not Verified.');
      }
    } catch (error) {
      console.error('Error fetching verification:', error);
      setStatusMessage('Error checking code.');
    }

    // Show modal
    setModalVisible(true);
    setScanResult(data);

    // Hide modal after 3 seconds and reset
    setTimeout(() => {
      setModalVisible(false);
      setScanResult(null);
      setStatusMessage('');
      isProcessingRef.current = false; 
    }, 3000);
  }, []);

  const handleError = useCallback((err) => {
    console.error('QR Scan Error:', err);
  }, []);

  return (
    <div style={{ textAlign: 'center', padding: '1rem' }}>
      <h1>QR Code Scanner</h1>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <QrReader
          delay={300}
          onError={handleError}
          onScan={handleScan}
          style={{ width: '100%' }}
          facingMode="environment"
        />
      </div>

      {/* Modal */}
      {modalVisible && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            zIndex: 9999
          }}
        >
          <div
            style={{
              background: '#333',
              padding: '2rem',
              borderRadius: '8px',
              textAlign: 'center'
            }}
          >
            <p>{statusMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
}