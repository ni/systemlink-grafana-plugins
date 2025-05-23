import { Properties } from "./types";
import { isTimeField } from "./utils";

test('isTimeField', () => {
    expect(isTimeField(Properties.CREATED_AT)).toBeTruthy();
    expect(isTimeField(Properties.UPDATED_AT)).toBeTruthy();
    expect(isTimeField(Properties.PLANNED_START_DATE_TIME)).toBeTruthy();
    expect(isTimeField(Properties.ESTIMATED_END_DATE_TIME)).toBeTruthy();
    expect(isTimeField(Properties.NAME)).toBeFalsy();
});
