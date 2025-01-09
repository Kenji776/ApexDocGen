# Apex DocGen

## Overview

**Apex DocGen** is a script designed to automate the generation of Markdown and HTML documentation for your Apex classes. By leveraging proper annotations in your code and integrating with the [ApexDocs NPM package](https://github.com/cesarParra/apexdocs#readme), this script streamlines the documentation process, making it easier to maintain and distribute.

### Features

- Automatically generates Markdown documentation from annotated Apex classes.
- Converts Markdown to HTML.
- Offers customizable themes for HTML output.
- Packages the output into a distributable ZIP file.
- Logs the entire process for debugging and auditing.

---

## How It Works

1. **Code Annotations**: The script uses annotations such as `@Description`, `@Param`, `@Return`, `@see`, `@group`, `@Author`, and `@date` to parse and generate documentation.
2. **Markdown Generation**: The `generateDocs.js` script scans the specified Apex classes to create Markdown files.
3. **HTML Conversion**: Markdown files are converted to HTML using `markdown-to-html`.
4. **Packaging**: The generated HTML files are compressed into a ZIP archive for distribution.

---

## Requirements

- **Node.js** (and **NPM**)
- **7zip** (installable using `setup.bat`)
- **ApexDoc** (installable using `setup.bat`)
- **markdown-to-html** (installable using `setup.bat`)

---

## Setup and Usage

### Installation

1. Run `setup.bat` to install all dependencies or manually install them by examining the `setup.bat` file.
2. Ensure 7zip is installed and either:
   - Update the path in `docGen.bat` to match your system's 7zip installation.
   - Add 7zip to your system's PATH variable.

### Configuration

1. **Input Directory**:
   - Copy your Apex classes into the `input` folder.
   - Alternatively, specify the files in `config.json` under the `files` property:
     ```json
     "files": ["file1.cls", "file2.cls", "file3.cls"]
     ```
   - If the `files` property is missing, the script will use the contents of the `input` folder.

2. **Source Directory**:
   - Update the `source` property in `config.json` to point to the folder containing your Apex classes. Use double backslashes (`\\`) for Windows paths.

3. **Theme Selection**:
   - Choose a default theme from the `themes` folder and set it in `config.json` under the `theme` property (e.g., `"theme": "default"`).

### Execution

1. Run the documentation generator:
   - Use `docGen.bat` or `node generateDocs.js`.
2. Verify the output:
   - Generated Markdown files will be located in the `markdown` folder.
   - HTML files will be located in the `html` folder.
   - A ZIP file containing the documentation will be created in the `output` folder.

---

## Notes

- **XML Requirement**: The associated XML files for your Apex classes must be included for documentation generation.

---

## Annotating Your Code

Ensure your Apex classes are properly annotated with the following tags:

| Annotation    | Description                                                              |
|---------------|--------------------------------------------------------------------------|
| `@Description`| Describes the purpose of the class, method, or variable.                 |
| `@Param`      | Documents a parameter, including its type and purpose.                  |
| `@Return`     | Describes the return value of a method.                                  |
| `@see`        | References related classes or methods.                                  |
| `@group`      | Groups related classes or methods under a common category.              |
| `@Author`     | Specifies the author of the code.                                        |
| `@date`       | Specifies the date the code was written or last modified.               |

---

## Example Configuration (`config.json`)

```json
{
  "projectName": "My Apex Project",
  "source": "C:\\path\\to\\source\\classes",
  "inputDir": "input",
  "workingDir": "working",
  "outputDir": "output",
  "theme": "default",
  "files": ["ExampleClass1.cls", "ExampleClass2.cls"],
  "defaultGroupName": "General"
}
