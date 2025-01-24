// /app/waiver/landing.jsx
import { useRouter } from 'next/router';
import { useEffect } from 'react';

const WaiverPage = () => {
  const router = useRouter();

  useEffect(() => {
    // Wait until the router is ready to access query parameters
    if (!router.isReady) return;
    // Extract query parameters from the URL
    const { bookeoCustomerID, bookeoId, signatureKey } = router.query;
    // Construct the URL for the edge function
    const edgeFunctionUrl = `/validate-waiver?bookeoCustomerID=${bookeoCustomerID}&bookeoId=${bookeoId}&signatureKey=${signatureKey}`;

    // Redirect the user to the edge function
    window.location.href = edgeFunctionUrl;
  }, [router]);

  return (
    <div>
        <div class="loading-overlay">
            <div class="modal">
                <p>Validating...</p>
                <div class="spinner"></div>
            </div>
        </div>
    </div>
  );
};

export default WaiverPage;