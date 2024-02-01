$(document).ready(function () {
	$('#check-button').click(pcex.check);
	$('#start-animation-button').click(pcex.startAnimation);
	$('#stop-animation-button').click(pcex.stopAnimation);
	$('#animation-next-button').click(pcex.animationNext);
	$('#animation-back-button').click(pcex.animationBack);

	$('#clear-button').click(pcex.clearIncorrectAnswer);

	$('#overlay').click(pcex.overlayFadeOut);

	$('#back-button').attr('disabled', true);
	$('#back-button').click(pcex.back);

	$('#next-button').click(pcex.next);
	$('#next-button').attr('disabled', false);

	$('#shortcut-next-button').click(pcex.next);
	$('#show-correct-button').click(pcex.showMeCorrectSolution).hide();
	$('#show-hint-button').click(pcex.showHint).hide();
	$('#show-message-details').click(pcex.showResultMessageDetails).hide();

	$('#close-hint-button').click(function () {
		pcex.clearHint();
		pcex.clearAllWrongBlankLinesHighlight();
	});

	pcex.parse();

	$(window).scroll(function (eventObject) {
		if (!pcex.isScrollNeeded()) {
			return;
		}

		var divCodeBottomY = $('#div_code').position().top + $('#div_code').height();
		var scrollTop = $(window).scrollTop();

		var currentTop = $('#scrollable').css('top').replace("px", "");

		if (scrollTop <= divCodeBottomY) {
			if ($('#checkCollapsible').is(":hidden") || currentTop > scrollTop) {
				if ($('#tiles').is(':visible') && pcex.animationStarted == false) {
					var lastBlankLinePosition = $('#' + pcex.blankLineIDs[pcex.blankLineIDs.length - 1]).position().top;
					var newDivTilesBottomY = scrollTop + $('#drag-tile-div').height() / 2;

					if (newDivTilesBottomY <= lastBlankLinePosition) {
						$('#scrollable').css('top', scrollTop);
					} else {
						var position = lastBlankLinePosition - $('#drag-tile-div').height() / 2;
						if (position >= 0) {
							$('#scrollable').css('top', position);
						} else {
							$('#scrollable').css('top', 0);
						}
					}
				}
			}
		}

	});

	$('.modal').modal({
		dismissible: true, // Modal can be dismissed by clicking outside of the modal
		inDuration: 300, // Transition in duration
		outDuration: 200, // Transition out duration
		startingTop: '4%', // Starting top style attribute
		endingTop: '10%', // Ending top style attribute
		ready: function (modal, trigger) { // Callback for Modal open. Modal and trigger parameters available.

		}
		/*complete: function() { alert('Closed'); } // Callback for Modal close*/
	});

	$('.container-fluid').show();
});


var pcex = {
	//For Reporting
	userCredentials: null,
	activityType: null,
	umApplicationId: null,
	pcexTrackingID: null,

	jsonData: null,
	scrollLineLimit: 20,
	numberOfTrialsForHint: 1,
	maxNumberOfTrials: 3,
	activityIndex: 0,
	numberOfGoals: 0,
	isPython: false,
	indentChar: null,
	codeHighlightClass: null,
	commentString: null,
	indentPopoverShown: false,
	goalSolvedStates: null,
	goalShowResultStates: null,
	lastChallengeState: null,

	currentGoal: null,
	currentGoalIndex: 0,

	animationStarted: false,
	animationStepIndex: 0,
	numberOfTrials: 0,
	lineList: null,
	blankLines: [],
	blankLineIDs: [],
	blankLineNumbers: [],
	tiles: [],
	linesWithExplanation: [],
	droppedTiles: null,
	hiddenTiles: null,
	correctBlankLineIDs: [],
	indentedIncorrectBlanLineIDs: [],
	droppedTileIndentation: null,

	parse: function (language, setName) {
		var usr = url('?usr');
		var grp = url('?grp');
		var sid = url('?sid');
		var language = url('?lang');
		var setName = url('?set');
		var svc = url('?svc') ? url('?svc') : 'masterygrids';  //SVC is an optional parameter

		const load = url('?load');
		if (load) $.ajax({
			url: load,
			dataType: 'json',
			xhrFields: {
				withCredentials: true
			},
			success: function (data) {
				pcex.jsonData = data[0];

				pcex.numberOfGoals = pcex.jsonData.activityGoals.length;
				pcex.goalSolvedStates = new Array(pcex.numberOfGoals);
				pcex.goalShowResultStates = new Array(pcex.numberOfGoals);
				pcex.setLanguageSettings(language);
				pcex.setUserCredentials(usr, grp, sid, svc);
				pcex.init();
			}
		});
	},

	setUserCredentials: function (usr, grp, sid, svc) {
		if (usr && grp && sid) {
			pcex.userCredentials = {
				user: usr,
				group: grp,
				sessionId: sid,
				svc: svc
			};
		}

	},

	setLanguageSettings: function (language) {
		pcex.isPython = language === 'PYTHON';
		if (pcex.isPython) {
			pcex.indentChar = '    ';
			pcex.commentString = '#';
			pcex.codeHighlightClass = 'python hljs';
		} else {
			pcex.indentChar = '  ';
			pcex.commentString = '//';
			pcex.codeHighlightClass = 'java hljs';
		}
	},

	init: function () {
		pcex.currentGoal = pcex.jsonData.activityGoals[pcex.currentGoalIndex];
		pcex.isInLastGoal = pcex.currentGoalIndex == pcex.numberOfGoals - 1;

		if (pcex.currentGoalIndex == 0) {
			$('#back-button').attr('disabled', true).hide();
		}
		if (pcex.isInLastGoal) {
			$('#shortcut-next-button').attr('disabled', true).hide();
			$('#next-button').hide();
		}

		var pre = document.createElement('pre');
		var code = document.createElement('code');
		code.setAttribute("class", pcex.codeHighlightClass);

		pcex.lineList = pcex.currentGoal.lineList;

		$.each(pcex.currentGoal.lineList, function (i, line) {
			var lineContent = pcex.createLineContent(line, false, false);
			$(code).append(lineContent);

			if (line.commentList.length > 0) {
				pcex.linesWithExplanation.push(line);
			}
		});

		$(pre).append(code);
		$('#div_code').append(pre);
		hljs.highlightBlock(code);

		pcex.currentGoal.goalDescription = pcex.currentGoal.goalDescription.replace(/\\n/g, '<br>');

		if (pcex.currentGoal.fullyWorkedOut) {
			pcex.activityType = 'ex';
			pcex.umApplicationId = 46;
			pcex.changeStyleToFullyWorkedOut();
			$('#goal_title').html("<img src='img/reader-24_white.png'>Example: " + pcex.currentGoal.name + "</img>");
		} else {
			pcex.activityType = 'ch';
			pcex.umApplicationId = 47;
			$('#goal_title').html("<img src='img/examination-24_white.png'>Challenge: " + pcex.currentGoal.name);

			$.each(pcex.currentGoal.blankLineList, function (i, blankLine) {
				pcex.blankLines.push(blankLine);
				pcex.blankLineIDs.push("line_" + blankLine.line.id);
				pcex.blankLineNumbers.push(blankLine.line.number);
			});

			pcex.highlightGoalTitle();

			if (pcex.goalSolvedStates[pcex.currentGoalIndex]) { //Need to show like a fully worked-out example
				pcex.loadGoalState();
				pcex.changeStyleToChallenge();
				pcex.showCorrect();

				if (pcex.goalShowResultStates[pcex.currentGoalIndex]) { //Correct answer is shown by Show me correct answer
					pcex.activityType = 'ch_not_solved';
				} else {
					pcex.activityType = 'ch_solved';
				}
			} else {
				pcex.changeStyleToChallenge();
				pcex.droppedTiles = new Array(pcex.currentGoal.blankLineList.length);
				pcex.hiddenTiles = new Array(pcex.currentGoal.blankLineList.length);
				pcex.droppedTileIndentation = new Array(pcex.currentGoal.blankLineList.length).fill(0);

				$.each(pcex.currentGoal.blankLineList, function (i, blankLine) {
					pcex.convertRegularCodeLineToBlankLine(blankLine.line.id);

					var tileCodeContent = pcex.createTileContent(blankLine);
					pcex.tiles.push(tileCodeContent);
				});

				$.each(pcex.currentGoal.distractorList, function (i, distractor) {
					var tileCodeContent = pcex.createTileContent(distractor);
					pcex.tiles.push(tileCodeContent);
				});

				pcex.tiles = pcex.shuffleArray(pcex.tiles);
				$.each(pcex.tiles, function (i, tile) {
					$('#tiles').append(tile);
				});

				pcex.loadGoalState();
			}
		}

		pcex.updateNextButtonText();

		$("a[id^='help_']").unbind('click').click(pcex.handleHelpButtonClicked);
		pcex.trackUserActivity();
	},

	updateNextButtonText: function () {
		const nextGoalIndex = pcex.currentGoalIndex + 1;
		if (nextGoalIndex < pcex.numberOfGoals) {
			const nextGoal = pcex.jsonData.activityGoals[nextGoalIndex];
			$('#next-button span').text(nextGoal.fullyWorkedOut ? 'Next Example' : 'Challenge Me!');
		}
	},

	convertRegularCodeLineToBlankLine: function (lineId) {
		$("#line_" + lineId).html("\n").addClass("code-blank-line ui-state-default").droppable({
			accept: '.tile-dragging-start, .tile-dragged, .code-blank-line-error',
			hoverClass: 'hovered',
			tolerance: "pointer",
			drop: function (event, ui) {
				pcex.handleTileDrop(this, ui.draggable);
			}
		});
	},

	createLineContent: function (line, includeIndentButtons, isTileDrop, blankLineIndex) {
		var lineContent = document.createElement('div');
		var indentedCode = pcex.getIndentedCode(line, isTileDrop, blankLineIndex);
		$(lineContent).attr("id", "line_" + line.id).addClass('line');
		if (indentedCode.trim().startsWith(pcex.commentString)) { //Highlight step lines
			$(lineContent).addClass('stepline');
		}

		if (includeIndentButtons || line.commentList.length > 0) {
			lineContent.appendChild(document.createTextNode(indentedCode));

			if (line.commentList.length > 0) {
				var helpButton = document.createElement('a');
				$(helpButton).addClass('btn-floating btn-small waves-effect waves-light red')
					.attr('id', 'help_' + line.id);

				var helpIcon = document.createElement('i');
				helpIcon.setAttribute("class", 'material-icons');
				helpIcon.innerHTML = 'help';

				$(helpIcon).click(function () {
					console.log('icon clicked');
				});

				helpButton.appendChild(helpIcon);

				lineContent.appendChild(helpButton);

				if (pcex.currentGoal.fullyWorkedOut == false) {
					$(helpButton).hide();
				}
			}

			if (includeIndentButtons) {
				var decreaseIndentButton = pcex.createIndentButton(false, blankLineIndex);
				lineContent.prepend(decreaseIndentButton);
				$(decreaseIndentButton).attr('disabled', true);

				var increaseIndentButton = pcex.createIndentButton(true, blankLineIndex);
				lineContent.appendChild(increaseIndentButton);

				if (!pcex.indentPopoverShown) {
					$(decreaseIndentButton).css('z-index', '99999');
					$(increaseIndentButton).css('z-index', '99999');
					$('#overlay').fadeIn(300);
				}
			}
		} else {
			lineContent.innerHTML = indentedCode;
		}
		// if absent, the post-comment line will be highlighted as comment as well
		// -->
		lineContent.innerHTML += '\n';
		// <--
		var lineNumberSpan = document.createElement('span');
		var lineNumber;
		if (isTileDrop) {
			lineNumber = String("  " + pcex.blankLineNumbers[blankLineIndex]).slice(-2)
		} else {
			lineNumber = String("  " + line.number).slice(-2);
		}

		$(lineNumberSpan).addClass('linenumber').html(lineNumber); //To have a fixed length line number, which is 2 in all cases.
		$(lineContent).prepend(lineNumberSpan);

		return lineContent;
	},

	getIndentedCode: function (line, isTileDrop, blankLineIndex) {
		if (isTileDrop) {
			if (pcex.isPython) {
				return line.content.trim();
			} else {
				var currentLineNumber = pcex.blankLineNumbers[blankLineIndex];
				var previousLineNumber = currentLineNumber - 1;
				var potentialCurrentIndentLevel = 0;
				var previousLineContent = "";

				for (i = previousLineNumber; i > 0; i--) { //loop over previous line numbers
					if (pcex.blankLineNumbers.includes(i)) { //If the line is a blank line
						var previousBlankLineIndex = pcex.blankLineNumbers.indexOf(i);

						if (pcex.droppedTiles[previousBlankLineIndex]) { //If a tile already dragged to that blank line, then we need to consider this blank line's indent level
							potentialCurrentIndentLevel = pcex.droppedTileIndentation[previousBlankLineIndex];
							previousLineNumber = i;
							previousLineContent = pcex.droppedTiles[previousBlankLineIndex].line.content.trim();
							break;
						}
					} else {
						potentialCurrentIndentLevel = pcex.lineList[i - 1].indentLevel;
						previousLineNumber = i;
						previousLineContent = pcex.lineList[i - 1].content.trim();
						break;
					}
				}

				var currentLineContent = pcex.droppedTiles[blankLineIndex].line.content.trim();

				if (previousLineContent.endsWith('{')) {
					potentialCurrentIndentLevel++;
				}

				if (currentLineContent.startsWith('}')) {
					potentialCurrentIndentLevel--;
				}

				pcex.droppedTileIndentation[blankLineIndex] = potentialCurrentIndentLevel;

				return pcex.indentChar.repeat(potentialCurrentIndentLevel) + line.content.trim();
			}
		} else {
			return pcex.indentChar.repeat(line.indentLevel) + line.content.trim();
		}

	},

	createIndentButton: function (increase, blankLineIndex) {
		var type = increase ? 'increase' : 'decrease';

		var indentButton = document.createElement('a');
		$(indentButton).attr('id', type + '-indent-button-' + blankLineIndex).addClass(type + '-indent-button btn-floating btn-small waves-effect waves-light blue sticky-popover');
		$(indentButton).attr('lineIndex', blankLineIndex);

		var indentIcon = document.createElement('i');
		$(indentIcon).attr("class", 'material-icons');
		$(indentIcon).html('format_indent_' + type);

		indentButton.appendChild(indentIcon);

		return indentButton;
	},

	createTileContent: function (tile) {
		var tileCodeContent = document.createElement('div');
		var tilePre = document.createElement('pre');
		$(tilePre).attr('id', 'tile_' + tile.id);
		var tileCode = document.createElement('code');

		$(tilePre).data('tile', tile).draggable({
			start: function () {
				$(this).addClass('tile-dragging-start');
				$(this).removeClass('tile-blank-line');
				$('.code-blank-line').filter(function () { return !$(this).hasClass('tile-dragged') }).addClass('ui-state-highlight');
			},
			drag: function () {

			},
			stop: function () {
				$(this).removeClass('tile-dragging-start');
				$(this).addClass('tile-blank-line');
				$('.code-blank-line').removeClass('ui-state-highlight');
			},
			containment: '#draggable',
			stack: '#tiles div',
			cursor: 'move',
			revert: true
		})


		$(tilePre).droppable({
			accept: '.tile-dragged, .code-blank-line-error',
			hoverClass: 'hovered-tile',
			drop: pcex.handleDraggedTileSwap,
			tolerance: "pointer"
		});

		$(tileCode).text(tile.line.content.trim())
		$(tilePre).addClass("tile-blank-line " + pcex.codeHighlightClass).append(tileCode);
		hljs.highlightBlock(tilePre);
		return tilePre;
	},

	handleTileDrop: function (target, draggable) {
		var tile = $(draggable).data('tile');
		var blankLineId = $(target).attr('id');
		var blankLineIndex = $.inArray(blankLineId, pcex.blankLineIDs);

		var isDraggedItemAlreadyInAnotherBlankLine = $(draggable).hasClass('tile-dragged') || $(draggable).hasClass('code-blank-line-error');

		if (isDraggedItemAlreadyInAnotherBlankLine) { //Already dropped tile is dropped to another blank line
			$(draggable).removeClass().html("\n").addClass("code-blank-line ui-state-default").draggable('destroy');

			var clearedBlankLineIndex = $.inArray($(draggable).attr('id'), pcex.blankLineIDs);

			$(pcex.hiddenTiles[blankLineIndex]).show();
			pcex.hiddenTiles[blankLineIndex] = pcex.hiddenTiles[clearedBlankLineIndex];
			pcex.hiddenTiles[clearedBlankLineIndex] = undefined;

			pcex.droppedTiles[blankLineIndex] = pcex.droppedTiles[clearedBlankLineIndex];
			pcex.droppedTiles[clearedBlankLineIndex] = undefined;
		} else {
			pcex.droppedTiles[blankLineIndex] = tile;
			$(pcex.hiddenTiles[blankLineIndex]).show();
			pcex.hiddenTiles[blankLineIndex] = $(draggable);
			$(draggable).hide();
		}

		pcex.droppedTileIndentation[blankLineIndex] = 0;

		var lineContent = pcex.createLineContent(tile.line, pcex.isPython, true, blankLineIndex);
		$(lineContent).removeAttr('id').addClass(pcex.codeHighlightClass);

		if ($.trim($(target).html()).length == 0) { //droppable div empty
			$(target).empty().append(lineContent);
			$(target).addClass('tile-dragged');
		} else {
			$(target).empty().append(lineContent);
		}

		hljs.highlightBlock(lineContent);

		pcex.makeFilledBlankLineDraggable($(target), tile);

		if (pcex.isPython == false && blankLineIndex != pcex.blankLineIDs.length - 1) { //If dropped tile is not dropped to the last blank line, modify indentation of previously dropped tiles
			for (var i = blankLineIndex + 1; i < pcex.blankLineIDs.length; i++) { //Need to check previous blank lines for indentation
				if (pcex.droppedTiles[i]) {
					var updatedBlankLineContent = pcex.createLineContent(pcex.droppedTiles[i].line, pcex.isPython, true, i);
					$(updatedBlankLineContent).removeAttr('id').addClass(pcex.codeHighlightClass);
					var lineElement = $('#' + pcex.blankLineIDs[i]).children(0)
					$(lineElement).replaceWith(updatedBlankLineContent);
					hljs.highlightBlock(updatedBlankLineContent);
				}
			}
		}


		pcex.makeCheckButtonEnabledIfTilesFilled();

		if (pcex.isPython && !pcex.indentPopoverShown) {
			$('.decrease-indent-button').webuiPopover({ trigger: 'sticky', animation: 'pop', placement: 'bottom-right', content: 'Decrease Indentation', width: 140, onShow: function ($element) { $element.css('z-index', '99999') } });
			$('.increase-indent-button').webuiPopover({ trigger: 'sticky', animation: 'pop', placement: 'bottom-left', content: 'Increase Indentation', width: 140, onShow: function ($element) { $element.css('z-index', '99999') } });

			pcex.indentPopoverShown = true;
		}

		$('#increase-indent-button-' + blankLineIndex).click(pcex.handleIncreaseIndentButtonClicked);
		$('#decrease-indent-button-' + blankLineIndex).click(pcex.handleDecreaseIndentButtonClicked);

		pcex.hideCheckCollapsible();
		pcex.clearAllWrongBlankLinesHighlight();
		pcex.clearHint();
	},

	makeCheckButtonEnabledIfTilesFilled: function () {
		var blankLinesFilled = $('.code-blank-line').filter(function () { return $.trim($(this).html()).length == 0 }).length == 0;
		$('#check-button').attr("disabled", !blankLinesFilled);
	},

	handleIncreaseIndentButtonClicked: function () {
		var blankLineIndex = $(this).attr('lineIndex');
		pcex.handleIndentButtonClicked(blankLineIndex);

		var lineText = pcex.getTextNode($(this).parent());
		lineText.data = '    ' + lineText.data;

		pcex.droppedTileIndentation[blankLineIndex]++;

		$('#decrease-indent-button-' + blankLineIndex).attr('disabled', false);
	},

	handleDecreaseIndentButtonClicked: function () {
		var blankLineIndex = $(this).attr('lineIndex');
		pcex.handleIndentButtonClicked(blankLineIndex);

		var lineText = pcex.getTextNode($(this).parent());
		lineText.data = lineText.data.replace(/^\s{4}/, '');


		if (pcex.droppedTileIndentation[blankLineIndex] > 0) {
			pcex.droppedTileIndentation[blankLineIndex]--;

			if (pcex.droppedTileIndentation[blankLineIndex] == 0) {
				$(this).attr('disabled', true);
			}
		}
	},

	handleIndentButtonClicked: function (blankLineIndex) {
		pcex.overlayFadeOut();

		if (!$('#checkCollapsible').is(":hidden")) { //Indentation changed without clearing
			pcex.hideCheckCollapsible();
			$('#check-button').attr("disabled", false);
			pcex.clearAllWrongBlankLinesHighlight();
		}

		if (!$('#hint-div').is(":hidden")) { //Indentation changed without clearing
			pcex.clearHint();
			pcex.clearAllWrongBlankLinesHighlight();
		}
	},

	handleDraggedTileSwap: function (event, ui) {
		$('#tiles').removeClass('ui-state-highlight hovered');
		pcex.handleTileDrop(ui.draggable, this);
	},

	makeFilledBlankLineDraggable: function (blankLine, droppedTileData) {
		blankLine.data('tile', droppedTileData).draggable({
			containment: $('#draggable'),
			stack: $('#draggable'),
			helper: 'clone',
			//cursorAt: { top: blankLine.height()/2, left: droppedTileData.line.content.length * 10 },
			start: function () {
				$('.ui-draggable-dragging').addClass('tile-dragging-start');
				$('.code-blank-line').addClass('ui-state-highlight');
				$('.tile-blank-line').addClass('tile-blank-line-highlight');
			},
			stop: function () {
				$('.code-blank-line').removeClass('ui-state-highlight');
				$('.tile-blank-line').removeClass('tile-blank-line-highlight');
			}
		});
	},

	getTextNode: function (element) {
		return $(element).contents().filter(function () { return this.nodeType === Node.TEXT_NODE; })[0];
	},

	shuffleArray: function (array) {
		for (var i = array.length - 1; i > 0; i--) {
			var j = Math.floor(Math.random() * (i + 1));
			var temp = array[i];
			array[i] = array[j];
			array[j] = temp;
		}
		return array;
	},

	next: function () {
		if (pcex.currentGoalIndex + 1 < pcex.numberOfGoals) {
			$('#back-button').attr('disabled', false).addClass('waves-effect waves-light').show();

			pcex.currentGoalIndex++;
			pcex.resetFields();
			pcex.clearScreen();
			pcex.init();

			if (!pcex.goalSolvedStates[pcex.currentGoalIndex] || pcex.isInLastGoal) {
				// $('#next-button').removeClass('btn-primary btn-challenge waves-effect waves-light').attr('disabled', true);

				if (pcex.isInLastGoal) {
					$('#shortcut-next-button').attr('disabled', true).hide();
					$('#next-button').hide();
				} else {
					pcex.updateNextButtonText();
				}
			}
		}

	},

	back: function () {
		if (pcex.currentGoalIndex > 0) {
			pcex.saveGoalState();

			pcex.currentGoalIndex--;
			pcex.resetFields();
			pcex.clearScreen();
			pcex.init();

			$('#next-button').attr('disabled', false).addClass('waves-effect waves-light').show();
			$('#shortcut-next-button').attr('disabled', false).show();
			if (pcex.currentGoalIndex == 0) {
				$('#back-button').removeClass('btn-primary btn-challenge waves-effect waves-light').attr('disabled', true);
			}

			pcex.updateNextButtonText();
		}
	},

	clearScreen: function () {
		$('#tiles').empty();
		$('#explanation').empty();
		$('#div_code').empty();
		pcex.hideCheckCollapsible();
		$('#show-correct-button').hide();
		$('#check-button').attr("disabled", true);
		$('#scrollable').css('top', 0);
	},

	resetFields: function () {
		pcex.lineList = null;
		pcex.blankLines = [];
		pcex.blankLineIDs = [];
		pcex.blankLineNumbers = [];
		pcex.tiles = [];
		pcex.droppedTiles = null;
		pcex.hiddenTiles = null;
		pcex.droppedTileIndentation = null;
		pcex.numberOfTrials = 0;
		pcex.animationStarted = false;
		pcex.animationStepIndex = 0;
		pcex.linesWithExplanation = [];
		pcex.correctBlankLineIDs = [];
		pcex.indentedIncorrectBlanLineIDs = [];
	},

	saveGoalState: function () {
		pcex.lastChallengeState = {
			correctBlankLineIDs: pcex.correctBlankLineIDs,
			droppedTiles: pcex.droppedTiles,
			droppedTileIndentation: pcex.droppedTileIndentation,
			numberOfTrials: pcex.numberOfTrials
		};
	},

	loadGoalState: function () {
		if (pcex.lastChallengeState) {
			if (!pcex.goalSolvedStates[pcex.currentGoalIndex]) { //Need to handle if the challenge is not already solved
				pcex.droppedTileIndentation = pcex.lastChallengeState.droppedTileIndentation;
				pcex.numberOfTrials = pcex.lastChallengeState.numberOfTrials;

				$.each(pcex.lastChallengeState.droppedTiles, function (i, droppedTile) {
					if (droppedTile) {
						pcex.handleTileDrop($('#' + pcex.blankLineIDs[i]), $('#tile_' + droppedTile.id));
					}
				});
			}

			//This should be done after handling tile drops previously not to reset classes of blank lines
			pcex.correctBlankLineIDs = pcex.lastChallengeState.correctBlankLineIDs;
			pcex.higlightCorrectBlankLines(pcex.correctBlankLineIDs);
		}

		pcex.lastChallengeState = null;
	},

	check: function () {
		var result = true;
		var correctTiles = [];
		var wrongTiles = [];
		var wrongIndentedTiles = [];

		var correctLineNumbers = [];
		var incorrectLineNumbers = [];
		var incorrectIndentedLineNumbers = [];

		var wrongAnswers = [];
		pcex.correctBlankLineIDs = [];
		pcex.indentedIncorrectBlanLineIDs = [];

		pcex.numberOfTrials++;

		for (i = 0; i < pcex.blankLineIDs.length; i++) {
			if (pcex.droppedTiles[i].line.id != pcex.blankLineIDs[i].replace('line_', '')) { //check if droppedTiles are same with original blank lines
				wrongTiles.push(pcex.blankLineIDs[i]);
				incorrectLineNumbers.push(pcex.blankLines[i].line.number);
				wrongAnswers.push(pcex.droppedTiles[i].line.content);
				result = false;
			} else {
				correctTiles.push(pcex.blankLineIDs[i]);
				pcex.correctBlankLineIDs.push(pcex.blankLineIDs[i]);
				correctLineNumbers.push(pcex.blankLines[i].line.number);
			}
		}

		//Check if the alternative output is same as correct output
		if (result == false) {
			var droppedTilesInWrongOrder = true;

			for (i = 0; i < pcex.droppedTiles.length; i++) { //check if the solution has correct tiles but in wrong order
				if (pcex.blankLineNumbers.includes(pcex.droppedTiles[i].line.number) == false) {
					droppedTilesInWrongOrder = false;
					break;
				}
			}

			if (droppedTilesInWrongOrder) {
				var answerOutput = "";
				var droppedTileIds = $.map(pcex.droppedTiles, function (val, index) {
					return val.line.id;
				}).join(",");

				$.each(pcex.currentGoal.alternatives, function (i, alternative) {
					if (alternative.alternativeTileIds == droppedTileIds) {
						answerOutput = alternative.output;
					}
				});

				if (answerOutput == pcex.currentGoal.correctOutput) { // then show it is as correct
					result = true;
					wrongAnswers = [];
					wrongTiles = [];
					correctLineNumbers = correctLineNumbers.concat(incorrectLineNumbers);
					incorrectLineNumbers = [];
					correctTiles = correctTiles.concat(wrongTiles);
					pcex.correctBlankLineIDs = [].concat(correctTiles);
				}
			}
		}

		var indentResult = true;
		if (pcex.isPython) { //Check indentation
			for (i = 0; i < pcex.blankLineIDs.length; i++) {
				if (pcex.droppedTiles[i].line.indentLevel != pcex.droppedTileIndentation[i]) {
					wrongIndentedTiles.push(pcex.blankLineIDs[i]);
					pcex.indentedIncorrectBlanLineIDs.push(pcex.blankLineIDs[i]);

					incorrectIndentedLineNumbers.push(pcex.blankLines[i].line.number);
					wrongAnswers.push(pcex.droppedTiles[i].line.content);

					indentResult = false;
				}
			}

			correctTiles = $(correctTiles).not(wrongIndentedTiles).get();
			correctLineNumbers = $(correctLineNumbers).not(incorrectIndentedLineNumbers).get();
			pcex.correctBlankLineIDs = $(pcex.correctBlankLineIDs).not(wrongIndentedTiles).get();
		}

		pcex.higlightCorrectBlankLines(correctTiles);

		if (result) {
			if (indentResult) {
				$('#check-result-title').html('Correct!');
				$('#check-result-message').show();
				if (pcex.currentGoal.userInputList.length > 0) {
					var userInput = "<p class='modal-sub-title'>User Input</p><hr>" + pcex.constructUserInputPartFromProgramOutput(pcex.currentGoal.correctOutput) + '<hr>';
					var correctOutput = "<p class='modal-sub-title'>Output</p><hr>" + pcex.extractProgramOutput(pcex.currentGoal.correctOutput)

					$('#check-result-message').html(userInput + correctOutput);
				} else {
					$('#check-result-message').html("<p class='modal-sub-title'>Output</p><hr>" + pcex.currentGoal.correctOutput);
				}


				$('#check-result-block').removeClass('wrong').addClass('correct');
				if (!pcex.isInLastGoal) {
					$('#shortcut-next-button').show();
				}

				$('#clear-button').hide();
				$('#show-hint-button').hide();
				$('#show-message-details').hide();
				pcex.showCorrect();

				pcex.reportCheckResultToUm(true);
				pcex.trackCheckResult('correct', 1, pcex.numberOfTrials, correctLineNumbers, incorrectLineNumbers, wrongAnswers);

				pcex.numberOfTrials = 0;
			} else {
				$('#check-result-title').html('Incorrect. Try Again!');
				pcex.numberOfTrials++;

				pcex.appendIncorrectResultMessage(wrongTiles, incorrectLineNumbers, wrongIndentedTiles, incorrectIndentedLineNumbers);
				pcex.higlightWrongBlankLines(wrongIndentedTiles);

				$('#check-result-block').removeClass('correct').addClass('wrong');
				$('#shortcut-next-button').hide();
				$('#show-message-details').hide();
				$('#clear-button').show();

				pcex.reportCheckResultToUm(false);
				pcex.trackCheckResult('indentation_err', 0, pcex.numberOfTrials, correctLineNumbers, incorrectIndentedLineNumbers, wrongAnswers);
			}
		} else {
			$('#check-result-title').html('Incorrect. Try Again!');
			$('#show-message-details').hide();

			if (pcex.isPython) {
				pcex.higlightWrongBlankLines(wrongTiles.concat(wrongIndentedTiles));
				pcex.appendIncorrectResultMessage(wrongTiles, incorrectLineNumbers, wrongIndentedTiles, incorrectIndentedLineNumbers);

				pcex.trackCheckResult('wrong', 0, pcex.numberOfTrials, correctLineNumbers, incorrectLineNumbers, wrongAnswers);
			} else {
				pcex.higlightWrongBlankLines(wrongTiles);
				var droppedTileIds = $.map(pcex.droppedTiles, function (val, index) {
					return val.line.id;
				}).join(",");

				var alternativeOutput = '';

				$.each(pcex.currentGoal.alternatives, function (i, alternative) {
					if (alternative.alternativeTileIds == droppedTileIds) {
						alternativeOutput = alternative.output;
					}
				});

				if (alternativeOutput.toLowerCase().includes('infinite loop')) {
					$('#check-result-title').html(alternativeOutput);
					$('#check-result-message').hide();

					pcex.trackCheckResult('infinite_loop', 0, pcex.numberOfTrials, correctLineNumbers, incorrectLineNumbers, wrongAnswers);
				} else if (alternativeOutput.toLowerCase().includes('exception')) {
					$('#check-result-title').html('Your program throws exception');
					$('#check-result-message').hide();
					$('#show-message-details').show();

					$('#modal-output-div').hide();
					$('#modal-check-result-title').html('Exception Details');
					$('#modal-check-result-div').show();
					$('#modal-check-result-message').html(alternativeOutput);

					pcex.trackCheckResult('exception', 0, pcex.numberOfTrials, correctLineNumbers, incorrectLineNumbers, wrongAnswers);
				} else if (alternativeOutput.toLowerCase().includes('error')) {
					$('#check-result-title').html('Your program has compilation error');
					$('#check-result-message').hide();
					$('#show-message-details').show();

					$('#modal-output-div').hide();
					$('#modal-check-result-title').html('Compilation Error Details');
					$('#modal-check-result-div').show();
					$('#modal-check-result-message').html(alternativeOutput);

					pcex.trackCheckResult('compilation_err', 0, pcex.numberOfTrials, correctLineNumbers, incorrectLineNumbers, wrongAnswers);
				} else {
					$('#check-result-message').show();
					$('#check-result-message').html('Your program output is different than the expected output');
					$('#show-message-details').show();

					$('#modal-check-result-title').html('Program Output Details');

					var currentProgramOutputPart = pcex.extractProgramOutput(alternativeOutput);
					var expectedProgramOutputPart = pcex.extractProgramOutput(pcex.currentGoal.correctOutput);

					if (pcex.currentGoal.userInputList.length > 0) {
						var userInputPart = pcex.constructUserInputPartFromProgramOutput(alternativeOutput);
						$('#modal-check-result-div').show();
						$('#modal-check-result-message').html("<p class='modal-sub-title'>User Input</p>" + userInputPart);
					} else {
						$('#modal-check-result-message').empty();
						$('#modal-check-result-div').hide();
					}


					$('#modal-output-div').show();
					$('#modal-current-output-message').html(currentProgramOutputPart);
					$('#modal-expected-output-message').html(expectedProgramOutputPart);

					pcex.trackCheckResult('wrong_output', 0, pcex.numberOfTrials, correctLineNumbers, incorrectLineNumbers, wrongAnswers);
				}
			}

			$('#check-result-block').removeClass('correct').addClass('wrong');
			$('#shortcut-next-button').hide();
			$('#clear-button').show();

			pcex.reportCheckResultToUm(false);
		}


		$('#check-button').attr("disabled", true);

		if ((!indentResult || !result)) {
			if (pcex.numberOfTrials >= pcex.maxNumberOfTrials) {
				$('#show-correct-button').show();
			}

			if (pcex.numberOfTrials >= pcex.numberOfTrialsForHint) {
				$('#show-hint-button').show();
			}

		}
	},

	appendIncorrectResultMessage: function (incorrectLines, incorrectLineNumbers, incorrectIndentedLines, incorrectIndentedLineNumbers) {
		var incorrectResultDiv = document.createElement('div');
		$(incorrectResultDiv).css('display', 'grid');
		if (incorrectLines.length > 0) {
			var resultMessage = pcex.createIncorrectResultMessage(incorrectLines, incorrectLineNumbers, "is incorrect", "are incorrect");
			$(incorrectResultDiv).append(resultMessage);
		}

		incorrectIndentedLines = $(incorrectIndentedLines).not(incorrectLines).get();
		incorrectIndentedLineNumbers = $(incorrectIndentedLineNumbers).not(incorrectLineNumbers).get();


		if (incorrectIndentedLines.length > 0) {
			var resultMessage = pcex.createIncorrectResultMessage(incorrectIndentedLines, incorrectIndentedLineNumbers, "has indentation error", "have indentation error");
			$(incorrectResultDiv).append(resultMessage);
		}

		$('#check-result-message').append(incorrectResultDiv);

	},

	createIncorrectResultMessage: function (incorrectLines, incorrectLineNumbers, singularText, pluralText) {
		var errorLineNumbers = document.createElement('span');

		for (i = 0; i < incorrectLines.length; i++) {
			var errorLine = document.createElement('a');
			$(errorLine).html("line " + incorrectLineNumbers[i]).css({ 'color': '#0275d8', 'cursor': 'pointer', 'border': '2px solid blue' }).attr('wrongTile', incorrectLines[i]);
			$(errorLine).click(pcex.blinkWrongLine);

			$(errorLineNumbers).append(errorLine);

			if (i != incorrectLineNumbers.length - 1) {
				$(errorLineNumbers).append(document.createTextNode(","));
			}
		}

		var errorMessage = "";

		if (incorrectLines.length == 1) {
			errorMessage = " " + singularText;
		} else {
			errorMessage = " " + pluralText;
		}

		var errorNode = document.createTextNode(errorMessage);
		$(errorLineNumbers).append(errorNode);

		return errorLineNumbers;
	},

	clearIncorrectAnswer: function () {
		$('.code-blank-line-error').removeClass().html("\n").addClass("code-blank-line ui-state-default");

		$.each(pcex.hiddenTiles, function (i, tile) {
			if (pcex.correctBlankLineIDs.includes(pcex.blankLineIDs[i]) == false) {
				$(tile).show();
				pcex.droppedTiles[i] = undefined;
				pcex.droppedTileIndentation[i] = 0;
			} else {
				pcex.hiddenTiles[i] = undefined;
			}
		});

		pcex.hideCheckCollapsible();
		$('#check-result-title').empty();
		$('#modal-check-result-title').empty();
		$('#modal-check-result-message').empty();
		$('#modal-current-output-message').empty();
		$('#modal-expected-output-message').empty();

	},

	constructUserInputPartFromProgramOutput: function (output) {
		if (pcex.currentGoal.userInputList && pcex.currentGoal.userInputList.length > 0) {
			var outputLines = output.split("\n");
			var inputIndex = 0;
			var outputLineIndex = 0;
			while (outputLineIndex < outputLines.length) {
				var outputLine = outputLines[outputLineIndex];
				if (outputLine.includes('Enter') && pcex.currentGoal.userInputList[inputIndex]) {
					outputLines[outputLineIndex] = outputLine + "<span class='input_text'>" + pcex.currentGoal.userInputList[inputIndex].replace(/,/g, ' ') + "</span>";
					inputIndex++;
				} else {
					outputLines[outputLineIndex] = "";
				}

				outputLineIndex++;
			}

			output = outputLines.filter(function (line) { return line.length > 0; }).join("\n");
		}

		return output;
	},

	extractProgramOutput: function (output) {
		var outputLines = output.split("\n");
		var extractedOutput = "";
		$.each(outputLines, function (i, outputLine) {
			if (!outputLine.includes('Enter')) {
				extractedOutput = extractedOutput + outputLine + "\n";
			}
		});

		return extractedOutput;
	},

	showResultMessageDetails: function () {
		$('#result-modal').modal('open');

		$('#result-modal').draggable({
			cursor: 'move',
			handle: '#modal-check-result-title'
		});

		pcex.trackHint('evaluation_details', 0);
	},

	higlightCorrectBlankLines: function (blankLineIds) {
		$.each(blankLineIds, function (i, blankLineId) {
			var blankLineElement = $('#' + blankLineId);
			if (blankLineElement.hasClass('code-blank-line-correct') == false) {
				blankLineElement.removeClass().addClass('line code-blank-line-correct');

				if (pcex.isPython) { //Disable indent buttons if it is Python challenge
					var blankLineIndex = pcex.blankLineIDs.indexOf(blankLineId);
					$('#increase-indent-button-' + blankLineIndex).hide();
					$('#decrease-indent-button-' + blankLineIndex).hide();
				}
			}

			if (blankLineElement.data('ui-draggable')) {
				blankLineElement.draggable('destroy');
			}

			if (blankLineElement.data('ui-droppable')) {
				blankLineElement.droppable('destroy');
			}

		});
	},

	higlightWrongBlankLines: function (blankLineIds) {
		$.each(blankLineIds, function (i, blankLineId) {
			$('#' + blankLineId).removeClass('tile-dragged').addClass('code-blank-line-error');
		});
	},

	blinkWrongLine: function (wrongTile) {
		$("#" + $(wrongTile.currentTarget).attr('wrongTile')).addClass('blink-me-error');

		$("#" + $(wrongTile.currentTarget).attr('wrongTile')).one('webkitAnimationEnd oanimationend msAnimationEnd animationend',
			function (e) {
				$("#" + $(wrongTile.currentTarget).attr('wrongTile')).removeClass('blink-me-error');
			});
	},


	clearAllWrongBlankLinesHighlight: function () {
		$.each(pcex.blankLineIDs, function (i, blankLineId) {
			$('.code-blank-line-error').removeClass('code-blank-line-error').addClass('tile-dragged');
		});
	},

	showMeCorrectSolution: function () {
		pcex.goalShowResultStates[pcex.currentGoalIndex] = true;
		pcex.activityType = 'ch_not_solved';
		pcex.trackUserActivity();
		pcex.showCorrect();
	},

	showCorrect: function () {
		pcex.goalSolvedStates[pcex.currentGoalIndex] = true;
		$.each(pcex.currentGoal.blankLineList, function (i, blankLine) {
			var lineContent = pcex.createLineContent(blankLine.line, false, false);

			$("#line_" + blankLine.line.id).replaceWith(lineContent);
			hljs.highlightBlock(lineContent);
		});


		$.each(pcex.currentGoal.lineList, function (i, line) {
			$("#help_" + line.id).unbind('click').click(pcex.handleHelpButtonClicked).show();

		});

		pcex.higlightCorrectBlankLines(pcex.blankLineIDs);

		//TODO: make this part reusable and use it in next function as well
		if (pcex.currentGoalIndex != pcex.numberOfGoals - 1) {
			$('#next-button').removeClass('btn-primary').addClass('btn-challenge').attr('disabled', false).addClass('waves-effect waves-light');
		}
		pcex.displayAsFullyWorkedOut();
	},

	getSourceCode: function () {
		var sourceCode = "";
		$.each(pcex.currentGoal.lineList, function (i, line) {
			var index = $.inArray('line_' + line.id, pcex.blankLineIDs);
			if (index < 0) {
				sourceCode += line.content + "\n";
			} else {
				if (pcex.droppedTiles[index]) {
					sourceCode += pcex.getIndentedCode(pcex.droppedTiles[index].line, true, index) + "\n";
				} else {
					sourceCode += pcex.commentString + "FILL IN YOUR CODE HERE\n";
				}
			}

		});

		return sourceCode;
	},

	changeStyleToFullyWorkedOut: function () {
		$('#check-button').hide();
		$('#stop-animation-button').hide();
		$('#animation-next-button').hide();
		$('#animation-back-button').hide();
		$('#start-animation-button').show();
		$('#goal_description').html(pcex.currentGoal.goalDescription);
		$('#goal_title').removeClass('primary-challenge-color').addClass('primary-color');

		$('#next-button').removeClass('btn-challenge').addClass('btn-primary');

		if (!$('#back-button').attr("disabled")) {
			$('#back-button').removeClass('btn-challenge').addClass('btn-primary');
		}

		$('#explanation-div').hide();
		$('#drag-tile-div').hide();
	},

	displayAsFullyWorkedOut: function () {
		$('#check-button').hide();
		$('#stop-animation-button').hide();
		$('#animation-next-button').hide();
		$('#animation-back-button').hide();
		$('#start-animation-button').show();
		$('#goal_description').html(pcex.currentGoal.goalDescription);
		$('#explanation-div').hide();
		$('#drag-tile-div').hide();
		pcex.hideCheckCollapsible();
		$('#show-correct-button').hide();

	},

	changeStyleToChallenge: function () {
		$('#start-animation-button').hide();
		$('#stop-animation-button').hide();
		$('#animation-next-button').hide();
		$('#animation-back-button').hide();
		$('#check-button').show();


		$('#next-button').removeClass('btn-primary').addClass('btn-challenge');


		if ($('#back-button').hasClass('pcex_button') == false) {
			$('#back-button').removeClass().addClass('pcex_button btn-sm btn-responsive btn-challenge waves-effect waves-light');
		} else {
			$('#back-button').removeClass('btn-primary').addClass('btn-challenge');
		}


		$('#goal_description').html(pcex.currentGoal.goalDescription + "<br><br>Drag a tile to each missing field to construct this program.");
		$('#goal_title').removeClass('primary-color').addClass('primary-challenge-color');
		$('#drag-tile-div').show();
		$('#explanation-div').hide();
	},

	startAnimation: function (helpButtonClicked) {
		pcex.animationStarted = true;
		$('#start-animation-button').hide();
		$('#start-animation-shortcut-button').hide();
		$('#stop-animation-button').show();
		$('#animation-next-button').show();
		$('#animation-back-button').show();

		$('#explanation').empty();
		$('#explanation-div').show();
		pcex.hideCheckCollapsible();

		pcex.addAnimationExplanation(helpButtonClicked);
	},

	createHelpWindowContent: function (line, disableNavigation) {
		var helpDiv = document.createElement('div');
		$(helpDiv).attr('id', 'help_comment_' + line.id);
		$(helpDiv).attr('help_index', 0);

		$.each(line.commentList, function (i, comment) {
			var helpText = comment.replace(/"/g, '\'');
			var helpNode = document.createElement('p');
			$(helpNode).css('text-align', 'justify');
			$(helpNode).html(helpText + "<br>");
			$(helpDiv).append(helpNode);

			if (i > 0) { //Just show the first level comment
				$(helpNode).hide();
			}
		});

		if (!disableNavigation && line.commentList.length > 1) {
			var helpBackButton = document.createElement('a');
			$(helpBackButton).attr('id', 'help_back_line_' + line.id).addClass('btn btn-info btn-sm').html('Previous').attr('disabled', true);
			$(helpDiv).append(helpBackButton);

			var helpNextButton = document.createElement('a');
			$(helpNextButton).attr('id', 'help_next_line_' + line.id).addClass('btn btn-info btn-sm').html('Additional details');
			$(helpDiv).append(helpNextButton);
		}

		var wrapper = document.createElement('div');
		$(wrapper).append(helpDiv);

		return wrapper;
	},

	stopAnimation: function () {
		$('#start-animation-button').show();
		$('#stop-animation-button').hide();
		$('#animation-next-button').hide();
		$('#animation-back-button').hide();
		$('#animation-back-button').attr('disabled', true);
		$('#explanation-div').hide();
		$('#explanation').empty();

		var line = pcex.linesWithExplanation[pcex.animationStepIndex];
		$('#line_' + line.id).removeClass('animation-highlight blink-me');

		pcex.animationStepIndex = 0;
		pcex.animationStarted = false;
	},

	animationNext: function () {
		if (pcex.animationStepIndex > -1) {
			var line = pcex.linesWithExplanation[pcex.animationStepIndex];
			$('#line_' + line.id).removeClass('animation-highlight blink-me');
		}

		$('#explanation').empty();

		pcex.animationStepIndex++;
		pcex.addAnimationExplanation();
	},

	animationBack: function () {
		if (pcex.animationStepIndex > 0) {
			var line = pcex.linesWithExplanation[pcex.animationStepIndex];
			$('#line_' + line.id).removeClass('animation-highlight blink-me');
			$('#explanation').empty();

			pcex.animationStepIndex--;
			pcex.addAnimationExplanation();
		}
	},

	hideAllHelpButtons: function () {
		$.each(pcex.linesWithExplanation, function (i, line) {
			$('#help_' + line.id).hide();
		});
	},

	addAnimationExplanation: function (helpButtonClicked) {
		if (pcex.animationStepIndex > -1 && pcex.animationStepIndex < pcex.linesWithExplanation.length) {
			var line = pcex.linesWithExplanation[pcex.animationStepIndex];

			$('#line_' + line.id).addClass('animation-highlight');
			var helpContent = pcex.createHelpWindowContent(line);
			$('#explanation').append(helpContent).show();

			pcex.reportLineClicksToUm(line.number);
			if (!helpButtonClicked) { //helpButton clicks tracked separately
				pcex.trackExplanation('sequential', 1, line.number);
			}

			$(helpContent).find("a[id^='help_back']").click(function () {
				var line = pcex.linesWithExplanation[pcex.animationStepIndex];
				$('#line_' + line.id).removeClass('blink-me');
				var comments = $(this).parent().find('p');
				var commentLength = comments.length;
				var helpDiv = $(helpContent).find("div[id^='help_comment']");
				var index = parseInt(helpDiv.attr('help_index'));

				if (0 < index) {
					$(comments[index - 1]).show();
					$(comments[index]).hide();
					helpDiv.attr('help_index', --index);
					$(this).parent().find("a[id^='help_next']").attr('disabled', false);
				}

				if (index == 0) {
					$(this).attr('disabled', true);
				}

				pcex.trackExplanation('sequential', index + 1, line.number);

				return $('#line_' + line.id).addClass('blink-me');
			});
			$(helpContent).find("a[id^='help_next']").click(function () {
				var line = pcex.linesWithExplanation[pcex.animationStepIndex];
				$('#line_' + line.id).removeClass('blink-me');
				var comments = $(this).parent().find('p');
				var commentLength = comments.length;
				var helpDiv = $(helpContent).find("div[id^='help_comment']");
				var index = parseInt(helpDiv.attr('help_index'));

				if (index < commentLength) {
					$(comments[index + 1]).show();
					$(comments[index]).hide();
					helpDiv.attr('help_index', ++index);
					$(this).parent().find("a[id^='help_back']").attr('disabled', false);
				}

				if (index + 1 == commentLength) {
					$(this).attr('disabled', true);
				}

				pcex.trackExplanation('sequential', index + 1, line.number);

				return $('#line_' + line.id).addClass('blink-me');

			});

			var lineOffsetPosition = $('#line_' + line.id).offset().top + 20;

			var docViewTop = $(window).scrollTop();
			var docViewBottom = docViewTop + $(window).height();

			var explanationTop = $('#scrollable').position().top;
			var explanationBottom = explanationTop + $('#scrollable-content').height();

			if (((docViewTop < explanationTop) && (docViewBottom > explanationBottom)) == false ||
				(((lineOffsetPosition > docViewTop) && (lineOffsetPosition < docViewBottom)) == false)) {
				var lineRelativePosition = $('#line_' + line.id).position().top;
				$('#scrollable').css('top', lineRelativePosition);
				$(window).scrollTop(lineRelativePosition);
			}


			if (pcex.animationStepIndex == 0) {
				$('#animation-back-button').attr('disabled', true);
			} else {
				$('#animation-back-button').attr('disabled', false);
			}

			if (pcex.animationStepIndex == pcex.linesWithExplanation.length - 1) {
				$('#animation-next-button').attr('disabled', true);
			} else {
				$('#animation-next-button').attr('disabled', false);
			}
		}

	},

	showHint: function () {
		var relatedBlankLine;
		var relatedBlankLineIndex;
		var showIndentationHint = false;

		for (i = 0; i < pcex.blankLineIDs.length; i++) {
			var lineId = pcex.blankLineIDs[i];
			if (!pcex.correctBlankLineIDs.includes(lineId)) {
				relatedBlankLine = pcex.blankLines[i];
				relatedBlankLineIndex = i;

				if (pcex.indentedIncorrectBlanLineIDs.includes(lineId)) {
					showIndentationHint = true;
				}

				break;
			}
		}

		$('#line_' + relatedBlankLine.line.id).removeClass('code-blank-line-error').addClass('tile-dragged hint-highlight');

		var hintContent;

		if (showIndentationHint) {
			hintContent = document.createElement('div');
			var indentationMessage;
			var currentIndentLevel = pcex.droppedTileIndentation[i];
			var requiredIndentLevel = relatedBlankLine.line.indentLevel;
			var levelDifference = 0;

			if (currentIndentLevel < requiredIndentLevel) {
				indentationMessage = "Increase";
				levelDifference = requiredIndentLevel - currentIndentLevel;
			} else {
				indentationMessage = "Decrease";
				levelDifference = currentIndentLevel - requiredIndentLevel;
			}

			indentationMessage += " indentation in line " + relatedBlankLine.line.number + " by " + levelDifference;
			var messageSpan = document.createElement('span');
			$(messageSpan).html(indentationMessage);
			$(hintContent).append(messageSpan);

		} else {
			hintContent = pcex.createHelpWindowContent(relatedBlankLine.line, true);
		}

		pcex.trackHint('explanation', relatedBlankLine.line.number);

		$('#hint').append(hintContent);
		$('#hint-div').show();
		pcex.hideCheckCollapsible();
	},

	clearHint: function () {
		$('.hint-highlight').removeClass('hint-highlight');
		$('#hint').empty();
		$('#hint-div').hide();

		pcex.makeCheckButtonEnabledIfTilesFilled();
	},

	handleHelpButtonClicked: function (element) {
		pcex.stopAnimation();
		var clickedHelpButtonIndex = -1;
		var clickedHelpButtonLindeNumber = -1;

		$.each(pcex.linesWithExplanation, function (i, line) {
			if (line.id == $(element.currentTarget).attr('id').replace('help_', '')) {
				clickedHelpButtonIndex = i;
				clickedHelpButtonLindeNumber = line.number;
			}
		});

		pcex.trackExplanation('free', 1, clickedHelpButtonLindeNumber);

		pcex.animationStepIndex = clickedHelpButtonIndex;
		pcex.startAnimation(true);
	},

	overlayFadeOut: function () {
		$('#overlay').fadeOut(300, function () {
			$('.decrease-indent-button').css('z-index', '1');
			$('.increase-indent-button').css('z-index', '1');
			$('.decrease-indent-button').webuiPopover('destroy');
			$('.increase-indent-button').webuiPopover('destroy');
			$('#goal_column').css('z-index', '1');
		});
	},

	hideCheckCollapsible: function () {
		if (!$('#checkCollapsible').is(":hidden")) {
			$('#check-result-message').empty();
			try {
				$('#checkCollapsible').collapse('hide');
			}
			catch (err) {
				//To catch 'Uncaught Error: Collapse is transitioning' of bootstrap. Alpha version has this problem need to update bootstrap
			}
		}

	},

	isScrollNeeded: function () {
		return pcex.currentGoal.lineList.length > pcex.scrollLineLimit;
	},

	highlightGoalTitle: function () {
		var goalTitleHighlightCookie = Cookies.get('pcexGoalTitleHighlight');
		if (!goalTitleHighlightCookie) {
			Cookies.set('pcexGoalTitleHighlight', 'shown', { expires: 7 });
			$('#goal_column').css('z-index', '99999');
			$('#overlay').fadeIn(300);
		}

	},

	trackUserActivity: function () {
		if (pcex.userCredentials) {

			var trackingData = {
				user_id: pcex.userCredentials.user,
				group_id: pcex.userCredentials.group,
				session_id: pcex.userCredentials.sessionId,
				activity_set_name: pcex.currentGoal.activityName,
				activity_type: pcex.activityType,
				goal_name: pcex.currentGoal.fileName
			}

			pcex.reportToPcexServer("/track/activity", trackingData,
				function (data) {
					//called when successful
					if (!data.error) {
						pcex.pcexTrackingID = data.result[0].tracking_id;
					} else {
						pcex.pcexTrackingID = null;
					}

				},

				function (error) {
					pcex.pcexTrackingID = null;
				}
			);
		}

	},

	trackCheckResult: function (resultType, result, numberOfTrials, correctLineNumbers, incorrectLineNumbers, wrongAnswers) {
		if (pcex.pcexTrackingID) {
			var trackingData = {
				tracking_id: pcex.pcexTrackingID,
				result_type: resultType,
				correct_line_numbers: correctLineNumbers.toString(),
				incorrect_line_numbers: incorrectLineNumbers.toString(),
				wrong_answers: wrongAnswers.toString(),
				attempt_count: numberOfTrials,
				result: result
			}


			pcex.reportToPcexServer("/track/result", trackingData);
		}
	},

	trackExplanation: function (explanationType, explanationLevel, lineNumber) {
		if (pcex.pcexTrackingID) {

			var trackingData = {
				tracking_id: pcex.pcexTrackingID,
				explanation_type: explanationType,
				explanation_level: explanationLevel,
				line_number: lineNumber
			}

			pcex.reportToPcexServer("/track/explanation", trackingData);
		}

	},

	trackHint: function (hintType, lineNumber) {
		if (pcex.pcexTrackingID) {
			var trackingData = {
				tracking_id: pcex.pcexTrackingID,
				hint_type: hintType,
				line_number: lineNumber
			}

			pcex.reportToPcexServer("/track/hint", trackingData);
		}

	},

	reportToPcexServer: function (apiPath, trackingData, successFunc, errorFunc) {
		$.ajax({
			url: "http://pawscomp2.sis.pitt.edu/pcex/api" + apiPath,
			type: "POST",
			dataType: "json", // expected format for response
			contentType: "application/json; charset=utf-8", // send as JSON
			data: JSON.stringify({ trackingData }),
			success: successFunc,
			error: errorFunc
		});
	},

	reportCheckResultToUm: function (correct) {
		var result = -1;

		if (correct) {
			result = 1;
		} else {
			result = 0;
		}

		var sub = pcex.getCurrentGoalFileNameWithoutExtensions();

		var umParams = "app=" + pcex.umApplicationId +
			"&act=PCEX_Challenge" +
			"&sub=" + sub +
			"&res=" + result;

		pcex.reportToUM(umParams);
	},

	reportLineClicksToUm: function (lineNumber) {
		if (pcex.currentGoal.fullyWorkedOut) {
			var exampleFileName = pcex.getCurrentGoalFileNameWithoutExtensions();

			var umParams = "app=" + pcex.umApplicationId +
				"&act=" + exampleFileName +
				"&sub=" + lineNumber +
				"&res=-1";

			pcex.reportToUM(umParams);
		}

	},

	reportToUM: function (umParams) {
		if (pcex.userCredentials) {
			umParams += "&usr=" + pcex.userCredentials.user +
				"&grp=" + pcex.userCredentials.group +
				"&sid=" + pcex.userCredentials.sessionId +
				"&svc=" + pcex.userCredentials.svc;

			$.ajax({
				url: 'http://pawscomp2.sis.pitt.edu/cbum/um?' + umParams,
				type: "GET",
				complete: function () {
					//called when complete
				},

				success: function () {
					//console.log('reported to um');
				},

				error: function () {
					//console.log('um report error');
				},
			});

			//pcex.reportToUMThroughPCEX(umParams);
		}
	},

	getCurrentGoalFileNameWithoutExtensions: function () {
		return pcex.currentGoal.fileName.replace(".java", "").replace(".py", "");
	},

	reportToUMThroughPCEX: function (umParams) {
		$.ajax({
			url: 'http://pawscomp2.sis.pitt.edu/pcex/api/reportUM/' + umParams,
			type: "GET",
			complete: function () {
				//called when complete
			},

			success: function () {
				//console.log('reported to um');
			},

			error: function () {
				//console.log('um report error');
			},
		});
	},

}
