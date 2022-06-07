/**
*@Name Apex Docgen
*@Author Kenji776
*@Description script for automatically generating code documentation from apex classes. I realize it's not the best written thing and it ends up in callback hell a little bit but since its a totally
* linear script and the nesting doesn't go too deep I think its ok for now. Should refactor with promises later.
*/
const configFile = 'config.json';
const fs = require('fs');
const path = require('path')
const { exec } = require("child_process");
const { promisify } = require('util');
const { resolve } = require('path');
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

let config = [];


async function init(){
	log('                                    Apex DocGen 2.0!\r\n',true,'green');

	
	var d = new Date();
	d.toLocaleString();  
	
	log('Started process at ' + d, false);
	log('In the process hangs during PDF or markdown generation make sure you do not have copies of those files open from your previous run!');
	loadConfig(configFile);
	
	importFilesFromJson(config.source,config.files);

	//create our markdown files from the apex classes.
	generateMarkdown(function(error, stdout, stderr){
		log(stdout);
		log('Generated Markdown files!');
		
				
		generateHTML(config.workingDir+'\\markdown', function(complete){
			console.log('Markdown to HTML Complete');
			
			copyRecursiveSync(config.workingDir+'\\markdown',config.workingDir+'\\html');
			
			removeFilesOfTypeFromFolderTree(getFilesRecursively(config.workingDir+'\\html'),['md'],function(){
				log('Finished cleaning up markdown files from HTML folder');
			});		

			removeFilesOfTypeFromFolderTree(getFilesRecursively(config.workingDir+'\\markdown'),['html'],function(){
				log('Finished cleaning up HTML files from markdown folder');
			});	
			
			fixHtml(config.workingDir+'\\html','.md','.html');
			
			//create the zip file name
			var date = new Date();
			var newdate= (date.getMonth() + 1) + '_' + date.getDate() + '_' +  date.getFullYear();
			let zipFileName = config.projectName + ' ' + newdate; 
	
			//create the zip file.
			zipOutput(config.workingDir, config.outputDir, zipFileName);
			
			generateFileJson();
		});
	});
}

//loads the configuration data from the JSON file.
function loadConfig(configFileName){
	log('Loading Configs', true);
	
	const configJSON = fs.readFileSync(configFileName, 'utf-8', function(err){
		log('Config file not found or unreadable. Skipping import' + err.message, true, 'yellow');

		if (err) throw err;
	});

	config = JSON.parse(configJSON);
	
	//create needed directories
	if (!fs.existsSync(config.workingDir)) fs.mkdirSync(config.workingDir);		
	if (!fs.existsSync(config.workingDir+'/markdown')) fs.mkdirSync(config.workingDir+'/markdown');	
	if (!fs.existsSync(config.workingDir+'/html')) fs.mkdirSync(config.workingDir+'/html');		
	if (!fs.existsSync(config.outputDir)) fs.mkdirSync(config.outputDir);
	fs.copyFileSync(`themes\\${config.theme+'.css'}`, config.workingDir+'\\html\\styles.css');

	//create input directory if it doesn't exist
	if (!fs.existsSync(config.inputDir)){
		fs.mkdirSync(config.inputDir);
		log('Input folder not found. Will not be able to automatically read input files. Will default to reading from config.json files array instead if available',true,'yellow');		
	}	
}

//creates markdown files for all the files in the inputDir
function generateMarkdown(callback){

	log('Generating Markdown files', true);
	
	runCommand(`apexdocs-generate -s ${config.inputDir} -t ${config.workingDir}\\markdown\\ -r --scope public global namespaceaccessible -g ${config.markdownGenerator}`,function(error, stdout, stderr){
		log('Markdown files generated successfully', true);
		callback(error, stdout, stderr);
	});
}



/**
* @Description Reads all the files in the local input folder and writes them into the config json.
*/
function generateFileJson(){
	const filesArray = fs.readdirSync(config.inputDir);

	if(filesArray.length == 0){
		log('No files found in input directory. Not generating import JSON file.', true, 'yellow');
		return;
	}

	config.files = filesArray;
	
	fs.writeFileSync(configFile, JSON.stringify(config, null, 5), function (err) {
		if (err) throw err;

		log('Wrote Import JSON Files File ('+configFile+')');
	});	
}

/**
* @Description Reads all the given files from the source folder into the local input folder.
* @Param sourceFolder the full path on the system to read files from
* @Param files the names of all the files to copy
*/
function importFilesFromJson(sourceFolder, files){

	log('Reading files for import from ' + configFile);

	try{
		if(!config.files || config.files.length == 0){
			log('No importable files found in file. Skipping import', true, 'yellow');
			return;
		}

		for(const fileName of files) {
			let filePath = sourceFolder + '\\' + fileName;

			log('Copying ' + filePath);
			try{
				fs.copyFileSync(filePath, config.inputDir+'\\'+fileName);
				log('File copied!',true)
			}
			catch(ex){
				log('Could not copy file ' + filePath + ' to ' + config.inputDir +'. ' + ex.message, true, 'red');
			}
		}
	}catch(ex){
		console.log('Unable to copy files from ' + configFile);
		console.log(ex);
	}
}


/**
* @Description Generates HTML files for all markdown files in the given folder.
* @Param directory the folder to find markdown files in.
* @Param callback function to call when all processing is complete
* @Return void. Use callback instead.
*/
function generateHTML(directory, callback){
	
	log('Generating HTML files!');
	let files = getFilesRecursively(directory);
	
	var numFiles = files.length;
	
	log('Found ' + numFiles + ' files to generate PDF for');
	
	convertMarkdownToHtml(files,function(success){
		log('HTML Generation Done');
		if(callback) callback(true);
	});
}
/**
* @Description Generates HTML files from all given markdown files.
* @Param files list of all files to potentially generate HTML from 
* @Param callback function to call when all processing is complete
* @Param fileIndex internal tracking for what file to evaluate. Do not set.
* @Return void. Use callback instead.
*/
function convertMarkdownToHtml(files,callback,fileIndex){
	
	if(!fileIndex) fileIndex = 0;
	if(fileIndex > files.length) {
		callback(null);
	}
	
	else{
		const fileName = files[fileIndex];
		const fileNameParts = fileName.split('.');
		const fileNameNoExt = fileNameParts[0];
		const fileExt = fileNameParts[1];
		
	
		if(fileExt == 'md'){	
		
			runCommand(`markdown ${fileName} >${fileNameNoExt}.html --flavor markdown --highlight true --stylesheet styles.css` ,function(error, stdout, stderr){
				fileIndex++;
				if(fileIndex < files.length) convertMarkdownToHtml(files,callback,fileIndex);
				else callback(true);
			});	
		}else{
			fileIndex++;
			if(fileIndex < files.length) convertMarkdownToHtml(files,callback,fileIndex);
			else callback(true);		
		}
	}
}


/**
* @Description Generates PDF files for all markdown files in the given folder.
* @Param directory the folder to find markdown files in.
* @Param callback function to call when all processing is complete
* @Return void. Use callback instead.
*/
function generatePDFs(directory, callback){
	
	log('Generating PDF files!');
	let files = getFilesRecursively(directory);
	
	var numFiles = files.length;
	
	log('Found ' + numFiles + ' files to generate PDF for');
	
	generatePDF(files,function(success){
		log('PDf Generation Done');
		if(callback) callback(true);
	});
}


/**
* @Description removes all files from the system with any of the given types 
* @Param files an array of file paths to evaluate
* @Param fileTypes an array of file types to delete. You do not need to include the . in the names
* @Param callback functions to call when all operations are completed.
* @Param fileIndex internal tracking for what file to evaluate. Do not set.
* @Return void. Use callback instead.
*/
function removeFilesOfTypeFromFolderTree(files,fileTypes,callback,fileIndex,){
	if(!fileIndex) fileIndex = 0;
	if(fileIndex > files.length) return null;
	const fileName = files[fileIndex];
	const fileExt = fileName.substring(fileName.lastIndexOf('.')+1, fileName.length) || fileName;
	if(fileTypes.includes(fileExt)) fs.unlinkSync(fileName);
	fileIndex++;
	if(fileIndex < files.length) removeFilesOfTypeFromFolderTree(files,fileTypes,callback,fileIndex);
	else if(callback) callback(true);		

}

/**
* @Description zips all the files in the working directory and saves the result to the output directory.
*/
function zipOutput(sourceDirectory,targetDirectory,fileName){
	log('Zipping files!');

	runCommand(`7z a "${targetDirectory}/${fileName}.zip" "${sourceDirectory}/*" -r -tzip` ,function(error, stdout, stderr){
		log('Created Zip Archive!');
	});	
}

/**
* @Description modifies all the markdown files in the markdown folder to fix the links
*/
function fixHtml(directory, sourceType, targetType){
	let filesToModify = getFilesRecursively(directory);
	
	log('Changing ' + sourceType + ' link targets to ' + targetType + ' in folder ' + directory);
		
	for(const fileName of filesToModify){
		
		log('Processing links in file: ' + fileName);
		let fileContents = fs.readFileSync(fileName, 'utf-8', function(err){
			log('Unable to read file ' + fileName, true, 'yellow');
			if (err) throw err;
		});
				
		newFile = fileContents.replaceAll(sourceType,targetType);
		newFile = newFile.replaceAll('<body>','<body><link rel="stylesheet" type="text/css" href="../styles.css" id="_theme"><div id="_html" class="markdown-body">');
		newFile = newFile.replaceAll('</body>','</div></body>')
		newFile = newFile.replaceAll('<h2 id="layout-default">layout: default</h2>','');
		newFile = newFile.replaceAll('href="/','href="');
		newFile = newFile.replaceAll('|Param|Description|','Param ');
		newFile = newFile.replaceAll('|---|---|','');

		newFile = unescapeHTML(newFile);
		//fix reference to stylesheet.
		//if(fileName != 'docs\\html\\index.html') newFile = newFile.replaceAll('styles.css','../styles.css');

	
		fs.writeFileSync(fileName, newFile, function (err) {
			if (err) throw err;
			log('Error Updating links in markdown file to be PDF');
		});
			
				
	}	
	log('Links fixed');
}
function unescapeHTML(escapedHTML) {
  return escapedHTML.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
}

/**
* @Description Copies an entire folder and all its contents to a new destination.
* @Param src Source to copy from
* @Param dest destination to copy all files to.
*/
function copyRecursiveSync(src, dest) {
  var exists = fs.existsSync(src);
  var stats = exists && fs.statSync(src);
  var isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    if(!fs.existsSync(dest)) fs.mkdirSync(dest);
    fs.readdirSync(src).forEach(function(childItemName) {
      copyRecursiveSync(path.join(src, childItemName),
                        path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
};

/**
* @Description Gets all files from a directory tree recursively.
* @Param directory the root directory to look for files in
* @Param files internal variable passed to each call of itself. Do not set, or set to empty array.
* @Return an array of complete file paths for all files in the directory.
*/
function getFilesRecursively(directory,files) {
	if(!files) files = [];
    fs.readdirSync(directory).forEach(File => {
        const absolute = path.join(directory, File);
        if (fs.statSync(absolute).isDirectory()) return getFilesRecursively(absolute,files);
        else {
			
			files.push(absolute);
		}
    });
	return files;
}

/**
* @Description Runs on complete. Makes final log entry and exits process.
*/
function finish(){
	log('Process completed',true,'yellow');
	log('\r\n\r\n------------------------------------------------ ', false);
	process.exit(1);	
}

/**
* @Description Executes a child process on the OS
* @Param command a command string to pass into the system shell
* @Param callback function to call when all processing is complete
* @Return void. Use callback instead.
*/
function runCommand(command,callback){
	log('Running command: ' + command);
	exec(command, (error, stdout, stderr) => {
		if (error) {
			log('error: ' + error.message,true,'red');
		}
		if(callback) callback(error, stdout, stderr);
	});	
}

/**
* @Description Creates a log entry to the log file and optionally the screen
* @Param logItem the value to log
* @Param printToScreen boolean flag of whether to show the log item in the console or not.
* @Param color optional string that indicates what color to print the text to the screen in. Options are red, green, yellow.
* @Return void. Use callback instead.
*/
function log(logItem,printToScreen,color){
	printToScreen = printToScreen != null ? printToScreen : true;
	var colorCode='';
	switch(color) {
		case 'red':
			colorCode='\x1b[31m'
		break;
		case 'green':
			colorCode='\x1b[32m';
		break;
		case 'yellow':
			colorCode='\x1b[33m';
	}
	
	if(printToScreen) console.log(colorCode+''+logItem+'\x1b[0m');
	
	fs.appendFile('log.txt', logItem + '\r\n', function (err) {
		if (err) throw err;
	});	
	
	
}
process.on('uncaughtException', (err) => {
    log(err,true,'red');
    process.exit(1) //mandatory (as per the Node docs)
})

init();