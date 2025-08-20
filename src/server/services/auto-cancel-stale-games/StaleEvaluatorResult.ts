export type StaleEvaluatorResult = {
    shouldCancel: boolean;
    reason: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    context?: { [key: string]: any };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const yes = (reason: string, context?: any): StaleEvaluatorResult => ({
    shouldCancel: true,
    reason: 'Yes: ' + reason,
    context,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const no = (reason: string, context?: any): StaleEvaluatorResult => ({
    shouldCancel: false,
    reason: 'No: ' + reason,
    context,
});
