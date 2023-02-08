import React from 'react';

// declare module '*.svg' {
//   const content: React.FunctionComponent<React.SVGAttributes<SVGElement>>;
//   export default content;
// }

declare module '*.svg' {
  import * as React from 'react';

  const ReactComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement> & { title?: string }>;

  export default ReactComponent;
}

export type TContent = {
  content: string;
  shortcut: string[];
  categorized: string[];
};

export type TSearchQuery = {
  name?: string;
  homeserver?: string;
  alias?: string;
  error?: string;;
};
