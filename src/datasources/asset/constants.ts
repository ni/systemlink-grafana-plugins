import {
  EntityType, Weekday
} from "./types";
import { SelectableValue } from "@grafana/data";
import { enumToOptions } from "../../core/utils";

export const entityTypeOptions: SelectableValue[] = enumToOptions(EntityType);

export const minuteInSeconds = 60 * 1000;
export const hourInSeconds = 60 * minuteInSeconds;
export const secondsInDay = 24 * hourInSeconds;
export const peakDays = [Weekday.Monday, Weekday.Tuesday, Weekday.Wednesday, Weekday.Thursday, Weekday.Friday];

