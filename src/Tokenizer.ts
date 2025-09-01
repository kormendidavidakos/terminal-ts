export type CommandToken = {
    type: 'command'
    value: string
}

export type PathToken = {
    type: 'path'
    value: string
}

export type ControlToken = {
    type: 'control'
    value: string
}

export type StringToken = {
    type: 'string'
    value: string
    explicit: boolean
}

function getToken(word: string): Token {
    if (['>', '>>', '|', '<', '<<'].includes(word)){
        return {type: 'control', value: word}
    }
    if (word.startsWith('/') || word.startsWith('./') || word.startsWith('..')){
        return {type: "path", value: word}
    }
    return {type: "string", value: word, explicit: false}
}

export function tokenize(input: string): Token[] {
    input = input.trim()
    const tokens: Token[] = []

    let tokenBuffer = ''
    let currentTokenType: 'command'|'path'|'control'|'string'|null = null
    let escapeCountdown = 0
    for (let idx = 0; idx < input.length; idx++) {
        const char = input[idx];
        
        if (char === '"' && escapeCountdown !== 1){
            if (currentTokenType !== 'string' && tokenBuffer.length === 0){
                currentTokenType = 'string'
                continue
            }
            else if (currentTokenType === 'string'){
                tokens.push({type: "string", value: tokenBuffer, explicit: true})
                currentTokenType = null
                tokenBuffer = ''
                continue
            }
            tokenBuffer += char
            continue
        }
        if (/\s/.test(char) && currentTokenType !== 'string' && escapeCountdown !== 1){
            if (tokenBuffer){
                tokens.push(getToken(tokenBuffer))
                tokenBuffer = ''
                currentTokenType = null
            }
            continue
        }
        if (['>', '|', '<'].includes(char) && escapeCountdown !== 1){
            if (currentTokenType !== 'control' && tokenBuffer){
                tokens.push(getToken(tokenBuffer))
                tokenBuffer = ''
            }
            currentTokenType = 'control'
            tokenBuffer += char
            continue
        }
        if (char === '\\' && escapeCountdown !== 1){
            escapeCountdown = 2
            continue
        }

        tokenBuffer += char
        escapeCountdown -= 1
    }
    if (tokenBuffer)
        tokens.push(getToken(tokenBuffer))
    if (tokens.length && tokens[0].type === 'string' && !tokens[0].explicit){
        tokens[0] = {type: 'command', value: tokens[0].value} // TODO: probably wrong for some cases
    }

    return tokens
}


export type Token = CommandToken | PathToken | ControlToken | StringToken