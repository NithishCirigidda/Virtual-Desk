var container = ace.edit("editor");
container.setReadOnly(true);
container.getSession().setUseSoftTabs(true);
container.getSession().setTabSize(2);
var LatexMode = require("ace/mode/latex").Mode;
container.getSession().setMode(new LatexMode());
var defaultText =   "    "
container.setValue(defaultText);


