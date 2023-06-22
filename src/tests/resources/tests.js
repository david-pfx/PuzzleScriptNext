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

// allow tests to be run over a range
const testfirst = 0;
const testhowmany = 9999;
const msgfirst = 0;
const msghowmany = 9999;

// run tests that check for correct result in final level, seed and sound
QUnit.module('PS execution', function() {
	for (var i = testfirst; i < testfirst + testhowmany && i < testdata.length; i++) {
		QUnit.test(
			testdata[i][0], 
			function(num){
				return function(){
					var td = testdata[num];
					var testcode = td[1][0];
					var testinput=td[1][1];
					var testresult=td[1][2];
					var targetlevel=td[1][3];
					var randomseed=td[1][4];
					var audiooutput=td[1][5];
					var input="";
					for (var j=0;j<testinput.length;j++) {
						if (j%5==0 && j>0) {
							input+=" ";
						}
						input += inputVals[testinput[j]];
					}
					var errormessage = `Test failed. Input: [${input}]` +
						`\n\ttargetlevel: ${targetlevel}` +
						(randomseed ? `\n\trandomseed: ${randomseed}` : '') +
						(audiooutput ? `\n\taudioinput : ${audiooutput.join(";")}` : '');
					if (QUnit.config.showsource) errormessage += "\n--- Source code ---\n" + testcode;
					QUnit.assert.true(runTest(td[1]),errormessage);
				};
			}(i)
		);
	}
});

// run compiler tests that check for correct number and text of error messages
// allow tests to be run over a range
QUnit.module('PS compiler', function () {
	// see https://stackoverflow.com/questions/39281295/add-append-html-to-qunit-output-results-for-specific-tests
	const appendages = [];
	const addTestAppendage = function(testName, testId){
		appendages [testId] = testName;
	};
	for (var i = msgfirst; i < msgfirst + msghowmany && i < errormessage_testdata.length; i++) {
		const testName = "🐛" + errormessage_testdata[i][0];
		QUnit.test(
			testName,
			//"🐛" + errormessage_testdata[i][0],
			function (num) {
				addTestAppendage(testName, QUnit.config.testId);
				return function () {
					var td = errormessage_testdata[num];
					var testcode = td[1][0];
					var testerrors = td[1][1];
					if (td[1].length !== 3) {
						throw "Error/Warning message testdata has wrong number of fields, invalid. Accidentally pasted in level recording data?" + "\n\n\n" + testcode;
					}
					var errormessage = `Desired errors : ${testerrors}`;
					//var errormessage =  testcode+"\n\n\ndesired errors : "+testerrors;
					if (QUnit.config.showsource) errormessage += `\n--- Source code ---\n <a href="fred/html>link</a>"`;
					//if (QUnit.config.showsource) errormessage += "\nSource code:\n" + testcode;
					QUnit.assert.true(runCompilationTest(td[1]), errormessage);
				};
			}(i)
		);

	}
	QUnit.testDone(function(details){
		if (typeof appendages[details.testId] !== 'undefined') {
			const testRowSelector = "qunit-test-output-" + details.testId;
			const ele = document.getElementById(testRowSelector);
			ele.insertAdjacentHTML('beforebegin', `<a href="fred/html">link</a>`);
			const x = ele;
	
			// var testRow = $(testRowSelector);
			// testRow.append("<button class=\"view\">View Graph</button>");
			// var viewButtonSelector = testRowSelector + " button.view";
			// $(viewButtonSelector).on('click', function(){
			// 	// do stuff given the test name
			// 	console.log(details.name);
			// });
		}
	});
});