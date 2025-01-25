import Link from 'next/link';
import { Card } from 'components/card';
import { CardsGrid } from 'components/cards-grid';
import { getNetlifyContext } from 'utils';

const cards = [
    { text: 'Hello', linkText: 'someLink', href: '/' }
];

const ctx = getNetlifyContext();

export default function Page() {
    return (
        <main className="flex flex-col gap-8 sm:gap-16">
            <section className="flex flex-col items-start gap-3 sm:gap-4">
                <ContextAlert />
                <h1 className="mb-0">Chapel Thrill Escapes - Function Apps</h1>
            </section>
            { !!cards?.length && <CardsGrid cards={cards} /> }
        </main>
    );
}

function RuntimeContextCard() {
    const title = `App Context: currently running in ${ctx} mode.`;
    if (ctx === 'dev') {
        return <Card title={title} text="Next.js will rebuild any page you navigate to, including static pages." />;
    } else {
        return <Card title={title} text="This page was statically-generated at build time." />;
    }
}
