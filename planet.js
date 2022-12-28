var acorn = require("acorn");
var fs = require("fs");
var filePath;
var ast;
var globalVariable = 0;
var localVariable = 0;
var blockCount = 0;
var constVariable = 0;
var sumOfBlockWeights = 0;
var lineOfCode = 0;
var inlineComments = 0;
var parentWeight = 1;
var commentDensity = 0;
var weightFactor = {
    WhileStatement: 3,
    IfStatement: 2,
    ForStatement: 3,
    ArrowFunctionExpression: 2,
    CallExpression: 2,
};

const declarationType = {
    let: "let",
    var: "var",
    const: "const",
};

const nodeType = {
    program: "Program",
    variableDeclaration: "VariableDeclaration",
    variableDeclarator: "VariableDeclarator",
    for: "ForStatement",
    while: "WhileStatement",
    if: "IfStatement",
    arrowFunction: "ArrowFunctionExpression",
    block: "BlockStatement",
    function: "FunctionDeclaration",
    literal: "Literal",
    expression: "ExpressionStatement",
    binaryExpression: "BinaryExpression",
    updateExpression: "UpdateExpression",
    functionCall: "CallExpression",
    assignmentExpression: "AssignmentExpression",
    identifier: "Identifier",
    object: "ObjectExpression",
    property: "Property"
};

const increaseParentWeight = (weight) => {
    parentWeight *= weight;
};

const decreaseParentWeight = (weight) => {
    parentWeight /= weight;
};

function calculateWeight(node) {
    if (blockCount == 1) {
        sumOfBlockWeights += weightFactor[node.type];
        parentWeight = weightFactor[node.type];
    } else {
        sumOfBlockWeights += weightFactor[node.type] * parentWeight;
        increaseParentWeight(weightFactor[node.type]);
    }
}

const visitProgram = (node) => {
    traverseAST(node.body);
};

const visitVariableDeclaration = (node) => {
    lineOfCode++;
    if (node.kind === declarationType.const) {
        constVariable++;
        traverseAST(node.declarations);
        return;
    }
    if (blockCount > 0) {
        localVariable += node.declarations.length;
    } else {
        globalVariable += node.declarations.length;
    }
    traverseAST(node.declarations);
};

const visitVariableDeclarator = (node) => {
    visitNode(node.init);
};

const visitWhileStatement = (node) => {
    blockCount++;
    calculateWeight(node);
    visitNode(node.body);
    visitWhileStatement;
    decreaseParentWeight(weightFactor[node.type]);
    blockCount--;
};
const visitIfStatement = (node) => {
    blockCount++;
    calculateWeight(node);
    visitNode(node.consequent);
    decreaseParentWeight(weightFactor[node.type]);
    visitNode(node.alternate);
    blockCount--;
};

const visitForStatement = (node) => {
    blockCount++;
    calculateWeight(node);
    traverseAST([node.init, node.body]);
    decreaseParentWeight(weightFactor[node.type]);
    blockCount--;
};

const visitArrowFunction = (node) => {
    blockCount++;
    visitNode(node.body);
    blockCount--;
};

const visitBlockStatement = (node) => {
    traverseAST(node.body);
};

const visitExpressionStatement = (node) => {
    visitNode(node.expression);
};

const visitFunctionBlock = (node) => {
    blockCount++;
    visitNode(node.body);
    blockCount--;
};

const visitObjectExpression = (node) => {
    console.log(node);
};

const visitNode = (node) => {
    if (node) {
        switch (node.type) {
            case nodeType.program:
                visitProgram(node);
                break;
            case nodeType.variableDeclaration:
                visitVariableDeclaration(node);
                break;
            case nodeType.variableDeclarator:
                visitVariableDeclarator(node);
                break;
            case nodeType.while:
                visitWhileStatement(node);
                break;
            case nodeType.if:
                visitIfStatement(node);
                break;
            case nodeType.for:
                visitForStatement(node);
                break;
            case nodeType.arrowFunction:
                visitArrowFunction(node);
                break;
            case nodeType.block:
                visitBlockStatement(node);
                break;
            case nodeType.expression:
                visitExpressionStatement(node);
                break;
            case nodeType.function:
                visitFunctionBlock(node);
                break;
            case nodeType.assignmentExpression:
                lineOfCode++;
                break;
            case nodeType.updateExpression:
                lineOfCode++;
                break;
            case nodeType.functionCall:
                lineOfCode++;
                sumOfBlockWeights += 2;
                break;
            case nodeType.object:
                visitObjectExpression(node);
                break;
        }
    }
};

const traverseAST = (ast) => {
    for (const node of ast) {
        visitNode(node);
    }
};

function calculateCommentDensity(commnets, loc) {
    return +(commnets / loc).toFixed(2);
}

function calculateMaintainabilityIndex(
    numOfGlobalvariable,
    numOfLocalvariable,
    numOfConstantvariable,
    sumOfCognitiveWeights,
    commentDensity
) {
    var variableWeight = {
        globalVariable: 3,
        localVariable: 2,
        constantVariable: 1,
    };
    return +(
        numOfGlobalvariable * variableWeight.globalVariable +
        numOfLocalvariable * variableWeight.localVariable +
        numOfConstantvariable * variableWeight.constantVariable +
        sumOfCognitiveWeights +
        commentDensity
    ).toFixed(2);
}

const init = () => {
    const readLine = require("readline").createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    readLine.question("Give File Path:\n", (path) => {
        filePath = fs.readFileSync(path).toString();
        readLine.close();
    });

    readLine.on("close", () => {
        ast = acorn.parse(filePath, {
            ecmaVersion: 2023,
            onComment: (isBlock, text) => {
                if (!isBlock) {
                    inlineComments++;
                }
            },
        });

        traverseAST(ast.body);
        sumOfBlockWeights += lineOfCode;
        commentDensity = calculateCommentDensity(inlineComments, lineOfCode);
        let maintainabilityIndex = calculateMaintainabilityIndex(
            globalVariable,
            localVariable,
            constVariable,
            sumOfBlockWeights,
            commentDensity
        );
        console.log("gv : " + globalVariable);
        console.log("lv : " + localVariable);
        console.log("cv : " + constVariable);
        console.log("cbs : " + sumOfBlockWeights);
        console.log("loc :" + lineOfCode);
        console.log("inline comments :" + inlineComments);
        console.log("cd :" + commentDensity);
        console.log("MI :" + maintainabilityIndex);
    });
};

init();
