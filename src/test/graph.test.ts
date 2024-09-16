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

    node.transform();

    expect(spy).toHaveBeenCalled();
    expect(spy).toHaveReturnedWith({});
  });

  it("can run an empty transform successfully", () => {
    const node = lib.createNode(() => ({}), undefined, {});
    const spy = vi.spyOn(node, "transform");

    node.transform();

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

  it("propagates events between connected nodes", () => {
    const outNode = lib.createNode(() => ({outV: 0}), undefined, {outV: 0});
    const inNode = lib.createNode((arg0: {inV: number}) => ({res: arg0.inV + 1}), {inV: 0}, {res: 0});

    const edge = lib.createEdge(outNode, "outV", inNode, "inV");

    outNode.outputs.set({outV: 1});
    expect(get(inNode.outputs).res).toBe(2);
  });
});
