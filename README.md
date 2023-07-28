# UberGoober.js
A zero dependency, vanilla JS framework

`UberGoober.create({
    span_0: 'hello, world!'
})`

Here is a very simple web application written in UberGoober.js.
The call to UberGoober.create will render the input as HTML, create a root div to store it in, and mount it to the dom.
This can be expanded on with containers:

`UberGoober.create({
    div_0: {
        span_0: 'nested span woah'
    }
})`

The UberGoober call will create the following HTML in the dom:

<code><div id='goober-1'>
    <span id='goober-0'>
        'nested span woah'
    </span>
</div></code>

Of course, you may want to add attributes to an element, which can be done with the following syntax:

`UberGoober.create({
    a_0: {
       attr_href: '...' 
    }
})`

This syntax is very easy to follow, but can be repetitive if you want many attributes. For this, you can nest attributes (and all other properties):

UberGoober.create({
    div_0: {
        attr: {
            class: "gren",
            data-cool: "true"
        }
    }
})

Next, you can add text to an element with attributes like this:

`UberGoober.create({
    div_0: {
        field: 'hi mom',
    
        attr: {
            class: "gren",
            data-cool: "true"
        }
    }
})`

Or event handlers, as you would with attributes:

`UberGoober.create({
    div_0: {
        events_click: () => console.log('clicked')
    
        attr: {
            class: "gren",
            data-cool: "true"
        }
    }
})`

And even dynamically rendered CSS:

`UberGoober.create({
    div_0: {
        css_width: "50px",
        
        attr: {
            class: "gren",
            data-cool: "true"
        }
    }
})`

All of these features, directly contained inside your JS files, enable you to write terse and incredibly readable markup inside of your scripts *without a compiler*.
Of course, the lack of compilation and dependencies means UberGoober has a runtime, which can drastically slow down your code.

