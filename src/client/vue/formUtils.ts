export type InputValidation = null | {
    ok: boolean;
    details?: string;
};

export const toInputClass = (inputValidation: InputValidation): string => {
    if (null === inputValidation) {
        return '';
    }

    return inputValidation.ok ? 'is-valid' : 'is-invalid';
};
