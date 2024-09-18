import { test, expect, it, describe, vi, beforeEach } from "vitest";
import * as lib from "$lib";
import { get } from "svelte/store";

const createEmptyNode = () => lib.createNode(() => ({}), undefined, {});

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
    const nodeOut = lib.createNode(() => ({output: 1}), undefined, {output: 0});
    const nodeIn = lib.createNode((arg: {input: number}) => ({}), {input: 0}, {});
    const graph = lib.createGraph([nodeOut, nodeIn], [lib.createEdge(nodeOut, "output", nodeIn, "input")]);
    expect(graph.nodes.length).toBe(2);
  });

  it("fails on instantiation when edge arg contains nodes that do not exist in the graph", () => {
    const nodeOut = lib.createNode(() => ({output: 1}), undefined, {output: 0});
    const nodeIn = lib.createNode((arg: {input: number}) => ({}), {input: 0}, {});

    // errors with no common args
    expect(() => lib.createGraph([], [lib.createEdge(nodeOut, "output", nodeIn, "input")])).toThrowError();
  });
});

describe("node", () => {
  it("may be instantiated", () => {
    const node = lib.createNode(() => ({}), undefined, {}, [0, 0]);

    expect(get(node.inputs)).toBeUndefined();
    const stringifiedOutputs = JSON.stringify(get(node.outputs));
    expect(stringifiedOutputs).toBe("{}");

    const spy = vi.spyOn(node, "transform");

    node.transform(undefined);

    expect(spy).toHaveBeenCalled();
    expect(spy).toHaveReturnedWith({});
  });

  it("can run an empty transform successfully", () => {
    const node = lib.createNode(() => ({}), undefined, {});
    const spy = vi.spyOn(node, "transform");

    node.transform(undefined);

    expect(spy).toHaveBeenCalled();
  });

  it("can be instantiated with default input and outputs args", () => {
    const node = lib.createNode((arg0: {a: number, b: number}) => ({x: arg0.a + arg0.b}), {a: 2, b: 4}, {x: 6});

    expect(get(node.inputs).a).toBe(2);
    expect(get(node.inputs).b).toBe(4);
    expect(get(node.outputs).x).toBe(6);
  });

  it("can run a transform directly with args", () => {
    const node = lib.createNode((arg0: {a: number, b: number}) => ({x: arg0.a + arg0.b}), {a: 0, b: 0}, {x: 0});
    const spy = vi.spyOn(node, "transform");

    node.transform({a: 1, b: 2});

    expect(spy).toHaveBeenCalled();
    expect(spy).toHaveReturnedWith({x: 3});
  });

  it("runs transforms when input store is updated", () => {
    const node = lib.createNode((arg0: number) => ({res: arg0}), 0, {res: 0});

    node.inputs.set(5);

    expect(get(node.outputs).res).toBe(5);
  });

  it("updates outputs store when transform function is directly called", () => {
    const node = lib.createNode((arg0: number) => ({res: arg0}), 0, {res: 0});

    node.transform(5);

    expect(get(node.outputs).res).toBe(5);
  });
});

describe("edge", () => {
  it("may be instantiated", () => {
    const outNode = lib.createNode(() => ({outV: 0}), undefined, {outV: 0});
    const inNode = lib.createNode((arg0: {inV: number}) => ({}), {inV: 0}, {});

    const edge = lib.createEdge(outNode, "outV", inNode, "inV");

    expect(edge.inVertex)
  });

  it("throws an error on instantiation if vertex types don't match", () => {
    const outNode = lib.createNode(() => ({outV: 0}), undefined, {outV: 0});
    const inNode = lib.createNode((arg0: {inV: string}) => ({}), {inV: ""}, {});

    expect(() => lib.createEdge(outNode, "outV", inNode, "inV")).toThrowError();
  });
});

describe("graph propagation", () => {
  it("propagates events between connected nodes", () => {
    const outNode = lib.createNode(() => ({outV: 0}), undefined, {outV: 0});
    const inNode = lib.createNode((arg0: {inV: number}) => ({res: arg0.inV + 1}), {inV: 0}, {res: 1});

    lib.createEdge(outNode, "outV", inNode, "inV");

    outNode.outputs.set({outV: 1});
    expect(get(inNode.outputs).res).toBe(2);
  });

  it("propagates events between multiple connected nodes", () => {
    const node1 = lib.createNode(() => ({out1: 0}), undefined, {out1: 0});
    const node2 = lib.createNode((arg0: {in2: number}) => ({out2: arg0.in2 + 1}), {in2: 0}, {out2: 1});
    const node3 = lib.createNode((arg0: {in3: number}) => ({out3: arg0.in3 + 1}), {in3: 0}, {out3: 1});

    lib.createEdge(node1, "out1", node2, "in2");
    lib.createEdge(node2, "out2", node3, "in3");

    node1.outputs.set({out1: 1});
    expect(get(node3.outputs).out3).toBe(3);
  });

  it("performed fine-grained updates across graph based on how output changes after transform", () => {
    const node1 = lib.createNode(() => ({out1: 0, out2: 0}), undefined, {out1: 0, out2: 0});
    const node2 = lib.createNode((arg0: {in1: number}) => ({out: arg0.in1 + 1}), {in1: 0}, {out: -1});
    const node3 = lib.createNode((arg0: {in2: number}) => ({out: arg0.in2 + 1}), {in2: 0}, {out: -1});

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
});
