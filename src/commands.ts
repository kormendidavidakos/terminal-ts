import { createDirectory, createFile, currDir, getByPath, getNode, removeNode, setCurrentDirectory, type DirectoryNode } from "./kernel/Filesystem"

type CommandFunctionType = (...args: string[]) => string|void

function echo(...args: string[]): string {
    return args.join(' ')
}

function ls(...args: string[]): string {
    return Object.entries(currDir.content).map(([key, val]) => `${key}: ${val.type}`).join('\n')
}

function touch(...args: string[]): string|void {
    if (args.length === 0)
        return 'Must specify a filename'
    createFile(currDir, args[0])
    return
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

    const target = getByPath(args[0])
    if (target === null || target.type !== 'file')
        return `No such file.`

    return target.content
}

function cd(...args: string[]): string|void {
    if (args.length === 0)
        return 'Must specify a directory name'
    
    const target = getByPath(args[0])
    if (target === null || target.type !== 'dir')
        return `No such directory.`

    setCurrentDirectory(target)

    return
}

function rm(...args: string[]): string|void {
    if (args.length === 0)
        return 'Must specify a file or directory name'

    const target = getByPath(args[0])
    if (target === null)
        return `No such file or  directory`

    removeNode(target)
    return
}



export const commands: {[k: string]: CommandFunctionType} = {
    'echo': echo,
    'ls': ls,
    'touch': touch,
    'mkdir': mkdir,
    'cd': cd,
    'cat': cat,
    'rm': rm
}