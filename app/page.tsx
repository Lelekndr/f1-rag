
'use client';

import { useChat } from "@ai-sdk/react";
import PromptSuggestionRow from './components/PrompSuggestionRow';
import LoadingBubble from './components/LoadingBubble';
import Bubble from './components/Bubble';

const Home = () => {
    const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat();

    const noMessages = messages.length === 0;

    return (
        <main>
            <section className={noMessages ? '' : 'populated'}>
                {noMessages ? (
                    <>
                        <p className="starter-text">
                            Ask me anything about F1 and I will answer you with the latest news about it!
                        </p>
                        <br />
                        <PromptSuggestionRow />
                    </>
                ) : (
                    <>
                        {messages.map((message, index) => (
                            <Bubble
                                key={`message-${index}`}
                                message={message}
                            />
                        ))}
                        {isLoading && <LoadingBubble />}
                    </>
                )}
            </section>

            <form onSubmit={handleSubmit}>
                <input
                    className="question-box"
                    onChange={handleInputChange}
                    value={input}
                    placeholder="Ask me anything about F1..."
                />
                <input type="submit" />
            </form>
        </main>
    );
};

export default Home;
