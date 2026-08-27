import { PageTutorial } from '../tutorial.types';

export const EditorTutorial: PageTutorial = {
  id: 'editor',
  title: 'Editor Guide',
  storageKey: 'pcex_tutorial_seen_editor',
  routePatterns: ['/editor'],
  steps: [
    {
      target: 'body',
      title: 'Editor Overview',
      content: 'The Problem Editor is where you author programming exercises. Write code, attach line-by-line explanations for Worked-Examples, and mask blank lines with distractor choices for Challenges.',
      position: 'center'
    },
    {
      target: '#editor-topbar',
      title: 'Toolbar & Actions',
      content: 'Toggle between original and translated versions, invite collaborators, preview the live student experience, or save changes.',
      position: 'bottom'
    },
    {
      target: '#editor-metadata',
      title: 'Source Details & Languages',
      content: 'Set the source name, description, target programming language (e.g. Python, Java), and natural language (e.g. English, Spanish, Korean).',
      position: 'bottom'
    },
    {
      target: '#editor-monaco-wrapper',
      title: 'Code Editor & Line Selection',
      content: 'Write code in the Monaco editor. Click any line number to attach line explanations on the right, or click "Mask this line" to create a blank challenge.',
      position: 'top'
    },
    {
      target: '#editor-annotations-sidebar',
      title: 'Explanations & Distractors',
      content: 'Switch tabs on the right side to write pedagogical line explanations for Worked-Examples, or add plausible distractor options for blank lines in Challenges.',
      position: 'left'
    }
  ]
};
