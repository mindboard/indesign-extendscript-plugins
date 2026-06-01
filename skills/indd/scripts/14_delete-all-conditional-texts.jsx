//@target InDesign

var logs = [];
var console = {};
console.log = function(v){
    $.writeln(v);
    logs.push(v);
};

var doc = app.activeDocument;
if (doc!=null) {
    // delete all conditional texts
    doc.conditions.everyItem().remove();
}

console.log('OK');
logs.join('\n');
