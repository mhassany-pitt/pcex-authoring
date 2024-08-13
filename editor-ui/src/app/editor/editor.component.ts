import { Component, Input, NgZone, OnDestroy, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { KeyCode, KeyMod, Range } from 'monaco-editor';
import { SourcesService } from '../sources.service';
import { ActivitiesService } from '../activities.service';
import { AppService } from '../app.service';
import { arrayMoveMutable } from 'array-move';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { getNavMenuBar } from '../utilities';

@Component({
  selector: 'app-editor',
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.less'],
})
export class EditorComponent implements OnInit, OnDestroy {

  getNavMenuBar = getNavMenuBar;

  @Input() language = 'java';

  srcEditorOptions = {
    language: this.language,
    theme: 'vs',
    minimap: { enabled: false },
    lineNumbersMinChars: 2,
    folding: false,
    glyphMargin: true,
    trimAutoWhitespace: false,
    tabSize: 4,
    scrollBeyondLastLine: false,
    automaticLayout: true,
  };

  distEditorOptions = {
    ...this.srcEditorOptions,
    lineNumbers: 'off',
    lineNumbersMinChars: 0,
    lineDecorationsWidth: 0,
    glyphMargin: false,
    renderLineHighlight: 'none',
    scrollbar: { verticalScrollbarSize: 0 },
  };

  model: any;

  editor: any;
  selectedLineNum: any;
  selectedLine: any;
  blankLineNums: any[] = [];
  decorations: any[] = [];

  currentTab = 'Annotations';
  previewLink: any;
  showPreview = false;
  langSet = true;

  samples: any;
  generating = false;
  draggedGenHistory: any;

  // --------

  get titleDescCollapsed() { return localStorage.getItem('pcex.prefs.titleDescCollapsed') == 'true'; }
  set titleDescCollapsed(value) { localStorage.setItem('pcex.prefs.titleDescCollapsed', `${value}`); }

  get annotTipsCollapsed() { return localStorage.getItem('pcex.prefs.annotTipsCollapsed') == 'true'; }
  set annotTipsCollapsed(value) { localStorage.setItem('pcex.prefs.annotTipsCollapsed', `${value}`); }

  // --------

  gptDefInclusion = 'Also include lines that ...';
  gptDefExclusion = 'But exclude lines that ...';
  gptDefPrompt = {
    inclusion: '',
    exclusion: '',
    explanation: 'When considering each identified line, ' +
      'ensure explanations provide the reasons that led to the line inclusion, ' +
      'prioritizing them based on their relative importance ' +
      'while also preventing any unnecessary duplication or repetition of information.',
  };
  gptPrompt: any = JSON.parse(JSON.stringify(this.gptDefPrompt));

  // --------

  gptHistoryTzs: any[] = [];
  gptHistoryExps: any = {};
  gptCurrentTz: string = '';
  gptHistoryTzExps: any;
  gptHistorySrcLines: any;
  gptGeneratedExps: any[] = [];

  get filteredGptHistoryTzExps() {
    return this.gptHistoryTzExps
      .filter((e: any) => this.selectedLineNum == e.line_num
        || this.toggles['show-all-lines-' + this.selectedLineNum])
      .sort((l1: any, l2: any) => parseInt(l1.line_num) - parseInt(l2.line_num));
  }

  // --------

  expDragEnabled = false;
  historyExpDragEnabled = false;
  dragOverExpIdx: any;

  dtime0 = Date.now();
  lastValue: any = null;
  lastValueKeys: any = null;

  // --------

  selection: any[] = [];
  cptLineNum: any = null;
  cptAction: any = null;
  cptSelection: any[] = []; // for copy-paste

  // --------

  get trackingMessageDismissed() { return localStorage.getItem('pcex-authoring.tracking') === 'dismissed'; }
  dismissTrackingMessage() { localStorage.setItem('pcex-authoring.tracking', 'dismissed'); }

  // --------

  toggles: any = {};

  constructor(
    private ngZone: NgZone,
    private activities: ActivitiesService,
    private api: SourcesService,
    public router: Router,
    private route: ActivatedRoute,
    private title: Title,
    private http: HttpClient,
    private app: AppService,
  ) { }

  takeSnapshot(val: any) {
    return val ? JSON.parse(JSON.stringify(val)) : val;
  }

  keyTimeout: any = null;
  keyDelayedChkpoint: any = null;

  recordKeys($event: any, key: 'keyup' | 'keydown') {
    // keydown is required for ctrl/meta/... key detections
    if (key == 'keydown' && !$event.metaKey)
      return; // but filter out duplicate keys by keyup and keydown

    if (['Tab', 'Backspace', 'Delete'].includes($event.key) == false && $event.key.length > 1)
      return; // ignore non-alpha key events

    if (this.keyTimeout)
      clearTimeout(this.keyTimeout);

    let value = 0; // use bitwise OR to combine key flags
    if ($event.ctrlKey) value |= 1;
    if ($event.altKey) value |= 2;
    if ($event.shiftKey) value |= 4;
    if ($event.metaKey) value |= 8;
    this.lastValueKeys.push(`${value}:${$event.key}`);

    // record a checkpoint after 1 second of inactivity
    this.keyDelayedChkpoint = () => {
      this.keyTimeout = null;
      this.lastValueKeys.push({ checkpoint: $event.target.value });
    };
    this.keyTimeout = setTimeout(() => this.keyDelayedChkpoint(), 1000);
  }

  ensureKeyChkpoint($event: any) {
    if (this.keyTimeout) {
      clearTimeout(this.keyTimeout);
      this.keyTimeout = null;
    }
    this.keyDelayedChkpoint = null;
  }

  log(event: any) {
    event = { ...this.takeSnapshot(event), dtime: Date.now() };
    event.since_dtime0 = event.dtime - this.dtime0;
    let tries = 0;
    const log$ = () => {
      this.api.log(this.model.id, event)
        .subscribe({
          next: (resp: any) => {
            // console.log(JSON.stringify(event, null, 2));
          },
          error: (error: any) => {
            console.log(error);
            if (tries++ < 5)
              setTimeout(log$, tries * 1000);
          },
        });
    }
    log$();
  }

  ngOnInit(): void {
    document.addEventListener('keydown', this.logCtrlZY, true);

    const params: any = this.route.snapshot.params;
    this.api.read(params.id).subscribe(
      (source: any) => {
        source.code = source.code || '';
        source.lines = source.lines || {};
        source.distractors = source.distractors || [];
        this.model = source;

        this.updateTitle();
        this.changeEditorLang();

        if (this.editor)
          setTimeout(() => this.reloadLineMarkers(), 0);

        this.log({ type: 'loaded' });
        this.reloadHistory();
      },
      (error: any) => console.log(error)
    );
    this.api.samples().subscribe(
      (samples: any) => this.samples = samples,
      (error: any) => console.log(error)
    );
  }

  ngOnDestroy(): void {
    document.removeEventListener('keydown', this.logCtrlZY, true);
  }

  logCtrlZY = ($event: any) => {
    const mac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
    if ((mac && $event.metaKey && $event.shiftKey && $event.key == 'z')
      || (!mac && $event.ctrlKey && $event.key == 'y'))
      this.log({ type: 'redo' });
    else if ((mac && $event.metaKey && $event.key == 'z')
      || (!mac && $event.ctrlKey && $event.key == 'z'))
      this.log({ type: 'undo' });
  }

  updateTitle() {
    this.title.setTitle(`PCEX Authoring: ${this.model.name}`);
  }

  setupSourceEditor(editor: any) {
    this.editor = editor;

    editor.onDidFocusEditorText(($event: any) => this.onEditorFocus($event));
    editor.onDidBlurEditorText(($event: any) => this.onEditorBlur($event));
    editor.onKeyDown(($event: any) => this.recordKeys($event.browserEvent, 'keydown'));
    editor.onKeyUp(($event: any) => this.recordKeys($event.browserEvent, 'keyup'));

    editor.onDidChangeCursorPosition(($event: any) => this.ngZone.run(() => {
      if (this.selectedLineNum != $event.position.lineNumber) {
        this.selectLine($event.position.lineNumber, false);
      }
    }));
    editor.onMouseDown(($event: any) => {
      if ($event.target.type == 2 && this.selectedLineNum != $event.target.position.lineNumber) {
        this.selectLine($event.target.position.lineNumber);
      }
    });

    setTimeout(() => this.selectLine(1), 0);
  }

  setupDistractorEditor(editor: any, distractor: any, index: number) {
    this.setupAsSingleLineEditor(editor);

    editor.onDidFocusEditorText(($event: any) => this.onDistractorFocus($event, distractor));
    editor.onDidBlurEditorText(($event: any) => this.onDistractorBlur($event, distractor));
    editor.onKeyDown(($event: any) => this.recordKeys($event.browserEvent, 'keydown'));
    editor.onKeyUp(($event: any) => this.recordKeys($event.browserEvent, 'keyup'));
  }

  private setupAsSingleLineEditor(editor: any) {
    // --------------->>
    // https://github.com/vikyd/vue-monaco-singleline/blob/1de219c2f1ddd89f6b473e43716bbb3dfb662542/src/monaco-singleline.vue#L150
    editor.addCommand(KeyMod.CtrlCmd | KeyCode.KeyF, () => { });
    editor.addCommand(KeyCode.Enter, () => editor.trigger('', 'acceptSelectedSuggestion'));
    editor.onDidPaste((e: any) => {
      if (e.endLineNumber <= 1)
        return;
      let content = '';
      const model = editor.getModel();
      const lc = model.getLineCount();
      for (let i = 0; i < lc; i += 1) content += model.getLineContent(i + 1);
      model.setValue(content);
      editor.setPosition({ column: content.length + 1, lineNumber: 1 });
    });
    editor.addCommand(KeyCode.F1, () => { });
    // <<---------------
  }

  selectLine(lineNum: number, reveal = true) {
    if (this.selectedLineNum != lineNum) {
      this.selectedLineNum = lineNum;
      if (lineNum) {
        // init line with defaults
        if (lineNum in this.model.lines == false)
          this.model.lines[lineNum] = { comments: [{}] };
        this.selectedLine = this.model.lines[lineNum];
      } else
        this.selectedLine = {};

      this.selection = [];
    }

    const lines = this.model.code.split('\n');
    if (reveal && lines.length) {
      const line = lines[lineNum - 1];
      const column = line.indexOf(`${line.trim().charAt(0)}`) + 1;
      this.editor.revealLinesInCenter(lineNum, column);
      this.editor.setPosition({ lineNumber: lineNum, column });
      this.editor.focus();
    }

    this.reloadLineMarkers();
    this.log({
      type: 'select-line',
      line_num: lineNum,
      line_content: lines.length ? lines[lineNum - 1] : null,
    });
  }

  ignoreUntouchedLines() {
    // remove non-blank or no comments lines
    const count = this.model.code.split('\n').length;
    Object.keys(this.model.lines)
      .filter((ln) => {
        const line = this.model.lines[ln];
        return (
          parseInt(ln) > count ||
          (!line.blank &&
            line.comments.filter((c: any) => c.content).length == 0)
        );
      })
      .forEach((ln) => delete this.model.lines[ln]);
  }

  reloadLineMarkers() {
    this.editor.deltaDecorations(this.decorations || [], []);
    this.decorations = [];

    const lines = this.model.code.split('\n');
    if (!lines.length)
      return;

    const createRange = (ln: any) => {
      const blank = this.model.lines[ln].blank;
      const commented = this.model.lines[ln].comments.filter((c: any) => c.content).length > 0;
      return {
        range: new Range(parseInt(ln), 1, parseInt(ln), lines[ln - 1].length + 1),
        options: {
          isWholeLine: true,
          glyphMarginClassName: `annotated-line__glyph${blank ? '--blank' : ''}${commented ? '--commented' : ''}`,
          stickiness: 1,
        },
      };
    };

    const filtered = Object.keys(this.model.lines)
      .map((ln) => parseInt(ln)).filter((ln) => ln <= lines.length);
    this.blankLineNums = filtered.filter((ln) => this.model.lines[ln].blank);
    this.decorations = this.editor.deltaDecorations([], filtered.map(createRange));
  }

  toggleBlankLine() {
    this.selectedLine.blank = !this.selectedLine.blank;
    this.reloadLineMarkers();
    this.log({
      type: 'toggle-blank-line',
      line_num: this.selectedLineNum,
      line_content: this.model.code.split('\n')[this.selectedLineNum - 1],
      is_blank: this.selectedLine.blank,
      explanations: this.selectedLine.comments,
    })
  }

  addExplanation() {
    this.selectedLine.comments.push({});
    this.reloadLineMarkers();
    this.log({
      type: 'add-explanation',
      line_num: this.selectedLineNum,
      line_content: this.model.code.split('\n')[this.selectedLineNum - 1],
      is_blank: this.selectedLine.blank,
      explanations: this.selectedLine.comments,
    });
  }

  onExplanationDragStart($event: any, index: number) {
    if (!this.expDragEnabled)
      return;
    $event.stopPropagation();
    $event.dataTransfer.setData('index', `${index}`);
  }

  onExplanationDragOver($event: any, index: number) {
    if (!this.expDragEnabled)
      return;
    $event.preventDefault();
    $event.dataTransfer.dropEffect = $event.altKey ? 'copy' : 'move';
    this.dragOverExpIdx = index;
  }

  onExplanationDragDrop($event: any, toIndex: number) {
    if (!this.expDragEnabled)
      return;
    $event.preventDefault();
    this.dragOverExpIdx = null;
    this.expDragEnabled = false;
    const fromIndex = parseInt($event.dataTransfer.getData('index'));
    this.log({
      type: $event.altKey ? 'merge-explanations' : 'reorder-explanation',
      line_num: this.selectedLineNum,
      line_content: this.model.code.split('\n')[this.selectedLineNum - 1],
      is_blank: this.selectedLine.blank,
      explanations: this.selectedLine.comments,
      from_index: fromIndex,
      to_index: toIndex,
    });
    if ($event.altKey) {
      if (fromIndex != toIndex) {
        this.selectedLine.comments[toIndex].content += ' ' + (this.selectedLine.comments[fromIndex].content || '');
        this.selectedLine.comments[toIndex].gpt += ' ' + (this.selectedLine.comments[fromIndex].gpt || '');
        this.selectedLine.comments.splice(fromIndex, 1);
      }
    } else {
      arrayMoveMutable(this.selectedLine.comments, fromIndex, toIndex);
    }
    this.log({
      type: $event.altKey ? 'explanations-merged' : 'explanation-reordered',
      line_num: this.selectedLineNum,
      line_content: this.model.code.split('\n')[this.selectedLineNum - 1],
      is_blank: this.selectedLine.blank,
      explanations: this.selectedLine.comments,
      from_index: fromIndex,
      to_index: toIndex,
    });
  }

  onExplanationDragEnd(el: any, $event: any, index: number) {
    el.removeAttribute('draggable');
    this.expDragEnabled = false;
    this.dragOverExpIdx = null;
  }

  getExplanationActionMenuItems() {
    const items = [];
    const noSelectYet = !this.toggles['explanations-select'] || this.selection.length == 0;
    const lessThan2Selection = !this.toggles['explanations-select'] || this.selection.length < 2;

    if (this.toggles['explanations-select'])
      items.push({ label: 'Cancel', icon: 'pi pi-times', command: () => this.onExplanationSelectCancel() });
    else
      items.push({ label: 'Select', icon: 'pi pi-check', command: () => this.onExplanationSelect() });
    items.push({ label: 'Select all', icon: 'pi pi-check-square', command: () => this.onExplanationSelectAll() });
    items.push({ separator: true });
    items.push({ label: 'Merge', icon: 'pi pi-comments', disabled: lessThan2Selection, command: () => this.onExplanationMerge() });
    items.push({ separator: true });
    items.push({ label: 'Cut', icon: 'fa fa-solid fa-scissors', disabled: noSelectYet, command: () => this.onExplanationCut() });
    items.push({ label: 'Copy', icon: 'fa fa-solid fa-copy', disabled: noSelectYet, command: () => this.onExplanationCopy() });
    if (this.cptAction)
      items.push({ label: 'Paste', icon: 'fa fa-solid fa-paste', disabled: this.cptSelection.length == 0, command: () => this.onExplanationPaste() });
    items.push({ separator: true });
    items.push({ label: 'Delete', icon: 'pi pi-trash', styleClass: 'p-button-danger', disabled: noSelectYet, command: () => this.onExplanationDelete() });

    return items;
  }

  toggleSelection(explanation: any) {
    if (this.selection.indexOf(explanation) == -1) {
      this.selection.push(explanation);
      this.log({
        type: 'select-explanation',
        line_num: this.selectedLineNum,
        line_content: this.model.code.split('\n')[this.selectedLineNum - 1],
        is_blank: this.selectedLine.blank,
        explanations: this.selectedLine.comments,
        selection: this.selection,
        explanation,
      });
    } else {
      this.selection.splice(this.selection.indexOf(explanation), 1);
      this.log({
        type: 'deselect-explanation',
        line_num: this.selectedLineNum,
        line_content: this.model.code.split('\n')[this.selectedLineNum - 1],
        is_blank: this.selectedLine.blank,
        explanations: this.selectedLine.comments,
        selection: this.selection,
        explanation,
      });
    }
  }

  onExplanationSelectCancel() {
    this.toggles['explanations-select'] = false;
    this.log({
      type: 'cancel-explanations-selection',
      line_num: this.selectedLineNum,
      line_content: this.model.code.split('\n')[this.selectedLineNum - 1],
      is_blank: this.selectedLine.blank,
      explanations: this.selectedLine.comments,
      selection: this.selection,
      cpt_action: this.cptAction,
      cpt_line_num: this.cptLineNum,
      cpt_selection: this.cptSelection,
    });
    this.selection = [];
    this.cptLineNum = null;
    this.cptAction = null;
    this.cptSelection = [];
  }

  onExplanationSelect() {
    this.toggles['explanations-select'] = true;
    this.log({
      type: 'start-explanations-selection',
      line_num: this.selectedLineNum,
      line_content: this.model.code.split('\n')[this.selectedLineNum - 1],
      is_blank: this.selectedLine.blank,
      explanations: this.selectedLine.comments,
    });
  }

  onExplanationSelectAll() {
    this.toggles['explanations-select'] = true;
    this.selection = [...this.selectedLine.comments];
    this.log({
      type: 'select-all-explanations',
      line_num: this.selectedLineNum,
      line_content: this.model.code.split('\n')[this.selectedLineNum - 1],
      is_blank: this.selectedLine.blank,
      explanations: this.selectedLine.comments,
      selection: this.selection,
    });
  }

  onExplanationMerge() {
    this.log({
      type: 'merge-explanations',
      line_num: this.selectedLineNum,
      line_content: this.model.code.split('\n')[this.selectedLineNum - 1],
      is_blank: this.selectedLine.blank,
      explanations: this.selectedLine.comments,
      selection: this.selection,
    });
    if (confirm('Are you sure you want to merge the selected explanations?')) {
      const explanations = this.selectedLine.comments;
      const snapshot = this.takeSnapshot(this.selection);
      for (let i = 1; i < this.selection.length; i++) {
        this.selection[0].content += ' ' + (this.selection[i].content || '');
        this.selection[0].gpt += ' ' + (this.selection[i].gpt || '');
        explanations.splice(explanations.indexOf(this.selection[i]), 1);
      }
      this.log({
        type: 'merge-explanations-confirmed',
        line_num: this.selectedLineNum,
        line_content: this.model.code.split('\n')[this.selectedLineNum - 1],
        is_blank: this.selectedLine.blank,
        explanations: this.selectedLine.comments,
        selection: snapshot,
      });
      this.selection = [];
    } else {
      this.log({
        type: 'merge-explanations-cancelled',
        line_num: this.selectedLineNum,
        line_content: this.model.code.split('\n')[this.selectedLineNum - 1],
        is_blank: this.selectedLine.blank,
        explanations: this.selectedLine.comments,
        selection: this.selection,
      });
    }
  }

  onExplanationCut() {
    this.cptAction = 'cut';
    this.cptLineNum = this.selectedLineNum;
    this.cptSelection = [...this.selection];
    this.selection = [];
    this.log({
      type: 'cut-explanations',
      line_num: this.cptLineNum,
      line_content: this.model.code.split('\n')[this.cptLineNum - 1],
      is_blank: this.selectedLine.blank,
      explanations: this.selectedLine.comments,
      selection: this.cptSelection,
    });
  }

  onExplanationCopy() {
    this.cptAction = 'copy';
    this.cptLineNum = this.selectedLineNum;
    this.cptSelection = [...this.selection];
    this.selection = [];
    this.log({
      type: 'copy-explanations',
      line_num: this.cptLineNum,
      line_content: this.model.code.split('\n')[this.cptLineNum - 1],
      is_blank: this.selectedLine.blank,
      explanations: this.selectedLine.comments,
      selection: this.cptSelection,
    });
  }

  onExplanationPaste() {
    if (this.cptAction == 'cut') {
      this.cptSelection.forEach((exp: any) => {
        const srcLineExps = this.model.lines[this.cptLineNum].comments;
        srcLineExps.splice(srcLineExps.indexOf(exp), 1);
        this.selectedLine.comments.push(exp);
      });
    } else if (this.cptAction == 'copy') {
      this.selectedLine.comments.push(...this.cptSelection.map((exp: any) => ({ ...exp })));
    }
    this.log({
      type: 'paste-explanations',
      line_num: this.selectedLineNum,
      line_content: this.model.code.split('\n')[this.selectedLineNum - 1],
      is_blank: this.selectedLine.blank,
      explanations: this.selectedLine.comments,
      selection: this.cptSelection,
    });
    this.cptLineNum = null;
    this.cptAction = null;
    this.cptSelection = [];
    this.reloadLineMarkers();
  }

  onExplanationDelete() {
    this.onExplanationDelete$(this.selection, () => this.selection = []);
  }

  onExplanationDelete$(selection: any, then?: () => void) {
    const explanations = this.selectedLine.comments;
    this.log({
      type: 'delete-explanations',
      line_num: this.selectedLineNum,
      line_content: this.model.code.split('\n')[this.selectedLineNum - 1],
      is_blank: this.selectedLine.blank,
      explanations,
      selection,
    });
    if (confirm('Are you sure you want to delete the selected explanations?')) {
      this.log({
        type: 'delete-explanations-confirmed',
        line_num: this.selectedLineNum,
        line_content: this.model.code.split('\n')[this.selectedLineNum - 1],
        is_blank: this.selectedLine.blank,
        explanations,
        selection,
      });
      selection.forEach((exp: any) => explanations.splice(explanations.indexOf(exp), 1));
      then?.();
      this.reloadLineMarkers();
    } else {
      this.log({
        type: 'delete-explanations-cancelled',
        line_num: this.selectedLineNum,
        line_content: this.model.code.split('\n')[this.selectedLineNum - 1],
        is_blank: this.selectedLine.blank,
        explanations,
        selection,
      });
    }
  }

  onDeleteExpDragOver($event: any) {
    $event.preventDefault();
    this.dragOverExpIdx = null;
  }

  onDeleteExpDragComplete($event: any) {
    const index = parseInt($event.dataTransfer.getData('index'));
    this.onExplanationDelete$([this.selectedLine.comments[index]]);
    this.dragOverExpIdx = null;
    this.expDragEnabled = false;
  }

  onGenHistoryDragOver($event: any) {
    $event.preventDefault();
    $event.dataTransfer.dropEffect = 'copy';
  }

  onGenHistoryDragComplete($event: any) {
    if ($event.dataTransfer.getData('index') == 'history-explanation-drag' && this.draggedGenHistory) {
      this.selectedLine.comments.push(...this.draggedGenHistory);
      this.reloadLineMarkers();
      this.log({
        type: 'history-explanations-dropped',
        line_num: this.selectedLineNum,
        line_content: this.model.code.split('\n')[this.selectedLineNum - 1],
        is_blank: this.selectedLine.blank,
        explanations: this.selectedLine.comments,
        dropped: this.draggedGenHistory,
      });
    }
  }

  hasBlankLine() {
    return Object.keys(this.model.lines).filter(ln => this.model.lines[ln].blank).length > 0;
  }

  addDistractor() {
    this.model.distractors.push({ code: '', description: '' });
    this.log({ type: 'add-distractor', distractors: this.model.distractors });
  }

  removeDistractor(distractor: any) {
    this.log({
      type: 'remove-distractor',
      index: this.model.distractors.indexOf(distractor),
      distractor,
      distractors: this.model.distractors,
    });
    if (confirm('Are you sure you want to remove this distractor?')) {
      this.log({
        type: 'remove-distractor-confirmed',
        index: this.model.distractors.indexOf(distractor),
        distractor,
        distractors: this.model.distractors,
      });
      this.model.distractors.splice(this.model.distractors.indexOf(distractor), 1);
    } else {
      this.log({
        type: 'remove-distractor-cancelled',
        index: this.model.distractors.indexOf(distractor),
        distractor,
        distractors: this.model.distractors,
      });
    }
  }

  gptGenExplanations() {
    const payload = {
      id: this.model.id,
      source: this.model.code,
      language: this.model.language,
      description: this.model.description,
      prompt: this.gptPrompt,
    };
    this.log({
      type: 'generate',
      line_num: this.selectedLineNum,
      line_content: this.model.code.split('\n')[this.selectedLineNum - 1],
      payload,
    });
    this.generating = true;
    this.http.post(
      `${environment.apiUrl}/gpt-genai`,
      payload, { withCredentials: true }
    ).subscribe(
      (resp: any) => {
        resp.forEach((e: any) => {
          e.explanations = e.explanations.map((e: any) => ({ content: e, gpt: e }));
        });

        this.log({
          type: 'generated',
          line_num: this.selectedLineNum,
          line_content: this.model.code.split('\n')[this.selectedLineNum - 1],
          explanations: resp,
        });

        this.generating = false;
        resp.forEach((each: any) => {
          this.gptGeneratedExps.push(...each.explanations);
          const lineNum = parseInt(each.line_num);
          const prev = lineNum in this.model.lines ? this.model.lines[lineNum] : null;
          this.model.lines[lineNum] = {
            ...(prev || { blank: false }),
            comments: [
              ...(prev && prev.comments ? prev.comments.filter((e: any) => e.content) : []),
              ...each.explanations,
            ],
          };
        });

        this.selectedLineNum = null; // force line-select
        this.selectLine(Math.min(...resp.map((e: any) => parseInt(e.line_num))));
        this.reloadHistory();
      },
      (error) => {
        this.generating = false;
        console.log(error);
      }
    );
  }

  reloadHistory() {
    this.log({ type: 'reload-histories' });
    this.http.get(
      `${environment.apiUrl}/gpt-genai/${this.model.id}`,
      { withCredentials: true }
    ).subscribe(
      (resp: any) => {
        this.log({ type: 'histories-reloaded', value: resp });
        this.gptHistoryTzs = resp;
        if (this.gptHistoryTzs.length > 0)
          this.loadHistory(this.gptHistoryTzs[0]);
      },
      (error) => console.log(error)
    );
  }

  loadHistory(timestamp: string) {
    this.log({
      type: 'load-history',
      line_num: this.selectedLineNum,
      line_content: this.model.code.split('\n')[this.selectedLineNum - 1],
      value: timestamp,
    });

    if (timestamp in this.gptHistoryExps) {
      this.gptCurrentTz = timestamp;
      this.useHistory(timestamp);
    } else {
      this.toggles[timestamp] = true;
      this.http.get(
        `${environment.apiUrl}/gpt-genai/${this.model.id}/${timestamp}`,
        { withCredentials: true }
      ).subscribe(
        (resp: any) => {
          delete this.toggles[timestamp];
          this.gptHistoryExps[timestamp] = resp;
          this.gptCurrentTz = timestamp;
          this.useHistory(timestamp);
        },
        (error) => console.log(error)
      );
    }
  }

  useHistory(timestamp: string) {
    const payload = this.gptHistoryExps[timestamp];
    this.gptHistorySrcLines = payload.params?.source?.split('\n');
    this.gptHistoryTzExps = payload.explanations;
    this.log({
      type: 'use-history',
      line_num: this.selectedLineNum,
      line_content: this.model.code.split('\n')[this.selectedLineNum - 1],
      timestamp,
      value: payload,
    });
  }

  onHistoryExpDragStart(el: any, $event: any, value: any, line_num?: number) {
    if (!this.historyExpDragEnabled)
      return;
    this.log({
      type: 'history-explanations-dragstart',
      line_num: line_num || value.line_num,
      value,
    });
    $event.stopPropagation();
    $event.dataTransfer.setData('index', 'history-explanation-drag');
    setTimeout(() => {
      // CHROME BUG: https://stackoverflow.com/questions/19639969/html5-dragend-event-firing-immediately
      this.draggedGenHistory = typeof value == 'string'
        ? [{ content: value, gpt: value }]
        : value.explanations.map((e: any) => ({ content: e, gpt: e }));
    }, 0);
    setTimeout(() => {
      const dropzone = document.querySelector('#gen-history-dropzone') as HTMLElement;
      dropzone.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 10);
  }

  onHistoryExpDragEnd(el: any, $event: any, value: any) {
    el.removeAttribute('draggable');
    this.historyExpDragEnabled = false;
    this.draggedGenHistory = null;
  }

  onHistoryShowAll($event: any) {
    this.log({ type: 'show-all-history', value: this.toggles['show-all-lines-' + this.selectedLineNum] });
  }

  back() {
    this.router.navigate(['/sources']);
  }

  update() {
    this.ignoreUntouchedLines();
    this.toggles['update'] = true;
    this.log({ type: 'updating', value: this.model });
    this.api.update(this.model).subscribe(
      (source: any) => {
        this.log({ type: 'updated', value: this.model });
        delete this.toggles['update'];
        this.router.navigate(['/sources']);

        setTimeout(() => this.genPreviewJson(() => { }), 1000);
      },
      (error: any) => {
        delete this.toggles['update'];
        console.log(error);
      }
    );
  }

  changeEditorLang() {
    if (this.lastValue == this.model.filename)
      return;

    let filename = this.model.filename || '.java';
    if (!filename.includes('.')) filename += '.java';

    const extension = `.${filename.split('.').pop()}`;
    const map: any = {
      '.c': 'C',
      '.cpp': 'CPP',
      '.cs': 'CSHARP',
      '.dart': 'DART',
      '.go': 'GO',
      '.java': 'JAVA',
      '.js': 'JAVASCRIPT',
      '.kt': 'KOTLIN',
      '.php': 'PHP',
      '.pl': 'PERL',
      '.py': 'PYTHON',
      '.r': 'R',
      '.rb': 'RUBY',
      '.rs': 'RUST',
      '.scala': 'SCALA',
      '.swift': 'SWIFT',
      '.ts': 'TYPESCRIPT',
    };

    this.model.filename = filename;
    this.model.language = extension in map ? map[extension] : 'unknown';

    this.setEditorsLang();
  }

  setEditorsLang() {
    const editorLang = this.model.language.toLowerCase();
    this.srcEditorOptions.language = editorLang;
    this.distEditorOptions.language = editorLang;
    this.langSet = false;
    setTimeout(() => (this.langSet = true), 0);
  }

  genPreviewJson(then: () => void) {
    this.ignoreUntouchedLines();
    const id = this.model.id;
    const items = [{ item$: { ...this.model, id: `${id}_example` }, type: 'example' }];
    const challenge = Object.keys(this.model.lines).filter(ln => this.model.lines[ln].blank);
    if (challenge) items.push({ item$: { ...this.model, id: `${id}_challenge` }, type: 'challenge' });

    this.toggles['preview'] = true;
    this.api.previewJsons[this.model.id] = 'generating';
    this.activities.genPreviewJson(
      { id: this.model.id, name: this.model.name, items },
      'activity'
    ).subscribe(
      (resp: any) => {
        delete this.toggles['preview'];
        delete this.api.previewJsons[this.model.id];
        then?.();
      },
      (error: any) => {
        delete this.toggles['preview'];
        console.log(error);
      }
    );
  }

  preview() {
    this.genPreviewJson(() => {
      this.previewLink = this.activities.previewJsonLink(this.model, 'activity');
      this.showPreview = true;
    });
  }

  placeholder(el: any, dflt: string) {
    const content = el.textContent?.trim();
    const content_lower = content?.toLowerCase();
    const defOrEmpty = content_lower == dflt.toLowerCase().trim() || !content_lower;
    el.innerHTML = defOrEmpty ? `<span class="text-gray-400 italic">${dflt}</span>` : content;
    return defOrEmpty ? '' : content;
  }

  onNameFocus($event: any) {
    this.lastValue = this.takeSnapshot(this.model.name);
    this.lastValueKeys = [];
    this.log({ type: 'name-focus', value: this.model.name });
  }

  onNameBlur($event: any) {
    this.ensureKeyChkpoint($event);
    this.log({
      type: 'name-blur',
      prev_value: this.lastValue,
      value: this.model.name,
      keys: this.lastValueKeys
    });
    this.lastValueKeys = null;
  }

  onDescriptionFocus($event: any) {
    this.lastValue = this.takeSnapshot(this.model.description);
    this.lastValueKeys = [];
    this.log({ type: 'description-focus', value: this.model.description });
  }

  onDescriptionBlur($event: any) {
    this.ensureKeyChkpoint($event);
    this.log({
      type: 'description-blur',
      prev_value: this.lastValue,
      value: this.model.description,
      keys: this.lastValueKeys
    });
    this.lastValueKeys = null;
  }

  onEditorFocus($event: any) {
    this.ensureKeyChkpoint($event);
    this.lastValue = this.takeSnapshot(this.model.code);
    this.lastValueKeys = [];
    this.log({ type: 'editor-focus', value: this.model.code });
  }

  onEditorBlur($event: any) {
    this.ensureKeyChkpoint($event);
    this.log({
      type: 'editor-blur',
      prev_value: this.lastValue,
      value: this.model.code,
      keys: this.lastValueKeys,
    });
    this.lastValueKeys = null;
  }

  onFilenameFocus($event: any) {
    this.lastValue = this.takeSnapshot(this.model.filename);
    this.lastValueKeys = [];
    this.log({ type: 'filename-focus', value: this.model.filename });
  }

  onFilenameBlur($event: any) {
    this.ensureKeyChkpoint($event);
    this.changeEditorLang();
    this.log({
      type: 'filename-blur',
      prev_value: this.lastValue,
      value: this.model.filename,
      keys: this.lastValueKeys
    });
    this.lastValueKeys = null;
  }

  onExplanationFocus($event: any, explanation: any, index: number) {
    this.lastValue = this.takeSnapshot(explanation);
    this.lastValueKeys = [];
    this.log({
      type: 'explanation-focus',
      line_num: this.selectedLineNum,
      line_content: this.model.code.split('\n')[this.selectedLineNum - 1],
      is_blank: this.selectedLine.blank,
      value: explanation,
      index,
    });
  }

  onExplanationBlur($event: any, explanation: any, index: number) {
    this.ensureKeyChkpoint($event);
    this.log({
      type: 'explanation-blur',
      line_num: this.selectedLineNum,
      line_content: this.model.code.split('\n')[this.selectedLineNum - 1],
      is_blank: this.selectedLine.blank,
      prev_value: this.lastValue,
      value: explanation,
      keys: this.lastValueKeys,
      index,
    });
    this.lastValueKeys = null;
  }

  toggleAnnotTips($event: any) {
    this.annotTipsCollapsed = !this.annotTipsCollapsed;
    this.log({
      type: 'annot-tips-collapse',
      line_num: this.selectedLineNum,
      line_content: this.model.code.split('\n')[this.selectedLineNum - 1],
      value: this.annotTipsCollapsed,
    });
  }

  toggleGptHistory($event: any) {
    this.toggles['show-gpt-history'] = !this.toggles['show-gpt-history'];
    this.log({
      type: 'show-gpt-history',
      line_num: this.selectedLineNum,
      line_content: this.model.code.split('\n')[this.selectedLineNum - 1],
      value: this.toggles['show-gpt-history'],
    });
  }

  toggleCustomGptPrompt($event: any) {
    this.toggles['show-gpt-prompt'] = !this.toggles['show-gpt-prompt'];
    this.log({
      type: 'show-gpt-prompt',
      line_num: this.selectedLineNum,
      line_content: this.model.code.split('\n')[this.selectedLineNum - 1],
      value: this.toggles['show-gpt-prompt'],
    });
  }

  onGptInclusionFocus($event: any) {
    this.lastValue = this.takeSnapshot(this.gptPrompt.inclusion);
    this.lastValueKeys = [];
    this.log({
      type: 'prompt-inclusion-focus',
      value: this.gptPrompt.inclusion,
    });
  }

  onGptInclusionBlur($event: any, el: any) {
    this.ensureKeyChkpoint($event);
    const inclusion = this.placeholder(el, this.gptDefInclusion);
    this.log({
      type: 'prompt-inclusion-blur',
      prev_value: this.lastValue,
      value: inclusion,
      keys: this.lastValueKeys
    });
    this.lastValueKeys = null;
    this.gptPrompt.inclusion = inclusion;
  }

  onGptExclusionFocus($event: any) {
    this.lastValue = this.takeSnapshot(this.gptPrompt.exclusion);
    this.lastValueKeys = [];
    this.log({
      type: 'prompt-exclusion-focus',
      value: this.gptPrompt.exclusion,
    });
  }

  onGptExclusionBlur($event: any, el: any) {
    this.ensureKeyChkpoint($event);
    const exclusion = this.placeholder(el, this.gptDefExclusion);
    this.log({
      type: 'prompt-exclusion-blur',
      prev_value: this.lastValue,
      value: exclusion,
      keys: this.lastValueKeys
    });
    this.lastValueKeys = null;
    this.gptPrompt.exclusion = exclusion;
  }

  onGptExplanationFocus($event: any) {
    this.lastValue = this.takeSnapshot(this.gptPrompt.explanation);
    this.lastValueKeys = [];
    this.log({
      type: 'prompt-explanation-focus',
      value: this.gptPrompt.explanation,
    });
  }

  onGptExplanationBlur($event: any, el: any) {
    this.ensureKeyChkpoint($event);
    this.log({
      type: 'prompt-explanation-blur',
      prev_value: this.lastValue,
      value: el.textContent?.trim(),
      keys: this.lastValueKeys
    });
    this.lastValueKeys = null;
    this.gptPrompt.explanation = el.textContent?.trim();
  }

  onDistractorFocus($event: any, distractor: any) {
    this.ensureKeyChkpoint($event);
    this.lastValue = this.takeSnapshot(distractor.code);
    this.lastValueKeys = [];
    this.log({
      type: 'distractor-focus',
      value: distractor.code,
      distractors: this.model.distractors,
      distractor,
      index: this.model.distractors.indexOf(distractor),
    });
  }

  onDistractorBlur($event: any, distractor: any) {
    this.ensureKeyChkpoint($event);
    this.log({
      type: 'distractor-blur',
      prev_value: this.lastValue,
      value: distractor.code,
      keys: this.lastValueKeys,
      distractors: this.model.distractors,
      distractor,
      index: this.model.distractors.indexOf(distractor),
    });
    this.lastValueKeys = null;
  }

  onDistractorDescFocus($event: any, distractor: any) {
    this.lastValue = this.takeSnapshot(distractor.description);
    this.lastValueKeys = [];
    this.log({
      type: 'distractor-description-focus',
      value: distractor.description,
      distractors: this.model.distractors,
      distractor,
      index: this.model.distractors.indexOf(distractor),
    });
  }

  onDistractorDescBlur($event: any, distractor: any) {
    this.ensureKeyChkpoint($event);
    this.log({
      type: 'distractor-description-blur',
      prev_value: this.lastValue,
      value: distractor.description,
      keys: this.lastValueKeys,
      distractors: this.model.distractors,
      distractor,
      index: this.model.distractors.indexOf(distractor),
    });
    this.lastValueKeys = null;
  }

  onProgInputFocus($event: any) {
    this.lastValue = this.takeSnapshot(this.model.programInput);
    this.lastValueKeys = [];
    this.log({
      type: 'program-input-focus',
      value: this.model.programInput,
    });
  }

  onProgInputBlur($event: any) {
    this.ensureKeyChkpoint($event);
    this.log({
      type: 'program-input-blur',
      prev_value: this.lastValue,
      value: this.model.programInput,
      keys: this.lastValueKeys,
    });
    this.lastValueKeys = null;
  }
}
