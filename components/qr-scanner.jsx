"use client";

import { useState } from "react";
import {
  Scanner,
  useDevices,
  outline,
  boundingBox,
  centerText,
} from "@yudiel/react-qr-scanner";

export function QrCodeScanner() {
  const [pause, setPause] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [modalVisible, setModalVisible] = useState(false);

  const handleScan = async (data) => {
    setPause(true);
    try {
      // Retrieve each parameter's value
      const keyValues = data.split("&"); // ["p1=123", "p2=124", "p3=1345"]
      const params = {};
      keyValues.forEach((pair) => {
        const [key, value] = pair.split("=");
        params[key] = encodeURIComponent(value);
      });
      const baseUrl = 'https://cte-waiver.netlify.app/validate-waiver';
      
      const response = await fetch(`${baseUrl}?customerId=${params.p1}&participantId=${params.p2}&waiverConfirm=${params.p3}&userHash=${params.p4}&sessionId=${params.p5}`);
      const result = await response.json();

      if (response.ok && result.success) {
        //alert("Success! Waiver validated.")
        setStatusMessage('Valid Waiver');
      } else {
        setStatusMessage('Invalid Waiver');
        //alert(result.message);
      }

      // Show modal
      setModalVisible(true);
      // Hide modal after 3 seconds and reset
      setTimeout(() => {
        setModalVisible(false);
        setStatusMessage('');
        setPause(false);
        }, 2000);
      
    } catch (error) {
      alert("Error scanning");
      console.error("Error scanning:", error);
      setPause(false);
    }
  };

  // Decide the modal background color based on verification status
  const modalBackgroundColor =
    statusMessage === 'Valid Waiver' ? '#00a755' : '#f0474c';

  let statusIcon = null;
  if (statusMessage === 'Valid Waiver') {
    statusIcon = (
      <svg
        width="64" height="64"
        viewBox="0 0 24 24"
        fill="none" stroke="#fff"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        style={{ marginBottom: '1rem' }}
      >
        <path d="M20 6L9 17l-5-5" />
      </svg>
  );
  } else if (statusMessage === 'Invalid Waiver') {
    statusIcon = (
      <svg
        width="64" height="64"
        viewBox="0 0 24 24"
        fill="none" stroke="#fff"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        style={{ marginBottom: '1rem' }}
      >
        <path d="M18 6L6 18M6 6l12 12" />
      </svg>
    );
  }  

  return (
    <div>
      <Scanner
        formats={[
          "qr_code",
          "micro_qr_code",
          "rm_qr_code",
        ]}
        onScan={(detectedCodes) => {
          // Handle the scanned result
          handleScan(detectedCodes[0].rawValue);
        }}
        onError={(error) => {
          console.log(`onError: ${error}`);
        }}
        styles={{ container: { height: "400px", width: "350px" } }}
        components={{
          audio: true,
          tracker: boundingBox,
        }}
        allowMultiple={false}
        scanDelay={2000}
        paused={pause}
      />
      {/* Modal */}
      {modalVisible && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: modalBackgroundColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: '2rem',
            zIndex: 9999,
          }}
        >
          <p>{statusIcon}</p>
          <div style={{ textAlign: 'center', padding: '10px', justifyContent: 'center' }}>
            <b>{statusMessage}</b>
          </div>
        </div>
      )}
    </div>
  );
}