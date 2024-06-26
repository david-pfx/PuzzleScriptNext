function storage_has(key){
    const value = localStorage.getItem(key) != undefined;
    if (debugSwitch.includes('stor')) console.log(`Storage has key=${key} = ${value}.`);
    return value;
}

function storage_get(key){
    const value = localStorage.getItem(key);
    if (debugSwitch.includes('stor')) console.log(`Storage get key=${key} = "${value}".`);
    return value;
}

function storage_set(key, value){
    if (debugSwitch.includes('stor')) console.log(`Storage set key=${key} = "${value}".`);
    return localStorage.setItem(key,value);
}

function storage_remove(key){
    if (debugSwitch.includes('stor')) console.log(`Storage remove key=${key}.`);
    localStorage.removeItem(key);
}