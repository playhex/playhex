const downloadString = (content: string, filename: string, mimeType = 'text/plain'): void => {
    const a = document.createElement('a');
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    a.setAttribute('href', url);
    a.setAttribute('download', filename);
    a.click();
};

export {
    downloadString,
};
