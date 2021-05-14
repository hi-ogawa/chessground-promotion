(function () {
	'use strict';

	function Vnode$1(tag, key, attrs, children, text, dom) {
		return {tag: tag, key: key, attrs: attrs, children: children, text: text, dom: dom, domSize: undefined, state: undefined, events: undefined, instance: undefined}
	}
	Vnode$1.normalize = function(node) {
		if (Array.isArray(node)) return Vnode$1("[", undefined, undefined, Vnode$1.normalizeChildren(node), undefined, undefined)
		if (node == null || typeof node === "boolean") return null
		if (typeof node === "object") return node
		return Vnode$1("#", undefined, undefined, String(node), undefined, undefined)
	};
	Vnode$1.normalizeChildren = function(input) {
		var children = [];
		if (input.length) {
			var isKeyed = input[0] != null && input[0].key != null;
			// Note: this is a *very* perf-sensitive check.
			// Fun fact: merging the loop like this is somehow faster than splitting
			// it, noticeably so.
			for (var i = 1; i < input.length; i++) {
				if ((input[i] != null && input[i].key != null) !== isKeyed) {
					throw new TypeError("Vnodes must either always have keys or never have keys!")
				}
			}
			for (var i = 0; i < input.length; i++) {
				children[i] = Vnode$1.normalize(input[i]);
			}
		}
		return children
	};

	var vnode$1 = Vnode$1;

	// Call via `hyperscriptVnode.apply(startOffset, arguments)`
	//
	// The reason I do it this way, forwarding the arguments and passing the start
	// offset in `this`, is so I don't have to create a temporary array in a
	// performance-critical path.
	//
	// In native ES6, I'd instead add a final `...args` parameter to the
	// `hyperscript` and `fragment` factories and define this as
	// `hyperscriptVnode(...args)`, since modern engines do optimize that away. But
	// ES5 (what Mithril requires thanks to IE support) doesn't give me that luxury,
	// and engines aren't nearly intelligent enough to do either of these:
	//
	// 1. Elide the allocation for `[].slice.call(arguments, 1)` when it's passed to
	//    another function only to be indexed.
	// 2. Elide an `arguments` allocation when it's passed to any function other
	//    than `Function.prototype.apply` or `Reflect.apply`.
	//
	// In ES6, it'd probably look closer to this (I'd need to profile it, though):
	// module.exports = function(attrs, ...children) {
	//     if (attrs == null || typeof attrs === "object" && attrs.tag == null && !Array.isArray(attrs)) {
	//         if (children.length === 1 && Array.isArray(children[0])) children = children[0]
	//     } else {
	//         children = children.length === 0 && Array.isArray(attrs) ? attrs : [attrs, ...children]
	//         attrs = undefined
	//     }
	//
	//     if (attrs == null) attrs = {}
	//     return Vnode("", attrs.key, attrs, children)
	// }
	var hyperscriptVnode$1 = function() {
		var attrs = arguments[this], start = this + 1, children;

		if (attrs == null) {
			attrs = {};
		} else if (typeof attrs !== "object" || attrs.tag != null || Array.isArray(attrs)) {
			attrs = {};
			start = this;
		}

		if (arguments.length === start + 1) {
			children = arguments[start];
			if (!Array.isArray(children)) children = [children];
		} else {
			children = [];
			while (start < arguments.length) children.push(arguments[start++]);
		}

		return vnode$1("", attrs.key, attrs, children)
	};

	var selectorParser$1 = /(?:(^|#|\.)([^#\.\[\]]+))|(\[(.+?)(?:\s*=\s*("|'|)((?:\\["'\]]|.)*?)\5)?\])/g;
	var selectorCache$1 = {};
	var hasOwn$1 = {}.hasOwnProperty;

	function isEmpty$1(object) {
		for (var key in object) if (hasOwn$1.call(object, key)) return false
		return true
	}

	function compileSelector$1(selector) {
		var match, tag = "div", classes = [], attrs = {};
		while (match = selectorParser$1.exec(selector)) {
			var type = match[1], value = match[2];
			if (type === "" && value !== "") tag = value;
			else if (type === "#") attrs.id = value;
			else if (type === ".") classes.push(value);
			else if (match[3][0] === "[") {
				var attrValue = match[6];
				if (attrValue) attrValue = attrValue.replace(/\\(["'])/g, "$1").replace(/\\\\/g, "\\");
				if (match[4] === "class") classes.push(attrValue);
				else attrs[match[4]] = attrValue === "" ? attrValue : attrValue || true;
			}
		}
		if (classes.length > 0) attrs.className = classes.join(" ");
		return selectorCache$1[selector] = {tag: tag, attrs: attrs}
	}

	function execSelector$1(state, vnode) {
		var attrs = vnode.attrs;
		var children = vnode$1.normalizeChildren(vnode.children);
		var hasClass = hasOwn$1.call(attrs, "class");
		var className = hasClass ? attrs.class : attrs.className;

		vnode.tag = state.tag;
		vnode.attrs = null;
		vnode.children = undefined;

		if (!isEmpty$1(state.attrs) && !isEmpty$1(attrs)) {
			var newAttrs = {};

			for (var key in attrs) {
				if (hasOwn$1.call(attrs, key)) newAttrs[key] = attrs[key];
			}

			attrs = newAttrs;
		}

		for (var key in state.attrs) {
			if (hasOwn$1.call(state.attrs, key) && key !== "className" && !hasOwn$1.call(attrs, key)){
				attrs[key] = state.attrs[key];
			}
		}
		if (className != null || state.attrs.className != null) attrs.className =
			className != null
				? state.attrs.className != null
					? String(state.attrs.className) + " " + String(className)
					: className
				: state.attrs.className != null
					? state.attrs.className
					: null;

		if (hasClass) attrs.class = null;

		for (var key in attrs) {
			if (hasOwn$1.call(attrs, key) && key !== "key") {
				vnode.attrs = attrs;
				break
			}
		}

		if (Array.isArray(children) && children.length === 1 && children[0] != null && children[0].tag === "#") {
			vnode.text = children[0].children;
		} else {
			vnode.children = children;
		}

		return vnode
	}

	function hyperscript$1(selector) {
		if (selector == null || typeof selector !== "string" && typeof selector !== "function" && typeof selector.view !== "function") {
			throw Error("The selector must be either a string or a component.");
		}

		var vnode = hyperscriptVnode$1.apply(1, arguments);

		if (typeof selector === "string") {
			vnode.children = vnode$1.normalizeChildren(vnode.children);
			if (selector !== "[") return execSelector$1(selectorCache$1[selector] || compileSelector$1(selector), vnode)
		}

		vnode.tag = selector;
		return vnode
	}

	var hyperscript_1$3 = hyperscript$1;

	var trust$1 = function(html) {
		if (html == null) html = "";
		return vnode$1("<", undefined, undefined, html, undefined, undefined)
	};

	var fragment$1 = function() {
		var vnode = hyperscriptVnode$1.apply(0, arguments);

		vnode.tag = "[";
		vnode.children = vnode$1.normalizeChildren(vnode.children);
		return vnode
	};

	hyperscript_1$3.trust = trust$1;
	hyperscript_1$3.fragment = fragment$1;

	var hyperscript_1$2 = hyperscript_1$3;

	var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

	function getAugmentedNamespace(n) {
		if (n.__esModule) return n;
		var a = Object.defineProperty({}, '__esModule', {value: true});
		Object.keys(n).forEach(function (k) {
			var d = Object.getOwnPropertyDescriptor(n, k);
			Object.defineProperty(a, k, d.get ? d : {
				enumerable: true,
				get: function () {
					return n[k];
				}
			});
		});
		return a;
	}

	function createCommonjsModule(fn) {
	  var module = { exports: {} };
		return fn(module, module.exports), module.exports;
	}

	/** @constructor */
	var PromisePolyfill$1 = function(executor) {
		if (!(this instanceof PromisePolyfill$1)) throw new Error("Promise must be called with `new`")
		if (typeof executor !== "function") throw new TypeError("executor must be a function")

		var self = this, resolvers = [], rejectors = [], resolveCurrent = handler(resolvers, true), rejectCurrent = handler(rejectors, false);
		var instance = self._instance = {resolvers: resolvers, rejectors: rejectors};
		var callAsync = typeof setImmediate === "function" ? setImmediate : setTimeout;
		function handler(list, shouldAbsorb) {
			return function execute(value) {
				var then;
				try {
					if (shouldAbsorb && value != null && (typeof value === "object" || typeof value === "function") && typeof (then = value.then) === "function") {
						if (value === self) throw new TypeError("Promise can't be resolved w/ itself")
						executeOnce(then.bind(value));
					}
					else {
						callAsync(function() {
							if (!shouldAbsorb && list.length === 0) console.error("Possible unhandled promise rejection:", value);
							for (var i = 0; i < list.length; i++) list[i](value);
							resolvers.length = 0, rejectors.length = 0;
							instance.state = shouldAbsorb;
							instance.retry = function() {execute(value);};
						});
					}
				}
				catch (e) {
					rejectCurrent(e);
				}
			}
		}
		function executeOnce(then) {
			var runs = 0;
			function run(fn) {
				return function(value) {
					if (runs++ > 0) return
					fn(value);
				}
			}
			var onerror = run(rejectCurrent);
			try {then(run(resolveCurrent), onerror);} catch (e) {onerror(e);}
		}

		executeOnce(executor);
	};
	PromisePolyfill$1.prototype.then = function(onFulfilled, onRejection) {
		var self = this, instance = self._instance;
		function handle(callback, list, next, state) {
			list.push(function(value) {
				if (typeof callback !== "function") next(value);
				else try {resolveNext(callback(value));} catch (e) {if (rejectNext) rejectNext(e);}
			});
			if (typeof instance.retry === "function" && state === instance.state) instance.retry();
		}
		var resolveNext, rejectNext;
		var promise = new PromisePolyfill$1(function(resolve, reject) {resolveNext = resolve, rejectNext = reject;});
		handle(onFulfilled, instance.resolvers, resolveNext, true), handle(onRejection, instance.rejectors, rejectNext, false);
		return promise
	};
	PromisePolyfill$1.prototype.catch = function(onRejection) {
		return this.then(null, onRejection)
	};
	PromisePolyfill$1.prototype.finally = function(callback) {
		return this.then(
			function(value) {
				return PromisePolyfill$1.resolve(callback()).then(function() {
					return value
				})
			},
			function(reason) {
				return PromisePolyfill$1.resolve(callback()).then(function() {
					return PromisePolyfill$1.reject(reason);
				})
			}
		)
	};
	PromisePolyfill$1.resolve = function(value) {
		if (value instanceof PromisePolyfill$1) return value
		return new PromisePolyfill$1(function(resolve) {resolve(value);})
	};
	PromisePolyfill$1.reject = function(value) {
		return new PromisePolyfill$1(function(resolve, reject) {reject(value);})
	};
	PromisePolyfill$1.all = function(list) {
		return new PromisePolyfill$1(function(resolve, reject) {
			var total = list.length, count = 0, values = [];
			if (list.length === 0) resolve([]);
			else for (var i = 0; i < list.length; i++) {
				(function(i) {
					function consume(value) {
						count++;
						values[i] = value;
						if (count === total) resolve(values);
					}
					if (list[i] != null && (typeof list[i] === "object" || typeof list[i] === "function") && typeof list[i].then === "function") {
						list[i].then(consume, reject);
					}
					else consume(list[i]);
				})(i);
			}
		})
	};
	PromisePolyfill$1.race = function(list) {
		return new PromisePolyfill$1(function(resolve, reject) {
			for (var i = 0; i < list.length; i++) {
				list[i].then(resolve, reject);
			}
		})
	};

	var polyfill$1 = PromisePolyfill$1;

	var promise$1 = createCommonjsModule(function (module) {



	if (typeof window !== "undefined") {
		if (typeof window.Promise === "undefined") {
			window.Promise = polyfill$1;
		} else if (!window.Promise.prototype.finally) {
			window.Promise.prototype.finally = polyfill$1.prototype.finally;
		}
		module.exports = window.Promise;
	} else if (typeof commonjsGlobal !== "undefined") {
		if (typeof commonjsGlobal.Promise === "undefined") {
			commonjsGlobal.Promise = polyfill$1;
		} else if (!commonjsGlobal.Promise.prototype.finally) {
			commonjsGlobal.Promise.prototype.finally = polyfill$1.prototype.finally;
		}
		module.exports = commonjsGlobal.Promise;
	} else {
		module.exports = polyfill$1;
	}
	});

	var render$3 = function($window) {
		var $doc = $window && $window.document;
		var currentRedraw;

		var nameSpace = {
			svg: "http://www.w3.org/2000/svg",
			math: "http://www.w3.org/1998/Math/MathML"
		};

		function getNameSpace(vnode) {
			return vnode.attrs && vnode.attrs.xmlns || nameSpace[vnode.tag]
		}

		//sanity check to discourage people from doing `vnode.state = ...`
		function checkState(vnode, original) {
			if (vnode.state !== original) throw new Error("`vnode.state` must not be modified")
		}

		//Note: the hook is passed as the `this` argument to allow proxying the
		//arguments without requiring a full array allocation to do so. It also
		//takes advantage of the fact the current `vnode` is the first argument in
		//all lifecycle methods.
		function callHook(vnode) {
			var original = vnode.state;
			try {
				return this.apply(original, arguments)
			} finally {
				checkState(vnode, original);
			}
		}

		// IE11 (at least) throws an UnspecifiedError when accessing document.activeElement when
		// inside an iframe. Catch and swallow this error, and heavy-handidly return null.
		function activeElement() {
			try {
				return $doc.activeElement
			} catch (e) {
				return null
			}
		}
		//create
		function createNodes(parent, vnodes, start, end, hooks, nextSibling, ns) {
			for (var i = start; i < end; i++) {
				var vnode = vnodes[i];
				if (vnode != null) {
					createNode(parent, vnode, hooks, ns, nextSibling);
				}
			}
		}
		function createNode(parent, vnode, hooks, ns, nextSibling) {
			var tag = vnode.tag;
			if (typeof tag === "string") {
				vnode.state = {};
				if (vnode.attrs != null) initLifecycle(vnode.attrs, vnode, hooks);
				switch (tag) {
					case "#": createText(parent, vnode, nextSibling); break
					case "<": createHTML(parent, vnode, ns, nextSibling); break
					case "[": createFragment(parent, vnode, hooks, ns, nextSibling); break
					default: createElement(parent, vnode, hooks, ns, nextSibling);
				}
			}
			else createComponent(parent, vnode, hooks, ns, nextSibling);
		}
		function createText(parent, vnode, nextSibling) {
			vnode.dom = $doc.createTextNode(vnode.children);
			insertNode(parent, vnode.dom, nextSibling);
		}
		var possibleParents = {caption: "table", thead: "table", tbody: "table", tfoot: "table", tr: "tbody", th: "tr", td: "tr", colgroup: "table", col: "colgroup"};
		function createHTML(parent, vnode, ns, nextSibling) {
			var match = vnode.children.match(/^\s*?<(\w+)/im) || [];
			// not using the proper parent makes the child element(s) vanish.
			//     var div = document.createElement("div")
			//     div.innerHTML = "<td>i</td><td>j</td>"
			//     console.log(div.innerHTML)
			// --> "ij", no <td> in sight.
			var temp = $doc.createElement(possibleParents[match[1]] || "div");
			if (ns === "http://www.w3.org/2000/svg") {
				temp.innerHTML = "<svg xmlns=\"http://www.w3.org/2000/svg\">" + vnode.children + "</svg>";
				temp = temp.firstChild;
			} else {
				temp.innerHTML = vnode.children;
			}
			vnode.dom = temp.firstChild;
			vnode.domSize = temp.childNodes.length;
			// Capture nodes to remove, so we don't confuse them.
			vnode.instance = [];
			var fragment = $doc.createDocumentFragment();
			var child;
			while (child = temp.firstChild) {
				vnode.instance.push(child);
				fragment.appendChild(child);
			}
			insertNode(parent, fragment, nextSibling);
		}
		function createFragment(parent, vnode, hooks, ns, nextSibling) {
			var fragment = $doc.createDocumentFragment();
			if (vnode.children != null) {
				var children = vnode.children;
				createNodes(fragment, children, 0, children.length, hooks, null, ns);
			}
			vnode.dom = fragment.firstChild;
			vnode.domSize = fragment.childNodes.length;
			insertNode(parent, fragment, nextSibling);
		}
		function createElement(parent, vnode, hooks, ns, nextSibling) {
			var tag = vnode.tag;
			var attrs = vnode.attrs;
			var is = attrs && attrs.is;

			ns = getNameSpace(vnode) || ns;

			var element = ns ?
				is ? $doc.createElementNS(ns, tag, {is: is}) : $doc.createElementNS(ns, tag) :
				is ? $doc.createElement(tag, {is: is}) : $doc.createElement(tag);
			vnode.dom = element;

			if (attrs != null) {
				setAttrs(vnode, attrs, ns);
			}

			insertNode(parent, element, nextSibling);

			if (!maybeSetContentEditable(vnode)) {
				if (vnode.text != null) {
					if (vnode.text !== "") element.textContent = vnode.text;
					else vnode.children = [vnode$1("#", undefined, undefined, vnode.text, undefined, undefined)];
				}
				if (vnode.children != null) {
					var children = vnode.children;
					createNodes(element, children, 0, children.length, hooks, null, ns);
					if (vnode.tag === "select" && attrs != null) setLateSelectAttrs(vnode, attrs);
				}
			}
		}
		function initComponent(vnode, hooks) {
			var sentinel;
			if (typeof vnode.tag.view === "function") {
				vnode.state = Object.create(vnode.tag);
				sentinel = vnode.state.view;
				if (sentinel.$$reentrantLock$$ != null) return
				sentinel.$$reentrantLock$$ = true;
			} else {
				vnode.state = void 0;
				sentinel = vnode.tag;
				if (sentinel.$$reentrantLock$$ != null) return
				sentinel.$$reentrantLock$$ = true;
				vnode.state = (vnode.tag.prototype != null && typeof vnode.tag.prototype.view === "function") ? new vnode.tag(vnode) : vnode.tag(vnode);
			}
			initLifecycle(vnode.state, vnode, hooks);
			if (vnode.attrs != null) initLifecycle(vnode.attrs, vnode, hooks);
			vnode.instance = vnode$1.normalize(callHook.call(vnode.state.view, vnode));
			if (vnode.instance === vnode) throw Error("A view cannot return the vnode it received as argument")
			sentinel.$$reentrantLock$$ = null;
		}
		function createComponent(parent, vnode, hooks, ns, nextSibling) {
			initComponent(vnode, hooks);
			if (vnode.instance != null) {
				createNode(parent, vnode.instance, hooks, ns, nextSibling);
				vnode.dom = vnode.instance.dom;
				vnode.domSize = vnode.dom != null ? vnode.instance.domSize : 0;
			}
			else {
				vnode.domSize = 0;
			}
		}

		//update
		/**
		 * @param {Element|Fragment} parent - the parent element
		 * @param {Vnode[] | null} old - the list of vnodes of the last `render()` call for
		 *                               this part of the tree
		 * @param {Vnode[] | null} vnodes - as above, but for the current `render()` call.
		 * @param {Function[]} hooks - an accumulator of post-render hooks (oncreate/onupdate)
		 * @param {Element | null} nextSibling - the next DOM node if we're dealing with a
		 *                                       fragment that is not the last item in its
		 *                                       parent
		 * @param {'svg' | 'math' | String | null} ns) - the current XML namespace, if any
		 * @returns void
		 */
		// This function diffs and patches lists of vnodes, both keyed and unkeyed.
		//
		// We will:
		//
		// 1. describe its general structure
		// 2. focus on the diff algorithm optimizations
		// 3. discuss DOM node operations.

		// ## Overview:
		//
		// The updateNodes() function:
		// - deals with trivial cases
		// - determines whether the lists are keyed or unkeyed based on the first non-null node
		//   of each list.
		// - diffs them and patches the DOM if needed (that's the brunt of the code)
		// - manages the leftovers: after diffing, are there:
		//   - old nodes left to remove?
		// 	 - new nodes to insert?
		// 	 deal with them!
		//
		// The lists are only iterated over once, with an exception for the nodes in `old` that
		// are visited in the fourth part of the diff and in the `removeNodes` loop.

		// ## Diffing
		//
		// Reading https://github.com/localvoid/ivi/blob/ddc09d06abaef45248e6133f7040d00d3c6be853/packages/ivi/src/vdom/implementation.ts#L617-L837
		// may be good for context on longest increasing subsequence-based logic for moving nodes.
		//
		// In order to diff keyed lists, one has to
		//
		// 1) match nodes in both lists, per key, and update them accordingly
		// 2) create the nodes present in the new list, but absent in the old one
		// 3) remove the nodes present in the old list, but absent in the new one
		// 4) figure out what nodes in 1) to move in order to minimize the DOM operations.
		//
		// To achieve 1) one can create a dictionary of keys => index (for the old list), then iterate
		// over the new list and for each new vnode, find the corresponding vnode in the old list using
		// the map.
		// 2) is achieved in the same step: if a new node has no corresponding entry in the map, it is new
		// and must be created.
		// For the removals, we actually remove the nodes that have been updated from the old list.
		// The nodes that remain in that list after 1) and 2) have been performed can be safely removed.
		// The fourth step is a bit more complex and relies on the longest increasing subsequence (LIS)
		// algorithm.
		//
		// the longest increasing subsequence is the list of nodes that can remain in place. Imagine going
		// from `1,2,3,4,5` to `4,5,1,2,3` where the numbers are not necessarily the keys, but the indices
		// corresponding to the keyed nodes in the old list (keyed nodes `e,d,c,b,a` => `b,a,e,d,c` would
		//  match the above lists, for example).
		//
		// In there are two increasing subsequences: `4,5` and `1,2,3`, the latter being the longest. We
		// can update those nodes without moving them, and only call `insertNode` on `4` and `5`.
		//
		// @localvoid adapted the algo to also support node deletions and insertions (the `lis` is actually
		// the longest increasing subsequence *of old nodes still present in the new list*).
		//
		// It is a general algorithm that is fireproof in all circumstances, but it requires the allocation
		// and the construction of a `key => oldIndex` map, and three arrays (one with `newIndex => oldIndex`,
		// the `LIS` and a temporary one to create the LIS).
		//
		// So we cheat where we can: if the tails of the lists are identical, they are guaranteed to be part of
		// the LIS and can be updated without moving them.
		//
		// If two nodes are swapped, they are guaranteed not to be part of the LIS, and must be moved (with
		// the exception of the last node if the list is fully reversed).
		//
		// ## Finding the next sibling.
		//
		// `updateNode()` and `createNode()` expect a nextSibling parameter to perform DOM operations.
		// When the list is being traversed top-down, at any index, the DOM nodes up to the previous
		// vnode reflect the content of the new list, whereas the rest of the DOM nodes reflect the old
		// list. The next sibling must be looked for in the old list using `getNextSibling(... oldStart + 1 ...)`.
		//
		// In the other scenarios (swaps, upwards traversal, map-based diff),
		// the new vnodes list is traversed upwards. The DOM nodes at the bottom of the list reflect the
		// bottom part of the new vnodes list, and we can use the `v.dom`  value of the previous node
		// as the next sibling (cached in the `nextSibling` variable).


		// ## DOM node moves
		//
		// In most scenarios `updateNode()` and `createNode()` perform the DOM operations. However,
		// this is not the case if the node moved (second and fourth part of the diff algo). We move
		// the old DOM nodes before updateNode runs because it enables us to use the cached `nextSibling`
		// variable rather than fetching it using `getNextSibling()`.
		//
		// The fourth part of the diff currently inserts nodes unconditionally, leading to issues
		// like #1791 and #1999. We need to be smarter about those situations where adjascent old
		// nodes remain together in the new list in a way that isn't covered by parts one and
		// three of the diff algo.

		function updateNodes(parent, old, vnodes, hooks, nextSibling, ns) {
			if (old === vnodes || old == null && vnodes == null) return
			else if (old == null || old.length === 0) createNodes(parent, vnodes, 0, vnodes.length, hooks, nextSibling, ns);
			else if (vnodes == null || vnodes.length === 0) removeNodes(parent, old, 0, old.length);
			else {
				var isOldKeyed = old[0] != null && old[0].key != null;
				var isKeyed = vnodes[0] != null && vnodes[0].key != null;
				var start = 0, oldStart = 0;
				if (!isOldKeyed) while (oldStart < old.length && old[oldStart] == null) oldStart++;
				if (!isKeyed) while (start < vnodes.length && vnodes[start] == null) start++;
				if (isKeyed === null && isOldKeyed == null) return // both lists are full of nulls
				if (isOldKeyed !== isKeyed) {
					removeNodes(parent, old, oldStart, old.length);
					createNodes(parent, vnodes, start, vnodes.length, hooks, nextSibling, ns);
				} else if (!isKeyed) {
					// Don't index past the end of either list (causes deopts).
					var commonLength = old.length < vnodes.length ? old.length : vnodes.length;
					// Rewind if necessary to the first non-null index on either side.
					// We could alternatively either explicitly create or remove nodes when `start !== oldStart`
					// but that would be optimizing for sparse lists which are more rare than dense ones.
					start = start < oldStart ? start : oldStart;
					for (; start < commonLength; start++) {
						o = old[start];
						v = vnodes[start];
						if (o === v || o == null && v == null) continue
						else if (o == null) createNode(parent, v, hooks, ns, getNextSibling(old, start + 1, nextSibling));
						else if (v == null) removeNode(parent, o);
						else updateNode(parent, o, v, hooks, getNextSibling(old, start + 1, nextSibling), ns);
					}
					if (old.length > commonLength) removeNodes(parent, old, start, old.length);
					if (vnodes.length > commonLength) createNodes(parent, vnodes, start, vnodes.length, hooks, nextSibling, ns);
				} else {
					// keyed diff
					var oldEnd = old.length - 1, end = vnodes.length - 1, map, o, v, oe, ve, topSibling;

					// bottom-up
					while (oldEnd >= oldStart && end >= start) {
						oe = old[oldEnd];
						ve = vnodes[end];
						if (oe.key !== ve.key) break
						if (oe !== ve) updateNode(parent, oe, ve, hooks, nextSibling, ns);
						if (ve.dom != null) nextSibling = ve.dom;
						oldEnd--, end--;
					}
					// top-down
					while (oldEnd >= oldStart && end >= start) {
						o = old[oldStart];
						v = vnodes[start];
						if (o.key !== v.key) break
						oldStart++, start++;
						if (o !== v) updateNode(parent, o, v, hooks, getNextSibling(old, oldStart, nextSibling), ns);
					}
					// swaps and list reversals
					while (oldEnd >= oldStart && end >= start) {
						if (start === end) break
						if (o.key !== ve.key || oe.key !== v.key) break
						topSibling = getNextSibling(old, oldStart, nextSibling);
						moveNodes(parent, oe, topSibling);
						if (oe !== v) updateNode(parent, oe, v, hooks, topSibling, ns);
						if (++start <= --end) moveNodes(parent, o, nextSibling);
						if (o !== ve) updateNode(parent, o, ve, hooks, nextSibling, ns);
						if (ve.dom != null) nextSibling = ve.dom;
						oldStart++; oldEnd--;
						oe = old[oldEnd];
						ve = vnodes[end];
						o = old[oldStart];
						v = vnodes[start];
					}
					// bottom up once again
					while (oldEnd >= oldStart && end >= start) {
						if (oe.key !== ve.key) break
						if (oe !== ve) updateNode(parent, oe, ve, hooks, nextSibling, ns);
						if (ve.dom != null) nextSibling = ve.dom;
						oldEnd--, end--;
						oe = old[oldEnd];
						ve = vnodes[end];
					}
					if (start > end) removeNodes(parent, old, oldStart, oldEnd + 1);
					else if (oldStart > oldEnd) createNodes(parent, vnodes, start, end + 1, hooks, nextSibling, ns);
					else {
						// inspired by ivi https://github.com/ivijs/ivi/ by Boris Kaul
						var originalNextSibling = nextSibling, vnodesLength = end - start + 1, oldIndices = new Array(vnodesLength), li=0, i=0, pos = 2147483647, matched = 0, map, lisIndices;
						for (i = 0; i < vnodesLength; i++) oldIndices[i] = -1;
						for (i = end; i >= start; i--) {
							if (map == null) map = getKeyMap(old, oldStart, oldEnd + 1);
							ve = vnodes[i];
							var oldIndex = map[ve.key];
							if (oldIndex != null) {
								pos = (oldIndex < pos) ? oldIndex : -1; // becomes -1 if nodes were re-ordered
								oldIndices[i-start] = oldIndex;
								oe = old[oldIndex];
								old[oldIndex] = null;
								if (oe !== ve) updateNode(parent, oe, ve, hooks, nextSibling, ns);
								if (ve.dom != null) nextSibling = ve.dom;
								matched++;
							}
						}
						nextSibling = originalNextSibling;
						if (matched !== oldEnd - oldStart + 1) removeNodes(parent, old, oldStart, oldEnd + 1);
						if (matched === 0) createNodes(parent, vnodes, start, end + 1, hooks, nextSibling, ns);
						else {
							if (pos === -1) {
								// the indices of the indices of the items that are part of the
								// longest increasing subsequence in the oldIndices list
								lisIndices = makeLisIndices(oldIndices);
								li = lisIndices.length - 1;
								for (i = end; i >= start; i--) {
									v = vnodes[i];
									if (oldIndices[i-start] === -1) createNode(parent, v, hooks, ns, nextSibling);
									else {
										if (lisIndices[li] === i - start) li--;
										else moveNodes(parent, v, nextSibling);
									}
									if (v.dom != null) nextSibling = vnodes[i].dom;
								}
							} else {
								for (i = end; i >= start; i--) {
									v = vnodes[i];
									if (oldIndices[i-start] === -1) createNode(parent, v, hooks, ns, nextSibling);
									if (v.dom != null) nextSibling = vnodes[i].dom;
								}
							}
						}
					}
				}
			}
		}
		function updateNode(parent, old, vnode, hooks, nextSibling, ns) {
			var oldTag = old.tag, tag = vnode.tag;
			if (oldTag === tag) {
				vnode.state = old.state;
				vnode.events = old.events;
				if (shouldNotUpdate(vnode, old)) return
				if (typeof oldTag === "string") {
					if (vnode.attrs != null) {
						updateLifecycle(vnode.attrs, vnode, hooks);
					}
					switch (oldTag) {
						case "#": updateText(old, vnode); break
						case "<": updateHTML(parent, old, vnode, ns, nextSibling); break
						case "[": updateFragment(parent, old, vnode, hooks, nextSibling, ns); break
						default: updateElement(old, vnode, hooks, ns);
					}
				}
				else updateComponent(parent, old, vnode, hooks, nextSibling, ns);
			}
			else {
				removeNode(parent, old);
				createNode(parent, vnode, hooks, ns, nextSibling);
			}
		}
		function updateText(old, vnode) {
			if (old.children.toString() !== vnode.children.toString()) {
				old.dom.nodeValue = vnode.children;
			}
			vnode.dom = old.dom;
		}
		function updateHTML(parent, old, vnode, ns, nextSibling) {
			if (old.children !== vnode.children) {
				removeHTML(parent, old);
				createHTML(parent, vnode, ns, nextSibling);
			}
			else {
				vnode.dom = old.dom;
				vnode.domSize = old.domSize;
				vnode.instance = old.instance;
			}
		}
		function updateFragment(parent, old, vnode, hooks, nextSibling, ns) {
			updateNodes(parent, old.children, vnode.children, hooks, nextSibling, ns);
			var domSize = 0, children = vnode.children;
			vnode.dom = null;
			if (children != null) {
				for (var i = 0; i < children.length; i++) {
					var child = children[i];
					if (child != null && child.dom != null) {
						if (vnode.dom == null) vnode.dom = child.dom;
						domSize += child.domSize || 1;
					}
				}
				if (domSize !== 1) vnode.domSize = domSize;
			}
		}
		function updateElement(old, vnode, hooks, ns) {
			var element = vnode.dom = old.dom;
			ns = getNameSpace(vnode) || ns;

			if (vnode.tag === "textarea") {
				if (vnode.attrs == null) vnode.attrs = {};
				if (vnode.text != null) {
					vnode.attrs.value = vnode.text; //FIXME handle multiple children
					vnode.text = undefined;
				}
			}
			updateAttrs(vnode, old.attrs, vnode.attrs, ns);
			if (!maybeSetContentEditable(vnode)) {
				if (old.text != null && vnode.text != null && vnode.text !== "") {
					if (old.text.toString() !== vnode.text.toString()) old.dom.firstChild.nodeValue = vnode.text;
				}
				else {
					if (old.text != null) old.children = [vnode$1("#", undefined, undefined, old.text, undefined, old.dom.firstChild)];
					if (vnode.text != null) vnode.children = [vnode$1("#", undefined, undefined, vnode.text, undefined, undefined)];
					updateNodes(element, old.children, vnode.children, hooks, null, ns);
				}
			}
		}
		function updateComponent(parent, old, vnode, hooks, nextSibling, ns) {
			vnode.instance = vnode$1.normalize(callHook.call(vnode.state.view, vnode));
			if (vnode.instance === vnode) throw Error("A view cannot return the vnode it received as argument")
			updateLifecycle(vnode.state, vnode, hooks);
			if (vnode.attrs != null) updateLifecycle(vnode.attrs, vnode, hooks);
			if (vnode.instance != null) {
				if (old.instance == null) createNode(parent, vnode.instance, hooks, ns, nextSibling);
				else updateNode(parent, old.instance, vnode.instance, hooks, nextSibling, ns);
				vnode.dom = vnode.instance.dom;
				vnode.domSize = vnode.instance.domSize;
			}
			else if (old.instance != null) {
				removeNode(parent, old.instance);
				vnode.dom = undefined;
				vnode.domSize = 0;
			}
			else {
				vnode.dom = old.dom;
				vnode.domSize = old.domSize;
			}
		}
		function getKeyMap(vnodes, start, end) {
			var map = Object.create(null);
			for (; start < end; start++) {
				var vnode = vnodes[start];
				if (vnode != null) {
					var key = vnode.key;
					if (key != null) map[key] = start;
				}
			}
			return map
		}
		// Lifted from ivi https://github.com/ivijs/ivi/
		// takes a list of unique numbers (-1 is special and can
		// occur multiple times) and returns an array with the indices
		// of the items that are part of the longest increasing
		// subsequece
		var lisTemp = [];
		function makeLisIndices(a) {
			var result = [0];
			var u = 0, v = 0, i = 0;
			var il = lisTemp.length = a.length;
			for (var i = 0; i < il; i++) lisTemp[i] = a[i];
			for (var i = 0; i < il; ++i) {
				if (a[i] === -1) continue
				var j = result[result.length - 1];
				if (a[j] < a[i]) {
					lisTemp[i] = j;
					result.push(i);
					continue
				}
				u = 0;
				v = result.length - 1;
				while (u < v) {
					// Fast integer average without overflow.
					// eslint-disable-next-line no-bitwise
					var c = (u >>> 1) + (v >>> 1) + (u & v & 1);
					if (a[result[c]] < a[i]) {
						u = c + 1;
					}
					else {
						v = c;
					}
				}
				if (a[i] < a[result[u]]) {
					if (u > 0) lisTemp[i] = result[u - 1];
					result[u] = i;
				}
			}
			u = result.length;
			v = result[u - 1];
			while (u-- > 0) {
				result[u] = v;
				v = lisTemp[v];
			}
			lisTemp.length = 0;
			return result
		}

		function getNextSibling(vnodes, i, nextSibling) {
			for (; i < vnodes.length; i++) {
				if (vnodes[i] != null && vnodes[i].dom != null) return vnodes[i].dom
			}
			return nextSibling
		}

		// This covers a really specific edge case:
		// - Parent node is keyed and contains child
		// - Child is removed, returns unresolved promise in `onbeforeremove`
		// - Parent node is moved in keyed diff
		// - Remaining children still need moved appropriately
		//
		// Ideally, I'd track removed nodes as well, but that introduces a lot more
		// complexity and I'm not exactly interested in doing that.
		function moveNodes(parent, vnode, nextSibling) {
			var frag = $doc.createDocumentFragment();
			moveChildToFrag(parent, frag, vnode);
			insertNode(parent, frag, nextSibling);
		}
		function moveChildToFrag(parent, frag, vnode) {
			// Dodge the recursion overhead in a few of the most common cases.
			while (vnode.dom != null && vnode.dom.parentNode === parent) {
				if (typeof vnode.tag !== "string") {
					vnode = vnode.instance;
					if (vnode != null) continue
				} else if (vnode.tag === "<") {
					for (var i = 0; i < vnode.instance.length; i++) {
						frag.appendChild(vnode.instance[i]);
					}
				} else if (vnode.tag !== "[") {
					// Don't recurse for text nodes *or* elements, just fragments
					frag.appendChild(vnode.dom);
				} else if (vnode.children.length === 1) {
					vnode = vnode.children[0];
					if (vnode != null) continue
				} else {
					for (var i = 0; i < vnode.children.length; i++) {
						var child = vnode.children[i];
						if (child != null) moveChildToFrag(parent, frag, child);
					}
				}
				break
			}
		}

		function insertNode(parent, dom, nextSibling) {
			if (nextSibling != null) parent.insertBefore(dom, nextSibling);
			else parent.appendChild(dom);
		}

		function maybeSetContentEditable(vnode) {
			if (vnode.attrs == null || (
				vnode.attrs.contenteditable == null && // attribute
				vnode.attrs.contentEditable == null // property
			)) return false
			var children = vnode.children;
			if (children != null && children.length === 1 && children[0].tag === "<") {
				var content = children[0].children;
				if (vnode.dom.innerHTML !== content) vnode.dom.innerHTML = content;
			}
			else if (vnode.text != null || children != null && children.length !== 0) throw new Error("Child node of a contenteditable must be trusted")
			return true
		}

		//remove
		function removeNodes(parent, vnodes, start, end) {
			for (var i = start; i < end; i++) {
				var vnode = vnodes[i];
				if (vnode != null) removeNode(parent, vnode);
			}
		}
		function removeNode(parent, vnode) {
			var mask = 0;
			var original = vnode.state;
			var stateResult, attrsResult;
			if (typeof vnode.tag !== "string" && typeof vnode.state.onbeforeremove === "function") {
				var result = callHook.call(vnode.state.onbeforeremove, vnode);
				if (result != null && typeof result.then === "function") {
					mask = 1;
					stateResult = result;
				}
			}
			if (vnode.attrs && typeof vnode.attrs.onbeforeremove === "function") {
				var result = callHook.call(vnode.attrs.onbeforeremove, vnode);
				if (result != null && typeof result.then === "function") {
					// eslint-disable-next-line no-bitwise
					mask |= 2;
					attrsResult = result;
				}
			}
			checkState(vnode, original);

			// If we can, try to fast-path it and avoid all the overhead of awaiting
			if (!mask) {
				onremove(vnode);
				removeChild(parent, vnode);
			} else {
				if (stateResult != null) {
					var next = function () {
						// eslint-disable-next-line no-bitwise
						if (mask & 1) { mask &= 2; if (!mask) reallyRemove(); }
					};
					stateResult.then(next, next);
				}
				if (attrsResult != null) {
					var next = function () {
						// eslint-disable-next-line no-bitwise
						if (mask & 2) { mask &= 1; if (!mask) reallyRemove(); }
					};
					attrsResult.then(next, next);
				}
			}

			function reallyRemove() {
				checkState(vnode, original);
				onremove(vnode);
				removeChild(parent, vnode);
			}
		}
		function removeHTML(parent, vnode) {
			for (var i = 0; i < vnode.instance.length; i++) {
				parent.removeChild(vnode.instance[i]);
			}
		}
		function removeChild(parent, vnode) {
			// Dodge the recursion overhead in a few of the most common cases.
			while (vnode.dom != null && vnode.dom.parentNode === parent) {
				if (typeof vnode.tag !== "string") {
					vnode = vnode.instance;
					if (vnode != null) continue
				} else if (vnode.tag === "<") {
					removeHTML(parent, vnode);
				} else {
					if (vnode.tag !== "[") {
						parent.removeChild(vnode.dom);
						if (!Array.isArray(vnode.children)) break
					}
					if (vnode.children.length === 1) {
						vnode = vnode.children[0];
						if (vnode != null) continue
					} else {
						for (var i = 0; i < vnode.children.length; i++) {
							var child = vnode.children[i];
							if (child != null) removeChild(parent, child);
						}
					}
				}
				break
			}
		}
		function onremove(vnode) {
			if (typeof vnode.tag !== "string" && typeof vnode.state.onremove === "function") callHook.call(vnode.state.onremove, vnode);
			if (vnode.attrs && typeof vnode.attrs.onremove === "function") callHook.call(vnode.attrs.onremove, vnode);
			if (typeof vnode.tag !== "string") {
				if (vnode.instance != null) onremove(vnode.instance);
			} else {
				var children = vnode.children;
				if (Array.isArray(children)) {
					for (var i = 0; i < children.length; i++) {
						var child = children[i];
						if (child != null) onremove(child);
					}
				}
			}
		}

		//attrs
		function setAttrs(vnode, attrs, ns) {
			for (var key in attrs) {
				setAttr(vnode, key, null, attrs[key], ns);
			}
		}
		function setAttr(vnode, key, old, value, ns) {
			if (key === "key" || key === "is" || value == null || isLifecycleMethod(key) || (old === value && !isFormAttribute(vnode, key)) && typeof value !== "object") return
			if (key[0] === "o" && key[1] === "n") return updateEvent(vnode, key, value)
			if (key.slice(0, 6) === "xlink:") vnode.dom.setAttributeNS("http://www.w3.org/1999/xlink", key.slice(6), value);
			else if (key === "style") updateStyle(vnode.dom, old, value);
			else if (hasPropertyKey(vnode, key, ns)) {
				if (key === "value") {
					// Only do the coercion if we're actually going to check the value.
					/* eslint-disable no-implicit-coercion */
					//setting input[value] to same value by typing on focused element moves cursor to end in Chrome
					if ((vnode.tag === "input" || vnode.tag === "textarea") && vnode.dom.value === "" + value && vnode.dom === activeElement()) return
					//setting select[value] to same value while having select open blinks select dropdown in Chrome
					if (vnode.tag === "select" && old !== null && vnode.dom.value === "" + value) return
					//setting option[value] to same value while having select open blinks select dropdown in Chrome
					if (vnode.tag === "option" && old !== null && vnode.dom.value === "" + value) return
					/* eslint-enable no-implicit-coercion */
				}
				// If you assign an input type that is not supported by IE 11 with an assignment expression, an error will occur.
				if (vnode.tag === "input" && key === "type") vnode.dom.setAttribute(key, value);
				else vnode.dom[key] = value;
			} else {
				if (typeof value === "boolean") {
					if (value) vnode.dom.setAttribute(key, "");
					else vnode.dom.removeAttribute(key);
				}
				else vnode.dom.setAttribute(key === "className" ? "class" : key, value);
			}
		}
		function removeAttr(vnode, key, old, ns) {
			if (key === "key" || key === "is" || old == null || isLifecycleMethod(key)) return
			if (key[0] === "o" && key[1] === "n" && !isLifecycleMethod(key)) updateEvent(vnode, key, undefined);
			else if (key === "style") updateStyle(vnode.dom, old, null);
			else if (
				hasPropertyKey(vnode, key, ns)
				&& key !== "className"
				&& !(key === "value" && (
					vnode.tag === "option"
					|| vnode.tag === "select" && vnode.dom.selectedIndex === -1 && vnode.dom === activeElement()
				))
				&& !(vnode.tag === "input" && key === "type")
			) {
				vnode.dom[key] = null;
			} else {
				var nsLastIndex = key.indexOf(":");
				if (nsLastIndex !== -1) key = key.slice(nsLastIndex + 1);
				if (old !== false) vnode.dom.removeAttribute(key === "className" ? "class" : key);
			}
		}
		function setLateSelectAttrs(vnode, attrs) {
			if ("value" in attrs) {
				if(attrs.value === null) {
					if (vnode.dom.selectedIndex !== -1) vnode.dom.value = null;
				} else {
					var normalized = "" + attrs.value; // eslint-disable-line no-implicit-coercion
					if (vnode.dom.value !== normalized || vnode.dom.selectedIndex === -1) {
						vnode.dom.value = normalized;
					}
				}
			}
			if ("selectedIndex" in attrs) setAttr(vnode, "selectedIndex", null, attrs.selectedIndex, undefined);
		}
		function updateAttrs(vnode, old, attrs, ns) {
			if (attrs != null) {
				for (var key in attrs) {
					setAttr(vnode, key, old && old[key], attrs[key], ns);
				}
			}
			var val;
			if (old != null) {
				for (var key in old) {
					if (((val = old[key]) != null) && (attrs == null || attrs[key] == null)) {
						removeAttr(vnode, key, val, ns);
					}
				}
			}
		}
		function isFormAttribute(vnode, attr) {
			return attr === "value" || attr === "checked" || attr === "selectedIndex" || attr === "selected" && vnode.dom === activeElement() || vnode.tag === "option" && vnode.dom.parentNode === $doc.activeElement
		}
		function isLifecycleMethod(attr) {
			return attr === "oninit" || attr === "oncreate" || attr === "onupdate" || attr === "onremove" || attr === "onbeforeremove" || attr === "onbeforeupdate"
		}
		function hasPropertyKey(vnode, key, ns) {
			// Filter out namespaced keys
			return ns === undefined && (
				// If it's a custom element, just keep it.
				vnode.tag.indexOf("-") > -1 || vnode.attrs != null && vnode.attrs.is ||
				// If it's a normal element, let's try to avoid a few browser bugs.
				key !== "href" && key !== "list" && key !== "form" && key !== "width" && key !== "height"// && key !== "type"
				// Defer the property check until *after* we check everything.
			) && key in vnode.dom
		}

		//style
		var uppercaseRegex = /[A-Z]/g;
		function toLowerCase(capital) { return "-" + capital.toLowerCase() }
		function normalizeKey(key) {
			return key[0] === "-" && key[1] === "-" ? key :
				key === "cssFloat" ? "float" :
					key.replace(uppercaseRegex, toLowerCase)
		}
		function updateStyle(element, old, style) {
			if (old === style) ; else if (style == null) {
				// New style is missing, just clear it.
				element.style.cssText = "";
			} else if (typeof style !== "object") {
				// New style is a string, let engine deal with patching.
				element.style.cssText = style;
			} else if (old == null || typeof old !== "object") {
				// `old` is missing or a string, `style` is an object.
				element.style.cssText = "";
				// Add new style properties
				for (var key in style) {
					var value = style[key];
					if (value != null) element.style.setProperty(normalizeKey(key), String(value));
				}
			} else {
				// Both old & new are (different) objects.
				// Update style properties that have changed
				for (var key in style) {
					var value = style[key];
					if (value != null && (value = String(value)) !== String(old[key])) {
						element.style.setProperty(normalizeKey(key), value);
					}
				}
				// Remove style properties that no longer exist
				for (var key in old) {
					if (old[key] != null && style[key] == null) {
						element.style.removeProperty(normalizeKey(key));
					}
				}
			}
		}

		// Here's an explanation of how this works:
		// 1. The event names are always (by design) prefixed by `on`.
		// 2. The EventListener interface accepts either a function or an object
		//    with a `handleEvent` method.
		// 3. The object does not inherit from `Object.prototype`, to avoid
		//    any potential interference with that (e.g. setters).
		// 4. The event name is remapped to the handler before calling it.
		// 5. In function-based event handlers, `ev.target === this`. We replicate
		//    that below.
		// 6. In function-based event handlers, `return false` prevents the default
		//    action and stops event propagation. We replicate that below.
		function EventDict() {
			// Save this, so the current redraw is correctly tracked.
			this._ = currentRedraw;
		}
		EventDict.prototype = Object.create(null);
		EventDict.prototype.handleEvent = function (ev) {
			var handler = this["on" + ev.type];
			var result;
			if (typeof handler === "function") result = handler.call(ev.currentTarget, ev);
			else if (typeof handler.handleEvent === "function") handler.handleEvent(ev);
			if (this._ && ev.redraw !== false) (0, this._)();
			if (result === false) {
				ev.preventDefault();
				ev.stopPropagation();
			}
		};

		//event
		function updateEvent(vnode, key, value) {
			if (vnode.events != null) {
				if (vnode.events[key] === value) return
				if (value != null && (typeof value === "function" || typeof value === "object")) {
					if (vnode.events[key] == null) vnode.dom.addEventListener(key.slice(2), vnode.events, false);
					vnode.events[key] = value;
				} else {
					if (vnode.events[key] != null) vnode.dom.removeEventListener(key.slice(2), vnode.events, false);
					vnode.events[key] = undefined;
				}
			} else if (value != null && (typeof value === "function" || typeof value === "object")) {
				vnode.events = new EventDict();
				vnode.dom.addEventListener(key.slice(2), vnode.events, false);
				vnode.events[key] = value;
			}
		}

		//lifecycle
		function initLifecycle(source, vnode, hooks) {
			if (typeof source.oninit === "function") callHook.call(source.oninit, vnode);
			if (typeof source.oncreate === "function") hooks.push(callHook.bind(source.oncreate, vnode));
		}
		function updateLifecycle(source, vnode, hooks) {
			if (typeof source.onupdate === "function") hooks.push(callHook.bind(source.onupdate, vnode));
		}
		function shouldNotUpdate(vnode, old) {
			do {
				if (vnode.attrs != null && typeof vnode.attrs.onbeforeupdate === "function") {
					var force = callHook.call(vnode.attrs.onbeforeupdate, vnode, old);
					if (force !== undefined && !force) break
				}
				if (typeof vnode.tag !== "string" && typeof vnode.state.onbeforeupdate === "function") {
					var force = callHook.call(vnode.state.onbeforeupdate, vnode, old);
					if (force !== undefined && !force) break
				}
				return false
			} while (false); // eslint-disable-line no-constant-condition
			vnode.dom = old.dom;
			vnode.domSize = old.domSize;
			vnode.instance = old.instance;
			// One would think having the actual latest attributes would be ideal,
			// but it doesn't let us properly diff based on our current internal
			// representation. We have to save not only the old DOM info, but also
			// the attributes used to create it, as we diff *that*, not against the
			// DOM directly (with a few exceptions in `setAttr`). And, of course, we
			// need to save the children and text as they are conceptually not
			// unlike special "attributes" internally.
			vnode.attrs = old.attrs;
			vnode.children = old.children;
			vnode.text = old.text;
			return true
		}

		return function(dom, vnodes, redraw) {
			if (!dom) throw new TypeError("Ensure the DOM element being passed to m.route/m.mount/m.render is not undefined.")
			var hooks = [];
			var active = activeElement();
			var namespace = dom.namespaceURI;

			// First time rendering into a node clears it out
			if (dom.vnodes == null) dom.textContent = "";

			vnodes = vnode$1.normalizeChildren(Array.isArray(vnodes) ? vnodes : [vnodes]);
			var prevRedraw = currentRedraw;
			try {
				currentRedraw = typeof redraw === "function" ? redraw : undefined;
				updateNodes(dom, dom.vnodes, vnodes, hooks, null, namespace === "http://www.w3.org/1999/xhtml" ? undefined : namespace);
			} finally {
				currentRedraw = prevRedraw;
			}
			dom.vnodes = vnodes;
			// `document.activeElement` can return null: https://html.spec.whatwg.org/multipage/interaction.html#dom-document-activeelement
			if (active != null && activeElement() !== active && typeof active.focus === "function") active.focus();
			for (var i = 0; i < hooks.length; i++) hooks[i]();
		}
	};

	var render$2 = render$3(window);

	var mountRedraw$3 = function(render, schedule, console) {
		var subscriptions = [];
		var rendering = false;
		var pending = false;

		function sync() {
			if (rendering) throw new Error("Nested m.redraw.sync() call")
			rendering = true;
			for (var i = 0; i < subscriptions.length; i += 2) {
				try { render(subscriptions[i], vnode$1(subscriptions[i + 1]), redraw); }
				catch (e) { console.error(e); }
			}
			rendering = false;
		}

		function redraw() {
			if (!pending) {
				pending = true;
				schedule(function() {
					pending = false;
					sync();
				});
			}
		}

		redraw.sync = sync;

		function mount(root, component) {
			if (component != null && component.view == null && typeof component !== "function") {
				throw new TypeError("m.mount(element, component) expects a component, not a vnode")
			}

			var index = subscriptions.indexOf(root);
			if (index >= 0) {
				subscriptions.splice(index, 2);
				render(root, [], redraw);
			}

			if (component != null) {
				subscriptions.push(root, component);
				render(root, vnode$1(component), redraw);
			}
		}

		return {mount: mount, redraw: redraw}
	};

	var mountRedraw$2 = mountRedraw$3(render$2, requestAnimationFrame, console);

	var build$3 = function(object) {
		if (Object.prototype.toString.call(object) !== "[object Object]") return ""

		var args = [];
		for (var key in object) {
			destructure(key, object[key]);
		}

		return args.join("&")

		function destructure(key, value) {
			if (Array.isArray(value)) {
				for (var i = 0; i < value.length; i++) {
					destructure(key + "[" + i + "]", value[i]);
				}
			}
			else if (Object.prototype.toString.call(value) === "[object Object]") {
				for (var i in value) {
					destructure(key + "[" + i + "]", value[i]);
				}
			}
			else args.push(encodeURIComponent(key) + (value != null && value !== "" ? "=" + encodeURIComponent(value) : ""));
		}
	};

	var assign$1 = Object.assign || function(target, source) {
		if(source) Object.keys(source).forEach(function(key) { target[key] = source[key]; });
	};

	// Returns `path` from `template` + `params`
	var build$2 = function(template, params) {
		if ((/:([^\/\.-]+)(\.{3})?:/).test(template)) {
			throw new SyntaxError("Template parameter names *must* be separated")
		}
		if (params == null) return template
		var queryIndex = template.indexOf("?");
		var hashIndex = template.indexOf("#");
		var queryEnd = hashIndex < 0 ? template.length : hashIndex;
		var pathEnd = queryIndex < 0 ? queryEnd : queryIndex;
		var path = template.slice(0, pathEnd);
		var query = {};

		assign$1(query, params);

		var resolved = path.replace(/:([^\/\.-]+)(\.{3})?/g, function(m, key, variadic) {
			delete query[key];
			// If no such parameter exists, don't interpolate it.
			if (params[key] == null) return m
			// Escape normal parameters, but not variadic ones.
			return variadic ? params[key] : encodeURIComponent(String(params[key]))
		});

		// In case the template substitution adds new query/hash parameters.
		var newQueryIndex = resolved.indexOf("?");
		var newHashIndex = resolved.indexOf("#");
		var newQueryEnd = newHashIndex < 0 ? resolved.length : newHashIndex;
		var newPathEnd = newQueryIndex < 0 ? newQueryEnd : newQueryIndex;
		var result = resolved.slice(0, newPathEnd);

		if (queryIndex >= 0) result += template.slice(queryIndex, queryEnd);
		if (newQueryIndex >= 0) result += (queryIndex < 0 ? "?" : "&") + resolved.slice(newQueryIndex, newQueryEnd);
		var querystring = build$3(query);
		if (querystring) result += (queryIndex < 0 && newQueryIndex < 0 ? "?" : "&") + querystring;
		if (hashIndex >= 0) result += template.slice(hashIndex);
		if (newHashIndex >= 0) result += (hashIndex < 0 ? "" : "&") + resolved.slice(newHashIndex);
		return result
	};

	var request$3 = function($window, Promise, oncompletion) {
		var callbackCount = 0;

		function PromiseProxy(executor) {
			return new Promise(executor)
		}

		// In case the global Promise is some userland library's where they rely on
		// `foo instanceof this.constructor`, `this.constructor.resolve(value)`, or
		// similar. Let's *not* break them.
		PromiseProxy.prototype = Promise.prototype;
		PromiseProxy.__proto__ = Promise; // eslint-disable-line no-proto

		function makeRequest(factory) {
			return function(url, args) {
				if (typeof url !== "string") { args = url; url = url.url; }
				else if (args == null) args = {};
				var promise = new Promise(function(resolve, reject) {
					factory(build$2(url, args.params), args, function (data) {
						if (typeof args.type === "function") {
							if (Array.isArray(data)) {
								for (var i = 0; i < data.length; i++) {
									data[i] = new args.type(data[i]);
								}
							}
							else data = new args.type(data);
						}
						resolve(data);
					}, reject);
				});
				if (args.background === true) return promise
				var count = 0;
				function complete() {
					if (--count === 0 && typeof oncompletion === "function") oncompletion();
				}

				return wrap(promise)

				function wrap(promise) {
					var then = promise.then;
					// Set the constructor, so engines know to not await or resolve
					// this as a native promise. At the time of writing, this is
					// only necessary for V8, but their behavior is the correct
					// behavior per spec. See this spec issue for more details:
					// https://github.com/tc39/ecma262/issues/1577. Also, see the
					// corresponding comment in `request/tests/test-request.js` for
					// a bit more background on the issue at hand.
					promise.constructor = PromiseProxy;
					promise.then = function() {
						count++;
						var next = then.apply(promise, arguments);
						next.then(complete, function(e) {
							complete();
							if (count === 0) throw e
						});
						return wrap(next)
					};
					return promise
				}
			}
		}

		function hasHeader(args, name) {
			for (var key in args.headers) {
				if ({}.hasOwnProperty.call(args.headers, key) && name.test(key)) return true
			}
			return false
		}

		return {
			request: makeRequest(function(url, args, resolve, reject) {
				var method = args.method != null ? args.method.toUpperCase() : "GET";
				var body = args.body;
				var assumeJSON = (args.serialize == null || args.serialize === JSON.serialize) && !(body instanceof $window.FormData);
				var responseType = args.responseType || (typeof args.extract === "function" ? "" : "json");

				var xhr = new $window.XMLHttpRequest(), aborted = false;
				var original = xhr, replacedAbort;
				var abort = xhr.abort;

				xhr.abort = function() {
					aborted = true;
					abort.call(this);
				};

				xhr.open(method, url, args.async !== false, typeof args.user === "string" ? args.user : undefined, typeof args.password === "string" ? args.password : undefined);

				if (assumeJSON && body != null && !hasHeader(args, /^content-type$/i)) {
					xhr.setRequestHeader("Content-Type", "application/json; charset=utf-8");
				}
				if (typeof args.deserialize !== "function" && !hasHeader(args, /^accept$/i)) {
					xhr.setRequestHeader("Accept", "application/json, text/*");
				}
				if (args.withCredentials) xhr.withCredentials = args.withCredentials;
				if (args.timeout) xhr.timeout = args.timeout;
				xhr.responseType = responseType;

				for (var key in args.headers) {
					if ({}.hasOwnProperty.call(args.headers, key)) {
						xhr.setRequestHeader(key, args.headers[key]);
					}
				}

				xhr.onreadystatechange = function(ev) {
					// Don't throw errors on xhr.abort().
					if (aborted) return

					if (ev.target.readyState === 4) {
						try {
							var success = (ev.target.status >= 200 && ev.target.status < 300) || ev.target.status === 304 || (/^file:\/\//i).test(url);
							// When the response type isn't "" or "text",
							// `xhr.responseText` is the wrong thing to use.
							// Browsers do the right thing and throw here, and we
							// should honor that and do the right thing by
							// preferring `xhr.response` where possible/practical.
							var response = ev.target.response, message;

							if (responseType === "json") {
								// For IE and Edge, which don't implement
								// `responseType: "json"`.
								if (!ev.target.responseType && typeof args.extract !== "function") response = JSON.parse(ev.target.responseText);
							} else if (!responseType || responseType === "text") {
								// Only use this default if it's text. If a parsed
								// document is needed on old IE and friends (all
								// unsupported), the user should use a custom
								// `config` instead. They're already using this at
								// their own risk.
								if (response == null) response = ev.target.responseText;
							}

							if (typeof args.extract === "function") {
								response = args.extract(ev.target, args);
								success = true;
							} else if (typeof args.deserialize === "function") {
								response = args.deserialize(response);
							}
							if (success) resolve(response);
							else {
								try { message = ev.target.responseText; }
								catch (e) { message = response; }
								var error = new Error(message);
								error.code = ev.target.status;
								error.response = response;
								reject(error);
							}
						}
						catch (e) {
							reject(e);
						}
					}
				};

				if (typeof args.config === "function") {
					xhr = args.config(xhr, args, url) || xhr;

					// Propagate the `abort` to any replacement XHR as well.
					if (xhr !== original) {
						replacedAbort = xhr.abort;
						xhr.abort = function() {
							aborted = true;
							replacedAbort.call(this);
						};
					}
				}

				if (body == null) xhr.send();
				else if (typeof args.serialize === "function") xhr.send(args.serialize(body));
				else if (body instanceof $window.FormData) xhr.send(body);
				else xhr.send(JSON.stringify(body));
			}),
			jsonp: makeRequest(function(url, args, resolve, reject) {
				var callbackName = args.callbackName || "_mithril_" + Math.round(Math.random() * 1e16) + "_" + callbackCount++;
				var script = $window.document.createElement("script");
				$window[callbackName] = function(data) {
					delete $window[callbackName];
					script.parentNode.removeChild(script);
					resolve(data);
				};
				script.onerror = function() {
					delete $window[callbackName];
					script.parentNode.removeChild(script);
					reject(new Error("JSONP request failed"));
				};
				script.src = url + (url.indexOf("?") < 0 ? "?" : "&") +
					encodeURIComponent(args.callbackKey || "callback") + "=" +
					encodeURIComponent(callbackName);
				$window.document.documentElement.appendChild(script);
			}),
		}
	};

	var request$2 = request$3(window, promise$1, mountRedraw$2.redraw);

	var parse$3 = function(string) {
		if (string === "" || string == null) return {}
		if (string.charAt(0) === "?") string = string.slice(1);

		var entries = string.split("&"), counters = {}, data = {};
		for (var i = 0; i < entries.length; i++) {
			var entry = entries[i].split("=");
			var key = decodeURIComponent(entry[0]);
			var value = entry.length === 2 ? decodeURIComponent(entry[1]) : "";

			if (value === "true") value = true;
			else if (value === "false") value = false;

			var levels = key.split(/\]\[?|\[/);
			var cursor = data;
			if (key.indexOf("[") > -1) levels.pop();
			for (var j = 0; j < levels.length; j++) {
				var level = levels[j], nextLevel = levels[j + 1];
				var isNumber = nextLevel == "" || !isNaN(parseInt(nextLevel, 10));
				if (level === "") {
					var key = levels.slice(0, j).join();
					if (counters[key] == null) {
						counters[key] = Array.isArray(cursor) ? cursor.length : 0;
					}
					level = counters[key]++;
				}
				// Disallow direct prototype pollution
				else if (level === "__proto__") break
				if (j === levels.length - 1) cursor[level] = value;
				else {
					// Read own properties exclusively to disallow indirect
					// prototype pollution
					var desc = Object.getOwnPropertyDescriptor(cursor, level);
					if (desc != null) desc = desc.value;
					if (desc == null) cursor[level] = desc = isNumber ? [] : {};
					cursor = desc;
				}
			}
		}
		return data
	};

	// Returns `{path, params}` from `url`
	var parse$2 = function(url) {
		var queryIndex = url.indexOf("?");
		var hashIndex = url.indexOf("#");
		var queryEnd = hashIndex < 0 ? url.length : hashIndex;
		var pathEnd = queryIndex < 0 ? queryEnd : queryIndex;
		var path = url.slice(0, pathEnd).replace(/\/{2,}/g, "/");

		if (!path) path = "/";
		else {
			if (path[0] !== "/") path = "/" + path;
			if (path.length > 1 && path[path.length - 1] === "/") path = path.slice(0, -1);
		}
		return {
			path: path,
			params: queryIndex < 0
				? {}
				: parse$3(url.slice(queryIndex + 1, queryEnd)),
		}
	};

	// Compiles a template into a function that takes a resolved path (without query
	// strings) and returns an object containing the template parameters with their
	// parsed values. This expects the input of the compiled template to be the
	// output of `parsePathname`. Note that it does *not* remove query parameters
	// specified in the template.
	var compileTemplate$1 = function(template) {
		var templateData = parse$2(template);
		var templateKeys = Object.keys(templateData.params);
		var keys = [];
		var regexp = new RegExp("^" + templateData.path.replace(
			// I escape literal text so people can use things like `:file.:ext` or
			// `:lang-:locale` in routes. This is all merged into one pass so I
			// don't also accidentally escape `-` and make it harder to detect it to
			// ban it from template parameters.
			/:([^\/.-]+)(\.{3}|\.(?!\.)|-)?|[\\^$*+.()|\[\]{}]/g,
			function(m, key, extra) {
				if (key == null) return "\\" + m
				keys.push({k: key, r: extra === "..."});
				if (extra === "...") return "(.*)"
				if (extra === ".") return "([^/]+)\\."
				return "([^/]+)" + (extra || "")
			}
		) + "$");
		return function(data) {
			// First, check the params. Usually, there isn't any, and it's just
			// checking a static set.
			for (var i = 0; i < templateKeys.length; i++) {
				if (templateData.params[templateKeys[i]] !== data.params[templateKeys[i]]) return false
			}
			// If no interpolations exist, let's skip all the ceremony
			if (!keys.length) return regexp.test(data.path)
			var values = regexp.exec(data.path);
			if (values == null) return false
			for (var i = 0; i < keys.length; i++) {
				data.params[keys[i].k] = keys[i].r ? values[i + 1] : decodeURIComponent(values[i + 1]);
			}
			return true
		}
	};

	var sentinel$1 = {};

	var router$1 = function($window, mountRedraw) {
		var fireAsync;

		function setPath(path, data, options) {
			path = build$2(path, data);
			if (fireAsync != null) {
				fireAsync();
				var state = options ? options.state : null;
				var title = options ? options.title : null;
				if (options && options.replace) $window.history.replaceState(state, title, route.prefix + path);
				else $window.history.pushState(state, title, route.prefix + path);
			}
			else {
				$window.location.href = route.prefix + path;
			}
		}

		var currentResolver = sentinel$1, component, attrs, currentPath, lastUpdate;

		var SKIP = route.SKIP = {};

		function route(root, defaultRoute, routes) {
			if (root == null) throw new Error("Ensure the DOM element that was passed to `m.route` is not undefined")
			// 0 = start
			// 1 = init
			// 2 = ready
			var state = 0;

			var compiled = Object.keys(routes).map(function(route) {
				if (route[0] !== "/") throw new SyntaxError("Routes must start with a `/`")
				if ((/:([^\/\.-]+)(\.{3})?:/).test(route)) {
					throw new SyntaxError("Route parameter names must be separated with either `/`, `.`, or `-`")
				}
				return {
					route: route,
					component: routes[route],
					check: compileTemplate$1(route),
				}
			});
			var callAsync = typeof setImmediate === "function" ? setImmediate : setTimeout;
			var p = promise$1.resolve();
			var scheduled = false;
			var onremove;

			fireAsync = null;

			if (defaultRoute != null) {
				var defaultData = parse$2(defaultRoute);

				if (!compiled.some(function (i) { return i.check(defaultData) })) {
					throw new ReferenceError("Default route doesn't match any known routes")
				}
			}

			function resolveRoute() {
				scheduled = false;
				// Consider the pathname holistically. The prefix might even be invalid,
				// but that's not our problem.
				var prefix = $window.location.hash;
				if (route.prefix[0] !== "#") {
					prefix = $window.location.search + prefix;
					if (route.prefix[0] !== "?") {
						prefix = $window.location.pathname + prefix;
						if (prefix[0] !== "/") prefix = "/" + prefix;
					}
				}
				// This seemingly useless `.concat()` speeds up the tests quite a bit,
				// since the representation is consistently a relatively poorly
				// optimized cons string.
				var path = prefix.concat()
					.replace(/(?:%[a-f89][a-f0-9])+/gim, decodeURIComponent)
					.slice(route.prefix.length);
				var data = parse$2(path);

				assign$1(data.params, $window.history.state);

				function fail() {
					if (path === defaultRoute) throw new Error("Could not resolve default route " + defaultRoute)
					setPath(defaultRoute, null, {replace: true});
				}

				loop(0);
				function loop(i) {
					// 0 = init
					// 1 = scheduled
					// 2 = done
					for (; i < compiled.length; i++) {
						if (compiled[i].check(data)) {
							var payload = compiled[i].component;
							var matchedRoute = compiled[i].route;
							var localComp = payload;
							var update = lastUpdate = function(comp) {
								if (update !== lastUpdate) return
								if (comp === SKIP) return loop(i + 1)
								component = comp != null && (typeof comp.view === "function" || typeof comp === "function")? comp : "div";
								attrs = data.params, currentPath = path, lastUpdate = null;
								currentResolver = payload.render ? payload : null;
								if (state === 2) mountRedraw.redraw();
								else {
									state = 2;
									mountRedraw.redraw.sync();
								}
							};
							// There's no understating how much I *wish* I could
							// use `async`/`await` here...
							if (payload.view || typeof payload === "function") {
								payload = {};
								update(localComp);
							}
							else if (payload.onmatch) {
								p.then(function () {
									return payload.onmatch(data.params, path, matchedRoute)
								}).then(update, fail);
							}
							else update("div");
							return
						}
					}
					fail();
				}
			}

			// Set it unconditionally so `m.route.set` and `m.route.Link` both work,
			// even if neither `pushState` nor `hashchange` are supported. It's
			// cleared if `hashchange` is used, since that makes it automatically
			// async.
			fireAsync = function() {
				if (!scheduled) {
					scheduled = true;
					callAsync(resolveRoute);
				}
			};

			if (typeof $window.history.pushState === "function") {
				onremove = function() {
					$window.removeEventListener("popstate", fireAsync, false);
				};
				$window.addEventListener("popstate", fireAsync, false);
			} else if (route.prefix[0] === "#") {
				fireAsync = null;
				onremove = function() {
					$window.removeEventListener("hashchange", resolveRoute, false);
				};
				$window.addEventListener("hashchange", resolveRoute, false);
			}

			return mountRedraw.mount(root, {
				onbeforeupdate: function() {
					state = state ? 2 : 1;
					return !(!state || sentinel$1 === currentResolver)
				},
				oncreate: resolveRoute,
				onremove: onremove,
				view: function() {
					if (!state || sentinel$1 === currentResolver) return
					// Wrap in a fragment to preserve existing key semantics
					var vnode = [vnode$1(component, attrs.key, attrs)];
					if (currentResolver) vnode = currentResolver.render(vnode[0]);
					return vnode
				},
			})
		}
		route.set = function(path, data, options) {
			if (lastUpdate != null) {
				options = options || {};
				options.replace = true;
			}
			lastUpdate = null;
			setPath(path, data, options);
		};
		route.get = function() {return currentPath};
		route.prefix = "#!";
		route.Link = {
			view: function(vnode) {
				var options = vnode.attrs.options;
				// Remove these so they don't get overwritten
				var attrs = {}, onclick, href;
				assign$1(attrs, vnode.attrs);
				// The first two are internal, but the rest are magic attributes
				// that need censored to not screw up rendering.
				attrs.selector = attrs.options = attrs.key = attrs.oninit =
				attrs.oncreate = attrs.onbeforeupdate = attrs.onupdate =
				attrs.onbeforeremove = attrs.onremove = null;

				// Do this now so we can get the most current `href` and `disabled`.
				// Those attributes may also be specified in the selector, and we
				// should honor that.
				var child = hyperscript_1$3(vnode.attrs.selector || "a", attrs, vnode.children);

				// Let's provide a *right* way to disable a route link, rather than
				// letting people screw up accessibility on accident.
				//
				// The attribute is coerced so users don't get surprised over
				// `disabled: 0` resulting in a button that's somehow routable
				// despite being visibly disabled.
				if (child.attrs.disabled = Boolean(child.attrs.disabled)) {
					child.attrs.href = null;
					child.attrs["aria-disabled"] = "true";
					// If you *really* do want to do this on a disabled link, use
					// an `oncreate` hook to add it.
					child.attrs.onclick = null;
				} else {
					onclick = child.attrs.onclick;
					href = child.attrs.href;
					child.attrs.href = route.prefix + href;
					child.attrs.onclick = function(e) {
						var result;
						if (typeof onclick === "function") {
							result = onclick.call(e.currentTarget, e);
						} else if (onclick == null || typeof onclick !== "object") ; else if (typeof onclick.handleEvent === "function") {
							onclick.handleEvent(e);
						}

						// Adapted from React Router's implementation:
						// https://github.com/ReactTraining/react-router/blob/520a0acd48ae1b066eb0b07d6d4d1790a1d02482/packages/react-router-dom/modules/Link.js
						//
						// Try to be flexible and intuitive in how we handle links.
						// Fun fact: links aren't as obvious to get right as you
						// would expect. There's a lot more valid ways to click a
						// link than this, and one might want to not simply click a
						// link, but right click or command-click it to copy the
						// link target, etc. Nope, this isn't just for blind people.
						if (
							// Skip if `onclick` prevented default
							result !== false && !e.defaultPrevented &&
							// Ignore everything but left clicks
							(e.button === 0 || e.which === 0 || e.which === 1) &&
							// Let the browser handle `target=_blank`, etc.
							(!e.currentTarget.target || e.currentTarget.target === "_self") &&
							// No modifier keys
							!e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey
						) {
							e.preventDefault();
							e.redraw = false;
							route.set(href, null, options);
						}
					};
				}
				return child
			},
		};
		route.param = function(key) {
			return attrs && key != null ? attrs[key] : attrs
		};

		return route
	};

	var route$1 = router$1(window, mountRedraw$2);

	var m$1 = function m() { return hyperscript_1$2.apply(this, arguments) };
	m$1.m = hyperscript_1$2;
	m$1.trust = hyperscript_1$2.trust;
	m$1.fragment = hyperscript_1$2.fragment;
	m$1.mount = mountRedraw$2.mount;
	m$1.route = route$1;
	m$1.render = render$2;
	m$1.redraw = mountRedraw$2.redraw;
	m$1.request = request$2.request;
	m$1.jsonp = request$2.jsonp;
	m$1.parseQueryString = parse$3;
	m$1.buildQueryString = build$3;
	m$1.parsePathname = parse$2;
	m$1.buildPathname = build$2;
	m$1.vnode = vnode$1;
	m$1.PromisePolyfill = polyfill$1;

	var mithril$1 = m$1;

	var types$1 = createCommonjsModule(function (module, exports) {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.ranks = exports.files = exports.colors = void 0;
	exports.colors = ['white', 'black'];
	exports.files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
	exports.ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];
	//# sourceMappingURL=types.js.map
	});

	var util$1 = createCommonjsModule(function (module, exports) {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.computeSquareCenter = exports.createEl = exports.isRightButton = exports.eventPosition = exports.setVisible = exports.translateRel = exports.translateAbs = exports.posToTranslateRel = exports.posToTranslateAbs = exports.samePiece = exports.distanceSq = exports.opposite = exports.timer = exports.memo = exports.allPos = exports.key2pos = exports.pos2key = exports.allKeys = exports.invRanks = void 0;

	exports.invRanks = [...types$1.ranks].reverse();
	exports.allKeys = Array.prototype.concat(...types$1.files.map(c => types$1.ranks.map(r => c + r)));
	const pos2key = (pos) => exports.allKeys[8 * pos[0] + pos[1]];
	exports.pos2key = pos2key;
	const key2pos = (k) => [k.charCodeAt(0) - 97, k.charCodeAt(1) - 49];
	exports.key2pos = key2pos;
	exports.allPos = exports.allKeys.map(exports.key2pos);
	function memo(f) {
	    let v;
	    const ret = () => {
	        if (v === undefined)
	            v = f();
	        return v;
	    };
	    ret.clear = () => {
	        v = undefined;
	    };
	    return ret;
	}
	exports.memo = memo;
	const timer = () => {
	    let startAt;
	    return {
	        start() {
	            startAt = performance.now();
	        },
	        cancel() {
	            startAt = undefined;
	        },
	        stop() {
	            if (!startAt)
	                return 0;
	            const time = performance.now() - startAt;
	            startAt = undefined;
	            return time;
	        },
	    };
	};
	exports.timer = timer;
	const opposite = (c) => (c === 'white' ? 'black' : 'white');
	exports.opposite = opposite;
	const distanceSq = (pos1, pos2) => {
	    const dx = pos1[0] - pos2[0], dy = pos1[1] - pos2[1];
	    return dx * dx + dy * dy;
	};
	exports.distanceSq = distanceSq;
	const samePiece = (p1, p2) => p1.role === p2.role && p1.color === p2.color;
	exports.samePiece = samePiece;
	const posToTranslateBase = (pos, asWhite, xFactor, yFactor) => [
	    (asWhite ? pos[0] : 7 - pos[0]) * xFactor,
	    (asWhite ? 7 - pos[1] : pos[1]) * yFactor,
	];
	const posToTranslateAbs = (bounds) => {
	    const xFactor = bounds.width / 8, yFactor = bounds.height / 8;
	    return (pos, asWhite) => posToTranslateBase(pos, asWhite, xFactor, yFactor);
	};
	exports.posToTranslateAbs = posToTranslateAbs;
	const posToTranslateRel = (pos, asWhite) => posToTranslateBase(pos, asWhite, 100, 100);
	exports.posToTranslateRel = posToTranslateRel;
	const translateAbs = (el, pos) => {
	    el.style.transform = `translate(${pos[0]}px,${pos[1]}px)`;
	};
	exports.translateAbs = translateAbs;
	const translateRel = (el, percents) => {
	    el.style.transform = `translate(${percents[0]}%,${percents[1]}%)`;
	};
	exports.translateRel = translateRel;
	const setVisible = (el, v) => {
	    el.style.visibility = v ? 'visible' : 'hidden';
	};
	exports.setVisible = setVisible;
	const eventPosition = (e) => {
	    var _a;
	    if (e.clientX || e.clientX === 0)
	        return [e.clientX, e.clientY];
	    if ((_a = e.targetTouches) === null || _a === void 0 ? void 0 : _a[0])
	        return [e.targetTouches[0].clientX, e.targetTouches[0].clientY];
	    return;
	};
	exports.eventPosition = eventPosition;
	const isRightButton = (e) => e.buttons === 2 || e.button === 2;
	exports.isRightButton = isRightButton;
	const createEl = (tagName, className) => {
	    const el = document.createElement(tagName);
	    if (className)
	        el.className = className;
	    return el;
	};
	exports.createEl = createEl;
	function computeSquareCenter(key, asWhite, bounds) {
	    const pos = exports.key2pos(key);
	    if (!asWhite) {
	        pos[0] = 7 - pos[0];
	        pos[1] = 7 - pos[1];
	    }
	    return [
	        bounds.left + (bounds.width * pos[0]) / 8 + bounds.width / 16,
	        bounds.top + (bounds.height * (7 - pos[1])) / 8 + bounds.height / 16,
	    ];
	}
	exports.computeSquareCenter = computeSquareCenter;
	//# sourceMappingURL=util.js.map
	});

	var premove_1 = createCommonjsModule(function (module, exports) {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.premove = exports.queen = exports.knight = void 0;

	function diff(a, b) {
	    return Math.abs(a - b);
	}
	function pawn(color) {
	    return (x1, y1, x2, y2) => diff(x1, x2) < 2 &&
	        (color === 'white'
	            ?
	                y2 === y1 + 1 || (y1 <= 1 && y2 === y1 + 2 && x1 === x2)
	            : y2 === y1 - 1 || (y1 >= 6 && y2 === y1 - 2 && x1 === x2));
	}
	const knight = (x1, y1, x2, y2) => {
	    const xd = diff(x1, x2);
	    const yd = diff(y1, y2);
	    return (xd === 1 && yd === 2) || (xd === 2 && yd === 1);
	};
	exports.knight = knight;
	const bishop = (x1, y1, x2, y2) => {
	    return diff(x1, x2) === diff(y1, y2);
	};
	const rook = (x1, y1, x2, y2) => {
	    return x1 === x2 || y1 === y2;
	};
	const queen = (x1, y1, x2, y2) => {
	    return bishop(x1, y1, x2, y2) || rook(x1, y1, x2, y2);
	};
	exports.queen = queen;
	function king(color, rookFiles, canCastle) {
	    return (x1, y1, x2, y2) => (diff(x1, x2) < 2 && diff(y1, y2) < 2) ||
	        (canCastle &&
	            y1 === y2 &&
	            y1 === (color === 'white' ? 0 : 7) &&
	            ((x1 === 4 && ((x2 === 2 && rookFiles.includes(0)) || (x2 === 6 && rookFiles.includes(7)))) ||
	                rookFiles.includes(x2)));
	}
	function rookFilesOf(pieces, color) {
	    const backrank = color === 'white' ? '1' : '8';
	    const files = [];
	    for (const [key, piece] of pieces) {
	        if (key[1] === backrank && piece.color === color && piece.role === 'rook') {
	            files.push(util$1.key2pos(key)[0]);
	        }
	    }
	    return files;
	}
	function premove(pieces, key, canCastle) {
	    const piece = pieces.get(key);
	    if (!piece)
	        return [];
	    const pos = util$1.key2pos(key), r = piece.role, mobility = r === 'pawn'
	        ? pawn(piece.color)
	        : r === 'knight'
	            ? exports.knight
	            : r === 'bishop'
	                ? bishop
	                : r === 'rook'
	                    ? rook
	                    : r === 'queen'
	                        ? exports.queen
	                        : king(piece.color, rookFilesOf(pieces, piece.color), canCastle);
	    return util$1.allPos
	        .filter(pos2 => (pos[0] !== pos2[0] || pos[1] !== pos2[1]) && mobility(pos[0], pos[1], pos2[0], pos2[1]))
	        .map(util$1.pos2key);
	}
	exports.premove = premove;
	//# sourceMappingURL=premove.js.map
	});

	var board$1 = createCommonjsModule(function (module, exports) {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.whitePov = exports.getSnappedKeyAtDomPos = exports.getKeyAtDomPos = exports.stop = exports.cancelMove = exports.playPredrop = exports.playPremove = exports.isDraggable = exports.canMove = exports.unselect = exports.setSelected = exports.selectSquare = exports.dropNewPiece = exports.userMove = exports.baseNewPiece = exports.baseMove = exports.unsetPredrop = exports.unsetPremove = exports.setCheck = exports.setPieces = exports.reset = exports.toggleOrientation = exports.callUserFunction = void 0;


	function callUserFunction(f, ...args) {
	    if (f)
	        setTimeout(() => f(...args), 1);
	}
	exports.callUserFunction = callUserFunction;
	function toggleOrientation(state) {
	    state.orientation = util$1.opposite(state.orientation);
	    state.animation.current = state.draggable.current = state.selected = undefined;
	}
	exports.toggleOrientation = toggleOrientation;
	function reset(state) {
	    state.lastMove = undefined;
	    unselect(state);
	    unsetPremove(state);
	    unsetPredrop(state);
	}
	exports.reset = reset;
	function setPieces(state, pieces) {
	    for (const [key, piece] of pieces) {
	        if (piece)
	            state.pieces.set(key, piece);
	        else
	            state.pieces.delete(key);
	    }
	}
	exports.setPieces = setPieces;
	function setCheck(state, color) {
	    state.check = undefined;
	    if (color === true)
	        color = state.turnColor;
	    if (color)
	        for (const [k, p] of state.pieces) {
	            if (p.role === 'king' && p.color === color) {
	                state.check = k;
	            }
	        }
	}
	exports.setCheck = setCheck;
	function setPremove(state, orig, dest, meta) {
	    unsetPredrop(state);
	    state.premovable.current = [orig, dest];
	    callUserFunction(state.premovable.events.set, orig, dest, meta);
	}
	function unsetPremove(state) {
	    if (state.premovable.current) {
	        state.premovable.current = undefined;
	        callUserFunction(state.premovable.events.unset);
	    }
	}
	exports.unsetPremove = unsetPremove;
	function setPredrop(state, role, key) {
	    unsetPremove(state);
	    state.predroppable.current = { role, key };
	    callUserFunction(state.predroppable.events.set, role, key);
	}
	function unsetPredrop(state) {
	    const pd = state.predroppable;
	    if (pd.current) {
	        pd.current = undefined;
	        callUserFunction(pd.events.unset);
	    }
	}
	exports.unsetPredrop = unsetPredrop;
	function tryAutoCastle(state, orig, dest) {
	    if (!state.autoCastle)
	        return false;
	    const king = state.pieces.get(orig);
	    if (!king || king.role !== 'king')
	        return false;
	    const origPos = util$1.key2pos(orig);
	    const destPos = util$1.key2pos(dest);
	    if ((origPos[1] !== 0 && origPos[1] !== 7) || origPos[1] !== destPos[1])
	        return false;
	    if (origPos[0] === 4 && !state.pieces.has(dest)) {
	        if (destPos[0] === 6)
	            dest = util$1.pos2key([7, destPos[1]]);
	        else if (destPos[0] === 2)
	            dest = util$1.pos2key([0, destPos[1]]);
	    }
	    const rook = state.pieces.get(dest);
	    if (!rook || rook.color !== king.color || rook.role !== 'rook')
	        return false;
	    state.pieces.delete(orig);
	    state.pieces.delete(dest);
	    if (origPos[0] < destPos[0]) {
	        state.pieces.set(util$1.pos2key([6, destPos[1]]), king);
	        state.pieces.set(util$1.pos2key([5, destPos[1]]), rook);
	    }
	    else {
	        state.pieces.set(util$1.pos2key([2, destPos[1]]), king);
	        state.pieces.set(util$1.pos2key([3, destPos[1]]), rook);
	    }
	    return true;
	}
	function baseMove(state, orig, dest) {
	    const origPiece = state.pieces.get(orig), destPiece = state.pieces.get(dest);
	    if (orig === dest || !origPiece)
	        return false;
	    const captured = destPiece && destPiece.color !== origPiece.color ? destPiece : undefined;
	    if (dest === state.selected)
	        unselect(state);
	    callUserFunction(state.events.move, orig, dest, captured);
	    if (!tryAutoCastle(state, orig, dest)) {
	        state.pieces.set(dest, origPiece);
	        state.pieces.delete(orig);
	    }
	    state.lastMove = [orig, dest];
	    state.check = undefined;
	    callUserFunction(state.events.change);
	    return captured || true;
	}
	exports.baseMove = baseMove;
	function baseNewPiece(state, piece, key, force) {
	    if (state.pieces.has(key)) {
	        if (force)
	            state.pieces.delete(key);
	        else
	            return false;
	    }
	    callUserFunction(state.events.dropNewPiece, piece, key);
	    state.pieces.set(key, piece);
	    state.lastMove = [key];
	    state.check = undefined;
	    callUserFunction(state.events.change);
	    state.movable.dests = undefined;
	    state.turnColor = util$1.opposite(state.turnColor);
	    return true;
	}
	exports.baseNewPiece = baseNewPiece;
	function baseUserMove(state, orig, dest) {
	    const result = baseMove(state, orig, dest);
	    if (result) {
	        state.movable.dests = undefined;
	        state.turnColor = util$1.opposite(state.turnColor);
	        state.animation.current = undefined;
	    }
	    return result;
	}
	function userMove(state, orig, dest) {
	    if (canMove(state, orig, dest)) {
	        const result = baseUserMove(state, orig, dest);
	        if (result) {
	            const holdTime = state.hold.stop();
	            unselect(state);
	            const metadata = {
	                premove: false,
	                ctrlKey: state.stats.ctrlKey,
	                holdTime,
	            };
	            if (result !== true)
	                metadata.captured = result;
	            callUserFunction(state.movable.events.after, orig, dest, metadata);
	            return true;
	        }
	    }
	    else if (canPremove(state, orig, dest)) {
	        setPremove(state, orig, dest, {
	            ctrlKey: state.stats.ctrlKey,
	        });
	        unselect(state);
	        return true;
	    }
	    unselect(state);
	    return false;
	}
	exports.userMove = userMove;
	function dropNewPiece(state, orig, dest, force) {
	    const piece = state.pieces.get(orig);
	    if (piece && (canDrop(state, orig, dest) || force)) {
	        state.pieces.delete(orig);
	        baseNewPiece(state, piece, dest, force);
	        callUserFunction(state.movable.events.afterNewPiece, piece.role, dest, {
	            premove: false,
	            predrop: false,
	        });
	    }
	    else if (piece && canPredrop(state, orig, dest)) {
	        setPredrop(state, piece.role, dest);
	    }
	    else {
	        unsetPremove(state);
	        unsetPredrop(state);
	    }
	    state.pieces.delete(orig);
	    unselect(state);
	}
	exports.dropNewPiece = dropNewPiece;
	function selectSquare(state, key, force) {
	    callUserFunction(state.events.select, key);
	    if (state.selected) {
	        if (state.selected === key && !state.draggable.enabled) {
	            unselect(state);
	            state.hold.cancel();
	            return;
	        }
	        else if ((state.selectable.enabled || force) && state.selected !== key) {
	            if (userMove(state, state.selected, key)) {
	                state.stats.dragged = false;
	                return;
	            }
	        }
	    }
	    if (isMovable(state, key) || isPremovable(state, key)) {
	        setSelected(state, key);
	        state.hold.start();
	    }
	}
	exports.selectSquare = selectSquare;
	function setSelected(state, key) {
	    state.selected = key;
	    if (isPremovable(state, key)) {
	        state.premovable.dests = premove_1.premove(state.pieces, key, state.premovable.castle);
	    }
	    else
	        state.premovable.dests = undefined;
	}
	exports.setSelected = setSelected;
	function unselect(state) {
	    state.selected = undefined;
	    state.premovable.dests = undefined;
	    state.hold.cancel();
	}
	exports.unselect = unselect;
	function isMovable(state, orig) {
	    const piece = state.pieces.get(orig);
	    return (!!piece &&
	        (state.movable.color === 'both' || (state.movable.color === piece.color && state.turnColor === piece.color)));
	}
	function canMove(state, orig, dest) {
	    var _a, _b;
	    return (orig !== dest && isMovable(state, orig) && (state.movable.free || !!((_b = (_a = state.movable.dests) === null || _a === void 0 ? void 0 : _a.get(orig)) === null || _b === void 0 ? void 0 : _b.includes(dest))));
	}
	exports.canMove = canMove;
	function canDrop(state, orig, dest) {
	    const piece = state.pieces.get(orig);
	    return (!!piece &&
	        (orig === dest || !state.pieces.has(dest)) &&
	        (state.movable.color === 'both' || (state.movable.color === piece.color && state.turnColor === piece.color)));
	}
	function isPremovable(state, orig) {
	    const piece = state.pieces.get(orig);
	    return !!piece && state.premovable.enabled && state.movable.color === piece.color && state.turnColor !== piece.color;
	}
	function canPremove(state, orig, dest) {
	    return (orig !== dest && isPremovable(state, orig) && premove_1.premove(state.pieces, orig, state.premovable.castle).includes(dest));
	}
	function canPredrop(state, orig, dest) {
	    const piece = state.pieces.get(orig);
	    const destPiece = state.pieces.get(dest);
	    return (!!piece &&
	        (!destPiece || destPiece.color !== state.movable.color) &&
	        state.predroppable.enabled &&
	        (piece.role !== 'pawn' || (dest[1] !== '1' && dest[1] !== '8')) &&
	        state.movable.color === piece.color &&
	        state.turnColor !== piece.color);
	}
	function isDraggable(state, orig) {
	    const piece = state.pieces.get(orig);
	    return (!!piece &&
	        state.draggable.enabled &&
	        (state.movable.color === 'both' ||
	            (state.movable.color === piece.color && (state.turnColor === piece.color || state.premovable.enabled))));
	}
	exports.isDraggable = isDraggable;
	function playPremove(state) {
	    const move = state.premovable.current;
	    if (!move)
	        return false;
	    const orig = move[0], dest = move[1];
	    let success = false;
	    if (canMove(state, orig, dest)) {
	        const result = baseUserMove(state, orig, dest);
	        if (result) {
	            const metadata = { premove: true };
	            if (result !== true)
	                metadata.captured = result;
	            callUserFunction(state.movable.events.after, orig, dest, metadata);
	            success = true;
	        }
	    }
	    unsetPremove(state);
	    return success;
	}
	exports.playPremove = playPremove;
	function playPredrop(state, validate) {
	    const drop = state.predroppable.current;
	    let success = false;
	    if (!drop)
	        return false;
	    if (validate(drop)) {
	        const piece = {
	            role: drop.role,
	            color: state.movable.color,
	        };
	        if (baseNewPiece(state, piece, drop.key)) {
	            callUserFunction(state.movable.events.afterNewPiece, drop.role, drop.key, {
	                premove: false,
	                predrop: true,
	            });
	            success = true;
	        }
	    }
	    unsetPredrop(state);
	    return success;
	}
	exports.playPredrop = playPredrop;
	function cancelMove(state) {
	    unsetPremove(state);
	    unsetPredrop(state);
	    unselect(state);
	}
	exports.cancelMove = cancelMove;
	function stop(state) {
	    state.movable.color = state.movable.dests = state.animation.current = undefined;
	    cancelMove(state);
	}
	exports.stop = stop;
	function getKeyAtDomPos(pos, asWhite, bounds) {
	    let file = Math.floor((8 * (pos[0] - bounds.left)) / bounds.width);
	    if (!asWhite)
	        file = 7 - file;
	    let rank = 7 - Math.floor((8 * (pos[1] - bounds.top)) / bounds.height);
	    if (!asWhite)
	        rank = 7 - rank;
	    return file >= 0 && file < 8 && rank >= 0 && rank < 8 ? util$1.pos2key([file, rank]) : undefined;
	}
	exports.getKeyAtDomPos = getKeyAtDomPos;
	function getSnappedKeyAtDomPos(orig, pos, asWhite, bounds) {
	    const origPos = util$1.key2pos(orig);
	    const validSnapPos = util$1.allPos.filter(pos2 => {
	        return premove_1.queen(origPos[0], origPos[1], pos2[0], pos2[1]) || premove_1.knight(origPos[0], origPos[1], pos2[0], pos2[1]);
	    });
	    const validSnapCenters = validSnapPos.map(pos2 => util$1.computeSquareCenter(util$1.pos2key(pos2), asWhite, bounds));
	    const validSnapDistances = validSnapCenters.map(pos2 => util$1.distanceSq(pos, pos2));
	    const [, closestSnapIndex] = validSnapDistances.reduce((a, b, index) => (a[0] < b ? a : [b, index]), [
	        validSnapDistances[0],
	        0,
	    ]);
	    return util$1.pos2key(validSnapPos[closestSnapIndex]);
	}
	exports.getSnappedKeyAtDomPos = getSnappedKeyAtDomPos;
	function whitePov(s) {
	    return s.orientation === 'white';
	}
	exports.whitePov = whitePov;
	//# sourceMappingURL=board.js.map
	});

	var fen$1 = createCommonjsModule(function (module, exports) {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.write = exports.read = exports.initial = void 0;


	exports.initial = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';
	const roles = {
	    p: 'pawn',
	    r: 'rook',
	    n: 'knight',
	    b: 'bishop',
	    q: 'queen',
	    k: 'king',
	};
	const letters = {
	    pawn: 'p',
	    rook: 'r',
	    knight: 'n',
	    bishop: 'b',
	    queen: 'q',
	    king: 'k',
	};
	function read(fen) {
	    if (fen === 'start')
	        fen = exports.initial;
	    const pieces = new Map();
	    let row = 7, col = 0;
	    for (const c of fen) {
	        switch (c) {
	            case ' ':
	                return pieces;
	            case '/':
	                --row;
	                if (row < 0)
	                    return pieces;
	                col = 0;
	                break;
	            case '~':
	                const piece = pieces.get(util$1.pos2key([col, row]));
	                if (piece)
	                    piece.promoted = true;
	                break;
	            default:
	                const nb = c.charCodeAt(0);
	                if (nb < 57)
	                    col += nb - 48;
	                else {
	                    const role = c.toLowerCase();
	                    pieces.set(util$1.pos2key([col, row]), {
	                        role: roles[role],
	                        color: c === role ? 'black' : 'white',
	                    });
	                    ++col;
	                }
	        }
	    }
	    return pieces;
	}
	exports.read = read;
	function write(pieces) {
	    return util$1.invRanks
	        .map(y => types$1.files
	        .map(x => {
	        const piece = pieces.get((x + y));
	        if (piece) {
	            const letter = letters[piece.role];
	            return piece.color === 'white' ? letter.toUpperCase() : letter;
	        }
	        else
	            return '1';
	    })
	        .join(''))
	        .join('/')
	        .replace(/1{2,}/g, s => s.length.toString());
	}
	exports.write = write;
	//# sourceMappingURL=fen.js.map
	});

	var config = createCommonjsModule(function (module, exports) {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.configure = void 0;


	function configure(state, config) {
	    var _a;
	    if ((_a = config.movable) === null || _a === void 0 ? void 0 : _a.dests)
	        state.movable.dests = undefined;
	    merge(state, config);
	    if (config.fen) {
	        state.pieces = fen$1.read(config.fen);
	        state.drawable.shapes = [];
	    }
	    if (config.hasOwnProperty('check'))
	        board$1.setCheck(state, config.check || false);
	    if (config.hasOwnProperty('lastMove') && !config.lastMove)
	        state.lastMove = undefined;
	    else if (config.lastMove)
	        state.lastMove = config.lastMove;
	    if (state.selected)
	        board$1.setSelected(state, state.selected);
	    if (!state.animation.duration || state.animation.duration < 100)
	        state.animation.enabled = false;
	    if (!state.movable.rookCastle && state.movable.dests) {
	        const rank = state.movable.color === 'white' ? '1' : '8', kingStartPos = ('e' + rank), dests = state.movable.dests.get(kingStartPos), king = state.pieces.get(kingStartPos);
	        if (!dests || !king || king.role !== 'king')
	            return;
	        state.movable.dests.set(kingStartPos, dests.filter(d => !(d === 'a' + rank && dests.includes(('c' + rank))) &&
	            !(d === 'h' + rank && dests.includes(('g' + rank)))));
	    }
	}
	exports.configure = configure;
	function merge(base, extend) {
	    for (const key in extend) {
	        if (isObject(base[key]) && isObject(extend[key]))
	            merge(base[key], extend[key]);
	        else
	            base[key] = extend[key];
	    }
	}
	function isObject(o) {
	    return typeof o === 'object';
	}
	//# sourceMappingURL=config.js.map
	});

	var anim_1 = createCommonjsModule(function (module, exports) {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.render = exports.anim = void 0;

	function anim(mutation, state) {
	    return state.animation.enabled ? animate(mutation, state) : render(mutation, state);
	}
	exports.anim = anim;
	function render(mutation, state) {
	    const result = mutation(state);
	    state.dom.redraw();
	    return result;
	}
	exports.render = render;
	function makePiece(key, piece) {
	    return {
	        key: key,
	        pos: util$1.key2pos(key),
	        piece: piece,
	    };
	}
	function closer(piece, pieces) {
	    return pieces.sort((p1, p2) => {
	        return util$1.distanceSq(piece.pos, p1.pos) - util$1.distanceSq(piece.pos, p2.pos);
	    })[0];
	}
	function computePlan(prevPieces, current) {
	    const anims = new Map(), animedOrigs = [], fadings = new Map(), missings = [], news = [], prePieces = new Map();
	    let curP, preP, vector;
	    for (const [k, p] of prevPieces) {
	        prePieces.set(k, makePiece(k, p));
	    }
	    for (const key of util$1.allKeys) {
	        curP = current.pieces.get(key);
	        preP = prePieces.get(key);
	        if (curP) {
	            if (preP) {
	                if (!util$1.samePiece(curP, preP.piece)) {
	                    missings.push(preP);
	                    news.push(makePiece(key, curP));
	                }
	            }
	            else
	                news.push(makePiece(key, curP));
	        }
	        else if (preP)
	            missings.push(preP);
	    }
	    for (const newP of news) {
	        preP = closer(newP, missings.filter(p => util$1.samePiece(newP.piece, p.piece)));
	        if (preP) {
	            vector = [preP.pos[0] - newP.pos[0], preP.pos[1] - newP.pos[1]];
	            anims.set(newP.key, vector.concat(vector));
	            animedOrigs.push(preP.key);
	        }
	    }
	    for (const p of missings) {
	        if (!animedOrigs.includes(p.key))
	            fadings.set(p.key, p.piece);
	    }
	    return {
	        anims: anims,
	        fadings: fadings,
	    };
	}
	function step(state, now) {
	    const cur = state.animation.current;
	    if (cur === undefined) {
	        if (!state.dom.destroyed)
	            state.dom.redrawNow();
	        return;
	    }
	    const rest = 1 - (now - cur.start) * cur.frequency;
	    if (rest <= 0) {
	        state.animation.current = undefined;
	        state.dom.redrawNow();
	    }
	    else {
	        const ease = easing(rest);
	        for (const cfg of cur.plan.anims.values()) {
	            cfg[2] = cfg[0] * ease;
	            cfg[3] = cfg[1] * ease;
	        }
	        state.dom.redrawNow(true);
	        requestAnimationFrame((now = performance.now()) => step(state, now));
	    }
	}
	function animate(mutation, state) {
	    const prevPieces = new Map(state.pieces);
	    const result = mutation(state);
	    const plan = computePlan(prevPieces, state);
	    if (plan.anims.size || plan.fadings.size) {
	        const alreadyRunning = state.animation.current && state.animation.current.start;
	        state.animation.current = {
	            start: performance.now(),
	            frequency: 1 / state.animation.duration,
	            plan: plan,
	        };
	        if (!alreadyRunning)
	            step(state, performance.now());
	    }
	    else {
	        state.dom.redraw();
	    }
	    return result;
	}
	function easing(t) {
	    return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
	}
	//# sourceMappingURL=anim.js.map
	});

	var draw = createCommonjsModule(function (module, exports) {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.clear = exports.cancel = exports.end = exports.move = exports.processDraw = exports.start = void 0;


	const brushes = ['green', 'red', 'blue', 'yellow'];
	function start(state, e) {
	    if (e.touches && e.touches.length > 1)
	        return;
	    e.stopPropagation();
	    e.preventDefault();
	    e.ctrlKey ? board$1.unselect(state) : board$1.cancelMove(state);
	    const pos = util$1.eventPosition(e), orig = board$1.getKeyAtDomPos(pos, board$1.whitePov(state), state.dom.bounds());
	    if (!orig)
	        return;
	    state.drawable.current = {
	        orig,
	        pos,
	        brush: eventBrush(e),
	        snapToValidMove: state.drawable.defaultSnapToValidMove,
	    };
	    processDraw(state);
	}
	exports.start = start;
	function processDraw(state) {
	    requestAnimationFrame(() => {
	        const cur = state.drawable.current;
	        if (cur) {
	            const keyAtDomPos = board$1.getKeyAtDomPos(cur.pos, board$1.whitePov(state), state.dom.bounds());
	            if (!keyAtDomPos) {
	                cur.snapToValidMove = false;
	            }
	            const mouseSq = cur.snapToValidMove
	                ? board$1.getSnappedKeyAtDomPos(cur.orig, cur.pos, board$1.whitePov(state), state.dom.bounds())
	                : keyAtDomPos;
	            if (mouseSq !== cur.mouseSq) {
	                cur.mouseSq = mouseSq;
	                cur.dest = mouseSq !== cur.orig ? mouseSq : undefined;
	                state.dom.redrawNow();
	            }
	            processDraw(state);
	        }
	    });
	}
	exports.processDraw = processDraw;
	function move(state, e) {
	    if (state.drawable.current)
	        state.drawable.current.pos = util$1.eventPosition(e);
	}
	exports.move = move;
	function end(state) {
	    const cur = state.drawable.current;
	    if (cur) {
	        if (cur.mouseSq)
	            addShape(state.drawable, cur);
	        cancel(state);
	    }
	}
	exports.end = end;
	function cancel(state) {
	    if (state.drawable.current) {
	        state.drawable.current = undefined;
	        state.dom.redraw();
	    }
	}
	exports.cancel = cancel;
	function clear(state) {
	    if (state.drawable.shapes.length) {
	        state.drawable.shapes = [];
	        state.dom.redraw();
	        onChange(state.drawable);
	    }
	}
	exports.clear = clear;
	function eventBrush(e) {
	    var _a;
	    const modA = (e.shiftKey || e.ctrlKey) && util$1.isRightButton(e);
	    const modB = e.altKey || e.metaKey || ((_a = e.getModifierState) === null || _a === void 0 ? void 0 : _a.call(e, 'AltGraph'));
	    return brushes[(modA ? 1 : 0) + (modB ? 2 : 0)];
	}
	function addShape(drawable, cur) {
	    const sameShape = (s) => s.orig === cur.orig && s.dest === cur.dest;
	    const similar = drawable.shapes.find(sameShape);
	    if (similar)
	        drawable.shapes = drawable.shapes.filter(s => !sameShape(s));
	    if (!similar || similar.brush !== cur.brush)
	        drawable.shapes.push(cur);
	    onChange(drawable);
	}
	function onChange(drawable) {
	    if (drawable.onChange)
	        drawable.onChange(drawable.shapes);
	}
	//# sourceMappingURL=draw.js.map
	});

	var drag = createCommonjsModule(function (module, exports) {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.cancel = exports.end = exports.move = exports.dragNewPiece = exports.start = void 0;




	function start(s, e) {
	    if (!e.isTrusted || (e.button !== undefined && e.button !== 0))
	        return;
	    if (e.touches && e.touches.length > 1)
	        return;
	    const bounds = s.dom.bounds(), position = util$1.eventPosition(e), orig = board$1.getKeyAtDomPos(position, board$1.whitePov(s), bounds);
	    if (!orig)
	        return;
	    const piece = s.pieces.get(orig);
	    const previouslySelected = s.selected;
	    if (!previouslySelected && s.drawable.enabled && (s.drawable.eraseOnClick || !piece || piece.color !== s.turnColor))
	        draw.clear(s);
	    if (e.cancelable !== false &&
	        (!e.touches || !s.movable.color || piece || previouslySelected || pieceCloseTo(s, position)))
	        e.preventDefault();
	    const hadPremove = !!s.premovable.current;
	    const hadPredrop = !!s.predroppable.current;
	    s.stats.ctrlKey = e.ctrlKey;
	    if (s.selected && board$1.canMove(s, s.selected, orig)) {
	        anim_1.anim(state => board$1.selectSquare(state, orig), s);
	    }
	    else {
	        board$1.selectSquare(s, orig);
	    }
	    const stillSelected = s.selected === orig;
	    const element = pieceElementByKey(s, orig);
	    if (piece && element && stillSelected && board$1.isDraggable(s, orig)) {
	        s.draggable.current = {
	            orig,
	            piece,
	            origPos: position,
	            pos: position,
	            started: s.draggable.autoDistance && s.stats.dragged,
	            element,
	            previouslySelected,
	            originTarget: e.target,
	        };
	        element.cgDragging = true;
	        element.classList.add('dragging');
	        const ghost = s.dom.elements.ghost;
	        if (ghost) {
	            ghost.className = `ghost ${piece.color} ${piece.role}`;
	            util$1.translateAbs(ghost, util$1.posToTranslateAbs(bounds)(util$1.key2pos(orig), board$1.whitePov(s)));
	            util$1.setVisible(ghost, true);
	        }
	        processDrag(s);
	    }
	    else {
	        if (hadPremove)
	            board$1.unsetPremove(s);
	        if (hadPredrop)
	            board$1.unsetPredrop(s);
	    }
	    s.dom.redraw();
	}
	exports.start = start;
	function pieceCloseTo(s, pos) {
	    const asWhite = board$1.whitePov(s), bounds = s.dom.bounds(), radiusSq = Math.pow(bounds.width / 8, 2);
	    for (const key in s.pieces) {
	        const center = util$1.computeSquareCenter(key, asWhite, bounds);
	        if (util$1.distanceSq(center, pos) <= radiusSq)
	            return true;
	    }
	    return false;
	}
	function dragNewPiece(s, piece, e, force) {
	    const key = 'a0';
	    s.pieces.set(key, piece);
	    s.dom.redraw();
	    const position = util$1.eventPosition(e);
	    s.draggable.current = {
	        orig: key,
	        piece,
	        origPos: position,
	        pos: position,
	        started: true,
	        element: () => pieceElementByKey(s, key),
	        originTarget: e.target,
	        newPiece: true,
	        force: !!force,
	    };
	    processDrag(s);
	}
	exports.dragNewPiece = dragNewPiece;
	function processDrag(s) {
	    requestAnimationFrame(() => {
	        var _a;
	        const cur = s.draggable.current;
	        if (!cur)
	            return;
	        if ((_a = s.animation.current) === null || _a === void 0 ? void 0 : _a.plan.anims.has(cur.orig))
	            s.animation.current = undefined;
	        const origPiece = s.pieces.get(cur.orig);
	        if (!origPiece || !util$1.samePiece(origPiece, cur.piece))
	            cancel(s);
	        else {
	            if (!cur.started && util$1.distanceSq(cur.pos, cur.origPos) >= Math.pow(s.draggable.distance, 2))
	                cur.started = true;
	            if (cur.started) {
	                if (typeof cur.element === 'function') {
	                    const found = cur.element();
	                    if (!found)
	                        return;
	                    found.cgDragging = true;
	                    found.classList.add('dragging');
	                    cur.element = found;
	                }
	                const bounds = s.dom.bounds();
	                util$1.translateAbs(cur.element, [
	                    cur.pos[0] - bounds.left - bounds.width / 16,
	                    cur.pos[1] - bounds.top - bounds.height / 16,
	                ]);
	            }
	        }
	        processDrag(s);
	    });
	}
	function move(s, e) {
	    if (s.draggable.current && (!e.touches || e.touches.length < 2)) {
	        s.draggable.current.pos = util$1.eventPosition(e);
	    }
	}
	exports.move = move;
	function end(s, e) {
	    const cur = s.draggable.current;
	    if (!cur)
	        return;
	    if (e.type === 'touchend' && e.cancelable !== false)
	        e.preventDefault();
	    if (e.type === 'touchend' && cur.originTarget !== e.target && !cur.newPiece) {
	        s.draggable.current = undefined;
	        return;
	    }
	    board$1.unsetPremove(s);
	    board$1.unsetPredrop(s);
	    const eventPos = util$1.eventPosition(e) || cur.pos;
	    const dest = board$1.getKeyAtDomPos(eventPos, board$1.whitePov(s), s.dom.bounds());
	    if (dest && cur.started && cur.orig !== dest) {
	        if (cur.newPiece)
	            board$1.dropNewPiece(s, cur.orig, dest, cur.force);
	        else {
	            s.stats.ctrlKey = e.ctrlKey;
	            if (board$1.userMove(s, cur.orig, dest))
	                s.stats.dragged = true;
	        }
	    }
	    else if (cur.newPiece) {
	        s.pieces.delete(cur.orig);
	    }
	    else if (s.draggable.deleteOnDropOff && !dest) {
	        s.pieces.delete(cur.orig);
	        board$1.callUserFunction(s.events.change);
	    }
	    if (cur.orig === cur.previouslySelected && (cur.orig === dest || !dest))
	        board$1.unselect(s);
	    else if (!s.selectable.enabled)
	        board$1.unselect(s);
	    removeDragElements(s);
	    s.draggable.current = undefined;
	    s.dom.redraw();
	}
	exports.end = end;
	function cancel(s) {
	    const cur = s.draggable.current;
	    if (cur) {
	        if (cur.newPiece)
	            s.pieces.delete(cur.orig);
	        s.draggable.current = undefined;
	        board$1.unselect(s);
	        removeDragElements(s);
	        s.dom.redraw();
	    }
	}
	exports.cancel = cancel;
	function removeDragElements(s) {
	    const e = s.dom.elements;
	    if (e.ghost)
	        util$1.setVisible(e.ghost, false);
	}
	function pieceElementByKey(s, key) {
	    let el = s.dom.elements.board.firstChild;
	    while (el) {
	        if (el.cgKey === key && el.tagName === 'PIECE')
	            return el;
	        el = el.nextSibling;
	    }
	    return;
	}
	//# sourceMappingURL=drag.js.map
	});

	var explosion_1 = createCommonjsModule(function (module, exports) {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.explosion = void 0;
	function explosion(state, keys) {
	    state.exploding = { stage: 1, keys };
	    state.dom.redraw();
	    setTimeout(() => {
	        setStage(state, 2);
	        setTimeout(() => setStage(state, undefined), 120);
	    }, 120);
	}
	exports.explosion = explosion;
	function setStage(state, stage) {
	    if (state.exploding) {
	        if (stage)
	            state.exploding.stage = stage;
	        else
	            state.exploding = undefined;
	        state.dom.redraw();
	    }
	}
	//# sourceMappingURL=explosion.js.map
	});

	var api = createCommonjsModule(function (module, exports) {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.start = void 0;






	function start(state, redrawAll) {
	    function toggleOrientation() {
	        board$1.toggleOrientation(state);
	        redrawAll();
	    }
	    return {
	        set(config$1) {
	            if (config$1.orientation && config$1.orientation !== state.orientation)
	                toggleOrientation();
	            (config$1.fen ? anim_1.anim : anim_1.render)(state => config.configure(state, config$1), state);
	        },
	        state,
	        getFen: () => fen$1.write(state.pieces),
	        toggleOrientation,
	        setPieces(pieces) {
	            anim_1.anim(state => board$1.setPieces(state, pieces), state);
	        },
	        selectSquare(key, force) {
	            if (key)
	                anim_1.anim(state => board$1.selectSquare(state, key, force), state);
	            else if (state.selected) {
	                board$1.unselect(state);
	                state.dom.redraw();
	            }
	        },
	        move(orig, dest) {
	            anim_1.anim(state => board$1.baseMove(state, orig, dest), state);
	        },
	        newPiece(piece, key) {
	            anim_1.anim(state => board$1.baseNewPiece(state, piece, key), state);
	        },
	        playPremove() {
	            if (state.premovable.current) {
	                if (anim_1.anim(board$1.playPremove, state))
	                    return true;
	                state.dom.redraw();
	            }
	            return false;
	        },
	        playPredrop(validate) {
	            if (state.predroppable.current) {
	                const result = board$1.playPredrop(state, validate);
	                state.dom.redraw();
	                return result;
	            }
	            return false;
	        },
	        cancelPremove() {
	            anim_1.render(board$1.unsetPremove, state);
	        },
	        cancelPredrop() {
	            anim_1.render(board$1.unsetPredrop, state);
	        },
	        cancelMove() {
	            anim_1.render(state => {
	                board$1.cancelMove(state);
	                drag.cancel(state);
	            }, state);
	        },
	        stop() {
	            anim_1.render(state => {
	                board$1.stop(state);
	                drag.cancel(state);
	            }, state);
	        },
	        explode(keys) {
	            explosion_1.explosion(state, keys);
	        },
	        setAutoShapes(shapes) {
	            anim_1.render(state => (state.drawable.autoShapes = shapes), state);
	        },
	        setShapes(shapes) {
	            anim_1.render(state => (state.drawable.shapes = shapes), state);
	        },
	        getKeyAtDomPos(pos) {
	            return board$1.getKeyAtDomPos(pos, board$1.whitePov(state), state.dom.bounds());
	        },
	        redrawAll,
	        dragNewPiece(piece, event, force) {
	            drag.dragNewPiece(state, piece, event, force);
	        },
	        destroy() {
	            board$1.stop(state);
	            state.dom.unbind && state.dom.unbind();
	            state.dom.destroyed = true;
	        },
	    };
	}
	exports.start = start;
	//# sourceMappingURL=api.js.map
	});

	var state = createCommonjsModule(function (module, exports) {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.defaults = void 0;


	function defaults() {
	    return {
	        pieces: fen$1.read(fen$1.initial),
	        orientation: 'white',
	        turnColor: 'white',
	        coordinates: true,
	        autoCastle: true,
	        viewOnly: false,
	        disableContextMenu: false,
	        resizable: true,
	        addPieceZIndex: false,
	        pieceKey: false,
	        highlight: {
	            lastMove: true,
	            check: true,
	        },
	        animation: {
	            enabled: true,
	            duration: 200,
	        },
	        movable: {
	            free: true,
	            color: 'both',
	            showDests: true,
	            events: {},
	            rookCastle: true,
	        },
	        premovable: {
	            enabled: true,
	            showDests: true,
	            castle: true,
	            events: {},
	        },
	        predroppable: {
	            enabled: false,
	            events: {},
	        },
	        draggable: {
	            enabled: true,
	            distance: 3,
	            autoDistance: true,
	            showGhost: true,
	            deleteOnDropOff: false,
	        },
	        dropmode: {
	            active: false,
	        },
	        selectable: {
	            enabled: true,
	        },
	        stats: {
	            dragged: !('ontouchstart' in window),
	        },
	        events: {},
	        drawable: {
	            enabled: true,
	            visible: true,
	            defaultSnapToValidMove: true,
	            eraseOnClick: true,
	            shapes: [],
	            autoShapes: [],
	            brushes: {
	                green: { key: 'g', color: '#15781B', opacity: 1, lineWidth: 10 },
	                red: { key: 'r', color: '#882020', opacity: 1, lineWidth: 10 },
	                blue: { key: 'b', color: '#003088', opacity: 1, lineWidth: 10 },
	                yellow: { key: 'y', color: '#e68f00', opacity: 1, lineWidth: 10 },
	                paleBlue: { key: 'pb', color: '#003088', opacity: 0.4, lineWidth: 15 },
	                paleGreen: { key: 'pg', color: '#15781B', opacity: 0.4, lineWidth: 15 },
	                paleRed: { key: 'pr', color: '#882020', opacity: 0.4, lineWidth: 15 },
	                paleGrey: {
	                    key: 'pgr',
	                    color: '#4a4a4a',
	                    opacity: 0.35,
	                    lineWidth: 15,
	                },
	            },
	            pieces: {
	                baseUrl: 'https://lichess1.org/assets/piece/cburnett/',
	            },
	            prevSvgHash: '',
	        },
	        hold: util$1.timer(),
	    };
	}
	exports.defaults = defaults;
	//# sourceMappingURL=state.js.map
	});

	var svg = createCommonjsModule(function (module, exports) {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.setAttributes = exports.renderSvg = exports.createElement = void 0;

	function createElement(tagName) {
	    return document.createElementNS('http://www.w3.org/2000/svg', tagName);
	}
	exports.createElement = createElement;
	function renderSvg(state, svg, customSvg) {
	    const d = state.drawable, curD = d.current, cur = curD && curD.mouseSq ? curD : undefined, arrowDests = new Map(), bounds = state.dom.bounds();
	    for (const s of d.shapes.concat(d.autoShapes).concat(cur ? [cur] : [])) {
	        if (s.dest)
	            arrowDests.set(s.dest, (arrowDests.get(s.dest) || 0) + 1);
	    }
	    const shapes = d.shapes.concat(d.autoShapes).map((s) => {
	        return {
	            shape: s,
	            current: false,
	            hash: shapeHash(s, arrowDests, false, bounds),
	        };
	    });
	    if (cur)
	        shapes.push({
	            shape: cur,
	            current: true,
	            hash: shapeHash(cur, arrowDests, true, bounds),
	        });
	    const fullHash = shapes.map(sc => sc.hash).join(';');
	    if (fullHash === state.drawable.prevSvgHash)
	        return;
	    state.drawable.prevSvgHash = fullHash;
	    const defsEl = svg.querySelector('defs');
	    const shapesEl = svg.querySelector('g');
	    const customSvgsEl = customSvg.querySelector('g');
	    syncDefs(d, shapes, defsEl);
	    syncShapes(state, shapes.filter(s => !s.shape.customSvg), d.brushes, arrowDests, shapesEl);
	    syncShapes(state, shapes.filter(s => s.shape.customSvg), d.brushes, arrowDests, customSvgsEl);
	}
	exports.renderSvg = renderSvg;
	function syncDefs(d, shapes, defsEl) {
	    const brushes = new Map();
	    let brush;
	    for (const s of shapes) {
	        if (s.shape.dest) {
	            brush = d.brushes[s.shape.brush];
	            if (s.shape.modifiers)
	                brush = makeCustomBrush(brush, s.shape.modifiers);
	            brushes.set(brush.key, brush);
	        }
	    }
	    const keysInDom = new Set();
	    let el = defsEl.firstChild;
	    while (el) {
	        keysInDom.add(el.getAttribute('cgKey'));
	        el = el.nextSibling;
	    }
	    for (const [key, brush] of brushes.entries()) {
	        if (!keysInDom.has(key))
	            defsEl.appendChild(renderMarker(brush));
	    }
	}
	function syncShapes(state, shapes, brushes, arrowDests, root) {
	    const bounds = state.dom.bounds(), hashesInDom = new Map(), toRemove = [];
	    for (const sc of shapes)
	        hashesInDom.set(sc.hash, false);
	    let el = root.firstChild, elHash;
	    while (el) {
	        elHash = el.getAttribute('cgHash');
	        if (hashesInDom.has(elHash))
	            hashesInDom.set(elHash, true);
	        else
	            toRemove.push(el);
	        el = el.nextSibling;
	    }
	    for (const el of toRemove)
	        root.removeChild(el);
	    for (const sc of shapes) {
	        if (!hashesInDom.get(sc.hash))
	            root.appendChild(renderShape(state, sc, brushes, arrowDests, bounds));
	    }
	}
	function shapeHash({ orig, dest, brush, piece, modifiers, customSvg }, arrowDests, current, bounds) {
	    return [
	        bounds.width,
	        bounds.height,
	        current,
	        orig,
	        dest,
	        brush,
	        dest && (arrowDests.get(dest) || 0) > 1,
	        piece && pieceHash(piece),
	        modifiers && modifiersHash(modifiers),
	        customSvg && customSvgHash(customSvg),
	    ]
	        .filter(x => x)
	        .join(',');
	}
	function pieceHash(piece) {
	    return [piece.color, piece.role, piece.scale].filter(x => x).join(',');
	}
	function modifiersHash(m) {
	    return '' + (m.lineWidth || '');
	}
	function customSvgHash(s) {
	    let h = 0;
	    for (let i = 0; i < s.length; i++) {
	        h = (((h << 5) - h) + s.charCodeAt(i)) >>> 0;
	    }
	    return 'custom-' + h.toString();
	}
	function renderShape(state, { shape, current, hash }, brushes, arrowDests, bounds) {
	    let el;
	    if (shape.customSvg) {
	        const orig = orient(util$1.key2pos(shape.orig), state.orientation);
	        el = renderCustomSvg(shape.customSvg, orig, bounds);
	    }
	    else if (shape.piece)
	        el = renderPiece(state.drawable.pieces.baseUrl, orient(util$1.key2pos(shape.orig), state.orientation), shape.piece, bounds);
	    else {
	        const orig = orient(util$1.key2pos(shape.orig), state.orientation);
	        if (shape.dest) {
	            let brush = brushes[shape.brush];
	            if (shape.modifiers)
	                brush = makeCustomBrush(brush, shape.modifiers);
	            el = renderArrow(brush, orig, orient(util$1.key2pos(shape.dest), state.orientation), current, (arrowDests.get(shape.dest) || 0) > 1, bounds);
	        }
	        else
	            el = renderCircle(brushes[shape.brush], orig, current, bounds);
	    }
	    el.setAttribute('cgHash', hash);
	    return el;
	}
	function renderCustomSvg(customSvg, pos, bounds) {
	    const { width, height } = bounds;
	    const w = width / 8;
	    const h = height / 8;
	    const x = pos[0] * w;
	    const y = (7 - pos[1]) * h;
	    const g = setAttributes(createElement('g'), { transform: `translate(${x},${y})` });
	    const svg = setAttributes(createElement('svg'), { width: w, height: h, viewBox: '0 0 100 100' });
	    g.appendChild(svg);
	    svg.innerHTML = customSvg;
	    return g;
	}
	function renderCircle(brush, pos, current, bounds) {
	    const o = pos2px(pos, bounds), widths = circleWidth(bounds), radius = (bounds.width + bounds.height) / 32;
	    return setAttributes(createElement('circle'), {
	        stroke: brush.color,
	        'stroke-width': widths[current ? 0 : 1],
	        fill: 'none',
	        opacity: opacity(brush, current),
	        cx: o[0],
	        cy: o[1],
	        r: radius - widths[1] / 2,
	    });
	}
	function renderArrow(brush, orig, dest, current, shorten, bounds) {
	    const m = arrowMargin(bounds, shorten && !current), a = pos2px(orig, bounds), b = pos2px(dest, bounds), dx = b[0] - a[0], dy = b[1] - a[1], angle = Math.atan2(dy, dx), xo = Math.cos(angle) * m, yo = Math.sin(angle) * m;
	    return setAttributes(createElement('line'), {
	        stroke: brush.color,
	        'stroke-width': lineWidth(brush, current, bounds),
	        'stroke-linecap': 'round',
	        'marker-end': 'url(#arrowhead-' + brush.key + ')',
	        opacity: opacity(brush, current),
	        x1: a[0],
	        y1: a[1],
	        x2: b[0] - xo,
	        y2: b[1] - yo,
	    });
	}
	function renderPiece(baseUrl, pos, piece, bounds) {
	    const o = pos2px(pos, bounds), size = (bounds.width / 8) * (piece.scale || 1), name = piece.color[0] + (piece.role === 'knight' ? 'n' : piece.role[0]).toUpperCase();
	    return setAttributes(createElement('image'), {
	        className: `${piece.role} ${piece.color}`,
	        x: o[0] - size / 2,
	        y: o[1] - size / 2,
	        width: size,
	        height: size,
	        href: baseUrl + name + '.svg',
	    });
	}
	function renderMarker(brush) {
	    const marker = setAttributes(createElement('marker'), {
	        id: 'arrowhead-' + brush.key,
	        orient: 'auto',
	        markerWidth: 4,
	        markerHeight: 8,
	        refX: 2.05,
	        refY: 2.01,
	    });
	    marker.appendChild(setAttributes(createElement('path'), {
	        d: 'M0,0 V4 L3,2 Z',
	        fill: brush.color,
	    }));
	    marker.setAttribute('cgKey', brush.key);
	    return marker;
	}
	function setAttributes(el, attrs) {
	    for (const key in attrs)
	        el.setAttribute(key, attrs[key]);
	    return el;
	}
	exports.setAttributes = setAttributes;
	function orient(pos, color) {
	    return color === 'white' ? pos : [7 - pos[0], 7 - pos[1]];
	}
	function makeCustomBrush(base, modifiers) {
	    return {
	        color: base.color,
	        opacity: Math.round(base.opacity * 10) / 10,
	        lineWidth: Math.round(modifiers.lineWidth || base.lineWidth),
	        key: [base.key, modifiers.lineWidth].filter(x => x).join(''),
	    };
	}
	function circleWidth(bounds) {
	    const base = bounds.width / 512;
	    return [3 * base, 4 * base];
	}
	function lineWidth(brush, current, bounds) {
	    return (((brush.lineWidth || 10) * (current ? 0.85 : 1)) / 512) * bounds.width;
	}
	function opacity(brush, current) {
	    return (brush.opacity || 1) * (current ? 0.9 : 1);
	}
	function arrowMargin(bounds, shorten) {
	    return ((shorten ? 20 : 10) / 512) * bounds.width;
	}
	function pos2px(pos, bounds) {
	    return [((pos[0] + 0.5) * bounds.width) / 8, ((7.5 - pos[1]) * bounds.height) / 8];
	}
	//# sourceMappingURL=svg.js.map
	});

	var wrap = createCommonjsModule(function (module, exports) {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.renderWrap = void 0;



	function renderWrap(element, s, relative) {
	    element.innerHTML = '';
	    element.classList.add('cg-wrap');
	    for (const c of types$1.colors)
	        element.classList.toggle('orientation-' + c, s.orientation === c);
	    element.classList.toggle('manipulable', !s.viewOnly);
	    const helper = util$1.createEl('cg-helper');
	    element.appendChild(helper);
	    const container = util$1.createEl('cg-container');
	    helper.appendChild(container);
	    const board = util$1.createEl('cg-board');
	    container.appendChild(board);
	    let svg$1;
	    let customSvg;
	    if (s.drawable.visible && !relative) {
	        svg$1 = svg.setAttributes(svg.createElement('svg'), { 'class': 'cg-shapes' });
	        svg$1.appendChild(svg.createElement('defs'));
	        svg$1.appendChild(svg.createElement('g'));
	        customSvg = svg.setAttributes(svg.createElement('svg'), { 'class': 'cg-custom-svgs' });
	        customSvg.appendChild(svg.createElement('g'));
	        container.appendChild(svg$1);
	        container.appendChild(customSvg);
	    }
	    if (s.coordinates) {
	        const orientClass = s.orientation === 'black' ? ' black' : '';
	        container.appendChild(renderCoords(types$1.ranks, 'ranks' + orientClass));
	        container.appendChild(renderCoords(types$1.files, 'files' + orientClass));
	    }
	    let ghost;
	    if (s.draggable.showGhost && !relative) {
	        ghost = util$1.createEl('piece', 'ghost');
	        util$1.setVisible(ghost, false);
	        container.appendChild(ghost);
	    }
	    return {
	        board,
	        container,
	        ghost,
	        svg: svg$1,
	        customSvg,
	    };
	}
	exports.renderWrap = renderWrap;
	function renderCoords(elems, className) {
	    const el = util$1.createEl('coords', className);
	    let f;
	    for (const elem of elems) {
	        f = util$1.createEl('coord');
	        f.textContent = elem;
	        el.appendChild(f);
	    }
	    return el;
	}
	//# sourceMappingURL=wrap.js.map
	});

	var drop_1 = createCommonjsModule(function (module, exports) {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.drop = exports.cancelDropMode = exports.setDropMode = void 0;



	function setDropMode(s, piece) {
	    s.dropmode = {
	        active: true,
	        piece,
	    };
	    drag.cancel(s);
	}
	exports.setDropMode = setDropMode;
	function cancelDropMode(s) {
	    s.dropmode = {
	        active: false,
	    };
	}
	exports.cancelDropMode = cancelDropMode;
	function drop(s, e) {
	    if (!s.dropmode.active)
	        return;
	    board$1.unsetPremove(s);
	    board$1.unsetPredrop(s);
	    const piece = s.dropmode.piece;
	    if (piece) {
	        s.pieces.set('a0', piece);
	        const position = util$1.eventPosition(e);
	        const dest = position && board$1.getKeyAtDomPos(position, board$1.whitePov(s), s.dom.bounds());
	        if (dest)
	            board$1.dropNewPiece(s, 'a0', dest);
	    }
	    s.dom.redraw();
	}
	exports.drop = drop;
	//# sourceMappingURL=drop.js.map
	});

	var events = createCommonjsModule(function (module, exports) {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.bindDocument = exports.bindBoard = void 0;




	function bindBoard(s, boundsUpdated) {
	    const boardEl = s.dom.elements.board;
	    if (!s.dom.relative && s.resizable && 'ResizeObserver' in window) {
	        const observer = new window['ResizeObserver'](boundsUpdated);
	        observer.observe(boardEl);
	    }
	    if (s.viewOnly)
	        return;
	    const onStart = startDragOrDraw(s);
	    boardEl.addEventListener('touchstart', onStart, {
	        passive: false,
	    });
	    boardEl.addEventListener('mousedown', onStart, {
	        passive: false,
	    });
	    if (s.disableContextMenu || s.drawable.enabled) {
	        boardEl.addEventListener('contextmenu', e => e.preventDefault());
	    }
	}
	exports.bindBoard = bindBoard;
	function bindDocument(s, boundsUpdated) {
	    const unbinds = [];
	    if (!s.dom.relative && s.resizable && !('ResizeObserver' in window)) {
	        unbinds.push(unbindable(document.body, 'chessground.resize', boundsUpdated));
	    }
	    if (!s.viewOnly) {
	        const onmove = dragOrDraw(s, drag.move, draw.move);
	        const onend = dragOrDraw(s, drag.end, draw.end);
	        for (const ev of ['touchmove', 'mousemove'])
	            unbinds.push(unbindable(document, ev, onmove));
	        for (const ev of ['touchend', 'mouseup'])
	            unbinds.push(unbindable(document, ev, onend));
	        const onScroll = () => s.dom.bounds.clear();
	        unbinds.push(unbindable(document, 'scroll', onScroll, { capture: true, passive: true }));
	        unbinds.push(unbindable(window, 'resize', onScroll, { passive: true }));
	    }
	    return () => unbinds.forEach(f => f());
	}
	exports.bindDocument = bindDocument;
	function unbindable(el, eventName, callback, options) {
	    el.addEventListener(eventName, callback, options);
	    return () => el.removeEventListener(eventName, callback, options);
	}
	function startDragOrDraw(s) {
	    return e => {
	        if (s.draggable.current)
	            drag.cancel(s);
	        else if (s.drawable.current)
	            draw.cancel(s);
	        else if (e.shiftKey || util$1.isRightButton(e)) {
	            if (s.drawable.enabled)
	                draw.start(s, e);
	        }
	        else if (!s.viewOnly) {
	            if (s.dropmode.active)
	                drop_1.drop(s, e);
	            else
	                drag.start(s, e);
	        }
	    };
	}
	function dragOrDraw(s, withDrag, withDraw) {
	    return e => {
	        if (s.drawable.current) {
	            if (s.drawable.enabled)
	                withDraw(s, e);
	        }
	        else if (!s.viewOnly)
	            withDrag(s, e);
	    };
	}
	//# sourceMappingURL=events.js.map
	});

	var render_1 = createCommonjsModule(function (module, exports) {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.updateBounds = exports.render = void 0;


	const util = util$1;
	function render(s) {
	    const asWhite = board$1.whitePov(s), posToTranslate = s.dom.relative ? util.posToTranslateRel : util.posToTranslateAbs(s.dom.bounds()), translate = s.dom.relative ? util.translateRel : util.translateAbs, boardEl = s.dom.elements.board, pieces = s.pieces, curAnim = s.animation.current, anims = curAnim ? curAnim.plan.anims : new Map(), fadings = curAnim ? curAnim.plan.fadings : new Map(), curDrag = s.draggable.current, squares = computeSquareClasses(s), samePieces = new Set(), sameSquares = new Set(), movedPieces = new Map(), movedSquares = new Map();
	    let k, el, pieceAtKey, elPieceName, anim, fading, pMvdset, pMvd, sMvdset, sMvd;
	    el = boardEl.firstChild;
	    while (el) {
	        k = el.cgKey;
	        if (isPieceNode(el)) {
	            pieceAtKey = pieces.get(k);
	            anim = anims.get(k);
	            fading = fadings.get(k);
	            elPieceName = el.cgPiece;
	            if (el.cgDragging && (!curDrag || curDrag.orig !== k)) {
	                el.classList.remove('dragging');
	                translate(el, posToTranslate(util$1.key2pos(k), asWhite));
	                el.cgDragging = false;
	            }
	            if (!fading && el.cgFading) {
	                el.cgFading = false;
	                el.classList.remove('fading');
	            }
	            if (pieceAtKey) {
	                if (anim && el.cgAnimating && elPieceName === pieceNameOf(pieceAtKey)) {
	                    const pos = util$1.key2pos(k);
	                    pos[0] += anim[2];
	                    pos[1] += anim[3];
	                    el.classList.add('anim');
	                    translate(el, posToTranslate(pos, asWhite));
	                }
	                else if (el.cgAnimating) {
	                    el.cgAnimating = false;
	                    el.classList.remove('anim');
	                    translate(el, posToTranslate(util$1.key2pos(k), asWhite));
	                    if (s.addPieceZIndex)
	                        el.style.zIndex = posZIndex(util$1.key2pos(k), asWhite);
	                }
	                if (elPieceName === pieceNameOf(pieceAtKey) && (!fading || !el.cgFading)) {
	                    samePieces.add(k);
	                }
	                else {
	                    if (fading && elPieceName === pieceNameOf(fading)) {
	                        el.classList.add('fading');
	                        el.cgFading = true;
	                    }
	                    else {
	                        appendValue(movedPieces, elPieceName, el);
	                    }
	                }
	            }
	            else {
	                appendValue(movedPieces, elPieceName, el);
	            }
	        }
	        else if (isSquareNode(el)) {
	            const cn = el.className;
	            if (squares.get(k) === cn)
	                sameSquares.add(k);
	            else
	                appendValue(movedSquares, cn, el);
	        }
	        el = el.nextSibling;
	    }
	    for (const [sk, className] of squares) {
	        if (!sameSquares.has(sk)) {
	            sMvdset = movedSquares.get(className);
	            sMvd = sMvdset && sMvdset.pop();
	            const translation = posToTranslate(util$1.key2pos(sk), asWhite);
	            if (sMvd) {
	                sMvd.cgKey = sk;
	                translate(sMvd, translation);
	            }
	            else {
	                const squareNode = util$1.createEl('square', className);
	                squareNode.cgKey = sk;
	                translate(squareNode, translation);
	                boardEl.insertBefore(squareNode, boardEl.firstChild);
	            }
	        }
	    }
	    for (const [k, p] of pieces) {
	        anim = anims.get(k);
	        if (!samePieces.has(k)) {
	            pMvdset = movedPieces.get(pieceNameOf(p));
	            pMvd = pMvdset && pMvdset.pop();
	            if (pMvd) {
	                pMvd.cgKey = k;
	                if (pMvd.cgFading) {
	                    pMvd.classList.remove('fading');
	                    pMvd.cgFading = false;
	                }
	                const pos = util$1.key2pos(k);
	                if (s.addPieceZIndex)
	                    pMvd.style.zIndex = posZIndex(pos, asWhite);
	                if (anim) {
	                    pMvd.cgAnimating = true;
	                    pMvd.classList.add('anim');
	                    pos[0] += anim[2];
	                    pos[1] += anim[3];
	                }
	                translate(pMvd, posToTranslate(pos, asWhite));
	            }
	            else {
	                const pieceName = pieceNameOf(p), pieceNode = util$1.createEl('piece', pieceName), pos = util$1.key2pos(k);
	                pieceNode.cgPiece = pieceName;
	                pieceNode.cgKey = k;
	                if (anim) {
	                    pieceNode.cgAnimating = true;
	                    pos[0] += anim[2];
	                    pos[1] += anim[3];
	                }
	                translate(pieceNode, posToTranslate(pos, asWhite));
	                if (s.addPieceZIndex)
	                    pieceNode.style.zIndex = posZIndex(pos, asWhite);
	                boardEl.appendChild(pieceNode);
	            }
	        }
	    }
	    for (const nodes of movedPieces.values())
	        removeNodes(s, nodes);
	    for (const nodes of movedSquares.values())
	        removeNodes(s, nodes);
	}
	exports.render = render;
	function updateBounds(s) {
	    if (s.dom.relative)
	        return;
	    const asWhite = board$1.whitePov(s), posToTranslate = util.posToTranslateAbs(s.dom.bounds());
	    let el = s.dom.elements.board.firstChild;
	    while (el) {
	        if ((isPieceNode(el) && !el.cgAnimating) || isSquareNode(el)) {
	            util.translateAbs(el, posToTranslate(util$1.key2pos(el.cgKey), asWhite));
	        }
	        el = el.nextSibling;
	    }
	}
	exports.updateBounds = updateBounds;
	function isPieceNode(el) {
	    return el.tagName === 'PIECE';
	}
	function isSquareNode(el) {
	    return el.tagName === 'SQUARE';
	}
	function removeNodes(s, nodes) {
	    for (const node of nodes)
	        s.dom.elements.board.removeChild(node);
	}
	function posZIndex(pos, asWhite) {
	    let z = 2 + pos[1] * 8 + (7 - pos[0]);
	    if (asWhite)
	        z = 67 - z;
	    return z + '';
	}
	function pieceNameOf(piece) {
	    return `${piece.color} ${piece.role}`;
	}
	function computeSquareClasses(s) {
	    var _a;
	    const squares = new Map();
	    if (s.lastMove && s.highlight.lastMove)
	        for (const k of s.lastMove) {
	            addSquare(squares, k, 'last-move');
	        }
	    if (s.check && s.highlight.check)
	        addSquare(squares, s.check, 'check');
	    if (s.selected) {
	        addSquare(squares, s.selected, 'selected');
	        if (s.movable.showDests) {
	            const dests = (_a = s.movable.dests) === null || _a === void 0 ? void 0 : _a.get(s.selected);
	            if (dests)
	                for (const k of dests) {
	                    addSquare(squares, k, 'move-dest' + (s.pieces.has(k) ? ' oc' : ''));
	                }
	            const pDests = s.premovable.dests;
	            if (pDests)
	                for (const k of pDests) {
	                    addSquare(squares, k, 'premove-dest' + (s.pieces.has(k) ? ' oc' : ''));
	                }
	        }
	    }
	    const premove = s.premovable.current;
	    if (premove)
	        for (const k of premove)
	            addSquare(squares, k, 'current-premove');
	    else if (s.predroppable.current)
	        addSquare(squares, s.predroppable.current.key, 'current-premove');
	    const o = s.exploding;
	    if (o)
	        for (const k of o.keys)
	            addSquare(squares, k, 'exploding' + o.stage);
	    return squares;
	}
	function addSquare(squares, key, klass) {
	    const classes = squares.get(key);
	    if (classes)
	        squares.set(key, `${classes} ${klass}`);
	    else
	        squares.set(key, klass);
	}
	function appendValue(map, key, value) {
	    const arr = map.get(key);
	    if (arr)
	        arr.push(value);
	    else
	        map.set(key, [value]);
	}
	//# sourceMappingURL=render.js.map
	});

	var chessground = createCommonjsModule(function (module, exports) {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.Chessground = void 0;








	function Chessground(element, config$1) {
	    const maybeState = state.defaults();
	    config.configure(maybeState, config$1 || {});
	    function redrawAll() {
	        const prevUnbind = 'dom' in maybeState ? maybeState.dom.unbind : undefined;
	        const relative = maybeState.viewOnly && !maybeState.drawable.visible, elements = wrap.renderWrap(element, maybeState, relative), bounds = util$1.memo(() => elements.board.getBoundingClientRect()), redrawNow = (skipSvg) => {
	            render_1.render(state);
	            if (!skipSvg && elements.svg)
	                svg.renderSvg(state, elements.svg, elements.customSvg);
	        }, boundsUpdated = () => {
	            bounds.clear();
	            render_1.updateBounds(state);
	            if (elements.svg)
	                svg.renderSvg(state, elements.svg, elements.customSvg);
	        };
	        const state = maybeState;
	        state.dom = {
	            elements,
	            bounds,
	            redraw: debounceRedraw(redrawNow),
	            redrawNow,
	            unbind: prevUnbind,
	            relative,
	        };
	        state.drawable.prevSvgHash = '';
	        redrawNow(false);
	        events.bindBoard(state, boundsUpdated);
	        if (!prevUnbind)
	            state.dom.unbind = events.bindDocument(state, boundsUpdated);
	        state.events.insert && state.events.insert(elements);
	        return state;
	    }
	    return api.start(redrawAll(), redrawAll);
	}
	exports.Chessground = Chessground;
	function debounceRedraw(redrawNow) {
	    let redrawing = false;
	    return () => {
	        if (redrawing)
	            return;
	        redrawing = true;
	        requestAnimationFrame(() => {
	            redrawNow();
	            redrawing = false;
	        });
	    };
	}
	//# sourceMappingURL=chessground.js.map
	});

	function Vnode(tag, key, attrs, children, text, dom) {
		return {tag: tag, key: key, attrs: attrs, children: children, text: text, dom: dom, domSize: undefined, state: undefined, events: undefined, instance: undefined}
	}
	Vnode.normalize = function(node) {
		if (Array.isArray(node)) return Vnode("[", undefined, undefined, Vnode.normalizeChildren(node), undefined, undefined)
		if (node == null || typeof node === "boolean") return null
		if (typeof node === "object") return node
		return Vnode("#", undefined, undefined, String(node), undefined, undefined)
	};
	Vnode.normalizeChildren = function(input) {
		var children = [];
		if (input.length) {
			var isKeyed = input[0] != null && input[0].key != null;
			// Note: this is a *very* perf-sensitive check.
			// Fun fact: merging the loop like this is somehow faster than splitting
			// it, noticeably so.
			for (var i = 1; i < input.length; i++) {
				if ((input[i] != null && input[i].key != null) !== isKeyed) {
					throw new TypeError("Vnodes must either always have keys or never have keys!")
				}
			}
			for (var i = 0; i < input.length; i++) {
				children[i] = Vnode.normalize(input[i]);
			}
		}
		return children
	};

	var vnode = Vnode;

	// Call via `hyperscriptVnode.apply(startOffset, arguments)`
	//
	// The reason I do it this way, forwarding the arguments and passing the start
	// offset in `this`, is so I don't have to create a temporary array in a
	// performance-critical path.
	//
	// In native ES6, I'd instead add a final `...args` parameter to the
	// `hyperscript` and `fragment` factories and define this as
	// `hyperscriptVnode(...args)`, since modern engines do optimize that away. But
	// ES5 (what Mithril requires thanks to IE support) doesn't give me that luxury,
	// and engines aren't nearly intelligent enough to do either of these:
	//
	// 1. Elide the allocation for `[].slice.call(arguments, 1)` when it's passed to
	//    another function only to be indexed.
	// 2. Elide an `arguments` allocation when it's passed to any function other
	//    than `Function.prototype.apply` or `Reflect.apply`.
	//
	// In ES6, it'd probably look closer to this (I'd need to profile it, though):
	// module.exports = function(attrs, ...children) {
	//     if (attrs == null || typeof attrs === "object" && attrs.tag == null && !Array.isArray(attrs)) {
	//         if (children.length === 1 && Array.isArray(children[0])) children = children[0]
	//     } else {
	//         children = children.length === 0 && Array.isArray(attrs) ? attrs : [attrs, ...children]
	//         attrs = undefined
	//     }
	//
	//     if (attrs == null) attrs = {}
	//     return Vnode("", attrs.key, attrs, children)
	// }
	var hyperscriptVnode = function() {
		var attrs = arguments[this], start = this + 1, children;

		if (attrs == null) {
			attrs = {};
		} else if (typeof attrs !== "object" || attrs.tag != null || Array.isArray(attrs)) {
			attrs = {};
			start = this;
		}

		if (arguments.length === start + 1) {
			children = arguments[start];
			if (!Array.isArray(children)) children = [children];
		} else {
			children = [];
			while (start < arguments.length) children.push(arguments[start++]);
		}

		return vnode("", attrs.key, attrs, children)
	};

	var selectorParser = /(?:(^|#|\.)([^#\.\[\]]+))|(\[(.+?)(?:\s*=\s*("|'|)((?:\\["'\]]|.)*?)\5)?\])/g;
	var selectorCache = {};
	var hasOwn = {}.hasOwnProperty;

	function isEmpty(object) {
		for (var key in object) if (hasOwn.call(object, key)) return false
		return true
	}

	function compileSelector(selector) {
		var match, tag = "div", classes = [], attrs = {};
		while (match = selectorParser.exec(selector)) {
			var type = match[1], value = match[2];
			if (type === "" && value !== "") tag = value;
			else if (type === "#") attrs.id = value;
			else if (type === ".") classes.push(value);
			else if (match[3][0] === "[") {
				var attrValue = match[6];
				if (attrValue) attrValue = attrValue.replace(/\\(["'])/g, "$1").replace(/\\\\/g, "\\");
				if (match[4] === "class") classes.push(attrValue);
				else attrs[match[4]] = attrValue === "" ? attrValue : attrValue || true;
			}
		}
		if (classes.length > 0) attrs.className = classes.join(" ");
		return selectorCache[selector] = {tag: tag, attrs: attrs}
	}

	function execSelector(state, vnode$1) {
		var attrs = vnode$1.attrs;
		var children = vnode.normalizeChildren(vnode$1.children);
		var hasClass = hasOwn.call(attrs, "class");
		var className = hasClass ? attrs.class : attrs.className;

		vnode$1.tag = state.tag;
		vnode$1.attrs = null;
		vnode$1.children = undefined;

		if (!isEmpty(state.attrs) && !isEmpty(attrs)) {
			var newAttrs = {};

			for (var key in attrs) {
				if (hasOwn.call(attrs, key)) newAttrs[key] = attrs[key];
			}

			attrs = newAttrs;
		}

		for (var key in state.attrs) {
			if (hasOwn.call(state.attrs, key) && key !== "className" && !hasOwn.call(attrs, key)){
				attrs[key] = state.attrs[key];
			}
		}
		if (className != null || state.attrs.className != null) attrs.className =
			className != null
				? state.attrs.className != null
					? String(state.attrs.className) + " " + String(className)
					: className
				: state.attrs.className != null
					? state.attrs.className
					: null;

		if (hasClass) attrs.class = null;

		for (var key in attrs) {
			if (hasOwn.call(attrs, key) && key !== "key") {
				vnode$1.attrs = attrs;
				break
			}
		}

		if (Array.isArray(children) && children.length === 1 && children[0] != null && children[0].tag === "#") {
			vnode$1.text = children[0].children;
		} else {
			vnode$1.children = children;
		}

		return vnode$1
	}

	function hyperscript(selector) {
		if (selector == null || typeof selector !== "string" && typeof selector !== "function" && typeof selector.view !== "function") {
			throw Error("The selector must be either a string or a component.");
		}

		var vnode$1 = hyperscriptVnode.apply(1, arguments);

		if (typeof selector === "string") {
			vnode$1.children = vnode.normalizeChildren(vnode$1.children);
			if (selector !== "[") return execSelector(selectorCache[selector] || compileSelector(selector), vnode$1)
		}

		vnode$1.tag = selector;
		return vnode$1
	}

	var hyperscript_1$1 = hyperscript;

	var trust = function(html) {
		if (html == null) html = "";
		return vnode("<", undefined, undefined, html, undefined, undefined)
	};

	var fragment = function() {
		var vnode$1 = hyperscriptVnode.apply(0, arguments);

		vnode$1.tag = "[";
		vnode$1.children = vnode.normalizeChildren(vnode$1.children);
		return vnode$1
	};

	hyperscript_1$1.trust = trust;
	hyperscript_1$1.fragment = fragment;

	var hyperscript_1 = hyperscript_1$1;

	/** @constructor */
	var PromisePolyfill = function(executor) {
		if (!(this instanceof PromisePolyfill)) throw new Error("Promise must be called with `new`")
		if (typeof executor !== "function") throw new TypeError("executor must be a function")

		var self = this, resolvers = [], rejectors = [], resolveCurrent = handler(resolvers, true), rejectCurrent = handler(rejectors, false);
		var instance = self._instance = {resolvers: resolvers, rejectors: rejectors};
		var callAsync = typeof setImmediate === "function" ? setImmediate : setTimeout;
		function handler(list, shouldAbsorb) {
			return function execute(value) {
				var then;
				try {
					if (shouldAbsorb && value != null && (typeof value === "object" || typeof value === "function") && typeof (then = value.then) === "function") {
						if (value === self) throw new TypeError("Promise can't be resolved w/ itself")
						executeOnce(then.bind(value));
					}
					else {
						callAsync(function() {
							if (!shouldAbsorb && list.length === 0) console.error("Possible unhandled promise rejection:", value);
							for (var i = 0; i < list.length; i++) list[i](value);
							resolvers.length = 0, rejectors.length = 0;
							instance.state = shouldAbsorb;
							instance.retry = function() {execute(value);};
						});
					}
				}
				catch (e) {
					rejectCurrent(e);
				}
			}
		}
		function executeOnce(then) {
			var runs = 0;
			function run(fn) {
				return function(value) {
					if (runs++ > 0) return
					fn(value);
				}
			}
			var onerror = run(rejectCurrent);
			try {then(run(resolveCurrent), onerror);} catch (e) {onerror(e);}
		}

		executeOnce(executor);
	};
	PromisePolyfill.prototype.then = function(onFulfilled, onRejection) {
		var self = this, instance = self._instance;
		function handle(callback, list, next, state) {
			list.push(function(value) {
				if (typeof callback !== "function") next(value);
				else try {resolveNext(callback(value));} catch (e) {if (rejectNext) rejectNext(e);}
			});
			if (typeof instance.retry === "function" && state === instance.state) instance.retry();
		}
		var resolveNext, rejectNext;
		var promise = new PromisePolyfill(function(resolve, reject) {resolveNext = resolve, rejectNext = reject;});
		handle(onFulfilled, instance.resolvers, resolveNext, true), handle(onRejection, instance.rejectors, rejectNext, false);
		return promise
	};
	PromisePolyfill.prototype.catch = function(onRejection) {
		return this.then(null, onRejection)
	};
	PromisePolyfill.prototype.finally = function(callback) {
		return this.then(
			function(value) {
				return PromisePolyfill.resolve(callback()).then(function() {
					return value
				})
			},
			function(reason) {
				return PromisePolyfill.resolve(callback()).then(function() {
					return PromisePolyfill.reject(reason);
				})
			}
		)
	};
	PromisePolyfill.resolve = function(value) {
		if (value instanceof PromisePolyfill) return value
		return new PromisePolyfill(function(resolve) {resolve(value);})
	};
	PromisePolyfill.reject = function(value) {
		return new PromisePolyfill(function(resolve, reject) {reject(value);})
	};
	PromisePolyfill.all = function(list) {
		return new PromisePolyfill(function(resolve, reject) {
			var total = list.length, count = 0, values = [];
			if (list.length === 0) resolve([]);
			else for (var i = 0; i < list.length; i++) {
				(function(i) {
					function consume(value) {
						count++;
						values[i] = value;
						if (count === total) resolve(values);
					}
					if (list[i] != null && (typeof list[i] === "object" || typeof list[i] === "function") && typeof list[i].then === "function") {
						list[i].then(consume, reject);
					}
					else consume(list[i]);
				})(i);
			}
		})
	};
	PromisePolyfill.race = function(list) {
		return new PromisePolyfill(function(resolve, reject) {
			for (var i = 0; i < list.length; i++) {
				list[i].then(resolve, reject);
			}
		})
	};

	var polyfill = PromisePolyfill;

	var promise = createCommonjsModule(function (module) {



	if (typeof window !== "undefined") {
		if (typeof window.Promise === "undefined") {
			window.Promise = polyfill;
		} else if (!window.Promise.prototype.finally) {
			window.Promise.prototype.finally = polyfill.prototype.finally;
		}
		module.exports = window.Promise;
	} else if (typeof commonjsGlobal !== "undefined") {
		if (typeof commonjsGlobal.Promise === "undefined") {
			commonjsGlobal.Promise = polyfill;
		} else if (!commonjsGlobal.Promise.prototype.finally) {
			commonjsGlobal.Promise.prototype.finally = polyfill.prototype.finally;
		}
		module.exports = commonjsGlobal.Promise;
	} else {
		module.exports = polyfill;
	}
	});

	var render$1 = function($window) {
		var $doc = $window && $window.document;
		var currentRedraw;

		var nameSpace = {
			svg: "http://www.w3.org/2000/svg",
			math: "http://www.w3.org/1998/Math/MathML"
		};

		function getNameSpace(vnode) {
			return vnode.attrs && vnode.attrs.xmlns || nameSpace[vnode.tag]
		}

		//sanity check to discourage people from doing `vnode.state = ...`
		function checkState(vnode, original) {
			if (vnode.state !== original) throw new Error("`vnode.state` must not be modified")
		}

		//Note: the hook is passed as the `this` argument to allow proxying the
		//arguments without requiring a full array allocation to do so. It also
		//takes advantage of the fact the current `vnode` is the first argument in
		//all lifecycle methods.
		function callHook(vnode) {
			var original = vnode.state;
			try {
				return this.apply(original, arguments)
			} finally {
				checkState(vnode, original);
			}
		}

		// IE11 (at least) throws an UnspecifiedError when accessing document.activeElement when
		// inside an iframe. Catch and swallow this error, and heavy-handidly return null.
		function activeElement() {
			try {
				return $doc.activeElement
			} catch (e) {
				return null
			}
		}
		//create
		function createNodes(parent, vnodes, start, end, hooks, nextSibling, ns) {
			for (var i = start; i < end; i++) {
				var vnode = vnodes[i];
				if (vnode != null) {
					createNode(parent, vnode, hooks, ns, nextSibling);
				}
			}
		}
		function createNode(parent, vnode, hooks, ns, nextSibling) {
			var tag = vnode.tag;
			if (typeof tag === "string") {
				vnode.state = {};
				if (vnode.attrs != null) initLifecycle(vnode.attrs, vnode, hooks);
				switch (tag) {
					case "#": createText(parent, vnode, nextSibling); break
					case "<": createHTML(parent, vnode, ns, nextSibling); break
					case "[": createFragment(parent, vnode, hooks, ns, nextSibling); break
					default: createElement(parent, vnode, hooks, ns, nextSibling);
				}
			}
			else createComponent(parent, vnode, hooks, ns, nextSibling);
		}
		function createText(parent, vnode, nextSibling) {
			vnode.dom = $doc.createTextNode(vnode.children);
			insertNode(parent, vnode.dom, nextSibling);
		}
		var possibleParents = {caption: "table", thead: "table", tbody: "table", tfoot: "table", tr: "tbody", th: "tr", td: "tr", colgroup: "table", col: "colgroup"};
		function createHTML(parent, vnode, ns, nextSibling) {
			var match = vnode.children.match(/^\s*?<(\w+)/im) || [];
			// not using the proper parent makes the child element(s) vanish.
			//     var div = document.createElement("div")
			//     div.innerHTML = "<td>i</td><td>j</td>"
			//     console.log(div.innerHTML)
			// --> "ij", no <td> in sight.
			var temp = $doc.createElement(possibleParents[match[1]] || "div");
			if (ns === "http://www.w3.org/2000/svg") {
				temp.innerHTML = "<svg xmlns=\"http://www.w3.org/2000/svg\">" + vnode.children + "</svg>";
				temp = temp.firstChild;
			} else {
				temp.innerHTML = vnode.children;
			}
			vnode.dom = temp.firstChild;
			vnode.domSize = temp.childNodes.length;
			// Capture nodes to remove, so we don't confuse them.
			vnode.instance = [];
			var fragment = $doc.createDocumentFragment();
			var child;
			while (child = temp.firstChild) {
				vnode.instance.push(child);
				fragment.appendChild(child);
			}
			insertNode(parent, fragment, nextSibling);
		}
		function createFragment(parent, vnode, hooks, ns, nextSibling) {
			var fragment = $doc.createDocumentFragment();
			if (vnode.children != null) {
				var children = vnode.children;
				createNodes(fragment, children, 0, children.length, hooks, null, ns);
			}
			vnode.dom = fragment.firstChild;
			vnode.domSize = fragment.childNodes.length;
			insertNode(parent, fragment, nextSibling);
		}
		function createElement(parent, vnode$1, hooks, ns, nextSibling) {
			var tag = vnode$1.tag;
			var attrs = vnode$1.attrs;
			var is = attrs && attrs.is;

			ns = getNameSpace(vnode$1) || ns;

			var element = ns ?
				is ? $doc.createElementNS(ns, tag, {is: is}) : $doc.createElementNS(ns, tag) :
				is ? $doc.createElement(tag, {is: is}) : $doc.createElement(tag);
			vnode$1.dom = element;

			if (attrs != null) {
				setAttrs(vnode$1, attrs, ns);
			}

			insertNode(parent, element, nextSibling);

			if (!maybeSetContentEditable(vnode$1)) {
				if (vnode$1.text != null) {
					if (vnode$1.text !== "") element.textContent = vnode$1.text;
					else vnode$1.children = [vnode("#", undefined, undefined, vnode$1.text, undefined, undefined)];
				}
				if (vnode$1.children != null) {
					var children = vnode$1.children;
					createNodes(element, children, 0, children.length, hooks, null, ns);
					if (vnode$1.tag === "select" && attrs != null) setLateSelectAttrs(vnode$1, attrs);
				}
			}
		}
		function initComponent(vnode$1, hooks) {
			var sentinel;
			if (typeof vnode$1.tag.view === "function") {
				vnode$1.state = Object.create(vnode$1.tag);
				sentinel = vnode$1.state.view;
				if (sentinel.$$reentrantLock$$ != null) return
				sentinel.$$reentrantLock$$ = true;
			} else {
				vnode$1.state = void 0;
				sentinel = vnode$1.tag;
				if (sentinel.$$reentrantLock$$ != null) return
				sentinel.$$reentrantLock$$ = true;
				vnode$1.state = (vnode$1.tag.prototype != null && typeof vnode$1.tag.prototype.view === "function") ? new vnode$1.tag(vnode$1) : vnode$1.tag(vnode$1);
			}
			initLifecycle(vnode$1.state, vnode$1, hooks);
			if (vnode$1.attrs != null) initLifecycle(vnode$1.attrs, vnode$1, hooks);
			vnode$1.instance = vnode.normalize(callHook.call(vnode$1.state.view, vnode$1));
			if (vnode$1.instance === vnode$1) throw Error("A view cannot return the vnode it received as argument")
			sentinel.$$reentrantLock$$ = null;
		}
		function createComponent(parent, vnode, hooks, ns, nextSibling) {
			initComponent(vnode, hooks);
			if (vnode.instance != null) {
				createNode(parent, vnode.instance, hooks, ns, nextSibling);
				vnode.dom = vnode.instance.dom;
				vnode.domSize = vnode.dom != null ? vnode.instance.domSize : 0;
			}
			else {
				vnode.domSize = 0;
			}
		}

		//update
		/**
		 * @param {Element|Fragment} parent - the parent element
		 * @param {Vnode[] | null} old - the list of vnodes of the last `render()` call for
		 *                               this part of the tree
		 * @param {Vnode[] | null} vnodes - as above, but for the current `render()` call.
		 * @param {Function[]} hooks - an accumulator of post-render hooks (oncreate/onupdate)
		 * @param {Element | null} nextSibling - the next DOM node if we're dealing with a
		 *                                       fragment that is not the last item in its
		 *                                       parent
		 * @param {'svg' | 'math' | String | null} ns) - the current XML namespace, if any
		 * @returns void
		 */
		// This function diffs and patches lists of vnodes, both keyed and unkeyed.
		//
		// We will:
		//
		// 1. describe its general structure
		// 2. focus on the diff algorithm optimizations
		// 3. discuss DOM node operations.

		// ## Overview:
		//
		// The updateNodes() function:
		// - deals with trivial cases
		// - determines whether the lists are keyed or unkeyed based on the first non-null node
		//   of each list.
		// - diffs them and patches the DOM if needed (that's the brunt of the code)
		// - manages the leftovers: after diffing, are there:
		//   - old nodes left to remove?
		// 	 - new nodes to insert?
		// 	 deal with them!
		//
		// The lists are only iterated over once, with an exception for the nodes in `old` that
		// are visited in the fourth part of the diff and in the `removeNodes` loop.

		// ## Diffing
		//
		// Reading https://github.com/localvoid/ivi/blob/ddc09d06abaef45248e6133f7040d00d3c6be853/packages/ivi/src/vdom/implementation.ts#L617-L837
		// may be good for context on longest increasing subsequence-based logic for moving nodes.
		//
		// In order to diff keyed lists, one has to
		//
		// 1) match nodes in both lists, per key, and update them accordingly
		// 2) create the nodes present in the new list, but absent in the old one
		// 3) remove the nodes present in the old list, but absent in the new one
		// 4) figure out what nodes in 1) to move in order to minimize the DOM operations.
		//
		// To achieve 1) one can create a dictionary of keys => index (for the old list), then iterate
		// over the new list and for each new vnode, find the corresponding vnode in the old list using
		// the map.
		// 2) is achieved in the same step: if a new node has no corresponding entry in the map, it is new
		// and must be created.
		// For the removals, we actually remove the nodes that have been updated from the old list.
		// The nodes that remain in that list after 1) and 2) have been performed can be safely removed.
		// The fourth step is a bit more complex and relies on the longest increasing subsequence (LIS)
		// algorithm.
		//
		// the longest increasing subsequence is the list of nodes that can remain in place. Imagine going
		// from `1,2,3,4,5` to `4,5,1,2,3` where the numbers are not necessarily the keys, but the indices
		// corresponding to the keyed nodes in the old list (keyed nodes `e,d,c,b,a` => `b,a,e,d,c` would
		//  match the above lists, for example).
		//
		// In there are two increasing subsequences: `4,5` and `1,2,3`, the latter being the longest. We
		// can update those nodes without moving them, and only call `insertNode` on `4` and `5`.
		//
		// @localvoid adapted the algo to also support node deletions and insertions (the `lis` is actually
		// the longest increasing subsequence *of old nodes still present in the new list*).
		//
		// It is a general algorithm that is fireproof in all circumstances, but it requires the allocation
		// and the construction of a `key => oldIndex` map, and three arrays (one with `newIndex => oldIndex`,
		// the `LIS` and a temporary one to create the LIS).
		//
		// So we cheat where we can: if the tails of the lists are identical, they are guaranteed to be part of
		// the LIS and can be updated without moving them.
		//
		// If two nodes are swapped, they are guaranteed not to be part of the LIS, and must be moved (with
		// the exception of the last node if the list is fully reversed).
		//
		// ## Finding the next sibling.
		//
		// `updateNode()` and `createNode()` expect a nextSibling parameter to perform DOM operations.
		// When the list is being traversed top-down, at any index, the DOM nodes up to the previous
		// vnode reflect the content of the new list, whereas the rest of the DOM nodes reflect the old
		// list. The next sibling must be looked for in the old list using `getNextSibling(... oldStart + 1 ...)`.
		//
		// In the other scenarios (swaps, upwards traversal, map-based diff),
		// the new vnodes list is traversed upwards. The DOM nodes at the bottom of the list reflect the
		// bottom part of the new vnodes list, and we can use the `v.dom`  value of the previous node
		// as the next sibling (cached in the `nextSibling` variable).


		// ## DOM node moves
		//
		// In most scenarios `updateNode()` and `createNode()` perform the DOM operations. However,
		// this is not the case if the node moved (second and fourth part of the diff algo). We move
		// the old DOM nodes before updateNode runs because it enables us to use the cached `nextSibling`
		// variable rather than fetching it using `getNextSibling()`.
		//
		// The fourth part of the diff currently inserts nodes unconditionally, leading to issues
		// like #1791 and #1999. We need to be smarter about those situations where adjascent old
		// nodes remain together in the new list in a way that isn't covered by parts one and
		// three of the diff algo.

		function updateNodes(parent, old, vnodes, hooks, nextSibling, ns) {
			if (old === vnodes || old == null && vnodes == null) return
			else if (old == null || old.length === 0) createNodes(parent, vnodes, 0, vnodes.length, hooks, nextSibling, ns);
			else if (vnodes == null || vnodes.length === 0) removeNodes(parent, old, 0, old.length);
			else {
				var isOldKeyed = old[0] != null && old[0].key != null;
				var isKeyed = vnodes[0] != null && vnodes[0].key != null;
				var start = 0, oldStart = 0;
				if (!isOldKeyed) while (oldStart < old.length && old[oldStart] == null) oldStart++;
				if (!isKeyed) while (start < vnodes.length && vnodes[start] == null) start++;
				if (isKeyed === null && isOldKeyed == null) return // both lists are full of nulls
				if (isOldKeyed !== isKeyed) {
					removeNodes(parent, old, oldStart, old.length);
					createNodes(parent, vnodes, start, vnodes.length, hooks, nextSibling, ns);
				} else if (!isKeyed) {
					// Don't index past the end of either list (causes deopts).
					var commonLength = old.length < vnodes.length ? old.length : vnodes.length;
					// Rewind if necessary to the first non-null index on either side.
					// We could alternatively either explicitly create or remove nodes when `start !== oldStart`
					// but that would be optimizing for sparse lists which are more rare than dense ones.
					start = start < oldStart ? start : oldStart;
					for (; start < commonLength; start++) {
						o = old[start];
						v = vnodes[start];
						if (o === v || o == null && v == null) continue
						else if (o == null) createNode(parent, v, hooks, ns, getNextSibling(old, start + 1, nextSibling));
						else if (v == null) removeNode(parent, o);
						else updateNode(parent, o, v, hooks, getNextSibling(old, start + 1, nextSibling), ns);
					}
					if (old.length > commonLength) removeNodes(parent, old, start, old.length);
					if (vnodes.length > commonLength) createNodes(parent, vnodes, start, vnodes.length, hooks, nextSibling, ns);
				} else {
					// keyed diff
					var oldEnd = old.length - 1, end = vnodes.length - 1, map, o, v, oe, ve, topSibling;

					// bottom-up
					while (oldEnd >= oldStart && end >= start) {
						oe = old[oldEnd];
						ve = vnodes[end];
						if (oe.key !== ve.key) break
						if (oe !== ve) updateNode(parent, oe, ve, hooks, nextSibling, ns);
						if (ve.dom != null) nextSibling = ve.dom;
						oldEnd--, end--;
					}
					// top-down
					while (oldEnd >= oldStart && end >= start) {
						o = old[oldStart];
						v = vnodes[start];
						if (o.key !== v.key) break
						oldStart++, start++;
						if (o !== v) updateNode(parent, o, v, hooks, getNextSibling(old, oldStart, nextSibling), ns);
					}
					// swaps and list reversals
					while (oldEnd >= oldStart && end >= start) {
						if (start === end) break
						if (o.key !== ve.key || oe.key !== v.key) break
						topSibling = getNextSibling(old, oldStart, nextSibling);
						moveNodes(parent, oe, topSibling);
						if (oe !== v) updateNode(parent, oe, v, hooks, topSibling, ns);
						if (++start <= --end) moveNodes(parent, o, nextSibling);
						if (o !== ve) updateNode(parent, o, ve, hooks, nextSibling, ns);
						if (ve.dom != null) nextSibling = ve.dom;
						oldStart++; oldEnd--;
						oe = old[oldEnd];
						ve = vnodes[end];
						o = old[oldStart];
						v = vnodes[start];
					}
					// bottom up once again
					while (oldEnd >= oldStart && end >= start) {
						if (oe.key !== ve.key) break
						if (oe !== ve) updateNode(parent, oe, ve, hooks, nextSibling, ns);
						if (ve.dom != null) nextSibling = ve.dom;
						oldEnd--, end--;
						oe = old[oldEnd];
						ve = vnodes[end];
					}
					if (start > end) removeNodes(parent, old, oldStart, oldEnd + 1);
					else if (oldStart > oldEnd) createNodes(parent, vnodes, start, end + 1, hooks, nextSibling, ns);
					else {
						// inspired by ivi https://github.com/ivijs/ivi/ by Boris Kaul
						var originalNextSibling = nextSibling, vnodesLength = end - start + 1, oldIndices = new Array(vnodesLength), li=0, i=0, pos = 2147483647, matched = 0, map, lisIndices;
						for (i = 0; i < vnodesLength; i++) oldIndices[i] = -1;
						for (i = end; i >= start; i--) {
							if (map == null) map = getKeyMap(old, oldStart, oldEnd + 1);
							ve = vnodes[i];
							var oldIndex = map[ve.key];
							if (oldIndex != null) {
								pos = (oldIndex < pos) ? oldIndex : -1; // becomes -1 if nodes were re-ordered
								oldIndices[i-start] = oldIndex;
								oe = old[oldIndex];
								old[oldIndex] = null;
								if (oe !== ve) updateNode(parent, oe, ve, hooks, nextSibling, ns);
								if (ve.dom != null) nextSibling = ve.dom;
								matched++;
							}
						}
						nextSibling = originalNextSibling;
						if (matched !== oldEnd - oldStart + 1) removeNodes(parent, old, oldStart, oldEnd + 1);
						if (matched === 0) createNodes(parent, vnodes, start, end + 1, hooks, nextSibling, ns);
						else {
							if (pos === -1) {
								// the indices of the indices of the items that are part of the
								// longest increasing subsequence in the oldIndices list
								lisIndices = makeLisIndices(oldIndices);
								li = lisIndices.length - 1;
								for (i = end; i >= start; i--) {
									v = vnodes[i];
									if (oldIndices[i-start] === -1) createNode(parent, v, hooks, ns, nextSibling);
									else {
										if (lisIndices[li] === i - start) li--;
										else moveNodes(parent, v, nextSibling);
									}
									if (v.dom != null) nextSibling = vnodes[i].dom;
								}
							} else {
								for (i = end; i >= start; i--) {
									v = vnodes[i];
									if (oldIndices[i-start] === -1) createNode(parent, v, hooks, ns, nextSibling);
									if (v.dom != null) nextSibling = vnodes[i].dom;
								}
							}
						}
					}
				}
			}
		}
		function updateNode(parent, old, vnode, hooks, nextSibling, ns) {
			var oldTag = old.tag, tag = vnode.tag;
			if (oldTag === tag) {
				vnode.state = old.state;
				vnode.events = old.events;
				if (shouldNotUpdate(vnode, old)) return
				if (typeof oldTag === "string") {
					if (vnode.attrs != null) {
						updateLifecycle(vnode.attrs, vnode, hooks);
					}
					switch (oldTag) {
						case "#": updateText(old, vnode); break
						case "<": updateHTML(parent, old, vnode, ns, nextSibling); break
						case "[": updateFragment(parent, old, vnode, hooks, nextSibling, ns); break
						default: updateElement(old, vnode, hooks, ns);
					}
				}
				else updateComponent(parent, old, vnode, hooks, nextSibling, ns);
			}
			else {
				removeNode(parent, old);
				createNode(parent, vnode, hooks, ns, nextSibling);
			}
		}
		function updateText(old, vnode) {
			if (old.children.toString() !== vnode.children.toString()) {
				old.dom.nodeValue = vnode.children;
			}
			vnode.dom = old.dom;
		}
		function updateHTML(parent, old, vnode, ns, nextSibling) {
			if (old.children !== vnode.children) {
				removeHTML(parent, old);
				createHTML(parent, vnode, ns, nextSibling);
			}
			else {
				vnode.dom = old.dom;
				vnode.domSize = old.domSize;
				vnode.instance = old.instance;
			}
		}
		function updateFragment(parent, old, vnode, hooks, nextSibling, ns) {
			updateNodes(parent, old.children, vnode.children, hooks, nextSibling, ns);
			var domSize = 0, children = vnode.children;
			vnode.dom = null;
			if (children != null) {
				for (var i = 0; i < children.length; i++) {
					var child = children[i];
					if (child != null && child.dom != null) {
						if (vnode.dom == null) vnode.dom = child.dom;
						domSize += child.domSize || 1;
					}
				}
				if (domSize !== 1) vnode.domSize = domSize;
			}
		}
		function updateElement(old, vnode$1, hooks, ns) {
			var element = vnode$1.dom = old.dom;
			ns = getNameSpace(vnode$1) || ns;

			if (vnode$1.tag === "textarea") {
				if (vnode$1.attrs == null) vnode$1.attrs = {};
				if (vnode$1.text != null) {
					vnode$1.attrs.value = vnode$1.text; //FIXME handle multiple children
					vnode$1.text = undefined;
				}
			}
			updateAttrs(vnode$1, old.attrs, vnode$1.attrs, ns);
			if (!maybeSetContentEditable(vnode$1)) {
				if (old.text != null && vnode$1.text != null && vnode$1.text !== "") {
					if (old.text.toString() !== vnode$1.text.toString()) old.dom.firstChild.nodeValue = vnode$1.text;
				}
				else {
					if (old.text != null) old.children = [vnode("#", undefined, undefined, old.text, undefined, old.dom.firstChild)];
					if (vnode$1.text != null) vnode$1.children = [vnode("#", undefined, undefined, vnode$1.text, undefined, undefined)];
					updateNodes(element, old.children, vnode$1.children, hooks, null, ns);
				}
			}
		}
		function updateComponent(parent, old, vnode$1, hooks, nextSibling, ns) {
			vnode$1.instance = vnode.normalize(callHook.call(vnode$1.state.view, vnode$1));
			if (vnode$1.instance === vnode$1) throw Error("A view cannot return the vnode it received as argument")
			updateLifecycle(vnode$1.state, vnode$1, hooks);
			if (vnode$1.attrs != null) updateLifecycle(vnode$1.attrs, vnode$1, hooks);
			if (vnode$1.instance != null) {
				if (old.instance == null) createNode(parent, vnode$1.instance, hooks, ns, nextSibling);
				else updateNode(parent, old.instance, vnode$1.instance, hooks, nextSibling, ns);
				vnode$1.dom = vnode$1.instance.dom;
				vnode$1.domSize = vnode$1.instance.domSize;
			}
			else if (old.instance != null) {
				removeNode(parent, old.instance);
				vnode$1.dom = undefined;
				vnode$1.domSize = 0;
			}
			else {
				vnode$1.dom = old.dom;
				vnode$1.domSize = old.domSize;
			}
		}
		function getKeyMap(vnodes, start, end) {
			var map = Object.create(null);
			for (; start < end; start++) {
				var vnode = vnodes[start];
				if (vnode != null) {
					var key = vnode.key;
					if (key != null) map[key] = start;
				}
			}
			return map
		}
		// Lifted from ivi https://github.com/ivijs/ivi/
		// takes a list of unique numbers (-1 is special and can
		// occur multiple times) and returns an array with the indices
		// of the items that are part of the longest increasing
		// subsequece
		var lisTemp = [];
		function makeLisIndices(a) {
			var result = [0];
			var u = 0, v = 0, i = 0;
			var il = lisTemp.length = a.length;
			for (var i = 0; i < il; i++) lisTemp[i] = a[i];
			for (var i = 0; i < il; ++i) {
				if (a[i] === -1) continue
				var j = result[result.length - 1];
				if (a[j] < a[i]) {
					lisTemp[i] = j;
					result.push(i);
					continue
				}
				u = 0;
				v = result.length - 1;
				while (u < v) {
					// Fast integer average without overflow.
					// eslint-disable-next-line no-bitwise
					var c = (u >>> 1) + (v >>> 1) + (u & v & 1);
					if (a[result[c]] < a[i]) {
						u = c + 1;
					}
					else {
						v = c;
					}
				}
				if (a[i] < a[result[u]]) {
					if (u > 0) lisTemp[i] = result[u - 1];
					result[u] = i;
				}
			}
			u = result.length;
			v = result[u - 1];
			while (u-- > 0) {
				result[u] = v;
				v = lisTemp[v];
			}
			lisTemp.length = 0;
			return result
		}

		function getNextSibling(vnodes, i, nextSibling) {
			for (; i < vnodes.length; i++) {
				if (vnodes[i] != null && vnodes[i].dom != null) return vnodes[i].dom
			}
			return nextSibling
		}

		// This covers a really specific edge case:
		// - Parent node is keyed and contains child
		// - Child is removed, returns unresolved promise in `onbeforeremove`
		// - Parent node is moved in keyed diff
		// - Remaining children still need moved appropriately
		//
		// Ideally, I'd track removed nodes as well, but that introduces a lot more
		// complexity and I'm not exactly interested in doing that.
		function moveNodes(parent, vnode, nextSibling) {
			var frag = $doc.createDocumentFragment();
			moveChildToFrag(parent, frag, vnode);
			insertNode(parent, frag, nextSibling);
		}
		function moveChildToFrag(parent, frag, vnode) {
			// Dodge the recursion overhead in a few of the most common cases.
			while (vnode.dom != null && vnode.dom.parentNode === parent) {
				if (typeof vnode.tag !== "string") {
					vnode = vnode.instance;
					if (vnode != null) continue
				} else if (vnode.tag === "<") {
					for (var i = 0; i < vnode.instance.length; i++) {
						frag.appendChild(vnode.instance[i]);
					}
				} else if (vnode.tag !== "[") {
					// Don't recurse for text nodes *or* elements, just fragments
					frag.appendChild(vnode.dom);
				} else if (vnode.children.length === 1) {
					vnode = vnode.children[0];
					if (vnode != null) continue
				} else {
					for (var i = 0; i < vnode.children.length; i++) {
						var child = vnode.children[i];
						if (child != null) moveChildToFrag(parent, frag, child);
					}
				}
				break
			}
		}

		function insertNode(parent, dom, nextSibling) {
			if (nextSibling != null) parent.insertBefore(dom, nextSibling);
			else parent.appendChild(dom);
		}

		function maybeSetContentEditable(vnode) {
			if (vnode.attrs == null || (
				vnode.attrs.contenteditable == null && // attribute
				vnode.attrs.contentEditable == null // property
			)) return false
			var children = vnode.children;
			if (children != null && children.length === 1 && children[0].tag === "<") {
				var content = children[0].children;
				if (vnode.dom.innerHTML !== content) vnode.dom.innerHTML = content;
			}
			else if (vnode.text != null || children != null && children.length !== 0) throw new Error("Child node of a contenteditable must be trusted")
			return true
		}

		//remove
		function removeNodes(parent, vnodes, start, end) {
			for (var i = start; i < end; i++) {
				var vnode = vnodes[i];
				if (vnode != null) removeNode(parent, vnode);
			}
		}
		function removeNode(parent, vnode) {
			var mask = 0;
			var original = vnode.state;
			var stateResult, attrsResult;
			if (typeof vnode.tag !== "string" && typeof vnode.state.onbeforeremove === "function") {
				var result = callHook.call(vnode.state.onbeforeremove, vnode);
				if (result != null && typeof result.then === "function") {
					mask = 1;
					stateResult = result;
				}
			}
			if (vnode.attrs && typeof vnode.attrs.onbeforeremove === "function") {
				var result = callHook.call(vnode.attrs.onbeforeremove, vnode);
				if (result != null && typeof result.then === "function") {
					// eslint-disable-next-line no-bitwise
					mask |= 2;
					attrsResult = result;
				}
			}
			checkState(vnode, original);

			// If we can, try to fast-path it and avoid all the overhead of awaiting
			if (!mask) {
				onremove(vnode);
				removeChild(parent, vnode);
			} else {
				if (stateResult != null) {
					var next = function () {
						// eslint-disable-next-line no-bitwise
						if (mask & 1) { mask &= 2; if (!mask) reallyRemove(); }
					};
					stateResult.then(next, next);
				}
				if (attrsResult != null) {
					var next = function () {
						// eslint-disable-next-line no-bitwise
						if (mask & 2) { mask &= 1; if (!mask) reallyRemove(); }
					};
					attrsResult.then(next, next);
				}
			}

			function reallyRemove() {
				checkState(vnode, original);
				onremove(vnode);
				removeChild(parent, vnode);
			}
		}
		function removeHTML(parent, vnode) {
			for (var i = 0; i < vnode.instance.length; i++) {
				parent.removeChild(vnode.instance[i]);
			}
		}
		function removeChild(parent, vnode) {
			// Dodge the recursion overhead in a few of the most common cases.
			while (vnode.dom != null && vnode.dom.parentNode === parent) {
				if (typeof vnode.tag !== "string") {
					vnode = vnode.instance;
					if (vnode != null) continue
				} else if (vnode.tag === "<") {
					removeHTML(parent, vnode);
				} else {
					if (vnode.tag !== "[") {
						parent.removeChild(vnode.dom);
						if (!Array.isArray(vnode.children)) break
					}
					if (vnode.children.length === 1) {
						vnode = vnode.children[0];
						if (vnode != null) continue
					} else {
						for (var i = 0; i < vnode.children.length; i++) {
							var child = vnode.children[i];
							if (child != null) removeChild(parent, child);
						}
					}
				}
				break
			}
		}
		function onremove(vnode) {
			if (typeof vnode.tag !== "string" && typeof vnode.state.onremove === "function") callHook.call(vnode.state.onremove, vnode);
			if (vnode.attrs && typeof vnode.attrs.onremove === "function") callHook.call(vnode.attrs.onremove, vnode);
			if (typeof vnode.tag !== "string") {
				if (vnode.instance != null) onremove(vnode.instance);
			} else {
				var children = vnode.children;
				if (Array.isArray(children)) {
					for (var i = 0; i < children.length; i++) {
						var child = children[i];
						if (child != null) onremove(child);
					}
				}
			}
		}

		//attrs
		function setAttrs(vnode, attrs, ns) {
			for (var key in attrs) {
				setAttr(vnode, key, null, attrs[key], ns);
			}
		}
		function setAttr(vnode, key, old, value, ns) {
			if (key === "key" || key === "is" || value == null || isLifecycleMethod(key) || (old === value && !isFormAttribute(vnode, key)) && typeof value !== "object") return
			if (key[0] === "o" && key[1] === "n") return updateEvent(vnode, key, value)
			if (key.slice(0, 6) === "xlink:") vnode.dom.setAttributeNS("http://www.w3.org/1999/xlink", key.slice(6), value);
			else if (key === "style") updateStyle(vnode.dom, old, value);
			else if (hasPropertyKey(vnode, key, ns)) {
				if (key === "value") {
					// Only do the coercion if we're actually going to check the value.
					/* eslint-disable no-implicit-coercion */
					//setting input[value] to same value by typing on focused element moves cursor to end in Chrome
					if ((vnode.tag === "input" || vnode.tag === "textarea") && vnode.dom.value === "" + value && vnode.dom === activeElement()) return
					//setting select[value] to same value while having select open blinks select dropdown in Chrome
					if (vnode.tag === "select" && old !== null && vnode.dom.value === "" + value) return
					//setting option[value] to same value while having select open blinks select dropdown in Chrome
					if (vnode.tag === "option" && old !== null && vnode.dom.value === "" + value) return
					/* eslint-enable no-implicit-coercion */
				}
				// If you assign an input type that is not supported by IE 11 with an assignment expression, an error will occur.
				if (vnode.tag === "input" && key === "type") vnode.dom.setAttribute(key, value);
				else vnode.dom[key] = value;
			} else {
				if (typeof value === "boolean") {
					if (value) vnode.dom.setAttribute(key, "");
					else vnode.dom.removeAttribute(key);
				}
				else vnode.dom.setAttribute(key === "className" ? "class" : key, value);
			}
		}
		function removeAttr(vnode, key, old, ns) {
			if (key === "key" || key === "is" || old == null || isLifecycleMethod(key)) return
			if (key[0] === "o" && key[1] === "n" && !isLifecycleMethod(key)) updateEvent(vnode, key, undefined);
			else if (key === "style") updateStyle(vnode.dom, old, null);
			else if (
				hasPropertyKey(vnode, key, ns)
				&& key !== "className"
				&& !(key === "value" && (
					vnode.tag === "option"
					|| vnode.tag === "select" && vnode.dom.selectedIndex === -1 && vnode.dom === activeElement()
				))
				&& !(vnode.tag === "input" && key === "type")
			) {
				vnode.dom[key] = null;
			} else {
				var nsLastIndex = key.indexOf(":");
				if (nsLastIndex !== -1) key = key.slice(nsLastIndex + 1);
				if (old !== false) vnode.dom.removeAttribute(key === "className" ? "class" : key);
			}
		}
		function setLateSelectAttrs(vnode, attrs) {
			if ("value" in attrs) {
				if(attrs.value === null) {
					if (vnode.dom.selectedIndex !== -1) vnode.dom.value = null;
				} else {
					var normalized = "" + attrs.value; // eslint-disable-line no-implicit-coercion
					if (vnode.dom.value !== normalized || vnode.dom.selectedIndex === -1) {
						vnode.dom.value = normalized;
					}
				}
			}
			if ("selectedIndex" in attrs) setAttr(vnode, "selectedIndex", null, attrs.selectedIndex, undefined);
		}
		function updateAttrs(vnode, old, attrs, ns) {
			if (attrs != null) {
				for (var key in attrs) {
					setAttr(vnode, key, old && old[key], attrs[key], ns);
				}
			}
			var val;
			if (old != null) {
				for (var key in old) {
					if (((val = old[key]) != null) && (attrs == null || attrs[key] == null)) {
						removeAttr(vnode, key, val, ns);
					}
				}
			}
		}
		function isFormAttribute(vnode, attr) {
			return attr === "value" || attr === "checked" || attr === "selectedIndex" || attr === "selected" && vnode.dom === activeElement() || vnode.tag === "option" && vnode.dom.parentNode === $doc.activeElement
		}
		function isLifecycleMethod(attr) {
			return attr === "oninit" || attr === "oncreate" || attr === "onupdate" || attr === "onremove" || attr === "onbeforeremove" || attr === "onbeforeupdate"
		}
		function hasPropertyKey(vnode, key, ns) {
			// Filter out namespaced keys
			return ns === undefined && (
				// If it's a custom element, just keep it.
				vnode.tag.indexOf("-") > -1 || vnode.attrs != null && vnode.attrs.is ||
				// If it's a normal element, let's try to avoid a few browser bugs.
				key !== "href" && key !== "list" && key !== "form" && key !== "width" && key !== "height"// && key !== "type"
				// Defer the property check until *after* we check everything.
			) && key in vnode.dom
		}

		//style
		var uppercaseRegex = /[A-Z]/g;
		function toLowerCase(capital) { return "-" + capital.toLowerCase() }
		function normalizeKey(key) {
			return key[0] === "-" && key[1] === "-" ? key :
				key === "cssFloat" ? "float" :
					key.replace(uppercaseRegex, toLowerCase)
		}
		function updateStyle(element, old, style) {
			if (old === style) ; else if (style == null) {
				// New style is missing, just clear it.
				element.style.cssText = "";
			} else if (typeof style !== "object") {
				// New style is a string, let engine deal with patching.
				element.style.cssText = style;
			} else if (old == null || typeof old !== "object") {
				// `old` is missing or a string, `style` is an object.
				element.style.cssText = "";
				// Add new style properties
				for (var key in style) {
					var value = style[key];
					if (value != null) element.style.setProperty(normalizeKey(key), String(value));
				}
			} else {
				// Both old & new are (different) objects.
				// Update style properties that have changed
				for (var key in style) {
					var value = style[key];
					if (value != null && (value = String(value)) !== String(old[key])) {
						element.style.setProperty(normalizeKey(key), value);
					}
				}
				// Remove style properties that no longer exist
				for (var key in old) {
					if (old[key] != null && style[key] == null) {
						element.style.removeProperty(normalizeKey(key));
					}
				}
			}
		}

		// Here's an explanation of how this works:
		// 1. The event names are always (by design) prefixed by `on`.
		// 2. The EventListener interface accepts either a function or an object
		//    with a `handleEvent` method.
		// 3. The object does not inherit from `Object.prototype`, to avoid
		//    any potential interference with that (e.g. setters).
		// 4. The event name is remapped to the handler before calling it.
		// 5. In function-based event handlers, `ev.target === this`. We replicate
		//    that below.
		// 6. In function-based event handlers, `return false` prevents the default
		//    action and stops event propagation. We replicate that below.
		function EventDict() {
			// Save this, so the current redraw is correctly tracked.
			this._ = currentRedraw;
		}
		EventDict.prototype = Object.create(null);
		EventDict.prototype.handleEvent = function (ev) {
			var handler = this["on" + ev.type];
			var result;
			if (typeof handler === "function") result = handler.call(ev.currentTarget, ev);
			else if (typeof handler.handleEvent === "function") handler.handleEvent(ev);
			if (this._ && ev.redraw !== false) (0, this._)();
			if (result === false) {
				ev.preventDefault();
				ev.stopPropagation();
			}
		};

		//event
		function updateEvent(vnode, key, value) {
			if (vnode.events != null) {
				if (vnode.events[key] === value) return
				if (value != null && (typeof value === "function" || typeof value === "object")) {
					if (vnode.events[key] == null) vnode.dom.addEventListener(key.slice(2), vnode.events, false);
					vnode.events[key] = value;
				} else {
					if (vnode.events[key] != null) vnode.dom.removeEventListener(key.slice(2), vnode.events, false);
					vnode.events[key] = undefined;
				}
			} else if (value != null && (typeof value === "function" || typeof value === "object")) {
				vnode.events = new EventDict();
				vnode.dom.addEventListener(key.slice(2), vnode.events, false);
				vnode.events[key] = value;
			}
		}

		//lifecycle
		function initLifecycle(source, vnode, hooks) {
			if (typeof source.oninit === "function") callHook.call(source.oninit, vnode);
			if (typeof source.oncreate === "function") hooks.push(callHook.bind(source.oncreate, vnode));
		}
		function updateLifecycle(source, vnode, hooks) {
			if (typeof source.onupdate === "function") hooks.push(callHook.bind(source.onupdate, vnode));
		}
		function shouldNotUpdate(vnode, old) {
			do {
				if (vnode.attrs != null && typeof vnode.attrs.onbeforeupdate === "function") {
					var force = callHook.call(vnode.attrs.onbeforeupdate, vnode, old);
					if (force !== undefined && !force) break
				}
				if (typeof vnode.tag !== "string" && typeof vnode.state.onbeforeupdate === "function") {
					var force = callHook.call(vnode.state.onbeforeupdate, vnode, old);
					if (force !== undefined && !force) break
				}
				return false
			} while (false); // eslint-disable-line no-constant-condition
			vnode.dom = old.dom;
			vnode.domSize = old.domSize;
			vnode.instance = old.instance;
			// One would think having the actual latest attributes would be ideal,
			// but it doesn't let us properly diff based on our current internal
			// representation. We have to save not only the old DOM info, but also
			// the attributes used to create it, as we diff *that*, not against the
			// DOM directly (with a few exceptions in `setAttr`). And, of course, we
			// need to save the children and text as they are conceptually not
			// unlike special "attributes" internally.
			vnode.attrs = old.attrs;
			vnode.children = old.children;
			vnode.text = old.text;
			return true
		}

		return function(dom, vnodes, redraw) {
			if (!dom) throw new TypeError("Ensure the DOM element being passed to m.route/m.mount/m.render is not undefined.")
			var hooks = [];
			var active = activeElement();
			var namespace = dom.namespaceURI;

			// First time rendering into a node clears it out
			if (dom.vnodes == null) dom.textContent = "";

			vnodes = vnode.normalizeChildren(Array.isArray(vnodes) ? vnodes : [vnodes]);
			var prevRedraw = currentRedraw;
			try {
				currentRedraw = typeof redraw === "function" ? redraw : undefined;
				updateNodes(dom, dom.vnodes, vnodes, hooks, null, namespace === "http://www.w3.org/1999/xhtml" ? undefined : namespace);
			} finally {
				currentRedraw = prevRedraw;
			}
			dom.vnodes = vnodes;
			// `document.activeElement` can return null: https://html.spec.whatwg.org/multipage/interaction.html#dom-document-activeelement
			if (active != null && activeElement() !== active && typeof active.focus === "function") active.focus();
			for (var i = 0; i < hooks.length; i++) hooks[i]();
		}
	};

	var render = render$1(window);

	var mountRedraw$1 = function(render, schedule, console) {
		var subscriptions = [];
		var rendering = false;
		var pending = false;

		function sync() {
			if (rendering) throw new Error("Nested m.redraw.sync() call")
			rendering = true;
			for (var i = 0; i < subscriptions.length; i += 2) {
				try { render(subscriptions[i], vnode(subscriptions[i + 1]), redraw); }
				catch (e) { console.error(e); }
			}
			rendering = false;
		}

		function redraw() {
			if (!pending) {
				pending = true;
				schedule(function() {
					pending = false;
					sync();
				});
			}
		}

		redraw.sync = sync;

		function mount(root, component) {
			if (component != null && component.view == null && typeof component !== "function") {
				throw new TypeError("m.mount(element, component) expects a component, not a vnode")
			}

			var index = subscriptions.indexOf(root);
			if (index >= 0) {
				subscriptions.splice(index, 2);
				render(root, [], redraw);
			}

			if (component != null) {
				subscriptions.push(root, component);
				render(root, vnode(component), redraw);
			}
		}

		return {mount: mount, redraw: redraw}
	};

	var mountRedraw = mountRedraw$1(render, requestAnimationFrame, console);

	var build$1 = function(object) {
		if (Object.prototype.toString.call(object) !== "[object Object]") return ""

		var args = [];
		for (var key in object) {
			destructure(key, object[key]);
		}

		return args.join("&")

		function destructure(key, value) {
			if (Array.isArray(value)) {
				for (var i = 0; i < value.length; i++) {
					destructure(key + "[" + i + "]", value[i]);
				}
			}
			else if (Object.prototype.toString.call(value) === "[object Object]") {
				for (var i in value) {
					destructure(key + "[" + i + "]", value[i]);
				}
			}
			else args.push(encodeURIComponent(key) + (value != null && value !== "" ? "=" + encodeURIComponent(value) : ""));
		}
	};

	var assign = Object.assign || function(target, source) {
		if(source) Object.keys(source).forEach(function(key) { target[key] = source[key]; });
	};

	// Returns `path` from `template` + `params`
	var build = function(template, params) {
		if ((/:([^\/\.-]+)(\.{3})?:/).test(template)) {
			throw new SyntaxError("Template parameter names *must* be separated")
		}
		if (params == null) return template
		var queryIndex = template.indexOf("?");
		var hashIndex = template.indexOf("#");
		var queryEnd = hashIndex < 0 ? template.length : hashIndex;
		var pathEnd = queryIndex < 0 ? queryEnd : queryIndex;
		var path = template.slice(0, pathEnd);
		var query = {};

		assign(query, params);

		var resolved = path.replace(/:([^\/\.-]+)(\.{3})?/g, function(m, key, variadic) {
			delete query[key];
			// If no such parameter exists, don't interpolate it.
			if (params[key] == null) return m
			// Escape normal parameters, but not variadic ones.
			return variadic ? params[key] : encodeURIComponent(String(params[key]))
		});

		// In case the template substitution adds new query/hash parameters.
		var newQueryIndex = resolved.indexOf("?");
		var newHashIndex = resolved.indexOf("#");
		var newQueryEnd = newHashIndex < 0 ? resolved.length : newHashIndex;
		var newPathEnd = newQueryIndex < 0 ? newQueryEnd : newQueryIndex;
		var result = resolved.slice(0, newPathEnd);

		if (queryIndex >= 0) result += template.slice(queryIndex, queryEnd);
		if (newQueryIndex >= 0) result += (queryIndex < 0 ? "?" : "&") + resolved.slice(newQueryIndex, newQueryEnd);
		var querystring = build$1(query);
		if (querystring) result += (queryIndex < 0 && newQueryIndex < 0 ? "?" : "&") + querystring;
		if (hashIndex >= 0) result += template.slice(hashIndex);
		if (newHashIndex >= 0) result += (hashIndex < 0 ? "" : "&") + resolved.slice(newHashIndex);
		return result
	};

	var request$1 = function($window, Promise, oncompletion) {
		var callbackCount = 0;

		function PromiseProxy(executor) {
			return new Promise(executor)
		}

		// In case the global Promise is some userland library's where they rely on
		// `foo instanceof this.constructor`, `this.constructor.resolve(value)`, or
		// similar. Let's *not* break them.
		PromiseProxy.prototype = Promise.prototype;
		PromiseProxy.__proto__ = Promise; // eslint-disable-line no-proto

		function makeRequest(factory) {
			return function(url, args) {
				if (typeof url !== "string") { args = url; url = url.url; }
				else if (args == null) args = {};
				var promise = new Promise(function(resolve, reject) {
					factory(build(url, args.params), args, function (data) {
						if (typeof args.type === "function") {
							if (Array.isArray(data)) {
								for (var i = 0; i < data.length; i++) {
									data[i] = new args.type(data[i]);
								}
							}
							else data = new args.type(data);
						}
						resolve(data);
					}, reject);
				});
				if (args.background === true) return promise
				var count = 0;
				function complete() {
					if (--count === 0 && typeof oncompletion === "function") oncompletion();
				}

				return wrap(promise)

				function wrap(promise) {
					var then = promise.then;
					// Set the constructor, so engines know to not await or resolve
					// this as a native promise. At the time of writing, this is
					// only necessary for V8, but their behavior is the correct
					// behavior per spec. See this spec issue for more details:
					// https://github.com/tc39/ecma262/issues/1577. Also, see the
					// corresponding comment in `request/tests/test-request.js` for
					// a bit more background on the issue at hand.
					promise.constructor = PromiseProxy;
					promise.then = function() {
						count++;
						var next = then.apply(promise, arguments);
						next.then(complete, function(e) {
							complete();
							if (count === 0) throw e
						});
						return wrap(next)
					};
					return promise
				}
			}
		}

		function hasHeader(args, name) {
			for (var key in args.headers) {
				if ({}.hasOwnProperty.call(args.headers, key) && name.test(key)) return true
			}
			return false
		}

		return {
			request: makeRequest(function(url, args, resolve, reject) {
				var method = args.method != null ? args.method.toUpperCase() : "GET";
				var body = args.body;
				var assumeJSON = (args.serialize == null || args.serialize === JSON.serialize) && !(body instanceof $window.FormData);
				var responseType = args.responseType || (typeof args.extract === "function" ? "" : "json");

				var xhr = new $window.XMLHttpRequest(), aborted = false;
				var original = xhr, replacedAbort;
				var abort = xhr.abort;

				xhr.abort = function() {
					aborted = true;
					abort.call(this);
				};

				xhr.open(method, url, args.async !== false, typeof args.user === "string" ? args.user : undefined, typeof args.password === "string" ? args.password : undefined);

				if (assumeJSON && body != null && !hasHeader(args, /^content-type$/i)) {
					xhr.setRequestHeader("Content-Type", "application/json; charset=utf-8");
				}
				if (typeof args.deserialize !== "function" && !hasHeader(args, /^accept$/i)) {
					xhr.setRequestHeader("Accept", "application/json, text/*");
				}
				if (args.withCredentials) xhr.withCredentials = args.withCredentials;
				if (args.timeout) xhr.timeout = args.timeout;
				xhr.responseType = responseType;

				for (var key in args.headers) {
					if ({}.hasOwnProperty.call(args.headers, key)) {
						xhr.setRequestHeader(key, args.headers[key]);
					}
				}

				xhr.onreadystatechange = function(ev) {
					// Don't throw errors on xhr.abort().
					if (aborted) return

					if (ev.target.readyState === 4) {
						try {
							var success = (ev.target.status >= 200 && ev.target.status < 300) || ev.target.status === 304 || (/^file:\/\//i).test(url);
							// When the response type isn't "" or "text",
							// `xhr.responseText` is the wrong thing to use.
							// Browsers do the right thing and throw here, and we
							// should honor that and do the right thing by
							// preferring `xhr.response` where possible/practical.
							var response = ev.target.response, message;

							if (responseType === "json") {
								// For IE and Edge, which don't implement
								// `responseType: "json"`.
								if (!ev.target.responseType && typeof args.extract !== "function") response = JSON.parse(ev.target.responseText);
							} else if (!responseType || responseType === "text") {
								// Only use this default if it's text. If a parsed
								// document is needed on old IE and friends (all
								// unsupported), the user should use a custom
								// `config` instead. They're already using this at
								// their own risk.
								if (response == null) response = ev.target.responseText;
							}

							if (typeof args.extract === "function") {
								response = args.extract(ev.target, args);
								success = true;
							} else if (typeof args.deserialize === "function") {
								response = args.deserialize(response);
							}
							if (success) resolve(response);
							else {
								try { message = ev.target.responseText; }
								catch (e) { message = response; }
								var error = new Error(message);
								error.code = ev.target.status;
								error.response = response;
								reject(error);
							}
						}
						catch (e) {
							reject(e);
						}
					}
				};

				if (typeof args.config === "function") {
					xhr = args.config(xhr, args, url) || xhr;

					// Propagate the `abort` to any replacement XHR as well.
					if (xhr !== original) {
						replacedAbort = xhr.abort;
						xhr.abort = function() {
							aborted = true;
							replacedAbort.call(this);
						};
					}
				}

				if (body == null) xhr.send();
				else if (typeof args.serialize === "function") xhr.send(args.serialize(body));
				else if (body instanceof $window.FormData) xhr.send(body);
				else xhr.send(JSON.stringify(body));
			}),
			jsonp: makeRequest(function(url, args, resolve, reject) {
				var callbackName = args.callbackName || "_mithril_" + Math.round(Math.random() * 1e16) + "_" + callbackCount++;
				var script = $window.document.createElement("script");
				$window[callbackName] = function(data) {
					delete $window[callbackName];
					script.parentNode.removeChild(script);
					resolve(data);
				};
				script.onerror = function() {
					delete $window[callbackName];
					script.parentNode.removeChild(script);
					reject(new Error("JSONP request failed"));
				};
				script.src = url + (url.indexOf("?") < 0 ? "?" : "&") +
					encodeURIComponent(args.callbackKey || "callback") + "=" +
					encodeURIComponent(callbackName);
				$window.document.documentElement.appendChild(script);
			}),
		}
	};

	var request = request$1(window, promise, mountRedraw.redraw);

	var parse$1 = function(string) {
		if (string === "" || string == null) return {}
		if (string.charAt(0) === "?") string = string.slice(1);

		var entries = string.split("&"), counters = {}, data = {};
		for (var i = 0; i < entries.length; i++) {
			var entry = entries[i].split("=");
			var key = decodeURIComponent(entry[0]);
			var value = entry.length === 2 ? decodeURIComponent(entry[1]) : "";

			if (value === "true") value = true;
			else if (value === "false") value = false;

			var levels = key.split(/\]\[?|\[/);
			var cursor = data;
			if (key.indexOf("[") > -1) levels.pop();
			for (var j = 0; j < levels.length; j++) {
				var level = levels[j], nextLevel = levels[j + 1];
				var isNumber = nextLevel == "" || !isNaN(parseInt(nextLevel, 10));
				if (level === "") {
					var key = levels.slice(0, j).join();
					if (counters[key] == null) {
						counters[key] = Array.isArray(cursor) ? cursor.length : 0;
					}
					level = counters[key]++;
				}
				// Disallow direct prototype pollution
				else if (level === "__proto__") break
				if (j === levels.length - 1) cursor[level] = value;
				else {
					// Read own properties exclusively to disallow indirect
					// prototype pollution
					var desc = Object.getOwnPropertyDescriptor(cursor, level);
					if (desc != null) desc = desc.value;
					if (desc == null) cursor[level] = desc = isNumber ? [] : {};
					cursor = desc;
				}
			}
		}
		return data
	};

	// Returns `{path, params}` from `url`
	var parse = function(url) {
		var queryIndex = url.indexOf("?");
		var hashIndex = url.indexOf("#");
		var queryEnd = hashIndex < 0 ? url.length : hashIndex;
		var pathEnd = queryIndex < 0 ? queryEnd : queryIndex;
		var path = url.slice(0, pathEnd).replace(/\/{2,}/g, "/");

		if (!path) path = "/";
		else {
			if (path[0] !== "/") path = "/" + path;
			if (path.length > 1 && path[path.length - 1] === "/") path = path.slice(0, -1);
		}
		return {
			path: path,
			params: queryIndex < 0
				? {}
				: parse$1(url.slice(queryIndex + 1, queryEnd)),
		}
	};

	// Compiles a template into a function that takes a resolved path (without query
	// strings) and returns an object containing the template parameters with their
	// parsed values. This expects the input of the compiled template to be the
	// output of `parsePathname`. Note that it does *not* remove query parameters
	// specified in the template.
	var compileTemplate = function(template) {
		var templateData = parse(template);
		var templateKeys = Object.keys(templateData.params);
		var keys = [];
		var regexp = new RegExp("^" + templateData.path.replace(
			// I escape literal text so people can use things like `:file.:ext` or
			// `:lang-:locale` in routes. This is all merged into one pass so I
			// don't also accidentally escape `-` and make it harder to detect it to
			// ban it from template parameters.
			/:([^\/.-]+)(\.{3}|\.(?!\.)|-)?|[\\^$*+.()|\[\]{}]/g,
			function(m, key, extra) {
				if (key == null) return "\\" + m
				keys.push({k: key, r: extra === "..."});
				if (extra === "...") return "(.*)"
				if (extra === ".") return "([^/]+)\\."
				return "([^/]+)" + (extra || "")
			}
		) + "$");
		return function(data) {
			// First, check the params. Usually, there isn't any, and it's just
			// checking a static set.
			for (var i = 0; i < templateKeys.length; i++) {
				if (templateData.params[templateKeys[i]] !== data.params[templateKeys[i]]) return false
			}
			// If no interpolations exist, let's skip all the ceremony
			if (!keys.length) return regexp.test(data.path)
			var values = regexp.exec(data.path);
			if (values == null) return false
			for (var i = 0; i < keys.length; i++) {
				data.params[keys[i].k] = keys[i].r ? values[i + 1] : decodeURIComponent(values[i + 1]);
			}
			return true
		}
	};

	var sentinel = {};

	var router = function($window, mountRedraw) {
		var fireAsync;

		function setPath(path, data, options) {
			path = build(path, data);
			if (fireAsync != null) {
				fireAsync();
				var state = options ? options.state : null;
				var title = options ? options.title : null;
				if (options && options.replace) $window.history.replaceState(state, title, route.prefix + path);
				else $window.history.pushState(state, title, route.prefix + path);
			}
			else {
				$window.location.href = route.prefix + path;
			}
		}

		var currentResolver = sentinel, component, attrs, currentPath, lastUpdate;

		var SKIP = route.SKIP = {};

		function route(root, defaultRoute, routes) {
			if (root == null) throw new Error("Ensure the DOM element that was passed to `m.route` is not undefined")
			// 0 = start
			// 1 = init
			// 2 = ready
			var state = 0;

			var compiled = Object.keys(routes).map(function(route) {
				if (route[0] !== "/") throw new SyntaxError("Routes must start with a `/`")
				if ((/:([^\/\.-]+)(\.{3})?:/).test(route)) {
					throw new SyntaxError("Route parameter names must be separated with either `/`, `.`, or `-`")
				}
				return {
					route: route,
					component: routes[route],
					check: compileTemplate(route),
				}
			});
			var callAsync = typeof setImmediate === "function" ? setImmediate : setTimeout;
			var p = promise.resolve();
			var scheduled = false;
			var onremove;

			fireAsync = null;

			if (defaultRoute != null) {
				var defaultData = parse(defaultRoute);

				if (!compiled.some(function (i) { return i.check(defaultData) })) {
					throw new ReferenceError("Default route doesn't match any known routes")
				}
			}

			function resolveRoute() {
				scheduled = false;
				// Consider the pathname holistically. The prefix might even be invalid,
				// but that's not our problem.
				var prefix = $window.location.hash;
				if (route.prefix[0] !== "#") {
					prefix = $window.location.search + prefix;
					if (route.prefix[0] !== "?") {
						prefix = $window.location.pathname + prefix;
						if (prefix[0] !== "/") prefix = "/" + prefix;
					}
				}
				// This seemingly useless `.concat()` speeds up the tests quite a bit,
				// since the representation is consistently a relatively poorly
				// optimized cons string.
				var path = prefix.concat()
					.replace(/(?:%[a-f89][a-f0-9])+/gim, decodeURIComponent)
					.slice(route.prefix.length);
				var data = parse(path);

				assign(data.params, $window.history.state);

				function fail() {
					if (path === defaultRoute) throw new Error("Could not resolve default route " + defaultRoute)
					setPath(defaultRoute, null, {replace: true});
				}

				loop(0);
				function loop(i) {
					// 0 = init
					// 1 = scheduled
					// 2 = done
					for (; i < compiled.length; i++) {
						if (compiled[i].check(data)) {
							var payload = compiled[i].component;
							var matchedRoute = compiled[i].route;
							var localComp = payload;
							var update = lastUpdate = function(comp) {
								if (update !== lastUpdate) return
								if (comp === SKIP) return loop(i + 1)
								component = comp != null && (typeof comp.view === "function" || typeof comp === "function")? comp : "div";
								attrs = data.params, currentPath = path, lastUpdate = null;
								currentResolver = payload.render ? payload : null;
								if (state === 2) mountRedraw.redraw();
								else {
									state = 2;
									mountRedraw.redraw.sync();
								}
							};
							// There's no understating how much I *wish* I could
							// use `async`/`await` here...
							if (payload.view || typeof payload === "function") {
								payload = {};
								update(localComp);
							}
							else if (payload.onmatch) {
								p.then(function () {
									return payload.onmatch(data.params, path, matchedRoute)
								}).then(update, fail);
							}
							else update("div");
							return
						}
					}
					fail();
				}
			}

			// Set it unconditionally so `m.route.set` and `m.route.Link` both work,
			// even if neither `pushState` nor `hashchange` are supported. It's
			// cleared if `hashchange` is used, since that makes it automatically
			// async.
			fireAsync = function() {
				if (!scheduled) {
					scheduled = true;
					callAsync(resolveRoute);
				}
			};

			if (typeof $window.history.pushState === "function") {
				onremove = function() {
					$window.removeEventListener("popstate", fireAsync, false);
				};
				$window.addEventListener("popstate", fireAsync, false);
			} else if (route.prefix[0] === "#") {
				fireAsync = null;
				onremove = function() {
					$window.removeEventListener("hashchange", resolveRoute, false);
				};
				$window.addEventListener("hashchange", resolveRoute, false);
			}

			return mountRedraw.mount(root, {
				onbeforeupdate: function() {
					state = state ? 2 : 1;
					return !(!state || sentinel === currentResolver)
				},
				oncreate: resolveRoute,
				onremove: onremove,
				view: function() {
					if (!state || sentinel === currentResolver) return
					// Wrap in a fragment to preserve existing key semantics
					var vnode$1 = [vnode(component, attrs.key, attrs)];
					if (currentResolver) vnode$1 = currentResolver.render(vnode$1[0]);
					return vnode$1
				},
			})
		}
		route.set = function(path, data, options) {
			if (lastUpdate != null) {
				options = options || {};
				options.replace = true;
			}
			lastUpdate = null;
			setPath(path, data, options);
		};
		route.get = function() {return currentPath};
		route.prefix = "#!";
		route.Link = {
			view: function(vnode) {
				var options = vnode.attrs.options;
				// Remove these so they don't get overwritten
				var attrs = {}, onclick, href;
				assign(attrs, vnode.attrs);
				// The first two are internal, but the rest are magic attributes
				// that need censored to not screw up rendering.
				attrs.selector = attrs.options = attrs.key = attrs.oninit =
				attrs.oncreate = attrs.onbeforeupdate = attrs.onupdate =
				attrs.onbeforeremove = attrs.onremove = null;

				// Do this now so we can get the most current `href` and `disabled`.
				// Those attributes may also be specified in the selector, and we
				// should honor that.
				var child = hyperscript_1$1(vnode.attrs.selector || "a", attrs, vnode.children);

				// Let's provide a *right* way to disable a route link, rather than
				// letting people screw up accessibility on accident.
				//
				// The attribute is coerced so users don't get surprised over
				// `disabled: 0` resulting in a button that's somehow routable
				// despite being visibly disabled.
				if (child.attrs.disabled = Boolean(child.attrs.disabled)) {
					child.attrs.href = null;
					child.attrs["aria-disabled"] = "true";
					// If you *really* do want to do this on a disabled link, use
					// an `oncreate` hook to add it.
					child.attrs.onclick = null;
				} else {
					onclick = child.attrs.onclick;
					href = child.attrs.href;
					child.attrs.href = route.prefix + href;
					child.attrs.onclick = function(e) {
						var result;
						if (typeof onclick === "function") {
							result = onclick.call(e.currentTarget, e);
						} else if (onclick == null || typeof onclick !== "object") ; else if (typeof onclick.handleEvent === "function") {
							onclick.handleEvent(e);
						}

						// Adapted from React Router's implementation:
						// https://github.com/ReactTraining/react-router/blob/520a0acd48ae1b066eb0b07d6d4d1790a1d02482/packages/react-router-dom/modules/Link.js
						//
						// Try to be flexible and intuitive in how we handle links.
						// Fun fact: links aren't as obvious to get right as you
						// would expect. There's a lot more valid ways to click a
						// link than this, and one might want to not simply click a
						// link, but right click or command-click it to copy the
						// link target, etc. Nope, this isn't just for blind people.
						if (
							// Skip if `onclick` prevented default
							result !== false && !e.defaultPrevented &&
							// Ignore everything but left clicks
							(e.button === 0 || e.which === 0 || e.which === 1) &&
							// Let the browser handle `target=_blank`, etc.
							(!e.currentTarget.target || e.currentTarget.target === "_self") &&
							// No modifier keys
							!e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey
						) {
							e.preventDefault();
							e.redraw = false;
							route.set(href, null, options);
						}
					};
				}
				return child
			},
		};
		route.param = function(key) {
			return attrs && key != null ? attrs[key] : attrs
		};

		return route
	};

	var route = router(window, mountRedraw);

	var m = function m() { return hyperscript_1.apply(this, arguments) };
	m.m = hyperscript_1;
	m.trust = hyperscript_1.trust;
	m.fragment = hyperscript_1.fragment;
	m.mount = mountRedraw.mount;
	m.route = route;
	m.render = render;
	m.redraw = mountRedraw.redraw;
	m.request = request.request;
	m.jsonp = request.jsonp;
	m.parseQueryString = parse$1;
	m.buildQueryString = build$1;
	m.parsePathname = parse;
	m.buildPathname = build;
	m.vnode = vnode;
	m.PromisePolyfill = polyfill;

	var mithril = m;

	var chessgroundPromotion = createCommonjsModule(function (module, exports) {
	var __awaiter = (commonjsGlobal && commonjsGlobal.__awaiter) || function (thisArg, _arguments, P, generator) {
	    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
	    return new (P || (P = Promise))(function (resolve, reject) {
	        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
	        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
	        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
	        step((generator = generator.apply(thisArg, _arguments || [])).next());
	    });
	};
	var __importDefault = (commonjsGlobal && commonjsGlobal.__importDefault) || function (mod) {
	    return (mod && mod.__esModule) ? mod : { "default": mod };
	};
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.ChessgroundPromotion = void 0;

	const hyperscript_1$1 = __importDefault(hyperscript_1);
	const kPromotionRoles = ["queen", "knight", "rook", "bishop"];
	const isPromotion = (orig, dest, piece) => {
	    return (piece.role == "pawn" &&
	        ((piece.color == "white" && dest[1] == "8") ||
	            (piece.color == "black" && dest[1] == "1")));
	};
	class ChessgroundPromotion {
	    constructor(el, cg // This allows instantiating `ChessgroundPromotion` before `Chessground`
	    ) {
	        this.el = el;
	        this.cg = cg;
	        this.state = undefined;
	        this.redraw();
	    }
	    patch(onMove, onPromotion) {
	        return (orig, dest, capturedPiece) => {
	            const piece = this.cg().state.pieces.get(dest);
	            if (!piece) {
	                return;
	            }
	            if (!isPromotion(orig, dest, piece)) {
	                if (onMove) {
	                    onMove(orig, dest, capturedPiece);
	                }
	                return;
	            }
	            this.prompt(dest, piece.color).then((role) => {
	                if (role) {
	                    this.cg().setPieces(new Map([
	                        [dest, { color: piece.color, role: role, promoted: true }],
	                    ]));
	                }
	                onPromotion(orig, dest, capturedPiece, role);
	            });
	        };
	    }
	    prompt(dest, color) {
	        return __awaiter(this, void 0, void 0, function* () {
	            const role = yield new Promise((resolve) => {
	                this.state = { dest, color, resolve };
	                this.redraw();
	            });
	            this.state = undefined;
	            this.redraw();
	            return role;
	        });
	    }
	    redraw() {
	        this.el.classList.toggle("cg-promotion--open", !!this.state);
	        mithril.render(this.el, this.view());
	    }
	    view() {
	        if (!this.state) {
	            return hyperscript_1$1.default("cg-helper", hyperscript_1$1.default("cg-container", hyperscript_1$1.default("cg-board")));
	        }
	        const { dest, color, resolve } = this.state;
	        const orientation = this.cg().state.orientation;
	        let left = dest.charCodeAt(0) - "a".charCodeAt(0);
	        let top = color == "white" ? 0 : 7;
	        let topStep = color == "white" ? 1 : -1;
	        if (orientation == "black") {
	            left = 7 - left;
	            top = 7 - top;
	            topStep *= -1;
	        }
	        let roles = kPromotionRoles.map((role, i) => hyperscript_1$1.default("square", {
	            style: `top: ${(top + i * topStep) * 12.5}%; left: ${left * 12.5}%`,
	            onclick: () => resolve(role),
	        }, hyperscript_1$1.default(`piece.${color}.${role}`)));
	        return hyperscript_1$1.default("cg-helper", hyperscript_1$1.default("cg-container", hyperscript_1$1.default("cg-board", { onclick: () => resolve(undefined) }, roles)));
	    }
	}
	exports.ChessgroundPromotion = ChessgroundPromotion;
	//# sourceMappingURL=index.js.map
	});

	var uci = createCommonjsModule(function (module, exports) {
	// Wrapper for Chessground and ChessgroundPromotion altogether
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.ChessgroundUci = void 0;


	const roleToChar = (s) => {
	    if (s == "knight") {
	        return "n";
	    }
	    return s[0];
	};
	const toUci = (orig, dest, promotion) => {
	    return orig + dest + (promotion ? roleToChar(promotion) : "");
	};
	class ChessgroundUci {
	    constructor(el, onUci, config) {
	        this.el = el;
	        this.onUci = onUci;
	        const elCg = document.createElement("div");
	        const elCgPromotion = document.createElement("div");
	        elCg.classList.add("cg");
	        elCg.classList.add("cg-wrap");
	        elCgPromotion.classList.add("cg-promotion");
	        elCgPromotion.classList.add("cg-wrap");
	        this.el.appendChild(elCg);
	        this.el.appendChild(elCgPromotion);
	        this.cgPromotion = new chessgroundPromotion.ChessgroundPromotion(elCgPromotion, () => this.cg);
	        this.cg = chessground.Chessground(elCg, config && this.patch(config));
	    }
	    patch(config) {
	        if (!config.events) {
	            config.events = {};
	        }
	        config.events.move = this.cgPromotion.patch(this.onMove.bind(this), this.onPromotion.bind(this));
	        return config;
	    }
	    set(config) {
	        this.cg.set(this.patch(config));
	    }
	    onMove(orig, dest, _capt) {
	        this.onUci(toUci(orig, dest));
	    }
	    onPromotion(orig, dest, _capt, role) {
	        this.onUci(role && toUci(orig, dest, role));
	    }
	}
	exports.ChessgroundUci = ChessgroundUci;
	//# sourceMappingURL=uci.js.map
	});

	function r(r,n){r.prototype=Object.create(n.prototype),r.prototype.constructor=r,r.__proto__=n;}var n,t=function(){function r(){}var t=r.prototype;return t.unwrap=function(r,t){var o=this._chain(function(t){return n.ok(r?r(t):t)},function(r){return t?n.ok(t(r)):n.err(r)});if(o.isErr)throw o.error;return o.value},t.map=function(r,t){return this._chain(function(t){return n.ok(r(t))},function(r){return n.err(t?t(r):r)})},t.chain=function(r,t){return this._chain(r,t||function(r){return n.err(r)})},r}(),o=function(n){function t(r){var t;return (t=n.call(this)||this).value=r,t.isOk=!0,t.isErr=!1,t}return r(t,n),t.prototype._chain=function(r,n){return r(this.value)},t}(t),e=function(n){function t(r){var t;return (t=n.call(this)||this).error=r,t.isOk=!1,t.isErr=!0,t}return r(t,n),t.prototype._chain=function(r,n){return n(this.error)},t}(t);!function(r){r.ok=function(r){return new o(r)},r.err=function(r){return new e(r||new Error)},r.all=function(n){if(Array.isArray(n)){for(var t=[],o=0;o<n.length;o++){var e=n[o];if(e.isErr)return e;t.push(e.value);}return r.ok(t)}for(var u={},i=Object.keys(n),c=0;c<i.length;c++){var a=n[i[c]];if(a.isErr)return a;u[i[c]]=a.value;}return r.ok(u)};}(n||(n={}));

	var dist = /*#__PURE__*/Object.freeze({
		__proto__: null,
		get Result () { return n; }
	});

	var types = createCommonjsModule(function (module, exports) {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.RULES = exports.isNormal = exports.isDrop = exports.CASTLING_SIDES = exports.ROLES = exports.COLORS = exports.RANK_NAMES = exports.FILE_NAMES = void 0;
	exports.FILE_NAMES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
	exports.RANK_NAMES = ['1', '2', '3', '4', '5', '6', '7', '8'];
	exports.COLORS = ['white', 'black'];
	exports.ROLES = ['pawn', 'knight', 'bishop', 'rook', 'queen', 'king'];
	exports.CASTLING_SIDES = ['a', 'h'];
	function isDrop(v) {
	    return 'role' in v;
	}
	exports.isDrop = isDrop;
	function isNormal(v) {
	    return 'from' in v;
	}
	exports.isNormal = isNormal;
	exports.RULES = ['chess', 'antichess', 'kingofthehill', '3check', 'atomic', 'horde', 'racingkings', 'crazyhouse'];
	//# sourceMappingURL=types.js.map
	});

	var squareSet = createCommonjsModule(function (module, exports) {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.SquareSet = void 0;
	function popcnt32(n) {
	    n = n - ((n >>> 1) & 1431655765);
	    n = (n & 858993459) + ((n >>> 2) & 858993459);
	    return Math.imul(n + (n >>> 4) & 252645135, 16843009) >> 24;
	}
	function bswap32(n) {
	    n = (n >>> 8) & 16711935 | ((n & 16711935) << 8);
	    return (n >>> 16) & 0xffff | ((n & 0xffff) << 16);
	}
	function rbit32(n) {
	    n = ((n >>> 1) & 1431655765) | ((n & 1431655765) << 1);
	    n = ((n >>> 2) & 858993459) | ((n & 858993459) << 2);
	    n = ((n >>> 4) & 252645135) | ((n & 252645135) << 4);
	    return bswap32(n);
	}
	class SquareSet {
	    constructor(lo, hi) {
	        this.lo = lo;
	        this.hi = hi;
	        this.lo = lo | 0;
	        this.hi = hi | 0;
	    }
	    static fromSquare(square) {
	        return square >= 32 ?
	            new SquareSet(0, 1 << (square - 32)) :
	            new SquareSet(1 << square, 0);
	    }
	    static fromRank(rank) {
	        return new SquareSet(0xff, 0).shl64(8 * rank);
	    }
	    static fromFile(file) {
	        return new SquareSet(16843009 << file, 16843009 << file);
	    }
	    static empty() {
	        return new SquareSet(0, 0);
	    }
	    static full() {
	        return new SquareSet(4294967295, 4294967295);
	    }
	    static corners() {
	        return new SquareSet(0x81, 2164260864);
	    }
	    static center() {
	        return new SquareSet(402653184, 0x18);
	    }
	    static backranks() {
	        return new SquareSet(0xff, 4278190080);
	    }
	    static backrank(color) {
	        return color === 'white' ? new SquareSet(0xff, 0) : new SquareSet(0, 4278190080);
	    }
	    static lightSquares() {
	        return new SquareSet(1437226410, 1437226410);
	    }
	    static darkSquares() {
	        return new SquareSet(2857740885, 2857740885);
	    }
	    complement() {
	        return new SquareSet(~this.lo, ~this.hi);
	    }
	    xor(other) {
	        return new SquareSet(this.lo ^ other.lo, this.hi ^ other.hi);
	    }
	    union(other) {
	        return new SquareSet(this.lo | other.lo, this.hi | other.hi);
	    }
	    intersect(other) {
	        return new SquareSet(this.lo & other.lo, this.hi & other.hi);
	    }
	    diff(other) {
	        return new SquareSet(this.lo & ~other.lo, this.hi & ~other.hi);
	    }
	    intersects(other) {
	        return this.intersect(other).nonEmpty();
	    }
	    isDisjoint(other) {
	        return this.intersect(other).isEmpty();
	    }
	    supersetOf(other) {
	        return other.diff(this).isEmpty();
	    }
	    subsetOf(other) {
	        return this.diff(other).isEmpty();
	    }
	    shr64(shift) {
	        if (shift >= 64)
	            return SquareSet.empty();
	        if (shift >= 32)
	            return new SquareSet(this.hi >>> (shift - 32), 0);
	        if (shift > 0)
	            return new SquareSet((this.lo >>> shift) ^ (this.hi << (32 - shift)), this.hi >>> shift);
	        return this;
	    }
	    shl64(shift) {
	        if (shift >= 64)
	            return SquareSet.empty();
	        if (shift >= 32)
	            return new SquareSet(0, this.lo << (shift - 32));
	        if (shift > 0)
	            return new SquareSet(this.lo << shift, (this.hi << shift) ^ (this.lo >>> (32 - shift)));
	        return this;
	    }
	    bswap64() {
	        return new SquareSet(bswap32(this.hi), bswap32(this.lo));
	    }
	    rbit64() {
	        return new SquareSet(rbit32(this.hi), rbit32(this.lo));
	    }
	    minus64(other) {
	        const lo = this.lo - other.lo;
	        const c = ((lo & other.lo & 1) + (other.lo >>> 1) + (lo >>> 1)) >>> 31;
	        return new SquareSet(lo, this.hi - (other.hi + c));
	    }
	    equals(other) {
	        return this.lo === other.lo && this.hi === other.hi;
	    }
	    size() {
	        return popcnt32(this.lo) + popcnt32(this.hi);
	    }
	    isEmpty() {
	        return this.lo === 0 && this.hi === 0;
	    }
	    nonEmpty() {
	        return this.lo !== 0 || this.hi !== 0;
	    }
	    has(square) {
	        return (square >= 32 ? this.hi & (1 << (square - 32)) : this.lo & (1 << square)) !== 0;
	    }
	    set(square, on) {
	        return on ? this.with(square) : this.without(square);
	    }
	    with(square) {
	        return square >= 32 ?
	            new SquareSet(this.lo, this.hi | (1 << (square - 32))) :
	            new SquareSet(this.lo | (1 << square), this.hi);
	    }
	    without(square) {
	        return square >= 32 ?
	            new SquareSet(this.lo, this.hi & ~(1 << (square - 32))) :
	            new SquareSet(this.lo & ~(1 << square), this.hi);
	    }
	    toggle(square) {
	        return square >= 32 ?
	            new SquareSet(this.lo, this.hi ^ (1 << (square - 32))) :
	            new SquareSet(this.lo ^ (1 << square), this.hi);
	    }
	    last() {
	        if (this.hi !== 0)
	            return 63 - Math.clz32(this.hi);
	        if (this.lo !== 0)
	            return 31 - Math.clz32(this.lo);
	        return;
	    }
	    first() {
	        if (this.lo !== 0)
	            return 31 - Math.clz32(this.lo & -this.lo);
	        if (this.hi !== 0)
	            return 63 - Math.clz32(this.hi & -this.hi);
	        return;
	    }
	    withoutFirst() {
	        if (this.lo !== 0)
	            return new SquareSet(this.lo & (this.lo - 1), this.hi);
	        return new SquareSet(0, this.hi & (this.hi - 1));
	    }
	    moreThanOne() {
	        return (this.hi !== 0 && this.lo !== 0) || (this.lo & (this.lo - 1)) !== 0 || (this.hi & (this.hi - 1)) !== 0;
	    }
	    singleSquare() {
	        return this.moreThanOne() ? undefined : this.last();
	    }
	    isSingleSquare() {
	        return this.nonEmpty() && !this.moreThanOne();
	    }
	    *[Symbol.iterator]() {
	        let lo = this.lo;
	        let hi = this.hi;
	        while (lo !== 0) {
	            const idx = 31 - Math.clz32(lo & -lo);
	            lo ^= 1 << idx;
	            yield idx;
	        }
	        while (hi !== 0) {
	            const idx = 31 - Math.clz32(hi & -hi);
	            hi ^= 1 << idx;
	            yield 32 + idx;
	        }
	    }
	    *reversed() {
	        let lo = this.lo;
	        let hi = this.hi;
	        while (hi !== 0) {
	            const idx = 31 - Math.clz32(hi);
	            hi ^= 1 << idx;
	            yield 32 + idx;
	        }
	        while (lo !== 0) {
	            const idx = 31 - Math.clz32(lo);
	            lo ^= 1 << idx;
	            yield idx;
	        }
	    }
	}
	exports.SquareSet = SquareSet;
	//# sourceMappingURL=squareSet.js.map
	});

	var board = createCommonjsModule(function (module, exports) {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.Board = void 0;


	class Board {
	    constructor() { }
	    static default() {
	        const board = new Board();
	        board.reset();
	        return board;
	    }
	    static racingKings() {
	        const board = new Board();
	        board.occupied = new squareSet.SquareSet(0xffff, 0);
	        board.promoted = squareSet.SquareSet.empty();
	        board.white = new squareSet.SquareSet(0xf0f0, 0);
	        board.black = new squareSet.SquareSet(0x0f0f, 0);
	        board.pawn = squareSet.SquareSet.empty();
	        board.knight = new squareSet.SquareSet(0x1818, 0);
	        board.bishop = new squareSet.SquareSet(0x2424, 0);
	        board.rook = new squareSet.SquareSet(0x4242, 0);
	        board.queen = new squareSet.SquareSet(0x0081, 0);
	        board.king = new squareSet.SquareSet(0x8100, 0);
	        return board;
	    }
	    static horde() {
	        const board = new Board();
	        board.occupied = new squareSet.SquareSet(4294967295, 4294901862);
	        board.promoted = squareSet.SquareSet.empty();
	        board.white = new squareSet.SquareSet(4294967295, 102);
	        board.black = new squareSet.SquareSet(0, 4294901760);
	        board.pawn = new squareSet.SquareSet(4294967295, 16711782);
	        board.knight = new squareSet.SquareSet(0, 1107296256);
	        board.bishop = new squareSet.SquareSet(0, 603979776);
	        board.rook = new squareSet.SquareSet(0, 2164260864);
	        board.queen = new squareSet.SquareSet(0, 134217728);
	        board.king = new squareSet.SquareSet(0, 268435456);
	        return board;
	    }
	    reset() {
	        this.occupied = new squareSet.SquareSet(0xffff, 4294901760);
	        this.promoted = squareSet.SquareSet.empty();
	        this.white = new squareSet.SquareSet(0xffff, 0);
	        this.black = new squareSet.SquareSet(0, 4294901760);
	        this.pawn = new squareSet.SquareSet(0xff00, 16711680);
	        this.knight = new squareSet.SquareSet(0x42, 1107296256);
	        this.bishop = new squareSet.SquareSet(0x24, 603979776);
	        this.rook = new squareSet.SquareSet(0x81, 2164260864);
	        this.queen = new squareSet.SquareSet(0x8, 134217728);
	        this.king = new squareSet.SquareSet(0x10, 268435456);
	    }
	    static empty() {
	        const board = new Board();
	        board.clear();
	        return board;
	    }
	    clear() {
	        this.occupied = squareSet.SquareSet.empty();
	        this.promoted = squareSet.SquareSet.empty();
	        for (const color of types.COLORS)
	            this[color] = squareSet.SquareSet.empty();
	        for (const role of types.ROLES)
	            this[role] = squareSet.SquareSet.empty();
	    }
	    clone() {
	        const board = new Board();
	        board.occupied = this.occupied;
	        board.promoted = this.promoted;
	        for (const color of types.COLORS)
	            board[color] = this[color];
	        for (const role of types.ROLES)
	            board[role] = this[role];
	        return board;
	    }
	    equalsIgnorePromoted(other) {
	        if (!this.white.equals(other.white))
	            return false;
	        return types.ROLES.every(role => this[role].equals(other[role]));
	    }
	    equals(other) {
	        return this.equalsIgnorePromoted(other) && this.promoted.equals(other.promoted);
	    }
	    getColor(square) {
	        if (this.white.has(square))
	            return 'white';
	        if (this.black.has(square))
	            return 'black';
	        return;
	    }
	    getRole(square) {
	        for (const role of types.ROLES) {
	            if (this[role].has(square))
	                return role;
	        }
	        return;
	    }
	    get(square) {
	        const color = this.getColor(square);
	        if (!color)
	            return;
	        const role = this.getRole(square);
	        const promoted = this.promoted.has(square);
	        return { color, role, promoted };
	    }
	    take(square) {
	        const piece = this.get(square);
	        if (piece) {
	            this.occupied = this.occupied.without(square);
	            this[piece.color] = this[piece.color].without(square);
	            this[piece.role] = this[piece.role].without(square);
	            if (piece.promoted)
	                this.promoted = this.promoted.without(square);
	        }
	        return piece;
	    }
	    set(square, piece) {
	        const old = this.take(square);
	        this.occupied = this.occupied.with(square);
	        this[piece.color] = this[piece.color].with(square);
	        this[piece.role] = this[piece.role].with(square);
	        if (piece.promoted)
	            this.promoted = this.promoted.with(square);
	        return old;
	    }
	    has(square) {
	        return this.occupied.has(square);
	    }
	    *[Symbol.iterator]() {
	        for (const square of this.occupied) {
	            yield [square, this.get(square)];
	        }
	    }
	    pieces(color, role) {
	        return this[color].intersect(this[role]);
	    }
	    rooksAndQueens() {
	        return this.rook.union(this.queen);
	    }
	    bishopsAndQueens() {
	        return this.bishop.union(this.queen);
	    }
	    kingOf(color) {
	        return this.king.intersect(this[color]).diff(this.promoted).singleSquare();
	    }
	}
	exports.Board = Board;
	//# sourceMappingURL=board.js.map
	});

	var util = createCommonjsModule(function (module, exports) {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.makeUci = exports.parseUci = exports.makeSquare = exports.parseSquare = exports.charToRole = exports.roleToChar = exports.squareFile = exports.squareRank = exports.opposite = exports.defined = void 0;

	function defined(v) {
	    return v !== undefined;
	}
	exports.defined = defined;
	function opposite(color) {
	    return color === 'white' ? 'black' : 'white';
	}
	exports.opposite = opposite;
	function squareRank(square) {
	    return square >> 3;
	}
	exports.squareRank = squareRank;
	function squareFile(square) {
	    return square & 0x7;
	}
	exports.squareFile = squareFile;
	function roleToChar(role) {
	    switch (role) {
	        case 'pawn': return 'p';
	        case 'knight': return 'n';
	        case 'bishop': return 'b';
	        case 'rook': return 'r';
	        case 'queen': return 'q';
	        case 'king': return 'k';
	    }
	}
	exports.roleToChar = roleToChar;
	function charToRole(ch) {
	    switch (ch) {
	        case 'P':
	        case 'p': return 'pawn';
	        case 'N':
	        case 'n': return 'knight';
	        case 'B':
	        case 'b': return 'bishop';
	        case 'R':
	        case 'r': return 'rook';
	        case 'Q':
	        case 'q': return 'queen';
	        case 'K':
	        case 'k': return 'king';
	        default: return;
	    }
	}
	exports.charToRole = charToRole;
	function parseSquare(str) {
	    if (str.length !== 2)
	        return;
	    const file = str.charCodeAt(0) - 'a'.charCodeAt(0);
	    const rank = str.charCodeAt(1) - '1'.charCodeAt(0);
	    if (file < 0 || file >= 8 || rank < 0 || rank >= 8)
	        return;
	    return file + 8 * rank;
	}
	exports.parseSquare = parseSquare;
	function makeSquare(square) {
	    return types.FILE_NAMES[squareFile(square)] + types.RANK_NAMES[squareRank(square)];
	}
	exports.makeSquare = makeSquare;
	function parseUci(str) {
	    if (str[1] === '@' && str.length === 4) {
	        const role = charToRole(str[0]);
	        const to = parseSquare(str.slice(2));
	        if (role && defined(to))
	            return { role, to };
	    }
	    else if (str.length === 4 || str.length === 5) {
	        const from = parseSquare(str.slice(0, 2));
	        const to = parseSquare(str.slice(2, 4));
	        let promotion;
	        if (str.length === 5) {
	            promotion = charToRole(str[4]);
	            if (!promotion)
	                return;
	        }
	        if (defined(from) && defined(to))
	            return { from, to, promotion };
	    }
	    return;
	}
	exports.parseUci = parseUci;
	function makeUci(move) {
	    if (types.isDrop(move))
	        return `${roleToChar(move.role).toUpperCase()}@${makeSquare(move.to)}`;
	    return makeSquare(move.from) + makeSquare(move.to) + (move.promotion ? roleToChar(move.promotion) : '');
	}
	exports.makeUci = makeUci;
	//# sourceMappingURL=util.js.map
	});

	var attacks_1 = createCommonjsModule(function (module, exports) {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.between = exports.ray = exports.attacks = exports.queenAttacks = exports.rookAttacks = exports.bishopAttacks = exports.pawnAttacks = exports.knightAttacks = exports.kingAttacks = void 0;


	function computeRange(square, deltas) {
	    let range = squareSet.SquareSet.empty();
	    for (const delta of deltas) {
	        const sq = square + delta;
	        if (0 <= sq && sq < 64 && Math.abs(util.squareFile(square) - util.squareFile(sq)) <= 2) {
	            range = range.with(sq);
	        }
	    }
	    return range;
	}
	function tabulate(f) {
	    const table = [];
	    for (let square = 0; square < 64; square++)
	        table[square] = f(square);
	    return table;
	}
	const KING_ATTACKS = tabulate(sq => computeRange(sq, [-9, -8, -7, -1, 1, 7, 8, 9]));
	const KNIGHT_ATTACKS = tabulate(sq => computeRange(sq, [-17, -15, -10, -6, 6, 10, 15, 17]));
	const PAWN_ATTACKS = {
	    white: tabulate(sq => computeRange(sq, [7, 9])),
	    black: tabulate(sq => computeRange(sq, [-7, -9])),
	};
	function kingAttacks(square) {
	    return KING_ATTACKS[square];
	}
	exports.kingAttacks = kingAttacks;
	function knightAttacks(square) {
	    return KNIGHT_ATTACKS[square];
	}
	exports.knightAttacks = knightAttacks;
	function pawnAttacks(color, square) {
	    return PAWN_ATTACKS[color][square];
	}
	exports.pawnAttacks = pawnAttacks;
	const FILE_RANGE = tabulate(sq => squareSet.SquareSet.fromFile(util.squareFile(sq)).without(sq));
	const RANK_RANGE = tabulate(sq => squareSet.SquareSet.fromRank(util.squareRank(sq)).without(sq));
	const DIAG_RANGE = tabulate(sq => {
	    const diag = new squareSet.SquareSet(134480385, 2151686160);
	    const shift = 8 * (util.squareRank(sq) - util.squareFile(sq));
	    return (shift >= 0 ? diag.shl64(shift) : diag.shr64(-shift)).without(sq);
	});
	const ANTI_DIAG_RANGE = tabulate(sq => {
	    const diag = new squareSet.SquareSet(270549120, 16909320);
	    const shift = 8 * (util.squareRank(sq) + util.squareFile(sq) - 7);
	    return (shift >= 0 ? diag.shl64(shift) : diag.shr64(-shift)).without(sq);
	});
	function hyperbola(bit, range, occupied) {
	    let forward = occupied.intersect(range);
	    let reverse = forward.bswap64(); // Assumes no more than 1 bit per rank
	    forward = forward.minus64(bit);
	    reverse = reverse.minus64(bit.bswap64());
	    return forward.xor(reverse.bswap64()).intersect(range);
	}
	function fileAttacks(square, occupied) {
	    return hyperbola(squareSet.SquareSet.fromSquare(square), FILE_RANGE[square], occupied);
	}
	function rankAttacks(square, occupied) {
	    const range = RANK_RANGE[square];
	    let forward = occupied.intersect(range);
	    let reverse = forward.rbit64();
	    forward = forward.minus64(squareSet.SquareSet.fromSquare(square));
	    reverse = reverse.minus64(squareSet.SquareSet.fromSquare(63 - square));
	    return forward.xor(reverse.rbit64()).intersect(range);
	}
	function bishopAttacks(square, occupied) {
	    const bit = squareSet.SquareSet.fromSquare(square);
	    return hyperbola(bit, DIAG_RANGE[square], occupied).xor(hyperbola(bit, ANTI_DIAG_RANGE[square], occupied));
	}
	exports.bishopAttacks = bishopAttacks;
	function rookAttacks(square, occupied) {
	    return fileAttacks(square, occupied).xor(rankAttacks(square, occupied));
	}
	exports.rookAttacks = rookAttacks;
	function queenAttacks(square, occupied) {
	    return bishopAttacks(square, occupied).xor(rookAttacks(square, occupied));
	}
	exports.queenAttacks = queenAttacks;
	function attacks(piece, square, occupied) {
	    switch (piece.role) {
	        case 'pawn': return pawnAttacks(piece.color, square);
	        case 'knight': return knightAttacks(square);
	        case 'bishop': return bishopAttacks(square, occupied);
	        case 'rook': return rookAttacks(square, occupied);
	        case 'queen': return queenAttacks(square, occupied);
	        case 'king': return kingAttacks(square);
	    }
	}
	exports.attacks = attacks;
	function ray(a, b) {
	    const other = squareSet.SquareSet.fromSquare(b);
	    if (RANK_RANGE[a].intersects(other))
	        return RANK_RANGE[a].with(a);
	    if (ANTI_DIAG_RANGE[a].intersects(other))
	        return ANTI_DIAG_RANGE[a].with(a);
	    if (DIAG_RANGE[a].intersects(other))
	        return DIAG_RANGE[a].with(a);
	    if (FILE_RANGE[a].intersects(other))
	        return FILE_RANGE[a].with(a);
	    return squareSet.SquareSet.empty();
	}
	exports.ray = ray;
	function between(a, b) {
	    return ray(a, b).intersect(squareSet.SquareSet.full().shl64(a).xor(squareSet.SquareSet.full().shl64(b))).withoutFirst();
	}
	exports.between = between;
	//# sourceMappingURL=attacks.js.map
	});

	var result_1 = /*@__PURE__*/getAugmentedNamespace(dist);

	var chess = createCommonjsModule(function (module, exports) {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.Chess = exports.Position = exports.Castles = exports.PositionError = exports.IllegalSetup = void 0;






	var IllegalSetup;
	(function (IllegalSetup) {
	    IllegalSetup["Empty"] = "ERR_EMPTY";
	    IllegalSetup["OppositeCheck"] = "ERR_OPPOSITE_CHECK";
	    IllegalSetup["ImpossibleCheck"] = "ERR_IMPOSSIBLE_CHECK";
	    IllegalSetup["PawnsOnBackrank"] = "ERR_PAWNS_ON_BACKRANK";
	    IllegalSetup["Kings"] = "ERR_KINGS";
	    IllegalSetup["Variant"] = "ERR_VARIANT";
	})(IllegalSetup = exports.IllegalSetup || (exports.IllegalSetup = {}));
	class PositionError extends Error {
	}
	exports.PositionError = PositionError;
	function attacksTo(square, attacker, board, occupied) {
	    return board[attacker].intersect(attacks_1.rookAttacks(square, occupied).intersect(board.rooksAndQueens())
	        .union(attacks_1.bishopAttacks(square, occupied).intersect(board.bishopsAndQueens()))
	        .union(attacks_1.knightAttacks(square).intersect(board.knight))
	        .union(attacks_1.kingAttacks(square).intersect(board.king))
	        .union(attacks_1.pawnAttacks(util.opposite(attacker), square).intersect(board.pawn)));
	}
	function kingCastlesTo(color, side) {
	    return color === 'white' ? (side === 'a' ? 2 : 6) : (side === 'a' ? 58 : 62);
	}
	function rookCastlesTo(color, side) {
	    return color === 'white' ? (side === 'a' ? 3 : 5) : (side === 'a' ? 59 : 61);
	}
	class Castles {
	    constructor() { }
	    static default() {
	        const castles = new Castles();
	        castles.unmovedRooks = squareSet.SquareSet.corners();
	        castles.rook = {
	            white: { a: 0, h: 7 },
	            black: { a: 56, h: 63 },
	        };
	        castles.path = {
	            white: { a: new squareSet.SquareSet(0xe, 0), h: new squareSet.SquareSet(0x60, 0) },
	            black: { a: new squareSet.SquareSet(0, 0x0e000000), h: new squareSet.SquareSet(0, 0x60000000) },
	        };
	        return castles;
	    }
	    static empty() {
	        const castles = new Castles();
	        castles.unmovedRooks = squareSet.SquareSet.empty();
	        castles.rook = {
	            white: { a: undefined, h: undefined },
	            black: { a: undefined, h: undefined },
	        };
	        castles.path = {
	            white: { a: squareSet.SquareSet.empty(), h: squareSet.SquareSet.empty() },
	            black: { a: squareSet.SquareSet.empty(), h: squareSet.SquareSet.empty() },
	        };
	        return castles;
	    }
	    clone() {
	        const castles = new Castles();
	        castles.unmovedRooks = this.unmovedRooks;
	        castles.rook = {
	            white: { a: this.rook.white.a, h: this.rook.white.h },
	            black: { a: this.rook.black.a, h: this.rook.black.h },
	        };
	        castles.path = {
	            white: { a: this.path.white.a, h: this.path.white.h },
	            black: { a: this.path.black.a, h: this.path.black.h },
	        };
	        return castles;
	    }
	    add(color, side, king, rook) {
	        const kingTo = kingCastlesTo(color, side);
	        const rookTo = rookCastlesTo(color, side);
	        this.unmovedRooks = this.unmovedRooks.with(rook);
	        this.rook[color][side] = rook;
	        this.path[color][side] = attacks_1.between(rook, rookTo).with(rookTo)
	            .union(attacks_1.between(king, kingTo).with(kingTo))
	            .without(king).without(rook);
	    }
	    static fromSetup(setup) {
	        const castles = Castles.empty();
	        const rooks = setup.unmovedRooks.intersect(setup.board.rook);
	        for (const color of types.COLORS) {
	            const backrank = squareSet.SquareSet.backrank(color);
	            const king = setup.board.kingOf(color);
	            if (!util.defined(king) || !backrank.has(king))
	                continue;
	            const side = rooks.intersect(setup.board[color]).intersect(backrank);
	            const aSide = side.first();
	            if (util.defined(aSide) && aSide < king)
	                castles.add(color, 'a', king, aSide);
	            const hSide = side.last();
	            if (util.defined(hSide) && king < hSide)
	                castles.add(color, 'h', king, hSide);
	        }
	        return castles;
	    }
	    discardRook(square) {
	        if (this.unmovedRooks.has(square)) {
	            this.unmovedRooks = this.unmovedRooks.without(square);
	            for (const color of types.COLORS) {
	                for (const side of types.CASTLING_SIDES) {
	                    if (this.rook[color][side] === square)
	                        this.rook[color][side] = undefined;
	                }
	            }
	        }
	    }
	    discardSide(color) {
	        this.unmovedRooks = this.unmovedRooks.diff(squareSet.SquareSet.backrank(color));
	        this.rook[color].a = undefined;
	        this.rook[color].h = undefined;
	    }
	}
	exports.Castles = Castles;
	class Position {
	    constructor(rules) {
	        this.rules = rules;
	    }
	    kingAttackers(square, attacker, occupied) {
	        return attacksTo(square, attacker, this.board, occupied);
	    }
	    dropDests(_ctx) {
	        return squareSet.SquareSet.empty();
	    }
	    playCaptureAt(square, captured) {
	        this.halfmoves = 0;
	        if (captured.role === 'rook')
	            this.castles.discardRook(square);
	        if (this.pockets)
	            this.pockets[util.opposite(captured.color)][captured.role]++;
	    }
	    ctx() {
	        const variantEnd = this.isVariantEnd();
	        const king = this.board.kingOf(this.turn);
	        if (!util.defined(king))
	            return { king, blockers: squareSet.SquareSet.empty(), checkers: squareSet.SquareSet.empty(), variantEnd, mustCapture: false };
	        const snipers = attacks_1.rookAttacks(king, squareSet.SquareSet.empty()).intersect(this.board.rooksAndQueens())
	            .union(attacks_1.bishopAttacks(king, squareSet.SquareSet.empty()).intersect(this.board.bishopsAndQueens()))
	            .intersect(this.board[util.opposite(this.turn)]);
	        let blockers = squareSet.SquareSet.empty();
	        for (const sniper of snipers) {
	            const b = attacks_1.between(king, sniper).intersect(this.board.occupied);
	            if (!b.moreThanOne())
	                blockers = blockers.union(b);
	        }
	        const checkers = this.kingAttackers(king, util.opposite(this.turn), this.board.occupied);
	        return {
	            king,
	            blockers,
	            checkers,
	            variantEnd,
	            mustCapture: false,
	        };
	    }
	    // The following should be identical in all subclasses
	    clone() {
	        var _a, _b;
	        const pos = new this.constructor();
	        pos.board = this.board.clone();
	        pos.pockets = (_a = this.pockets) === null || _a === void 0 ? void 0 : _a.clone();
	        pos.turn = this.turn;
	        pos.castles = this.castles.clone();
	        pos.epSquare = this.epSquare;
	        pos.remainingChecks = (_b = this.remainingChecks) === null || _b === void 0 ? void 0 : _b.clone();
	        pos.halfmoves = this.halfmoves;
	        pos.fullmoves = this.fullmoves;
	        return pos;
	    }
	    equalsIgnoreMoves(other) {
	        var _a, _b;
	        return this.rules === other.rules &&
	            (this.pockets ? this.board.equals(other.board) : this.board.equalsIgnorePromoted(other.board)) &&
	            ((other.pockets && ((_a = this.pockets) === null || _a === void 0 ? void 0 : _a.equals(other.pockets))) || (!this.pockets && !other.pockets)) &&
	            this.turn === other.turn &&
	            this.castles.unmovedRooks.equals(other.castles.unmovedRooks) &&
	            this.legalEpSquare() === other.legalEpSquare() &&
	            ((other.remainingChecks && ((_b = this.remainingChecks) === null || _b === void 0 ? void 0 : _b.equals(other.remainingChecks))) || (!this.remainingChecks && !other.remainingChecks));
	    }
	    toSetup() {
	        var _a, _b;
	        return {
	            board: this.board.clone(),
	            pockets: (_a = this.pockets) === null || _a === void 0 ? void 0 : _a.clone(),
	            turn: this.turn,
	            unmovedRooks: this.castles.unmovedRooks,
	            epSquare: this.legalEpSquare(),
	            remainingChecks: (_b = this.remainingChecks) === null || _b === void 0 ? void 0 : _b.clone(),
	            halfmoves: Math.min(this.halfmoves, 150),
	            fullmoves: Math.min(Math.max(this.fullmoves, 1), 9999),
	        };
	    }
	    isInsufficientMaterial() {
	        return types.COLORS.every(color => this.hasInsufficientMaterial(color));
	    }
	    hasDests(ctx) {
	        ctx = ctx || this.ctx();
	        for (const square of this.board[this.turn]) {
	            if (this.dests(square, ctx).nonEmpty())
	                return true;
	        }
	        return this.dropDests(ctx).nonEmpty();
	    }
	    isLegal(move, ctx) {
	        if (types.isDrop(move)) {
	            if (!this.pockets || this.pockets[this.turn][move.role] <= 0)
	                return false;
	            if (move.role === 'pawn' && squareSet.SquareSet.backranks().has(move.to))
	                return false;
	            return this.dropDests(ctx).has(move.to);
	        }
	        else {
	            if (move.promotion === 'pawn')
	                return false;
	            if (move.promotion === 'king' && this.rules !== 'antichess')
	                return false;
	            if (!!move.promotion !== (this.board.pawn.has(move.from) && squareSet.SquareSet.backranks().has(move.to)))
	                return false;
	            const dests = this.dests(move.from, ctx);
	            return dests.has(move.to) || dests.has(this.normalizeMove(move).to);
	        }
	    }
	    isCheck() {
	        const king = this.board.kingOf(this.turn);
	        return util.defined(king) && this.kingAttackers(king, util.opposite(this.turn), this.board.occupied).nonEmpty();
	    }
	    isEnd(ctx) {
	        if (ctx ? ctx.variantEnd : this.isVariantEnd())
	            return true;
	        return this.isInsufficientMaterial() || !this.hasDests(ctx);
	    }
	    isCheckmate(ctx) {
	        ctx = ctx || this.ctx();
	        return !ctx.variantEnd && ctx.checkers.nonEmpty() && !this.hasDests(ctx);
	    }
	    isStalemate(ctx) {
	        ctx = ctx || this.ctx();
	        return !ctx.variantEnd && ctx.checkers.isEmpty() && !this.hasDests(ctx);
	    }
	    outcome(ctx) {
	        const variantOutcome = this.variantOutcome(ctx);
	        if (variantOutcome)
	            return variantOutcome;
	        ctx = ctx || this.ctx();
	        if (this.isCheckmate(ctx))
	            return { winner: util.opposite(this.turn) };
	        else if (this.isInsufficientMaterial() || this.isStalemate(ctx))
	            return { winner: undefined };
	        else
	            return;
	    }
	    allDests(ctx) {
	        ctx = ctx || this.ctx();
	        const d = new Map();
	        if (ctx.variantEnd)
	            return d;
	        for (const square of this.board[this.turn]) {
	            d.set(square, this.dests(square, ctx));
	        }
	        return d;
	    }
	    castlingSide(move) {
	        if (types.isDrop(move))
	            return;
	        const delta = move.to - move.from;
	        if (Math.abs(delta) !== 2 && !this.board[this.turn].has(move.to))
	            return;
	        if (!this.board.king.has(move.from))
	            return;
	        return delta > 0 ? 'h' : 'a';
	    }
	    normalizeMove(move) {
	        const castlingSide = this.castlingSide(move);
	        if (!castlingSide)
	            return move;
	        const rookFrom = this.castles.rook[this.turn][castlingSide];
	        return {
	            from: move.from,
	            to: util.defined(rookFrom) ? rookFrom : move.to,
	        };
	    }
	    play(move) {
	        const turn = this.turn;
	        const epSquare = this.epSquare;
	        const castlingSide = this.castlingSide(move);
	        this.epSquare = undefined;
	        this.halfmoves += 1;
	        if (turn === 'black')
	            this.fullmoves += 1;
	        this.turn = util.opposite(turn);
	        if (types.isDrop(move)) {
	            this.board.set(move.to, { role: move.role, color: turn });
	            if (this.pockets)
	                this.pockets[turn][move.role]--;
	            if (move.role === 'pawn')
	                this.halfmoves = 0;
	        }
	        else {
	            const piece = this.board.take(move.from);
	            if (!piece)
	                return;
	            let epCapture;
	            if (piece.role === 'pawn') {
	                this.halfmoves = 0;
	                if (move.to === epSquare) {
	                    epCapture = this.board.take(move.to + (turn === 'white' ? -8 : 8));
	                }
	                const delta = move.from - move.to;
	                if (Math.abs(delta) === 16 && 8 <= move.from && move.from <= 55) {
	                    this.epSquare = (move.from + move.to) >> 1;
	                }
	                if (move.promotion) {
	                    piece.role = move.promotion;
	                    piece.promoted = true;
	                }
	            }
	            else if (piece.role === 'rook') {
	                this.castles.discardRook(move.from);
	            }
	            else if (piece.role === 'king') {
	                if (castlingSide) {
	                    const rookFrom = this.castles.rook[turn][castlingSide];
	                    if (util.defined(rookFrom)) {
	                        const rook = this.board.take(rookFrom);
	                        this.board.set(kingCastlesTo(turn, castlingSide), piece);
	                        if (rook)
	                            this.board.set(rookCastlesTo(turn, castlingSide), rook);
	                    }
	                }
	                this.castles.discardSide(turn);
	                if (castlingSide)
	                    return;
	            }
	            const capture = this.board.set(move.to, piece) || epCapture;
	            if (capture)
	                this.playCaptureAt(move.to, capture);
	        }
	    }
	    legalEpSquare(ctx) {
	        if (!util.defined(this.epSquare))
	            return;
	        ctx = ctx || this.ctx();
	        const ourPawns = this.board.pieces(this.turn, 'pawn');
	        const candidates = ourPawns.intersect(attacks_1.pawnAttacks(util.opposite(this.turn), this.epSquare));
	        for (const candidate of candidates) {
	            if (this.dests(candidate, ctx).has(this.epSquare))
	                return this.epSquare;
	        }
	        return;
	    }
	}
	exports.Position = Position;
	class Chess extends Position {
	    constructor(rules) {
	        super(rules || 'chess');
	    }
	    static default() {
	        const pos = new this();
	        pos.board = board.Board.default();
	        pos.pockets = undefined;
	        pos.turn = 'white';
	        pos.castles = Castles.default();
	        pos.epSquare = undefined;
	        pos.remainingChecks = undefined;
	        pos.halfmoves = 0;
	        pos.fullmoves = 1;
	        return pos;
	    }
	    static fromSetup(setup) {
	        const pos = new this();
	        pos.board = setup.board.clone();
	        pos.pockets = undefined;
	        pos.turn = setup.turn;
	        pos.castles = Castles.fromSetup(setup);
	        pos.epSquare = pos.validEpSquare(setup.epSquare);
	        pos.remainingChecks = undefined;
	        pos.halfmoves = setup.halfmoves;
	        pos.fullmoves = setup.fullmoves;
	        return pos.validate().map(_ => pos);
	    }
	    clone() {
	        return super.clone();
	    }
	    validate() {
	        if (this.board.occupied.isEmpty())
	            return result_1.Result.err(new PositionError(IllegalSetup.Empty));
	        if (this.board.king.size() !== 2)
	            return result_1.Result.err(new PositionError(IllegalSetup.Kings));
	        if (!util.defined(this.board.kingOf(this.turn)))
	            return result_1.Result.err(new PositionError(IllegalSetup.Kings));
	        const otherKing = this.board.kingOf(util.opposite(this.turn));
	        if (!util.defined(otherKing))
	            return result_1.Result.err(new PositionError(IllegalSetup.Kings));
	        if (this.kingAttackers(otherKing, this.turn, this.board.occupied).nonEmpty())
	            return result_1.Result.err(new PositionError(IllegalSetup.OppositeCheck));
	        if (squareSet.SquareSet.backranks().intersects(this.board.pawn))
	            return result_1.Result.err(new PositionError(IllegalSetup.PawnsOnBackrank));
	        return this.validateCheckers();
	    }
	    validateCheckers() {
	        const ourKing = this.board.kingOf(this.turn);
	        if (util.defined(ourKing)) {
	            // Multiple sliding checkers aligned with king.
	            const checkers = this.kingAttackers(ourKing, util.opposite(this.turn), this.board.occupied);
	            if (checkers.size() > 2 || (checkers.size() === 2 && attacks_1.ray(checkers.first(), checkers.last()).has(ourKing)))
	                return result_1.Result.err(new PositionError(IllegalSetup.ImpossibleCheck));
	            // En passant square aligned with checker and king.
	            if (util.defined(this.epSquare)) {
	                for (const checker of checkers) {
	                    if (attacks_1.ray(checker, this.epSquare).has(ourKing))
	                        return result_1.Result.err(new PositionError(IllegalSetup.ImpossibleCheck));
	                }
	            }
	        }
	        return result_1.Result.ok(undefined);
	    }
	    validEpSquare(square) {
	        if (!util.defined(square))
	            return;
	        const epRank = this.turn === 'white' ? 5 : 2;
	        const forward = this.turn === 'white' ? 8 : -8;
	        if (util.squareRank(square) !== epRank)
	            return;
	        if (this.board.occupied.has(square + forward))
	            return;
	        const pawn = square - forward;
	        if (!this.board.pawn.has(pawn) || !this.board[util.opposite(this.turn)].has(pawn))
	            return;
	        return square;
	    }
	    castlingDest(side, ctx) {
	        if (!util.defined(ctx.king) || ctx.checkers.nonEmpty())
	            return squareSet.SquareSet.empty();
	        const rook = this.castles.rook[this.turn][side];
	        if (!util.defined(rook))
	            return squareSet.SquareSet.empty();
	        if (this.castles.path[this.turn][side].intersects(this.board.occupied))
	            return squareSet.SquareSet.empty();
	        const kingTo = kingCastlesTo(this.turn, side);
	        const kingPath = attacks_1.between(ctx.king, kingTo);
	        const occ = this.board.occupied.without(ctx.king);
	        for (const sq of kingPath) {
	            if (this.kingAttackers(sq, util.opposite(this.turn), occ).nonEmpty())
	                return squareSet.SquareSet.empty();
	        }
	        const rookTo = rookCastlesTo(this.turn, side);
	        const after = this.board.occupied.toggle(ctx.king).toggle(rook).toggle(rookTo);
	        if (this.kingAttackers(kingTo, util.opposite(this.turn), after).nonEmpty())
	            return squareSet.SquareSet.empty();
	        return squareSet.SquareSet.fromSquare(rook);
	    }
	    canCaptureEp(pawn, ctx) {
	        if (!util.defined(this.epSquare))
	            return false;
	        if (!attacks_1.pawnAttacks(this.turn, pawn).has(this.epSquare))
	            return false;
	        if (!util.defined(ctx.king))
	            return true;
	        const captured = this.epSquare + ((this.turn === 'white') ? -8 : 8);
	        const occupied = this.board.occupied.toggle(pawn).toggle(this.epSquare).toggle(captured);
	        return !this.kingAttackers(ctx.king, util.opposite(this.turn), occupied).intersects(occupied);
	    }
	    pseudoDests(square, ctx) {
	        if (ctx.variantEnd)
	            return squareSet.SquareSet.empty();
	        const piece = this.board.get(square);
	        if (!piece || piece.color !== this.turn)
	            return squareSet.SquareSet.empty();
	        let pseudo = attacks_1.attacks(piece, square, this.board.occupied);
	        if (piece.role === 'pawn') {
	            let captureTargets = this.board[util.opposite(this.turn)];
	            if (util.defined(this.epSquare))
	                captureTargets = captureTargets.with(this.epSquare);
	            pseudo = pseudo.intersect(captureTargets);
	            const delta = this.turn === 'white' ? 8 : -8;
	            const step = square + delta;
	            if (0 <= step && step < 64 && !this.board.occupied.has(step)) {
	                pseudo = pseudo.with(step);
	                const canDoubleStep = this.turn === 'white' ? (square < 16) : (square >= 64 - 16);
	                const doubleStep = step + delta;
	                if (canDoubleStep && !this.board.occupied.has(doubleStep)) {
	                    pseudo = pseudo.with(doubleStep);
	                }
	            }
	            return pseudo;
	        }
	        else {
	            pseudo = pseudo.diff(this.board[this.turn]);
	        }
	        if (square === ctx.king)
	            return pseudo.union(this.castlingDest('a', ctx)).union(this.castlingDest('h', ctx));
	        else
	            return pseudo;
	    }
	    dests(square, ctx) {
	        ctx = ctx || this.ctx();
	        if (ctx.variantEnd)
	            return squareSet.SquareSet.empty();
	        const piece = this.board.get(square);
	        if (!piece || piece.color !== this.turn)
	            return squareSet.SquareSet.empty();
	        let pseudo, legal;
	        if (piece.role === 'pawn') {
	            pseudo = attacks_1.pawnAttacks(this.turn, square).intersect(this.board[util.opposite(this.turn)]);
	            const delta = this.turn === 'white' ? 8 : -8;
	            const step = square + delta;
	            if (0 <= step && step < 64 && !this.board.occupied.has(step)) {
	                pseudo = pseudo.with(step);
	                const canDoubleStep = this.turn === 'white' ? (square < 16) : (square >= 64 - 16);
	                const doubleStep = step + delta;
	                if (canDoubleStep && !this.board.occupied.has(doubleStep)) {
	                    pseudo = pseudo.with(doubleStep);
	                }
	            }
	            if (util.defined(this.epSquare) && this.canCaptureEp(square, ctx)) {
	                const pawn = this.epSquare - delta;
	                if (ctx.checkers.isEmpty() || ctx.checkers.singleSquare() === pawn) {
	                    legal = squareSet.SquareSet.fromSquare(this.epSquare);
	                }
	            }
	        }
	        else if (piece.role === 'bishop')
	            pseudo = attacks_1.bishopAttacks(square, this.board.occupied);
	        else if (piece.role === 'knight')
	            pseudo = attacks_1.knightAttacks(square);
	        else if (piece.role === 'rook')
	            pseudo = attacks_1.rookAttacks(square, this.board.occupied);
	        else if (piece.role === 'queen')
	            pseudo = attacks_1.queenAttacks(square, this.board.occupied);
	        else
	            pseudo = attacks_1.kingAttacks(square);
	        pseudo = pseudo.diff(this.board[this.turn]);
	        if (util.defined(ctx.king)) {
	            if (piece.role === 'king') {
	                const occ = this.board.occupied.without(square);
	                for (const to of pseudo) {
	                    if (this.kingAttackers(to, util.opposite(this.turn), occ).nonEmpty())
	                        pseudo = pseudo.without(to);
	                }
	                return pseudo.union(this.castlingDest('a', ctx)).union(this.castlingDest('h', ctx));
	            }
	            if (ctx.checkers.nonEmpty()) {
	                const checker = ctx.checkers.singleSquare();
	                if (!util.defined(checker))
	                    return squareSet.SquareSet.empty();
	                pseudo = pseudo.intersect(attacks_1.between(checker, ctx.king).with(checker));
	            }
	            if (ctx.blockers.has(square))
	                pseudo = pseudo.intersect(attacks_1.ray(square, ctx.king));
	        }
	        if (legal)
	            pseudo = pseudo.union(legal);
	        return pseudo;
	    }
	    isVariantEnd() {
	        return false;
	    }
	    variantOutcome(_ctx) {
	        return;
	    }
	    hasInsufficientMaterial(color) {
	        if (this.board[color].intersect(this.board.pawn.union(this.board.rooksAndQueens())).nonEmpty())
	            return false;
	        if (this.board[color].intersects(this.board.knight)) {
	            return this.board[color].size() <= 2 &&
	                this.board[util.opposite(color)].diff(this.board.king).diff(this.board.queen).isEmpty();
	        }
	        if (this.board[color].intersects(this.board.bishop)) {
	            const sameColor = !this.board.bishop.intersects(squareSet.SquareSet.darkSquares()) ||
	                !this.board.bishop.intersects(squareSet.SquareSet.lightSquares());
	            return sameColor && this.board.pawn.isEmpty() && this.board.knight.isEmpty();
	        }
	        return true;
	    }
	}
	exports.Chess = Chess;
	//# sourceMappingURL=chess.js.map
	});

	var setup = createCommonjsModule(function (module, exports) {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.defaultSetup = exports.RemainingChecks = exports.Material = exports.MaterialSide = void 0;



	class MaterialSide {
	    constructor() { }
	    static empty() {
	        const m = new MaterialSide();
	        for (const role of types.ROLES)
	            m[role] = 0;
	        return m;
	    }
	    static fromBoard(board, color) {
	        const m = new MaterialSide();
	        for (const role of types.ROLES)
	            m[role] = board.pieces(color, role).size();
	        return m;
	    }
	    clone() {
	        const m = new MaterialSide();
	        for (const role of types.ROLES)
	            m[role] = this[role];
	        return m;
	    }
	    equals(other) {
	        return types.ROLES.every(role => this[role] === other[role]);
	    }
	    add(other) {
	        const m = new MaterialSide();
	        for (const role of types.ROLES)
	            m[role] = this[role] + other[role];
	        return m;
	    }
	    nonEmpty() {
	        return types.ROLES.some(role => this[role] > 0);
	    }
	    isEmpty() {
	        return !this.nonEmpty();
	    }
	    hasPawns() {
	        return this.pawn > 0;
	    }
	    hasNonPawns() {
	        return this.knight > 0 || this.bishop > 0 || this.rook > 0 || this.queen > 0 || this.king > 0;
	    }
	    count() {
	        return this.pawn + this.knight + this.bishop + this.rook + this.queen + this.king;
	    }
	}
	exports.MaterialSide = MaterialSide;
	class Material {
	    constructor(white, black) {
	        this.white = white;
	        this.black = black;
	    }
	    static empty() {
	        return new Material(MaterialSide.empty(), MaterialSide.empty());
	    }
	    static fromBoard(board) {
	        return new Material(MaterialSide.fromBoard(board, 'white'), MaterialSide.fromBoard(board, 'black'));
	    }
	    clone() {
	        return new Material(this.white.clone(), this.black.clone());
	    }
	    equals(other) {
	        return this.white.equals(other.white) && this.black.equals(other.black);
	    }
	    add(other) {
	        return new Material(this.white.add(other.white), this.black.add(other.black));
	    }
	    count() {
	        return this.white.count() + this.black.count();
	    }
	    isEmpty() {
	        return this.white.isEmpty() && this.black.isEmpty();
	    }
	    nonEmpty() {
	        return !this.isEmpty();
	    }
	    hasPawns() {
	        return this.white.hasPawns() || this.black.hasPawns();
	    }
	    hasNonPawns() {
	        return this.white.hasNonPawns() || this.black.hasNonPawns();
	    }
	}
	exports.Material = Material;
	class RemainingChecks {
	    constructor(white, black) {
	        this.white = white;
	        this.black = black;
	    }
	    static default() {
	        return new RemainingChecks(3, 3);
	    }
	    clone() {
	        return new RemainingChecks(this.white, this.black);
	    }
	    equals(other) {
	        return this.white === other.white && this.black === other.black;
	    }
	}
	exports.RemainingChecks = RemainingChecks;
	function defaultSetup() {
	    return {
	        board: board.Board.default(),
	        pockets: undefined,
	        turn: 'white',
	        unmovedRooks: squareSet.SquareSet.corners(),
	        epSquare: undefined,
	        remainingChecks: undefined,
	        halfmoves: 0,
	        fullmoves: 1,
	    };
	}
	exports.defaultSetup = defaultSetup;
	//# sourceMappingURL=setup.js.map
	});

	var fen = createCommonjsModule(function (module, exports) {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.makeFen = exports.makeRemainingChecks = exports.makeCastlingFen = exports.makePockets = exports.makePocket = exports.makeBoardFen = exports.makePiece = exports.parsePiece = exports.parseFen = exports.parseRemainingChecks = exports.parseCastlingFen = exports.parsePockets = exports.parseBoardFen = exports.FenError = exports.InvalidFen = exports.EMPTY_FEN = exports.EMPTY_EPD = exports.EMPTY_BOARD_FEN = exports.INITIAL_FEN = exports.INITIAL_EPD = exports.INITIAL_BOARD_FEN = void 0;






	exports.INITIAL_BOARD_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';
	exports.INITIAL_EPD = exports.INITIAL_BOARD_FEN + ' w KQkq -';
	exports.INITIAL_FEN = exports.INITIAL_EPD + ' 0 1';
	exports.EMPTY_BOARD_FEN = '8/8/8/8/8/8/8/8';
	exports.EMPTY_EPD = exports.EMPTY_BOARD_FEN + ' w - -';
	exports.EMPTY_FEN = exports.EMPTY_EPD + ' 0 1';
	var InvalidFen;
	(function (InvalidFen) {
	    InvalidFen["Fen"] = "ERR_FEN";
	    InvalidFen["Board"] = "ERR_BOARD";
	    InvalidFen["Pockets"] = "ERR_POCKETS";
	    InvalidFen["Turn"] = "ERR_TURN";
	    InvalidFen["Castling"] = "ERR_CASTLING";
	    InvalidFen["EpSquare"] = "ERR_EP_SQUARE";
	    InvalidFen["RemainingChecks"] = "ERR_REMAINING_CHECKS";
	    InvalidFen["Halfmoves"] = "ERR_HALFMOVES";
	    InvalidFen["Fullmoves"] = "ERR_FULLMOVES";
	})(InvalidFen = exports.InvalidFen || (exports.InvalidFen = {}));
	class FenError extends Error {
	}
	exports.FenError = FenError;
	function nthIndexOf(haystack, needle, n) {
	    let index = haystack.indexOf(needle);
	    while (n-- > 0) {
	        if (index === -1)
	            break;
	        index = haystack.indexOf(needle, index + needle.length);
	    }
	    return index;
	}
	function parseSmallUint(str) {
	    return /^\d{1,4}$/.test(str) ? parseInt(str, 10) : undefined;
	}
	function charToPiece(ch) {
	    const role = util.charToRole(ch);
	    return role && { role, color: ch.toLowerCase() === ch ? 'black' : 'white' };
	}
	function parseBoardFen(boardPart) {
	    const board$1 = board.Board.empty();
	    let rank = 7;
	    let file = 0;
	    for (let i = 0; i < boardPart.length; i++) {
	        const c = boardPart[i];
	        if (c === '/' && file === 8) {
	            file = 0;
	            rank--;
	        }
	        else {
	            const step = parseInt(c, 10);
	            if (step > 0)
	                file += step;
	            else {
	                if (file >= 8 || rank < 0)
	                    return result_1.Result.err(new FenError(InvalidFen.Board));
	                const square = file + rank * 8;
	                const piece = charToPiece(c);
	                if (!piece)
	                    return result_1.Result.err(new FenError(InvalidFen.Board));
	                if (boardPart[i + 1] === '~') {
	                    piece.promoted = true;
	                    i++;
	                }
	                board$1.set(square, piece);
	                file++;
	            }
	        }
	    }
	    if (rank !== 0 || file !== 8)
	        return result_1.Result.err(new FenError(InvalidFen.Board));
	    return result_1.Result.ok(board$1);
	}
	exports.parseBoardFen = parseBoardFen;
	function parsePockets(pocketPart) {
	    if (pocketPart.length > 64)
	        return result_1.Result.err(new FenError(InvalidFen.Pockets));
	    const pockets = setup.Material.empty();
	    for (const c of pocketPart) {
	        const piece = charToPiece(c);
	        if (!piece)
	            return result_1.Result.err(new FenError(InvalidFen.Pockets));
	        pockets[piece.color][piece.role]++;
	    }
	    return result_1.Result.ok(pockets);
	}
	exports.parsePockets = parsePockets;
	function parseCastlingFen(board, castlingPart) {
	    let unmovedRooks = squareSet.SquareSet.empty();
	    if (castlingPart === '-')
	        return result_1.Result.ok(unmovedRooks);
	    if (!/^[KQABCDEFGH]{0,2}[kqabcdefgh]{0,2}$/.test(castlingPart)) {
	        return result_1.Result.err(new FenError(InvalidFen.Castling));
	    }
	    for (const c of castlingPart) {
	        const lower = c.toLowerCase();
	        const color = c === lower ? 'black' : 'white';
	        const backrank = squareSet.SquareSet.backrank(color).intersect(board[color]);
	        let candidates;
	        if (lower === 'q')
	            candidates = backrank;
	        else if (lower === 'k')
	            candidates = backrank.reversed();
	        else
	            candidates = squareSet.SquareSet.fromSquare(lower.charCodeAt(0) - 'a'.charCodeAt(0)).intersect(backrank);
	        for (const square of candidates) {
	            if (board.king.has(square) && !board.promoted.has(square))
	                break;
	            if (board.rook.has(square)) {
	                unmovedRooks = unmovedRooks.with(square);
	                break;
	            }
	        }
	    }
	    return result_1.Result.ok(unmovedRooks);
	}
	exports.parseCastlingFen = parseCastlingFen;
	function parseRemainingChecks(part) {
	    const parts = part.split('+');
	    if (parts.length === 3 && parts[0] === '') {
	        const white = parseSmallUint(parts[1]);
	        const black = parseSmallUint(parts[2]);
	        if (!util.defined(white) || white > 3 || !util.defined(black) || black > 3)
	            return result_1.Result.err(new FenError(InvalidFen.RemainingChecks));
	        return result_1.Result.ok(new setup.RemainingChecks(3 - white, 3 - black));
	    }
	    else if (parts.length === 2) {
	        const white = parseSmallUint(parts[0]);
	        const black = parseSmallUint(parts[1]);
	        if (!util.defined(white) || white > 3 || !util.defined(black) || black > 3)
	            return result_1.Result.err(new FenError(InvalidFen.RemainingChecks));
	        return result_1.Result.ok(new setup.RemainingChecks(white, black));
	    }
	    else
	        return result_1.Result.err(new FenError(InvalidFen.RemainingChecks));
	}
	exports.parseRemainingChecks = parseRemainingChecks;
	function parseFen(fen) {
	    const parts = fen.split(' ');
	    const boardPart = parts.shift();
	    // Board and pockets
	    let board, pockets = result_1.Result.ok(undefined);
	    if (boardPart.endsWith(']')) {
	        const pocketStart = boardPart.indexOf('[');
	        if (pocketStart === -1)
	            return result_1.Result.err(new FenError(InvalidFen.Fen));
	        board = parseBoardFen(boardPart.substr(0, pocketStart));
	        pockets = parsePockets(boardPart.substr(pocketStart + 1, boardPart.length - 1 - pocketStart - 1));
	    }
	    else {
	        const pocketStart = nthIndexOf(boardPart, '/', 7);
	        if (pocketStart === -1)
	            board = parseBoardFen(boardPart);
	        else {
	            board = parseBoardFen(boardPart.substr(0, pocketStart));
	            pockets = parsePockets(boardPart.substr(pocketStart + 1));
	        }
	    }
	    // Turn
	    let turn;
	    const turnPart = parts.shift();
	    if (!util.defined(turnPart) || turnPart === 'w')
	        turn = 'white';
	    else if (turnPart === 'b')
	        turn = 'black';
	    else
	        return result_1.Result.err(new FenError(InvalidFen.Turn));
	    return board.chain(board => {
	        // Castling
	        const castlingPart = parts.shift();
	        const unmovedRooks = util.defined(castlingPart) ? parseCastlingFen(board, castlingPart) : result_1.Result.ok(squareSet.SquareSet.empty());
	        // En passant square
	        const epPart = parts.shift();
	        let epSquare;
	        if (util.defined(epPart) && epPart !== '-') {
	            epSquare = util.parseSquare(epPart);
	            if (!util.defined(epSquare))
	                return result_1.Result.err(new FenError(InvalidFen.EpSquare));
	        }
	        // Halfmoves or remaining checks
	        let halfmovePart = parts.shift();
	        let earlyRemainingChecks;
	        if (util.defined(halfmovePart) && halfmovePart.includes('+')) {
	            earlyRemainingChecks = parseRemainingChecks(halfmovePart);
	            halfmovePart = parts.shift();
	        }
	        const halfmoves = util.defined(halfmovePart) ? parseSmallUint(halfmovePart) : 0;
	        if (!util.defined(halfmoves))
	            return result_1.Result.err(new FenError(InvalidFen.Halfmoves));
	        const fullmovesPart = parts.shift();
	        const fullmoves = util.defined(fullmovesPart) ? parseSmallUint(fullmovesPart) : 1;
	        if (!util.defined(fullmoves))
	            return result_1.Result.err(new FenError(InvalidFen.Fullmoves));
	        const remainingChecksPart = parts.shift();
	        let remainingChecks = result_1.Result.ok(undefined);
	        if (util.defined(remainingChecksPart)) {
	            if (util.defined(earlyRemainingChecks))
	                return result_1.Result.err(new FenError(InvalidFen.RemainingChecks));
	            remainingChecks = parseRemainingChecks(remainingChecksPart);
	        }
	        else if (util.defined(earlyRemainingChecks)) {
	            remainingChecks = earlyRemainingChecks;
	        }
	        if (parts.length > 0)
	            return result_1.Result.err(new FenError(InvalidFen.Fen));
	        return pockets.chain(pockets => unmovedRooks.chain(unmovedRooks => remainingChecks.map(remainingChecks => {
	            return {
	                board,
	                pockets,
	                turn,
	                unmovedRooks,
	                remainingChecks,
	                epSquare,
	                halfmoves,
	                fullmoves: Math.max(1, fullmoves)
	            };
	        })));
	    });
	}
	exports.parseFen = parseFen;
	function parsePiece(str) {
	    if (!str)
	        return;
	    const piece = charToPiece(str[0]);
	    if (!piece)
	        return;
	    if (str.length === 2 && str[1] === '~')
	        piece.promoted = true;
	    else if (str.length > 1)
	        return;
	    return piece;
	}
	exports.parsePiece = parsePiece;
	function makePiece(piece, opts) {
	    let r = util.roleToChar(piece.role);
	    if (piece.color === 'white')
	        r = r.toUpperCase();
	    if ((opts === null || opts === void 0 ? void 0 : opts.promoted) && piece.promoted)
	        r += '~';
	    return r;
	}
	exports.makePiece = makePiece;
	function makeBoardFen(board, opts) {
	    let fen = '';
	    let empty = 0;
	    for (let rank = 7; rank >= 0; rank--) {
	        for (let file = 0; file < 8; file++) {
	            const square = file + rank * 8;
	            const piece = board.get(square);
	            if (!piece)
	                empty++;
	            else {
	                if (empty > 0) {
	                    fen += empty;
	                    empty = 0;
	                }
	                fen += makePiece(piece, opts);
	            }
	            if (file === 7) {
	                if (empty > 0) {
	                    fen += empty;
	                    empty = 0;
	                }
	                if (rank !== 0)
	                    fen += '/';
	            }
	        }
	    }
	    return fen;
	}
	exports.makeBoardFen = makeBoardFen;
	function makePocket(material) {
	    return types.ROLES.map(role => util.roleToChar(role).repeat(material[role])).join('');
	}
	exports.makePocket = makePocket;
	function makePockets(pocket) {
	    return makePocket(pocket.white).toUpperCase() + makePocket(pocket.black);
	}
	exports.makePockets = makePockets;
	function makeCastlingFen(board, unmovedRooks, opts) {
	    const shredder = opts === null || opts === void 0 ? void 0 : opts.shredder;
	    let fen = '';
	    for (const color of types.COLORS) {
	        const backrank = squareSet.SquareSet.backrank(color);
	        const king = board.kingOf(color);
	        if (!util.defined(king) || !backrank.has(king))
	            continue;
	        const candidates = board.pieces(color, 'rook').intersect(backrank);
	        for (const rook of unmovedRooks.intersect(candidates).reversed()) {
	            if (!shredder && rook === candidates.first() && rook < king) {
	                fen += color === 'white' ? 'Q' : 'q';
	            }
	            else if (!shredder && rook === candidates.last() && king < rook) {
	                fen += color === 'white' ? 'K' : 'k';
	            }
	            else {
	                const file = types.FILE_NAMES[util.squareFile(rook)];
	                fen += color === 'white' ? file.toUpperCase() : file;
	            }
	        }
	    }
	    return fen || '-';
	}
	exports.makeCastlingFen = makeCastlingFen;
	function makeRemainingChecks(checks) {
	    return `${checks.white}+${checks.black}`;
	}
	exports.makeRemainingChecks = makeRemainingChecks;
	function makeFen(setup, opts) {
	    return [
	        makeBoardFen(setup.board, opts) + (setup.pockets ? `[${makePockets(setup.pockets)}]` : ''),
	        setup.turn[0],
	        makeCastlingFen(setup.board, setup.unmovedRooks, opts),
	        util.defined(setup.epSquare) ? util.makeSquare(setup.epSquare) : '-',
	        ...(setup.remainingChecks ? [makeRemainingChecks(setup.remainingChecks)] : []),
	        ...((opts === null || opts === void 0 ? void 0 : opts.epd) ? [] : [
	            Math.max(0, Math.min(setup.halfmoves, 9999)),
	            Math.max(1, Math.min(setup.fullmoves, 9999)),
	        ])
	    ].join(' ');
	}
	exports.makeFen = makeFen;
	//# sourceMappingURL=fen.js.map
	});

	var compat = createCommonjsModule(function (module, exports) {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.lichessVariantRules = exports.scalachessCharPair = exports.chessgroundMove = exports.chessgroundDests = void 0;


	function chessgroundDests(pos, opts) {
	    const result = new Map();
	    const ctx = pos.ctx();
	    for (const [from, squares] of pos.allDests(ctx)) {
	        if (squares.nonEmpty()) {
	            const d = Array.from(squares, util.makeSquare);
	            if (!(opts === null || opts === void 0 ? void 0 : opts.chess960) && from === ctx.king && util.squareFile(from) === 4) {
	                // Chessground needs both types of castling dests and filters based on
	                // a rookCastles setting.
	                if (squares.has(0))
	                    d.push('c1');
	                else if (squares.has(56))
	                    d.push('c8');
	                if (squares.has(7))
	                    d.push('g1');
	                else if (squares.has(63))
	                    d.push('g8');
	            }
	            result.set(util.makeSquare(from), d);
	        }
	    }
	    return result;
	}
	exports.chessgroundDests = chessgroundDests;
	function chessgroundMove(move) {
	    return types.isDrop(move) ? [util.makeSquare(move.to)] : [util.makeSquare(move.from), util.makeSquare(move.to)];
	}
	exports.chessgroundMove = chessgroundMove;
	function scalachessCharPair(move) {
	    if (types.isDrop(move))
	        return String.fromCharCode(35 + move.to, 35 + 64 + 8 * 5 + ['queen', 'rook', 'bishop', 'knight', 'pawn'].indexOf(move.role));
	    else
	        return String.fromCharCode(35 + move.from, move.promotion ?
	            (35 + 64 + 8 * ['queen', 'rook', 'bishop', 'knight', 'king'].indexOf(move.promotion) + util.squareFile(move.to)) :
	            (35 + move.to));
	}
	exports.scalachessCharPair = scalachessCharPair;
	function lichessVariantRules(variant) {
	    switch (variant) {
	        case 'standard':
	        case 'chess960':
	        case 'fromPosition':
	            return 'chess';
	        case 'threeCheck':
	            return '3check';
	        case 'kingOfTheHill':
	            return 'kingofthehill';
	        case 'racingKings':
	            return 'racingkings';
	        default:
	            return variant;
	    }
	}
	exports.lichessVariantRules = lichessVariantRules;
	//# sourceMappingURL=compat.js.map
	});

	const isChecked = (e) => e.currentTarget.checked;
	const App = () => {
	    let cg;
	    let orientation = "white";
	    let freeMode = true;
	    let freeFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";
	    let position = chess.Chess.default();
	    const onUci = (uci) => {
	        if (!uci) {
	            // Promotion dialog is cancelled
	            cg.set(makeConfig());
	            return;
	        }
	        if (freeMode) {
	            freeFen = cg.cg.getFen();
	            return;
	        }
	        position.play(util.parseUci(uci));
	        cg.set(makeConfig());
	    };
	    const makeConfig = () => {
	        return {
	            orientation,
	            fen: freeMode ? freeFen : fen.makeBoardFen(position.board),
	            turnColor: freeMode ? undefined : position.turn,
	            lastMove: undefined,
	            movable: freeMode
	                ? {
	                    free: true,
	                    color: "both",
	                    dests: undefined,
	                }
	                : {
	                    free: false,
	                    color: position.turn,
	                    dests: compat.chessgroundDests(position),
	                },
	        };
	    };
	    const oncreate = (vnode) => {
	        cg = new uci.ChessgroundUci(vnode.dom.querySelector(".board"), onUci, makeConfig());
	    };
	    const onbeforeremove = () => {
	        cg.cg.destroy();
	    };
	    const view = () => {
	        return hyperscript_1$2("#root", [
	            hyperscript_1$2(".board"),
	            hyperscript_1$2(".controls", [
	                hyperscript_1$2("div", [
	                    hyperscript_1$2("label", [
	                        hyperscript_1$2("input", {
	                            type: "checkbox",
	                            checked: orientation == "black",
	                            onchange: (e) => {
	                                orientation = isChecked(e) ? "black" : "white";
	                                cg.set({ orientation });
	                                cg.cgPromotion.redraw();
	                            },
	                        }),
	                        "Flip board",
	                    ]),
	                ]),
	                hyperscript_1$2("div", [
	                    hyperscript_1$2("label", [
	                        hyperscript_1$2("input", {
	                            type: "checkbox",
	                            checked: freeMode,
	                            onchange: (e) => {
	                                freeMode = isChecked(e);
	                                cg.set(makeConfig());
	                            },
	                        }),
	                        "Free mode",
	                    ]),
	                ]),
	            ]),
	        ]);
	    };
	    return { oncreate, onbeforeremove, view };
	};
	const start = () => {
	    mithril$1.mount(document.body, App);
	};
	start();

}());
//# sourceMappingURL=index.js.map
