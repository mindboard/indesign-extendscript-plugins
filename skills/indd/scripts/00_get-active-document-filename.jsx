//@target InDesign

var logs = [];
var console = {};
console.log = function(v){
    $.writeln(v);
    logs.push(v);
};

var doc = app.activeDocument;
var path = doc.filePath;
var fullName = doc.fullName;
var fileName = (''+fullName).substr( (''+path).length+1);

console.log(fileName);
logs.join('\n');
