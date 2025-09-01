import { useEffect, useState } from "react"
import { commands } from "./commands"
import { createFile, currDir, currDirPath, getFile, writeToFile } from "./kernel/Filesystem"

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

    function parseCommand(command: string): string|void{
        command = command.trim()
        if (command === '')
            return
        const commandParts = command.split(/\s/)
        const name = commandParts[0]

        const hasRedirection = commandParts.includes('>')
        const argsEnd = hasRedirection ? commandParts.indexOf('>') : commandParts.length
        const args = commandParts.slice(1, argsEnd)

        if (hasRedirection && commandParts.indexOf('>') === commandParts.length - 1)
            return `Must specify a file for redirection`

        if (!commands[name])
            return `Unknown command: "${name}"`
        const commandResult = commands[name](...args)
        if (!hasRedirection)
            return commandResult

        const targetFileName = commandParts[commandParts.indexOf('>') + 1]
        let targetFile = getFile(targetFileName)
        if (targetFile === null)
            targetFile = createFile(currDir, targetFileName)

        writeToFile(targetFile, commandResult)
        return ''
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

                    const commandOutput = parseCommand(prevInput)
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