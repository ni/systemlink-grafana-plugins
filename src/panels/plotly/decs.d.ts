// Augment module with missing 'Icons' type
declare module 'plotly.js-dist-min' {
  import * as Plotly from 'plotly.js';
  export = Plotly;
  // From: https://github.com/plotly/plotly.js/blob/master/src/fonts/ploticon.js
  export const Icons: {
    [name: string]: {
      width: number;
      height: number;
      path: string;
      transform: string;
    };
  };
}
