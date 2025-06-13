import { dateTimeExpressionBuilderCallback } from "./date-time-operations";
import { FilterOperations } from "core/query-builder.constants";

describe("dateTimeExpressionBuilderCallback", () => {
    it("should return the correct expression for DateTimeIsBlank operation", () => {
        const dataField = "testField";
        const operation = FilterOperations.DateTimeIsBlank;
        const result = dateTimeExpressionBuilderCallback(dataField, operation);
        expect(result).toBe('testField == null || testField == ""');
    });

    it("should return the correct expression for DateTimeIsNotBlank operation", () => {
        const dataField = "testField";
        const operation = FilterOperations.DateTimeIsNotBlank;
        const result = dateTimeExpressionBuilderCallback(dataField, operation);
        expect(result).toBe('testField != null && testField != ""');
    });

    it("should return an empty string for an unsupported operation", () => {
        const dataField = "testField";
        const operation = "unsupportedOperation";
        const result = dateTimeExpressionBuilderCallback(dataField, operation);
        expect(result).toBe('');
    });
});
