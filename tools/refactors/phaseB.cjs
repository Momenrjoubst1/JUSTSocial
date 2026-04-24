const { Project, SyntaxKind } = require('ts-morph');
const fs = require('fs');

const project = new Project();
project.addSourceFilesAtPaths(['src/**/*.ts', 'src/**/*.tsx']);

const filesToProcess = [
    'src/lib/supabaseClient.ts',
    'src/features/auth/hooks/useAuthRefresh.ts',
    'src/features/chat/services/crypto.ts'
];

let modifiedFiles = [];

for (const filePath of filesToProcess) {
    if (!fs.existsSync(filePath)) continue;
    const sourceFile = project.getSourceFile(filePath);
    if (!sourceFile) continue;

    let modified = false;
    const fileName = filePath.split('/').pop();
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

    for (const func of asyncFunctions) {
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
            const fullText = body.getText();
            const innerText = fullText.substring(1, fullText.length - 1);
            
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

// Special fetch response check for useAuthRefresh.ts
const useAuthRefreshPath = 'src/features/auth/hooks/useAuthRefresh.ts';
if (fs.existsSync(useAuthRefreshPath)) {
    let content = fs.readFileSync(useAuthRefreshPath, 'utf8');
    const returnResponseRegex = /return response;\s*\}(,\s*\[\]\);)/;
    if (content.match(returnResponseRegex) && !content.includes('!response.ok')) {
        const checkStr = `if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(
        errorBody.message ?? 
        \`Request failed with status \${response.status}\`
      );
    }
    return response;`;
        content = content.replace(/return response;/, checkStr);
        fs.writeFileSync(useAuthRefreshPath, content);
        if (!modifiedFiles.includes(useAuthRefreshPath)) {
            modifiedFiles.push(useAuthRefreshPath);
        }
    }
}

console.log("Modified files:\n" + modifiedFiles.map(f => ` - ${f}`).join('\n'));
