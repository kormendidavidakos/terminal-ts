import { createDirectory, createFile, currDir, fsRoot, setCurrentDirectory, type DirectoryNode } from "./kernel/Filesystem"

type CommandFunctionType = (...args: string[]) => string

function echo(...args: string[]): string {
    return args.join(' ')
}

function ls(...args: string[]): string {
    return Object.entries(currDir.content).map(([key, val]) => `${key}: ${val.type}`).join('\n')
}

function touch(...args: string[]): string {
    if (args.length === 0)
        return 'Must specify a filename'
    createFile(currDir, args[0])
    return ''
}

function mkdir(...args: string[]): string {
    if (args.length === 0)
        return 'Must specify a directory name'
    createDirectory(currDir, args[0])

    return ''
}

function cat(...args: string[]): string {
    if (args.length === 0)
        return 'Must specify a filename'
    const file = currDir.content[args[0]]
    if (!file || file.type !== 'file')
        return 'File does not exist'

    return file.content
}

function cd(...args: string[]): string {
    if (args.length === 0)
        return 'Must specify a directory name'
    if (args[0] === '..')
        setCurrentDirectory(currDir.parent)
    else if (!currDir.content[args[0]] || currDir.content[args[0]].type !== 'dir')
        return 'Directory does not exist'
    else
        setCurrentDirectory(currDir.content[args[0]] as DirectoryNode)

    return ''
}


export const commands: {[k: string]: CommandFunctionType} = {
    'echo': echo,
    'ls': ls,
    'touch': touch,
    'mkdir': mkdir,
    'cd': cd,
    'cat': cat
}