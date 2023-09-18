export interface Workspace {
  name: string;
  id: string;
}

export type DeepPartial<T> = {
  [Key in keyof T]?: DeepPartial<T[Key]>;
};
