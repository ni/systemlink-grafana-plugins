import { TestPlansQueryBuilderFieldNames } from "./constants/TestPlansQueryBuilder.constants";
import { isTimeField } from "./utils";

test('isTimeField', () => {
    expect(isTimeField(TestPlansQueryBuilderFieldNames.CreatedAt)).toBeTruthy();
    expect(isTimeField(TestPlansQueryBuilderFieldNames.UpdatedAt)).toBeTruthy();
    expect(isTimeField(TestPlansQueryBuilderFieldNames.PlannedStartDate)).toBeTruthy();
    expect(isTimeField(TestPlansQueryBuilderFieldNames.EstimatedEndDate)).toBeTruthy();
    expect(isTimeField(TestPlansQueryBuilderFieldNames.Name)).toBeFalsy();
});
