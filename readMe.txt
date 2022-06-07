What is this?

This is a small script that will help you automatically generate markdown and html documentation for your Apex classes.

How does it work?

Under the hood this script primarily uses the ApexDocs NPM package (https://github.com/cesarParra/apexdocs#readme). When you have properly commented your code using annotations such as
@Description, @Param, @Return, @see, @group, @Author, and @date tags these can be automatically parsed to generate documentation.

When you run the generateDocs.js script it will attempt to copy the Apex classes you've specified (either by manually putting them into the input directory or specifying them by name in the files property in the config.json file). Once it has done that it will use the ApexDoc library to scan your files and automatically generate markdown files from them. Once it has generates the markdown files it uses markdown-to-html to create HTML files out of them. After the HTML files are generated 7zip runs to compress them all into an easily distributable package.

Requirments:
- NPM
- NodeJs
- 7Zip (installable using setup.bat)
- ApexDoc (installable using setup.bat)
- markdown-to-html (installable using setup.bat)

To use

1) Run setup.bat (or manually install required NPM packages. See contents of setup.bat to view npm install commands.)
2) If needed change the location of the 7zip location in the docGen.bat file to the path where 7zip is currently installed. Or add 7zip to your systems path variable so it can be called from anywhere if it isn't already.
3) Either copy your Apex classes into the input folder, or list them in the config.json (ex ["file1.cls","file2.cls","file3.cls"] ).
4) Modify the source property of the config.json file to point to the source location your apex classes live so it can grab the newest versions every time you run the docGen. Separate folder names with two slashes (at least on windows machines, I'm unsure about other OS).
5) Optionally choose your default theme for the generated HTML files from the provided css files in the themes folder and set the "theme" property in the config to that filename (do not include file extension).
6) Run docGen.bat (or run "node generateDocs.js").
7) Witness glorious document generating goodness.