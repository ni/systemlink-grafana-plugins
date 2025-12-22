import { TestPlansQueryBuilderFieldNames } from "./constants/TestPlansQueryBuilder.constants";
import { transformDuration, isTimeField } from "./utils";

test('isTimeField', () => {
    expect(isTimeField(TestPlansQueryBuilderFieldNames.CreatedAt)).toBeTruthy();
    expect(isTimeField(TestPlansQueryBuilderFieldNames.UpdatedAt)).toBeTruthy();
    expect(isTimeField(TestPlansQueryBuilderFieldNames.PlannedStartDate)).toBeTruthy();
    expect(isTimeField(TestPlansQueryBuilderFieldNames.EstimatedEndDate)).toBeTruthy();
    expect(isTimeField(TestPlansQueryBuilderFieldNames.Name)).toBeFalsy();
});

test('transformDuration', () => {
    expect(transformDuration(0)).toBe('0 sec');
    expect(transformDuration(61)).toBe('1 min, 1 sec');
    expect(transformDuration(3661)).toBe('1 hr, 1 min, 1 sec');
    expect(transformDuration(90061)).toBe('1 day, 1 hr, 1 min, 1 sec');
    expect(transformDuration(172800)).toBe('2 days');
});
