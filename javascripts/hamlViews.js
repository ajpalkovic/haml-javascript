/**
 * This file is part of haml-javascript.
 * 
 * haml-javascript is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * haml-javascript is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with haml-javascript.  If not, see <http://www.gnu.org/licenses/>.
 */
 
/**
 * HamlViews are a way to specify html using javascript and the haml syntax.
 * The constructor takes a string representing the contents of the view, and a name for the view.
 * The only public method is render, which takes an object.
 * Each of the instance variables in the object passed to render will be available in the view as normal variables.
 *     Importantly, this means that any variable used in the view must be passed in by that object, or an undefined variable error will be thrown.
 *     To compensate for this, there is a syntax to define the initial value of each variable: @{variable1: value, variable2: value}
 *     This must appear on the first line of the file.
 *
 * The full syntax is not yet supported.
 *    There is no support for multiline comments, but single line comments are supported.
 *    No ignoring whitespace.
 *     
 * There are small deviations from the ruby haml syntax.
 *     This version does not accept ruby style hashes as tag options, only javascript objects.  Moreover, IE will crap out if you try to pass class as a key in an object.  So, there are three options if you need to pass a css class as an option in the javascript attributes object.  First, you can set the key to clas instead of class ie {clas: 'someClass'}.  It will be fixed at render time.  Second, you can set the key to class, immediately followed by a colon, ie {class: 'someClass'}.  It will be rewritten to {clas: 'someClass'} at compile time.  Finally, you can set the key to class in quotes, ie {'class': 'someClass'}.
 *     Javascript code must be used in place of ruby code, obviously.
 *     for, if, while, and else statements do not require curly brackets, the compiler will add them if the last character of the line is not a curly bracket.  This also means that multi-line if conditionals are not supportted.
 *     There are two types of custom for loops:
 *         - for c in 0..10 is a slightly more elegant way of specifying: for(var c = 0; c < 10; c++) {}
 *         - for item in items using c is a more elegant way of iterating over the items in an array by using a numerical index rather than the javascript for..in loop which includes prototype modifications.  The variable c will be the index of the current item.  It is an optional component.
 * TODO:
 *     support multiline comments
 *     fix error support
 *     support escaping
 *     remove parentheses dependency
 */
var HamlView = (function ($) {
    var undefined, options = {
        xhtml: true
    };
    var haml = function(name, view) {
        this.compiledView = null;
        this.name = name;
        this.view = view;
    };
    
    $.extend(haml, {
        //these are the terminal characters that indicate when the parser should stop because a token has been found
        //essentially, when the parser hits one of these, it processes all the text from the previous stopCharacter to the current one
        stopCharacters: {'.': true, '#': true, '%': true, '{': true, ' ': true, '=': true, '(': true, '/': true},
        multilineStopCharacters: {'.': true, '#': true, '%': true, '{': true, ' ': true, '=': true, '-': true, '(': true},
        autoAddParenthesesTerminals: ['if', /else\s+if/, 'for', 'while', 'switch'],
        
        //strings representing the different types of compiled javascript
        stringTemplate: ['__o.push("', '");'],
        codeOutputTemplate: ['__o.push(', ');'],
        tagTemplate: ['__this.makeTag(', ');'],
        
        //a regular expression for matching occurances of #{expression}
        interpolationRegex: /(^|.|\r|\n)(#\{(.*?)\})/,
        
        //the tags that should be autoclosed ie <br />
        autocloseTags: {'img': true, 'br': true, 'hr': true, 'input': true, 'meta': true, 'link': true}
    });
    
    haml.prototype = {    
        /**
         * The compiler processes one line at a time.
         * The compiled code is stored in an array called this.compiledView, which is joined together to form a string of executable code.
         * All the compiled code does is push strings onto a new output buffer.  For instance the line "%strong= 1+2" is translated to output.push('<strong>');output.push(1+2);output.push("</strong>"); (sort of)
         * Closing tags are stored on a stack.  Each time a line is processed, the indentation of the line is calculated.  The stack is then cleared up to that level.
         * For speed, a 'string buffer' is used, so that multiple static strings, such as three closing tags in a row, can be added in a single operation, rather than in three steps
         */
        compile: function(force) {
            //only compile the view once
            if(this.compiledView !== null && !force) {
                return;
            }
            
            this.errors = [];
            
            var lines = this.lines = this.splitLines(this.view);
            
            this.lineIndex = 0;
            this.linesLength = lines.length;
            var c, cur, characters, currentTag, endIndex, lineLength;
            //the number of spaces that were used for indentation
            var whitespaceOffset = 0;
            
            this.stack = [];
            this.compiledView = [];
            this.stringBuffer = [];
            
            //each foreach loop needs a unique number for storing its variables so they do not conflict if there are nested loops
            this.forEachIndex = 0;
            //some tags like <br /> should not permit text to be nested in them
            this.canIndent = false;
            //store the indentation of the previous so that one cannot indent more than one level at a time
            this.previousIndentation = 0;
            //determine the type of indentation in the document, such as two spaces or a tab
            this.indentation = this.determineIndentation(lines);
            //a string for storing a json object containg default variable values so that if a variable is not passed in, the view does not fail
            this.defaults = '';
            
            for(; this.lineIndex < this.linesLength && this.errors.length === 0; this.lineIndex++) {
                line = lines[this.lineIndex];
                if(line.trim().length === 0) {
                    continue;
                }
                //turn the line into a character array
                characters = line.split("");
                whitespaceOffset = this.processWhitespace(characters);
                lineLength = characters.length;
                
                //if a tag has a class and id, we cannot immediately add it to the compiled view array, so each bit of information is stored here
                currentTag = this.resetTag();
                //reset this each line.  if multiple lines are indented when they should not be, it will fail at the first one
                this.canIndent = true;
                
                for(c = whitespaceOffset; c < lineLength; c++) {
                    cur = characters[c];
                    switch(cur) {
                        case '\\':
                            currentTag = this.clearTagIfExists(currentTag);
                            this.pushString(line.charAt(c+1));
                            this.pushInterpolatedString(line.substring(c+2));
                            c = lineLength;
                            break;
                        case '!':
                            if(lineLength > c+2 && characters[c+1] == '!' && characters[c+2] == '!') {
                                this.pushString(this.getDoctype(line.substring(c)));
                                c = lineLength;
                                break;
                            }
                        case '/':
                            if(currentTag.haveTag) {
                                currentTag.autoClose = true;
                            } else {
                                line = line.substring(c+1);
                                var start = '<!--', end = ' -->';
                                if(line.charAt(0) == '[') {
                                    var endIndex = this.findBalancedStopCharacter(line.substring(1), ']');
                                    start += line.substring(0, endIndex+2)+'>';
                                    line = line.substring(endIndex+2);
                                    end = ' <![endif]-->'
                                }
                                this.pushString(start+" ");
                                this.pushInterpolatedString(line);
                                this.stack.push(end);
                                c = lineLength;
                            }
                            break;
                        case '@':
                            //if we are at the beginning of the line, then this is specifying default variable values.
                            //if not, it will keep processing and hit the default case
                            if(c === 0) {
                                this.defaults = line.substring(1);
                                c = lineLength;
                                break;
                            }
                        case '-':
                            //support haml comments
                            if(c+1 < lineLength && characters[c+1] != '#') {
                                if(this.checkTagError(currentTag.haveTag, 'extraDash')) break;
                                
                                //check if it is a custom for loop
                                var text = this.concatenateMultilineString(line, c);
                                if(text.startsWith('for') && text.include(' in ') && !text.substring(3).trim().startsWith('(')) {
                                    this.processForEach(text);
                                } else {
                                    this.compiledView.push(this.processBracket(text), '\n');
                                }
                            }
                            
                            c = lineLength;
                            break;
                        case '=':
                            //ignore a double equals sign.  also worry about the case with an empty equals on a line
                            if(lineLength === c+1 || characters[c+1] != '=') {
                                currentTag = this.clearTagIfExists(currentTag);
                                this.pushCodeOutput(this.concatenateMultilineString(line, c));
                                c = lineLength;
                            } else {
                                c += 2;
                            }
                            break;
                        case '%':
                            if(this.checkTagError(currentTag.haveTag, 'extraPercent')) break;
                            c = this.updateTagAttribute(currentTag, 'name', characters, c);
                            break;
                        case '.':
                            this.setDefaultTagIfNone(currentTag);
                            c = this.updateTagAttribute(currentTag, 'classes', characters, c);
                            break;
                        case '#':
                            if(characters[c+1] === '{') {
                                this.pushInterpolatedString(line.substring(c));
                                c = lineLength;
                            } else {
                                this.setDefaultTagIfNone(currentTag);
                                c = this.updateTagAttribute(currentTag, 'id', characters, c);
                            }
                            break;
                        case '{':
                        case '(':
                            if(this.checkTagError(!currentTag.haveTag, 'extraOpenBracket', c)) break;
                            var attr = this.processAttributes(line.substring(c));
                            currentTag.attributes.push(attr.attributes);
                            c += attr.length-1;
                            break;
                        case '}':
                        case ')':
                            this.error(this.errorMessages.extraCloseBracket, {lineNumber: this.lineIndex, character: c});
                            break;
                        case ' ':
                            c++; //ignore spaces right after a tag name and add the rest as interpolated text
                        default:
                            currentTag = this.clearTagIfExists(currentTag);
                            this.pushInterpolatedString(line.substring(c));
                            c = lineLength;
                            break;
                    }
                }
                
                //If the tag was the only thing on the line, it will not have been pushed yet
                if(currentTag !== undefined && currentTag.haveTag) {
                    this.pushTag(currentTag);
                }
            }
            
            if(this.errors.length === 0) {
                //Now that every line has processed, clear any remaining data in the buffers and eval the code
                this.processWhitespace('');
                this.clearStringBuffer();
                return this.evalCode();
            }
        },
        
        getDoctype: function(line) {
            line = line.substring(3).toLowerCase().trim();
            var bits = line.split(/\s+/);
            
            if(line.startsWith('xml')) {
                var encoding = bits[1] || "utf-8";
                return "<?xml version='1.0' encoding='"+encoding+"' ?>"
            }
            
            if(options.html5) {
                return '<!DOCTYPE html>'
            }
            var version = bits[1], type = bits[0];
            if(!parseFloat(bits[1], 10) && !!parseFloat(bits[0], 10)) {
                version = bits[0];
                type = bits[1];
            }
            
            if(options.xhtml) {
                if(version == '1.1') return '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">';    
                if(version == '5') return '<!DOCTYPE html>';
                if(type == 'strict') return '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">';
                else if(type == 'frameset') return '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Frameset//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-frameset.dtd">';
                else if(type == 'mobile') return '<!DOCTYPE html PUBLIC "-//WAPFORUM//DTD XHTML Mobile 1.2//EN" "http://www.openmobilealliance.org/tech/DTD/xhtml-mobile12.dtd">';
                else if(type == 'basic') return '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML Basic 1.1//EN" "http://www.w3.org/TR/xhtml-basic/xhtml-basic11.dtd">';
                else return '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">';
            } else {
                if(type == 'strict') return '<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">';
                else if(type == 'frameset') return '<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Frameset//EN" "http://www.w3.org/TR/html4/frameset.dtd">';
                else return '<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">';
            }
        },
        
        /**
         * Put the code in an anonymous function so it can be eval'd once and then called repeatedly, making it a lot faster.
         * Any default variable values or values passed to the render function are placed in with blocks so that they are available as local variables.
         * Kudos to ejs for this idea
         */
        createEvalString: function() {
            var defaultsString = '{';
            if(this.defaults.length > 0) {
                defaultsString = "var __defaults = "+this.defaults+"; with(__defaults) {";
            }
            var evalString = "this.renderFunction = function(__data, __helpers) { "+defaultsString+" with(__data) { with(__helpers) { var __o = this.output, __this = this; "+this.compiledView.join('')+" return __o.join(\"\"); } } } };";
            this.debugStr = evalString;
            
            return evalString;
        },
        
        /**
         * Evals the executable javascript code once and stores it in a function so it never needs to be eval'd again.
         * TODO: Integrate with JSLINT like EJS intelligently did.
         */
        evalCode: function() {
            var evalString = this.createEvalString();
            
            return eval(evalString);  
        },
        
        /**
         * Updates the currentTag variable with the default tag values.
         * For instance, if we see just #id, that has to be a div tag.
         */
        setDefaultTagIfNone: function(tag) {
            if(!tag.haveTag) {
                tag.haveTag = true;
                tag.name = 'div';
            }
        },
        
        /**
         * Resets the tag if it has been set.
         */
        clearTagIfExists: function(tag) {
            if(tag.haveTag) {
                this.pushTag(tag);
                tag = this.resetTag();
            }
            return tag;
        },
        
        /**
         * Helper method that checks for error conditions when parsing tags.
         */
        checkTagError: function(condition, error, c) {
            if(condition) {
                this.error(this.errorMessages['error'], {lineNumber: this.lineIndex, character: c});
            }
            return condition;
        },
        
        /**
         * Finds the end of an individual attribute in a tag and updates that key in the currentTag variable.
         * For instance, %strong.class would first match 'strong'.  Calling it again matches 'class'.
         */
        updateTagAttribute: function(tag, attribute, characters, c) {   
            endIndex = this.findStopCharacter(characters, c+1, haml.stopCharacters);
            var value = line.substring(c+1, endIndex);
            if(attribute == 'classes')
                tag[attribute].push(value);
            else
                tag[attribute] = value;
            tag.haveTag = true;
            return endIndex - 1;
        },
        
        
        
        /**
         * Returns an object containing two keys:
         *   attributes: a string to be passed into the compiled view representing the attributes of the tag.
         *               The return value will always be either a variable name or a json object.
         *               However, a ruby-style hash may be used in the view and it will be converted to a json object.
         *               HTML style attributes may also be used.
         *   length: The size of the original attribute string so the main loop can advance accordingly.
         */
        processAttributes: function(str) {
            var htmlStyle = str.startsWith('(');
            
            var attributeStart = '{', attributeSeparator = ',', attributeEnd = '}';
            if(htmlStyle) {
                attributeStart = '(';
                attributeSeparator = ' ';
                attributeEnd = ')';
            }
            
            //trim the opening/closing brackets
            var endIndex = this.findBalancedStopCharacter(str.substring(1), attributeEnd);
            var strWithoutBrackets = str.substring(1, endIndex+1);
            var strWithBrackets = str.substring(0, endIndex+2);
            var ret;
            
            // check if they are passing a variable as the attribute - variables cannot have equals or colons, but the three attribute styles must
            if(strWithoutBrackets.indexOf(':') < 0 && strWithoutBrackets.indexOf('=') < 0) {
                return {attributes: strWithoutBrackets, length: strWithBrackets.length};
            }
            
            //if there are no equals signs then it is definitely not a ruby-style object.
            //an equals sign could be in parentheses though ie: {key: (value = 'value')}, but findBalancedStopCharacter will ignore it
            var equalsIndex = this.findBalancedStopCharacter(strWithoutBrackets, '=');
            if(!htmlStyle && equalsIndex === strWithoutBrackets.length) {
                //we are parsing json style attributes
                ret = strWithBrackets.replace('class:', 'clas:')
            } else {
                var attributes = [], equalsIndex, attributeName, valueStartIndex, value, endIndex;
                while(strWithoutBrackets.length > 0) {
                    //find the key, denoted by the =>
                    equalsIndex = this.findBalancedStopCharacter(strWithoutBrackets, '=');
                    endIndex = equalsIndex + 1;
                    attributeName = strWithoutBrackets.substring(0, equalsIndex).trim();
                    
                    //if we are using ruby-style syntax, then make sure that the separator is => and not just =
                    if(!htmlStyle) {
                        if(equalsIndex+1 < strWithoutBrackets.length && strWithoutBrackets.charAt(equalsIndex+1) == '>') {
                            //remove the colon from ruby-style symbols
                            if(attributeName.startsWith(':')) {
                                attributeName = "'"+attributeName.substring(1)+"'";
                            } else if (attributeName.startsWith('class:')) {
                                attributeName = 'clas:';
                            }
                            endIndex++;
                        } else {
                            return this.error("Error while parsing the ruby style attributes hash.");
                        }
                    } else {
                        attributeName = "'"+attributeName+"'";
                    }
                    
                    //remove the attribute and separator
                    strWithoutBrackets = strWithoutBrackets.substring(endIndex);
                    
                    //find the value, denoted by a comma or the end of the string
                    valueStartIndex = this.findBalancedStopCharacter(strWithoutBrackets, attributeSeparator);
                        
                    value = strWithoutBrackets.substring(0, valueStartIndex).trim();
                    if(!htmlStyle && value.startsWith(':')) {
                        value = "'"+value.substring(1)+"'";
                    }
                    
                    strWithoutBrackets = strWithoutBrackets.substring(valueStartIndex+1);
                    //support for later pre-rendering attributes
                    //attributes.push([attributeName, value]);
                    attributes.push(attributeName+": "+value);
                }
                ret = '{'+attributes.join(', ')+'}';
            }
            
            return {attributes: ret, length: strWithBrackets.length};
        },
        
        /**
         * This returns the index of the first occurance of character in str.
         * If none are found, it returns the length of the string.
         * However, this method will also attempt to balance certain characters in the string.
         * So, if the character is in a set of parentheses or is part of a string in quotes, that return character will be ignored.
         * Any character after a backslash is also ignored.
         */
        findBalancedStopCharacter: function(str, character) {
            var c, len = str.length, cur;
            var chars = {"'": "'", '"': '"', '(': ')', '{': '}', '/': '/', '[': ']'};
            var stopBalancingChars = {"'": true, '"': true, '/': true};
            str = str.split('');
            var stack = [];
            
            for(c = 0; c < len; c++) {
                cur = str[c];
                //ignore the character immediately after a backslash
                if(cur == '\\') {
                    c++;
                    continue;
                }
                
                if(stack.length === 0 && cur == character) {
                    break;
                }
                
                //if we hit an ', ", or /, then keep iterating until we find the next one indicating the end of the string/regex and ignore everything inside
                if(stopBalancingChars[cur]) {
                    c++;
                    while(str[c] != cur) {
                        if(str[c] == '\\') {
                            c++;
                        }
                        c++;
                    }
                    continue;
                }
                //if there are no elements on the stack, it cant be a closing character
                //if the closing character on the stack matches this one, then we're done
                if(stack.length > 0 && cur == stack[stack.length-1]) {
                    stack.pop();
                } else if(chars[cur]) {
                    stack.push(chars[cur]);
                }
            }
            return c;
        },
        
        /**
         * Joins a line of javascript code from either - or = that is broken up by trailing |'s.
         */
        concatenateMultilineString: function(line, c) {
            var text;
            var first = false, multiLine = [];
            
            //make the code more elegant by storing a trimmed version of the line in the lines array.  we'll restore it later
            //the trimmed version is useful if we have something like: %td= something |
            var originalLine = this.lines[this.lineIndex];
            this.lines[this.lineIndex] = line.substring(c);
            
            for(var d = this.lineIndex; d < this.linesLength; d++) {
                text = this.lines[d].trim();
                
                //check if it starts with a - or =.  once we have seen two of them, we can stop
                if(haml.multilineStopCharacters[text.substring(0, 1)]) {
                    if(first) {
                        break;
                    }
                    first = true;
                    text = text.substring(1);
                }
                
                if(text.charAt(text.length-1) === '|') {
                    multiLine.push(text.substring(0, text.length-1).trim());
                } else {
                    if(d === this.lineIndex) {
                        multiLine.push(text.trim());
                    }
                    break;
                }
            }
            
            this.lines[this.lineIndex] = originalLine;
            this.lineIndex += multiLine.length-1;
            return multiLine.join(' ');
        },
        
        /**
         * Determines the amount of whitespace used in the document
         * This looks for the first line that has any whitespace at the beginning.  This amount is assumed to indicate one indentation level.
         */
        determineIndentation: function(lines) {
            var c = 0, len = lines.length, line, d=0, character;
            var pastFirstLine = false, firstLine = false;
            for(; c < len; c++) {
                line = lines[c];
                
                //ignore blank lines
                if(line.trim().length === 0) {
                    continue;
                }
                
                //Keep two booleans to represent if we are at the first line of content to make sure there is no indentation on the first line.
                if(!pastFirstLine) {
                    firstLine = true;
                    pastFirstLine = true;
                } else {
                    firstLine = false;
                }
                
                //find the first non whitespace character on the line
                for(d = 0; d < line.length; d++) {
                    character = line.charAt(d);
                    if(character !== ' ' && character !== '\t') {
                        break;
                    }
                }
                
                //make sure there is a least one character of whitespace
                if(d > 0) {
                    var whitespace = line.substring(0, d);
                    
                    //make sure they did not mix spaces and tabs
                    if(whitespace.include(' ') && whitespace.include('\t')) {
                        return this.error(this.errorMessages.mixedIndentation, {lineNumber: c});
                    }
                    
                    if(firstLine) {
                        return this.error(this.errorMessages.indentationFirstLine, {lineNumber: c});
                    }
                    
                    return {
                        string: whitespace,
                        character: whitespace.include(' ') ? ' ' : '\t',
                        length: whitespace.length,
                        notCharacter: whitespace.include(' ') ? '\t' : ' '
                    };
                }
            }
        },
        
        /**
         * Surrounds a block of code with brackets as a conveince
         */
        processBracket: function(line) {
            var text = line.ltrim(), matchIndex = -1, key;
            for(var c = 0; c < haml.autoAddParenthesesTerminals.length; c++) {
                key = haml.autoAddParenthesesTerminals[c];
                if(typeof key === 'string') {
                    if(text.startsWith(key)) {
                        matchIndex = key.length;
                        break;
                    }
                } else {
                    var result = text.match(key);
                    if(result) {
                        matchIndex = result[0].length;
                        break;
                    }
                }
            }
            
            if(text.lastIndexOf('{') !== text.length-1) {
                //else blocks are evil because they have no body of code so there is no need to wrap it with parentheses, just brackets
                if(matchIndex < 0 && text.startsWith('else')) {
                    this.stack.push('}');
                    return line+' {';
                }
            
                //if it starts with one of the keywords and id does not end with a bracket, then we will wrap it in parentheses and brackets
                if(matchIndex > 0) {
                    var keyword = text.substring(0, matchIndex);
                    var body = text.substring(matchIndex);
                    
                    this.stack.push('}');
                    return [keyword, '(', body, ')', ' {'].join('');
                }
            }
            
            this.stack.push('');
            return line;
        },
        
        /**
         * Transforms a custom for loop into a valid javascript for loop.
         * There are two syntaxes:
         * for c in 0..10
         *   This is compiled into:
         *     for(var c = 0; c < 10; c++) {}
         * for item in items using c
         *   This is compiled into:
         *     var forEachLength0 = items.length, item;
         *     for(var c = 0; c < forEachLength0; c++)
         *     item = items[c];
         */
        processForEach: function(line) {
            line = line.substring(3);
            if(line.include('..')) {
                var forEachBits = line.split(' in ');
                var variableName = forEachBits[0].trim();
                forEachBits = forEachBits[1].split('..');
                var startNumber = forEachBits[0].trim();
                var endNumber = forEachBits[1].trim();
                
                
                var forLoopLine = ["for(var ", variableName, " = ", startNumber, "; ", variableName, " < ", endNumber, "; ++", variableName, ") {"].join('');
                
                this.stack.push('}');
                this.compiledView.push(forLoopLine);
            } else {
                var forEachBits = line.split(' in ');
                var itemVariable = forEachBits[0].trim();
                var arrayVariable= forEachBits[1].trim();
                var counterVariable = "forEachCounter"+(++this.forEachIndex);
                var lengthVariable = "forEachLength"+this.forEachIndex;
                
                forEachBits = arrayVariable.split(" using ");
                if(forEachBits.length == 2) {
                    arrayVariable = forEachBits[0].trim();
                    counterVariable = forEachBits[1].trim();
                }
                
                var lengthLine = ["var ", lengthVariable, " = ", arrayVariable, ".length, ", itemVariable, ";"].join('');
                var forLoopLine = ["for(var ", counterVariable, " = 0; ", counterVariable, " < ", lengthVariable, "; ++", counterVariable, ") {"].join('');
                var variableAssignmentLine = [itemVariable, " = ", arrayVariable, "[", counterVariable, "];"].join('');
                
                this.stack.push('}');
                this.compiledView.push(lengthLine, '\n');
                this.compiledView.push(forLoopLine, '\n');
                this.compiledView.push(variableAssignmentLine, '\n');
            }
        },
        
        /**
         * Handles a Haml syntax error
         */
        error: function(message, data) {
            data = data || {}
            data.error = message;
            
            if(!data.lineNumber) data.lineNumber = this.lineIndex;
            
            if(data.lineNumber >= 0 && !data.line) {
                data.line = this.lines[data.lineNumber];
            }
            
            if(data.line) {
                if(data.line.join) {
                    data.line = data.line.join('');
                }
                data.line = data.line.replace(/ /g, '[space]').replace(/\t/g, '[tab]');
            }
            
            this.errors.push(haml.formatObject(data));
        },
        
        /**
         * There can be at most one tag per line, so each time any information from the previous line needs to be reset
         */
        resetTag: function() {
            return {
                haveTag: false,
                autoClose: false,
                id: '',
                classes: [],
                name: '',
                //preload with an empty string so we can add the classes ids fro them # and . syntax
                attributes: [[]]
            };
        },
        
        /**
         * Generates the necessary code to build a tag.
         * There are three parts two this.
         * First, it needs to clear any text, such as closing tags for tags that came before it
         * Second, it needs to push a call to this.makeTag into the compiledView array
         * Finally, it needs to push the closing tag on the stack
         */
        pushTag: function(tag) {
            //add a new tag to the compiledView buffer
            this.clearStringBuffer();
            var begin = "<"+tag.name;
            //autoclose only when exactly one of the two variables is true.  if both are true, we have something like content in a <br> tag
            var autoClose = haml.autocloseTags[tag.name] ^ tag.autoClose;
            var end = autoClose ? ' />': '>';
            var classes = tag.classes.join(' ');
            
            //add any classes / ids from the # and . syntax at the lowest priority
            if(tag.id) {
                tag.attributes[0].push("id: '"+tag.id+"'");
            }
            if(classes && classes.length > 0) {
                tag.attributes[0].push("'class': '"+classes+"'");
            }
            tag.attributes[0] = '{'+tag.attributes[0].join(',')+'}';
            
            this.compiledView.push(haml.tagTemplate[0]);
            this.compiledView.push('"', begin, '","', end, '", [', tag.attributes.join(','), "]");
            this.compiledView.push(haml.tagTemplate[1], '\n');
            
            if(!autoClose) {
                this.stack.push(['</', tag.name, '>'].join(''));
            } else {
                this.canIndent = false;
                this.stack.push('');
            }
        },
        
        /**
         * Static strings such as node contents and closing tags can sometimes be grouped together so there are few calls to output.push at runtime.
         * They are stored in this.stringBuffer
         * When new tags are created, all of the strings currently in the buffer need to be emptied because they are guaranteed to be nested inside of an earlier tag
         * eg:
         * .outer
         *   .inner Inner Text
         * .outer2
         * When .outer2 is processed, the stringBuffer will contain:
         *   ['Inner Text', '</div>', '</div>']
         */
        clearStringBuffer: function() {
            //concatenate a static string and add it to the compiled view
            if(this.stringBuffer.length > 0) {
                this.compiledView.push(haml.stringTemplate[0], this.stringBuffer.join(''), haml.stringTemplate[1], '\n');
                this.stringBuffer.length = 0;
            }
        },
        
        /**
         * Pushes a line of javascript output code into the compiled view.
         * e.g = 1+2
         */
        pushCodeOutput: function(text) {
            //remove any javascript comments
            text = text.split('//')[0];
            
            //add javascript code to the compiled view
            this.clearStringBuffer();
            this.compiledView.push(haml.codeOutputTemplate[0], text, haml.codeOutputTemplate[1], '\n');
        },
        
        /**
         * Parses a line of text to find any place where there is a #{js code} section.
         * Effectively, this splits a string into multiple parts, those containing plain text, and those containg javascript code.
         */
        pushInterpolatedString: function(text) {
            //a small catch for catching the closing brackets of if statements that are automatically pushed onto the stack
            if(text === '}') {
                this.clearStringBuffer();
                this.compiledView.push(text, '\n');
                return;
            }
            
            //most of this comes from prototype's gsub method
            var match, beforeMatch;
            while (text.length > 0) {
                if (match = text.match(haml.interpolationRegex)) {
                    //sometimes the match index is off by one.  i have no clue why.
                    var index = match.index;
                    if(text.charAt(index) !== '#') {
                        index++;
                    }
                    
                    //find the text before and after the match
                    beforeMatch = text.slice(0, index);
                    text = text.slice(match.index + match[0].length);
                    
                    
                    //check if the text is proceeded by a backslash
                    if (match[1] && match[1] == '\\') {
                        //the backslash will be caught in the string that comes before the match, so we need to remove the last character
                        this.pushString(beforeMatch.substring(0, beforeMatch.length-1));
                        this.pushString(match[2]);
                        continue;
                    } else {
                        this.pushString(beforeMatch);
                    }
                    
                    //find the text inside of the #{} and add it as executable code, ie, it compiles to the same thing as:
                    //  = code
                    this.pushCodeOutput(match[2].substring(2, match[2].length-1));
                } else {
                    //if there was no match, or we are at the end, then just add the remaining text
                    this.pushString(text);
                    text = '';
                }
            }
        },
        
        
        /**
         * Pushes plain text to the compiled view output
         */
        pushString: function(text) {
            //add a string output to the compiled view
            if(text === '}') {
                this.clearStringBuffer();
                this.compiledView.push(text, '\n');
            } else {
                this.stringBuffer.push(this.sanitize(text));
            }
        },
        
        /**
         * Escapes quotes and backslashes which could cause an injection attack in the generated code
         */
        sanitize: function(text) {
            return text.replace(/\\/g, '\\\\').replace(/"/g,  '\\"');
        },
        
        /**
         * This is a runtime function to generate a tag based on its id/class/attributes object
         */
        makeTag: function(tagBegin, tagEnd, attributesList) {
            this.output.push(tagBegin);
            var c, attributes, key, keyName;
            
            var merged = {};
            
            for(c = 0; c < attributesList.length; c++) {
                attributes = attributesList[c];
            
                for(key in attributes) {
                    keyName = key == 'clas' ? 'class' : key;
                    if(!attributes[key]) {
                        continue;
                    }
                    
                    if(key == 'id') {
                        merged[keyName] = attributes[key];
                    } else {
                        if(merged[keyName]) {
                            merged[keyName] = [merged[keyName], attributes[key]].join(' ');
                        } else {
                            merged[keyName] = attributes[key];
                        }
                    }
                }
            }
            
            for(key in merged) {
                if(key === 'checked' || key === 'selected') {
                    merged[key] = key;
                }
                this.output.push(' ', key, '="', merged[key], '"');
            }
            
            this.output.push(tagEnd);
        },
        
        /**
         * Splits the document into an array of lines
         */
        splitLines: function (text) {
            return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
        },
        
        /**
         * Calculates the indentation level of the whitespace of a line
         * Based on that level, it will pop closing tags off of the stack and output them
         */
        processWhitespace: function(line) {
            if(!this.indentation) {
                this.pushString(this.stack.reverse().join(''));
                this.stack.length = 0;
                this.clearStringBuffer();
                return 0;
            }
            
            var c, lineLength = line.length;
            for(c = 0; c < lineLength; c++) {
                if(line[c] === this.indentation.notCharacter) {
                    this.error(this.errorMessages.mixedIndentation, {
                        character: c,
                        line: line
                    });
                    return 0;
                } else if(line[c] !== this.indentation.character) {
                    break;
                }
            }
            
            if(c % this.indentation.length !== 0) {
                this.error(this.errorMessages.unevenSpacing, {
                    line: line,
                    character: c
                });
                return undefined;
            }
            
            var depth = c / this.indentation.length, stackSize = this.stack.length;
            
            
            if(this.validateIndentation(depth)) {
                this.previousIndentation = depth;
                for(var d = 0; d < (stackSize - depth); d++) {
                    var value = this.stack.pop();
                    this.pushString(value);
                }
                this.clearStringBuffer();
                
                return c;
            }
        },
        
        /**
         * Returns true if the indentation level is valid based on the previous line's indentation and the ability of the previous tag to contain inner text
         */
        validateIndentation: function(depth) {
            //if there is less indentation than before, it is ok
            if(depth <= this.previousIndentation) {
                return true;
            }
            
            //if there is more than 1 new level of indentation, it is bad
            if(depth > this.previousIndentation+1) {
                return false;
            }
            
            //if we are not allowed to indent, ie a <br /> tag, and it indents, then it is bad
            //at this point, the depth will only be equal to previous+1
            if(!this.canIndent) {
                return false;
            }
            return true;
        },
        
        /**
         * Finds the first character that matches one of the stop characters.
         * This indicates a token, a sequence of characters, and the callback function will be called with the sequence
         * e.g: %strong.class will have two tokens, strong and class
         */
        findStopCharacter: function(line, start, characters) {
            //find characters like .#{} that indicated the start of a tag/class/id etc
            var length = line.length;
            for(; start < length; start++) {
                if(characters[line[start]]) {
                    return start;
                }
            }
            return length;
        },
        
        /**
         * Compiles and runs the view
         * data and helpers are two objects that can be passed in and the items in their will be available as normal variables in the view
         */
        render: function(data, helpers) {
            if(!data) {
                data = {};
            }
            if(helpers === undefined) {
                helpers = {};
            }
            
            //take care of infinite recursion when using haml to build the logger
            /*if(!this.name.include('logger')) {
                this.log.debug('rendering : '+this.name);
            }*/
    
            this.compile();
            this.output = [];
            
            if(this.errors.length > 0) {
                return '';
            }
            return this.renderFunction(data, helpers);
        },
        
        errorMessages: {
            mixedIndentation: "Found tabs and spaces mixed at the beginning of a line.",
            unevenSpacing: "Found an uneven amount of space at the beginning of a line.",
            extraOpenBracket: "Found a { at the beginning of a line.  If you want to add this character as plain text, precede it with a \\.",
            extraCloseBracket: "Found a } at the beginning of a line.  If you want to add this character as plain text, precede it with a \\.",
            extraDash: "Found a - on the same line as a tag declaration.  Javascript code can only be included on its own line.",
            extraPercent: "Found a second % on the same line.  You can only include one tag per line.  Nested tags should be on a newline and indented.",
            indentationFirstLine: "Found whitespace on the first line of content."
        }
    };
    
    /**
     * Useful for print error messages.
     */
    haml.formatObject = function(object) {
        var type = typeof object;
        switch (type) {
            case 'undefined':
            case 'function':
            case 'unknown': return;
            case 'boolean': return object.toString();
            case 'string': 
            case 'number':
                return object;
            case 'array': return object.join(',');
        }
    
        if (object === null) return 'null';
        if (!!(object && object.nodeType == 1)) return;
    
        var results = [];
        for (var property in object) {
            var value = haml.formatObject(object[property]);
            if (value != undefined)
                results.push('<dd>'+property+': </dd><dt>'+value+'</dt>');
        }
    
        return '<dl>' + results.join(' ') + '</dl>';
    };
    
    $.extend(String.prototype, {
        ltrim: function() {
            return this.replace(/^\s+/,"");
        },
        
        rtrim: function() {
            return this.replace(/\s+$/,"");
        },

        trim: String.prototype.trim || function() {
            var str = this.replace(/^\s\s*/, ''),
            ws = /\s/, i = str.length;
            while (ws.test(str.charAt(--i)));
            return str.slice(0, i + 1);
        },

        startsWith: function(pattern, ignoreCase) {
            return ignoreCase ? this.toLowerCase().startsWith(pattern.toLowerCase()) : this.indexOf(pattern) === 0;
        },
        
        include: function(pattern) {
            return this.indexOf(pattern) > -1;
        },

        endsWith: function(pattern) {
            var d = this.length - pattern.length;
            return d >= 0 && this.lastIndexOf(pattern) === d;
        },
  
        empty: function() {
            return this == '';
        }
    });
    
    return haml;
})(jQuery);
