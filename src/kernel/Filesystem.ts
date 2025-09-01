export type FileNode = {
    type: 'file'
    content: string,
    parent: DirectoryNode
}

export type DirectoryNode = {
    type: 'dir'
    content: {[k: string]: FileNode|DirectoryNode}
    parent: DirectoryNode
}

export function createFile(parent: DirectoryNode, name: string){
    parent.content[name] = {type: 'file', content: '', parent: parent}
    return parent.content[name]
}

export function createDirectory(parent: DirectoryNode, name: string){
    parent.content[name] = {type: 'dir', content: {}, parent: parent}
    return parent.content[name]
}

export function removeNode(target: FileNode|DirectoryNode){
    if (Object.is(target, target.parent))
        return

    const fileName = Object.keys(target.parent.content).find(name => Object.is(target.parent.content[name], target)) as string
    delete target.parent.content[fileName]
}

export function setCurrentDirectory(setTo: DirectoryNode){
    currDir = setTo

    let newPath = '/'
    let target: DirectoryNode = setTo
    let depth = 0
    while (true){
        if (Object.is(target.parent, target) || depth++ > 100)
            break

        const dirname = Object.keys(target.parent.content).find(name => Object.is(target, target.parent.content[name]))
        newPath = '/' + dirname + newPath
        target = target.parent
    }

    currDirPath = newPath
}

export function getNode(name: string): FileNode | DirectoryNode | null {    
    return currDir.content[name] ?? null
}

export function getFile(filename: string): FileNode | null {
    const node = getNode(filename)
    if (node === null || node.type !== 'file')
        return null

    return node
}

export function getDir(filename: string): DirectoryNode | null {
    const node = getNode(filename)
    if (node === null || node.type !== 'dir')
        return null

    return node
}

export function writeToFile(file: FileNode, content: string){
    file.content = content
}

const rootCreator: Partial<DirectoryNode> = {type: 'dir', content: {}}
rootCreator.parent = rootCreator as DirectoryNode

export const fsRoot: DirectoryNode = rootCreator as DirectoryNode
export let currDir: DirectoryNode = fsRoot
export let currDirPath: string = '/'