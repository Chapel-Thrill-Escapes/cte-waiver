import Image from 'next/image';
import Link from 'next/link';
const cteLogo = 'https://images.squarespace-cdn.com/content/v1/5c4bb09e12b13f52d82511e7/1562894905826-0WWB3EMBR4WBXLT74LPR/blacklogo.png?format=750w';

const navItems = [
    { linkText: 'Home', href: '/' },
    { linkText: 'Waiver Validation', href: '/waiver' },
];

export function Header() {
    return (
        <nav className="flex flex-wrap items-center gap-4 pt-6 pb-12 sm:pt-12 md:pb-24">
            <Link href="/">
                <Image src={cteLogo} alt="Chapel Thrill Escapes logo" />
            </Link>
            {!!navItems?.length && (
                <ul className="flex flex-wrap gap-x-4 gap-y-1">
                    {navItems.map((item, index) => (
                        <li key={index}>
                            <Link
                                href={item.href}
                                className="inline-block px-1.5 py-1 transition hover:opacity-80 sm:px-3 sm:py-2"
                            >
                                {item.linkText}
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </nav>
    );
}
