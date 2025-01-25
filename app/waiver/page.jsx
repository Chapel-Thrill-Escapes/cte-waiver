import { QrCodeScanner } from 'components/qr-scanner';

export const metadata = {
    title: 'Waiver Validation'
};

export default async function Page() {
    return (
        <>
            <h1>QR Code Scanner</h1>
            <div className="flex w-full pt-12 justify-center">
                <QrCodeScanner />
            </div>
        </>
    );
}