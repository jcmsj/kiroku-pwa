const OTHER = 0;
const QUESTION = 1;
const ANSWER = 2;
const HEADER = 3;


export function to_string(cls: number): string {
    switch (cls) {
        case OTHER:
            return "OTHER";
        case QUESTION:
            return "QUESTION";
        case ANSWER:
            return "ANSWER";
        case HEADER:
            return "HEADER";
    }

    throw new Error("Invalid FUNSD class");
}

export {
    OTHER,
    QUESTION,
    ANSWER,
    HEADER
}
