import { HttpConfigEditor } from "core/components/HttpConfigEditor";
import { PartNumberDataSource } from "./PartNumberDataSource";
import { PartNumberQueryEditor } from "./components/PartNumberQueryEditor";
import { DataSourcePlugin } from "@grafana/data";

export const plugin = new DataSourcePlugin(PartNumberDataSource)
  .setConfigEditor(HttpConfigEditor)
  .setQueryEditor(PartNumberQueryEditor)
  .setVariableQueryEditor(() => null);
