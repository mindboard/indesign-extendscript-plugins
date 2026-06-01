//@target InDesign

var logs = [];
var console = {};
console.log = function(v){
    $.writeln(v);
    logs.push(v);
};

var doc = app.activeDocument;
var characterStyles = doc.characterStyles;
for(var i=0; i<characterStyles.length; i++){
    console.log(characterStyles[i].name);
}

logs.join('\n');
