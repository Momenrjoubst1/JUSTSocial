const { Project, SyntaxKind } = require('ts-morph');
const path = require('path');

const project = new Project({
    tsConfigFilePath: 'tsconfig.json',
});

const filesToProcess = [
    'server/routes/livekit.routes.ts',
    'server/routes/agent.routes.ts',
    'server/routes/moderation.routes.ts',
    'server/routes/chat.routes.ts',
    'server/services/supabase.service.ts',
    'server/services/ban.service.ts',
    'server/services/room.service.ts',
    'server/config/turn-credentials.ts'
];

let modifiedFiles = [];

for (const filePath of filesToProcess) {
    const sourceFile = project.getSourceFile(filePath);
    if (!sourceFile) {
        console.log(`Skipping ${filePath} - not found in TS project`);
        continue;
    }

    let modified = false;
    const fileName = path.basename(filePath);

    // Get all async functions
    const asyncFunctions = [];

    // Find all potential function kinds
    sourceFile.getDescendants().forEach(node => {
        if (
            node.getKind() === SyntaxKind.FunctionDeclaration ||
            node.getKind() === SyntaxKind.FunctionExpression ||
            node.getKind() === SyntaxKind.ArrowFunction ||
            node.getKind() === SyntaxKind.MethodDeclaration
        ) {
            // Check if it has the async keyword
            const isAsync = node.hasModifier(SyntaxKind.AsyncKeyword);
            if (isAsync) {
                asyncFunctions.push(node);
            }
        }
    });

    for (const func of asyncFunctions) {
        // Check if there are ANY TryStatements inside this function
        const tryStatements = func.getDescendantsOfKind(SyntaxKind.TryStatement);
        if (tryStatements.length > 0) {
            continue; // Skip if it already has try/catch
        }

        const body = func.getBody();
        if (!body) continue; // No body (e.g. abstract method, overriding declaration)

        let funcName = 'anonymous_function';
        if (func.getKind() === SyntaxKind.ArrowFunction || func.getKind() === SyntaxKind.FunctionExpression) {
            const parent = func.getParent();
            if (parent && parent.getKind() === SyntaxKind.VariableDeclaration) {
                funcName = parent.getName();
            } else if (parent && parent.getKind() === SyntaxKind.PropertyAssignment) {
                funcName = parent.getName();
            }
        } else {
            funcName = func.getName() || 'anonymous_function';
        }

        if (body.getKind() === SyntaxKind.Block) {
            const fullText = body.getText();
            // remove surrounding braces { }
            const innerText = fullText.substring(1, fullText.length - 1);
            
            const tryCatchText = `try {
${innerText}
} catch (error) {
  console.error('[${fileName}] [${funcName}]:', error);
}`;
            func.setBodyText(tryCatchText);
            modified = true;
        } else {
            // Expression body
            const expressionText = body.getText();
            const tryCatchText = `try { return ${expressionText}; } catch (error) { console.error('[${fileName}] [${funcName}]:', error); throw error; }`;
            // Wrap in braces because it's no longer just an expression
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
