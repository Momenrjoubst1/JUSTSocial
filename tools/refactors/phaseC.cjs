const { Project, SyntaxKind } = require('ts-morph');
const fs = require('fs');

const project = new Project();
project.addSourceFilesAtPaths(['src/**/*.ts', 'src/**/*.tsx']);

const filesToProcess = [
    'src/hooks/useAuth.ts',
    'src/features/chat/hooks/useChat.ts',
    'src/features/chat/hooks/useMessageLogic.ts',
    'src/features/chat/hooks/useChatEvents.ts',
    'src/features/chat/hooks/usePresence.ts',
    'src/pages/videochat/hooks/useVideoPageState.ts',
    'src/pages/videochat/features/useAIAgent.ts',
    'src/hooks/useCollaboration.ts',
    'src/hooks/useTabNotifications.ts',
    'src/pages/videochat/core/useVideoChat.ts'
];

let modifiedFiles = [];

for (const filePath of filesToProcess) {
    if (!fs.existsSync(filePath)) continue;
    const sourceFile = project.getSourceFile(filePath);
    if (!sourceFile) continue;

    let modified = false;
    const fileName = filePath.split('/').pop();

    const useEffectCalls = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)
        .filter(c => c.getExpression().getText() === 'useEffect');
    
    useEffectCalls.reverse();

    for (const effectCall of useEffectCalls) {
        if (effectCall.wasForgotten()) continue;
        const args = effectCall.getArguments();
        if (args.length === 0) continue;
        const effectFunc = args[0];
        
        if (effectFunc.getKind() === SyntaxKind.ArrowFunction || effectFunc.getKind() === SyntaxKind.FunctionExpression) {
            const body = effectFunc.getBody();
            if (body && body.getKind() === SyntaxKind.Block) {
                const text = body.getText();
                if (text.includes('supabase') && text.includes('channel') && text.includes('subscribe') && !text.includes('unsubscribe')) {
                    let channelVar = 'channel';
                    const match = text.match(/(?:const|let|var)\s+(\w+)\s*=\s*supabase\.channel/);
                    if (match) channelVar = match[1];
                    
                    body.addStatements(`return () => { ${channelVar}.unsubscribe(); };`);
                    modified = true;
                }
            }
        }
    }

    const asyncFunctions = [];
    sourceFile.getDescendants().forEach(node => {
        if (
            node.getKind() === SyntaxKind.FunctionDeclaration ||
            node.getKind() === SyntaxKind.FunctionExpression ||
            node.getKind() === SyntaxKind.ArrowFunction ||
            node.getKind() === SyntaxKind.MethodDeclaration
        ) {
            const isAsync = node.hasModifier(SyntaxKind.AsyncKeyword);
            if (isAsync) {
                asyncFunctions.push(node);
            }
        }
    });

    asyncFunctions.reverse();

    for (const func of asyncFunctions) {
        if (func.wasForgotten()) continue;
        if (func.getDescendantsOfKind(SyntaxKind.TryStatement).length > 0) continue;

        const body = func.getBody();
        if (!body) continue;

        let funcName = 'anonymous_function';
        if (func.getKind() === SyntaxKind.ArrowFunction || func.getKind() === SyntaxKind.FunctionExpression) {
            const parent = func.getParent();
            if (parent && parent.getKind() === SyntaxKind.VariableDeclaration) {
                funcName = parent.getName() || 'anonymous_function';
            } else if (parent && parent.getKind() === SyntaxKind.PropertyAssignment) {
                funcName = parent.getName() || 'anonymous_function';
            }
        } else {
            funcName = func.getName() || 'anonymous_function';
        }

        if (body.getKind() === SyntaxKind.Block) {
            const innerText = body.getText().substring(1, body.getText().length - 1);
            
            const tryCatchText = `try {
${innerText}
} catch (error) {
  console.error('[${fileName}] [${funcName}]:', error);
}`;
            func.setBodyText(tryCatchText);
            modified = true;
        } else {
            const exprText = body.getText();
            const tryCatchText = `try { return ${exprText}; } catch (error) { console.error('[${fileName}] [${funcName}]:', error); throw error; }`;
            func.setBodyText(tryCatchText);
            modified = true;
        }
    }

    if (modified) {
        sourceFile.saveSync();
        modifiedFiles.push(filePath);
    }
}

console.log("Modified files:\n" + modifiedFiles.map(f => ` - ${f}`).join('\n'));
