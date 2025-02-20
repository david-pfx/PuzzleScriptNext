var lastDownTarget = null;
var canvas = null;
//var input = document.createElement('TEXTAREA');

function canvasResize() {

}

function redraw() {

}

function forceRegenImages(){

}

var levelString;
var inputString;
var outputString;

function consolePrintFromRule(text){}
// enable these if needed to help with debugging
function consolePrint(text,urgent,linenumber,turnIndex) {
	// if (urgent)
	// 	window.console.log(text);
}
function consoleError(text) {
	// window.console.log(text);
}

function consoleCacheDump() {}
var editor = {
	getValue : function () { return levelString }
}

function addToDebugTimeline(level, lineNumber){}