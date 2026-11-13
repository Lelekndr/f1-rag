
import type { Metadata } from 'next';
import './global.css';

export const metadata: Metadata = {
    title: 'F1OLLAMA',
    description: 'Using an LLM to get the latest news about F1',
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="pt-BR">
            <body>{children}</body>
        </html>
    );
}
