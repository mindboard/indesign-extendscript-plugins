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

var dir = Folder(currentDir().fullName + '/path/to/idml-folder/');
var targetFileList = dir.getFiles('*.idml');

for(var i=0; i<targetFileList.length; i++){
    var file = targetFileList[i];
    console.log(file);
}

logs.join('\n');
