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
(function($) {
    var views = {
        /*doctype: '<?xml version=\'1.0\' encoding=\'utf-8\' ?><?xml version=\'1.0\' encoding=\'iso-8859-1\' ?><?xml version=\'1.0\' encoding=\'utf-8\' ?><!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd"><!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd"><!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd"><!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd"><!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Frameset//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-frameset.dtd">',
        comments: '<!--  comment --><!-- comment --><!--[if IE]>  comment <![endif]--><!--[if IE]> comment3 <![endif]--><!-- commentcomment -->no comment',
        attributes: '<div class="class"></div><div class="class"></div><div class="class"></div><div class="class"></div><div class="class" id="id"></div><div class="class" id="id"></div><div class="class" id="id" title="{class: \'class\', id: "class"", :noob => /noob/}"></div><div class="class"></div><div class="class" id="id"></div><div class="class" id="id"></div><div class="class" id="id" title="{class: \'class\', id: "class"", :noob => /noob/}"></div><div class="class" id="id" title="test12"></div><div class="class" id="id" title="test12" alt="alt"></div><div class="class" id="id" title="valuetest12" alt="alt"></div><div class="class"></div><div class="class"></div><div class="class"></div><div class="class"></div><div class="class"></div><div class="class" id="id"></div><div class="class" id="id" title="{class: \'class\', id: "class"", :noob => /noob/}"></div><div class="class" id="id" title="(class=\'class\' id="class"" noob=/noob/}"></div><div class="class" id="id" title="test12"></div><div class="class" id="id" title="test12" alt="alt"></div><div class="class" id="id" title="valuetest12" alt="alt"></div><div class="class" id="id" title="title" alt="alt"></div>',
        empty: '',
        indentationFirstLine: {expectedOutput: '', successFunction: hasError('indentationFirstLine')},
        indentationFirstLine2: {expectedOutput: '', successFunction: hasError('indentationFirstLine')},
        //main: '',
        mixedIndentation: {expectedOutput: '', successFunction: hasError('mixedIndentation')},
        noIndentation: '<div>Line One</div><div>Line Two</div><div>Line Three</div>',
        oneLine: '<div>There is one line in this file.</div>',
        tabIndentation: '<div class="one"><div class="two"><div class="three"></div></div></div><div class="four"><div class="five"><div class="six"></div></div><div class="seven"></div></div>',
        threeSpacesIndentation: '<div class="one"><div class="two"><div class="three"></div></div></div><div class="four"><div class="five"><div class="six"></div></div><div class="seven"></div></div>',
        interpolation: '3#{1+2}\\#{1+2}"3"#{1+2}<div class="tag">3</div><div class="tag">#{1+2}</div><div class="tag">33#{1+2} 3</div><div class="tag">Testing3Testing</div><div class="tag">3</div>',
        defaultVariables: 'truehi',
        defaultVariablesNotUsed: {data: {variable1: false, variable2: 'bye'}, expectedOutput: 'falsebye'},
        tagContents: '<div>3</div><div>3Testing</div><div>Testing3Testing</div>1+2<div>1+2</div>',
        cssClasses: '<div class="class"></div><div class="class"></div><div class="class"></div><div class="class"></div><div class="class class2"></div><div class="class class2"></div><div class="class class2"></div>',
        cssIds: '<div id="id1"></div><div id="id1"></div><div id="id2"></div><div id="id2"></div><div id="id3"></div>',
        multiline: '63+ 3<div>3<div></div></div><div>3<div>3</div></div>3',*/
        rubyHamlTests: {
            subdirectory: true,
            justStuff: '<?xml version=\'1.0\' encoding=\'utf-8\' ?><?xml version=\'1.0\' encoding=\'iso-8859-1\' ?><?xml version=\'1.0\' encoding=\'utf-8\' ?><!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd"><!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd"><!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd"><!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd"><!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Frameset//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-frameset.dtd"><strong apos="Foo\'s bar!">Boo!</strong>Embedded? false!Embedded? true!Embedded? true!Embedded? twice!!Embedded? one af"t"er another!<p>Embedded? false!</p><p>Embedded? true!</p><p>Embedded? true!</p><p>Embedded? twice! !</p><p>Embedded? one af"t"er another!</p>stuff followed by whitespace',
            tagParsing: '<div class="tags"><foo>1</foo><FOO>2</FOO><fooBAR>3</fooBAR><fooBar>4</fooBar><foo_bar>5</foo_bar><foo-bar>6</foo-bar><foo:bar>7</foo:bar><foo class="bar">8</foo><fooBAr_baz:boom_bar>9</fooBAr_baz:boom_bar><foo13>10</foo13><foo2u>11</foo2u></div><div class="classes"><p id="boom" class="foo bar"></p><div class="fooBar">a</div><div class="foo-bar">b</div><div class="foo_bar">c</div><div class="FOOBAR">d</div><div class="foo16">e</div><div class="123">f</div><div class="foo2u">g</div></div>',
            originalEngine: '<html><head><title>Stop. haml time</title><div id="content"><h1>This is a title!</h1><p>Lorem ipsum dolor sit amet, consectetur adipisicing elit</p><p class="foo">Cigarettes!</p><h2>Man alive!</h2><ul class="things"><li>Slippers</li><li>Shoes</li><li>Bathrobe</li><li>Coffee</li></ul><pre>This is some text that\'s in a pre block! Let\'s see what happens when it\'s rendered! What about now, since we\'re on a new line?</pre></div></head></html>',
            standard: '<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en-US" lang="en-US"><head><title>Hampton Catlin Is Totally Awesome</title><meta http-equiv="Content-Type" content="text/html; charset=utf-8" /></head><body><div class="header">Yes, ladies and gentileman. He is just that egotistical.Fantastic! This should be multi-line output The question is if this would translate! Ahah!20</div><div id="body"> Quotes should be loved! Just like people!</div>01234567891011Wow.|<p>Holy cow        multiline       tags!           A pipe (|) event!PipesIgnored|PipesIgnored|PipesIgnored|1|2|3</p><div class="silent">this shouldn\'t evaluate but now it should!</div><ul class="really cool"><li>a</li><li>b</li><li>c</li><li>d</li><li>e</li><li>f</li></ul><div id="combo" class="of_divs_with_underscore">with this text</div><div class="footer"></div></body></html>'
        }
    };
    
    var results = [];
    var allPassed = true;
    
    /**
     * Splits a string by whitespace, returning an array of the bits.
     */
    var $w = function(string) {
        if (typeof string != 'string') return [];
        string = string.trim();
        return string ? string.split(/\s+/) : [];
    }
    
    /**
     * Splits a line into 80 character chunks for displaying on the screen.
     * It splits at the end of the first tag seen after 80 characters.
     */
    function format(str) {
        var lines = [], max = 80;
        while(str.length > max) {
            var index = str.indexOf('&gt;', max);
            if(index < 0) {
                break;
            }
            
            //have to take a substring from the begging to the end of &gt; and then from the end of &gt; to the end of the string
            lines.push(str.substring(0, index+4));
            str = str.substring(index+4);
        }
        lines.push(str);
        return lines.join('<br />');
    }
    
    /**
     * Nicely formats the html by putting each tag on its own line, and indenting them.
     * The return result of this is an array of lines so they can be processed for differences.
     */
    function formatError(str) {
        var lines = [];
        
        //split the string into lines, putting each tag/text node on its own line
        while(str.length > 0) {
            var openTagEnd = str.indexOf('&gt;');
            var closeTagBegin = str.indexOf('&lt;/');
            
            if(openTagEnd < 0 && closeTagBegin < 0) {
                break;
            }
            
            //if we see the end of a tag before the begging of a close tag, then that means the first tag seen was an open tag
            if(openTagEnd < closeTagBegin) {
                //same substring as above in format
                lines.push(str.substring(0, openTagEnd+4));
                str = str.substring(openTagEnd+4);
            } else {
                //Check for empty tags
                if(closeTagBegin !== 0) {
                    lines.push(str.substring(0, closeTagBegin));
                }
                //have to take a substring of the whole close tag
                //in this case, openTagEnd will really be the end of the close tag
                lines.push(str.substring(closeTagBegin, openTagEnd+4));
                str = str.substring(openTagEnd+4);
            }
            
        }
        lines.push(str);
        
        //merge any lines that are one-liners or empty
        var squashedLines = [];
        for(var c = 0; c < lines.length; c++) {
            var add = true;
            //if it does not start with a < then its a text node
            if(lines[c].indexOf('&lt;') !== 0) {
                //if the line before starts with < and the line after starts with </, then this line is the only text inside of the tags, so combine them
                if(c > 0 && c < lines.length-1 && lines[c+1].indexOf('&lt;/') === 0 && lines[c-1].indexOf('&lt;') === 0 && lines[c-1].indexOf('&lt;/') !== 0) {
                    squashedLines[squashedLines.length-1] = [lines[c-1], lines[c], lines[c+1]].join('');
                    add = false;
                    c++;
                }
            }
            //if the line before starts with < but not </ and this line starts with </ then we have an empty node
            else if(c > 0 && lines[c].indexOf('&lt;/') === 0 && lines[c-1].indexOf('&lt;') === 0 && lines[c-1].indexOf('&lt;/') !== 0) {
                squashedLines[squashedLines.length-1] = [lines[c-1], lines[c]].join('');
                add = false;
            }
            if(add) {
                squashedLines.push(lines[c]);
            }
        }
        lines = squashedLines;
        
        //indent the lines
        var depthStr = '', indent = '&nbsp;&nbsp;';
        for(var c = 0; c < lines.length; c++) {
            //if we hit a closing tag, decrease the depth immediately so it lines up with the parent tag
            if(lines[c].indexOf('&lt;/') === 0) {
                depthStr = depthStr.substring(0, depthStr.length-indent.length);
            }
            
            lines[c] = depthStr+lines[c];
            
            
            //if we do not contain a closing tag at all, then increment the depth because there is content inside of this node
            if(lines[c].indexOf('&lt;/') < 0) {
                depthStr += indent;
            }
        }
        
        return lines;
    }
    
    function hasError(error) {
        return function(view, html) {
            return view.errors.join(',').indexOf(view.errorMessages[error]) >= 0;
        }
    }
    
    function escape(str) {
        if(str) {
            str = str.toString().replace(/>/g, '&gt;').replace(/</g, '&lt;');
        }
        return str || '';
    }
    
    function runView(key, views, prefix) {
        if(key === 'subdirectory') return;
        
        var name = prefix+key, data = {}, expectedResult, successFunction;
        if(typeof views[key] === 'string') {
            expectedResult = views[key];
        } else {
            data = views[key].data || data;
            expectedResult = views[key].expectedOutput;
            successFunction = views[key].successFunction;
        }
        
        var view, html='';
        try {
            view = $.Views.get('tests/'+name);
            view.compile();
            html = view.render(data, {'$w': $w});
            var success = html === expectedResult;
            if(success && successFunction) {
                success = successFunction(view, html);
            } else {
                success = success && view.errors.length === 0;
            }
            allPassed = allPassed && success;
            return {name: name, result: html, expectedResult: expectedResult, success: success, errors: view.errors, compiledView: view.debugStr, view: view, data: data};
        } catch (e) {
            allPassed = false;
            return {name: name, exception: e, result: html, expectedResult: expectedResult, success: false, errors: view.errors, compiledView: view.debugStr};
        }
    }
    
    function doLoop(views, prefix) {
        for(var key in views) {
            if(views[key].subdirectory) {
                doLoop(views[key], prefix+key+'/')
            } else {
                var result = runView(key, views, prefix);
                if(result) {
                    results.push(result);
                }
            }
        }
    }
    
    doLoop(views, '');
    
    for(var c = 0; c < results.length; c++) {
        var result = results[c];
        result.result = escape(result.result);
        result.expectedResult = escape(result.expectedResult);
        result.compiledView = escape(result.compiledView);
        /*for(var d = 0; d < result.errors.length; d++) {
            result.errors[d] = escape(result.errors[d]);
        }*/
        
        if(result.success) {
            result.result = format(result.result);
            result.expectedResult = format(result.expectedResult);
        } else {
            result.result = formatError(result.result);
            result.expectedResult = formatError(result.expectedResult);
            
            var d, e;
            for(d = 0; d < result.result.length && d < result.expectedResult.length; d++) {
                if(result.result[d] !== result.expectedResult[d]) {
                    result.result[d] = '<span class="hamlTestLineError">'+result.result[d]+'</span>';
                    result.expectedResult[d] = '<span class="hamlTestLineError">'+result.expectedResult[d]+'</span>';
                }
            }
            e = d;
            
            for(; d < result.result.length; d++) {
                result.result[d] = '<span class="hamlTestLineError">'+result.result[d]+'</span>';
            }
            for(; e < result.expectedResult.length; e++) {
                result.expectedResult[e] = '<span class="hamlTestLineError">'+result.expectedResult[e]+'</span>';
            }
            
            result.result = result.result.join('<br />');
            result.expectedResult = result.expectedResult.join('<br />');
        }
    }
    
    if(allPassed) {
        var runs = 200;
        for(var c = 0; c < results.length; c++) {
            var result = results[c];
            var start = new Date();
            for(var d = 0; d < runs; d++) {
                result.view.compile(true);
            }
            var end = new Date();
            result.compileTime = end - start;
            
            start = new Date();
            for(var d = 0; d < runs; d++) {
                result.view.render(result.data, {'$w': $w});
            }
            end = new Date();
            result.renderTime = end - start;
        }
    }
    
    $('body').append($.Views.render('tests/output', {
        results: results,
        format: format,
        formatError: formatError
    }));
})(jQuery);