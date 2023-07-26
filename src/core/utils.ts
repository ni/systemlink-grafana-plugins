import { SelectableValue } from "@grafana/data";

export function enumToOptions<T>(stringEnum: { [name: string]: T }): Array<SelectableValue<T>> {
    const RESULT = [];

    for (const [key, value] of Object.entries(stringEnum)) {
        RESULT.push({ label: key, value: value });
    }

    return RESULT;
}
