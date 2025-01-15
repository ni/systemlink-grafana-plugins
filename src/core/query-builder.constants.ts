import { QueryBuilderCustomOperation } from "smart-webcomponents-react";

export const queryBuilderMessages = {
  en: {
    propertyUnknownType: "'' property is with undefined 'type' member!",
    propertyInvalidValue: "Invalid '!",
    propertyInvalidValueType: "Invalid '!",
    elementNotInDOM: 'Element does not exist in DOM! Please, add the element to the DOM, before invoking a method.',
    moduleUndefined: 'Module is undefined.',
    missingReference: '.',
    htmlTemplateNotSuported: ": Browser doesn't support HTMLTemplate elements.",
    invalidTemplate: "' property accepts a string that must match the id of an HTMLTemplate element from the DOM.",
    add: 'Add',
    addCondition: 'Add Condition',
    addGroup: 'Add Group',
    and: 'And',
    notand: 'Not And',
    or: 'Or',
    notor: 'Not Or',
    '=': 'Equals',
    '<>': 'Does not equal',
    '>': 'Greater than',
    '>=': 'Greater than or equal to',
    '<': 'Less than',
    '<=': 'Less than or equal to',
    startswith: 'Starts with',
    endswith: 'Ends with',
    contains: 'Contains',
    notcontains: 'Does not contain',
    isblank: 'Is blank',
    isnotblank: 'Is not blank',
    wrongParentGroupIndex: "' method.",
    missingFields:
      ': Fields are required for proper condition\'s adding. Set "fields" source and then conditions will be added as expected.',
    wrongElementNode: "' method.",
    invalidDataStructure: ': Used invalid data structure in updateCondition/updateGroup method.',
    dateTabLabel: 'DATE',
    timeTabLabel: 'TIME',
    queryLabel: '',
  },
};

export const QueryBuilderOperations = {
  EQUALS: {
    label: 'Equals',
    name: '=',
    expressionTemplate: '{0} = "{1}"',
  },
  DOES_NOT_EQUAL: {
    label: 'Does not equal',
    name: '<>',
    expressionTemplate: '{0} != "{1}"',
  },
  STARTS_WITH: {
    label: 'Starts with',
    name: 'startswith',
    expressionTemplate: '{0}.StartsWith("{1}")',
  },
  ENDS_WITH: {
    label: 'Ends with',
    name: 'endswith',
    expressionTemplate: '{0}.EndsWith("{1}")',
  },
  CONTAINS: {
    label: 'Contains',
    name: 'contains',
    expressionTemplate: '{0}.Contains("{1}")',
  },
  DOES_NOT_CONTAIN: {
    label: 'Does not contain',
    name: 'notcontains',
    expressionTemplate: '!({0}.Contains("{1}"))',
  },
  IS_BLANK: {
    label: 'Is blank',
    name: 'isblank',
    expressionTemplate: 'string.IsNullOrEmpty({0})',
    hideValue: true,
  },
  IS_NOT_BLANK: {
    label: 'Is not blank',
    name: 'isnotblank',
    expressionTemplate: '!string.IsNullOrEmpty({0})',
    hideValue: true,
  },
  GREATER_THAN: {
    label: 'Greater than',
    name: '>',
    expressionTemplate: '{0} > "{1}"',
  },
  GREATER_THAN_OR_EQUAL_TO: {
    label: 'Greater than or equal to',
    name: '>=',
    expressionTemplate: '{0} >= "{1}"',
  },
  LESS_THAN: {
    label: 'Less than',
    name: '<',
    expressionTemplate: '{0} < "{1}"',
  },
  LESS_THAN_OR_EQUAL_TO: {
    label: 'Less than or equal to',
    name: '<=',
    expressionTemplate: '{0} <= "{1}"',
  },
  // List expressions
  LIST_EQUALS: {
    label: 'Equals',
    name: 'listequals',
    expressionTemplate: '{0}.Contains("{1}")',
  },
  LIST_DOES_NOT_EQUAL: {
    label: 'Does not equal',
    name: 'listnotequals',
    expressionTemplate: '!({0}.Contains("{1}"))',
  },
  LIST_CONTAINS: {
    label: 'Contains',
    name: 'listcontains',
    expressionTemplate: '{0}.Any(it.Contains("{1}"))',
  },
  LIST_DOES_NOT_CONTAIN: {
    label: 'Does not contain',
    name: 'listnotcontains',
    expressionTemplate: '{0}.Any(!it.Contains("{1}"))',
  },
  // Properties expressions
  PROPERTY_EQUALS: {
    label: 'Equals',
    name: 'propertyequals',
    expressionTemplate: 'properties["{0}"] = "{1}"',
  },
  PROPERTY_DOES_NOT_EQUAL: {
    label: 'Does not equal',
    name: 'propertynotequals',
    expressionTemplate: 'properties["{0}"] != "{1}"',
  },
  PROPERTY_STARTS_WITH: {
    label: 'Starts with',
    name: 'propertystartswith',
    expressionTemplate: 'properties["{0}"].StartsWith("{1}")',
  },
  PROPERTY_ENDS_WITH: {
    label: 'Ends with',
    name: 'propertyendswith',
    expressionTemplate: 'properties["{0}"].EndsWith("{1}")',
  },
  PROPERTY_CONTAINS: {
    label: 'Contains',
    name: 'propertycontains',
    expressionTemplate: 'properties["{0}"].Contains("{1}")',
  },
  PROPERTY_DOES_NOT_CONTAIN: {
    label: 'Does not contains',
    name: 'propertynotcontains',
    expressionTemplate: '!(properties["{0}"].Contains("{1}"))',
  },
  PROPERTY_IS_BLANK: {
    label: 'Is blank',
    name: 'propertyisblank',
    expressionTemplate: 'string.IsNullOrEmpty(properties["{0}"])',
    hideValue: true,
  },
  PROPERTY_IS_NOT_BLANK: {
    label: 'Is not blank',
    name: 'propertyisnotblank',
    expressionTemplate: '!string.IsNullOrEmpty(properties["{0}"])',
    hideValue: true,
  },
  KEY_VALUE_MATCHES: {
    label: 'matches',
    name: 'key_value_matches',
    expressionTemplate: '{0}["{1}"] = "{2}"',
    hideValue: true,
  }
}

// function labeledEditorTemplate(keyPlaceholder: string, valuePlaceholder: string, value: any): HTMLElement {
//   const template = `
//   <div id="sl-query-builder-key-value-editor">
//       <ul style="list-style: none; padding-left: 0; padding-right: 10px;">
//           <li>
//               <smart-input class="key-input" style="width: auto; padding-left: 5px;"
//                   placeholder="${keyPlaceholder}"
//                   value="${value?.key ?? ''}">
//               </smart-input>
//           </li>
//           <li>
//               <smart-input class="value-input" style="width: auto; margin-top: 10px; padding-left: 5px;"
//                   placeholder="${valuePlaceholder}"
//                   value="${value?.value ?? ''}">
//               </smart-input>
//           </li>
//       </ul>
//   </div>`;

//   const templateBody = new DOMParser().parseFromString(template, 'text/html').body;
//   return templateBody.querySelector('#sl-query-builder-key-value-editor')!;
// }

// function valueTemplate(editor: HTMLElement | null | undefined, value: { key: string; value: string | number;}): string {
//   if (value) {
//     const keyValuePair = value as { key: string; value: string | number;};
//     return `${keyValuePair.key} : ${keyValuePair.value}`;
//   }
//   if (editor) {
//     const keyInput = editor.querySelector<HTMLInputElement>('.key-input');
//     const valueInput = editor.querySelector<HTMLInputElement>('.value-input');
//     if (keyInput && valueInput) {
//       return `${keyInput.value} : ${valueInput.value}`;
//     }
//   }
//   return '';
// }

// function retrieveKeyValueInputs(editor: HTMLElement | null | undefined): { key: string, value: string } {
//   let pair = { key: '', value: '' };
//   if (editor) {
//       const keyInput = editor.querySelector<HTMLInputElement>('.key-input');
//       const valueInput = editor.querySelector<HTMLInputElement>('.value-input');
//       if (keyInput && valueInput) {
//           pair = {
//               key: keyInput.value,
//               value: valueInput.value
//           };
//       }
//   }
//   return pair;
// }

// function handleStringValue(editor: HTMLElement | null | undefined): any {
//   const inputs = retrieveKeyValueInputs(editor);
//   return {
//     label: inputs,
//     value: inputs
// };
// }

export const customOperations: QueryBuilderCustomOperation[] = [
  QueryBuilderOperations.EQUALS,
  QueryBuilderOperations.DOES_NOT_EQUAL,
  QueryBuilderOperations.STARTS_WITH,
  QueryBuilderOperations.ENDS_WITH,
  QueryBuilderOperations.CONTAINS,
  QueryBuilderOperations.DOES_NOT_CONTAIN,
  QueryBuilderOperations.IS_BLANK,
  QueryBuilderOperations.IS_NOT_BLANK,
  QueryBuilderOperations.GREATER_THAN,
  QueryBuilderOperations.GREATER_THAN_OR_EQUAL_TO,
  QueryBuilderOperations.LESS_THAN,
  QueryBuilderOperations.LESS_THAN_OR_EQUAL_TO,
  QueryBuilderOperations.LIST_EQUALS,
  QueryBuilderOperations.LIST_DOES_NOT_EQUAL,
  QueryBuilderOperations.LIST_CONTAINS,
  QueryBuilderOperations.LIST_DOES_NOT_CONTAIN,
  QueryBuilderOperations.PROPERTY_EQUALS,
  QueryBuilderOperations.PROPERTY_DOES_NOT_EQUAL,
  QueryBuilderOperations.PROPERTY_STARTS_WITH,
  QueryBuilderOperations.PROPERTY_ENDS_WITH,
  QueryBuilderOperations.PROPERTY_CONTAINS,
  QueryBuilderOperations.PROPERTY_DOES_NOT_CONTAIN,
  QueryBuilderOperations.PROPERTY_IS_BLANK,
  QueryBuilderOperations.PROPERTY_IS_NOT_BLANK,
];
