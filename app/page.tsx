
'use client';

import { useState } from 'react';
import type { SyntheticEvent } from 'react';
import { useChat } from '@ai-sdk/react';
import { TextStreamChatTransport } from 'ai';

import PromptSuggestionRow from './components/PrompSuggestionRow';
import LoadingBubble from './components/LoadingBubble';
import Bubble from './components/Bubble';

const Home = () => {
    const [input, setInput] = useState('');

    const { messages, sendMessage, status } = useChat({
        transport: new TextStreamChatTransport({
            api: '/api/ollama',
        }),
    });

    const noMessages = messages.length === 0;
    const isLoading = status === 'submitted' || status === 'streaming';

    const handleSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!input.trim() || isLoading) return;

    sendMessage({ text: input });
    setInput('');
};

    return (
        <main>
            <section className={noMessages ? '' : 'populated'}>
                {noMessages ? (
                    <>
                        <p className="starter-text">
                            Ask me anything about F1!
                        </p>

                        <br />

                        <PromptSuggestionRow
    onSelect={(prompt) => sendMessage({ text: prompt })}
/>
                    </>
                ) : (
                    <>
                        {messages.map((message) => (
                            <Bubble key={message.id} message={message} />
                        ))}

                        {isLoading && <LoadingBubble />}
                    </>
                )}
            </section>

            <form onSubmit={handleSubmit}>
                <input
                    className="question-box"
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder="Ask me anything about F1..."
                />

                <button type="submit" disabled={isLoading || !input.trim()}>
                    Send
                </button>
            </form>
        </main>
    );
};

export default Home;
