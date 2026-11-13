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

    const { messages, sendMessage, status, error } = useChat({
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
                            Pergunte qualquer coisa sobre F1!
                        </p>

                        <br />

                        <PromptSuggestionRow
                            onSelect={(prompt) => {
                                if (!isLoading) sendMessage({ text: prompt });
                            }}
                        />
                    </>
                ) : (
                    <>
                        {messages.map((message) => (
                            <Bubble key={message.id} message={message} />
                        ))}

                        {status === 'submitted' && <LoadingBubble />}
                    </>
                )}

                {error && (
                    <p className="starter-text">
                        Erro ao responder. Verifique se o Ollama e o Qdrant estão no ar.
                    </p>
                )}
            </section>

            <form onSubmit={handleSubmit}>
                <input
                    className="question-box"
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder="Pergunte qualquer coisa sobre F1..."
                />

                <button type="submit" disabled={isLoading || !input.trim()}>
                    Enviar
                </button>
            </form>
        </main>
    );
};

export default Home;