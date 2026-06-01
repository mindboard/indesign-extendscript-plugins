//@target InDesign
// Build the "御三家ポケモン図鑑" document from Practice materials.
// NOTE: this source file is intentionally ASCII-only. All Japanese content is
// read from the UTF-8 source files at runtime to avoid encoding corruption.

var logs = [];
var console = {};
console.log = function(v){ $.writeln(v); logs.push(v); };

// ---------- helpers ----------
var read = function(path){
    var file = new File(path);
    file.encoding = 'UTF-8';
    if (file.open('r')) { var t = file.read(); file.close(); return t; }
    return '';
};

var trim = function(s){ return s.replace(/^\s+/, '').replace(/\s+$/, ''); };

var splitLines = function(s){ return s.split(/\r\n|\r|\n/); };

var _fontCache = {};
var findFont = function(ps){
    if (_fontCache[ps]) return _fontCache[ps];
    for (var i=0; i<app.fonts.length; i++){
        if (app.fonts[i].postscriptName === ps){ _fontCache[ps] = app.fonts[i]; return app.fonts[i]; }
    }
    return null;
};

var mkParaStyle = function(doc, name, props){
    var ps = doc.paragraphStyles.itemByName(name);
    if (!ps.isValid) ps = doc.paragraphStyles.add({ name: name });
    ps.properties = props;
    return ps;
};

// ---------- paths ----------
// DIR holds the source materials (text.md, table.csv, pokemon3x3.png) and receives the
// exported files. Defaults to the folder this script lives in; change it to point at
// your own materials/output folder.
var DIR    = File($.fileName).parent.fsName;
var MD     = DIR + '/text.md';
var CSV    = DIR + '/table.csv';
var IMG    = DIR + '/pokemon3x3.png';

// ---------- fonts ----------
var fBody  = findFont('HiraMinProN-W3');   // mincho, body
var fHead  = findFont('HiraKakuProN-W6');  // gothic bold, headings/title
console.log('font body=' + (fBody ? fBody.postscriptName : 'NULL') +
            ' head=' + (fHead ? fHead.postscriptName : 'NULL'));

// ---------- document ----------
var doc = app.documents.add({
    documentPreferences: { pageWidth:'297mm', pageHeight:'210mm', facingPages:false },
    cjkGridPreferences : { showAllLayoutGrids:false }
});
doc.viewPreferences.horizontalMeasurementUnits = MeasurementUnits.POINTS;
doc.viewPreferences.verticalMeasurementUnits   = MeasurementUnits.POINTS;

var page = doc.pages.item(0);
page.marginPreferences.properties = { top:'15mm', left:'15mm', bottom:'15mm', right:'15mm' };

// main 3-column text frame across the margin box
var tf = page.textFrames.add({ geometricBounds: ['15mm','15mm','195mm','282mm'] });
tf.textFramePreferences.properties = { textColumnCount: 3, textColumnGutter: '6mm' };

var colWidthMM = (282 - 15 - 2*6) / 3; // ~ 85mm

// ---------- paragraph styles ----------
var stTitle = mkParaStyle(doc, 'PK Title', {
    appliedFont: fHead, pointSize: 20, leading: 26, spaceAfter: 10,
    justification: Justification.LEFT_ALIGN,
    spanColumnType: SpanColumnTypeOptions.SPAN_COLUMNS
});
var stHead = mkParaStyle(doc, 'PK Heading', {
    appliedFont: fHead, pointSize: 12, leading: 17, spaceBefore: 9, spaceAfter: 4,
    justification: Justification.LEFT_ALIGN
});
var stBody = mkParaStyle(doc, 'PK Body', {
    appliedFont: fBody, pointSize: 9.5, leading: 15, spaceAfter: 5,
    justification: Justification.LEFT_JUSTIFIED, firstLineIndent: 9.5
});
var stCenter = mkParaStyle(doc, 'PK Object', {
    appliedFont: fBody, pointSize: 9.5, leading: 15, spaceBefore: 4, spaceAfter: 6,
    justification: Justification.CENTER_ALIGN
});

// ---------- parse markdown into paragraphs ----------
var lines = splitLines(read(MD));
var texts = [];
var types = [];
var h2count = 0;
for (var i=0; i<lines.length; i++){
    var line = trim(lines[i]);
    if (line === '') continue;
    if (line.indexOf('## ') === 0){
        h2count++;
        // inject image before the 3rd section, table before the 6th section
        if (h2count === 3){ texts.push(''); types.push('image'); }
        if (h2count === 6){ texts.push(''); types.push('table'); }
        texts.push(trim(line.substr(3))); types.push('h2');
    } else if (line.indexOf('# ') === 0){
        texts.push(trim(line.substr(2))); types.push('title');
    } else {
        texts.push(line); types.push('body');
    }
}

// fill story (each entry = one paragraph; empty entries are object placeholders)
tf.contents = texts.join('\r');
var story = tf.parentStory;
console.log('paragraphs: story=' + story.paragraphs.length + ' expected=' + texts.length);

// apply styles
for (var p=0; p<types.length; p++){
    var para = story.paragraphs[p];
    var t = types[p];
    if      (t === 'title') para.appliedParagraphStyle = stTitle;
    else if (t === 'h2')    para.appliedParagraphStyle = stHead;
    else if (t === 'image' || t === 'table') para.appliedParagraphStyle = stCenter;
    else                    para.appliedParagraphStyle = stBody;
}

// ---------- insert the image (anchored, inline) ----------
var imageIdx = -1, tableIdx = -1;
for (var k=0; k<types.length; k++){
    if (types[k] === 'image') imageIdx = k;
    if (types[k] === 'table') tableIdx = k;
}

if (imageIdx >= 0){
    var imgW = 80;                 // mm
    var imgH = 80 / (1408/768);    // keep aspect -> ~43.6mm
    var ip = story.paragraphs[imageIdx].insertionPoints[0];
    var frame = ip.textFrames.add();
    frame.geometricBounds = ['0mm','0mm', imgH+'mm', imgW+'mm'];
    frame.contentType = ContentType.graphicType;
    frame.place(File(IMG));
    frame.fit(FitOptions.PROPORTIONALLY);
    frame.fit(FitOptions.FRAME_TO_CONTENT);

    // Above Line anchoring: put the image on its own line so it does NOT overlap the
    // surrounding body text (an inline anchor would overflow the small line leading).
    var aos = frame.anchoredObjectSettings;
    aos.anchoredPosition    = AnchorPosition.ABOVE_LINE;
    aos.horizontalAlignment = HorizontalAlignment.CENTER_ALIGN;
    aos.anchorSpaceAbove    = 4;

    console.log('image placed (w=' + imgW + 'mm h=' + imgH.toFixed(1) + 'mm) ABOVE_LINE');
}

// ---------- insert the table (inline) from CSV ----------
if (tableIdx >= 0){
    var csvRows = splitLines(read(CSV));
    var data = [];
    for (var r=0; r<csvRows.length; r++){
        if (trim(csvRows[r]) === '') continue;
        data.push(csvRows[r].split(','));
    }
    var cols = data[0].length;
    var bodyRows = data.length - 1;

    var ipT = story.paragraphs[tableIdx].insertionPoints[0];
    var table = ipT.tables.add({
        headerRowCount: 1,
        bodyRowCount  : bodyRows,
        columnCount   : cols,
        width         : colWidthMM + 'mm'
    });

    // fill contents
    var header = table.rows.item(0);
    for (var c=0; c<cols; c++){ header.cells.item(c).contents = trim(data[0][c]); }
    for (var br=0; br<bodyRows; br++){
        var row = table.rows.item(br+1);
        for (var cc=0; cc<cols; cc++){ row.cells.item(cc).contents = trim(data[br+1][cc]); }
    }

    // base styling: every cell
    var allCells = table.cells;
    for (var ci=0; ci<allCells.length; ci++){
        var cell = allCells.item(ci);
        cell.properties = { topInset:1.5, bottomInset:1.5, leftInset:1.5, rightInset:1.5 };
        cell.texts[0].properties = { appliedFont: fBody, pointSize: 7, leading: 9, justification: Justification.LEFT_ALIGN };
    }
    // header row override
    header.fillColor = doc.colors.item('Black');
    header.fillTint  = 25;
    for (var hc=0; hc<cols; hc++){
        header.cells.item(hc).texts[0].properties = { appliedFont: fHead, pointSize: 7 };
    }
    console.log('table built: ' + cols + ' cols x ' + (bodyRows+1) + ' rows');
}

// ---------- overflow check ----------
console.log('frame overflows: ' + tf.overflows);

// ---------- save / export ----------
var results = [];
var tryExport = function(label, fn){
    try { fn(); results.push(label + ': OK'); }
    catch (e) { results.push(label + ': ERROR ' + e); }
};

tryExport('indd', function(){ doc.save(new File(DIR + '/pokemon.indd')); });
tryExport('idml', function(){ doc.exportFile(ExportFormat.INDESIGN_MARKUP, new File(DIR + '/pokemon.idml')); });
tryExport('pdf',  function(){ doc.exportFile(ExportFormat.PDF_TYPE, new File(DIR + '/pokemon.pdf')); });

app.pngExportPreferences.properties = {
    antiAlias: true, exportResolution: 96, pngColorSpace: PNGColorSpaceEnum.RGB,
    pngExportRange: PNGExportRangeEnum.EXPORT_ALL, pngQuality: PNGQualityEnum.MAXIMUM,
    transparentBackground: false
};
tryExport('png',  function(){ doc.exportFile(ExportFormat.PNG_FORMAT, new File(DIR + '/pokemon_preview.png')); });

console.log(results.join('\n'));
console.log('DONE');
logs.join('\n');
