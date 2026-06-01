//@target InDesign

var logs = [];
var console = {};
console.log = function(v){
    $.writeln(v);
    logs.push(v);
};

var selection = app.activeDocument.selection;
console.log(selection);

for(var v in selection){
    console.log(v);
}

logs.join('\n');
