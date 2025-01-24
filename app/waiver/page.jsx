// /app/waiver/landing.jsx
"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";

const LandingPageContent = () => {
  const searchParams = useSearchParams(); // Use next/navigation for query params
  const bookeoCustomerID = searchParams.get("p1");
  const bookeoId = searchParams.get("p2");
  const signatureKey = searchParams.get("p3");

  useEffect(() => {
    if (bookeoCustomerID && bookeoId && signatureKey) {
      // Call the edge function
      const edgeFunctionUrl = `/validate-waiver?bookeoCustomerID=${bookeoCustomerID}&bookeoId=${bookeoId}&signatureKey=${signatureKey}`;
      fetch(edgeFunctionUrl) // Redirect to the edge function
    }
  }, [bookeoCustomerID, bookeoId, signatureKey]);

  return (
    <div class="loading-overlay">
        <div class="modal">
            <p>Validating...</p>
            <div class="spinner"></div>
        </div>
    </div>

  );
};

const LandingPage = () => {
    return (
      <Suspense fallback={<p>Loading...</p>}>
        <LandingPageContent />
      </Suspense>
    );
  };
  
  export default LandingPage;