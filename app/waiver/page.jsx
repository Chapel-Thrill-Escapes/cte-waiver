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
  const [deviceId, setDeviceId] = useState(undefined);
  const [pause, setPause] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const handleScan = async (data) => {
    setPause(true);
    try {
      const response = await fetch(`https://http://cte-waiver.netlify.app/validate-waiver?code=${encodeURIComponent(data)}`);
      const result = await response.json();

      if (response.ok && result.success) {
        alert("Success! Waiver validated.")
        // setStatusMessage('Success! Waiver validated.');
      } else {
        // setStatusMessage('Fail. Waiver not validated.');
        alert(result.message);
      }
    } catch (error) {
      alert("Error scanning");
      console.error("Error scanning:", error);
    } finally {
      setPause(false);
    }
  };

  return (
    <div>
      <Scanner
        formats={[
          "qr_code",
          "micro_qr_code",
          "rm_qr_code",
          "maxi_code",
          "pdf417",
          "aztec",
          "data_matrix",
          "matrix_codes",
          "dx_film_edge",
          "databar",
          "databar_expanded",
          "codabar",
          "code_39",
          "code_93",
          "code_128",
          "ean_8",
          "ean_13",
          "itf",
          "linear_codes",
          "upc_a",
          "upc_e",
        ]}
        constraints={{
          deviceId,
        }}
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
    </div>
  );
}