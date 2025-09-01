type CommandFunctionType = (...args: string[]) => string

function echo(...args: string[]): string {
    return args.join(' ')
}


export const commands: {[k: string]: CommandFunctionType} = {
    'echo': echo
}