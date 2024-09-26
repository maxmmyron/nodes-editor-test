import { test, expect, it, describe, vi, beforeEach } from "vitest";
import * as lib from "$lib";
import { get } from "svelte/store";

const createEmptyNode = () => lib.createNode({}, {}, ({}) => ({}));

describe("graph", () => {
  it("may be instantiated with with zero arguments", () => {
    const graph = lib.createGraph();

    expect(graph.edges.length).toBe(0);
    expect(graph.nodes.length).toBe(0);
  });

  it("may be instantiated with with default node args", () => {
    const graph = lib.createGraph([createEmptyNode(), createEmptyNode()]);
    expect(graph.nodes.length).toBe(2);
  });

  it("may be instantiated with with default node and edge args", () => {
    const nodeOut = lib.createNode({}, {output: 0}, () => ({output: 1}));
    const nodeIn = lib.createNode({input: 0}, {}, (args: {input: number}) => ({}));

    // const nodeIn = lib.createNode((args: {input: number}) => ({}), {input: 0}, {});
    const graph = lib.createGraph([nodeOut, nodeIn], [lib.createEdge(nodeOut, "output", nodeIn, "input")]);
    expect(graph.nodes.length).toBe(2);
  });

  it("fails on instantiation when edge arg contains nodes that do not exist in the graph", () => {
    const nodeOut = lib.createNode({}, {output: 0}, ({}) => ({output: 1}));
    const nodeIn = lib.createNode({input: 0}, {}, (arg: {input: number}) => ({}));

    // errors with no common args
    expect(() => lib.createGraph([], [lib.createEdge(nodeOut, "output", nodeIn, "input")])).toThrowError();
  });

  it("may have nodes and edges removed", () => {
    const nodeOut = lib.createNode({}, {output: 0}, () => ({output: 1}));
    const nodeIn = lib.createNode({input: 0}, {}, (args: {input: number}) => ({}));

    // const nodeIn = lib.createNode((args: {input: number}) => ({}), {input: 0}, {});
    const graph = lib.createGraph([nodeOut, nodeIn], [lib.createEdge(nodeOut, "output", nodeIn, "input")]);

    lib.disconnect(graph, nodeOut, "output", nodeIn, "input");
    expect(graph.edges.length).toBe(0);

    lib.removeNode(graph, nodeOut);
    expect(graph.nodes.length).toBe(1);
  });

  it("automatically removes node-connected edges when that node is removed", () => {
    const nodeOut = lib.createNode({}, {output: 0}, () => ({output: 1}));
    const nodeIn = lib.createNode({input: 0}, {}, (args: {input: number}) => ({}));

    // const nodeIn = lib.createNode((args: {input: number}) => ({}), {input: 0}, {});
    const graph = lib.createGraph([nodeOut, nodeIn], [lib.createEdge(nodeOut, "output", nodeIn, "input")]);

    lib.removeNode(graph, nodeOut);

    expect(graph.nodes.length).toBe(1);
    expect(graph.edges.length).toBe(0);
  });
});

describe("node", () => {
  it("may be instantiated with empty-ish args", () => {
    const node = lib.createNode({}, {}, () => ({}), [0, 0]);

    const stringifiedInputs = JSON.stringify(get(node.inputs));
    expect(stringifiedInputs).toBe("{}");

    const stringifiedOutputs = JSON.stringify(get(node.outputs));
    expect(stringifiedOutputs).toBe("{}");

    const spy = vi.spyOn(node, "transform");

    node.transform({});

    expect(spy).toHaveBeenCalled();
    expect(spy).toHaveReturnedWith({});
  });

  it("fails to instantiate when args are non-object types", () => {
    // @ts-ignore
    expect(() => lib.createNode(5, 6, (arg: number) => {return 5;})).toThrowError();
  });

  it("can run an empty transform successfully", () => {
    const node = lib.createNode({}, {}, () => ({}));
    const spy = vi.spyOn(node, "transform");

    node.transform({});

    expect(spy).toHaveBeenCalled();
  });

  it("can be instantiated with default input and outputs args", () => {
    const node = lib.createNode({a: 2, b: 4}, {x: 6}, ({a, b}: {a: number, b: number}) => ({x: a + b}));

    expect(get(node.inputs).a).toBe(2);
    expect(get(node.inputs).b).toBe(4);
    expect(get(node.outputs).x).toBe(6);
  });

  it("can run a transform directly with args", () => {
    const node = lib.createNode({a: 0, b: 0}, {x: 0}, (arg0: {a: number, b: number}) => ({x: arg0.a + arg0.b}));
    const spy = vi.spyOn(node, "transform");

    node.transform({a: 1, b: 2});

    expect(spy).toHaveBeenCalled();
    expect(spy).toHaveReturnedWith({x: 3});
  });

  it("runs transforms when input store is updated", () => {
    const node = lib.createNode({a: 0}, {res: 0}, (arg0: {a: number}) => ({res: arg0.a}));

    node.inputs.set({a: 5});

    expect(get(node.outputs).res).toBe(5);
  });

  it("updates outputs store when transform function is directly called", () => {
    const node = lib.createNode({a: 0}, {res: 0}, (arg0: {a: number}) => ({res: arg0.a}));

    node.transform({a: 5});

    expect(get(node.outputs).res).toBe(5);
  });

  it("executes registered inputchange event callbacks", () => {
    const node = lib.createNode({input: 0}, {output: 0}, (arg0) => ({output: arg0.input}));

    const mock = vi.fn();
    node.subscribe("inputchange", mock);

    node.inputs.set({input: 1});

    expect(mock).toHaveBeenCalledOnce();
  });

  it("executes transform subscription event callbacks", () => {
    const node = lib.createNode({input: 0}, {output: 0}, (arg0) => ({output: arg0.input}));
    const mock = vi.fn();
    node.subscribe("transform", mock);

    node.transform({input: 1});

    expect(mock).toHaveBeenCalled();
    // make sure mock was *only* called once,
    expect(mock).toHaveBeenCalledOnce();
  });

  it("executes outputchange subscription event callbacks", () => {
    const node = lib.createNode({input: 0}, {output: 0}, (arg0) => ({output: arg0.input}));
    const mock = vi.fn();
    node.subscribe("outputchange", mock);

    node.outputs.set({output: 1});

    expect(mock).toHaveBeenCalledOnce();
  });

  it("provides an unsubscribe function that removes the subscription callback", () => {
    const node = lib.createNode({input: 0}, {output: 0}, (arg0) => ({output: arg0.input}));

    const mock = vi.fn();
    const unsubscribe = node.subscribe("transform", mock);

    node.transform({input: 1});
    unsubscribe();
    node.transform({input: 1});

    expect(mock).toHaveBeenCalledOnce();
  });

  it("can be deleted (and unsubscribes from relevant subscriptions)", () => {
    const node = lib.createNode({input: 0}, {output: 0}, (arg0) => ({output: arg0.input}));

    node.free();

    node.inputs.set({input: 1});
    expect(get(node.outputs).output).toBe(0);
  });
});

describe("edge", () => {
  it("may be instantiated", () => {
    const outNode = lib.createNode({}, {outV: 0}, () => ({outV: 0}));
    const inNode = lib.createNode({inV: 0}, {}, (arg0: {inV: number}) => ({}));

    const edge = lib.createEdge(outNode, "outV", inNode, "inV");

    expect(edge.inVertex);
  });

  it("throws an error on instantiation if vertex types don't match", () => {
    const outNode = lib.createNode({}, {outV: 0}, () => ({outV: 0}));
    const inNode = lib.createNode({inV: ""}, {}, (arg0: {inV: string}) => ({}));

    expect(() => lib.createEdge(outNode, "outV", inNode, "inV")).toThrowError();
  });
});

describe("graph propagation", () => {
  it("propagates events between connected nodes", () => {
    const outNode = lib.createNode({}, {outV: 0}, () => ({outV: 0}));
    const inNode = lib.createNode({inV: 0}, {res: 1}, (arg0: {inV: number}) => ({res: arg0.inV + 1}));

    lib.createEdge(outNode, "outV", inNode, "inV");

    outNode.outputs.set({outV: 1});
    expect(get(inNode.outputs).res).toBe(2);
  });

  it("propagates events between multiple connected nodes", () => {
    const node1 = lib.createNode({}, {out1: 0}, () => ({out1: 0}));
    const node2 = lib.createNode({in2: 0}, {out2: 1}, (arg0: {in2: number}) => ({out2: arg0.in2 + 1}));
    const node3 = lib.createNode({in3: 0}, {out3: 1}, (arg0: {in3: number}) => ({out3: arg0.in3 + 1}));

    lib.createEdge(node1, "out1", node2, "in2");
    lib.createEdge(node2, "out2", node3, "in3");

    node1.outputs.set({out1: 1});
    expect(get(node3.outputs).out3).toBe(3);
  });

  it("performed fine-grained updates across graph based on how output changes after transform", () => {
    const node1 = lib.createNode({}, {out1: 0, out2: 0}, () => ({out1: 0, out2: 0}));
    const node2 = lib.createNode({in1: 0}, {out: -1}, (arg0: {in1: number}) => ({out: arg0.in1 + 1}));
    const node3 = lib.createNode({in2: 0}, {out: -1}, (arg0: {in2: number}) => ({out: arg0.in2 + 1}));

    lib.createEdge(node1, "out1", node2, "in1");
    lib.createEdge(node1, "out2", node3, "in2");

    // if we update out2, we would expect node2 to run its transform function.
    // we should *not* expect node3's transform to run.

    node1.outputs.update((o) => ({
      ...o,
      out1: 5,
    }));

    expect(get(node2.outputs).out).toBe(6);
    expect(get(node3.outputs).out).toBe(-1);
  });

  it("supports cyclic structures", () => {
    const root = lib.createNode({}, {out: 0}, () => ({out: 0}));
    const pass = lib.createNode({input: 0}, {output: 0}, (arg) => ({output: arg.input}));
    const inc = lib.createNode({input: 0}, {output: 1}, (arg) => ({output: arg.input + 1}));

    const graph = lib.createGraph([root, pass, inc]);

    let count = 0;
    inc.subscribe("inputchange", () => {
      count++;
      if(count > 5) {
        lib.disconnect(graph, inc, "output", pass, "input");
      }
    })

    lib.connect(graph, root, "out", inc, "input");
    lib.connect(graph, inc, "output", pass, "input");
    lib.connect(graph, pass, "output", inc, "input");
  });
});
