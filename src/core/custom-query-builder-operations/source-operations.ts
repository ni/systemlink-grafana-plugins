import { FilterExpressions, FilterOperations } from "core/query-builder.constants";

export function sourceExpressionBuilderCallback(_: string, operation: string, value: string): string {
    const operationExpressionMap: { [key: string]: string } = {
        [FilterOperations.SourceEquals]: FilterExpressions.SourceEquals,
    };

    const expressionTemplate = operationExpressionMap[operation];
    if (!expressionTemplate) {
        return '';
    }
    return expressionTemplate.replace(/\{0\}/g, value);
}

export function sourceExpressionReaderCallback(expression: string, bindings: string[]): { fieldName: string, value: string} {
    console.log('expression', expression);
    const match = expression.match(/properties\.(?:system|minionId)\s*=\s*"([^"]+)"/);
    const extractedValue = match ? match[1] : '';
    return { fieldName: 'source', value: extractedValue }
}

// export function sourceEditorTemplate(field: string, value: string) {
//     const template = `
//       <div id="sl-query-builder-source-editor">
//         <smart-input class="source-input" 
//           placeholder="Enter source value"
//           value="${value || ''}">
//         </smart-input>
//       </div>`;
    
//     const templateBody = new DOMParser().parseFromString(template, 'text/html').body;
//     return templateBody.querySelector('#sl-query-builder-source-editor')!;
// };
// export function sourceValueTemplate(editor: HTMLElement | null | undefined, value: string): string {
//     if (value) {return value;}
//     if (editor) {
//       const input = editor.querySelector<HTMLInputElement>('.source-input');
//       return input?.value || '';
//     }
//     return '';
// };

// export function sourceHandleValue(editor: HTMLElement | null | undefined): { label: string; value: string; } {
//     const input = editor?.querySelector<HTMLInputElement>('.source-input');
//     const value = input?.value || '';
//     return { label: value, value: value };
// };
