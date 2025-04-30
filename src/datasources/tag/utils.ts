/*
  * This file contains utility functions for the tag data source that expands variables.
  */

export function convertTagValue(type: string, value?: string) {
  return value && isNumericType(type) ? Number(value) : value;
}

export function expandMultipleValueVariable(input: string): string[] {
  ensureNoNestedBrackets(input);

  const results = generateValues(input);

  return results;
}

const numericTagTypes = ['DOUBLE', 'INT', 'U_INT64'];

function isNumericType(type: string): boolean {
    return numericTagTypes.includes(type);
}

function generateValues(input: string): string[] {
  const regex = /\{([^{}]*)\}/g;
  let match = regex.exec(input);

  if (!match) {
    return [input];
  }

  const results: string[] = [];
  const [fullMatch, values] = match;

  const parts = values.split(',');
  const prefix = input.slice(0, match.index);
  const suffix = input.slice(match.index! + fullMatch.length);

  if (values === '') {
    return [prefix + suffix];
  }

  parts.forEach(value => {
    const expandedParts = generateValues(prefix + value + suffix);
    results.push(...expandedParts);
  });

  return results;
}

function ensureNoNestedBrackets(input: string): void {
  let depth = 0;

  for (const char of input) {
    if (char === '{') {
      depth++;
      if (depth > 1) {
        throw new Error("Nested curly brackets are not supported");
      }
    } else if (char === '}') {
      if (depth === 0) {
        throw new Error("Unmatched closing curly bracket");
      }
      depth--;
    }
  }

  if (depth > 0) {
    throw new Error("Unmatched opening curly bracket");
  }
}
