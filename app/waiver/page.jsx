// /app/waiver/landing.jsx

import React, { useEffect } from 'react';
import { useRouter } from 'next/router';

const LandingPage = () => {
  const router = useRouter();

  useEffect(() => {
    const { bookeoCustomerID, bookeoId, signatureKey } = router.query;

    if (bookeoCustomerID && bookeoId && signatureKey) {
      // Call the edge function
      const edgeFunctionUrl = `/validate-waiver?bookeoCustomerID=${bookeoCustomerID}&bookeoId=${bookeoId}&signatureKey=${signatureKey}`;
      window.location.href = edgeFunctionUrl; // Trigger edge function (will redirect)
    }
  }, [router.query]);

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

export default LandingPage;