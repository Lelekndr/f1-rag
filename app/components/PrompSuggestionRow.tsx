
type PromptSuggestionRowProps = {
    onSelect: (prompt: string) => void;
};

const PrompSuggestionRow = ({ onSelect }: PromptSuggestionRowProps) => {
    const prompts = [
        "Quem são os pilotos da temporada atual?",
        "Quais são as equipes da Fórmula 1?",
        "Como funciona o sistema de pontuação?",
        "Conte-me sobre a história da Ferrari."
    ];

    return (
        <div className="prompt-suggestions">
            {prompts.map((prompt, index) => (
                <button
                    key={index}
                    type="button"
                    onClick={() => onSelect(prompt)}
                >
                    {prompt}
                </button>
            ))}
        </div>
    );
};

export default PrompSuggestionRow;
