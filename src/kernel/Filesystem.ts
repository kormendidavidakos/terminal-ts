export type FileNode = {
    type: 'file'
    content: string
}

export type DirectoryNode = {
    type: 'dir'
    content: {[k: string]: FileNode|DirectoryNode}
    parent: DirectoryNode
}

export function createFile(parent: DirectoryNode, name: string){
    parent.content[name] = {type: 'file', content: ''}
}

export function createDirectory(parent: DirectoryNode, name: string){
    parent.content[name] = {type: 'dir', content: {}, parent: parent}
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
const rootCreator: Partial<DirectoryNode> = {type: 'dir', content: {}}
rootCreator.parent = rootCreator as DirectoryNode

export const fsRoot: DirectoryNode = rootCreator as DirectoryNode
export let currDir: DirectoryNode = fsRoot
export let currDirPath: string = '/'