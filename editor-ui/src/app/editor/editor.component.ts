import { ActivatedRoute, Router } from '@angular/router';
import { ActivitiesService } from '../activities.service';
import { arrayMoveMutable } from 'array-move';
import { Component, Input, NgZone, OnDestroy, OnInit } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { environment } from '../../environments/environment';
import { getNavMenuBar } from '../utilities';
import { HttpClient } from '@angular/common/http';
import { Range } from 'monaco-editor';
import { SourcesService } from '../sources.service';
import { Title } from '@angular/platform-browser';
import { AppService } from '../app.service';

@Component({
  selector: 'app-editor',
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.less'],
})
export class EditorComponent implements OnInit, OnDestroy {

  getNavMenuBar = getNavMenuBar;

  @Input() language = 'java';

  // @ViewChild('feedbackOverlay') feedbackOverlayRef: any;

  srcEditorOptions = {
    language: this.language,
    theme: 'vs',
    fontSize: 12,
    minimap: { enabled: false },
    lineNumbersMinChars: 2,
    folding: false,
    glyphMargin: true,
    trimAutoWhitespace: false,
    tabSize: 4,
    scrollBeyondLastLine: false,
    automaticLayout: true,
    fixedOverflowWidgets: true,
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
  distractors: any = [];

  srcEditor: any;
  distEditors: any[] = [];

  selectedLineNum: any;
  selectedLine: any;
  decorations: any[] = [];

  expDragEnabled = false;
  dragOverExpIdx: any;

  dtime0 = Date.now();
  lastValue: any = null;

  targetLns = [];

  get titleDescCollapsed() { return localStorage.getItem('pcex.prefs.titleDescCollapsed') == 'true'; }
  set titleDescCollapsed(value) { localStorage.setItem('pcex.prefs.titleDescCollapsed', `${value}`); }

  get trackingMessageDismissed() { return localStorage.getItem('pcex-authoring.tracking') === 'dismissed'; }
  dismissTrackingMessage() {
    localStorage.setItem('pcex-authoring.tracking', 'dismissed');
    if (this._v['dont-collect-data'])
      this.log({ type: 'tracking-message-dismissed', collectdata: !this._v['dont-collect-data'] }, true);
  }

  GPT_CONF_PLACEHOLDER = JSON.stringify({
    model: "gpt-4o-mini",
    api_key: "<<YOUR_API_KEY>>",
    organization: "<<YOUR_ORGANIZATION>>",
    temperature: 0,
    max_tokens: 2048,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0
  }, null, 2);

  openAIGPTConfig: string = '';
  translation: any = {};

  _v: any = {
    'tabview': 0,
    'explanation-selection': [],
    'distractor-selection': [],
    'generated-explanations': [],
  };

  constructor(
    private ngZone: NgZone,
    private activities: ActivitiesService,
    private api: SourcesService,
    public router: Router,
    private route: ActivatedRoute,
    private title: Title,
    private http: HttpClient,
    private confirm: ConfirmationService,
    private messages: MessageService,
    public app: AppService,
  ) { }

  takeSnapshot(val: any) {
    return val ? JSON.parse(JSON.stringify(val)) : val;
  }

  log(event: any, force?: boolean) {
    if (!force && this._v['dont-collect-data'])
      return;

    event = { ...this.takeSnapshot(event), dtime: Date.now(), v: 'oct24' };
    event.since_dtime0 = event.dtime - this.dtime0;
    const log = {
      tries: 0,
      post: () => this.api.log(this.model.id, event).subscribe({
        next: (resp: any) => { },
        error: (err: any) => {
          if (log.tries++ < 5)
            setTimeout(log.post, log.tries * 1000);
        },
      })
    };
    log.post();
  }

  ngOnInit(): void {
    const params: any = this.route.snapshot.params;
    this.api.read(params.id).subscribe({
      next: (source: any) => {
        source.code = source.code || '';
        source.lines = source.lines || {};
        source.distractors = source.distractors || [];
        this.model = source;

        this.updateTitle();
        this.setEditorsLang();
        setTimeout(() => this.reloadLineMarkers(), 100);
        this.moh70FindUnDanglings();

        this.log({ type: 'model-loaded', value: this.model });
      },
      error: (err: any) => {
        this.messages.add({
          severity: 'error', summary: 'Error',
          detail: 'Failed to load the source',
        });
      },
    });

    // setTimeout(() => this.onSelectionChange(), 300);
  }

  ngOnDestroy(): void {
    this.log({ type: 'on-ui-destroy' });
  }

  updateTitle() {
    this.title.setTitle(`PCEX Authoring: ${this.model.name}`);
  }

  setupSourceEditor(editor: any) {
    this.srcEditor = editor;

    editor.onDidFocusEditorText(($event: any) => this.onEditorFocus($event));
    editor.onDidBlurEditorText(($event: any) => this.onEditorBlur($event));
    // editor.onKeyDown(($event: any) => this.recordKeys($event.browserEvent, 'keydown'));
    // editor.onKeyUp(($event: any) => this.recordKeys($event.browserEvent, 'keyup'));

    editor.onDidChangeCursorPosition(($event: any) => this.ngZone.run(() => {
      if (this.selectedLineNum != $event.position.lineNumber) {
        this.selectLine($event.position.lineNumber, false);
      }
    }));
    editor.onMouseDown(($event: any) => this.ngZone.run(() => {
      if ($event.target.type == 2 && this.selectedLineNum != $event.target.position.lineNumber) {
        this.selectLine($event.target.position.lineNumber);
      }
    }));

    this.setEditorsLang();
    setTimeout(() => this.ngZone.run(() => this.selectLine(1, false)), 0);
  }

  setupDistractorEditor(editor: any, distractor: any, index: number) {
    this.distEditors.push(editor);
    // this.setupAsSingleLineEditor(editor);

    editor.onDidFocusEditorText(($event: any) => this.onDistractorFocus($event, distractor, index));
    editor.onDidBlurEditorText(($event: any) => this.onDistractorBlur($event, distractor, index));
    // editor.onKeyDown(($event: any) => this.recordKeys($event.browserEvent, 'keydown'));
    // editor.onKeyUp(($event: any) => this.recordKeys($event.browserEvent, 'keyup'));
  }

  // private setupAsSingleLineEditor(editor: any) {
  //   // --------------->>
  //   // https://github.com/vikyd/vue-monaco-singleline/blob/1de219c2f1ddd89f6b473e43716bbb3dfb662542/src/monaco-singleline.vue#L150
  //   editor.addCommand(KeyMod.CtrlCmd | KeyCode.KeyF, () => { });
  //   editor.addCommand(KeyCode.Enter, () => editor.trigger('', 'acceptSelectedSuggestion'));
  //   editor.onDidPaste((e: any) => {
  //     if (e.endLineNumber <= 1)
  //       return;
  //     let content = '';
  //     const model = editor.getModel();
  //     const lc = model.getLineCount();
  //     for (let i = 0; i < lc; i += 1) content += model.getLineContent(i + 1);
  //     model.setValue(content);
  //     editor.setPosition({ column: content.length + 1, lineNumber: 1 });
  //   });
  //   editor.addCommand(KeyCode.F1, () => { });
  //   // <<---------------
  // }

  selectLine(lineNum: number, reveal = true, force = false) {
    if (this.selectedLineNum != lineNum || force) {
      this.selectedLineNum = lineNum;
      if (lineNum) {
        if (lineNum in this.model.lines == false)
          this.model.lines[lineNum] = { comments: [{}] };
        this.selectedLine = this.model.lines[lineNum];
      } else
        this.selectedLine = {};
      this._v['explanation-selection'] = [];
      delete this._v['selection'];
    }

    const lines = this.model.code.split('\n');
    if (reveal && lines.length) {
      const line = lines[lineNum - 1];
      const column = line.indexOf(`${line.trim().charAt(0)}`) + 1;
      this.srcEditor.revealLinesInCenter(lineNum, column);
      this.srcEditor.setPosition({ lineNumber: lineNum, column });
      this.srcEditor.focus();
    }

    this.reloadLineMarkers();
    this.reloadDistractors();

    this.log({ type: 'select-line', line_num: lineNum, line: this.selectedLine });
  }

  reloadDistractors() {
    this.distractors = this.model.distractors.filter((d: any) => d.line_number == this.selectedLineNum || this._v['show-all-distractors']);
  }

  reloadLineMarkers() {
    if (!this.srcEditor)
      return;
    this.srcEditor.deltaDecorations(this.decorations || [], []);
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
          className: `${this.selectedLineNum == ln ? 'line--current' : ''}`,
          glyphMarginClassName: `line__glyph${blank ? '--blank' : ''}${commented ? '--commented' : ''}`,
          stickiness: 1,
        },
      };
    };

    const filtered = Object.keys(this.model.lines)
      .map((ln) => parseInt(ln)).filter((ln) => ln <= lines.length);
    this.decorations = this.srcEditor.deltaDecorations([], filtered.map(createRange));
  }

  toggleBlankLine() {
    this.selectedLine.blank = !this.selectedLine.blank;
    this.reloadLineMarkers();
    this.log({
      type: 'toggle-blank-line',
      line_num: this.selectedLineNum,
      line: this.selectedLine,
      distractors: this.distractors,
    });
  }

  addExplanation() {
    this.selectedLine.comments.push({});
    this.reloadLineMarkers();
    this.log({
      type: 'add-explanation',
      line_num: this.selectedLineNum,
      line: this.selectedLine,
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
    if (fromIndex == toIndex)
      return;
    if ($event.altKey) {
      this.selectedLine.comments[toIndex].content += ' ' + (this.selectedLine.comments[fromIndex]?.content || '');
      this.selectedLine.comments[toIndex].gpt += ' ' + (this.selectedLine.comments[fromIndex]?.gpt || '');
      this.selectedLine.comments.splice(fromIndex, 1);
    } else {
      arrayMoveMutable(this.selectedLine.comments, fromIndex, toIndex);
    }
    this._v['t'] = Date.now();
    this.log({
      type: $event.altKey ? 'explanations-merged' : 'explanation-reordered',
      line_num: this.selectedLineNum,
      line: this.selectedLine,
      from_index: fromIndex,
      to_index: toIndex,
    });
  }

  onExplanationDragEnd(el: any, $event: any, index: number) {
    el.removeAttribute('draggable');
    this.expDragEnabled = false;
    this.dragOverExpIdx = null;
  }

  toggleSelection(type: string, item: any) {
    const select = this._v[`${type}-selection`].indexOf(item) == -1;
    if (select) this._v[`${type}-selection`].push(item);
    else this._v[`${type}-selection`].splice(this._v[`${type}-selection`].indexOf(item), 1);

    this.log({
      type: `${select ? '' : 'de'}select-${type}`,
      line_num: this.selectedLineNum,
      line: this.selectedLine,
      distractors: this.distractors,
      selection: this._v[`${type}-selection`],
      value: item,
    });
  }

  onSelectAll(type: string) {
    const list = type == 'distractor'
      ? this.model.distractors.filter((d: any) => d.line_number == this.selectedLineNum)
      : this.selectedLine.comments;

    const select = this._v[`all-${type}-selection`];
    this._v[`${type}-select`] = true;
    this._v[`${type}-selection`] = select ? [...list] : [];

    this.log({
      type: `${select ? '' : 'de'}select-all-${type}`,
      line_num: this.selectedLineNum,
      line: this.selectedLine,
      distractors: this.distractors,
      selection: this._v[`${type}-selection`],
    });
  }

  onMerge() {
    this.confirm.confirm({
      header: 'Confirm',
      message: 'Are you sure you want to merge the selected explanations?',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-plain',
      accept: () => {
        this.log({
          type: 'merge-explanations',
          line_num: this.selectedLineNum,
          line: this.selectedLine,
          selection: this._v['explanation-selection'],
        });

        const explanations = this.selectedLine.comments;
        for (let i = 1; i < this._v['explanation-selection'].length; i++) {
          this._v['explanation-selection'][0].content += ' ' + (this._v['explanation-selection'][i].content || '');
          this._v['explanation-selection'][0].gpt += ' ' + (this._v['explanation-selection'][i].gpt || '');
          explanations.splice(explanations.indexOf(this._v['explanation-selection'][i]), 1);
        }
        this._v['explanation-selection'] = [];
        delete this._v['selection'];
      }
    });
  }

  onMove(type: string, targetLn: any) {
    this.confirm.confirm({
      header: 'Confirm',
      message: `Are you sure you want to move the selected ${type}s?`,
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-plain',
      accept: () => {
        this.log({
          type: `move-${type}s`,
          line_num: this.selectedLineNum,
          line: this.selectedLine,
          distractors: this.distractors,
          selection: this._v[`${type}-selection`],
          target_ln: targetLn,
        });

        if (type == 'explanation') {
          const contents = this._v[`${type}-selection`].map((s: any) => s.content);
          this.selectedLine.comments = this.selectedLine.comments.filter((c: any) => !contents.includes(c.content));
          this.model.lines[targetLn] ||= {};
          this.model.lines[targetLn].comments ||= [];
          this._v[`${type}-selection`].forEach((s: any) => this.model.lines[targetLn].comments.push(s));
        } else if (type == 'distractor') {
          this._v[`${type}-selection`].forEach((s: any) => s.line_number = targetLn);
          this.model.lines[targetLn] ||= {};
          this.model.lines[targetLn].blank = true;
        }

        this._v[`${type}-selection`] = [];
        delete this._v[`all-${type}-selection`];
        delete this._v['move-selection'];

        this.selectLine(targetLn);
      }
    });
  }

  onDelete(type: string) {
    this.confirm.confirm({
      header: 'Confirm',
      message: `Are you sure you want to delete the selected ${type}s?`,
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-plain',
      accept: () => {
        this.log({
          type: `delete-${type}s`,
          line_num: this.selectedLineNum,
          line: this.selectedLine,
          distractors: this.distractors,
          selection: this._v[`${type}-selection`],
        });

        if (type == 'explanation') {
          this._v[`${type}-selection`].forEach((exp: any) =>
            this.selectedLine.comments.splice(this.selectedLine.comments.indexOf(exp), 1));
        } else if (type == 'distractor') {
          this._v[`${type}-selection`].forEach((dist: any) =>
            this.model.distractors.splice(this.model.distractors.indexOf(dist), 1));
        }

        this._v[`${type}-selection`] = [];
        delete this._v[`all-${type}-selection`];

        this.selectLine(this.selectedLineNum, true, true);
      }
    });
  }

  onDeleteExpDragOver($event: any) {
    $event.preventDefault();
    this.dragOverExpIdx = null;
  }

  onDeleteExpDragComplete($event: any) {
    const index = parseInt($event.dataTransfer.getData('index'));
    this.selectedLine.comments.splice(this.selectedLine.comments.indexOf(this.selectedLine.comments[index]), 1);
    this.dragOverExpIdx = null;
    this.expDragEnabled = false;
  }

  addDistractor() {
    this.model.distractors.push({ code: '', description: '', line_number: this.selectedLineNum });
    this.reloadDistractors();
    this.log({
      type: 'add-distractor',
      line_num: this.selectedLineNum,
      distractors: this.distractors,
    });
  }

  onFilenameBlur() {
    const filename = (this.model.filename || '').trim().toLowerCase();
    let language = 'TEXT';
    /**/ if (filename.endsWith('.java')) language = 'JAVA';
    else if (filename.endsWith('.py')) language = 'PYTHON';
    else if (filename.endsWith('.cpp')) language = 'CPP';
    else if (filename.endsWith('.c')) language = 'C';
    this.model.language = language;
    this.setEditorsLang();

    this.log({ type: 'filename-blur', value: this.model.filename });
  }

  setEditorsLang() {
    const language = this.model.language?.toLowerCase();
    const monaco = (window as any).monaco;
    if (!language || !monaco) return;

    const editors = [];
    if (this.srcEditor) editors.push(this.srcEditor);
    if (this.distEditors) editors.push(...this.distEditors);

    for (let editor of editors)
      monaco.editor.setModelLanguage(editor.getModel(), language);
  }

  onNameFocus($event: any) {
    this.lastValue = this.takeSnapshot(this.model.name);
    this.log({ type: 'name-focus', value: this.model.name });
  }

  onNameBlur($event: any) {
    this.log({ type: 'name-blur', value: this.model.name, prev_value: this.lastValue, });
  }

  onDescriptionFocus($event: any) {
    this.lastValue = this.takeSnapshot(this.model.description);
    this.log({ type: 'description-focus', value: this.model.description });
  }

  onDescriptionBlur($event: any) {
    this.log({ type: 'description-blur', value: this.model.description, prev_value: this.lastValue, });
  }

  addTag(event: any) {
    this.log({ type: 'add-tag', value: event.value });
  }

  removeTag(event: any) {
    this.log({ type: 'remove-tag', value: event.value });
  }

  onEditorFocus($event: any) {
    this.lastValue = this.takeSnapshot(this.model.code);
    this.log({ type: 'editor-focus', value: this.model.code });
  }

  onEditorBlur($event: any) {
    this.log({ type: 'editor-blur', value: this.model.code, prev_value: this.lastValue, });
    this.targetLns = this.model?.code
      ? this.model.code.split('\n').map((l: string, i: number) => ({ value: i + 1, label: `Ln ${i + 1}: ${l}` }))
      : [];
  }

  private findJavaMainClassName(codeSnippet: string) {
    let classMatch;
    while ((classMatch = /public\s+class\s+([A-Za-z_]\w*)/g.exec(codeSnippet)) !== null)
      return classMatch[1];
    return null;
  }

  onExplanationFocus($event: any, explanation: any, index: number) {
    this.lastValue = this.takeSnapshot(explanation);
    this.log({
      type: 'explanation-focus',
      line_num: this.selectedLineNum,
      line: this.selectedLine,
      index, value: explanation,
    });
  }

  onExplanationBlur($event: any, explanation: any, index: number) {
    this.log({
      type: 'explanation-blur',
      line_num: this.selectedLineNum,
      line: this.selectedLine,
      index, value: explanation,
      prev_value: this.lastValue,
    });
  }

  onDistractorFocus($event: any, distractor: any, index: number) {
    this.lastValue = this.takeSnapshot(distractor);
    this.log({
      type: 'distractor-editor-focus',
      line_num: this.selectedLineNum,
      distractors: this.distractors,
      value: distractor,
    });
  }

  onDistractorBlur($event: any, distractor: any, index: number) {
    this.log({
      type: 'distractor-editor-blur',
      line_num: this.selectedLineNum,
      distractors: this.distractors,
      value: distractor,
      prev_value: this.lastValue,
    });
  }

  onDistractorExpFocus($event: any, distractor: any, index: number) {
    this.lastValue = this.takeSnapshot(distractor.description);
    this.log({
      type: 'distractor-explanation-focus',
      line_num: this.selectedLineNum,
      distractors: this.distractors,
      value: distractor,
    });
  }

  onDistractorExpBlur($event: any, distractor: any, index: number) {
    this.log({
      type: 'distractor-explanation-blur',
      line_num: this.selectedLineNum,
      distractors: this.distractors,
      value: distractor,
      prev_value: this.lastValue,
    });
  }

  onProgInputFocus($event: any) {
    this.lastValue = this.takeSnapshot(this.model.programInput);
    this.log({
      type: 'program-input-focus',
      value: this.model.programInput,
    });
  }

  onProgInputBlur($event: any) {
    this.log({
      type: 'program-input-blur',
      value: this.model.programInput,
      prev_value: this.lastValue,
    });
  }

  ignoreUntouchedLines() {
    const count = this.model.code.split('\n').length;
    Object.keys(this.model.lines)
      .filter((ln) => {
        const line = this.model.lines[ln];
        return (parseInt(ln) > count ||
          (!line.blank && line.comments.filter((c: any) => c.content).length == 0));
      }).forEach((ln) => delete this.model.lines[ln]);
  }

  genPreviewJson(then: () => void) {
    this.ignoreUntouchedLines();
    const id = this.model.id;
    const items = [{ item$: { ...this.model, id: `${id}_example` }, type: 'example' }];
    const challenge = Object.keys(this.model.lines).filter(ln => this.model.lines[ln].blank);
    if (challenge) items.push({ item$: { ...this.model, id: `${id}_challenge` }, type: 'challenge' });

    this._v['preview'] = true;
    this.api.previewJsons[this.model.id] = 'generating';
    this.activities.genPreviewJson(
      { id: this.model.id, name: this.model.name, items },
      'activity'
    ).subscribe({
      next: (resp: any) => {
        delete this._v['preview'];
        delete this.api.previewJsons[this.model.id];
        then?.();
      },
      error: (err: any) => {
        delete this._v['preview'];
        console.log(err);
      }
    });
  }

  preview() {
    this.genPreviewJson(() => {
      this._v['preview-link'] = this.activities.previewJsonLink(this.model, 'activity');
      this._v['show-preview'] = true;
      this.log({ type: 'preview' });
    });
  }

  onIdentifyAndExplainLines() {
    this.onGenExplanations({
      type: 'generate:identify-and-explain',
      payload: {
        action: 'identify-and-explain',
        id: this.model.id,
        language: this.model.language,
        statement: this.model.description,
        solution: this.model.code,
      }
    });
  }

  onExplainLine(then?: () => void) {
    this.onGenExplanations({
      type: 'generate:explain-line',
      payload: {
        action: 'explain-line',
        line_number: this.selectedLineNum,
        id: this.model.id,
        language: this.model.language,
        statement: this.model.description,
        solution: this.model.code,
      },
      then,
    });
  }

  onGenExplanations({ type, payload, then }: any) {
    this._v[type] = true;
    this.http.post(`${environment.apiUrl}/gpt-genai`, payload, { withCredentials: true }).subscribe({
      next: (resp: any) => {
        this.log({ type, payload, explanations: resp, lines: this.model.lines });

        // merge generated explanations
        Object.keys(resp).forEach((ln) => {
          const line = this.model.lines[parseInt(ln)];
          const explanations = resp[ln].map((e: any) => ({ content: e, gpt: e }));
          this.model.lines[parseInt(ln)] = {
            ...(line || { blank: false }),
            comments: [
              ...(line?.comments ? line.comments.filter((e: any) => e.content) : []),
              ...explanations,
            ],
          };
          explanations.forEach((e: any) => this._v['generated-explanations'].push(e));
        });

        delete this._v[type];

        this.selectLine(this.selectedLineNum, true, true);
        then?.();
      },
      error: (error) => {
        this.log({ type, payload, error: error.error });

        if (error.status == 422) this.messages.add({
          severity: 'error', summary: 'Error',
          detail: error.error.message
        });

        delete this._v[type];
      }
    });
  }

  onGenDistExplanation(distractor: any, i: number) {
    const payload = {
      action: 'generate-distractor-explanation',
      id: this.model.id,
      language: this.model.language,
      statement: this.model.description,
      solution: this.model.code,
      line_number: this.selectedLineNum,
      distractor: distractor.code,
    };

    this._v['generate:distractor-explanation' + i] = true;
    this.http.post(`${environment.apiUrl}/gpt-genai`, payload, { withCredentials: true }).subscribe({
      next: ({ explanation }: any) => {
        this.log({ type: 'generate:distractor-explanation', payload, explanation });

        distractor.description = explanation;

        delete this._v['generate:distractor-explanation' + i];
      },
      error: (error) => {
        this.log({ type: 'generate:distractor-explanation', payload, error: error.error });

        if (error.status == 422) this.messages.add({
          severity: 'error', summary: 'Error',
          detail: error.error.message
        });

        delete this._v['generate:distractor-explanation' + i];
      }
    });
  }

  onGenDistractors(then?: () => void) {
    const payload = {
      action: 'generate-distractors',
      id: this.model.id,
      language: this.model.language,
      statement: this.model.description,
      solution: this.model.code,
      line_number: this.selectedLineNum,
      n_distractors: '',
    };

    this._v['generate:distractors'] = true;
    this.http.post(`${environment.apiUrl}/gpt-genai`, payload, { withCredentials: true }).subscribe({
      next: (resp: any) => {
        this.log({ type: 'generate:distractors', payload, distractors: resp, list: this.distractors });

        // merge generated explanations
        Object.keys(resp).forEach((ln) => {
          const line = this.model.lines[parseInt(ln)];
          resp[ln].forEach((d: any) => {
            this.model.distractors.push({
              line_number: parseInt(ln),
              code: d.distractor,
              description: d.explanation,
              gpt: d,
            });
          });
        });

        delete this._v['generate:distractors'];

        this.selectLine(this.selectedLineNum, true, true);
        then?.();
      },
      error: (error) => {
        this.log({ type: 'generate:distractors', payload, error: error.error });

        if (error.status == 422) this.messages.add({
          severity: 'error', summary: 'Error',
          detail: error.error.message
        });

        delete this._v['generate:distractors'];
      }
    });
  }

  back() {
    this.router.navigate(['/sources']);
  }

  update() {
    this.ignoreUntouchedLines();
    this._v['update'] = true;
    this.api.update(this.model).subscribe({
      next: (source: any) => {
        this.log({ type: 'updated', value: this.model });
        delete this._v['update'];
        this.router.navigate(['/sources']);
        setTimeout(() => this.genPreviewJson(() => { }), 1000);
      },
      error: (err: any) => {
        this.log({ type: 'update-failed', value: this.model });

        this.messages.add({
          severity: 'error', summary: 'Error',
          detail: err.error.message
        });

        delete this._v['update'];
      }
    });
  }

  resetOpenAIGPTConfig() {
    this.openAIGPTConfig = this.GPT_CONF_PLACEHOLDER.replace('<<YOUR_API_KEY>>', '').replace('<<YOUR_ORGANIZATION>>', '');
  }

  loadOpenAIGPTConfig(then?: () => void) {
    this.api.loadGptConfig().subscribe({
      next: (config: any) => {
        config = config?.value || {};
        this.resetOpenAIGPTConfig();
        this.translation = {
          target_language: config.target_language,
          translate_classes: config.translate_classes,
          translate_functions: config.translate_functions,
          translate_variables: config.translate_variables,
          translate_strings: config.translate_strings,
          translate_comments: config.translate_comments,
        };
        delete config.target_language;
        delete config.translate_classes;
        delete config.translate_functions;
        delete config.translate_variables;
        delete config.translate_strings;
        delete config.translate_comments;
        this.openAIGPTConfig = JSON.stringify(config, null, 2);
        if (then) then();
        else this._v['show-gpt-config'] = true;
      },
      error: (err: any) => this.messages.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load OpenAI-GPT configuration'
      }),
    });
  }

  saveOpenAIGPTConfig(then?: () => void) {
    const config = {
      ...JSON.parse(this.openAIGPTConfig),
      ...this.translation
    };
    this.api.setGptConfig(config).subscribe({
      next: (resp: any) => {
        this.log({ type: 'gpt-config-saved', value: config });
        if (then) then();
        else this.messages.add({
          severity: 'success',
          summary: 'Success',
          detail: 'OpenAI-GPT configuration saved successfully'
        });
      },
      error: (err: any) => {
        this.log({ type: 'gpt-config-save-failed', value: config });
        this.messages.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to save OpenAI-GPT configuration'
        });
      },
      complete: () => delete this._v['show-gpt-config']
    });
  }

  openTranslateDialog() {
    this.loadOpenAIGPTConfig(() => {
      this._v['translate'] = true;
    });
  }

  translate() {
    this._v['translate'] = 'loading';
    const payload = {
      action: 'translate-model',
      id: this.model.id, model: this.model,
      translation: this.translation,
    };

    this.log({ type: 'generate:translate-model', payload });
    this.http.post(`${environment.apiUrl}/gpt-genai`, payload, { withCredentials: true }).subscribe({
      next: (resp: any) => {
        this.log({ type: 'generate:translate-model', payload: { ...payload, translated: resp } });
        this.model = resp;

        this.saveOpenAIGPTConfig(() => { /* this will avoid saveOpenAIGPTConfig's toast message */ });
        setTimeout(() => this.selectLine(this.selectedLineNum, true, true), 300);

        this.messages.add({ severity: 'success', summary: 'Success', detail: 'Source translated successfully' });
      },
      error: (error) => {
        this.log({ type: 'generate:translate-model', payload, error: error.error });

        if (error.status == 422) this.messages.add({
          severity: 'error', summary: 'Error',
          detail: error.error.message
        });
      },
      complete: () => delete this._v['translate']
    });
  }

  // onSelectionChange() {
  //   let timeout: any = null;
  //   window.addEventListener('selectionchange', ($event) => {
  //     if (timeout) clearTimeout(timeout);
  //     // timeout = setTimeout(() => this.showOverlayOnSelection(
  //     //   this.feedbackOverlayRef, $event), 300);
  //   });
  // }

  // showOverlayOnSelection(overlay: any, $event: any) {
  //   const selection = window.getSelection();
  //   if (!selection
  //     || selection.rangeCount == 0
  //     || selection.toString().length == 0
  //   ) { return; }

  //   const selected = selection.toString();
  //   console.log('-------------------');
  //   console.log(selected);
  //   console.log($event.target);
  //   overlay.show($event);
  // }

  moh70Generate() {
    this._v['moh70-generate'] = true;

    const lines2Explain = Object.keys(this.model.lines).filter((ln: any) =>
      this.model.lines[ln].comments.length > 0 &&
      this.model.lines[ln].comments.filter((c: any) => c.content?.trim() == '// TODO: generate').length > 0
    ).map(ln => parseInt(ln));
    const lines2Distractor = Object.keys(this.model.lines).filter((ln: any) =>
      this.model.lines[ln].blank &&
      this.model.distractors.filter((d: any) => d.line_number == parseInt(ln)).length == 0
    ).map(ln => parseInt(ln));

    const distractorNextLine = (i: number) => {
      this.selectLine(lines2Distractor[i], true, true);
      setTimeout(() => {
        this.onGenDistractors(() => {
          if (i + 1 < lines2Distractor.length)
            distractorNextLine(i + 1);
          else {
            delete this._v['moh70-generate'];
            alert('MOH-70 generation completed!');
          }
        });
      }, 300);
    }

    const explainNextLine = (i: number) => {
      this.selectLine(lines2Explain[i], true, true);
      setTimeout(() => {
        this.onExplainLine(() => {
          if (i + 1 < lines2Explain.length)
            explainNextLine(i + 1);
          else if (lines2Distractor.length) {
            this._v['tabview'] = 1;
            distractorNextLine(0);
          } else {
            delete this._v['moh70-generate'];
            alert('MOH-70 generation completed!');
          }
        });
      }, 300);
    }

    if (lines2Explain.length)
      explainNextLine(0);
    else if (lines2Distractor.length) {
      this._v['tabview'] = 1;
      distractorNextLine(0);
    } else {
      delete this._v['moh70-generate'];
      alert('No lines to explain or add distractors!');
    }
  }

  moh70RemoveTodoMarkers() {
    this.model.tags = this.model.tags?.filter((t: string) => t != 'done!') || [];

    Object.keys(this.model.lines).forEach(ln => {
      const line = this.model.lines[ln];
      line.comments = line.comments.filter((c: any) => c.content?.trim() != '// TODO: generate');
    });

    this.model.archived = false;
  }

  moh70FindUnDanglings() {
    const dang_Exps = new Set<string>();
    const dang_Dists = new Set<string>();
    Object.keys(this.model.lines).filter(ln => {
      const line = this.model.lines[ln];
      const todo = line.comments.filter((c: any) => c.content?.trim() == '// TODO: generate');
      const dists = this.model.distractors.filter((d: any) => d.line_number == parseInt(ln));
      if (todo.length > 0 && line.comments.length == 1)
        dang_Exps.add(ln);
      if (line.blank && dists.length == 0)
        dang_Dists.add(ln);
    });
    this._v['moh70-dangling-explanations'] = Array.from(dang_Exps).map(ln => parseInt(ln));
    this._v['moh70-dangling-distractors'] = Array.from(dang_Dists).map(ln => parseInt(ln));
  }
}
