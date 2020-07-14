let fs = require('fs');

//
//  1.  Read the content of the templates folder, so we can dynamically load 
//      all the templates.
//
let folders = fs.readdirSync('./assets/templates/');

//
//  2.  Will hold all the file contents for all the templates.
//
let templates = {};

//
//  3.  Loop over all the files in the folder and load all the templates.
//
folders.forEach(function(folder) {

    //
    //  1.  We want to deal only with folders, and skip this file that the
    //      the code is running in.
    //
    if(folder !== 'index.js' && folder !== '.DS_Store')
    {
        templates[folder] = {
            subject: fs.readFileSync('./assets/templates/' + folder + '/subject.hjs').toString(),
            text: fs.readFileSync('./assets/templates/' + folder + '/text.hjs').toString()
        }
    }

});

//
//  4.  Export all the templates.
//
module.exports = templates;