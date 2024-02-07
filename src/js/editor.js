// main entry point for editor

const starterCodeFile = "next/starter.txt";

// note: this returns the main editor window and any pre-loaded content
var code = document.getElementById('code');
var _editorDirty = false;
var _editorCleanState = "";

if (storage_has('test_code')) {
	code.textContent = storage_get('test_code') + '';
	storage_remove('test_code');
} else code.textContent = '';

window.addEventListener('load', function () {
	let file = null;
	if (file = getParameterByName("demo")) {
		code.value = "loading demo...";
		tryLoadFile(`demo/${file}.txt`);
	} else if (file = getParameterByName("url")) {
		code.value = "loading url...";
		tryLoadFile(file);
	} else if (file = getParameterByName("hack")) {
		code.value = "loading gist...";
		tryLoadGist(file.replace(/[\\\/]/,""));
	} else if (code.value == '') {
		code.value = "loading starter...";
		tryLoadFile(`demo/${starterCodeFile}`, false);
	}
	try {
		if (storage_has('saves')) {
			let curSaveArray = JSON.parse(storage_get('saves'));
			let sd = curSaveArray[curSaveArray.length-1];
			code.value = sd.text;
			let loadDropdown = document.getElementById('loadDropDown');
			loadDropdown.selectedIndex=0;
		}
	} catch(ex) { }
});

CodeMirror.commands.swapLineUp = function(cm) {
    var ranges = cm.listSelections(), linesToMove = [], at = cm.firstLine() - 1, newSels = [];
    for (var i = 0; i < ranges.length; i++) {
      var range = ranges[i], from = range.from().line - 1, to = range.to().line;
      newSels.push({anchor: CodeMirror.Pos(range.anchor.line - 1, range.anchor.ch),
                    head: CodeMirror.Pos(range.head.line - 1, range.head.ch)});
    //   if (range.to().ch == 0 && !range.empty()) --to;
      if (from > at) linesToMove.push(from, to);
      else if (linesToMove.length) linesToMove[linesToMove.length - 1] = to;
      at = to;
    }
	if (linesToMove.length===0){
		return;
	}
    cm.operation(function() {
      for (var i = 0; i < linesToMove.length; i += 2) {
        var from = linesToMove[i], to = linesToMove[i + 1];
        var line = cm.getLine(from);
        cm.replaceRange("", CodeMirror.Pos(from, 0), CodeMirror.Pos(from + 1, 0), "+swapLine");
        if (to > cm.lastLine())
          cm.replaceRange("\n" + line, CodeMirror.Pos(cm.lastLine()), null, "+swapLine");
        else
          cm.replaceRange(line + "\n", CodeMirror.Pos(to, 0), null, "+swapLine");
      }
      cm.setSelections(newSels);
      cm.scrollIntoView();
    });
  };

  CodeMirror.commands.swapLineDown = function(cm) {
    var ranges = cm.listSelections(), linesToMove = [], at = cm.lastLine() + 1;
    for (var i = ranges.length - 1; i >= 0; i--) {
      var range = ranges[i], from = range.to().line + 1, to = range.from().line;
    //   if (range.to().ch == 0 && !range.empty()) from--;
      if (from < at) linesToMove.push(from, to);
      else if (linesToMove.length) linesToMove[linesToMove.length - 1] = to;
      at = to;
    }
    cm.operation(function() {
      for (var i = linesToMove.length - 2; i >= 0; i -= 2) {
        var from = linesToMove[i], to = linesToMove[i + 1];
        var line = cm.getLine(from);
        if (from == cm.lastLine())
          cm.replaceRange("", CodeMirror.Pos(from - 1), CodeMirror.Pos(from), "+swapLine");
        else
          cm.replaceRange("", CodeMirror.Pos(from, 0), CodeMirror.Pos(from + 1, 0), "+swapLine");
        cm.replaceRange(line + "\n", CodeMirror.Pos(to, 0), null, "+swapLine");
      }
      cm.scrollIntoView();
    });
  };

var editor = window.CodeMirror.fromTextArea(code, {
//	viewportMargin: Infinity,
	lineWrapping: true,
	lineNumbers: true,
	styleActiveLine: true,
	extraKeys: {
		"Ctrl-/": "toggleComment",
		"Cmd-/": "toggleComment",
		"Esc":CodeMirror.commands.clearSearch,
		"Shift-Ctrl-Up": "swapLineUp",
		"Shift-Ctrl-Down": "swapLineDown",
		}
	});
	
editor.on('mousedown', function(cm, event) {
  if (event.target.className == 'cm-SOUND') {
    const seed = event.target.innerHTML;
    playSeed(seed,true);
  } else if (event.target.className == 'cm-LEVEL') {
    if (event.ctrlKey||event.metaKey) {
	  document.activeElement.blur();  // unfocus code panel
	  editor.display.input.blur();
      prevent(event);         // prevent refocus
      compile(["levelline",cm.posFromMouse(event).line]);
    }
  } else if (event.target.className == 'cm-LAYER') {
	showLayers = !showLayers;
	if (showLayers) showLayersNo = 3;
  }
});

_editorCleanState = editor.getValue();

function checkEditorDirty() {
	var saveLink = document.getElementById('saveClickLink');

	if (_editorCleanState !== editor.getValue()) {
		_editorDirty = true;
		if(saveLink) {
			saveLink.innerHTML = 'SAVE*';
		}
	} else {
		_editorDirty = false;
		if(saveLink) {
			saveLink.innerHTML = 'SAVE';
		}
	}
}

function setEditorClean() {
	_editorCleanState = editor.getValue();
	if (_editorDirty===true) {
		var saveLink = document.getElementById('saveClickLink');
		if(saveLink) {
			saveLink.innerHTML = 'SAVE';
		}
		_editorDirty = false;
	}
}

/* https://github.com/ndrake/PuzzleScript/commit/de4ac2a38865b74e66c1d711a25f0691079a290d */
editor.on('change', function(cm, changeObj) {
  // editor is dirty
  checkEditorDirty();
});

var mapObj = {
   parallel:"&#8741;",
   perpendicular:"&#8869;"
};

/*
editor.on("beforeChange", function(instance, change) {
    var startline = 
    for (var i = 0; i < change.text.length; ++i)
      text.push(change.text[i].replace(/parallel|perpendicular/gi, function(matched){ 
        return mapObj[matched];
      }));

    change.update(null, null, text);
});*/


code.editorreference = editor;
editor.setOption('theme', 'midnight');

function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

function tryLoadGist(id) {
	var githubURL = 'https://api.github.com/gists/'+id;

	consolePrint("Contacting GitHub",true);
	var githubHTTPClient = new XMLHttpRequest();

	githubHTTPClient.open('GET', githubURL);
	githubHTTPClient.onreadystatechange = function() {
	 
		if(githubHTTPClient.readyState!=4) {
			return;
		}

		if (githubHTTPClient.responseText==="") {
			consoleError("GitHub request returned nothing.  A connection fault, maybe?");
		}

		var result = JSON.parse(githubHTTPClient.responseText);
		if (githubHTTPClient.status===403) {
			consoleError(result.message);
		} else if (githubHTTPClient.status!==200&&githubHTTPClient.status!==201) {
			consoleError("HTTP Error "+ githubHTTPClient.status + ' - ' + githubHTTPClient.statusText);
		} else {
			var code=result["files"]["script.txt"]["content"];
			editor.setValue(code);
			editor.clearHistory();
			clearConsole();
			setEditorClean();
			unloadGame();
			compile(["restart"],code);
		}
	}
	// if (storage_has('oauth_access_token')) {
    //     var oauthAccessToken = storage_get("oauth_access_token");
    //     if (typeof oauthAccessToken === "string") {
    //         githubHTTPClient.setRequestHeader("Authorization","token "+oauthAccessToken);
    //     }
    // }
	githubHTTPClient.setRequestHeader("Content-type","application/x-www-form-urlencoded");
	githubHTTPClient.send();
}

function tryLoadFile(fileName, docompile = true) {
	var fileOpenClient = new XMLHttpRequest();
	fileOpenClient.open('GET', fileName);
	fileOpenClient.onreadystatechange = function() {
		
  		if (fileOpenClient.readyState!=4)
  			return;
		if (fileOpenClient.status != 200 && fileOpenClient.status != 201) {
			consoleError("HTTP Error "+ fileOpenClient.status + ' - ' + fileOpenClient.statusText);
		} else {
			editor.setValue(fileOpenClient.responseText);
			setEditorClean();
			unloadGame();
			if (docompile) {
				clearConsole();
				compile(["restart"]);
			}
		}
	}
	fileOpenClient.send();
}

function canExit() {
 	if(!_editorDirty) {
 		return true;
 	}
 
 	return confirm("You haven't saved your game! Are you sure you want to lose your unsaved changes?")
}
 
function dropdownChange() {
	if(!canExit()) {
 		this.selectedIndex = 0;
 		return;
 	}

	document.activeElement.blur();  // unfocus dropdown
	editor.display.input.blur();

	tryLoadFile(`demo/${this.value}.txt`);
	this.selectedIndex=0;
}

editor.on('keyup', function (editor, event) {
	if (!CodeMirror.ExcludedIntelliSenseTriggerKeys[(event.keyCode || event.which).toString()])
	{
		CodeMirror.commands.autocomplete(editor, null, { completeSingle: false });
	}
});


function debugPreview(turnIndex,lineNumber){
	diffToVisualize=debug_visualisation_array[turnIndex][lineNumber];
	canvasResize(diffToVisualize.level);
}

function debugUnpreview(){
	diffToVisualize=null;
	canvasResize();
}

function addToDebugTimeline(level,lineNumber){

	if (!debug_visualisation_array.hasOwnProperty(debugger_turnIndex)){
		debug_visualisation_array[debugger_turnIndex]=[];
	}

	var debugTimelineSnapshot = {
		width:level.width,
		height:level.height,
		layerCount:level.layerCount,
		turnIndex:debugger_turnIndex,
		lineNumber:lineNumber,
		objects:new Int32Array(level.objects),
		movements:new Int32Array(level.movements),
		commandQueue:level.commandQueue.concat([]),
		commandQueueSourceRules:level.commandQueueSourceRules.concat([]),
		rigidMovementAppliedMask:level.rigidMovementAppliedMask.map(a=>a.clone()),
		level: level,
	};
	

	debug_visualisation_array[debugger_turnIndex][lineNumber]=debugTimelineSnapshot;
	return `${debugger_turnIndex},${lineNumber}`;
}