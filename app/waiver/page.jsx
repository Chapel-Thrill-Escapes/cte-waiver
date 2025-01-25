"use client";

import { useState } from "react";
import {
  Scanner,
  useDevices,
  outline,
  boundingBox,
  centerText,
} from "@yudiel/react-qr-scanner";

const styles = {
  container: {
    width: 400,
    margin: "auto",
  },
  controls: {
    marginBottom: 8,
  },
};

export default function ScannerPage() {
  const [pause, setPause] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [modalVisible, setModalVisible] = useState(false);

  const handleScan = async (data) => {
    setPause(true);
    try {
      // Retrieve each parameter's value
      const params = new URLSearchParams(data);
      const p1 = params.get("p1");
      const p2 = params.get("p2");
      const p3 = params.get("p3");

      const response = await fetch(`https://cte-waiver.netlify.app/validate-waiver?customerId=${encodeURIComponent(p1)}?ID=${encodeURIComponent(p2)}?waiverConfirm=${encodeURIComponent(p3)}`);
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
        }, 2500);
      
    } catch (error) {
      alert("Error scanning");
      console.error("Error scanning:", error);
      setPause(false);
    }
  };

  // Decide the modal background color based on verification status
  const modalBackgroundColor =
    statusMessage === 'Valid Waiver' ? '#00a755' : '#f0474c';

  let verificationIcon = null;
  if (vstatusMessage === 'Valid Waiver') {
    statusIcon = (
      <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="white">
        <path d="M256 48a208 208 0 1 1 0 416 208 208 0 1 1 0-416zm0 464A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM369 209c9.4-9.4 9.4-24.6 0-33.9s-24.6-9.4-33.9 0l-111 111-47-47c-9.4-9.4-24.6-9.4-33.9 0s-9.4 24.6 0 33.9l64 64c9.4 9.4 24.6 9.4 33.9 0L369 209z"/>
      </svg>
  );
  } else if (statusMessage === 'Invalid Waiver') {
    statusIcon = (
      <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="white">
        <path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zm0-384c13.3 0 24 10.7 24 24l0 112c0 13.3-10.7 24-24 24s-24-10.7-24-24l0-112c0-13.3 10.7-24 24-24zM224 352a32 32 0 1 1 64 0 32 32 0 1 1 -64 0z"/>
      </svg>
    );
  }  

  return (
    <div style={{ textAlign: 'center' }}>
      <h1 >QR Code Scanner</h1>
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
          <div style={{ textAlign: 'center', justifyContent: 'center' }}>
            <span>{statusIcon}</span>
            <b>{statusMessage}</b>
          </div>
        </div>
      )}
    </div>
  );
}