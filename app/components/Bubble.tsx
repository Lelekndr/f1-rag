
import type { UIMessage } from 'ai';

type BubbleProps = {
    message: UIMessage;
};

const Bubble = ({ message }: BubbleProps) => {
    return (
        <div className={`bubble ${message.role}`}>
            {message.parts.map((part, index) => {
                if (part.type === 'text') {
                    return <p key={index}>{part.text}</p>;
                }

                return null;
            })}
        </div>
    );
};

export default Bubble;
