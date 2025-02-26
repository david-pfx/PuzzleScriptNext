// Main script for QUnit testing
// See https://qunitjs.com/intro/#browser-support
// Updated to v2.19.4

// start with ?moduleid=xxxx to suppress start up, wait for selection

var inputVals = {0 : "U",1: "L",2:"D",3:"R",4:"A",tick:"T",undo:" UNDO ",restart:" RESTART "};
const testLookup = {};
const limit = 10000;			// set this low while testing the testing
enableCheckErrors = false;

// Pre-configuration as documented does not work, but this way does
QUnit.config.autostart = true;		// gotta call start() but from where?
QUnit.config.reorder = false;
QUnit.config.testTimeout = 5000;
QUnit.config.collapse = false;
//QUnit.config.module = 'none';   // forced failure!
QUnit.config.fixture = '<span>zzzzzzzzzzzzzzzzzzz</span>';
//QUnit.config.showsource = false;
QUnit.config.urlConfig.push({
	id: "showsource",
	label: "Show source",
	tooltip: "Enabling this will show the source code, if needed."
});
QUnit.config.urlConfig.push({
	id: "errorsonly",
	label: "Show errors only",
	tooltip: "Enabling this will show errors but not warnings."
});

runRuleSuite('PS rules ⚖️', testdata);
runRuleSuite('PS+ rules ⚖️', plus_testdata);
runRuleSuite('PS> rules ⚖️', next_testdata);
runCompileSuite('PS compile 🐛', errormessage_testdata);
runCompileSuite('PS+ compile 🐛', plus_errormessage_testdata);

// cannot get this to work loading files directly, spent enough time
// see https://stackoverflow.com/questions/48969495/in-javascript-how-do-i-should-i-use-async-await-with-xmlhttprequest

runFileSuite('Demo files 📃', scripts_data);

//addStartLink();

// run tests that check for correct result in final level, seed and sound
function runRuleSuite(module, testDataList) {
	QUnit.module(module, () => {
	for (const [testName, testData] of testDataList.slice(0,limit)) 
		testRule(testName, testData);
	});
}

// run compiler tests that check for correct number and text of error messages
function runCompileSuite(module, testDataList) {
	QUnit.module(module, () => {
		for (const [testName, testData] of testDataList.slice(0,limit)) 
			testCompile(testName, testData);
	});
}

// Test that a list of files compile without error or warning
function runFileSuite(module, testdata) {
	QUnit.module(module, () => {
		testdata.forEach(f => {
			testCompile(f.name, [ f.text, [] ]);
		})
	});
}

function testRule(testName, testData) {
	const [tdCode, tdi, tdResult, tdl, tdSeed, tdSounds] = testData;
	const tdInput = tdi.map( j => inputVals[j] )
		.join('')
		.replaceAll(/([^t\s]{5})(?=[^\s])/gu, '$1 ')
		.replaceAll(/\s\s+/g, ' ');
	const tdLevel = tdl || 0;
	const tdDescription = lineof('Input', `<span style='white-space:pre-wrap;'>${tdInput}</span>`)
		+ (tdSeed ? lineof('Random seed', tdSeed) : '')
		+ lineof('Expected level', tdLevel) 
		+ (tdSounds ? lineof('Expected sounds', tdSounds) : '')
		+ '<br/>';
	const errstrings = QUnit.config.errorsonly ? errorStringsOnly : errorStrings;

	QUnit.test(
		testName,
		function(tdat) {
			return function() {
				testLookup[QUnit.config.current.testId] = testData;
				QUnit.assert.true(runTest(tdat),
					"Passed all tests"
				+ tdDescription
				+ (errstrings.length > 0 ? listify('Actual errors', errstrings) : '')
				+ (soundHistory.length > 0 ? lineof('Actual sounds', soundHistory.join()) : '')
				+ (QUnit.config.showsource ? lineof('Game source', `<pre>${tdCode}</pre>`) : ''));
			};
		}(testData)
	)
}

function testCompile(testName, testData) {
	const [tdCode, tdErrors] = testData;
	const errstrings = QUnit.config.errorsonly ? errorStringsOnly : errorStrings;
	//const testerrors = '<b>Expected errors:</b><ul>' + tdErrors.map(m => '<li>'+JSON.stringify(m)+'</li>').join('') + '</ul>';
	QUnit.test(
		testName,
		function(tdat) {
			return function() {
				testLookup[QUnit.config.current.testId] = testData;
				QUnit.assert.true(runCompilationTest(tdat),
					"Passed compile test<br/>"
					+ (tdErrors.length > 0 ? listify("Expected errors", tdErrors) : '')
					+ (errstrings.length > 0 ? listify('Actual errors', errstrings) : '')
					+ (QUnit.config.showsource ? lineof('Game source', `<pre>${tdCode}</pre>`) : ''));
			}
		}(testData)
	);
}

// QUnit callbacks

QUnit.begin(details => {
	// nice idea but DOM not built yet
	//addStartLink();
});

QUnit.testDone(details => {
	if (testLookup[details.testId]) {
		// see https://stackoverflow.com/questions/39281295/add-append-html-to-qunit-output-results-for-specific-tests
		const testRowSelector = "qunit-test-output-" + details.testId;
		const ele = document.getElementById(testRowSelector);
		// this element only appears if the test failed
		// if (!ele) console.log(`Cannot find selector ID ${testRowSelector}`);
		// else {
		if (ele) {
			const eleA = ele.querySelector('a');
			eleA.insertAdjacentHTML('afterend', `<a id="openClickLink-${details.testId}" href="javascript:void('Open in editor');">Open</a>`);
			document.getElementById(`openClickLink-${details.testId}`).addEventListener("click", function(e) {
				openInEditor(testLookup[details.testId][0]);
			});
		}

		// todo: from P:S
		// for (const [i, testdata_name] of this.testData[1].entries())
		// {
		// 	c = document.createElement( "a" );
		// 	c.innerHTML = testdata_name
		// 	c.href = "javascript:void('Copy "+testdata_name+"');"
		// 	c.addEventListener("click", () => this.copyTestData(i), false)
		// 	data_span.appendChild(c)
		// }
	}
});

// add a start link
function addStartLink() {
	const ele = document.getElementById("qunit-testrunner-toolbar");
	ele.querySelector('span').insertAdjacentHTML('afterend', `<a id="startLink" href="javascript:void('Start the run');">Start</a>`);
	document.getElementById(`startLink`).addEventListener("click", function(e) {
		QUnit.start();;
	});
}

// open the test program in the editor
function openInEditor(code) {
	// see https://stackoverflow.com/questions/1830347/quickest-way-to-pass-data-to-a-popup-window-i-created-using-window-open/76544014#76544014
	localStorage.setItem('test_code', code);
	window.open("/src/editor.html");
}

function lineof(t,s) {
	return `<br/><b>${t}: </b>${s}`;
}

function listify(label, s) {
	return `<b>${label}:</b><ul>` + s.map(m => '<li>' + JSON.stringify(stripHTMLTags(m)) + '</li>').join('') + '</ul>';
}

// read a text file and return results via callback
function getTextFile(filename, callback) {
	var req = new XMLHttpRequest();
	req.open('GET', filename);
	req.onload = event => {
		//console.log(`Onload: ${filename} status: ${req.status}`);
		callback(req.responseText);
	}
	req.onerror = event => {
		//console.log(`Onerror: ${filename} status: ${req.status}`);
		consoleError("HTTP Error "+ req.status + ' - ' + req.statusText);
		callback("");
	}
	req.send();
}

