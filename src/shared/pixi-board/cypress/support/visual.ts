declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Cypress {
        interface Chainable {
            /**
             * Takes a screenshot of the GameView canvas and compares it pixel-by-pixel
             * with a stored reference image in cypress/e2e/.
             * On first run (no reference), creates the reference image.
             * Pass --env UPDATE_SNAPSHOTS=true to update existing references.
             *
             * @param expectedFilename Ex: "game-view/empty" (to compare with "game-view/empty.png")
             */
            compareSnapshot(expectedFilename: string): Chainable<void>;
        }
    }
}

Cypress.Commands.add('compareSnapshot', (expectedFilename: string) => {
    cy.log('expectedFilename', expectedFilename);
    cy.get('#board canvas').screenshot(expectedFilename, { overwrite: true });

    const update = Cypress.env('UPDATE_SNAPSHOTS') === 'true';

    cy.task<{ created?: boolean, diffPixels?: number, totalPixels?: number }>(
        '_pixelCompare',
        { update },
    ).then(result => {
        if (result.created) {
            cy.log(`Reference snapshot created: ${expectedFilename}`);
            return;
        }

        if (result.diffPixels !== undefined && result.diffPixels > 0) {
            throw new Error(
                `Snapshot "${expectedFilename}" differs by ${result.diffPixels} / ${result.totalPixels} pixels`,
            );
        }
    });
});

export {};
