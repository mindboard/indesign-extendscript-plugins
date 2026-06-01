//@target InDesign

var logs = [];
var console = {};
console.log = function(v){
    $.writeln(v);
    logs.push(v);
};

var eachPage = function(doc,func){ for(var i=0; i<doc.pages.length; i++){ func(doc.pages.item(i)); } };
var eachPageItem = function(page,func){ for(var i=0; i<page.allPageItems.length; i++){ func(page.allPageItems[i]); } };

var createDocument = function(){
    var doc = app.documents.add();
    var page = doc.pages.item(0);
    var textFrame = page.textFrames.add();
    textFrame.geometricBounds = ["20mm","20mm","40mm","110mm"];
    textFrame.contents = 'Hello, World!';
    return doc;
}    

var doc = createDocument();

eachPage( doc, function(page){
    eachPageItem(page,function(pageItem){
        var className = pageItem.constructor.name;
        if (className==='TextFrame'){
            console.log('pageItem : ' + className);

            var texts = pageItem.texts;
            for(var i=0; i<texts.length; i++){
                var text = texts[i];
                console.log('text : ' + text);
                console.log('text.pointSize : ' + text.pointSize);
                console.log('text.leading : ' + text.leading);
                console.log('text.fillTint : ' + text.fillTint);
                console.log('text.fontStyle : ' + text.fontStyle);
            }
        }
    });
} );

doc.close(SaveOptions.no);

console.log('OK');
logs.join('\n');
