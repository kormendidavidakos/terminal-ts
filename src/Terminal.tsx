import { useEffect, useState } from "react"
import { commands } from "./commands"
import { createFile, currDir, currDirPath, getByPath, getFile, writeToFile } from "./kernel/Filesystem"
import { tokenize, type ControlToken, type Token } from "./Tokenizer"

type CursorState = {
    shown: boolean
    hidden: boolean
    position: number
}
type Output = {
    source: 'input'|'command'
    text: string
}
const cursorChar = <>&#9608;</>
const ignoredKeys = ['ArrowUp', 'ArrowDown', 'Alt', 'Control', 'Enter', 'Escape', 'PageUp', 'PageDown', 'Insert', 'ScrollLock', 'Pause', 'Print', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12', 'Shift']
const specialKeys = [...ignoredKeys, 'Backspace', 'ArrowLeft', 'ArrowRight', 'Delete', 'End', 'Home', 'Del', 'Tab']
let inputHistory = ['']

export default function Terminal() {
    const [cursor, setCursor] = useState<CursorState>({shown: true, hidden: false, position: 0})
    const [cursorOffset, setCursorOffset] = useState(0)
    const [input, setInput] = useState('')
    const [inputHistoryIdx, setInputHistoryIdx] = useState(0)
    const [outputHistory, setOutputHistoy] = useState<Output[]>([])
    
    useEffect(() => {
        const intervalId = setInterval(() => setCursor((prev) => {
            if (prev.hidden)
                return prev
            return {...prev, shown: !prev.shown}
        }), 1000)

        return () => clearInterval(intervalId)
    }, [cursor])

    useEffect(() => {
        if (inputHistoryIdx !== 0)
            return
        inputHistory[0] = input
    }, [input])

    useEffect(() => {
        setInput(inputHistory[inputHistoryIdx])
        setCursor((prev) => ({...prev, position: inputHistory[inputHistoryIdx].length}))
    }, [inputHistoryIdx])

    useEffect(() => {
        if (cursorOffset === 0)
            return

        const newPosition = Math.max(0, Math.min(cursor.position + cursorOffset, input.length + 1))
        setCursor(prev => ({...prev, position: newPosition, shown: true}))
        setCursorOffset(0)
    }, [cursorOffset])

    function parseCommand(tokens: Token[]): string|void {
        if (tokens.length === 0)
            return

        const command = tokens[0].value
        const args = tokens.slice(1).map(token => token.value)

        if (command === 'clear'){
            // TODO: take clear command here
            return
        }
        if (!commands[command]){
            return `Unknown command: ${command}`
        }

        return commands[command](...args)
    }

    function parseInput(command: string): string|void{
        command = command.trim()
        if (command === '')
            return

        const tokens = tokenize(command)
        if (tokens[0].type !== 'command')
            return `Panic: ${command} doesn't start with a command`

        const groups: Token[][] = [[]]
        const controlTokens: ControlToken[] = []
        for (const token of tokens) {
            if (token.type !== 'control')
                groups.at(-1)?.push(token)
            else {
                groups.push([])
                controlTokens.push(token)
            }
        }

        const result = parseCommand(groups[0])
        if (!controlTokens.length || !['>', '>>'].includes(controlTokens[0].value)  )
            return result

        if (groups.length < 2 || groups[1].length === 0)
            return 'Invalid redirection'

        if (groups[1][0].type !== 'path'){
            groups[1][0] = {type: 'path', 'value': './' + groups[1][0].value}
        }

        const targetFile = groups[1][0].value
        let fd = getByPath(targetFile)
        if (fd?.type === 'dir')
            return `Target is a directory: ${targetFile}`
        if (fd === null){
            fd = getByPath(targetFile.slice(0, targetFile.lastIndexOf('/') + 1))
            if (fd === null || fd.type !== 'dir')
                return `No such file or directory1: ${targetFile}`
            fd = createFile(fd, targetFile.slice(targetFile.lastIndexOf('/') + 1))
        }
        
        switch (controlTokens[0].value) {
            case '>':
                fd.content = result ?? ''
                break
            case '>>':
                fd.content += result ?? ''
                break
            default:
                break
        }
    }

    function keydownEvent(event: KeyboardEvent){
        event.preventDefault()
        if (!specialKeys.includes(event.key)){
            setCursor((prevCursor) => {
                setInput((prev) => prev.slice(0, prevCursor.position) + event.key + prev.slice(prevCursor.position))

                return prevCursor
            })
            setCursorOffset((prev) => prev + 1)
        }

        if (event.key === 'Backspace'){
            setCursor((prevCursor) => {
                if (prevCursor.position === 0) return prevCursor
                setInput((prev) => prev.slice(0, prevCursor.position - 1) + prev.slice(prevCursor.position))

                return prevCursor
            })
            setCursorOffset((prev) => prev - 1)
        }
        if (event.key === 'Delete'){
            setCursor((prevCursor) => {
                setInput((prev) => prev.slice(0, prevCursor.position) + prev.slice(prevCursor.position + 1))
                return {...prevCursor, shown: true}
            })
        }

        if (event.key === 'ArrowLeft')
            setCursorOffset((prev) => prev - 1)
        if (event.key === 'ArrowRight')
            setCursorOffset((prev) => prev + 1)
        if (event.key === 'Home')
            setCursorOffset(Number.MIN_SAFE_INTEGER)
        if (event.key === 'End')
            setCursorOffset(Number.MAX_SAFE_INTEGER)

        if (event.key === 'Enter'){
            setInput((prevInput) => {
                setOutputHistoy((prev) => {
                    if (prevInput.trim() === 'clear')
                        return []

                    const newHistory: Output[] = [...prev, {source: 'input', text: prevInput}]

                    const commandOutput = parseInput(prevInput)
                    if (commandOutput !== undefined)
                        newHistory.push({source: "command", text: commandOutput})

                    return newHistory
                })
                if (inputHistory.length > 1 && inputHistory[1] === prevInput)
                    return ''
                if (prevInput.trim() === '')
                    return ''
                
                inputHistory = ['', ...inputHistory]
                return ''
            })
            setCursor(prev => ({...prev, position: 0, shown: true}))
            setInputHistoryIdx(0)
        }

        if (event.key === 'ArrowUp'){
            setInputHistoryIdx(prev => Math.min(prev + 1, inputHistory.length - 1))
        }
        if (event.key === 'ArrowDown'){
            setInputHistoryIdx(prev => Math.max(prev - 1, 0))
        }
        if (event.key === 'Tab'){
            setInput((prev) => {
                if (prev.trim() === '')
                    return prev
                const possibleCommands = [...Object.keys(commands), 'clear'].filter(command => command.startsWith(prev))
                if (possibleCommands.length !== 1)
                    return prev

                const targetCommand = possibleCommands[0]
                setCursorOffset(targetCommand.length - prev.length)
                return targetCommand
            })
        }
            
        
    }

    useEffect(() => {
        document.addEventListener('keydown', keydownEvent)
        return () => document.removeEventListener('keydown', keydownEvent)
    }, [])

    function textInInput(){
        if (!cursor.shown)
            return input

        let frontText = ''
        let endText = ''
        for (let idx = 0; idx < cursor.position; idx++){
            frontText += input.charAt(idx)
        }
        for (let idx = cursor.position + 1; idx < input.length; idx++){
            endText += input.charAt(idx)
        }

        return <>{frontText}{cursorChar}{endText}</>
    }

    function outputText(){
        return <>
            {outputHistory.map((output, idx) => 
                <span key={`output-${idx}`}>
                    {output.source === 'input' ? '> ' : '  '}
                    {output.text.replaceAll('\n', '\n  ')}
                    <br/>
                </span>)}
            </>
    }
    

    return (
      <div className='terminal'>
        <pre style={{whiteSpace: "pre-wrap"}}>{outputText()}{currDirPath}&nbsp;&gt;&nbsp;{textInInput()}</pre>
      </div>
    )
}