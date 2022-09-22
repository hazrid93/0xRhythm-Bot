
interface PlayStrategy {
    execute(): Promise<boolean>;
}

export { PlayStrategy }