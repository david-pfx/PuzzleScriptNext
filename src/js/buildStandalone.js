// Save runnable version of the game to a standalone HTML file

// Special care required to handle:
// 	* __GAMETITLE__ must be HTML safe
//  * __HOMEPAGE__ should be a valid URL (not really enforced here)
//  * __HOMEPAGE_STRIPPED_PROTOCOL__ should drop the protocol
//  * __GAMEDAT__ is the game code, which may contain $ (which is special to String.replace)
//  * saved filename must not contain bad Windows characters

// test program is test_export.txt

var standalone_HTML_String="";

var clientStandaloneRequest = new XMLHttpRequest();

clientStandaloneRequest.open('GET', 'standalone_inlined.txt');
clientStandaloneRequest.onreadystatechange = function() {

		if(clientStandaloneRequest.readyState!=4) {
			return;
		}
		if (clientStandaloneRequest.responseText==="") {
			consolePrint("Couldn't find standalone template. Is there a connection problem to the internet?",true,null,null);
		}
		standalone_HTML_String=clientStandaloneRequest.responseText;
}
clientStandaloneRequest.send();

function escapeHtmlChars(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
 }
 
const get_blob = function() {
	return self.Blob;
}

function saveFile(htmlString, filename) {
	const BB = get_blob();
	const blob = new BB([ htmlString ], { type: "text/plain;charset=utf-8" });
	saveAs(blob, filename);
}

// mainline function to build and save standalone version of script
function buildStandalone(sourceCode) {
	function removeDiv(div) {
		const start = htmlString.indexOf('<div ' + div);
		const end = htmlString.indexOf('</div>', start);
		if (start >= 0 && end >= 0) {
			htmlString = htmlString.substring(0, start) + htmlString.substring(end + 6);
		}
	}

	function patchGameContainer(top) {
		for (let start = htmlString.indexOf('.gameContainer'); start != -1; start = htmlString.indexOf('.gameContainer', start + 1)) {
			const end = htmlString.indexOf('}', start);
			if (start >= 0 && end >= 0 && htmlString.substring(start, end).indexOf(top) >= 0) {
				const head = htmlString.substring(0, start);
				const tail = htmlString.substring(start).replace(/top:.*?;/, 'top:0;').replace(/bottom:.*?;/, 'bottom:0;');
				htmlString = head+tail;
				break;
			}
		}
	}
	
	if (standalone_HTML_String.length===0) {
		consolePrint("Can't export yet - still downloading html template.",true,null,null);
		return;
	}

	var htmlString = standalone_HTML_String.concat("");
	const title = state.metadata.title ? state.metadata.title : "PuzzleScript Next Game";

	var homepage = state.metadata.homepage ? state.metadata.homepage : "https://www.puzzlescript.net";
	if (!homepage.match(/^https?:\/\//))
		homepage = "https://" + homepage;		// todo: could do better URL validation here
	const homepage_stripped = escapeHtmlChars(homepage.replace(/^https?:\/\//,''));

	const background_color = ('background_color' in state.metadata) ? state.bgcolor : "black";
	htmlString = htmlString.replace(/___BGCOLOR___/g, background_color);	

	var text_color = ('text_color' in state.metadata) ? state.fgcolor : "lightblue";
	htmlString = htmlString.replace(/___TEXTCOLOR___/g, text_color);	

	htmlString = htmlString.replace(/__GAMETITLE__/g, escapeHtmlChars(title));
	htmlString = htmlString.replace(/__HOMEPAGE__/g, homepage);
	htmlString = htmlString.replace(/__HOMEPAGE_STRIPPED_PROTOCOL__/g, homepage_stripped);

	// idents targeted by export_options must not be quoted in order to survive minification
	if (exportOptions.includes('notitle'))
		removeDiv('class=title');
	if (exportOptions.includes('nofooter'))
		removeDiv('class=footer');
	if (exportOptions.includes('nopadding'))
		patchGameContainer('top:3');

	// $ has special meaning to JavaScript's String.replace 
	// c.f.	https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#specifying_a_string_as_a_parameter
	// basically: '$$'s are inserted as single '$'s.

	// First we double all strings - remember that replace interprets '$$' 
	// as a single'$', so we need to type four to double
	sourceCode = sourceCode.replace(/\$/g, '$$$$');

	// Then when we substitute them, the doubled $'s will be reduced to single ones.
	htmlString = htmlString.replace(/"__GAMEDAT__"/g, sourceCode);

	const filename = title.replace(/[<>:|*?]/g, '_').trim() + ".html";
	saveFile(htmlString, filename);
}
