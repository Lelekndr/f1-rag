import "./global.css"

export const metadata = {
    title:"F1OLLAMA",
    description: "Using an LLM to get lastest news about F1 "
}

const RootLayout = ({ children }: { children: React.ReactNode }) => {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    )
}