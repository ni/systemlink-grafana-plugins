import { Properties } from "./types";
import { transformDuration, isTimeField } from "./utils";

test('isTimeField', () => {
    expect(isTimeField(Properties.CREATED_AT)).toBeTruthy();
    expect(isTimeField(Properties.UPDATED_AT)).toBeTruthy();
    expect(isTimeField(Properties.PLANNED_START_DATE_TIME)).toBeTruthy();
    expect(isTimeField(Properties.ESTIMATED_END_DATE_TIME)).toBeTruthy();
    expect(isTimeField(Properties.NAME)).toBeFalsy();
});

test('transformDuration', () => {
    expect(transformDuration(0)).toBe('0 sec');
    expect(transformDuration(61)).toBe('1 min, 1 sec');
    expect(transformDuration(3661)).toBe('1 hr, 1 min, 1 sec');
    expect(transformDuration(90061)).toBe('1 day, 1 hr, 1 min, 1 sec');
    expect(transformDuration(172800)).toBe('2 days');
});
