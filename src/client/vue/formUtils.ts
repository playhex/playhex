export type InputValidation = null | {
    ok: boolean;
    reason?: string;
};

export const toInputClass = (inputValidation: InputValidation): string => {
    if (inputValidation === null) {
        return '';
    }

    return inputValidation.ok ? 'is-valid' : 'is-invalid';
};
