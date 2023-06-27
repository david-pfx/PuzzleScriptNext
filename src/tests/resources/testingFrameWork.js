// perform a single run test
var enableCheckErrors = false;

function runTest(dataarray) {
	unitTesting=true;
	errorStrings = [];
	errorCount=0;

	// Why???
	// for (var i=0;i<errorStrings.length;i++) {
	// 	var s = errorStrings[i];
	// 	throw s;
	// }

	var levelString = dataarray[0];  // accessed globally?
	const inputDat = dataarray[1];
	const targetLevel = dataarray[3] || 0;
	const randomSeed = dataarray[4] || null;
	const expectedSounds = dataarray[5] || null;

	if (!compile(["loadLevel",targetLevel],levelString,randomSeed))
		return null;		// there is only grief if we continue.

	while (againing) {
		againing=false;
		processInput(-1);			
	}
	
	for (const val of inputDat) {
		if (val==="undo") {
			DoUndo(false,true);
		} else if (val==="restart") {
			DoRestart();
		} else if (val==="tick") {
			processInput(-1);
		} else {
			processInput(val);
		}
		while (againing) {
			againing=false;
			processInput(-1);			
		}
	}

	unitTesting=false;

	const expectedLevel = dataarray[2];
	const actualLevel = convertLevelToString();
	let resultOk = actualLevel == expectedLevel;
	QUnit.assert.equal(actualLevel, expectedLevel, `Final level state as expected.`);

	if (expectedSounds) {
		const actualSounds = soundHistory.join();
		QUnit.assert.equal(actualSounds, expectedSounds, `Sounds output as expected.`);
		resultOk &&= actualSounds == expectedSounds;
	}

	if (enableCheckErrors) {
		QUnit.assert.true(errorCount == 0, `No errors during testing.`);
		resultOk &&= errorCount == 0;
	}

	return resultOk;
}


// perform a single compiler test
function runCompilationTest(dataarray) {
	unitTesting=true;
	const [ levelString, recordedErrorStrings, recordedErrorCount ] = dataarray;
	errorStrings = [];
	errorCount=0;

	try{
		compile(["restart"],levelString);
	} catch (error){
		console.log(error);
	}

	const strippedErrorStrings = errorStrings.map(stripHTMLTags);
	const simulated_summary = processErrors(strippedErrorStrings);
	const recorded_summary = processErrors(recordedErrorStrings);
	const errorsOk = simulated_summary == recorded_summary;
    QUnit.assert.equal(simulated_summary, recorded_summary, `Error strings as expected.`)
	return errorsOk;
}

function processErrors(errors) {
	return errors.map(e => e.replace(/\s+/g, ' ')).join("\n");
}