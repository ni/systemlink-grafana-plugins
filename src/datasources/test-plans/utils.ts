import { TestPlansQueryBuilderFieldNames } from "./constants/TestPlansQueryBuilder.constants";

export function isTimeField(
    queryBuilderFieldName: TestPlansQueryBuilderFieldNames
): boolean {
    return (
        queryBuilderFieldName === TestPlansQueryBuilderFieldNames.CreatedAt
        || queryBuilderFieldName === TestPlansQueryBuilderFieldNames.UpdatedAt
        || queryBuilderFieldName === TestPlansQueryBuilderFieldNames.PlannedStartDate
        || queryBuilderFieldName === TestPlansQueryBuilderFieldNames.EstimatedEndDate
    );
}
