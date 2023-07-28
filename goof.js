const authkey = [
    Math.floor(Math.random() * 250000),
    Math.floor(Math.random() * 250000),
    Math.floor(Math.random() * 250000),
    Math.floor(Math.random() * 250000),
    Math.floor(Math.random() * 250000),
]

function markupcontent(object) {
    return generateMarkup(processTopLayerGoofData(object), '')
}
function processTopLayerGoofData(data) {
    let result = {}

    for (const [key, value] of Object.entries(data)) {
        if (key !== "ohm_meta$id") {
            result[key] = processGoofData(value)
        } else {
            result[key] = value
        }
    }

    return result
}

function processGoofData(igd) {
    let gd

    if (igd === null) {
        return igd
    } else {
        gd = igd
    }

    if (typeof gd === "function") {
        return gd
    }

    if (typeof gd === "string") {
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

    result.markers = { ...(gd.markers ?? {}) }
    for (const [k, v] of Object.entries(gd)) {
        if (k.startsWith("mark_") && k.length > 5)
            result.markers[k.substring(5)] = v
    }

    result.css = { ...(gd.css ?? {}) }
    for (const [k, v] of Object.entries(gd)) {
        if (k.startsWith("css_") && k.length > 4)
            result.css[k.substring(4)] = v
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
                || k.startsWith('ohm_meta$id')
                || k.startsWith('mark')
            )) {
                result.content[k] = typeof v === 'string' ? processGoofData({field: v}) : processGoofData(v)
            }
        }
    }

    if (Object.keys(gd).includes('content')) {
        result.content = gd.content
    }

    if (Object.keys(result.content).length === 0) {
        delete result.content
    }

    result.ohm_meta$id = gd.ohm_meta$id

    return result
}

function generateMarkup(object, scope) {
    let markup = []

    for (const [key, data] of Object.entries(object)) {
        const tag = key.slice(0, key.indexOf('_'))
        let attributes = Object.entries(data.attr).map(([attrKey, attrVal]) => `${attrKey}="${attrVal}"`).join(" ") + ` id="${data.ohm_meta$id(authkey)}"`

        let data2 = ""

        for (const [dk, dv] of Object.entries(data.markers)) {
            data2 += ` data-${dk}`
            if (dv !== null) {
                throw new Error("oi data must be null :(((")
            }
        }

        data2 += " "

        let content = Object.keys(data).includes("content") && !(Object.keys(data.content).includes("ohm_meta$id")) ? generateMarkup(data.content, scope + '  ') : Object.keys(data).includes("field") ? data.field : ""

        const result = `<${ tag }${ attributes.length !== 0 ? ' ' : '' }${ attributes }${ data2 }>\n${ scope + '  ' }${ content }\n${ scope }</${ tag }>`

        markup.push(result)
    }

    return markup.join("\n")
}



// creates a new observable starting with the initial value
function observable(init) {
  let current = init
  let subscribers = []
  const res = () => current

  // changes the value stored by the mutator function
  res.mutate = (mutator) => {
    current = mutator(current)
    for (const sub of subscribers) {
      sub(current)
    }
  }

  // creates a listener for changes
  res.subscribe = (sub) => {
    subscribers.push(sub)
  }

  // attaches a signal from the current observable to the targetId
  res.attach = (targetId, preprocessor) => {
    subscribers.push(value => {
      document.getElementById(targetId).innerHTML = preprocessor(value)
    })
  }


  return res
}



observable.join = (observables, preprocessor) => {
  let current = preprocessor(observables.map(obs => obs()))

  for (const obs of observables) {
    obs.subscribe(c => {
      current = preprocessor(observables.map(obs2 => obs2()))
      for (const sub of subscribers) {
        sub(current)
      }
    })
  }

  let func = () => current
  let subscribers = []

  func.subscribe = sub => {
    subscribers.push(sub)
  }

  func.attach = (targetId, preprocessor) => {
    subscribers.push(value => {
      document.getElementById(targetId).innerHTML = preprocessor(value)
    })
  }

  return func
}



observable.pipe = (obs, preprocessor) => {
    let current = preprocessor(obs())

    let subs = []

    obs.subscribe(c => {
        current = preprocessor(c)

        for (const sub of subs) {
            sub(current)
        }
    })

    let func = () => current

    func.subscribe = (sub) => {
        subs.push(sub)
    }

    func.attach = (targetId, preprocessor) => {
        subs.push(value => {
            document.getElementById(targetId).innerHTML = preprocessor(value)
        })
    }

    return func
}










//returns the value passed in as a string
function str(val) { return `${val}` }

/*
* -- Takes in 2 parameters, rtype and config, and returns an object of goof.js context functions.
* rtype is a string of either 'functionGroup' or 'componentGroup'.
*
*      - If rtype is the former, the return value is `[ renderers, getters, mutators ]`.
*
*
*      - If it is the latter, the return value is `[ ...[renderer, getter, mutator] ]`, grouped by the component each is attached to.
*
*
*      - For example, goof`('componentGroup', [ [bar, 'multiRender', 'baz'] ])` returns `[ [renderBar, getBar, mutateBar] ]`.
*
* - CSS api attributes are only available on singleRender and post-mount root configuration is only available on multiRender.
* - renderIf only works for multiRender components
*/
function goof(rtype, config) {
    function genUUID() {
        let current = 0
        return () => current++
    }

    function ohm(rootID) {
        return {
            dom: {},

            load(obj) {
                this.dom = obj
                this.update()
                return this
            },

            use(obj) {
                let attributes = {}

                attributes.id = obj.ohm_meta$id(authkey)

                if (Object.keys(obj).includes('attr')) {
                    for (const [k, v] of Object.entries(obj.attr)) {
                        if (k === 'class')
                            continue

                        attributes[k] = v
                    }
                }

                attributes.class = [...document.getElementById(attributes.id).classList]

                return {
                    elem: document.getElementById(obj.ohm_meta$id(authkey)),
                    attr: attributes,
                    base: obj,

                    update() {
                        let nbase = this.base

                        if (Object.keys(nbase).includes('content'))
                            this.elem.innerHTML = markupcontent(nbase.content)
                        else if (Object.keys(nbase).includes('field'))
                            this.elem.innerText = nbase.field
                    }
                }
            },

            update() {
                let root = document.getElementById(rootID)
                let str = ''

                str = markupcontent(this.dom)

                root.innerHTML = str
            }
        }
    }

    let data = {}

    data.addEntry = (id, payload) => {
        const [func, type, root] =
            typeof payload[0] !== 'string'
                ? [payload[0], payload[1], payload.length === 3 ? payload[2] : '{no root}']
                : [payload[1][0], payload[1][1], '{no root}']

        let lock = false

        data[id] = {
            isLocked() {
                return lock
            },

            lock(auth) {
                if (auth === authkey)
                    lock = true
            },

            unlock(auth) {
                if (auth === authkey)
                    lock = false
            }
        }

        data[id].initialized = false

        data[id].accessModifiers = {}

        data[id].rootAttributes = {}

        data[id].currentRender = 0

        data[id].hasChanged = {}
        data[id].accessed = []

        data[id].renderType = type

        data[id].func = func

        data[id].root = root
        data[id].domHook = ohm(root)

        data[id].instances = {}

        data[id].postRender = []

        data[id].render = () => {}

        data[id].id = id

        data[id].$getElement = (key) => {
            if (!data[id].accessed.includes(key) && Object.keys(data[id].state).includes(key)) {
                data[id].accessed.push(key)
                return data[id].state[key]
            } else {
                return null
            }
        }

        data[id].state = {}
        data[id].getPassableState = () => {
            let res = {
                //applies the newState object to the state object accessed via the return value.
                define(newState) {
                    if (!data[id].initialized) {
                        data[id].initialized = true
                        let temp = {}

                        for (const [key, val] of Object.entries(newState)) {
                            let field = val
                            Object.defineProperty(temp, key, {
                                configurable: false,

                                get() {
                                    return field
                                },

                                set(newvalue) {
                                    field = newvalue
                                    data[id].render()
                                }
                            })
                        }

                        data[id].state = temp
                    }

                    return data[id].state
                },

                //executes the passed in function only on the first render
                onInit(fn) {
                    if (data[id].currentRender === 0)
                        fn()
                },

                //executes the passed in function only on the render number passed in, e.g. onRender(1, ...) executes on initialization
                onRender(num, fn) {
                    if (data[id].currentRender === num)
                        fn()
                },

                //executes the passed in function on every render number passed in
                onRenders(numArr, fn) {
                    for (const num of numArr)
                        if (data[id].currentRender === num)
                            fn()
                },

                //executes the passed in function on any render number matching the predicate function
                onRenderBy(numPredicate, fn) {
                    if (numPredicate(data[id].currentRender))
                        fn()
                },

                //executes a function passed in that takes the current render as an argument
                withRender(fn) {
                    fn(data[id].currentRender)
                },

                //executes the passed in function when the element matching elem is changed in the state object. The function takes in the new value as a parameter
                onChange(elem, fn) {
                    if (Object.keys(data[id].hasChanged).includes(elem)) {
                        fn(data[id].state[elem])
                        data[id].hasChanged[elem] = false
                    }
                },

                //performs domHook.use() on the obj parameter, allowing access to the underlying vdom implementation and direct dom access.
                useHook(obj) {
                    return data[id].domHook.use(obj)
                },

                //executes the passed in function after the rendering of the main function, with the callback taking in the main functions return value as a parameter
                usePostRender(fn) {
                    data[id].postRender.push(fn)
                },

                //applies the attributes object to the root element in the dom on initialization.
                configureRoot(attributes) {
                    if (data[id].currentRender === 0)
                        data[id].rootAttributes = attributes
                },

                //applies the attributes object to the root element in the dom, editing existing attributes and adding new ones. Only works on mount in single render components.
                accessRoot(attributes) {
                    for (const [aKey, attr] of Object.entries(attributes))
                        data[id].rootAttributes[aKey] = attr
                },

                //returns the second arg only if the first is true, else showing '{}'
                show(bool, obj) {
                    return bool ? obj : {}
                }
            }

            return res
        }
    }

    const nextUUID = genUUID()

    for (const entry of config) {
        const [id, payload] = [str(nextUUID()), entry]

        data.addEntry(id, payload)
    }

    let api = {
        $_renderers: [],
    }

    for (const [name, object] of Object.entries(data)) {
        if (name === 'addEntry') continue

        const rendfn = (...muts) => {
            while (object.isLocked()) {}

            const mutator = muts.length === 1 ? muts[0] : {}

            for (const [mKey, mVal] of Object.entries(mutator))
                if (object.accessModifiers[mKey] !== 'closed' && object.accessModifiers[mKey] !== 'private')
                    if (Object.keys(object.state).includes(mKey)) {
                        object.state[mKey] = mVal(object.state[mKey])
                        object.hasChanged[mKey] = true
                    }

            let rendered

            object.lock(authkey)

            object.accessed = []
            object.postRender = []

            rendered = object.func(object.getPassableState())
            rendered = processTopLayerGoofData(rendered)

            function addID(obj, dom) {
                for (let [key, elem] of Object.entries(obj)) {
                    if (elem === null) continue

                    typeof elem === 'string' ? obj[key] = { field: elem } : (() => {})()
                    typeof elem === 'string' ? elem = obj[key] : (() => {})()

                    elem.ohm_meta$id = dom[key].ohm_meta$id

                    if (Object.keys(elem).includes('content')) {
                        addID(elem.content, dom[key].content)

                        if (JSON.stringify(elem.content) !== JSON.stringify(dom[key].content)) {
                            dom[key].content = elem.content
                        }
                    }
                }
            }


            function createIDs(obj) {
                for (let [key, elem] of Object.entries(obj)) {
                    if (elem === null) continue

                    typeof elem === 'string' ? obj[key] = { field: elem } : (() => {})()
                    typeof elem === 'string' ? elem = obj[key] : (() => {})()

                    let _id = nextUUID()
                    elem.ohm_meta$id = (authattempt) => {
                        if (authattempt === authkey) {
                            return `goof-${_id}`
                        }
                    }

                    if (Object.keys(elem).includes('content')) {
                        createIDs(elem.content)
                    }
                }
            }

            if (object.renderType === 'multiRender' || (object.renderType === 'singleRender' && object.currentRender === 0)) {
                for (const [aKey, attr] of Object.entries(object.rootAttributes)) {
                    document.getElementById(object.root).setAttribute(aKey, `${attr}`)
                }

                createIDs(rendered)
                object.domHook.load(rendered)


                function updateEvents(obj) {
                    for (const [_, elem] of Object.entries(obj)) {
                        if (Object.keys(elem).includes('events')) {
                            for (const [prop, val] of Object.entries(elem.events)) {
                                const hook = object.domHook.use(elem)

                                hook.elem.setAttribute(`goof_meta-ev_listen-${prop}`, `true`)
                                hook.elem.addEventListener(prop, val)
                            }
                        }


                        if (Object.keys(elem).includes('content')) {
                            updateEvents(elem.content)
                        }
                    }
                }

                updateEvents(rendered)
            } else if (object.renderType === 'singleRender') {
                function normalize(obj, scope) {
                    for (const [k, v] of Object.entries(obj)) {
                        typeof v === 'string' ? obj[k] = { field: v } : (() => {})()

                        if (
                            !Object.keys(obj[k]).includes('content') && !Object.keys(obj[k]).includes('field') &&
                            !Object.keys(obj[k]).includes('attr') && !Object.keys(obj[k]).includes('css') &&
                            (Object.keys(obj[k]).includes('ohm_meta$id') && Object.keys(obj[k]).length > 1 || !Object.keys(obj[k]).includes('ohm_meta$id') && Object.keys(obj[k]).length > 0)
                        ) {
                            obj[k] = { content: v }
                        }

                        if (Object.keys(obj[k]).includes('content')) {
                            normalize(obj[k].content, scope + 1)
                        }
                    }
                }

                function updateLayer(obj) {
                    for (const [_, elem] of Object.entries(obj)) {
                        if (elem === null) {
                            continue
                        }

                        if (Object.keys(elem).includes('attr')) {
                            for (const [aKey, attribute] of Object.entries(elem.attr)) {
                                object.domHook.use(elem).elem.setAttribute(aKey, `${attribute}`)
                            }
                        }

                        if (Object.keys(elem).includes('field')) {
                            object.domHook.use(elem).elem.innerText = elem.field
                        }

                        if (Object.keys(elem).includes('css')) {
                            for (const [prop, oVal] of Object.entries(elem.css)) {
                                let val = typeof oVal === 'string' ? [oVal] : oVal
                                object.domHook.use(elem).elem.style.setProperty(prop, val.join(' '))
                            }
                        }

                        if (Object.keys(elem).includes('events')) {
                            for (const [prop, val] of Object.entries(elem.events)) {
                                const hook = object.domHook.use(elem)
                                if (!hook.elem.hasAttribute(`goof_meta-ev_listen-${prop}`)) {
                                    hook.elem.setAttribute(`goof_meta-ev_listen-${prop}`, `true`)
                                    hook.elem.addEventListener(prop, val)
                                }
                            }
                        }

                        if (Object.keys(elem).includes('content')) {
                            updateLayer(elem.content)
                        }
                    }
                }

                normalize(rendered, 0)

                addID(rendered, object.domHook.dom)
                updateLayer(rendered, true)
            }

            object.unlock(authkey)

            for (const fn of object.postRender) {
                fn(rendered)
            }

            object.currentRender++
        }

        object.render = rendfn
        api.$_renderers.push(rendfn)
    }

    return api.$_renderers
}
