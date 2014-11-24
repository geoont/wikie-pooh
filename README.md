# wikie-pooh

Downloader for some Wikipedia articles and related information

## Requirements

1.  Download and install node.js from http://nodejs.org/download/
2.  Checkout this repository:
```
git clone https://github.com/geoont/wikie-pooh.git
cd wikie-pooh
```
2.  Install dependencies (this command should be run from the top project directory that contains file ```package.json```): 
```
npm install
``` 
3.  Optional: run tests for some of the dependencies 
```
cd node_modules/nodemw/0.3.14/package
npm install vows
npm test
```
if any dependencies are missing simply install them with npm install.

## Usage

 * To see the content of a Wikipedia page run: ```node retrieve-page.njs zh 山``` (set language and page name accordingly).  
 * To retrieve a list of categories and relevant pages run: ```node retrieve-cats.njs en 0.cats``` where en is the language and 0.cats is a file with initial list of pages and categories.  This will produce a new file 1.cats (or higher number) with a list of pages and categories retrieved based on the original list.  All files are tab-delimited and can be opened in a spreadsheet.
  * output file can be edited to remove irrelevant entries which can be either commented out using # symbol or placed on the ignore list by entering dash (```-```) in into the first column
  * the list of ignored entries will be added to the end of output file 
 * To get edits stats run ```node retrieve-edit-stats.njs en 0.cats```.

## Developing

 * nodemw docs are here: https://github.com/macbre/nodemw
 * Wikipedia *Category*
  * lines at the end of the page are parsed out
  * general information: http://en.wikipedia.org/wiki/Help:Category .

### Tools

Created with [Nodeclipse](https://github.com/Nodeclipse/nodeclipse-1)
 ([Eclipse Marketplace](http://marketplace.eclipse.org/content/nodeclipse), [site](http://www.nodeclipse.org))

Nodeclipse is free open-source project that grows with your contributions.
