let cc = -1
let nextUUID = () => ++cc
let unregistered = []
let registered = []
let funcs = {}
let refs = []
let rdoc = null
let pdoc = null

const UberGoober = {
    create(doc) {
        let root = document.createElement("div")

        pdoc = customProcessTopLayerGoofData(doc)
        rdoc = customGenerateMarkup(pdoc, '')

        root.innerHTML = rdoc
        document.body.appendChild(root)

        bindLayer(pdoc)
    },

    register(func) {
        if (unregistered.includes(func.name)) {
            funcs[func.name] = func
        }

        if (!registered.includes(func.name) && unregistered.includes(func.name)) {
            registered.push(func.name)
        }

        if (registered.length === unregistered.length) {
            onAllRegistered()
        }
    }
}

function onAllRegistered() {
    let data = {}

    for (const ref of refs) {
        const f = funcs[ref.goober_meta$name]
        data[ref.goober_meta$id] = state => f(ref.goober_meta$props, state)
    }

    deploy(data)
}


function bindLayer(layer) {
    for (const [_, elem] of Object.entries(layer)) {
        bindElement(elem)
    }
}

function bindElement(elem) {
    elem.events ??= {}
    for (const ek in elem.events) {
        const ev = elem.events[ek]
        document.getElementById(elem.goober_meta$id).addEventListener(ek, ev)
    }

    elem.css ??= {}
    for (const ck in elem.css) {
        const cv = elem.css[ck]
        document.getElementById(elem.goober_meta$id).style.setProperty(ck, cv)
    }
}

function deploy(config) {
    let data = []

    for (const id in config) {
        data.push([config[id], 'singleRender', id])
    }

    // @ts-ignore
    let res = goof('componentGroup', data)

    for (const fn of res) {
        fn()
    }
}


function customMarkupcontent(content) {
    return customGenerateMarkup(customProcessTopLayerGoofData(content), '')
}


function customProcessTopLayerGoofData(data) {
    let result = {}

    for (const [key, value] of Object.entries(data)) {
        if (key[0] === key[0].toUpperCase()) {
            result['$' + key] = {
                goober_meta$props: { ...value },
                goober_meta$func: null,
                goober_meta$name: key.substring(0, key.indexOf('_')),
                goober_meta$id: `goober-${nextUUID()}`
            }

            if (!unregistered.includes(key.substring(0, key.indexOf('_')))) {
                unregistered.push(key.substring(0, key.indexOf('_')))
            }

            refs.push(result['$' + key])
        } else {
            result[key] = customProcessGoofData(value)
        }

    }

    return result
}

function customProcessGoofData(igd) {
    let gd

    if (igd === null) {
        return igd
    } else {
        gd = igd
    }

    if (typeof gd === 'string') {
        return {
            attr: {},
            css: {},
            events: {},
            field: gd
        }
    }

    let result = {
        attr: {},
        css: {},
        events: {},
        content: {}
    }

    if (Object.keys(gd).includes("field"))
        result.field = gd.field

    result.attr = { ...(gd.attr ?? {}) }
    for (const [k, v] of Object.entries(gd)) {
        if (k.startsWith("attr_") && k.length > 5)
            result.attr[k.substring(5)] = v
    }

    result.css = { ...(gd.css ?? {}) }
    for (const [k, v] of Object.entries(gd)) {
        if (k.startsWith("css_") && k.length > 4)
            result.css[k.substring(4)] = v
    }

    result.markers = { ...(gd.markers ?? {}) }
    for (const [k, v] of Object.entries(gd)) {
        if (k.startsWith("mark_") && k.length > 5)
            result.markers[k.substring(5)] = v
    }

    result.events = { ...(gd.events ?? {}) }
    for (const [k, v] of Object.entries(gd)) {
        if (k.startsWith("events_") && k.length > 7)
            result.events[k.substring(7)] = v
    }

    if (!Object.keys(gd).includes("field")) {
        result.content ??= {}
        for (const [k, v] of Object.entries(gd)) {
            if (!(
                k.startsWith('events')
                || k.startsWith('css')
                || k.startsWith('attr')
                || k.startsWith('field')
                || k.startsWith('content')
                || k.startsWith('mark')
            )) {
                if (k[0].toUpperCase() === k[0]) {
                    result.content['$' + k] = {
                        goober_meta$props: { ...v },
                        goober_meta$func: null,
                        goober_meta$name: k.substring(0, k.indexOf('_')),
                        goober_meta$id: `goober-${nextUUID()}`
                    }

                    if (!unregistered.includes(k.substring(0, k.indexOf('_')))) {
                        unregistered.push(k.substring(0, k.indexOf('_')))
                    }

                    refs.push(result.content['$' + k])
                } else {
                    result.content[k] = typeof v === 'string' ? customProcessGoofData({ field: v }) : customProcessGoofData(v)
                }
            }
        }
    }

    if (Object.keys(gd).includes('content')) {
        result.content = gd
    }

    if (Object.keys(result.content).length === 0) {
        delete result.content
    }

    result.goober_meta$id ??= `goober-${nextUUID()}`

    return result
}

function customGenerateMarkup(object, scope) {
    let markup = []

    for (let [key, data] of Object.entries(object)) {
        if (key.startsWith('$')) {
            markup.push(`<div id="${data.goober_meta$id}"></div>`)

            continue
        }

        const tag = key.slice(0, key.indexOf('_'))

        let attributes = Object.entries(data.attr).map(([attrKey, attrVal]) => `${attrKey}="${attrVal}"`).join(" ") + ` id="${ data.goober_meta$id }"`

        let data2 = ""

        for (const [dk, dv] of Object.entries(data.markers)) {
            data2 += ` data-${dk}`
            if (dv !== null) {
                throw new Error("oi data must be null :(((")
            }
        }

        data2 += " "


        let content = Object.keys(data).includes("content") ? customGenerateMarkup(data.content, scope + '  ') : Object.keys(data).includes("field") ? data.field : ""

        const result = `<${ tag }${ attributes.length !== 0 ? ' ' : '' }${ attributes }${ data2 }>\n${ scope + '  ' }${ content }\n${ scope }</${ tag }>`

        markup.push(result)
    }

    return markup.join("\n")
}
