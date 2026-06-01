//@target InDesign

var logs = [];
var console = {};
console.log = function(v){
    $.writeln(v);
    logs.push(v);
};

var doc = app.activeDocument;
var paragraphStyles = doc.paragraphStyles;
for(var i=0; i<paragraphStyles.length; i++){
    console.log(paragraphStyles[i].name);
}

logs.join('\n');
