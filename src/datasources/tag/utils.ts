export const expandMultipleValueVariableAfterReplace = (input: string): string[] => {
  const generateCombinations = (text: string, start = 0): string[] => {
    const open = text.indexOf('{{', start);
    if (open === -1) {
      return [text];
    }
    const close = text.indexOf('}}', open);
    if (close === -1) {
      throw new Error('Unmatched braces');
    }

    const nestedOpen = text.indexOf('{{', open + 1);
    if (nestedOpen !== -1 && nestedOpen < close) {
      throw new Error('Nested braces are not allowed');
    }

    const options = text.substring(open + 2, close).split(',').filter((option) => option !== '');
    const prefix = text.substring(0, open);
    const suffix = text.substring(close + 2);

    let combinations: string[] = [];
    for (const option of options) {
      const newCombinations = generateCombinations(prefix + option + suffix);
      combinations = combinations.concat(newCombinations);
    }

    return combinations;
  };

  return generateCombinations(input);
};
