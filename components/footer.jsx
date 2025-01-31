import Link from 'next/link';

const dbLink = process.env.NEXT_PUBLIC_WAIVER_DB; // Stored in environment to make updating the link as needed easier 

export function Footer() {
    return (
        <footer className="pt-16 pb-12 sm:pt-24 sm:pb-16">
            <p className="text-sm">
                <Link href="https://www.chapelthrillescapes.com" target="_blank" rel="noopener noreferrer" className="underline transition decoration-dashed text-primary underline-offset-8 hover:opacity-80">
                    chapelthrillescapes.com
                </Link>
            </p>

            <p className="text-sm">
                <Link href={dbLink} target="_blank" rel="noopener noreferrer" className="underline transition decoration-dashed text-primary underline-offset-8 hover:opacity-80">
                    Waiver Database
                </Link>
            </p>
        </footer>
    );
};
