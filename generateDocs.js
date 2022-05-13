const configFile = 'config.json';
const fs = require('fs');
const path = require('path')
const { exec } = require("child_process");
const { promisify } = require('util');
const { resolve } = require('path');
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

let config = [];


function init(){
	log('                                    Apex DocGen 1.0!\r\n',true,'green');

	
	var d = new Date();
	d.toLocaleString();  
	
	log('Started process at ' + d, false);
		
	loadConfig();
	
	importFilesFromJson();

	generateMarkdown(function(error, stdout, stderr){
		log(stdout);
		log('Generated Markdown files!');
		
		fixMarkdownLinks();
		
		generatePDFs();	

		generateFileJson();
	});
}

//loads the configuration data from the JSON file.
function loadConfig(){
	log('Loading Configs', true);
	
	const configJSON = fs.readFileSync(configFile, 'utf-8', function(err){
		log('Config file not found or unreadable. Skipping import' + err.message, true, 'yellow');

		if (err) throw err;
	});

	config = JSON.parse(configJSON);
	
	//create working directory if it doesn't exist
	if (!fs.existsSync(config.workingDir)){
		fs.mkdirSync(config.workingDir);
		log('Working folder not found. Creating',true,'yellow');	
	}	

	//create output directory if it doesn't exist
	if (!fs.existsSync(config.outputDir)){
		fs.mkdirSync(config.outputDir);
		log('Output folder not found. Creating',true,'yellow');	
	}	

	//create input directory if it doesn't exist
	if (!fs.existsSync(config.inputDir)){
		fs.mkdirSync(config.inputDir);
		log('Input folder not found. Will not be able to automatically read input files. Will default to reading from config.json files array instead if available',true,'yellow');		
	}	
}

//creates markdown files for all the files in the inputDir
function generateMarkdown(callback){

	log('Generating Markdown files', true);
	
	runCommand(`apexdocs-generate -s ${config.inputDir} -t ${config.workingDir}`,function(error, stdout, stderr){
		log('Markdown files generated successfully', true);
		callback(error, stdout, stderr);
	});
}

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

function importFilesFromJson(){

	log('Reading files for import from ' + configFile);

	try{
		if(!config.files || config.files.length == 0){
			log('No importable files found in file. Skipping import', true, 'yellow');
			return;
		}

		for(const fileName of config.files) {
			let filePath = config.source + '\\' + fileName;

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

function generatePDFs(){
	
	log('Generating PDF files!');
	let files = getFilesRecursively(config.workingDir);
	
	var numFiles = files.length;
	
	log('Found ' + numFiles + ' files to generate PDF for');
	
	generatePDF(0,files,function(success){
		log('PDf Generation Done');
		zipOutput();
	});
}

function generatePDF(fileIndex,files,callback){
	
	if(fileIndex > files.length) return null;
	const fileName = files[fileIndex];
	const fileExt = fileName.substring(fileName.lastIndexOf('.')+1, fileName.length) || fileName;
	
	if(fileExt == 'md'){	
		runCommand(`mdpdf ${fileName}` ,function(error, stdout, stderr){
			fileIndex++;
			log('Finished Generating PDF for: ' + fileName);	
			if(fileIndex < files.length) generatePDF(fileIndex,files,callback);
			else callback(true);
		});	
	}else{
		fileIndex++;
		if(fileIndex < files.length) generatePDF(fileIndex,files,callback);
		else callback(true);		
	}
}

function zipOutput(){
	log('Zipping files!');

	var date = new Date();
	var newdate= (date.getMonth() + 1) + '_' + date.getDate() + '_' +  date.getFullYear();
	
	let zipFileName = config.projectName + ' ' + newdate; 
	runCommand(`7z a "${config.outputDir}/${zipFileName}.zip" "${config.workingDir}/*" -r -tzip` ,function(error, stdout, stderr){
		log('Created Zip Archive!');
	});	
}

function fixMarkdownLinks(){
	log('Modifying Markdown to fix PDF links!');
	let filesToModify = getFilesRecursively(config.workingDir);
	
	for(const fileName of filesToModify){
		
		let fileContents = fs.readFileSync(fileName, 'utf-8', function(err){
			log('Unable to read file ' + fileName + '. Cannot adjust contents for PDF generation', true, 'yellow');
			if (err) throw err;
		});
				
		newFile = fileContents.replaceAll('.md','.pdf');
		newFile = newFile.replaceAll('](/','](./');
		
		fs.writeFileSync(fileName, newFile, function (err) {
			if (err) throw err;
			log('Error Updating links in markdown file to be PDF');
		});
			
		//within the files contents run the regular expression to find any links
		
		/*
		const regex = /### \[(.*?)\]\(.*?\)/gm
		const foundLinks = fileContents.match(regex);
		
		log(foundLinks);
		if(foundLinks && foundLinks.length > 0){
			log('Found ' + foundLinks.length + ' links to update to PDF targets');
			for(let linkTarget of foundLinks){
				log('Modifying link target!');
				linkTarget = linkTarget.replace('.md','.pdf');
			}
			
			fs.writeFileSync(fileName, fileContents, function (err) {
				if (err) throw err;
				log('Error Updating links in markdown file to be PDF');
			});		
		}*/			
	}
	
	log('Markdown files updated!');
}


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

function finish()
{
	log('Process completed',true,'yellow');
	log('\r\n\r\n------------------------------------------------ ', false);
	process.exit(1);	
}


function runCommand(command,callback)
{
	exec(command, (error, stdout, stderr) => {
		if (error) {
			log('error: ' + error.message,true,'red');
		}
		if(callback) callback(error, stdout, stderr);
	});	
}

function log(logItem,printToScreen,color)
{
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