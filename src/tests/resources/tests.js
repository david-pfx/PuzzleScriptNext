// Main script for QUnit testing
// See https://qunitjs.com/intro/#browser-support
// Updated to v2.19.4

var inputVals = {0 : "U",1: "L",2:"D",3:"R",4:"A",tick:"T",undo:" UNDO ",restart:" RESTART "};
const testLookup = {};
const limit = 10000;

// Pre-configuration as documented does not work, but this way does
QUnit.config.autostart = true;
QUnit.config.testTimeout = 5000;
//QUnit.config.showsource = false;
QUnit.config.urlConfig.push({
	id: "showsource",
	label: "Show source",
	tooltip: "Enabling this will show the source code, if needed."
});

runRuleSuite('PS rules ⚖️', testdata);
runCompileSuite('PS compile 🐛', errormessage_testdata);
runFileSuite('Demo files 📃', 'demo_list.txt');

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
function runFileSuite(title, filename) {
	QUnit.module(title, () => {
		getTextFile(filename, files => files.split('\n')
			.map(f => f.trim())
			.filter(f => !['README', 'blank.txt'].includes(f))
			.slice(0, limit)
			.forEach(f => {
				getTextFile(`../demo/${f}`, text => {
					testCompile(f, [text, []]);
				});
			})
		);
	});
}

function testRule(testName, testData) {
	const [tdCode, tdi, tdResult, tdl, tdSeed, tdAudio] = testData;
	const tdInput = tdi.map( j => inputVals[j] )
		.join('')
		.replaceAll(/([^t\s]{5})(?=[^\s])/gu, '$1 ')
		.replaceAll(/\s\s+/g, ' ');
	const tdLevel = tdl || 0;
	const tdDescription = lineof('Level', tdLevel) 
		+ lineof('Input', `<span style='white-space:pre-wrap;'>${tdInput}</span>`)
		+ (tdSeed ? lineof('Random seed', tdSeed) : '')
		+ (tdAudio ? lineof('Audio input', tdAudio) : '')
		+ '<br/>';

	QUnit.test(
		testName,
		function(tdat) {
			return function() {
				testLookup[QUnit.config.current.testId] = testData;
				QUnit.assert.true(runTest(tdat),
					"Passed all tests"
				+ tdDescription
				+ (errorStrings.length > 0 ? listify('Errors', errorStrings) : '') 
				+ (QUnit.config.showsource ? lineof('Game', `<pre>${tdCode}</pre>`) : ''));
			};
		}(testData)
	)
}

function testCompile(testName, testData) {
	const [tdCode, tdErrors] = testData;
	//const testerrors = '<b>Expected errors:</b><ul>' + tdErrors.map(m => '<li>'+JSON.stringify(m)+'</li>').join('') + '</ul>';
	QUnit.test(
		testName,
		function(tdat) {
			return function() {
				testLookup[QUnit.config.current.testId] = testData;
				QUnit.assert.true(runCompilationTest(tdat),
					"Passed compile test<br/>"
					+ (tdErrors.length > 0 ? listify("Expected", tdErrors) : '')
					+ (errorStrings.length > 0 ? listify('Errors', errorStrings) : '')
					+ (QUnit.config.showsource ? lineof('Game', `<pre>${tdCode}</pre>`) : ''));
			}
		}(testData)
	);
}

QUnit.testDone(function(details){
	if (typeof testLookup[details.testId] !== 'undefined') {
		const testRowSelector = "qunit-test-output-" + details.testId;
		const ele = document.getElementById(testRowSelector);
		const eleA = ele.querySelector('a');
		eleA.insertAdjacentHTML('afterend', `<a id="openClickLink-${details.testId}" href="javascript:void('Open in editor');">Open</a>`);
		document.getElementById(`openClickLink-${details.testId}`).addEventListener("click", function(e) {
			openInEditor(testLookup[details.testId][0]);
		});

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
	return `<b>Got ${label}:</b><ul>` + s.map(m => '<li>' + JSON.stringify(stripHTMLTags(m)) + '</li>').join('') + '</ul>';
}

// read a text file and return results via callback
function getTextFile(filename, callback) {
	var req = new XMLHttpRequest();
	req.open('GET', filename);
	req.onreadystatechange = function () {
		if (req.readyState == 4) {
			if (req.status == 200 || req.status == 201) {
				callback(req.responseText);
			} else {
				consoleError("HTTP Error "+ req.status + ' - ' + req.statusText);
				callback("");
			}
		}
	}
	req.send();
}

// todo:
// 	// see https://stackoverflow.com/questions/39281295/add-append-html-to-qunit-output-results-for-specific-tests
// 	const appendages = [];
// 	const addTestAppendage = function(testName, testId){
// 		appendages [testId] = testName;
// 	};
// 	for (var i = msgfirst; i < msgfirst + msghowmany && i < errormessage_testdata.length; i++) {
// 		const testName = "🐛" + errormessage_testdata[i][0];
// 		QUnit.test(
// 			testName,
// 			//"🐛" + errormessage_testdata[i][0],
// 			function (num) {
// 				addTestAppendage(testName, QUnit.config.testId);
// 				return function () {
// 					var td = errormessage_testdata[num];
// 					var testcode = td[1][0];
// 					var testerrors = td[1][1];
// 					if (td[1].length !== 3) {
// 						throw "Error/Warning message testdata has wrong number of fields, invalid. Accidentally pasted in level recording data?" + "\n\n\n" + testcode;
// 					}
// 					var errormessage = `Desired errors : ${testerrors}`;
// 					//var errormessage =  testcode+"\n\n\ndesired errors : "+testerrors;
// 					if (QUnit.config.showsource) errormessage += `\n--- Source code ---\n <a href="fred/html>link</a>"`;
// 					//if (QUnit.config.showsource) errormessage += "\nSource code:\n" + testcode;
// 					QUnit.assert.true(runCompilationTest(td[1]), errormessage);
// 				};
// 			}(i)
// 		);

// 	}
// 	QUnit.testDone(function(details){
// 		if (typeof appendages[details.testId] !== 'undefined') {
// 			const testRowSelector = "qunit-test-output-" + details.testId;
// 			const ele = document.getElementById(testRowSelector);
// 			ele.insertAdjacentHTML('beforebegin', `<a href="fred/html">link</a>`);
// 			const x = ele;
	
// 			// var testRow = $(testRowSelector);
// 			// testRow.append("<button class=\"view\">View Graph</button>");
// 			// var viewButtonSelector = testRowSelector + " button.view";
// 			// $(viewButtonSelector).on('click', function(){
// 			// 	// do stuff given the test name
// 			// 	console.log(details.name);
// 			// });
// 		}
// 	});
// });