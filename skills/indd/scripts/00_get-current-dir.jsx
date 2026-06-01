//@target InDesign

var logs = [];
var console = {};
console.log = function(v){
    $.writeln(v);
    logs.push(v);
};

var currentDir = function(){
    return File($.fileName).parent;
};

console.log(currentDir().fullName);

logs.join('\n');
