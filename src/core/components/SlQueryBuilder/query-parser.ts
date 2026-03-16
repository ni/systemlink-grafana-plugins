import { BinaryOperand, binaryOperandToString, BinaryOperator, DateOperand, DateOperator, DateTimeOperator, FirstLevelQueryObjects, isEmptyFilter, isOperatorInEnum, KeyValueOperand, keyValueOperandToString, KeyValueOperator, LogicalOperator, QueryExpression, QueryFilterObjects, UnaryOperator } from "./models/SlQueryFilterObjects";

const linqAndOperator = '&&';
const linqOrOperator = '||';

/**
 * Returns a LINQ expression parsed from queryObjects.
 * EX: [[['ID', '===', '123'], 'and', ['ID', '===', '124']], 'and', [['ID', '===', '123'], 'or', ['ID', '===', '124']]] -> (ID = "123" && ID = "124") && (ID = "123" || ID = "124")
 * If the queryObject is incorrectly formatted, an empty string is returned.
 * @param queryFilterObjects The queryObjects that should be parsed.
 */
export function parseQueryObjectsToLinq(queryFilterObjects: QueryFilterObjects): string {
    if (isEmptyFilter(queryFilterObjects)) {
        return '';
    }

    let parsedLinqExpression = '';
    let logicalOperatorPosition = 1;
    while (logicalOperatorPosition < queryFilterObjects.length - 1) {
        // Go through all the 1st level elements and parse them.
        const currentFirstLevelQueryObjects: FirstLevelQueryObjects = queryFilterObjects[logicalOperatorPosition - 1] as FirstLevelQueryObjects;
        parsedLinqExpression += parseQueryObject1stLevelToLinq(currentFirstLevelQueryObjects);

        const nextLogicalOperator: LogicalOperator | string = queryFilterObjects[logicalOperatorPosition] as LogicalOperator;
        // If a logical operator is found then parse it and add it to the expression.
        if (nextLogicalOperator === LogicalOperator.And) {
            parsedLinqExpression += ` ${linqAndOperator} `;
        } else if (nextLogicalOperator === LogicalOperator.Or) {
            parsedLinqExpression += ` ${linqOrOperator} `;
        } else {
            // If an invalid element is found on the position of a logical operator return an empty string to indicate bad queryObject format.
            return '';
        }
        logicalOperatorPosition += 2;
    }
    // Parse the last object. If the query object has only 1 element on the 1st level then this is handled here.
    parsedLinqExpression += parseQueryObject1stLevelToLinq(queryFilterObjects[logicalOperatorPosition - 1] as FirstLevelQueryObjects);
    return parsedLinqExpression;
}

/**
 * Returns a URL string parsed from queryObjects.
 * Elements from the 1st level are enclosed in '`' to help mentain the order of operations.
 * @param queryFilterObjects The queryObject to be parsed.
 */
export function parseQueryObjectsToURLString(queryFilterObjects: any[]): string {
    let newURL = '';
    const encodedBacktick = encodeURIComponent('`');
    const encodedComma = encodeURIComponent(',');
    // Goes through all elements of the queryObject array and encodes them. '`' is added before and after an element from the 1st level to preserve the order of operations.
    for (const queryObject of queryFilterObjects) {
        newURL += encodedBacktick;
        if (Array.isArray(queryObject)) {
            const lastLength = newURL.length;
            for (const queryElement of queryObject) {
                if (lastLength !== newURL.length) {
                    newURL += encodedComma;
                }
                if (queryElement.length === 3 && queryElement[2].key) {
                    const queryExpression = queryElement as QueryExpression;
                    const queryOperand = queryExpression[2] as KeyValueOperand;
                    newURL += encodeURIComponent(`${queryExpression[0]},${queryExpression[1]},${queryOperand.key},${queryOperand.value}`);
                } else {
                    newURL += encodeURIComponent(queryElement);
                }
            }
        } else {
            // Don't parse logical operators letter by letter.
            newURL += encodeURIComponent(queryObject);
        }
        newURL += encodedBacktick;
    }
    return newURL;
}

/**
 * Returns a queryObject parsed from a url string.
 * @param urlString The url string to be parsed.
 */
export function parseURLStringToQueryObjects(urlString: string): any[] {
    const decodedUrlString = urlString.includes('`') || urlString.includes(',')
        ? urlString : decodeURIComponent(urlString);

    // Splits and cleans up the url for queryObject reconstruction.
    const queryObjects = decodedUrlString.split('`').filter(x => x);
    const filter = [];
    for (const obj of queryObjects) {
        const splittedFilterObject = obj.split(',');
        if (splittedFilterObject.length === 1) {
            // This means the element is either 'and' or 'or' so don't push it as an array in the filter.
            filter.push(...splittedFilterObject);
        } else {
            const parsedFilter = [];
            let currentPosition = 0;
            while (currentPosition < splittedFilterObject.length) {
                const operator = splittedFilterObject[currentPosition];
                if (isOperatorInEnum(operator, UnaryOperator)) {
                    // Parser found unary operation.
                    parsedFilter.push([splittedFilterObject[currentPosition - 1], splittedFilterObject[currentPosition]]);
                    if (splittedFilterObject[currentPosition + 1]) {
                        parsedFilter.push(splittedFilterObject[currentPosition + 1]);
                    }
                    currentPosition += 2;
                } else if (isOperatorInEnum(operator, BinaryOperator) || isOperatorInEnum(operator, DateOperator)) {
                    // Parser found binary operation.
                    parsedFilter.push([splittedFilterObject[currentPosition - 1], splittedFilterObject[currentPosition], splittedFilterObject[currentPosition + 1]]);
                    if (splittedFilterObject[currentPosition + 2]) {
                        parsedFilter.push(splittedFilterObject[currentPosition + 2]);
                    }
                    currentPosition += 3;
                } else if (isOperatorInEnum(operator, KeyValueOperator)) {
                    // Parser found key value operation.
                    parsedFilter.push([splittedFilterObject[currentPosition - 1], splittedFilterObject[currentPosition], { key: splittedFilterObject[currentPosition + 1], value: splittedFilterObject[currentPosition + 2] }]);
                    if (splittedFilterObject[currentPosition + 3]) {
                        parsedFilter.push(splittedFilterObject[currentPosition + 3]);
                    }
                    currentPosition += 4;
                } else {
                    currentPosition += 1;
                }
            }
            filter.push(parsedFilter);
        }
    }
    return filter;
}

/**
 * Returns a queryObject parsed from a LINQ string.
 * @param linqString The LINQ string to be parsed (e.g., 'ID = "123" && Name = "test"').
 */
export function parseLinqStringToQueryObjects(linqString: string): any[] {
    if (!linqString || linqString.trim() === '') {
        return [];
    }

    try {
        // Remove outer parentheses if they wrap the entire expression
        const trimmed = linqString.trim();
        const cleaned = trimmed.startsWith('(') && trimmed.endsWith(')') && hasMatchingParens(trimmed)
            ? trimmed.slice(1, -1) : trimmed;

        return parseLogicalExpression(cleaned);
    } catch (error) {
        console.error('Error parsing LINQ string:', error);
        return [];
    }
}

/**
 * Parses a logical expression with AND/OR operators
 */
function parseLogicalExpression(expression: string): any[] {
    // Handle AND operations first (higher precedence)
    const andParts = splitByLogicalOperator(expression, linqAndOperator);

    if (andParts.length > 1) {
        const result = [];
        for (let i = 0; i < andParts.length; i++) {
            const part = parseOrExpression(andParts[i]);
            if (part) {
                result.push(part);
                if (i < andParts.length - 1) {
                    result.push(LogicalOperator.And);
                }
            }
        }
        return result;
    }

    return parseOrExpression(expression);
}

/**
 * Parses OR expressions within parentheses groups
 */
function parseOrExpression(expression: string): any[] {
    const orParts = splitByLogicalOperator(expression, linqOrOperator);

    if (orParts.length > 1) {
        const expressions = [];
        for (let i = 0; i < orParts.length; i++) {
            const part = parseComplexExpression(orParts[i]);
            if (part) {
                expressions.push(part);
                if (i < orParts.length - 1) {
                    expressions.push(LogicalOperator.Or);
                }
            }
        }
        return [expressions];
    }

    const parsedExpression = parseComplexExpression(expression);
    return parsedExpression ? [[parsedExpression]] : [];
}

/**
 * Parses a complex expression that could be unary, binary, date, or key-value
 */
function parseComplexExpression(expression: string): QueryExpression | null {
    const trimmed = expression.trim().replace(/^\(|\)$/g, '');

    // Check for unary operators first
    const unaryResult = parseUnaryExpression(trimmed);
    if (unaryResult) {
        return unaryResult;
    }

    // Check for key-value operators
    const keyValueResult = parseKeyValueExpression(trimmed);
    if (keyValueResult) {
        return keyValueResult;
    }

    // Check for date operators
    const dateResult = parseDateExpression(trimmed);
    if (dateResult) {
        return dateResult;
    }

    // Check for binary operators
    return parseBinaryExpression(trimmed);
}

/**
 * Parses unary expressions like string.IsNullOrEmpty(field) or !field.Any()
 */
function parseUnaryExpression(expression: string): QueryExpression | null {
    // string.IsNullOrEmpty(field)
    let match = expression.match(/^string\.IsNullOrEmpty\(([^)]+)\)$/);
    if (match) {
        return [match[1], UnaryOperator.StringIsBlank];
    }

    // !string.IsNullOrEmpty(field)
    match = expression.match(/^!string\.IsNullOrEmpty\(([^)]+)\)$/);
    if (match) {
        return [match[1], UnaryOperator.StringIsNotBlank];
    }

    // !field.Any()
    match = expression.match(/^!([^.]+)\.Any\(\)$/);
    if (match) {
        return [match[1], UnaryOperator.ListIsEmpty];
    }

    // field.Any()
    match = expression.match(/^([^.]+)\.Any\(\)$/);
    if (match) {
        return [match[1], UnaryOperator.ListIsNotEmpty];
    }

    return null;
}

/**
 * Parses key-value expressions like field["key"] = "value"
 */
function parseKeyValueExpression(expression: string): QueryExpression | null {
    // field["key"] = "value"
    let match = expression.match(/^([^[]+)\["([^"]+)"\]\s*=\s*"([^"]+)"$/);
    if (match) {
        return [match[1], KeyValueOperator.KeyValueMatches, { key: match[2], value: match[3] }];
    }

    // field["key"] != "value"
    match = expression.match(/^([^[]+)\["([^"]+)"\]\s*!=\s*"([^"]+)"$/);
    if (match) {
        return [match[1], KeyValueOperator.KeyValueDoesNotMatch, { key: match[2], value: match[3] }];
    }

    // field["key"].Contains("value")
    match = expression.match(/^([^[]+)\["([^"]+)"\]\.Contains\("([^"]+)"\)$/);
    if (match) {
        return [match[1], KeyValueOperator.KeyValueContains, { key: match[2], value: match[3] }];
    }

    // !field["key"].Contains("value")
    match = expression.match(/^!([^[]+)\["([^"]+)"\]\.Contains\("([^"]+)"\)$/);
    if (match) {
        return [match[1], KeyValueOperator.KeyValueDoesNotContain, { key: match[2], value: match[3] }];
    }

    // SafeConvert.ToDecimal(field["key"]) > value
    match = expression.match(/^SafeConvert\.ToDecimal\(([^[]+)\["([^"]+)"\]\)\s*>\s*([^)]+)$/);
    if (match) {
        return [match[1], KeyValueOperator.KeyValueIsGreaterThan, { key: match[2], value: match[3] }];
    }

    // SafeConvert.ToDecimal(field["key"]) >= value
    match = expression.match(/^SafeConvert\.ToDecimal\(([^[]+)\["([^"]+)"\]\)\s*>=\s*([^)]+)$/);
    if (match) {
        return [match[1], KeyValueOperator.KeyValueIsGreaterThanOrEqual, { key: match[2], value: match[3] }];
    }

    // SafeConvert.ToDecimal(field["key"]) < value
    match = expression.match(/^SafeConvert\.ToDecimal\(([^[]+)\["([^"]+)"\]\)\s*<\s*([^)]+)$/);
    if (match) {
        return [match[1], KeyValueOperator.KeyValueIsLessThan, { key: match[2], value: match[3] }];
    }

    // SafeConvert.ToDecimal(field["key"]) <= value
    match = expression.match(/^SafeConvert\.ToDecimal\(([^[]+)\["([^"]+)"\]\)\s*<=\s*([^)]+)$/);
    if (match) {
        return [match[1], KeyValueOperator.KeyValueIsLessThanOrEqual, { key: match[2], value: match[3] }];
    }

    // SafeConvert.ToDecimal(field["key"]) = value
    match = expression.match(/^SafeConvert\.ToDecimal\(([^[]+)\["([^"]+)"\]\)\s*=\s*([^)]+)$/);
    if (match) {
        return [match[1], KeyValueOperator.KeyValueIsNumericallyEqual, { key: match[2], value: match[3] }];
    }

    // SafeConvert.ToDecimal(field["key"]) != value
    match = expression.match(/^SafeConvert\.ToDecimal\(([^[]+)\["([^"]+)"\]\)\s*!=\s*([^)]+)$/);
    if (match) {
        return [match[1], KeyValueOperator.KeyValueIsNumericallyNotEqual, { key: match[2], value: match[3] }];
    }

    return null;
}

/**
 * Parses date expressions like DateTime(field) > DateTime.parse("date")
 */
function parseDateExpression(expression: string): QueryExpression | null {
    // DateTime(field) > DateTime.parse("date")
    let match = expression.match(/^DateTime\(([^)]+)\)\s*>\s*DateTime\.parse\("([^"]+)"\)$/);
    if (match) {
        return [match[1], DateOperator.DateIsGreaterThan, match[2]];
    }

    // DateTime(field) >= DateTime.parse("date")
    match = expression.match(/^DateTime\(([^)]+)\)\s*>=\s*DateTime\.parse\("([^"]+)"\)$/);
    if (match) {
        return [match[1], DateOperator.DateIsGreaterThanOrEqual, match[2]];
    }

    // DateTime(field) < DateTime.parse("date")
    match = expression.match(/^DateTime\(([^)]+)\)\s*<\s*DateTime\.parse\("([^"]+)"\)$/);
    if (match) {
        return [match[1], DateOperator.DateIsSmallerThan, match[2]];
    }

    // DateTime(field) <= DateTime.parse("date")
    match = expression.match(/^DateTime\(([^)]+)\)\s*<=\s*DateTime\.parse\("([^"]+)"\)$/);
    if (match) {
        return [match[1], DateOperator.DateIsSmallerThanOrEqual, match[2]];
    }

    // (field = null || field = "")
    match = expression.match(/^\(([^=]+)\s*=\s*null\s*\|\|\s*\1\s*=\s*""\)$/);
    if (match) {
        return [match[1], DateTimeOperator.DateTimeIsEmpty];
    }

    // !(field = null || field = "")
    match = expression.match(/^!\(([^=]+)\s*=\s*null\s*\|\|\s*\1\s*=\s*""\)$/);
    if (match) {
        return [match[1], DateTimeOperator.DateTimeIsNotEmpty];
    }

    return null;
}

/**
 * Parses binary expressions like field = "value" or field.Contains("value")
 */
function parseBinaryExpression(expression: string): QueryExpression | null {
    // field.Equals(value) - boolean equals
    let match = expression.match(/^([^.]+)\.Equals\(([^)]+)\)$/);
    if (match) {
        const value = match[2] === 'true' || match[2] === 'false' ? match[2] === 'true' : match[2];
        return [match[1], BinaryOperator.BooleanEquals, value];
    }

    // !field.Equals(value) - boolean not equals
    match = expression.match(/^!([^.]+)\.Equals\(([^)]+)\)$/);
    if (match) {
        const value = match[2] === 'true' || match[2] === 'false' ? match[2] === 'true' : match[2];
        return [match[1], BinaryOperator.BooleanDoesNotEqual, value];
    }

    // field.Contains("value")
    match = expression.match(/^([^.]+)\.Contains\("([^"]+)"\)$/);
    if (match) {
        return [match[1], BinaryOperator.StringIncludes, match[2]];
    }

    // !field.Contains("value")
    match = expression.match(/^!([^.]+)\.Contains\("([^"]+)"\)$/);
    if (match) {
        return [match[1], BinaryOperator.StringDoesNotInclude, match[2]];
    }

    // field.StartsWith("value")
    match = expression.match(/^([^.]+)\.StartsWith\("([^"]+)"\)$/);
    if (match) {
        return [match[1], BinaryOperator.StartsWith, match[2]];
    }

    // field.Any(element => element.Contains("value"))
    match = expression.match(/^([^.]+)\.Any\(element\s*=>\s*element\.Contains\("([^"]+)"\)\)$/);
    if (match) {
        return [match[1], BinaryOperator.ListElementContains, match[2]];
    }

    // !field.Any(element => element.Contains("value"))
    match = expression.match(/^!([^.]+)\.Any\(element\s*=>\s*element\.Contains\("([^"]+)"\)\)$/);
    if (match) {
        return [match[1], BinaryOperator.NoListElementContains, match[2]];
    }

    // field.ContainsKey("value")
    match = expression.match(/^([^.]+)\.ContainsKey\("([^"]+)"\)$/);
    if (match) {
        return [match[1], BinaryOperator.ContainsKey, match[2]];
    }

    // !field.ContainsKey("value")
    match = expression.match(/^!([^.]+)\.ContainsKey\("([^"]+)"\)$/);
    if (match) {
        return [match[1], BinaryOperator.NotContainsKey, match[2]];
    }

    // Basic comparisons - handle numbers and strings
    const comparisons = [
        { pattern: /^([^=<>!]+)\s*=\s*"([^"]+)"$/, operator: BinaryOperator.Equals },
        { pattern: /^([^=<>!]+)\s*=\s*([0-9.-]+)$/, operator: BinaryOperator.Equals },
        { pattern: /^([^=<>!]+)\s*!=\s*"([^"]+)"$/, operator: BinaryOperator.NotEquals },
        { pattern: /^([^=<>!]+)\s*!=\s*([0-9.-]+)$/, operator: BinaryOperator.NotEquals },
        { pattern: /^([^=<>!]+)\s*>\s*([0-9.-]+)$/, operator: BinaryOperator.IsGreaterThan },
        { pattern: /^([^=<>!]+)\s*>=\s*([0-9.-]+)$/, operator: BinaryOperator.IsGreaterThanOrEqual },
        { pattern: /^([^=<>!]+)\s*<\s*([0-9.-]+)$/, operator: BinaryOperator.IsSmallerThan },
        { pattern: /^([^=<>!]+)\s*<=\s*([0-9.-]+)$/, operator: BinaryOperator.IsSmallerThanOrEqual }
    ];

    for (const { pattern, operator } of comparisons) {
        const match = expression.match(pattern);
        if (match) {
            const field = match[1].trim(); // Trim whitespace from field name
            const value = isNaN(Number(match[2])) ? match[2] : Number(match[2]);
            return [field, operator, value];
        }
    }

    return null;
}

/**
 * Splits expression by logical operator while respecting parentheses
 */
function splitByLogicalOperator(expression: string, operator: string): string[] {
    const parts = [];
    let current = '';
    let parenCount = 0;
    let i = 0;

    while (i < expression.length) {
        if (expression[i] === '(') {
            parenCount++;
        } else if (expression[i] === ')') {
            parenCount--;
        } else if (parenCount === 0 && expression.slice(i, i + operator.length) === operator) {
            parts.push(current.trim());
            current = '';
            i += operator.length;
            continue;
        }

        current += expression[i];
        i++;
    }

    if (current.trim()) {
        parts.push(current.trim());
    }

    return parts.length > 1 ? parts : [expression];
}

/**
 * Checks if parentheses are properly matched
 */
function hasMatchingParens(str: string): boolean {
    let count = 0;
    for (const char of str) {
        if (char === '(') {
            count++;
        }
        if (char === ')') {
            count--;
        }
        if (count < 0) {
            return false;
        }
    }
    return count === 0;
}

/**
 * Returns a LINQ expression parsed from an element in the 1st level of a queryObject.
 * EX: [['ID', '===', '123'], 'and', ['ID', '===', '124']] -> (ID = "123" && ID = "124")
 * If the queryObject is incorrectly formated, an empty string is returned.
 * @param queryObject The queryObject to be parsed.
 */
function parseQueryObject1stLevelToLinq(queryObject: FirstLevelQueryObjects): string {
    const needsParantesis = queryObject.length !== 1;
    let linqExpression = '';
    let logicalOperatorPosition = 1;
    while (logicalOperatorPosition < queryObject.length - 1) {
        // Go through all the 2nd level elements and parse them.
        const currentQueryExpression: QueryExpression = queryObject[logicalOperatorPosition - 1] as QueryExpression;
        linqExpression += parseQueryObject2ndLevelToLinq(currentQueryExpression);

        const nextLogicalOperator: LogicalOperator | string = queryObject[logicalOperatorPosition] as LogicalOperator;
        // If a logical operator is found then parse it and add it to the expression.
        if (nextLogicalOperator === LogicalOperator.And) {
            linqExpression += ` ${linqAndOperator} `;
        } else if (nextLogicalOperator === LogicalOperator.Or) {
            linqExpression += ` ${linqOrOperator} `;
        } else {
            // If an invalid element is found on the position of a logical operator return an empty string to indicate bad queryObject format.
            return '';
        }
        logicalOperatorPosition += 2;
    }
    // Parse the last object. If the query object has only 1 element on the 1st level then this is handled here.
    linqExpression += parseQueryObject2ndLevelToLinq(queryObject[logicalOperatorPosition - 1] as QueryExpression);

    // Add parantesis to the expression if necessary.
    if (needsParantesis) {
        return `(${linqExpression})`;
    }
    return linqExpression;
}

/**
 * Returns a LINQ expression parsed from an element in the 2nd level of a queryObject.
 * EX: ['ID', '===', '123'] -> ID = "123"
 * If the queryObject is incorrectly formated, an empty string is returned.
 * @param queryObject The queryObject to be parsed.
 */
function parseQueryObject2ndLevelToLinq(queryObject: QueryExpression): string {
    // const actualQueryProperty = getActualQueryProperty(queryObject[0]) || queryObject[0];
    const [actualQueryProperty, operator, value] = queryObject;

    // Normalize common operators to enum values
    let normalizedOperator = operator;
    switch (operator) {
        case '=':
            normalizedOperator = BinaryOperator.Equals;
            break;
        case '!=':
        case '<>':
            normalizedOperator = BinaryOperator.NotEquals;
            break;
        case '>':
            normalizedOperator = BinaryOperator.IsGreaterThan;
            break;
        case '>=':
            normalizedOperator = BinaryOperator.IsGreaterThanOrEqual;
            break;
        case '<':
            normalizedOperator = BinaryOperator.IsSmallerThan;
            break;
        case '<=':
            normalizedOperator = BinaryOperator.IsSmallerThanOrEqual;
            break;
    }

    if (isOperatorInEnum(normalizedOperator, UnaryOperator)) {
        // Parse unary expressions (EX: [a, strisblank] -> string.IsNullOrEmpty(a))
        switch (normalizedOperator) {
            case UnaryOperator.StringIsBlank:
                return `string.IsNullOrEmpty(${actualQueryProperty})`;
            case UnaryOperator.StringIsNotBlank:
                return `!string.IsNullOrEmpty(${actualQueryProperty})`;
            case UnaryOperator.ListIsEmpty:
                return `!${actualQueryProperty}.Any()`;
            case UnaryOperator.ListIsNotEmpty:
                return `${actualQueryProperty}.Any()`;
            default:
                return '';
        }
    } else if (isOperatorInEnum(normalizedOperator, KeyValueOperator)) {
        // Parse keyValue expressions (EX: [a, key_value_matches, {key: b, value: c}] -> a[b] = c)
        const keyValue = value as KeyValueOperand;
        const convertedValueString = keyValueOperandToString(keyValue);
        switch (normalizedOperator) {
            case KeyValueOperator.KeyValueMatches:
                return `${actualQueryProperty}["${keyValue.key}"] = "${convertedValueString}"`;
            case KeyValueOperator.KeyValueDoesNotMatch:
                return `${actualQueryProperty}["${keyValue.key}"] != "${convertedValueString}"`;
            case KeyValueOperator.KeyValueContains:
                return `${actualQueryProperty}["${keyValue.key}"].Contains("${convertedValueString}")`;
            case KeyValueOperator.KeyValueDoesNotContain:
                return `!${actualQueryProperty}["${keyValue.key}"].Contains("${convertedValueString}")`;
            case KeyValueOperator.KeyValueIsGreaterThan:
                return `SafeConvert.ToDecimal(${actualQueryProperty}["${keyValue.key}"]) > ${convertedValueString}`;
            case KeyValueOperator.KeyValueIsGreaterThanOrEqual:
                return `SafeConvert.ToDecimal(${actualQueryProperty}["${keyValue.key}"]) >= ${convertedValueString}`;
            case KeyValueOperator.KeyValueIsLessThan:
                return `SafeConvert.ToDecimal(${actualQueryProperty}["${keyValue.key}"]) < ${convertedValueString}`;
            case KeyValueOperator.KeyValueIsLessThanOrEqual:
                return `SafeConvert.ToDecimal(${actualQueryProperty}["${keyValue.key}"]) <= ${convertedValueString}`;
            case KeyValueOperator.KeyValueIsNumericallyEqual:
                return `SafeConvert.ToDecimal(${actualQueryProperty}["${keyValue.key}"]) = ${convertedValueString}`;
            case KeyValueOperator.KeyValueIsNumericallyNotEqual:
                return `SafeConvert.ToDecimal(${actualQueryProperty}["${keyValue.key}"]) != ${convertedValueString}`;
            default:
                return '';
        }
    } else if (isOperatorInEnum(normalizedOperator, DateOperator)) {
        // Parse binary expressions for Dates (EX: [dateField, date>=, timestamp] -> dateField >= timestamp)
        const convertedValue = value as DateOperand;
        switch (normalizedOperator) {
            case DateOperator.DateIsGreaterThan:
                return `DateTime(${actualQueryProperty}) > DateTime.parse("${convertedValue}")`;
            case DateOperator.DateIsGreaterThanOrEqual:
                return `DateTime(${actualQueryProperty}) >= DateTime.parse("${convertedValue}")`;
            case DateOperator.DateIsSmallerThan:
                return `DateTime(${actualQueryProperty}) < DateTime.parse("${convertedValue}")`;
            case DateOperator.DateIsSmallerThanOrEqual:
                return `DateTime(${actualQueryProperty}) <= DateTime.parse("${convertedValue}")`;
            default:
                return '';
        }
    } else if (isOperatorInEnum(normalizedOperator, DateTimeOperator)) {
        // Parse binary expressions for DateTimes (EX: [dateTimeField, datetime>, timestamp] -> dateTimeField > timestamp)
        const convertedValue = value as DateOperand;
        switch (normalizedOperator) {
            case DateTimeOperator.DateTimeIsGreaterThan:
                return `DateTime(${actualQueryProperty}) > DateTime.parse("${convertedValue}")`;
            case DateTimeOperator.DateTimeIsSmallerThan:
                return `DateTime(${actualQueryProperty}) < DateTime.parse("${convertedValue}")`;
            case DateTimeOperator.DateTimeIsEmpty:
                return `(${actualQueryProperty} = null || ${actualQueryProperty} = "")`;
            case DateTimeOperator.DateTimeIsNotEmpty:
                return `!(${actualQueryProperty} = null || ${actualQueryProperty} = "")`;
            default:
                return '';
        }
    } else if (isOperatorInEnum(normalizedOperator, BinaryOperator)) {
        // Parse binary expressions for strings and booleans (EX: [a, strincludes, b] -> a.Contains(b))
        const convertedValue = value as BinaryOperand;
        const convertedValueString = binaryOperandToString(convertedValue);
        switch (normalizedOperator) {
            case BinaryOperator.Equals:
                return typeof value === 'number'
                    ? `${actualQueryProperty} = ${convertedValueString}`
                    : `${actualQueryProperty} = "${convertedValueString}"`;
            case BinaryOperator.BooleanEquals:
                return `${actualQueryProperty}.Equals(${convertedValueString})`;
            case BinaryOperator.NotEquals:
                return typeof value === 'number'
                    ? `${actualQueryProperty} != ${convertedValueString}`
                    : `${actualQueryProperty} != "${convertedValueString}"`;
            case BinaryOperator.BooleanDoesNotEqual:
                return `!${actualQueryProperty}.Equals(${convertedValueString})`;
            case BinaryOperator.StringIncludes:
            case BinaryOperator.IsInList:
                return `${actualQueryProperty}.Contains("${convertedValueString}")`;
            case BinaryOperator.StringDoesNotInclude:
            case BinaryOperator.IsNotInList:
                return `!${actualQueryProperty}.Contains("${convertedValueString}")`;
            case BinaryOperator.IsGreaterThan:
                return `${actualQueryProperty} > ${convertedValueString}`;
            case BinaryOperator.IsGreaterThanOrEqual:
                return `${actualQueryProperty} >= ${convertedValueString}`;
            case BinaryOperator.IsSmallerThan:
                return `${actualQueryProperty} < ${convertedValueString}`;
            case BinaryOperator.IsSmallerThanOrEqual:
                return `${actualQueryProperty} <= ${convertedValueString}`;
            case BinaryOperator.ListElementContains:
                return `${actualQueryProperty}.Any(element => element.Contains("${convertedValueString}"))`;
            case BinaryOperator.NoListElementContains:
                return `!${actualQueryProperty}.Any(element => element.Contains("${convertedValueString}"))`;
            case BinaryOperator.ContainsKey:
                return `${actualQueryProperty}.ContainsKey("${convertedValueString}")`;
            case BinaryOperator.NotContainsKey:
                return `!${actualQueryProperty}.ContainsKey("${convertedValueString}")`;
            case BinaryOperator.StartsWith:
                return `${actualQueryProperty}.StartsWith("${convertedValueString}")`;
            default:
                return '';
        }
    }
    return '';
}
