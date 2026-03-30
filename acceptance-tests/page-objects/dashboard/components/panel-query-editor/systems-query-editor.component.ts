import { Page, Locator } from '@playwright/test';
import { pressEnter, selectAllAndDeleteTextInInputField } from '../../../../utils/keyboard-utilities';

export class SystemsQueryEditorComponent {
    readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    public get queryBuilderPropertyField(): Locator {
        return this.page.getByText('Property');
    }

    public get queryBuilderOperationField(): Locator {
        return this.page.getByText('Operator');
    }

    public get queryBuilderValueField(): Locator {
        return this.page.getByTestId('query-editor-row').getByText('Value');
    }

    public get switchToTableViewButton(): Locator {
        return this.page.getByText('Table view');
    }

    public get addGroupFilterButton(): Locator {
        return this.page.getByRole('button', { name: 'Add group' });
    }

    public get andFilterGroupButton(): Locator {
        return this.page.getByLabel('And', { exact: true }).getByText('And');
    }

    public get orFilterGroupButton(): Locator {
        return this.page.getByText('Or', { exact: true });
    }

    public get queryBuilderPropertyFieldOpened(): Locator {
        return this.page.getByRole('searchbox', { name: 'Input' });
    }

    public getQueryType(queryType: string): Locator {
        return this.page.getByRole('radio', { name: queryType });
    }

    public variableDropdown(variableName: string): Locator {
        return this.page.getByTestId(`data-testid Dashboard template variables Variable Value DropDown value link text ${variableName}`);
    }

    public variableDropdownOption(optionName: string): Locator {
        return this.page.getByRole('checkbox', { name: optionName });
    }

    async addFilterByTypingPropertyName(property: string, operation: string, value: string): Promise<void> {
        await this.queryBuilderPropertyField.last().click();
        await this.queryBuilderPropertyFieldOpened.clear();
        await this.page.keyboard.type(property);
        await this.page.getByRole('option', { name: property }).waitFor({ state: 'visible' });
        await pressEnter(this.page);
        // The library makes the Operator field unclickable via CSS (pointer-events: none).
        // Using dispatchEvent bypasses this restriction and fires the event directly on the element.
        await this.queryBuilderOperationField.last().dispatchEvent('pointerdown', { bubbles: true, isPrimary: true });
        await this.page.getByRole('option', { name: operation }).click();
        await this.queryBuilderValueField.last().click();
        await this.page.keyboard.type(value);
        await pressEnter(this.page);
    }

    async switchToTableView(): Promise<void> {
        await this.switchToTableViewButton.click();
    }

    async openVariableDropdown(variableName: string, variableOption: string): Promise<void> {
        await this.variableDropdown(variableName).click();
        await this.variableDropdownOption(variableOption).click();
    }

    async selectQueryType(queryType: string): Promise<void> {
        await this.getQueryType(queryType).click();
    }

    async addFilterGroup(operator: string): Promise<void> {
        await this.addGroupFilterButton.click();
        if (operator.toLowerCase() === 'and') {
            await this.andFilterGroupButton.click();
        } else if (operator.toLowerCase() === 'or') {
            await this.orFilterGroupButton.click();
        }
    }
}
