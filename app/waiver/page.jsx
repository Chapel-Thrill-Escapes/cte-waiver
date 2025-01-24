// /app/waiver/landing.jsx
"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";

const LandingPageContent = () => {
  const searchParams = useSearchParams(); // Use next/navigation for query params
  const bookeoCustomerID = searchParams.get("bookeoCustomerID");
  const bookeoId = searchParams.get("bookeoId");
  const signatureKey = searchParams.get("signatureKey");

  useEffect(() => {
    if (bookeoCustomerID && bookeoId && signatureKey) {
      // Call the edge function
      const edgeFunctionUrl = `/validate-waiver?bookeoCustomerID=${bookeoCustomerID}&bookeoId=${bookeoId}&signatureKey=${signatureKey}`;
      window.location.href = edgeFunctionUrl; // Redirect to the edge function
    }
  }, [bookeoCustomerID, bookeoId, signatureKey]);

  return (
    <main className="flex flex-col gap-8 sm:gap-16">
        <section className="flex flex-col items-start gap-3 sm:gap-4">
            <div class="loading-overlay">
                <div class="modal">
                    <p>Validating...</p>
                    <div class="spinner"></div>
                </div>
            </div>
        </section>
    </main>
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