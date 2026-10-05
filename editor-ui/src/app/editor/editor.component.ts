import { ActivatedRoute, Router } from '@angular/router';
import { ActivitiesService } from '../activities.service';
import { arrayMoveMutable } from 'array-move';
import { ChangeDetectorRef, Component, Input, NgZone, OnDestroy, OnInit } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { environment } from '../../environments/environment';
import { getNavMenuBar, getTagLabel, getTagClass, getTagStyle } from '../utilities';
import { HttpClient } from '@angular/common/http';
import { Range } from 'monaco-editor';
import { SourcesService } from '../sources.service';
import { Title } from '@angular/platform-browser';
import { AppService } from '../app.service';

import { isoLanguages } from '../iso-languages';

@Component({
  selector: 'app-editor',
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.less'],
})
export class EditorComponent implements OnInit, OnDestroy {

  getNavMenuBar = getNavMenuBar;
  getTagLabel = getTagLabel;
  getTagClass = getTagClass;
  getTagStyle = getTagStyle;
  isoLanguages = isoLanguages;

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

  translationRows: any[] = [];
  allSources: any[] = [];

  get blankLineCount(): number {
    if (!this.model?.lines) return 0;
    return Object.keys(this.model.lines).filter(ln => this.model.lines[ln]?.blank).length;
  }

  get distractorCount(): number {
    return this.model?.distractors?.length || 0;
  }

  get titleDescCollapsed() { return localStorage.getItem('pcex.prefs.titleDescCollapsed') == 'true'; }
  set titleDescCollapsed(value) { localStorage.setItem('pcex.prefs.titleDescCollapsed', `${value}`); }

  get trackingMessageDismissed() { return localStorage.getItem('pcex-authoring.tracking') == 'dismissed'; }
  dismissTrackingMessage() {
    localStorage.setItem('pcex-authoring.tracking', 'dismissed');
    localStorage.setItem('pcex-authoring.tracking.dont-collect-data', this._v['dont-collect-data']);
    if (this._v['dont-collect-data']) this.log({
      type: 'tracking-message-dismissed',
      collectdata: !this._v['dont-collect-data']
    }, true);
  }

  defaultGptConfig: { model: string, baseURL: string } = {
    model: "qwen3.5:397b-cloud",
    baseURL: "https://ollama.com/v1"
  };
  modelHasChanged = false;
  outdatedModel: string = '';
  modelResetSuccess = false;

  get gptConfigPlaceholder(): string {
    return JSON.stringify({
      model: this.defaultGptConfig?.model || "qwen3.5:397b-cloud",
      baseURL: this.defaultGptConfig?.baseURL || "https://ollama.com/v1",
      // apiKey: "<<YOUR_API_KEY>>",
      // organization: "<<YOUR_ORGANIZATION>>",
    }, null, 2);
  }

  get GPT_CONF_PLACEHOLDER(): string {
    return this.gptConfigPlaceholder;
  }

  openAIGPTConfig: string = '';
  translation: any = {};

  viewUntranslated = false;

  _v: any = {
    'tabview': 0,
    'explanation-selection': [],
    'distractor-selection': [],
    'generated-explanations': [],
  };

  thinkingStartTime = 0;

  thinkingState = {
    active: false,
    hasThinking: false,
    text: '',
    streamedContent: '',
    elapsedSeconds: 0,
    thoughtSeconds: 0,
    finishedThinking: false,
    expanded: false,
    timer: null as any,
    actionLabel: 'Generating...',
    totalTokens: 0,
    tokensPerSec: '0',
    lastSnippet: '',
    serverUsage: null as any,
  };

  updateTokenMetrics(serverUsage?: any) {
    if (!this.thinkingStartTime) return;
    if (serverUsage) {
      this.thinkingState.serverUsage = serverUsage;
    }
    const usage = this.thinkingState.serverUsage;
    const elapsedMs = performance.now() - this.thinkingStartTime;
    this.thinkingState.elapsedSeconds = Math.max(1, Math.floor(elapsedMs / 1000));

    if (usage?.completion_tokens) {
      this.thinkingState.totalTokens = usage.completion_tokens;
    } else {
      // Calculate from cumulative characters to avoid chunk fragmentation rounding bias:
      // In BPE tokenizers (OpenAI, Qwen, GLM), 1 token is ~3.8-4 characters of text/code.
      const totalChars = (this.thinkingState.text?.length || 0) + (this.thinkingState.streamedContent?.length || 0);
      this.thinkingState.totalTokens = Math.round(totalChars / 3.8);
    }

    const elapsedSec = Math.max(0.5, elapsedMs / 1000);
    if (this.thinkingState.totalTokens > 0) {
      this.thinkingState.tokensPerSec = (this.thinkingState.totalTokens / elapsedSec).toFixed(1);
    }
  }

  startThinking(actionLabel: string) {
    if (this.thinkingState.timer) {
      clearInterval(this.thinkingState.timer);
    }
    this.thinkingStartTime = performance.now();
    this.thinkingState = {
      active: true,
      hasThinking: false,
      text: '',
      streamedContent: '',
      elapsedSeconds: 0,
      thoughtSeconds: 0,
      finishedThinking: false,
      expanded: false,
      timer: setInterval(() => {
        this.ngZone.run(() => {
          this.updateTokenMetrics();
          this.cdr.markForCheck();
        });
      }, 500),
      actionLabel,
      totalTokens: 0,
      tokensPerSec: '0',
      lastSnippet: '',
      serverUsage: null,
    };
    this.cdr.markForCheck();
  }

  onUsage(usage: any) {
    this.updateTokenMetrics(usage);
    this.cdr.markForCheck();
  }

  onThinkingProgress(text: string) {
    this.thinkingState.hasThinking = true;
    this.thinkingState.text += text;
    this.updateTokenMetrics();
    const clean = this.thinkingState.text.replace(/[\r\n\t]+/g, ' ').trim();
    if (clean) {
      this.thinkingState.lastSnippet = clean.length > 70 ? '...' + clean.slice(-70) : clean;
    }
    this.scrollThinkingToBottom();
    this.cdr.markForCheck();
  }

  onContentProgress(text?: string) {
    if (this.thinkingState.hasThinking && !this.thinkingState.finishedThinking) {
      this.thinkingState.finishedThinking = true;
      this.thinkingState.thoughtSeconds = this.thinkingState.elapsedSeconds;
    }
    if (text) {
      this.thinkingState.streamedContent += text;
      this.updateTokenMetrics();
      const clean = text.replace(/[\r\n\t]+/g, ' ').trim();
      if (clean) {
        this.thinkingState.lastSnippet = clean.length > 70 ? '...' + clean.slice(-70) : clean;
      }
      if (!this.thinkingState.hasThinking) {
        this.scrollThinkingToBottom();
      }
    }
    this.cdr.markForCheck();
  }

  stopThinking(finalUsage?: any) {
    if (this.thinkingState.timer) {
      clearInterval(this.thinkingState.timer);
      this.thinkingState.timer = null;
    }
    this.thinkingState.active = false;
    if (this.thinkingState.hasThinking && !this.thinkingState.thoughtSeconds) {
      this.thinkingState.thoughtSeconds = this.thinkingState.elapsedSeconds;
    }
    this.updateTokenMetrics(finalUsage);
    this.cdr.markForCheck();
  }

  closeThinkingBanner() {
    if (this.thinkingState.timer) {
      clearInterval(this.thinkingState.timer);
      this.thinkingState.timer = null;
    }
    this.thinkingStartTime = 0;
    this.thinkingState.active = false;
    this.thinkingState.hasThinking = false;
    this.thinkingState.text = '';
    this.thinkingState.streamedContent = '';
    this.thinkingState.expanded = false;
    this.thinkingState.lastSnippet = '';
    this.thinkingState.totalTokens = 0;
    this.thinkingState.tokensPerSec = '0';
    this.thinkingState.serverUsage = null;
    this.cdr.markForCheck();
  }

  scrollThinkingToBottom() {
    setTimeout(() => {
      const box = document.querySelector('#thinking-box');
      if (box) box.scrollTop = box.scrollHeight;
      const preview = document.querySelector('#thinking-preview');
      if (preview) preview.scrollTop = preview.scrollHeight;
    }, 30);
  }

  async streamGenAI(payload: any, callbacks: {
    onProgress: (event: any) => void,
    onDone: (result: any) => void,
    onError: (error: any) => void
  }) {
    try {
      const response = await fetch(`${environment.apiUrl}/gpt-genai?stream=true`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errData: any = {};
        try {
          errData = await response.json();
        } catch {
          errData = { message: response.statusText };
        }
        this.ngZone.run(() => {
          callbacks.onError({ status: response.status, error: errData });
          this.cdr.markForCheck();
        });
        return;
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let receivedDone = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const jsonStr = trimmed.slice(6);
          try {
            const msg = JSON.parse(jsonStr);
            if (msg.event === 'progress') {
              this.ngZone.run(() => {
                callbacks.onProgress(msg);
                this.cdr.markForCheck();
              });
            } else if (msg.event === 'done') {
              receivedDone = true;
              this.ngZone.run(() => {
                callbacks.onDone(msg.result);
                this.cdr.markForCheck();
              });
            } else if (msg.event === 'error') {
              this.ngZone.run(() => {
                callbacks.onError({ status: 422, error: { message: msg.error } });
                this.cdr.markForCheck();
              });
            }
          } catch (e) {
            console.warn('Failed to parse SSE line:', trimmed, e);
          }
        }
      }

      if (buffer.trim().startsWith('data: ')) {
        const jsonStr = buffer.trim().slice(6);
        try {
          const msg = JSON.parse(jsonStr);
          if (msg.event === 'done' && !receivedDone) {
            this.ngZone.run(() => {
              callbacks.onDone(msg.result);
              this.cdr.markForCheck();
            });
          } else if (msg.event === 'error') {
            this.ngZone.run(() => {
              callbacks.onError({ status: 422, error: { message: msg.error } });
              this.cdr.markForCheck();
            });
          }
        } catch (e) {}
      }
    } catch (err: any) {
      this.ngZone.run(() => {
        callbacks.onError({ status: 500, error: { message: err?.message || String(err) } });
        this.cdr.markForCheck();
      });
    }
  }

  parsePartialLineExplanations(str: string): { [ln: string]: string[] } {
    const result: { [ln: string]: string[] } = {};
    let i = 0;
    const len = str.length;

    while (i < len) {
      const keyMatch = str.slice(i).match(/"(?:Line\s*|line\s*)?(\d+)"\s*:\s*\[/i);
      if (!keyMatch || keyMatch.index === undefined) break;

      const lineNum = keyMatch[1];
      i = i + keyMatch.index + keyMatch[0].length;

      const explanations: string[] = [];
      let inArray = true;

      while (i < len && inArray) {
        while (i < len && (str[i] === ' ' || str[i] === '\t' || str[i] === '\r' || str[i] === '\n' || str[i] === ',')) {
          i++;
        }
        if (i >= len) break;

        if (str[i] === ']') {
          i++;
          inArray = false;
          break;
        }

        if (str[i] === '"') {
          i++;
          let strVal = '';
          let escaped = false;
          while (i < len) {
            const ch = str[i];
            if (escaped) {
              strVal += '\\' + ch;
              escaped = false;
              i++;
            } else if (ch === '\\') {
              escaped = true;
              i++;
            } else if (ch === '"') {
              i++;
              break;
            } else {
              strVal += ch;
              i++;
            }
          }
          try {
            explanations.push(JSON.parse(`"${strVal}"`));
          } catch {
            explanations.push(strVal.replace(/\\"/g, '"').replace(/\\\\/g, '\\').replace(/\\n/g, '\n'));
          }
        } else {
          break;
        }
      }

      if (explanations.length > 0) {
        result[lineNum] = explanations;
      }
    }

    return result;
  }

  parsePartialDistExplanation(str: string): string | null {
    const keyMatch = str.match(/"explanation"\s*:\s*"/);
    if (!keyMatch || keyMatch.index === undefined) return null;
    let i = keyMatch.index + keyMatch[0].length;
    const len = str.length;
    let val = '';
    let escaped = false;
    while (i < len) {
      const ch = str[i];
      if (escaped) {
        val += '\\' + ch;
        escaped = false;
        i++;
      } else if (ch === '\\') {
        escaped = true;
        i++;
      } else if (ch === '"') {
        break;
      } else {
        val += ch;
        i++;
      }
    }
    try {
      return JSON.parse(`"${val}"`);
    } catch {
      return val.replace(/\\"/g, '"').replace(/\\\\/g, '\\').replace(/\\n/g, '\n');
    }
  }

  parsePartialDistractors(str: string): { [ln: string]: any[] } {
    const result: { [ln: string]: any[] } = {};
    let i = 0;
    const len = str.length;

    const decodeJsonStr = (val: string) => {
      try {
        return JSON.parse(`"${val}"`);
      } catch {
        return val.replace(/\\"/g, '"').replace(/\\\\/g, '\\').replace(/\\n/g, '\n');
      }
    };

    while (i < len) {
      const keyMatch = str.slice(i).match(/"(?:Line\s*|line\s*)?(\d+)"\s*:\s*\[/i);
      if (!keyMatch || keyMatch.index === undefined) break;

      const lineNum = keyMatch[1];
      i = i + keyMatch.index + keyMatch[0].length;

      const items: any[] = [];
      let inLineArray = true;

      while (i < len && inLineArray) {
        while (i < len && str[i] !== '{' && str[i] !== ']') {
          i++;
        }
        if (i >= len) break;
        if (str[i] === ']') {
          i++;
          inLineArray = false;
          break;
        }

        i++; // skip '{'
        let distractorVal = '';
        let explanationVal = '';
        let hasDist = false;
        let hasExp = false;

        let braceDepth = 1;
        let inString = false;
        let escaped = false;
        let currentKey = '';
        let capturingVal = false;
        let currentVal = '';

        while (i < len && braceDepth > 0) {
          const ch = str[i];

          if (inString) {
            if (escaped) {
              currentVal += '\\' + ch;
              escaped = false;
              i++;
            } else if (ch === '\\') {
              escaped = true;
              i++;
            } else if (ch === '"') {
              inString = false;
              i++;
              if (capturingVal) {
                if (currentKey === 'distractor') {
                  distractorVal = decodeJsonStr(currentVal);
                  hasDist = true;
                } else if (currentKey === 'explanation') {
                  explanationVal = decodeJsonStr(currentVal);
                  hasExp = true;
                }
                capturingVal = false;
                currentKey = '';
                currentVal = '';
              } else {
                currentKey = currentVal;
                currentVal = '';
              }
            } else {
              currentVal += ch;
              i++;
            }
          } else {
            if (ch === '"') {
              inString = true;
              currentVal = '';
              i++;
            } else if (ch === ':') {
              if (currentKey === 'distractor' || currentKey === 'explanation') {
                capturingVal = true;
              }
              i++;
            } else if (ch === '{') {
              braceDepth++;
              i++;
            } else if (ch === '}') {
              braceDepth--;
              i++;
              if (braceDepth === 0) break;
            } else {
              i++;
            }
          }
        }

        if (inString && capturingVal) {
          if (currentKey === 'distractor') {
            distractorVal = decodeJsonStr(currentVal);
            hasDist = true;
          } else if (currentKey === 'explanation') {
            explanationVal = decodeJsonStr(currentVal);
            hasExp = true;
          }
        }

        if (hasDist || hasExp) {
          items.push({
            distractor: distractorVal,
            explanation: explanationVal
          });
        }
      }

      if (items.length > 0) {
        result[lineNum] = items;
      }
    }

    return result;
  }

  constructor(
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
    private activities: ActivitiesService,
    private api: SourcesService,
    public router: Router,
    private route: ActivatedRoute,
    private title: Title,
    private http: HttpClient,
    private confirm: ConfirmationService,
    private messages: MessageService,
    public app: AppService,
  ) {
    this._v['dont-collect-data'] = localStorage.getItem('pcex-authoring.tracking.dont-collect-data') == 'true';
  }

  takeSnapshot(val: any) {
    return val ? JSON.parse(JSON.stringify(val)) : val;
  }

  log(event: any, force?: boolean) {
    if (this._v['dont-collect-data'] && !force)
      return;

    event = {
      ...this.takeSnapshot(event),
      author: this.app.user.email,
      dtime: Date.now(),
      v: 'oct24',
    };
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
        this._v['allow-untranslated-view'] = !!source.untr_name || !!source.untr_description;

        this.model = source;

        this.updateTitle();
        this.setEditorsLang();
        setTimeout(() => this.reloadLineMarkers(), 100);
        this.moh70FindUnDanglings();

        this.log({ type: 'model-loaded', value: this.model });

        this.translationRows = Object.entries(source.translations || {}).map(([iso, id]) => ({ iso, id }));
        this.mergeTranslationsIntoSources();
      },
      error: (err: any) => {
        this.messages.add({
          severity: 'error', summary: 'Error',
          detail: 'Failed to load the source',
        });
      },
    });

    // setTimeout(() => this.onSelectionChange(), 300);

    this.api.sources({}).subscribe({
      next: (sources: any) => {
        this.allSources = sources.map((s: any) => ({
          ...s,
          iso: s.iso_language_code,
          _filter_details: `${s.name} ${s.description} ${s.user} ${s.tags?.join(' ') || ''} ${s.collaborator_emails?.join(' ') || ''}`.toLowerCase()
        }));
        this.mergeTranslationsIntoSources();
      }
    });

    this.checkGptConfig();
  }

  ngOnDestroy(): void {
    if (this.thinkingState.timer) {
      clearInterval(this.thinkingState.timer);
    }
    this.log({ type: 'on-ui-destroy' });
  }

  updateTitle() {
    this.title.setTitle(`WEAT: ${this.model.name}`);
  }

  setupSourceEditor(editor: any) {
    this.srcEditor = editor;

    editor.onDidFocusEditorText(($event: any) => this.onEditorFocus($event));
    editor.onDidBlurEditorText(($event: any) => this.onEditorBlur($event));
    // editor.onKeyDown(($event: any) => this.recordKeys($event.browserEvent, 'keydown'));
    // editor.onKeyUp(($event: any) => this.recordKeys($event.browserEvent, 'keyup'));

    editor.onDidChangeCursorPosition(($event: any) => this.ngZone.run(() => {
      if (this._v['viewing-untranslated']) {
        this.reloadLineMarkers();
        return;
      }

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
    this.distEditors = this.distEditors.filter(e => e.distractor != distractor);
    this.distEditors.push({ distractor, editor });
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
    else if (filename.endsWith('.sql')) language = 'SQL';
    else if (filename.endsWith('.asm') || filename.endsWith('.s')) language = 'ASM';
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
    if (this.distEditors) editors.push(...this.distEditors.map(e => e.editor));

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
    if (this.modelHasChanged) {
      this.messages.add({
        severity: 'warn',
        summary: 'Model Reset Required',
        detail: `The default model has changed to '${this.defaultGptConfig.model}'. Please click 'RESET' in the configuration dialog to update before generating.`,
        life: 10000,
      });
      this.loadOpenAIGPTConfig();
      return;
    }

    this._v[type] = true;
    this.startThinking(type === 'explain-line' ? `Explaining line ${payload.line_number}...` : 'Generating explanations...');

    const initialCommentsByLine: { [ln: number]: any[] } = {};
    const streamCommentsByLine: { [ln: number]: any[] } = {};
    Object.keys(this.model.lines || {}).forEach((lnStr) => {
      const ln = parseInt(lnStr);
      initialCommentsByLine[ln] = (this.model.lines[ln]?.comments || []).filter((e: any) => e.content);
    });

    let accumulatedContent = '';

    this.streamGenAI(payload, {
      onProgress: (event: any) => {
        if (event.type === 'thinking') {
          this.onThinkingProgress(event.text || '');
        } else if (event.type === 'content') {
          this.onContentProgress(event.text);
          accumulatedContent += (event.text || '');
          const partial = this.parsePartialLineExplanations(accumulatedContent);
          Object.keys(partial).forEach((lnStr) => {
            const ln = parseInt(lnStr.replace(/\D+/g, ''), 10);
            if (!ln) return;
            if (!this.model.lines[ln]) {
              this.model.lines[ln] = { blank: false, comments: [] };
            }
            const line = this.model.lines[ln];
            const initial = initialCommentsByLine[ln] || [];
            if (!streamCommentsByLine[ln]) {
              streamCommentsByLine[ln] = [];
            }
            const streamList = streamCommentsByLine[ln];
            const exps = partial[lnStr];
            exps.forEach((expText: string, idx: number) => {
              if (!streamList[idx]) {
                const commentObj = { content: expText, gpt: expText };
                streamList.push(commentObj);
                if (!this._v['generated-explanations'].includes(commentObj)) {
                  this._v['generated-explanations'].push(commentObj);
                }
              } else {
                streamList[idx].content = expText;
                streamList[idx].gpt = expText;
              }
            });
            line.comments = [...initial, ...streamList];
            if (ln === this.selectedLineNum) {
              this.selectedLine = this.model.lines[ln];
            }
          });
          this.reloadLineMarkers();
        } else if (event.type === 'usage') {
          this.onUsage(event.usage);
        }
      },
      onDone: (resp: any) => {
        this.stopThinking();
        this.log({ type, payload, explanations: resp, lines: this.model.lines });

        // merge generated explanations in-place
        Object.keys(resp).forEach((lnStr) => {
          const ln = parseInt(lnStr.replace(/\D+/g, ''), 10);
          if (!ln) return;
          if (!this.model.lines[ln]) {
            this.model.lines[ln] = { blank: false, comments: [] };
          }
          const line = this.model.lines[ln];
          const initial = initialCommentsByLine[ln] || [];
          const streamList = streamCommentsByLine[ln] || [];
          resp[lnStr].forEach((e: any, idx: number) => {
            if (!streamList[idx]) {
              const commentObj = { content: e, gpt: e };
              streamList.push(commentObj);
            } else {
              streamList[idx].content = e;
              streamList[idx].gpt = e;
            }
            if (!this._v['generated-explanations'].includes(streamList[idx])) {
              this._v['generated-explanations'].push(streamList[idx]);
            }
          });
          streamList.length = resp[lnStr].length;
          line.comments = [...initial, ...streamList];
          if (ln === this.selectedLineNum) {
            this.selectedLine = this.model.lines[ln];
          }
        });

        delete this._v[type];

        this.selectLine(this.selectedLineNum, true, true);
        then?.();
      },
      onError: (error: any) => {
        this.stopThinking();
        this.log({ type, payload, error: error.error });

        // revert lines to initial comments
        Object.keys(initialCommentsByLine).forEach((lnStr) => {
          const ln = parseInt(lnStr);
          if (this.model.lines[ln]) {
            this.model.lines[ln].comments = [...initialCommentsByLine[ln]];
          }
        });
        if (this.selectedLineNum && this.model.lines[this.selectedLineNum]) {
          this.selectedLine = this.model.lines[this.selectedLineNum];
        }
        this.reloadLineMarkers();

        if (error.status == 422) {
          const msg = error.error?.message || '';
          if (msg.includes('retired') || msg.includes('API key is required if you are using a model other than')) {
            this.modelHasChanged = true;
            this.messages.add({
              severity: 'error',
              summary: 'Model Retired or Invalid',
              detail: `${msg}. Please open GPT configuration (gear icon) and click 'RESET' to use the default model.`,
              life: 15000
            });
            this.loadOpenAIGPTConfig();
          } else {
            this.messages.add({
              severity: 'error', summary: 'Error',
              detail: msg,
              life: 10000
            });
          }
        }

        delete this._v[type];
      }
    });
  }

  onGenDistExplanation(distractor: any, i: number) {
    if (this.modelHasChanged) {
      this.messages.add({
        severity: 'warn',
        summary: 'Model Reset Required',
        detail: `The default model has changed to '${this.defaultGptConfig?.model}'. Please click 'RESET' in the configuration dialog to update before generating.`,
        life: 10000,
      });
      this.loadOpenAIGPTConfig();
      return;
    }

    const payload = {
      action: 'generate-distractor-explanation',
      id: this.model.id,
      language: this.model.language,
      statement: this.model.description,
      solution: this.model.code,
      line_number: this.selectedLineNum,
      distractor: distractor.code,
    };

    const initialDescription = distractor.description;
    this._v['generate:distractor-explanation' + i] = true;
    this.startThinking(`Generating explanation for distractor ${i + 1}...`);

    let accumulatedContent = '';

    this.streamGenAI(payload, {
      onProgress: (event: any) => {
        if (event.type === 'thinking') {
          this.onThinkingProgress(event.text || '');
        } else if (event.type === 'content') {
          this.onContentProgress(event.text);
          accumulatedContent += (event.text || '');
          const partialExp = this.parsePartialDistExplanation(accumulatedContent);
          if (partialExp !== null) {
            distractor.description = partialExp;
          }
        } else if (event.type === 'usage') {
          this.onUsage(event.usage);
        }
      },
      onDone: ({ explanation }: any) => {
        this.stopThinking();
        this.log({ type: 'generate:distractor-explanation', payload, explanation });

        distractor.description = explanation;

        delete this._v['generate:distractor-explanation' + i];
      },
      onError: (error: any) => {
        this.stopThinking();
        this.log({ type: 'generate:distractor-explanation', payload, error: error.error });
        distractor.description = initialDescription;

        if (error.status == 422) {
          const msg = error.error?.message || '';
          if (msg.includes('retired') || msg.includes('API key is required if you are using a model other than')) {
            this.modelHasChanged = true;
            this.messages.add({
              severity: 'error',
              summary: 'Model Retired or Invalid',
              detail: `${msg}. Please open GPT configuration (gear icon) and click 'RESET' to use the default model.`,
              life: 15000
            });
            this.loadOpenAIGPTConfig();
          } else {
            this.messages.add({
              severity: 'error', summary: 'Error',
              detail: msg
            });
          }
        }

        delete this._v['generate:distractor-explanation' + i];
      }
    });
  }

  onGenDistractors(then?: () => void) {
    if (this.modelHasChanged) {
      this.messages.add({
        severity: 'warn',
        summary: 'Model Reset Required',
        detail: `The default model has changed to '${this.defaultGptConfig?.model}'. Please click 'RESET' in the configuration dialog to update before generating.`,
        life: 10000,
      });
      this.loadOpenAIGPTConfig();
      return;
    }

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
    this.startThinking('Generating distractors...');

    const initialDistractors = [...this.model.distractors];
    const streamDistractorItems: any[] = [];
    let accumulatedContent = '';

    this.streamGenAI(payload, {
      onProgress: (event: any) => {
        if (event.type === 'thinking') {
          this.onThinkingProgress(event.text || '');
        } else if (event.type === 'content') {
          this.onContentProgress(event.text);
          accumulatedContent += (event.text || '');
          const partialDist = this.parsePartialDistractors(accumulatedContent);
          let itemIdx = 0;
          Object.keys(partialDist).forEach((ln) => {
            const lineNum = parseInt(ln.replace(/\D+/g, ''), 10) || this.selectedLineNum;
            partialDist[ln].forEach((d: any) => {
              if (!streamDistractorItems[itemIdx]) {
                const newDist = {
                  line_number: lineNum,
                  code: d.distractor,
                  description: d.explanation,
                  gpt: d,
                };
                streamDistractorItems.push(newDist);
              } else {
                const existing = streamDistractorItems[itemIdx];
                existing.line_number = lineNum;
                existing.code = d.distractor;
                existing.description = d.explanation;
                existing.gpt = d;
                const editorEntry = this.distEditors?.find(e => e.distractor === existing);
                if (editorEntry?.editor && editorEntry.editor.getValue() !== d.distractor) {
                  editorEntry.editor.setValue(d.distractor);
                }
              }
              itemIdx++;
            });
          });
          this.model.distractors = [...initialDistractors, ...streamDistractorItems];
          this.reloadDistractors();
        } else if (event.type === 'usage') {
          this.onUsage(event.usage);
        }
      },
      onDone: (resp: any) => {
        this.stopThinking();
        this.log({ type: 'generate:distractors', payload, distractors: resp, list: this.distractors });

        let itemIdx = 0;
        Object.keys(resp).forEach((ln) => {
          const lineNum = parseInt(ln.replace(/\D+/g, ''), 10) || this.selectedLineNum;
          resp[ln].forEach((d: any) => {
            if (!streamDistractorItems[itemIdx]) {
              streamDistractorItems.push({
                line_number: lineNum,
                code: d.distractor,
                description: d.explanation,
                gpt: d,
              });
            } else {
              const existing = streamDistractorItems[itemIdx];
              existing.line_number = lineNum;
              existing.code = d.distractor;
              existing.description = d.explanation;
              existing.gpt = d;
              const editorEntry = this.distEditors?.find(e => e.distractor === existing);
              if (editorEntry?.editor && editorEntry.editor.getValue() !== d.distractor) {
                editorEntry.editor.setValue(d.distractor);
              }
            }
            itemIdx++;
          });
        });
        streamDistractorItems.length = itemIdx;
        this.model.distractors = [...initialDistractors, ...streamDistractorItems];

        delete this._v['generate:distractors'];

        this.selectLine(this.selectedLineNum, true, true);
        then?.();
      },
      onError: (error: any) => {
        this.stopThinking();
        this.log({ type: 'generate:distractors', payload, error: error.error });
        this.model.distractors = initialDistractors;
        this.reloadDistractors();

        if (error.status == 422) {
          const msg = error.error?.message || '';
          if (msg.includes('retired') || msg.includes('API key is required if you are using a model other than')) {
            this.modelHasChanged = true;
            this.messages.add({
              severity: 'error',
              summary: 'Model Retired or Invalid',
              detail: `${msg}. Please open GPT configuration (gear icon) and click 'RESET' to use the default model.`,
              life: 15000
            });
            this.loadOpenAIGPTConfig();
          } else {
            this.messages.add({
              severity: 'error', summary: 'Error',
              detail: msg
            });
          }
        }

        delete this._v['generate:distractors'];
      }
    });
  }

  back() {
    this.router.navigate(['/sources']);
  }

  update() {
    if (this.blankLineCount > 4) {
      this.messages.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: `A source cannot have more than 4 blank lines (currently ${this.blankLineCount}). Please unmask the extra lines before saving.`
      });
      return;
    }

    if (this.distractorCount > (this.blankLineCount * 4)) {
      this.messages.add({
        severity: 'warn',
        summary: 'High Distractor Count',
        detail: `This source has ${this.distractorCount} distractors (recommended maximum is ${this.blankLineCount * 4}, which is 4 per blank line). Please avoid adding more, as this can affect compile and preview time.`
      });
    }

    this.model.translations = {};
    for (const t of this.translationRows) {
      if (t.iso && t.id) this.model.translations[t.iso] = t.id;
    }

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

  checkGptConfig() {
    this.api.loadGptConfig().subscribe({
      next: (resp: any) => {
        if (resp?.defaults) {
          this.defaultGptConfig = resp.defaults;
        }
        const config = resp?.value || {};
        const savedModel = config.model;
        const defaultModel = this.defaultGptConfig?.model;
        const hasApiKey = !!(config.apiKey || config.api_key);
        if (savedModel && defaultModel && savedModel !== defaultModel && !hasApiKey) {
          this.modelHasChanged = true;
          this.outdatedModel = savedModel;
          this.messages.add({
            severity: 'warn',
            summary: 'Default Model Changed',
            detail: `The default model has changed to '${defaultModel}'. Please click the gear icon and click 'RESET' to update your configuration.`,
            life: 12000,
          });
        }
      },
      error: () => {}
    });
  }

  resetOpenAIGPTConfig() {
    this.openAIGPTConfig = this.gptConfigPlaceholder;
    this.modelHasChanged = false;
    this.modelResetSuccess = true;
  }

  loadOpenAIGPTConfig(then?: () => void) {
    this.api.loadGptConfig().subscribe({
      next: (resp: any) => {
        if (resp?.defaults) {
          this.defaultGptConfig = resp.defaults;
        }
        const config = resp?.value || {};
        this.openAIGPTConfig = this.gptConfigPlaceholder;
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
        if (Object.keys(config).length > 0) {
          this.openAIGPTConfig = JSON.stringify(config, null, 2);
          const savedModel = config.model;
          const defaultModel = this.defaultGptConfig?.model;
          const hasApiKey = !!(config.apiKey || config.api_key);
          if (savedModel && defaultModel && savedModel !== defaultModel && !hasApiKey) {
            this.modelHasChanged = true;
            this.outdatedModel = savedModel;
          } else {
            this.modelHasChanged = false;
          }
        } else {
          this.modelHasChanged = false;
        }
        this.modelResetSuccess = false;
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
    let parsedConfig: any = {};
    try {
      if (this.openAIGPTConfig && this.openAIGPTConfig.trim().length > 0) {
        parsedConfig = JSON.parse(this.openAIGPTConfig);
      }
    } catch (e) {
      this.messages.add({
        severity: 'error',
        summary: 'Invalid JSON',
        detail: 'Please check your OpenAI-GPT configuration JSON syntax.'
      });
      return;
    }
    const config = {
      ...parsedConfig,
      ...this.translation
    };
    this.api.setGptConfig(config).subscribe({
      next: (resp: any) => {
        this.log({ type: 'gpt-config-saved', value: config });
        this.modelHasChanged = false;
        this.modelResetSuccess = false;
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
    if (this.modelHasChanged) {
      this.messages.add({
        severity: 'warn',
        summary: 'Model Reset Required',
        detail: `The default model has changed to '${this.defaultGptConfig?.model}'. Please click 'RESET' in the configuration dialog before translating.`,
        life: 10000,
      });
      this.loadOpenAIGPTConfig();
      return;
    }
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
    this.startThinking('Translating source problem...');

    let accumulatedContent = '';

    this.streamGenAI(payload, {
      onProgress: (event: any) => {
        if (event.type === 'thinking') {
          this.onThinkingProgress(event.text || '');
        } else if (event.type === 'content') {
          this.onContentProgress(event.text);
          accumulatedContent += (event.text || '');
          if (accumulatedContent.includes('[[PROGRAM-NAME]]')) {
            const namePart = accumulatedContent.substring(accumulatedContent.indexOf('[[PROGRAM-NAME]]') + 16);
            const nextTagIdx = namePart.indexOf('[[PROGRAM-DESCRIPTION]]');
            this.model.name = (nextTagIdx !== -1 ? namePart.slice(0, nextTagIdx) : namePart).trim();
          }
          if (accumulatedContent.includes('[[PROGRAM-DESCRIPTION]]')) {
            const descPart = accumulatedContent.substring(accumulatedContent.indexOf('[[PROGRAM-DESCRIPTION]]') + 23);
            const nextTagIdx = descPart.indexOf('[[SOURCE-CODE]]');
            this.model.description = (nextTagIdx !== -1 ? descPart.slice(0, nextTagIdx) : descPart).trim();
          }
        } else if (event.type === 'usage') {
          this.onUsage(event.usage);
        }
      },
      onDone: (resp: any) => {
        this.stopThinking();
        this.log({ type: 'generate:translate-model', payload: { ...payload, translated: resp } });
        this.model = resp;
        this._v['allow-untranslated-view'] = !!resp.untr_name || !!resp.untr_description;

        this.saveOpenAIGPTConfig(() => { /* this will avoid saveOpenAIGPTConfig's toast message */ });
        setTimeout(() => this.selectLine(this.selectedLineNum, true, true), 300);

        this.messages.add({ severity: 'success', summary: 'Success', detail: 'Source translated successfully' });
        delete this._v['translate'];
      },
      onError: (error: any) => {
        this.stopThinking();
        this.log({ type: 'generate:translate-model', payload, error: error.error });

        if (error.status == 422) this.messages.add({
          severity: 'error', summary: 'Error',
          detail: error.error?.message || error.error
        });
        delete this._v['translate'];
      }
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

  toggleTranslation() {
    this._v['viewing-untranslated'] = setTimeout(() => delete this._v['viewing-untranslated'], 300);
    this.viewUntranslated = !this.viewUntranslated;
    this.srcEditor.updateOptions({ readOnly: this.viewUntranslated });
    this.distEditors.forEach((e: any) => e.editor.updateOptions({ readOnly: this.viewUntranslated }));
    this.log({ type: 'view-untranslated', value: this.viewUntranslated });
  }

  onExtraFileSelected($event: any) {
    const file = $event.target.files[0];
    const reader = new FileReader();
    if (file.size > 64 * 1024) {
      alert('File size exceeds 64KB limit. \nPlease choose a smaller file.');
      return;
    }
    // read contents as base64 to allow binary files
    reader.onload = (e: any) => {
      this.model.extraFiles ||= [];
      const duplicate = this.model.extraFiles.filter((f: any) => f.path == `./${file.name}`);
      if (duplicate.length > 0) {
        alert('A file with the same path name already exists. \nPlease change the file path and try again.');
        return;
      }
      const content = e.target.result;
      this.model.extraFiles.push({ path: `./${file.name}`, content });
    };
    reader.readAsDataURL(file);
  }

  onExtraFileDownload($event: any, extraFile: any) {
    const link = document.createElement('a');
    link.href = extraFile.content;
    link.download = extraFile.path.replace('./', '');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  onExtraFileDelete($event: any, extraFile: any) {
    this.model.extraFiles = this.model.extraFiles.filter((f: any) => f != extraFile);
  }

  getAvailableLanguages() {
    return this.isoLanguages.filter(l => l.value !== this.model.iso_language_code);
  }

  addTranslationRow() {
    this.translationRows.push({ iso: '', id: '' });
  }

  removeTranslationRow(index: number) {
    this.confirm.confirm({
      header: 'Confirm',
      message: 'Are you sure you want to remove this link?',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-plain',
      accept: () => {
        this.translationRows.splice(index, 1);
      }
    });
  }

  openSource(id: string) {
    window.open(`${location.origin}${location.pathname}#/editor/${id}`, '_blank');
  }

  mergeTranslationsIntoSources() {
    if (this.model?.translations_details?.length && this.allSources) {
      for (const ts of this.model.translations_details) {
        const existingIndex = this.allSources.findIndex((s: any) => s.id === ts.id);
        const itemData = {
          ...ts,
          iso: ts.iso_language_code,
          _filter_details: `${ts.name} ${ts.description || ''} ${ts.user} ${ts.tags?.join(' ') || ''} ${ts.collaborator_emails?.join(' ') || ''}`.toLowerCase(),
          isExternal: ts.user !== this.app.user?.email && !ts.collaborator_emails?.includes(this.app.user?.email)
        };
        if (existingIndex >= 0) {
          this.allSources[existingIndex] = { ...this.allSources[existingIndex], ...itemData };
        } else {
          this.allSources.push(itemData);
        }
      }
    }
  }

  isReadOnly() {
    if (!this.model?.id || !this.app.user?.email) return false;
    if (this.app.user?.roles?.includes('app-admin')) return false;
    return this.model.user !== this.app.user.email && !this.model.collaborator_emails?.includes(this.app.user.email);
  }

  getAvailableSources(currentRow: any) {
    const usedIds = this.translationRows.filter(r => r !== currentRow).map(r => r.id);
    let list = (this.allSources || []).filter(s =>
      s.id !== this.model?.id &&
      !usedIds.includes(s.id) &&
      s.iso === currentRow.iso
    );
    if (currentRow.id && !list.some(s => s.id === currentRow.id)) {
      const s = this.getSource(currentRow.id) || { id: currentRow.id, name: `Linked Source (${currentRow.id})`, iso: currentRow.iso };
      list = [s, ...list];
    }
    return list;
  }

  getSource(id: string) {
    const found = this.allSources?.find(s => s.id === id);
    if (found) return found;
    return this.model?.translations_details?.find((s: any) => s.id === id) || null;
  }

  getLanguageName(iso: string) {
    return this.isoLanguages.find((l) => l.value === iso)?.label || iso;
  }
}