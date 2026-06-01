//@target InDesign

var logs = [];
var console = {};
console.log = function(v){
    $.writeln(v);
    logs.push(v);
};

var doc  = app.activeDocument;
var fonts = doc.fonts;
var len = fonts.length;
for(var i=0; i<len; i++){
    console.log(fonts[i].name);
}

logs.join('\n');
