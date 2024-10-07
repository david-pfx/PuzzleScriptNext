var onLevelRestarted = new Event("levelRestarted");

var RandomGen = new RNG();

function getIntroScreen(text) {
	return {
		lines: [
			"", 
			"==================", 
			"", 
			"Puzzle Script Next",
			"Version 3.0b",
			"", 
			"==================", 
			"", 
			text
		], 
		options: []
	};
}

function getMessageScreen(text) {
	return {
		lines: [
			"", "", "", "", "", "", "", "", "", "", 
			text
		], 
		options: [ 10 ]
	};
}

function getStartScreen(texts) {
	const lines = [
		"", "", "", "", "", "",
		...texts,
	];
	return {
		lines: lines, 
		options: fillRange(6, lines.length),
	};
}

function getPauseScreen(state) {
	const lines = [
		"",
		"-< GAME PAUSED >-",
		state.levels[curLevelNo].title || "",
		"",
		"resume game",
		!state.metadata.norestart ? "replay level from the start" : null,
		state.metadata.level_select ? "go to level select screen" : null,
		"exit to title screen",
	].filter(l => l != null);

	return {
		lines: lines,
		options: fillRange(4, lines.length),
	};
}

function getLevelSelectScreen(inserts) {
	const lines = [
		"[ ESC: Back ]                ",
		"Level Select",
		""
	];
	const options = [ ];
	inserts.forEach(ins => {
		options.push(lines.length);
		lines.push(ins);
	});
	return { lines: lines, options: options };
}

const MENUITEM_CONTINUE = 'Continue';
const MENUITEM_LEVELSELECT = 'Level Select';
const MENUITEM_NEWGAME = 'New Game';
const MENUITEM_STARTGAME = 'Start Game';

const TITLE_WIDTH = 34;
const TITLE_HEIGHT = 13;

var titleImage=[];
var textMode=true;
var titleScreen=true;
var titleMode=0;//1 means title screen with options, 2 means level select, 3 means pause screen
var titleSelection=0;
var titleSelected=false;
var hoverSelection=-1; //When mouse controls are enabled, over which row the mouse is hovering. -1 when disabled.
let lineColorOverride = [];		// a sparse array of line numbers and colours to use
let linkStack = [];				// where a link goto came from

// restore saved level, checkpoint, solved sections on startup
function doSetupTitleScreenLevelContinue(){
    try {
        if (storage_has(document.URL)) {
            if (storage_has(document.URL+'_checkpoint')) {
                var backupStr = storage_get(document.URL+'_checkpoint');
                curlevelTarget = JSON.parse(backupStr);
                
                var arr = [];
                for(var p in Object.keys(curlevelTarget.dat)) {
                    arr[p] = curlevelTarget.dat[p];
                }
                curlevelTarget.dat = new Int32Array(arr);
            }
            curLevelNo = storage_get(document.URL); 
			if (storage_has(document.URL+"_sections")) {
				solvedSections = JSON.parse(storage_get(document.URL + "_sections"));
			}
		}
    } catch(ex) {
    }
}

doSetupTitleScreenLevelContinue();

function showContinueOptionOnTitleScreen(){
	return hasStartedTheGame() && !hasFinishedTheGame();
}

function hasStartedTheGame() {
	return (curLevelNo>0 || curlevelTarget !== null || storage_has(document.URL+'_checkpoint')) && (curLevelNo in state.levels);
}

function hasFinishedTheGame() {
	return state.metadata.level_select && solvedSections.length == state.sections.length
		|| curLevelNo >= state.levels.length - 1; 
}

function hasSolvedAtLeastOneSection() {
	return state.metadata.level_select && solvedSections.length > 0;
}

// call this before a new compile
function unloadGame() {
	state=introState;
	curLevel = new Level(0, 5, 5, 2, null, null);
	curLevel.objects = new Int32Array(0);
	levelEditorOpened = false;
	generateTitleScreen();
	canvasResize();
	//redraw();
	titleMode = 0;
	titleSelected=true;
}

function isContinueOptionSelected() {
	return state.metadata.skip_title_screen || (!state.metadata.continue_is_level_select && titleSelection == MENUITEM_CONTINUE);
}

function isNewGameOptionSelected() {
	return titleSelection == MENUITEM_NEWGAME || titleSelection == MENUITEM_STARTGAME;
}

function isLevelSelectOptionSelected() {
	return state.metadata.continue_is_level_select && titleSelection == MENUITEM_CONTINUE || titleSelection == MENUITEM_LEVELSELECT;
}

function generateTitleScreen(hoverLine, scrollIncrement, selectLine) {
	if (debugSwitch.includes('menu')) console.log(`generateTitleScreen()`, hoverLine, scrollIncrement, selectLine);
	lineColorOverride = [];
  	tryLoadCustomFont();

	titleMode=showContinueOptionOnTitleScreen()?1:0;

	if (state.levels.length===0) {
		titleImage = fillAndHighlight(getIntroScreen("Please select a game"));
		return;
  	}

    if (isSitelocked()) {
		titleImage = fillAndHighlight(getIntroScreen("This game is sitelocked!"));
		return;
	}

	if (titleMode===0) {
		const screen = getStartScreen([ MENUITEM_STARTGAME ]);
		titleImage = selectLine ? fillAndHighlight(screen, -1, -1, screen.options[0]) : fillAndHighlight(screen, screen.options[0]);
		titleSelection = selectLine ? MENUITEM_STARTGAME : null;
	} else {
		const playedGameBefore = hasStartedTheGame() || hasSolvedAtLeastOneSection()
		const options = [];
		options.push(playedGameBefore && !hasFinishedTheGame() ? MENUITEM_CONTINUE : MENUITEM_NEWGAME);
		if(state.metadata.level_select && (!state.metadata.continue_is_level_select || !playedGameBefore))
			options.push(MENUITEM_LEVELSELECT);
		if (playedGameBefore && !hasFinishedTheGame()) {
			options.push(MENUITEM_NEWGAME);
		}

		const screen = getStartScreen(options);
		if (levelSelectScrollPos == 0)
			levelSelectScrollPos = screen.options[0];
		else if (scrollIncrement && screen.options.includes(levelSelectScrollPos + scrollIncrement))
			levelSelectScrollPos += scrollIncrement;

		titleImage = fillAndHighlight(screen, levelSelectScrollPos, hoverLine, selectLine);
		const select = selectLine || hoverLine;
		titleSelection = screen.options.includes(select) ? options[screen.options.indexOf(select)] : false;  // todo: ???
	}

	const setImage = (n,text) => {
		if (!text) throw "image";
		titleImage[n] = text.padEnd(TITLE_WIDTH);
		if (state.metadata.keyhint_color) 
			lineColorOverride[n] = state.metadata.keyhint_color;
	}
	if (state.metadata.text_controls) {
		const text = wordwrap(state.metadata.text_controls, TITLE_WIDTH, true);
		text.slice(0, 3).forEach((t,x) => {
			setImage(10 + x, t);
		})
	} else {
		const tclick = state.metadata.mouse_drag || state.metadata.mouse_rdrag ? " Click, Tap, or Drag to interact" : " Click or Tap to interact";
		setImage(10, IsMouseGameInputEnabled() ? tclick : " Arrow keys or WASD to move");
		setImage(11, (state.metadata.noaction ? " X to select" : " X to action") + (state.metadata.norestart ? "" : ", R to restart"));
		const tundo = IsMouseGameInputEnabled() ? " Z or Middle Mouse Button to undo" : " Z to undo";
		setImage(12, (state.metadata.noundo ? " " : tundo));
	}

	const title = state.metadata.title || "PuzzleScript Next Game";

	const titleSplit = wordwrap(title, TITLE_WIDTH);
	const maxl = state.metadata.author ? 2 : 4;
	if (titleSplit.length > maxl) {
		titleSplit.splice(maxl);
		if (!hoverLine)
			logWarning(`Game title is too long to fit on screen, truncating to ${maxl} lines.`, state.metadata_lines.title, true);
	}
	titleSplit.forEach((line,x) => {
		titleImage[1 + x] = centerText(line.trim(), TITLE_WIDTH);
		if (state.metadata.title_color)
			lineColorOverride[1 + x] = state.metadata.title_color;
	});

	if (state.metadata.author) {
		const split = wordwrap("by " + state.metadata.author, TITLE_WIDTH);
		if (split.length > 2){
			split.splice(2);
			if (!hoverLine)
				logWarning("Author list too long to fit on screen, truncating to 2 lines.",state.metadata_lines.author, true);
		}
		split.forEach((line, x) => { 
			titleImage[3 + x]=line.trim().padStart(TITLE_WIDTH);
			if (state.metadata.author_color)
				lineColorOverride[3 + x] = state.metadata.author_color;
		});
	}
	redraw();
}

function goToPauseScreen() {
	// todo: de-yuck!
	levelSelectScrollPos = 0;
	titleSelected = false;
	timer = 0;
	quittingTitleScreen = false;
	quittingMessageScreen = false;
	titleMode = 3;
	titleScreen = true;
	textMode = true;
    againing = false;
	messagetext = "";
	statusText = "";

	generatePauseScreen();
}

function generatePauseScreen(hoverLine, scrollIncrement, selectLine) {
	if (debugSwitch.includes('menu')) console.log(`generatePauseScreen()`, hoverLine, scrollIncrement, selectLine);
	const screen = getPauseScreen(state);

	if (levelSelectScrollPos == 0)
		levelSelectScrollPos = screen.options[0];
	else if (scrollIncrement && screen.options.includes(levelSelectScrollPos + scrollIncrement))
		levelSelectScrollPos += scrollIncrement;

	titleImage = fillAndHighlight(screen, levelSelectScrollPos, hoverLine, selectLine);
	pauseSelection = (hoverLine >= 0 ? hoverLine : selectLine >= 0 ? selectLine : 0) - screen.options[0];
	redraw();
}

function selectPauseScreen(lineNo) { 
	const options = [
		() => {
			titleScreen = false;
			if (state.levels[curLevelNo].message) {
				drawMessageScreen(state.levels[curLevelNo].message);
			} else {
				textMode = false;
				canvasResize();
			}
		},
		!state.metadata.norestart ? () => {
			DoRestart(true);
			textMode = false;
			titleScreen = false;
			canvasResize();
		} : null,
		state.metadata.level_select ? () => {
			titleSelection = null;
			gotoLevelSelectScreen();
		} : null,
		() => {
			goToTitleScreen();
		}
	].filter(l => l != null);

	if (pauseSelection >= 0 && pauseSelection < options.length)
		options[pauseSelection]();
}

function centerText(text, len, fill = " ") {
	return !text ? fill.repeat(len)
		: text.length >= len ? text.slice(0, len)
		: (fill.repeat(~~((len - text.length) / 2)) + text).padEnd(len, fill);
}

function padToSize(textLines, width, height) {
	const lines = textLines.map(l => l.padEnd(width));
	while (lines.length < height) 
		lines.push("");
	return lines;
}

// return an array filled with integers from start to finish-1
function fillRange(start, finish) {
	return Array(finish - start).fill().map((item, index) => start + index);
};

function fillAndHighlight(image, highlight, hover, select) {
	const ll = image.lines.map((l,x) => 
		x == select && image.options.includes(x) ? centerText(`# ${l} #`, TITLE_WIDTH, "#") :
		x == hover && image.options.includes(x) ? centerText(`> ${l} <`, TITLE_WIDTH) : 
		x == highlight && image.options.includes(x) ? centerText(`# ${l} #`, TITLE_WIDTH) :
		centerText(l, TITLE_WIDTH));
	return padToSize(ll, TITLE_WIDTH, TITLE_HEIGHT);
}

let levelSelectScrollPos = 0;
let levelHighlightLine = 0;

function gotoLevelSelectScreen() {
	if(!state.metadata.level_select) {
		goToTitleScreen();
		return;
	}
	levelSelectScrollPos = 0;
	levelHighlightLine = 0;
	titleSelected = false;
	timer = 0;
	quittingTitleScreen = false;
	quittingMessageScreen = false;
	titleMode = 2;
	titleScreen = true;
	textMode = true;
    againing = false;
	messagetext = "";
	statusText = "";

	if (titleSelection == null) {
		for(var i = 0; i < state.sections.length; i++) {
			if(state.sections[i].firstLevel > curLevelNo) {
				titleSelection = Math.max(0,i-1);
				if (debugSwitch.includes('menu')) console.log(`gotoLevelSelect curLevelNo=${curLevelNo} titleSelection=${titleSelection}`);
				break;
			}
		}
  	}
  
  	state.metadata = deepClone(state.default_metadata);
  	twiddleMetadataExtras();

	generateLevelSelectScreen();
}

function generateLevelSelectScreen(hoverLine, scrollIncrement, selectLine) { 
	if (debugSwitch.includes('menu')) console.log('generateLevelSelectScreen()', hoverLine, scrollIncrement, selectLine);
	lineColorOverride = [];

	// set initial highlight to current level
	amountOfLevelsOnScreen = Math.min(9, state.sections.length);
	if(titleSelection < levelSelectScrollPos) { //Up
		levelSelectScrollPos = titleSelection;
	} else if(titleSelection >= levelSelectScrollPos + amountOfLevelsOnScreen) { //Down
		levelSelectScrollPos = titleSelection - amountOfLevelsOnScreen + 1;
	}

	var unlockedUntil = -1;
	if (state.metadata.level_select_lock) {
		// find last solved section:
		let unsolvedSections = 0;
		for(var i = 0; i < state.sections.length; i++) {
			if(solvedSections.indexOf(state.sections[i].name) >= 0) {
				unlockedUntil = i;
			} else {
				unsolvedSections++;
			}
		}
		if(state.metadata.level_select_unlocked_ahead !== undefined) {
			unlockedUntil += Number(state.metadata.level_select_unlocked_ahead);
		} else if (state.metadata.level_select_unlocked_rollover !== undefined) {
			unlockedUntil = solvedSections.length + Number(state.metadata.level_select_unlocked_rollover) - 1;
		} else {
			unlockedUntil += 1;
		}
	}

	//console.log(`levelHighlightLine=${levelHighlightLine} titleSelection=${titleSelection} levelSelectScrollPos=${levelSelectScrollPos}`)
	if (levelHighlightLine == 0)
		levelHighlightLine = 3 + titleSelection - levelSelectScrollPos;
	else if (levelHighlightLine > 3 && scrollIncrement < 0)
		levelHighlightLine--;
	else if (levelHighlightLine < 3 + amountOfLevelsOnScreen - 1 && scrollIncrement > 0)
		levelHighlightLine++;
	else if (levelSelectScrollPos > 0 && (levelHighlightLine == 3 || scrollIncrement < 0))
		levelSelectScrollPos--;
	else if (levelSelectScrollPos + amountOfLevelsOnScreen < state.sections.length && (levelHighlightLine == 11 || scrollIncrement > 0))
		levelSelectScrollPos++;

	titleSelection = levelHighlightLine - 3 + levelSelectScrollPos;

	const solved_symbol = state.metadata.level_select_solve_symbol || "X";

	const lines = state.sections.map((section,i) => {
		const solved = (solvedSections.indexOf(section.name) >= 0);
		const locked = (unlockedUntil >= 0 && i > unlockedUntil);
		let name = locked ? "*".repeat(section.name.length) : section.name.substring(0, 24);
		if (i == selectLine + levelSelectScrollPos - 3 && !locked) {
			if (i >= levelSelectScrollPos && i < levelSelectScrollPos + amountOfLevelsOnScreen)
				titleSelection = i;
			return (solved ? solved_symbol : " ") + "#" + name.padEnd(24);
		}
		return (solved ? solved_symbol : " ") + " " + name.padEnd(24);
	});

	const showLines = lines.slice(levelSelectScrollPos,levelSelectScrollPos + amountOfLevelsOnScreen);
	const screen = getLevelSelectScreen(showLines);
	if (debugSwitch.includes('menu')) console.log(`generateLevelSelectScreen2 titleSelection=${titleSelection}`, `levelSelectScrollPos=${levelSelectScrollPos}`, screen);
	titleImage = fillAndHighlight(screen, levelHighlightLine, hoverLine, selectLine);

	titleImage[0] = (hoverLine == 0 ? "[  ESC:Back  ]" : " [ ESC:Back ] ").padEnd(TITLE_WIDTH);
	if (levelSelectScrollPos > 0)
		titleImage[2] = (hoverLine == 2 ? "[  PREV  ]" : "[ PREV ] ").padStart(TITLE_WIDTH);
	if (levelSelectScrollPos + amountOfLevelsOnScreen < lines.length)
		titleImage[12] = (hoverLine == 12 ? "[  NEXT  ]" : "[ NEXT ] ").padStart(TITLE_WIDTH);
	redraw();
}

// go to level: <-1 for level index, >0 for section index, -9999 had compile error
function gotoLevel(index) {
	if (debugSwitch.includes('load')) console.log(`gotoLevel(${index})`);
	if (solving) return;
	if (index == -9999) return;  // It's an invalid GOTO
  
	againing = false;
	messagetext = "";
	statusText = "";

	if (index == 'levelall') {
		//curLevelNo = -1; //???
		curLevel = levelAllObjects(state);
	} else {
		curLevelNo = (index >= 0) ? state.sections[index].firstLevel : -1 - index;
		loadLevelFromStateOrTarget();
	}
	updateLocalStorage();
	resetFlickDat();
	canvasResize();	
	clearInputHistory();
}
  
function gotoLink() {
	if (debugSwitch.includes('load')) console.log('gotoLink()', `stack:`, linkStack);
  	if (solving) return;
	for (const position of playerPositions) {
		const level = state.levels[curLevelNo];
		const objids = level.getObjects(position);
		for (const link of state.links // use the most recent visible link definition
				.slice(0, level.linksTop)
				.reverse()) {
			if (objids.includes(link.object)) {
				const linkEntry = { 
					backup: backupLevel(), 		// will restore to this
					backupTop: backups.length 	// will prune to this
				};
				linkStack.push(linkEntry);
				gotoLevel(link.targetNo);
				return;
			}
		}
  	}  
}

function returnLink() {
	if (debugSwitch.includes('load')) console.log('returnLink()', `stack:`, linkStack);
	const linkEntry = linkStack.pop();
	const level = state.levels[linkEntry.backup.levelNo];
	backups = backups.slice(0, linkEntry.backupTop);
	if (verbose_logging)
		consolePrint(`Returning to level ${linkEntry.backup.levelNo} (${htmlJump(level.lineNumber)}).`, true, level.lineNumber);
	restoreLevel(linkEntry.backup);
	updateLocalStorage();
	resetFlickDat();
	canvasResize();	
	clearInputHistory();
}

let introState = {
  	title: "Empty Game",
  	attribution: "polyomino",
    objectCount: 2,
    metadata:[],
    levels:[],
	collisionLayerGroups: [],
    bgcolor:"#000000",
    fgcolor:"#FFFFFF"
};

var state = introState;

function deepClone(item) {
    if (!item) { return item; } // null, undefined values check

    var types = [ Number, String, Boolean ], 
        result;

    // normalizing primitives if someone did new String('aaa'), or new Number('444');
    types.forEach(function(type) {
        if (item instanceof type) {
            result = type( item );
        }
    });

    if (typeof result == "undefined") {
        if (Object.prototype.toString.call( item ) === "[object Array]") {
            result = [];
            item.forEach(function(child, index, array) { 
                result[index] = deepClone( child );
            });
        } else if (typeof item == "object") {
            // testing that this is DOM
            if (item.nodeType && typeof item.cloneNode == "function") {
                var result = item.cloneNode( true );    
            } else if (!item.prototype) { // check that this is a literal
                if (item instanceof Date) {
                    result = new Date(item);
                } else {
                    // it is an object literal
                    result = {};
                    for (var i in item) {
                        result[i] = deepClone( item[i] );
                    }
                }
            } else {
                // depending what you would like here,
                // just keep the reference, or create new object
/*                if (false && item.constructor) {
                    // would not advice to do that, reason? Read below
                    result = new item.constructor();
                } else */{
                    result = item;
                }
            }
        } else {
            result = item;
        }
    }

    return result;
}

function wordwrap( str, width, handleNewlines = false ) {
 
    width = width || 75;
    var cut = true;
 
	if (!str) return [ ];
 
	var regex = '.{1,' +width+ '}(\\s|$)' + (cut ? '|.{' +width+ '}|.+$' : '|\\S+?(\\s|$)');

	if (!handleNewlines) {
	
		return str.match( RegExp(regex, 'g') );
	} else {
		splitNewlines = str.split("\\n");
		var splitString  = [];
	
		splitNewlines.forEach(splitStr => {
			splitString = splitString.concat(splitStr.match( RegExp(regex, 'g') ));
		}) 
		
		//console.log(splitString);
		return splitString;
	}
 
}

var splitMessage=[];
function drawMessageScreen(message) {
	lineColorOverride = [];
	tryLoadCustomFont();
	titleMode=0;
	textMode=true;

	const screen = getMessageScreen(
		quittingMessageScreen ? "" 
		: state.metadata.text_message_continue ? state.metadata.text_message_continue
		: IsMouseGameInputEnabled() ? "Click or X to continue" : "X to continue");

	titleImage = fillAndHighlight(screen);
	if (state.metadata.keyhint_color)
		lineColorOverride[screen.options[0]] = state.metadata.keyhint_color;

	const splitMessage = wordwrap(message, TITLE_WIDTH, true);

	const lines = splitMessage.map(m => {
		return state.metadata.message_text_align == 'left' ? m.padEnd(TITLE_WIDTH)
		: state.metadata.message_text_align == 'right' ? m.padStart(TITLE_WIDTH)
		: centerText(m, TITLE_WIDTH);
	})

	lines.length = Math.min(lines.length, 12);
	const offset = 5 - ~~(lines.length / 2);

	lines.forEach((line,x) => {
		titleImage[x + offset] = line;
	})
 
  	canvasResize();
}

var loadedLevelSeed=0;

// workhorse to load and setup a new level
function loadLevelFromLevelDat(state,leveldat,randomseed,clearinputhistory) {	
	if (debugSwitch.includes('load')) console.log(`loadLevelFromLevelDat()`, leveldat);
	if (randomseed==null) {
		randomseed = (Math.random() + Date.now()).toString();
	}
	loadedLevelSeed = randomseed;
	RandomGen = new RNG(loadedLevelSeed);
	forceRegenImages=true;			// forces canvasResize to generate images
	ignoreNotJustPressedAction=true;
	titleScreen=false;
	titleMode=showContinueOptionOnTitleScreen()?1:0;
	titleSelection=0;
  	titleSelected=false;
  	dragging = false;
  	rightdragging = false;
  	state.metadata = deepClone(state.default_metadata);
    againing=false;
	suppressInput = false;
    if (leveldat===undefined) {
    	consolePrint("Trying to access a level that doesn't exist.",true);
		goToTitleScreen();
    	return;
    }
    if (leveldat.message) {
      	// This "level" is actually a message.
		if (verbose_logging)
			consolePrint(`Showing message (${htmlJump(leveldat.lineNumber)})`, true, leveldat.lineNumber);
      	ignoreNotJustPressedAction=true;
	  	tryPlayShowMessageSound();
	  	twiddleMetadataExtras();
      	drawMessageScreen(leveldat.message);
		messageselected = false;
      	canvasResize();
      	clearInputHistory();
    } else if (leveldat.target != undefined) {  // could be zero
		if (verbose_logging)
			consolePrint(`GOTO (${htmlJump(leveldat.lineNumber)})`, true, leveldat.lineNumber);
      	// This "level" is actually a goto.
      	//tryPlayGotoSound();
      	setSectionSolved(state.levels[Number(curLevelNo)].section)
      	gotoLevel(leveldat.target);
    } else {
      	titleMode=0;
      	textMode=false;
    	curLevel = leveldat.clone();
		if (verbose_logging)
			consolePrint(`Loading level ${leveldat.section || ''} (${htmlJump(leveldat.lineNumber)}).`, true, leveldat.lineNumber);  //todo:
    	RebuildLevelArrays();
        if (state!==undefined) {
	        if (state.metadata.flickscreen!==undefined){
	            oldflickscreendat=[
	            	0,
	            	0,
	            	Math.min(state.metadata.flickscreen[0],curLevel.width),
	            	Math.min(state.metadata.flickscreen[1],curLevel.height)
	            ];
	        } else if (state.metadata.zoomscreen!==undefined){
	            oldflickscreendat=[
	            	0,
	            	0,
	            	Math.min(state.metadata.zoomscreen[0],curLevel.width),
	            	Math.min(state.metadata.zoomscreen[1],curLevel.height)
	            ];
	        } else if (state.metadata.smoothscreen!==undefined){
	            oldflickscreendat=[
	            	0,
	            	0,
	            	Math.min(state.metadata.smoothscreen.screenSize.width,curLevel.width),
	            	Math.min(state.metadata.smoothscreen.screenSize.height,curLevel.height)
	            ];
	        }
        }

      	initSmoothCamera();
      	twiddleMetadataExtras();

		if (!state.metadata.allow_undo_level)
	    	backups = [];
		restartTarget=backupLevel();
		keybuffer=[];

	    if ('run_rules_on_level_start' in state.metadata) {
			runrulesonlevelstart_phase=true;
			processInput(-1,true);
			runrulesonlevelstart_phase=false;
	    }
	}

	if (clearinputhistory===true){
		clearInputHistory();
	}
}

function loadLevelFromStateTarget(state,levelindex,target,randomseed) { 
	if (debugSwitch.includes('load')) console.log(`loadLevelFromStateTarget(${levelindex},${target})`);
    var leveldat = target;    
  	curLevelNo=levelindex;
  	curlevelTarget=target;
    if (leveldat.message===undefined) {
      	if (levelindex=== 0){ 
			tryPlayStartGameSound();
			//tryPlayStartLevelSound();     
		} else {
			tryPlayStartLevelSound();     
		}
    }
    loadLevelFromLevelDat(state,state.levels[levelindex],randomseed);
    restoreLevel(target, true);
    restartTarget=target;
}

function loadLevelFromState(state,levelindex,randomseed) {  
	if (debugSwitch.includes('load')) console.log(`loadLevelFromState(${levelindex})`);
	var leveldat = state.levels[levelindex];    
	curLevelNo=levelindex;
	curlevelTarget=null;
    if (leveldat!==undefined && leveldat.message===undefined) {
		document.dispatchEvent(new CustomEvent("psplusLevelLoaded", {detail: levelindex}));
      	if (levelindex=== 0){ 
      		tryPlayStartLevelSound();
    	} else {
      		tryPlayStartLevelSound();     
    	}
	}

    loadLevelFromLevelDat(state,leveldat,randomseed);
}

var objectSprites = [
{
    color: '#423563',
    dat: [
        [1, 1, 1, 1, 1],
        [1, 0, 0, 0, 1],
        [1, 0, 0, 0, 1],
        [1, 0, 0, 0, 1],
        [1, 1, 1, 1, 1]
    ]
},
{
    color: '#252342',
    dat: [
        [0, 0, 1, 0, 0],
        [1, 1, 1, 1, 1],
        [0, 0, 1, 0, 0],
        [0, 1, 1, 1, 0],
        [0, 1, 0, 1, 0]
    ]
}
];

loadedCustomFont = false;

function tryLoadCustomFont() {
	if(state == null || state.metadata == null || state.metadata.custom_font == undefined || loadedCustomFont) {
		return;
	}

	var custom_font = new FontFace('PuzzleCustomFont', 'url('+state.metadata.custom_font+')');
	custom_font.load().then(function(loaded_face) {
		document.fonts.add(loaded_face);
		loadedCustomFont = true;
		canvasResize();
	}).catch(function(error) {alert("Unable to load font!");});
}

tryLoadCustomFont();

generateTitleScreen();
if (titleMode>0){
	titleSelection=0;
}

canvasResize();

function tryPlaySimpleSound(soundname) {
  if (state.sfx_Events[soundname]!==undefined) {
    var seed = state.sfx_Events[soundname];
		playSeed(seed,true);
  }
}
function tryPlayTitleSound() {
  tryPlaySimpleSound("titlescreen");
}

function tryPlayStartGameSound() {
  tryPlaySimpleSound("startgame");
}

function tryPlayEndGameSound() {
  tryPlaySimpleSound("endgame");
}

function tryPlayCancelSound() {
  tryPlaySimpleSound("cancel");
}

function tryPlayStartLevelSound() {
  tryPlaySimpleSound("startlevel");
}

function tryPlayEndLevelSound() {
  tryPlaySimpleSound("endlevel");
}

function tryPlayUndoSound(){
  tryPlaySimpleSound("undo");
}

function tryPlayRestartSound(){
  tryPlaySimpleSound("restart");
}

function tryPlayShowMessageSound(){
  tryPlaySimpleSound("showmessage");
}

function tryPlayCloseMessageSound(){
  tryPlaySimpleSound("closemessage");
}

var backups=[];
var restartTarget;

// create backup of level data for undo, restart, etc
function backupLevel() {
	const ret = level4Serialization();
	if (state.metadata.runtime_metadata_twiddling !== undefined) {
      	var metadata = deepClone(state.metadata)
      	delete metadata.custom_font;
      	ret.metadata = metadata;
    }
	return ret;
}

function level4Serialization() {
	var ret = {
		dat : Array.from(curLevel.objects),
		width : curLevel.width,
		height : curLevel.height,
		oldflickscreendat: oldflickscreendat.concat([]),
    	cameraPositionTarget: Object.assign({}, cameraPositionTarget),
		levelNo: curLevelNo,
	};
	return ret;
}


// major function to set up game state on start of run
function setGameState(_state, command, randomseed) {
	if (debugSwitch.includes('load')) console.log(`setGameState(${command})`);  //todo:
	oldflickscreendat = [];
	linkStack = [];
	timer = 0;
	autotick = 0;
	winning = false;
	againing = false;
	messageselected = false;
	STRIDE_MOV = _state.STRIDE_MOV;
	STRIDE_OBJ = _state.STRIDE_OBJ;

	sfxCreateMask = new BitVec(STRIDE_OBJ);		// doc: mask for objects that were created
	sfxDestroyMask = new BitVec(STRIDE_OBJ);		// doc: mask for objects that were destroyed

	if (command === undefined) {
		command = ["restart"];
	}
	if ((state.levels.length === 0 || _state.levels.length === 0) && command.length > 0 && command[0] === "rebuild") {
		command = ["restart"];
	}
	if (randomseed === undefined) {
		randomseed = null;
	}
	RandomGen = new RNG(randomseed);

	state = _state;

    if (command[0]!=="rebuild"){
      backups=[];
    }
    //set sprites
    objectSprites = [];
    for (const n in state.objects) {
        if (state.objects.hasOwnProperty(n)) {
            const object = state.objects[n];
			objectSprites[object.id] = {
                dat: object.spritematrix,
                colors: object.colors,
				text: object.spritetext,
                vector: object.vector,
				scale: object.scale,
            };
        }
    }
    if (state.metadata.realtime_interval!==undefined) {
      autotick=0;
      autotickinterval=state.metadata.realtime_interval*1000;
    } else {
      autotick=0;
      autotickinterval=0;
    }

	// set defaults and stay DRY
	twiddleMetadataExtras();
    
	if (throttle_movement && autotickinterval===0) {
      logWarning("throttle_movement is designed for use in conjunction with realtime_interval. Using it in other situations makes games gross and unresponsive, broadly speaking.  Please don't.");
    }
    norepeat_action = state.metadata.norepeat_action!==undefined;

    switch(command[0]){
    	case "restart":
    	{
		    winning=false;
		    timer=0;
		    titleScreen=true;
		    tryPlayTitleSound();
		    textMode=true;
		    titleSelection=0;
		    titleSelected=false;
		    quittingMessageScreen=false;
		    quittingTitleScreen=false;
			titleMode = showContinueOptionOnTitleScreen() ? 1 : 0;

			if (state.metadata.skip_title_screen!==undefined) {
				consolePrint("skip_title_screen enabled, proceeding to do exactly as it says on the tin.")
				if(state.metadata["continue_is_level_select"] !== undefined) {
					gotoLevelSelectScreen();
				}
				else if(titleMode <= 1) {
					nextLevel();
				} else if(titleMode == 2) {
					gotoLevel(titleSelection);
				}
			} else {
				generateTitleScreen();
			}

		    break;
		}
		case "rebuild":
		{
			//do nothing
			break;
		}
		case "loadFirstNonMessageLevel":{
			for (var i=0;i<state.levels.length;i++){
				if (state.levels[i].message){
					continue;
				}
				var targetLevel = i;
				curLevelNo=targetLevel;
				curlevelTarget=null;
			    winning=false;
			    timer=0;
			    titleScreen=false;
			    textMode=false;
			    titleSelected=false;
			    quittingMessageScreen=false;
			    quittingTitleScreen=false;
			    titleMode = 0;
				showLayers = false;
				loadLevelFromState(state,targetLevel,randomseed);
				break;
			}
			break;	
		}
		case "loadLevel":
		{
			var targetLevel = command[1];
			curLevelNo=targetLevel;
			curlevelTarget=null;
		    winning=false;
		    timer=0;
		    titleScreen=false;
		    textMode=false;
		    titleSelected=false;
		    quittingMessageScreen=false;
		    quittingTitleScreen=false;
		    titleMode = 0;
			showLayers = false;
			loadLevelFromState(state,targetLevel,randomseed);
			break;
		}
		case "levelline":
		{
			var targetLine = command[1];
			for (var i=state.levels.length-1;i>=0;i--) {
				var level= state.levels[i];
				if(level.lineNumber<=targetLine+1) {
					curLevelNo=i;
					curlevelTarget=null;
				    winning=false;
				    timer=0;
				    titleScreen=false;
				    textMode=false;
				    titleSelected=false;
				    quittingMessageScreen=false;
				    quittingTitleScreen=false;
				    titleMode = 0;
					showLayers = false;
					loadLevelFromState(state,i);
					break;
				}
			}
			break;
		}
	}

	if(command[0] !== "rebuild") {
		clearInputHistory();
	}
	canvasResize();

	if (state.sounds.length==0){
		killAudioButton();
	} else {
		showAudioButton();
	}
}

function RebuildLevelArrays() {
  curLevel.movements = new Int32Array(curLevel.n_tiles * STRIDE_MOV);

    curLevel.rigidMovementAppliedMask = [];
    curLevel.rigidGroupIndexMask = [];
	curLevel.rowCellContents = [];
	curLevel.rowCellContents_Movements = [];
	curLevel.colCellContents = [];
	curLevel.colCellContents_Movements = [];
	curLevel.mapCellContents = new BitVec(STRIDE_OBJ);
	curLevel.mapCellContents_Movements = new BitVec(STRIDE_MOV);

	//I have these to avoid dynamic allocation - I generate 3 because why not, 
	//but according to my tests I never seem to call this while a previous copy is still in scope
	_movementVecs = [new BitVec(STRIDE_MOV),new BitVec(STRIDE_MOV),new BitVec(STRIDE_MOV)];
	_rigidVecs = [new BitVec(STRIDE_MOV),new BitVec(STRIDE_MOV),new BitVec(STRIDE_MOV)];

	_o1 = new BitVec(STRIDE_OBJ);
	_o2 = new BitVec(STRIDE_OBJ);
	_o2_5 = new BitVec(STRIDE_OBJ);
	_o3 = new BitVec(STRIDE_OBJ);
	_o4 = new BitVec(STRIDE_OBJ);
	_o5 = new BitVec(STRIDE_OBJ);
	_o6 = new BitVec(STRIDE_OBJ);
	_o7 = new BitVec(STRIDE_OBJ);
	_o8 = new BitVec(STRIDE_OBJ);
	_o9 = new BitVec(STRIDE_OBJ);
	_o10 = new BitVec(STRIDE_OBJ);
	_o11 = new BitVec(STRIDE_OBJ);
	_o12 = new BitVec(STRIDE_OBJ);
	_m1 = new BitVec(STRIDE_MOV);
	_m2 = new BitVec(STRIDE_MOV);
	_m3 = new BitVec(STRIDE_MOV);
	

    for (var i=0;i<curLevel.height;i++) {
      curLevel.rowCellContents[i]=new BitVec(STRIDE_OBJ);        
    }
    for (var i=0;i<curLevel.width;i++) {
      curLevel.colCellContents[i]=new BitVec(STRIDE_OBJ);        
    }

    for (var i=0;i<curLevel.height;i++) {
    	curLevel.rowCellContents_Movements[i]=new BitVec(STRIDE_MOV);	    	
    }
    for (var i=0;i<curLevel.width;i++) {
    	curLevel.colCellContents_Movements[i]=new BitVec(STRIDE_MOV);	    	
    }

    for (var i=0;i<curLevel.n_tiles;i++)
    {
        curLevel.rigidMovementAppliedMask[i]=new BitVec(STRIDE_MOV);
        curLevel.rigidGroupIndexMask[i]=new BitVec(STRIDE_MOV);
    }
}

let messagetext="";			// text for command message
let statusText = "";  		// text for status line
let gosubTarget = -1;  		// name of target gosub
var currentMovedEntities = {};
var newMovedEntities = {};

function applyDiff(diff, level_objects) {

	var index=0;
	
	while (index<diff.dat.length){
		var start_index = diff.dat[index];
		var copy_length = diff.dat[index+1];
		if (copy_length===0){
			break;//tail of buffer is all 0s
		}
		for (var j=0;j<copy_length;j++){
			level_objects[start_index+j]=diff.dat[index+2+j];
		}
		index += 2 + copy_length;
	}
}

function unconsolidateDiff(before,after) {

	// If before is not a diff, return it, otherwise generate a complete 'before' 
	// state from the 'after' state and the 'diff' (remember, the diffs are all 
	// backwards...).
	if (!before.hasOwnProperty("diff")) {
		return before;
	}

	var after_objects = new Int32Array(after.dat);
	applyDiff(before, after_objects);

	return {
		dat: after_objects,
		width: before.width,
		height: before.height,
		oldflickscreendat: before.oldflickscreendat
	}
}

function restoreLevel(lev, snapCamera, resetTween = true, resetAutoTick = true) {
	if (debugSwitch.includes('load')) console.log(`restoreLevel()`, lev);
	var diffing = lev.hasOwnProperty("diff");

	oldflickscreendat=lev.oldflickscreendat.concat([]);

	if (resetTween) {
		currentMovedEntities = {};
		//console.log("Wiped movedEntities (level)")
	}

	const switchLevel = lev.levelNo >= 0 && lev.levelNo != curLevelNo;
	if (switchLevel) {
		curLevelNo = lev.levelNo;
		curLevel = state.levels[curLevelNo].clone();
	}

	if (diffing){
		applyDiff(lev, curLevel.objects);
	} else {	
		curLevel.objects = new Int32Array(lev.dat);
	}

	if (switchLevel || curLevel.width !== lev.width || curLevel.height !== lev.height) {
		if (debugSwitch.includes('load')) console.log(`Restore level: from ${curLevel.width}x${curLevel.height} to ${lev.width}x${lev.height}`)
		curLevel.width = lev.width;
		curLevel.height = lev.height;
		curLevel.n_tiles = lev.width * lev.height;
		RebuildLevelArrays();
		//regenerate all other stride-related stuff
	} else {
	// layercount doesn't change

		for (var i=0;i<curLevel.n_tiles;i++) {
			curLevel.movements[i]=0;
			curLevel.rigidMovementAppliedMask[i].setZero();
			curLevel.rigidGroupIndexMask[i].setZero();
		}	

	    for (var i=0;i<curLevel.height;i++) {
	    	var rcc = curLevel.rowCellContents[i];
	    	rcc.setZero();
	    }
	    for (var i=0;i<curLevel.width;i++) {
	    	var ccc = curLevel.colCellContents[i];
	    	ccc.setZero();
	    }
	}

    if (lev.cameraPositionTarget) {
      	cameraPositionTarget = Object.assign({}, lev.cameraPositionTarget);

      	if (snapCamera) {
        	cameraPosition = Object.assign({}, cameraPositionTarget)
      	}
    }
    
    if (state.metadata.runtime_metadata_twiddling !== undefined) {
		if (lev.metadata === undefined) {
			lev.metadata = deepClone(state.default_metadata);
			consolePrint("RUNTIME METADATA TWIDDLING: Reloaded level state that did not have saved metadata. "+
			"Likely this state was recovered from a CHECKPOINT. Using the default metadata instead.", true);
		}
	 	state.metadata = deepClone(lev.metadata);
     	twiddleMetadataExtras(resetAutoTick);
    }

    againing=false;
	messagetext = "";  //fix for hang
    curLevel.commandQueue=[];
    curLevel.commandQueueSourceRules=[];
}

// globals
var zoomscreen=false;
var flickscreen=false;
var smoothscreen=false;
var screenwidth=0;		// size of displayed area in cells
var screenheight=0;

//compresses 'before' into diff
function consolidateDiff(before,after){
	if (before.width !== after.width || before.height!==after.height || before.dat.length!==after.dat.length){
		return before;
	}
	if (before.hasOwnProperty("diff")||after.hasOwnProperty("diff")){
		return before;
	}
	//only generate diffs if level size is bigger than this
	if (before.dat.length<1024){
		return before;
	}
	//diff structure: repeating ( start,length, [ data ] )
	var result = new Int32Array(128);
	var position=0;
	var chain=false;
	var chain_start_idx_in_diff=-1;
	var before_dat = before.dat;
	var after_dat = after.dat;
	for (var i=0;i<before_dat.length;i++){
		if (chain===false){
			if (before_dat[i]!==after_dat[i]){
				chain=true;
				chain_start_idx_in_diff = position;

				if (result.length<position+4){
					var doubled = new Int32Array(2*result.length);
					doubled.set(result);
					result = doubled;
				}

				result[position+0]=i;
				result[position+1]=1;
				result[position+2]=before_dat[i];
				position+=3;
			}
		} else {
			if (before_dat[i]!==after_dat[i]){
				
				if (position+1>=result.length){
					if (result.length<position+4){
						var doubled = new Int32Array(2*result.length);
						doubled.set(result);
						result = doubled;
					}	
				}
				result[chain_start_idx_in_diff+1]++;
				result[position]=before_dat[i];
				position++;
			} else {
				chain=false;
			}
		}
	}
	return {		
		diff : true,
		dat : result,
		width : before.width,
		height : before.height,
		oldflickscreendat: before.oldflickscreendat,
		metadata: before.metadata,
	}
}

function addUndoState(bak){
	if (debugSwitch.includes('undo')) console.log(`addUndoState length=${backups.length} bak=`, bak);
	backups.push(bak);
	if(backups.length>2 && !backups[backups.length-1].hasOwnProperty("diff")){
		backups[backups.length-3]=consolidateDiff(backups[backups.length-3],backups[backups.length-2]);
	}
}

function DoRestart(force) {
	if (restarting===true){
		return;
	}
	if (force!==true && ('norestart' in state.metadata)) {
		return;
	}
	restarting=true;
	if (force!==true) {
		addUndoState(backupLevel());
	}

	if (verbose_logging) {
		consolePrint("--- restarting ---",true);
	}

	restoreLevel(restartTarget, true);
	tryPlayRestartSound();
	document.dispatchEvent(new CustomEvent("psplusLevelRestarted", {detail: curLevelNo}));

	if ('run_rules_on_level_start' in state.metadata) {
    	processInput(-1,true);
  }
  
  twiddleMetadataExtras();
	
	curLevel.commandQueue=[];
	curLevel.commandQueueSourceRules=[];
	restarting=false;
}

function backupDiffers(){
	if (backups.length==0){
		return true;
	}
	var bak = backups[backups.length-1];

	if (bak.hasOwnProperty("diff")){
		return bak.dat.length!==0 && bak.dat[1]!==0;//if it's empty or if it's all 0s
	} else {
		for (var i=0;i<curLevel.objects.length;i++) {
			if (curLevel.objects[i]!==bak.dat[i]) {
				return true;
			}
		}
		return false;
	}
}

function DoUndo(force,ignoreDuplicates, resetTween = true, resetAutoTick = true, forceSFX = false) {
  if ((!levelEditorOpened)&&('noundo' in state.metadata && force!==true)) {
    return;
  }

  if (ignoreDuplicates){
    while (backupDiffers()==false){
      backups.pop();
    }
  }

  if (verbose_logging) {
    consolePrint(backups.length > 0 ? "--- undoing ---" : "Nothing to undo.",true);
  }

  if (backups.length>0) {
    var torestore = backups[backups.length-1];
	if (debugSwitch.includes('undo')) console.log(`DoUndo length=${backups.length} torestore=`, torestore);
    restoreLevel(torestore, null, resetTween, resetAutoTick);
    backups = backups.splice(0,backups.length-1);
	// look for undo across link
	if (linkStack.length > 0 && linkStack.at(-1).backupTop == backups.length)
	  linkStack.pop();
    if (! force || forceSFX) {
      tryPlayUndoSound();
    }
  }
}

// static data used here and elsewhere

// maps between mask values and movement names
var dirMaskName = {
	1: 'up',
	2: 'down',
	3: 'no',
	4: 'left',
	8: 'right',
	15: '?',
	16: 'action',
	18: 'random',
	32: 'lclick',
	64: 'rclick',
	// todo: ??: 'mclick',
	// todo: ??: 'reaction',
};

var dirMasks = {
	'up': 1,
	'down': 2,
	'no': 3,
	'left': 4,
	'randomdir': 5,
	'right': 8,
	'moving': 15,
	'action': 16,
	'random': 18,
	'lclick': 32,
	'rclick': 64,
	// todo: 'mclick': ??,
	// todo: 'reaction': ??,
	'': 0
};

// X and Y increments for each move (in mask form)
var dirMasksDelta = {
	1: [0, -1],
	2: [0, 1],
	3: [0, 0],
	4: [-1, 0],
	8: [1, 0],
	15: [0, 0],
	16: [0, 0],
	18: [0, 0],
	32: [0, 0],
	64: [0, 0]
};

// utility functions
function getObject(objid) {
	return state.objects[state.idDict[objid]];
}

// get movement in layer from movement mask
function getLayerMovement(movmask, layer) {
	return movmask.getshiftor(MOV_MASK, MOV_BITS * layer);
}

// update position index by x and y
function deltaPositionIndex(level, positionIndex, x, y) {
	return positionIndex + y + x * level.height;
}

function getPlayerPositions() {
    var result=[];
    var playerMask = state.playerMask;
    for (var i=0;i<curLevel.n_tiles;i++) {
        curLevel.getCellInto(i,_o11);
        if (playerMask.anyBitsInCommon(_o11)) {
            result.push(i);
        }
    }
    return result;
}

function getLayersOfMask(cellMask) {
    var layers=[];
    for (var i=0;i<state.objectCount;i++) {
        if (cellMask.get(i)) {
            var n = state.idDict[i];
            var o = state.objects[n];
            layers.push(o.layer)
        }
    }
    return layers;
}

function moveEntitiesAtIndex(positionIndex, entityMask, dirMask) {
    var cellMask = curLevel.getCell(positionIndex);
    cellMask.iand(entityMask);
    var layers = getLayersOfMask(cellMask);

    var movementMask = curLevel.getMovements(positionIndex);
    for (var i=0;i<layers.length;i++) {
      movementMask.ishiftor(dirMask, MOV_BITS * layers[i]);
    }
    curLevel.setMovements(positionIndex, movementMask);

	var colIndex=(positionIndex/curLevel.height)|0;
	var rowIndex=(positionIndex%curLevel.height);
	curLevel.colCellContents_Movements[colIndex].ior(movementMask);
	curLevel.rowCellContents_Movements[rowIndex].ior(movementMask);
	curLevel.mapCellContents_Movements.ior(movementMask);
}


function startMovement(dir) {
  var movedany=false;
    var playerPositions = getPlayerPositions();
    for (var i=0;i<playerPositions.length;i++) {
        var playerPosIndex = playerPositions[i];
        moveEntitiesAtIndex(playerPosIndex,state.playerMask,dir);
    }
    return playerPositions;
}

var seedsToPlay_CanMove=[];
var seedsToPlay_CantMove=[];
var seedsToAnimate={};  // doc: "positition,layer": { kind:, seed:, dir: }

function repositionEntitiesOnLayer(positionIndex,layer,dirMask) 
{
    var delta = dirMasksDelta[dirMask];

    var dx = delta[0];
    var dy = delta[1];
    var tx = ((positionIndex/curLevel.height)|0);
    var ty = ((positionIndex%curLevel.height));
    var maxx = curLevel.width-1;
    var maxy = curLevel.height-1;

    if ( (tx===0&&dx<0) || (tx===maxx&&dx>0) || (ty===0&&dy<0) || (ty===maxy&&dy>0)) {
      return false;
    }

    var targetIndex = (positionIndex+delta[1]+delta[0]*curLevel.height);

    var layerMask = state.layerMasks[layer];
    var targetMask = curLevel.getCellInto(targetIndex,_o7);
	var sourceMask = curLevel.getCellInto(positionIndex,_o8);

    if (layerMask.anyBitsInCommon(targetMask) && (dirMask < 16)) {		// tofix: 16
        return false;
    }

	// for each sound movement event, which applies to a single object and layer
	for (let i=0;i<state.sfx_MovementMasks[layer].length;i++) {
		const fx = state.sfx_MovementMasks[layer][i];
		if (sourceMask.get(fx.objId)) {
      		var movementMask = curLevel.getMovements(positionIndex);
      		var directionMask = fx.directionMask;
			// does it match any movement at this location?
      		if (movementMask.anyBitsInCommon(directionMask)) {  // bug: two objects at location can cause false trigger
    			if (verbose_logging) 
					consolePrint(`Object "${state.idDict[fx.objId]}" has moved, playing seed "${fx.seed}".`)
				if (fx.seed.startsWith('afx')) {
					const object = getObject(fx.objId);
					const move = getLayerMovement(movementMask, object.layer);
					const position = deltaPositionIndex(curLevel, positionIndex, dirMasksDelta[move][0], dirMasksDelta[move][1])
					seedsToAnimate[position+','+fx.objId] = { 
						kind: 'move', 
						seed: fx.seed, 
						dir: move 
					};
				}
				else if (seedsToPlay_CanMove.indexOf(fx.seed)===-1)
					seedsToPlay_CanMove.push(fx.seed);
      		}
    	}
  	}

    var movingEntities = sourceMask.clone();
    sourceMask.iclear(layerMask);
    movingEntities.iand(layerMask);
    targetMask.ior(movingEntities);

    curLevel.setCell(positionIndex, sourceMask);
	curLevel.setCell(targetIndex, targetMask);
	
    var colIndex=(targetIndex/curLevel.height)|0;
	var rowIndex=(targetIndex%curLevel.height);
	
    curLevel.colCellContents[colIndex].ior(movingEntities);
    curLevel.rowCellContents[rowIndex].ior(movingEntities);
	//corresponding movement stuff in setmovements
    return true;
}

function repositionEntitiesAtCell(positionIndex) {
    var movementMask = curLevel.getMovements(positionIndex);
    if (movementMask.iszero())
        return false;

    var moved=false;
    for (var layer=0;layer<curLevel.layerCount;layer++) {
        var layerMovement = movementMask.getshiftor(MOV_MASK, MOV_BITS * layer);
        if (layerMovement!==0) {
            var thismoved = repositionEntitiesOnLayer(positionIndex,layer,layerMovement);
            if (thismoved) {
				if (state.metadata.tween_length) {
					var delta = dirMasksDelta[layerMovement];
					var targetIndex = (positionIndex+delta[1]+delta[0]*curLevel.height);

					newMovedEntities["p"+targetIndex+"-l"+layer] = layerMovement;
				}

                movementMask.ishiftclear(layerMovement, MOV_BITS * layer);
				moved = true;
            }
        }
    }

    curLevel.setMovements(positionIndex, movementMask);

    return moved;
}


function Level(lineNumber, width, height, layerCount, objects, section) {
	this.lineNumber = lineNumber;
	this.width = width;
	this.height = height;
	this.n_tiles = width * height;
	this.objects = objects;
	this.section = section;
	this.layerCount = layerCount;
	this.commandQueue = [];
	this.commandQueueSourceRules = [];
}

Level.prototype.delta_index = function(direction)
{
	const [dx, dy] = dirMasksDelta[direction]
	return dx*this.height + dy
}

Level.prototype.clone = function() {
	var clone = new Level(this.lineNumber, this.width, this.height, this.layerCount, null, this.section);
	clone.objects = new Int32Array(this.objects);
	return clone;
}

Level.prototype.getCell = function(index) {
  return new BitVec(this.objects.subarray(index * STRIDE_OBJ, index * STRIDE_OBJ + STRIDE_OBJ));
}

Level.prototype.getCellInto = function(index,targetarray) {
  for (var i=0;i<STRIDE_OBJ;i++) {
    targetarray.data[i]=this.objects[index*STRIDE_OBJ+i]; 
  }
  return targetarray;
}

Level.prototype.setCell = function(index, vec) {
  for (var i = 0; i < vec.data.length; ++i) {
    this.objects[index * STRIDE_OBJ + i] = vec.data[i];
  }
}

var _movementVecs;
var _movementVecIndex=0;
Level.prototype.getMovements = function(index) {
  var _movementsVec=_movementVecs[_movementVecIndex];
  _movementVecIndex=(_movementVecIndex+1)%_movementVecs.length;

  for (var i=0;i<STRIDE_MOV;i++) {
		_movementsVec.data[i]= this.movements[index*STRIDE_MOV+i];	
  }
  return _movementsVec;
}

Level.prototype.getRigids = function(index) {
	return this.rigidMovementAppliedMask[index].clone();
}

Level.prototype.getMovementsInto = function(index,targetarray) {
	var _movementsVec=targetarray;

	for (var i=0;i<STRIDE_MOV;i++) {
		_movementsVec.data[i]=this.movements[index*STRIDE_MOV+i];	
	}
	return _movementsVec;
}

Level.prototype.setMovements = function(index, vec) {
	for (var i = 0; i < vec.data.length; ++i) {
		this.movements[index * STRIDE_MOV + i] = vec.data[i];
	}

	var targetIndex = index*STRIDE_MOV + i;
		
	//corresponding object stuff in repositionEntitiesOnLayer
	var colIndex=(index/this.height)|0;
	var rowIndex=(index%this.height);
	curLevel.colCellContents_Movements[colIndex].ior(vec);
	curLevel.rowCellContents_Movements[rowIndex].ior(vec);
	curLevel.mapCellContents_Movements.ior(vec);


}

// return a list of object names at index
Level.prototype.getObjects = function(index) {
	const bitmask = this.getCell(index);
	const objs = [];
	for (let bit = 0; bit < 32 * STRIDE_OBJ; ++bit) {
		if (bitmask.get(bit)) {
			objs.push(state.idDict[bit])
		}
	}
	return objs;
}

var ellipsisPattern = ['ellipsis'];

function BitVec(init) {
	this.data = new Int32Array(init);
	return this;
}

BitVec.prototype.format = function() {
	return '[' + [...this.data].map(d => `${d.toString(16)}h`).join(',') + ']';
}

BitVec.prototype.cloneInto = function(target) {
  for (var i=0;i<this.data.length;++i) {
    target.data[i]=this.data[i];
  }
  return target;
}
BitVec.prototype.clone = function() {
  return new BitVec(this.data);
}

BitVec.prototype.iand = function(other) {
  for (var i = 0; i < this.data.length; ++i) {
    this.data[i] &= other.data[i];
  }
}


BitVec.prototype.inot = function() {
	for (var i = 0; i < this.data.length; ++i) {
		this.data[i] = ~this.data[i];
	}
}

BitVec.prototype.ior = function(other) {
  for (var i = 0; i < this.data.length; ++i) {
    this.data[i] |= other.data[i];
  }
}

BitVec.prototype.iclear = function(other) {
  for (var i = 0; i < this.data.length; ++i) {
    this.data[i] &= ~other.data[i];
  }
}

BitVec.prototype.ibitset = function(ind) {
  this.data[ind>>5] |= 1 << (ind & 31);
}

BitVec.prototype.ibitclear = function(ind) {
  this.data[ind>>5] &= ~(1 << (ind & 31));
}

BitVec.prototype.get = function(ind) {
  return (this.data[ind>>5] & 1 << (ind & 31)) !== 0;
}

BitVec.prototype.getshiftor = function(mask, shift) {
  var toshift = shift & 31;
  var ret = this.data[shift>>5] >>> (toshift);
  if (toshift) {
    ret |= this.data[(shift>>5)+1] << (32 - toshift);
  }
  return ret & mask;
}

BitVec.prototype.ishiftor = function(mask, shift) {
  var toshift = shift&31;
  var low = mask << toshift;
  this.data[shift>>5] |= low;
  if (toshift) {
    var high = mask >> (32 - toshift);
    this.data[(shift>>5)+1] |= high;
  }
}

BitVec.prototype.ishiftclear = function(mask, shift) {
  var toshift = shift & 31;
  var low = mask << toshift;
  this.data[shift>>5] &= ~low;
  if (toshift){
    var high = mask >> (32 - (shift & 31));
    this.data[(shift>>5)+1] &= ~high;
  }
}

BitVec.prototype.equals = function(other) {
  if (this.data.length !== other.data.length)
    return false;
  for (var i = 0; i < this.data.length; ++i) {
    if (this.data[i] !== other.data[i])
      return false;
  }
  return true;
}

BitVec.prototype.setZero = function() {
  for (var i = 0; i < this.data.length; ++i) {
    this.data[i]=0;
  }
}

BitVec.prototype.iszero = function() {
  for (var i = 0; i < this.data.length; ++i) {
    if (this.data[i])
      return false;
  }
  return true;
}

BitVec.prototype.bitsSetInArray = function(arr) {
  for (var i = 0; i < this.data.length; ++i) {
    if ((this.data[i] & arr[i]) !== this.data[i]) {
      return false;
    }
  }
  return true;
}

BitVec.prototype.bitsClearInArray = function(arr) {
  for (var i = 0; i < this.data.length; ++i) {
    if (this.data[i] & arr[i]) {
      return false;
    }
  }
  return true;
}

BitVec.prototype.anyBitsInCommon = function(other) {
  return !this.bitsClearInArray(other.data);
}

function Rule(rule) {
	this.direction = rule[0]; 		/* direction rule scans in */
	this.patterns = rule[1];		/* lists of CellPatterns to match */
	this.hasReplacements = rule[2];
	this.lineNumber = rule[3];		/* rule source for debugging */
	this.ellipsisCount = rule[4];		/* number of ellipses present */
	this.groupNumber = rule[5];		/* execution group number of rule */
	this.isRigid = rule[6];
	this.commands = rule[7];		/* cancel, restart, sfx, etc */
	this.isRandom = rule[8];
	this.cellRowMasks = rule[9];
    this.cellRowMasks_Movements = rule[10];
    this.isGlobal = rule[11];
    this.isOnce = rule[12];
	this.ruleMask = this.cellRowMasks.reduce( (acc, m) => { acc.ior(m); return acc }, new BitVec(STRIDE_OBJ) );

	/*I tried out doing a ruleMask_movements as well along the lines of the above,
	but it didn't help at all - I guess because almost every tick there are movements 
	somewhere on the board - move filtering works well at a row/col level, but is pretty 
	useless (or worse than useless) on a boardwide level*/

	this.cellRowMatches = [];
	for (var i=0;i<this.patterns.length;i++) {
		this.cellRowMatches.push(this.generateCellRowMatchesFunction(this.patterns[i],this.ellipsisCount[i]));
	}
	/* TODO: eliminate isRigid, groupNumber, isRandom
	from this class by moving them up into a RuleGroup class */
}


Rule.prototype.generateCellRowMatchesFunction = function(cellRow,ellipsisCount)  {
	if (ellipsisCount===0) {
		var cr_l = cellRow.length;

		/*
		hard substitute in the first one - if I substitute in all of them, firefox chokes.
		*/
		var fn = "";
		var mul = STRIDE_OBJ === 1 ? '' : '*'+STRIDE_OBJ;	
		for (var i = 0; i < STRIDE_OBJ; ++i) {
			fn += 'var cellObjects' + i + ' = objects[i' + mul + (i ? '+'+i: '') + '];\n';
		}
		mul = STRIDE_MOV === 1 ? '' : '*'+STRIDE_MOV;
		for (var i = 0; i < STRIDE_MOV; ++i) {
			fn += 'var cellMovements' + i + ' = movements[i' + mul + (i ? '+'+i: '') + '];\n';
		}
		fn += "return "+cellRow[0].generateMatchString('0_');// cellRow[0].matches(i)";
		for (var cellIndex=1;cellIndex<cr_l;cellIndex++) {
			fn+="&&cellRow["+cellIndex+"].matches(i+"+cellIndex+"*d, objects, movements)";
		}
		fn+=";";

		if (fn in matchCache) {
			return matchCache[fn];
		}
		return matchCache[fn] = new Function("cellRow","i", 'd', 'objects', 'movements',fn);
	} else if (ellipsisCount===1){
		var cr_l = cellRow.length;

		var fn = "var result = [];\n"
		fn += "if(cellRow[0].matches(i, objects, movements)";
		var cellIndex=1;
		// fix for prior error leaves no ellipsis
		for ( ; cellRow[cellIndex] !== ellipsisPattern && cellIndex < cr_l; cellIndex++) {
			fn+="&&cellRow["+cellIndex+"].matches(i+"+cellIndex+"*d, objects, movements)";
		}
		cellIndex++;
		fn+=") {\n";
		fn+="\tfor (var k=kmin;k<kmax;k++) {\n"
		fn+="\t\tif(cellRow["+cellIndex+"].matches((i+d*(k+"+(cellIndex-1)+")), objects, movements)";
		cellIndex++;
		for (;cellIndex<cr_l;cellIndex++) {
			fn+="&&cellRow["+cellIndex+"].matches((i+d*(k+"+(cellIndex-1)+")), objects, movements)";			
		}
		fn+="){\n";
		fn+="\t\t\tresult.push([i,k]);\n";
		fn+="\t\t}\n"
		fn+="\t}\n";				
		fn+="}\n";		
		fn+="return result;"


		if (fn in matchCache) {
			return matchCache[fn];
		}
		//console.log(fn.replace(/\s+/g, ' '));
		return matchCache[fn] = new Function("cellRow","i","kmax","kmin", 'd', "objects", "movements",fn);
	} else { //ellipsisCount===2
		var cr_l = cellRow.length;

		var ellipsis_index_1=-1;
		var ellipsis_index_2=-1;
		for (var cellIndex=0;cellIndex<cr_l;cellIndex++) {
			if (cellRow[cellIndex]===ellipsisPattern) {
				if (ellipsis_index_1===-1) {
					ellipsis_index_1=cellIndex;
				} else {
					ellipsis_index_2=cellIndex;
					break;
				}
			}
		}

		var fn = "var result = [];\n"
		fn += "if(cellRow[0].matches(i, objects, movements)";

		for (var idx=1;idx<ellipsis_index_1;idx++) {
			fn+="&&cellRow["+idx+"].matches(i+"+idx+"*d, objects, movements)";
		}
		fn+=") {\n";

		//try match middle part
		fn+="	for (var k1=k1min;k1<k1max;k1++) {\n"
		fn+="		if(cellRow["+(ellipsis_index_1+1)+"].matches((i+d*(k1+"+(ellipsis_index_1+1-1)+")), objects, movements)";
		for (var idx=ellipsis_index_1+2;idx<ellipsis_index_2;idx++) {
			fn+="&&cellRow["+idx+"].matches((i+d*(k1+"+(idx-1)+")), objects, movements)";			
		}
		fn+="		){\n";
		//try match right part

		fn+="			for (var k2=k2min;k1+k2<kmax && k2<k2max;k2++) {\n"
		fn+="				if(cellRow["+(ellipsis_index_2+1)+"].matches((i+d*(k1+k2+"+(ellipsis_index_2+1-2)+")), objects, movements)";
		for (var idx=ellipsis_index_2+2;idx<cr_l;idx++) {
			fn+="&&cellRow["+idx+"].matches((i+d*(k1+k2+"+(idx-2)+")), objects, movements)";			
		}
		fn+="				){\n";
		fn+="					result.push([i,k1,k2]);\n";
		fn+="				}\n"
		fn+="			}\n"
		fn+="		}\n"
		fn+="	}\n";				
		fn+="}\n";		
		fn+="return result;"


		if (fn in matchCache) {
			return matchCache[fn];
		}
		//console.log(fn.replace(/\s+/g, ' '));
		return matchCache[fn] = new Function("cellRow","i","kmax","kmin", "k1max","k1min","k2max","k2min", 'd', "objects", "movements",fn);

	}
//say cellRow has length 3, with a split in the middle
/*
function cellRowMatchesWildcardFunctionGenerate(direction,cellRow,i, maxk, mink) {
  var result = [];
  var matchfirsthalf = cellRow[0].matches(i);
  if (matchfirsthalf) {
    for (var k=mink;k<maxk;k++) {
      if (cellRow[2].matches((i+d*(k+0)))) {
        result.push([i,k]);
      }
    }
  }
  return result;
}
*/
  

}

let MOV_BITS = 5;		// doc: no of bits to hold movement as mask
let MOV_MASK = 0x1f;	// doc: bit mask to match
var STRIDE_OBJ = 1;	    // doc: size of BitVec to hold objects, at 32 bits per
var STRIDE_MOV = 1;		// doc: size of BitVec to hold movements, at MOV_BITS bits per

function CellPattern(row) {
  this.objectsPresent = row[0];
  this.objectsMissing = row[1];
  this.anyObjectsPresent = row[2];
  this.movementsPresent = row[3];
  this.movementsMissing = row[4];
  this.matches = this.generateMatchFunction();
  this.replacement = row[5];
};

function CellReplacement(row) {
  this.objectsClear = row[0];
  this.objectsSet = row[1];
  this.movementsClear = row[2];
  this.movementsSet = row[3];
  this.movementsLayerMask = row[4];
  this.randomEntityMask = row[5];
  this.randomDirMask = row[6];
};


var matchCache = {};



CellPattern.prototype.generateMatchString = function() {
  var fn = "(true";
  for (var i = 0; i < Math.max(STRIDE_OBJ, STRIDE_MOV); ++i) {
    var co = 'cellObjects' + i;
    var cm = 'cellMovements' + i;
    var op = this.objectsPresent.data[i];
    var om = this.objectsMissing.data[i];
    var mp = this.movementsPresent.data[i];
    var mm = this.movementsMissing.data[i];
    if (op) {
      if (op&(op-1))
        fn += '\t\t&& ((' + co + '&' + op + ')===' + op + ')\n';
      else
        fn += '\t\t&& (' + co + '&' + op + ')\n';
    }
    if (om)
      fn += '\t\t&& !(' + co + '&' + om + ')\n';
    if (mp) {
      if (mp&(mp-1))
        fn += '\t\t&& ((' + cm + '&' + mp + ')===' + mp + ')\n';
      else
        fn += '\t\t&& (' + cm + '&' + mp + ')\n';
    }
    if (mm)
      fn += '\t\t&& !(' + cm + '&' + mm + ')\n';
  }
  for (var j = 0; j < this.anyObjectsPresent.length; j++) {
    fn += "\t\t&& (0";
    for (var i = 0; i < STRIDE_OBJ; ++i) {
      var aop = this.anyObjectsPresent[j].data[i];
      if (aop)
        fn += "|(cellObjects" + i + "&" + aop + ")";
    }
    fn += ")";
  }
  fn += '\t)';
  return fn;
}

CellPattern.prototype.generateMatchFunction = function() {
	var i;
	var fn = '';
	var mul = STRIDE_OBJ === 1 ? '' : '*'+STRIDE_OBJ;	
	for (var i = 0; i < STRIDE_OBJ; ++i) {
		fn += '\tvar cellObjects' + i + ' = objects[i' + mul + (i ? '+'+i: '') + '];\n';
	}
	mul = STRIDE_MOV === 1 ? '' : '*'+STRIDE_MOV;
	for (var i = 0; i < STRIDE_MOV; ++i) {
		fn += '\tvar cellMovements' + i + ' = movements[i' + mul + (i ? '+'+i: '') + '];\n';
	}
	fn += "return " + this.generateMatchString()+';';
	if (fn in matchCache) {
		return matchCache[fn];
	}
	//console.log(fn.replace(/\s+/g, ' '));
	return matchCache[fn] = new Function("i", "objects", "movements", fn);
}

var _o1,_o2,_o2_5,_o3,_o4,_o5,_o6,_o7,_o8,_o9,_o10,_o11,_o12;
var _m1,_m2,_m3;

CellPattern.prototype.replace = function(rule, currentIndex) {
  var replace = this.replacement;

  if (replace === null) {
    return false;
  }

  var replace_RandomEntityMask = replace.randomEntityMask;
  var replace_RandomDirMask = replace.randomDirMask;

  var objectsSet = replace.objectsSet.cloneInto(_o1);
  var objectsClear = replace.objectsClear.cloneInto(_o2);

  var movementsSet = replace.movementsSet.cloneInto(_m1);
  var movementsClear = replace.movementsClear.cloneInto(_m2);
  movementsClear.ior(replace.movementsLayerMask);

  if (!replace_RandomEntityMask.iszero()) {
    var choices=[];
    for (var i=0;i<32*STRIDE_OBJ;i++) {
      if (replace_RandomEntityMask.get(i)) {
        choices.push(i);
      }
    }
    var rand = choices[Math.floor(RandomGen.uniform() * choices.length)];
    var n = state.idDict[rand];
    var o = state.objects[n];
    objectsSet.ibitset(rand);
    objectsClear.ior(state.layerMasks[o.layer]);
    movementsClear.ishiftor(MOV_MASK, MOV_BITS * o.layer);
  }
  if (!replace_RandomDirMask.iszero()) {
    for (var layerIndex=0;layerIndex<curLevel.layerCount;layerIndex++){
      if (replace_RandomDirMask.get(MOV_BITS * layerIndex)) {
        var randomDir = Math.floor(RandomGen.uniform()*4);
        movementsSet.ibitset(randomDir + MOV_BITS * layerIndex);
      }
    }
  }
  
  var curCellMask = curLevel.getCellInto(currentIndex,_o2_5);
  var curMovementMask = curLevel.getMovements(currentIndex);

  var oldCellMask = curCellMask.cloneInto(_o3);
  var oldMovementMask = curMovementMask.cloneInto(_m3);

  curCellMask.iclear(objectsClear);
  curCellMask.ior(objectsSet);

  curMovementMask.iclear(movementsClear);
  curMovementMask.ior(movementsSet);

  var rigidchange=false;
  var curRigidGroupIndexMask =0;
  var curRigidMovementAppliedMask =0;
  if (rule.isRigid) {
    var rigidGroupIndex = state.groupNumber_to_RigidGroupIndex[rule.groupNumber];
    rigidGroupIndex++;//don't forget to -- it when decoding :O
    var rigidMask = new BitVec(STRIDE_MOV);
    for (var layer = 0; layer < curLevel.layerCount; layer++) {
      rigidMask.ishiftor(rigidGroupIndex, MOV_BITS * layer);
    }
    rigidMask.iand(replace.movementsLayerMask);
    curRigidGroupIndexMask = curLevel.rigidGroupIndexMask[currentIndex] || new BitVec(STRIDE_MOV);
    curRigidMovementAppliedMask = curLevel.rigidMovementAppliedMask[currentIndex] || new BitVec(STRIDE_MOV);

    if (!rigidMask.bitsSetInArray(curRigidGroupIndexMask.data) &&
      !replace.movementsLayerMask.bitsSetInArray(curRigidMovementAppliedMask.data) ) {
      curRigidGroupIndexMask.ior(rigidMask);
      curRigidMovementAppliedMask.ior(replace.movementsLayerMask);
      rigidchange=true;

    }
  }

  var result = false;

  //check if it's changed
  if (!oldCellMask.equals(curCellMask) || !oldMovementMask.equals(curMovementMask) || rigidchange) { 
		result=true;
		if (rigidchange) {
			curLevel.rigidGroupIndexMask[currentIndex] = curRigidGroupIndexMask;
			curLevel.rigidMovementAppliedMask[currentIndex] = curRigidMovementAppliedMask;
		}

		// were any objects create or destroyed? Add to list for sfx checking
		// - as mask, one bit per object
		// - as list, one entry per object, with position

		var created = curCellMask.cloneInto(_o4);
		created.iclear(oldCellMask);
		sfxCreateMask.ior(created);
		for (let objId = 0; objId < state.objectCount; ++objId) {
			if (created.get(objId))
				sfxCreateList.push({ 
					posIndex: currentIndex, objId: objId
				});
		}

		var destroyed = oldCellMask.cloneInto(_o5);
		destroyed.iclear(curCellMask);
		sfxDestroyMask.ior(destroyed);
		for (let objId = 0; objId < state.objectCount; ++objId) {
			if (destroyed.get(objId))
				sfxDestroyList.push({ 
					posIndex: currentIndex, objId: objId
				});
		}

		curLevel.setCell(currentIndex, curCellMask);
		curLevel.setMovements(currentIndex, curMovementMask);

		var colIndex=(currentIndex/curLevel.height)|0;
		var rowIndex=(currentIndex%curLevel.height);
		curLevel.colCellContents[colIndex].ior(curCellMask);
		curLevel.rowCellContents[rowIndex].ior(curCellMask);
		curLevel.mapCellContents.ior(curCellMask);

	}

  	return result;
}



function matchCellRow(direction, cellRowMatch, cellRow, cellRowMask,cellRowMask_Movements,d, isGlobal) {	
	var result=[];
	
	if ((!cellRowMask.bitsSetInArray(curLevel.mapCellContents.data))||
	(!cellRowMask_Movements.bitsSetInArray(curLevel.mapCellContents_Movements.data))) {
		return result;
	}

  if(isGlobal || state.metadata.local_radius === undefined){
    xmin=0;
    xmax=curLevel.width;
    ymin=0;
    ymax=curLevel.height;
  }
  else{
    var localradius = parseInt(state.metadata.local_radius);
    xmin=Math.max(0, (playerPositions[0]/curLevel.height|0) - localradius);
    xmax=Math.min(curLevel.width, (playerPositions[0]/curLevel.height|0) + localradius +1);
    ymin=Math.max(0, playerPositions[0]%curLevel.height - localradius);
    ymax=Math.min(curLevel.height, playerPositions[0]%curLevel.height + localradius+1);

  }

    var len=cellRow.length;

    switch(direction) {
      case 1://up
      {
        ymin+=(len-1);
        break;
      }
      case 2: //down 
      {
      ymax-=(len-1);
      break;
      }
      case 4: //left
      {
        xmin+=(len-1);
        break;
      }
      case 8: //right
    {
      xmax-=(len-1);  
      break;
    }
      default:
      {
        window.console.log("EEEP "+direction);
      }
    }

    var horizontal=direction>2;
    if (horizontal) {
		for (var y=ymin;y<ymax;y++) {
			if (!cellRowMask.bitsSetInArray(curLevel.rowCellContents[y].data) 
			|| !cellRowMask_Movements.bitsSetInArray(curLevel.rowCellContents_Movements[y].data)) {
				continue;
			}

			for (var x=xmin;x<xmax;x++) {
				var i = x*curLevel.height+y;
				if (cellRowMatch(cellRow,i,d, curLevel.objects, curLevel.movements))
				{
					result.push(i);
				}
			}
		}
	} else {
		for (var x=xmin;x<xmax;x++) {
			if (!cellRowMask.bitsSetInArray(curLevel.colCellContents[x].data)
			|| !cellRowMask_Movements.bitsSetInArray(curLevel.colCellContents_Movements[x].data)) {
				continue;
			}

			for (var y=ymin;y<ymax;y++) {
				var i = x*curLevel.height+y;
				if (cellRowMatch(cellRow,i, d, curLevel.objects, curLevel.movements)) {
					result.push(i);
				}
			}
		}		
	}

  return result;
}


function matchCellRowWildCard(direction, cellRowMatch, cellRow,cellRowMask,cellRowMask_Movements,d,wildcardCount) {
	var result=[];
	if ((!cellRowMask.bitsSetInArray(curLevel.mapCellContents.data))
	|| (!cellRowMask_Movements.bitsSetInArray(curLevel.mapCellContents_Movements.data))) {
		return result;
	}
	
	var xmin=0;
	var xmax=curLevel.width;
	var ymin=0;
	var ymax=curLevel.height;

	var len=cellRow.length-wildcardCount;//remove one to deal with wildcard
    switch(direction) {
      case 1://up
      {
        ymin+=(len-1);
        break;
      }
      case 2: //down 
      {
      ymax-=(len-1);
      break;
      }
      case 4: //left
      {
        xmin+=(len-1);
        break;
      }
      case 8: //right
    {
      xmax-=(len-1);  
      break;
    }
      default:
      {
        window.console.log("EEEP2 "+direction);
      }
    }



    var horizontal=direction>2;
    if (horizontal) {
		for (var y=ymin;y<ymax;y++) {
			if (!cellRowMask.bitsSetInArray(curLevel.rowCellContents[y].data)
			|| !cellRowMask_Movements.bitsSetInArray(curLevel.rowCellContents_Movements[y].data) ) {
				continue;
			}

			for (var x=xmin;x<xmax;x++) {
				var i = x*curLevel.height+y;
				var kmax;

				if (direction === 4) { //left
					kmax=x-len+2;
				} else if (direction === 8) { //right
					kmax=curLevel.width-(x+len)+1;	
				} else {
					window.console.log("EEEP2 "+direction);					
				}

				if (wildcardCount===1) {
				result.push.apply(result, cellRowMatch(cellRow,i,kmax,0, d, curLevel.objects, curLevel.movements));
				} else {
					result.push.apply(result, cellRowMatch(cellRow,i,kmax,0,kmax,0,kmax,0, d, curLevel.objects, curLevel.movements));
			}
		}
		}
	} else {
		for (var x=xmin;x<xmax;x++) {
			if (!cellRowMask.bitsSetInArray(curLevel.colCellContents[x].data)
			|| !cellRowMask_Movements.bitsSetInArray(curLevel.colCellContents_Movements[x].data)) {
				continue;
			}

			for (var y=ymin;y<ymax;y++) {
				var i = x*curLevel.height+y;
				var kmax;


        if (direction === 2) { // down
          kmax=curLevel.height-(y+len)+1;
        } else if (direction === 1) { // up
          kmax=y-len+2;         
        } else {
          window.console.log("EEEP2 "+direction);
        }
				if (wildcardCount===1) {
					result.push.apply(result, cellRowMatch(cellRow,i,kmax,0, d, curLevel.objects, curLevel.movements));
				} else {
					result.push.apply(result, cellRowMatch(cellRow,i,kmax,0, kmax,0, kmax,0, d, curLevel.objects, curLevel.movements));
				}
			}
    }   
  }

  return result;
}

function generateTuples(lists) {
    var tuples=[[]];

    for (var i=0;i<lists.length;i++)
    {
        var row = lists[i];
        var newtuples=[];
        for (var j=0;j<row.length;j++) {
            var valtoappend = row[j];
            for (var k=0;k<tuples.length;k++) {
                var tuple=tuples[k];
                var newtuple = tuple.concat([valtoappend]);
                newtuples.push(newtuple);
            }
        }
        tuples=newtuples;
    }
    return tuples;
}


Rule.prototype.findMatches = function() {	
	if ( ! this.ruleMask.bitsSetInArray(curLevel.mapCellContents.data) )
		return [];

	const d = curLevel.delta_index(this.direction)

	if (debugSwitch.includes('masks')) console.log(`Findmatches d=${d} dir=${this.direction} levobj=${curLevel.objects} levmov=${curLevel.movements}`);
	var matches=[];
	var cellRowMasks=this.cellRowMasks;
	var cellRowMasks_Movements=this.cellRowMasks_Movements;
    for (var cellRowIndex=0;cellRowIndex<this.patterns.length;cellRowIndex++) {
        var cellRow = this.patterns[cellRowIndex];
        var matchFunction = this.cellRowMatches[cellRowIndex];
        if (this.ellipsisCount[cellRowIndex]===1) {//if ellipsis     
        	var match = matchCellRowWildCard(this.direction,matchFunction,cellRow,cellRowMasks[cellRowIndex],cellRowMasks_Movements[cellRowIndex],d,this.ellipsisCount[cellRowIndex]);  
        } else  if (this.ellipsisCount[cellRowIndex]===0) {
        	var match = matchCellRow(this.direction,matchFunction,cellRow,cellRowMasks[cellRowIndex],cellRowMasks_Movements[cellRowIndex],d, this.isGlobal);               	
        } else { // ellipsiscount===2
        	var match = matchCellRowWildCard(this.direction,matchFunction,cellRow,cellRowMasks[cellRowIndex],cellRowMasks_Movements[cellRowIndex],d,this.ellipsisCount[cellRowIndex]);  
        }
		if (debugSwitch.includes('masks')) {
			const cro = cellRowMasks[cellRowIndex].format();
			const crm = cellRowMasks_Movements[cellRowIndex].format();
			const lvo = curLevel.mapCellContents.format();
			const lvm = curLevel.mapCellContents_Movements.format();
			console.log(`cro=${cro} crm=${crm} lvo=${lvo} lvm=${lvm} => ${match}`);
		}
        if (match.length===0) {
            return [];
        } else {
            matches.push(match);
        }
    }
    return matches;
};

Rule.prototype.directional = function(){
  //Check if other rules in its rulegroup with the same line number.
  for (var i=0;i<state.rules.length;i++){
    var rg = state.rules[i];
    var copyCount=0;
    for (var j=0;j<rg.length;j++){
      if (this.lineNumber===rg[j].lineNumber){
        copyCount++;
      }
      if (copyCount>1){
        return true;
      }
    }
  }

    return false;
}

Rule.prototype.applyAt = function(level,tuple,check,delta) {
	var rule = this;
	//have to double check they apply 
	//(cf test ellipsis bug: rule matches two candidates, first replacement invalidates second)
	if (check)
	{
		for (var cellRowIndex=0; cellRowIndex<this.patterns.length; cellRowIndex++)
		{
			if (this.ellipsisCount[cellRowIndex]===1)
			{
				if ( this.cellRowMatches[cellRowIndex](
						this.patterns[cellRowIndex], 
						tuple[cellRowIndex][0], 
						tuple[cellRowIndex][1]+1, 
							tuple[cellRowIndex][1], 
						delta, level.objects, level.movements
					).length == 0 )
					return false
			} else if (this.ellipsisCount[cellRowIndex]===2){
				if ( this.cellRowMatches[cellRowIndex](
					this.patterns[cellRowIndex], 
						tuple[cellRowIndex][0],  
						tuple[cellRowIndex][1]+tuple[cellRowIndex][2]+1, 
							tuple[cellRowIndex][1]+tuple[cellRowIndex][2], 
						tuple[cellRowIndex][1]+1, 
							tuple[cellRowIndex][1],  
						tuple[cellRowIndex][2]+1, 
							tuple[cellRowIndex][2], 
							delta, level.objects, level.movements
						).length == 0 )
				return false
			} else {
				if ( ! this.cellRowMatches[cellRowIndex](
					this.patterns[cellRowIndex], 
						tuple[cellRowIndex], 
						delta, level.objects, level.movements
						) )
				return false
		}
	}
	}


    var result=false;
	var anyellipses=false;
	const cellIndexes = [];

    //APPLY THE RULE
    for (var cellRowIndex=0;cellRowIndex<rule.patterns.length;cellRowIndex++) {
        var preRow = rule.patterns[cellRowIndex];
    	var ellipse_index=0;

        var currentIndex = rule.ellipsisCount[cellRowIndex]>0 ? tuple[cellRowIndex][0] : tuple[cellRowIndex];
        for (var cellIndex=0;cellIndex<preRow.length;cellIndex++) {
            var preCell = preRow[cellIndex];

            if (preCell === ellipsisPattern) {
            	var k = tuple[cellRowIndex][1+ellipse_index];
				ellipse_index++;
				anyellipses=true;
            	currentIndex += delta*k;
            	continue;
            }

            result = preCell.replace(rule, currentIndex) || result;
			cellIndexes.push(currentIndex);

            currentIndex += delta;
        }
    }

  if (verbose_logging && result){
    var ruleDirection = dirMaskName[rule.direction];
    if (!rule.directional()){
      ruleDirection="";
    }

		var inspect_ID =  addToDebugTimeline(level,rule.lineNumber);
		const locations = cellIndexes.map(i => `(${1 + i % level.width};${1 + ~~(i / level.width)})`).join(', ');
		var gapMessage= (debugSwitch.includes('gaploc')) ? ` at ${locations}` : '';

		//var gapMessage="";
		// var gapcount=0;
		// if (anyellipses){
		// 	var added=0;
		// 	for(var i=0;i<tuple.length;i++){
		// 		var tuples_cellrow = tuple[i];
		// 		//Start at index 1 because index 0 just is the index where the rule starts.
		// 		for (var j=1;j<tuples_cellrow.length;j++){
		// 			added++;
		// 			if (gapMessage.length>0){
		// 				gapMessage+=", ";
		// 			}
		// 			gapMessage+=tuples_cellrow[j];
		// 		}			
		// 	}
		// 	if (added===1){
		// 		gapMessage = " (ellipsis gap of length "+gapMessage+")";
		// 	} else {
		// 		gapMessage = " (ellipsis gaps of length "+gapMessage+")";
		// 	}
		// }
		
		var logString = `<font color="green">Rule <a onclick="jumpToLine(${rule.lineNumber});"  href="javascript:void(0);">${rule.lineNumber}</a> ${ruleDirection} applied${gapMessage}.</font>`;
		consolePrint(logString,false,rule.lineNumber,inspect_ID);
		
	}

    return result;
};

Rule.prototype.tryApply = function(level) {
	perfCounters.rules++;
	const delta = level.delta_index(this.direction);

    //get all cellrow matches
    var matches = this.findMatches();
	perfCounters.matches += matches.length;
    if (matches.length===0) {
      return false;
    }
	perfCounters.matched++;

    var result=false;	
	if (this.hasReplacements) {
	perfCounters.replaces++;
	var tuples = generateTuples(matches);
	    for (var tupleIndex=0;tupleIndex<tuples.length;tupleIndex++) {
	        var tuple = tuples[tupleIndex];
	        var shouldCheck=tupleIndex>0;
	        var success = this.applyAt(level,tuple,shouldCheck,delta);
			if (success) perfCounters.replaced++;
	        result = success || result;
	    }
	}

    if (matches.length>0) {
      this.queueCommands();
    }
    return result;
};

Rule.prototype.queueCommands = function() {
	var commands = this.commands;
	perfCounters.commands += commands.length;	
	if (commands.length==0){
		return;
	}

	//commandQueue is an array of strings, message.commands is an array of array of strings (For messagetext parameter), so I search through them differently
	var preexisting_cancel=curLevel.commandQueue.indexOf("cancel")>=0;
	var preexisting_restart=curLevel.commandQueue.indexOf("restart")>=0;
	
	var currule_cancel = false;
	var currule_restart = false;
	for (var i=0;i<commands.length;i++){
		var cmd = commands[i][0];
		if (cmd==="cancel"){
			currule_cancel=true;
		} else if (cmd==="restart"){
			currule_restart=true;
		}
	}

	//priority cancel > restart > everything else
	//if cancel is the queue from other rules, ignore everything
	if (preexisting_cancel){
		return;
	}
	//if restart is in the queue from other rules, only apply if there's a cancel present here
	if (preexisting_restart && !currule_cancel){
		return;
	}

	//if you are writing a cancel or restart, clear the current queue
	if (currule_cancel || currule_restart){
		curLevel.commandQueue=[];
        curLevel.commandQueueSourceRules=[];
		messagetext="";
		statusText = "";
	}

	for(var i=0;i<commands.length;i++) {
		var command=commands[i];
		var already=false;
		if (command[0] == 'log') {		// log is not queued
			consolePrintFromRule(`${command[1]}`, this, true);
			continue;
		} else if (curLevel.commandQueue.indexOf(command[0])>=0) {
			continue;
		} else if (command[0] == 'gosub') {			// gosub is not queued
			gosubTarget = command[1];
			continue;
		}
		curLevel.commandQueue.push(command[0]);
		curLevel.commandQueueSourceRules.push(this);

		if (verbose_logging) {
			const logString = htmlColor('green', `Rule ${htmlJump(this.lineNumber)} triggers command ${command[0]}.`);
			consolePrint(logString, false, this.lineNumber, null);
		}

		if (command[0] == 'message') {
			messagetext=command[1];
		} else if (command[0] == 'goto') {
			gotoLevel(command[1]);
		} else if (command[0] == 'status') {
			statusText = command[1];
		} else if (command[0] == 'link') {
			gotoLink();
		}		

		if (state.metadata.runtime_metadata_twiddling && twiddleable_params.includes(command[0])) {

			value = command[1];

			if (value == "wipe") {
				delete state.metadata[command[0]]; //value = undefined;
				value = null;
			} else if (value == "default") {
				value = deepClone(state.default_metadata[command[0]]);
			}

			if (value != null) {
				state.metadata[command[0]] = value;
			}
			
			if (command[0] === "zoomscreen" || command[0] === "flickscreen") {
				twiddleMetaData(state, true);
				canvasResize();
			}

			if (command[0] === "smoothscreen") {
				if (value !== undefined) {
					twiddleMetaData(state, true);
					initSmoothCamera()
				} else {
					smoothscreen = false;
				}
				canvasResize();
			}

			twiddleMetadataExtras()

			if (state.metadata.runtime_metadata_twiddling_debug) {
				var log = "Metadata twiddled: Flag "+command[0] + " set to " + value;
				if (value != command[1]) {
					log += " ("+command[1]+")"
				}
				consolePrintFromRule(log,this,true);
			}
    	}   
  	}
};

// despite its name, this function exists to establish default values for prelude settings
function twiddleMetadataExtras(resetAutoTick = true) {
	autotickinterval=state.metadata.realtime_interval ? state.metadata.realtime_interval*1000 : 0;
	if (resetAutoTick || !state.metadata.realtime_interval)
    	autotick=0;
	againinterval = state.metadata.again_interval ? state.metadata.again_interval*1000 : 150;
	tweeninterval = state.metadata.tween_length ? Math.max(state.metadata.tween_length*1000, 0) : 0;
	repeatinterval = state.metadata.key_repeat_interval ? state.metadata.key_repeat_interval*1000 : 200; // was 150, makes for key bounce
	animateinterval = state.metadata.animate_interval ? state.metadata.animate_interval*1000 : 250; // was 150, makes for key bounce
	state.bgcolor = state.metadata.background_color ? colorToHex(colorPalette,state.metadata.background_color) : "#000000";
	state.fgcolor = state.metadata.text_color ? colorToHex(colorPalette,state.metadata.text_color) : "#FFFFFF";
}

function showTempMessage(message) {
if (solving) {return;}

	keybuffer=[];
	textMode=true;
	titleScreen=false;
	quittingMessageScreen=false;
	messageselected=false;
	ignoreNotJustPressedAction=true;
	tryPlayShowMessageSound();
	drawMessageScreen(message);
	canvasResize();
}

function processOutputCommands(commands) {
	for (var i=0;i<commands.length;i++) {
		var command = commands[i];
		if (command.charAt(1)==='f')  {//identifies sfxN
			tryPlaySimpleSound(command);
		}
		if (unitTesting===false) {
			if (command == 'message') {
				showTempMessage(messagetext);
			}
		}
	}
}

function applyRandomRuleGroup(level,ruleGroup) {
	perfCounters.randoms++;
	var propagated=false;

	var matches=[];
	for (var ruleIndex=0;ruleIndex<ruleGroup.length;ruleIndex++) {
		var rule=ruleGroup[ruleIndex];
		var ruleMatches = rule.findMatches();
		if (ruleMatches.length>0) {
	    	var tuples  = generateTuples(ruleMatches);
	    	for (var j=0;j<tuples.length;j++) {
	    		var tuple=tuples[j];
				matches.push([ruleIndex,tuple]);
	    	}
		}		
	}

  if (matches.length===0)
  {
    return false;
  } 

	var match = matches[Math.floor(RandomGen.uniform()*matches.length)];
	var ruleIndex=match[0];
	var rule=ruleGroup[ruleIndex];
	var tuple=match[1];
	var check=false;
	const delta = level.delta_index(rule.direction)
	var modified = rule.applyAt(level,tuple,check,delta);

    rule.queueCommands();

  return modified;
}


function applyRuleGroup(ruleGroup) {
	perfCounters.groups++;
	if (ruleGroup[0].isRandom) {
		return applyRandomRuleGroup(curLevel,ruleGroup);
	}

  	var loopPropagated=false;
    var propagated=true;
    var loopcount=0;
	var nothing_happened_counter = -1;
    while(propagated) {
		loopcount++;
		if (loopcount>200) {
			logErrorCacheable("Got caught looping lots in a rule group :O",ruleGroup[0].lineNumber,true);
			break;
		}
        propagated=false;

        for (var ruleIndex=0;ruleIndex<ruleGroup.length;ruleIndex++) {
            var rule = ruleGroup[ruleIndex];     
			if (rule.tryApply(curLevel)){
				if (!rule.isOnce)
					propagated=true;
				nothing_happened_counter=0;//why am I resetting to 1 rather than 0? because I've just verified that applications of the current rule are exhausted
			} else {
				nothing_happened_counter++;
			}
			if ( nothing_happened_counter === ruleGroup.length)
				break;
        }
        if (propagated) {
        	loopPropagated=true;
			
			if (verbose_logging){
				debugger_turnIndex++;
				addToDebugTimeline(curLevel,-2);//pre-movement-applied debug state
			}
        }
    }

    return loopPropagated;
}

function applyRules(rules, loopPoint, subroutines, startRuleGroupindex, bannedGroup){
	//console.log(`Apply rules rules:${rules.length} objects:${level.objects}`);

	// find the end of this block of rule groups
	function findEnd(start) {
		let result = -1;
		if (start < rules.length) {
			// find the subroutine after the one we are in, if any
			// note: trouble if it's an ==
			let x = subroutines.findIndex(s => s.lineNumber > rules[start][0].lineNumber);
			// find the rule group for that line number
			if (x != -1)
				result = rules.findIndex(r => r[0].lineNumber >= subroutines[x].lineNumber) 
		}
		return (result == -1) ? rules.length : result;
	}

	perfCounters.tries++;
    //for each rule
    //try to match it

    playerPositions = getPlayerPositions();
	
	// stack of rule group index to return to at end of subroutine
	const gosubStack = []; // PS>

    //when we're going back in, let's loop, to be sure to be sure
    let loopPropagated = startRuleGroupindex > 0;
    let loopCount = 0;
	let endIndex = findEnd(startRuleGroupindex);
    for (let ruleGroupIndex = startRuleGroupindex; ruleGroupIndex < endIndex; ) {
		// first process the rule and check for endloop
		if (bannedGroup && bannedGroup[ruleGroupIndex]) {
			//do nothing
		} else {
			const ruleGroup = rules[ruleGroupIndex];
			loopPropagated = applyRuleGroup(ruleGroup) || loopPropagated;
		}
		// loop ends right here
        if (loopPropagated && loopPoint[ruleGroupIndex] >= 0) { 
			if (checkLoop())
				break; 
		} else {
			if (gosubTarget >= 0) {
				// push current location so on return we can check if at end
				gosubStack.push(ruleGroupIndex);  // todo: push loop point
				if (verbose_logging)
					consolePrint(`Gosub to ${htmlJump(rules[gosubTarget][0].lineNumber)}`, true, rules[ruleGroupIndex][0].lineNumber);
				ruleGroupIndex = gosubTarget;
				endIndex = findEnd(ruleGroupIndex);
				gosubTarget = -1;
				//console.log(`gosub group:${ruleGroupIndex} line:${rules[ruleGroupIndex][0].lineNumber}`)
			} else {
				ruleGroupIndex++;
				// note special for loops and gosubs that end after the last rule
				if (ruleGroupIndex == endIndex && loopPropagated && loopPoint[ruleGroupIndex] >= 0) {
					if (checkLoop())
						break; 
				}		

				if (ruleGroupIndex == endIndex && gosubStack.length > 0) {
					if (verbose_logging)
						consolePrint(`Return to ${htmlJump(rules[gosubStack.at(-1)][0].lineNumber)}`, true);
					ruleGroupIndex = gosubStack.pop();
					endIndex = findEnd(ruleGroupIndex);
					ruleGroupIndex++;
				}
			}
		}

		if (verbose_logging){
			debugger_turnIndex++;
			addToDebugTimeline(curLevel,-2);//pre-movement-applied debug state
		}

		function checkLoop() {
			ruleGroupIndex = loopPoint[ruleGroupIndex];
			loopPropagated = false;
			loopCount++;
			if (loopCount > 200) {
				var ruleGroup = rules[ruleGroupIndex];
				logErrorCacheable("got caught in an endless startloop...endloop vortex, escaping!", ruleGroup[0].lineNumber, true);
				return true;
			}	
		}
	}
}

//if this returns!=null, need to go back and reprocess
function resolveMovements(level, bannedGroup){
	var moved=true;

    while(moved){
        moved=false;
        for (var i=0;i<level.n_tiles;i++) {
		  moved = repositionEntitiesAtCell(i) || moved;
        }
    }
    var doUndo=false;

	//Search for any rigidly-caused movements remaining
	for (var i=0;i<level.n_tiles;i++) {
		var cellMask = level.getCellInto(i,_o6);
		var movementMask = level.getMovements(i);
		if (!movementMask.iszero()) {
			var rigidMovementAppliedMask = level.rigidMovementAppliedMask[i];
			if (!rigidMovementAppliedMask.iszero()) {
				movementMask.iand(rigidMovementAppliedMask);
				if (!movementMask.iszero()) {
					//find what layer was restricted
					for (var j=0;j<level.layerCount;j++) {
						var layerSection = movementMask.getshiftor(MOV_MASK, MOV_BITS * j);
						if (layerSection!==0) {
							//this is our layer!
							var rigidGroupIndexMask = level.rigidGroupIndexMask[i];
							var rigidGroupIndex = rigidGroupIndexMask.getshiftor(MOV_MASK, MOV_BITS * j);
							rigidGroupIndex--;//group indices start at zero, but are incremented for storing in the bitfield
							var groupIndex = state.rigidGroupIndex_to_GroupIndex[rigidGroupIndex];
							if (bannedGroup[groupIndex]!==true){
								bannedGroup[groupIndex]=true
							//backtrackTarget = rigidBackups[rigidGroupIndex];
							doUndo=true;
							}
							break;
						}
					}
				}
			}
			// go through each of the fx masks to see if it applies to an object in this cell
			for (const fx of state.sfx_MovementFailureMasks) {
				if (cellMask.get(fx.objId)) {
					if (movementMask.anyBitsInCommon(fx.directionMask)) {
						const object = getObject(fx.objId);
						if (verbose_logging) 
							consolePrint(`Object "${state.idDict[object]}" can't move, playing seed "${seedsToPlay_CantMove[i]}"`)
						if (fx.seed.startsWith('afx')) {
							const move = getLayerMovement(movementMask, object.layer);
							seedsToAnimate[i+','+fx.objId] = { 
								kind: 'cant', 
								seed: fx.seed, 
								dir: move 
							};
						}
						else if (seedsToPlay_CantMove.indexOf(fx.seed)===-1)
							seedsToPlay_CantMove.push(fx.seed);
					}
				}
			}
    	}

    	for (var j=0;j<STRIDE_MOV;j++) {
    		level.movements[j+i*STRIDE_MOV]=0;
    	}
	    level.rigidGroupIndexMask[i].setZero();
	    level.rigidMovementAppliedMask[i].setZero();
    }
    return doUndo;
}

var sfxCreateMask=null;			// doc: mask for all objects created
var sfxDestroyMask=null;		// doc: mask for all objects destroyed
var sfxCreateList = []; 		// doc: list of created { posindex:, objmask: }
var sfxDestroyList = [];		// doc: list of destroyed { posindex:, objmask: }

function calculateRowColMasks() {
	for(var i=0;i<curLevel.mapCellContents.length;i++) {
		curLevel.mapCellContents[i]=0;
		curLevel.mapCellContents_Movements[i]=0;	
	}

	for (var i=0;i<curLevel.width;i++) {
		var ccc = curLevel.colCellContents[i];
		ccc.setZero();
		var ccc_Movements = curLevel.colCellContents_Movements[i];
		ccc_Movements.setZero();
	}

	for (var i=0;i<curLevel.height;i++) {
		var rcc = curLevel.rowCellContents[i];
		rcc.setZero();
		var rcc_Movements = curLevel.rowCellContents_Movements[i];
		rcc_Movements.setZero();
	}

	for (var i=0;i<curLevel.width;i++) {
		for (var j=0;j<curLevel.height;j++) {
			var index = j+i*curLevel.height;
			var cellContents=curLevel.getCellInto(index,_o9);
			curLevel.mapCellContents.ior(cellContents);
			curLevel.rowCellContents[j].ior(cellContents);
			curLevel.colCellContents[i].ior(cellContents);

			
			var mapCellContents_Movements=curLevel.getMovementsInto(index,_m1);
			curLevel.mapCellContents_Movements.ior(mapCellContents_Movements);
			curLevel.rowCellContents_Movements[j].ior(mapCellContents_Movements);
			curLevel.colCellContents_Movements[i].ior(mapCellContents_Movements);
		}
	}
}

var playerPositions;
var playerPositionsAtTurnStart;

// acceptable input directions, used here and in inputoutput
var dirNames = ['up', 'left', 'down', 'right', 'action', 'mouse', 'lclick', 'rclick'];  // todo: reaction, mclick

var perfCounters = {};

/* returns a bool indicating if anything changed */
function processInput(dir,dontDoWin,dontModify,bak,coord) {
	//console.log(`Process input (${dir},${dontDoWin},${dontModify},${bak},${coord}) cmds=${level.commandQueue}`)
	perfCounters = {
		start: Date.now(),
		rules: 0,
		matched: 0,
		matches: 0,
		replaces: 0,
		replaced: 0,
		commands: 0,
		randoms : 0,
		groups: 0,
		tries: 0,		
	}
	const ret = procInp(dir, dontDoWin, dontModify, bak, coord);
	perfCounters.elapsed = Date.now() - perfCounters.start;
	return ret;
}
function procInp(dir,dontDoWin,dontModify,bak,coord) {
	if (!dontModify) {
		newMovedEntities = {};
	}

	var startDir = dir;

	againing = false;

	if (bak==undefined) {
		bak = backupLevel();
	}
  
	// this looks dodgy, but playerPositions is not used and dir test always succeeds
  	playerPositions= [];
	playerPositionsAtTurnStart = getPlayerPositions();
	
	if (dir < dirNames.length) {

		if (verbose_logging) { 
			debugger_turnIndex++;
			addToDebugTimeline(curLevel,-2);//pre-movement-applied debug state
		}

		const dirName = dirNames[dir];

		// todo: reaction
		if ([ 0,1,2,3,4 ].includes(dir)) {		// arrows plus action go to player 
			playerPositions = startMovement(dirMasks[dirName]);
		} else if ([ 6,7 ].includes(dir)) {			// clicks go to object(s)
			const mask = curLevel.getCell(coord);
			moveEntitiesAtIndex(coord, mask, dirMasks[dirName]);
		}

		if (verbose_logging) { 
			const inspect_ID = addToDebugTimeline(curLevel, -1);
			if (dir===-1) {
				consolePrint(`Turn starts with no input.`, false, null, inspect_ID)
			} else {
				//  consolePrint('=======================');
				consolePrint(`Turn starts with input of ${dirName}.`, false, null, inspect_ID);
			}
			consolePrint('Applying rules.');
		}
		
        var bannedGroup = [];

        curLevel.commandQueue=[];
        curLevel.commandQueueSourceRules=[];
        var startRuleGroupIndex=0;
        var rigidloop=false;
		const startState = {
			objects: new Int32Array(curLevel.objects),
			movements: new Int32Array(curLevel.movements),
			rigidGroupIndexMask: curLevel.rigidGroupIndexMask.concat([]),
			rigidMovementAppliedMask: curLevel.rigidMovementAppliedMask.concat([]),
			commandQueue: [],
			commandQueueSourceRules: []
		}
	    sfxCreateMask.setZero();
	    sfxDestroyMask.setZero();
		sfxCreateList = [];
		sfxDestroyList = [];
		
		if(dontModify) {
			var oldSeedsToAnimate = seedsToAnimate;
		}

		seedsToPlay_CanMove=[];
		seedsToPlay_CantMove=[];
		seedsToAnimate={};
		
		calculateRowColMasks();

		var alreadyResolved=[];
		statusText = "";

        var i=0;
        do {
        //not particularly elegant, but it'll do for now - should copy the world state and check
        //after each iteration
        	rigidloop=false;
        	i++;

			applyRules(state.rules, state.loopPoint, state.subroutines, startRuleGroupIndex, bannedGroup);
			var shouldUndo = resolveMovements(curLevel, bannedGroup);
			
        	if (shouldUndo) {
        		rigidloop=true;

				{
					// trackback
					if (IDE){
						// newBannedGroups is the list of keys of bannedGroup that aren't already in alreadyResolved
						var newBannedGroups = [];
						for (var key in bannedGroup) {
							if (!alreadyResolved.includes(key)) {
								newBannedGroups.push(key);
								alreadyResolved.push(key);
							}
						}
						var bannedLineNumbers = newBannedGroups.map( rgi => state.rules[rgi][0].lineNumber);
						var ts = bannedLineNumbers.length>1 ? "lines " : "line ";
						ts += bannedLineNumbers.map(ln => `<a onclick="jumpToLine(${ln});" href="javascript:void(0);">${ln}</a>`).join(", ");
						consolePrint(`Rigid movement application failed in rule-Group starting from ${ts}, and will be disabled in resimulation. Rolling back...`)
					}
					//don't need to concat or anythign here, once something is restored it won't be used again.
					curLevel.objects = new Int32Array(startState.objects)
					curLevel.movements = new Int32Array(startState.movements)
					curLevel.rigidGroupIndexMask = startState.rigidGroupIndexMask.concat([])
					curLevel.rigidMovementAppliedMask = startState.rigidMovementAppliedMask.concat([])
					// TODO: shouldn't we also save/restore the level data computed by level.calculateRowColMasks() ?
					curLevel.commandQueue = startState.commandQueue.concat([])
					curLevel.commandQueueSourceRules = startState.commandQueueSourceRules.concat([])
					sfxCreateMask.setZero()
					sfxDestroyMask.setZero()
					sfxCreateList = [];
					sfxDestroyList = [];

				}

				if (verbose_logging && rigidloop && i>0){				
					consolePrint('Relooping through rules because of rigid.');
						
					debugger_turnIndex++;
					addToDebugTimeline(curLevel,-2);//pre-movement-applied debug state
				}

        		startRuleGroupIndex=0;//rigidGroupUndoDat.ruleGroupIndex+1;
        	} else {
        		if (verbose_logging){

					var eof_idx = debug_visualisation_array[debugger_turnIndex].length+1;//just need some number greater than any rule group
					var inspect_ID = addToDebugTimeline(curLevel,eof_idx);

					consolePrint(`Processed movements.`,false,null,inspect_ID);
					
					if (state.lateRules.length>0){
											
						debugger_turnIndex++;
						addToDebugTimeline(curLevel,-2);//pre-movement-applied debug state
					
						consolePrint('Applying late rules.');
					}
				}
        		applyRules(state.lateRules, state.lateLoopPoint, state.subroutines, 0);
        		startRuleGroupIndex=0;
        	}
        } while (i < 250 && rigidloop);

        if (i>=250) {
          consolePrint("looped through 250 times, gave up. Too many loops!");
          
          applyRules(state.lateRules, state.lateLoopPoint, state.subroutines, 0);
          startRuleGroupIndex=0;
          
          backups.push(bak);
          DoUndo(true,false);
          return false;
        }

		/// Taken from zarawesome, thank you :)
		if (curLevel.commandQueue.indexOf('undo')>=0) {
			if (verbose_logging) {
				consoleCacheDump();
				consolePrint('UNDO command executed, undoing turn.',true);
			}
			messagetext = "";
			statusText = "";
			DoUndo(true,false, true, true, true);
			return true;
		}

        if (playerPositionsAtTurnStart.length>0 && state.metadata.require_player_movement!==undefined && dir >= 0) {
        	var somemoved=false;
        	for (var i=0;i<playerPositionsAtTurnStart.length;i++) {
        		var pos = playerPositionsAtTurnStart[i];
        		var val = curLevel.getCell(pos);
        		if (state.playerMask.bitsClearInArray(val.data)) {
        			somemoved=true;
        			break;
        		}
        	}
        	if (somemoved===false) {
        		if (verbose_logging){
	    			consolePrint('require_player_movement set, but no player movement detected, so cancelling turn.');
	    			consoleCacheDump();
				}
        		addUndoState(bak);
        		DoUndo(true,false, false);
        		return false;
        	}
        	//play player cantmove sounds here
        }



	    if (curLevel.commandQueue.indexOf('cancel')>=0) {
	    	if (verbose_logging) { 
	    		consoleCacheDump();
	    		var r = curLevel.commandQueueSourceRules[curLevel.commandQueue.indexOf('cancel')];
	    		consolePrintFromRule('CANCEL command executed, cancelling turn.',r,true);
			}

			if (!dontModify){
			processOutputCommands(curLevel.commandQueue);
			}

			var commandsleft = curLevel.commandQueue.length>1;

    		addUndoState(bak);
    		DoUndo(true,false, false, false);
    		tryPlayCancelSound();
    		return commandsleft;
	    } 

	    if (curLevel.commandQueue.indexOf('restart')>=0) {
			
    		if (verbose_logging && runrulesonlevelstart_phase){
				var r = curLevel.commandQueueSourceRules[curLevel.commandQueue.indexOf('restart')];
    			logWarning('A "restart" command is being triggered in the "run_rules_on_level_start" section of level creation, which would cause an infinite loop if it was actually triggered, but it\'s being ignored, so it\'s not.',r.lineNumber,true);
    		}

	    	if (verbose_logging) { 
	    		var r = curLevel.commandQueueSourceRules[curLevel.commandQueue.indexOf('restart')];
	    		consolePrintFromRule('RESTART command executed, reverting to restart state.',r.lineNumber);
	    		consoleCacheDump();
			}
			if (!dontModify){
				processOutputCommands(curLevel.commandQueue);
			}
    		addUndoState(bak);

			if (!dontModify){
	    		DoRestart(true);
			}
    		return true;
		}
		
		if (curLevel.commandQueue.indexOf('quit')>=0 && !solving) {
			if (verbose_logging) { 
				var r = curLevel.commandQueueSourceRules[curLevel.commandQueue.indexOf('quit')];
				consolePrintFromRule('QUIT command executed, exiting level.',r);
				consoleCacheDump();
			}
			if (state.metadata.level_select !== undefined) {
				gotoLevelSelectScreen();
			} else {
				goToTitleScreen();
			}
			messagetext = "";
			statusText = "";
			canvasResize();	
			return true;
		}

		var save_backup = true;
		if(!winning && curLevel.commandQueue.indexOf('nosave')>=0) {
			if (verbose_logging) { 
				var r = curLevel.commandQueueSourceRules[curLevel.commandQueue.indexOf('nosave')];
				consolePrintFromRule('NOSAVE command executed, not storing current state to undo queue.',r);
			}
			save_backup = false;
		}
	    
        var modified=false;
	    for (var i=0;i<curLevel.objects.length;i++) {
	    	if (curLevel.objects[i]!==bak.dat[i]) {
				if (dontModify) {
	        		if (verbose_logging) {
	        			consoleCacheDump();
	        		}
	        		addUndoState(bak);
	        		DoUndo(true,false, false);
					return true;
				} else {
					if (dir!==-1 && save_backup) {
						addUndoState(bak);
					} else if (backups.length > 0) {
						// This is for the case that diffs break the undo buffer for real-time games 
						// ( c f https://github.com/increpare/PuzzleScript/pull/796 ),
						// because realtime ticks are ignored when the user presses undo and the backup
						// array reflects this structure.  
						backups[backups.length - 1] = unconsolidateDiff(backups[backups.length - 1], bak);					
	    			}
	    			modified=true;
	    			updateCameraPositionTarget();
	    		}
	    		break;
	    	}
	    }

		if (dontModify && curLevel.commandQueue.indexOf('win')>=0) {	
	    	return true;	
		}
		
		if (dontModify) {		
    		if (verbose_logging) {
    			consoleCacheDump();
    		}
			seedsToAnimate = oldSeedsToAnimate;
			return false;
		}

		// move completed, survived so far, look at sounds to play
		// move and cant were added during rule processing
        for (var i=0;i<seedsToPlay_CantMove.length;i++) {			
            playSeed(seedsToPlay_CantMove[i]);
        }

        for (var i=0;i<seedsToPlay_CanMove.length;i++) {
            playSeed(seedsToPlay_CanMove[i]);
        }

		// create and destroy were added ???
		for (const entry of state.sfx_CreationMasks) {
			if (sfxCreateMask.get(entry.objId)) {		// mask for objects created vs mask for sfx create event
				if (entry.seed.startsWith('afx')) {
					for (const fx of sfxCreateList) {
						if (fx.objId == entry.objId) {
							if (verbose_logging) consolePrint(`Created object "${state.idDict[entry.objId]}", playing seed "${entry.seed}"`);
							seedsToAnimate[fx.posIndex+','+fx.objId] = { kind: 'create', seed: entry.seed };
						}
					}
				} else {
					if (verbose_logging) consolePrint(`Created object "${state.idDict[entry.objId]}", playing seed "${entry.seed}"`);
					playSeed(entry.seed);
				}
			}
		}
  
		for (const entry of state.sfx_DestructionMasks) {
			if (sfxDestroyMask.get(entry.objId)) {
				if (entry.seed.startsWith('afx')) {
					for (const fx of sfxDestroyList) {
						if (fx.objId == entry.objId) {
							if (verbose_logging) consolePrint(`Destroyed object "${state.idDict[entry.objId]}", playing seed "${entry.seed}"`);
							seedsToAnimate[fx.posIndex+','+fx.objId] = { kind: 'destroy', seed: entry.seed };
						}
					}
				} else {
					if (verbose_logging) consolePrint(`Destroyed object "${state.idDict[entry.objId]}", playing seed "${entry.seed}"`);
					playSeed(entry.seed);
				}
			}
		}
  
		if (!dontModify){
	    	processOutputCommands(curLevel.commandQueue);
		}

	    if (textMode===false) {
	    	if (verbose_logging) { 
	    		consolePrint('Checking win conditions.');
			}
			if (dontDoWin===undefined){
				dontDoWin = false;
			}
	    	checkWin( dontDoWin );
	    }

	    if (!winning) {
			if (curLevel.commandQueue.indexOf('checkpoint')>=0) {
		    	if (verbose_logging) { 
	    			var r = curLevel.commandQueueSourceRules[curLevel.commandQueue.indexOf('checkpoint')];
		    		consolePrintFromRule('CHECKPOINT command executed, saving current state to the restart state.',r);
				}
				restartTarget=level4Serialization();
				hasUsedCheckpoint=true;
				var backupStr = JSON.stringify(restartTarget);
				storage_set(document.URL+'_checkpoint',backupStr);
				storage_set(document.URL,curLevelNo);				
			}	 

		    if (curLevel.commandQueue.indexOf('again')>=0 && modified) {

	    		var r = curLevel.commandQueueSourceRules[curLevel.commandQueue.indexOf('again')];

		    	//first have to verify that something's changed
		    	var old_verbose_logging=verbose_logging;
		    	var oldmessagetext = messagetext;
		    	verbose_logging=false;
		    	if (processInput(-1,true,true)) {
			    	verbose_logging=old_verbose_logging;

			    	if (verbose_logging) { 
			    		consolePrintFromRule('AGAIN command executed, with changes detected - will execute another turn.',r);
					}

			    	againing=true;
			    	timer=0;
			    } else {		    	
			    	verbose_logging=old_verbose_logging;
					if (verbose_logging) { 
						consolePrintFromRule('AGAIN command not executed, it wouldn\'t make any changes.',r);
					}
			    }
			    verbose_logging=old_verbose_logging;
			    messagetext = oldmessagetext;
		    }   
		}
		
		if (verbose_logging) { 
			consolePrint(`Turn complete.`);    
		}

		currentMovedEntities = newMovedEntities;
		tweentimer = 0;
		
	    curLevel.commandQueue=[];
	    curLevel.commandQueueSourceRules=[];
		if (debugSwitch.includes('anim')) console.log(`Animate: ${JSON.stringify(seedsToAnimate)}`);

    }

  if (verbose_logging) {
    consoleCacheDump();
  }

  if (winning) {
    againing=false;
  }

  return true; // might beneeded for an animation
  //return modified;
}

// play a seed which could be a sound or an animation
function playSeed(seed, ignore) {
	if (seed)
		playSound(seed, ignore);
	// else nothing yet

}

function checkWin(dontDoWin) {

  if (levelEditorOpened) {
    dontDoWin=true;
  }

	if (curLevel.commandQueue.indexOf('win')>=0) {
		if (runrulesonlevelstart_phase){
			consolePrint("Win Condition Satisfied (However this is in the run_rules_on_level_start rule pass, so I'm going to ignore it for you.  Why would you want to complete a level before it's already started?!)");		
		} else {
			if (verbose_logging && !solving) {
				consolePrint("Win Condition Satisfied.");
			}
		}
		if(!dontDoWin){
			DoWin();
		}
		return;
	}

	var won= false;
	if (state.winconditions.length>0)  {
		var passed=true;
		for (var wcIndex=0;wcIndex<state.winconditions.length;wcIndex++) {
			var wincondition = state.winconditions[wcIndex];
			var filter1 = wincondition[1];
			var filter2 = wincondition[2];
			var aggr1 = wincondition[4];
			var aggr2 = wincondition[5];

			var rulePassed=true;
			
			const f1 = aggr1 ? c=>filter1.bitsSetInArray(c) : c=>!filter1.bitsClearInArray(c);
			const f2 = aggr2 ? c=>filter2.bitsSetInArray(c) : c=>!filter2.bitsClearInArray(c);

			switch(wincondition[0]) {
				case -1://NO
				{
					for (var i=0;i<curLevel.n_tiles;i++) {
						var cell = curLevel.getCellInto(i,_o10);
						if ( (f1(cell.data)) &&  
							 (f2(cell.data)) ) {
							rulePassed=false;
							break;
						}
					}

          break;
        }
        case 0://SOME
        {
          var passedTest=false;
          for (var i=0;i<curLevel.n_tiles;i++) {
            var cell = curLevel.getCellInto(i,_o10);
						if ( (f1(cell.data)) &&  
							 (f2(cell.data)) ) {
              passedTest=true;
              break;
            }
          }
          if (passedTest===false) {
            rulePassed=false;
          }
          break;
        }
        case 1://ALL
        {
          for (var i=0;i<curLevel.n_tiles;i++) {
            var cell = curLevel.getCellInto(i,_o10);
						if ( (f1(cell.data)) &&  
							 (!f2(cell.data)) ) {
              rulePassed=false;
              break;
            }
          }
          break;
        }
      }
      if (rulePassed===false) {
        passed=false;
      }
    }
    won=passed;
  }

	if (won) {
		if (runrulesonlevelstart_phase){
			consolePrint("Win Condition Satisfied (However this is in the run_rules_on_level_start rule pass, so I'm going to ignore it for you.  Why would you want to complete a level before it's already started?!)");		
		} else {
			if (verbose_logging && !solving) {
				consolePrint("Win Condition Satisfied.");
			}
		}
		if (!dontDoWin){
			DoWin();
		}
	}
}

function DoWin() {
	if (winning) {
		return;
	}
	againing = false;
	tryPlayEndLevelSound();

	if (linkStack.length > 0) { 		// got here by link so go back there
		returnLink();
		processInput(-1, true);			// allow trigger on rules with no movement
		return;
	}

	if (unitTesting) {
		nextLevel();
		return;
	}

	winning = true;
	timer = 0;
}

function nextLevel() {
	if (debugSwitch.includes('load')) console.log(`nextLevel()`, `curLevelNo=${curLevelNo}`);
	againing=false;
	messagetext="";
	statusText = "";
	if (state && state.levels && (curLevelNo>state.levels.length) ){
		curLevelNo=state.levels.length-1;
	}
  
  	ignoreNotJustPressedAction=true;
	if (titleScreen && titleMode <= 1) {
		linkStack = [];
		backups = [];
		if(isContinueOptionSelected()) {
			// continue
			loadLevelFromStateOrTarget();
		} else if(isNewGameOptionSelected()) {
			// new game
			curLevelNo=0;
			curlevelTarget=null;

			if (state.metadata.level_select === undefined) {
				clearLocalStorage();
			}

			loadLevelFromStateOrTarget();
		} else if(isLevelSelectOptionSelected()) {
			titleSelection = null;
			gotoLevelSelectScreen();
		} else {
			throw "next level";
			// settings -- TODO
		}
	} else {
		if (hasUsedCheckpoint){
			curlevelTarget=null;
			hasUsedCheckpoint=false;
		}

		if (curLevelNo<(state.levels.length-1)) {
			var skip = false;
			var curSection = state.levels[Number(curLevelNo)].section;
			var nextSection = state.levels[Number(curLevelNo)+1].section;
			if(nextSection != curSection) {
				setSectionSolved(state.levels[Number(curLevelNo)].section);
				
				if(solvedSections.length == state.sections.length && state.winSection != undefined) {
					curLevelNo = state.winSection.firstLevel - 1; // it's gonna be increased to match few lines below
				} else if (nextSection == "__WIN__") {
					gotoLevelSelectScreen();
					skip = true;
				}		
			}

			if(!skip) {
				curLevelNo++;
				curlevelTarget=null;
				textMode=false;
				titleScreen=false;
				quittingMessageScreen=false;
	
				loadLevelFromStateOrTarget();
			}
		} else {
			if (solvedSections.length == state.sections.length) {
				if (state.metadata["level_select"] === undefined) {
					// solved all
					try {
						storage_remove(document.URL);
						storage_remove(document.URL + '_checkpoint');
					} catch (ex) {
					}

					curLevelNo = 0;
					curlevelTarget = null;
					goToTitleScreen();
				} else {
					goToTitleScreen();
				}

				tryPlayEndGameSound();
			} else {
				if (state.levels[Number(curLevelNo)].section != null) {
					setSectionSolved(state.levels[Number(curLevelNo)].section);
				}
				gotoLevelSelectScreen();
			}
		}		
		//continue existing game
	}

	updateLocalStorage();
	resetFlickDat();
	canvasResize();	
}

function loadLevelFromStateOrTarget() {
	if (curlevelTarget!==null){			
		loadLevelFromStateTarget(state,curLevelNo,curlevelTarget);
	} else {
		loadLevelFromState(state,curLevelNo);
	}
}

function goToTitleScreen(){
	if (debugSwitch.includes('load')) console.log(`gotoTitleScreen()`);
    againing=false;
	messagetext="";
	statusText = "";
	titleScreen=true;
	textMode=true;
	hoverSelection=-1;
	doSetupTitleScreenLevelContinue();
  //titleSelection=showContinueOptionOnTitleScreen()?1:0;
  
  	state.metadata = deepClone(state.default_metadata);
  	twiddleMetadataExtras();

  	if (canvas!==null){//otherwise triggers error in cat bastard test
		regenSpriteImages();
	}
	
	levelSelectScrollPos = 0;
	generateTitleScreen();
}

function resetFlickDat() {
	if (state!==undefined && state.metadata.flickscreen!==undefined){
		oldflickscreendat=[0,0,Math.min(state.metadata.flickscreen[0],curLevel.width),Math.min(state.metadata.flickscreen[1],curLevel.height)];
	}
}

function updateLocalStorage() {
	if (linkStack.length > 0)
		return;
	if (debugSwitch.includes('menu')) console.log(`updateLocalStorage`, curlevelTarget);
	try {
		
		storage_set(document.URL,curLevelNo);
		if (curlevelTarget!==null){
			restartTarget=level4Serialization();
			var backupStr = JSON.stringify(restartTarget);
			storage_set(document.URL+'_checkpoint',backupStr);
		} else {
			storage_remove(document.URL+"_checkpoint");
		}		
		
	} catch (ex) {
  }
}

function setSectionSolved(section) {
	if(section == null || section == undefined) {
		return;
	}

	if(section.name == "__WIN__") {
		return;
	}

	if(solvedSections.indexOf(section) >= 0) {
		return;
	}

	try {
		if(!!window.localStorage) {
			solvedSections.push(section);
			storage_set(document.URL + "_sections", JSON.stringify(solvedSections));
		}
	} catch(ex) { }
}

function clearLocalStorage() {
	if (debugSwitch.includes('menu')) console.log(`clearLocalStorage`);
	curLevelNo = 0;
	curlevelTarget = null;
	solvedSections = [];

	try {
		if (!!window.localStorage) {
			storage_remove(document.URL);
			storage_remove(document.URL+'_checkpoint');
			storage_remove(document.URL+'_sections');
		}
	} catch(ex){ }
}

var cameraPositionTarget = null;

var cameraPosition = {
  x: 0,
  y: 0
};

function initSmoothCamera() {
    if (state===undefined || state.metadata.smoothscreen===undefined) {
        return;
    }

    screenwidth=state.metadata.smoothscreen.screenSize.width;
    screenheight=state.metadata.smoothscreen.screenSize.height;

    var boundarySize = state.metadata.smoothscreen.boundarySize;
    var flick = state.metadata.smoothscreen.flick;

    var playerPositions = getPlayerPositions();
    if (playerPositions.length>0) {
        var playerPosition = {
            x: (playerPositions[0]/(curLevel.height))|0,
            y: (playerPositions[0]%curLevel.height)|0
        };

        cameraPositionTarget = {
            x: flick
              ? getFlickCameraPosition(playerPosition.x, curLevel.width, screenwidth, boundarySize.width)
              : getCameraPosition(playerPosition.x, curLevel.width, screenwidth),
            y: flick
              ? getFlickCameraPosition(playerPosition.y, curLevel.height, screenheight, boundarySize.height)
              : getCameraPosition(playerPosition.y, curLevel.height, screenheight)
        };

        cameraPosition.x = cameraPositionTarget.x;
        cameraPosition.y = cameraPositionTarget.y;
    }
}

function getCameraPosition (targetPosition, levelDimension, screenDimension) {
    return Math.min(
        Math.max(targetPosition, Math.floor(screenDimension / 2)),
        levelDimension - Math.ceil(screenDimension / 2)
    );
}

function getFlickCameraPosition (targetPosition, levelDimension, screenDimension, boundaryDimension) {
    var flickGridOffset = (Math.floor(screenDimension / 2) - Math.floor(boundaryDimension / 2));
    var flickGridPlayerPosition = targetPosition - flickGridOffset;
    var flickGridPlayerCell = Math.floor(flickGridPlayerPosition / boundaryDimension);
    var maxFlickGridCell = Math.floor((levelDimension - Math.ceil(screenDimension / 2) - Math.floor(boundaryDimension / 2) - flickGridOffset) / boundaryDimension);

    return Math.min(Math.max(flickGridPlayerCell, 0), maxFlickGridCell) * boundaryDimension + Math.floor(screenDimension / 2);
}

function updateCameraPositionTarget() {
    var smoothscreenConfig = state.metadata.smoothscreen;
    var playerPositions = getPlayerPositions();

    if (!smoothscreenConfig || playerPositions.length === 0) {
        return
    }

    var playerPosition = {
        x: (playerPositions[0]/(curLevel.height))|0,
        y: (playerPositions[0]%curLevel.height)|0
    };

    ['x', 'y'].forEach(function (coord) {
        var screenDimension = coord === 'x' ? screenwidth : screenheight;

        var dimensionName = coord === 'x' ? 'width' : 'height';
        var levelDimension = curLevel[dimensionName];
        var boundaryDimension = smoothscreenConfig.boundarySize[dimensionName];

        var playerVector = playerPosition[coord] - cameraPositionTarget[coord];
        var direction = Math.sign(playerVector);
        var boundaryVector = direction > 0
          ? Math.ceil(boundaryDimension / 2)
          : -(Math.floor(boundaryDimension / 2) + 1);

        if (Math.abs(playerVector) - Math.abs(boundaryVector) >= 0) {
            cameraPositionTarget[coord] = smoothscreenConfig.flick
              ? getFlickCameraPosition(playerPosition[coord], levelDimension, screenDimension, boundaryDimension)
              : getCameraPosition(playerPosition[coord] - boundaryVector + direction, levelDimension, screenDimension);
        }
    })
}


function IsMouseGameInputEnabled() {
	return state.metadata.mouse_left || state.metadata.mouse_up || state.metadata.mouse_drag || state.metadata.mouse_clicks;
}