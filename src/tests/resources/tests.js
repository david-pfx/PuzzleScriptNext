// Main script for QUnit testing
// See https://qunitjs.com/intro/#browser-support
// Updated to v2.19.4

var inputVals = {0 : "U",1: "L",2:"D",3:"R",4:"A",tick:"T",undo:" UNDO ",restart:" RESTART "};

// Pre-configuration as documented does not work, but this way does
QUnit.config.autostart = true;
QUnit.config.testTimeout = 5000;
QUnit.config.urlConfig.push({
		id: "showsource",
		label: "Show source",
		tooltip: "Enabling this will show the source code, if needed."
	});

QUnit.module('PS rules ⚖️');
testRuleList(testdata);
//testRuleList(testdata.slice(0, 10));

QUnit.module('PS compile 🐛');
testCompileList(errormessage_testdata);
//testCompileList(errormessage_testdata.slice(0, 10));

	
// run tests that check for correct result in final level, seed and sound
function testRuleList(testDataList) {
	for (const [testName, testData] of testDataList) {
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
			+ (QUnit.config.showsource ? lineof('Game', `<pre>${code}</pre>`) : '') // todo: does not work
			+ '<br/>';

		QUnit.test(
			testName,
			function(tdat) {
				return function() {
					QUnit.assert.true(runTest(tdat),
						((errorStrings.length > 0) ? listify(errorStrings) : '') + tdDescription);
				};
			}(testData)
		)
	}
}

// run compiler tests that check for correct number and text of error messages
function testCompileList(testDataList) {
	for (const [testName, testData] of testDataList) {
		const [tdCode, tdErrors] = testData;
		const testerrors = '<b>Expected errors:</b><ul>' + tdErrors.map(m => '<li>'+JSON.stringify(m)+'</li>').join('') + '</ul>';
		const tdDescription = (QUnit.config.showsource ? lineof('Game', `<pre>${code}</pre>`) : '');
		QUnit.test(
			testName,
			function(tdat) {
				return function() {
					QUnit.assert.true(runCompilationTest(tdat),
						testerrors 
					  + listify(errorStrings) 
					  + tdDescription);
				}
			}(testData)
		);
	}
}

function lineof(t,s) {
	return `<br/><b>${t}: </b>${s}`;
}

function listify(s) {
	return '<b>Got errors:</b><ul>' + s.map(m => '<li>' + JSON.stringify(stripHTMLTags(m)) + '</li>').join('') + '</ul>';
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