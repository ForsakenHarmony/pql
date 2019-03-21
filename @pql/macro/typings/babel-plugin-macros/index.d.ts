export type Path = {
  parentPath: Path;
  type: string;
  get: (arg0: string) => Path;
  replaceWith: (arg0: any) => void;
  evaluate: () => { value: any };
};

export type State = {
  file: {
    opts: any;
  };
};

export type Babel = {
  template: (
    template: string | TemplateStringsArray,
    opts: any
  ) => () => {
    declarations: any[];
  };
};

export type MacroCbArgs = {
  references: {
    [name: string]: Path[];
  };
  state: State;
  babel: Babel;
};

export function createMacro(macroCb: (args: MacroCbArgs) => void): void;
