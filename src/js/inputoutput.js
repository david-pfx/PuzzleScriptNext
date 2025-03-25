var keyRepeatTimer=0;
var keyRepeatIndex=0;
var input_throttle_timer=0.0;
var lastinput=-100;

var dragging=false;
var rightdragging=false;
var columnAdded=false;

function selectText(containerid,e) {
	var myspan = document.getElementById(containerid);
	if (e&&(e.ctrlKey || e.metaKey)) {
		if(solving) return;
		var levelarr = ["console"].concat(myspan.innerHTML.split("<br>"));
		var leveldat = levelFromString(state,levelarr);
		loadLevelFromLevelDat(state,leveldat,null);
		canvasResize();
	} else {
	    if (document.selection) {
	        var range = document.body.createTextRange();
	        range.moveToElementText(myspan);
	        range.select();
	    } else if (window.getSelection) {
	        var range = document.createRange();
	        range.selectNode(myspan);
			var selection = window.getSelection();
			//why removeallranges? https://stackoverflow.com/a/43443101 whatever...
			selection.removeAllRanges();
	        selection.addRange(range);
	    }
	}
}

function recalcLevelBounds(){
}

function arrCopy(from, fromoffset, to, tooffset, len) {
	while (len--)
		to[tooffset++] = from[fromoffset]++;
}

function adjustLevel(level, widthdelta, heightdelta) {
	backups.push(backupLevel());
	var oldlevel = level.clone();
	level.width += widthdelta;
	level.height += heightdelta;
	level.n_tiles = level.width * level.height;
	level.objects = new Int32Array(level.n_tiles * STRIDE_OBJ);
	var bgMask = new BitVec(STRIDE_OBJ);
	bgMask.ibitset(state.backgroundid);
	for (var i=0; i<level.n_tiles; ++i) 
		level.setCell(i, bgMask);
	level.movements = new Int32Array(level.objects.length);
	columnAdded=true;
	RebuildLevelArrays();
	return oldlevel;
}

function addLeftColumn() {
	var oldlevel = adjustLevel(curLevel, 1, 0);
	for (var x=1; x<curLevel.width; ++x) {
		for (var y=0; y<curLevel.height; ++y) {
			var index = x*curLevel.height + y;
			curLevel.setCell(index, oldlevel.getCell(index - curLevel.height))
		}
	}
}

function addRightColumn() {
	var oldlevel = adjustLevel(curLevel, 1, 0);
	for (var x=0; x<curLevel.width-1; ++x) {
		for (var y=0; y<curLevel.height; ++y) {
			var index = x*curLevel.height + y;
			curLevel.setCell(index, oldlevel.getCell(index))
		}
	}
}

function addTopRow() {
	var oldlevel = adjustLevel(curLevel, 0, 1);
	for (var x=0; x<curLevel.width; ++x) {
		for (var y=1; y<curLevel.height; ++y) {
			var index = x*curLevel.height + y;
			curLevel.setCell(index, oldlevel.getCell(index - x - 1))
		}
	}
}

function addBottomRow() {
	var oldlevel = adjustLevel(curLevel, 0, 1);
	for (var x=0; x<curLevel.width; ++x) {
		for (var y=0; y<curLevel.height - 1; ++y) {
			var index = x*curLevel.height + y;
			curLevel.setCell(index, oldlevel.getCell(index - x));
		}
	}
}

function removeLeftColumn() {
	if (curLevel.width<=1) {
		return;
	}
	var oldlevel = adjustLevel(curLevel, -1, 0);
	for (var x=0; x<curLevel.width; ++x) {
		for (var y=0; y<curLevel.height; ++y) {
			var index = x*curLevel.height + y;
			curLevel.setCell(index, oldlevel.getCell(index + curLevel.height))
		}
	}
}

function removeRightColumn(){
	if (curLevel.width<=1) {
		return;
	}
	var oldlevel = adjustLevel(curLevel, -1, 0);
	for (var x=0; x<curLevel.width; ++x) {
		for (var y=0; y<curLevel.height; ++y) {
			var index = x*curLevel.height + y;
			curLevel.setCell(index, oldlevel.getCell(index))
		}
	}
}

function removeTopRow(){
	if (curLevel.height<=1) {
		return;
	}
	var oldlevel = adjustLevel(curLevel, 0, -1);
	for (var x=0; x<curLevel.width; ++x) {
		for (var y=0; y<curLevel.height; ++y) {
			var index = x*curLevel.height + y;
			curLevel.setCell(index, oldlevel.getCell(index + x + 1))
		}
	}
}
function removeBottomRow(){
	if (curLevel.height<=1) {
		return;
	}
	var oldlevel = adjustLevel(curLevel, 0, -1);
	for (var x=0; x<curLevel.width; ++x) {
		for (var y=0; y<curLevel.height; ++y) {
			var index = x*curLevel.height + y;
			curLevel.setCell(index, oldlevel.getCell(index + x))
		}
	}
}

function matchGlyph(inputmask,glyphAndMask) {
	// find mask with closest match
	var highestbitcount=-1;
	var highestmask;
	for (var i=0; i<glyphAndMask.length; ++i) {
		var glyphname = glyphAndMask[i][0];
		var glyphmask = glyphAndMask[i][1];
 		var glyphbits = glyphAndMask[i][2];
		//require all bits of glyph to be in input
		if (glyphmask.bitsSetInArray(inputmask.data)) {
			var bitcount = 0;
			for (var bit=0;bit<32*STRIDE_OBJ;++bit) {
				if (glyphbits.get(bit) && inputmask.get(bit))
 					bitcount++;
				if (glyphmask.get(bit) && inputmask.get(bit))
					bitcount++;
			}
			if (bitcount>highestbitcount) {
				highestbitcount=bitcount;
				highestmask=glyphname;
			}
		}
	}
	if (highestbitcount>0) {
		return highestmask;
	}
	
	logErrorNoLine("Wasn't able to approximate a glyph value for some tiles, using '.' as a placeholder.",true);
	return '.';
}

var htmlEntityMap = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	'"': '&quot;',
	"'": '&#39;',
	"/": '&#x2F;'
};

var selectableint  = 0;

function printLevel() {
	var glyphMasks = [];
	for (var glyphName in state.glyphDict) {
		if (state.glyphDict.hasOwnProperty(glyphName)&&glyphName.length===1) {
			var glyph = state.glyphDict[glyphName];
			var glyphmask=new BitVec(STRIDE_OBJ);
			for (var i=0;i<glyph.length;i++)
			{
				var id = glyph[i];
				if (id>=0) {
					glyphmask.ibitset(id);
				}
			}
			var glyphbits = glyphmask.clone();
			//register the same - backgroundmask with the same name
			var bgMask = state.layerMasks[state.backgroundlayer];
			glyphmask.iclear(bgMask);
			glyphMasks.push([glyphName, glyphmask, glyphbits]);
		}
	}
	selectableint++;
	var tag = 'selectable'+selectableint;
	var output="Printing level contents:<br><br><span id=\""+tag+"\" onclick=\"selectText('"+tag+"',event)\"><br>";
	cache_console_messages = false;
	for (var j=0;j<curLevel.height;j++) {
		for (var i=0;i<curLevel.width;i++) {
			var cellIndex = j+i*curLevel.height;
			var cellMask = curLevel.getCell(cellIndex);
			var glyph = matchGlyph(cellMask,glyphMasks);
			if (glyph in htmlEntityMap) {
				glyph = htmlEntityMap[glyph]; 
			}
			output = output+glyph;
		}
		if (j<curLevel.height-1){
			output=output+"<br>";
		}
	}
	output+="</span><br><br>"
	consolePrint(output,true);
}

function levelEditorClick(event,click) {
	if (mouseCoordY<=-2) {
		var ypos = editorRowCount-(-mouseCoordY-2)-1;
		var newindex=mouseCoordX+(screenwidth-1)*ypos;
		if (mouseCoordX===-1) {
			printLevel();
		} else if (mouseCoordX>=0&&newindex<glyphImages.length) {
			glyphSelectedIndex=newindex;
			redraw();
		}

	} else if (mouseCoordX>-1&&mouseCoordY>-1&&mouseCoordX<screenwidth-2&&mouseCoordY<screenheight-2-editorRowCount	) {
		var glyphname = glyphImagesCorrespondance[glyphSelectedIndex];
		var glyph = state.glyphDict[glyphname];
		var glyphmask = new BitVec(STRIDE_OBJ);
		for (var i=0;i<glyph.length;i++)
		{
			var id = glyph[i];
			if (id>=0) {
				glyphmask.ibitset(id);
			}			
		}

		var backgroundMask = state.layerMasks[state.backgroundlayer];
		if (glyphmask.bitsClearInArray(backgroundMask.data)) {
			// If we don't already have a background layer, mix in
			// the default one.
			glyphmask.ibitset(state.backgroundid);
		}

		var coordIndex = mouseCoordY + mouseCoordX*curLevel.height;
		var getcell = curLevel.getCell(coordIndex);
		if (getcell.equals(glyphmask)) {
			return;
		} else {
			if (anyEditsSinceMouseDown===false) {
				anyEditsSinceMouseDown=true;				
        		backups.push(backupLevel());
			}
			curLevel.setCell(coordIndex, glyphmask);
			redraw();
		}
	}
	else if (click) {
		if (mouseCoordX===-1) {
			//add a left row to the map
			addLeftColumn();			
			canvasResize();
		} else if (mouseCoordX===screenwidth-2) {
			addRightColumn();
			canvasResize();
		} 
		if (mouseCoordY===-1) {
			addTopRow();
			canvasResize();
		} else if (mouseCoordY===screenheight-2-editorRowCount) {
			addBottomRow();
			canvasResize();
		}
	}
}

function levelEditorRightClick(event,click) {
	if (mouseCoordY===-2) {
		if (mouseCoordX<=glyphImages.length) {
			glyphSelectedIndex=mouseCoordX;
			redraw();
		}
	} else if (mouseCoordX>-1&&mouseCoordY>-1&&mouseCoordX<screenwidth-2&&mouseCoordY<screenheight-2-editorRowCount	) {
		var coordIndex = mouseCoordY + mouseCoordX*curLevel.height;
		var glyphmask = new BitVec(STRIDE_OBJ);
		glyphmask.ibitset(state.backgroundid);
		curLevel.setCell(coordIndex, glyphmask);
		redraw();
	}
	else if (click) {
		if (mouseCoordX===-1) {
			//add a left row to the map
			removeLeftColumn();			
			canvasResize();
		} else if (mouseCoordX===screenwidth-2) {
			removeRightColumn();
			canvasResize();
		} 
		if (mouseCoordY===-1) {
			removeTopRow();
			canvasResize();
		} else if (mouseCoordY===screenheight-2-editorRowCount) {
			removeBottomRow();
			canvasResize();
		}
	}
}

function getTilesTraversingPoints(x1, y1, x2, y2) {
	if (cellwidth !== cellheight) {
		throw "Error: Cell is not square.";
	}
	
	var dirX = x2-x1;
	var dirY = y2-y1;
	//var rootedX = (y1*dirX)/dirY;					non-integer
	var scaledRootedX = (y1*dirX);						// == rootedX *dirY
	var rootedY = y1;
	
	// (x1/dirX)*dirY - y1 = c
	//	x*dirY = y*dirX
	
	//var shiftMid = x1-rootedX;					non-integer
	var scaledShiftMid = x1*dirY-scaledRootedX;			// == shiftMid*dirY
	
	// dirY*x2 - dirX*y2 - dirY*shiftMid	==	0
	// dirY*x2 - dirX*y2	==	scaledShiftMid
	
	//var horizontalDeviation = cellwidth*(1 + Math.abs(dirX/dirY))/2;		non-integer; formula provided by phenomist, checked by me (ThatScar)
	var scaledAbsDeviationTimesTwo = cellwidth*(Math.abs(dirX) + Math.abs(dirY));	// == abs(horizontalDeviation*dirY*2)
	
	//var scaledShiftMin = scaledShiftMid - horizontalDeviation*dirY;
	//var scaledShiftMax = scaledShiftMid + horizontalDeviation*dirY;
	var scaledShiftATimesTwo = 2*scaledShiftMid - scaledAbsDeviationTimesTwo;
	var scaledShiftBTimesTwo = 2*scaledShiftMid + scaledAbsDeviationTimesTwo;
	
	/// Important: shifts A and B must be used interchangeably
	
	// Testing against various cellCenterX, cellCenterY;
	// dirY*shiftMin		<	dirY*cellCenterX - dirX*cellCenterY	<=	dirY*shiftMax
	// scaledShiftMin		<	dirY*cellCenterX - dirX*cellCenterY	<=	scaledShiftMax
	// scaledShiftBTimesTwo	<2*(dirY*cellCenterX - dirX*cellCenterY)<=	scaledShiftBTimesTwo
	// OR if both A and B fail, instead.
	
	
	//fOfPoint = dirY*cellCenterX - dirX*cellCenterY;
	//isInside = (scaledShiftMin < fOfPoint) == (fOfPoint <= scaledShiftMax);
	function isInside(cellCenterXTimesTwo, cellCenterYTimesTwo) {
		fOfPointTimesTwo = dirY*cellCenterXTimesTwo - dirX*cellCenterYTimesTwo;
		return (scaledShiftATimesTwo < fOfPointTimesTwo) == (fOfPointTimesTwo <= scaledShiftBTimesTwo);
		/// Important: shifts A and B must be used interchangeably
	}
	
	var cellX1=Math.floor(x1/cellwidth);
	var cellY1=Math.floor(y1/cellheight);
	var cellX2=Math.floor(x2/cellwidth);
	var cellY2=Math.floor(y2/cellheight);
	var offsetToCenterTimesTwo = cellwidth-1;
	
	var xSign = (cellX2-cellX1)>=0 ? 1 : -1;
	var ySign = (cellY2-cellY1)>=0 ? 1 : -1;
	
	var yTrimmer = cellY1;
	
	var tileListX = [];
	var tileListY = [];
	
	
	for (var i=cellX1; i != cellX2+xSign; i += xSign) {
		var over = false;
		
		for (var j=yTrimmer; j != cellY2+ySign; j += ySign) {
			if (j >= curLevel.height || j < 0 || i >= curLevel.width || i < 0) {
				error = "Mouse input loop failed; it:" + i + " " + j + " cell1:" + cellX1 + " " + cellY1 + " cell2:" + cellX2 + " " + cellY2;
				console.log(error);
				throw error;
			}
			if (isInside(i*2*cellwidth+offsetToCenterTimesTwo, j*2*cellwidth+offsetToCenterTimesTwo)){
				
				tileListX.push(i);
				tileListY.push(j);
				// console.log(i + " " + j + " w:" + level.width + " h:" + level.height);
				
				over = true;
				yTrimmer = j;
			} else if (over) {
				break;
			}
		}
	}
	
	var avoidObstacles = "mouse_obstacle" in state.metadata;
	
	var otherTileListX = [cellX1];
	var otherTileListY = [cellY1];
	
	while(cellX1 !== cellX2 || cellY1 !== cellY2) {
		if (cellY1 >= curLevel.height || cellY1 < 0 || cellX1 >= curLevel.width || cellX1 < 0) {
			error = "Mouse input loop failed; cell1:" + cellX1 + " " + cellY1 + " cell2:" + cellX2 + " " + cellY2;
			console.log(error);
			throw error;
		}
		
		hitObstacle = function () {
			var coordIndex = screenOffsetY+cellY1 + (screenOffsetX+cellX1)*curLevel.height;
			var tile = curLevel.getCell(coordIndex);
			if (state.obstacleMask.anyBitsInCommon(tile)) {
				return true;
			} else {
				return false;
			}
		}
		
		cellCornerXTimesTwo = (cellX1*2)*cellwidth+offsetToCenterTimesTwo + xSign*cellwidth;
		cellCornerYTimesTwo = (cellY1*2)*cellwidth+offsetToCenterTimesTwo + ySign*cellwidth;
		fOfPointTimesTwo = dirY*cellCornerXTimesTwo - dirX*cellCornerYTimesTwo;
		if ((fOfPointTimesTwo > scaledShiftMid*2 == ySign > 0) != (xSign > 0)) {
			cellX1 += xSign;
			if (avoidObstacles && hitObstacle()) {
				cellX1 -= xSign;
				cellY1 += ySign;
			}
		} else {
			cellY1 += ySign;
			if (avoidObstacles && hitObstacle()) {
				cellY1 -= ySign;
				cellX1 += xSign;
			}
		}
		
		if (!(avoidObstacles && hitObstacle())) {
			otherTileListX.push(cellX1);
			otherTileListY.push(cellY1);
		} else {
			break;
		}
	}
			
	if (avoidObstacles) {
		tileListX = otherTileListX;
		tileListY = otherTileListY;
	} else for (var i=0; i<tileListX.length; i++) {
		if (tileListX[i] !== otherTileListX[i] || tileListY[i] !== otherTileListY[i]) {
			try {displayError("line tile placement algorithm discrepancies detected");} catch(e){}
			consolePrint("line tile placement algorithm discrepancies detected", true);
			throw "line tile placement algorithm discrepancies detected";
		}
	}
	
	return {tileListX: tileListX, tileListY: tileListY};
}

var lastCoord;

var x1 = 5;
var y1 = 5;
var x2 = 5;
var y2 = 5;

function mouseAction(event,click,id) {
	if (debugSwitch.includes('input')) console.log('mouseAction', event, click, id);
	if (textMode) {
		// we only handle click actions -- not sure why this is here, but gets called by mouseMove()
		if (!click) {
			if (quittingTitleScreen) {return;}

			if (!mouseInCanvas || mouseCoordY < 0 || mouseCoordY > 12) {
				hoverSelection = -1;
			} else {
				hoverSelection = mouseCoordY;
			}
			return;
		}

		if (event.type != "mousedown" && event.type != "touchstart") {
			return;
		}

		if (titleScreen) {
			if (quittingTitleScreen || titleSelected) {
				return;
			}

			if (titleMode == 0) { //Title no save data
				generateTitleScreen(-1, 0, true);
				titleButtonSelected();
			} else if (titleMode == 1) {//Title with save data
				generateTitleScreen(-1, 0, mouseCoordY);
				if (titleSelection)
					titleButtonSelected();
			} else if (titleMode===2) { //Level select
				generateLevelSelectScreen(mouseCoordY);
				if (mouseCoordY == 0) {			// ESC back
					goToTitleScreen();
					tryPlayTitleSound();
				} else if (mouseCoordY == 2) {
					if (levelSelectScrollPos != 0) {
						levelSelectScroll(-3)
					}
				} else if (mouseCoordY == 12) {
					if (state.sections.length - amountOfLevelsOnScreen > levelSelectScrollPos) {
						levelSelectScroll(3)
					}
				} else if (mouseCoordY > 2 && mouseCoordY < 12) {
					const clickedLevel = mouseCoordY - 3 + levelSelectScrollPos;
					if (clickedLevel < state.sections.length) {
						// do this first, because it will get cancelled if locked
						if (titleSelection != null) {
							titleSelected=true;
							messageselected=false;
							timer=0;
							quittingTitleScreen=true;
						}						
						generateLevelSelectScreen(-1, 0, mouseCoordY);
					}
				}
			} else if (titleMode == 3) { // pause screen select
				generatePauseScreen(mouseCoordY);
				timer=0;
				quittingTitleScreen = true;
			}
		} else if (messageselected===false && (state.levels[curLevelNo].message || messagetext != "")) {
			messageselected=true;
			//console.log(`MA TS=${prevTimestamp} Timer = ${timer} qms=${quittingMessageScreen}`);
			timer=0;
			quittingMessageScreen=true;
			tryPlayCloseMessageSound();
			titleScreen=false;
			drawMessageScreen("");
		}
	} else {
		if (winning) {return;}

		x1 = x2;
		y1 = y2;
		x2 = mousePixelX;
		y2 = mousePixelY;

		// clamp mouse target pixel (for moving)
		x2 = Math.max(0, Math.min(cellwidth*screenwidth-1, mousePixelX));
		y2 = Math.max(0, Math.min(cellheight*screenheight-1, mousePixelY));
		
		if (!click) {
			var tileLists = getTilesTraversingPoints(x1, y1, x2, y2);
			var tileListX = tileLists.tileListX;
			var tileListY = tileLists.tileListY;
			
			for (var i=0; i<tileListX.length; i++) {
				
				var coordIndex = screenOffsetY+tileListY[i] + (screenOffsetX+tileListX[i])*curLevel.height;
				if (lastCoord===coordIndex) {
					continue;
				}
				lastCoord = coordIndex;
				
				if (againing) {
					//consolePrint("no mouse, againing",false);
				} else {
					pushInput(`mouse,${id},${coordIndex}`);
					mouseInput(id, coordIndex);  // refactor for makeGIF()
					event.handled = true;
				}
			}
		} else if (mouseCoordX>=0 && mouseCoordY>=0 && mouseCoordX<screenwidth && mouseCoordY<screenheight) {
			var coordIndex = screenOffsetY+mouseCoordY + (screenOffsetX+mouseCoordX)*curLevel.height;
			if (againing) {
				//consolePrint("no mouse, againing",false);
			} else {
				pushInput(`mouse,${id},${coordIndex}`);
				mouseInput(id, coordIndex);  // refactor for makeGIF()
				event.handled = true;
			}
		}
	}
}

function mouseInput(id, coordIndex) {
	if (id >= 0) {
		// drop an object at this location
		try {
			var bak = backupLevel();
			var cell = curLevel.getCell(coordIndex);
			cell.ibitset(id);
			curLevel.setCell(coordIndex, cell);
			var inputdir = 5;
			if (processInput(inputdir,false,false,bak)) {
				redraw();
			}
		} catch(e) {
			console.log(e);
			consolePrint(e,true);
		}
	} else {
		// don't drop an object, feed in a movement instead
		const inputdir = (id == -1) ? 6 : 7;  // todo: mclick
		if (processInput(inputdir, false, false, bak, coordIndex)) {
			redraw();
		}
	}
}

var anyEditsSinceMouseDown = false;

function onMouseDown(event, wasFiredByTouch = false) {
	//console.log("mouse down");
	if (event.handled){
		return;
	}

	ULBS();
	
	var lmb = event.button===0;
	var rmb = event.button===2 ;
	if (event.type=="touchstart"){
		lmb=true;
	}
	if (lmb && (event.ctrlKey||event.metaKey)){
		lmb=false;
		rmb=true;
	}
	
	if (lmb ) {
        lastDownTarget = event.target;
        keybuffer=[];
        if (event.target===canvas || event.target.className==="tapFocusIndicator") {
        	setMouseCoord(event);
        	dragging=true;
        	rightdragging=false;
        	anyEditsSinceMouseDown=false;
        	if (levelEditorOpened && !textMode) {
        		return levelEditorClick(event,true);
        	} else if ("mouse_left" in state.metadata) {
				if (wasFiredByTouch) {
					prevent(event)
				}
				return mouseAction(event,true,state.lmbID);		// must break to not execute dragging=false;
			} else if (state.metadata.mouse_clicks) {
				return mouseAction(event, true, -1); // trigger lclick
			}

        }
        dragging=false;
        rightdragging=false; 
    } else if (rmb) {
    	if (event.target.id==="gameCanvas") {
			setMouseCoord(event);
		    dragging=false;
		    rightdragging=true;
        	if (levelEditorOpened) {
        		return levelEditorRightClick(event,true);
        	} else if ("mouse_right" in state.metadata) {
				return mouseAction(event,true,state.rmbID);
			} else if (state.metadata.mouse_clicks) {
				return mouseAction(event, true, -2); // trigger rclick
			}
        } else {
			dragging=false;
			rightdragging=false;
		}
    } else if (event.button===1) {
		//undo
		if (textMode===false && (IsMouseGameInputEnabled() || levelEditorOpened)) {
			pushInput("undo");
			DoUndo(false,true);
			canvasResize(); // calls redraw
			return prevent(event);
		}
	}
	event.handled=true;

}

function rightClickCanvas(event) {
	//console.log("rightClickCanvas");
	// cannot setMouseCoord() here -- crashes -- but assume it's been set
	if (mouseCoordX >= 0 && mouseCoordY >= 0 && mouseCoordX < screenwidth && mouseCoordY < screenheight) {
		return prevent(event);
	}
	if (levelEditorOpened) {
		return prevent(event);
	}
}

function onMouseUp(event, wasFiredByTouch = false) {
	if (event.handled){
		return;
	}

	dragging=false;
    rightdragging=false;

	var lmb = event.button===0;
	var rmb = event.button===2;
	if (event.type=="touchend"){
		lmb=true;
	}

	if (lmb) {
        if (event.target===canvas) {
        	setMouseCoord(event);
        	if ("mouse_up" in state.metadata) {
				if (wasFiredByTouch) {
					prevent(event)
				} //Prevent "ghost click" on mobile
				return mouseAction(event,true,state.lmbupID);
			}
        }
    } else if (rmb) {
    	if (event.target.id==="gameCanvas") {
        	setMouseCoord(event);
        	if ("mouse_rup" in state.metadata) {
				return mouseAction(event,true,state.rmbupID);
			}
        }
    }
	event.handled=true;
}

function onKeyDown(event) {
	//console.log(`keycode ${event.keyCode}`);

	ULBS();
	// Prevent arrows/space from scrolling page
	if ((!IDE) && ([32, 37, 38, 39, 40].indexOf(event.keyCode) > -1)) {
		if (event&&(event.ctrlKey || event.metaKey)){
		} else {
			prevent(event);
		}
	}

	if ((!IDE) && event.keyCode===77){//m
		toggleMute();		
	}

	// discard duplicates, but don't pass them through either
    if (keybuffer.indexOf(event.keyCode)>=0) {
    	return prevent(event);
    }

    if(lastDownTarget === canvas || (window.Mobile && (lastDownTarget === window.Mobile.focusIndicator) ) ){
    	if (keybuffer.indexOf(event.keyCode)===-1) {
    		if (event&&(event.ctrlKey || event.metaKey)){
		    } else {
    		    keybuffer.splice(keyRepeatIndex,0,event.keyCode);
	    	    keyRepeatTimer=0;
	    	    checkKey(event,!event.repeat);
		    }
		}
	}


    if (canDump===true) {
        if (event.keyCode===74 && (event.ctrlKey||event.metaKey)) {//ctrl+j
            dumpTestCase();
            prevent(event);
        } else if (event.keyCode===75 && (event.ctrlKey||event.metaKey)) {//ctrl+k
            makeGIF();
            prevent(event);
        }  else if (event.keyCode===83 && (event.ctrlKey||event.metaKey)) {//ctrl+s
            saveClick();
            prevent(event);
		// avoid conflicts with codemirror key bindings
        // }  else if (event.keyCode===66 && (event.ctrlKey||event.metaKey)) {//ctrl+b
        //     rebuildClick();
        //     prevent(event);
        //     event.target.blur();
        //     canvas.focus();
        // }  else if (event.keyCode===88 && (event.ctrlKey||event.metaKey)) {//ctrl+x
        //     runClick();
        //     prevent(event);
        //     event.target.blur();
        //     canvas.focus();
        }  else if (event.keyCode===120) { //f9
            prevent(event);
        	solve();
        }  else if (event.keyCode===119) { //f8
            prevent(event);
        	stopSolving();
        } else if (event.keyCode===13 && (event.ctrlKey||event.metaKey)){//ctrl+enter
			canvas.focus();
			editor.display.input.blur();
			if (event.shiftKey){
				runClick();
			} else {
				rebuildClick();
			}
			prevent(event);
            event.target.blur();
            canvas.focus();
		}
	}
}

function relMouseCoords(event){
    var totalOffsetX = 0;
    var totalOffsetY = 0;
    var canvasX = 0;
    var canvasY = 0;
    var currentElement = this;

    do{
        totalOffsetX += currentElement.offsetLeft - currentElement.scrollLeft;
        totalOffsetY += currentElement.offsetTop - currentElement.scrollTop;
    }
    while(currentElement = currentElement.offsetParent)

	if (event.touches && event.touches.length >= 1){
		canvasX = event.touches[0].pageX - totalOffsetX;
		canvasY = event.touches[0].pageY - totalOffsetY;
	} else if (event.changedTouches != null && event.changedTouches.length >= 1) {
		canvasX = event.changedTouches[0].pageX - totalOffsetX;
		canvasY = event.changedTouches[0].pageY - totalOffsetY;
	} else {
		canvasX = event.pageX - totalOffsetX;
		canvasY = event.pageY - totalOffsetY;
	}

    return {x:canvasX, y:canvasY}
}
HTMLCanvasElement.prototype.relMouseCoords = relMouseCoords;

function onKeyUp(event) {
	//event = event || window.event;
	var index=keybuffer.indexOf(event.keyCode);
	if (index>=0){
    	keybuffer.splice(index,1);
    	if (keyRepeatIndex>=index){
    		keyRepeatIndex--;
    	}
    }
}

function onMyFocus(event) {	
	keybuffer=[];
	keyRepeatIndex = 0;
	keyRepeatTimer = 0;
}

function onMyBlur(event) {
	keybuffer=[];
	keyRepeatIndex = 0;
	keyRepeatTimer = 0;
}

var mouseCoordX=0;
var mouseCoordY=0;
var mousePixelX=0;
var mousePixelY=0;

function setMouseCoord(e){
	var coords = canvas.relMouseCoords(e);

	//Fake mobile presses can generate mouse clicks resulting into this function. This is required, otherwise the state of the game seems to get weird, somehow. The following values are allowed to be NaN and should be checked as such. This is a little hacky though, apoligies. See PS+ issue #88

    mousePixelX=coords.x-xoffset;
	mousePixelY=coords.y-yoffset;
	mouseCoordX=Math.floor(mousePixelX/cellwidth);
	mouseCoordY=Math.floor(mousePixelY/cellheight);
}

function mouseMove(event) {
	
	if (event.handled){
		return;
	}

    if (levelEditorOpened) {
    	setMouseCoord(event);
    	if (dragging) { 	
    		levelEditorClick(event,false);
    	} else if (rightdragging){
    		levelEditorRightClick(event,false);
    	}
	    redraw();
	} else if (titleScreen && IsMouseGameInputEnabled()) {
		var prevHoverSelection = hoverSelection;
		setMouseCoord(event);
		mouseAction(event,false,null);
		if (prevHoverSelection != hoverSelection) {
			if (titleMode == 1) {
				generateTitleScreen(hoverSelection);
			} else if (titleMode == 2) {
				generateLevelSelectScreen(hoverSelection);
			} else if (titleMode == 3) {
				generatePauseScreen(hoverSelection);
			}
		}
	} else if (dragging && "mouse_drag" in state.metadata) {
    	setMouseCoord(event);
    	mouseAction(event,false,state.dragID);
	    redraw();
	} else if (rightdragging && "mouse_rdrag" in state.metadata) {
    	setMouseCoord(event);
		mouseAction(event,false,state.rdragID);
	    redraw();
	}

	event.handled=true;
}

// bug: if game starts with mouse already in canvas, it will not get set true
let mouseInCanvas = false;

function onMouseIn() {
	mouseInCanvas = true;
}

function onMouseOut() {
	mouseInCanvas = false;
}

document.addEventListener('touchstart', onTouchDown, {passive: false});
document.addEventListener('touchmove', mouseMove, false);
document.addEventListener('touchend', onTouchUp, {passive: false});

function onTouchDown(event) {
	onMouseDown(event, true)
}

function onTouchUp(event) {
	onMouseUp(event, true)
}

document.addEventListener('mousedown', onMouseDown, false);
document.addEventListener('mouseup', onMouseUp, false);
document.addEventListener('mousemove', mouseMove, false);

document.addEventListener('contextmenu', rightClickCanvas, false);
document.addEventListener('keydown', onKeyDown, false);
document.addEventListener('keyup', onKeyUp, false);
document.addEventListener('wheel', onMouseWheel, {passive: false})
window.addEventListener('focus', onMyFocus, false);
window.addEventListener('blur', onMyBlur, false);
canvas.addEventListener('mouseenter', onMouseIn, false);
canvas.addEventListener('mouseleave', onMouseOut, false)

function onMouseWheel(event) {

	if (!mouseInCanvas || event.ctrlKey) {return;}

	normalizedDelta = Math.sign(event.deltaY);

	if (titleScreen && titleMode == 2 && (IsMouseGameInputEnabled())) {
		levelSelectScroll(normalizedDelta);

		redraw();
		prevent(event)
	}
	if (levelEditorOpened) {
		glyphSelectedIndex = clamp(glyphSelectedIndex + normalizedDelta, 0, glyphCount() - 1);
		redraw();
		prevent(event)
	}
}

function levelSelectScroll(direction) {
	levelSelectScrollPos = clamp(levelSelectScrollPos + direction, 0, Math.max(state.sections.length - amountOfLevelsOnScreen, 0));
	titleSelection = clamp(titleSelection + direction, 0, state.sections.length - 1);
	generateLevelSelectScreen();
}

function clamp(number, min, max) {
	return Math.min(Math.max(number, min), max);
}

function prevent(e) {
    if (e.preventDefault) e.preventDefault();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    if (e.stopPropagation) e.stopPropagation();
    e.returnValue=false;
    return false;
}

function titleButtonSelected() {
	if (!titleSelected) {
		tryPlayStartGameSound();
		titleSelected=true;
		timer=0;
		quittingTitleScreen=true;
		canvasResize();

		document.dispatchEvent(new Event("psplusGameStarted"));
	}
}

var gamepadKeys = []; // used to store keys held at previous frame

function pollGamepads() {
	function buttonCheck(buttons, i) {
		if(buttons.length < i) {
			return false;
		}
		
		if(typeof(buttons[i]) == "object") {
			return buttons[i].pressed;
		}
	
		return buttons[i] == 1.0;
	}
	function axisCheck(axes, i, dir) {
		if(axes.length < i) {
			return false;
		}
		
		return axes[i] * dir > 0.5;
	}

	var newGamepadKeys = [];

	function keyPressed(keycode) {
    	if(keybuffer.indexOf(keycode) === -1) {
    		keybuffer.splice(keyRepeatIndex, 0, keycode);
	    	keyRepeatTimer = 0;
	    	checkKey({keyCode: keycode}, true);
		}

		newGamepadKeys.splice(0, 0, keycode);
	}

	// clear any keys previously pressed but no longer held:
	function clear() {
		for(var k = 0; k < gamepadKeys.length; k++) {
			if(newGamepadKeys.indexOf(gamepadKeys[k]) >= 0) {
				continue;
			}

			var index = keybuffer.indexOf(gamepadKeys[k]);
			if(index >= 0) {
				keybuffer.splice(index, 1);
				if(keyRepeatIndex >= index) {
					keyRepeatIndex--;
				}
			}
		}

		gamepadKeys = newGamepadKeys;
	}

	var gamepads = navigator.getGamepads ? navigator.getGamepads() : (navigator.webkitGetGamepads ? navigator.webkitGetGamepads() : []);
	if(gamepads == null || gamepads.length == 0) {
		clear();
		return;
	}

	for(var i = 0; i < gamepads.length; i++) {
		var gamepad = gamepads[i];
		
		if(gamepad == null || !gamepad.connected) {
			continue;
		}

		if(buttonCheck(gamepad.buttons, 3) // Y
			|| buttonCheck(gamepad.buttons, 4)) { // LB
			
			keyPressed(82); // restart
		}
		if(buttonCheck(gamepad.buttons, 1) // B
			|| axisCheck(gamepad.axes, 2, 1)) { // LT
			
			keyPressed(90); // undo
		}
		if(buttonCheck(gamepad.buttons, 2) // X
			|| buttonCheck(gamepad.buttons, 0) // A
			|| buttonCheck(gamepad.buttons, 5) // RB
			|| axisCheck(gamepad.axes, 1, 1)) { // RT
			
			keyPressed(88); // action
		}
		if(buttonCheck(gamepad.buttons, 7)) { // menu button
			keyPressed(27); // exit
		}
		if(buttonCheck(gamepad.buttons, 6)) { // change view button
			keyPressed(69); // edit
		}
		if(axisCheck(gamepad.axes, 0, 1) // right
			|| axisCheck(gamepad.axes, 6, 1)) { // D-pad right
			
			keyPressed(39); // right
		}
		if(axisCheck(gamepad.axes, 0, -1) // left
			|| axisCheck(gamepad.axes, 6, -1)) { // D-pad left
			
			keyPressed(37); // left
		}
		if(axisCheck(gamepad.axes, 1, -1) // up
			|| axisCheck(gamepad.axes, 7, -1)) { // D-pad up
			
			keyPressed(38); // up
		}
		if(axisCheck(gamepad.axes, 1, 1) // down
			|| axisCheck(gamepad.axes, 7, 1)) { // D-pad down
			
			keyPressed(40); // down
		}
	}

	clear();
}

let debugTimestamp
function checkKey(e,justPressed) {
    if (debugSwitch.includes('input') && justPressed) console.log('checkKey', prevTimestamp, e, justPressed);
    if (debugSwitch.includes('key')) {
		const ele = document.getElementById('debug');
		if (ele)
			ele.innerHTML = `key-${e.keyCode} just=${justPressed} last=${~~(prevTimestamp-debugTimestamp)} TS=${~~prevTimestamp} delta=${~~(deltatime*1000)} keybuffer=${keybuffer.length}`;
		debugTimestamp = prevTimestamp;
	}
	ULBS();
	
    if (winning) {
    	return;
	}
	if (e&&(e.ctrlKey || e.metaKey|| e.altKey)){
		return;
	}
	if (e.keyCode >= 0x70 && e.keyCode <= 0x83) // function keys
		return;
	
    var inputdir=-1;
    switch(e.keyCode) {
        case 65://a
        case 37: //left
        {
			inputdir = dirNames.indexOf('left');
        break;
        }
        case 38: //up
        case 87: //w
        {
			inputdir = dirNames.indexOf('up');
        break;
        }
        case 68://d
        case 39: //right
        {
			inputdir = dirNames.indexOf('right');
        break;
        }
        case 83://s
        case 40: //down
        {
			inputdir = dirNames.indexOf('down');
        break;
        }
        case 80://p
        {
			printLevel();
			return prevent(e);
        }
        case 13://enter
        case 32://space
        //case 67://c
        case 88://x
        {
			if (justPressed && ignoreNotJustPressedAction){
				ignoreNotJustPressedAction=false;
			}
			if (justPressed===false && ignoreNotJustPressedAction){
				return prevent(e);
			}
			if (norepeat_action===false || justPressed) {
				inputdir = dirNames.indexOf('action');		// todo: reaction
            } else {
            	return prevent(e);
            }
        break;
        }
        case 85://u
        case 90://z
        {
            //undo
            if (!textMode) {
                pushInput("undo");
                DoUndo(false,true);
                canvasResize(); // calls redraw
            	return prevent(e);
            }
            break;
        }
        case 82://r
        {
        	if (!textMode) {
        		if (justPressed) {
	        		pushInput("restart");
	        		DoRestart();
	                canvasResize(); // calls redraw
            		return prevent(e);
            	}
            }
            break;
        }
        case 27://escape
        {
        	if(solving) {
        		stopSolving();
        		break;
        	}
			if (!titleScreen && state.metadata.enable_pause) {
				goToPauseScreen(); 
				canvasResize();
			} else if (!titleScreen || titleMode > 1) {
				if ((timer/1000>0.5 || titleMode > 1) && !quittingTitleScreen && justPressed) {

					titleSelection = 0;
					
					timer = 0;
					if(!titleScreen && state.metadata.level_select) {
						titleSelection = null;
						gotoLevelSelectScreen();
					} else {
						goToTitleScreen();
					}

					tryPlayTitleSound();
					canvasResize();
				}

				return prevent(e)
        	}
        	break;
        }
        case 69: {//e
        	if (!solving && canOpenEditor) {
        		if (justPressed) {
        			if (titleScreen){
        				if (state.title==="EMPTY GAME"){
        					compile(["loadFirstNonMessageLevel"]);
        				} else {
        					nextLevel();
        				}
        			}
        			levelEditorOpened=!levelEditorOpened;
        			if (levelEditorOpened===false){
        				printLevel();
        			}
        			restartTarget=backupLevel();
        			canvasResize();
        		}
        		return prevent(e);
        	}
            break;
		}
		case 48://0
		case 49://1
		case 50://2
		case 51://3
		case 52://4
		case 53://5
		case 54://6
		case 55://7
		case 56://8
		case 57://9
		{
        	if (levelEditorOpened&&justPressed) {
        		var num=9;
        		if (e.keyCode>=49)  {
        			num = e.keyCode-49;
        		}

				if (num<glyphImages.length) {
					glyphSelectedIndex=num;
				} else {
					consolePrint("Trying to select tile outside of range in level editor.",true)
				}

        		canvasResize();
        		return prevent(e);
        	}	
        	break;	
        }
		case 189://-
		{
        	if (levelEditorOpened&&justPressed) {
				if (glyphSelectedIndex>0) {
					glyphSelectedIndex--;
					canvasResize();
					return prevent(e);
				} 
        	}	
        	break;	
		}
		case 187://+
		{
        	if (levelEditorOpened&&justPressed) {
				if (glyphSelectedIndex+1<glyphImages.length) {
					glyphSelectedIndex++;
					canvasResize();
					return prevent(e);
				} 
        	}	
        	break;	
		}
		case 33://PgUp
		{
			if (!textMode && showLayers) {
				showLayerNo++;	// will be range checked on use
				canvasResize();
				return prevent(e);
			}
		}
		case 34://PgDn
		{
			if (!textMode && showLayers) {
				showLayerNo--;	// will be range checked on use
				canvasResize();
				return prevent(e);
			}
		}
    }
    if (debugSwitch.includes('input')) console.log('checkKey', prevTimestamp, throttle_movement, inputdir, input_throttle_timer, repeatinterval);
    if (throttle_movement && inputdir>=0&&inputdir<=3) {
    	if (lastinput==inputdir && input_throttle_timer<repeatinterval) {
    		return prevent(e);
    	}else {
    		lastinput=inputdir;
    		input_throttle_timer=0;
    	}
    }
    if (textMode) {
		if(!throttle_movement) { //If movement isn't throttled, then throttle it anyway
			if (!titleScreen && lastinput==inputdir && input_throttle_timer < repeatinterval) { //Don't throttle on level select
				return prevent(e);
			} else {
				lastinput=inputdir;
				input_throttle_timer=0;
			}
		}
		
    	if (state.levels.length===0) {
    		//do nothing
    	} else if (titleScreen) {
			if (isSitelocked()) {return prevent(e);}
			if (quittingTitleScreen===false){
				if (titleMode===0) {
					if (inputdir===4&&justPressed) {
						generateTitleScreen(-1, 0, true);
						titleButtonSelected();
						clearInputHistory();
					}
				} else if (titleMode == 3) {
					if (inputdir == 4 && justPressed) {
						generatePauseScreen(-1, 0, levelSelectScrollPos);
						timer = 0;
						quittingTitleScreen=true;
						redraw();
					} else if (inputdir == 0 || inputdir == 2) {
						generatePauseScreen(-1, inputdir == 0 ? -1 : 1);
					}
				} else {
					if (inputdir==4&&justPressed) {
						if (titleSelected===false) {    				
							tryPlayStartGameSound();
							titleSelected=true;
							timer=0;
							quittingTitleScreen=true;
							
							if(titleMode == 1) {
								generateTitleScreen(-1, 0, levelSelectScrollPos);
								document.dispatchEvent(new Event("psplusGameStarted"));
							} else if(titleMode == 2) {
								generateLevelSelectScreen(-1, 0, levelHighlightLine);
							}
						}
					}
					else if (inputdir===0||inputdir===2) {
						if (quittingTitleScreen || titleSelected) {
							return prevent(e);
						}
						if(titleMode == 1) {
							generateTitleScreen(-1, inputdir == 0 ? -1 : 1);
						} else if(titleMode == 2) {
							generateLevelSelectScreen(-1, inputdir == 0 ? -1 : 1);
						} else if (titleMode == 3) {
							generatePauseScreen(-1, inputdir == 0 ? -1 : 1);
						}
					}
				}
			}
    	} else {
    		if (inputdir==4&&justPressed) {    				
				if (unitTesting) {
					nextLevel();
					return prevent(e);
				} else if (messageselected===false) {
					//console.log(`CK TS=${prevTimestamp} Timer = ${timer} qms=${quittingMessageScreen}`);
    				messageselected=true;
    				timer=0;
    				quittingMessageScreen=true;
    				tryPlayCloseMessageSound();
    				titleScreen=false;
    				drawMessageScreen("");
    			}
    		}
    	}
		return prevent(e);
    } else {
	    if (!againing && inputdir>=0) {
			if (suppressInput) {
				//suppressInput = false;
				//goToPauseScreen();
			} else if (inputdir===4 && ('noaction' in state.metadata)) {

            } else {
                pushInput(inputdir);
                if (processInput(inputdir)) {
                    redraw();
                }
	        }
	       	return prevent(e);
    	}
    }
	return prevent(e);
}

// called on every clock tick
function update() {
    var draw = false;

	timer+=deltatime;
	tweentimer+=deltatime;
	input_throttle_timer+=deltatime;

    if (quittingTitleScreen) {
        if (timer/1000>0.3) {
			quittingTitleScreen=false;
			
			if(titleMode <= 1) {
				nextLevel();
			} else if(titleMode == 2) {
				gotoLevel(titleSelection);
			} else if(titleMode == 3) {
				selectPauseScreen();
			}
        }
    }
    if (againing) {
        if (timer>againinterval && messagetext == "" && !isTweening) {
            if (processInput(-1)) {
                draw = true;
                keyRepeatTimer=0;
                autotick=0;
            }
        }
    }
    if (quittingMessageScreen) {
		//console.log(`UP TS=${prevTimestamp} Timer = ${timer} qms=${quittingMessageScreen}`);
        if (timer/1000>0.15) {
            quittingMessageScreen=false;
            if (state.levels[curLevelNo].message) {
            	nextLevel();
            } else {
            	messagetext="";
            	textMode=false;
				titleScreen=false;
				titleMode=(curLevelNo>0||curlevelTarget!==null)?1:0;
				titleSelected=false;
				ignoreNotJustPressedAction=true;
				titleSelection=0;
    			canvasResize();  
    			checkWin();          	
            }
        }
    }
    if (winning) {
        if (timer/1000>0.5) {
            winning=false;
            nextLevel();
        }
	}
	
	pollGamepads();

    if (keybuffer.length>0) {
	    keyRepeatTimer+=deltatime;
	    var ticklength = throttle_movement ? repeatinterval : repeatinterval/(Math.sqrt(keybuffer.length));
	    if (keyRepeatTimer>ticklength) {
			keyRepeatTimer=0;	
	    	keyRepeatIndex = (keyRepeatIndex+1)%keybuffer.length;
	    	var key = keybuffer[keyRepeatIndex];
			if (debugSwitch.includes('key')) {
				const ele = document.getElementById('debug');
				if (ele)
					ele.innerHTML = `key-${key} TL=${~~ticklength} last=${~~(prevTimestamp-debugTimestamp)} TS=${~~prevTimestamp} delta=${~~(deltatime*1000)} keybuffer=${keybuffer.length}`;
				debugTimestamp = prevTimestamp;
			}
	        checkKey({keyCode:key},false);
	    }
	}

    if (autotickinterval>0&&!textMode&&!levelEditorOpened&&!againing&&!winning) {
        autotick+=deltatime;
        if (autotick>autotickinterval) {
            autotick=0;
            pushInput("tick");
            if (processInput(-1)) {
                draw = true;
            }
        }
    }

	// force redraw to update animations
	if (draw || isAnimating) {
	  	redraw();
	}
}

var prevTimestamp;
// Lights, camera…function!
var loop = function(timestamp){
	if (prevTimestamp !== undefined) {
		deltatime = timestamp - prevTimestamp
		if (debugSwitch.includes('key')) {
			const ele = document.getElementById('debug');
			if (ele)
				ele.innerHTML = `timer=${timer.toFixed()} TS=${~~timestamp} delta=${~~(deltatime*1000)} KB=${keybuffer.length}`;
		}
	}
	prevTimestamp = timestamp
	try {
		update();
	}
	catch (e) {
		//Something went wrong, but it's more important that the loop doesn't crash during errors
		console.error(e);
	}
	// requestAnimationFrame will call loop() at the 
	// browser's refresh rate (generally 60fps)
	// and will auto pause/unpause when the window is minimized
	window.requestAnimationFrame(loop);
}

window.requestAnimationFrame(loop);
