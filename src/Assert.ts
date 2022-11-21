export class Assert {
    static that(condition: boolean, message = 'Assertion failed'): void {
        if (!condition) {
            throw new Error(message);
        }
    }
}
