// The single seam to code shared with the Jotter SPA (jotter-react). Keep imports from the
// SPA behind this file so the dependency stays visible and narrow. Only browser-free
// modules may be imported here; esbuild bundles them into the server.

export type {
  ChecklistItem,
  Collection,
  NoteContainer,
  NoteSection
} from '../../jotter-react/src/lib/types';
export { sectionToMarkdown } from '../../jotter-react/src/lib/util/sectionMarkdown';
export { getDiagramElementCount } from '../../jotter-react/src/lib/util/diagram';
